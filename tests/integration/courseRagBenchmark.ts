import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CourseRetrieval, splitCourseSource } from '../../electron/main/courseRagIndex'
import { LocalCourseSemantic } from '../../electron/main/courseRagSemantic'
import { planCourseQuery } from '../../electron/main/courseRagQuery'
import { ragBenchmarkSources, ragBenchmarkCases, ragStudySources, ragStudyCases } from '../fixtures/courseRagBenchmark'

const directory = join(process.cwd(), 'local-artifacts/rag-benchmark-2026-10-22')
await mkdir(directory, { recursive: true })
const study = process.argv.includes('--study-questions')
const sources = (study ? ragStudySources : ragBenchmarkSources).map(source => splitCourseSource({ id: source.id, title: 'Materiale del corso', kind: 'transcript', version: 'synthetic-v1', status: 'ready', lectureId: source.id, lectureOrdinal: source.ordinal }, [{ text: source.text }]))
const retrieval = new CourseRetrieval(sources)
const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
const hybrid = process.argv.includes('--semantic')
if (hybrid && (await semantic.state()).status !== 'ready') throw new Error('Scaricare esplicitamente il modello con run_course_semantic_local.mjs --download-model.')
const results: { id: string; category: string; expected: string[]; found: string[]; recall: number; reciprocalRank: number; correctAbstention?: boolean }[] = []
try {
  for (const item of study ? ragStudyCases : ragBenchmarkCases) {
    const plan = planCourseQuery(item.query)
    const all = retrieval.all().filter(passage => !plan.lessons.length || plan.lessons.includes(passage.source.lectureOrdinal ?? -1))
    const semanticIds = hybrid && plan.query ? await semantic.rank(plan.query, all, AbortSignal.timeout(120000)) : []
    const found = [...new Set(retrieval.search(item.query, 8, undefined, semanticIds, plan).map(passage => passage.source.id))]
    const position = found.findIndex(id => item.expected.includes(id))
    results.push({ id: item.id, category: item.category, expected: item.expected, found,
      recall: item.expected.length ? item.expected.filter(id => found.includes(id)).length / item.expected.length : Number(!found.length),
      reciprocalRank: item.expected.length ? position >= 0 ? 1 / (position + 1) : 0 : Number(!found.length),
      correctAbstention: item.expected.length ? undefined : !found.length })
  }
} finally { semantic.dispose() }
const answerable = results.filter(result => result.expected.length)
const unanswerable = results.filter(result => !result.expected.length)
const report = { mode: hybrid ? 'hybrid-local' : 'lexical', cases: results.length, answerableCases: answerable.length,
  recallAt8: answerable.reduce((sum, result) => sum + result.recall, 0) / answerable.length,
  mrrAt8: answerable.reduce((sum, result) => sum + result.reciprocalRank, 0) / answerable.length,
  scopeAbstention: unanswerable.filter(result => result.correctAbstention).length / unanswerable.length,
  results, limitation: 'Synthetic retrieval benchmark. Does not measure factual correctness of generated answers or establish accuracy on arbitrary courses.' }
await writeFile(join(directory, `${report.mode}${study ? '-study-questions' : ''}.json`), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ mode: report.mode, cases: report.cases, recallAt8: report.recallAt8, mrrAt8: report.mrrAt8 }))
