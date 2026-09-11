import { randomUUID } from 'node:crypto'
import { copyFile, readdir, rename, stat, unlink } from 'node:fs/promises'
import * as path from 'node:path'
import { app, dialog, shell } from 'electron'
import type {
  AppLogEntry,
  AppSettings,
  BatchGenerationSummary,
  BatchTranslationSummary,
  CourseDefinition,
  CourseScheduleMatch,
  CourseStats,
  CourseStudyBreakdown,
  CourseTimeSlot,
  DailyStudySummary,
  DayOfWeek,
  GenerateStudySetResult,
  GenerationProgress,
  GenerationResult,
  ImportSummary,
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
  TranscribeAudioResult
} from '../../shared/archive'
import { getLectureDurationSeconds } from '../../shared/archive'
import {
  formatLocalCalendarDate,
  parseLocalCalendarDate
} from '../../shared/calendarDate'
import { GeminiService } from './gemini'
import { SettingsService } from './settings'
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
  if (!markdown) return null
  const lines = markdown.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      const title = trimmed
        .replace(/^#+\s*/, '')
        .replace(/[*_`]/g, '')
        .trim()
      if (title) return title
    }
  }
  return null
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length < 2) return 0
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

export function calculateScheduleOverlap(
  recordedDate: Date,
  durationSeconds: number,
  slot: CourseTimeSlot
): { overlapMinutes: number; confidence: number } {
  const day = recordedDate.getDay() as DayOfWeek
  if (day !== slot.dayOfWeek) {
    return { overlapMinutes: 0, confidence: 0 }
  }

  const recStartMinutes =
    recordedDate.getHours() * 60 + recordedDate.getMinutes()
  const recDurationMinutes = Math.max(15, Math.round(durationSeconds / 60))
  const recEndMinutes = recStartMinutes + recDurationMinutes

  const slotStartMinutes = parseTimeToMinutes(slot.startTime)
  const slotEndMinutes = parseTimeToMinutes(slot.endTime)
  const slotDurationMinutes = Math.max(15, slotEndMinutes - slotStartMinutes)

  const overlapStart = Math.max(recStartMinutes, slotStartMinutes)
  const overlapEnd = Math.min(recEndMinutes, slotEndMinutes)
  const overlapMinutes = Math.max(0, overlapEnd - overlapStart)

  if (overlapMinutes <= 0) {
    return { overlapMinutes: 0, confidence: 0 }
  }

  // Copertura bidirezionale: gestisce sia lezioni complete che spezzoni/pause
  const recordingCoverage = (overlapMinutes / recDurationMinutes) * 100
  const slotCoverage = (overlapMinutes / slotDurationMinutes) * 100

  // Se l'audio cade quasi tutto nello slot (es. 45 min dentro 2 ore) ha alta confidenza
  const confidence = Math.min(
    100,
    Math.round(Math.max(recordingCoverage, slotCoverage * 0.9))
  )

  return { overlapMinutes, confidence }
}

export class ArchiveService {
  private readonly rootDirectory: string
  private readonly storage: FileStorageService
  private readonly repository: LibraryRepository
  private readonly settingsService: SettingsService
  private readonly geminiService: GeminiService
  private readonly searchIndex: SearchIndexService
  private progressCallback?: (progress: GenerationProgress) => void

  constructor(
    customRootDirectory?: string,
    customGeminiService?: GeminiService
  ) {
    this.rootDirectory =
      customRootDirectory ??
      (app && typeof app.getPath === 'function'
        ? path.join(app.getPath('userData'), 'library')
        : path.join(process.cwd(), '.library-data'))
    this.storage = new FileStorageService(this.rootDirectory)
    this.repository = new LibraryRepository(this.rootDirectory)
    this.settingsService = new SettingsService(this.rootDirectory)
    this.geminiService = customGeminiService ?? new GeminiService()
    this.searchIndex = new SearchIndexService()
  }

  setProgressCallback(callback: (progress: GenerationProgress) => void): void {
    this.progressCallback = callback
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
    return this.repository.runExclusive(async () => {
      const library = await this.repository.readLibrary()
      const lectureIndex = library.lectures.findIndex((item) => item.id === id)
      if (lectureIndex === -1) throw new Error('Lezione non trovata.')

      const markdownFileName = `${id}.md`
      await this.storage.writeMarkdown(markdownFileName, content)

      const lecture = library.lectures[lectureIndex]
      const title = extractMarkdownTitle(content)

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
        markdownText: content
      })
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
    return this.settingsService.getSettings()
  }

  async saveSettings(settings: unknown): Promise<AppSettings> {
    return this.settingsService.saveSettings(settings)
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
      return { success: false, error: 'Lezione non trovata.' }
    }

    if (!lecture.transcriptFileName) {
      return {
        success: false,
        error:
          'Questa lezione non ha una trascrizione associata. Associa prima un file TXT.'
      }
    }

    const transcript = await this.readTranscript(id)
    if (!transcript || !transcript.trim()) {
      return { success: false, error: 'Il file di trascrizione è vuoto.' }
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
        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'segmenting',
          message: 'Inizializzazione elaborazione AI con Google Gemini…',
          percent: 5
        })

        const generatedMarkdown = await this.geminiService.generateLectureNotes(
          {
            apiKey: currentKey,
            model: settings.model,
            transcript,
            courseCode: lecture.courseCode,
            recordedAt: lecture.recordedAt,
            sourceAudioFileName: lecture.sourceAudioFileName,
            onProgress: (step, percent) => {
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
                percent
              })
            }
          }
        )

        await this.saveMarkdown(id, generatedMarkdown)

        // --- Estrazione & Merge Logistica del Corso ---
        if (lecture.courseCode) {
          try {
            this.progressCallback?.({
              jobId,
              lectureId: id,
              phase: 'logistics',
              message: 'Estrazione nozioni logistiche d’esame per la materia…',
              percent: 95
            })

            const extractedInfo =
              await this.geminiService.extractCourseLogistics({
                apiKey: currentKey,
                model: settings.model,
                transcript
              })

            if (extractedInfo) {
              const existingInfo = await this.readCourseInfo(lecture.courseCode)
              if (!existingInfo) {
                await this.writeCourseInfo(
                  lecture.courseCode,
                  `# Informazioni sul Corso e l'Esame: ${lecture.courseCode}\n\n${extractedInfo}`
                )
              } else {
                const mergedInfo =
                  await this.geminiService.mergeCourseLogistics({
                    apiKey: currentKey,
                    model: settings.model,
                    existingInfo,
                    newExtractedInfo: extractedInfo
                  })
                await this.writeCourseInfo(lecture.courseCode, mergedInfo)
              }
            }
          } catch (e) {
            console.error(
              "Errore durante l'estrazione della logistica del corso:",
              e
            )
          }
        }
        // ----------------------------------------------
        if (
          settings.apiKeys.length > 1 &&
          settings.apiKeys.indexOf(currentKey) !== settings.activeKeyIndex
        ) {
          await this.settingsService.saveSettings({
            activeKeyIndex: settings.apiKeys.indexOf(currentKey)
          })
        }

        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'completed',
          message: 'Dispensa didattica completata e salvata!',
          percent: 100
        })

        return { success: true, markdown: generatedMarkdown }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : 'Errore durante la generazione della dispensa.'

        logger.error(
          'ai-notes',
          `Errore generazione dispensa per lezione ${id}: ${lastError}`,
          error instanceof Error ? error.stack : undefined
        )

        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'error',
          message: lastError,
          percent: 0
        })
        const isQuotaError =
          lastError.includes('RESOURCE_EXHAUSTED') ||
          lastError.includes('quota') ||
          lastError.includes('429')
        if (
          isQuotaError &&
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
      return { success: false, error: 'Lezione non trovata.' }
    }

    if (!lecture.markdownFileName) {
      return {
        success: false,
        error: 'Questa lezione non ha ancora una dispensa ITA. Generala prima.'
      }
    }

    const markdownIta = await this.storage.readMarkdown(
      lecture.markdownFileName
    )
    if (!markdownIta || !markdownIta.trim()) {
      return { success: false, error: 'La dispensa ITA è vuota.' }
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
        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'segmenting',
          message: 'Traduzione della dispensa in inglese in corso…',
          percent: 10
        })

        const translatedMarkdown = await this.geminiService.translateToEnglish({
          apiKey: currentKey,
          model: settings.model,
          markdownIta
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
            throw new Error(
              'La dispensa è cambiata durante la traduzione. Riprova.'
            )
          await this.storage.writeMarkdownEn(
            current.markdownFileName!,
            translatedMarkdown
          )
          if (idx !== -1) {
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
                ? ((await this.storage.readTranscript(
                    current.transcriptFileName
                  )) ?? '')
                : '',
              markdownText: markdownIta,
              markdownEnText: translatedMarkdown
            })
          }
        })

        if (
          settings.apiKeys.length > 1 &&
          settings.apiKeys.indexOf(currentKey) !== settings.activeKeyIndex
        ) {
          await this.settingsService.saveSettings({
            activeKeyIndex: settings.apiKeys.indexOf(currentKey)
          })
        }

        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'completed',
          message: 'Traduzione inglese completata e salvata!',
          percent: 100
        })

        return { success: true, markdown: translatedMarkdown }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : 'Errore durante la traduzione.'

        logger.error(
          'translation',
          `Errore traduzione ENG per lezione ${id}: ${lastError}`,
          error instanceof Error ? error.stack : undefined
        )

        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'error',
          message: lastError,
          percent: 0
        })
        const isQuotaError =
          lastError.includes('RESOURCE_EXHAUSTED') ||
          lastError.includes('quota') ||
          lastError.includes('429')
        if (
          isQuotaError &&
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
      error: lastError ?? 'Errore imprevisto durante la traduzione.'
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
              if (match && match.confidencePercentage >= 70) {
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
      return { success: false, error: 'Lezione non trovata.' }
    }

    const audioPath = await this.storage.getAudioFilePath(lecture.audioFileName)
    if (!audioPath) {
      return { success: false, error: 'File audio non trovato sul disco.' }
    }

    const audioChecksum = await fileChecksum(audioPath)
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
    this.progressCallback?.({
      jobId,
      lectureId: id,
      phase: 'segmenting',
      message: 'Caricamento e trascrizione audio in corso…',
      percent: 5
    })

    for (let i = 0; i < keysToTry.length; i++) {
      const currentKey = keysToTry[i]
      try {
        const result = await this.geminiService.transcribeAndGenerateFromAudio({
          apiKey: currentKey,
          model: settings.model,
          audioFilePath: audioPath,
          courseCode: lecture.courseCode,
          recordedAt: lecture.recordedAt,
          sourceAudioFileName: lecture.sourceAudioFileName
        })

        await this.repository.runExclusive(async () => {
          const latest = await this.repository.readLibrary()
          const current = latest.lectures.find((item) => item.id === id)
          if (
            !current ||
            JSON.stringify(current) !== JSON.stringify(lecture) ||
            (await fileChecksum(audioPath)) !== audioChecksum
          )
            throw new Error(
              'La lezione è cambiata durante la trascrizione. Riprova.'
            )
          const transcriptFileName = `${id}.txt`
          await this.storage.writeTranscript(
            transcriptFileName,
            result.transcript
          )
          lecture.transcriptFileName = transcriptFileName
          lecture.sourceTranscriptFileName = 'Trascrizione Gemini AI'
          lecture.status = 'transcript-available'

          const markdownFileName = `${id}.md`
          await this.storage.writeMarkdown(markdownFileName, result.markdown)

          // Invalidare la versione ENG quando la ITA viene sovrascritta
          if (lecture.markdownEnFileName) {
            await this.storage.deleteMarkdownEn(markdownFileName)
          }

          lecture.markdownFileName = markdownFileName
          lecture.markdownEnFileName = null

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
            transcriptText: result.transcript,
            markdownText: result.markdown
          })
        })

        if (
          settings.apiKeys.length > 1 &&
          settings.apiKeys.indexOf(currentKey) !== settings.activeKeyIndex
        ) {
          await this.settingsService.saveSettings({
            activeKeyIndex: settings.apiKeys.indexOf(currentKey)
          })
        }

        this.progressCallback?.({
          jobId,
          lectureId: id,
          phase: 'completed',
          message: 'Trascrizione audio completata e salvata!',
          percent: 100
        })
        return {
          success: true,
          transcript: result.transcript,
          markdown: result.markdown
        }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error.message
            : 'Errore durante la trascrizione audio.'
        logger.error(
          'transcription',
          `Errore trascrizione audio per lezione ${id}: ${lastError}`,
          error instanceof Error ? error.stack : undefined
        )
        const isQuotaError =
          lastError.includes('RESOURCE_EXHAUSTED') ||
          lastError.includes('quota') ||
          lastError.includes('429')
        if (
          isQuotaError &&
          settings.autoRotateOnQuota &&
          i < keysToTry.length - 1
        ) {
          continue
        }
        break
      }
    }

    this.progressCallback?.({
      jobId,
      lectureId: id,
      phase: 'error',
      message:
        lastError ?? 'Errore imprevisto durante la trascrizione audio.',
      percent: 0
    })
    return {
      success: false,
      error: lastError ?? 'Errore imprevisto durante la trascrizione audio.'
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
            if (match && match.confidencePercentage >= 70) {
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
    const library = await this.repository.readLibrary()
    const statsMap = new Map<string, CourseStats>()

    for (const lecture of library.lectures) {
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
        const studySet = await this.geminiService.generateStudySet({
          apiKey: currentKey,
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
        const isQuotaError =
          lastError.includes('RESOURCE_EXHAUSTED') ||
          lastError.includes('quota') ||
          lastError.includes('429')
        if (
          isQuotaError &&
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
    await this.storage.writeQnaThreads(
      `${lectureId}.json`,
      JSON.stringify(threads, null, 2)
    )
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

  async generateQnaResponse(
    lectureId: string,
    thread: unknown,
    useFullContext: unknown
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      validateQnaThread(thread)
      if (typeof useFullContext !== 'boolean') {
        throw new Error('Opzione del contesto Q&A non valida.')
      }
      const settings = await this.getSettings()
      const keysToTry: string[] = []
      if (settings.apiKeys && settings.apiKeys.length > 0) {
        const startIdx =
          settings.activeKeyIndex >= 0 &&
          settings.activeKeyIndex < settings.apiKeys.length
            ? settings.activeKeyIndex
            : 0
        const keyCount = settings.autoRotateOnQuota ? settings.apiKeys.length : 1
        for (let i = 0; i < keyCount; i++) {
          const idx = (startIdx + i) % settings.apiKeys.length
          keysToTry.push(settings.apiKeys[idx])
        }
      } else if (settings.apiKey) {
        keysToTry.push(settings.apiKey)
      }

      if (keysToTry.length === 0) {
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

      const totalKeysCount =
        settings.apiKeys && settings.apiKeys.length > 0
          ? settings.apiKeys.length
          : 1
      let currentModel = settings.model
      let lastError: unknown = null

      logger.info(
        'qna',
        `Avvio richiesta QnA per lezione "${lecture?.title || lectureId}" con modello ${currentModel}`
      )

      for (let i = 0; i < keysToTry.length; i++) {
        const currentKey = keysToTry[i]
        const realKeyIdx = settings.apiKeys
          ? settings.apiKeys.indexOf(currentKey)
          : 0

        this.qnaStatusCallback?.({
          threadId: thread.id,
          phase: 'connecting',
          message: `Connessione a ${currentModel} (Chiave API #${realKeyIdx + 1}/${totalKeysCount})...`,
          model: currentModel,
          keyIndex: realKeyIdx,
          totalKeys: totalKeysCount
        })

        try {
          const stream = this.geminiService.generateQnaResponse({
            apiKey: currentKey,
            model: currentModel,
            courseCode: lecture?.courseCode || null,
            lectureTitle: lecture?.title || null,
            thread,
            fullLectureText,
            onRetry: (attempt, delayMs) => {
              logger.warn(
                'qna',
                `Server Google occupato, retry tentativo #${attempt} (${Math.round(delayMs / 1000)}s)`
              )
              this.qnaStatusCallback?.({
                threadId: thread.id,
                phase: 'connecting',
                message: `Server Google occupato, tentativo #${attempt} (${Math.round(delayMs / 1000)}s)...`,
                model: currentModel,
                keyIndex: realKeyIdx,
                totalKeys: totalKeysCount,
                attempt
              })
            }
          })

          let fullResponse = ''
          let firstChunkReceived = false

          for await (const chunk of stream) {
            if (!firstChunkReceived) {
              firstChunkReceived = true
              this.qnaStatusCallback?.({
                threadId: thread.id,
                phase: 'streaming',
                message: `⚡ Risposta in arrivo da ${currentModel}...`,
                model: currentModel,
                keyIndex: realKeyIdx,
                totalKeys: totalKeysCount
              })
            }
            fullResponse += chunk
            if (this.qnaStreamCallback) {
              this.qnaStreamCallback({ threadId: thread.id, chunk })
            }
          }

          if (
            settings.apiKeys.length > 1 &&
            settings.apiKeys.indexOf(currentKey) !== settings.activeKeyIndex
          ) {
            await this.settingsService.saveSettings({
              activeKeyIndex: settings.apiKeys.indexOf(currentKey)
            })
          }

          logger.info(
            'qna',
            `Risposta QnA completata con successo tramite ${currentModel}`
          )

          this.qnaStatusCallback?.({
            threadId: thread.id,
            phase: 'completed',
            message: `Risposta completata con ${currentModel}`,
            model: currentModel,
            keyIndex: realKeyIdx,
            totalKeys: totalKeysCount
          })

          return { success: true, text: fullResponse }
        } catch (err: unknown) {
          lastError = err
          const errMsg = errorMessage(err, String(err))
          const isQuota =
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('quota') ||
            errMsg.includes('rate limit')
          const is404 =
            errMsg.includes('404') ||
            errMsg.includes('not found') ||
            errMsg.includes('no longer available')
          const isTransient =
            errMsg.includes('500') ||
            errMsg.includes('502') ||
            errMsg.includes('503') ||
            errMsg.includes('504') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('Overloaded') ||
            errMsg.includes('high demand') ||
            errMsg.includes('fetch failed')

          if (is404 && currentModel !== 'gemini-2.5-flash') {
            const fallbackModel = 'gemini-2.5-flash'
            logger.warn(
              'qna',
              `Modello ${currentModel} non disponibile (404). Fallback automatico a ${fallbackModel}`
            )
            this.qnaStatusCallback?.({
              threadId: thread.id,
              phase: 'fallback_model',
              message: `Modello ${currentModel} non disponibile (404). Passaggio a ${fallbackModel}...`,
              model: fallbackModel,
              keyIndex: realKeyIdx,
              totalKeys: totalKeysCount
            })
            currentModel = fallbackModel
            i--
            continue
          }

          if (
            settings.autoRotateOnQuota &&
            (isQuota || isTransient) &&
            i < keysToTry.length - 1
          ) {
            const nextKey = keysToTry[i + 1]
            const nextRealIdx = settings.apiKeys
              ? settings.apiKeys.indexOf(nextKey)
              : 0
            const reasonLabel = isQuota
              ? 'Quota esaurita (429)'
              : 'Errore temporaneo'

            logger.warn(
              'qna',
              `Rotazione chiave API: ${reasonLabel} su Chiave #${realKeyIdx + 1}, passaggio a Chiave #${nextRealIdx + 1}/${totalKeysCount}`
            )

            this.qnaStatusCallback?.({
              threadId: thread.id,
              phase: 'rotating_key',
              message: `⚠️ ${reasonLabel} su Chiave #${realKeyIdx + 1}. Rotazione a Chiave #${nextRealIdx + 1}/${totalKeysCount}...`,
              model: currentModel,
              keyIndex: realKeyIdx,
              totalKeys: totalKeysCount
            })
            continue
          }
        }
      }

      const finalErrMsg =
        errorMessage(lastError, 'Errore imprevisto durante la generazione')
      logger.error(
        'qna',
        `Errore generazione QnA: ${finalErrMsg}`,
        errorStack(lastError) || String(lastError)
      )
      this.qnaStatusCallback?.({
        threadId: thread.id,
        phase: 'error',
        message: `Errore: ${finalErrMsg}`,
        model: currentModel
      })
      return { success: false, error: finalErrMsg }
    } catch (err: unknown) {
      const message = errorMessage(err, 'Errore imprevisto')
      logger.error(
        'qna',
        `Errore fatale QnA: ${message}`,
        errorStack(err)
      )
      console.error('QnA Generation Error:', err)
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
        sessions[existingIdx] = session
      } else {
        sessions.push(session)
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

  async getStudyAnalytics(): Promise<StudyAnalytics> {
    const sessions = await this.storage.readStudySessions()
    const todayStr = formatLocalCalendarDate()
    const totalsByDate = new Map<string, number>()
    const coursesByDate = new Map<string, Record<string, number>>()
    const courseTotals: Record<string, number> = {}
    let totalSemesterSeconds = 0
    for (const s of sessions) {
      const course = s.courseCode || 'Senza corso'
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

    return {
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
    return list.sort((a, b) => a.code.localeCompare(b.code))
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
      code,
      cfu,
      lectureHours,
      individualStudyHours,
      totalHours,
      schedule: Array.isArray(course.schedule) ? course.schedule : []
    }

    await this.settingsService.saveSettings({ courses })
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

    const settings = await this.settingsService.getSettings()
    const courses = { ...(settings.courses || {}) }
    if (courses[trimmed]) {
      delete courses[trimmed]
      await this.settingsService.saveSettings({ courses })
    }

    await this.storage.deleteCourseInfo(trimmed)

    if (!options || !options.keepLectures) {
      await this.repository.runExclusive(async () => {
        const library = await this.repository.readLibrary()
        let changed = false
        for (const l of library.lectures) {
          if (l.courseCode === trimmed) {
            l.courseCode = null
            changed = true
          }
        }
        if (changed) {
          await this.repository.writeLibrary(library)
        }
      })
    }
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
        await this.settingsService.saveSettings({ courses, courseConfigs })
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

    for (const course of Object.values(courses)) {
      if (!course || !course.code) continue

      // Verifica date di inizio e fine semestre
      if (course.startDate && dateIso < course.startDate) continue
      if (course.endDate && dateIso > course.endDate) continue

      if (!Array.isArray(course.schedule)) continue

      for (const slot of course.schedule) {
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

    return bestMatch
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
    return await this.storage.readScratchpad()
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
