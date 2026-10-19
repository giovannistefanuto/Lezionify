import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GeminiService } from '../../electron/main/gemini'
import { ArchiveService } from '../../electron/main/archive'
import { AiJobStore, computeSourceHash } from '../../electron/main/ai/aiJobStore'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'

describe('Fase D — Checkpoint Atomici e Crash-Recovery (AiJobStore & Resume Granulare)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'lezionify-phase-d-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('1. Ripresa granulare delle dispense: se la sezione 4 fallisce, le sezioni 1-3 vengono riutilizzate dal checkpoint', async () => {
    const jobStore = new AiJobStore(tempDir)
    const requestManager = new GeminiRequestManager()
    const gemini = new GeminiService({ requestManager, jobStore })

    const lectureId = 'test-lecture-recovery-123'
    // Creiamo una trascrizione lunga (> 1200 parole) con 4 parti semantiche distinte
    const longTranscript = Array.from({ length: 150 }, (_, i) => `Parola${i} della lezione approfondita`).join(' ') +
      ' [CAMBIO_ARGOMENTO_1] ' +
      Array.from({ length: 150 }, (_, i) => `SecondaParte${i} che spiega concetti avanzati`).join(' ') +
      ' [CAMBIO_ARGOMENTO_2] ' +
      Array.from({ length: 150 }, (_, i) => `TerzaParte${i} con formule e dimostrazioni`).join(' ') +
      ' [CAMBIO_ARGOMENTO_3] ' +
      Array.from({ length: 150 }, (_, i) => `QuartaParte${i} con conclusioni ed esempi pratici`).join(' ')

    // Spia su segmentTranscript: restituisce 3 tagli (4 sezioni)
    vi.spyOn(gemini, 'segmentTranscript').mockResolvedValue([
      { macroargomento: 'Argomento 1', fineParte: 'approfondita', inizioParteSuccessiva: 'SecondaParte' },
      { macroargomento: 'Argomento 2', fineParte: 'avanzati', inizioParteSuccessiva: 'TerzaParte' },
      { macroargomento: 'Argomento 3', fineParte: 'dimostrazioni', inizioParteSuccessiva: 'QuartaParte' }
    ])

    vi.spyOn(gemini, 'generateOverviewAndTitle').mockResolvedValue({
      title: 'Titolo Lezione Recupero',
      overview: '# Overview Recupero Didattico'
    })

    vi.spyOn(gemini, 'extractExamNotes').mockResolvedValue('## Domande d’esame')

    const executedSections: number[] = []
    let shouldFailSection3 = true

    vi.spyOn(gemini, 'generateSectionNotes').mockImplementation(async (params) => {
      executedSections.push(params.sectionIndex)
      if (params.sectionIndex === 3 && shouldFailSection3) {
        throw new Error('503 Service Unavailable sulla sezione 4')
      }
      return `### Sezione ${params.sectionIndex + 1}: ${params.sectionTitle}\nContenuto didattico generato per sezione ${params.sectionIndex}`
    })

    // PRIMA ESECUZIONE: fallisce sulla sezione 3 (la quarta sezione)
    await expect(
      gemini.generateLectureNotes({
        apiKey: 'key-test',
        model: 'gemini-2.5-flash',
        transcript: longTranscript,
        courseCode: 'ING-INF/05',
        recordedAt: '2026-03-01T10:00:00Z',
        sourceAudioFileName: 'lezione.mp3',
        lectureId
      })
    ).rejects.toThrow('503 Service Unavailable sulla sezione 4')

    // Verifichiamo che sono state eseguite le sezioni 0, 1, 2, 3
    expect(executedSections).toEqual([0, 1, 2, 3])

    // Verifichiamo che il checkpoint è presente su disco e contiene esattamente le prime 3 sezioni completate
    const checkpoint = await jobStore.loadLectureNotesCheckpoint(lectureId)
    expect(checkpoint).not.toBeNull()
    expect(checkpoint?.lectureId).toBe(lectureId)
    expect(checkpoint?.overview?.title).toBe('Titolo Lezione Recupero')
    expect(checkpoint?.cuts?.length).toBe(3)
    expect(checkpoint?.sections[0]).toContain('Sezione 1')
    expect(checkpoint?.sections[1]).toContain('Sezione 2')
    expect(checkpoint?.sections[2]).toContain('Sezione 3')
    expect(checkpoint?.sections[3]).toBeUndefined()

    // SECONDA ESECUZIONE (RIPRESA DOPO IL CRASH/ERRORE):
    // La sezione 4 ora non fallisce più
    shouldFailSection3 = false
    executedSections.length = 0

    const progressMessages: string[] = []
    const result = await gemini.generateLectureNotes({
      apiKey: 'key-test',
      model: 'gemini-2.5-flash',
      transcript: longTranscript,
      courseCode: 'ING-INF/05',
      recordedAt: '2026-03-01T10:00:00Z',
      sourceAudioFileName: 'lezione.mp3',
      lectureId,
      onProgress: (msg) => progressMessages.push(msg)
    })

    // CRUCIALE: le sezioni 0, 1, 2 NON devono essere rieseguite! Solo la sezione 3 deve essere chiamata!
    expect(executedSections).toEqual([3])

    // Verifichiamo che i messaggi di progresso confermano il ripristino dal checkpoint
    const restoredMessages = progressMessages.filter((m) => m.includes('ripristinata dal checkpoint'))
    expect(restoredMessages.length).toBe(3)

    // Verifichiamo che il documento finale contiene tutte e 4 le sezioni
    expect(result).toContain('Sezione 1')
    expect(result).toContain('Sezione 2')
    expect(result).toContain('Sezione 3')
    expect(result).toContain('Sezione 4')
    expect(result).toContain('# Overview Recupero Didattico')
    expect(result).toContain('## Domande d’esame')

    // Al termine con successo, il checkpoint deve essere stato eliminato automaticamente
    const finalCheckpoint = await jobStore.loadLectureNotesCheckpoint(lectureId)
    expect(finalCheckpoint).toBeNull()
  })

  it('2. Invalidazione rapida del checkpoint se il testo della trascrizione cambia', async () => {
    const jobStore = new AiJobStore(tempDir)
    const requestManager = new GeminiRequestManager()
    const gemini = new GeminiService({ requestManager, jobStore })

    const lectureId = 'test-invalidation-456'
    const originalTranscript = Array.from({ length: 1300 }, (_, i) => `Parola${i}`).join(' ')
    const originalHash = computeSourceHash(originalTranscript)

    // Simuliamo un checkpoint preesistente salvato su disco
    await jobStore.saveLectureNotesCheckpoint({
      lectureId,
      sourceTextHash: originalHash,
      model: 'gemini-2.5-flash',
      sections: {
        0: 'Sezione 1 vecchia',
        1: 'Sezione 2 vecchia'
      },
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    })

    // Testo trascrizione modificato (nuovo hash)
    const modifiedTranscript = originalTranscript + ' testo aggiunto successivamente'
    const newHash = computeSourceHash(modifiedTranscript)
    expect(newHash).not.toBe(originalHash)

    vi.spyOn(gemini, 'segmentTranscript').mockResolvedValue([])
    vi.spyOn(gemini, 'generateOverviewAndTitle').mockResolvedValue({
      title: 'Nuovo Titolo',
      overview: '# Nuova Overview'
    })
    vi.spyOn(gemini, 'extractExamNotes').mockResolvedValue(null)

    const executedSections: number[] = []
    vi.spyOn(gemini, 'generateSectionNotes').mockImplementation(async (params) => {
      executedSections.push(params.sectionIndex)
      return `Sezione nuova ${params.sectionIndex}`
    })

    await gemini.generateLectureNotes({
      apiKey: 'key-test',
      model: 'gemini-2.5-flash',
      transcript: modifiedTranscript,
      courseCode: null,
      recordedAt: null,
      sourceAudioFileName: 'audio.mp3',
      lectureId
    })

    // Poiché l'hash è diverso, la sezione 0 e 1 NON devono essere riusate dal vecchio checkpoint,
    // ma ricalcolate da zero per il nuovo testo
    expect(executedSections).toContain(0)
  })

  it('3. Pulizia automatica dei checkpoint alla cancellazione della lezione in ArchiveService', async () => {
    const archive = new ArchiveService(tempDir)
    await archive.initialize()

    // Importiamo una lezione
    const audioFile = join(tempDir, 'RC 2026-0507-16-19-41.mp3')
    await writeFile(audioFile, 'dummy audio for deletion')
    const importRes = await archive.importFiles([audioFile])
    const lectureId = importRes.imported[0].id

    // Creiamo manualmente dei checkpoint di dispense e ASR per questa lezione
    await archive.jobStore.saveLectureNotesCheckpoint({
      lectureId,
      sourceTextHash: 'hash123',
      model: 'gemini-2.5-flash',
      sections: { 0: 'Nota 1' },
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    })

    await archive.jobStore.saveAsrCheckpoint({
      lectureId,
      audioChecksum: 'chk123',
      totalChunks: 2,
      chunks: {
        0: {
          startSec: 0,
          endSec: 60,
          text: 'Chunk 1',
          status: 'transcribed',
          method: 'asr'
        }
      },
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    })

    // Verifichiamo che i checkpoint esistono prima della cancellazione
    const notesCpBefore = await archive.jobStore.loadLectureNotesCheckpoint(lectureId)
    const asrCpBefore = await archive.jobStore.loadAsrCheckpoint(lectureId)
    expect(notesCpBefore).not.toBeNull()
    expect(asrCpBefore).not.toBeNull()

    // Cancelliamo la lezione tramite l'ArchiveService
    const deleted = await archive.deleteLecture(lectureId)
    expect(deleted).toBe(true)

    // Verifichiamo che entrambi i checkpoint siano stati eliminati dal disco
    const notesCpAfter = await archive.jobStore.loadLectureNotesCheckpoint(lectureId)
    const asrCpAfter = await archive.jobStore.loadAsrCheckpoint(lectureId)
    expect(notesCpAfter).toBeNull()
    expect(asrCpAfter).toBeNull()

    archive.destroy()
  })

  it('4. AsrJobStore: salvataggio atomico e caricamento dei chunk parziali', async () => {
    const jobStore = new AiJobStore(tempDir)
    const lectureId = 'asr-test-999'

    await jobStore.saveAsrCheckpoint({
      lectureId,
      audioChecksum: 'size-mtime-12345',
      totalChunks: 3,
      chunks: {
        0: {
          startSec: 0,
          endSec: 900,
          text: 'Primo quarto d’ora di lezione',
          status: 'transcribed',
          method: 'asr'
        },
        1: {
          startSec: 900,
          endSec: 1800,
          text: '[Nessun parlato rilevato tra 15:00 e 30:00]',
          status: 'no_speech',
          method: 'asr'
        }
      },
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    })

    const loaded = await jobStore.loadAsrCheckpoint(lectureId)
    expect(loaded).not.toBeNull()
    expect(loaded?.lectureId).toBe(lectureId)
    expect(loaded?.chunks[0].text).toBe('Primo quarto d’ora di lezione')
    expect(loaded?.chunks[1].status).toBe('no_speech')
    expect(loaded?.chunks[2]).toBeUndefined()

    // Eliminazione selettiva
    await jobStore.deleteAsrCheckpoint(lectureId)
    const reloaded = await jobStore.loadAsrCheckpoint(lectureId)
    expect(reloaded).toBeNull()
  })
})
