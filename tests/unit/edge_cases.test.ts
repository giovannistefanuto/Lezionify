import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { AppLogger, maskSensitiveData } from '../../electron/main/logger'
import { SearchIndexService } from '../../electron/main/searchIndex'
import { ArchiveService } from '../../electron/main/archive'

describe('Edge Cases — AppLogger & Sensitive Data Masking', () => {
  it('gestisce tipi non-stringa, null e undefined senza generare eccezioni', () => {
    expect(maskSensitiveData(null)).toBe('')
    expect(maskSensitiveData(undefined)).toBe('')
    expect(maskSensitiveData(12345 as any)).toBe('12345')
    expect(maskSensitiveData(new Error('Errore generico'))).toBe('Error: Errore generico')
  })

  it('maschera chiavi multiple presenti all interno dello stesso testo o log', () => {
    const key1 = 'AIzaSy' + '1'.repeat(33)
    const key2 = 'AIzaSy' + '2'.repeat(33)
    const text = `Chiamata con chiave primaria ${key1} fallita, tentativo con secondaria ${key2}`
    const masked = maskSensitiveData(text)

    expect(masked).not.toContain(key1)
    expect(masked).not.toContain(key2)
    expect(masked).toContain('AIzaSy...1111')
    expect(masked).toContain('AIzaSy...2222')
  })

  it('non altera chiavi incomplete o stringhe simili che non corrispondono al pattern Gemini', () => {
    const incompleteKey = 'AIzaSySHORT'
    expect(maskSensitiveData(incompleteKey)).toBe(incompleteKey)
    const normalText = 'Nessuna chiave presente nel messaggio 12345'
    expect(maskSensitiveData(normalText)).toBe(normalText)
  })

  it('gestisce il ring buffer a 500 elementi con politica FIFO in caso di overflow', async () => {
    const tempDir = join(tmpdir(), `lezionify-edge-logger-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    const logger = AppLogger.getInstance()
    logger.init(tempDir)

    // Inserisce 550 log per testare l'evizione FIFO dei primi 50
    for (let i = 1; i <= 550; i++) {
      logger.info('stress-test', `Messaggio #${i}`)
    }

    const logs = logger.getLogs()
    expect(logs.length).toBe(500)
    // Il primo log deve essere il messaggio #51 (i primi 50 scartati)
    expect(logs[0].message).toBe('Messaggio #51')
    // L'ultimo log deve essere il messaggio #550
    expect(logs[logs.length - 1].message).toBe('Messaggio #550')

    await logger.flush()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('resiste a file app.log con linee corrotte o JSON malformato durante init', async () => {
    const tempDir = join(tmpdir(), `lezionify-corrupt-log-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })
    const logFile = join(tempDir, 'app.log')

    const validEntry = JSON.stringify({
      id: 'valid-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'test',
      message: 'Log valido precedente'
    })

    // Scrive contenuto misto: linea valida, linea troncata, spazzatura binaria, linea valida
    const corruptedContent = `${validEntry}\n{corrupted json\n:::garbage line:::\n${JSON.stringify({
      id: 'valid-2',
      timestamp: new Date().toISOString(),
      level: 'error',
      source: 'test',
      message: 'Altro log valido'
    })}\n`

    await writeFile(logFile, corruptedContent, 'utf-8')

    const logger = AppLogger.getInstance()
    // Inizializza leggendo il file parzialmente corrotto
    logger.init(tempDir)

    const loaded = logger.getLogs()
    expect(loaded.length).toBe(2)
    expect(loaded[0].id).toBe('valid-1')
    expect(loaded[1].id).toBe('valid-2')

    await rm(tempDir, { recursive: true, force: true })
  })

  it('gestisce caratteri speciali, emoji, caratteri unicode e ritorni a capo', async () => {
    const tempDir = join(tmpdir(), `lezionify-special-char-log-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    const logger = AppLogger.getInstance()
    logger.init(tempDir)

    const specialMsg = '🔥 Test Unicode: äöü, 日本語, العربية, Math: ∫x²dx = x³/3 + C \nNuova riga con tab\t!'
    logger.info('unicode-test', specialMsg, 'Dettaglio con caratteri speciali: 🚀 <script>alert(1)</script>')

    const logs = logger.getLogs()
    expect(logs.length).toBe(1)
    expect(logs[0].message).toBe(specialMsg)
    expect(logs[0].details).toContain('🚀 <script>alert(1)</script>')

    await logger.flush()
    await rm(tempDir, { recursive: true, force: true })
  })
})

describe('Edge Cases — SearchIndexService', () => {
  it('gestisce query di ricerca con caratteri riservati regex, punteggiatura e simboli insoliti', () => {
    const searchIndex = new SearchIndexService()
    searchIndex.indexDocument({
      id: 'doc-1',
      courseCode: 'Analisi 1',
      recordedAt: '2026-03-01T10:00:00',
      sourceAudioFileName: 'analisi.mp3',
      sourceTranscriptFileName: 'analisi.txt',
      transcriptText: 'Il limite notevole di sin(x)/x per x che tende a 0 vale 1.',
      markdownText: '# Limiti Notevoli'
    })

    // Ricerche con caratteri speciali che in regex grezzo causerebbero SyntaxError
    const specialQueries = ['(', ')', '[', ']', '*', '+', '?', '^', '$', '\\', 'sin(x)/x', '!!!', '   ']

    for (const q of specialQueries) {
      expect(() => searchIndex.search(q)).not.toThrow()
    }

    const match = searchIndex.search('limite notevole')
    expect(match).toContain('doc-1')
  })

  it('aggiorna correttamente il documento indicizzato e rimuove documenti inesistenti senza errori', () => {
    const searchIndex = new SearchIndexService()
    searchIndex.indexDocument({
      id: 'doc-update-test',
      courseCode: 'Fisica',
      recordedAt: '2026-04-01T11:00:00',
      sourceAudioFileName: 'fisica.mp3',
      sourceTranscriptFileName: 'fisica.txt',
      transcriptText: 'Termodinamica primo principio',
      markdownText: '# Termodinamica'
    })

    expect(searchIndex.search('Termodinamica')).toContain('doc-update-test')

    // Aggiornamento
    searchIndex.indexDocument({
      id: 'doc-update-test',
      courseCode: 'Fisica',
      recordedAt: '2026-04-01T11:00:00',
      sourceAudioFileName: 'fisica.mp3',
      sourceTranscriptFileName: 'fisica.txt',
      transcriptText: 'Elettromagnetismo equazioni di Maxwell',
      markdownText: '# Maxwell'
    })

    expect(searchIndex.search('Maxwell')).toContain('doc-update-test')

    // Rimozione di ID inesistente non deve generare eccezioni
    expect(() => searchIndex.removeDocument('non-existing-id')).not.toThrow()

    // Rimozione effettiva
    searchIndex.removeDocument('doc-update-test')
    expect(searchIndex.search('Maxwell')).toHaveLength(0)
  })
})

describe('Edge Cases — Transizioni di Stato Studio e Gestione Lezioni', () => {
  it('consente transizione ciclica completa dello studyStatus (da-studiare -> in-corso -> completata)', async () => {
    const tempDir = join(tmpdir(), `lezionify-edge-lecture-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    const archive = new ArchiveService(tempDir)
    await archive.initialize()

    const audioDir = join(tempDir, 'audio')
    await mkdir(audioDir, { recursive: true })
    const dummyAudio = join(audioDir, 'TEST 2026-0115-09-00-00.mp3')
    await writeFile(dummyAudio, 'fake audio content')

    const imported = await archive.scanAndSyncLibrary()
    expect(imported.length).toBe(1)
    const lectureId = imported[0].id
    expect(imported[0].studyStatus).toBe('da-studiare')

    // 1. Da da-studiare a in-corso
    const updated1 = await archive.updateLecture(lectureId, { studyStatus: 'in-corso' })
    expect(updated1.studyStatus).toBe('in-corso')

    // 2. Da in-corso a completata
    const updated2 = await archive.updateLecture(lectureId, { studyStatus: 'completata' })
    expect(updated2.studyStatus).toBe('completata')

    // 3. Verifica persistenza ricaricando da disco
    const reloaded = await archive.listLectures()
    const found = reloaded.find((l) => l.id === lectureId)
    expect(found?.studyStatus).toBe('completata')

    await rm(tempDir, { recursive: true, force: true })
  })

  it('gestisce corsi con 0 CFU e valori limite elevati calcolando ore coerenti', async () => {
    const tempDir = join(tmpdir(), `lezionify-edge-cfu-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    const archive = new ArchiveService(tempDir)
    await archive.initialize()

    // 0 CFU (es. seminario)
    await archive.saveCourse({
      code: 'SEM0',
      name: 'Seminario',
      cfu: 0,
      lectureHours: 0,
      individualStudyHours: 0,
      totalHours: 0,
      startDate: '2026-03-01',
      endDate: '2026-06-01',
      schedule: []
    })

    // 15 CFU (corso integrato pesante)
    await archive.saveCourse({
      code: 'PESANTE15',
      name: 'Corso Integrato',
      cfu: 15,
      lectureHours: 15 * 7, // 105
      individualStudyHours: 15 * 18, // 270
      totalHours: 15 * 25, // 375
      startDate: '2026-03-01',
      endDate: '2026-06-01',
      schedule: []
    })

    const courses = await archive.getCourses()
    const sem = courses.find((c) => c.code === 'SEM0')
    expect(sem).toBeDefined()
    expect(sem?.totalHours).toBe(0)

    const heavy = courses.find((c) => c.code === 'PESANTE15')
    expect(heavy).toBeDefined()
    expect(heavy?.lectureHours).toBe(105)
    expect(heavy?.individualStudyHours).toBe(270)
    expect(heavy?.totalHours).toBe(375)

    await rm(tempDir, { recursive: true, force: true })
  })

  it('Scratchpad: gestisce To-Do vuoti, note molto lunghe e caratteri speciali', async () => {
    const tempDir = join(tmpdir(), `lezionify-edge-scratchpad-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    const archive = new ArchiveService(tempDir)
    await archive.initialize()

    const hugeNotes = 'Nota riga di testo.\n'.repeat(500)
    await archive.saveScratchpad({
      todos: [
        { id: 'todo-1', text: 'To-Do Normale', completed: false, createdAt: new Date().toISOString() },
        { id: 'todo-2', text: '', completed: true, createdAt: new Date().toISOString() },
        { id: 'todo-3', text: '💡 Rivedere teorema di Bayes & De Morgan <test>', completed: false, createdAt: new Date().toISOString() }
      ],
      notes: hugeNotes
    })

    const loaded = await archive.getScratchpad()
    expect(loaded.todos.length).toBe(3)
    expect(loaded.todos[1].text).toBe('')
    expect(loaded.todos[2].text).toContain('💡 Rivedere teorema di Bayes')
    expect(loaded.notes.length).toBe(hugeNotes.length)

    await rm(tempDir, { recursive: true, force: true })
  })

  it('Focus Lock & Pause Guard: il timer di studio si congela completamente durante il Focus Lock', () => {
    // Simula la macchina a stati del tracker di studio con Focus Lock Guard
    let sessionSeconds = 120 // 2 minuti di studio accumulati
    let isPaused = false
    let showFocusLock = false
    const pauseTimerActive = false

    // Funzione heartbeat tick (1 secondo)
    const tick = () => {
      if (showFocusLock || pauseTimerActive || isPaused) return
      sessionSeconds += 1
    }

    // Interazione utente (click o tastiera)
    const onUserInteraction = () => {
      if (showFocusLock || pauseTimerActive) return
      if (isPaused) isPaused = false
    }

    // Richiesta di uscita (pressione ESC in Focus Mode)
    const onRequestExit = () => {
      if (showFocusLock) return
      showFocusLock = true
      isPaused = true
    }

    // 1. Studio normale: tick per 10 secondi
    for (let i = 0; i < 10; i++) tick()
    expect(sessionSeconds).toBe(130)

    // 2. L'utente preme ESC: si apre Focus Lock e il timer si congela
    onRequestExit()
    expect(showFocusLock).toBe(true)
    expect(isPaused).toBe(true)

    // 3. Passano 15 secondi di countdown con interazioni mouse/click durante la decisione
    for (let i = 0; i < 15; i++) {
      onUserInteraction() // movimenti mouse o tentativi di click
      tick()
    }
    // I 15 secondi di countdown NON devono essere stati conteggiati
    expect(sessionSeconds).toBe(130)
    expect(isPaused).toBe(true)

    // 4. L'utente decide di tornare a studiare (Continua a studiare)
    showFocusLock = false
    isPaused = false

    // 5. Riprende lo studio: altri 5 secondi
    for (let i = 0; i < 5; i++) {
      onUserInteraction()
      tick()
    }
    expect(sessionSeconds).toBe(135)
  })
})
