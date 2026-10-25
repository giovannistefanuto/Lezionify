import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CourseRagService } from '../../electron/main/courseRag'
import { CourseEvidenceWindow } from '../../electron/main/courseRagContext'
import { CourseRetrieval, ragHash, splitCourseSource } from '../../electron/main/courseRagIndex'
import { planCourseQuery } from '../../electron/main/courseRagQuery'
import { referencedLectureOrdinals } from '../../shared/courseRag'

const directories: string[] = []
afterEach(async () => { for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true }) })
const make = (id: string, text: string, ordinal?: number, kind: 'transcript' | 'notes' = 'transcript') => splitCourseSource({ id, title: id, kind, provenance: kind === 'notes' ? 'ai-derived' : 'original', lectureId: ordinal ? `lesson-${ordinal}` : id, lectureOrdinal: ordinal, version: ragHash(text), status: 'ready' }, [{ text }])

it('keeps explicit single-lesson constraints and retrieves representative evidence for a topic-free comparison', () => {
  const retrieval = new CourseRetrieval([make('a', 'Programmazione dinamica e valore.', 1), make('b', 'Il martingala è un processo stocastico.', 2)])
  expect(retrieval.search('Nella lezione 1 cosa significa martingala?')).toEqual([])
  expect(new Set(retrieval.search('Confronta le lezioni 1 e 2').map(item => item.source.lectureOrdinal))).toEqual(new Set([1, 2]))
  expect(referencedLectureOrdinals('Confronta lezioni 2-4; pagina 88; Q_3')).toEqual([2, 3, 4])
})

it('inherits scope for an explicit follow-up but never from an unrelated old question', () => {
  expect(planCourseQuery('E invece perché?', ['Spiega Bellman nella lezione 3']).lessons).toEqual([3])
  expect(planCourseQuery('Spiega i banditi', ['Spiega Bellman nella lezione 3']).lessons).toEqual([])
  expect(planCourseQuery('E nella lezione 4?', ['Spiega Bellman nella lezione 3']).lessons).toEqual([4])
})

it('reopens the whole course for a cross-course follow-up instead of inheriting one old lesson', () => {
  expect(planCourseQuery('Perché questo compare in casi pratici sparsi nel corso?', ['Spiega Bellman nella lezione 3']).lessons).toEqual([])
})

it('reserves an original exam statement even when technical-topic hits fill every result slot', () => {
  const sources = [...Array.from({ length: 15 }, (_, index) => make(`topic-${index}`, 'Bellman Bellman Bellman politica greedy.', index + 1)),
    make('exam-original', 'For the final exam the proof is not required. The written examination includes exercises.', 90)]
  const found = new CourseRetrieval(sources).search('Cosa ha detto il prof riguardo all esame? Ci sono esercizi sulla dimostrazione di Bellman e sulla politica greedy?', 8)
  expect(found.some(item => item.source.id === 'exam-original')).toBe(true)
  expect(found.some(item => item.source.id.startsWith('topic-'))).toBe(true)
  expect(new CourseRetrieval(sources).search('All esame Bellman, solo nella lezione 2', 8).every(item => item.source.lectureOrdinal === 2)).toBe(true)
  expect(new CourseRetrieval([make('example', 'An example from a tutorial.', 1)]).search('Cosa c è all esame?')).toEqual([])
})

it('cross-course teacher questions retrieve different lessons and prefer their original passages', () => {
  const sources = [
    ...Array.from({ length: 12 }, (_, variant) => make(`notes-${variant}`, 'Bellman.', 1, 'notes')),
    ...Array.from({ length: 8 }, (_, index) => make(`raw-${index + 1}`, 'Bellman. ' + 'Una lunga premessa per discutere il contesto. '.repeat(30), index + 1))
  ]
  const found = new CourseRetrieval(sources).search('In quali casi pratici sparsi nel corso il prof ha parlato di Bellman?', 8)
  expect(new Set(found.map(item => item.source.lectureOrdinal)).size).toBe(8)
  expect(found.every(item => item.source.kind === 'transcript')).toBe(true)
  const scoped = new CourseRetrieval(sources).search('Casi di Bellman sparsi nel corso: solo nella lezione 2', 8)
  expect(scoped.length).toBeGreaterThan(0)
  expect(scoped.every(item => item.source.lectureOrdinal === 2)).toBe(true)
})

