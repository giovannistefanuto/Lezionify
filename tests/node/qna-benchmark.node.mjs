import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CANDIDATES, loadCredentials, redact, endpoint, requestPayload, parseDuration, visibleAnswer, sseEvents, streamRequest, normalizeUsage, waitingMs, canReserve, actualCharge, screenAnswer, summarize } from '../../tools/qna_benchmark_core.mjs'
import { createJobs } from '../../tools/qna_benchmark.mjs'
import { buildContext, buildMessages } from '../fixtures/qna-benchmark/context.mjs'
import { terminalCheckpoint, reservedAttempts, missingAttemptCheckpoint, sessionDelay } from '../../tools/qna_benchmark_checkpoint.mjs'

const credentials = { groq: 'test-groq-secret-123456789', cloudflare: 'test-cloudflare-secret-123456789', account: 'a'.repeat(32) }
const messages = [{ role: 'user', content: 'Test sintetico' }]
const event = data => `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`
const response = (text, chunkSize = 7) => {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
    controller.close()
  } }), { headers: { 'content-type': 'text/event-stream' } })
}
const chunk = content => ({ model: CANDIDATES[0].model, choices: [{ delta: { content } }] })
const end = { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 30, completion_tokens: 5, total_tokens: 35 } }
const call = (text, options = {}) => streamRequest(CANDIDATES[0], messages, credentials, { fetcher: async () => response(text), ...options })

test('recovery never retries a saved success or partial answer if the result write was interrupted', () => {
  const success = { status: 'success', answer: 'Done' }
  const partial = { status: 'failed', answer: 'Partial', errorCategory: 'network_or_stream_error' }
  assert.equal(terminalCheckpoint([success]), success)
  assert.equal(terminalCheckpoint([partial]), partial)
  const retry = { status: 'failed', answer: '', errorCategory: 'server_error' }
  assert.equal(terminalCheckpoint([retry]), null)
  assert.equal(terminalCheckpoint([retry, retry]), retry)
})
test('unsettled reservations count toward the attempt cap, isolated by run and job', () => {
  const ledger = { entries: [{ runId: 'a', jobId: 'j', settled: false }, { runId: 'a', jobId: 'j', settled: true }, { runId: 'b', jobId: 'j' }, { runId: 'a', jobId: 'other' }] }
  assert.equal(reservedAttempts(ledger, 'a', 'j'), 2)
  assert.equal(reservedAttempts(ledger, 'b', 'j'), 1)
})
test('a reserved request without its attempt checkpoint is ambiguous and must not be resent automatically', () => {
  const ledger = { entries: [{ runId: 'a', jobId: 'j', settled: true }, { runId: 'a', jobId: 'j', settled: false }] }
  assert.equal(missingAttemptCheckpoint(ledger, 'a', 'j', [{ status: 'failed' }]), true)
  assert.equal(missingAttemptCheckpoint(ledger, 'a', 'j', [{ status: 'failed' }, { status: 'failed' }]), false)
  assert.equal(missingAttemptCheckpoint(ledger, 'b', 'j', []), false)
})
test('overdue session offsets cannot burst questions after resume; retries remain the same question', () => {
  const now = 1000000
  const clock = { startedAtMs: 0, intervalMs: 180000, lastDispatch: { 'groq-20b': { jobId: 'previous', sentAtMs: now } } }
  const job = { id: 'next', candidateId: 'groq-20b', notBeforeOffset: 180000 }
  assert.equal(sessionDelay(job, clock, now), 180000)
  assert.equal(sessionDelay({ ...job, id: 'previous' }, clock, now), 0)
  assert.equal(sessionDelay({ ...job, candidateId: 'groq-120b' }, clock, now), 0)
})
test('fresh session respects its planned offset and rejects corrupt timing state', () => {
  const job = { id: 'one', candidateId: 'groq-20b', notBeforeOffset: 180000 }
  assert.equal(sessionDelay(job, { startedAtMs: 1000000, intervalMs: 180000 }, 1000000), 180000)
  assert.throws(() => sessionDelay(job, { startedAtMs: null, intervalMs: 180000 }), /session_clock_invalid/)
})

