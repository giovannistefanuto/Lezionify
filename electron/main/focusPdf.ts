import { randomUUID } from 'node:crypto'
import { open, readdir, realpath, stat } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { Readable } from 'node:stream'
import { atomicWrite, readRecoverable } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { parseByteRange } from './httpRange'
import type { FocusPdfDocument } from '../../shared/archive'

interface PdfPreferences { folder?: string; lectures: Record<string, string> }
export type PdfPicker = (defaultPath?: string) => Promise<string | null>

/** Only native selections and their saved associations grant access. Never writes to sources. */
export class FocusPdfService {
  private documents = new Map<string, string>()
  private mutex = new AsyncMutex()

  constructor(private preferencesFile: string, private home: string, private pick: PdfPicker, private allowedOrigin = 'null') {}

  private validateLecture(id: unknown): asserts id is string {
    if (typeof id !== 'string' || !/^[\w-]{1,160}$/.test(id)) throw new Error('Lezione non valida.')
  }

  private async preferences(): Promise<PdfPreferences> {
    try {
      const value = JSON.parse(await readRecoverable(this.preferencesFile)) as PdfPreferences
      if (!value || typeof value.lectures !== 'object' || Array.isArray(value.lectures) || !value.lectures ||
        Object.values(value.lectures).some(path => typeof path !== 'string' || !isAbsolute(path)) ||
        (value.folder !== undefined && (typeof value.folder !== 'string' || !isAbsolute(value.folder)))) throw new Error()
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { lectures: {} }
      // Deliberately omit the filesystem cause to keep private paths out of IPC/logs.
      // eslint-disable-next-line preserve-caught-error
      throw new Error('Impossibile leggere le associazioni PDF locali.')
    }
  }

  private async defaultFolder(): Promise<string | undefined> {
    // Metadata only: no PDF is opened or downloaded during discovery.
    try {
      const roots = (await readdir(this.home, { withFileTypes: true }))
        .filter(entry => entry.isDirectory() && /^onedrive\b/i.test(entry.name))
      for (const root of roots) {
        const base = join(this.home, root.name)
        const folders = (await readdir(base, { withFileTypes: true }))
          .filter(entry => entry.isDirectory() && /^notability/i.test(entry.name))
        if (folders.length === 1) return join(base, folders[0].name)
      }
    } catch { /* Native picker remains available when OneDrive is unavailable. */ }
    return undefined
  }

  private async grant(path: string): Promise<FocusPdfDocument> {
    try {
      if (!isAbsolute(path) || extname(path).toLowerCase() !== '.pdf') throw new Error()
      const resolved = await realpath(path)
      if (!(await stat(resolved)).isFile()) throw new Error()
      const id = randomUUID()
      this.documents.set(id, resolved)
      return { id, name: basename(path), url: `slides://pdf/${id}` }
    } catch { throw new Error('PDF non disponibile. Controlla OneDrive e scegli nuovamente il file.') }
  }

  /** Trusted main-process grant for a document selected through the course source module. */
  async grantCourseSource(path: string): Promise<FocusPdfDocument> { return this.grant(path) }

  async get(lectureId: unknown): Promise<FocusPdfDocument | null> {
    this.validateLecture(lectureId)
    const preferences = await this.preferences()
    if (!Object.hasOwn(preferences.lectures, lectureId)) return null
    return this.grant(preferences.lectures[lectureId])
  }

  async select(lectureId: unknown): Promise<FocusPdfDocument | null> {
    this.validateLecture(lectureId)
    return this.mutex.runExclusive(async () => {
      const preferences = await this.preferences()
      let selected: string | null
      try { selected = await this.pick(preferences.folder ?? await this.defaultFolder()) }
      catch { throw new Error('Impossibile aprire la selezione PDF.') }
      if (!selected) return null
      const document = await this.grant(selected)
      Object.defineProperty(preferences.lectures, lectureId, { value: selected, enumerable: true, configurable: true, writable: true })
      preferences.folder = dirname(selected)
      try { await atomicWrite(this.preferencesFile, JSON.stringify(preferences)) }
      catch { this.release(document.id); throw new Error('Impossibile ricordare il PDF nel profilo locale.') }
      return document
    })
  }

  release(id: unknown): void { if (typeof id === 'string') this.documents.delete(id) }

  async response(request: Request): Promise<Response> {
    const respond = (body: string | null, status: number, extra: Record<string, string> = {}) => new Response(body, { status, headers: { 'Access-Control-Allow-Origin': this.allowedOrigin, ...extra } })
    if (request.method !== 'GET' && request.method !== 'HEAD') return respond(null, 405)
    const url = new URL(request.url)
    const path = url.protocol === 'slides:' && url.hostname === 'pdf' && !url.search ? this.documents.get(url.pathname.slice(1)) : undefined
    if (!path) return respond('PDF non autorizzato', 404)
    let handle: Awaited<ReturnType<typeof open>> | undefined
    try {
      handle = await open(path, 'r') // OneDrive hydration happens here, only after an explicit open.
      const size = (await handle.stat()).size
      const signature = Buffer.alloc(5)
      await handle.read(signature, 0, 5, 0)
      if (signature.toString('ascii') !== '%PDF-') throw new Error()
      if (request.signal.aborted) throw new Error()
      const headers = new Headers({ 'Content-Type': 'application/pdf', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': this.allowedOrigin, 'Access-Control-Expose-Headers': 'Accept-Ranges,Content-Length,Content-Range' })
      const rangeHeader = request.headers.get('range')
      const range = rangeHeader ? parseByteRange(rangeHeader, size) : null
      if (rangeHeader && !range) {
        await handle.close(); handle = undefined
        return respond(null, 416, { 'Content-Range': `bytes */${size}` })
      }
      const start = range?.start ?? 0
      const end = range?.end ?? size - 1
      headers.set('Content-Length', String(end - start + 1))
      if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
      if (request.method === 'HEAD') {
        await handle.close(); handle = undefined
        return new Response(null, { status: range ? 206 : 200, headers })
      }
      const stream = handle.createReadStream({ start, end, autoClose: true })
      handle = undefined
      const abort = () => stream.destroy()
      request.signal.addEventListener('abort', abort, { once: true })
      stream.once('close', () => request.signal.removeEventListener('abort', abort))
      return new Response(Readable.toWeb(stream) as unknown as BodyInit, { status: range ? 206 : 200, headers })
    } catch {
      await handle?.close().catch(() => {})
      return respond('Impossibile leggere il PDF. Controlla OneDrive e riprova.', 503)
    }
  }
}
