import type { CourseRagApi } from './courseRag'
import type { SectionRevisionApi } from './sectionRevision'
import type { RepetitionApi } from './repetition'
import type { DictionaryDirection, DictionaryLookupDirection, DictionaryResult } from './dictionary'
import type { PdfExportDocument, PdfExportRequest, PdfExportResult } from './pdfExport'

export type LectureStatus = 'audio-only' | 'transcript-available'
export type StudyStatus = 'da-studiare' | 'in-corso' | 'completata'
export type GeminiModel =
  | 'gemini-3.8-flash'
  | 'gemini-3.7-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.5-flash'
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite'

export interface Lecture {
  markdownEnNeedsUpdate?: boolean
  id: string
  isLaboratory?: boolean
  laboratorySource?: 'schedule'
  title?: string | null
  titleOverrides?: LectureTitleUpdates
  courseCode: string | null
  recordedAt: string | null
  sourceAudioFileName: string
  sourceTranscriptFileName: string | null
  audioFileName: string
  missingAudio?: boolean
  transcriptFileName: string | null
  markdownFileName: string | null
  markdownEnFileName: string | null
  byteSize: number
  durationSeconds?: number
  checksum: string
  importedAt: string
  status: LectureStatus
  studyStatus: StudyStatus
  videoImport?: {
    sources: Array<{ name: string; checksum: string; durationSeconds: number }>
    scheduledEndTime: string
  }
}

export function getLectureDurationSeconds(lecture: Lecture): number {
  return typeof lecture.durationSeconds === 'number' &&
    Number.isFinite(lecture.durationSeconds) &&
    lecture.durationSeconds >= 0
    ? lecture.durationSeconds
    : 0
}

export interface SkippedImport {
  sourceFileName: string
  reason: string
}

export interface ImportSummary {
  imported: Lecture[]
  skipped: SkippedImport[]
}

export interface VideoImportSelection {
  sessionId: string
  files: Array<{ id: string; name: string; byteSize: number }>
}

export interface VideoImportProgress {
  sessionId: string
  message: string
  percent: number
}

export interface VideoImportReady {
  durationSeconds: number
  byteSize: number
}

export interface VideoImportDestination {
  courseCode: string
  date: string
  startTime: string
  endTime: string
  title: string
}

export interface UpdateLecturePayload {
  isLaboratory?: boolean
  title?: string | null
  courseCode?: string | null
  recordedAt?: string | null
  studyStatus?: StudyStatus
}

export type LectureTitleUpdates = Partial<Record<'it' | 'en', string>>

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 0 // 1 = Lun, 2 = Mar, 3 = Mer, 4 = Gio, 5 = Ven, 6 = Sab, 0 = Dom

export interface CourseTimeSlot {
  id: string
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm", es. "10:30"
  endTime: string // "HH:mm", es. "12:30"
  room?: string // es. "Aula Magna", "Lab 2"
}

export interface CourseDefinition {
  /** Explicit choice for new courses; legacy courses retain their prior publication behavior. */
  publishToGithub?: boolean
  code: string // Identificativo/Sigla univoca (es. "Sistemi Distribuiti")
  name?: string // Nome esteso (opzionale)
  cfu: number // Crediti Formativi Universitari (es. 6, 9, 12)
  lectureHours: number // Ore aula frontali: CFU * 7 (es. 42h per 6 CFU)
  individualStudyHours: number // Ore studio individuale: CFU * 18 (es. 108h per 6 CFU)
  totalHours: number // Ore complessive: CFU * 25 (es. 150h per 6 CFU)
  color?: string // Colore badge / tema (es. "#10b981")
  startDate: string // YYYY-MM-DD (Inizio periodo lezioni del corso)
  endDate: string // YYYY-MM-DD (Fine periodo lezioni del corso)
  examDate?: string // YYYY-MM-DD (Data appello esame)
  schedule: CourseTimeSlot[] // Slot orari settimanali
  language?: 'it' | 'en' | 'auto' // Lingua prevalente delle lezioni
  laboratorySchedule?: {
    daysOfWeek?: DayOfWeek[]
    dates?: Array<{
      date: string // YYYY-MM-DD, appuntamento singolo
      startTime: string
      endTime: string
      title?: string
      room?: string
    }>
  }
}

