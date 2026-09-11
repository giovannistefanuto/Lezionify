import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ArchiveService,
  extractMarkdownTitle,
  fileChecksum,
  parseFileName
} from '../../electron/main/archive'
import { findNextChronologicalLecture } from '../../shared/archive'
import {
  cleanMarkdownOutput,
  parseMultimodalAudioResponse,
  parseSegmentationCuts,
  sliceTranscriptByCuts,
  GeminiService
} from '../../electron/main/gemini'
import { SettingsService } from '../../electron/main/settings'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash, randomUUID } from 'node:crypto'

describe('parseFileName — Edge cases & Date Validation', () => {
  describe('Formato nativo registratore (senza sigla)', () => {
    it('riconosce timestamp standard valido', () => {
      const parsed = parseFileName('2026-0507-16-19-41.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBeNull()
      expect(parsed?.recordedAt).toBe('2026-05-07T16:19:41')
    })

    it('riconosce mezzanotte esatta (00-00-00)', () => {
      const parsed = parseFileName('2026-0101-00-00-00.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBeNull()
      expect(parsed?.recordedAt).toBe('2026-01-01T00:00:00')
    })

    it('riconosce ultimo secondo del giorno (23-59-59)', () => {
      const parsed = parseFileName('2026-1231-23-59-59.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBeNull()
      expect(parsed?.recordedAt).toBe('2026-12-31T23:59:59')
    })
  })

  describe('Formato con prefisso corso', () => {
    it('riconosce sigla semplice (es. RC)', () => {
      const parsed = parseFileName('RC 2026-0507-16-19-41.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBe('RC')
      expect(parsed?.recordedAt).toBe('2026-05-07T16:19:41')
    })

    it('riconosce nomi corso con underscore e trattini', () => {
      const parsed = parseFileName(
        'SISTEMI_DISTRIBUITI-M1 2026-1012-09-15-30.mp3'
      )
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBe('SISTEMI_DISTRIBUITI-M1')
      expect(parsed?.recordedAt).toBe('2026-10-12T09:15:30')
    })

    it('riconosce caratteri unicode nel corso', () => {
      const parsed = parseFileName(
        'FondamentiDiIngegneria_Elettronica 2026-0315-11-00-00.mp3'
      )
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBe('FondamentiDiIngegneria_Elettronica')
    })
  })

  describe('Gestione anni bisestili e mesi a 30/31 giorni', () => {
    it('accetta 29 Febbraio in anno bisestile (2024)', () => {
      const parsed = parseFileName('2024-0229-14-30-00.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.recordedAt).toBe('2024-02-29T14:30:00')
    })

    it('rifiuta 29 Febbraio in anno NON bisestile (2023)', () => {
      const parsed = parseFileName('2023-0229-14-30-00.mp3')
      expect(parsed).toBeNull()
    })

    it('accetta 31 Gennaio e 31 Marzo', () => {
      expect(parseFileName('2026-0131-10-00-00.mp3')).not.toBeNull()
      expect(parseFileName('2026-0331-10-00-00.mp3')).not.toBeNull()
    })

    it('rifiuta 31 Aprile (Aprile ha 30 giorni)', () => {
      expect(parseFileName('2026-0431-10-00-00.mp3')).toBeNull()
    })

    it('rifiuta 31 Giugno e 31 Novembre', () => {
      expect(parseFileName('2026-0631-10-00-00.mp3')).toBeNull()
      expect(parseFileName('2026-1131-10-00-00.mp3')).toBeNull()
    })
  })

  describe('Rifiuto di formati e valori non conformi', () => {
    it('rifiuta mese 00 o mese 13', () => {
      expect(parseFileName('2026-0001-12-00-00.mp3')).toBeNull()
      expect(parseFileName('2026-1301-12-00-00.mp3')).toBeNull()
    })

    it('rifiuta giorno 00 o giorno 32', () => {
      expect(parseFileName('2026-0500-12-00-00.mp3')).toBeNull()
      expect(parseFileName('2026-0532-12-00-00.mp3')).toBeNull()
    })

    it('rifiuta ore >= 24', () => {
      expect(parseFileName('2026-0507-24-00-00.mp3')).toBeNull()
      expect(parseFileName('2026-0507-25-00-00.mp3')).toBeNull()
    })

    it('rifiuta minuti e secondi >= 60', () => {
      expect(parseFileName('2026-0507-16-60-00.mp3')).toBeNull()
      expect(parseFileName('2026-0507-16-19-60.mp3')).toBeNull()
    })

    it('rifiuta estensioni diverse da mp3 o stringhe vuote', () => {
      expect(parseFileName('2026-0507-16-19-41.wav')).toBeNull()
      expect(parseFileName('2026-0507-16-19-41.txt')).toBeNull()
      expect(parseFileName('')).toBeNull()
      expect(parseFileName('   ')).toBeNull()
      expect(parseFileName('lezione_generica.mp3')).toBeNull()
    })
  })
})
describe('fileChecksum', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lezionify-test-checksum-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  it('calcola correttamente hash SHA-256 per file vuoto', async () => {
    const filePath = join(tempDir, 'empty.txt')
    await writeFile(filePath, '', 'utf8')
    const hash = await fileChecksum(filePath)
    const expected = createHash('sha256').update('').digest('hex')
    expect(hash).toBe(expected)
  })

  it('calcola correttamente hash per stream di dati binari/testo', async () => {
    const filePath = join(tempDir, 'sample.mp3')
    const content = Buffer.from(
      'Contenuto audio fittizio per il test di checksum '.repeat(100)
    )
    await writeFile(filePath, content)
    const hash = await fileChecksum(filePath)
    const expected = createHash('sha256').update(content).digest('hex')
    expect(hash).toBe(expected)
  })
})

describe('cleanMarkdownOutput & parseMultimodalAudioResponse', () => {
  it('rimuove i backticks ```markdown ... ``` se presenti come wrapper', () => {
    const raw = '```markdown\n# Titolo Lezione\n\nTesto con formula $x=1$.\n```'
    expect(cleanMarkdownOutput(raw)).toBe(
      '# Titolo Lezione\n\nTesto con formula $x=1$.'
    )
  })

  it('preserva il markdown standard senza wrapper esterno', () => {
    const raw = '# Titolo\n\nParagrafo con formula $$E=mc^2$$.'
    expect(cleanMarkdownOutput(raw)).toBe(
      '# Titolo\n\nParagrafo con formula $$E=mc^2$$.'
    )
  })

  it('estrae trascrizione grezza e dispensa strutturata da risposta multimodale audio', () => {
    const multimodalOutput = `=== TRASCRIZIONE GREZZA ===
Oggi spieghiamo il protocollo TCP.

=== DISPENSA DIDATTICA ===
# Protocollo TCP

## Overview Didattica
Sintesi del protocollo.`

    const parsed = parseMultimodalAudioResponse(multimodalOutput)
    expect(parsed.transcript).toBe('Oggi spieghiamo il protocollo TCP.')
    expect(parsed.markdown).toBe(
      '# Protocollo TCP\n\n## Overview Didattica\nSintesi del protocollo.'
    )
  })

  it('analizza ed estrae i tagli di segmentazione semantica da parseSegmentationCuts', () => {
    const rawCuts = `* **Macroargomento:** Introduzione ai Robot e Cinematica
* **Fine Parte:** "questo conclude la prima parte introduttiva."
* **Inizio Parte Successiva:** "Passiamo ora alla dinamica dei manipolatori."

* **Macroargomento:** Dinamica e Schema di Slotine-Li
* **Fine Parte:** "abbiamo ricavato la funzione di Lyapunov."
* **Inizio Parte Successiva:** "Vediamo infine un esempio applicativo."`

    const cuts = parseSegmentationCuts(rawCuts)
    expect(cuts.length).toBe(2)
    expect(cuts[0].macroargomento).toBe('Introduzione ai Robot e Cinematica')
    expect(cuts[0].fineParte).toBe(
      'questo conclude la prima parte introduttiva.'
    )
    expect(cuts[0].inizioParteSuccessiva).toBe(
      'Passiamo ora alla dinamica dei manipolatori.'
    )
    expect(cuts[1].macroargomento).toBe('Dinamica e Schema di Slotine-Li')
  })

  it('suddivide la trascrizione in parti coerenti con sliceTranscriptByCuts', () => {
    const fullTranscript = `Buongiorno a tutti. Oggi parliamo di robotica. questo conclude la prima parte introduttiva. Passiamo ora alla dinamica dei manipolatori. Abbiamo ricavato la funzione di Lyapunov. Vediamo infine un esempio applicativo sul pendolo invertito.`
    const cuts = [
      {
        macroargomento: 'Introduzione',
        fineParte: 'questo conclude la prima parte introduttiva.',
        inizioParteSuccessiva: 'Passiamo ora alla dinamica dei manipolatori.'
      },
      {
        macroargomento: 'Dinamica Slotine-Li',
        fineParte: 'Abbiamo ricavato la funzione di Lyapunov.',
        inizioParteSuccessiva: 'Vediamo infine un esempio applicativo'
      }
    ]

    const parts = sliceTranscriptByCuts(fullTranscript, cuts)
    expect(parts.length).toBe(3)
    expect(parts[0].title).toBe('Introduzione')
    expect(parts[0].text).toContain('robotica')
    expect(parts[1].title).toBe('Dinamica Slotine-Li')
    expect(parts[1].text).toContain('dinamica dei manipolatori')
    expect(parts[2].text).toContain('pendolo invertito')
  })
})

describe('SettingsService — Pool di Chiavi e Rotazione', () => {
  let tempDir: string
  let settingsService: SettingsService

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lezionify-settings-test-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })
    settingsService = new SettingsService(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  it('restituisce impostazioni di default se il file non esiste', async () => {
    const s = await settingsService.getSettings()
    expect(s.apiKey).toBe('')
    expect(s.apiKeys).toEqual([])
    expect(s.activeKeyIndex).toBe(0)
    expect(s.autoRotateOnQuota).toBe(true)
    expect(s.model).toBe('gemini-3.6-flash')
  })

  it('salva e recupera il pool di chiavi API e il modello scelto', async () => {
    const updated = await settingsService.saveSettings({
      apiKeys: ['AIzaSyKey1', 'AIzaSyKey2', 'AIzaSyKey3'],
      activeKeyIndex: 1,
      model: 'gemini-3.6-flash'
    })
    expect(updated.apiKeys).toEqual(['AIzaSyKey1', 'AIzaSyKey2', 'AIzaSyKey3'])
    expect(updated.activeKeyIndex).toBe(1)
    expect(updated.apiKey).toBe('AIzaSyKey2')
    expect(updated.model).toBe('gemini-3.6-flash')

    const reloaded = await settingsService.getSettings()
    expect(reloaded.apiKeys).toEqual(['AIzaSyKey1', 'AIzaSyKey2', 'AIzaSyKey3'])
    expect(reloaded.apiKey).toBe('AIzaSyKey2')
  })

  it('ruota correttamente le chiavi nel pool con rotateKey', async () => {
    await settingsService.saveSettings({
      apiKeys: ['AIzaSyKey1', 'AIzaSyKey2'],
      activeKeyIndex: 0
    })

    const next1 = await settingsService.rotateKey()
    expect(next1).toBe('AIzaSyKey2')

    const next2 = await settingsService.rotateKey()
    expect(next2).toBe('AIzaSyKey1')
  })
})

describe('ArchiveService — Ciclo di vita, CRUD, Batch & Trascrizione Audio', () => {
  let testArchiveDir: string
  let mockGeminiService: GeminiService
  let service: ArchiveService

  beforeEach(async () => {
    testArchiveDir = join(tmpdir(), `lezionify-archive-test-${randomUUID()}`)
    await mkdir(testArchiveDir, { recursive: true })

    mockGeminiService = new GeminiService()
    vi.spyOn(mockGeminiService, 'extractCourseLogistics').mockResolvedValue(null)
    service = new ArchiveService(testArchiveDir, mockGeminiService)
    await service.initialize()
  })

  afterEach(async () => {
    await rm(testArchiveDir, { recursive: true, force: true }).catch(() => {})
  })

  it('inizializza la struttura cartelle (audio, transcripts, markdown) e library.json', async () => {
    const libraryPath = join(testArchiveDir, 'library.json')
    const libraryContent = JSON.parse(await readFile(libraryPath, 'utf8'))
    expect(libraryContent.version).toBe(1)
    expect(libraryContent.lectures).toEqual([])

    expect((await stat(join(testArchiveDir, 'audio'))).isDirectory()).toBe(true)
    expect(
      (await stat(join(testArchiveDir, 'transcripts'))).isDirectory()
    ).toBe(true)
    expect((await stat(join(testArchiveDir, 'markdown'))).isDirectory()).toBe(
      true
    )
  })

  it('importa file MP3 e associa automaticamente il TXT omonimo', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, 'RC 2026-0507-16-19-41.mp3')
    const txtFile = join(sourceDir, 'RC 2026-0507-16-19-41.txt')
    await writeFile(mp3File, 'fake-mp3-stream-1')
    await writeFile(
      txtFile,
      'Trascrizione grezza della lezione di Reti di Calcolatori'
    )

    const summary = await service.importFiles([mp3File])
    expect(summary.imported.length).toBe(1)
    expect(summary.skipped.length).toBe(0)

    const lecture = summary.imported[0]
    expect(lecture.courseCode).toBe('RC')
    expect(lecture.recordedAt).toBe('2026-05-07T16:19:41')
    expect(lecture.status).toBe('transcript-available')
    expect(lecture.studyStatus).toBe('da-studiare')
    expect(lecture.sourceTranscriptFileName).toBe('RC 2026-0507-16-19-41.txt')

    const readText = await service.readTranscript(lecture.id)
    expect(readText).toBe(
      'Trascrizione grezza della lezione di Reti di Calcolatori'
    )

    const audioPath = await service.getAudioFilePath(lecture.id)
    expect(audioPath).not.toBeNull()
    expect(await readFile(audioPath!, 'utf8')).toBe('fake-mp3-stream-1')
  })

  it('genera automaticamente la dispensa con AI invocando il servizio Gemini', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, 'RC 2026-0507-16-19-41.mp3')
    const txtFile = join(sourceDir, 'RC 2026-0507-16-19-41.txt')
    await writeFile(mp3File, 'audio-ai-test')
    await writeFile(txtFile, 'Trascrizione professore sul protocollo TCP...')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id

    await service.saveSettings({
      apiKeys: ['test-valid-api-key'],
      model: 'gemini-3.6-flash'
    })

    const mockMarkdown = `# Lezione Reti di Calcolatori\n\n## Overview Didattica\nRiassunto del protocollo TCP.\n\n## Corpo della Lezione\nFormula finestra: $$W = \\min(CWND, RWND)$$\n\n> [!NOTE]\n> Note per l'Esame: domanda frequente sul three-way handshake.`
    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockResolvedValue(
      mockMarkdown
    )

    const genResult = await service.generateLectureNotes(lectureId)
    expect(genResult.success).toBe(true)
    expect(genResult.markdown).toBe(mockMarkdown)

    const saved = await service.readMarkdown(lectureId)
    expect(saved).toBe(mockMarkdown)

    const list = await service.listLectures()
    expect(list[0].markdownFileName).toBe(`${lectureId}.md`)
  })

  it('esegue la generazione batch su tutte le lezioni mancanti con generateAllMissingNotes', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File1 = join(sourceDir, 'RC 2026-0507-10-00-00.mp3')
    const txtFile1 = join(sourceDir, 'RC 2026-0507-10-00-00.txt')
    const mp3File2 = join(sourceDir, 'RC 2026-0508-10-00-00.mp3')
    const txtFile2 = join(sourceDir, 'RC 2026-0508-10-00-00.txt')

    await writeFile(mp3File1, 'audio-1')
    await writeFile(txtFile1, 'Trascrizione lezione 1')
    await writeFile(mp3File2, 'audio-2')
    await writeFile(txtFile2, 'Trascrizione lezione 2')

    await service.importFiles([mp3File1, mp3File2])
    await service.saveSettings({
      apiKeys: ['test-valid-api-key'],
      model: 'gemini-3.6-flash'
    })

    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockResolvedValue(
      '# Dispensa Batch'
    )

    const batchSummary = await service.generateAllMissingNotes()
    expect(batchSummary.total).toBe(2)
    expect(batchSummary.succeeded).toBe(2)
    expect(batchSummary.failed).toBe(0)

    const list = await service.listLectures()
    expect(list.every((l) => l.markdownFileName !== null)).toBe(true)
  })

  it('trascrive ed elabora direttamente da audio un file privo di TXT con transcribeAudio', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, '2026-0507-16-19-41.mp3')
    await writeFile(mp3File, 'audio-content-raw')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id
    expect(summary.imported[0].status).toBe('audio-only')

    await service.saveSettings({
      apiKeys: ['test-valid-api-key'],
      model: 'gemini-3.6-flash'
    })

    vi.spyOn(
      mockGeminiService,
      'transcribeAndGenerateFromAudio'
    ).mockResolvedValue({
      transcript: 'Trascrizione audio estratta da Gemini Multimodale.',
      markdown: '# Dispensa da Audio\n\n## Overview\nContenuto estratto.'
    })

    const result = await service.transcribeAudio(lectureId)
    expect(result.success).toBe(true)
    expect(result.transcript).toContain('Trascrizione audio estratta')
    expect(result.markdown).toContain('# Dispensa da Audio')

    // Verifica che i file siano stati scritti e lo stato aggiornato
    const list = await service.listLectures()
    expect(list[0].status).toBe('transcript-available')
    expect(list[0].transcriptFileName).toBe(`${lectureId}.txt`)
    expect(list[0].markdownFileName).toBe(`${lectureId}.md`)

    const readTxt = await service.readTranscript(lectureId)
    expect(readTxt).toBe('Trascrizione audio estratta da Gemini Multimodale.')
  })

  it('ruota automaticamente alla seconda chiave se la prima incontra errore di quota (RESOURCE_EXHAUSTED)', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, 'RC 2026-0507-16-19-41.mp3')
    const txtFile = join(sourceDir, 'RC 2026-0507-16-19-41.txt')
    await writeFile(mp3File, 'audio-ai-test')
    await writeFile(txtFile, 'Trascrizione professore...')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id

    await service.saveSettings({
      apiKeys: ['key-exhausted', 'key-working'],
      activeKeyIndex: 0,
      autoRotateOnQuota: true,
      model: 'gemini-3.6-flash'
    })

    const mockMarkdown = `# Dispensa Generata con Chiave 2\n\nContenuto didattico.`
    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockImplementation(
      async (params) => {
        if (params.apiKey === 'key-exhausted') {
          throw new Error('RESOURCE_EXHAUSTED: quota exceeded for current key')
        }
        return mockMarkdown
      }
    )

    const genResult = await service.generateLectureNotes(lectureId)
    expect(genResult.success).toBe(true)
    expect(genResult.markdown).toBe(mockMarkdown)

    const updatedSettings = await service.getSettings()
    expect(updatedSettings.activeKeyIndex).toBe(1)
    expect(updatedSettings.apiKey).toBe('key-working')
  })

  it('esegue ricerca full-text nei metadati, trascrizioni e note markdown', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File1 = join(sourceDir, 'ALGORITMI 2026-0501-10-00-00.mp3')
    const txtFile1 = join(sourceDir, 'ALGORITMI 2026-0501-10-00-00.txt')
    await writeFile(mp3File1, 'audio-1')
    await writeFile(
      txtFile1,
      'Oggi parliamo di complessità computazionale e alberi binari di ricerca.'
    )

    const mp3File2 = join(sourceDir, '2026-0502-10-00-00.mp3')
    await writeFile(mp3File2, 'audio-2')

    const summary = await service.importFiles([mp3File1, mp3File2])
    const id1 = summary.imported.find((l) => l.courseCode === 'ALGORITMI')!.id
    const id2 = summary.imported.find((l) => l.courseCode === null)!.id

    await service.saveMarkdown(
      id2,
      '# Note su Protocolli TCP e UDP\n\nAnalisi del three-way handshake.'
    )

    const matchCourse = await service.searchFullText('ALGORITMI')
    expect(matchCourse).toContain(id1)
    expect(matchCourse).not.toContain(id2)

    const matchTranscript = await service.searchFullText('computazionale')
    expect(matchTranscript).toContain(id1)
    expect(matchTranscript).not.toContain(id2)

    const matchMarkdown = await service.searchFullText('handshake')
    expect(matchMarkdown).toContain(id2)
    expect(matchMarkdown).not.toContain(id1)
  })

  it('elimina lezione rimuovendo audio, trascrizione e file Markdown dal disco', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, 'RC 2026-0507-16-19-41.mp3')
    const txtFile = join(sourceDir, 'RC 2026-0507-16-19-41.txt')
    await writeFile(mp3File, 'audio-del')
    await writeFile(txtFile, 'txt-del')

    const summary = await service.importFiles([mp3File])
    const lecture = summary.imported[0]

    await service.saveMarkdown(lecture.id, '# Note da eliminare')

    const audioPath = join(testArchiveDir, 'audio', lecture.audioFileName)
    const transcriptPath = join(
      testArchiveDir,
      'transcripts',
      lecture.transcriptFileName!
    )
    const markdownPath = join(testArchiveDir, 'markdown', `${lecture.id}.md`)

    expect(await stat(audioPath)).toBeDefined()
    expect(await stat(transcriptPath)).toBeDefined()
    expect(await stat(markdownPath)).toBeDefined()

    const deleted = await service.deleteLecture(lecture.id)
    expect(deleted).toBe(true)

    await expect(stat(audioPath)).rejects.toThrow()
    await expect(stat(transcriptPath)).rejects.toThrow()
    await expect(stat(markdownPath)).rejects.toThrow()

    const list = await service.listLectures()
    expect(list.length).toBe(0)
  })

  it('scansiona e sincronizza automaticamente file audio e trascrizioni inserite direttamente su disco con scanAndSyncLibrary', async () => {
    // Simuliamo l'utente che inserisce direttamente un file MP3 nella cartella audio
    const audioDir = join(testArchiveDir, 'audio')
    const transcriptsDir = join(testArchiveDir, 'transcripts')

    const rawMp3 = join(audioDir, 'ROB 2026-0430-10-00-00.mp3')
    await writeFile(rawMp3, 'audio-robotics-raw-stream')

    // Prima sincronizzazione: deve registrare la lezione come audio-only
    const synced1 = await service.scanAndSyncLibrary()
    expect(synced1.length).toBe(1)
    expect(synced1[0].courseCode).toBe('ROB')
    expect(synced1[0].status).toBe('audio-only')

    const lectureId = synced1[0].id

    // Simuliamo l'utente che incolla il file .txt corrispondente nella cartella transcripts
    const rawTxt = join(transcriptsDir, 'ROB 2026-0430-10-00-00.txt')
    await writeFile(rawTxt, 'Trascrizione generata da Colab per robotica...')

    // Seconda sincronizzazione: deve associare automaticamente il file txt
    const synced2 = await service.scanAndSyncLibrary()
    expect(synced2.length).toBe(1)
    expect(synced2[0].id).toBe(lectureId)
    expect(synced2[0].status).toBe('transcript-available')
    expect(synced2[0].transcriptFileName).toBe(`${lectureId}.txt`)

    const textContent = await service.readTranscript(lectureId)
    expect(textContent).toBe('Trascrizione generata da Colab per robotica...')
  })

  it('genera selettivamente le dispense solo per le lezioni specificate con generateSelectedNotes', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3_1 = join(sourceDir, 'RC 2026-0507-10-00-00.mp3')
    const txt_1 = join(sourceDir, 'RC 2026-0507-10-00-00.txt')
    const mp3_2 = join(sourceDir, 'RC 2026-0508-10-00-00.mp3')
    const txt_2 = join(sourceDir, 'RC 2026-0508-10-00-00.txt')
    const mp3_3 = join(sourceDir, 'RC 2026-0509-10-00-00.mp3')
    const txt_3 = join(sourceDir, 'RC 2026-0509-10-00-00.txt')

    await writeFile(mp3_1, 'a1')
    await writeFile(txt_1, 't1')
    await writeFile(mp3_2, 'a2')
    await writeFile(txt_2, 't2')
    await writeFile(mp3_3, 'a3')
    await writeFile(txt_3, 't3')

    const summary = await service.importFiles([mp3_1, mp3_2, mp3_3])
    await service.saveSettings({
      apiKeys: ['valid-key'],
      model: 'gemini-3.6-flash'
    })
    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockResolvedValue(
      '# Dispensa Selezionata'
    )

    // Selezioniamo solo le prime due lezioni per la generazione
    const targetIds = [summary.imported[0].id, summary.imported[1].id]
    const batchRes = await service.generateSelectedNotes(targetIds)

    expect(batchRes.total).toBe(2)
    expect(batchRes.succeeded).toBe(2)
    expect(batchRes.failed).toBe(0)

    const list = await service.listLectures()
    const genCount = list.filter((l) => l.markdownFileName !== null).length
    expect(genCount).toBe(2)
  })

  it('genera e salva su disco un Set di Studio (Quiz + Flashcard) con generateStudySet e permette la lettura con readStudySet', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3 = join(sourceDir, 'RC 2026-0507-10-00-00.mp3')
    const txt = join(sourceDir, 'RC 2026-0507-10-00-00.txt')
    await writeFile(mp3, 'fake audio content')
    await writeFile(
      txt,
      'Trascrizione della lezione sulle reti logiche e flip-flop.'
    )

    const summary = await service.importFiles([mp3])
    const lectureId = summary.imported[0].id

    await service.saveSettings({
      apiKey: 'valid-api-key',
      model: 'gemini-3.6-flash'
    })

    const mockStudySet = {
      lectureId,
      generatedAt: new Date().toISOString(),
      questions: [
        {
          id: 'q1',
          question: 'Qual è la funzione del flip-flop D?',
          options: [
            'Memorizzare 1 bit',
            'Eseguire somme',
            'Invertire il clock',
            'Nessuna'
          ],
          correctOptionIndex: 0,
          explanation:
            'Il flip-flop D memorizza il valore del segnale Data al fronte di clock.',
          keyConcept: 'Flip-Flop D'
        }
      ],
      flashcards: [
        {
          id: 'f1',
          front: 'Definizione di Flip-Flop',
          back: 'Elemento di memoria bistabile sincrono con clock.',
          category: 'Teoria'
        }
      ]
    }

    vi.spyOn(mockGeminiService, 'generateStudySet').mockResolvedValue(
      mockStudySet
    )

    const result = await service.generateStudySet(lectureId)
    expect(result.success).toBe(true)
    expect(result.studySet?.questions.length).toBe(1)
    expect(result.studySet?.flashcards.length).toBe(1)
    expect(result.studySet?.questions[0].correctOptionIndex).toBe(0)

    // Verifica persistenza e lettura da disco
    const savedStudySet = await service.readStudySet(lectureId)
    expect(savedStudySet).not.toBeNull()
    expect(savedStudySet?.questions[0].question).toBe(
      'Qual è la funzione del flip-flop D?'
    )
    expect(savedStudySet?.flashcards[0].front).toBe('Definizione di Flip-Flop')

    // Verifica pulizia all'eliminazione della lezione
    await service.deleteLecture(lectureId)
    const afterDelete = await service.readStudySet(lectureId)
    expect(afterDelete).toBeNull()
  })

  it('rifiuta la generazione di study set se la lezione non ha né trascrizione né dispensa', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3 = join(sourceDir, 'RC 2026-0507-10-00-00.mp3')
    await writeFile(mp3, 'audio only')

    const summary = await service.importFiles([mp3])
    const lectureId = summary.imported[0].id

    await service.saveSettings({ apiKey: 'valid-api-key' })

    const result = await service.generateStudySet(lectureId)
    expect(result.success).toBe(false)
    expect(result.error).toContain('necessaria la trascrizione o la dispensa')
  })

  it('ordina le lezioni in ordine cronologico crescente (dalla più vecchia alla più recente)', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3Old = join(sourceDir, 'RC 2026-0501-10-00-00.mp3')
    const mp3Mid = join(sourceDir, 'RC 2026-0505-10-00-00.mp3')
    const mp3New = join(sourceDir, 'RC 2026-0510-10-00-00.mp3')

    await writeFile(mp3Old, 'audio-old')
    await writeFile(mp3Mid, 'audio-mid')
    await writeFile(mp3New, 'audio-new')

    // Importa in ordine sparso
    await service.importFiles([mp3New, mp3Old, mp3Mid])

    const list = await service.listLectures()
    expect(list.length).toBe(3)
    // La prima deve essere la più vecchia (2026-0501) e l'ultima la più recente (2026-0510)
    expect(list[0].sourceAudioFileName).toBe('RC 2026-0501-10-00-00.mp3')
    expect(list[1].sourceAudioFileName).toBe('RC 2026-0505-10-00-00.mp3')
    expect(list[2].sourceAudioFileName).toBe('RC 2026-0510-10-00-00.mp3')
  })

  it('estrae correttamente il titolo dal markdown con extractMarkdownTitle e lo persiste in saveMarkdown', async () => {
    // 1. Test funzione pura
    const mdWithTitle =
      '# Modellistica della Telecamera e Proiezione Prospettica\n\n## Overview\nContenuto...'
    expect(extractMarkdownTitle(mdWithTitle)).toBe(
      'Modellistica della Telecamera e Proiezione Prospettica'
    )

    const mdWithBold =
      '# **Controllo Adattativo** e Stabilità di Lyapunov\n\nTest...'
    expect(extractMarkdownTitle(mdWithBold)).toBe(
      'Controllo Adattativo e Stabilità di Lyapunov'
    )

    const mdNoTitle = 'Nessun titolo h1\n## Solo H2'
    expect(extractMarkdownTitle(mdNoTitle)).toBeNull()

    // 2. Test persistenza su lezione reale
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })
    const mp3 = join(sourceDir, 'RC 2026-0506-00-00-00.mp3')
    await writeFile(mp3, 'audio')

    const summary = await service.importFiles([mp3])
    const lectureId = summary.imported[0].id

    // Inizialmente senza titolo
    let list = await service.listLectures()
    expect(list[0].title).toBeUndefined()

    // Salvataggio markdown con titolo H1
    await service.saveMarkdown(
      lectureId,
      '# Visione Artificiale e Calibrazione 3D\n\nTesto della dispensa...'
    )

    list = await service.listLectures()
    expect(list[0].title).toBe('Visione Artificiale e Calibrazione 3D')
    expect(list[0].markdownFileName).toBe(`${lectureId}.md`)
  })

  it('salva sessioni di studio e calcola statistiche, medie, breakdown e streak con getStudyAnalytics', async () => {
    const today = new Date().toISOString().slice(0, 10)

    // 1. Salva sessione di studio per oggi
    await service.saveStudySession({
      id: 'session-1',
      lectureId: 'lec-1',
      courseCode: 'ROBOTICA',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: 3600, // 1h
      mode: 'focus',
      date: today
    })

    // 2. Aggiunge tempo manuale
    await service.addManualStudyTime('RETI', 30, today) // 30 min = 1800s

    let analytics = await service.getStudyAnalytics()
    expect(analytics.todaySeconds).toBe(5400) // 1h 30m
    expect(analytics.todayByCourse['ROBOTICA']).toBe(3600)
    expect(analytics.todayByCourse['RETI']).toBe(1800)
    expect(analytics.weekDays.length).toBe(7)
    expect(analytics.currentStreakDays).toBe(1)
    expect(analytics.courseBreakdown.length).toBe(2)
    expect(analytics.courseBreakdown[0].courseCode).toBe('ROBOTICA')
    expect(analytics.courseBreakdown[0].percentage).toBe(67)

    // 3. Simula sessione ieri per verificare lo streak di 2 giorni
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    await service.saveStudySession({
      id: 'session-yesterday',
      lectureId: 'lec-2',
      courseCode: 'ROBOTICA',
      startTime: yesterday.toISOString(),
      endTime: yesterday.toISOString(),
      durationSeconds: 1800,
      mode: 'reading',
      date: yesterdayStr
    })

    analytics = await service.getStudyAnalytics()
    expect(analytics.currentStreakDays).toBe(2)
    expect(analytics.totalSemesterSeconds).toBe(7200) // 2h totali
  })
})

