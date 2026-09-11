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
  id: string
  title?: string | null
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

export interface UpdateLecturePayload {
  title?: string | null
  courseCode?: string | null
  recordedAt?: string | null
  studyStatus?: StudyStatus
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 0 // 1 = Lun, 2 = Mar, 3 = Mer, 4 = Gio, 5 = Ven, 6 = Sab, 0 = Dom

export interface CourseTimeSlot {
  id: string
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm", es. "10:30"
  endTime: string // "HH:mm", es. "12:30"
  room?: string // es. "Aula Magna", "Lab 2"
}

export interface CourseDefinition {
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
}

export interface CourseScheduleMatch {
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
  activeKeyIndex: number
  autoRotateOnQuota: boolean
  model: GeminiModel
  courses?: Record<string, CourseDefinition>
  courseConfigs?: Record<string, CourseConfig>
  lastSemesterReminderDismissed?: string // YYYY-MM-DD
}

export interface QnaMessage {
  role: 'user' | 'ai'
  text: string
  timestamp: string
}

export interface QnaThread {
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
    success: boolean
    error?: string
  }[]
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
    | 'segmenting'
    | 'sections'
    | 'assembling'
    | 'logistics'
    | 'completed'
    | 'error'
  message: string
  percent: number
}

export type StudySessionMode =
  'focus' | 'reading' | 'quiz' | 'flashcard' | 'qna' | 'manual'

export interface StudySession {
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
  todaySeconds: number
  todayByCourse: Record<string, number>
  weekDays: DailyStudySummary[]
  weekAvgDailySeconds: number
  monthAvgDailySeconds: number
  totalSemesterSeconds: number
  currentStreakDays: number
  courseBreakdown: CourseStudyBreakdown[]
}

export interface ScratchpadTodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface ScratchpadData {
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

export interface ArchiveApi {
  listLectures: () => Promise<Lecture[]>
  importFiles: () => Promise<ImportSummary | null>
  importFolder: () => Promise<ImportSummary | null>
  readTranscript: (lectureId: string) => Promise<string | null>
  attachTranscript: (lectureId: string) => Promise<Lecture | null>
  readMarkdown: (lectureId: string) => Promise<string | null>
  saveMarkdown: (lectureId: string, content: string) => Promise<void>
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
  generateQnaResponse: (
    lectureId: string,
    thread: QnaThread,
    useFullContext: boolean
  ) => Promise<{ success: boolean; text?: string; error?: string }>
  saveStudySession: (session: StudySession) => Promise<void>
  getStudyAnalytics: () => Promise<StudyAnalytics>
  addManualStudyTime: (
    courseCode: string,
    minutes: number,
    date?: string
  ) => Promise<void>
  getCourses: () => Promise<CourseDefinition[]>
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
  getScratchpad: () => Promise<ScratchpadData>
  saveScratchpad: (data: ScratchpadData) => Promise<void>
  getReminders: () => Promise<Reminder[]>
  saveReminders: (reminders: Reminder[]) => Promise<void>
  getHighlights: (lectureId: string) => Promise<LectureHighlight[]>
  saveHighlights: (
    lectureId: string,
    highlights: LectureHighlight[]
  ) => Promise<void>
  getAppLogs: () => Promise<AppLogEntry[]>
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
  onQnaChunk: (
    callback: (data: { threadId: string; chunk: string }) => void
  ) => () => void
  onQnaStatus: (callback: (data: QnaStatusUpdate) => void) => () => void
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
