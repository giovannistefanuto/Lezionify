import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ArchiveService,
  fileChecksum,
  parseFileName
} from '../electron/main/archive'
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

describe('ArchiveService — Ciclo di vita, CRUD, Markdown & Ricerca', () => {
  let testArchiveDir: string
  let service: ArchiveService

  beforeEach(async () => {
    testArchiveDir = join(tmpdir(), `lezionify-archive-test-${randomUUID()}`)
    await mkdir(testArchiveDir, { recursive: true })
    service = new ArchiveService(testArchiveDir)
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

  it('salva e legge note Markdown per una lezione', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, '2026-0507-16-19-41.mp3')
    await writeFile(mp3File, 'audio-md-test')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id

    // Inizialmente null
    expect(await service.readMarkdown(lectureId)).toBeNull()

    // Salvataggio Markdown con LaTeX
    const mdContent = '# Teorema di Nyquist\n\nFormula: $$f_s \\ge 2 f_{max}$$\n'
    await service.saveMarkdown(lectureId, mdContent)

    // Lettura
    const readMd = await service.readMarkdown(lectureId)
    expect(readMd).toBe(mdContent)

    const list = await service.listLectures()
    expect(list[0].markdownFileName).toBe(`${lectureId}.md`)
  })

  it('aggiorna lo stato di studio della lezione', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, '2026-0507-16-19-41.mp3')
    await writeFile(mp3File, 'audio-study-test')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id

    // Default: da-studiare
    expect(summary.imported[0].studyStatus).toBe('da-studiare')

    // Modifica a in-corso
    const inProgress = await service.updateLecture(lectureId, { studyStatus: 'in-corso' })
    expect(inProgress.studyStatus).toBe('in-corso')

    // Modifica a completata
    const completed = await service.updateLecture(lectureId, { studyStatus: 'completata' })
    expect(completed.studyStatus).toBe('completata')

    const list = await service.listLectures()
    expect(list[0].studyStatus).toBe('completata')
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

    // Aggiungiamo note Markdown alla seconda lezione
    await service.saveMarkdown(id2, '# Note su Protocolli TCP e UDP\n\nAnalisi del three-way handshake.')

    // Ricerca per corso (metadati)
    const matchCourse = await service.searchFullText('ALGORITMI')
    expect(matchCourse).toContain(id1)
    expect(matchCourse).not.toContain(id2)

    // Ricerca nel testo della trascrizione
    const matchTranscript = await service.searchFullText('computazionale')
    expect(matchTranscript).toContain(id1)
    expect(matchTranscript).not.toContain(id2)

    // Ricerca nel contenuto Markdown
    const matchMarkdown = await service.searchFullText('handshake')
    expect(matchMarkdown).toContain(id2)
    expect(matchMarkdown).not.toContain(id1)

    // Ricerca senza corrispondenze
    const matchNone = await service.searchFullText('parola_totalmente_assente')
    expect(matchNone).toEqual([])

    // Ricerca stringa vuota
    expect(await service.searchFullText('')).toEqual([])
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

    // Verifica che tutti i 3 file siano stati eliminati dal filesystem
    await expect(stat(audioPath)).rejects.toThrow()
    await expect(stat(transcriptPath)).rejects.toThrow()
    await expect(stat(markdownPath)).rejects.toThrow()

    const list = await service.listLectures()
    expect(list.length).toBe(0)
  })

  it('garantisce retrocompatibilità per record di archivio senza studyStatus o markdownFileName', async () => {
    const libraryPath = join(testArchiveDir, 'library.json')
    // Salviamo manualmente un record legacy privo di studyStatus e markdownFileName
    const legacyLibrary = {
      version: 1,
      lectures: [
        {
          id: 'legacy-id-1',
          courseCode: 'SISTEMI',
          recordedAt: '2026-01-01T10:00:00',
          sourceAudioFileName: 'SISTEMI 2026-0101-10-00-00.mp3',
          sourceTranscriptFileName: null,
          audioFileName: 'legacy-id-1.mp3',
          transcriptFileName: null,
          byteSize: 1024,
          checksum: 'abc123hash',
          importedAt: '2026-01-01T10:05:00.000Z',
          status: 'audio-only'
        }
      ]
    }
    await writeFile(libraryPath, JSON.stringify(legacyLibrary), 'utf8')

    const list = await service.listLectures()
    expect(list.length).toBe(1)
    expect(list[0].studyStatus).toBe('da-studiare')
    expect(list[0].markdownFileName).toBeNull()
  })

  it('salta i file duplicati con lo stesso checksum SHA-256', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File1 = join(sourceDir, '2026-0507-16-19-41.mp3')
    const mp3File2 = join(sourceDir, 'copia_lezione.mp3')
    await writeFile(mp3File1, 'stesso-contenuto-audio')
    await writeFile(mp3File2, 'stesso-contenuto-audio')

    const firstSummary = await service.importFiles([mp3File1])
    expect(firstSummary.imported.length).toBe(1)

    const secondSummary = await service.importFiles([mp3File2])
    expect(secondSummary.imported.length).toBe(0)
    expect(secondSummary.skipped.length).toBe(1)
    expect(secondSummary.skipped[0].reason).toContain('Audio gia presente')
  })

  it('rifiuta file con estensione non MP3', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const wavFile = join(sourceDir, 'audio.wav')
    await writeFile(wavFile, 'wav-data')

    const summary = await service.importFiles([wavFile])
    expect(summary.imported.length).toBe(0)
    expect(summary.skipped.length).toBe(1)
    expect(summary.skipped[0].reason).toContain('Sono supportati solo file MP3')
  })

  it('associa manualmente un file TXT a una lezione audio-only', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const mp3File = join(sourceDir, '2026-0507-16-19-41.mp3')
    await writeFile(mp3File, 'audio-data-no-txt')

    const summary = await service.importFiles([mp3File])
    const lectureId = summary.imported[0].id

    const externalTxt = join(sourceDir, 'trascrizione_whisper.txt')
    await writeFile(externalTxt, 'Testo prodotto da Whisper offline')

    const updated = await service.attachTranscriptFromFile(lectureId, externalTxt)
    expect(updated.status).toBe('transcript-available')
    expect(updated.sourceTranscriptFileName).toBe('trascrizione_whisper.txt')

    const text = await service.readTranscript(lectureId)
    expect(text).toBe('Testo prodotto da Whisper offline')
  })

  it('lancia errore quando si tenta di associare un TXT o salvare Markdown su ID inesistente', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })
    const dummyTxt = join(sourceDir, 'test.txt')
    await writeFile(dummyTxt, 'test')

    await expect(service.attachTranscriptFromFile('id-finto', dummyTxt)).rejects.toThrow(
      'Lezione non trovata.'
    )
    await expect(service.saveMarkdown('id-finto', '# Test')).rejects.toThrow(
      'Lezione non trovata.'
    )
  })

  it('ordina le lezioni in modo decrescente per data', async () => {
    const sourceDir = join(testArchiveDir, 'incoming')
    await mkdir(sourceDir, { recursive: true })

    const file1 = join(sourceDir, '2026-0110-10-00-00.mp3')
    const file2 = join(sourceDir, '2026-0520-14-00-00.mp3')
    const file3 = join(sourceDir, '2026-0315-09-00-00.mp3')

    await writeFile(file1, 'audio-1')
    await writeFile(file2, 'audio-2')
    await writeFile(file3, 'audio-3')

    await service.importFiles([file1, file2, file3])

    const sorted = await service.listLectures()
    expect(sorted.map((l) => l.recordedAt)).toEqual([
      '2026-05-20T14:00:00',
      '2026-03-15T09:00:00',
      '2026-01-10T10:00:00'
    ])
  })
})
