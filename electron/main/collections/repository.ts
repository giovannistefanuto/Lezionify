import { mkdir, readdir, readFile, copyFile, stat, rename } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { atomicWrite, readRecoverable } from '../atomicFile'
import { AsyncMutex } from '../asyncMutex'
import { COLLECTION_MODES, sortCollectionItems, type CollectionDefinition, type CollectionItem, type CollectionImportRequest, type CollectionItemUpdates, type CollectionGeneration, type CollectionMode, type CollectionFileSelection } from '../../../shared/collections'
import { hashText } from './profiles'

export function collectionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) throw new Error('Identificativo non valido.')
  return value
}
export function collectionText(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || value.includes('\0')) throw new Error('Testo non valido o troppo lungo.')
  return value
}
export function collectionMode(value: unknown): CollectionMode {
  if (typeof value !== 'string' || !Object.hasOwn(COLLECTION_MODES, value)) throw new Error('Modalità non valida.')
  return value as CollectionMode
}
function itemUpdates(value: CollectionItemUpdates): CollectionItemUpdates {
  if (!value || typeof value !== 'object') throw new Error('Impostazioni non valide.')
  const title = collectionText(value.title, 500).trim()
  if (!title) throw new Error('Inserisci un titolo.')
  const recordedAt = value.recordedAt
  if (recordedAt !== null && (typeof recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(recordedAt) || !Number.isFinite(Date.parse(recordedAt)) || new Date(recordedAt).toISOString().slice(0, 10) !== recordedAt)) throw new Error('Data non valida.')
  const sourceUrl = collectionText(value.sourceUrl, 3000).trim()
  if (sourceUrl) {
    try { if (!['https:', 'http:'].includes(new URL(sourceUrl).protocol)) throw new Error() } catch { throw new Error('Collegamento non valido.') }
  }
  return { title, recordedAt, sourceUrl, mode: value.mode === null ? null : collectionMode(value.mode), instructions: value.instructions === null ? null : collectionText(value.instructions, 20000) }
}
export async function checksumFile(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
export async function readCollectionText(file: string): Promise<string> {
  const bytes = await readFile(file)
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) } catch {
    throw new Error('Il testo deve essere codificato in UTF-8. Originale conservato.')
  }
}
const MEDIA_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.mp4', '.m4v', '.mkv', '.mov', '.avi', '.webm', '.wmv', '.mpeg', '.mpg', '.mts', '.m2ts', '.ts', '.3gp', '.ogv', '.vob', '.flv'])
const TEXT_EXTENSIONS = new Set(['.txt', '.md'])
interface NativeFile { id: string; path: string; name: string; byteSize: number; kind: 'media' | 'text'; extension: string }

