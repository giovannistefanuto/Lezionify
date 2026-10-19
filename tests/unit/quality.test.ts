import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import fs from 'node:fs'
import { atomicWrite, readRecoverable } from '../../electron/main/atomicFile'
import { ArchiveService } from '../../electron/main/archive'
import {
  GEMS_SYSTEM_INSTRUCTION,
  GeminiService,
  SECTION_DEEP_SYSTEM_INSTRUCTION,
  TRANSLATION_SYSTEM_INSTRUCTION,
  callWithRetry,
  formatTimecode,
  extractInteractionText,
  isNonSpeechTranscript,
  trimOverlapWords,
  mapWithConcurrency,
  parseMultimodalAudioResponse,
  sliceTranscriptByCuts
} from '../../electron/main/gemini'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { parseByteRange } from '../../electron/main/httpRange'
import { AppLogger } from '../../electron/main/logger'
import { SettingsService } from '../../electron/main/settings'
import { parseMp3Duration } from '../../electron/main/mp3Duration'
import {
  buildTranscriptSearchResult,
  countTranscriptWords
} from '../../src/components/TranscriptPanel'
import { formatDurationSeconds } from '../../src/components/TranscriptionProgressBox'
import { areMarkdownViewerPropsEqual } from '../../src/components/MarkdownViewer'
import {
  isSafeMermaidSvg,
  validateMermaidSource
} from '../../src/components/MermaidDiagram'
import {
  calendarDayDifference,
  formatLocalCalendarDate,
  parseLocalCalendarDate
} from '../../shared/calendarDate'

it('limita la concorrenza delle richieste AI e conserva l ordine dei risultati', async () => {
  let active = 0
  let peak = 0
  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return value * 2
  })
  expect(peak).toBe(2)
  expect(results).toEqual([2, 4, 6, 8, 10])
})

it('applica retry progressivi solo agli errori transitori e rispetta il timeout totale', async () => {
  let attempts = 0
  const delays: number[] = []
  const result = await callWithRetry(
    async () => {
      attempts += 1
      if (attempts < 3) throw new Error('503 UNAVAILABLE')
      return 'ok'
    },
    { retryDelayMs: 1, maxRetries: 3, timeoutMs: 100, onRetry: (_, delay) => delays.push(delay) }
  )
  expect(result).toBe('ok')
  expect(delays).toEqual([1, 2])

  await expect(
    callWithRetry(() => new Promise(() => {}), { maxRetries: 0, timeoutMs: 10 })
  ).rejects.toThrow('Timeout complessivo')
})

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lezionify-quality-'))
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

it.each([
  'testo senza separatori',
  '=== TRASCRIZIONE GREZZA ====== DISPENSA DIDATTICA ===testo',
  '=== TRASCRIZIONE GREZZA ===testo=== DISPENSA DIDATTICA ===',
  '=== DISPENSA DIDATTICA ===testo=== TRASCRIZIONE GREZZA ===testo',
  '=== TRASCRIZIONE GREZZA ===a=== TRASCRIZIONE GREZZA ===b=== DISPENSA DIDATTICA ===c'
])('rifiuta una risposta audio non valida: %s', (raw) => {
  expect(() => parseMultimodalAudioResponse(raw)).toThrow(
    'Risposta audio non valida'
  )
})

it('segmentazione senza perdita, duplicazione o riordino anche con marker fuori ordine', () => {
  const source =
    '  Primo, argomento!\n\n Secondo: formule àè + x.\n Terzo, conclusioni.  '
  for (const markers of [
    ['Terzo', 'Primo', 'assente'],
    ['secondoformule', 'terzoconclusioni'],
    ['', '', '', '', '', '']
  ]) {
    const parts = sliceTranscriptByCuts(
      source,
      markers.map((marker) => ({
        macroargomento: 'tema',
        fineParte: '',
        inizioParteSuccessiva: marker
      }))
    )
    expect(parts.map((p) => p.text).join('')).toBe(source)
    expect(parts.every((p) => p.text.length > 0)).toBe(true)
  }
})

it('serializza le scritture, conserva un backup valido e recupera JSON troncato', async () => {
  const file = join(root, 'notes.json')
  await Promise.all(
    Array.from({ length: 30 }, (_, n) =>
      atomicWrite(file, JSON.stringify({ n }))
    )
  )
  expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ n: 29 })
  await writeFile(file, '{troncato')
  expect(JSON.parse(await readRecoverable(file))).toEqual({ n: 28 })
  await atomicWrite(file, JSON.stringify({ n: 30 }))
  expect(JSON.parse(await readFile(`${file}.bak`, 'utf8'))).toEqual({ n: 28 })
  expect((await readdir(root)).some((name) => name.endsWith('.tmp'))).toBe(
    false
  )
})

