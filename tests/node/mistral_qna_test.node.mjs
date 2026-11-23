import test from 'node:test'
import assert from 'node:assert/strict'
import { payload, parseResponse, request, reserveUsd, configuration } from '../../tools/mistral_qna_test.mjs'

const fixture = { question: 'Perche?', quote: 'fonte', context: 'La fonte completa.', history: [], historicalAnswer: 'BASELINE_PRIVATE_NOT_FOR_MISTRAL' }
test('only sources and preceding history are sent, never the saved Gemini answer', () => {
  const body = payload(fixture)
  assert.equal(body.model, 'mistral-large-4-0')
  assert.equal(body.reasoning_effort, 'high')
  assert.equal(body.messages.at(-1).content, fixture.question)
  assert.ok(!JSON.stringify(body).includes(fixture.historicalAnswer))
  assert.ok(reserveUsd(body) >= configuration.max_tokens * 2.1 / 1e6)
  assert.throws(() => payload({ ...fixture, quote: 'missing' }), /invalid_case/)
})
test('reasoning chunks are excluded from the final answer but billed usage is retained', () => {
  const result = parseResponse({ model: 'mistral-large-4-0', choices: [{ finish_reason: 'stop', message: { content: [{ type: 'thinking', thinking: 'private reasoning' }, { type: 'text', text: 'Risposta' }] } }], usage: { prompt_tokens: 10000, completion_tokens: 2000 } })
  assert.equal(result.text, 'Risposta')
  assert.equal(result.complete, true)
  assert.equal(result.costUsdWithoutCacheDiscount, 0.0112)
})
test('truncation is not reported as a complete answer; malformed usage is rejected', () => {
  const response = { choices: [{ finish_reason: 'length', message: { content: 'Parziale' } }], usage: { prompt_tokens: 10, completion_tokens: 8192 } }
  assert.equal(parseResponse(response).complete, false)
  assert.throws(() => parseResponse({ ...response, usage: {} }), /invalid_response/)
  assert.throws(() => parseResponse({ ...response, choices: [{ message: { content: [] } }] }), /invalid_response/)
})
test('HTTP failures never expose provider bodies or retry the request', async () => {
  let attempts = 0
  await assert.rejects(request(payload(fixture), 'SYNTHETIC', async (url, options) => {
    attempts++
    assert.equal(url, 'https://api.mistral.ai/v1/chat/completions')
    assert.equal(options.redirect, 'error')
    return { ok: false, status: 429, json: () => { throw new Error('secret body must not be read') } }
  }), /^Error: http_429$/)
  assert.equal(attempts, 1)
})
test('network exceptions are sanitized and never retried', async () => {
  await assert.rejects(request(payload(fixture), 'SYNTHETIC', async () => { throw new Error('SENSITIVE_PROVIDER_DETAIL') }), /network_or_timeout_no_automatic_retry/)
})