/** Owns collection data only. Item metadata is authoritative; no course index is touched. */
export class CollectionsRepository {
  readonly directory: string
  readonly mutex = new AsyncMutex()
  private selections = new Map<string, NativeFile[]>()
  constructor(root: string) { this.directory = join(root, 'collections') }
  itemDirectory(id: string) { return join(this.directory, 'items', collectionId(id)) }
  async initialize() { await mkdir(join(this.directory, 'items'), { recursive: true }) }
  private async json<T>(file: string, fallback?: T): Promise<T> {
    try { return JSON.parse(await readRecoverable(file)) as T } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && fallback !== undefined) return fallback
      throw error
    }
  }
  async collections(): Promise<CollectionDefinition[]> {
    const data = await this.json<{ version: number; collections: CollectionDefinition[] }>(join(this.directory, 'index.json'), { version: 1, collections: [] })
    if (data.version !== 1 || !Array.isArray(data.collections)) throw new Error('Archivio raccolte non compatibile.')
    for (const c of data.collections) {
      collectionId(c.id); collectionMode(c.mode); collectionText(c.name, 500); collectionText(c.instructions, 20000)
      if (typeof c.archived !== 'boolean') throw new Error('Raccolta non valida.')
    }
    return data.collections
  }
  async saveCollection(value: Pick<CollectionDefinition, 'name' | 'mode' | 'instructions' | 'archived'> & { id?: string }): Promise<CollectionDefinition> {
    return this.mutex.runExclusive(async () => {
      await this.initialize()
      const collections = await this.collections()
      const name = collectionText(value?.name, 500).trim()
      if (!name || typeof value.archived !== 'boolean') throw new Error('Nome o stato della raccolta non valido.')
      const existing = value.id === undefined ? undefined : collections.find(c => c.id === collectionId(value.id))
      if (value.id !== undefined && !existing) throw new Error('Raccolta non trovata.')
      const c: CollectionDefinition = { id: existing?.id ?? randomUUID(), name, mode: collectionMode(value.mode), instructions: collectionText(value.instructions, 20000), archived: value.archived, createdAt: existing?.createdAt ?? new Date().toISOString() }
      await atomicWrite(join(this.directory, 'index.json'), JSON.stringify({ version: 1, collections: [...collections.filter(row => row.id !== c.id), c] }))
      return c
    })
  }
  async items(): Promise<CollectionItem[]> {
    await this.initialize()
    const items: CollectionItem[] = []
    for (const entry of await readdir(join(this.directory, 'items'), { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      collectionId(entry.name)
      const item = await this.item(entry.name)
      items.push(item)
    }
    return sortCollectionItems(items)
  }
  async item(id: string): Promise<CollectionItem> {
    const item = await this.json<CollectionItem>(join(this.itemDirectory(id), 'metadata.json'))
    if (item.id !== id || !Array.isArray(item.sources)) throw new Error('Contenuto non valido.')
    collectionId(item.collectionId); itemUpdates(item)
    if (item.currentGeneration !== null) collectionId(item.currentGeneration)
    for (const source of item.sources) {
      collectionId(source.id)
      if (!MEDIA_EXTENSIONS.has(source.extension) && !TEXT_EXTENSIONS.has(source.extension)) throw new Error('Formato sorgente non valido.')
      if (!['media', 'text'].includes(source.kind) || !/^[a-f0-9]{64}$/.test(source.checksum)) throw new Error('Fonte non valida.')
    }
    return item
  }
  async writeItem(item: CollectionItem) { await atomicWrite(join(this.itemDirectory(item.id), 'metadata.json'), JSON.stringify(item)) }
  async updateItem(id: string, updates: CollectionItemUpdates) {
    return this.mutex.runExclusive(async () => {
      const item = { ...await this.item(id), ...itemUpdates(updates) }
      await this.writeItem(item)
      return item
    })
  }
  async selectFiles(paths: string[]): Promise<CollectionFileSelection> {
    if (!paths.length || paths.length > 100) throw new Error('Scegli da uno a cento file.')
    const files: NativeFile[] = []
    for (const path of paths) {
      const extension = extname(path).toLowerCase()
      const kind = TEXT_EXTENSIONS.has(extension) ? 'text' : MEDIA_EXTENSIONS.has(extension) ? 'media' : null
      if (!kind) throw new Error('Formato non supportato. Scegli audio, video, TXT o Markdown.')
      const info = await stat(path)
      if (!info.isFile() || !info.size || (kind === 'text' && info.size > 10_000_000)) throw new Error('File vuoto, non valido o testo oltre 10 MB.')
      files.push({ id: randomUUID(), path, name: basename(path), extension, byteSize: info.size, kind })
    }
    // Bound native grants; stale dialogs cannot accumulate paths indefinitely.
    if (this.selections.size >= 20) this.selections.delete(this.selections.keys().next().value!)
    const token = randomUUID()
    this.selections.set(token, files)
    return { token, files: files.map(({ id, name, byteSize, kind }) => ({ id, name, byteSize, kind })) }
  }
  releaseSelection(token: string) { this.selections.delete(collectionId(token)) }
  async importFiles(request: CollectionImportRequest): Promise<{ items: CollectionItem[]; duplicates: string[] }> {
    return this.mutex.runExclusive(async () => {
      const files = this.selections.get(collectionId(request?.token))
      if (!files || !Array.isArray(request.fileIds) || !request.fileIds.length || new Set(request.fileIds).size !== request.fileIds.length || typeof request.grouped !== 'boolean') throw new Error('Selezione scaduta o non valida.')
      const selected = request.fileIds.map(id => { const file = files.find(f => f.id === id); if (!file) throw new Error('File non autorizzato.'); return file })
      if (!(await this.collections()).some(c => c.id === collectionId(request.collectionId))) throw new Error('Raccolta non trovata.')
      const updates = itemUpdates({ ...request, title: request.title.trim() || selected[0].name })
      const known = new Set((await this.items()).flatMap(item => item.sources.map(s => s.checksum)))
      const duplicates: string[] = []
      const prepared = []
      for (const f of selected) {
        const checksum = await checksumFile(f.path)
        if (known.has(checksum)) duplicates.push(f.name)
        known.add(checksum)
        prepared.push({ ...f, checksum })
      }
      const groups = request.grouped ? [prepared] : prepared.map(f => [f])
      const items: CollectionItem[] = []
      for (const group of groups) {
        const id = randomUUID()
        const temporary = join(this.directory, 'items', `.import-${id}`)
        await mkdir(join(temporary, 'sources'), { recursive: true })
        const sources = []
        for (const f of group) {
          const sourceId = randomUUID()
          const destination = join(temporary, 'sources', sourceId + f.extension)
          await copyFile(f.path, destination)
          if (await checksumFile(destination) !== f.checksum) throw new Error('La fonte è cambiata durante la copia. Ripeti la selezione.')
          sources.push({ id: sourceId, name: f.name, extension: f.extension, checksum: f.checksum, byteSize: (await stat(destination)).size, kind: f.kind })
        }
        const item: CollectionItem = { ...updates, title: request.grouped || groups.length === 1 ? updates.title : group[0].name, id, collectionId: request.collectionId, importedAt: new Date().toISOString(), sources, transcriptHash: null, currentGeneration: null }
        // Text-only imports never need a provider. Concatenation order is explicit.
        if (sources.every(s => s.kind === 'text')) {
          const texts = await Promise.all(sources.map(s => readCollectionText(join(temporary, 'sources', s.id + s.extension))))
          const transcript = texts.join('\n\n')
          if (!transcript.trim() || transcript.includes('\0')) throw new Error('Trascrizione vuota o codifica non valida.')
          await atomicWrite(join(temporary, 'transcript.txt'), transcript)
          item.transcriptHash = hashText(transcript)
        }
        await atomicWrite(join(temporary, 'metadata.json'), JSON.stringify(item))
        await rename(temporary, this.itemDirectory(id))
        items.push(item)
      }
      this.selections.delete(request.token)
      return { items, duplicates }
    })
  }
  sourcePath(item: CollectionItem, sourceId: string) {
    const source = item.sources.find(s => s.id === collectionId(sourceId))
    if (!source) throw new Error('Fonte non trovata.')
    return join(this.itemDirectory(item.id), 'sources', source.id + source.extension)
  }
  async transcript(id: string): Promise<string> {
    try { return await readFile(join(this.itemDirectory(id), 'transcript.txt'), 'utf8') } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw e }
  }
  async generations(id: string): Promise<CollectionGeneration[]> {
    const root = join(this.itemDirectory(id), 'generations')
    let entries
    try { entries = await readdir(root, { withFileTypes: true }) } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e }
    const generations: CollectionGeneration[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      collectionId(entry.name)
      const generation = await this.json<CollectionGeneration>(join(root, entry.name, 'manifest.json'))
      if (generation.id !== entry.name) throw new Error('Versione non valida.')
      generations.push(generation)
    }
    return generations.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async markdown(id: string, generation: string | null) {
    return generation ? readFile(join(this.itemDirectory(id), 'generations', collectionId(generation), 'document.md'), 'utf8') : ''
  }
  async activateGeneration(id: string, generation: string) {
    await this.mutex.runExclusive(async () => {
      const item = await this.item(id)
      if (!(await this.generations(id)).some(g => g.id === collectionId(generation))) throw new Error('Versione non trovata.')
      await this.markdown(id, generation)
      await this.writeItem({ ...item, currentGeneration: generation })
    })
  }
}