async function fixture() {
  const gemini = new GeminiService()
  const archive = new ArchiveService(root, gemini)
  await archive.initialize()
  await archive.saveSettings({ apiKeys: ['test-only-placeholder'] })
  const audio = join(root, 'RC 2026-0507-16-19-41.mp3')
  await writeFile(audio, 'fake test audio')
  await archive.importFiles([audio])
  const [lecture] = await archive.listLectures()
  return { archive, gemini, lecture }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

it('la trascrizione lenta non blocca il salvataggio e non sovrascrive modifiche concorrenti', async () => {
  const { archive, gemini, lecture } = await fixture()
  const remote = deferred<string>()
  const started = deferred<void>()
  vi.spyOn(gemini, 'transcribeAudioFile').mockImplementation(() => {
    started.resolve()
    return remote.promise
  })
  const job = archive.transcribeAudio(lecture.id)
  await started.promise
  await archive.updateLecture(lecture.id, { studyStatus: 'completata' })
  remote.resolve('trascrizione')
  expect((await job).success).toBe(false)
  expect((await archive.listLectures())[0].studyStatus).toBe('completata')
  expect(await archive.readTranscript(lecture.id)).toBeNull()
})

it('salva il timer durante una trascrizione e mantiene separato il job IPC', async () => {
  const { archive, gemini, lecture } = await fixture()
  const remote = deferred<string>()
  const started = deferred<void>()
  const progress: { jobId: string; lectureId: string }[] = []
  archive.setProgressCallback((event) => progress.push(event))
  vi.spyOn(gemini, 'transcribeAudioFile').mockImplementation(() => {
    started.resolve()
    return remote.promise
  })

  const transcription = archive.transcribeAudio(lecture.id, 'job-timer-test')
  await started.promise
  const now = new Date().toISOString()
  await expect(
    archive.saveStudySession({
      id: 'timer-during-transcription',
      lectureId: lecture.id,
      courseCode: lecture.courseCode,
      startTime: now,
      endTime: now,
      durationSeconds: 30,
      mode: 'focus',
      date: formatLocalCalendarDate()
    })
  ).resolves.toBeUndefined()
  expect((await archive.getStudyAnalytics()).todaySeconds).toBe(30)

  remote.resolve('trascrizione')
  expect((await transcription).success).toBe(true)
  expect(progress.length).toBeGreaterThan(0)
  expect(progress.every((event) => event.jobId === 'job-timer-test')).toBe(true)
})

it('calcola la durata reale di MP3 con bitrate differenti e migra le lezioni esistenti', async () => {
  const makeFrames = (bitrateIndex: number, bitrateKbps: number) => {
    const frameLength = Math.floor((144 * bitrateKbps * 1000) / 44_100)
    const buffer = Buffer.alloc(frameLength * 100)
    for (let offset = 0; offset < buffer.length; offset += frameLength) {
      buffer[offset] = 0xff
      buffer[offset + 1] = 0xfb
      buffer[offset + 2] = bitrateIndex << 4
      buffer[offset + 3] = 0
    }
    return buffer
  }
  const expectedSeconds = (100 * 1152) / 44_100
  const mp3 = makeFrames(9, 128)
  expect(parseMp3Duration(mp3)).toBeCloseTo(expectedSeconds, 5)
  expect(parseMp3Duration(makeFrames(11, 192))).toBeCloseTo(expectedSeconds, 5)

  const { archive, lecture } = await fixture()
  const audioPath = await archive.getAudioFilePath(lecture.id)
  expect(audioPath).not.toBeNull()
  await writeFile(audioPath!, mp3)
  await archive.scanAndSyncLibrary()
  expect((await archive.listLectures())[0].durationSeconds).toBeCloseTo(
    expectedSeconds,
    5
  )
})

it('cerca e conta correttamente in una trascrizione molto lunga', () => {
  const transcript = Array.from(
    { length: 100_000 },
    (_, index) => (index % 10 === 0 ? 'formula (x+y)' : 'parola')
  ).join(' ')
  expect(countTranscriptWords(transcript)).toBe(110_000)
  const result = buildTranscriptSearchResult(transcript, '(x+y)')
  expect(result?.count).toBe(10_000)
  expect(result?.parts.length).toBe(20_001)
})

it('aggrega una cronologia ampia in una passata ed evita riscritture identiche', async () => {
  const archive = new ArchiveService(root, new GeminiService())
  await archive.initialize()
  const storage = (archive as any).storage
  const now = new Date().toISOString()
  const today = formatLocalCalendarDate()
  const sessions = Array.from({ length: 10_000 }, (_, index) => ({
    id: `large-${index}`,
    lectureId: null,
    courseCode: index % 2 === 0 ? 'A' : 'B',
    startTime: now,
    endTime: now,
    durationSeconds: 1,
    mode: 'manual' as const,
    date: today
  }))
  await storage.writeStudySessions(sessions)
  const analytics = await archive.getStudyAnalytics()
  expect(analytics.todaySeconds).toBe(10_000)
  expect(analytics.courseBreakdown).toEqual([
    { courseCode: 'A', totalSeconds: 5_000, percentage: 50 },
    { courseCode: 'B', totalSeconds: 5_000, percentage: 50 }
  ])

  const write = vi.spyOn(storage, 'writeStudySessions')
  await archive.saveStudySession(sessions[0])
  expect(write).not.toHaveBeenCalled()
})

it('serializza salvataggi concorrenti delle impostazioni senza perdere campi', async () => {
  const settings = new SettingsService(root)
  await Promise.all([
    settings.saveSettings({ autoRotateOnQuota: false }),
    settings.saveSettings({ model: 'gemini-2.5-pro' })
  ])
  expect(await settings.getSettings()).toMatchObject({
    autoRotateOnQuota: false,
    model: 'gemini-2.5-pro'
  })
})

it('rifiuta payload renderer non conformi e accetta un corso con zero CFU', async () => {
  const archive = new ArchiveService(root, new GeminiService())
  await archive.initialize()
  const validCourse = {
    code: 'VALIDO',
    cfu: 6,
    lectureHours: 42,
    individualStudyHours: 108,
    totalHours: 150,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    examDate: '2027-01-15',
    schedule: [
      {
        id: 'slot-valido',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00'
      }
    ]
  }
  await expect(
    archive.saveCourse({ code: 'rotto', cfu: -1 })
  ).rejects.toThrow('Corso')
  await expect(
    archive.saveCourse({ ...validCourse, lectureHours: -1 })
  ).rejects.toThrow('corso')
  await expect(
    archive.saveCourse({ ...validCourse, startDate: '2026-02-30' })
  ).rejects.toThrow('corso')
  await expect(
    archive.saveCourse({
      ...validCourse,
      schedule: [{ ...validCourse.schedule[0], startTime: '25:00' }]
    })
  ).rejects.toThrow('Orario')
  await expect(
    archive.saveStudySession({ id: 'rotto', durationSeconds: -1 })
  ).rejects.toThrow('Sessione')
  await expect(archive.saveScratchpad({ todos: 'no' })).rejects.toThrow(
    'Quick Capture'
  )
  await expect(
    new SettingsService(root).saveSettings({ activeKeyIndex: 'uno' })
  ).rejects.toThrow('Impostazioni')

  await archive.saveCourse({
    code: 'ZERO',
    cfu: 0,
    lectureHours: 0,
    individualStudyHours: 0,
    totalHours: 0,
    startDate: '2026-09-01',
    endDate: '2026-12-31',
    examDate: '2027-01-15',
    schedule: [
      {
        id: 'slot-zero',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00'
      }
    ]
  })
  expect((await archive.getCourses())[0]).toMatchObject({
    code: 'ZERO',
    cfu: 0,
    lectureHours: 0,
    individualStudyHours: 0,
    totalHours: 0
  })
})

it('scarta traduzioni obsolete prima di creare il file derivato', async () => {
  const { archive, gemini, lecture } = await fixture()
  await archive.saveMarkdown(lecture.id, '# Prima versione')
  const remote = deferred<string>()
  const started = deferred<void>()
  vi.spyOn(gemini, 'translateToEnglish').mockImplementation(() => {
    started.resolve()
    return remote.promise
  })
  const job = archive.translateLectureNotes(lecture.id)
  await started.promise
  await archive.saveMarkdown(lecture.id, '# Seconda versione')
  remote.resolve('# Outdated translation')
  expect((await job).success).toBe(false)
  expect(await archive.readMarkdownEn(lecture.id)).toBeNull()
  expect(
    (await readdir(join(root, 'markdown'))).some((name) =>
      name.endsWith('_en.md')
    )
  ).toBe(false)
})

it('scarta studio set quando la lezione viene eliminata durante la richiesta', async () => {
  const { archive, gemini, lecture } = await fixture()
  await archive.saveMarkdown(lecture.id, '# Fonte')
  const remote = deferred<any>()
  const started = deferred<void>()
  vi.spyOn(gemini, 'generateStudySet').mockImplementation(() => {
    started.resolve()
    return remote.promise
  })
  const job = archive.generateStudySet(lecture.id)
  await started.promise
  await archive.deleteLecture(lecture.id)
  remote.resolve({ lectureId: lecture.id, quizzes: [], flashcards: [] })
  expect((await job).success).toBe(false)
  expect(await readdir(join(root, 'study_sets'))).toEqual([])
})

it('una ricerca senza risultati usa solo l’indice pronto', async () => {
  const { archive, lecture } = await fixture()
  await archive.saveMarkdown(lecture.id, '# Testo indicizzato')
  const storage = (archive as any).storage
  const read = vi.spyOn(storage, 'readMarkdown')
  expect(await archive.searchFullText('zzzzzznessunrisultato')).toEqual([])
  expect(read).not.toHaveBeenCalled()
})

it('indicizza inglese al salvataggio, dopo aggiornamenti metadati e al riavvio', async () => {
  const { archive, gemini, lecture } = await fixture()
  await archive.saveMarkdown(lecture.id, '# Fonte italiana')
  vi.spyOn(gemini, 'translateToEnglish').mockResolvedValue('# Electromagnetism')
  expect((await archive.translateLectureNotes(lecture.id)).success).toBe(true)
  await archive.updateLecture(lecture.id, { studyStatus: 'completata' })
  expect(await archive.searchFullText('electromagnetism')).toContain(lecture.id)
  const restarted = new ArchiveService(root, gemini)
  await restarted.initialize()
  expect(await restarted.searchFullText('electromagnetism')).toContain(
    lecture.id
  )
  await restarted.saveMarkdown(lecture.id, '# Nuova fonte')
  expect(await restarted.searchFullText('electromagnetism')).toEqual([])
})

it('non blocca l’inizializzazione durante il warm-up dell’indice', async () => {
  const { archive, lecture } = await fixture()
  await archive.saveMarkdown(lecture.id, '# Contenuto lungo')
  const restarted = new ArchiveService(root, new GeminiService())
  const delayed = deferred<string | null>()
  vi.spyOn((restarted as any).storage, 'readMarkdown').mockReturnValue(
    delayed.promise
  )
  await expect(restarted.initialize()).resolves.toBeUndefined()
  delayed.resolve('# Contenuto lungo')
  await vi.waitFor(() => {
    expect((restarted as any).searchIndexReady).toBe(true)
  })
  await AppLogger.getInstance().flush()
})

it('interpreta range completi, aperti e suffix e rifiuta quelli invalidi', () => {
  expect(parseByteRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 })
  expect(parseByteRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 })
  expect(parseByteRange('bytes=-15', 100)).toEqual({ start: 85, end: 99 })
  expect(parseByteRange('bytes=-200', 100)).toEqual({ start: 0, end: 99 })
  expect(parseByteRange('bytes=90-200', 100)).toEqual({ start: 90, end: 99 })
  for (const invalid of [
    'bytes=-0',
    'bytes=100-',
    'bytes=20-10',
    'items=0-1',
    'bytes=a-b',
    'bytes='
  ]) {
    expect(parseByteRange(invalid, 100)).toBeNull()
  }
})

