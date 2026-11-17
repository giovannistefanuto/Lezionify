import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { GoogleGenAI } from '@google/genai'
import { collectionAdapters } from '../../electron/main/collections/adapters'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import type { AppSettings } from '../../shared/archive'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network forbidden in adapter tests') })) })
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function setup() {
  const generateContent = vi.fn(async (_request: unknown) => ({ text: '{"markdown":"Una scheda di prova sufficientemente lunga.","quotes":[]}', candidates: [{ finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 123, candidatesTokenCount: 45, totalTokenCount: 168 } }))
  const transport = new GeminiTransport()
  vi.spyOn(transport, 'getClient').mockReturnValue({ models: { generateContent } } as unknown as GoogleGenAI)
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport, { now: () => Date.now(), sleep: async () => {} })
  const settings: AppSettings = { model: 'gemini-3.6-flash', apiKey: '', apiKeys: [], activeKeyIndex: 0, autoRotateOnQuota: true }
  const adapters = collectionAdapters({ settings: async () => settings, keys: async () => [{ key: 'synthetic-only', id: 'key-0', quotaGroup: 'synthetic', quotaGroupKnown: true }], gemini: new GeminiService({ requestManager: manager }), manager })
  return { adapters, generateContent }
}
it('uses the collection contract and retains the actual model and returned token counts', async () => {
  const { adapters, generateContent } = setup()
  const response = await adapters.complete('synthetic payload', 'gemini-3.6-flash', new AbortController().signal, false)
  expect(response.model).toBe('gemini-3.6-flash')
  expect(response.usage).toEqual({ model: 'gemini-3.6-flash', inputTokens: 123, outputTokens: 45, totalTokens: 168 })
  const request = generateContent.mock.calls[0][0] as { config: { systemInstruction: string; responseJsonSchema: { required: string[] } } }
  expect(request.config.systemInstruction).toContain('Usa soltanto la fonte')
  expect(request.config.responseJsonSchema.required).toEqual(['markdown', 'quotes'])
})
it('uses a different structured schema for the topic map', async () => {
  const { adapters, generateContent } = setup()
  await adapters.complete('synthetic map', 'gemini-3.6-flash', new AbortController().signal, true)
  const request = generateContent.mock.calls[0][0] as { config: { responseJsonSchema: { required: string[] } } }
  expect(request.config.responseJsonSchema.required).toEqual(['themes'])
})
it('rejects truncated provider output even when a partial text is present', async () => {
  const { adapters, generateContent } = setup()
  generateContent.mockResolvedValue({ text: 'An incomplete document', candidates: [{ finishReason: 'MAX_TOKENS' }], usageMetadata: { promptTokenCount: 123, candidatesTokenCount: 45, totalTokenCount: 168 } })
  await expect(adapters.complete('synthetic payload', 'gemini-3.6-flash', new AbortController().signal, false)).rejects.toThrow()
})
it('does not send a request when cancellation preceded execution', async () => {
  const { adapters, generateContent } = setup()
  const controller = new AbortController()
  controller.abort()
  await expect(adapters.complete('synthetic payload', 'gemini-3.6-flash', controller.signal, false)).rejects.toThrow()
  expect(generateContent).not.toHaveBeenCalled()
})
