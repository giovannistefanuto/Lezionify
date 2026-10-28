import { readBatteryStatus } from './battery'
import { CourseRagService } from './courseRag'
import { checkPackagedCourseRag } from './courseRagPackageCheck'
import { completeCourseResponse } from './ai/courseRagCompletion'
import { readdir } from 'node:fs/promises'
import { QNA_IMAGE_LIMIT, QNA_IMAGE_MAX_BYTES, type QnaImageInput } from '../../shared/qnaImages'
import { app, BrowserWindow, dialog, ipcMain, protocol, Menu, shell, safeStorage, nativeImage, powerMonitor, net } from 'electron'
import { configureGeminiConnectivity } from './ai/connectivity'
import { SpotifyService } from './spotify'
import { spotifyItemUrl } from '../../shared/spotify'
import { compilationUrl } from '../../shared/music'
import { join, extname } from 'node:path'
import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { ArchiveService } from './archive'
import { logger } from './logger'
import { traceLanguageShortcut } from './languageShortcutDiagnostics'
import { parseByteRange } from './httpRange'
import { FocusPdfService } from './focusPdf'
import { LocalDictionaryService } from './localDictionary'
import { OfflineTranslationService } from './offlineTranslation'
import { AmbientSoundService } from './ambientSounds'
import { PdfExportService } from './pdfExport'
import type {
  LogLevel,
  UsbImportItemSelection
} from '../../shared/archive'