describe('Multi-Course Management, CFU & Schedule Overlap Matching', () => {
  let tempDir: string
  let service: ArchiveService

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lezionify-course-test-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })
    service = new ArchiveService(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('calcola correttamente la formula dei CFU (1 CFU = 7h aula + 18h studio = 25h totali)', async () => {
    await service.saveCourse({
      code: 'Sistemi Distribuiti',
      cfu: 6,
      lectureHours: 0,
      individualStudyHours: 0,
      totalHours: 0,
      startDate: '2026-10-01',
      endDate: '2027-01-31',
      examDate: '2027-02-15',
      schedule: [
        {
          id: 'slot-1',
          dayOfWeek: 1, // Lunedì
          startTime: '10:30',
          endTime: '12:30',
          room: 'Aula 3'
        }
      ]
    })

    const courses = await service.getCourses()
    expect(courses.length).toBe(1)
    const c = courses[0]
    expect(c.code).toBe('Sistemi Distribuiti')
    expect(c.cfu).toBe(6)
    expect(c.lectureHours).toBe(42) // 6 * 7
    expect(c.individualStudyHours).toBe(108) // 6 * 18
    expect(c.totalHours).toBe(150) // 6 * 25
  })

  it('esegue il matching orario con tolleranza (inizio anticipato e prolungamento lezione)', async () => {
    await service.saveCourse({
      code: 'Robotica',
      cfu: 9,
      lectureHours: 63,
      individualStudyHours: 162,
      totalHours: 225,
      startDate: '2026-10-01',
      endDate: '2027-01-31',
      examDate: '2027-02-20',
      schedule: [
        {
          id: 'slot-rob',
          dayOfWeek: 2, // Martedì
          startTime: '10:30',
          endTime: '12:30',
          room: 'Lab Robotica'
        }
      ]
    })

    // 1. Audio registrato Martedì 10:25 (5 min prima) per 1h50m (110 min = 6600s)
    // Data: 2026-10-13 (che è un Martedì)
    const match = await service.matchLectureToCourse(
      '2026-10-13T10:25:00',
      6600
    )
    expect(match).not.toBeNull()
    expect(match?.matchedCourseCode).toBe('Robotica')
    expect(match?.confidencePercentage).toBeGreaterThanOrEqual(80)

    // 2. Audio registrato di Mercoledì allo stesso orario -> Nessun match
    const noMatchDay = await service.matchLectureToCourse(
      '2026-10-14T10:30:00',
      7200
    )
    expect(noMatchDay).toBeNull()

    // 3. Audio registrato di Martedì ma FUORI dalle date del semestre (es. Maggio) -> Nessun match
    const noMatchSemester = await service.matchLectureToCourse(
      '2026-05-12T10:30:00',
      7200
    )
    expect(noMatchSemester).toBeNull()
  })

  it('gestisce spezzoni/pause (audio breve che cade interamente nello slot orario)', async () => {
    await service.saveCourse({
      code: 'Reti di Calcolatori',
      cfu: 6,
      lectureHours: 42,
      individualStudyHours: 108,
      totalHours: 150,
      startDate: '2026-10-01',
      endDate: '2027-01-31',
      schedule: [
        {
          id: 'slot-rc',
          dayOfWeek: 3, // Mercoledì
          startTime: '14:00',
          endTime: '16:00'
        }
      ]
    })

    // Spezzone da 45 min (2700s) registrato Mercoledì 2026-10-14 dalle 14:10 alle 14:55
    const match = await service.matchLectureToCourse(
      '2026-10-14T14:10:00',
      2700
    )
    expect(match).not.toBeNull()
    expect(match?.matchedCourseCode).toBe('Reti di Calcolatori')
    expect(match?.confidencePercentage).toBeGreaterThanOrEqual(85)
  })

  it('rinomina globalmente il corso aggiornando lezioni, note course_info e sessioni di studio', async () => {
    // 1. Crea corso originale "SD"
    await service.saveCourse({
      code: 'SD',
      cfu: 6,
      lectureHours: 42,
      individualStudyHours: 108,
      totalHours: 150,
      startDate: '2026-10-01',
      endDate: '2027-01-31',
      schedule: []
    })

    // 2. Crea finto file audio con lezione
    const audioDir = join(tempDir, 'audio')
    await mkdir(audioDir, { recursive: true })
    const audioFile = join(audioDir, 'test-rec.mp3')
    await writeFile(audioFile, Buffer.alloc(16384 * 10))

    await service.importFiles([audioFile])
    const lectures = await service.scanAndSyncLibrary()
    const lecId = lectures[0].id
    await service.updateLecture(lecId, { courseCode: 'SD' })

    // 3. Scrive note corso e sessione studio
    await service.writeCourseInfo(
      'SD',
      'Informazioni esame SD: orale + progetto'
    )
    await service.saveStudySession({
      id: 'sess-sd-1',
      lectureId: lecId,
      courseCode: 'SD',
      startTime: '2026-10-15T10:00:00',
      endTime: '2026-10-15T11:00:00',
      durationSeconds: 3600,
      mode: 'focus',
      date: '2026-10-15'
    })

    // 4. Rinomina globale da "SD" a "Sistemi Distribuiti"
    const renameRes = await service.renameCourse('SD', 'Sistemi Distribuiti')
    expect(renameRes.updatedCount).toBe(1)

    // Verifica che la lezione sia aggiornata
    const updatedLectures = await service.scanAndSyncLibrary()
    expect(updatedLectures[0].courseCode).toBe('Sistemi Distribuiti')

    // Verifica che le note corso siano state migrate
    const migratedInfo = await service.readCourseInfo('Sistemi Distribuiti')
    expect(migratedInfo).toContain('Informazioni esame SD')
    const oldInfo = await service.readCourseInfo('SD')
    expect(oldInfo).toBeNull()

    // Verifica che le analytics di studio riportino il nuovo nome
    const analytics = await service.getStudyAnalytics()
    expect(analytics.courseBreakdown[0].courseCode).toBe('Sistemi Distribuiti')
  })
})

