import { expect, it, vi } from 'vitest'
const sdk = vi.hoisted(() => ({ config: null as any, message: null as any }))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    chats = {
      create: (config: any) => {
        sdk.config = config
        return {
          sendMessageStream: async (message: any) => {
            sdk.message = message
            return (async function* () {
              yield { text: 'risposta' }
            })()
          }
        }
      }
    }
  }
}))
import { GeminiService } from '../../electron/main/gemini'

it('invia al SDK la vera domanda e uno storico senza domanda duplicata o placeholder', async () => {
  const gemini = new GeminiService()
  const thread: any = {
    quote: 'frase',
    messages: [
      { role: 'user', text: 'Prima domanda' },
      { role: 'ai', text: 'Prima risposta' },
      { role: 'user', text: 'Domanda corrente?' },
      { role: 'ai', text: '' }
    ]
  }
  const stream = gemini.generateQnaResponse({
    apiKey: 'test',
    model: 'gemini-3.6-flash',
    courseCode: null,
    lectureTitle: null,
    thread
  })
  let response = ''
  for await (const chunk of stream) {
    response += chunk
  }
  expect(response).toBe('risposta')
  expect(sdk.message).toEqual({ message: 'Domanda corrente?' })
  expect(sdk.config.config.systemInstruction).toContain('Prima risposta')
  expect(sdk.config.config.systemInstruction).not.toContain('Domanda corrente?')
  expect(sdk.config.config.systemInstruction).not.toContain('AI: \n')
})
