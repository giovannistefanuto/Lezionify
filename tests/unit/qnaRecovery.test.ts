import { expect, it, vi } from 'vitest'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { normalizeGeminiError } from '../../electron/main/ai/geminiErrors'

it('sostituisce due risposte interrotte e termina al terzo tentativo senza concatenarle', async () => {
  const transport = new GeminiTransport()
  let calls = 0, answer = ''
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    calls++
    params.onChunk(calls < 3 ? 'parziale' : 'completa')
    if (calls < 3) throw new Error('503 Service unavailable')
    return { data: 'completa' }
  })
  const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, transport) })
  for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { id: 'retry', quote: '', contextHeading: null, messages: [{ role: 'user', text: 'Spiega', timestamp: '' }], createdAt: '', updatedAt: '' }, onReset: () => { answer = '' } })) answer += chunk
  expect(calls).toBe(3)
  expect(answer).toBe('completa')
})

it('si ferma dopo due recuperi falliti e mantiene solo l ultima risposta parziale', async () => {
  const transport = new GeminiTransport()
  let calls = 0, answer = '', resets = 0
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    params.onChunk(`parziale-${++calls}`)
    throw new Error('503 Service unavailable')
  })
  const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, transport) })
  let failure: unknown
  try {
    for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { id: 'exhausted', quote: '', contextHeading: null, messages: [{ role: 'user', text: 'Spiega', timestamp: '' }], createdAt: '', updatedAt: '' }, onReset: () => { resets++; answer = '' } })) answer += chunk
  } catch (error) { failure = error }
  expect(normalizeGeminiError(failure).category).toBe('service_unavailable')
  expect(calls).toBe(3); expect(resets).toBe(2); expect(answer).toBe('parziale-3')
})

it('annullamento durante il recupero non invia altre chiamate e non cancella la risposta parziale', async () => {
  const transport = new GeminiTransport(), controller = new AbortController(), reset = vi.fn()
  const call = vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    params.onChunk('parziale')
    throw new Error('503 Service unavailable')
  })
  const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, transport) })
  let failure: unknown
  try {
    for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { id: 'cancel', quote: '', contextHeading: null, messages: [{ role: 'user', text: 'Spiega', timestamp: '' }], createdAt: '', updatedAt: '' }, signal: controller.signal, onReset: reset, onRetry: () => controller.abort() })) expect(chunk).toBe('parziale')
  } catch (error) { failure = error }
  expect(normalizeGeminiError(failure).category).toBe('cancelled')
  expect(call).toHaveBeenCalledTimes(1); expect(reset).not.toHaveBeenCalled()
})

it('conserva solo le fonti web del tentativo riuscito, anche se arrivano prima del testo', async () => {
  const transport = new GeminiTransport()
  let calls = 0, answer = ''
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    calls++
    params.onGrounding?.([{ title: `Fonte ${calls}`, uri: `https://example.org/${calls}` }])
    params.onChunk(calls === 1 ? 'parziale' : 'completa')
    if (calls === 1) throw new Error('503 Service unavailable')
    return { data: 'completa' }
  })
  const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, transport) })
  for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { id: 'sources', quote: '', contextHeading: null, messages: [{ role: 'user', text: 'Spiega', timestamp: '' }], createdAt: '', updatedAt: '' }, searchOnline: true, onReset: () => { answer = '' } })) answer += chunk
  expect(answer).toContain('https://example.org/2')
  expect(answer).not.toContain('https://example.org/1')
})

it('il limite di due recuperi conta le chiamate fisiche anche quando un recupero fallisce prima del testo', async () => {
  const transport = new GeminiTransport()
  let calls = 0, answer = ''
  const retries = vi.fn()
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    calls++
    if (calls === 1) params.onChunk('parziale')
    if (calls <= 2) throw new Error('503 Service unavailable')
    params.onChunk('completa')
    return { data: 'completa' }
  })
  const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, transport) })
  for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { id: 'physical-budget', quote: '', contextHeading: null, messages: [{ role: 'user', text: 'Spiega', timestamp: '' }], createdAt: '', updatedAt: '' }, onReset: () => { answer = '' }, onRetry: retries })) answer += chunk
  expect(calls).toBe(3)
  expect(retries).toHaveBeenCalledTimes(2)
  expect(answer).toBe('completa')
})
