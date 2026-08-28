import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveApi, UpdateLecturePayload } from '../../shared/archive'

const archiveApi: ArchiveApi = {
  listLectures: () => ipcRenderer.invoke('archive:list'),
  importFiles: () => ipcRenderer.invoke('archive:import-files'),
  importFolder: () => ipcRenderer.invoke('archive:import-folder'),
  readTranscript: (lectureId: string) => ipcRenderer.invoke('archive:read-transcript', lectureId),
  attachTranscript: (lectureId: string) => ipcRenderer.invoke('archive:attach-transcript', lectureId),
  readMarkdown: (lectureId: string) => ipcRenderer.invoke('archive:read-markdown', lectureId),
  saveMarkdown: (lectureId: string, content: string) =>
    ipcRenderer.invoke('archive:save-markdown', lectureId, content),
  updateLecture: (lectureId: string, updates: UpdateLecturePayload) =>
    ipcRenderer.invoke('archive:update-lecture', lectureId, updates),
  deleteLecture: (lectureId: string) => ipcRenderer.invoke('archive:delete-lecture', lectureId),
  getAudioUrl: (lectureId: string) => ipcRenderer.invoke('archive:get-audio-url', lectureId),
  searchFullText: (query: string) => ipcRenderer.invoke('archive:search-fulltext', query)
}

contextBridge.exposeInMainWorld('archive', archiveApi)
