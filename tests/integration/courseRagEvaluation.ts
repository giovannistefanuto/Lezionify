import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CourseRetrieval, splitCourseSource } from '../../electron/main/courseRagIndex'
import { LocalCourseSemantic, COURSE_EMBEDDING_REVISION, COURSE_EMBEDDING_POLICY } from '../../electron/main/courseRagSemantic'
import { planCourseQuery } from '../../electron/main/courseRagQuery'
import { evaluationSources, evaluationCases } from '../fixtures/courseRagEvaluation'

const hybrid = process.argv.includes('--semantic')
const calibration = process.argv.includes('--calibration')
const directory = join(process.cwd(), 'local-artifacts/rag-evaluation-2026-10-23')
await mkdir(directory, { recursive: true })
const semantic = new LocalCourseSemantic(join(process.cwd(), 'local-artifacts/rag-semantic-model'))
if (hybrid && (await semantic.state()).status !== 'ready') throw new Error('Local model is required for requested semantic evaluation')
const results = []
try {
  for (const item of evaluationCases.filter(item => item.split === (calibration ? 'calibration' : 'heldout'))) {
    const sources = evaluationSources.filter(source => source.course === item.course).map(source => splitCourseSource({ id: source.id, title: 'Materiale del corso', lectureId: source.id.replace('-derived', '-raw'), lectureOrdinal: source.ordinal, kind: source.derived ? 'notes' : 'transcript', provenance: source.derived ? 'ai-derived' : 'original', version: 'synthetic-20261023', status: 'ready' }, [{ text: source.text }]))
    const retrieval = new CourseRetrieval(sources)
    const plan = planCourseQuery(item.question, item.previous)
    const began = performance.now()
    const ids = hybrid && plan.query ? await semantic.rank(plan.query, retrieval.all().filter(p => !plan.lessons.length || plan.lessons.includes(p.source.lectureOrdinal ?? -1)), AbortSignal.timeout(60000)) : []
    const retrieved = retrieval.search(plan.query, 8, plan.lessons, ids)
    const found = [...new Set(retrieved.map(p => p.source.id))]
    const hits = found.filter(id => item.expected.includes(id)).length
    const position = found.findIndex(id => item.expected.includes(id))
    const dcg = found.reduce((sum, id, rank) => sum + (item.expected.includes(id) ? 1 / Math.log2(rank + 2) : 0), 0)
    const ideal = item.expected.reduce((sum, _, rank) => sum + 1 / Math.log2(rank + 2), 0)
    results.push({ id: item.id, split: item.split, category: item.category, expected: item.expected, found, scopeValid: retrieved.every(p => !plan.lessons.length || plan.lessons.includes(p.source.lectureOrdinal ?? -1)), recall: item.expected.length ? hits / item.expected.length : null, precision: found.length ? hits / found.length : Number(!item.expected.length), reciprocalRank: position < 0 ? 0 : 1 / (position + 1), ndcg: ideal ? dcg / ideal : null, abstained: !found.length, elapsedMs: performance.now() - began })
  }
} finally { semantic.dispose() }
const positive = results.filter(r => r.expected.length), negative = results.filter(r => !r.expected.length)
const mean = (items: typeof results, key: 'recall' | 'precision' | 'reciprocalRank' | 'ndcg') => items.length ? items.reduce((sum, r) => sum + (r[key] ?? 0), 0) / items.length : null
let seed = 20261023
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32 }
const intervals = Object.fromEntries((['recall', 'precision', 'reciprocalRank'] as const).map(key => {
  const samples = Array.from({ length: 1000 }, () => mean(Array.from({ length: positive.length }, () => positive[Math.floor(random() * positive.length)]), key) ?? 0).sort((a, b) => a - b)
  return [key, [samples[25], samples[974]]]
}))
const summary = { mode: hybrid ? 'hybrid' : 'lexical', split: calibration ? 'calibration' : 'heldout', cases: results.length, positive: positive.length, negative: negative.length, recallAt8: mean(positive, 'recall'), precisionAt8: mean(positive, 'precision'), mrr: mean(positive, 'reciprocalRank'), ndcg: mean(positive, 'ndcg'), falsePositiveRate: negative.length ? negative.filter(r => !r.abstained).length / negative.length : null, bootstrap95: intervals, modelRevision: COURSE_EMBEDDING_REVISION, embeddingPolicy: COURSE_EMBEDDING_POLICY, rankingPolicy: { rrf: 30, semanticFloor: .25, relativeBand: process.argv.includes('--baseline') ? 0 : .75, lexical: 'unfiltered' }, segmentationRevision: 3, categories: Object.fromEntries([...new Set(results.map(r => r.category))].map(category => { const group = results.filter(r => r.category === category); return [category, { cases: group.length, recall: mean(group.filter(r => r.expected.length), 'recall'), precision: mean(group, 'precision') }] })), results }
await writeFile(join(directory, `${summary.mode}-${summary.split}${process.argv.includes('--baseline') ? '-baseline' : ''}.json`), JSON.stringify(summary, null, 2))
console.log(JSON.stringify({ ...summary, categories: undefined, results: undefined }))
// Preserve measured offline baseline and exact comparison/scope invariants.
// Negative candidates are measured separately; generated-answer abstention is
// evaluated remotely, never inferred from a similarity score.
if (process.argv.includes('--gate') && ((summary.recallAt8 ?? 0) < (hybrid ? .95 : .85) || (summary.mrr ?? 0) < (hybrid ? .9 : .8) || (summary.precisionAt8 ?? 0) < .6 || (summary.falsePositiveRate ?? 0) > .6 || results.some(r => !r.scopeValid || (r.category === 'confronto' && r.recall !== 1)))) process.exitCode = 1
