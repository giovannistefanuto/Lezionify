import { BrowserWindow, dialog } from 'electron'
import { randomUUID } from 'node:crypto'
import { writeFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { Lecture } from '../../shared/archive'
import { lectureTitle } from '../../shared/lectureTitles'
import {
  pdfExportFileName,
  validatePdfExportRequest,
  type PdfExportDocument,
  type PdfExportResult
} from '../../shared/pdfExport'

interface NotesSource {
  listLectures: () => Promise<Lecture[]>
  readMarkdown: (id: string) => Promise<string | null>
  readMarkdownEn: (id: string) => Promise<string | null>
}

class PdfSelectionError extends Error {}

export async function preparePdfExport(
  source: NotesSource,
  value: unknown
): Promise<PdfExportDocument> {
  const request = validatePdfExportRequest(value)
  const all = await source.listLectures()
  if (
    request.kind === 'course' &&
    request.lectureIds?.some(
      (id) =>
        !all.some(
          (lecture) =>
            lecture.id === id &&
            (lecture.courseCode ?? 'Senza corso') === request.courseCode
        )
    )
  )
    throw new PdfSelectionError(
      'La selezione contiene lezioni non più disponibili in questo corso. Riapri Esporta.'
    )
  const lectures = all
    .filter((lecture) =>
      request.kind === 'lecture'
        ? lecture.id === request.lectureId
        : (lecture.courseCode ?? 'Senza corso') === request.courseCode &&
          (request.lectureIds
            ? request.lectureIds.includes(lecture.id)
            : request.includeLaboratory === true || !lecture.isLaboratory)
    )
    .sort(
      (a, b) =>
        (a.recordedAt ?? a.importedAt).localeCompare(
          b.recordedAt ?? b.importedAt
        ) || a.id.localeCompare(b.id)
    )
  if (!lectures.length)
    throw new PdfSelectionError('Nessuna lezione disponibile per questo PDF.')
  const entries = []
  for (const lecture of lectures) {
    // A missing file is reported in the document; IO errors abort rather than silently omit notes.
    const markdown =
      request.language === 'en'
        ? await source.readMarkdownEn(lecture.id)
        : await source.readMarkdown(lecture.id)
    entries.push({
      id: lecture.id,
      title:
        lectureTitle(lecture, request.language, markdown) ||
        lecture.courseCode ||
        'Lezione',
      date: lecture.recordedAt ?? lecture.importedAt,
      markdown: markdown?.trim() ? markdown : null
    })
  }
  if (!entries.some((entry) => entry.markdown))
    throw new PdfSelectionError(
      'Nessuna dispensa disponibile nella lingua scelta.'
    )
  return {
    title: request.kind === 'course' ? request.courseCode : entries[0].title,
    language: request.language,
    lectures: entries
  }
}

/** Data is sent only to our hidden renderer; no HTML or output paths are accepted over IPC. */
export class PdfExportService {
  private active: {
    window: BrowserWindow
    token: string
    document: PdfExportDocument
    ready: (failed: boolean) => void
  } | null = null
  private busy = false

  constructor(
    private source: NotesSource,
    private rendererFile: string,
    private preloadFile: string,
    private devUrl?: string
  ) {}

  private assertSender(event: Electron.IpcMainInvokeEvent, token: unknown) {
    const active = this.active
    if (
      !active ||
      token !== active.token ||
      event.sender !== active.window.webContents ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw new Error('Esportazione PDF non autorizzata.')
    return active
  }
  getDocument(
    event: Electron.IpcMainInvokeEvent,
    token: unknown
  ): PdfExportDocument {
    return this.assertSender(event, token).document
  }
  ready(
    event: Electron.IpcMainInvokeEvent,
    token: unknown,
    failed: unknown
  ): void {
    this.assertSender(event, token).ready(failed !== false)
  }

  async export(
    value: unknown,
    parent: BrowserWindow
  ): Promise<PdfExportResult> {
    if (this.busy) throw new Error('Una esportazione PDF è già in corso.')
    this.busy = true
    let window: BrowserWindow | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const document = await preparePdfExport(this.source, value)
      const missingCount = document.lectures.filter(
        (lecture) => !lecture.markdown
      ).length
      const selection = await dialog.showSaveDialog(parent, {
        title: 'Salva PDF con nome',
        defaultPath: pdfExportFileName(
          validatePdfExportRequest(value),
          document
        ),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (selection.canceled || !selection.filePath)
        return { canceled: true, missingCount }
      window = new BrowserWindow({
        show: false,
        width: 794,
        height: 1123,
        webPreferences: {
          partition: 'pdf-export',
          preload: this.preloadFile,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
          backgroundThrottling: false
        }
      })
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      // Documents must remain local, including Markdown images and links.
      window.webContents.session.webRequest.onBeforeRequest(
        { urls: ['http://*/*', 'https://*/*'] },
        (details, callback) => {
          const localDev =
            this.devUrl &&
            new URL(details.url).origin === new URL(this.devUrl).origin
          callback({ cancel: !localDev })
        }
      )
      const token = randomUUID()
      const rendered = new Promise<void>((resolve, reject) => {
        this.active = {
          window: window!,
          token,
          document,
          ready: (failed) =>
            failed
              ? reject(new Error('Impossibile preparare il PDF.'))
              : resolve()
        }
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'La preparazione del PDF ha superato il tempo disponibile.'
              )
            ),
          120_000
        )
        window!.once('closed', () =>
          reject(new Error('Esportazione PDF interrotta.'))
        )
      })
      // Attach a rejection handler before loading, which can itself fail.
      void rendered.catch(() => {})
      if (this.devUrl) {
        const url = new URL(this.devUrl)
        url.searchParams.set('pdfExport', token)
        await window.loadURL(url.href)
      } else
        await window.loadFile(this.rendererFile, {
          query: { pdfExport: token }
        })
      await rendered
      clearTimeout(timer)
      const pdf = await window.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0.6, bottom: 0.6, left: 0.55, right: 0.55 },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="font-size:9px;text-align:center;width:100%;color:#555"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
      })
      const temporary = join(selection.filePath + `.${randomUUID()}.tmp`)
      try {
        await writeFile(temporary, pdf, { flag: 'wx' })
        await rename(temporary, selection.filePath)
      } finally {
        await unlink(temporary).catch(() => {})
      }
      return { canceled: false, missingCount }
    } catch (error) {
      if (error instanceof PdfSelectionError) throw error
      // Omit private filesystem causes from errors crossing IPC.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(
        'Esportazione PDF non riuscita. Verifica la dispensa, la cartella di destinazione e riprova.'
      )
    } finally {
      clearTimeout(timer)
      this.active = null
      if (window && !window.isDestroyed()) window.destroy()
      this.busy = false
    }
  }
}
