import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCourseGrounding } from '../../shared/courseGrounding'
import { courseChronologyWarnings, courseAbsenceWarnings } from '../../electron/main/courseRagGrounding'
const directory = join(process.cwd(), 'local-artifacts/rag-completion-2026-10-23')
const names = await readdir(directory)
const inputs = []
for (const name of names.filter(name => /^sent-\d+-\d+\.json$/.test(name))) {
  const value = JSON.parse(await readFile(join(directory, name), 'utf8'))
  inputs.push({ used: Number(/-(\d+)\.json$/.exec(name)![1]), value })
}
inputs.sort((a, b) => a.used - b.used)
const results = []
for (const name of names.filter(name => /^response-attempt-\d+\.txt$/.test(name))) {
  const number = Number(/-(\d+)\.txt$/.exec(name)![1])
  const input = inputs.filter(input => input.used < number).at(-1)?.value
  if (input?.mode !== 'grounding-audit') continue
  const raw = await readFile(join(directory, name), 'utf8')
  if (!raw.trim()) continue
  try {
    const review = parseCourseGrounding(raw, input.answer, input.passages)
    const local = [...courseChronologyWarnings(input.answer, input.passages), ...courseAbsenceWarnings(input.answer)]
    results.push({ attempt: number, outcome: 'anchored', status: review.status, claims: review.claims.length, omitted: review.omittedClaims ?? 0, localWarnings: local.length })
  } catch (error) { results.push({ attempt: number, outcome: 'rejected', reason: error instanceof Error && /^(Controllo|Affermazione|Nessuna|Citazioni)/.test(error.message) ? error.message : 'invalid_json' }) }
}
await writeFile(join(directory, 'grounding-replay-summary.json'), JSON.stringify({ networkCalls: 0, results }, null, 2))
console.log(JSON.stringify({ networkCalls: 0, results }))
// Attempt 58 is a captured real audit with invented passage IDs, independently
// checked against its delivered prompt. Keeping that rejection is required.
if (!results.some(result => result.outcome === 'anchored') || results.some(result => result.outcome !== 'anchored' && !(result.attempt === 58 && result.reason === 'Citazioni del controllo non verificabili.'))) process.exitCode = 1