describe('ScratchpadService & Quick Capture Data Persistence', () => {
  let tempDir: string
  let service: ArchiveService

  beforeEach(async () => {
    tempDir = join(tmpdir(), `lezionify-scratchpad-test-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })
    service = new ArchiveService(tempDir)
    await service.initialize()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  it('restituisce struttura vuota di default se scratchpad.json non esiste', async () => {
    const data = await service.getScratchpad()
    expect(data.todos).toEqual([])
    expect(data.notes).toBe('')
    expect(typeof data.updatedAt).toBe('string')
  })

  it('salva e recupera correttamente To-Do e Note su disco in scratchpad.json', async () => {
    const payload = {
      todos: [
        {
          id: 'todo-1',
          text: 'Chiamare Marco per esame',
          completed: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'todo-2',
          text: 'Inviare ricevuta al professore',
          completed: true,
          createdAt: new Date().toISOString()
        }
      ],
      notes: '• Idea per nuovo modulo RAG\n• Orario laboratorio spostato',
      updatedAt: new Date().toISOString()
    }

    await service.saveScratchpad(payload)

    const reloaded = await service.getScratchpad()
    expect(reloaded.todos.length).toBe(2)
    expect(reloaded.todos[0].text).toBe('Chiamare Marco per esame')
    expect(reloaded.todos[0].completed).toBe(false)
    expect(reloaded.todos[1].completed).toBe(true)
    expect(reloaded.notes).toContain('Idea per nuovo modulo RAG')
  })

  it('gestisce in modo resiliente file scratchpad.json corrotto o malformato', async () => {
    const scratchpadFile = join(tempDir, 'scratchpad.json')
    await writeFile(scratchpadFile, '{ malformed_json::: invalid', 'utf8')

    await expect(service.getScratchpad()).rejects.toThrow(
      'Dati JSON danneggiati'
    )
  })

  it('salva, ricarica ed elimina in modo isolato le evidenziazioni di una lezione', async () => {
    const lectureId = 'test-lecture-hl-1'
    const highlights = [
      {
        id: 'hl-1',
        startOffset: 12,
        endOffset: 45,
        text: 'Criterio di Routh-Hurwitz',
        color: 'yellow',
        createdAt: new Date().toISOString()
      },
      {
        id: 'hl-2',
        startOffset: 100,
        endOffset: 150,
        text: 'Condizione necessaria e sufficiente di stabilità',
        color: 'yellow',
        createdAt: new Date().toISOString()
      }
    ]

    // Lettura iniziale vuota
    const initial = await service.getHighlights(lectureId)
    expect(initial).toEqual([])

    // Salvataggio
    await service.saveHighlights(lectureId, highlights)

    // Ricaricamento
    const loaded = await service.getHighlights(lectureId)
    expect(loaded.length).toBe(2)
    expect(loaded[0].text).toBe('Criterio di Routh-Hurwitz')
    expect(loaded[1].startOffset).toBe(100)

    // Cancellazione
    await service.storage.deleteHighlights(lectureId)
    const afterDelete = await service.getHighlights(lectureId)
    expect(afterDelete).toEqual([])
  })
})

describe('ArchiveService — QnA Key Rotation & Diagnostic Status', () => {
  it('ruota automaticamente la chiave API in caso di quota 429 ed emette aggiornamenti di stato', async () => {
    const root = join(tmpdir(), `lezionify-qna-test-${randomUUID()}`)
    await mkdir(root, { recursive: true })
    const service = new ArchiveService(root)
    await service.initialize()

    await service.saveSettings({
      apiKeys: ['key-exhausted-429', 'key-working'],
      activeKeyIndex: 0,
      model: 'gemini-3.6-flash'
    })

    const statusUpdates: any[] = []
    service.setQnaStatusCallback((st) => {
      statusUpdates.push(st)
    })

    let attempts = 0
    vi.spyOn(
      service['geminiService'],
      'generateQnaResponse'
    ).mockImplementation(async function* (params: any) {
      attempts++
      if (params.apiKey === 'key-exhausted-429') {
        throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded')
      }
      yield 'Spiegazione del '
      yield 'criterio.'
    })

    const thread = {
      id: 'thread-test-1',
      quote: 'Criterio di Routh',
      messages: [{ role: 'user', text: 'Cos è?' }]
    }

    const res = await service.generateQnaResponse(
      'non-existent-id',
      thread,
      false
    )
    expect(res.success).toBe(true)
    expect(res.text).toBe('Spiegazione del criterio.')
    expect(attempts).toBe(2)

    expect(statusUpdates.some((u) => u.phase === 'connecting')).toBe(true)
    expect(statusUpdates.some((u) => u.phase === 'rotating_key')).toBe(true)
    expect(statusUpdates.some((u) => u.phase === 'streaming')).toBe(true)
    expect(statusUpdates.some((u) => u.phase === 'completed')).toBe(true)

    const newSettings = await service.getSettings()
    expect(newSettings.activeKeyIndex).toBe(1)
    await rm(root, { recursive: true, force: true })
  })
})

describe('AppLogger & Internal Diagnostic System', () => {
  it('maschera correttamente le chiavi API Google Gemini da messaggi o dettagli di errore', async () => {
    const { maskSensitiveData } = await import('../../electron/main/logger')
    const secretKey = 'AIzaSy' + 'A'.repeat(33)
    const rawError = `Errore chiamata API con chiave ${secretKey}: 429 Quota Exceeded`
    const masked = maskSensitiveData(rawError)
    expect(masked).not.toContain(secretKey)
    expect(masked).toContain('AIzaSy...AAAA')
    expect(masked).toContain('429 Quota Exceeded')
  })

  it('registra, memorizza nel buffer e recupera i log applicativi con getAppLogs e li pulisce con clearAppLogs', async () => {
    const root = join(tmpdir(), `lezionify-logger-test-${randomUUID()}`)
    await mkdir(root, { recursive: true })
    const service = new ArchiveService(root)
    await service.initialize()

    await service.logClientMessage(
      'info',
      'renderer',
      'Test log da interfaccia utente'
    )
    await service.logClientMessage(
      'error',
      'qna',
      'Errore simulato QnA',
      'Stack trace di prova'
    )

    const logs = await service.getAppLogs()
    expect(logs.length).toBeGreaterThanOrEqual(2)

    const rendererLog = logs.find((l) => l.source === 'renderer')
    expect(rendererLog).toBeDefined()
    expect(rendererLog?.message).toBe('Test log da interfaccia utente')
    expect(rendererLog?.level).toBe('info')

    const errorLog = logs.find((l) => l.source === 'qna' && l.level === 'error')
    expect(errorLog).toBeDefined()
    expect(errorLog?.details).toBe('Stack trace di prova')

    await service.clearAppLogs()
    const cleared = await service.getAppLogs()
    expect(cleared.length).toBe(0)

    const { logger } = await import('../../electron/main/logger')
    await logger.flush()
    await rm(root, { recursive: true, force: true })
  })
})

describe('findNextChronologicalLecture — Focus Mode Auto-Advance', () => {
  const createMockLecture = (
    id: string,
    courseCode: string | null,
    recordedAt: string | null,
    importedAt = '2026-01-01T00:00:00'
  ) => ({
    id,
    title: `Lezione ${id}`,
    courseCode,
    recordedAt,
    sourceAudioFileName: `${id}.mp3`,
    sourceTranscriptFileName: null,
    audioFileName: `${id}.mp3`,
    transcriptFileName: null,
    markdownFileName: `${id}.md`,
    byteSize: 1000,
    checksum: `hash-${id}`,
    importedAt,
    status: 'transcript-available' as const,
    studyStatus: 'da-studiare' as const
  })

  it('trova la prossima lezione in ordine cronologico per lo stesso corso anche se la lista è disordinata', () => {
    const l1 = createMockLecture(
      'l1',
      'Sistemi Distribuiti',
      '2026-03-01T10:00:00'
    )
    const l2 = createMockLecture(
      'l2',
      'Sistemi Distribuiti',
      '2026-03-03T10:00:00'
    )
    const l3 = createMockLecture(
      'l3',
      'Sistemi Distribuiti',
      '2026-03-05T10:00:00'
    )

    const unorganizedList = [l3, l1, l2]

    const nextFromL1 = findNextChronologicalLecture(l1, unorganizedList)
    expect(nextFromL1?.id).toBe('l2')

    const nextFromL2 = findNextChronologicalLecture(l2, unorganizedList)
    expect(nextFromL2?.id).toBe('l3')
  })

  it('restituisce null quando la lezione è l’ultima del corso', () => {
    const l1 = createMockLecture(
      'l1',
      'Sistemi Distribuiti',
      '2026-03-01T10:00:00'
    )
    const l2 = createMockLecture(
      'l2',
      'Sistemi Distribuiti',
      '2026-03-03T10:00:00'
    )
    const l3 = createMockLecture(
      'l3',
      'Sistemi Distribuiti',
      '2026-03-05T10:00:00'
    )

    const nextFromL3 = findNextChronologicalLecture(l3, [l1, l2, l3])
    expect(nextFromL3).toBeNull()
  })

  it('isola rigidamente la materia e ignora lezioni interposte di altri corsi', () => {
    const l1 = createMockLecture(
      'l1',
      'Sistemi Distribuiti',
      '2026-03-01T10:00:00'
    )
    const otherCourse = createMockLecture(
      'other',
      'Robotica',
      '2026-03-02T10:00:00'
    )
    const l2 = createMockLecture(
      'l2',
      'Sistemi Distribuiti',
      '2026-03-03T10:00:00'
    )

    const next = findNextChronologicalLecture(l1, [l1, otherCourse, l2])
    expect(next?.id).toBe('l2')
  })

  it('gestisce lezioni non assegnate ad alcun corso (courseCode nullo)', () => {
    const n1 = createMockLecture('n1', null, '2026-03-01T10:00:00')
    const n2 = createMockLecture('n2', null, '2026-03-04T10:00:00')

    const next = findNextChronologicalLecture(n1, [n2, n1])
    expect(next?.id).toBe('n2')
  })

  it('restituisce null per corsi con singola lezione o lista vuota', () => {
    const single = createMockLecture('s1', 'Chimica', '2026-03-01T10:00:00')
    expect(findNextChronologicalLecture(single, [single])).toBeNull()
    expect(findNextChronologicalLecture(single, [])).toBeNull()
  })

  it('effettua fallback su importedAt se recordedAt è nullo', () => {
    const i1 = createMockLecture('i1', 'RC', null, '2026-03-01T10:00:00')
    const i2 = createMockLecture('i2', 'RC', null, '2026-03-02T10:00:00')

    const next = findNextChronologicalLecture(i1, [i2, i1])
    expect(next?.id).toBe('i2')
  })
})

describe('Bilingual ITA/ENG Lectures & Batch Translation', () => {
  let testArchiveDir: string
  let mockGeminiService: GeminiService
  let service: ArchiveService

  beforeEach(async () => {
    testArchiveDir = join(tmpdir(), `lezionify-bilingual-test-${randomUUID()}`)
    await mkdir(testArchiveDir, { recursive: true })

    mockGeminiService = new GeminiService()
    // Mock translateToEnglish
    vi.spyOn(mockGeminiService, 'translateToEnglish').mockImplementation(
      async ({ markdownIta }) => {
        return `# Translated Lecture\n\nEnglish version of: ${markdownIta.slice(0, 30)} with LaTeX $E=mc^2$`
      }
    )

    service = new ArchiveService(testArchiveDir, mockGeminiService)
    await service.initialize()

    // Configura finta API key
    await service.saveSettings({
      apiKey: 'test-api-key-gemini',
      apiKeys: ['test-api-key-gemini'],
      activeKeyIndex: 0
    })
  })

  afterEach(async () => {
    await rm(testArchiveDir, { recursive: true, force: true }).catch(() => {})
  })

  async function createLectureWithMarkdown(id: string, itaContent: string) {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })
    const mp3File = join(sourceDir, `${id} 2026-0507-10-00-00.mp3`)
    const txtFile = join(sourceDir, `${id} 2026-0507-10-00-00.txt`)
    await writeFile(mp3File, `audio-unique-${id}-${randomUUID()}`)
    await writeFile(txtFile, `transcript-unique-${id}-${randomUUID()}`)
    const summary = await service.importFiles([mp3File])
    const lecture = summary.imported[0]
    await service.saveMarkdown(lecture.id, itaContent)
    return lecture
  }

  it('getTranslationCandidates restituisce solo lezioni con ITA e prive di ENG', async () => {
    const l1 = await createLectureWithMarkdown('L1', '# Lezione 1 in Italiano')
    const l2 = await createLectureWithMarkdown('L2', '# Lezione 2 in Italiano')

    // L1 e L2 hanno entrambe ITA e nessuna ENG
    let candidates = await service.getTranslationCandidates()
    expect(candidates.map((c) => c.id).sort()).toEqual([l1.id, l2.id].sort())

    // Traduciamo L1
    await service.translateLectureNotes(l1.id)

    // Ora solo L2 deve essere candidato
    candidates = await service.getTranslationCandidates()
    expect(candidates.map((c) => c.id)).toEqual([l2.id])
  })

  it('translateLectureNotes genera file _en.md e aggiorna markdownEnFileName', async () => {
    const lecture = await createLectureWithMarkdown(
      'L3',
      '# Concetti di Sistemi Distribuiti\n\n$f(x) = x^2$'
    )

    const res = await service.translateLectureNotes(lecture.id)
    expect(res.success).toBe(true)
    expect(res.markdown).toContain(
      'English version of: # Concetti di Sistemi Distribu'
    )
    expect(res.markdown).toContain('$E=mc^2$')

    const readEn = await service.readMarkdownEn(lecture.id)
    expect(readEn).toBe(res.markdown)

    // Verifica stato aggiornato nel catalogo
    const lectures = await service.listLectures()
    const updated = lectures.find((l) => l.id === lecture.id)
    expect(updated?.markdownEnFileName).toBe(`${lecture.id}_en.md`)
  })

  it('salvare/rigenerare la dispensa ITA invalida e cancella automaticamente la versione ENG', async () => {
    const lecture = await createLectureWithMarkdown(
      'L4',
      '# Versione Originale ITA'
    )

    // Traduci in inglese
    await service.translateLectureNotes(lecture.id)
    expect(await service.readMarkdownEn(lecture.id)).not.toBeNull()

    // Sovrascrivi la dispensa ITA
    await service.saveMarkdown(
      lecture.id,
      '# Versione Aggiornata ITA (Nuovo contenuto)'
    )

    // Verifica che la versione ENG sia stata invalidata (cancellata)
    const readEnAfter = await service.readMarkdownEn(lecture.id)
    expect(readEnAfter).toBeNull()

    const lectures = await service.listLectures()
    const updated = lectures.find((l) => l.id === lecture.id)
    expect(updated?.markdownEnFileName).toBeNull()
  })

  it('translateSelectedNotes esegue la traduzione batch delle lezioni selezionate', async () => {
    const l1 = await createLectureWithMarkdown('B1', '# Dispensa B1')
    const l2 = await createLectureWithMarkdown('B2', '# Dispensa B2')

    const summary = await service.translateSelectedNotes([l1.id, l2.id])
    expect(summary.total).toBe(2)
    expect(summary.succeeded).toBe(2)
    expect(summary.failed).toBe(0)

    expect(await service.readMarkdownEn(l1.id)).not.toBeNull()
    expect(await service.readMarkdownEn(l2.id)).not.toBeNull()
  })

  it('deleteLecture elimina sia il markdown ITA sia il markdown ENG e gli highlights EN', async () => {
    const lecture = await createLectureWithMarkdown(
      'DEL1',
      '# Dispensa da eliminare'
    )
    await service.translateLectureNotes(lecture.id)
    await service.saveHighlights(`${lecture.id}_en`, [
      {
        id: 'h1',
        startOffset: 0,
        endOffset: 5,
        text: 'Hello',
        createdAt: '2026-09-04'
      }
    ])

    expect(await service.readMarkdown(lecture.id)).not.toBeNull()
    expect(await service.readMarkdownEn(lecture.id)).not.toBeNull()

    const ok = await service.deleteLecture(lecture.id)
    expect(ok).toBe(true)

    expect(await service.readMarkdown(lecture.id)).toBeNull()
    expect(await service.readMarkdownEn(lecture.id)).toBeNull()
    expect(await service.getHighlights(`${lecture.id}_en`)).toEqual([])
  })
})
