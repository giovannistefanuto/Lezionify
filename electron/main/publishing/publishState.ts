import * as path from 'node:path'
import { atomicWrite, readRecoverable } from '../atomicFile'

export interface PublishedLectureEntry {
  publishedAt: string
  commitHash: string
  coursePath: string
  contentHash?: string
}

interface DestinationState {
  publishedLectures: Record<string, PublishedLectureEntry>
  lastPublishAt: string | null
  lastError: string | null
  lastCheckedAt?: string | null
}

function empty(): DestinationState {
  return { publishedLectures: {}, lastPublishAt: null, lastError: null }
}

function valid(value: unknown): value is DestinationState {
  if (!value || typeof value !== 'object') return false
  const state = value as DestinationState
  return Boolean(state.publishedLectures && typeof state.publishedLectures === 'object' &&
    !Array.isArray(state.publishedLectures) &&
    (state.lastPublishAt === null || typeof state.lastPublishAt === 'string') &&
    (state.lastError === null || typeof state.lastError === 'string') &&
    Object.values(state.publishedLectures).every(entry => entry &&
      typeof entry.publishedAt === 'string' && typeof entry.commitHash === 'string' &&
      typeof entry.coursePath === 'string' &&
      (entry.contentHash === undefined || typeof entry.contentHash === 'string')))
}

/** Destination-scoped checkpoints: changing repository/branch never skips lessons. */
export class PublishState {
  private readonly filePath: string
  private destinations: Record<string, DestinationState> = {}
  private loading?: Promise<void>

  constructor(libraryDir: string) {
    this.filePath = path.join(libraryDir, 'publish-state.json')
  }

  load(): Promise<void> {
    return this.loading ??= this.read()
  }

  private async read(): Promise<void> {
    try {
      const parsed = JSON.parse(await readRecoverable(this.filePath))
      if (parsed.version === 1 && parsed.destinations &&
        typeof parsed.destinations === 'object' && !Array.isArray(parsed.destinations) &&
        Object.values(parsed.destinations).every(valid)) {
        this.destinations = parsed.destinations
      }
    } catch (error) {
      // Corrupt checkpoints can be rebuilt from text; I/O failures must not look empty.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' &&
        !(error instanceof SyntaxError) &&
        !(error instanceof Error && error.message.startsWith('Dati JSON danneggiati:'))) throw error
    }
  }

  snapshot(target: string): DestinationState {
    return structuredClone(this.destinations[target] ?? empty())
  }

  async recordSuccess(target: string, entries: Record<string, PublishedLectureEntry>): Promise<void> {
    const next = this.snapshot(target)
    Object.assign(next.publishedLectures, entries)
    next.lastPublishAt = new Date().toISOString()
    next.lastCheckedAt = new Date().toISOString()
    next.lastError = null
    await this.persist(target, next)
  }

  async recordCheck(target: string): Promise<void> {
    const next = this.snapshot(target)
    next.lastCheckedAt = new Date().toISOString()
    next.lastError = null
    await this.persist(target, next)
  }

  async recordError(target: string, message: string): Promise<void> {
    const next = this.snapshot(target)
    next.lastError = message
    await this.persist(target, next)
  }

  private async persist(target: string, next: DestinationState): Promise<void> {
    const destinations = { ...this.destinations, [target]: next }
    await atomicWrite(this.filePath, JSON.stringify({ version: 1, destinations }, null, 2) + '\n')
    // In-memory flags must also stay unchanged if persistence fails.
    this.destinations = destinations
  }
}
