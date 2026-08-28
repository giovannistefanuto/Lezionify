import { app, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ArchiveService } from './archive'
import type { AppSettings, UpdateLecturePayload } from '../../shared/archive'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
])

let mainWindow: BrowserWindow | null = null
const archive = new ArchiveService()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerProtocols(): void {
  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url)
      const lectureId = (url.hostname === 'audio' ? url.pathname : `/${url.hostname}${url.pathname}`)
        .replace(/^\//, '')
        .replace(/\.mp3$/, '')

      const filePath = await archive.getAudioFilePath(lectureId)
      if (!filePath) {
        return new Response('Audio non trovato', { status: 404 })
      }
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Errore nel recupero audio', { status: 500 })
    }
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('archive:list', () => archive.listLectures())
  ipcMain.handle('archive:import-files', () => archive.selectAndImportFiles())
  ipcMain.handle('archive:import-folder', () => archive.selectAndImportFolder())
  ipcMain.handle('archive:read-transcript', (_event, id: string) => archive.readTranscript(id))
  ipcMain.handle('archive:attach-transcript', (_event, id: string) => archive.attachTranscript(id))
  ipcMain.handle('archive:read-markdown', (_event, id: string) => archive.readMarkdown(id))
  ipcMain.handle('archive:save-markdown', (_event, id: string, content: string) =>
    archive.saveMarkdown(id, content)
  )
  ipcMain.handle('archive:update-lecture', (_event, id: string, updates: UpdateLecturePayload) =>
    archive.updateLecture(id, updates)
  )
  ipcMain.handle('archive:delete-lecture', (_event, id: string) => archive.deleteLecture(id))
  ipcMain.handle('archive:get-audio-url', (_event, id: string) => `media://audio/${id}.mp3`)
  ipcMain.handle('archive:search-fulltext', (_event, query: string) => archive.searchFullText(query))
  ipcMain.handle('archive:get-settings', () => archive.getSettings())
  ipcMain.handle('archive:save-settings', (_event, settings: Partial<AppSettings>) =>
    archive.saveSettings(settings)
  )
  ipcMain.handle('archive:test-api-key', (_event, apiKey: string) => archive.testApiKey(apiKey))
  ipcMain.handle('archive:generate-lecture-notes', (_event, id: string) =>
    archive.generateLectureNotes(id)
  )
  ipcMain.handle('archive:generate-all-missing', () => archive.generateAllMissingNotes())
  ipcMain.handle('archive:transcribe-audio', (_event, id: string) => archive.transcribeAudio(id))
  ipcMain.handle('archive:print-notes', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.webContents.print({ silent: false, printBackground: true })
    }
  })
}

app.whenReady().then(async () => {
  await archive.initialize()
  registerProtocols()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