export interface CourseScheduleMatch {
  isLaboratory?: boolean
  lectureId: string
  lectureTitle: string
  recordedAt: string
  durationMinutes: number
  matchedCourseCode: string
  slot: CourseTimeSlot
  confidencePercentage: number
  reason: string
}

export interface CourseConfig {
  examDate?: string
  expectedHours?: number
}

export interface AppSettings {
  apiKey: string
  apiKeys: string[]
  /**
   * Gruppo di quota associato a ciascuna API key. Chiavi dello stesso progetto
   * Google devono usare lo stesso gruppo, perché RPM e quote giornaliere sono
   * condivisi dal progetto e non dalla singola chiave.
   */
  apiKeyQuotaGroups?: string[]
  activeKeyIndex: number
  autoRotateOnQuota: boolean
  model: GeminiModel
  courses?: Record<string, CourseDefinition>
  /** One-time snapshot: only these unconfigured legacy courses may publish without a new choice. */
  legacyPublishingCourseCodes?: string[]
  /** Corsi esclusi dalle liste attive; assente nelle impostazioni precedenti. */
  archivedCourseCodes?: string[]
  courseConfigs?: Record<string, CourseConfig>
  lastSemesterReminderDismissed?: string // YYYY-MM-DD
  autoProcessOnImport?: boolean
  publishing?: PublishingSettings
}

/** Token accepted on writes only; settings returned over IPC always omit it. */
export interface PublishingSettings {
  enabled: boolean
  repoUrl: string
  githubToken?: string
  branch: string
  autoPublishOnStartup: boolean
}

export interface PublishResult {
  published: number
  skipped: number
  errors: string[]
  commitHash?: string
}

export interface PublishingStatus {
  configured: boolean
  enabled: boolean
  unpublishedCount: number
  lastPublishAt: string | null
  lastError: string | null
  phase?: 'idle' | 'checking' | 'publishing' | 'synced' | 'error'
  connection?: 'unknown' | 'online' | 'offline'
  lastCheckedAt?: string | null
}

export interface QnaMessage {
  attachmentIds?: string[]
  role: 'user' | 'ai'
  text: string
  timestamp: string
}

export interface QnaThread {
  attachmentIds?: string[]
  id: string
  quote: string
  anchorString?: string
  contextHeading: string | null
  messages: QnaMessage[]
  createdAt: string
  updatedAt: string
}

export interface QnaStatusUpdate {
  threadId: string
  phase:
    | 'connecting'
    | 'rotating_key'
    | 'fallback_model'
    | 'streaming'
    | 'completed'
    | 'error'
  message: string
  model: string
  keyIndex?: number
  totalKeys?: number
  attempt?: number
}

export interface TestApiKeyResult {
  valid: boolean
  keyValid?: boolean
  modelAvailable?: boolean
  error?: string
}

export interface GenerationResult {
  failureKind?: PipelineFailureKind
  success: boolean
  markdown?: string
  error?: string
}

export interface BatchGenerationSummary {
  total: number
  succeeded: number
  failed: number
  results: {
    id: string
    courseCode: string | null
    success: boolean
    error?: string
  }[]
}

export interface TranscribeAudioResult {
  failureKind?: PipelineFailureKind
  success: boolean
  transcript?: string
  markdown?: string
  error?: string
}

export interface BatchTranslationSummary {
  total: number
  succeeded: number
  failed: number
  results: {
    id: string
    courseCode: string | null
    title?: string
    success: boolean
    error?: string
  }[]
}

/**
 * Stato persistente dell'elaborazione completa dell'archivio. Le attività
 * sono deliberate e tracciabili: non contengono mai chiavi API o contenuti
 * delle lezioni.
 */
export type ArchivePipelineStage = 'transcription' | 'notes' | 'translation'

export type ArchivePipelineTaskStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked'
  | 'skipped'

export type ArchivePipelineRunStatus =
  | 'idle'
  | 'planning'
  | 'running'
  | 'paused'
  | 'completed'
  | 'completed_with_errors'
  | 'stopped'