configureGeminiConnectivity(() => net.isOnline())

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
  },
  { scheme: 'slides', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

let mainWindow: BrowserWindow | null = null
const ragSelfCheck = process.argv.includes('--rag-self-check')
if (ragSelfCheck) app.setPath('userData', join(app.getPath('temp'), `Lezionify-rag-selfcheck-${Date.now()}-${process.pid}`))
const archive = new ArchiveService()
const dictionary = new LocalDictionaryService(join(app.getAppPath(), app.isPackaged ? 'out/renderer/dictionaries' : 'public/dictionaries'))
let focusPdfs: FocusPdfService
let offlineTranslation: OfflineTranslationService
let ambientSounds: AmbientSoundService
let spotify: SpotifyService
let courseRag: CourseRagService
let courseRagTimer: ReturnType<typeof setInterval> | undefined
const pdfExport = new PdfExportService(archive, join(__dirname, '../renderer/index.html'), join(__dirname, '../preload/index.mjs'), process.env.ELECTRON_RENDERER_URL)

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

  if (process.env.LEZIONIFY_TRACE_CTRL_L === '1') {
    logger.info('shortcut-language', '[DEBUG-ctrl-l] tracing-enabled')
    traceLanguageShortcut(mainWindow.webContents, details => {
      logger.info('shortcut-language', '[DEBUG-ctrl-l] main-input', details)
    })
  }

  archive.setProgressCallback((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('archive:generation-progress', progress)
    }
  })

  archive.setVideoImportProgressCallback((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('archive:video-import-progress', progress)
  })

  archive.setArchivePipelineStatusCallback((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('archive:pipeline-progress', status)
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
  protocol.handle('slides', request => {
    const allowed = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).origin : 'null'
    const origin = (request as Request & { initiatorOrigin?: string }).initiatorOrigin ?? request.headers.get('origin')
    // Electron versions that omit initiator metadata still require the opaque native grant.
    if (origin && origin !== allowed) return new Response(null, { status: 403 })
    return focusPdfs.response(request)
  })
  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url)
      let filePath: string | null = null

      if (url.hostname === 'preview') {
        const queryPath = url.searchParams.get('path')
        const rawPath =
          queryPath || decodeURIComponent(url.pathname.replace(/^\//, ''))
        if (rawPath && existsSync(rawPath)) {
          filePath = rawPath
        }
      } else if (url.hostname === 'repetition') {
        filePath = await archive.repetition.audioPath(url.pathname.slice(1))
      } else {
        const lectureId = (
          url.hostname === 'audio'
            ? url.pathname
            : `/${url.hostname}${url.pathname}`
        )
          .replace(/^\//, '')
          .replace(/\.mp3$/, '')

        filePath = await archive.getAudioFilePath(lectureId)
      }

      if (!filePath || !existsSync(filePath)) {
        return new Response('Audio non trovato', { status: 404 })
      }

      const fileSize = (await stat(filePath)).size
      const range = request.headers.get('range')
      const ext = extname(filePath).toLowerCase()
      const contentType =
        ext === '.wav'
          ? 'audio/wav'
          : ext === '.m4a' || ext === '.mp4'
            ? 'audio/mp4'
            : 'audio/mpeg'

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
        headers.set('Content-Type', contentType)
        return new Response(Readable.toWeb(file) as unknown as BodyInit, {
          status: 206,
          headers
        })
      } else {
        const headers = new Headers()
        headers.set('Content-Length', fileSize.toString())
        headers.set('Content-Type', contentType)
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

async function repetitionIpc<T>(action: () => Promise<T>): Promise<T> {
  try { return await action() } catch (cause) {
    if (cause && typeof cause === 'object' && 'code' in cause) {
      throw new Error('File RIPETERE non disponibile. Controlla il registratore e i permessi della cartella locale.', { cause })
    }
    throw cause
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('repetition:state', () => repetitionIpc(() => archive.repetition.state()))
  ipcMain.handle('repetition:reference', () => repetitionIpc(async () => {
    const selection = await dialog.showOpenDialog({ title: 'Appunti di riferimento per RIPETERE',
      properties: ['openFile'], filters: [{ name: 'Appunti Markdown o TXT', extensions: ['md', 'txt', 'markdown'] }] })
    if (selection.canceled || !selection.filePaths[0]) return false
    await archive.repetition.setReference(selection.filePaths[0])
    return true
  }))
  ipcMain.handle('repetition:start', () => repetitionIpc(() => archive.repetition.startLatest()))
  ipcMain.handle('repetition:resume', (_event, id: string) => repetitionIpc(() => archive.repetition.resume(id)))
  ipcMain.handle('repetition:stop', () => repetitionIpc(() => archive.repetition.stop()))
  ipcMain.handle('repetition:read', (_event, id: string) => repetitionIpc(() => archive.repetition.read(id)))
  ipcMain.handle('course-rag:state', (_event, course: string) => courseRag.state(course))
  ipcMain.handle('course-rag:prepare-semantic', (_event, course: string) => courseRag.prepareSemantic(course))
  ipcMain.handle('course-rag:manage-index', (_event, course: string, action: string) => courseRag.manageIndex(course, action))
  ipcMain.handle('course-rag:lecture-number', (_event, course: string, lectureId: string, number: number) => courseRag.setLectureNumber(course, lectureId, number))
  ipcMain.handle('course-rag:sync', async (_event, course: string) => { courseRag.startSync(course, true); return courseRag.state(course) })
  ipcMain.handle('course-rag:enabled', (_event, course: string, enabled: boolean) => courseRag.configure(course, null, enabled))
  ipcMain.handle('course-rag:link', async (_event, course: string) => {
    const suggestions: string[] = []
    try {
      for (const entry of await readdir(app.getPath('home'), { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^onedrive\b/i.test(entry.name)) continue
        const base = join(app.getPath('home'), entry.name)
        for (const notes of await readdir(base, { withFileTypes: true })) {
          if (!notes.isDirectory() || !/^notability/i.test(notes.name)) continue
          const root = join(base, notes.name, 'Magistrale')
          if (existsSync(root)) suggestions.push(existsSync(join(root, course)) ? join(root, course) : root)
        }
      }
    } catch { /* The native folder picker is always available. */ }
    const chosen = await dialog.showOpenDialog({ title: 'Collega la cartella delle slide di questo corso',
      defaultPath: suggestions[0], properties: ['openDirectory'], buttonLabel: 'Collega e attiva download e indice' })
    return chosen.canceled ? courseRag.state(course) : courseRag.configure(course, chosen.filePaths[0], true)
  })
  ipcMain.handle('course-rag:add', async (_event, course: string) => {
    const chosen = await dialog.showOpenDialog({ title: 'Aggiungi fonti al corso', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documenti del corso', extensions: ['pdf', 'md', 'txt'] }] })
    return chosen.canceled ? courseRag.state(course) : courseRag.addFiles(course, chosen.filePaths)
  })
  ipcMain.handle('course-rag:save-thread', (_event, course: string, thread: import('../../shared/courseRag').CourseThread) => courseRag.saveThread(course, thread))
  ipcMain.handle('course-rag:delete-thread', (_event, course: string, id: string) => courseRag.deleteThread(course, id))
  ipcMain.handle('course-rag:count', (_event, course: string, term: string) => courseRag.count(course, term))
  ipcMain.handle('course-rag:stop', (_event, course: string, request: string) => courseRag.stop(course, request))
  ipcMain.handle('course-rag:pdf', async (_event, course: string, id: string) => { const grant = await courseRag.pdfGrant(course, id); return { ...await focusPdfs.grantCourseSource(grant.path), sourceVersion: grant.version } })
  ipcMain.handle('course-rag:ask', async (_event, course: string, thread: string, question: string, request: string, images?: QnaImageInput[], sourceId?: string, sourceVersion?: string) => {
    if (images !== undefined) {
      if (!Array.isArray(images) || !images.length || images.length > QNA_IMAGE_LIMIT || typeof sourceId !== 'string') throw new Error('Pagine allegate non valide.')
      const grant = await courseRag.pdfGrant(course, sourceId)
      if (grant.version !== sourceVersion) throw new Error('La fonte delle pagine è cambiata. Aggiorna e seleziona nuovamente le pagine.')
      for (const image of images) {
        if (!image || !Number.isInteger(image.page) || image.page < 1 || typeof image.data !== 'string' || image.data.length > Math.ceil(QNA_IMAGE_MAX_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data)) throw new Error('Immagine non valida.')
        const bytes = Buffer.from(image.data, 'base64')
        const size = nativeImage.createFromBuffer(bytes).getSize()
        if (bytes.length > QNA_IMAGE_MAX_BYTES || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || size.width < 1 || size.height < 1 || size.width * size.height > 8_000_000) throw new Error('Immagine PNG non valida.')
      }
    }
    return courseRag.ask(course, thread, question, request, images, sourceId, sourceVersion)
  })

  const assertPdfSender = (event: Electron.IpcMainInvokeEvent) => {
    const expected = process.env.ELECTRON_RENDERER_URL
    const frameUrl = event.senderFrame?.url ?? ''
    const ownRenderer = expected
      ? URL.canParse(frameUrl) && new URL(frameUrl).origin === new URL(expected).origin
      : frameUrl === pathToFileURL(join(__dirname, '../renderer/index.html')).href
    if (!ownRenderer || !mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Richiesta PDF non autorizzata.')
    }
  }
  ipcMain.handle('archive:get-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    return focusPdfs.get(id)
  })
  ipcMain.handle('archive:export-notes-pdf', (event, request: unknown) => {
    assertPdfSender(event)
    return pdfExport.export(request, mainWindow!)
  })
  ipcMain.handle('archive:pdf-export-document', (event, token: unknown) => pdfExport.getDocument(event, token))
  ipcMain.handle('archive:pdf-export-ready', (event, token: unknown, failed: unknown) => pdfExport.ready(event, token, failed))
  ipcMain.handle('archive:select-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    return focusPdfs.select(id)
  })
  ipcMain.handle('archive:release-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    focusPdfs.release(id)
  })
  ipcMain.handle('archive:list', () => archive.listLectures())
  ipcMain.handle('archive:lecture-word-counts', (_event, lectureId: string) => archive.getLectureWordCounts(lectureId))
  ipcMain.handle('archive:dictionary-lookup', (_event, query: unknown, direction: unknown) => dictionary.lookup(query, direction))
  ipcMain.handle('archive:phrase-status', () => offlineTranslation.status())
  ipcMain.handle('archive:battery-status', () => readBatteryStatus(powerMonitor.isOnBatteryPower()))
  ipcMain.handle('archive:ambient-status', () => ambientSounds.status())
  ipcMain.handle('archive:ambient-install', (_event, soundIds: unknown) =>
    ambientSounds.install(soundIds)
  )
  ipcMain.handle('archive:ambient-read', (_event, id: unknown) =>
    ambientSounds.read(String(id || ''))
  )
  ipcMain.handle('archive:spotify-connection', () => spotify.status())
  ipcMain.handle('archive:spotify-configure', (_event, clientId: unknown) => spotify.configure(clientId))
  ipcMain.handle('archive:spotify-connect', () => spotify.login())
  ipcMain.handle('archive:spotify-disconnect', () => spotify.disconnect())
  ipcMain.handle('archive:spotify-devices', () => spotify.devices())
  ipcMain.handle('archive:spotify-playback', () => spotify.playback())
  ipcMain.handle('archive:spotify-command', (_event, command: unknown, deviceId: unknown, argument: unknown) => spotify.command(command, deviceId, argument))
  ipcMain.handle('archive:spotify-library-connect', () => spotify.login(true))
  ipcMain.handle('archive:spotify-device', (_event, deviceId: unknown) => spotify.selectDevice(deviceId))
  ipcMain.handle('archive:spotify-library', (_event, kind: unknown, offset: unknown) => spotify.library(kind, offset))
  ipcMain.handle('archive:spotify-play-item', (_event, uri: unknown, deviceId: unknown) => spotify.playItem(uri, deviceId))
  ipcMain.handle('archive:spotify-open-item', (_event, uri: unknown) => shell.openExternal(spotifyItemUrl(uri)))
  ipcMain.handle('archive:spotify-open', () => shell.openExternal('spotify:'))
  ipcMain.handle('archive:open-compilation', (_event, videoId: unknown, start: unknown) => shell.openExternal(compilationUrl(videoId, start)))
  ipcMain.handle('archive:phrase-install', () => offlineTranslation.install())
  ipcMain.handle('archive:phrase-translate', (_event, text: unknown, direction: unknown) => offlineTranslation.translate(text, direction))
  ipcMain.handle('archive:import-files', () => archive.selectAndImportFiles())
  ipcMain.handle('archive:import-folder', () => archive.selectAndImportFolder())
  ipcMain.handle('archive:select-videos', () => archive.selectVideos())
  ipcMain.handle('archive:convert-videos', (_event, sessionId: string, orderedIds: unknown) => archive.convertVideos(sessionId, orderedIds))
  ipcMain.handle('archive:save-video-import', (_event, sessionId: string, destination: unknown) => archive.saveVideoImport(sessionId, destination))
  ipcMain.handle('archive:cancel-video-import', (_event, sessionId: string) => archive.cancelVideoImport(sessionId))
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
  ipcMain.handle('archive:rename-lecture-titles', (_event, id: string, titles: unknown) => archive.renameLectureTitles(id, titles))
  ipcMain.handle('archive:delete-lecture', (_event, id: string) =>
    archive.deleteLecture(id)
  )
  ipcMain.handle('archive:search-fulltext', (_event, query: string) =>
    archive.searchFullText(query)
  )
  ipcMain.handle('archive:get-settings', () => archive.getSettings())
  ipcMain.handle('archive:publish-lectures', () => archive.publishLectures())
  ipcMain.handle('archive:get-publishing-status', () => archive.getPublishingStatus())
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
  ipcMain.handle('archive:get-pipeline-status', () =>
    archive.getArchivePipelineStatus()
  )
  ipcMain.handle('archive:start-pipeline', () => archive.startArchivePipeline())
  ipcMain.handle('archive:resume-pipeline', () => archive.resumeArchivePipeline())
  ipcMain.handle('archive:stop-pipeline', () =>
    archive.requestArchivePipelineStop()
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
    (_event, id: string, thread: unknown, useFullContext: unknown, includeOtherQna: unknown = false, responseLength: unknown = 'brief') =>
      archive.generateQnaResponse(id, thread, useFullContext, includeOtherQna, responseLength)
  )
  ipcMain.handle('archive:save-qna-image', (_event, lectureId: string, threadId: string, input: unknown) => archive.saveQnaImage(lectureId, threadId, input))
  ipcMain.handle('archive:list-qna-images', () => archive.qnaImages.list())
  ipcMain.handle('archive:read-qna-image', (_event, id: unknown) => archive.qnaImages.read(id))
  ipcMain.handle('archive:delete-qna-images', (_event, selection: unknown) => archive.qnaImages.remove(selection))
  ipcMain.handle(
    'archive:save-study-session',
    (_event, session: unknown) => archive.saveStudySession(session)
  )
  ipcMain.handle('archive:get-study-analytics', () =>
    archive.getStudyAnalytics()
  )
  ipcMain.handle('archive:get-study-time-removal-targets', () => archive.getStudyTimeRemovalTargets())
  ipcMain.handle('archive:remove-study-time', (_event, targetId: unknown, minutes: unknown) => archive.removeStudyTime(targetId, minutes))
  ipcMain.handle('archive:get-lecture-study-seconds', (_event, lectureId: unknown, excludedSessionId: unknown) =>
    archive.getLectureStudySeconds(lectureId, excludedSessionId)
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
  ipcMain.handle('archive:detect-usb-recorder', () =>
    archive.detectUsbRecorder()
  )
  ipcMain.handle(
    'archive:import-usb-recorder-files',
    (_event, items: UsbImportItemSelection[]) =>
      archive.importUsbRecorderFiles(items)
  )
  ipcMain.handle(
    'archive:delete-usb-recorder-files',
    (_event, filePaths: string[]) => archive.deleteUsbRecorderFiles(filePaths)
  )
  ipcMain.handle('archive:get-archived-courses', () => archive.getArchivedCourseCodes())
  ipcMain.handle('archive:set-course-archived', (_event, code: unknown, archived: unknown) =>
    archive.setCourseArchived(code, archived)
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
  ipcMain.handle('archive:get-app-log-day', (_event, day: unknown) => logger.getLogDay(day))
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
  if (ragSelfCheck) {
    try {
      const fixture = process.env.LEZIONIFY_RAG_MODEL_FIXTURE
      if (!fixture) throw new Error('Local public-model fixture required')
      const result = await checkPackagedCourseRag(app.getPath('userData'), fixture, process.argv.includes('--rag-self-check-download'))
      console.log('RAG_PACKAGE_CHECK ' + JSON.stringify(result))
      app.exit(0)
    } catch {
      console.error('RAG_PACKAGE_CHECK failed: isolated runtime diagnostic did not pass')
      app.exit(1)
    }
    return
  }
  spotify = new SpotifyService(join(app.getPath('userData'), 'spotify.json'), { available: () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'), encrypt: value => safeStorage.encryptString(value).toString('base64'), decrypt: value => safeStorage.decryptString(Buffer.from(value, 'base64')) }, url => shell.openExternal(url))
  offlineTranslation = new OfflineTranslationService(join(app.getPath('userData'), 'offline-translation'), join(app.isPackaged ? `${app.getAppPath()}.unpacked` : app.getAppPath(), 'out/main/translation-runtime'))
  ambientSounds = new AmbientSoundService(join(app.getPath('userData'), 'ambient-sounds'))
  focusPdfs = new FocusPdfService(join(app.getPath('userData'), 'focus-pdfs.json'), app.getPath('home'), async defaultPath => {
    const options: Electron.OpenDialogOptions = {
      title: 'Scegli il PDF della lezione', defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }], properties: ['openFile'],
      buttonLabel: 'Affianca PDF'
    }
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths[0] ?? null
  }, process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).origin : 'null')
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.lezionify.app')
  }
  try {
    await archive.initialize()
    courseRag = new CourseRagService(join(app.getPath('userData'), 'course-rag'), {
      checkGrounding: true,
      archiveSources: course => archive.courseRagSources(course),
      notify: event => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('course-rag:event', event) },
      complete: (prompt, signal, images, context) => completeCourseResponse(archive, prompt, signal, images, context)
    })
    registerProtocols()
    registerIpcHandlers()
    createWindow()
    void courseRag.syncEnabled()
    courseRagTimer = setInterval(() => { void courseRag.syncEnabled() }, 5 * 60_000)
    courseRagTimer.unref()
    // Start networking only after creating the window; publishing failures never block startup.
    void archive.initializePublishing()
      .then(() => archive.startAutomaticPublishing())
      .catch(() => logger.warn('publishing', 'Impossibile inizializzare la pubblicazione automatica.'))
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
  spotify?.dispose()
  clearInterval(courseRagTimer)
  courseRag?.dispose()
  if (process.platform !== 'darwin') { archive.destroy(); app.quit() }
})
