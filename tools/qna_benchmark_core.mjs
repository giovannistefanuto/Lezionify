import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { performance } from 'node:perf_hooks'

export const CANDIDATES = [
  { id: 'groq-20b', provider: 'groq', model: 'openai/gpt-oss-20b', reasoning: 'low', context: 131072 },
  { id: 'groq-120b', provider: 'groq', model: 'openai/gpt-oss-120b', reasoning: 'low', context: 131072 },
  { id: 'cloudflare-qwen', provider: 'cloudflare', model: '@cf/qwen/qwen3-30b-a3b-fp8', reasoning: 'provider-default', context: 32768 }
]

export class BenchError extends Error {
  constructor(category) { super(category); this.category = category }
}

export function loadCredentials(path) {
  let env
  try { env = parseEnv(readFileSync(path, 'utf8')) } catch { throw new BenchError('env_unreadable') }
  const groq = env.GROQ_API_KEY?.trim()
  const cloudflare = env.CLOUDFLARE_API_TOKEN?.trim()
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim()
  if (!groq || !cloudflare || !/^[a-f0-9]{32}$/i.test(account || '')) throw new BenchError('env_incomplete')
  // Do not populate process.env: child processes must not inherit credentials.
  return { groq, cloudflare, account }
}

export function redact(value, credentials) {
  let text = JSON.stringify(value)
  for (const secret of Object.values(credentials)) {
    if (typeof secret === 'string' && secret.length >= 8) {
      text = text.split(secret).join('[REDACTED]')
      const encoded = JSON.stringify(secret).slice(1, -1)
      text = text.split(encoded).join('[REDACTED]')
    }
  }
  return JSON.parse(text)
}

export function endpoint(candidate, credentials) {
  if (!CANDIDATES.some(c => c.id === candidate.id && c.model === candidate.model && c.provider === candidate.provider)) throw new BenchError('candidate_invalid')
  if (candidate.provider === 'groq') return 'https://api.groq.com/openai/v1/chat/completions'
  if (!/^[a-f0-9]{32}$/i.test(credentials.account)) throw new BenchError('account_invalid')
  return `https://api.cloudflare.com/client/v4/accounts/${credentials.account}/ai/v1/chat/completions`
}

export function requestPayload(candidate, messages, maxOutput = 2048) {
  const common = { model: candidate.model, messages, stream: true, temperature: 0.2, stream_options: { include_usage: true } }
  return candidate.provider === 'groq'
    ? { ...common, max_completion_tokens: maxOutput, reasoning_effort: 'low', include_reasoning: true }
    : { ...common, max_tokens: maxOutput }
}

export function parseDuration(value, now = Date.now()) {
  if (!value) return null
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g
  let result = 0, consumed = '', match
  while ((match = re.exec(value))) {
    result += Number(match[1]) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2]]
    consumed += match[0]
  }
  if (consumed === value && consumed) return result
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : null
}

export function rateHeaders(headers) {
  const result = {}
  for (const name of ['x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens']) {
    const value = headers.get(name)
    if (value !== null && /^\d+$/.test(value)) result[name] = Number(value)
  }
  for (const name of ['retry-after', 'x-ratelimit-reset-requests', 'x-ratelimit-reset-tokens']) {
    const duration = parseDuration(headers.get(name))
    if (duration !== null) result[`${name}-ms`] = duration
  }
  return result
}

export function visibleAnswer(raw, final = false) {
  let value = raw.replace(/<think(?:\s[^>]*)?>[\s\S]*?<\/think>/gi, '')
  value = value.replace(/<think(?:\s[^>]*)?>[\s\S]*$/gi, '')
  if (!final) {
    // A '<think>' tag may be fragmented across events. Hold partial tags.
    for (let n = Math.min(6, value.length); n > 0; n--) {
      if ('<think'.startsWith(value.slice(-n).toLowerCase())) { value = value.slice(0, -n); break }
    }
  }
  return value.trim()
}

export async function* sseEvents(body) {
  if (!body) throw new BenchError('stream_missing')
  const reader = body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = '', data = [], bytes = 0
  function lineEvent(line) {
    if (line === '') { const event = data.length ? data.join('\n') : null; data = []; return event }
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    return null
  }
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) { pending += decoder.decode(); break }
      bytes += next.value.byteLength
      if (bytes > 2_000_000) throw new BenchError('stream_too_large')
      pending += decoder.decode(next.value, { stream: true })
      if (pending.length > 250_000) throw new BenchError('event_too_large')
      let match
      while ((match = /\r\n|\n|\r(?!$)/.exec(pending))) {
        const line = pending.slice(0, match.index)
        pending = pending.slice(match.index + match[0].length)
        const event = lineEvent(line)
        if (event !== null) yield event
      }
    }
    if (pending) { const event = lineEvent(pending.replace(/\r$/, '')); if (event !== null) yield event }
    const final = lineEvent('')
    if (final !== null) yield final
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