it('gestisce date calendario locali, mezzanotte e cambio dell’ora legale', () => {
  expect(formatLocalCalendarDate(new Date(2026, 8, 6, 23, 59, 59))).toBe(
    '2026-09-06'
  )
  expect(parseLocalCalendarDate('2026-02-29')).toBeNull()
  expect(parseLocalCalendarDate('2024-02-29')).not.toBeNull()
  expect(calendarDayDifference('2026-03-28', '2026-03-30')).toBe(2)
  expect(calendarDayDifference('2026-10-24', '2026-10-26')).toBe(2)
})

it('non segnala il primo avvio come corruzione e non esegue stat per ogni log', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect((await new SettingsService(root).getSettings()).apiKeys).toEqual([])
  expect(error).not.toHaveBeenCalled()
  const logger = AppLogger.getInstance()
  logger.init(root)
  const statSpy = vi.spyOn(fs.promises, 'stat')
  logger.info('quality', 'uno')
  logger.info('quality', 'due')
  await logger.flush()
  expect(statSpy).not.toHaveBeenCalled()
})

it('conserva gli ultimi 5000 eventi diagnostici anche dopo il riavvio', async () => {
  const logger = AppLogger.getInstance()
  await logger.flush()
  const entries = Array.from({ length: 5001 }, (_, index) => ({
    id: `log-${index}`, timestamp: '2026-10-12T10:00:00Z', level: 'info',
    source: 'gemini-api', message: `Tentativo sintetico ${index}`
  }))
  await fs.promises.writeFile(join(root, 'app.log'), entries.map(entry => JSON.stringify(entry)).join('\n') + '\n')
  logger.init(root)
  expect(logger.getLogs()).toHaveLength(5000)
  expect(logger.getLogs()[0].id).toBe('log-1')
  logger.info('gemini-api', 'Nuovo tentativo sintetico')
  expect(logger.getLogs()).toHaveLength(5000)
  expect(logger.getLogs()[0].id).toBe('log-2')
  await logger.flush()
  logger.init(root)
  expect(logger.getLogs()).toHaveLength(5000)
  expect(logger.getLogs().at(-1)?.message).toBe('Nuovo tentativo sintetico')
})

