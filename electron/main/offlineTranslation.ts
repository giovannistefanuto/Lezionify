import { readFile, mkdir, writeFile, rename, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { Worker } from 'node:worker_threads'
import type { DictionaryDirection } from '../../shared/dictionary'
import { phraseSegments, validatePhrase, type OfflineTranslationResult, type OfflineTranslationStatus } from '../../shared/offlineTranslation'
import manifest from '../../resources/translation/models.json'

const files = manifest.models.flatMap(model => model.files.map(file => ({ ...file, direction: model.direction })))
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
export class OfflineTranslationService {
  private installation: Promise<OfflineTranslationStatus> | null = null
  private busy = false
  constructor(private root: string, private runtime: string, private download: typeof fetch = fetch) {}
  private path(file: typeof files[number]) { return join(this.root, file.direction, `${file.kind}.bin`) }
  async status(): Promise<OfflineTranslationStatus> {
    const checks = await Promise.all(files.map(async file => { try { return (await stat(this.path(file))).size === file.bytes } catch { return false } }))
    return { installed: checks.every(Boolean), installing: Boolean(this.installation), downloadBytes: files.reduce((n, f) => n + f.compressedBytes, 0), diskBytes: files.reduce((n, f) => n + f.bytes, 0) }
  }
  install(): Promise<OfflineTranslationStatus> {
    if (this.installation) return this.installation
    this.installation = this.installFiles().finally(() => { this.installation = null })
    return this.installation
  }
  private async installFiles() {
    try {
      for (const file of files) {
        try { const existing = await readFile(this.path(file)); if (sha(existing) === file.sha256) continue } catch { /* Missing optional model: download explicitly requested. */ }
        const response = await this.download(`https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/${file.path}`, { signal: AbortSignal.timeout(120_000), redirect: 'error' })
        if (!response.ok || !response.body) throw new Error('download')
        const chunks: Uint8Array[] = []; let size = 0
        const reader = response.body.getReader()
        try {
          for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > file.compressedBytes) throw new Error('size'); chunks.push(value) }
        } finally { await reader.cancel() }
        if (size !== file.compressedBytes) throw new Error('size')
        const bytes = gunzipSync(Buffer.concat(chunks), { maxOutputLength: file.bytes })
        if (bytes.length !== file.bytes || sha(bytes) !== file.sha256) throw new Error('integrity')
        await mkdir(join(this.root, file.direction), { recursive: true })
        const temporary = `${this.path(file)}.tmp`
        try { await writeFile(temporary, bytes); await rename(temporary, this.path(file)) }
        finally { await rm(temporary, { force: true }) }
      }
      return { ...await this.status(), installing: false }
    } catch { throw new Error('Installazione dei modelli non riuscita. Controlla la connessione e riprova; le frasi non sono state inviate online.') }
  }
  async translate(text: unknown, direction: unknown): Promise<OfflineTranslationResult> {
    validatePhrase(text, direction)
    if (this.busy || this.installation) throw new Error('Attendi il completamento dell’operazione in corso.')
    this.busy = true
    try {
      if (!(await this.status()).installed) throw new Error('Scarica prima i modelli offline.')
      const translated = await new Promise<string>((resolve, reject) => {
        const worker = new Worker(join(this.runtime, 'runner.cjs'), { workerData: { root: this.root, manifest, segments: phraseSegments(text), direction } })
        let settled = false
        const finish = (error?: string, value?: string) => { if (settled) return; settled = true; clearTimeout(timer); void worker.terminate(); if (error) reject(new Error(error)); else resolve(value!) }
        const timer = setTimeout(() => finish('Traduzione interrotta: tempo massimo raggiunto. Riprova con una frase più breve.'), 45_000)
        worker.once('message', (value: { text?: string; error?: boolean }) => finish(value.error || typeof value.text !== 'string' ? 'Modello locale non disponibile o danneggiato. Reinstalla i modelli e riprova.' : undefined, value.text))
        worker.once('error', () => finish('Motore locale non disponibile. Reinstalla i modelli e riprova.'))
        worker.once('exit', code => { if (code !== 0) finish('Motore locale interrotto. Riprova.') })
      })
      return { text: translated, direction: direction as DictionaryDirection, engine: 'Mozilla/Bergamot' }
    } finally { this.busy = false }
  }
}
