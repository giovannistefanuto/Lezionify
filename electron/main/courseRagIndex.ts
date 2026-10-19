import { Worker } from 'node:worker_threads'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { AsyncMutex } from './asyncMutex'
import { createHash } from 'node:crypto'
import MiniSearch from 'minisearch'
import type {
  CourseCitation,
  CoursePassage,
  CourseSource
} from '../../shared/courseRag'

export const ragHash = (text: string | Buffer) =>
  createHash('sha256').update(text).digest('hex')
export interface IndexedCourseSource extends CourseSource {
  passages: CoursePassage[]
  path?: string
  signature?: string
  rawText?: string
}
export function publicCourseSource(source: CourseSource): CourseSource {
  const {
    id,
    title,
    kind,
    version,
    status,
    lectureId,
    pages,
    unreadablePages,
    issue
  } = source
  return {
    id,
    title,
    kind,
    version,
    status,
    lectureId,
    pages,
    unreadablePages,
    issue
  }
}

export function splitCourseSource(
  source: CourseSource,
  pages: { page?: number; text: string }[]
): IndexedCourseSource {
  const passages: CoursePassage[] = []
  for (const page of pages) {
    // Stable character offsets, bounded passages, overlap for formulas and paragraph boundaries.
    for (let offset = 0; offset < page.text.length; offset += 1800) {
      const text = page.text.slice(offset, offset + 2200)
      if (!text.trim()) continue
      passages.push({
        id: `${source.id}:${source.version.slice(0, 12)}:${page.page ?? 0}:${offset}`,
        sourceId: source.id,
        page: page.page,
        offset,
        text
      })
    }
  }
  return { ...source, passages }
}

export class CourseRetrieval {
  private index = new MiniSearch({
    fields: ['title', 'text'],
    storeFields: ['id'],
    searchOptions: { prefix: true, fuzzy: 0.1, combineWith: 'OR' }
  })
  private passages = new Map<string, CourseCitation>()
  constructor(sources: IndexedCourseSource[]) {
    for (const source of sources.filter(
      (item) => item.status === 'ready' || item.status === 'partial'
    )) {
      for (const passage of source.passages) {
        this.passages.set(passage.id, {
          source: publicCourseSource(source),
          passage
        })
        this.index.add({
          id: passage.id,
          title: source.title,
          text: passage.text
        })
      }
    }
  }
  get(id: string): CourseCitation | undefined {
    return this.passages.get(id)
  }
  fromSource(id: string, page?: number): CourseCitation[] {
    return [...this.passages.values()]
      .filter(
        (item) =>
          item.source.id === id &&
          (page === undefined || item.passage.page === page)
      )
      .slice(0, 4)
  }
  search(query: string, limit = 8): CourseCitation[] {
    const results = this.index.search(query.slice(0, 1000))
    const counts = new Map<string, number>()
    const selected: CourseCitation[] = []
    for (const result of results) {
      const item = this.passages.get(result.id)!
      const count = counts.get(item.source.id) ?? 0
      if (count >= 3) continue
      counts.set(item.source.id, count + 1)
      selected.push(item)
      if (selected.length >= limit) break
    }
    return selected
  }
}

const pdfWorkerMutex = new AsyncMutex()
export function extractCoursePdf(
  bytes: Uint8Array
): Promise<{ page: number; text: string }[]> {
  return pdfWorkerMutex.runExclusive(
    () =>
      new Promise((resolve, reject) => {
        const installed = new URL(
          './course-rag/pdf-worker.cjs',
          import.meta.url
        )
        const runner = existsSync(installed)
          ? installed
          : new URL(
              '../../resources/course-rag/pdf-worker.cjs',
              import.meta.url
            )
        const moduleUrl = pathToFileURL(
          createRequire(import.meta.url).resolve(
            'pdfjs-dist/legacy/build/pdf.mjs'
          )
        ).href
        const worker = new Worker(runner, { workerData: { bytes, moduleUrl } })
        let settled = false
        const finish = (pages?: { page: number; text: string }[]) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          void worker.terminate()
          if (pages) resolve(pages)
          else
            reject(
              new Error('PDF non leggibile o tempo di estrazione superato.')
            )
        }
        const timer = setTimeout(() => finish(), 90_000)
        worker.once('message', (result) =>
          finish(Array.isArray(result.pages) ? result.pages : undefined)
        )
        worker.once('error', () => finish())
        worker.once('exit', () => {
          if (!settled) finish()
        })
      })
  )
}