it('valida lo schema completo e ripristina library.json dal backup', async () => {
  const repository = new LibraryRepository(root)
  await repository.initialize()
  const valid = {
    version: 1,
    lectures: [
      {
        id: 'lecture-1',
        courseCode: null,
        recordedAt: null,
        sourceAudioFileName: 'a.mp3',
        sourceTranscriptFileName: null,
        audioFileName: 'lecture-1.mp3',
        transcriptFileName: null,
        markdownFileName: null,
        markdownEnFileName: null,
        byteSize: 10,
        checksum: 'abc',
        importedAt: '2026-09-06T10:00:00',
        status: 'audio-only',
        studyStatus: 'da-studiare'
      }
    ]
  } as const
  await repository.writeLibrary(valid as any)
  await repository.writeLibrary(valid as any)
  await writeFile(join(root, 'library.json'), '{broken')
  repository.invalidateCache()
  expect((await repository.readLibrary()).lectures[0].id).toBe('lecture-1')
  expect(
    JSON.parse(await readFile(join(root, 'library.json'), 'utf8')).lectures
  ).toHaveLength(1)
  await writeFile(
    join(root, 'library.json'),
    JSON.stringify({ version: 1, lectures: [{}] })
  )
  await writeFile(
    join(root, 'library.json.bak'),
    JSON.stringify({ version: 1, lectures: [{}] })
  )
  repository.invalidateCache()
  await expect(repository.readLibrary()).rejects.toThrow('formato non valido')
})

