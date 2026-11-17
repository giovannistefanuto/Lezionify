import { readBatteryStatus } from './battery'
import electronUpdater from 'electron-updater'
import { AppUpdateService } from './appUpdater'
import { UpdateShutdownGate } from './updateShutdownGate'
import { APP_RELEASES_URL } from '../../shared/appUpdate'
import { IpadExportService } from './ipadExport'
import { CourseRagService } from './courseRag'
import { checkPackagedCourseRag } from './courseRagPackageCheck'
import { completeCourseResponse } from './ai/courseRagCompletion'
import { readdir } from 'node:fs/promises'
import { QNA_IMAGE_LIMIT, QNA_IMAGE_MAX_BYTES, type QnaImageInput } from '../../shared/qnaImages'
import { app, BrowserWindow, dialog, ipcMain, protocol, Menu, shell, safeStorage, nativeImage, powerMonitor, net, Notification } from 'electron'
import { ExamReminderService } from './examReminders'
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
if (app.isPackaged && !ragSelfCheck) {
  if (!app.requestSingleInstanceLock()) app.exit(0)
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.show()
    mainWindow?.focus()
  })
}
const updateGate = new UpdateShutdownGate()
let appUpdates: AppUpdateService
let updateStarted = false
if (ragSelfCheck) app.setPath('userData', join(app.getPath('temp'), `Lezionify-rag-selfcheck-${Date.now()}-${process.pid}`))
const archive = new ArchiveService()
const examReminders = new ExamReminderService(join(app.getPath('userData'), 'library', 'exam-reminders.json'), () => archive.getSettings(), notice => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title: notice.title, body: notice.message, silent: true })
    notification.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
    notification.show()
  }
})
let examReminderTimer: ReturnType<typeof setInterval> | undefined
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

  const systemEvents = [
    ['suspend', 'suspended', true], ['resume', 'suspended', false],
    ['lock-screen', 'locked', true], ['unlock-screen', 'locked', false]
  ] as const
  const systemEmitter = powerMonitor as NodeJS.EventEmitter
  const systemListeners = systemEvents.map(([event, reason, active]) => {
    const listener = () => {
      void archive.noteStudySystem(reason,active).catch(()=>logger.warn('study-history','Evento di sistema non salvato.'))
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('study:system-state', { reason, active })
    }
    systemEmitter.on(event, listener)
    return { event, listener }
  })
  mainWindow.on('closed', () => { for (const { event, listener } of systemListeners) systemEmitter.removeListener(event, listener) })

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
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.handle(channel, (event, ...args) => updateGate.run(() => listener(event, ...args)))
  }
  const collectionHandle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => handle(channel, async (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Accesso non consentito.')
    try { return await listener(event, ...args) } catch {
      throw new Error('Operazione in Altro non completata. Controlla i campi, lo spazio disponibile e le fonti selezionate; riprova. I dati precedenti sono conservati.')
    }
  })
  collectionHandle('collections:state', () => archive.collections.state())
  collectionHandle('collections:save', (_e, value) => archive.collections.repository.saveCollection(value))
  collectionHandle('collections:update', (_e, id, value) => archive.collections.repository.updateItem(id, value))
  collectionHandle('collections:select', async () => {
    const selection = await dialog.showOpenDialog({ title: 'Aggiungi contenuti ad Altro', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio, video e trascrizioni', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac', 'mp4', 'm4v', 'mkv', 'mov', 'avi', 'webm', 'wmv', 'mpeg', 'mpg', 'mts', 'm2ts', 'ts', '3gp', 'ogv', 'vob', 'flv', 'txt', 'md'] }] })
    return selection.canceled ? null : archive.collections.repository.selectFiles(selection.filePaths)
  })
  collectionHandle('collections:release', (_e, token) => archive.collections.repository.releaseSelection(token))
  collectionHandle('collections:import', (_e, request) => archive.collections.repository.importFiles(request))
  collectionHandle('collections:read', (_e, id, generation) => archive.collections.read(id, generation))
  collectionHandle('collections:process', (_e, ids, notes, resume) => archive.collections.process(ids, notes, resume))
  collectionHandle('collections:stop', () => archive.collections.stop())
  collectionHandle('collections:activate', (_e, id, generation) => archive.collections.repository.activateGeneration(id, generation))
  collectionHandle('collections:search', (_e, query, collection, archived) => archive.collections.search(query, collection, archived))
  collectionHandle('collections:source', async (_e, id, sourceId) => {
    const item = await archive.collections.repository.item(id)
    const result = await shell.openPath(archive.collections.repository.sourcePath(item, sourceId))
    if (result) throw new Error('Impossibile aprire la fonte.')
  })
  handle('repetition:answer', (_event, id: string, answer: string) => repetitionIpc(() => archive.repetition.answer(id, answer)))
  handle('repetition:state', () => repetitionIpc(() => archive.repetition.state()))
  handle('repetition:reference', () => repetitionIpc(async () => {
    const selection = await dialog.showOpenDialog({ title: 'Appunti di riferimento per RIPETERE',
      properties: ['openFile'], filters: [{ name: 'Appunti Markdown o TXT', extensions: ['md', 'txt', 'markdown'] }] })
    if (selection.canceled || !selection.filePaths[0]) return false
    await archive.repetition.setReference(selection.filePaths[0])
    return true
  }))
  handle('repetition:start', () => repetitionIpc(() => archive.repetition.startLatest()))
  handle('repetition:resume', (_event, id: string) => repetitionIpc(() => archive.repetition.resume(id)))
  handle('repetition:stop', () => repetitionIpc(() => archive.repetition.stop()))
  handle('repetition:credit-reading', (_event, id: string, course: string | null) => repetitionIpc(() => archive.creditRepetitionReading(id, course)))
  handle('repetition:read', (_event, id: string) => repetitionIpc(() => archive.repetition.read(id)))
  handle('course-rag:state', (_event, course: string) => courseRag.state(course))
  handle('course-rag:prepare-semantic', (_event, course: string) => courseRag.prepareSemantic(course))
  handle('course-rag:manage-index', (_event, course: string, action: string) => courseRag.manageIndex(course, action))
  handle('course-rag:lecture-number', (_event, course: string, lectureId: string, number: number) => courseRag.setLectureNumber(course, lectureId, number))
  handle('course-rag:sync', async (_event, course: string) => { courseRag.startSync(course, true); return courseRag.state(course) })
  handle('course-rag:enabled', (_event, course: string, enabled: boolean) => courseRag.configure(course, null, enabled))
  handle('course-rag:link', async (_event, course: string) => {
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
  handle('course-rag:add', async (_event, course: string) => {
    const chosen = await dialog.showOpenDialog({ title: 'Aggiungi fonti al corso', properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documenti del corso', extensions: ['pdf', 'md', 'txt'] }] })
    return chosen.canceled ? courseRag.state(course) : courseRag.addFiles(course, chosen.filePaths)
  })
  handle('course-rag:add-exams', async (_event, course: string) => {
    const chosen = await dialog.showOpenDialog({ title: 'Aggiungi PDF alla scatola esami', properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF degli esami', extensions: ['pdf'] }] })
    return chosen.canceled ? courseRag.state(course) : courseRag.addExams(course, chosen.filePaths)
  })
  handle('course-rag:remove-exam', (_event, course: string, sourceId: string) => courseRag.removeExam(course, sourceId))
  handle('course-rag:save-thread', (_event, course: string, thread: import('../../shared/courseRag').CourseThread) => courseRag.saveThread(course, thread))
  handle('course-rag:delete-thread', (_event, course: string, id: string) => courseRag.deleteThread(course, id))
  handle('course-rag:count', (_event, course: string, term: string) => courseRag.count(course, term))
  handle('course-rag:stop', (_event, course: string, request: string) => courseRag.stop(course, request))
  handle('course-rag:pdf', async (_event, course: string, id: string) => { const grant = await courseRag.pdfGrant(course, id); return { ...await focusPdfs.grantCourseSource(grant.path), name: grant.title, sourceVersion: grant.version } })
  handle('course-rag:ask', async (_event, course: string, thread: string, question: string, request: string, images?: QnaImageInput[], sourceId?: string, sourceVersion?: string) => {
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
  const ipadExport = new IpadExportService(app.getPath('userData'), join(app.getPath('pictures'), 'iCloud Photos', 'Photos'))
  handle('ipad:status', (event, enabled: unknown) => {
    assertPdfSender(event)
    if (enabled !== undefined && typeof enabled !== 'boolean') throw new Error('Preferenza iPad non valida.')
    return ipadExport.status(enabled)
  })
  handle('ipad:export', (event, request: unknown) => {
    assertPdfSender(event)
    return ipadExport.export(request)
  })
  handle('archive:get-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    return focusPdfs.get(id)
  })
  handle('archive:export-notes-pdf', (event, request: unknown) => {
    assertPdfSender(event)
    return pdfExport.export(request, mainWindow!)
  })
  handle('archive:pdf-export-document', (event, token: unknown) => pdfExport.getDocument(event, token))
  handle('archive:pdf-export-ready', (event, token: unknown, failed: unknown) => pdfExport.ready(event, token, failed))
  handle('archive:select-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    return focusPdfs.select(id)
  })
  handle('archive:release-focus-pdf', (event, id: unknown) => {
    assertPdfSender(event)
    focusPdfs.release(id)
  })
  handle('archive:list', () => archive.listLectures())
  handle('archive:lecture-word-counts', (_event, lectureId: string) => archive.getLectureWordCounts(lectureId))
  handle('archive:dictionary-lookup', (_event, query: unknown, direction: unknown) => dictionary.lookup(query, direction))
  handle('archive:section-preview', (_event, id: string, expected: unknown, start: unknown, instructions: unknown) => archive.sectionRevisions.preview(id, expected, start, instructions))
  handle('archive:section-apply', (_event, id: string, token: unknown) => archive.sectionRevisions.apply(id, token))
  handle('archive:section-restore', (_event, id: string) => archive.sectionRevisions.restore(id))
  handle('archive:phrase-status', () => offlineTranslation.status())
  handle('archive:battery-status', () => readBatteryStatus(powerMonitor.isOnBatteryPower()))
  handle('archive:ambient-status', () => ambientSounds.status())
  handle('archive:ambient-install', (_event, soundIds: unknown) =>
    ambientSounds.install(soundIds)
  )
  handle('archive:ambient-read', (_event, id: unknown) =>
    ambientSounds.read(String(id || ''))
  )
  handle('archive:spotify-connection', () => spotify.status())
  handle('archive:spotify-configure', (_event, clientId: unknown) => spotify.configure(clientId))
  handle('archive:spotify-connect', () => spotify.login())
  handle('archive:spotify-disconnect', () => spotify.disconnect())
  handle('archive:spotify-devices', () => spotify.devices())
  handle('archive:spotify-playback', () => spotify.playback())
  handle('archive:spotify-command', (_event, command: unknown, deviceId: unknown, argument: unknown) => spotify.command(command, deviceId, argument))
  handle('archive:spotify-library-connect', () => spotify.login(true))
  handle('archive:spotify-device', (_event, deviceId: unknown) => spotify.selectDevice(deviceId))
  handle('archive:spotify-library', (_event, kind: unknown, offset: unknown) => spotify.library(kind, offset))
  handle('archive:spotify-play-item', (_event, uri: unknown, deviceId: unknown) => spotify.playItem(uri, deviceId))
  handle('archive:spotify-open-item', (_event, uri: unknown) => shell.openExternal(spotifyItemUrl(uri)))
  handle('archive:spotify-open', () => shell.openExternal('spotify:'))
  handle('archive:open-compilation', (_event, videoId: unknown, start: unknown) => shell.openExternal(compilationUrl(videoId, start)))
  handle('archive:phrase-install', () => offlineTranslation.install())
  handle('archive:phrase-translate', (_event, text: unknown, direction: unknown) => offlineTranslation.translate(text, direction))
  handle('archive:import-files', () => archive.selectAndImportFiles())
  handle('archive:import-folder', () => archive.selectAndImportFolder())
  handle('archive:select-videos', () => archive.selectVideos())
  handle('archive:convert-videos', (_event, sessionId: string, orderedIds: unknown) => archive.convertVideos(sessionId, orderedIds))
  handle('archive:save-video-import', (_event, sessionId: string, destination: unknown) => archive.saveVideoImport(sessionId, destination))
  handle('archive:cancel-video-import', (_event, sessionId: string) => archive.cancelVideoImport(sessionId))
  handle('archive:read-transcript', (_event, id: string) =>
    archive.readTranscript(id)
  )
  handle('archive:attach-transcript', (_event, id: string) =>
    archive.attachTranscript(id)
  )
  handle('archive:read-markdown', (_event, id: string) =>
    archive.readMarkdown(id)
  )
  handle(
    'archive:save-markdown',
    (_event, id: string, content: unknown) => archive.saveMarkdown(id, content)
  )
  handle(
    'archive:update-lecture',
    (_event, id: string, updates: unknown) =>
      archive.updateLecture(id, updates)
  )
  handle('archive:rename-lecture-titles', (_event, id: string, titles: unknown) => archive.renameLectureTitles(id, titles))
  handle('archive:delete-lecture', (_event, id: string) =>
    archive.deleteLecture(id)
  )
  handle('archive:search-fulltext', (_event, query: string) =>
    archive.searchFullText(query)
  )
  handle('archive:get-settings', () => archive.getSettings())
  handle('archive:publish-lectures', () => archive.publishLectures())
  handle('archive:get-publishing-status', () => archive.getPublishingStatus())
  handle(
    'archive:save-settings',
    (_event, settings: unknown) => archive.saveSettings(settings)
  )
  handle('archive:test-api-key', (_event, apiKey: string) =>
    archive.testApiKey(apiKey)
  )
  handle('archive:generate-lecture-notes', (_event, id: string, jobId?: string) =>
    archive.generateLectureNotes(id, jobId)
  )
  handle('archive:generate-selected', (_event, lectureIds: string[], jobId?: string) =>
    archive.generateSelectedNotes(lectureIds, jobId)
  )
  handle('archive:sync-library', () => archive.scanAndSyncLibrary())
  handle('archive:open-folder', () => archive.openLibraryFolder())
  handle('archive:transcribe-audio', (_event, id: string, jobId?: string) =>
    archive.transcribeAudio(id, jobId)
  )
  handle('archive:read-markdown-en', (_event, id: string) =>
    archive.readMarkdownEn(id)
  )
  handle('archive:translate-lecture-notes', (_event, id: string, jobId?: string) =>
    archive.translateLectureNotes(id, jobId)
  )
  handle(
    'archive:translate-selected-notes',
    (_event, lectureIds: string[], jobId?: string) =>
      archive.translateSelectedNotes(lectureIds, jobId)
  )
  handle('archive:get-translation-candidates', () =>
    archive.getTranslationCandidates()
  )
  handle('archive:get-pipeline-status', () =>
    archive.getArchivePipelineStatus()
  )
  handle('archive:start-pipeline', () => archive.startArchivePipeline())
  handle('archive:resume-pipeline', () => archive.resumeArchivePipeline())
  handle('archive:stop-pipeline', () =>
    archive.requestArchivePipelineStop()
  )
  handle('archive:get-course-stats', () => archive.getCourseStats())
  handle('archive:read-course-info', (_event, code: string) =>
    archive.readCourseInfo(code)
  )
  handle('archive:read-study-set', (_event, id: string) =>
    archive.readStudySet(id)
  )
  handle('archive:generate-study-set', (_event, id: string) =>
    archive.generateStudySet(id)
  )
  handle('archive:load-qna', (_event, id: string) =>
    archive.loadQnaThreads(id)
  )
  handle('archive:save-qna', (_event, id: string, threads: unknown) =>
    archive.saveQnaThreads(id, threads)
  )
  handle(
    'archive:generate-qna',
    (_event, id: string, thread: unknown, useFullContext: unknown, includeOtherQna: unknown = false, responseLength: unknown = 'brief', searchOnline: unknown = false, thinkDeeper: unknown = false) =>
      archive.generateQnaResponse(id, thread, useFullContext, includeOtherQna, responseLength, searchOnline, thinkDeeper)
  )
  handle('archive:save-qna-image', (_event, lectureId: string, threadId: string, input: unknown) => archive.saveQnaImage(lectureId, threadId, input))
  handle('archive:list-qna-images', () => archive.qnaImages.list())
  handle('archive:read-qna-image', (_event, id: unknown) => archive.qnaImages.read(id))
  handle('archive:delete-qna-images', (_event, selection: unknown) => archive.qnaImages.remove(selection))
  handle(
    'archive:save-study-session',
    (_event, session: unknown) => archive.saveStudySession(session)
  )
  handle('archive:get-study-analytics', () =>
    archive.getStudyAnalytics()
  )
  handle('archive:get-study-time-removal-targets', () => archive.getStudyTimeRemovalTargets())
  handle('study:observe', (_, batch) => archive.saveStudyObservations(batch))
  handle('study:predict', (_, request) => archive.recordStudyPrediction(request))
  handle('study:reset', (_, lectureId, sessionId) => archive.resetStudyForecast(lectureId, sessionId))
  handle('study:day', (_, date, filter) => archive.getStudyDay(date, filter))
  handle('study:legacy', (_, data) => archive.studyHistory.importLegacy(data))
  handle('archive:remove-study-time', (_event, targetId: unknown, minutes: unknown) => archive.removeStudyTime(targetId, minutes))
  handle('archive:get-lecture-study-seconds', (_event, lectureId: unknown, excludedSessionId: unknown) =>
    archive.getLectureStudySeconds(lectureId, excludedSessionId)
  )
  handle(
    'archive:add-manual-study-time',
    (_event, courseCode: unknown, minutes: unknown, date?: unknown, time?: unknown) =>
      archive.addManualStudyTime(courseCode, minutes, date, time)
  )
  handle('archive:get-courses', () => archive.getCourses())
  handle(
    'archive:save-course',
    (_event, course: unknown, oldCode?: unknown) =>
      archive.saveCourse(course, oldCode)
  )
  handle(
    'archive:delete-course',
    (_event, code: string, options?: unknown) =>
      archive.deleteCourse(code, options)
  )
  handle(
    'archive:match-lecture-to-course',
    (_event, recordedAt: string, durationSeconds: number) =>
      archive.matchLectureToCourse(recordedAt, durationSeconds)
  )
  handle(
    'archive:auto-assign-courses',
    (_event, lectureIds?: string[], minConfidence?: number) =>
      archive.autoAssignCoursesBySchedule(lectureIds, minConfidence)
  )
  handle('archive:detect-usb-recorder', () =>
    archive.detectUsbRecorder()
  )
  handle(
    'archive:import-usb-recorder-files',
    (_event, items: UsbImportItemSelection[]) =>
      archive.importUsbRecorderFiles(items)
  )
  handle(
    'archive:delete-usb-recorder-files',
    (_event, filePaths: string[]) => archive.deleteUsbRecorderFiles(filePaths)
  )
  handle('archive:get-archived-courses', () => archive.getArchivedCourseCodes())
  handle('archive:set-course-archived', (_event, code: unknown, archived: unknown) =>
    archive.setCourseArchived(code, archived)
  )
  handle('archive:get-scratchpad', () => archive.getScratchpad())
  handle('archive:save-scratchpad', (_event, data: unknown) =>
    archive.saveScratchpad(data)
  )
  handle('archive:get-reminders', () => archive.getReminders())
  handle('exam-reminders:get', event => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Accesso non consentito.')
    return examReminders.poll().catch(() => { throw new Error('Impossibile leggere i promemoria esami. Riprova fra un minuto.') })
  })
  handle('exam-reminders:dismiss', (event, id) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Accesso non consentito.')
    return examReminders.dismiss(id).catch(() => { throw new Error('Impossibile salvare il promemoria. Il precedente resta conservato.') })
  })
  handle('archive:save-reminders', (_event, reminders: unknown) =>
    archive.saveReminders(reminders)
  )
  handle('archive:get-highlights', (_event, lectureId: string) =>
    archive.getHighlights(lectureId)
  )
  handle(
    'archive:save-highlights',
    (_event, lectureId: string, highlights: unknown) =>
      archive.saveHighlights(lectureId, highlights)
  )
  handle('archive:print-notes', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.webContents.print({ silent: false, printBackground: true })
    }
  })
  handle('archive:get-app-logs', () => archive.getAppLogs())
  handle('archive:get-app-log-day', (_event, day: unknown) => logger.getLogDay(day))
  handle('archive:clear-app-logs', () => archive.clearAppLogs())
  handle(
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
    const supportedUpdates = app.isPackaged && process.platform === 'win32' &&
      !process.env.PORTABLE_EXECUTABLE_FILE && existsSync(join(process.resourcesPath, 'app-update.yml'))
    const nativeUpdater = supportedUpdates ? new electronUpdater.NsisUpdater({
      provider: 'github', owner: 'giovannistefanuto', repo: 'Lezionify', private: false
    }) : null
    appUpdates = new AppUpdateService(nativeUpdater, app.getVersion(), state => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:state-changed', state)
    }, async () => {
      updateGate.lock(archive.isBusyForUpdate() || courseRag.isBusy())
      archive.setUpdating(true)
      await mainWindow?.webContents.session.flushStorageData()
      await logger.flush()
    }, () => { updateGate.unlock(); archive.setUpdating(false) }, join(app.getPath('userData'), 'app-update-receipt.json'))
    await appUpdates.initialize()
    const assertUpdateSender = (event: Electron.IpcMainInvokeEvent) => {
      const expected = process.env.ELECTRON_RENDERER_URL ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href
      if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== expected) {
        throw new Error('Richiesta aggiornamento non autorizzata.')
      }
    }
    ipcMain.handle('update:state', event => {
      assertUpdateSender(event)
      if (!updateStarted) {
        updateStarted = true
        // The first renderer subscription has been installed before requesting state.
        setTimeout(() => { void appUpdates.check() }, 1500).unref()
      }
      return appUpdates.getState()
    })
    ipcMain.handle('update:check', event => { assertUpdateSender(event); return appUpdates.check() })
    ipcMain.handle('update:download', event => { assertUpdateSender(event); return appUpdates.download() })
    ipcMain.handle('update:install', event => { assertUpdateSender(event); return appUpdates.install() })
    ipcMain.handle('update:acknowledge', event => { assertUpdateSender(event); return appUpdates.acknowledge() })
    ipcMain.handle('update:releases', event => { assertUpdateSender(event); return shell.openExternal(APP_RELEASES_URL) })
    createWindow()
    const checkExams = () => { void updateGate.run(() => examReminders.poll()).catch(() => logger.warn('exam-reminders', 'Controllo promemoria esami non completato.')) }
    checkExams()
    examReminderTimer = setInterval(checkExams, 60_000)
    examReminderTimer.unref()
    powerMonitor.on('resume', checkExams)
    void updateGate.run(() => courseRag.syncEnabled()).catch(() => {})
    courseRagTimer = setInterval(() => { void updateGate.run(() => courseRag.syncEnabled()).catch(() => {}) }, 5 * 60_000)
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
  clearInterval(examReminderTimer)
  courseRag?.dispose()
  if (process.platform !== 'darwin') { archive.destroy(); void archive.collections.stop().finally(() => app.quit()) }
})

app.on('before-quit', event => {
  if (archive.collections.isBusy()) {
    event.preventDefault()
    void archive.collections.stop().finally(() => app.quit())
  }
})
