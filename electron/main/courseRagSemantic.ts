import { Worker } from 'node:worker_threads'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'
import { atomicWrite } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import type { CourseCitation } from '../../shared/courseRag'

export const COURSE_EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
// A model revision is part of every cache key; updates cannot reuse stale vectors.
export const COURSE_EMBEDDING_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900'
export const COURSE_EMBEDDING_POLICY = 'v4-window384-mean'
type SemanticState = { status: 'missing' | 'loading' | 'ready' | 'error'; issue?: string }
export interface CourseSemanticSearch {
  state(): Promise<SemanticState>
  prepare(onProgress?: (message: string) => void): Promise<void>
  rank(query: string, passages: CourseCitation[], signal: AbortSignal, onProgress?: (message: string) => void): Promise<string[]>
  index(passages: CourseCitation[], signal: AbortSignal, onProgress: (readyIds: string[]) => Promise<void>): Promise<void>
  storage(): Promise<{ modelBytes: number; vectorBytes: number }>
  clearVectors(): Promise<void>
  dispose(): void
}

/** Lazy, CPU-only inference in an isolated worker with a recoverable local vector cache. */
export class LocalCourseSemantic implements CourseSemanticSearch {
  private worker?: Worker
  private status: SemanticState | undefined
  private mutex = new AsyncMutex()
  private vectors = new Map<string, number[]>()
  private interactive = 0
  private draining?: Promise<void>
  private async locked<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
    signal.throwIfAborted()
    let abort!: () => void
    const cancelled = new Promise<never>((_resolve, reject) => { abort = () => reject(new Error('Ricerca locale interrotta.')); signal.addEventListener('abort', abort, { once: true }) })
    try { return await Promise.race([this.mutex.runExclusive(async () => { signal.throwIfAborted(); return fn() }), cancelled]) }
    finally { signal.removeEventListener('abort', abort) }
  }
  constructor(private directory: string, private embedder?: (texts: string[], signal?: AbortSignal) => Promise<number[][]>) {}
  async state(): Promise<SemanticState> {
    if (this.status?.status === 'loading' || this.status?.status === 'error') return this.status
    try {
      const marker = JSON.parse(await readFile(join(this.directory, 'ready.json'), 'utf8')) as { model?: string; revision?: string }
      let complete = marker.model === COURSE_EMBEDDING_MODEL && marker.revision === COURSE_EMBEDDING_REVISION
      if (!this.embedder && complete) {
        const root = join(this.directory, 'models', COURSE_EMBEDDING_MODEL, COURSE_EMBEDDING_REVISION)
        for (const name of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']) {
          try { if (!(await stat(join(root, name))).size) complete = false } catch { complete = false }
        }
      }
      this.status = complete ? { status: 'ready' } : { status: 'missing' }
    } catch { this.status = { status: 'missing' } }
    return this.status
  }
  private call(operation: 'prepare' | 'embed', texts: string[], signal?: AbortSignal, onProgress?: (message: string) => void): Promise<number[][]> {
    signal?.throwIfAborted()
    if (this.embedder) return this.embedder(texts, signal)
    if (this.draining) return this.draining.then(() => { signal?.throwIfAborted(); return this.call(operation, texts, signal, onProgress) })
    if (!this.worker) {
      const built = new URL('./course-rag/embedding-worker.cjs', import.meta.url)
      const unpacked = new URL(built.href.replace('.asar/', '.asar.unpacked/'))
      const runner = existsSync(unpacked) ? unpacked : existsSync(built) ? built : new URL('../../resources/course-rag/embedding-worker.cjs', import.meta.url)
      this.worker = new Worker(runner, { workerData: { model: COURSE_EMBEDDING_MODEL, revision: COURSE_EMBEDDING_REVISION, cacheDirectory: join(this.directory, 'models'), moduleUrl: pathToFileURL(createRequire(import.meta.url).resolve('@huggingface/transformers')).href } })
      this.worker.unref()
    }
    const worker = this.worker
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      let settled = false
      const finish = (error?: Error, vectors: number[][] = [], nativeActive = true) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
        worker.off('message', message)
        worker.off('error', failure)
        worker.off('exit', exited)
        if (error) {
          if (!nativeActive) {
            if (this.worker === worker) this.worker = undefined
            worker.postMessage({ id: randomUUID(), operation: 'dispose', texts: [] })
            reject(error)
            return
          }
          // ONNX owns native threads: force-terminating an active worker can
          // crash Electron. Reject the caller, then drain the bounded batch.
          const pending = new Promise<void>(done => {
            const complete = (value?: { id?: string; vectors?: unknown; error?: unknown }) => {
              if (value && (value.id !== id || (!value.vectors && !value.error))) return
              worker.off('message', complete); worker.off('exit', exited); worker.off('error', exited)
              if (this.draining === pending) this.draining = undefined
              done()
            }
            const exited = () => { if (this.worker === worker) this.worker = undefined; complete() }
            worker.on('message', complete); worker.once('exit', exited); worker.once('error', exited)
          })
          this.draining = pending
          reject(error)
        }
        else resolve(vectors)
      }
      const abort = () => finish(new Error('Indicizzazione semantica interrotta.'))
      const failure = () => finish(new Error('Ricerca semantica locale non disponibile.'), [], false)
      const exited = () => failure()
      const message = (value: { id: string; progress?: number; error?: string; vectors?: number[][] }) => {
        if (value.id !== id) return
        if (value.progress !== undefined) { onProgress?.(`Download modello locale: ${value.progress}%`); return }
        if (value.error || !Array.isArray(value.vectors)) failure()
        else finish(undefined, value.vectors)
      }
      const timer = setTimeout(() => finish(new Error('Tempo del modello locale esaurito.')), operation === 'prepare' ? 180_000 : 60_000)
      signal?.addEventListener('abort', abort, { once: true })
      worker.on('message', message)
      worker.once('error', failure)
      worker.once('exit', exited)
      worker.postMessage({ id, operation, texts })
    })
  }
  async prepare(onProgress?: (message: string) => void): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const repair = this.status?.status === 'error'
      this.status = { status: 'loading' }
      try {
        await this.draining
        if (this.worker) { await this.worker.terminate(); this.worker = undefined }
        if (repair && !this.embedder) {
          const root = join(this.directory, 'models', COURSE_EMBEDDING_MODEL, COURSE_EMBEDDING_REVISION)
          for (const name of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']) {
            try { await unlink(join(root, name)) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
          }
        }
        await mkdir(this.directory, { recursive: true })
        await this.call('prepare', [], undefined, onProgress)
        await atomicWrite(join(this.directory, 'ready.json'), JSON.stringify({ model: COURSE_EMBEDDING_MODEL, revision: COURSE_EMBEDDING_REVISION }))
        this.status = { status: 'ready' }
      } catch { this.status = { status: 'error', issue: 'Download o avvio del modello non riuscito. La ricerca testuale resta disponibile.' } }
    })
  }
  private key(item: CourseCitation): string {
    // v4 includes all-token-window pooling; content reuse across courses is safe.
    return createHash('sha256').update(`${COURSE_EMBEDDING_POLICY}:${COURSE_EMBEDDING_MODEL}:${COURSE_EMBEDDING_REVISION}:${item.passage.section ?? ''}:${item.passage.text}`).digest('hex')
  }
  private valid(vector: unknown): vector is number[] {
    return Array.isArray(vector) && vector.length === 384 && vector.every(n => typeof n === 'number' && Number.isFinite(n)) && Math.abs(vector.reduce((sum, n) => sum + n * n, 0) - 1) < .05
  }
  private remember(hash: string, vector: number[]) {
    this.vectors.delete(hash)
    this.vectors.set(hash, vector)
    if (this.vectors.size > 2048) this.vectors.delete(this.vectors.keys().next().value!)
  }
  private async cached(item: CourseCitation): Promise<number[] | undefined> {
    const hash = this.key(item)
    const memory = this.vectors.get(hash)
    if (memory) { this.remember(hash, memory); return memory }
    try {
      const vector: unknown = JSON.parse(await readFile(join(this.directory, 'vectors', hash + '.json'), 'utf8'))
      if (this.valid(vector)) { this.remember(hash, vector); return vector }
    } catch { /* Cache is a disposable derivation. */ }
  }
  private async batch(items: CourseCitation[], signal: AbortSignal): Promise<number[][]> {
    return this.locked(signal, async () => {
      signal.throwIfAborted()
      const vectors = await Promise.all(items.map(item => this.cached(item)))
      const missing = items.map((item, index) => ({ item, index })).filter(({ index }) => !vectors[index])
      if (missing.length) {
        const unique = [...new Map(missing.map(entry => [this.key(entry.item), entry])).values()]
        const generated = await this.call('embed', unique.map(({ item }) => `${item.passage.section ?? ''}\n${item.passage.text}`), signal)
        if (generated.length !== unique.length || generated.some(vector => !this.valid(vector))) throw new Error('Vettori locali non validi.')
        await mkdir(join(this.directory, 'vectors'), { recursive: true })
        for (const [i, { item }] of unique.entries()) {
          signal.throwIfAborted()
          const file = join(this.directory, 'vectors', this.key(item) + '.json')
          for (let attempt = 0; ; attempt++) {
            try { await atomicWrite(file, JSON.stringify(generated[i])); break } catch (error) {
              if (attempt < 2 && ['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) { await new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1))); continue }
              throw new Error('Cache vettori non scrivibile: controlla spazio e permessi, poi riprendi.', { cause: error })
            }
          }
          this.remember(this.key(item), generated[i])
        }
        for (const { item, index } of missing) vectors[index] = this.vectors.get(this.key(item))!
      }
      return vectors as number[][]
    })
  }
  async index(passages: CourseCitation[], signal: AbortSignal, onProgress: (readyIds: string[]) => Promise<void>): Promise<void> {
    if ((await this.state()).status !== 'ready') throw new Error('Scarica prima il modello locale.')
    const ready: string[] = []
    for (let offset = 0; offset < passages.length; offset += 8) {
      while (this.interactive) { signal.throwIfAborted(); await new Promise(resolve => setTimeout(resolve, 25)) }
      signal.throwIfAborted()
      const batch = passages.slice(offset, offset + 8)
      await this.batch(batch, signal)
      ready.push(...batch.map(item => item.passage.id))
      await onProgress([...ready])
      await new Promise(resolve => setImmediate(resolve))
    }
  }
  async rank(query: string, passages: CourseCitation[], signal: AbortSignal, onProgress?: (message: string) => void): Promise<string[]> {
    if ((await this.state()).status !== 'ready' || !query.trim()) return []
    this.interactive++
    try {
      const [vector] = await this.locked(signal, async () => {
        signal.throwIfAborted()
        return this.call('embed', [query.slice(0, 1500)], signal)
      })
      if (!this.valid(vector)) throw new Error('Vettore domanda non valido.')
      const ranked: { id: string; score: number }[] = []
      for (let offset = 0; offset < passages.length; offset += 8) {
        signal.throwIfAborted()
        onProgress?.(`Indice semantico locale: ${offset}/${passages.length} passaggi. Puoi interrompere.`)
        const items = passages.slice(offset, offset + 8)
        const vectors = await this.batch(items, signal)
        ranked.push(...items.map((item, i) => ({ id: item.passage.id, score: vectors[i].reduce((sum, n, j) => sum + n * vector[j], 0) })))
      }
      ranked.sort((a, b) => b.score - a.score)
      // Keep a relative relevance band: distant tail candidates should not
      // receive the same RRF vote as a strong semantic match.
      const threshold = Math.max(.25, (ranked[0]?.score ?? 0) * .75)
      return ranked.filter(item => item.score >= threshold).slice(0, 40).map(item => item.id)
    } catch (error) {
      if (!signal.aborted) this.status = { status: 'error', issue: 'Inferenza locale non riuscita. Ripristina il modello dalle fonti; la ricerca testuale resta disponibile.' }
      throw error
    } finally { this.interactive-- }
  }
  async storage(): Promise<{ modelBytes: number; vectorBytes: number }> {
    const size = async (directory: string): Promise<number> => {
      let total = 0
      try { for (const item of await readdir(directory, { withFileTypes: true })) {
        if (item.isSymbolicLink()) continue
        const path = join(directory, item.name)
        total += item.isDirectory() ? await size(path) : (await stat(path)).size
      } } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      return total
    }
    return { modelBytes: await size(join(this.directory, 'models')), vectorBytes: await size(join(this.directory, 'vectors')) }
  }
  async clearVectors(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const directory = join(this.directory, 'vectors')
      let names: string[] = []
      try { names = await readdir(directory) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      for (const name of names) if (/^[a-f0-9]{64}\.json(?:\.bak)?$/.test(name)) await unlink(join(directory, name))
      this.vectors.clear()
    })
  }
  dispose(): void {
    // Serialized after any native inference; never interrupt native threads.
    this.worker?.postMessage({ id: randomUUID(), operation: 'dispose', texts: [] })
    this.worker = undefined
    this.vectors.clear()
  }
}
