import type { FocusPdfDocument } from './archive'
import type { QnaImageInput } from './qnaImages'
import type { CourseGroundingReview } from './courseGrounding'

export type CourseSourceKind =
  'transcript' | 'notes' | 'course' | 'pdf' | 'document'
export interface CourseSource {
  id: string
  title: string
  kind: CourseSourceKind
  version: string
  status: 'ready' | 'partial' | 'error' | 'missing' | 'indexing'
  lectureId?: string
  /** Stable or explicitly official theory-lecture number; see numbering. Legacy sources may be chronological. */
  lectureOrdinal?: number
  chronologicalOrdinal?: number
  numbering?: 'stable' | 'official'
  recordedDate?: string
  pages?: number
  unreadablePages?: number[]
  issue?: string
  provenance?: 'original' | 'ai-derived' | 'metadata'
  derivedFrom?: string[]
}
export interface CoursePassage {
  id: string
  sourceId: string
  page?: number
  offset: number
  text: string
  section?: string
  sectionOffset?: number
  structuralBlock?: { kind: 'code' | 'math'; start: number; end: number }
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
  evidence?: CourseEvidenceCoverage
  grounding?: CourseGroundingReview
}
export interface CourseEvidenceCoverage {
  requestedLessons: number[]
  retrievedLessons: number[]
  missingLessons: number[]
  citedLessons: number[]
  originalSources: number
  derivedSources: number
  independentGroups: number
  passages: number
  characters: number
  semantic?: 'local' | 'unavailable'
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
  missingTranscripts?: number
  threads: CourseThread[]
  syncing: boolean
  lastSync?: string
  issue?: string
  semantic?: { status: 'missing' | 'loading' | 'ready' | 'error'; issue?: string }
  indexing?: CourseIndexJob
  storage?: { modelBytes: number; vectorBytes: number; corpusBytes: number; revisions: number }
}
export interface CourseIndexJob {
  status: 'running' | 'paused' | 'cancelled' | 'complete' | 'error' | 'stale'
  revision: string
  completed: number
  total: number
  sources: { sourceId: string; completed: number; total: number }[]
  updatedAt: string
  issue?: string
}
export interface CourseRagEvent {
  course: string
  requestId?: string
  message: string
}
export interface CourseRagApi {
  getCourseRag: (course: string) => Promise<CourseRagState>
  prepareCourseSemantic: (course: string) => Promise<CourseRagState>
  manageCourseIndex: (course: string, action: 'start' | 'cancel' | 'clear-vectors' | 'storage' | 'clean-revisions') => Promise<CourseRagState>
  setCourseLectureNumber: (course: string, lectureId: string, number: number) => Promise<CourseRagState>
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
  let value: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    value = parsed as Record<string, unknown>
  } catch {
    throw new Error('Il modello ha restituito una risposta JSON incompleta o non valida. Riprova la domanda.')
  }
  const string = (key: string, max = 1000) =>
    typeof value[key] === 'string' &&
    !!(value[key] as string).trim() &&
    (value[key] as string).length <= max
  // Invisible control bytes have appeared in model-generated citation markers.
  const readableAnswer = typeof value.text !== 'string' || ![...value.text].some(char => (char.charCodeAt(0) < 32 && !'\n\r\t'.includes(char)) || char.charCodeAt(0) === 127)
  if (
    value.action === 'answer' &&
    readableAnswer &&
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


/** Explicit lesson references only; unrelated numbers (formulas, pages) are not lesson IDs. */
export function referencedLectureOrdinals(question: string): number[] {
  const found = new Set<number>()
  for (const match of question.matchAll(/(?:lezion[ei]|lectures?)\s*(?:n(?:umero)?\.?\s*)?(\d+(?:\s*(?:,|e|ed|and|[-–])\s*\d+)*)/gi)) {
    const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(match[1])
    if (range && Number(range[2]) >= Number(range[1]) && Number(range[2]) - Number(range[1]) < 6) {
      for (let n = Number(range[1]); n <= Number(range[2]) && found.size < 6; n++) if (n > 0 && n <= 1000) found.add(n)
      continue
    }
    for (const token of match[1].match(/\d+/g) ?? []) {
      const n = Number(token)
      if (n > 0 && n <= 1000 && found.size < 6) found.add(n)
    }
  }
  return [...found]
}