it('keeps cross-course coverage after a model reformulates the search without repeating its scope', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rag-coursewide-')); directories.push(directory)
  const sources = [
    ...Array.from({ length: 14 }, (_, index) => make(`derived-${index}`, 'Bellman.', 1, 'notes')),
    ...Array.from({ length: 8 }, (_, index) => ({ ...make(`original-${index}`, 'Bellman. ' + `Esempio della lezione ${index + 1}. `.repeat(30), index + 1), numbering: 'official' as const, chronologicalOrdinal: index + 2 }))
  ]
  let calls = 0
  const inputs: any[] = []
  const service = new CourseRagService(directory, { archiveSources: async () => ({ sources, missingTranscripts: 0 }), complete: async prompt => {
    const input = JSON.parse(prompt)
    inputs.push(input)
    if (++calls === 1) return JSON.stringify({ action: 'search_course', query: 'Bellman' })
    return JSON.stringify({ action: 'answer', text: '## Dalle fonti del corso\nEsempi nelle lezioni consultate.', passageIds: input.passages.map((item: any) => item.passage.id) })
  } })
  try {
    await service.saveThread('TEST', { id: 'study', title: 'Studio', draft: '', messages: [], updatedAt: '' })
    await service.setLectureNumber('TEST', 'lesson-1', 1)
    const answer = await service.ask('TEST', 'study', 'In quali casi sparsi nel corso il prof ha parlato di Bellman?', 'request')
    expect(answer.messages.at(-1)?.evidence?.retrievedLessons.length).toBe(8)
    expect(calls).toBe(2)
    for (const input of inputs) {
      expect(input.queryPlan.courseWide).toBe(true)
      expect(input.evidenceCoverage.retrievedLessons.length).toBe(8)
      expect(input.coverage.sources.some((source: any) => source.numbering === 'official' && source.chronologicalOrdinal === 1)).toBe(true)
    }
  } finally { service.dispose() }
})

it('keeps code and display formulas together, records headings and preserves original offsets', () => {
  const text = '# Ipotesi\n\n' + 'Premessa lunga. '.repeat(130) + '\n\n$$\nQ(s,a)=r+\\gamma V(s)\n$$\n\n## Algoritmo\n\n```python\n' + 'update(value)\n'.repeat(50) + '```\n'
  const source = make('math', text)
  expect(source.passages.some(p => p.text.includes('$$\nQ(s,a)=r+\\gamma V(s)\n$$'))).toBe(true)
  expect(source.passages.some(p => p.text.includes('```python\n') && p.text.includes('```\n'))).toBe(true)
  for (const p of source.passages) expect(text.slice(p.offset, p.offset + p.text.length)).toBe(p.text)
  expect(source.passages.some(p => p.section?.includes('Ipotesi'))).toBe(true)
})

it('replaces saturated initial context with newly requested evidence without losing lesson coverage or images', () => {
  const items = [1, 2, 3].flatMap(n => new CourseRetrieval([make(`old${n}`, `Lezione ${n}. ` + 'x'.repeat(9000), n)]).all())
  const context = new CourseEvidenceWindow([1, 2, 3])
  context.replaceWith(items)
  const fresh = new CourseRetrieval([make('fresh', 'Evidenza decisiva. ' + 'y'.repeat(2100), 2)]).all()
  context.replaceWith(fresh)
  expect(context.get(fresh[0].passage.id)).toBeDefined()
  expect(context.coverage().missingLessons).toEqual([])
  expect(context.coverage().characters).toBeLessThanOrEqual(32000)
  expect(context.coverage().passages).toBeLessThanOrEqual(24)
})

