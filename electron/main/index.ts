import { app, BrowserWindow, dialog, ipcMain, protocol, Menu } from 'electron'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { ArchiveService } from './archive'
import { logger } from './logger'
import { parseByteRange } from './httpRange'
import type {
  LogLevel,
} from '../../shared/archive'

// Global handlers per catturare eccezioni non gestite nel processo Electron
process.on('uncaughtException', (err) => {
  logger.error(
    'process',
    'Uncaught Exception nel processo principale Electron',
    err?.stack || err?.message
  )
  void logger.flush().finally(() => app.exit(1))
})

process.on('unhandledRejection', (reason) => {
  logger.error(
    'process',
    'Unhandled Promise Rejection nel processo principale Electron',
    String(reason)
  )
})

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
  Menu.setApplicationMenu(null)
  const iconPath = join(__dirname, '../../resources/icon.png')
  mainWindow = new BrowserWindow({
    title: 'Lezionify',
    icon: iconPath,
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  archive.setProgressCallback((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('archive:generation-progress', progress)
    }
  })

  archive.setQnaStreamCallback((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('archive:qna-chunk', data)
    }
  })

  archive.setQnaStatusCallback((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('archive:qna-status', status)
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
      const lectureId = (
        url.hostname === 'audio'
          ? url.pathname
          : `/${url.hostname}${url.pathname}`
      )
        .replace(/^\//, '')
        .replace(/\.mp3$/, '')

      const filePath = await archive.getAudioFilePath(lectureId)
      if (!filePath) {
        return new Response('Audio non trovato', { status: 404 })
      }

      const fileSize = (await stat(filePath)).size
      const range = request.headers.get('range')

      if (range) {
        const parsedRange = parseByteRange(range, fileSize)
        if (!parsedRange) {
          return new Response('Intervallo audio non valido', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
              'Accept-Ranges': 'bytes'
            }
          })
        }
        const { start, end } = parsedRange
        const chunksize = end - start + 1
        const file = createReadStream(filePath, { start, end })
        const headers = new Headers()
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        headers.set('Accept-Ranges', 'bytes')
        headers.set('Content-Length', chunksize.toString())
        headers.set('Content-Type', 'audio/mpeg')
        return new Response(Readable.toWeb(file) as unknown as BodyInit, {
          status: 206,
          headers
        })
      } else {
        const headers = new Headers()
        headers.set('Content-Length', fileSize.toString())
        headers.set('Content-Type', 'audio/mpeg')
        headers.set('Accept-Ranges', 'bytes')
        const file = createReadStream(filePath)
        return new Response(Readable.toWeb(file) as unknown as BodyInit, {
          status: 200,
          headers
        })
      }
    } catch (err) {
      console.error('Errore nel recupero audio:', err)
      return new Response('Errore nel recupero audio', { status: 500 })
    }
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('archive:list', () => archive.listLectures())
  ipcMain.handle('archive:import-files', () => archive.selectAndImportFiles())
  ipcMain.handle('archive:import-folder', () => archive.selectAndImportFolder())
  ipcMain.handle('archive:read-transcript', (_event, id: string) =>
    archive.readTranscript(id)
  )
  ipcMain.handle('archive:attach-transcript', (_event, id: string) =>
    archive.attachTranscript(id)
  )
  ipcMain.handle('archive:read-markdown', (_event, id: string) =>
    archive.readMarkdown(id)
  )
  ipcMain.handle(
    'archive:save-markdown',
    (_event, id: string, content: unknown) => archive.saveMarkdown(id, content)
  )
  ipcMain.handle(
    'archive:update-lecture',
    (_event, id: string, updates: unknown) =>
      archive.updateLecture(id, updates)
  )
  ipcMain.handle('archive:delete-lecture', (_event, id: string) =>
    archive.deleteLecture(id)
  )
  ipcMain.handle('archive:search-fulltext', (_event, query: string) =>
    archive.searchFullText(query)
  )
  ipcMain.handle('archive:get-settings', () => archive.getSettings())
  ipcMain.handle(
    'archive:save-settings',
    (_event, settings: unknown) => archive.saveSettings(settings)
  )
  ipcMain.handle('archive:test-api-key', (_event, apiKey: string) =>
    archive.testApiKey(apiKey)
  )
  ipcMain.handle('archive:generate-lecture-notes', (_event, id: string, jobId?: string) =>
    archive.generateLectureNotes(id, jobId)
  )
  ipcMain.handle('archive:generate-selected', (_event, lectureIds: string[], jobId?: string) =>
    archive.generateSelectedNotes(lectureIds, jobId)
  )
  ipcMain.handle('archive:sync-library', () => archive.scanAndSyncLibrary())
  ipcMain.handle('archive:open-folder', () => archive.openLibraryFolder())
  ipcMain.handle('archive:transcribe-audio', (_event, id: string, jobId?: string) =>
    archive.transcribeAudio(id, jobId)
  )
  ipcMain.handle('archive:read-markdown-en', (_event, id: string) =>
    archive.readMarkdownEn(id)
  )
  ipcMain.handle('archive:translate-lecture-notes', (_event, id: string, jobId?: string) =>
    archive.translateLectureNotes(id, jobId)
  )
  ipcMain.handle(
    'archive:translate-selected-notes',
    (_event, lectureIds: string[], jobId?: string) =>
      archive.translateSelectedNotes(lectureIds, jobId)
  )
  ipcMain.handle('archive:get-translation-candidates', () =>
    archive.getTranslationCandidates()
  )
  ipcMain.handle('archive:get-course-stats', () => archive.getCourseStats())
  ipcMain.handle('archive:read-course-info', (_event, code: string) =>
    archive.readCourseInfo(code)
  )
  ipcMain.handle('archive:read-study-set', (_event, id: string) =>
    archive.readStudySet(id)
  )
  ipcMain.handle('archive:generate-study-set', (_event, id: string) =>
    archive.generateStudySet(id)
  )
  ipcMain.handle('archive:load-qna', (_event, id: string) =>
    archive.loadQnaThreads(id)
  )
  ipcMain.handle('archive:save-qna', (_event, id: string, threads: unknown) =>
    archive.saveQnaThreads(id, threads)
  )
  ipcMain.handle(
    'archive:generate-qna',
    (_event, id: string, thread: unknown, useFullContext: unknown) =>
      archive.generateQnaResponse(id, thread, useFullContext)
  )
  ipcMain.handle(
    'archive:save-study-session',
    (_event, session: unknown) => archive.saveStudySession(session)
  )
  ipcMain.handle('archive:get-study-analytics', () =>
    archive.getStudyAnalytics()
  )
  ipcMain.handle(
    'archive:add-manual-study-time',
    (_event, courseCode: unknown, minutes: unknown, date?: unknown) =>
      archive.addManualStudyTime(courseCode, minutes, date)
  )
  ipcMain.handle('archive:get-courses', () => archive.getCourses())
  ipcMain.handle(
    'archive:save-course',
    (_event, course: unknown, oldCode?: unknown) =>
      archive.saveCourse(course, oldCode)
  )
  ipcMain.handle(
    'archive:delete-course',
    (_event, code: string, options?: unknown) =>
      archive.deleteCourse(code, options)
  )
  ipcMain.handle(
    'archive:match-lecture-to-course',
    (_event, recordedAt: string, durationSeconds: number) =>
      archive.matchLectureToCourse(recordedAt, durationSeconds)
  )
  ipcMain.handle(
    'archive:auto-assign-courses',
    (_event, lectureIds?: string[], minConfidence?: number) =>
      archive.autoAssignCoursesBySchedule(lectureIds, minConfidence)
  )
  ipcMain.handle('archive:get-scratchpad', () => archive.getScratchpad())
  ipcMain.handle('archive:save-scratchpad', (_event, data: unknown) =>
    archive.saveScratchpad(data)
  )
  ipcMain.handle('archive:get-reminders', () => archive.getReminders())
  ipcMain.handle('archive:save-reminders', (_event, reminders: unknown) =>
    archive.saveReminders(reminders)
  )
  ipcMain.handle('archive:get-highlights', (_event, lectureId: string) =>
    archive.getHighlights(lectureId)
  )
  ipcMain.handle(
    'archive:save-highlights',
    (_event, lectureId: string, highlights: unknown) =>
      archive.saveHighlights(lectureId, highlights)
  )
  ipcMain.handle('archive:print-notes', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.webContents.print({ silent: false, printBackground: true })
    }
  })
  ipcMain.handle('archive:get-app-logs', () => archive.getAppLogs())
  ipcMain.handle('archive:clear-app-logs', () => archive.clearAppLogs())
  ipcMain.handle(
    'archive:log-client-message',
    (
      _event,
      level: LogLevel,
      source: string,
      message: string,
      details?: string
    ) => archive.logClientMessage(level, source, message, details)
  )
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.lezionify.app')
  }
  try {
    await archive.initialize()
    registerProtocols()
    registerIpcHandlers()
    createWindow()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(
      'startup',
      'Impossibile inizializzare l’archivio locale',
      message
    )
    dialog.showErrorBox(
      'Lezionify non può aprire l’archivio',
      `${message}\n\nI dati non sono stati sovrascritti. Controlla library.json e il relativo backup nella cartella dati.`
    )
    await logger.flush()
    app.quit()
    return
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