function finiteCount(value) { return Number.isFinite(value) && value >= 0 ? value : null }

export function normalizeUsage(data) {
  const usage = data.usage || data.x_groq?.usage
  if (!usage || typeof usage !== 'object') return null
  return {
    promptTokens: finiteCount(usage.prompt_tokens),
    completionTokens: finiteCount(usage.completion_tokens),
    totalTokens: finiteCount(usage.total_tokens),
    reasoningTokens: finiteCount(usage.completion_tokens_details?.reasoning_tokens),
    cachedTokens: finiteCount(usage.prompt_tokens_details?.cached_tokens),
    providerQueueMs: Number.isFinite(usage.queue_time) ? usage.queue_time * 1000 : null,
    providerPromptMs: Number.isFinite(usage.prompt_time) ? usage.prompt_time * 1000 : null,
    providerCompletionMs: Number.isFinite(usage.completion_time) ? usage.completion_time * 1000 : null
  }
}

export async function streamRequest(candidate, messages, credentials, options = {}) {
  const now = options.now || (() => performance.now())
  const fetcher = options.fetcher || fetch
  const controller = new AbortController()
  const start = now()
  const result = {
    httpStatus: null, status: 'failed', errorCategory: null, finishReason: null,
    ttfbMs: null, firstEventMs: null, firstReasoningMs: null, ttftMs: null, text20Ms: null,
    totalMs: null, answer: '', reasoningCharacters: 0, usage: null,
    rateLimits: {}, responseModel: null, sawDone: false, contentTypes: {}
  }
  let raw = '', abortCategory = null
  let firstTextTimer, idleTimer
  const abort = (category) => { abortCategory ??= category; controller.abort() }
  const externalAbort = () => abort('cancelled')
  if (options.signal?.aborted) { result.errorCategory = 'cancelled'; result.totalMs = 0; return result }
  options.signal?.addEventListener('abort', externalAbort, { once: true })
  const totalTimer = setTimeout(() => abort('total_timeout'), options.totalTimeoutMs ?? 90000)
  firstTextTimer = setTimeout(() => abort('first_text_timeout'), options.firstTextTimeoutMs ?? 60000)
  const armIdle = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => abort('stream_inactivity'), options.idleTimeoutMs ?? 30000)
  }
  try {
    const response = await fetcher(endpoint(candidate, credentials), {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'Authorization': `Bearer ${credentials[candidate.provider]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload(candidate, messages, options.maxOutput ?? 2048))
    })
    result.ttfbMs = now() - start
    result.httpStatus = response.status
    result.rateLimits = rateHeaders(response.headers)
    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new BenchError(response.status === 429 ? 'rate_limit' : response.status === 401 || response.status === 403 ? 'authorization' : response.status === 404 ? 'model_unavailable' : response.status >= 500 ? 'server_error' : 'invalid_request')
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      await response.body?.cancel().catch(() => {})
      throw new BenchError('unexpected_content_type')
    }
    armIdle()
    for await (const event of sseEvents(response.body)) {
      if (controller.signal.aborted) throw new BenchError(abortCategory || 'cancelled')
      result.firstEventMs ??= now() - start
      armIdle()
      if (event.trim() === '[DONE]') { result.sawDone = true; break }
      let data
      try { data = JSON.parse(event) } catch { throw new BenchError('malformed_event') }
      if (data.error || data.success === false) throw new BenchError('stream_error')
      if (data.model) {
        if (data.model !== candidate.model) throw new BenchError('model_mismatch')
        result.responseModel = candidate.model
      }
      const usage = normalizeUsage(data)
      if (usage) result.usage = usage
      const choice = data.choices?.[0]
      if (choice?.finish_reason) result.finishReason = choice.finish_reason
      const reasoning = choice?.delta?.reasoning || choice?.delta?.reasoning_content
      if (typeof reasoning === 'string' && reasoning.length) {
        result.firstReasoningMs ??= now() - start
        result.reasoningCharacters += reasoning.length
      }
      const content = choice?.delta?.content
      if (content !== undefined && content !== null) result.contentTypes[typeof content] = (result.contentTypes[typeof content] || 0) + 1
      if (options.observeEvent) options.observeEvent(redact(data, credentials))
      if (typeof content === 'string') raw += content
      else if (typeof content === 'number' && Number.isFinite(content)) raw += String(content)
      else if (typeof content === 'boolean' || Array.isArray(content) || (content && typeof content === 'object' && Object.keys(content).length === 0)) raw += JSON.stringify(content)
      else if (content !== undefined && content !== null) throw new BenchError('invalid_content_delta')
      result.answer = visibleAnswer(raw)
      if (result.answer.length) {
        result.ttftMs ??= now() - start
        clearTimeout(firstTextTimer)
      }
      if (result.answer.replace(/\s/g, '').length >= 20) result.text20Ms ??= now() - start
    }
    result.answer = visibleAnswer(raw, true)
    if (!result.sawDone) throw new BenchError('incomplete_stream')
    if (result.finishReason === 'length') throw new BenchError('truncated')
    if (result.finishReason && !['stop', 'eos_token'].includes(result.finishReason)) throw new BenchError('unexpected_finish')
    if (!result.answer) throw new BenchError('empty_answer')
    if (/<think(?:\s[^>]*)?>/i.test(raw) && !/<\/think>/i.test(raw)) throw new BenchError('reasoning_only')
    result.status = 'success'
  } catch (error) {
    // Never serialize fetch errors: they may contain a URL, account ID or headers.
    result.errorCategory = abortCategory || (error instanceof BenchError ? error.category : 'network_or_stream_error')
  } finally {
    clearTimeout(firstTextTimer); clearTimeout(idleTimer); clearTimeout(totalTimer)
    options.signal?.removeEventListener('abort', externalAbort)
    result.totalMs = now() - start
  }
  return redact(result, credentials)
}

export function estimatePromptTokens(messages) {
  return Math.ceil(Buffer.byteLength(JSON.stringify(messages), 'utf8') / 3) + 64
}

export function reservation(candidate, input, maxOutput) {
  return candidate.provider === 'groq' ? input + maxOutput : (input * 4625 + maxOutput * 30475) / 1e6
}

export function actualCharge(candidate, usage, reserved) {
  if (!usage || !Number.isFinite(usage.promptTokens) || !Number.isFinite(usage.completionTokens)) return reserved
  const amount = candidate.provider === 'groq'
    ? Math.max(usage.totalTokens ?? 0, usage.promptTokens + usage.completionTokens)
    : (usage.promptTokens * 4625 + usage.completionTokens * 30475) / 1e6
  return Number.isFinite(amount) ? amount : reserved
}

export function waitingMs(candidate, ledger, reserve, now = Date.now()) {
  const records = ledger.entries.filter(e => e.candidateId === candidate.id && e.timestamp > now - 60000)
  let wait = Math.max(0, (ledger.cooldowns[candidate.id] || 0) - now)
  if (candidate.provider === 'groq') {
    // Keep 20% margin below published TPM. Count all reservations, including failures.
    const cap = 6400
    if (reserve > cap) return Infinity
    let used = records.reduce((sum, r) => sum + r.charge, 0)
    for (const record of records.sort((a, b) => a.timestamp - b.timestamp)) {
      if (used + reserve <= cap) break
      used -= record.charge
      wait = Math.max(wait, record.timestamp + 61000 - now)
    }
  }
  return wait
}

export function canReserve(candidate, ledger, reserve, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10)
  const entries = ledger.entries.filter(e => e.day === day && (candidate.provider === 'cloudflare' ? e.provider === 'cloudflare' : e.candidateId === candidate.id))
  const used = entries.reduce((sum, e) => sum + e.charge, 0)
  return used + reserve <= (candidate.provider === 'groq' ? 160000 : 8000) && entries.length < (candidate.provider === 'groq' ? 800 : 200)
}

export function screenAnswer(answer, rubric) {
  // Match equivalent printed/LaTeX forms without penalizing mathematical markup.
  const normalized = answer.replace(/\\(?:text|mathrm|textrm)\{([^}]+)\}/g, '$1').replace(/\\[,;! ]/g, '').replace(/\*\*/g, '')
  const checks = rubric.required.map(pattern => new RegExp(pattern, 'iu').test(normalized))
  const forbidden = (rubric.forbidden || []).some(pattern => new RegExp(pattern, 'iu').test(normalized))
  return { passed: checks.every(Boolean) && !forbidden, requiredMatches: checks, forbiddenMatch: forbidden, humanReview: null }
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function summarize(records) {
  return CANDIDATES.map(candidate => {
    const rows = records.filter(r => r.candidateId === candidate.id)
    const successes = rows.filter(r => r.status === 'success')
    return {
      candidateId: candidate.id, planned: rows.length, successes: successes.length,
      errors: Object.fromEntries([...new Set(rows.filter(r => r.errorCategory).map(r => r.errorCategory))].map(key => [key, rows.filter(r => r.errorCategory === key).length])),
      ttftMedianMs: median(successes.map(r => r.ttftMs)), text20MedianMs: median(successes.map(r => r.text20Ms)),
      totalMedianMs: median(successes.map(r => r.totalMs)),
      automaticChecksPassed: successes.filter(r => r.screening?.passed).length,
      // Screening detects expected markers; it is not a certified accuracy metric.
      qualityNeedsHumanReview: true,
      tokensReported: rows.reduce((sum, r) => sum + (r.usage?.totalTokens ?? 0), 0),
      usageMissing: rows.filter(r => r.status !== 'skipped' && !r.usage).length,
      uniqueCases: new Set(rows.map(r => r.caseId)).size
    }
  })
}
