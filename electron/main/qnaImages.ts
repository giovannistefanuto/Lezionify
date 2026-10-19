import { mkdir, readdir, readFile, unlink, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { atomicWrite } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { isQnaImageId, QNA_IMAGE_LIMIT, QNA_IMAGE_MAX_BYTES, validateQnaImageIds, type QnaImage, type QnaImageDeletion } from '../../shared/qnaImages'
import { parseLocalCalendarDate, formatLocalCalendarDate } from '../../shared/calendarDate'

/** Immutable PNG snapshots; no source paths, remote URL or study text in metadata. */
export class QnaImageStore {
  private readonly mutex = new AsyncMutex()
  private readonly directory: string
  constructor(root: string, private decode: (bytes: Buffer) => { width: number; height: number }) { this.directory = join(root, 'qna-images') }
  private file(id: unknown, suffix: string) {
    if (!isQnaImageId(id)) throw new Error('Immagine non valida.')
    return join(this.directory, id + suffix)
  }
  async list(): Promise<QnaImage[]> {
    let files: string[]
    try { files = await readdir(this.directory) } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      // Keep private paths out of IPC error causes.
      // eslint-disable-next-line preserve-caught-error
      throw new Error('Archivio immagini non disponibile.')
    }
    const images: QnaImage[] = []
    for (const name of files.filter(name => name.endsWith('.json') && isQnaImageId(name.slice(0, -5)))) {
      try {
        const value = JSON.parse(await readFile(join(this.directory, name), 'utf8')) as QnaImage
        if (value.id !== name.slice(0, -5) || typeof value.lectureId !== 'string' || typeof value.threadId !== 'string' || !parseLocalCalendarDate(value.day) || !Number.isInteger(value.page) || value.page < 1 || value.byteSize < 1 || value.byteSize > QNA_IMAGE_MAX_BYTES || !/^[a-f0-9]{64}$/.test(value.sha256)) throw new Error()
        images.push(value)
      } catch { throw new Error('Un elemento dell’archivio immagini non è leggibile.') }
    }
    return images.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async put(lectureId: string, threadId: string, input: unknown): Promise<QnaImage> {
    if (typeof lectureId !== 'string' || typeof threadId !== 'string' || !/^[\w-]{1,160}$/.test(lectureId) || !/^[\w-]{1,160}$/.test(threadId) || !input || typeof input !== 'object') throw new Error('Allegato non valido.')
    const { page, data } = input as { page?: unknown; data?: unknown }
    if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > 10000 || typeof data !== 'string' || data.length > Math.ceil(QNA_IMAGE_MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('Immagine troppo grande o non valida: massimo 2 MB per pagina.')
    const bytes = Buffer.from(data, 'base64')
    if (!bytes.length || bytes.toString('base64') !== data || bytes.length > QNA_IMAGE_MAX_BYTES || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('È richiesta una pagina PNG valida.')
    // Reject decompression bombs before asking the platform decoder to read pixels.
    const width = bytes.length >= 24 ? bytes.readUInt32BE(16) : 0
    const height = bytes.length >= 24 ? bytes.readUInt32BE(20) : 0
    if (!width || !height || width > 4096 || height > 4096 || width * height > 8_000_000) throw new Error('Dimensioni della pagina non valide.')
    const decoded = this.decode(bytes)
    if (decoded.width !== width || decoded.height !== height) throw new Error('Immagine PNG non leggibile.')
    return this.mutex.runExclusive(async () => {
      await mkdir(this.directory, { recursive: true })
      const now = new Date()
      const image: QnaImage = { id: randomUUID(), lectureId, threadId, page: page as number, width, height, byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: now.toISOString(), day: formatLocalCalendarDate(now) }
      try {
        const temporary = this.file(image.id, '.png.tmp')
        try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, this.file(image.id, '.png')) }
        finally { await unlink(temporary).catch(() => {}) }
        await atomicWrite(this.file(image.id, '.json'), JSON.stringify(image))
      } catch { await unlink(this.file(image.id, '.png')).catch(() => {}); throw new Error('Impossibile salvare la pagina nell’archivio locale.') }
      return image
    })
  }
  async read(id: unknown): Promise<{ image: QnaImage; data: string }> {
    const file = this.file(id, '.png')
    try {
      const image = (await this.list()).find(image => image.id === id)
      if (!image) throw new Error()
      const bytes = await readFile(file)
      if (bytes.length !== image.byteSize || createHash('sha256').update(bytes).digest('hex') !== image.sha256) throw new Error()
      return { image, data: bytes.toString('base64') }
    } catch { throw new Error('Una slide allegata è stata cancellata o non è disponibile. Rimuovila dagli allegati attivi o aggiungila di nuovo prima di inviare.') }
  }
  async forRequest(ids: unknown, lectureId: string, threadId: string) {
    validateQnaImageIds(ids)
    if ((ids?.length ?? 0) > QNA_IMAGE_LIMIT) throw new Error('Troppe slide allegate.')
    const images = await Promise.all((ids ?? []).map(id => this.read(id)))
    if (images.some(({ image }) => image.lectureId !== lectureId || image.threadId !== threadId)) throw new Error('Gli allegati non appartengono a questa conversazione.')
    return images.map(({ image, data }) => ({ page: image.page, mimeType: 'image/png' as const, data }))
  }
  async remove(selection: unknown): Promise<number> {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection) || Object.keys(selection).length !== 1) throw new Error('Selezione immagini non valida.')
    const value = selection as QnaImageDeletion
    if (!('all' in value && value.all === true) && !('id' in value && isQnaImageId(value.id)) && !('day' in value && typeof value.day === 'string' && parseLocalCalendarDate(value.day))) throw new Error('Selezione immagini non valida.')
    return this.mutex.runExclusive(async () => {
      const selected = (await this.list()).filter(image => 'all' in value || ('id' in value && image.id === value.id) || ('day' in value && image.day === value.day))
      for (const image of selected) {
        try { await unlink(this.file(image.id, '.png')).catch(error => { if (error.code !== 'ENOENT') throw error }); await unlink(this.file(image.id, '.json')) } catch { throw new Error('Cancellazione immagini non completata. Aggiorna l’elenco e riprova.') }
      }
      return selected.length
    })
  }
  async removeThread(lectureId: string, threadId: string): Promise<void> {
    for (const image of await this.list()) if (image.lectureId === lectureId && image.threadId === threadId) await this.remove({ id: image.id })
  }
}