it('counts transcript and derived notes as one provenance group and retains evidence from different lessons', () => {
  const retrieval = new CourseRetrieval([make('raw', 'Identica definizione.', 1), make('notes', 'Identica definizione.', 1, 'notes'), make('other', 'Identica definizione.', 2)])
  const context = new CourseEvidenceWindow([1, 2])
  context.replaceWith(retrieval.all())
  expect(context.coverage()).toMatchObject({ independentGroups: 2, originalSources: 2, derivedSources: 0, missingLessons: [] })
})

it('updates a cached index by source version, removes missing sources and refreshes metadata', () => {
  const first = make('a', 'Nash', 1)
  const retrieval = new CourseRetrieval([first])
  retrieval.update([{ ...make('a', 'Bellman', 2), recordedDate: '2026-10-22' }])
  expect(retrieval.search('Nash')).toEqual([])
  expect(retrieval.search('Bellman')[0].source).toMatchObject({ lectureOrdinal: 2, recordedDate: '2026-10-22' })
  retrieval.update([{ ...first, status: 'missing' }])
  expect(retrieval.search('Nash')).toEqual([])
})

it('migrates legacy corpus before replacing metadata and does not rewrite corpus when saving a draft', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rag-migration-'))
  directories.push(directory)
  const file = join(directory, ragHash('TEST') + '.json')
  await writeFile(file, JSON.stringify({ course: 'TEST', enabled: false, files: [], sources: [make('a', 'Fonte originale')], threads: [] }))
  const deps = { archiveSources: async () => ({ sources: [], missingTranscripts: 0 }), complete: async () => '' }
  const service = new CourseRagService(directory, deps)
  await service.saveThread('TEST', { id: 'chat', title: 'Chat', draft: '', messages: [], updatedAt: '' })
  const metadata = JSON.parse(await readFile(file, 'utf8'))
  expect(metadata.sources).toEqual([])
  const corpusFile = join(directory, `${ragHash('TEST')}.corpus.${metadata.corpusRevision}.json`)
  const before = await stat(corpusFile)
  await service.saveThread('TEST', { id: 'chat', title: 'Chat', draft: 'Nuova bozza', messages: [], updatedAt: '' })
  expect((await stat(corpusFile)).mtimeMs).toBe(before.mtimeMs)
  const restarted = new CourseRagService(directory, deps)
  expect((await restarted.state('TEST')).sources[0].title).toBe('a')
  expect((await restarted.state('TEST')).threads[0].draft).toBe('Nuova bozza')
  service.dispose(); restarted.dispose()
})

it('only reports delivered tool passages after replacement of a saturated context', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rag-evidence-'))
  directories.push(directory)
  const sources = [1, 2, 3].flatMap(n => ['transcript', 'notes'].map(kind => make(`${n}-${kind}`, 'termalpha '.repeat(510), n, kind as 'transcript' | 'notes')))
  sources.push(...[1, 2, 3, 4].map(n => make(`new${n}`, 'ultrazeta ' + 'z'.repeat(2100), 2)))
  let calls = 0
  const service = new CourseRagService(directory, { archiveSources: async () => ({ sources, missingTranscripts: 0 }), complete: async prompt => {
    const input = JSON.parse(prompt)
    if (++calls === 1) return JSON.stringify({ action: 'search_course', query: 'ultrazeta' })
    const received = new Set(input.passages.map((item: any) => item.passage.id))
    expect(input.toolResult.length).toBeGreaterThan(0)
    expect(input.toolResult.every((id: string) => received.has(id))).toBe(true)
    expect(input.passages.some((item: any) => item.passage.text.includes('ultrazeta'))).toBe(true)
    expect(input.evidenceCoverage.missingLessons).toEqual([])
    return JSON.stringify({ action: 'answer', text: 'Dalle fonti: confronto.', passageIds: input.toolResult })
  } })
  await service.saveThread('TEST', { id: 'chat', title: 'Chat', draft: '', messages: [], updatedAt: '' })
  const result = await service.ask('TEST', 'chat', 'Confronta termalpha nelle lezioni 1, 2 e 3', 'request')
  expect(result.messages.at(-1)?.evidence?.passages).toBeGreaterThan(0)
  service.dispose()
})