it('rinomina e fonde corsi senza collisioni e preserva il corso destinazione', async () => {
  const { archive, lecture } = await fixture()
  await archive.updateLecture(lecture.id, { courseCode: 'A B' })
  await archive.writeCourseInfo('A B', 'Note sorgente')
  await archive.writeCourseInfo('A_B', 'Note destinazione')
  const course = (code: string, cfu: number) => ({
    code,
    cfu,
    lectureHours: cfu * 7,
    individualStudyHours: cfu * 18,
    totalHours: cfu * 25,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    schedule: []
  })
  await archive.saveSettings({
    courses: { 'A B': course('A B', 6), A_B: course('A_B', 9) }
  })
  await archive.addManualStudyTime('A B', 30, '2026-09-06')
  expect((await archive.renameCourse('A B', 'A_B')).updatedCount).toBe(1)
  expect((await archive.listLectures())[0].courseCode).toBe('A_B')
  expect((await archive.getSettings()).courses?.A_B.cfu).toBe(9)
  expect(await archive.readCourseInfo('A_B')).toContain('Note sorgente')
  expect(await archive.readCourseInfo('A_B')).toContain('Note destinazione')
  expect(
    (await archive.getStudyAnalytics()).courseBreakdown[0].courseCode
  ).toBe('A_B')
})

it('ripristina tutti i dati se la rinomina corso fallisce a metà', async () => {
  const { archive, lecture } = await fixture()
  await archive.updateLecture(lecture.id, { courseCode: 'OLD' })
  await archive.writeCourseInfo('OLD', 'Vecchie note')
  const storage = (archive as any).storage
  vi.spyOn(storage, 'writeStudySessions').mockRejectedValueOnce(
    new Error('disk full')
  )
  await expect(archive.renameCourse('OLD', 'NEW')).rejects.toThrow('disk full')
  expect((await archive.listLectures())[0].courseCode).toBe('OLD')
  expect(await archive.readCourseInfo('OLD')).toBe('Vecchie note')
  expect(await archive.readCourseInfo('NEW')).toBeNull()
})

it('cancella Q&A e ripristina i file se il commit della libreria fallisce', async () => {
  const { archive, lecture } = await fixture()
  await archive.saveQnaThreads(lecture.id, [
    {
      id: 'q',
      quote: 'x',
      contextHeading: null,
      messages: [],
      createdAt: '',
      updatedAt: ''
    }
  ])
  const repository = (archive as any).repository
  vi.spyOn(repository, 'writeLibrary').mockRejectedValueOnce(
    new Error('commit failure')
  )
  await expect(archive.deleteLecture(lecture.id)).rejects.toThrow(
    'commit failure'
  )
  expect((await archive.listLectures())[0].id).toBe(lecture.id)
  expect(await archive.loadQnaThreads(lecture.id)).toHaveLength(1)
  expect(await archive.getAudioFilePath(lecture.id)).not.toBeNull()
  vi.restoreAllMocks()
  await archive.deleteLecture(lecture.id)
  expect(await archive.loadQnaThreads(lecture.id)).toEqual([])
})

it('annulla i file copiati quando il commit di importazione fallisce', async () => {
  const archive = new ArchiveService(root, new GeminiService())
  await archive.initialize()
  const source = join(root, 'source.mp3')
  await writeFile(source, 'unique audio')
  vi.spyOn((archive as any).repository, 'writeLibrary').mockRejectedValueOnce(
    new Error('commit failure')
  )
  await expect(archive.importFiles([source])).rejects.toThrow('commit failure')
  expect(await readdir(join(root, 'audio'))).toEqual([])
  expect(await archive.listLectures()).toEqual([])
})

it('la sincronizzazione usa lo stem esatto e riconcilia riferimenti mancanti', async () => {
  const { archive, lecture } = await fixture()
  await writeFile(join(root, 'transcripts', 'lecture10.txt'), 'sbagliata')
  await archive.scanAndSyncLibrary()
  expect((await archive.listLectures())[0].transcriptFileName).toBeNull()
  const correct = `${lecture.sourceAudioFileName.replace(/\.mp3$/i, '')}.txt`
  await writeFile(join(root, 'transcripts', correct), 'corretta')
  await archive.scanAndSyncLibrary()
  expect(await archive.readTranscript(lecture.id)).toBe('corretta')
  await rm(join(root, 'transcripts', `${lecture.id}.txt`))
  await archive.scanAndSyncLibrary()
  expect((await archive.listLectures())[0].transcriptFileName).toBeNull()
})

it('non riutilizza MarkdownViewer quando cambiano i callback delle evidenziazioni', () => {
  const firstAdd = () => {}
  const secondAdd = () => {}
  const remove = () => false
  const base = {
    content: '# Appunti',
    onAddHighlight: firstAdd,
    onRemoveHighlightAtOffset: remove
  }
  expect(areMarkdownViewerPropsEqual(base, { ...base })).toBe(true)
  expect(
    areMarkdownViewerPropsEqual(base, {
      ...base,
      onAddHighlight: secondAdd
    })
  ).toBe(false)
})

it('mantiene gli stili Q&A circoscritti e le varianti tema dei componenti condivisi', async () => {
  const [qnaCss, stylesCss] = await Promise.all([
    readFile(join(process.cwd(), 'src', 'qna.css'), 'utf8'),
    readFile(join(process.cwd(), 'src', 'styles.css'), 'utf8')
  ])
  expect(qnaCss).toContain('.qna-sidebar')
  expect(qnaCss).not.toContain('.floating-ask-btn')
  expect(qnaCss).not.toContain('span.qna-highlight')
  expect(stylesCss).toContain('.floating-ask-btn')
  expect(stylesCss).toContain("[data-theme='dark'] .regenerate-confirm-box")
  expect(stylesCss).toContain('.dark-theme .regenerate-confirm-box')
})

