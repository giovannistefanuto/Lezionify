import type { FocusPdfDocument } from './archive'
import type { QnaImageInput } from './qnaImages'

export type CourseSourceKind =
  'transcript' | 'notes' | 'course' | 'pdf' | 'document'
export interface CourseSource {
  id: string
  title: string
  kind: CourseSourceKind
  version: string
  status: 'ready' | 'partial' | 'error' | 'missing' | 'indexing'
  lectureId?: string
  pages?: number
  unreadablePages?: number[]
  issue?: string
}
export interface CoursePassage {
  id: string
  sourceId: string
  page?: number
  offset: number
  text: string
}
export interface CourseCitation {
  source: CourseSource
  passage: CoursePassage
}
export interface CourseCount {
  term: string
  occurrences: number
  lessons: number
  perLecture: { lectureId: string; title: string; occurrences: number }[]
  missingTranscripts: number
}
export interface CourseMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  citations?: CourseCitation[]
  requestedDocument?: string
  visualPages?: { sourceId: string; version: string; pages: number[] }
  trace?: { action: string; sourceIds: string[]; at: string; detail?: string }[]
}
export interface CourseThread {
  id: string
  title: string
  messages: CourseMessage[]
  draft: string
  updatedAt: string
}
export interface CourseRagState {
  course: string
  enabled: boolean
  folderName?: string
  sources: CourseSource[]
  threads: CourseThread[]
  syncing: boolean
  lastSync?: string
  issue?: string
}
export interface CourseRagEvent {
  course: string
  requestId?: string
  message: string
}
export interface CourseRagApi {
  getCourseRag: (course: string) => Promise<CourseRagState>
  linkCourseFolder: (course: string) => Promise<CourseRagState>
  setCourseFolderEnabled: (
    course: string,
    enabled: boolean
  ) => Promise<CourseRagState>
  syncCourseRag: (course: string) => Promise<CourseRagState>
  addCourseDocuments: (course: string) => Promise<CourseRagState>
  saveCourseThread: (course: string, thread: CourseThread) => Promise<void>
  deleteCourseThread: (course: string, threadId: string) => Promise<void>
  askCourse: (
    course: string,
    threadId: string,
    question: string,
    requestId: string,
    images?: QnaImageInput[],
    imageSourceId?: string,
    imageSourceVersion?: string
  ) => Promise<CourseThread>
  stopCourseAnswer: (course: string, requestId: string) => Promise<void>
  countCourseMentions: (course: string, term: string) => Promise<CourseCount>
  openCoursePdf: (
    course: string,
    sourceId: string
  ) => Promise<FocusPdfDocument & { sourceVersion: string }>
  onCourseRagEvent: (callback: (event: CourseRagEvent) => void) => () => void
}

export type CourseAction =
  | { action: 'answer'; text: string; passageIds: string[] }
  | { action: 'search_course'; query: string }
  | {
      action: 'get_passage'
      passageId?: string
      sourceId?: string
      page?: number
    }
  | { action: 'count_mentions'; term: string }
  | { action: 'request_document'; description: string }

export function parseCourseAction(text: string): CourseAction {
  const value = JSON.parse(
    text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')
  ) as Record<string, unknown>
  const string = (key: string, max = 1000) =>
    typeof value[key] === 'string' &&
    !!(value[key] as string).trim() &&
    (value[key] as string).length <= max
  if (
    value.action === 'answer' &&
    string('text', 60_000) &&
    Array.isArray(value.passageIds) &&
    value.passageIds.length <= 30 &&
    value.passageIds.every((id) => typeof id === 'string' && id.length <= 180)
  )
    return value as unknown as CourseAction
  if (value.action === 'search_course' && string('query'))
    return value as unknown as CourseAction
  if (
    value.action === 'get_passage' &&
    (string('passageId', 180) || string('sourceId', 160)) &&
    (value.page === undefined ||
      (Number.isInteger(value.page) &&
        Number(value.page) >= 1 &&
        Number(value.page) <= 2000))
  )
    return value as unknown as CourseAction
  if (value.action === 'count_mentions' && string('term', 160))
    return value as unknown as CourseAction
  if (value.action === 'request_document' && string('description', 2000))
    return value as unknown as CourseAction
  throw new Error(
    'Il modello ha restituito una richiesta non valida. Riprova la domanda.'
  )
}
