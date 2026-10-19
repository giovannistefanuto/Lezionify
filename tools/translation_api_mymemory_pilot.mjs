/** One bounded online pass over public synthetic fixtures; never private input. */
import { readFile, writeFile, mkdir, open } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'

if (process.argv.length !== 2) throw new Error('This pilot only accepts the fixed synthetic fixture.')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, 'local-artifacts/translation-api-research')
await mkdir(base, { recursive: true })
const fixture = await readFile(resolve(root, 'tests/fixtures/offline-translation/cases.json'))
const cases = JSON.parse(fixture)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
// Exclusive day checkpoint: rerunning never silently repeats consumed requests.
const path = resolve(base, `mymemory-${day}.json`)
const handle = await open(path, 'wx')
await handle.close()
const report = { created: new Date().toISOString(), fixtureSha256: sha(fixture), runnerSha256: sha(await readFile(fileURLToPath(import.meta.url))), provider: 'MyMemory anonymous get', endpoint: 'https://api.mymemory.translated.net/get', budgetCharacters: 3000, reservedCharacters: 0, results: [], complete: false, retries: 0 }
const save = () => writeFile(path, JSON.stringify(report, null, 2))
const total = cases.reduce((sum, item) => sum + item.text.length, 0)
try {
  if (total > report.budgetCharacters || cases.length !== 24 || new Set(cases.map(item => item.id)).size !== 24) throw new Error('Invalid fixed fixture or budget.')
  for (const item of cases) {
    const bytes = Buffer.byteLength(item.text, 'utf8')
    if (bytes > 500 || !['en-it', 'it-en'].includes(item.direction)) throw new Error('Fixed fixture violates provider limit.')
    report.reservedCharacters += item.text.length
    await save()
    const url = new URL(report.endpoint)
    url.searchParams.set('q', item.text)
    url.searchParams.set('langpair', item.direction.replace('-', '|'))
    const start = performance.now()
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`Provider HTTP status ${response.status}; no retry.`)
    const body = await response.text()
    if (Buffer.byteLength(body) > 300_000) throw new Error('Response exceeds pilot size limit.')
    const data = JSON.parse(body)
    if (Number(data.responseStatus) !== 200 || data.quotaFinished === true) throw new Error('Provider reports failed translation or exhausted quota; no retry.')
    const translation = data.responseData?.translatedText
    if (typeof translation !== 'string' || !translation.trim() || translation.length > 10_000) throw new Error('Invalid translation response.')
    const row = { ...item, inputBytes: bytes, latencyMs: performance.now() - start, translation, responseStatus: Number(data.responseStatus), quotaFinished: data.quotaFinished ?? null, matchScore: data.responseData.match ?? null }
    report.results.push(row)
    await save()
    console.log(JSON.stringify({ id: item.id, ms: Math.round(row.latencyMs), translation }))
  }
  report.complete = true
} catch (error) {
  // No exception bodies or request URLs, which could contain query content.
  report.failure = { type: error.name, completed: report.results.length, reservedCharacters: report.reservedCharacters }
  process.exitCode = 1
} finally {
  await save()
  console.log(JSON.stringify({ report: path, complete: report.complete, completed: report.results.length, reservedCharacters: report.reservedCharacters, failure: report.failure }))
}