export type PipelineFailureKind =
  | 'input'
  | 'not_found'
  | 'source_changed'
  | 'authentication'
  | 'quota_exhausted'
  | 'rate_limited'
  | 'network'
  | 'provider_unavailable'
  | 'cancelled'
  | 'unknown'

export interface ArchivePipelineTask {
  lectureId: string
  stage: ArchivePipelineStage
  status: ArchivePipelineTaskStatus
  title: string
  courseCode: string | null
  startedAt?: string
  completedAt?: string
  error?: string
  failureKind?: PipelineFailureKind
}

export interface ArchivePipelineStageSummary {
  total: number
  pending: number
  running: number
  succeeded: number
  failed: number
  blocked: number
  skipped: number
}

export interface ArchivePipelineStatus {
  queuedImportLectureIds?: string[]
  version: 1
  runId: string | null
  trigger: 'manual' | 'import' | null
  status: ArchivePipelineRunStatus
  activeStage: ArchivePipelineStage | null
  currentLectureId: string | null
  currentLectureTitle: string | null
  message: string
  startedAt: string | null
  updatedAt: string
  completedAt: string | null
  stopRequested: boolean
  includeTranslation: boolean
  tasks: ArchivePipelineTask[]
  stageSummaries: Record<ArchivePipelineStage, ArchivePipelineStageSummary>
}

export interface ArchivePipelineStartResult {
  started: boolean
  status: ArchivePipelineStatus
}

export interface CourseStats {
  courseCode: string
  totalLectures: number
  completedLectures: number
  inProgressLectures: number
  toStudyLectures: number
  totalAudioSeconds: number
  pipelineStatus: {
    audioOnly: number
    transcriptAvailable: number
    markdownReady: number
  }
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
  keyConcept: string
}

export interface Flashcard {
  id: string
  front: string
  back: string
  category?: string
}

export interface LectureStudySet {
  lectureId: string
  generatedAt: string
  questions: QuizQuestion[]
  flashcards: Flashcard[]
}

export interface GenerateStudySetResult {
  success: boolean
  studySet?: LectureStudySet
  error?: string
}

export interface GenerationProgress {
  jobId: string
  lectureId: string
  phase:
    | 'transcribing'
    | 'segmenting'
    | 'sections'
    | 'assembling'
    | 'logistics'
    | 'completed'
    | 'error'
  message: string
  percent: number
  totalChunks?: number
  currentChunk?: number
  chunkTimeInterval?: string
  etaSeconds?: number
  elapsedSeconds?: number
  stageDetail?: string
  attempt?: number
  quotaGroupIndex?: number
  delayMs?: number
}

export type StudySessionMode =
  'focus' | 'reading' | 'quiz' | 'flashcard' | 'qna' | 'manual'

export interface StudySession {
  corrections?: Array<{ seconds: number; createdAt: string }>
  id: string
  lectureId: string | null
  courseCode: string | null
  startTime: string
  endTime: string
  durationSeconds: number
  mode: StudySessionMode
  date: string // YYYY-MM-DD
}

export interface DailyStudySummary {
  date: string // YYYY-MM-DD
  dayLabel: string // es. "Lun 29", "Mar 30"
  totalSeconds: number
  byCourse: Record<string, number>
}

export interface CourseStudyBreakdown {
  courseCode: string
  totalSeconds: number
  percentage: number
}

export interface StudyAnalytics {
  courseLectureAverages: Array<{
    courseCode: string
    timedCompletedLectures: number
    averageStudySeconds: number | null
  }>
  todaySeconds: number
  todayByCourse: Record<string, number>
  weekDays: DailyStudySummary[]
  weekAvgDailySeconds: number
  monthAvgDailySeconds: number
  totalSemesterSeconds: number
  currentStreakDays: number
  courseBreakdown: CourseStudyBreakdown[]
}

export interface ScratchpadGroup {
  id: string
  name: string
  shortcut: string
  notes: string
}

