import type { CourseCitation, CourseEvidenceCoverage } from '../../shared/courseRag'

export const COURSE_CONTEXT_LIMITS = { passages: 24, characters: 32_000 }

/** Rebuild the evidence window after each retrieval; old text never owns the budget. */
export class CourseEvidenceWindow {
  private selected: CourseCitation[] = []
  private pinned: CourseCitation[] = []
  constructor(private lessons: number[]) {}

  replaceWith(items: CourseCitation[], pinned = this.pinned): CourseCitation[] {
    this.pinned = pinned
    const unique = new Map<string, CourseCitation>()
    for (const item of [...items, ...this.selected]) {
      if (item.passage.id.startsWith('image:')) continue
      if (this.lessons.length && !this.lessons.includes(item.source.lectureOrdinal ?? -1)) continue
      if (!unique.has(item.passage.id)) unique.set(item.passage.id, item)
    }
    const candidates = [...unique.values()]
    // An exact copy from a derivation never displaces its available original.
    const fingerprint = (item: CourseCitation) => `${item.source.lectureId ?? item.source.lectureOrdinal ?? item.source.id}:` + item.passage.text.replace(/\s+/g, ' ').trim()
    const originals = new Set(candidates.filter(item => item.source.provenance !== 'ai-derived' && item.source.kind !== 'notes').map(fingerprint))
    const preferred = candidates.filter(item => !(item.source.provenance === 'ai-derived' || item.source.kind === 'notes') || !originals.has(fingerprint(item)))
    const ordered: CourseCitation[] = []
    // Reserve the first relevant evidence for each requested lesson before filling.
    for (const n of this.lessons) {
      const lesson = preferred.filter(item => item.source.lectureOrdinal === n)
      const original = lesson.find(item => item.source.provenance !== 'ai-derived' && item.source.kind !== 'notes')
      if (original ?? lesson[0]) ordered.push((original ?? lesson[0])!)
    }
    ordered.push(...preferred)
    const chosen: CourseCitation[] = []
    const ids = new Set<string>()
    const exactText = new Set<string>()
    const sourceCounts = new Map<string, number>()
    let characters = 0
    for (const item of [...pinned, ...ordered]) {
      const fingerprint = `${item.source.lectureId ?? item.source.lectureOrdinal ?? item.source.id}:` + item.passage.text.replace(/\s+/g, ' ').trim()
      if (ids.has(item.passage.id) || (!item.passage.id.startsWith('image:') && exactText.has(fingerprint))) continue
      if (chosen.length >= COURSE_CONTEXT_LIMITS.passages || characters + item.passage.text.length > COURSE_CONTEXT_LIMITS.characters) continue
      if ((sourceCounts.get(item.source.id) ?? 0) >= 4 && !item.passage.id.startsWith('image:')) continue
      chosen.push(item)
      ids.add(item.passage.id)
      exactText.add(fingerprint)
      characters += item.passage.text.length
      sourceCounts.set(item.source.id, (sourceCounts.get(item.source.id) ?? 0) + 1)
    }
    this.selected = chosen
    return this.values()
  }
  values(): CourseCitation[] { return [...this.selected] }
  get(id: string): CourseCitation | undefined { return this.selected.find(item => item.passage.id === id) }
  coverage(citationIds: string[] = [], semantic: 'local' | 'unavailable' = 'unavailable'): CourseEvidenceCoverage {
    const sources = [...new Map(this.selected.map(item => [item.source.id, item.source])).values()]
    const retrievedLessons = [...new Set(sources.flatMap(source => source.lectureOrdinal ? [source.lectureOrdinal] : []))]
    const citedLessons = [...new Set(citationIds.flatMap(id => this.get(id)?.source.lectureOrdinal ? [this.get(id)!.source.lectureOrdinal!] : []))]
    return {
      requestedLessons: this.lessons, retrievedLessons, citedLessons,
      missingLessons: this.lessons.filter(n => !retrievedLessons.includes(n)),
      originalSources: sources.filter(source => source.provenance !== 'ai-derived' && source.kind !== 'notes' && source.kind !== 'course').length,
      derivedSources: sources.filter(source => source.provenance === 'ai-derived' || source.kind === 'notes').length,
      independentGroups: new Set(sources.map(source => source.lectureId ?? source.derivedFrom?.[0] ?? source.id)).size,
      passages: this.selected.length, characters: this.selected.reduce((sum, item) => sum + item.passage.text.length, 0), semantic
    }
  }
}
