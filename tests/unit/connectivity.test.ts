import { afterEach, expect, it, vi } from 'vitest'
import {
  assertGeminiOnline,
  configureGeminiConnectivity,
  connectedGeminiError
} from '../../electron/main/ai/connectivity'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'

afterEach(() => configureGeminiConnectivity(() => true))

it('blocca offline prima della richiesta senza provare altri modelli o chiavi', async () => {
  configureGeminiConnectivity(() => false)
  const call = vi.fn()
  await expect(
    new GeminiRequestManager().execute({
      jobId: 'offline-test',
      purpose: 'qna',
      keys: [{ key: 'synthetic' }],
      preferredModel: 'first',
      fallbackModels: ['second'],
      preferModelFallback: true,
      call
    })
  ).rejects.toMatchObject({
    recoveryDisposition: 'terminal',
    message: expect.stringContaining('connessione Internet')
  })
  expect(call).not.toHaveBeenCalled()
})

it('blocca anche upload e polling audio prima di creare il client SDK', async () => {
  configureGeminiConnectivity(() => false)
  const transport = new GeminiTransport()
  await expect(
    transport.uploadFile({
      apiKey: 'synthetic',
      filePath: 'unused',
      mimeType: 'audio/mp3'
    })
  ).rejects.toThrow('connessione Internet')
  await expect(
    transport.getFile({ apiKey: 'synthetic', name: 'unused' })
  ).rejects.toThrow('connessione Internet')
})

it('distingue rete persa durante la richiesta da servizio irraggiungibile con rete presente', () => {
  configureGeminiConnectivity(() => false)
  expect(connectedGeminiError(new Error('fetch failed'))).toMatchObject({
    isRetryable: false,
    recoveryDisposition: 'terminal'
  })
  configureGeminiConnectivity(() => true)
  expect(() => assertGeminiOnline()).not.toThrow()
  expect(connectedGeminiError(new Error('fetch failed'))).toMatchObject({
    category: 'network_error',
    isRetryable: true
  })
  expect(
    connectedGeminiError(new Error('503 Service Unavailable')).category
  ).toBe('service_unavailable')
})
