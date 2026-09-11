import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ArchiveApi,
  GenerationProgress,
  QnaStatusUpdate,
  QnaThread,
  StudySession,
  UpdateLecturePayload
} from '../../shared/archive'

const archiveApi: ArchiveApi = {
  listLectures: () => ipcRenderer.invoke('archive:list'),
  importFiles: () => ipcRenderer.invoke('archive:import-files'),
  importFolder: () => ipcRenderer.invoke('archive:import-folder'),
  readTranscript: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-transcript', lectureId),
  attachTranscript: (lectureId: string) =>
    ipcRenderer.invoke('archive:attach-transcript', lectureId),
  readMarkdown: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-markdown', lectureId),
  saveMarkdown: (lectureId: string, content: string) =>
    ipcRenderer.invoke('archive:save-markdown', lectureId, content),
  updateLecture: (lectureId: string, updates: UpdateLecturePayload) =>
    ipcRenderer.invoke('archive:update-lecture', lectureId, updates),
  deleteLecture: (lectureId: string) =>
    ipcRenderer.invoke('archive:delete-lecture', lectureId),
  searchFullText: (query: string) =>
    ipcRenderer.invoke('archive:search-fulltext', query),
  getSettings: () => ipcRenderer.invoke('archive:get-settings'),
  saveSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('archive:save-settings', settings),
  testApiKey: (apiKey: string) =>
    ipcRenderer.invoke('archive:test-api-key', apiKey),
  generateLectureNotes: (lectureId: string, jobId?: string) =>
    ipcRenderer.invoke('archive:generate-lecture-notes', lectureId, jobId),
  generateSelectedNotes: (lectureIds: string[], jobId?: string) =>
    ipcRenderer.invoke('archive:generate-selected', lectureIds, jobId),
  transcribeAudio: (lectureId: string, jobId?: string) =>
    ipcRenderer.invoke('archive:transcribe-audio', lectureId, jobId),
  readMarkdownEn: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-markdown-en', lectureId),
  translateLectureNotes: (lectureId: string, jobId?: string) =>
    ipcRenderer.invoke('archive:translate-lecture-notes', lectureId, jobId),
  translateSelectedNotes: (lectureIds: string[], jobId?: string) =>
    ipcRenderer.invoke('archive:translate-selected-notes', lectureIds, jobId),
  getTranslationCandidates: () =>
    ipcRenderer.invoke('archive:get-translation-candidates'),
  printLectureNotes: () => ipcRenderer.invoke('archive:print-notes'),
  scanAndSyncLibrary: () => ipcRenderer.invoke('archive:sync-library'),
  openLibraryFolder: () => ipcRenderer.invoke('archive:open-folder'),
  getCourseStats: () => ipcRenderer.invoke('archive:get-course-stats'),
  readCourseInfo: (courseCode: string) =>
    ipcRenderer.invoke('archive:read-course-info', courseCode),
  readStudySet: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-study-set', lectureId),
  generateStudySet: (lectureId: string) =>
    ipcRenderer.invoke('archive:generate-study-set', lectureId),
  loadQnaThreads: (lectureId: string) =>
    ipcRenderer.invoke('archive:load-qna', lectureId),
  saveQnaThreads: (lectureId: string, threads: QnaThread[]) =>
    ipcRenderer.invoke('archive:save-qna', lectureId, threads),
  generateQnaResponse: (
    lectureId: string,
    thread: QnaThread,
    useFullContext: boolean
  ) =>
    ipcRenderer.invoke(
      'archive:generate-qna',
      lectureId,
      thread,
      useFullContext
    ),
  saveStudySession: (session: StudySession) =>
    ipcRenderer.invoke('archive:save-study-session', session),
  getStudyAnalytics: () => ipcRenderer.invoke('archive:get-study-analytics'),
  addManualStudyTime: (courseCode: string, minutes: number, date?: string) =>
    ipcRenderer.invoke(
      'archive:add-manual-study-time',
      courseCode,
      minutes,
      date
    ),
  getCourses: () => ipcRenderer.invoke('archive:get-courses'),
  saveCourse: (course, oldCode) =>
    ipcRenderer.invoke('archive:save-course', course, oldCode),
  deleteCourse: (code, options) =>
    ipcRenderer.invoke('archive:delete-course', code, options),
  matchLectureToCourse: (recordedAt, durationSeconds) =>
    ipcRenderer.invoke(
      'archive:match-lecture-to-course',
      recordedAt,
      durationSeconds
    ),
  autoAssignCoursesBySchedule: (lectureIds, minConfidence) =>
    ipcRenderer.invoke(
      'archive:auto-assign-courses',
      lectureIds,
      minConfidence
    ),
  getScratchpad: () => ipcRenderer.invoke('archive:get-scratchpad'),
  saveScratchpad: (data) => ipcRenderer.invoke('archive:save-scratchpad', data),
  getReminders: () => ipcRenderer.invoke('archive:get-reminders'),
  saveReminders: (reminders) =>
    ipcRenderer.invoke('archive:save-reminders', reminders),
  getHighlights: (lectureId) =>
    ipcRenderer.invoke('archive:get-highlights', lectureId),
  saveHighlights: (lectureId, highlights) =>
    ipcRenderer.invoke('archive:save-highlights', lectureId, highlights),
  getAppLogs: () => ipcRenderer.invoke('archive:get-app-logs'),
  clearAppLogs: () => ipcRenderer.invoke('archive:clear-app-logs'),
  logClientMessage: (level, source, message, details) =>
    ipcRenderer.invoke(
      'archive:log-client-message',
      level,
      source,
      message,
      details
    ),
  onGenerationProgress: (callback) => {
    const handler = (_event: unknown, payload: GenerationProgress) =>
      callback(payload)
    ipcRenderer.on('archive:generation-progress', handler)
    return () => {
      ipcRenderer.removeListener('archive:generation-progress', handler)
    }
  },
  onQnaChunk: (callback) => {
    const handler = (
      _event: unknown,
      payload: { threadId: string; chunk: string }
    ) => callback(payload)
    ipcRenderer.on('archive:qna-chunk', handler)
    return () => {
      ipcRenderer.removeListener('archive:qna-chunk', handler)
    }
  },
  onQnaStatus: (callback) => {
    const handler = (_event: unknown, payload: QnaStatusUpdate) =>
      callback(payload)
    ipcRenderer.on('archive:qna-status', handler)
    return () => {
      ipcRenderer.removeListener('archive:qna-status', handler)
    }
  }
}

contextBridge.exposeInMainWorld('archive', archiveApi)
