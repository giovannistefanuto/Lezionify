import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ArchiveApi,
  ArchivePipelineStatus,
  GenerationProgress,
  QnaStatusUpdate,
  QnaThread,
  StudySession,
  UpdateLecturePayload,
  VideoImportProgress
} from '../../shared/archive'

const archiveApi: ArchiveApi = {
  getCourseRag: course => ipcRenderer.invoke('course-rag:state', course),
  linkCourseFolder: course => ipcRenderer.invoke('course-rag:link', course),
  setCourseFolderEnabled: (course, enabled) => ipcRenderer.invoke('course-rag:enabled', course, enabled),
  syncCourseRag: course => ipcRenderer.invoke('course-rag:sync', course),
  addCourseDocuments: course => ipcRenderer.invoke('course-rag:add', course),
  saveCourseThread: (course, thread) => ipcRenderer.invoke('course-rag:save-thread', course, thread),
  deleteCourseThread: (course, id) => ipcRenderer.invoke('course-rag:delete-thread', course, id),
  askCourse: (course, thread, question, request, images, sourceId, sourceVersion) => ipcRenderer.invoke('course-rag:ask', course, thread, question, request, images, sourceId, sourceVersion),
  stopCourseAnswer: (course, request) => ipcRenderer.invoke('course-rag:stop', course, request),
  countCourseMentions: (course, term) => ipcRenderer.invoke('course-rag:count', course, term),
  openCoursePdf: (course, id) => ipcRenderer.invoke('course-rag:pdf', course, id),
  onCourseRagEvent: callback => {
    const handler = (_event: unknown, payload: import('../../shared/courseRag').CourseRagEvent) => callback(payload)
    ipcRenderer.on('course-rag:event', handler)
    return () => ipcRenderer.removeListener('course-rag:event', handler)
  },
  languageShortcutDiagnosticsEnabled: process.env.LEZIONIFY_TRACE_CTRL_L === '1',
  exportNotesPdf: request => ipcRenderer.invoke('archive:export-notes-pdf', request),
  getPdfExportDocument: token => ipcRenderer.invoke('archive:pdf-export-document', token),
  pdfExportReady: (token, failed) => ipcRenderer.invoke('archive:pdf-export-ready', token, failed),
  getFocusPdf: lectureId => ipcRenderer.invoke('archive:get-focus-pdf', lectureId),
  selectFocusPdf: lectureId => ipcRenderer.invoke('archive:select-focus-pdf', lectureId),
  releaseFocusPdf: id => ipcRenderer.invoke('archive:release-focus-pdf', id),
  getArchivedCourseCodes: () => ipcRenderer.invoke('archive:get-archived-courses'),
  setCourseArchived: (code, archived) =>
    ipcRenderer.invoke('archive:set-course-archived', code, archived),
  listLectures: () => ipcRenderer.invoke('archive:list'),
  getLectureWordCounts: (lectureId) => ipcRenderer.invoke('archive:lecture-word-counts', lectureId),
  lookupDictionary: (query, direction) => ipcRenderer.invoke('archive:dictionary-lookup', query, direction),
  offlineTranslationStatus: () => ipcRenderer.invoke('archive:phrase-status'),
  ambientSoundStatus: () => ipcRenderer.invoke('archive:ambient-status'),
  installAmbientSounds: soundIds => ipcRenderer.invoke('archive:ambient-install', soundIds),
  readAmbientSound: id => ipcRenderer.invoke('archive:ambient-read', id),
  openCompilation: (videoId, start) => ipcRenderer.invoke('archive:open-compilation', videoId, start),
  spotifyConnection: () => ipcRenderer.invoke('archive:spotify-connection'),
  configureSpotify: clientId => ipcRenderer.invoke('archive:spotify-configure', clientId),
  connectSpotify: () => ipcRenderer.invoke('archive:spotify-connect'),
  disconnectSpotify: () => ipcRenderer.invoke('archive:spotify-disconnect'),
  spotifyDevices: () => ipcRenderer.invoke('archive:spotify-devices'),
  spotifyPlayback: () => ipcRenderer.invoke('archive:spotify-playback'),
  spotifyCommand: (command, deviceId, argument) => ipcRenderer.invoke('archive:spotify-command', command, deviceId, argument),
  connectSpotifyLibrary: () => ipcRenderer.invoke('archive:spotify-library-connect'),
  selectSpotifyDevice: deviceId => ipcRenderer.invoke('archive:spotify-device', deviceId),
  spotifyLibrary: (kind, offset) => ipcRenderer.invoke('archive:spotify-library', kind, offset),
  playSpotifyItem: (uri, deviceId) => ipcRenderer.invoke('archive:spotify-play-item', uri, deviceId),
  openSpotifyItem: uri => ipcRenderer.invoke('archive:spotify-open-item', uri),
  openSpotify: () => ipcRenderer.invoke('archive:spotify-open'),
  installOfflineTranslation: () => ipcRenderer.invoke('archive:phrase-install'),
  translatePhrase: (text, direction) => ipcRenderer.invoke('archive:phrase-translate', text, direction),
  importFiles: () => ipcRenderer.invoke('archive:import-files'),
  importFolder: () => ipcRenderer.invoke('archive:import-folder'),
  selectVideos: () => ipcRenderer.invoke('archive:select-videos'),
  convertVideos: (sessionId, orderedIds) => ipcRenderer.invoke('archive:convert-videos', sessionId, orderedIds),
  saveVideoImport: (sessionId, destination) => ipcRenderer.invoke('archive:save-video-import', sessionId, destination),
  cancelVideoImport: sessionId => ipcRenderer.invoke('archive:cancel-video-import', sessionId),
  onVideoImportProgress: callback => {
    const listener = (_event: Electron.IpcRendererEvent, progress: VideoImportProgress) => callback(progress)
    ipcRenderer.on('archive:video-import-progress', listener)
    return () => ipcRenderer.removeListener('archive:video-import-progress', listener)
  },
  readTranscript: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-transcript', lectureId),
  attachTranscript: (lectureId: string) =>
    ipcRenderer.invoke('archive:attach-transcript', lectureId),
  readMarkdown: (lectureId: string) =>
    ipcRenderer.invoke('archive:read-markdown', lectureId),
  saveMarkdown: (lectureId: string, content: string) =>
    ipcRenderer.invoke('archive:save-markdown', lectureId, content),
  renameLectureTitles: (lectureId, titles) => ipcRenderer.invoke('archive:rename-lecture-titles', lectureId, titles),
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
  getArchivePipelineStatus: () =>
    ipcRenderer.invoke('archive:get-pipeline-status'),
  startArchivePipeline: () => ipcRenderer.invoke('archive:start-pipeline'),
  resumeArchivePipeline: () => ipcRenderer.invoke('archive:resume-pipeline'),
  requestArchivePipelineStop: () => ipcRenderer.invoke('archive:stop-pipeline'),
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
  saveQnaImage: (lectureId, threadId, input) => ipcRenderer.invoke('archive:save-qna-image', lectureId, threadId, input),
  listQnaImages: () => ipcRenderer.invoke('archive:list-qna-images'),
  readQnaImage: id => ipcRenderer.invoke('archive:read-qna-image', id),
  deleteQnaImages: selection => ipcRenderer.invoke('archive:delete-qna-images', selection),
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
  getLectureStudySeconds: (lectureId: string, excludedSessionId: string) =>
    ipcRenderer.invoke('archive:get-lecture-study-seconds', lectureId, excludedSessionId),
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
  detectUsbRecorder: () => ipcRenderer.invoke('archive:detect-usb-recorder'),
  importUsbRecorderFiles: (items) =>
    ipcRenderer.invoke('archive:import-usb-recorder-files', items),
  deleteUsbRecorderFiles: (filePaths) =>
    ipcRenderer.invoke('archive:delete-usb-recorder-files', filePaths),
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
  getAppLogDay: day => ipcRenderer.invoke('archive:get-app-log-day', day),
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
  onArchivePipelineProgress: (callback) => {
    const handler = (_event: unknown, payload: ArchivePipelineStatus) =>
      callback(payload)
    ipcRenderer.on('archive:pipeline-progress', handler)
    return () => {
      ipcRenderer.removeListener('archive:pipeline-progress', handler)
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
  publishLectures: () => ipcRenderer.invoke('archive:publish-lectures'),
  getPublishingStatus: () => ipcRenderer.invoke('archive:get-publishing-status'),
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
