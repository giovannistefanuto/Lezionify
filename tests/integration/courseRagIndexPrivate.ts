// Read-only private corpus, explicit local indexing, no remote AI or downloads.
import { readFile, mkdir, writeFile, cp, access } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { performance } from 'node:perf_hooks'
import { CourseRagService } from '../../electron/main/courseRag'
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import { splitCourseSource, ragHash, type IndexedCourseSource } from '../../electron/main/courseRagIndex'
import type { Lecture } from '../../shared/archive'
const root = join(process.env.APPDATA!, 'lezionify/library')
const output = join(process.cwd(), 'local-artifacts/rag-index-private-2026-10-23')
await mkdir(output, { recursive: true })
const libraryRaw = await readFile(join(root, 'library.json'), 'utf8')
const lectures = (JSON.parse(libraryRaw) as { lectures: Lecture[] }).lectures
const courses = [...new Set(lectures.map(lecture => lecture.courseCode))]
const corpus = new Map<string, IndexedCourseSource[]>()
const originals = new Map<string, string>()
for (const course of courses) {
  const sources: IndexedCourseSource[] = []
  const ordered = lectures.filter(lecture => lecture.courseCode === course && !lecture.isLaboratory).sort((a, b) => (a.recordedAt ?? a.importedAt).localeCompare(b.recordedAt ?? b.importedAt))
  const ordinals = new Map(ordered.map((lecture, index) => [lecture.id, index + 1]))
  for (const lecture of lectures.filter(lecture => lecture.courseCode === course)) for (const kind of ['transcript', 'notes'] as const) {
    const name = kind === 'transcript' ? lecture.transcriptFileName : lecture.markdownFileName
    if (!name || basename(name) !== name) continue
    const path = join(root, kind === 'transcript' ? 'transcripts' : 'markdown', name)
    const text = await readFile(path, 'utf8'); originals.set(path, ragHash(text))
    sources.push(splitCourseSource({ id: ragHash(`${kind}:${lecture.id}`), title: kind, kind, provenance: kind === 'notes' ? 'ai-derived' : 'original', lectureId: lecture.id, lectureOrdinal: ordinals.get(lecture.id), version: ragHash(text), status: 'ready' }, [{ text }]))
  }
  corpus.set(course, sources)
}
const semanticDirectory = join(output, 'semantic')
try { await access(join(semanticDirectory, 'ready.json')) } catch {
  await cp(join(process.cwd(), 'local-artifacts/rag-semantic-model'), semanticDirectory, { recursive: true })
}
const semantic = new LocalCourseSemantic(semanticDirectory)
if ((await semantic.state()).status !== 'ready') throw new Error('Explicitly downloaded model required')
const service = new CourseRagService(join(output, 'profile'), { semantic, archiveSources: async course => ({ sources: corpus.get(course) ?? [], missingTranscripts: 0 }), complete: async () => { throw new Error('Remote AI forbidden') } })
const results = []
try {
  for (const course of courses) {
    const began = performance.now()
    await service.manageIndex(course, 'start')
    const deadline = Date.now() + 15 * 60000
    let state = await service.state(course)
    while (['running', 'paused'].includes(state.indexing?.status ?? 'running')) {
      if (Date.now() >= deadline) throw new Error('Local corpus index deadline exceeded')
      await new Promise(resolve => setTimeout(resolve, 500))
      state = await service.state(course)
    }
    if (state.indexing?.status !== 'complete') throw new Error(`Local index not complete: ${state.indexing?.issue ?? state.indexing?.status}`)
    const coldMs = performance.now() - began
    const warm = performance.now()
    await service.manageIndex(course, 'start')
    do { await new Promise(resolve => setTimeout(resolve, 100)); state = await service.state(course) } while (state.indexing?.status === 'running')
    if (state.indexing?.status !== 'complete') throw new Error('Warm reuse not complete')
    results.push({ course, sources: state.sources.length, passages: state.indexing.total, coldMs: Math.round(coldMs), warmMs: Math.round(performance.now() - warm), completed: state.indexing.completed })
    await writeFile(join(output, 'index-summary.json'), JSON.stringify({ results, memoryBytes: process.memoryUsage().rss, storage: await semantic.storage() }, null, 2))
    console.log(JSON.stringify({ course, passages: state.indexing.total, status: 'complete', coldMs: Math.round(coldMs), warmMs: Math.round(performance.now() - warm) }))
  }
  for (const [path, hash] of originals) if (ragHash(await readFile(path, 'utf8')) !== hash) throw new Error('Original changed during read-only evaluation')
  if (await readFile(join(root, 'library.json'), 'utf8') !== libraryRaw) throw new Error('Library changed during evaluation')
  await writeFile(join(output, 'verified.json'), JSON.stringify({ result: 'PASS', courses: courses.length, originalsUnchanged: originals.size, libraryUnchanged: true, remoteCalls: 0, results }, null, 2))
} finally { service.dispose() }
