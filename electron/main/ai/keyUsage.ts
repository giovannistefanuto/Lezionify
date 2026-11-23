import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { GeminiError } from './geminiErrors'
import type { KeyUsageSummary } from '../../../shared/keyUsage'

const WINDOW = 30 * 24 * 60 * 60 * 1000
type Entry = { at: number; success: boolean }
type Bucket = { entries: Entry[]; blockedUntil: number; lastAttempt: number; suspensionReason?: string }

/** Local rolling window. Only SHA256 identities and outcomes are persisted. */
export class KeyUsageStore {
  private buckets: Record<string, Bucket> = {}
  constructor(private file?: string, private now = () => Date.now()) {
    if (file && existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8'))
      if (!parsed || parsed.version !== 1 || !parsed.buckets || typeof parsed.buckets !== 'object') throw new Error('Registro utilizzo chiavi non valido.')
      for (const [id, value] of Object.entries(parsed.buckets)) {
        const b = value as Bucket
        if (!/^[a-f0-9]{64}$/.test(id) || !Array.isArray(b?.entries) || !Number.isFinite(b.blockedUntil) || !Number.isFinite(b.lastAttempt) || b.entries.some(e => !Number.isFinite(e.at) || typeof e.success !== 'boolean')) throw new Error('Registro utilizzo chiavi non valido.')
      }
      this.buckets = parsed.buckets
    }
  }
  private bucket(key: string): Bucket {
    const id = createHash('sha256').update(key.trim()).digest('hex')
    const bucket = this.buckets[id] ??= { entries: [], blockedUntil: 0, lastAttempt: 0 }
    bucket.entries = bucket.entries.filter(e => e.at > this.now() - WINDOW && e.at <= this.now())
    return bucket
  }
  summary(key: string): KeyUsageSummary {
    const b = this.bucket(key)
    return { successes: b.entries.filter(e => e.success).length, errors: b.entries.filter(e => !e.success).length, suspendedUntil: b.blockedUntil > this.now() ? b.blockedUntil : 0, lastAttempt: b.lastAttempt, suspensionReason: b.blockedUntil > this.now() ? b.suspensionReason : undefined }
  }
  record(key: string, success: boolean, category?: string, retryDelayMs = 0) {
    const b = this.bucket(key), at = this.now()
    b.entries.push({ at, success }); b.lastAttempt = at
    if (success) { b.blockedUntil = 0; delete b.suspensionReason }
    else if (category === 'authentication') b.blockedUntil = at + 24 * 60 * 60 * 1000
    else if (['rate_limited', 'service_unavailable', 'network_error', 'timeout'].includes(category ?? '')) b.blockedUntil = at + Math.max(60_000, retryDelayMs)
    if (!success && b.blockedUntil > at) b.suspensionReason = category
    if (this.file) {
      for (const id of Object.keys(this.buckets)) {
        const item = this.buckets[id]
        item.entries = item.entries.filter(e => e.at > at - WINDOW)
        if (!item.entries.length && item.blockedUntil <= at) delete this.buckets[id]
      }
      try {
        mkdirSync(dirname(this.file), { recursive: true })
        writeFileSync(`${this.file}.tmp`, JSON.stringify({ version: 1, buckets: this.buckets }), { mode: 0o600 })
        renameSync(`${this.file}.tmp`, this.file)
      } catch {
        throw new GeminiError({ category: 'unknown', isRetryable: false, isDailyQuota: false, recoveryDisposition: 'terminal', sanitizedMessage: 'Impossibile salvare il conteggio locale delle chiavi. Nessun reinvio automatico.' })
      }
    }
  }
  order<T extends { key: string }>(keys: T[]): T[] {
    return keys.map((key, index) => ({ key, index, ...this.summary(key.key) })).sort((a, b) =>
      Number(a.suspendedUntil > 0) - Number(b.suspendedUntil > 0) || a.successes - b.successes || a.lastAttempt - b.lastAttempt || a.index - b.index
    ).map(item => item.key)
  }
}