export interface ScratchpadTodoItem {
  groupId?: string
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface ScratchpadData {
  groups?: ScratchpadGroup[]
  selectedGroupId?: string
  todos: ScratchpadTodoItem[]
  notes: string
  updatedAt: string
}

export type ReminderKind = 'timer' | 'alarm'
export type ReminderStatus = 'active' | 'paused' | 'completed' | 'stopped'

/** Promemoria locale, senza suono e senza notifiche di sistema. */
export interface Reminder {
  id: string
  kind: ReminderKind
  label: string
  createdAt: string
  status: ReminderStatus
  /** Istante assoluto per timer in corso e sveglie attive. */
  dueAt?: string
  /** Durata iniziale del timer, necessaria per il reset. */
  durationSeconds?: number
  /** Tempo residuo quando un timer è in pausa. */
  remainingSeconds?: number
  completedAt?: string
}

export interface LectureHighlight {
  style?: 'highlight' | 'underline'
  id: string
  startOffset: number
  endOffset: number
  text: string
  color?: string
  createdAt: string
}

export type LogLevel = 'info' | 'warn' | 'error'

export interface AppLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: string
  message: string
  details?: string
}

export interface UsbRecorderAudioFile {
  name: string
  fullPath: string
  byteSize: number
  mtime: string
  durationSeconds: number
  checksum: string
  alreadyImported: boolean
  existingLectureId?: string
  recordedAt: string | null
  suggestedCourseCode: string | null
  matchConfidence: number
  matchReason: string
  criteria: {
    isDurationValid: boolean // >= 30 min (o durata considerata idonea a una lezione)
    durationMinutes: number
    hasScheduleMatch: boolean
    isDuplicate: boolean
  }
  defaultAction: 'import' | 'discard'
}

export interface UsbRecorderInfo {
  detected: boolean
  driveLetter?: string
  recordPath?: string
  volumeName?: string
  freeSpaceBytes?: number
  totalSpaceBytes?: number
  files: UsbRecorderAudioFile[]
}

export interface UsbImportItemSelection {
  fullPath: string
  action: 'import' | 'discard'
  courseCode: string | null
  title?: string | null
  recordedAt?: string | null
}

export interface UsbImportResult {
  importedCount: number
  skippedCount: number
  importedLectures: Lecture[]
  importedFilePaths: string[]
}

export interface UsbDeleteFilesResult {
  deletedCount: number
  failedCount: number
  errors: string[]
}


export interface FocusPdfDocument {
  id: string
  name: string
  url: string
}

