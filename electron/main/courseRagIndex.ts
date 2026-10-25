import { Worker } from 'node:worker_threads'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { AsyncMutex } from './asyncMutex'
import { createHash } from 'node:crypto'
import MiniSearch from 'minisearch'
import { normalizeCourseNotation, planCourseQuery } from './courseRagQuery'
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
  indexRevision?: number
}
export function publicCourseSource(source: CourseSource): CourseSource {
  const {
    id,
    title,
    kind,
    version,
    status,
    lectureId,
    lectureOrdinal,
    chronologicalOrdinal,
    numbering,
    recordedDate,
    pages,
    unreadablePages,
    issue,
    provenance,
    derivedFrom
  } = source
  return {
    id,
    title,
    kind,
    version,
    status,
    lectureId,
    lectureOrdinal,
    chronologicalOrdinal,
    numbering,
    recordedDate,
    pages,
    unreadablePages,
    issue,
    provenance: provenance ?? (kind === 'notes' ? 'ai-derived' : kind === 'course' ? 'metadata' : 'original'),
    derivedFrom
  }
}

export function splitCourseSource(
  source: CourseSource,
  pages: { page?: number; text: string }[]
): IndexedCourseSource {
  const passages: CoursePassage[] = []
  for (const page of pages) {
    let section: string | undefined
    let sectionOffset = 0
    let offset = 0
    // Prefer paragraph/line breaks. Never split fenced code or display math when
    // it fits in the bounded passage; source offsets always address original text.
    const protectedRanges: [number, number][] = []
    const blocks: { kind: 'code' | 'math'; start: number; end: number }[] = []
    for (const match of page.text.matchAll(/```[\s\S]*?```|~~~[\s\S]*?~~~|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g)) {
      protectedRanges.push([match.index!, match.index! + match[0].length])
      blocks.push({ kind: /^(?:```|~~~)/.test(match[0]) ? 'code' : 'math', start: match.index!, end: match.index! + match[0].length })
    }
    const headings = [...page.text.matchAll(/^#{1,6}\s+.+$/gm)].map(match => match.index!).filter(position => !protectedRanges.some(([start, stop]) => start <= position && stop > position))
    while (offset < page.text.length) {
      const nominalEnd = Math.min(offset + 2200, page.text.length)
      let end = nominalEnd
      const nextHeading = headings.find(position => position > offset && position <= end)
      if (nextHeading !== undefined) end = nextHeading
      if (end < page.text.length) {
        const paragraph = page.text.lastIndexOf('\n\n', end)
        const line = page.text.lastIndexOf('\n', end)
        const space = page.text.lastIndexOf(' ', end)
        end = paragraph > offset + 700 ? paragraph + 2 : line > offset + 1000 ? line + 1 : space > offset + 1500 ? space + 1 : end
        const protectedBlock = protectedRanges.find(([start, stop]) => start < end && stop > end)
        if (protectedBlock && protectedBlock[0] > offset) end = protectedBlock[0]
        else if (protectedBlock && protectedBlock[1] - offset <= 4400) end = protectedBlock[1]
      }
      const text = page.text.slice(offset, end)
      for (const heading of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
        if (protectedRanges.some(([start, stop]) => start <= offset + heading.index! && stop > offset + heading.index!)) continue
        // A passage beginning at a heading carries that heading, not the next one.
        if (heading.index === 0 || !section) { section = heading[1].slice(0, 180); sectionOffset = offset + heading.index!; break }
      }
      const structuralBlock = blocks.find(block => block.start <= offset && block.end >= end && block.end - block.start > 4400)
      if (text.trim()) passages.push({ id: `${source.id}:r3:${source.version.slice(0, 12)}:${page.page ?? 0}:${offset}`, sourceId: source.id, page: page.page, offset, text, section, sectionOffset, structuralBlock })
      for (const heading of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
        if (protectedRanges.some(([start, stop]) => start <= offset + heading.index! && stop > offset + heading.index!)) continue
        section = heading[1].slice(0, 180); sectionOffset = offset + heading.index!
      }
      // Paragraph passages need no overlap; bounded long prose keeps a short tail.
      const overlap = end < page.text.length && !headings.includes(end) && !text.endsWith('\n\n') && !protectedRanges.some(([, stop]) => stop === end) ? 200 : 0
      const next = Math.max(offset + 1, end - overlap)
      offset = protectedRanges.some(([start, stop]) => start < next && stop > next) ? end : next
    }
  }
  return { ...source, passages, indexRevision: 3 }
}

export class CourseRetrieval {
  private index = new MiniSearch({
    fields: ['title', 'section', 'text'],
    storeFields: ['id'],
    searchOptions: { prefix: true, fuzzy: 0.1, combineWith: 'OR' }
  })
  private passages = new Map<string, CourseCitation>()
  private versions = new Map<string, string>()
  constructor(sources: IndexedCourseSource[]) {
    this.update(sources)
  }
  update(sources: IndexedCourseSource[]): void {
    const current = new Set(sources.map(source => source.id))
    for (const [id] of this.versions) if (!current.has(id)) this.remove(id)
    for (const source of sources.filter(
      (item) => item.status === 'ready' || item.status === 'partial'
    )) {
      const fingerprint = JSON.stringify(publicCourseSource(source)) + `:${source.indexRevision}:${source.passages.length}`
      if (this.versions.get(source.id) === fingerprint) continue
      this.remove(source.id)
      for (const passage of source.passages) {
        this.passages.set(passage.id, {
          source: publicCourseSource(source),
          passage
        })
        this.index.add({
          id: passage.id,
          title: source.title,
          section: passage.section ?? '',
          text: normalizeCourseNotation(passage.text)
        })
      }
      this.versions.set(source.id, fingerprint)
    }
    for (const source of sources) if (!['ready', 'partial'].includes(source.status)) this.remove(source.id)
  }
  private remove(sourceId: string): void {
    for (const [id, item] of this.passages) if (item.source.id === sourceId) { this.index.discard(id); this.passages.delete(id) }
    this.versions.delete(sourceId)
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
  neighbors(id: string): CourseCitation[] {
    const center = this.get(id)
    if (!center) return []
    const items = [...this.passages.values()].filter(item => item.source.id === center.source.id).sort((a, b) => (a.passage.page ?? 0) - (b.passage.page ?? 0) || a.passage.offset - b.passage.offset)
    const position = items.findIndex(item => item.passage.id === id)
    return [center, ...items.slice(Math.max(0, position - 1), position), ...items.slice(position + 1, position + 2)]
  }
  all(): CourseCitation[] { return [...this.passages.values()] }
  search(query: string, limit = 8, lessons?: number[], semanticIds: string[] = [], selection?: { courseWide: boolean; teacherEvidence: boolean; assessment?: boolean }): CourseCitation[] {
    const plan = planCourseQuery(query)
    const requested = new Set(lessons ?? plan.lessons)
    const meaningful = plan.query
    const symbols: string[] = meaningful.toLowerCase().match(/\b[qv]pi\b/g) ?? []
    const lexical = meaningful ? this.index.search(meaningful, { boostTerm: term => symbols.includes(term) ? 12 : 1 }) : []
    const scores = new Map<string, number>()
    for (const [rank, result] of lexical.entries()) scores.set(result.id, 1 / (30 + rank))
    for (const [rank, id] of semanticIds.entries()) if (this.passages.has(id)) scores.set(id, (scores.get(id) ?? 0) + 1 / (30 + rank))
    let results = [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => ({ id }))
    if (!meaningful && requested.size) results = [...this.passages.values()].filter(item => requested.has(item.source.lectureOrdinal ?? -1)).map(item => ({ id: item.passage.id }))
    if (symbols.length) {
      const anchoredSources = new Set(results.filter(result => symbols.some(symbol => normalizeCourseNotation(this.passages.get(result.id)!.passage.text).toLowerCase().includes(symbol))).map(result => this.passages.get(result.id)!.source.id))
      results = results.filter(result => !anchoredSources.has(this.passages.get(result.id)!.source.id) || symbols.some(symbol => normalizeCourseNotation(this.passages.get(result.id)!.passage.text).toLowerCase().includes(symbol)))
    }
    const counts = new Map<string, number>()
    const selected: CourseCitation[] = []
    const effectiveLimit = requested.size > 1 ? Math.max(limit, Math.min(12, requested.size * 4)) : limit
    if ((selection ?? plan).assessment) {
      // Keep a small, bilingual original-evidence lane beside the technical topic.
      // Exact tokens deliberately exclude "example" and fuzzy near-matches.
      const assessmentGroups = new Set<string>()
      for (const hit of this.index.search('esame esami exam exams examination', { prefix: false, fuzzy: false })) {
        const item = this.passages.get(hit.id)!
        if (item.source.provenance !== 'original' || (requested.size && !requested.has(item.source.lectureOrdinal ?? -1))) continue
        const group = item.source.lectureId ?? item.source.id
        if (assessmentGroups.has(group)) continue
        assessmentGroups.add(group); selected.push(item); counts.set(item.source.id, 1)
        if (selected.length >= Math.min(2, effectiveLimit)) break
      }
    }
    // A course-wide question needs different lectures before additional versions
    // of the same lecture. Keep explicit lesson constraints even for broad wording.
    if ((selection ?? plan).courseWide) {
      const groups = new Map<string, CourseCitation[]>()
      for (const result of results) {
        const item = this.passages.get(result.id)!
        if (requested.size && !requested.has(item.source.lectureOrdinal ?? -1)) continue
        const key = item.source.lectureId ?? `source:${item.source.id}`
        const group = groups.get(key) ?? []; group.push(item); groups.set(key, group)
      }
      const represented = new Set(selected.map(item => item.source.lectureId ?? `source:${item.source.id}`))
      for (const [key, group] of groups) {
        if (selected.length >= effectiveLimit) break
        if (represented.has(key)) continue
        const item = (selection ?? plan).teacherEvidence
          ? group.find(item => item.source.provenance === 'original') ?? group[0]
          : group[0]
        selected.push(item); counts.set(item.source.id, 1)
      }
    }
    // Round-robin prevents a long lesson from crowding out the other side of a comparison.
    for (let depth = 0; depth < 2; depth++) {
      for (const ordinal of requested) {
        for (const kind of ['transcript', 'notes']) {
          const candidates = results.map(result => this.passages.get(result.id)!).filter(item => item.source.lectureOrdinal === ordinal && item.source.kind === kind)
          const anchored = candidates.filter(item => symbols.some(symbol => normalizeCourseNotation(item.passage.text).toLowerCase().includes(symbol)))
          const ranked = [...anchored, ...candidates.filter(item => !anchored.includes(item))]
          const item = ranked[depth]
          if (item && !selected.some(existing => existing.passage.id === item.passage.id) && selected.length < effectiveLimit) {
            selected.push(item)
            counts.set(item.source.id, (counts.get(item.source.id) ?? 0) + 1)
          }
        }
      }
    }
    for (const result of results) {
      const item = this.passages.get(result.id)!
      if (requested.size && !requested.has(item.source.lectureOrdinal ?? -1)) continue
      if (selected.some(existing => existing.passage.id === item.passage.id)) continue
      if (selected.length >= effectiveLimit) break
      const count = counts.get(item.source.id) ?? 0
      if (count >= 3) continue
      counts.set(item.source.id, count + 1)
      selected.push(item)
      if (selected.length >= effectiveLimit) break
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
        const unpacked = new URL(installed.href.replace('.asar/', '.asar.unpacked/'))
        const runner = existsSync(unpacked) ? unpacked : existsSync(installed)
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