it('accetta soltanto diagrammi Mermaid didattici senza direttive interattive', () => {
  const diagram = validateMermaidSource(`flowchart LR
    accTitle: Pipeline didattica
    accDescr: Dall'audio alla dispensa
    A["Audio"] --> B["Trascrizione"] --> C["Dispensa"]`)
  expect(diagram).toContain('flowchart LR')
  expect(() => validateMermaidSource('gantt\ntitle Piano')).toThrow(
    'non è supportato'
  )
  expect(() =>
    validateMermaidSource('flowchart LR\nA --> B\nclick A "https://example.com"')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('---\nconfig:\n  theme: dark\n---\nflowchart LR\nA-->B')
  ).toThrow('non è supportato')
})

it('consente gli stili Mermaid statici ma rifiuta CSS e direttive arbitrarie', () => {
  const diagram = `flowchart TD
    A["Computer Tradizionale"] --> B["Dati digitali"]
    C["Robot Intelligente"] --> D["Mondo fisico"]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px`
  expect(validateMermaidSource(diagram)).toBe(diagram)
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nstyle A fill:url(javascript:alert(1))')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nstyle A fill:#fff,stroke-width:100px')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nstyle A fill:#fff;click A "https://example.com"')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nlinkStyle 0 stroke:#333')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('sequenceDiagram\nA->>B: ciao\nstyle A fill:#fff')
  ).toThrow('direttiva non consentita')
})

it('consente classDef statiche nei flowchart senza aprire al CSS arbitrario', () => {
  const diagram = `flowchart TD
    subgraph Ambiente ["Ambiente (Environment)"]
      S["Stato"]
      R["Ricompensa"]
    end
    A["Azione"] --> S
    classDef default fill:#f9f,stroke:#333,stroke-width:2px;`
  expect(validateMermaidSource(diagram)).toBe(diagram)
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nclassDef default fill:url(javascript:alert(1));')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('flowchart TD\nA-->B\nclassDef default fill:#fff;click A "https://example.com"')
  ).toThrow('direttiva non consentita')
  expect(() =>
    validateMermaidSource('sequenceDiagram\nA->>B: ciao\nclassDef default fill:#fff;')
  ).toThrow('direttiva non consentita')
})

it('rifiuta SVG Mermaid con contenuto eseguibile', () => {
  expect(isSafeMermaidSvg('<svg><path /></svg>')).toBe(true)
  expect(isSafeMermaidSvg('<svg onload="alert(1)"></svg>')).toBe(false)
  expect(isSafeMermaidSvg('<svg><script>alert(1)</script></svg>')).toBe(false)
  expect(isSafeMermaidSvg('<svg><a href="javascript:x">x</a></svg>')).toBe(
    false
  )
})

it('istruisce generazione e traduzione a preservare Mermaid in italiano e inglese', () => {
  expect(GEMS_SYSTEM_INSTRUCTION).toContain('```mermaid')
  expect(SECTION_DEEP_SYSTEM_INSTRUCTION).toContain('```mermaid')
  expect(TRANSLATION_SYSTEM_INSTRUCTION).toContain('For every ```mermaid block')
  expect(TRANSLATION_SYSTEM_INSTRUCTION).toContain(
    'Translate only human-readable labels'
  )
})

it('formatTimecode formatta correttamente secondi in mm:ss e hh:mm:ss', () => {
  expect(formatTimecode(0)).toBe('00:00')
  expect(formatTimecode(75)).toBe('01:15')
  expect(formatTimecode(754)).toBe('12:34')
  expect(formatTimecode(3665)).toBe('01:01:05')
  expect(formatTimecode(4529)).toBe('01:15:29')
})

it('extractInteractionText estrae testo da formati diretti e annidati dell API', () => {
  expect(extractInteractionText({ output_text: 'Testo diretto' })).toBe('Testo diretto')
  expect(
    extractInteractionText({
      outputs: [{ text: 'Primo frammento' }, { text: 'Secondo frammento' }]
    })
  ).toBe('Primo frammento\n\nSecondo frammento')
  expect(
    extractInteractionText({
      steps: [
        { type: 'user_input', text: 'Ignora input' },
        { type: 'model_output', content: [{ raw: { transcript: 'Trascrizione raw' } }] }
      ]
    })
  ).toBe('Trascrizione raw')
  expect(extractInteractionText(null)).toBeNull()
  expect(extractInteractionText({})).toBeNull()
})

it('isNonSpeechTranscript riconosce testo vuoto o contenente solo rumore/tag', () => {
  expect(isNonSpeechTranscript('')).toBe(true)
  expect(isNonSpeechTranscript('   ')).toBe(true)
  expect(isNonSpeechTranscript('[coughing] [applause]')).toBe(true)
  expect(isNonSpeechTranscript('<noise> rumore silenzio')).toBe(true)
  expect(isNonSpeechTranscript('Lezione di Reinforcement Learning sui processi di Markov')).toBe(false)
})

it('trimOverlapWords rimuove la duplicazione di parole tra chunk sovrapposti', () => {
  const left = 'Oggi parliamo di reinforcement learning applicato alla robotica'
  const right = 'learning applicato alla robotica con algoritmi di policy gradient'
  const trimmed = trimOverlapWords(left, right, 10)
  expect(trimmed).toBe('con algoritmi di policy gradient')

  const noOverlap = 'Altro argomento completamente disgiunto'
  expect(trimOverlapWords(left, noOverlap, 10)).toBe(noOverlap)
})

