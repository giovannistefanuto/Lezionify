import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CANDIDATES, median } from './qna_benchmark_core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const id = process.argv[2]
if (!/^[a-z0-9][a-z0-9-]{0,90}$/.test(id || '')) {
  console.error('Specificare un nome di run valido, senza percorsi.'); process.exit(1)
}
const directory = join(root, 'local-artifacts/qna-benchmark', id)
if (!existsSync(directory) || existsSync(join(directory, 'INVALIDATED.json'))) {
  console.error('Run mancante o invalidato.'); process.exit(1)
}
const records = readdirSync(directory).filter(n => n.endsWith('.result.json')).map(n => JSON.parse(readFileSync(join(directory, n), 'utf8')))
const variants = [...new Set(records.map(r => r.phase))]
const range = rows => {
  const values = rows.filter(Number.isFinite).sort((a, b) => a - b)
  return { n: values.length, median: median(values), min: values[0] ?? null, max: values.at(-1) ?? null, p90Descriptive: values.length >= 20 ? values[Math.ceil(values.length * .9) - 1] : null }
}
const summaries = {}
for (const phase of variants) {
  summaries[phase] = CANDIDATES.map(candidate => {
    const rows = records.filter(r => r.phase === phase && r.candidateId === candidate.id)
    const successful = rows.filter(r => r.status === 'success')
    const attempts = rows.flatMap(row => {
      const file = join(directory, `${row.jobId}.attempts${row.phase === 'real' ? '.private' : ''}.json`)
      return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
    })
    const timestamp = rows.filter(r => r.at).map(r => Date.parse(r.at))
    return {
      candidateId: candidate.id, requestedModel: candidate.model,
      results: rows.length, success: successful.length, failed: rows.filter(r => r.status === 'failed').length, skipped: rows.filter(r => r.status === 'skipped').length,
      errors: Object.fromEntries([...new Set(rows.filter(r => r.errorCategory).map(r => r.errorCategory))].map(category => [category, rows.filter(r => r.errorCategory === category).length])),
      firstTextMs: range(successful.map(r => r.ttftMs)), text20Ms: range(successful.map(r => r.text20Ms)), totalMs: range(successful.map(r => r.totalMs)),
      firstAttemptFirstTextMs: range(attempts.filter(r => r.attempt === 1 && r.status === 'success').map(r => r.ttftMs)),
      physicalAttempts: attempts.length, retries: attempts.filter(r => r.attempt > 1).length,
      inputTokens: range(successful.map(r => r.usage?.promptTokens)), outputTokens: range(successful.map(r => r.usage?.completionTokens)),
      reportedTotalTokens: rows.reduce((sum, r) => sum + (r.usage?.totalTokens ?? 0), 0), usageMissing: rows.filter(r => r.status !== 'skipped' && !r.usage).length,
      automaticScreeningAvailable: successful.filter(r => typeof r.screening?.passed === 'boolean').length,
      automaticScreeningPassed: successful.filter(r => r.screening?.passed === true).length,
      automaticScreeningFailed: successful.filter(r => r.screening?.passed === false).map(r => ({ caseId: r.caseId, repetition: r.repetition, jobId: r.jobId })),
      actualInputTargets: [...new Set(rows.map(r => r.targetTokensApprox).filter(Number.isFinite))],
      window: timestamp.length ? { firstResult: new Date(Math.min(...timestamp)).toISOString(), lastResult: new Date(Math.max(...timestamp)).toISOString() } : null,
      caseCount: new Set(rows.map(r => r.caseId)).size
    }
  })
}
const ledger = JSON.parse(readFileSync(join(root, 'local-artifacts/qna-benchmark/budget-ledger.json'), 'utf8'))
const day = new Date().toISOString().slice(0, 10)
const budgets = CANDIDATES.map(candidate => {
  const rows = ledger.entries.filter(e => e.day === day && e.candidateId === candidate.id)
  return { candidateId: candidate.id, dayUtc: day, physicalRequestsToday: rows.length, settled: rows.filter(e => e.settled).length, charged: rows.reduce((sum, e) => sum + e.charge, 0), unit: candidate.provider === 'groq' ? 'tokens' : 'neurons-estimated', conservativeMaximum: candidate.provider === 'groq' ? 160000 : 8000 }
})
const analysis = { generatedAt: new Date().toISOString(), run: id, records: records.length, plannedJobs: JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')).jobs, summaries, budgets,
  limitations: ['Single temporal session; p90 is descriptive, not a confidence bound.', 'Successful-response medians exclude failed and skipped requests; reliability is reported separately.', 'First-attempt and final-attempt latencies are distinct.', 'Automatic screening is not a human quality score.', 'Quota waiting before dispatch is visible in run timeline, not included in provider latency.', 'Neurons are estimated from published prices and returned token usage; billing not queried.'] }
writeFileSync(join(directory, 'analysis.json'), JSON.stringify(analysis, null, 2))
console.log(JSON.stringify({ run: id, records: records.length, planned: analysis.plannedJobs, phases: variants, budgets }, null, 2))
