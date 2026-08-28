export type LectureStatus = 'audio-only' | 'transcript-available'
export type StudyStatus = 'da-studiare' | 'in-corso' | 'completata'

export interface Lecture {
  id: string
  courseCode: string | null
  recordedAt: string | null
  sourceAudioFileName: string
  sourceTranscriptFileName: string | null
  audioFileName: string
  transcriptFileName: string | null
  markdownFileName: string | null
  byteSize: number
  checksum: string
  importedAt: string
  status: LectureStatus
  studyStatus: StudyStatus
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
  courseCode?: string | null
  recordedAt?: string | null
  studyStatus?: StudyStatus
}

export interface ArchiveApi {
  listLectures: () => Promise<Lecture[]>
  importFiles: () => Promise<ImportSummary | null>
  importFolder: () => Promise<ImportSummary | null>
  readTranscript: (lectureId: string) => Promise<string | null>
  attachTranscript: (lectureId: string) => Promise<Lecture | null>
  readMarkdown: (lectureId: string) => Promise<string | null>
  saveMarkdown: (lectureId: string, content: string) => Promise<void>
  updateLecture: (lectureId: string, updates: UpdateLecturePayload) => Promise<Lecture>
  deleteLecture: (lectureId: string) => Promise<boolean>
  getAudioUrl: (lectureId: string) => Promise<string | null>
  searchFullText: (query: string) => Promise<string[]>
}
