// One synthetic compatibility probe. It is not a latency benchmark or a
// general runner; execute only after the shared benchmark lock is released.
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, renameSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { CANDIDATES, BenchError, loadCredentials, endpoint, requestPayload, normalizeUsage, visibleAnswer, redact, estimatePromptTokens, reservation, canReserve, waitingMs, actualCharge } from './qna_benchmark_core.mjs'
import { buildMessages } from '../tests/fixtures/qna-benchmark/context.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactRoot = join(root, 'local-artifacts/qna-benchmark')
const directory = join(artifactRoot, 'nonstream-diagnostic-20261013')
const candidate = CANDIDATES[2]
const testCase = JSON.parse(readFileSync(join(root, 'tests/fixtures/qna-benchmark/cases.json'), 'utf8')).find(c => c.id === 'code-python')
const messages = buildMessages(testCase, 2000, 'middle', 'document')
const maxOutput = 2048
const reserved = reservation(candidate, estimatePromptTokens(messages), maxOutput)
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const atomic = (path, value) => { const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(value, null, 2)); renameSync(tmp, path) }

async function run() {
  if (process.argv.slice(2).some(a => a !== '--live')) throw new BenchError('arguments_invalid')
  if (!process.argv.includes('--live')) { console.log(JSON.stringify({ dryRun: true, jobs: 1, candidate: candidate.id, case: testCase.id, stream: false })); return }
  const credentials = loadCredentials(join(root, '.env'))
  mkdirSync(artifactRoot, { recursive: true })
  let lock
  try { lock = openSync(join(artifactRoot, 'runner.lock'), 'wx'); writeFileSync(lock, JSON.stringify({ pid: process.pid, at: new Date().toISOString() })) } catch { throw new BenchError('runner_locked') }
  try {
    mkdirSync(directory, { recursive: true })
    const ledgerPath = join(artifactRoot, 'budget-ledger.json')
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    if (ledger.version !== 1 || !Array.isArray(ledger.entries)) throw new BenchError('ledger_invalid')
    if (ledger.entries.some(e => e.jobId === 'nonstream-cloudflare-code-python')) throw new BenchError('diagnostic_already_reserved')
    if (!canReserve(candidate, ledger, reserved)) throw new BenchError('daily_budget')
    if (waitingMs(candidate, ledger, reserved) > 0) throw new BenchError('provider_cooldown')
    const entry = { candidateId: candidate.id, provider: candidate.provider, timestamp: Date.now(), day: new Date().toISOString().slice(0, 10), charge: reserved, reserved, jobId: 'nonstream-cloudflare-code-python', settled: false }
    ledger.entries.push(entry)
    atomic(ledgerPath, ledger)
    const payload = { ...requestPayload(candidate, messages, maxOutput), stream: false }
    delete payload.stream_options
    const result = { status: 'failed', errorCategory: null, candidateId: candidate.id, caseId: testCase.id, stream: false, requestHash: hash(messages), payloadHash: hash(payload), answer: '', usage: null, at: new Date().toISOString(), schemaContentType: null, finishReason: null }
    const start = performance.now()
    try {
      const response = await fetch(endpoint(candidate, credentials), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90000), headers: { Authorization: `Bearer ${credentials.cloudflare}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      result.ttfbMs = performance.now()-start
      result.httpStatus = response.status
      if (!response.ok) { await response.body?.cancel(); throw new BenchError(`http_${response.status}`) }
      let bytes = 0, raw = ''
      const decoder = new TextDecoder('utf-8', { fatal: true })
      for await (const chunk of response.body) {
        bytes += chunk.byteLength
        if (bytes > 2000000) { await response.body.cancel().catch(() => {}); throw new BenchError('response_too_large') }
        raw += decoder.decode(chunk, { stream: true })
      }
      raw += decoder.decode()
      const data = JSON.parse(raw)
      if (data.model && data.model !== candidate.model) throw new BenchError('model_mismatch')
      result.usage = normalizeUsage(data)
      const choice = data.choices?.[0]
      result.finishReason = choice?.finish_reason ?? null
      result.schemaContentType = typeof choice?.message?.content
      if (result.schemaContentType !== 'string') throw new BenchError('content_not_string')
      result.answer = visibleAnswer(choice.message.content, true)
      if (!result.answer) throw new BenchError('empty_answer')
      if (result.finishReason === 'length') throw new BenchError('truncated')
      if (result.finishReason && !['stop', 'eos_token'].includes(result.finishReason)) throw new BenchError('unexpected_finish')
      result.status = 'success'
    } catch (error) { result.errorCategory = error instanceof BenchError ? error.category : 'network_or_json_error' }
    result.totalMs = performance.now()-start
    entry.charge = actualCharge(candidate, result.usage, reserved)
    entry.settled = true
    atomic(ledgerPath, ledger)
    atomic(join(directory, 'result.json'), redact(result, credentials))
    writeFileSync(join(directory, 'diagnostic-source.mjs'), readFileSync(fileURLToPath(import.meta.url), 'utf8'))
    console.log(JSON.stringify({ status: result.status, errorCategory: result.errorCategory, contentType: result.schemaContentType, finishReason: result.finishReason, usageReported: !!result.usage }))
  } finally {
    closeSync(lock)
    unlinkSync(join(artifactRoot, 'runner.lock'))
    credentials.groq = ''; credentials.cloudflare = ''; credentials.account = ''
  }
}
run().catch(error => { console.error(`Diagnostica interrotta: ${error instanceof BenchError ? error.category : 'local_configuration_or_io_error'}.`); process.exitCode = 1 })