export interface ArchiveApi extends CourseRagApi, RepetitionApi, SectionRevisionApi {
  languageShortcutDiagnosticsEnabled?: boolean
  exportNotesPdf: (request: PdfExportRequest) => Promise<PdfExportResult>
  getPdfExportDocument: (token: string) => Promise<PdfExportDocument>
  pdfExportReady: (token: string, failed: boolean) => Promise<void>
  getFocusPdf: (lectureId: string) => Promise<FocusPdfDocument | null>
  selectFocusPdf: (lectureId: string) => Promise<FocusPdfDocument | null>
  releaseFocusPdf: (id: string) => Promise<void>
  listLectures: () => Promise<Lecture[]>
  getLectureWordCounts: (lectureId: string) => Promise<Record<string, number | null>>
  lookupDictionary: (query: string, direction: DictionaryLookupDirection) => Promise<DictionaryResult>
  offlineTranslationStatus: () => Promise<import('./offlineTranslation').OfflineTranslationStatus>
  ambientSoundStatus: () => Promise<import('./ambientSounds').AmbientSoundStatus>
  installAmbientSounds: (soundIds?: string[]) => Promise<import('./ambientSounds').AmbientSoundStatus>
  readAmbientSound: (id: string) => Promise<Uint8Array>
  openCompilation: (videoId: string, start: number) => Promise<void>
  spotifyConnection: () => Promise<import('./spotify').SpotifyConnection>
  configureSpotify: (clientId: string) => Promise<import('./spotify').SpotifyConnection>
  connectSpotify: () => Promise<import('./spotify').SpotifyConnection>
  disconnectSpotify: () => Promise<import('./spotify').SpotifyConnection>
  spotifyDevices: () => Promise<import('./spotify').SpotifyDevice[]>
  spotifyPlayback: () => Promise<import('./spotify').SpotifyPlayback | null>
  spotifyCommand: (command: import('./spotify').SpotifyCommand, deviceId: string, argument?: number) => Promise<void>
  connectSpotifyLibrary: () => Promise<import('./spotify').SpotifyConnection>
  selectSpotifyDevice: (deviceId: string) => Promise<import('./spotify').SpotifyConnection>
  spotifyLibrary: (kind: import('./spotify').SpotifyLibraryKind, offset?: number) => Promise<import('./spotify').SpotifyLibraryPage>
  playSpotifyItem: (uri: string, deviceId: string) => Promise<void>
  openSpotifyItem: (uri: string) => Promise<void>
  openSpotify: () => Promise<void>
  installOfflineTranslation: () => Promise<import('./offlineTranslation').OfflineTranslationStatus>
  translatePhrase: (text: string, direction: DictionaryDirection) => Promise<import('./offlineTranslation').OfflineTranslationResult>
  importFiles: () => Promise<ImportSummary | null>
  importFolder: () => Promise<ImportSummary | null>
  selectVideos: () => Promise<VideoImportSelection | null>
  convertVideos: (sessionId: string, orderedIds: string[]) => Promise<VideoImportReady>
  saveVideoImport: (sessionId: string, destination: VideoImportDestination) => Promise<Lecture>
  cancelVideoImport: (sessionId: string) => Promise<void>
  onVideoImportProgress: (callback: (progress: VideoImportProgress) => void) => () => void
  readTranscript: (lectureId: string) => Promise<string | null>
  attachTranscript: (lectureId: string) => Promise<Lecture | null>
  readMarkdown: (lectureId: string) => Promise<string | null>
  saveMarkdown: (lectureId: string, content: string) => Promise<void>
  renameLectureTitles: (lectureId: string, titles: LectureTitleUpdates) => Promise<Lecture>
  updateLecture: (
    lectureId: string,
    updates: UpdateLecturePayload
  ) => Promise<Lecture>
  deleteLecture: (lectureId: string) => Promise<boolean>
  searchFullText: (query: string) => Promise<string[]>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  testApiKey: (apiKey: string) => Promise<TestApiKeyResult>
  generateLectureNotes: (lectureId: string, jobId?: string) => Promise<GenerationResult>
  generateSelectedNotes: (
    lectureIds: string[],
    jobId?: string
  ) => Promise<BatchGenerationSummary>
  transcribeAudio: (lectureId: string, jobId?: string) => Promise<TranscribeAudioResult>
  readMarkdownEn: (lectureId: string) => Promise<string | null>
  translateLectureNotes: (lectureId: string, jobId?: string) => Promise<GenerationResult>
  translateSelectedNotes: (
    lectureIds: string[],
    jobId?: string
  ) => Promise<BatchTranslationSummary>
  getTranslationCandidates: () => Promise<Lecture[]>
  getArchivePipelineStatus: () => Promise<ArchivePipelineStatus>
  startArchivePipeline: () => Promise<ArchivePipelineStartResult>
  resumeArchivePipeline: () => Promise<ArchivePipelineStartResult>
  requestArchivePipelineStop: () => Promise<ArchivePipelineStatus>
  printLectureNotes: () => Promise<void>
  scanAndSyncLibrary: () => Promise<Lecture[]>
  openLibraryFolder: () => Promise<{
    success: boolean
    path: string
    error?: string
  }>
  getCourseStats: () => Promise<CourseStats[]>
  readCourseInfo: (courseCode: string) => Promise<string | null>
  readStudySet: (lectureId: string) => Promise<LectureStudySet | null>
  generateStudySet: (lectureId: string) => Promise<GenerateStudySetResult>
  loadQnaThreads: (lectureId: string) => Promise<QnaThread[]>
  saveQnaThreads: (lectureId: string, threads: QnaThread[]) => Promise<void>
  saveQnaImage: (lectureId: string, threadId: string, input: import('./qnaImages').QnaImageInput) => Promise<import('./qnaImages').QnaImage>
  listQnaImages: () => Promise<import('./qnaImages').QnaImage[]>
  readQnaImage: (id: string) => Promise<{ image: import('./qnaImages').QnaImage; data: string }>
  deleteQnaImages: (selection: import('./qnaImages').QnaImageDeletion) => Promise<number>
  generateQnaResponse: (
    lectureId: string,
    thread: QnaThread,
    useFullContext: boolean,
    includeOtherQna?: boolean,
    responseLength?: 'brief' | 'medium' | 'long',
    searchOnline?: boolean
  ) => Promise<{ success: boolean; text?: string; error?: string }>
  saveStudySession: (session: StudySession) => Promise<void>
  getLectureStudySeconds: (lectureId: string, excludedSessionId: string) => Promise<number>
  getStudyAnalytics: () => Promise<StudyAnalytics>
  getStudyTimeRemovalTargets: () => Promise<import('./studyCorrections').StudyTimeRemovalTarget[]>
  removeStudyTime: (targetId: string, minutes: number) => Promise<void>
  addManualStudyTime: (
    courseCode: string,
    minutes: number,
    date?: string
  ) => Promise<void>
  getCourses: () => Promise<CourseDefinition[]>
  getArchivedCourseCodes: () => Promise<string[]>
  setCourseArchived: (code: string, archived: boolean) => Promise<string[]>
  saveCourse: (course: CourseDefinition, oldCode?: string) => Promise<void>
  deleteCourse: (
    code: string,
    options?: { keepLectures?: boolean }
  ) => Promise<void>
  matchLectureToCourse: (
    recordedAt: string,
    durationSeconds: number
  ) => Promise<CourseScheduleMatch | null>
  autoAssignCoursesBySchedule: (
    lectureIds?: string[],
    minConfidence?: number
  ) => Promise<{ assigned: CourseScheduleMatch[]; skippedCount: number }>
  detectUsbRecorder: () => Promise<UsbRecorderInfo>
  importUsbRecorderFiles: (
    items: UsbImportItemSelection[]
  ) => Promise<UsbImportResult>
  deleteUsbRecorderFiles: (filePaths: string[]) => Promise<UsbDeleteFilesResult>
  getScratchpad: () => Promise<ScratchpadData>
  saveScratchpad: (data: ScratchpadData) => Promise<void>
  getReminders: () => Promise<Reminder[]>
  saveReminders: (reminders: Reminder[]) => Promise<void>
  getHighlights: (lectureId: string) => Promise<LectureHighlight[]>
  saveHighlights: (
    lectureId: string,
    highlights: LectureHighlight[]
  ) => Promise<void>
  getBatteryStatus: () => Promise<import('./battery').BatteryStatus>
  getAppLogs: () => Promise<AppLogEntry[]>
  getAppLogDay: (day?: string) => Promise<import('./appLogs').AppLogDay>
  clearAppLogs: () => Promise<void>
  logClientMessage: (
    level: LogLevel,
    source: string,
    message: string,
    details?: string
  ) => Promise<void>
  onGenerationProgress: (
    callback: (progress: GenerationProgress) => void
  ) => () => void
  onArchivePipelineProgress: (
    callback: (status: ArchivePipelineStatus) => void
  ) => () => void
  onQnaChunk: (
    callback: (data: { threadId: string; chunk: string }) => void
  ) => () => void
  onQnaStatus: (callback: (data: QnaStatusUpdate) => void) => () => void
  publishLectures: () => Promise<PublishResult>
  getPublishingStatus: () => Promise<PublishingStatus>
}

/**
 * Trova la prossima lezione in ordine cronologico appartenente allo stesso corso/materia.
 * Se non vi sono ulteriori lezioni del corso, restituisce null.
 */
export function findNextChronologicalLecture(
  currentLecture: Lecture,
  allLectures: Lecture[]
): Lecture | null {
  if (
    !currentLecture ||
    !Array.isArray(allLectures) ||
    allLectures.length === 0
  )
    return null

  const targetCourse = currentLecture.courseCode ?? null
  const courseLectures = allLectures
    .filter((l) => (l.courseCode ?? null) === targetCourse)
    .sort((a, b) => {
      const dateA = a.recordedAt ?? a.importedAt
      const dateB = b.recordedAt ?? b.importedAt
      return dateA.localeCompare(dateB)
    })

  const currentIndex = courseLectures.findIndex(
    (l) => l.id === currentLecture.id
  )
  if (currentIndex === -1 || currentIndex >= courseLectures.length - 1) {
    return null
  }

  return courseLectures[currentIndex + 1]
}
