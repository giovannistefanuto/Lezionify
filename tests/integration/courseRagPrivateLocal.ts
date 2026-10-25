// User-authorized read-only exercise of personal sources. No API keys or network calls.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { CourseRetrieval, splitCourseSource, ragHash, type IndexedCourseSource } from '../../electron/main/courseRagIndex'
import { CourseEvidenceWindow } from '../../electron/main/courseRagContext'
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import type { Lecture } from '../../shared/archive'
import { planCourseQuery } from '../../electron/main/courseRagQuery'

const root = join(process.env.APPDATA!, 'lezionify')
const library = JSON.parse(await readFile(join(root, 'library/library.json'), 'utf8')) as { lectures: Lecture[] }
const output = join(process.cwd(), 'local-artifacts/rag-private-2026-10-22')
await mkdir(output, { recursive: true })
const courses = [...new Set(library.lectures.map(lecture => lecture.courseCode))]
const sourcesByCourse = new Map<string, IndexedCourseSource[]>()
for (const course of courses) {
  const sources: IndexedCourseSource[] = []
  const lectures = library.lectures.filter(lecture => lecture.courseCode === course).sort((a, b) => (a.recordedAt ?? a.importedAt).localeCompare(b.recordedAt ?? b.importedAt))
  const ordinals = new Map(lectures.filter(lecture => !lecture.isLaboratory).map((lecture, index) => [lecture.id, index + 1]))
  for (const lecture of lectures) for (const kind of ['transcript', 'notes'] as const) {
    const fileName = kind === 'transcript' ? lecture.transcriptFileName : lecture.markdownFileName
    if (!fileName || basename(fileName) !== fileName) continue
    try {
      const text = await readFile(join(root, 'library', kind === 'transcript' ? 'transcripts' : 'markdown', fileName), 'utf8')
      sources.push(splitCourseSource({ id: ragHash(`${kind}:${lecture.id}`), title: `${kind} ${ordinals.get(lecture.id) ?? 'lab'}`, kind, provenance: kind === 'notes' ? 'ai-derived' : 'original', lectureId: lecture.id, lectureOrdinal: ordinals.get(lecture.id), recordedDate: lecture.recordedAt?.slice(0, 10), version: ragHash(text), status: 'ready' }, [{ text }]))
    } catch { /* Explicitly reported in technical counts; no writes to the library. */ }
  }
  try {
    const stored = JSON.parse(await readFile(join(root, 'course-rag', ragHash(course) + '.json'), 'utf8'))
    const external: IndexedCourseSource[] = stored.corpusRevision ? JSON.parse(await readFile(join(root, 'course-rag', `${ragHash(course)}.corpus.${stored.corpusRevision}.json`), 'utf8')) : stored.sources
    sources.push(...external.filter(source => ['ready', 'partial'].includes(source.status)))
  } catch { /* A course without linked documents still has the lecture corpus. */ }
  sourcesByCourse.set(course, sources)
}
let overviewChecks = 0
let indexedPassages = 0
for (const [, sources] of sourcesByCourse) {
  const retrieval = new CourseRetrieval(sources)
  indexedPassages += retrieval.all().length
  const available = [...new Set(sources.flatMap(source => source.lectureOrdinal ? [source.lectureOrdinal] : []))].slice(0, 2)
  if (available.length === 2) {
    const results = retrieval.search(`Confronta le lezioni ${available.join(' e ')}`)
    if (available.some(n => !results.some(result => result.source.lectureOrdinal === n))) throw new Error('Copertura panoramica privata incompleta.')
    overviewChecks++
  }
  if (retrieval.search('Riassumi la lezione 999').length) throw new Error('Fonte fuori vincolo nel corpus privato.')
}
const selected = sourcesByCourse.get('RL') ?? []
const retrieval = new CourseRetrieval(selected)
const query = 'Confronta Q_pi e politica greedy nelle lezioni 5, 6 e 7'
const lexical = retrieval.search(query)
const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
let hybrid = lexical
const studyRows: { course: string; category: string; question: string; courseWide: boolean; originals: number; lessons: number[]; passages: ReturnType<CourseRetrieval['search']> }[] = []
try {
  if ((await semantic.state()).status === 'ready') {
    const ids = await semantic.rank('Q_pi politica greedy modello noto ignoto', retrieval.all().filter(item => [5, 6, 7].includes(item.source.lectureOrdinal ?? 0)), AbortSignal.timeout(120000))
    hybrid = retrieval.search(query, 12, undefined, ids)
  }
  if (process.argv.includes('--study-questions')) {
    const themes = [
      { course: 'RL', topic: 'Q_pi e politica greedy', a: 'TD', b: 'Monte Carlo' },
      { course: 'GT', topic: 'lotterie e utilità attesa', a: 'valore atteso', b: 'utilità attesa' },
      { course: 'RC', topic: 'controllo adattativo', a: 'stabilità', b: 'convergenza dei parametri' },
      { course: 'IR', topic: 'embodiment', a: 'robot', b: 'computer' }
    ]
    for (const theme of themes) {
      const sources = sourcesByCourse.get(theme.course)
      if (!sources?.length) continue
      const local = new CourseRetrieval(sources)
      const questions = [
        ['esame', `Cosa ha detto il prof riguardo all esame? Ci sono esercizi su ${theme.topic} oppure no?`],
        ['obblighi-studio', `La dimostrazione su ${theme.topic} che ha fatto qualche lezione fa è da studiare?`],
        ['casi-pratici', `In quali casi pratici sparsi nel corso abbiamo studiato ${theme.topic}?`],
        ['spiegazione-mirata', `Puoi riprendere ${theme.topic}? Non ho capito definizione, ipotesi e applicazioni.`],
        ['esercizio-generato', `Puoi generare un esercizio a partire da ${theme.topic}?`],
        ['confronto-concetti', `Che differenza c è tra ${theme.a} e ${theme.b}?`],
        ['copertura-corso', `Il prof ha mai parlato di ${theme.topic}? In che termini e in che lezioni, dicendo cosa?`],
        ['cambio-ipotesi', `Come mai ${theme.topic} sembrava valido nella lezione di ieri ma non oggi? Quali ipotesi sono cambiate?`]
      ]
      for (const [category, question] of questions) {
        const plan = planCourseQuery(question)
        const ids = await semantic.rank(plan.query, local.all(), AbortSignal.timeout(120000))
        const passages = local.search(plan.query, 12, plan.lessons, ids, plan)
        studyRows.push({ course: theme.course, category, question, courseWide: plan.courseWide,
          originals: passages.filter(item => item.source.provenance === 'original').length,
          lessons: [...new Set(passages.flatMap(item => item.source.lectureOrdinal ? [item.source.lectureOrdinal] : []))], passages })
      }
    }
    await writeFile(join(output, 'study-questions-private.json'), JSON.stringify({ rows: studyRows,
      limitation: 'Retrieval inspection only. Questions may have no answer in these sources; presence of topic passages does not establish examination requirements, a proof, or a change of assumptions. Relative dates remain ambiguous without identified lectures.' }, null, 2))
  }
} finally { semantic.dispose() }
const context = new CourseEvidenceWindow([5, 6, 7])
context.replaceWith(hybrid)
const coverage = context.coverage()
if (selected.length && coverage.missingLessons.length) throw new Error('Confronto RL privato incompleto.')
await writeFile(join(output, 'retrieval-private.json'), JSON.stringify({ query, lexical, hybrid, coverage }, null, 2))
const summary = { result: 'PASS', courses: courses.length, lectures: library.lectures.length, sources: [...sourcesByCourse.values()].reduce((n, sources) => n + sources.length, 0), passages: indexedPassages, overviewChecks, rlCoverage: coverage.retrievedLessons, studyQuestions: studyRows.length, studyQuestionsWithOriginals: studyRows.filter(row => row.originals > 0).length, networkDocuments: 0, limitation: 'Read-only local retrieval checks, not a generated-answer evaluation.' }
await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary))