test('env parsed without exposing values; quotes and CRLF supported', () => {
  const directory = mkdtempSync(join(tmpdir(), 'qna-env-test-'))
  try {
    const path = join(directory, '.env')
    writeFileSync(path, `GROQ_API_KEY="${credentials.groq}"\r\nCLOUDFLARE_API_TOKEN='${credentials.cloudflare}'\r\nCLOUDFLARE_ACCOUNT_ID=${credentials.account}\r\n`)
    assert.deepEqual(loadCredentials(path), credentials)
    writeFileSync(path, 'GROQ_API_KEY="a-private-value"')
    assert.throws(() => loadCredentials(path), error => error.message === 'env_incomplete')
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
test('redaction also covers secret strings with JSON escapes', () => {
  const privateValues = { key: 'secret"quoted\\value' }
  const value = redact({ nested: { output: `Got ${privateValues.key}` } }, privateValues)
  assert.deepEqual(value, { nested: { output: 'Got [REDACTED]' } })
})
test('only allowlisted model endpoints; invalid account never used in URL', () => {
  assert.equal(endpoint(CANDIDATES[0], credentials), 'https://api.groq.com/openai/v1/chat/completions')
  assert.throws(() => endpoint({ ...CANDIDATES[0], model: 'unexpected' }, credentials))
  assert.throws(() => endpoint(CANDIDATES[2], { ...credentials, account: '../invalid' }))
})
test('GPT-OSS uses supported reasoning parameter and no reasoning_format', () => {
  const payload = requestPayload(CANDIDATES[0], messages)
  assert.equal(payload.reasoning_effort, 'low')
  assert.equal(payload.include_reasoning, true)
  assert.equal(payload.reasoning_format, undefined)
  assert.equal(requestPayload(CANDIDATES[2], messages).reasoning_effort, undefined)
})
test('reset duration parsing handles seconds, compound and HTTP date', () => {
  assert.equal(parseDuration('2m59.5s'), 179500)
  assert.equal(parseDuration('250ms'), 250)
  assert.equal(parseDuration('3'), 3000)
  assert.equal(parseDuration('Tue, 13 Oct 2026 12:00:03 GMT', Date.parse('2026-10-13T12:00:00Z')), 3000)
  assert.equal(parseDuration('garbage'), null)
})
test('SSE handles byte boundaries, Unicode, CRLF and multiline data', async () => {
  const body = response(': heartbeat\r\ndata: {"text":\r\ndata: "è"}\r\n\r\ndata: [DONE]\r\n\r\n', 1).body
  const events = []
  for await (const data of sseEvents(body)) events.push(data)
  assert.deepEqual(events, ['{"text":\n"è"}', '[DONE]'])
})
test('think content and fragmented opening tags never count as visible response', () => {
  assert.equal(visibleAnswer('<thi'), '')
  assert.equal(visibleAnswer('<think>private'), '')
  assert.equal(visibleAnswer('<think>private</think>Risposta'), 'Risposta')
})
test('first visible text occurs after reasoning; usage captured at end', async () => {
  let time = 0
  const result = await call(event({ choices: [{ delta: { reasoning: 'Only reasoning' } }] }) + event(chunk('Risposta sintetica abbastanza lunga.')) + event(end) + event('[DONE]'), { now: () => ++time * 10 })
  assert.equal(result.status, 'success')
  assert.ok(result.ttftMs > result.firstReasoningMs)
  assert.equal(result.usage.totalTokens, 35)
  assert.equal(result.answer, 'Risposta sintetica abbastanza lunga.')
})
test('inline reasoning spanning multiple events is excluded from final answer', async () => {
  const result = await call(event(chunk('<thi')) + event(chunk('nk>private</think>')) + event(chunk('Una risposta finale.')) + event(end) + event('[DONE]'))
  assert.equal(result.status, 'success')
  assert.equal(result.answer, 'Una risposta finale.')
})
test('numeric content deltas retain formulas and zero digits', async () => {
  const result = await call(event(chunk(3)) + event(chunk('*')) + event(chunk(2)) + event(chunk(' = ')) + event(chunk(6)) + event(chunk('; 0.')) + event(chunk(7)) + event(end) + event('[DONE]'))
  assert.equal(result.status, 'success')
  assert.equal(result.answer, '3*2 = 6; 0.7')
  assert.equal(result.contentTypes.number, 4)
})
test('object deltas fail explicitly instead of silently losing text', async () => {
  const result = await call(event(chunk({ invalid: true })) + event('[DONE]'))
  assert.equal(result.errorCategory, 'invalid_content_delta')
})
test('JSON-like literal deltas preserve empty Python lists, dictionaries and booleans', async () => {
  const result = await call(event(chunk('items = ')) + event(chunk([])) + event(chunk('; d = ')) + event(chunk({})) + event(chunk('; flag = ')) + event(chunk(true)) + event(end) + event('[DONE]'))
  assert.equal(result.status, 'success')
  assert.equal(result.answer, 'items = []; d = {}; flag = true')
})
test('incomplete transport is failure even if it delivered visible text', async () => {
  const result = await call(event(chunk('Una risposta parziale.')))
  assert.equal(result.errorCategory, 'incomplete_stream')
  assert.ok(result.answer.length)
})
test('length finish cannot be accepted as successful answer', async () => {
  const result = await call(event(chunk('Una risposta troncata.')) + event({ choices: [{ delta: {}, finish_reason: 'length' }] }) + event('[DONE]'))
  assert.equal(result.errorCategory, 'truncated')
})
test('empty DONE is failed and malformed event sanitized', async () => {
  assert.equal((await call(event('[DONE]'))).errorCategory, 'empty_answer')
  const result = await call(event('not-json containing ' + credentials.groq))
  assert.equal(result.errorCategory, 'malformed_event')
  assert.ok(!JSON.stringify(result).includes(credentials.groq))
})
test('unexpected model fails, no silent fallback', async () => {
  const result = await call(event({ model: 'different', choices: [] }))
  assert.equal(result.errorCategory, 'model_mismatch')
})
test('HTTP 429 captures only safe quota headers and drops error body', async () => {
  const result = await streamRequest(CANDIDATES[0], messages, credentials, {
    fetcher: async () => new Response(credentials.groq, { status: 429, headers: { 'retry-after': '2', 'x-ratelimit-remaining-tokens': '0', 'x-private-secret': credentials.groq } })
  })
  assert.equal(result.errorCategory, 'rate_limit')
  assert.equal(result.rateLimits['retry-after-ms'], 2000)
  assert.ok(!JSON.stringify(result).includes(credentials.groq))
  assert.equal(result.answer, '')
})
test('401 and 403 are authorization errors', async () => {
  for (const status of [401, 403]) {
    const result = await streamRequest(CANDIDATES[0], messages, credentials, { fetcher: async () => new Response('private', { status }) })
    assert.equal(result.errorCategory, 'authorization')
  }
})
test('unexpected content type rejected, not treated as stream', async () => {
  const result = await streamRequest(CANDIDATES[0], messages, credentials, { fetcher: async () => new Response('{"private":true}', { headers: { 'content-type': 'application/json' } }) })
  assert.equal(result.errorCategory, 'unexpected_content_type')
})
test('first text timeout aborts physical fetch rather than merely racing it', async () => {
  let aborted = false
  const result = await streamRequest(CANDIDATES[0], messages, credentials, {
    firstTextTimeoutMs: 10,
    fetcher: (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => { aborted = true; reject(new Error('secret ' + credentials.groq)) }))
  })
  assert.equal(result.errorCategory, 'first_text_timeout')
  assert.equal(aborted, true)
})
test('pre-aborted request sends no network traffic', async () => {
  const controller = new AbortController(); controller.abort()
  let called = false
  const result = await streamRequest(CANDIDATES[0], messages, credentials, { signal: controller.signal, fetcher: () => { called = true } })
  assert.equal(called, false)
  assert.equal(result.errorCategory, 'cancelled')
})
test('unreported usage remains null and reserves worst-case budget', () => {
  assert.equal(normalizeUsage({ choices: [] }), null)
  assert.equal(actualCharge(CANDIDATES[0], null, 4500), 4500)
  assert.equal(actualCharge(CANDIDATES[0], {}, 4500), 4500)
  assert.equal(actualCharge(CANDIDATES[0], { promptTokens: 100, completionTokens: 20, totalTokens: 150 }, 4500), 150)
})
test('stream error after text remains a failure with partial answer retained', async () => {
  const result = await call(event(chunk('Testo parziale.')) + event({ error: { message: credentials.groq } }))
  assert.equal(result.errorCategory, 'stream_error')
  assert.equal(result.answer, 'Testo parziale.')
  assert.ok(!JSON.stringify(result).includes(credentials.groq))
})
test('secret echoed in an otherwise valid answer is redacted', async () => {
  const result = await call(event(chunk(`Risposta ${credentials.groq}`)) + event(end) + event('[DONE]'))
  assert.equal(result.answer, 'Risposta [REDACTED]')
})
test('usage can be returned in the Groq extension', () => {
  const usage = normalizeUsage({ x_groq: { usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15, completion_tokens_details: { reasoning_tokens: 1 } } } })
  assert.equal(usage.totalTokens, 15)
  assert.equal(usage.reasoningTokens, 1)
})
test('daily cloudflare budget is shared across requests and model IDs', () => {
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10)
  const ledger = { entries: [{ provider: 'cloudflare', candidateId: 'another', day, charge: 7990 }], cooldowns: {} }
  assert.equal(canReserve(CANDIDATES[2], ledger, 20, now), false)
})
test('rolling minute budget uses all charged requests and cooldown', () => {
  const now = Date.now()
  const ledger = { entries: [{ candidateId: CANDIDATES[0].id, timestamp: now - 10000, charge: 4000 }], cooldowns: {} }
  assert.equal(waitingMs(CANDIDATES[0], ledger, 3000, now), 51000)
  assert.equal(waitingMs(CANDIDATES[0], ledger, 7000, now), Infinity)
})
test('screening does not accept numerical hallucination for missing data', () => {
  const rubric = { required: ['^NON_PRESENTE_NEL_CONTESTO'], forbidden: ['\\b\\d+\\b'] }
  assert.equal(screenAnswer('NON_PRESENTE_NEL_CONTESTO. Nessun dato.', rubric).passed, true)
  assert.equal(screenAnswer('NON_PRESENTE_NEL_CONTESTO. Forse 30.', rubric).passed, false)
  assert.equal(screenAnswer('Il buffer ha 30 elementi.', rubric).passed, false)
})
test('screening accepts equivalent LaTeX unit and digit-grouping markup', () => {
  assert.equal(screenAnswer('6\\ \\text{ms}; 7.4 ms; 400\\,000 byte', { required: ['6\\s*ms', '7[.,]4', '400000'] }).passed, true)
})
test('failure latency is not included in successful medians', () => {
  const summary = summarize([{ candidateId: 'groq-20b', status: 'success', ttftMs: 100, totalMs: 200, screening: { passed: true }, caseId: 'a' }, { candidateId: 'groq-20b', status: 'failed', ttftMs: 10000, totalMs: 20000, errorCategory: 'truncated', caseId: 'b' }])[0]
  assert.equal(summary.ttftMedianMs, 100)
  assert.equal(summary.successes, 1)
  assert.equal(summary.qualityNeedsHumanReview, true)
})
test('corpus plans have unique IDs and deterministic contexts; long target preserved', () => {
  for (const suite of ['pilot', 'main', 'long', 'extended', 'all']) {
    const jobs = createJobs(suite)
    assert.equal(new Set(jobs.map(j => j.id)).size, jobs.length)
  }
  assert.equal(createJobs('pilot').length, 9)
  assert.equal(createJobs('main').length, 108)
  const c = { context: 'Unique relevant target.', question: 'Ask?', history: [] }
  const text = buildContext(c, 20000, 'end')
  assert.ok(text.length >= 80000)
  assert.equal(text, buildContext(c, 20000, 'end'))
  assert.ok(text.endsWith('FINE SEZIONE PERTINENTE.\n'))
  assert.equal(buildMessages(c, 2000, 'middle', 'section')[1].content, 'CONTESTO DELLA DISPENSA:\nUnique relevant target.')
})