it('la pipeline automatica esegue trascrizione dispensa ITA e ENG in sequenza all importazione', async () => {
  const gemini = new GeminiService()
  const archive = new ArchiveService(root, gemini, true)
  await archive.initialize()
  await archive.saveSettings({
    apiKeys: ['test-key'],
    autoProcessOnImport: true
  })
  const audio = join(root, 'RL 2026-0507-16-19-41.mp3')
  await writeFile(audio, 'fake audio content')

  const sequence: string[] = []
  vi.spyOn(archive, 'transcribeAudio').mockImplementation(async (id) => {
    sequence.push(`transcribe:${id}`)
    const lib = await (archive as any).repository.readLibrary()
    const l = lib.lectures.find((item: any) => item.id === id)
    if (l) {
      l.transcriptFileName = `${id}.txt`
      l.status = 'transcript-available'
      await (archive as any).repository.writeLibrary(lib)
    }
    return { success: true, transcript: 'Trascrizione completata' }
  })
  vi.spyOn(archive, 'generateLectureNotes').mockImplementation(async (id) => {
    sequence.push(`notes:${id}`)
    const lib = await (archive as any).repository.readLibrary()
    const l = lib.lectures.find((item: any) => item.id === id)
    if (l) {
      l.markdownFileName = `${id}.md`
      await (archive as any).repository.writeLibrary(lib)
    }
    return { success: true, markdown: '# Dispensa' }
  })

  vi.spyOn(archive, 'translateLectureNotes').mockImplementation(async (id) => {
    sequence.push(`english:${id}`)
    const lib = await (archive as any).repository.readLibrary()
    lib.lectures.find((item: any) => item.id === id).markdownEnFileName = `${id}_en.md`
    await (archive as any).repository.writeLibrary(lib)
    return { success: true, markdown: '# English notes' }
  })
  const importRes = await archive.importFiles([audio])
  expect(importRes.imported).toHaveLength(1)
  const importedId = importRes.imported[0].id

  await archive.waitForAutoProcessing()

  expect(sequence).toEqual([`transcribe:${importedId}`, `notes:${importedId}`, `english:${importedId}`])
  archive.destroy()
})

it('la pipeline automatica rispetta autoProcessOnImport impostato a false', async () => {
  const gemini = new GeminiService()
  const archive = new ArchiveService(root, gemini, true)
  await archive.initialize()
  await archive.saveSettings({
    apiKeys: ['test-key'],
    autoProcessOnImport: false
  })
  const audio = join(root, 'RL 2026-0507-16-19-42.mp3')
  await writeFile(audio, 'fake audio content')

  const transcribeSpy = vi.spyOn(archive, 'transcribeAudio')
  const notesSpy = vi.spyOn(archive, 'generateLectureNotes')

  await archive.importFiles([audio])
  await archive.waitForAutoProcessing()

  expect(transcribeSpy).not.toHaveBeenCalled()
  expect(notesSpy).not.toHaveBeenCalled()
  archive.destroy()
})

it('la pipeline automatica salta l esecuzione se non ci sono chiavi API configurate', async () => {
  const gemini = new GeminiService()
  const archive = new ArchiveService(root, gemini, true)
  await archive.initialize()
  await archive.saveSettings({
    apiKey: '',
    apiKeys: [],
    autoProcessOnImport: true
  })
  const audio = join(root, 'RL 2026-0507-16-19-43.mp3')
  await writeFile(audio, 'fake audio content')

  const progressEvents: any[] = []
  archive.setProgressCallback((event) => progressEvents.push(event))
  const transcribeSpy = vi.spyOn(archive, 'transcribeAudio')

  await archive.importFiles([audio])
  await archive.waitForAutoProcessing()

  expect(transcribeSpy).not.toHaveBeenCalled()
  expect(
    progressEvents.some(
      (e) => e.phase === 'error' && e.message.includes('chiave API Gemini')
    )
  ).toBe(true)
  archive.destroy()
})

it('garantisce che styles.css nasconda rigorosamente gli elementi con hidden e i tab-pane inattivi', async () => {
  const cssContent = await fs.promises.readFile('src/styles.css', 'utf-8')
  expect(cssContent).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/)
  expect(cssContent).toMatch(/\.tab-pane\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/)
})

