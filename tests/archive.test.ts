import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ArchiveService,
  fileChecksum,
  parseFileName
} from '../electron/main/archive'
import { cleanMarkdownOutput, parseMultimodalAudioResponse, GeminiService } from '../electron/main/gemini'
import { SettingsService } from '../electron/main/settings'
import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
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
      const parsed = parseFileName('SISTEMI_DISTRIBUITI-M1 2026-1012-09-15-30.mp3')
      expect(parsed).not.toBeNull()
      expect(parsed?.courseCode).toBe('SISTEMI_DISTRIBUITI-M1')
      expect(parsed?.recordedAt).toBe('2026-10-12T09:15:30')
    })

    it('riconosce caratteri unicode nel corso', () => {
      const parsed = parseFileName('FondamentiDiIngegneria_Elettronica 2026-0315-11-00-00.mp3')
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
    const content = Buffer.from('Contenuto audio fittizio per il test di checksum '.repeat(100))
    await writeFile(filePath, content)
    const hash = await fileChecksum(filePath)
    const expected = createHash('sha256').update(content).digest('hex')
    expect(hash).toBe(expected)
  })
})

describe('cleanMarkdownOutput & parseMultimodalAudioResponse', () => {
  it('rimuove i backticks ```markdown ... ``` se presenti come wrapper', () => {
    const raw = '```markdown\n# Titolo Lezione\n\nTesto con formula $x=1$.\n```'
    expect(cleanMarkdownOutput(raw)).toBe('# Titolo Lezione\n\nTesto con formula $x=1$.')
  })

  it('preserva il markdown standard senza wrapper esterno', () => {
    const raw = '# Titolo\n\nParagrafo con formula $$E=mc^2$$.'
    expect(cleanMarkdownOutput(raw)).toBe('# Titolo\n\nParagrafo con formula $$E=mc^2$$.')
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
    expect(parsed.markdown).toBe('# Protocollo TCP\n\n## Overview Didattica\nSintesi del protocollo.')
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
    expect((await stat(join(testArchiveDir, 'transcripts'))).isDirectory()).toBe(true)
    expect((await stat(join(testArchiveDir, 'markdown'))).isDirectory()).toBe(true)
  })

  it('importa file MP3 e associa automaticamente il TXT omonimo', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, 'RC 2026-0507-16-19-41.mp3')
    const txtFile = join(sourceDir, 'RC 2026-0507-16-19-41.txt')
    await writeFile(mp3File, 'fake-mp3-stream-1')
    await writeFile(txtFile, 'Trascrizione grezza della lezione di Reti di Calcolatori')

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
    expect(readText).toBe('Trascrizione grezza della lezione di Reti di Calcolatori')

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

    await service.saveSettings({ apiKeys: ['test-valid-api-key'], model: 'gemini-3.6-flash' })

    const mockMarkdown = `# Lezione Reti di Calcolatori\n\n## Overview Didattica\nRiassunto del protocollo TCP.\n\n## Corpo della Lezione\nFormula finestra: $$W = \\min(CWND, RWND)$$\n\n> [!NOTE]\n> Note per l'Esame: domanda frequente sul three-way handshake.`
    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockResolvedValue(mockMarkdown)

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
    await service.saveSettings({ apiKeys: ['test-valid-api-key'], model: 'gemini-3.6-flash' })

    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockResolvedValue('# Dispensa Batch')

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

    await service.saveSettings({ apiKeys: ['test-valid-api-key'], model: 'gemini-3.6-flash' })

    vi.spyOn(mockGeminiService, 'transcribeAndGenerateFromAudio').mockResolvedValue({
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
    vi.spyOn(mockGeminiService, 'generateLectureNotes').mockImplementation(async (params) => {
      if (params.apiKey === 'key-exhausted') {
        throw new Error('RESOURCE_EXHAUSTED: quota exceeded for current key')
      }
      return mockMarkdown
    })

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
    await writeFile(txtFile1, 'Oggi parliamo di complessità computazionale e alberi binari di ricerca.')

    const mp3File2 = join(sourceDir, '2026-0502-10-00-00.mp3')
    await writeFile(mp3File2, 'audio-2')

    const summary = await service.importFiles([mp3File1, mp3File2])
    const id1 = summary.imported.find((l) => l.courseCode === 'ALGORITMI')!.id
    const id2 = summary.imported.find((l) => l.courseCode === null)!.id

    await service.saveMarkdown(id2, '# Note su Protocolli TCP e UDP\n\nAnalisi del three-way handshake.')

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
    const transcriptPath = join(testArchiveDir, 'transcripts', lecture.transcriptFileName!)
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
})
