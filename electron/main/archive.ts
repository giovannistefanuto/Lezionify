import { relatedQnaContext } from '../../shared/qnaContext'
import { effectiveStudySeconds, studyTimeRemovalTargets, removeStudySeconds } from '../../shared/studyCorrections'
import { ragHash, splitCourseSource, type IndexedCourseSource } from './courseRagIndex'
import { calculateScheduleOverlap } from './courseSchedule'
export { calculateScheduleOverlap, parseTimeToMinutes } from './courseSchedule'
import { applyLaboratorySchedule, datedLaboratorySlots } from './laboratorySchedule'
import { pipelineFailureFromError } from './ai/pipelineFailure'
import { randomUUID } from 'node:crypto'
import { copyFile, readdir, rename, stat, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import { app, dialog, shell, nativeImage } from 'electron'
import { QnaImageStore } from './qnaImages'
import type {
  AppLogEntry,
  AppSettings,
  PublishResult,
  PublishingStatus,
  ArchivePipelineStartResult,
  ArchivePipelineStatus,
  BatchGenerationSummary,
  BatchTranslationSummary,
  CourseDefinition,
  CourseScheduleMatch,
  CourseStats,
  CourseStudyBreakdown,
  DailyStudySummary,
  GenerateStudySetResult,
  GenerationProgress,
  GenerationResult,
  ImportSummary,
  VideoImportDestination,
  VideoImportProgress,
  VideoImportSelection,
  VideoImportReady,
  Lecture,
  LectureStudySet,
  LectureHighlight,
  LogLevel,
  QnaThread,
  QnaStatusUpdate,
  Reminder,
  ScratchpadData,
  SkippedImport,
  StudyAnalytics,
  StudySession,
  TestApiKeyResult,
  TranscribeAudioResult,
  UsbRecorderInfo,
  UsbRecorderAudioFile,
  UsbImportItemSelection,
  UsbImportResult,
  UsbDeleteFilesResult
} from '../../shared/archive'
import { getLectureDurationSeconds } from '../../shared/archive'
import { countLectureWords } from '../../shared/lectureLength'
import { extractLectureTitle, replaceLectureTitle, validateLectureTitles } from '../../shared/lectureTitles'
import { QNA_PRIMARY_MODEL } from '../../shared/qnaModelPolicy'
import { notesProgressMessage } from './ai/progressDiagnostics'
import {
  formatLocalCalendarDate,
  parseLocalCalendarDate
} from '../../shared/calendarDate'
import { GeminiService } from './gemini'
import { AiJobStore } from './ai/aiJobStore'
import { ArchivePipeline } from './ai/archivePipeline'
import {
  GeminiRequestManager,
  type KeyConfig,
  type RequestAttemptInfo
} from './ai/geminiRequestManager'
import { AsyncMutex } from './asyncMutex'
import { SettingsService } from './settings'
import { PublishService } from './publishing/publishService'
import { AutomaticPublisher } from './publishing/automaticPublisher'
import {
  AUDIO_EXTENSION,
  FILE_NAME_PATTERN,
  fileChecksum,
  parseFileName,
  type ParsedFileName
} from './fileNameParser'
import { FileStorageService } from './fileStorage'
import { LibraryRepository, type LibraryFile } from './libraryRepository'
import { SearchIndexService } from './searchIndex'
import { logger } from './logger'
import { readMp3Duration } from './mp3Duration'
import { VideoImporter, VIDEO_EXTENSIONS } from './videoImporter'
import { findUsbRecorderDrive } from './usbDetector'
import {
  errorMessage,
  errorStack,
  isRecord,
  validateCourse,
  validateHighlights,
  validateLectureUpdate,
  validateQnaThread,
  validateQnaThreads,
  validateReminders,
  validateScratchpad,
  validateStudySession
} from './archiveValidation'

// Re-export parser types & utilities for backwards compatibility
export {
  AUDIO_EXTENSION,
  FILE_NAME_PATTERN,
  fileChecksum,
  parseFileName,
  type ParsedFileName,
  type LibraryFile
}

export function extractMarkdownTitle(markdown: string): string | null {
  return extractLectureTitle(markdown)
}

export function isRetryableApiError(errorText: string): boolean {
  const text = (errorText || '').toLowerCase()
  return (
    text.includes('429') ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('rate limit') ||
    text.includes('500') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504') ||
    text.includes('unavailable') ||
    text.includes('overloaded') ||
    text.includes('high demand') ||
    text.includes('fetch failed')
  )
}

export class ArchiveService {
  private readonly wordCountCache = new Map<string, { signature: string; words: number }>()
  private readonly rootDirectory: string
  readonly qnaImages: QnaImageStore
  private readonly storage: FileStorageService
  private readonly videoImporter: VideoImporter
  private readonly repository: LibraryRepository
  private readonly settingsService: SettingsService
  private readonly publishService: PublishService
  private readonly automaticPublisher: AutomaticPublisher
  private automaticPublishingStarted = false
  public readonly jobStore: AiJobStore
  public readonly requestManager: GeminiRequestManager
  private readonly geminiService: GeminiService
  private readonly searchIndex: SearchIndexService
  private readonly courseLogisticsMutexes = new Map<string, AsyncMutex>()
  private progressCallback?: (progress: GenerationProgress) => void
  private pipelineStatusCallback?: (status: ArchivePipelineStatus) => void
  private readonly archivePipeline: ArchivePipeline
  private autoPipelineLaunch: Promise<void> | null = null
  private restoringPipeline = false
  private readonly enableAutoProcessOnImport: boolean

  constructor(
    customRootDirectory?: string,
    customGeminiService?: GeminiService,
    enableAutoProcessOnImport?: boolean,
    customRequestManager?: GeminiRequestManager,
    customJobStore?: AiJobStore
  ) {
    this.rootDirectory =
      customRootDirectory ??
      (app && typeof app.getPath === 'function'
        ? path.join(app.getPath('userData'), 'library')
        : path.join(process.cwd(), '.library-data'))
    this.storage = new FileStorageService(this.rootDirectory)
    this.qnaImages = new QnaImageStore(this.rootDirectory, bytes => nativeImage.createFromBuffer(bytes).getSize())
    this.videoImporter = new VideoImporter(this.rootDirectory)
    this.repository = new LibraryRepository(this.rootDirectory)
    this.settingsService = new SettingsService(this.rootDirectory)
    this.publishService = new PublishService(this.rootDirectory, {
      listLectures: () => this.listLectures(),
      getCourses: async () => (await this.settingsService.getSettings()).courses ?? {},
      getLegacyCourseCodes: async () => (await this.settingsService.getSettings()).legacyPublishingCourseCodes ?? [],
      getSettings: async () => (await this.settingsService.getSettings()).publishing,
      storage: this.storage
    })
    this.automaticPublisher = new AutomaticPublisher({
      enabled: async () => (await this.settingsService.getSettings()).publishing?.enabled === true,
      busy: () => this.archivePipeline.isProcessing(),
      publish: () => this.publishLectures()
    })
    this.jobStore = customJobStore ?? new AiJobStore(this.rootDirectory)
    this.requestManager = customRequestManager ?? new GeminiRequestManager()
    this.geminiService =
      customGeminiService ??
      new GeminiService({
        requestManager: this.requestManager,
        jobStore: this.jobStore
      })
    this.searchIndex = new SearchIndexService()
    this.archivePipeline = new ArchivePipeline(this.jobStore, {
      listLectures: () => this.listLectures(),
      hasConfiguredKey: async () => (await this.getManagedKeys()).length > 0,
      transcribe: (lectureId, jobId) => this.transcribeAudio(lectureId, jobId),
      generateNotes: (lectureId, jobId) =>
        this.generateLectureNotes(lectureId, jobId),
      translate: (lectureId, jobId) =>
        this.translateLectureNotes(lectureId, jobId)
    })
    this.archivePipeline.setStatusCallback(status => {
      this.pipelineStatusCallback?.(status)
      if (!this.restoringPipeline && (status.status === 'completed' || status.status === 'completed_with_errors')) {
        void this.archivePipeline.waitForCompletion()
          .then(() => this.autoPublishLectures(false))
          .catch(() => logger.warn('publishing', 'Pubblicazione automatica non completata.'))
      }
    })
    this.enableAutoProcessOnImport =
      enableAutoProcessOnImport ??
      (process.env.NODE_ENV !== 'test' && !process.env.VITEST)
  }

  private getCourseLogisticsMutex(courseCode: string): AsyncMutex {
    let mutex = this.courseLogisticsMutexes.get(courseCode)
    if (!mutex) {
      mutex = new AsyncMutex()
      this.courseLogisticsMutexes.set(courseCode, mutex)
    }
    return mutex
  }

  async getManagedKeys(): Promise<KeyConfig[]> {
    const settings = await this.settingsService.getSettings()
    const result: KeyConfig[] = []
    if (settings.apiKeys && settings.apiKeys.length > 0) {
      const startIdx =
        settings.activeKeyIndex >= 0 &&
        settings.activeKeyIndex < settings.apiKeys.length
          ? settings.activeKeyIndex
          : 0
      for (let i = 0; i < settings.apiKeys.length; i++) {
        const idx = (startIdx + i) % settings.apiKeys.length
        const rawKey = settings.apiKeys[idx]
        if (rawKey && rawKey.trim()) {
          const quotaGroup = settings.apiKeyQuotaGroups?.[idx]?.trim() || 'default-project'
          result.push({
            key: rawKey.trim(),
            id: `key-${idx}`,
            quotaGroup,
            quotaGroupKnown: quotaGroup !== 'default-project'
          })
        }
      }
    } else if (settings.apiKey && settings.apiKey.trim()) {
      result.push({
        key: settings.apiKey.trim(),
        id: 'key-default',
        quotaGroup: 'default-project',
        quotaGroupKnown: false
      })
    }
    return result
  }

  setProgressCallback(callback: (progress: GenerationProgress) => void): void {
    this.progressCallback = callback
  }

  setArchivePipelineStatusCallback(
    callback: (status: ArchivePipelineStatus) => void
  ): void {
    this.pipelineStatusCallback = callback
  }

  getArchivePipelineStatus(): ArchivePipelineStatus {
    return this.archivePipeline.getStatus()
  }

  async startArchivePipeline(): Promise<ArchivePipelineStartResult> {
    return this.archivePipeline.start({
      trigger: 'manual',
      includeTranslation: true
    })
  }

  async resumeArchivePipeline(): Promise<ArchivePipelineStartResult> {
    return this.archivePipeline.resume()
  }

  async requestArchivePipelineStop(): Promise<ArchivePipelineStatus> {
    return this.archivePipeline.requestStop()
  }

  getAutoProcessingStatus(): { isProcessing: boolean; queueLength: number } {
    return {
      isProcessing:
        this.archivePipeline.isProcessing() || this.autoPipelineLaunch !== null,
      queueLength: 0
    }
  }

  destroy(): void {
    this.automaticPublisher.stop()
    this.videoImporter.abortAll()
    void this.archivePipeline.requestStop()
  }

  async waitForAutoProcessing(): Promise<void> {
    await this.autoPipelineLaunch
    await this.archivePipeline.waitForCompletion()
  }

  queueAutomaticLectureProcessing(lectureIds: string[]): void {
    this.autoPipelineLaunch = (async () => {
      const settings = await this.settingsService.getSettings()
      if (settings.autoProcessOnImport === false) return
      const result = await this.archivePipeline.start({
        trigger: 'import',
        lectureIds,
        // The enabled import pipeline includes both notes languages (D-0304).
        includeTranslation: true
      })
      if (!result.started && result.status.status === 'paused') {
        this.progressCallback?.({
          jobId: result.status.runId ?? randomUUID(),
          lectureId: '',
          phase: 'error',
          message: result.status.message,
          percent: 0
        })
      }
    })()
      .catch((error) => {
        logger.error(
          'auto-pipeline',
          `Impossibile avviare elaborazione post-importazione: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      })
      .finally(() => {
        this.autoPipelineLaunch = null
      })
  }

  async processAutoQueue(): Promise<void> {
    // Compatibilità con chiamanti legacy: l'elaborazione è ora interamente
    // gestita dall'ArchivePipeline e non mantiene una seconda coda in memoria.
    await this.archivePipeline.waitForCompletion()
  }

  async initialize(): Promise<void> {
    const libraryStartedAt = Date.now()
    logger.init(this.rootDirectory)
    logger.info(
      'system',
      'Inizializzazione Archivio Lezionify',
      `Percorso: ${this.rootDirectory}`
    )
    await this.storage.initialize()
    await this.repository.initialize()
    const initialLibrary = await this.repository.readLibrary()
    await this.settingsService.initializeCoursePublicationConsent(initialLibrary.lectures.flatMap(lecture => lecture.courseCode ? [lecture.courseCode] : []))
    await this.applyScheduledLaboratories()
    await this.jobStore.initialize()
    await this.videoImporter.initialize()
    this.restoringPipeline = true
    try { await this.archivePipeline.initialize() } finally { this.restoringPipeline = false }
    logger.info(
      'performance',
      `Metadati della libreria caricati in ${Date.now() - libraryStartedAt} ms`
    )
    void this.warmUpSearchIndex()
    logger.info(
      'system',
      'Archivio inizializzato; indicizzazione dei contenuti in background'
    )
  }

  private searchIndexReady = false
  private searchIndexGeneration = 0

  private async warmUpSearchIndex(): Promise<void> {
    const generation = ++this.searchIndexGeneration
    const startedAt = Date.now()
    this.searchIndexReady = false
    try {
      const library = await this.repository.readLibrary()
      this.searchIndex.clear()
      for (let offset = 0; offset < library.lectures.length; offset += 4) {
        const documents = await Promise.all(
          library.lectures.slice(offset, offset + 4).map(async (lecture) => ({
            id: lecture.id,
            courseCode: lecture.courseCode ?? '',
            recordedAt: lecture.recordedAt ?? '',
            sourceAudioFileName: lecture.sourceAudioFileName,
            sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
            transcriptText: lecture.transcriptFileName
              ? ((await this.storage.readTranscript(
                  lecture.transcriptFileName
                )) ?? '')
              : '',
            markdownText: lecture.markdownFileName
              ? ((await this.storage.readMarkdown(lecture.markdownFileName)) ??
                '')
              : '',
            markdownEnText:
              lecture.markdownEnFileName && lecture.markdownFileName
                ? ((await this.storage.readMarkdownEn(
                    lecture.markdownFileName
                  )) ?? '')
                : ''
          }))
        )
        if (generation !== this.searchIndexGeneration) return
        documents.forEach((document) =>
          this.searchIndex.indexDocument(document)
        )
      }
      if (generation === this.searchIndexGeneration) {
        this.searchIndexReady = true
        logger.info(
          'performance',
          `Indice di ricerca pronto in ${Date.now() - startedAt} ms (${library.lectures.length} lezioni)`
        )
      }
    } catch {
      // Ignora errori di indicizzazione all'avvio
    }
  }

  private sortLectures(lectures: Lecture[]): Lecture[] {
    return [...lectures].sort((first, second) => {
      const firstDate = first.recordedAt ?? first.importedAt
      const secondDate = second.recordedAt ?? second.importedAt
      return firstDate.localeCompare(secondDate)
    })
  }

  async listLectures(): Promise<Lecture[]> {
    const library = await this.repository.readLibrary()
    return this.sortLectures(library.lectures)
  }

  /** Compare against the entire course, independently of the renderer's filters. */
  async getLectureWordCounts(lectureId: string): Promise<Record<string, number | null>> {
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const selectedLecture = library.lectures.find(lecture => lecture.id === lectureId)
      if (!selectedLecture) throw new Error('Lezione non trovata.')
      if (!selectedLecture.courseCode) return {}
      const counts: Record<string, number | null> = {}
      const retained = new Set(library.lectures.flatMap(lecture => lecture.markdownFileName ? [lecture.markdownFileName] : []))
      for (const lecture of library.lectures) {
        if (lecture.courseCode !== selectedLecture.courseCode) continue
        counts[lecture.id] = null
        if (!lecture.markdownFileName) continue
        try {
          const info = await stat(path.join(this.storage.markdownDirectory, lecture.markdownFileName))
          const signature = `${info.size}:${info.mtimeMs}:${info.ctimeMs}`
          const cached = this.wordCountCache.get(lecture.markdownFileName)
          if (cached?.signature === signature) { counts[lecture.id] = cached.words; continue }
          const text = await this.storage.readMarkdown(lecture.markdownFileName)
          if (text !== null) {
            const words = countLectureWords(text)
            counts[lecture.id] = words
            this.wordCountCache.set(lecture.markdownFileName, { signature, words })
          }
        } catch {
          // Unreadable derivations do not invalidate the other counts.
        }
      }
      for (const name of this.wordCountCache.keys()) { if (!retained.has(name)) this.wordCountCache.delete(name) }
      return counts
    })
  }

  async selectAndImportFiles(): Promise<ImportSummary | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Importa file audio',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio MP3', extensions: ['mp3'] }]
    })
    if (selection.canceled) return null
    return this.importFiles(selection.filePaths)
  }

  async selectAndImportFolder(): Promise<ImportSummary | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Scegli la cartella del registratore',
      properties: ['openDirectory']
    })
    if (selection.canceled || selection.filePaths.length === 0) return null

    const directory = selection.filePaths[0]
    const dirEntries = await readdir(directory).catch(() => [])
    const audioFiles = dirEntries
      .filter((file) => path.extname(file).toLowerCase() === AUDIO_EXTENSION)
      .map((file) => path.join(directory, file))
    return this.importFiles(audioFiles)
  }

  setVideoImportProgressCallback(callback: (progress: VideoImportProgress) => void): void {
    this.videoImporter.setProgressCallback(callback)
  }

  async selectVideos(): Promise<VideoImportSelection | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Importa uno o più video',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Video', extensions: VIDEO_EXTENSIONS }]
    })
    if (selection.canceled || !selection.filePaths.length) return null
    return this.videoImporter.select(selection.filePaths)
  }

  convertVideos(sessionId: string, orderedIds: unknown): Promise<VideoImportReady> {
    return this.videoImporter.convert(sessionId, orderedIds)
  }

  cancelVideoImport(sessionId: string): Promise<void> {
    return this.videoImporter.cancel(sessionId)
  }

  async saveVideoImport(sessionId: string, value: unknown): Promise<Lecture> {
    if (!isRecord(value) || typeof value.courseCode !== 'string' ||
        typeof value.date !== 'string' || !parseLocalCalendarDate(value.date) ||
        typeof value.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.startTime) ||
        typeof value.endTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.endTime) ||
        value.endTime <= value.startTime || typeof value.title !== 'string' || value.title.length > 240) {
      throw new Error('Indica corso, data valida e orario di fine successivo all’inizio.')
    }
    const destination = value as unknown as VideoImportDestination
    const ready = this.videoImporter.takeReady(sessionId)
    try {
      const lecture = await this.repository.runExclusive(async () => {
        await this.storage.initialize()
        await this.repository.initialize()
        const settings = await this.settingsService.getSettings()
        const course = settings.courses?.[destination.courseCode]
        if (!course || settings.archivedCourseCodes?.includes(course.code)) throw new Error('Seleziona un corso attivo configurato nell’app.')
        const library = await this.repository.readLibrary()
        const checksum = await fileChecksum(ready.outputPath)
        if (library.lectures.some(item => item.checksum === checksum)) throw new Error('Questo audio è già presente nell’archivio.')
        const id = randomUUID()
        const audioFileName = `${id}.mp3`
        const recordedAt = `${destination.date}T${destination.startTime}:00`
        const safeCourse = [...course.code].map(character => character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '_' : character).join('')
        const imported: Lecture = {
          id, title: destination.title.trim() || null, courseCode: course.code, recordedAt,
          sourceAudioFileName: `${safeCourse} ${destination.date} ${destination.startTime.replace(':', '-')}.mp3`,
          sourceTranscriptFileName: null, audioFileName, transcriptFileName: null,
          markdownFileName: null, markdownEnFileName: null, byteSize: ready.ready.byteSize,
          durationSeconds: ready.ready.durationSeconds, checksum, importedAt: new Date().toISOString(),
          status: 'audio-only', studyStatus: 'da-studiare',
          videoImport: { sources: ready.sources, scheduledEndTime: destination.endTime }
        }
        try {
          await copyFile(ready.outputPath, path.join(this.storage.audioDirectory, audioFileName))
          await this.classifyLaboratory(imported)
          library.lectures.push(imported)
          await this.repository.writeLibrary(library)
        } catch (error) {
          await this.storage.deleteAudio(audioFileName).catch(() => {})
          throw error
        }
        return imported
      })
      // Persistence is complete: subsequent housekeeping must not report a failed import.
      await this.videoImporter.finish(sessionId).catch(() => {})
      try { this.searchIndex.indexDocument({
        id: lecture.id, courseCode: lecture.courseCode ?? '', recordedAt: lecture.recordedAt ?? '',
        sourceAudioFileName: lecture.sourceAudioFileName, sourceTranscriptFileName: '',
        transcriptText: '', markdownText: '', markdownEnText: ''
      }) } catch { this.searchIndexReady = false }
      // Conversion/import is local. “Elabora tutto” remains the explicit AI entry point.
      return lecture
    } catch (error) {
      this.videoImporter.restoreReady(sessionId)
      throw error
    }
  }

  async readTranscript(id: string): Promise<string | null> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture || !lecture.transcriptFileName) return null
    return this.storage.readTranscript(lecture.transcriptFileName)
  }

  async attachTranscript(id: string): Promise<Lecture | null> {
    const selection = await dialog.showOpenDialog({
      title: 'Seleziona trascrizione TXT',
      properties: ['openFile'],
      filters: [{ name: 'Trascrizione TXT', extensions: ['txt'] }]
    })
    if (selection.canceled || selection.filePaths.length === 0) return null
    return this.attachTranscriptFromFile(id, selection.filePaths[0])
  }

  async attachTranscriptFromFile(
    id: string,
    sourcePath: string
  ): Promise<Lecture> {
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const lectureIndex = library.lectures.findIndex((item) => item.id === id)
      if (lectureIndex === -1) throw new Error('Lezione non trovata.')

      const transcriptFileName = `${id}.txt`
      await this.storage.copyTranscript(sourcePath, transcriptFileName)

      const lecture = library.lectures[lectureIndex]
      const updatedLecture: Lecture = {
        ...lecture,
        sourceTranscriptFileName: path.basename(sourcePath),
        transcriptFileName,
        status: 'transcript-available'
      }
      await this.classifyLaboratory(updatedLecture)
      library.lectures[lectureIndex] = updatedLecture
      await this.repository.writeLibrary(library)

      const text = (await this.storage.readTranscript(transcriptFileName)) ?? ''
      this.searchIndex.indexDocument({
        id: updatedLecture.id,
        courseCode: updatedLecture.courseCode ?? '',
        recordedAt: updatedLecture.recordedAt ?? '',
        markdownEnText:
          updatedLecture.markdownEnFileName && updatedLecture.markdownFileName
            ? ((await this.storage.readMarkdownEn(
                updatedLecture.markdownFileName
              )) ?? '')
            : '',
        sourceAudioFileName: updatedLecture.sourceAudioFileName,
        sourceTranscriptFileName: updatedLecture.sourceTranscriptFileName ?? '',
        transcriptText: text,
        markdownText: updatedLecture.markdownFileName
          ? ((await this.storage.readMarkdown(
              updatedLecture.markdownFileName
            )) ?? '')
          : ''
      })
      if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
      return updatedLecture
    })
  }

  async readMarkdown(id: string): Promise<string | null> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture || !lecture.markdownFileName) return null
    return this.storage.readMarkdown(lecture.markdownFileName)
  }

  async saveMarkdown(id: string, content: unknown): Promise<void> {
    if (typeof content !== 'string' || content.length > 20_000_000) {
      throw new Error('Contenuto Markdown non valido.')
    }
    const sourceContent = content
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const lectureIndex = library.lectures.findIndex((item) => item.id === id)
      if (lectureIndex === -1) throw new Error('Lezione non trovata.')

      const lecture = library.lectures[lectureIndex]
      const savedContent = lecture.titleOverrides?.it ? replaceLectureTitle(sourceContent, lecture.titleOverrides.it) : sourceContent
      const markdownFileName = `${id}.md`
      await this.storage.writeMarkdown(markdownFileName, savedContent)

      const title = extractMarkdownTitle(savedContent)

      // Invalidare la versione ENG quando la ITA viene sovrascritta
      if (lecture.markdownEnFileName) {
        await this.storage.deleteMarkdownEn(markdownFileName)
      }

      library.lectures[lectureIndex] = {
        ...lecture,
        markdownFileName,
        markdownEnFileName: null,
        title: title ?? lecture.title
      }
      await this.repository.writeLibrary(library)

      this.searchIndex.indexDocument({
        id: lecture.id,
        courseCode: lecture.courseCode ?? '',
        recordedAt: lecture.recordedAt ?? '',
        markdownEnText:
          lecture.markdownEnFileName && lecture.markdownFileName
            ? ((await this.storage.readMarkdownEn(lecture.markdownFileName)) ??
              '')
            : '',
        sourceAudioFileName: lecture.sourceAudioFileName,
        sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
        transcriptText: lecture.transcriptFileName
          ? ((await this.storage.readTranscript(lecture.transcriptFileName)) ??
            '')
          : '',
        markdownText: savedContent
      })
      if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
    })
  }

  async renameLectureTitles(id: string, value: unknown): Promise<Lecture> {
    validateLectureTitles(value)
    const titles = Object.fromEntries(Object.entries(value).map(([language, title]) => [language, title.trim()]))
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const index = library.lectures.findIndex(item => item.id === id)
      if (index < 0) throw new Error('Lezione non trovata.')
      const lecture = library.lectures[index]
      const fileName = lecture.markdownFileName ?? `${id}.md`
      const italian = lecture.markdownFileName ? await this.storage.readMarkdown(fileName) : null
      const english = lecture.markdownEnFileName ? await this.storage.readMarkdownEn(fileName) : null
      const transcript = lecture.transcriptFileName ? await this.storage.readTranscript(lecture.transcriptFileName) : null
      const nextItalian = titles.it && italian !== null ? replaceLectureTitle(italian, titles.it) : italian
      const nextEnglish = titles.en && english !== null ? replaceLectureTitle(english, titles.en) : english
      const updated: Lecture = { ...lecture, titleOverrides: { ...lecture.titleOverrides, ...titles },
        ...(titles.it ? { title: titles.it } : {}) }
      const writes: Array<{ write: (text: string) => Promise<void>; before: string; after: string }> = []
      if (italian !== null && nextItalian !== null && italian !== nextItalian) writes.push({
        write: text => this.storage.writeMarkdown(fileName, text), before: italian, after: nextItalian })
      if (english !== null && nextEnglish !== null && english !== nextEnglish) writes.push({
        write: text => this.storage.writeMarkdownEn(fileName, text), before: english, after: nextEnglish })
      const attempted: typeof writes = []
      try {
        for (const write of writes) { attempted.push(write); await write.write(write.after) }
        library.lectures[index] = updated
        await this.repository.writeLibrary(library)
      } catch (error) {
        const restored = await Promise.allSettled(attempted.map(write => write.write(write.before)))
        if (restored.some(result => result.status === 'rejected')) {
          throw new Error('Salvataggio dei titoli interrotto. Verifica le dispense e riprova.', { cause: error })
        }
        throw new Error('Impossibile salvare i titoli. Le modifiche non sono state applicate.', { cause: error })
      }
      try {
        this.searchIndex.indexDocument({ id, courseCode: lecture.courseCode ?? '', recordedAt: lecture.recordedAt ?? '',
          sourceAudioFileName: lecture.sourceAudioFileName, sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
          transcriptText: transcript ?? '', markdownText: nextItalian ?? '', markdownEnText: nextEnglish ?? '' })
      } catch { this.searchIndexReady = false }
      if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
      return updated
    })
  }

  async updateLecture(
    id: string,
    updates: unknown
  ): Promise<Lecture> {
    validateLectureUpdate(updates)
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const lectureIndex = library.lectures.findIndex((item) => item.id === id)
      if (lectureIndex === -1) throw new Error('Lezione non trovata.')

      const lecture = library.lectures[lectureIndex]
      const updatedLecture: Lecture = {
        ...lecture,
        title: updates.title !== undefined ? updates.title : lecture.title,
        ...(updates.isLaboratory !== undefined ? { isLaboratory: updates.isLaboratory } : {}),
        courseCode:
          updates.courseCode !== undefined
            ? updates.courseCode?.trim() || null
            : lecture.courseCode,
        recordedAt:
          updates.recordedAt !== undefined
            ? updates.recordedAt?.trim() || null
            : lecture.recordedAt,
        studyStatus:
          updates.studyStatus !== undefined
            ? updates.studyStatus
            : lecture.studyStatus
      }
      if (updates.isLaboratory !== undefined) delete updatedLecture.laboratorySource
      await this.classifyLaboratory(updatedLecture)
      library.lectures[lectureIndex] = updatedLecture
      await this.repository.writeLibrary(library)

      const transcriptText = updatedLecture.transcriptFileName
        ? ((await this.storage.readTranscript(
            updatedLecture.transcriptFileName
          )) ?? '')
        : ''
      const markdownText = updatedLecture.markdownFileName
        ? ((await this.storage.readMarkdown(updatedLecture.markdownFileName)) ??
          '')
        : ''

      this.searchIndex.indexDocument({
        id: updatedLecture.id,
        courseCode: updatedLecture.courseCode ?? '',
        recordedAt: updatedLecture.recordedAt ?? '',
        markdownEnText:
          updatedLecture.markdownEnFileName && updatedLecture.markdownFileName
            ? ((await this.storage.readMarkdownEn(
                updatedLecture.markdownFileName
              )) ?? '')
            : '',
        sourceAudioFileName: updatedLecture.sourceAudioFileName,
        sourceTranscriptFileName: updatedLecture.sourceTranscriptFileName ?? '',
        transcriptText,
        markdownText
      })
      if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
      return updatedLecture
    })
  }

  async deleteLecture(id: string): Promise<boolean> {
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const lecture = library.lectures.find((item) => item.id === id)
      if (!lecture) return false

      const staging = await this.storage.stageLectureFiles(lecture)
      try {
        library.lectures = library.lectures.filter((item) => item.id !== id)
        await this.repository.writeLibrary(library)
      } catch (error) {
        await this.storage.restoreStagedFiles(staging)
        throw error
      }
      this.searchIndex.removeDocument(id)
      await this.storage.purgeStagedFiles(staging).catch((error) => {
        logger.warn(
          'delete',
          `Pulizia differita per la lezione ${id}`,
          String(error)
        )
      })
      await this.jobStore.deleteForLecture(id).catch((error) => {
        logger.warn(
          'delete',
          `Pulizia checkpoint AI differita per la lezione ${id}`,
          String(error)
        )
      })
      return true
    })
  }

  async getAudioFilePath(id: string): Promise<string | null> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) return null
    return this.storage.getAudioFilePath(lecture.audioFileName)
  }

  async searchFullText(query: string): Promise<string[]> {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []

    // 1. Fast path with in-memory search index
    const indexedMatches = this.searchIndex.search(trimmed)
    if (this.searchIndexReady || indexedMatches.length > 0) {
      return indexedMatches
    }

    // 2. Fallback in-memory matching on metadata
    const library = await this.repository.readLibrary()
    const matchingIds: string[] = []

    for (const lecture of library.lectures) {
      const matchMeta =
        lecture.sourceAudioFileName.toLowerCase().includes(trimmed) ||
        (lecture.courseCode &&
          lecture.courseCode.toLowerCase().includes(trimmed)) ||
        (lecture.recordedAt &&
          lecture.recordedAt.toLowerCase().includes(trimmed)) ||
        (lecture.sourceTranscriptFileName &&
          lecture.sourceTranscriptFileName.toLowerCase().includes(trimmed))

      if (matchMeta) {
        matchingIds.push(lecture.id)
        continue
      }

      if (lecture.transcriptFileName) {
        const transcriptContent = await this.storage.readTranscript(
          lecture.transcriptFileName
        )
        if (
          transcriptContent &&
          transcriptContent.toLowerCase().includes(trimmed)
        ) {
          matchingIds.push(lecture.id)
          continue
        }
      }

      if (lecture.markdownFileName) {
        const mdContent = await this.storage.readMarkdown(
          lecture.markdownFileName
        )
        if (mdContent && mdContent.toLowerCase().includes(trimmed)) {
          matchingIds.push(lecture.id)
          continue
        }
        if (lecture.markdownEnFileName) {
          const enContent = await this.storage.readMarkdownEn(
            lecture.markdownFileName
          )
          if (enContent?.toLowerCase().includes(trimmed))
            matchingIds.push(lecture.id)
        }
      }
    }

    return matchingIds
  }

  async getSettings(): Promise<AppSettings> {
    return this.publicSettings(await this.settingsService.getSettings())
  }

  async saveSettings(settings: unknown): Promise<AppSettings> {
    const saved = await this.settingsService.saveSettings(settings)
    if (isRecord(settings) && settings.courses !== undefined) await this.applyScheduledLaboratories()
    if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
    return this.publicSettings(saved)
  }

  private publicSettings(settings: AppSettings): AppSettings {
    const output = { ...settings }
    if (settings.publishing) {
      const publishing = { ...settings.publishing }
      delete publishing.githubToken
      output.publishing = publishing
    }
    return output
  }

  initializePublishing(): Promise<void> {
    return this.publishService.initialize()
  }

  async startAutomaticPublishing(): Promise<void> {
    this.automaticPublishingStarted = true
    const settings = (await this.settingsService.getSettings()).publishing
    if (settings?.enabled && settings.autoPublishOnStartup) this.automaticPublisher.schedule(0)
  }

  async publishLectures(): Promise<PublishResult> {
    if (this.archivePipeline.isProcessing()) {
      return { published: 0, skipped: 0, errors: ['Attendi il completamento della pipeline prima di pubblicare.'] }
    }
    return this.publishService.publishNew()
  }

  getPublishingStatus(): Promise<PublishingStatus> {
    return this.publishService.getStatus()
  }

  async autoPublishLectures(onStartup: boolean): Promise<void> {
    const settings = (await this.settingsService.getSettings()).publishing
    if (!settings?.enabled || (onStartup && !settings.autoPublishOnStartup)) return
    if (this.automaticPublishingStarted) { this.automaticPublisher.schedule(0); return }
    const result = await this.publishLectures()
    if (result.published) logger.info('publishing', `Pubblicate ${result.published} lezioni.`)
    if (result.errors.length) logger.warn('publishing', 'Pubblicazione non completata; consulta lo stato di pubblicazione.')
  }

  async testApiKey(apiKey: string): Promise<TestApiKeyResult> {
    return this.geminiService.testApiKey(apiKey)
  }

  async generateLectureNotes(
    id: string,
    jobId: string = randomUUID()
  ): Promise<GenerationResult> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) {
      return { success: false, failureKind: 'not_found', error: 'Lezione non trovata.' }
    }

    if (!lecture.transcriptFileName) {
      return {
        success: false,
        failureKind: 'input',
        error:
          'Questa lezione non ha una trascrizione associata. Associa prima un file TXT.'
      }
    }

    const transcript = await this.readTranscript(id)
    if (!transcript || !transcript.trim()) {
      return { success: false, failureKind: 'input', error: 'Il file di trascrizione è vuoto.' }
    }

    const settings = await this.settingsService.getSettings()
    const managedKeys = await this.getManagedKeys()
    if (managedKeys.length === 0) {
      return {
        success: false,
        failureKind: 'authentication',
        error:
          'Nessuna chiave API Gemini configurata. Inseriscila nelle Impostazioni (⚙️).'
      }
    }

    try {
      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'segmenting',
        message: 'Inizializzazione elaborazione AI con Google Gemini…',
        percent: 5
      })

      const generatedMarkdown = await this.geminiService.generateLectureNotes({
        keys: managedKeys,
        lectureId: id,
        model: settings.model,
        transcript,
        courseCode: lecture.courseCode,
        recordedAt: lecture.recordedAt,
        sourceAudioFileName: lecture.sourceAudioFileName,
        onProgress: (step, percent, meta) => {
          logger.info('ai-notes', notesProgressMessage(step, percent), JSON.stringify({ lectureId: id, jobId, percent }))
          this.progressCallback?.({
            jobId,
            lectureId: id,
            phase:
              percent < 30
                ? 'segmenting'
                : percent < 85
                  ? 'sections'
                  : 'assembling',
            message: step,
            percent,
            ...(meta || {})
          })
        }
      })

      await this.saveMarkdown(id, generatedMarkdown)

      // La logistica è accessoria: un errore non invalida la dispensa già
      // salvata e il gestore centrale applica comunque quota e fallback.
      if (lecture.courseCode) {
        try {
          logger.info('course-logistics', 'Estrazione delle informazioni sul corso e sull’esame.', JSON.stringify({ lectureId: id, jobId }))
          this.progressCallback?.({
            jobId,
            lectureId: id,
            phase: 'logistics',
            message: 'Estrazione nozioni logistiche d’esame per la materia…',
            percent: 95
          })

          const extractedInfo = await this.geminiService.extractCourseLogistics({
            keys: managedKeys,
            model: settings.model,
            transcript
          })

          if (extractedInfo) {
            const mutex = this.getCourseLogisticsMutex(lecture.courseCode)
            await mutex.runExclusive(async () => {
              const existingInfo = await this.readCourseInfo(lecture.courseCode!)
              if (!existingInfo) {
                await this.writeCourseInfo(
                  lecture.courseCode!,
                  `# Informazioni sul Corso e l'Esame: ${lecture.courseCode}\n\n${extractedInfo}`
                )
              } else {
                logger.info('course-logistics', 'Unione delle nuove informazioni con le note del corso esistenti.', JSON.stringify({ lectureId: id, jobId }))
                const mergedInfo = await this.geminiService.mergeCourseLogistics({
                  keys: managedKeys,
                  model: settings.model,
                  existingInfo,
                  newExtractedInfo: extractedInfo
                })
                await this.writeCourseInfo(lecture.courseCode!, mergedInfo)
              }
            })
          }
          logger.info('course-logistics', extractedInfo ? 'Informazioni del corso aggiornate.' : 'Nessuna nuova informazione sul corso rilevata.', JSON.stringify({ lectureId: id, jobId }))
        } catch (error) {
          logger.warn(
            'course-logistics',
            'Informazioni del corso non aggiornate; la dispensa resta salvata.',
            JSON.stringify({ lectureId: id, jobId, failureKind: pipelineFailureFromError(error).failureKind })
          )
        }
      }

      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'completed',
        message: 'Dispensa didattica completata e salvata!',
        percent: 100
      })
      logger.info('ai-notes', 'Dispensa didattica salvata.', JSON.stringify({ lectureId: id, jobId }))
      return { success: true, markdown: generatedMarkdown }
    } catch (error) {
      const failure = error instanceof PipelineSourceChangedError
        ? { success: false as const, failureKind: 'source_changed' as const, error: error.message }
        : pipelineFailureFromError(error)
      const message = failure.error
      logger.error(
        'ai-notes',
        `Errore generazione dispensa per lezione ${id}: ${message}`
      )
      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'error',
        message,
        percent: 0
      })
      return failure
    }
  }

  async generateAllMissingNotes(): Promise<BatchGenerationSummary> {
    const library = await this.repository.readLibrary()
    const candidates = library.lectures.filter(
      (l) => l.status === 'transcript-available' && !l.markdownFileName
    )
    return this.generateSelectedNotes(candidates.map((l) => l.id))
  }

  async generateSelectedNotes(
    lectureIds: string[],
    jobId: string = randomUUID()
  ): Promise<BatchGenerationSummary> {
    const library = await this.repository.readLibrary()
    const summary: BatchGenerationSummary = {
      total: lectureIds.length,
      succeeded: 0,
      failed: 0,
      results: []
    }

    for (const id of lectureIds) {
      const lecture = library.lectures.find((item) => item.id === id)
      if (!lecture) {
        summary.failed++
        summary.results.push({
          id,
          courseCode: null,
          success: false,
          error: 'Lezione non trovata.'
        })
        continue
      }

      const res = await this.generateLectureNotes(id, jobId)
      if (res.success) {
        summary.succeeded++
        summary.results.push({
          id,
          courseCode: lecture.courseCode,
          success: true
        })
      } else {
        summary.failed++
        summary.results.push({
          id,
          courseCode: lecture.courseCode,
          success: false,
          error: res.error
        })
      }
    }

    return summary
  }

  async readMarkdownEn(id: string): Promise<string | null> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture || !lecture.markdownEnFileName) return null
    return this.storage.readMarkdownEn(lecture.markdownFileName ?? `${id}.md`)
  }

  async getTranslationCandidates(): Promise<Lecture[]> {
    const library = await this.repository.readLibrary()
    return this.sortLectures(
      library.lectures.filter(
        (l) => l.markdownFileName && !l.markdownEnFileName
      )
    )
  }

  async translateLectureNotes(
    id: string,
    jobId: string = randomUUID()
  ): Promise<GenerationResult> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) {
      return { success: false, failureKind: 'not_found', error: 'Lezione non trovata.' }
    }

    if (!lecture.markdownFileName) {
      return {
        success: false,
        failureKind: 'input',
        error: 'Questa lezione non ha ancora una dispensa ITA. Generala prima.'
      }
    }

    const markdownIta = await this.storage.readMarkdown(
      lecture.markdownFileName
    )
    if (!markdownIta || !markdownIta.trim()) {
      return { success: false, failureKind: 'input', error: 'La dispensa ITA è vuota.' }
    }

    const settings = await this.settingsService.getSettings()
    const managedKeys = await this.getManagedKeys()
    if (managedKeys.length === 0) {
      return {
        success: false,
        failureKind: 'authentication',
        error:
          'Nessuna chiave API Gemini configurata. Inseriscila nelle Impostazioni (⚙️).'
      }
    }

    try {
      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'segmenting',
        message: 'Traduzione dell’intera dispensa in inglese; controllo delle sezioni prima del salvataggio…',
        percent: 10
      })

      logger.info('translation', 'Traduzione della dispensa in inglese avviata.', JSON.stringify({ lectureId: id, jobId }))

      // Il GeminiRequestManager possiede integralmente retry, rotazione chiavi,
      // cooldown e fallback modello. Un ciclo esterno qui duplicava il pool e
      // poteva trasformare una singola traduzione in decine di richieste.
      const translatedMarkdown = await this.geminiService.translateToEnglish({
        keys: managedKeys,
        model: settings.model,
        markdownIta,
        jobId: `translation:${jobId}:${id}`,
        onRetry: (attempt, delayMs, reason) => {
          this.progressCallback?.({
            jobId,
            lectureId: id,
            phase: 'segmenting',
            message: `Tentativo ${attempt}: ${reason} Attendo ${Math.ceil(delayMs / 1000)}s…`,
            percent: 10,
            attempt,
            delayMs
          })
        }
      })

      // Aggiorna il record nel repository
      await this.repository.runExclusive(async () => {
        const lib = await this.repository.readLibrary()
        const idx = lib.lectures.findIndex((item) => item.id === id)
        const current = lib.lectures[idx]
        if (
          !current ||
          current.markdownFileName !== lecture.markdownFileName ||
          (await this.storage.readMarkdown(current.markdownFileName!)) !==
            markdownIta
        )
          throw new PipelineSourceChangedError(
            'La dispensa è cambiata durante la traduzione. Riprova.'
          )
        const savedTranslation = current.titleOverrides?.en ? replaceLectureTitle(translatedMarkdown, current.titleOverrides.en) : translatedMarkdown
        await this.storage.writeMarkdownEn(
          current.markdownFileName!,
          savedTranslation
        )
        lib.lectures[idx] = {
          ...lib.lectures[idx],
          markdownEnFileName: `${id}_en.md`
        }
        await this.repository.writeLibrary(lib)
        this.searchIndex.indexDocument({
          id,
          courseCode: current.courseCode ?? '',
          recordedAt: current.recordedAt ?? '',
          sourceAudioFileName: current.sourceAudioFileName,
          sourceTranscriptFileName: current.sourceTranscriptFileName ?? '',
          transcriptText: current.transcriptFileName
            ? ((await this.storage.readTranscript(current.transcriptFileName)) ?? '')
            : '',
          markdownText: markdownIta,
          markdownEnText: savedTranslation
        })
      })

      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'completed',
        message: 'Traduzione inglese completata e salvata!',
        percent: 100
      })
      logger.info('translation', 'Traduzione inglese salvata.', JSON.stringify({ lectureId: id, jobId }))

      if (this.automaticPublishingStarted) this.automaticPublisher.schedule()
      return { success: true, markdown: translatedMarkdown }
    } catch (error) {
      const failure = error instanceof PipelineSourceChangedError
        ? { success: false as const, failureKind: 'source_changed' as const, error: error.message }
        : pipelineFailureFromError(error)
      const message = failure.error
      logger.error(
        'translation',
        `Errore traduzione ENG per lezione ${id}: ${message}`
      )

      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'error',
        message,
        percent: 0
      })
      return failure
    }
  }

  async translateSelectedNotes(
    lectureIds: string[],
    jobId: string = randomUUID()
  ): Promise<BatchTranslationSummary> {
    const library = await this.repository.readLibrary()
    const summary: BatchTranslationSummary = {
      total: lectureIds.length,
      succeeded: 0,
      failed: 0,
      results: []
    }

    for (const id of lectureIds) {
      const lecture = library.lectures.find((item) => item.id === id)
      if (!lecture) {
        summary.failed++
        summary.results.push({
          id,
          courseCode: null,
          success: false,
          error: 'Lezione non trovata.'
        })
        continue
      }

      const res = await this.translateLectureNotes(id, jobId)
      if (res.success) {
        summary.succeeded++
        summary.results.push({
          id,
          courseCode: lecture.courseCode,
          title: lecture.title ?? undefined,
          success: true
        })
      } else {
        summary.failed++
        summary.results.push({
          id,
          courseCode: lecture.courseCode,
          title: lecture.title ?? undefined,
          success: false,
          error: res.error
        })
      }
    }

    return summary
  }

  async openLibraryFolder(): Promise<{
    success: boolean
    path: string
    error?: string
  }> {
    try {
      await this.storage.initialize()
      await this.repository.initialize()
      if (shell && typeof shell.openPath === 'function') {
        const error = await shell.openPath(this.rootDirectory)
        if (error) {
          console.error('shell.openPath error:', error)
          shell.showItemInFolder(path.join(this.rootDirectory, 'library.json'))
          return { success: false, path: this.rootDirectory, error }
        }
        return { success: true, path: this.rootDirectory }
      }
      return {
        success: false,
        path: this.rootDirectory,
        error: 'Interfaccia shell di sistema non disponibile.'
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err.message
          : 'Errore I/O durante apertura cartella'
      return { success: false, path: this.rootDirectory, error }
    }
  }

  async scanAndSyncLibrary(): Promise<Lecture[]> {
    return this.repository.runExclusive(async () => {
      this.repository.invalidateCache()
      await this.storage.initialize()
      const library = await this.repository.readLibrary()
      let changed = false
      const stagedMoves: Array<{ from: string; to: string }> = []
      try {
        // 1. Scansione file audio presenti nella cartella audio
        const audioFiles = await this.storage.listAudioFiles()
        for (const file of audioFiles) {
          if (path.extname(file).toLowerCase() !== AUDIO_EXTENSION) continue
          const fullAudioPath = path.join(this.storage.audioDirectory, file)
          const audioStats = await stat(fullAudioPath).catch(() => null)
          if (!audioStats?.isFile()) continue
          const measuredDuration = await readMp3Duration(fullAudioPath).catch(
            () => null
          )

          const existingLecture = library.lectures.find(
            (l) => l.audioFileName === file
          )
          if (
            existingLecture &&
            existingLecture.durationSeconds === undefined &&
            measuredDuration !== null
          ) {
            existingLecture.durationSeconds = measuredDuration
            changed = true
          }
          if (!existingLecture) {
            const parsed = parseFileName(file)
            const checksum = await fileChecksum(fullAudioPath)
            const id = randomUUID()
            const finalAudioName = `${id}${AUDIO_EXTENSION}`

            await rename(
              fullAudioPath,
              path.join(this.storage.audioDirectory, finalAudioName)
            )
            stagedMoves.push({
              from: fullAudioPath,
              to: path.join(this.storage.audioDirectory, finalAudioName)
            })

            let courseCode = parsed?.courseCode ?? null
            if (!courseCode && parsed?.recordedAt) {
              const durationSecs = measuredDuration ?? 0
              const match = await this.matchLectureToCourse(
                parsed.recordedAt,
                durationSecs
              )
              if (match && (match.isLaboratory || match.confidencePercentage >= 70)) {
                courseCode = match.matchedCourseCode
              }
            }

            const newLecture: Lecture = {
              id,
              courseCode,
              recordedAt: parsed?.recordedAt ?? null,
              sourceAudioFileName: file,
              sourceTranscriptFileName: null,
              audioFileName: finalAudioName,
              transcriptFileName: null,
              markdownFileName: null,
              markdownEnFileName: null,
              byteSize: audioStats.size,
              durationSeconds: measuredDuration ?? undefined,
              checksum,
              importedAt: new Date().toISOString(),
              status: 'audio-only',
              studyStatus: 'da-studiare'
            }
            await this.classifyLaboratory(newLecture)
            library.lectures.push(newLecture)
            changed = true
          }
        }

        // 2. Scansione file trascrizione .txt nella cartella transcripts
        const transcriptFiles = await this.storage.listTranscriptFiles()
        for (const lecture of library.lectures) {
          if (!lecture.transcriptFileName) {
            const idTxt = `${lecture.id}.txt`
            const baseAudioName = path.basename(
              lecture.sourceAudioFileName,
              path.extname(lecture.sourceAudioFileName)
            )
            const matchingTxt = transcriptFiles.find((f) => {
              const fLower = f.toLowerCase()
              return (
                f === idTxt || fLower === `${baseAudioName.toLowerCase()}.txt`
              )
            })

            if (matchingTxt) {
              const fullTxtPath = path.join(
                this.storage.transcriptDirectory,
                matchingTxt
              )
              const targetIdPath = path.join(
                this.storage.transcriptDirectory,
                idTxt
              )
              if (fullTxtPath !== targetIdPath) {
                try {
                  await rename(fullTxtPath, targetIdPath)
                } catch (error) {
                  if ((error as NodeJS.ErrnoException).code !== 'EXDEV')
                    throw error
                  await copyFile(fullTxtPath, targetIdPath)
                  if (
                    (await fileChecksum(fullTxtPath)) !==
                    (await fileChecksum(targetIdPath))
                  ) {
                    await unlink(targetIdPath).catch(() => {})
                    throw new Error(
                      `Copia della trascrizione ${matchingTxt} non verificata.`,
                      { cause: error }
                    )
                  }
                  await unlink(fullTxtPath)
                }
                stagedMoves.push({ from: fullTxtPath, to: targetIdPath })
              }
              lecture.transcriptFileName = idTxt
              lecture.sourceTranscriptFileName = matchingTxt
              lecture.status = 'transcript-available'
              changed = true
            }
          }

          // 3. Verifica esistenza file markdown ed estrazione titolo
          const idMd = `${lecture.id}.md`
          const mdStat = await stat(
            path.join(this.storage.markdownDirectory, idMd)
          ).catch(() => null)
          if (mdStat?.isFile()) {
            if (lecture.markdownFileName !== idMd) {
              lecture.markdownFileName = idMd
              changed = true
            }
            if (!lecture.title) {
              const mdContent = await this.storage.readMarkdown(idMd)
              if (mdContent) {
                const extracted = extractMarkdownTitle(mdContent)
                if (extracted) {
                  lecture.title = extracted
                  changed = true
                }
              }
            }
          }

          const audioExists = await stat(
            path.join(this.storage.audioDirectory, lecture.audioFileName)
          )
            .then((value) => value.isFile())
            .catch(() => false)
          if (lecture.missingAudio !== !audioExists) {
            lecture.missingAudio = !audioExists
            changed = true
          }
          if (lecture.transcriptFileName) {
            const exists = await stat(
              path.join(
                this.storage.transcriptDirectory,
                lecture.transcriptFileName
              )
            )
              .then((value) => value.isFile())
              .catch(() => false)
            if (!exists) {
              lecture.transcriptFileName = null
              lecture.sourceTranscriptFileName = null
              lecture.status = 'audio-only'
              changed = true
            }
          }
          if (lecture.markdownFileName && !mdStat?.isFile()) {
            lecture.markdownFileName = null
            lecture.markdownEnFileName = null
            changed = true
          }
        }

        for (const lecture of library.lectures) {
          if (await this.classifyLaboratory(lecture)) changed = true
        }
        if (changed) {
          await this.repository.writeLibrary(library)
          void this.warmUpSearchIndex()
        }

        return this.sortLectures(library.lectures)
      } catch (error) {
        for (const move of stagedMoves.reverse()) {
          await rename(move.to, move.from).catch(() => {})
        }
        throw error
      }
    })
  }

  async transcribeAudio(
    id: string,
    jobId: string = randomUUID()
  ): Promise<TranscribeAudioResult> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === id)
    if (!lecture) {
      return { success: false, failureKind: 'not_found', error: 'Lezione non trovata.' }
    }

    const audioPath = await this.storage.getAudioFilePath(lecture.audioFileName)
    if (!audioPath) {
      return { success: false, failureKind: 'input', error: 'File audio non trovato sul disco.' }
    }

    const audioChecksum = await fileChecksum(audioPath)
    const settings = await this.settingsService.getSettings()
    const managedKeys = await this.getManagedKeys()
    if (managedKeys.length === 0) {
      return {
        success: false,
        failureKind: 'authentication',
        error:
          'Nessuna chiave API Gemini configurata. Inseriscila nelle Impostazioni (⚙️).'
      }
    }

    const courseDef = lecture.courseCode ? settings.courses?.[lecture.courseCode] : undefined
    // Tutte le lezioni sono in inglese di default, salvo diversa impostazione del corso
    const courseLang: string = courseDef?.language || 'en'

    this.progressCallback?.({
      jobId,
      lectureId: id,
      phase: 'segmenting',
      message: 'Caricamento e trascrizione audio in corso…',
      percent: 5
    })

    try {
      const transcriptText = await this.geminiService.transcribeAudioFile({
        keys: managedKeys,
        lectureId: id,
        audioFilePath: audioPath,
        language: courseLang || 'auto',
        onProgress: (message, percent, meta) => {
          logger.info('transcription', `[${id}] ${message} (${percent}%)`)
          this.progressCallback?.({
            jobId,
            lectureId: id,
            phase: 'transcribing',
            message,
            percent,
            ...(meta || {})
          })
        }
      })

      await this.repository.runExclusive(async () => {
        const latest = await this.repository.readLibrary()
        const current = latest.lectures.find((item) => item.id === id)
        if (
          !current ||
          JSON.stringify(current) !== JSON.stringify(lecture) ||
          (await fileChecksum(audioPath)) !== audioChecksum
        )
          throw new PipelineSourceChangedError(
            'La lezione è cambiata durante la trascrizione. Riprova.'
          )
        const transcriptFileName = `${id}.txt`
        await this.storage.writeTranscript(
          transcriptFileName,
          transcriptText
        )
        lecture.transcriptFileName = transcriptFileName
        lecture.sourceTranscriptFileName = 'Trascrizione Gemini AI'
        lecture.status = 'transcript-available'

        latest.lectures = latest.lectures.map((item) =>
          item.id === id ? lecture : item
        )
        await this.repository.writeLibrary(latest)

        this.searchIndex.indexDocument({
          id: lecture.id,
          courseCode: lecture.courseCode ?? '',
          recordedAt: lecture.recordedAt ?? '',
          markdownEnText:
            lecture.markdownEnFileName && lecture.markdownFileName
              ? ((await this.storage.readMarkdownEn(
                  lecture.markdownFileName
                )) ?? '')
              : '',
          sourceAudioFileName: lecture.sourceAudioFileName,
          sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
          transcriptText: transcriptText,
          markdownText: lecture.markdownFileName
              ? ((await this.storage.readMarkdown(
                  lecture.markdownFileName
                )) ?? '')
              : ''
        })
      })

      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'completed',
        message: 'Trascrizione audio completata e salvata!',
        percent: 100
      })
      logger.info('transcription', 'Trascrizione grezza salvata; audio originale conservato.', JSON.stringify({ lectureId: id, jobId }))
      return {
        success: true,
        transcript: transcriptText
      }
    } catch (error) {
      const failure = error instanceof PipelineSourceChangedError
        ? { success: false as const, failureKind: 'source_changed' as const, error: error.message }
        : pipelineFailureFromError(error)
      const message = failure.error
      logger.error(
        'transcription',
        `Errore trascrizione audio per lezione ${id}: ${message}`
      )

      this.progressCallback?.({
        jobId,
        lectureId: id,
        phase: 'error',
        message,
        percent: 0
      })
      return failure
    }
  }

  async importFiles(filePaths: string[]): Promise<ImportSummary> {
    return this.repository.runExclusive(async () => {
      await this.storage.initialize()
      await this.repository.initialize()
      const library = await this.repository.readLibrary()
      const imported: Lecture[] = []
      const skipped: SkippedImport[] = []

      for (const sourcePath of filePaths) {
        const sourceFileName = path.basename(sourcePath)
        let copiedAudioFileName: string | null = null
        let copiedTranscriptFileName: string | null = null
        if (path.extname(sourcePath).toLowerCase() !== AUDIO_EXTENSION) {
          skipped.push({
            sourceFileName,
            reason: 'Sono supportati solo file MP3.'
          })
          continue
        }

        try {
          const checksum = await fileChecksum(sourcePath)
          if (
            library.lectures.some((lecture) => lecture.checksum === checksum)
          ) {
            skipped.push({
              sourceFileName,
              reason: 'Audio gia presente nell’archivio.'
            })
            continue
          }

          const fileStats = await stat(sourcePath)
          const id = randomUUID()
          const parsed = parseFileName(sourceFileName)
          const audioFileName = `${id}${AUDIO_EXTENSION}`
          await copyFile(
            sourcePath,
            path.join(this.storage.audioDirectory, audioFileName)
          )
          copiedAudioFileName = audioFileName
          const measuredDuration = await readMp3Duration(sourcePath).catch(
            () => null
          )

          const transcriptSourcePath = path.join(
            path.dirname(sourcePath),
            `${path.basename(sourcePath, path.extname(sourcePath))}.txt`
          )
          const transcriptFileName = await this.copyTranscriptIfPresent(
            id,
            transcriptSourcePath
          )
          copiedTranscriptFileName = transcriptFileName
          let courseCode = parsed?.courseCode ?? null
          if (!courseCode && parsed?.recordedAt) {
            const durationSecs = measuredDuration ?? 0
            const match = await this.matchLectureToCourse(
              parsed.recordedAt,
              durationSecs
            )
            if (match && (match.isLaboratory || match.confidencePercentage >= 70)) {
              courseCode = match.matchedCourseCode
            }
          }

          const lecture: Lecture = {
            id,
            courseCode,
            recordedAt: parsed?.recordedAt ?? null,
            sourceAudioFileName: sourceFileName,
            sourceTranscriptFileName: transcriptFileName
              ? path.basename(transcriptSourcePath)
              : null,
            audioFileName,
            transcriptFileName,
            markdownFileName: null,
            markdownEnFileName: null,
            byteSize: fileStats.size,
            durationSeconds: measuredDuration ?? undefined,
            checksum,
            importedAt: new Date().toISOString(),
            status: transcriptFileName ? 'transcript-available' : 'audio-only',
            studyStatus: 'da-studiare'
          }
          await this.classifyLaboratory(lecture)
          library.lectures.push(lecture)
          imported.push(lecture)

          const transcriptContent = transcriptFileName
            ? ((await this.storage.readTranscript(transcriptFileName)) ?? '')
            : ''
          this.searchIndex.indexDocument({
            id: lecture.id,
            courseCode: lecture.courseCode ?? '',
            recordedAt: lecture.recordedAt ?? '',
            markdownEnText:
              lecture.markdownEnFileName && lecture.markdownFileName
                ? ((await this.storage.readMarkdownEn(
                    lecture.markdownFileName
                  )) ?? '')
                : '',
            sourceAudioFileName: lecture.sourceAudioFileName,
            sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
            transcriptText: transcriptContent,
            markdownText: ''
          })
        } catch (error) {
          if (copiedAudioFileName)
            await this.storage.deleteAudio(copiedAudioFileName)
          if (copiedTranscriptFileName)
            await this.storage.deleteTranscript(copiedTranscriptFileName)
          const pending = imported.find(
            (lecture) => lecture.audioFileName === copiedAudioFileName
          )
          if (pending) {
            library.lectures = library.lectures.filter(
              (lecture) => lecture.id !== pending.id
            )
            imported.splice(imported.indexOf(pending), 1)
            this.searchIndex.removeDocument(pending.id)
          }
          const reason =
            error instanceof Error
              ? error.message
              : 'Errore sconosciuto durante l’importazione.'
          skipped.push({ sourceFileName, reason })
        }
      }

      if (imported.length > 0) {
        try {
          await this.repository.writeLibrary(library)
        } catch (error) {
          for (const lecture of imported) {
            await this.storage.deleteAudio(lecture.audioFileName)
            if (lecture.transcriptFileName)
              await this.storage.deleteTranscript(lecture.transcriptFileName)
            this.searchIndex.removeDocument(lecture.id)
          }
          throw error
        }
        if (this.enableAutoProcessOnImport) {
          void this.queueAutomaticLectureProcessing(imported.map((l) => l.id))
        }
      }
      return { imported, skipped }
    })
  }

  private async copyTranscriptIfPresent(
    id: string,
    sourcePath: string
  ): Promise<string | null> {
    try {
      const sourceStats = await stat(sourcePath)
      if (!sourceStats.isFile()) return null
      const transcriptFileName = `${id}.txt`
      await this.storage.copyTranscript(sourcePath, transcriptFileName)
      return transcriptFileName
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  async getCourseStats(): Promise<CourseStats[]> {
    const [library, settings] = await Promise.all([
      this.repository.readLibrary(), this.settingsService.getSettings()
    ])
    const archived = new Set(settings.archivedCourseCodes || [])
    const statsMap = new Map<string, CourseStats>()

    for (const lecture of library.lectures) {
      if (lecture.courseCode && archived.has(lecture.courseCode)) continue
      const code = lecture.courseCode ?? 'NON ASSEGNATO'
      if (!statsMap.has(code)) {
        statsMap.set(code, {
          courseCode: code,
          totalLectures: 0,
          completedLectures: 0,
          inProgressLectures: 0,
          toStudyLectures: 0,
          totalAudioSeconds: 0,
          pipelineStatus: {
            audioOnly: 0,
            transcriptAvailable: 0,
            markdownReady: 0
          }
        })
      }

      const stats = statsMap.get(code)!
      stats.totalLectures++

      if (lecture.studyStatus === 'completata') stats.completedLectures++
      else if (lecture.studyStatus === 'in-corso') stats.inProgressLectures++
      else stats.toStudyLectures++

      stats.totalAudioSeconds += getLectureDurationSeconds(lecture)

      if (lecture.markdownFileName) {
        stats.pipelineStatus.markdownReady++
      } else if (lecture.status === 'transcript-available') {
        stats.pipelineStatus.transcriptAvailable++
      } else {
        stats.pipelineStatus.audioOnly++
      }
    }

    return Array.from(statsMap.values()).sort((a, b) =>
      a.courseCode.localeCompare(b.courseCode)
    )
  }

  async readCourseInfo(courseCode: string): Promise<string | null> {
    return this.storage.readCourseInfo(courseCode)
  }

  async writeCourseInfo(courseCode: string, content: string): Promise<void> {
    return this.storage.writeCourseInfo(courseCode, content)
  }

  async readStudySet(lectureId: string): Promise<LectureStudySet | null> {
    return this.storage.readStudySet(lectureId)
  }

  async generateStudySet(lectureId: string): Promise<GenerateStudySetResult> {
    const library = await this.repository.readLibrary()
    const lecture = library.lectures.find((item) => item.id === lectureId)
    if (!lecture) {
      return { success: false, error: 'Lezione non trovata.' }
    }

    const transcript = lecture.transcriptFileName
      ? await this.storage.readTranscript(lecture.transcriptFileName)
      : null
    const markdown = lecture.markdownFileName
      ? await this.storage.readMarkdown(lecture.markdownFileName)
      : null

    if (!transcript && !markdown) {
      return {
        success: false,
        error:
          'Per generare quiz e flashcard è necessaria la trascrizione o la dispensa della lezione.'
      }
    }

    const settings = await this.settingsService.getSettings()
    const keysToTry: string[] = []
    if (settings.apiKeys && settings.apiKeys.length > 0) {
      const startIdx =
        settings.activeKeyIndex >= 0 &&
        settings.activeKeyIndex < settings.apiKeys.length
          ? settings.activeKeyIndex
          : 0
      for (let i = 0; i < settings.apiKeys.length; i++) {
        const idx = (startIdx + i) % settings.apiKeys.length
        keysToTry.push(settings.apiKeys[idx])
      }
    } else if (settings.apiKey) {
      keysToTry.push(settings.apiKey)
    }

    if (keysToTry.length === 0) {
      return {
        success: false,
        error:
          'Nessuna chiave API Gemini configurata. Inseriscila nelle Impostazioni (⚙️).'
      }
    }

    let lastError: string | null = null

    for (let i = 0; i < keysToTry.length; i++) {
      const currentKey = keysToTry[i]
      try {
        const managedKeys = await this.getManagedKeys()
        const studySet = await this.geminiService.generateStudySet({
          apiKey: currentKey,
          keys: managedKeys,
          model: settings.model,
          transcript,
          markdown,
          courseCode: lecture.courseCode,
          lectureId
        })

        await this.repository.runExclusive(async () => {
          const latest = await this.repository.readLibrary()
          const current = latest.lectures.find((item) => item.id === lectureId)
          if (!current)
            throw new Error('Lezione eliminata durante la generazione.')
          const currentTranscript = current.transcriptFileName
            ? await this.storage.readTranscript(current.transcriptFileName)
            : null
          const currentMarkdown = current.markdownFileName
            ? await this.storage.readMarkdown(current.markdownFileName)
            : null
          if (currentTranscript !== transcript || currentMarkdown !== markdown)
            throw new Error(
              'La fonte è cambiata durante la generazione. Riprova.'
            )
          await this.storage.writeStudySet(lectureId, studySet)
        })

        if (
          settings.apiKeys.length > 1 &&
          settings.apiKeys.indexOf(currentKey) !== settings.activeKeyIndex
        ) {
          await this.settingsService.saveSettings({
            activeKeyIndex: settings.apiKeys.indexOf(currentKey)
          })
        }

        return { success: true, studySet }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : 'Errore durante la generazione del set di studio.'
        logger.error(
          'study-set',
          `Errore generazione study set per lezione ${lectureId}: ${lastError}`,
          error instanceof Error ? error.stack : undefined
        )
        const isRotatableError = isRetryableApiError(lastError)
        if (
          isRotatableError &&
          settings.autoRotateOnQuota &&
          i < keysToTry.length - 1
        ) {
          continue
        }
        break
      }
    }

    return {
      success: false,
      error: lastError ?? 'Errore imprevisto durante la generazione.'
    }
  }

  async loadQnaThreads(lectureId: string): Promise<QnaThread[]> {
    const data = await this.storage.readQnaThreads(`${lectureId}.json`)
    if (!data) return []
    try {
      const threads: unknown = JSON.parse(data)
      validateQnaThreads(threads)
      return threads
    } catch {
      return []
    }
  }

  async saveQnaThreads(lectureId: string, threads: unknown): Promise<void> {
    validateQnaThreads(threads)
    const previous = await this.loadQnaThreads(lectureId)
    await this.storage.writeQnaThreads(
      `${lectureId}.json`,
      JSON.stringify(threads, null, 2)
    )
    for (const removed of previous.filter(old => !threads.some(thread => thread.id === old.id))) await this.qnaImages.removeThread(lectureId, removed.id)
  }

  async saveQnaImage(lectureId: string, threadId: string, input: unknown) {
    if (typeof lectureId !== 'string' || typeof threadId !== 'string' || !/^[\w-]{1,160}$/.test(lectureId) || !/^[\w-]{1,160}$/.test(threadId)) throw new Error('Conversazione non valida.')
    const threads = await this.loadQnaThreads(lectureId)
    if (!threads.some(thread => thread.id === threadId)) throw new Error('Conversazione non disponibile: apri una domanda prima di allegare slide.')
    return this.qnaImages.put(lectureId, threadId, input)
  }

  private qnaStreamCallback?: (data: {
    threadId: string
    chunk: string
  }) => void
  private qnaStatusCallback?: (data: QnaStatusUpdate) => void

  setQnaStreamCallback(
    callback: (data: { threadId: string; chunk: string }) => void
  ): void {
    this.qnaStreamCallback = callback
  }

  setQnaStatusCallback(callback: (data: QnaStatusUpdate) => void): void {
    this.qnaStatusCallback = callback
  }

  async courseRagSources(course: string): Promise<{ sources: IndexedCourseSource[]; missingTranscripts: number }> {
    const library = await this.repository.readLibrary()
    const lectures = library.lectures.filter(lecture => lecture.courseCode === course)
    const theoryOrder = new Map(this.sortLectures(lectures).filter(lecture => !lecture.isLaboratory).map((lecture, index) => [lecture.id, index + 1]))
    const sources: IndexedCourseSource[] = []
    let missingTranscripts = 0
    for (const lecture of lectures) {
      for (const kind of ['transcript', 'notes'] as const) {
        let text: string | null = null
        try { text = kind === 'transcript' ? await this.readTranscript(lecture.id) : await this.readMarkdown(lecture.id) } catch { /* Coverage is exposed explicitly. */ }
        if (!text?.trim()) { if (kind === 'transcript') missingTranscripts++; continue }
        const source = splitCourseSource({ id: ragHash(`${kind}:${lecture.id}`), title: `${lecture.title || lecture.sourceAudioFileName} · ${kind === 'transcript' ? 'Trascrizione grezza' : 'Dispensa AI'}`,
          kind, provenance: kind === 'notes' ? 'ai-derived' : 'original', derivedFrom: kind === 'notes' ? [ragHash(`transcript:${lecture.id}`)] : undefined,
          version: ragHash(text), status: 'ready', lectureId: lecture.id, lectureOrdinal: theoryOrder.get(lecture.id), recordedDate: lecture.recordedAt?.slice(0, 10) }, [{ text }])
        if (kind === 'transcript') source.rawText = text
        sources.push(source)
      }
    }
    const definition = (await this.getCourses()).find(item => item.code === course)
    let information: string | null = null
    try { information = await this.readCourseInfo(course) } catch { /* The original lessons remain searchable. */ }
    for (const [name, text] of [['Configurazione e calendario del corso', definition ? JSON.stringify(definition) : ''], ['Informazioni corso (sintesi generata)', information ?? '']]) {
      if (text) sources.push(splitCourseSource({ id: ragHash(`${course}:${name}`), title: name, kind: 'course', provenance: name.includes('sintesi') ? 'ai-derived' : 'metadata', version: ragHash(text), status: 'ready' }, [{ text }]))
    }
    return { sources, missingTranscripts }
  }

  async generateQnaResponse(
    lectureId: string,
    thread: unknown,
    useFullContext: unknown,
    includeOtherQna: unknown = false,
    responseLength: unknown = 'brief'
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      validateQnaThread(thread)
      if (responseLength !== 'brief' && responseLength !== 'medium' && responseLength !== 'long') throw new Error('Lunghezza Q&A non valida.')
      if (typeof useFullContext !== 'boolean' || typeof includeOtherQna !== 'boolean') {
        throw new Error('Opzione del contesto Q&A non valida.')
      }
      const images = await this.qnaImages.forRequest(thread.attachmentIds, lectureId, thread.id)
      const settings = await this.getSettings()
      const allManagedKeys = await this.getManagedKeys()
      const managedKeys = settings.autoRotateOnQuota
        ? allManagedKeys
        : allManagedKeys.slice(0, 1)

      if (managedKeys.length === 0) {
        return {
          success: false,
          error: 'Nessuna chiave API Gemini configurata.'
        }
      }

      const library = await this.repository.readLibrary()
      const lecture = library.lectures.find((l) => l.id === lectureId)

      let fullLectureText: string | undefined = undefined
      if (useFullContext && lecture) {
        const markdown = await this.readMarkdown(lectureId)
        fullLectureText = markdown ?? undefined
      }

      const otherQnaContext = includeOtherQna ? relatedQnaContext(thread, await this.loadQnaThreads(lectureId)) : undefined

      const totalKeysCount =
        settings.apiKeys && settings.apiKeys.length > 0
          ? settings.apiKeys.length
          : 1
      const attemptState: { current: RequestAttemptInfo | null } = {
        current: null
      }

      logger.info(
        'qna',
        `Avvio richiesta QnA con modello ${QNA_PRIMARY_MODEL}; ${images.length} slide allegate.`
      )

      if (Buffer.byteLength(JSON.stringify({ thread, fullLectureText, otherQnaContext, images }), 'utf8') > 18_000_000) throw new Error('Contesto troppo grande: riduci le slide o disattiva il contesto completo.')

      const stream = this.geminiService.generateQnaResponse({
        keys: managedKeys,
        model: settings.model,
        courseCode: lecture?.courseCode || null,
        lectureTitle: lecture?.title || null,
        thread,
        fullLectureText,
        otherQnaContext,
        responseLength,
        images,
        onAttempt: (info) => {
          const previous = attemptState.current
          attemptState.current = info
          const configuredIndexMatch = /^key-(\d+)$/.exec(info.keyId || '')
          const configuredIndex = configuredIndexMatch
            ? Number(configuredIndexMatch[1])
            : info.keyIndex
          const phase =
            info.model !== QNA_PRIMARY_MODEL
              ? 'fallback_model'
              : previous && previous.keyAlias !== info.keyAlias
                ? 'rotating_key'
                : 'connecting'
          const message =
            phase === 'fallback_model'
              ? `Passaggio al modello ${info.model} con ${info.keyAlias}...`
              : phase === 'rotating_key'
                ? `Rotazione a ${info.keyAlias}/${totalKeysCount}...`
                : `Connessione a ${info.model} (${info.keyAlias}/${totalKeysCount})...`
          this.qnaStatusCallback?.({
            threadId: thread.id,
            phase,
            message,
            model: info.model,
            keyIndex: configuredIndex,
            totalKeys: totalKeysCount,
            attempt: info.attempt
          })
        },
        onRetry: (attempt, delayMs, reason) => {
          logger.warn(
            'qna',
            `Retry QnA #${attempt} tra ${Math.round(delayMs / 1000)}s: ${reason}`
          )
        }
      })

      let fullResponse = ''
      let firstChunkReceived = false
      for await (const chunk of stream) {
        if (!firstChunkReceived) {
          firstChunkReceived = true
          const activeAttempt = attemptState.current
          this.qnaStatusCallback?.({
            threadId: thread.id,
            phase: 'streaming',
            message: `⚡ Risposta in arrivo da ${activeAttempt?.model || settings.model}...`,
            model: activeAttempt?.model || settings.model,
            keyIndex: activeAttempt?.keyIndex,
            totalKeys: totalKeysCount
          })
        }
        fullResponse += chunk
        this.qnaStreamCallback?.({ threadId: thread.id, chunk })
      }

      const completedAttempt = attemptState.current
      const successfulKeyIndexMatch = /^key-(\d+)$/.exec(completedAttempt?.keyId || '')
      const successfulKeyIndex = successfulKeyIndexMatch
        ? Number(successfulKeyIndexMatch[1])
        : settings.activeKeyIndex
      if (
        settings.apiKeys.length > 1 &&
        successfulKeyIndex !== settings.activeKeyIndex
      ) {
        await this.settingsService.saveSettings({
          activeKeyIndex: successfulKeyIndex
        })
      }

      logger.info(
        'qna',
        `Risposta QnA completata con successo tramite ${completedAttempt?.model || settings.model} e ${completedAttempt?.keyAlias || 'chiave configurata'}`
      )
      this.qnaStatusCallback?.({
        threadId: thread.id,
        phase: 'completed',
        message: `Risposta completata con ${completedAttempt?.model || settings.model}`,
        model: completedAttempt?.model || settings.model,
        keyIndex: successfulKeyIndex,
        totalKeys: totalKeysCount
      })
      return { success: true, text: fullResponse }
    } catch (err: unknown) {
      const message = errorMessage(err, 'Errore imprevisto')
      logger.error(
        'qna',
        `Errore generazione QnA: ${message}`,
        errorStack(err)
      )
      if (isRecord(thread) && typeof thread.id === 'string') {
        this.qnaStatusCallback?.({
          threadId: thread.id,
          phase: 'error',
          message: `Errore: ${message}`,
          model: (await this.getSettings()).model
        })
      }
      return { success: false, error: message }
    }
  }

  async saveStudySession(session: unknown): Promise<void> {
    validateStudySession(session)
    return this.repository.runExclusive(async () => {
      const sessions = await this.storage.readStudySessions()
      const existingIdx = sessions.findIndex((s) => s.id === session.id)
      if (existingIdx >= 0) {
        if (JSON.stringify(sessions[existingIdx]) === JSON.stringify(session)) return
        const previous = sessions[existingIdx]
        if (previous.lectureId !== session.lectureId || previous.courseCode !== session.courseCode) throw new Error('La sessione appartiene a un altro contesto di studio.')
        sessions[existingIdx] = { ...session, durationSeconds: Math.max(previous.durationSeconds, session.durationSeconds), corrections: previous.corrections }
      } else {
        sessions.push({ ...session, corrections: undefined })
      }
      await this.storage.writeStudySessions(sessions)
    })
  }

  async addManualStudyTime(
    courseCode: unknown,
    minutes: unknown,
    date?: unknown
  ): Promise<void> {
    if (
      typeof courseCode !== 'string' ||
      courseCode.length > 120 ||
      typeof minutes !== 'number' ||
      !Number.isFinite(minutes) ||
      minutes > 30 * 24 * 60 ||
      (date !== undefined && typeof date !== 'string')
    ) {
      throw new Error('Tempo di studio manuale non valido.')
    }
    const durationSeconds = Math.max(0, Math.round(minutes * 60))
    if (durationSeconds <= 0) return
    const now = new Date()
    const sessionDate = date || formatLocalCalendarDate(now)
    if (!parseLocalCalendarDate(sessionDate))
      throw new Error('Data della sessione non valida.')
    const session: StudySession = {
      id: randomUUID(),
      lectureId: null,
      courseCode: courseCode ? courseCode.trim() : null,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      durationSeconds,
      mode: 'manual',
      date: sessionDate
    }
    await this.saveStudySession(session)
  }

  async getStudyTimeRemovalTargets() {
    return this.repository.runExclusive(async () => {
      const sessions = await this.storage.readStudySessions()
      const library = await this.repository.readLibrary()
      return studyTimeRemovalTargets(sessions, library.lectures, formatLocalCalendarDate())
    })
  }

  async removeStudyTime(targetId: unknown, minutes: unknown): Promise<void> {
    if (typeof targetId !== 'string' || targetId.length > 250 || typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > 43200) throw new Error('Rettifica del tempo non valida.')
    return this.repository.runExclusive(async () => {
      const sessions = await this.storage.readStudySessions()
      const library = await this.repository.readLibrary()
      const today = formatLocalCalendarDate()
      const target = studyTimeRemovalTargets(sessions, library.lectures, today).find(item => item.id === targetId)
      if (!target) throw new Error('La destinazione non è più disponibile. Riapri Togli tempo.')
      const updated = removeStudySeconds(sessions, target.id, minutes * 60, today, new Date().toISOString())
      await this.storage.writeStudySessions(updated)
    })
  }

  async getLectureStudySeconds(lectureId: unknown, excludedSessionId: unknown): Promise<number> {
    if (typeof lectureId !== 'string' || !lectureId.trim() || lectureId.length > 200 ||
        typeof excludedSessionId !== 'string' || !excludedSessionId.trim() || excludedSessionId.length > 200) {
      throw new Error('Identificativo di studio non valido.')
    }
    return this.repository.runExclusive(async () => {
      const sessions = await this.storage.readStudySessions()
      return sessions.reduce((total, session) => total + (
        session.lectureId === lectureId && session.id !== excludedSessionId ? effectiveStudySeconds(session) : 0
      ), 0)
    })
  }

  async getStudyAnalytics(): Promise<StudyAnalytics> {
    const [sessions, library, settings] = await Promise.all([
      this.storage.readStudySessions(), this.repository.readLibrary(), this.settingsService.getSettings()
    ])
    const archived = new Set(settings.archivedCourseCodes || [])
    const lectures = new Map(library.lectures.map(lecture => [lecture.id, lecture]))
    const lectureSeconds = new Map<string, number>()
    const todayStr = formatLocalCalendarDate()
    const totalsByDate = new Map<string, number>()
    const coursesByDate = new Map<string, Record<string, number>>()
    const courseTotals: Record<string, number> = {}
    let totalSemesterSeconds = 0
    for (const original of sessions) {
      const s = { ...original, durationSeconds: effectiveStudySeconds(original) }
      const lecture = s.lectureId ? lectures.get(s.lectureId) : undefined
      const code = lecture ? lecture.courseCode : s.courseCode
      if (code && archived.has(code)) continue
      const course = code || 'Senza corso'
      if (lecture && s.durationSeconds > 0) {
        lectureSeconds.set(lecture.id, (lectureSeconds.get(lecture.id) || 0) + s.durationSeconds)
      }
      totalSemesterSeconds += s.durationSeconds
      totalsByDate.set(s.date, (totalsByDate.get(s.date) || 0) + s.durationSeconds)
      const dayCourses = coursesByDate.get(s.date) || {}
      dayCourses[course] = (dayCourses[course] || 0) + s.durationSeconds
      coursesByDate.set(s.date, dayCourses)
      courseTotals[course] = (courseTotals[course] || 0) + s.durationSeconds
    }
    const todaySeconds = totalsByDate.get(todayStr) || 0
    const todayByCourse = coursesByDate.get(todayStr) || {}

    const weekDays: DailyStudySummary[] = []
    let weekTotal = 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = formatLocalCalendarDate(d)
      const dayName = d.toLocaleDateString('it-IT', { weekday: 'short' })
      const dayNumber = d.getDate()
      const dayLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1, 3)} ${dayNumber}`
      const daySecs = totalsByDate.get(dateStr) || 0
      weekTotal += daySecs
      weekDays.push({
        date: dateStr,
        dayLabel,
        totalSeconds: daySecs,
        byCourse: coursesByDate.get(dateStr) || {}
      })
    }
    const weekAvgDailySeconds = Math.round(weekTotal / 7)

    let monthTotal = 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = formatLocalCalendarDate(d)
      monthTotal += totalsByDate.get(dateStr) || 0
    }
    const monthAvgDailySeconds = Math.round(monthTotal / 30)

    let currentStreakDays = 0
    const todayHasStudy = (totalsByDate.get(todayStr) || 0) > 0
    let startOffset = todayHasStudy ? 0 : 1

    while (true) {
      const checkD = new Date()
      checkD.setDate(checkD.getDate() - startOffset)
      const checkDateStr = formatLocalCalendarDate(checkD)
      const hasStudy = (totalsByDate.get(checkDateStr) || 0) > 0
      if (hasStudy) {
        currentStreakDays++
        startOffset++
      } else {
        break
      }
    }

    const courseBreakdown: CourseStudyBreakdown[] = Object.entries(courseTotals)
      .map(([courseCode, totalSeconds]) => ({
        courseCode,
        totalSeconds,
        percentage:
          totalSemesterSeconds > 0
            ? Math.round((totalSeconds / totalSemesterSeconds) * 100)
            : 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds)

    const averages = new Map<string, { seconds: number; count: number }>()
    for (const lecture of library.lectures) {
      if (lecture.courseCode && archived.has(lecture.courseCode)) continue
      const code = lecture.courseCode ?? 'NON ASSEGNATO'
      const average = averages.get(code) || { seconds: 0, count: 0 }
      const seconds = lectureSeconds.get(lecture.id) || 0
      if (lecture.studyStatus === 'completata' && seconds > 0) {
        average.seconds += seconds
        average.count++
      }
      averages.set(code, average)
    }
    const courseLectureAverages = [...averages].map(([courseCode, average]) => ({
      courseCode, timedCompletedLectures: average.count,
      averageStudySeconds: average.count > 0 ? Math.round(average.seconds / average.count) : null
    })).sort((a, b) => a.courseCode.localeCompare(b.courseCode))

    return {
      courseLectureAverages,
      todaySeconds,
      todayByCourse,
      weekDays,
      weekAvgDailySeconds,
      monthAvgDailySeconds,
      totalSemesterSeconds,
      currentStreakDays,
      courseBreakdown
    }
  }

  async getCourses(): Promise<CourseDefinition[]> {
    const settings = await this.settingsService.getSettings()
    const coursesMap = settings.courses || {}
    const list = Object.values(coursesMap).filter((c): c is CourseDefinition =>
      Boolean(c && c.code)
    )
    return list.map(course => ({ ...course, publishToGithub: course.publishToGithub ?? (settings.legacyPublishingCourseCodes?.includes(course.code) ?? true) })).sort((a, b) => a.code.localeCompare(b.code))
  }

  async getArchivedCourseCodes(): Promise<string[]> {
    return (await this.settingsService.getSettings()).archivedCourseCodes || []
  }

  async setCourseArchived(code: unknown, archived: unknown): Promise<string[]> {
    if (typeof code !== 'string' || !code.trim() || code.length > 120 ||
      typeof archived !== 'boolean') {
      throw new Error('Stato di archiviazione del corso non valido.')
    }
    const trimmed = code.trim()
    return this.repository.runExclusive(async () => {
      const settings = await this.settingsService.getSettings()
      const library = await this.repository.readLibrary()
      if (archived && !settings.courses?.[trimmed] &&
        !library.lectures.some(lecture => lecture.courseCode === trimmed)) {
        throw new Error('Corso non trovato.')
      }
      return this.settingsService.setCourseArchived(trimmed, archived)
    })
  }

  async saveCourse(course: unknown, oldCode?: unknown): Promise<void> {
    validateCourse(course)
    if (oldCode !== undefined && typeof oldCode !== 'string') {
      throw new Error('Codice del corso precedente non valido.')
    }
    const code = course.code.trim()
    if (!code) throw new Error('Il codice del corso è obbligatorio.')

    if (oldCode && oldCode.trim() !== code) {
      await this.renameCourse(oldCode, code)
    }

    const settings = await this.settingsService.getSettings()
    const courses = { ...(settings.courses || {}) }
    const cfu =
      typeof course.cfu === 'number' && !isNaN(course.cfu)
        ? Math.max(0, course.cfu)
        : 6
    const lectureHours = course.lectureHours || cfu * 7
    const individualStudyHours = course.individualStudyHours || cfu * 18
    const totalHours = cfu * 25

    courses[code] = {
      ...course,
      publishToGithub: course.publishToGithub ?? courses[code]?.publishToGithub ?? (settings.legacyPublishingCourseCodes?.includes(code) ?? false),
      code,
      cfu,
      lectureHours,
      individualStudyHours,
      totalHours,
      schedule: Array.isArray(course.schedule) ? course.schedule : []
    }

    await this.settingsService.saveSettings({ courses })
    await this.applyScheduledLaboratories()
  }

  async deleteCourse(
    code: string,
    options?: unknown
  ): Promise<void> {
    if (
      options !== undefined &&
      (!isRecord(options) ||
        (options.keepLectures !== undefined &&
          typeof options.keepLectures !== 'boolean'))
    ) {
      throw new Error('Opzioni di eliminazione del corso non valide.')
    }
    const trimmed = code.trim()
    if (!trimmed) return

    return this.repository.runExclusive(async () => {
      const settings = await this.settingsService.getSettings()
      const courses = { ...(settings.courses || {}) }
      if (courses[trimmed]) {
        delete courses[trimmed]
        await this.settingsService.saveSettings({ courses })
      }

      await this.storage.deleteCourseInfo(trimmed)

      if (!options || !options.keepLectures) {
        const library = await this.repository.readLibrary()
        let changed = false
        for (const l of library.lectures) {
          if (l.courseCode === trimmed) {
            l.courseCode = null
            applyLaboratorySchedule(l)
            changed = true
          }
        }
        if (changed) {
          await this.repository.writeLibrary(library)
        }
        await this.settingsService.setCourseArchived(trimmed, false)
      }
    })
  }

  async renameCourse(
    oldCode: string,
    newCode: string
  ): Promise<{ updatedCount: number }> {
    const trimmedOld = oldCode.trim()
    const trimmedNew = newCode.trim()
    if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
      return { updatedCount: 0 }
    }

    return this.repository.runExclusive(async () => {
      const settings = await this.settingsService.getSettings()
      const sessions = await this.storage.readStudySessions()
      const library = await this.repository.readLibrary()
      const oldInfo = await this.storage.readCourseInfo(trimmedOld)
      const newInfo = await this.storage.readCourseInfo(trimmedNew)
      const updatedCount = library.lectures.filter(
        (lecture) => lecture.courseCode === trimmedOld
      ).length
      const updatedLibrary: LibraryFile = {
        ...library,
        lectures: library.lectures.map((lecture) =>
          lecture.courseCode === trimmedOld
            ? { ...lecture, courseCode: trimmedNew }
            : lecture
        )
      }
      const courses = { ...(settings.courses || {}) }
      const sourceCourse = courses[trimmedOld]
      delete courses[trimmedOld]
      if (!courses[trimmedNew] && sourceCourse) {
        courses[trimmedNew] = { ...sourceCourse, code: trimmedNew }
      }
      const courseConfigs = { ...(settings.courseConfigs || {}) }
      const archivedCourseCodes = [...new Set((settings.archivedCourseCodes || [])
        .map(code => code === trimmedOld ? trimmedNew : code))].sort()
      const sourceConfig = courseConfigs[trimmedOld]
      delete courseConfigs[trimmedOld]
      if (!courseConfigs[trimmedNew] && sourceConfig)
        courseConfigs[trimmedNew] = sourceConfig
      const updatedSessions = sessions.map((session) =>
        session.courseCode === trimmedOld
          ? { ...session, courseCode: trimmedNew }
          : session
      )

      try {
        await this.repository.writeLibrary(updatedLibrary)
        await this.storage.renameOrMergeCourseInfo(trimmedOld, trimmedNew)
        await this.settingsService.saveSettings({ courses, courseConfigs, archivedCourseCodes, legacyPublishingCourseCodes: settings.legacyPublishingCourseCodes?.map(code => code === trimmedOld ? trimmedNew : code) })
        await this.storage.writeStudySessions(updatedSessions)
      } catch (error) {
        const rollbackErrors: unknown[] = []
        for (const rollback of [
          () => this.repository.writeLibrary(library),
          async () => {
            await this.storage.deleteCourseInfo(trimmedOld)
            await this.storage.deleteCourseInfo(trimmedNew)
            if (oldInfo !== null)
              await this.storage.writeCourseInfo(trimmedOld, oldInfo)
            if (newInfo !== null)
              await this.storage.writeCourseInfo(trimmedNew, newInfo)
          },
          () =>
            this.settingsService.saveSettings({
              courses: settings.courses || {},
              legacyPublishingCourseCodes: settings.legacyPublishingCourseCodes,
              archivedCourseCodes: settings.archivedCourseCodes || [],
              courseConfigs: settings.courseConfigs || {}
            }),
          () => this.storage.writeStudySessions(sessions)
        ]) {
          try {
            await rollback()
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError)
          }
        }
        if (rollbackErrors.length > 0) {
          logger.error(
            'course-rename',
            'Rollback incompleto della rinomina corso',
            rollbackErrors.map(String).join('\n')
          )
        }
        throw error
      }

      void this.warmUpSearchIndex()
      return { updatedCount }
    })
  }

  private async classifyLaboratory(lecture: Lecture): Promise<boolean> {
    const settings = await this.settingsService.getSettings()
    return applyLaboratorySchedule(lecture, settings.courses?.[lecture.courseCode ?? ''])
  }

  async applyScheduledLaboratories(): Promise<number> {
    return this.repository.runExclusive(async () => {
      await this.repository.initialize()
      const library = await this.repository.readLibrary()
      let count = 0
      for (const lecture of library.lectures) {
        if (await this.classifyLaboratory(lecture)) count++
      }
      if (count) await this.repository.writeLibrary(library)
      return count
    })
  }

  async matchLectureToCourse(
    recordedAt: string,
    durationSeconds: number
  ): Promise<CourseScheduleMatch | null> {
    if (!recordedAt) return null
    const recordedDate = new Date(recordedAt)
    if (isNaN(recordedDate.getTime())) return null

    const settings = await this.settingsService.getSettings()
    const courses = settings.courses || {}
    const dateIso = formatLocalCalendarDate(recordedDate)

    let bestMatch: CourseScheduleMatch | null = null

    for (const datedOnly of [true, false]) {
      for (const course of Object.values(courses)) {
        if (!course || !course.code) continue

        // Verifica date di inizio e fine semestre
        if (course.startDate && dateIso < course.startDate) continue
        if (course.endDate && dateIso > course.endDate) continue

        if (!Array.isArray(course.schedule)) continue

        const slots = datedOnly ? datedLaboratorySlots(course, recordedDate) : course.schedule
        for (const slot of slots) {
          const { confidence } = calculateScheduleOverlap(
            recordedDate,
            durationSeconds,
            slot
          )

          if (
            confidence >= 60 &&
            (!bestMatch || confidence > bestMatch.confidencePercentage)
          ) {
            const dayNames = [
              'Domenica',
              'Lunedì',
              'Martedì',
              'Mercoledì',
              'Giovedì',
              'Venerdì',
              'Sabato'
            ]
            const dayLabel =
              dayNames[slot.dayOfWeek] || `Giorno ${slot.dayOfWeek}`
            bestMatch = {
              ...(datedOnly ? { isLaboratory: true } : {}),
              lectureId: '',
              lectureTitle: '',
              recordedAt,
              durationMinutes: Math.round(durationSeconds / 60),
              matchedCourseCode: course.code,
              slot,
              confidencePercentage: confidence,
              reason: `Coincide al ${confidence}% con ${course.code} (${dayLabel} ${slot.startTime}-${slot.endTime}${slot.room ? ` ${slot.room}` : ''})`
            }
          }
        }
      }

      if (bestMatch) return bestMatch
    }
    return null
  }

  async autoAssignCoursesBySchedule(
    lectureIds?: string[],
    minConfidence = 60
  ): Promise<{ assigned: CourseScheduleMatch[]; skippedCount: number }> {
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const targetLectures =
        lectureIds && lectureIds.length > 0
          ? library.lectures.filter((l) => lectureIds.includes(l.id))
          : library.lectures.filter((l) => !l.courseCode)

      const assigned: CourseScheduleMatch[] = []
      let skippedCount = 0
      let changed = false

      for (const lecture of targetLectures) {
        if (!lecture.recordedAt) {
          skippedCount++
          continue
        }
        const durationSeconds = getLectureDurationSeconds(lecture)
        const match = await this.matchLectureToCourse(
          lecture.recordedAt,
          durationSeconds
        )
        if (match && match.confidencePercentage >= minConfidence) {
          lecture.courseCode = match.matchedCourseCode
          await this.classifyLaboratory(lecture)
          match.lectureId = lecture.id
          match.lectureTitle = lecture.title || lecture.sourceAudioFileName
          assigned.push(match)
          changed = true

          this.searchIndex.indexDocument({
            id: lecture.id,
            courseCode: lecture.courseCode,
            recordedAt: lecture.recordedAt ?? '',
            markdownEnText:
              lecture.markdownEnFileName && lecture.markdownFileName
                ? ((await this.storage.readMarkdownEn(
                    lecture.markdownFileName
                  )) ?? '')
                : '',
            sourceAudioFileName: lecture.sourceAudioFileName,
            sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
            transcriptText: lecture.transcriptFileName
              ? ((await this.storage.readTranscript(
                  lecture.transcriptFileName
                )) ?? '')
              : '',
            markdownText: lecture.markdownFileName
              ? ((await this.storage.readMarkdown(lecture.markdownFileName)) ??
                '')
              : ''
          })
        } else {
          skippedCount++
        }
      }

      if (changed) {
        await this.repository.writeLibrary(library)
      }

      return { assigned, skippedCount }
    })
  }

  async getScratchpad(): Promise<ScratchpadData> {
    const data = await this.storage.readScratchpad()
    validateScratchpad(data)
    return data
  }

  async saveScratchpad(data: unknown): Promise<void> {
    if (isRecord(data) && data.updatedAt === undefined) {
      data.updatedAt = new Date().toISOString()
    }
    validateScratchpad(data)
    await this.storage.writeScratchpad(data)
  }

  async getReminders(): Promise<Reminder[]> {
    const reminders = await this.storage.readReminders()
    validateReminders(reminders)
    return reminders
  }

  async saveReminders(reminders: unknown): Promise<void> {
    validateReminders(reminders)
    await this.storage.writeReminders(reminders)
  }

  async getHighlights(lectureId: string): Promise<LectureHighlight[]> {
    return await this.storage.readHighlights(lectureId)
  }

  async saveHighlights(
    lectureId: string,
    highlights: unknown
  ): Promise<void> {
    validateHighlights(highlights)
    await this.storage.writeHighlights(lectureId, highlights)
  }

  async detectUsbRecorder(customPath?: string): Promise<UsbRecorderInfo> {
    const drive = await findUsbRecorderDrive(customPath)
    if (!drive) {
      return {
        detected: false,
        files: []
      }
    }

    await this.repository.initialize()
    const library = await this.repository.readLibrary()
    const existingByChecksum = new Map(
      library.lectures.map((l) => [l.checksum, l])
    )

    const evaluatedFiles: UsbRecorderAudioFile[] = []

    for (const file of drive.files) {
      const existing = existingByChecksum.get(file.checksum)
      const durationMinutes = Math.round(file.durationSeconds / 60)
      const isDurationValid = durationMinutes >= 30

      if (existing) {
        evaluatedFiles.push({
          name: file.name,
          fullPath: file.fullPath,
          byteSize: file.byteSize,
          mtime: file.mtime,
          durationSeconds: file.durationSeconds,
          checksum: file.checksum,
          alreadyImported: true,
          existingLectureId: existing.id,
          recordedAt: existing.recordedAt ?? file.parsedRecordedAt,
          suggestedCourseCode: existing.courseCode,
          matchConfidence: 100,
          matchReason: `Già presente in archivio (${existing.courseCode ?? 'Senza corso'})`,
          criteria: {
            isDurationValid,
            durationMinutes,
            hasScheduleMatch: false,
            isDuplicate: true
          },
          defaultAction: 'discard'
        })
        continue
      }

      let suggestedCourseCode: string | null = file.parsedCourseCode
      let matchConfidence = 0
      let matchReason = ''
      let hasScheduleMatch = false

      if (file.parsedRecordedAt) {
        const match = await this.matchLectureToCourse(
          file.parsedRecordedAt,
          file.durationSeconds
        )
        if (match && match.confidencePercentage >= 60) {
          suggestedCourseCode = match.matchedCourseCode
          matchConfidence = match.confidencePercentage
          matchReason = match.reason
          hasScheduleMatch = true
        }
      }

      if (!hasScheduleMatch) {
        if (file.parsedCourseCode) {
          matchConfidence = 80
          matchReason = `Corso "${file.parsedCourseCode}" desunto dal nome file`
        } else if (!isDurationValid && file.durationSeconds > 0) {
          matchReason = `Audio breve (${durationMinutes} min): probabile registrazione parziale o di prova`
        } else {
          matchReason = 'Nessun corso corrispondente all’orario'
        }
      }

      const defaultAction =
        !isDurationValid && file.durationSeconds > 0 ? 'discard' : 'import'

      evaluatedFiles.push({
        name: file.name,
        fullPath: file.fullPath,
        byteSize: file.byteSize,
        mtime: file.mtime,
        durationSeconds: file.durationSeconds,
        checksum: file.checksum,
        alreadyImported: false,
        recordedAt: file.parsedRecordedAt,
        suggestedCourseCode,
        matchConfidence,
        matchReason,
        criteria: {
          isDurationValid,
          durationMinutes,
          hasScheduleMatch,
          isDuplicate: false
        },
        defaultAction
      })
    }

    return {
      detected: true,
      driveLetter: drive.driveLetter,
      recordPath: drive.recordPath,
      volumeName: drive.volumeName,
      freeSpaceBytes: drive.freeSpaceBytes,
      totalSpaceBytes: drive.totalSpaceBytes,
      files: evaluatedFiles
    }
  }

  async importUsbRecorderFiles(
    items: UsbImportItemSelection[]
  ): Promise<UsbImportResult> {
    const importItems = items.filter((item) => item.action === 'import')
    if (importItems.length === 0) {
      return {
        importedCount: 0,
        skippedCount: items.length,
        importedLectures: [],
        importedFilePaths: []
      }
    }

    return this.repository.runExclusive(async () => {
      await this.storage.initialize()
      await this.repository.initialize()
      const library = await this.repository.readLibrary()
      const importedLectures: Lecture[] = []
      const importedFilePaths: string[] = []
      let skippedCount = items.length - importItems.length

      for (const item of importItems) {
        const sourcePath = item.fullPath
        const sourceFileName = path.basename(sourcePath)
        const ext = path.extname(sourcePath).toLowerCase()

        if (!existsSync(sourcePath)) {
          skippedCount++
          continue
        }

        let copiedAudioFileName: string | null = null
        let copiedTranscriptFileName: string | null = null

        try {
          const checksum = await fileChecksum(sourcePath)
          if (
            library.lectures.some((lecture) => lecture.checksum === checksum)
          ) {
            skippedCount++
            continue
          }

          const fileStats = await stat(sourcePath)
          const id = randomUUID()
          const audioFileName = `${id}${ext}`
          await copyFile(
            sourcePath,
            path.join(this.storage.audioDirectory, audioFileName)
          )
          copiedAudioFileName = audioFileName

          let measuredDuration: number | null = null
          if (ext === '.mp3') {
            measuredDuration = await readMp3Duration(sourcePath).catch(
              () => null
            )
          }

          const transcriptSourcePath = path.join(
            path.dirname(sourcePath),
            `${path.basename(sourcePath, path.extname(sourcePath))}.txt`
          )
          const transcriptFileName = await this.copyTranscriptIfPresent(
            id,
            transcriptSourcePath
          )
          copiedTranscriptFileName = transcriptFileName

          const parsed = parseFileName(sourceFileName)
          const courseCode = item.courseCode ?? parsed?.courseCode ?? null
          const recordedAt = item.recordedAt ?? parsed?.recordedAt ?? null
          const title = item.title?.trim() || null

          const lecture: Lecture = {
            id,
            title,
            courseCode,
            recordedAt,
            sourceAudioFileName: sourceFileName,
            sourceTranscriptFileName: transcriptFileName
              ? path.basename(transcriptSourcePath)
              : null,
            audioFileName,
            transcriptFileName,
            markdownFileName: null,
            markdownEnFileName: null,
            byteSize: fileStats.size,
            durationSeconds: measuredDuration ?? undefined,
            checksum,
            importedAt: new Date().toISOString(),
            status: transcriptFileName ? 'transcript-available' : 'audio-only',
            studyStatus: 'da-studiare'
          }

          await this.classifyLaboratory(lecture)
          library.lectures.push(lecture)
          importedLectures.push(lecture)
          importedFilePaths.push(sourcePath)

          const transcriptContent = transcriptFileName
            ? ((await this.storage.readTranscript(transcriptFileName)) ?? '')
            : ''
          this.searchIndex.indexDocument({
            id: lecture.id,
            courseCode: lecture.courseCode ?? '',
            recordedAt: lecture.recordedAt ?? '',
            markdownEnText: '',
            sourceAudioFileName: lecture.sourceAudioFileName,
            sourceTranscriptFileName: lecture.sourceTranscriptFileName ?? '',
            transcriptText: transcriptContent,
            markdownText: ''
          })
        } catch (error) {
          logger.error(
            'usb-import',
            `Errore importazione file ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`
          )
          if (copiedAudioFileName) {
            await this.storage.deleteAudio(copiedAudioFileName).catch(() => {})
          }
          if (copiedTranscriptFileName) {
            await this.storage
              .deleteTranscript(copiedTranscriptFileName)
              .catch(() => {})
          }
          skippedCount++
        }
      }

      if (importedLectures.length > 0) {
        await this.repository.writeLibrary(library)
        if (this.enableAutoProcessOnImport) {
          void this.queueAutomaticLectureProcessing(
            importedLectures.map((l) => l.id)
          )
        }
      }

      return {
        importedCount: importedLectures.length,
        skippedCount,
        importedLectures,
        importedFilePaths
      }
    })
  }

  async deleteUsbRecorderFiles(
    filePaths: string[]
  ): Promise<UsbDeleteFilesResult> {
    const errors: string[] = []
    let deletedCount = 0
    let failedCount = 0

    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return { deletedCount: 0, failedCount: 0, errors: [] }
    }

    for (const filePath of filePaths) {
      if (typeof filePath !== 'string' || !filePath.trim()) {
        continue
      }

      const normalized = path.resolve(filePath)

      // Sicurezza: bloccare categoricamente la cancellazione di percorsi appartenenti alla cartella locale Lezionify
      const appStorageDir = path.resolve(this.storage.rootDirectory)
      if (normalized.startsWith(appStorageDir)) {
        logger.warn(
          'usb-delete',
          `Tentativo di cancellazione respinto su percorso locale Lezionify: ${normalized}`
        )
        errors.push(`Percorso locale protetto: ${path.basename(normalized)}`)
        failedCount++
        continue
      }

      if (!existsSync(normalized)) {
        continue
      }

      try {
        await unlink(normalized)
        deletedCount++
        logger.info(
          'usb-delete',
          `File eliminato con successo dal registratore: ${normalized}`
        )

        // Se è presente un file di trascrizione .txt associato con lo stesso stem sul registratore, rimuovilo
        const ext = path.extname(normalized)
        const txtPath = path.join(
          path.dirname(normalized),
          `${path.basename(normalized, ext)}.txt`
        )
        if (existsSync(txtPath)) {
          await unlink(txtPath).catch(() => {})
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(
          'usb-delete',
          `Errore eliminazione file ${normalized} dal registratore: ${msg}`
        )
        errors.push(`${path.basename(normalized)}: ${msg}`)
        failedCount++
      }
    }

    return {
      deletedCount,
      failedCount,
      errors
    }
  }

  async getAppLogs(): Promise<AppLogEntry[]> {
    return logger.getLogs()
  }

  async clearAppLogs(): Promise<void> {
    await logger.clearLogs()
  }

  async logClientMessage(
    level: LogLevel,
    source: string,
    message: string,
    details?: string
  ): Promise<void> {
    logger.log(level, source, message, details)
  }
}

class PipelineSourceChangedError extends Error {}
