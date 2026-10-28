import { atomicWrite, readRecoverable } from './atomicFile'
import { mkdir, stat } from 'node:fs/promises'
import * as path from 'node:path'
import type { Lecture } from '../../shared/archive'
import { validateLectureTitles } from '../../shared/lectureTitles'
import { AsyncMutex } from './asyncMutex'

export const LIBRARY_VERSION = 1

export interface LibraryFile {
  version: number
  lectures: Lecture[]
}

export class LibraryRepository {
  private readonly libraryPath: string
  private readonly mutex: AsyncMutex
  private cache: LibraryFile | null = null

  constructor(rootDirectory: string, mutex?: AsyncMutex) {
    this.libraryPath = path.join(rootDirectory, 'library.json')
    this.mutex = mutex ?? new AsyncMutex()
  }

  async initialize(): Promise<void> {
    await mkdir(path.dirname(this.libraryPath), { recursive: true })
    try {
      await stat(this.libraryPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await this.writeLibrary({ version: LIBRARY_VERSION, lectures: [] })
    }
  }

  async readLibrary(): Promise<LibraryFile> {
    if (this.cache) {
      return this.cloneLibrary(this.cache)
    }

    const rawLibrary = await readRecoverable(this.libraryPath)
    const parsedLibrary: unknown = JSON.parse(rawLibrary)
    if (!this.isLibraryFile(parsedLibrary)) {
      throw new Error('L’archivio locale ha un formato non valido.')
    }

    const normalizedLectures = parsedLibrary.lectures.map((lecture) => ({
      ...lecture,
      studyStatus: lecture.studyStatus ?? 'da-studiare',
      markdownFileName: lecture.markdownFileName ?? null,
      markdownEnFileName: lecture.markdownEnFileName ?? null
    }))

    const library: LibraryFile = {
      version: parsedLibrary.version,
      lectures: normalizedLectures
    }

    this.cache = library
    return this.cloneLibrary(library)
  }

  async writeLibrary(library: LibraryFile): Promise<void> {
    await mkdir(path.dirname(this.libraryPath), { recursive: true })
    await atomicWrite(this.libraryPath, `${JSON.stringify(library, null, 2)}\n`)
    this.cache = this.cloneLibrary(library)
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(fn)
  }

  invalidateCache(): void {
    this.cache = null
  }

  private isLibraryFile(value: unknown): value is LibraryFile {
    if (!(
      typeof value === 'object' &&
      value !== null &&
      'version' in value &&
      'lectures' in value &&
      typeof value.version === 'number' &&
      Array.isArray(value.lectures)
    ))
      return false

    return value.lectures.every((lecture) => {
      if (typeof lecture !== 'object' || lecture === null) return false
      const item = lecture as Partial<Lecture>
      if (item.titleOverrides !== undefined) {
        try { validateLectureTitles(item.titleOverrides) } catch { return false }
      }
      return (
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        (item.isLaboratory === undefined || typeof item.isLaboratory === 'boolean') &&
        (item.markdownEnNeedsUpdate === undefined || typeof item.markdownEnNeedsUpdate === 'boolean') &&
        (item.laboratorySource === undefined ||
          (item.laboratorySource === 'schedule' && item.isLaboratory === true)) &&
        (typeof item.courseCode === 'string' || item.courseCode === null) &&
        (typeof item.recordedAt === 'string' || item.recordedAt === null) &&
        typeof item.sourceAudioFileName === 'string' &&
        typeof item.audioFileName === 'string' &&
        typeof item.byteSize === 'number' &&
        Number.isFinite(item.byteSize) &&
        item.byteSize >= 0 &&
        (item.durationSeconds === undefined ||
          (typeof item.durationSeconds === 'number' &&
            Number.isFinite(item.durationSeconds) &&
            item.durationSeconds >= 0)) &&
        (item.videoImport === undefined || (
          typeof item.videoImport === 'object' && item.videoImport !== null &&
          typeof item.videoImport.scheduledEndTime === 'string' &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(item.videoImport.scheduledEndTime) &&
          Array.isArray(item.videoImport.sources) &&
          item.videoImport.sources.length > 0 && item.videoImport.sources.length <= 100 &&
          item.videoImport.sources.every(source =>
            source !== null && typeof source === 'object' &&
            typeof source.name === 'string' && source.name.length > 0 &&
            typeof source.checksum === 'string' && /^[a-f0-9]{64}$/.test(source.checksum) &&
            typeof source.durationSeconds === 'number' && Number.isFinite(source.durationSeconds) && source.durationSeconds > 0
          )
        )) &&
        typeof item.checksum === 'string' &&
        typeof item.importedAt === 'string' &&
        (item.status === 'audio-only' ||
          item.status === 'transcript-available') &&
        (item.studyStatus === undefined ||
          item.studyStatus === 'da-studiare' ||
          item.studyStatus === 'in-corso' ||
          item.studyStatus === 'completata')
      )
    })
  }

  private cloneLibrary(library: LibraryFile): LibraryFile {
    return {
      version: library.version,
      lectures: library.lectures.map((l) => ({
        ...l,
        ...(l.titleOverrides ? { titleOverrides: { ...l.titleOverrides } } : {}),
        ...(l.videoImport ? { videoImport: {
          ...l.videoImport,
          sources: l.videoImport.sources.map(source => ({ ...source }))
        } } : {})
      }))
    }
  }
}