it('importa lezioni da registratore USB, restituisce i percorsi e permette l eliminazione sicura dal supporto preservando la copia locale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-usb-import-test-'))
  const usbMockDir = await mkdtemp(join(tmpdir(), 'mock-usb-record-'))
  const archive = new ArchiveService(root)
  await archive.initialize()

  const usbAudio1 = join(usbMockDir, 'REC001.mp3')
  const usbTxt1 = join(usbMockDir, 'REC001.txt')
  const usbAudio2 = join(usbMockDir, 'REC002.mp3')
  await writeFile(usbAudio1, 'fake mp3 content 1')
  await writeFile(usbTxt1, 'fake transcript 1')
  await writeFile(usbAudio2, 'fake mp3 content 2')

  // Importa solo REC001
  const importResult = await archive.importUsbRecorderFiles([
    {
      fullPath: usbAudio1,
      action: 'import',
      courseCode: 'TEST101',
      title: 'Lezione 1'
    },
    {
      fullPath: usbAudio2,
      action: 'discard',
      courseCode: null,
      title: null
    }
  ])

  expect(importResult.importedCount).toBe(1)
  expect(importResult.importedFilePaths).toEqual([usbAudio1])
  expect(importResult.importedLectures.length).toBe(1)

  const importedLecture = importResult.importedLectures[0]
  const localAudioPath = join(root, 'audio', importedLecture.audioFileName)
  expect(fs.existsSync(localAudioPath)).toBe(true)
  expect(fs.existsSync(usbAudio1)).toBe(true)
  expect(fs.existsSync(usbTxt1)).toBe(true)

  // Elimina dal registratore USB
  const deleteResult = await archive.deleteUsbRecorderFiles(importResult.importedFilePaths)
  expect(deleteResult.deletedCount).toBe(1)
  expect(deleteResult.failedCount).toBe(0)
  expect(deleteResult.errors).toHaveLength(0)

  // File eliminato dal registratore USB (incluso il .txt associato)
  expect(fs.existsSync(usbAudio1)).toBe(false)
  expect(fs.existsSync(usbTxt1)).toBe(false)
  // Il secondo file scartato non è stato toccato
  expect(fs.existsSync(usbAudio2)).toBe(true)

  // FONDAMENTALE: La copia locale in Lezionify è ancora al sicuro e intatta!
  expect(fs.existsSync(localAudioPath)).toBe(true)

  // Test protezione di sicurezza: rifiuta tentativi di eliminare percorsi all'interno della cartella di Lezionify
  const blockedDelete = await archive.deleteUsbRecorderFiles([localAudioPath])
  expect(blockedDelete.deletedCount).toBe(0)
  expect(blockedDelete.failedCount).toBe(1)
  expect(blockedDelete.errors[0]).toContain('Percorso locale protetto')
  expect(fs.existsSync(localAudioPath)).toBe(true)

  archive.destroy()
  await rm(usbMockDir, { recursive: true, force: true }).catch(() => {})
})

it('formatDurationSeconds formatta correttamente secondi, minuti e casi limite', () => {
  expect(formatDurationSeconds()).toBe('Calcolo…')
  expect(formatDurationSeconds(undefined)).toBe('Calcolo…')
  expect(formatDurationSeconds(-5)).toBe('Calcolo…')
  expect(formatDurationSeconds(Number.NaN)).toBe('Calcolo…')
  expect(formatDurationSeconds(0)).toBe('0s')
  expect(formatDurationSeconds(42)).toBe('42s')
  expect(formatDurationSeconds(60)).toBe('1m 00s')
  expect(formatDurationSeconds(65)).toBe('1m 05s')
  expect(formatDurationSeconds(125)).toBe('2m 05s')
  expect(formatDurationSeconds(3600)).toBe('60m 00s')
})

it('la trascrizione audio emette progressi con metadati dettagliati (chunk, ETA, intervallo)', async () => {
  const { archive, gemini, lecture } = await fixture()
  const events: any[] = []
  archive.setProgressCallback((event) => events.push(event))

  vi.spyOn(gemini, 'transcribeAudioFile').mockImplementation(async (params) => {
    if (params.onProgress) {
      params.onProgress('Divisione audio completata: 3 parti da circa 15 min.', 10, {
        totalChunks: 3,
        currentChunk: 1,
        chunkTimeInterval: '00:00:00 - 00:15:00',
        etaSeconds: 90,
        elapsedSeconds: 5,
        stageDetail: 'Preparazione chunk'
      })
      params.onProgress('Parte 1 di 3: trascrizione Gemini ASR in corso…', 35, {
        totalChunks: 3,
        currentChunk: 1,
        chunkTimeInterval: '00:00:00 - 00:15:00',
        etaSeconds: 60,
        elapsedSeconds: 30,
        stageDetail: 'Gemini ASR'
      })
      params.onProgress('Parte 1 di 3 completata (1250 parole trascritte)', 40, {
        totalChunks: 3,
        currentChunk: 1,
        chunkTimeInterval: '00:00:00 - 00:15:00',
        etaSeconds: 45,
        elapsedSeconds: 45,
        stageDetail: 'Parte 1 completata'
      })
    }
    return 'Trascrizione di test completata.'
  })

  const result = await archive.transcribeAudio(lecture.id)
  expect(result.success).toBe(true)

  const transcribingEvents = events.filter((e) => e.phase === 'transcribing')
  expect(transcribingEvents.length).toBeGreaterThanOrEqual(3)

  const firstEvent = transcribingEvents[0]
  expect(firstEvent.totalChunks).toBe(3)
  expect(firstEvent.currentChunk).toBe(1)
  expect(firstEvent.chunkTimeInterval).toBe('00:00:00 - 00:15:00')
  expect(firstEvent.etaSeconds).toBe(90)
  expect(firstEvent.elapsedSeconds).toBe(5)
  expect(firstEvent.stageDetail).toBe('Preparazione chunk')

  const lastEvent = transcribingEvents[2]
  expect(lastEvent.stageDetail).toBe('Parte 1 completata')
  expect(lastEvent.etaSeconds).toBe(45)

  archive.destroy()
})
