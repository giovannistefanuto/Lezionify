import { describe, expect, it, vi } from 'vitest'
const sdk = vi.hoisted(() => ({ config: null as any, message: null as any, grounding: null as any }))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContentStream: async (params: any) => {
        sdk.config = params
        sdk.message = params.contents
        return (async function* () {
          yield { text: 'risposta' }
          if (sdk.grounding) yield { candidates: [{ groundingMetadata: { groundingChunks: sdk.grounding } }] }
        })()
      }
    }
  }
}))
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { GeminiError, normalizeGeminiError } from '../../electron/main/ai/geminiErrors'
import { getQnaModelFallbackChain } from '../../shared/qnaModelPolicy'

it('abilita Google Search solo su richiesta e conserva fonti web separate dalla lezione', async () => {
  const gemini = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }) })
  const thread: any = { id: 'web-request', quote: 'frase', messages: [{ role: 'user', text: 'Domanda corrente?' }] }
  sdk.grounding = [{ web: { title: 'Fonte verificabile', uri: 'https://example.org/documento' } }, { web: { title: 'Non ammessa', uri: 'javascript:alert(1)' } }]
  try {
    let output = ''
    for await (const chunk of gemini.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.8-flash', thread, searchOnline: true })) output += chunk
    expect(sdk.config.config.tools).toEqual([{ googleSearch: {} }])
    expect(output).toContain('### Fonti web')
    expect(output).toContain('https://example.org/documento')
    expect(output).not.toContain('javascript:')
    output = ''
    for await (const chunk of gemini.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.8-flash', thread })) output += chunk
    expect(sdk.config.config.tools).toBeUndefined()
    expect(output).toBe('risposta')
  } finally { sdk.grounding = null }
})

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
  expect(sdk.config.model).toBe('gemini-3.5-flash-lite')
  expect(sdk.message).toBe('Domanda corrente?')
  expect(sdk.config.config.systemInstruction).toContain('Prima risposta')
  expect(sdk.config.config.systemInstruction).toContain('METODO DIDATTICO:')
  expect(sdk.config.config.systemInstruction).toContain('senza elogi automatici')
  expect(sdk.config.config.systemInstruction).not.toContain('Domanda corrente?')
  expect(sdk.config.config.systemInstruction).not.toContain('AI: \n')
})

it('invia solo le immagini attive come parti PNG e la domanda corrente senza alterare lo storico', async () => {
  const gemini = new GeminiService()
  const stream = gemini.generateQnaResponse({ apiKey: 'test', model: 'gemini-3.6-flash', thread: { id: 'images', quote: 'synthetic', contextHeading: null, messages: [{ role: 'user', text: 'Explain page 7', timestamp: '' }], createdAt: '', updatedAt: '' }, images: [{ page: 7, mimeType: 'image/png', data: 'c3ludGhldGlj' }] })
  for await (const chunk of stream) expect(chunk).toBe('risposta')
  expect(sdk.message).toEqual([{ role: 'user', parts: [{ text: 'Slide allegata: pagina 7.' }, { inlineData: { mimeType: 'image/png', data: 'c3ludGhldGlj' } }, { text: 'Explain page 7' }] }])
  expect(sdk.config.config.systemInstruction).toContain('METODO DIDATTICO:')
})

describe('Q&A centralizzato', () => {
  it.each(['brief', 'medium', 'long'] as const)('applica lunghezza %s e stile diretto al prompt SDK', async responseLength => {
    const gemini = new GeminiService()
    for await (const chunk of gemini.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', responseLength, thread })) expect(chunk).toBe('risposta')
    expect(sdk.config.config.systemInstruction).toContain(responseLength === 'long' ? 'più di 400 parole' : responseLength === 'medium' ? 'tra 200 e 400 parole' : 'meno di 200 parole')
    expect(sdk.config.config.systemInstruction).toContain('Non usare frasi di apertura o chiusura')
    expect(sdk.config.config.systemInstruction).toContain('Non aggiungere domande di verifica in chiusura')
  })
  const thread = {
    id: 'qna-central-test',
    quote: 'Testo selezionato',
    contextHeading: 'Sezione',
    messages: [{ role: 'user' as const, text: 'Spiega meglio', timestamp: '' }],
    createdAt: '',
    updatedAt: ''
  }

  it('mantiene una catena Q&A separata, senza duplicati e con modello configurato di riserva', () => {
    expect(getQnaModelFallbackChain('gemini-3.6-flash')).toEqual({ preferred: 'gemini-3.5-flash-lite', fallbacks: ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'] })
    const chain = getQnaModelFallbackChain('gemini-3.5-flash-lite')
    expect(new Set([chain.preferred, ...chain.fallbacks]).size).toBe(chain.fallbacks.length + 1)
  })

  it.each(['vuota', 'timeout', '404 model not found', '503 Service Unavailable'])('recupera da %s conservando immagini, storico e contesto completo', async failure => {
    const transport = new GeminiTransport()
    const requests: any[] = []
    vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
      requests.push(params)
      if (requests.length <= 2) {
        if (failure === 'timeout') throw new GeminiError({ category: 'timeout', isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Timeout sintetico.' })
        if (failure !== 'vuota') throw new Error(failure)
        return { data: '' }
      }
      params.onChunk('Risposta dal Flash')
      return { data: 'Risposta dal Flash' }
    })
    const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport) })
    let text = ''
    for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread: { ...thread, messages: [{ role: 'user', text: 'Prima domanda', timestamp: '' }, { role: 'ai', text: 'Prima risposta', timestamp: '' }, ...thread.messages] }, fullLectureText: 'Contesto intero sintetico', images: [{ page: 7, mimeType: 'image/png', data: 'c3ludGhldGlj' }] })) text += chunk
    expect(text).toBe('Risposta dal Flash')
    expect(requests.map(value => value.model)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'])
    for (const request of requests) {
      expect(request.contents).toEqual(requests[0].contents)
      expect(request.config.systemInstruction).toContain('Contesto intero sintetico')
      expect(request.config.systemInstruction).toContain('Prima risposta')
      expect(request.config.systemInstruction).toBe(requests[0].config.systemInstruction)
      expect(request.config.systemInstruction).toContain('METODO DIDATTICO:')
    }
  })

  it('interrompe dopo il budget globale se tutti i modelli non danno testo', async () => {
    const transport = new GeminiTransport()
    const attempts = vi.spyOn(transport, 'generateContentStream').mockResolvedValue({ data: '' })
    const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport) })
    await expect((async () => { for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.6-flash', thread })) { void chunk } })()).rejects.toThrow('non ha restituito testo')
    expect(attempts).toHaveBeenCalledTimes(6)
  })

  it('non usa fallback per un blocco esplicito del provider', async () => {
    const transport = new GeminiTransport()
    vi.spyOn(transport, 'getClient').mockReturnValue({ models: { generateContentStream: async () => (async function* () { yield { promptFeedback: { blockReason: 'SAFETY' } } })() } } as never)
    const attempts = vi.spyOn(transport, 'generateContentStream')
    const service = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport) })
    await expect((async () => { for await (const chunk of service.generateQnaResponse({ apiKey: 'synthetic', model: 'gemini-3.7-flash', thread })) { void chunk } })()).rejects.toThrow('bloccata dal provider')
    expect(attempts).toHaveBeenCalledTimes(1)
  })

  it.each([
    '429 daily quota exceeded',
    '401 unauthenticated',
    '404 model not found',
    '503 Service Unavailable',
    'network error',
    'Timeout',
    'aborted'
  ])('nessun recupero dopo testo parziale: %s', async (message) => {
    const transport = new GeminiTransport()
    const attempt = vi
      .spyOn(transport, 'generateContentStream')
      .mockImplementation(async (params) => {
        params.onChunk('parziale')
        throw new Error(message)
      })
    const service = new GeminiService({
      requestManager: new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 },
        transport
      )
    })
    const chunks: string[] = []
    let failure: unknown
    try {
      for await (const value of service.generateQnaResponse({
        keys: [
          { key: 'synthetic-a', quotaGroup: 'a' },
          { key: 'synthetic-b', quotaGroup: 'b' }
        ],
        model: 'gemini-3.7-flash',
        thread
      }))
        chunks.push(value)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeDefined()
    expect(normalizeGeminiError(failure).category).toBe(
      normalizeGeminiError(new Error(message)).category
    )
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(chunks).toEqual(['parziale'])
  })

  it('annulla il segnale SDK quando l apertura supera la deadline', async () => {
    const transport = new GeminiTransport()
    let sdkSignal: AbortSignal | undefined
    vi.spyOn(transport, 'getClient').mockReturnValue({
      models: {
        generateContentStream: (params: any) => {
          sdkSignal = params.config?.abortSignal
          return new Promise(() => {})
        }
      }
    } as never)
    await expect(
      transport.generateContentStream({
        apiKey: 'synthetic',
        model: 'test',
        contents: 'test',
        onChunk: () => {},
        firstChunkTimeoutMs: 5
      })
    ).rejects.toMatchObject({ category: 'timeout' })
    expect(sdkSignal?.aborted).toBe(true)
  })

  it('inizia da Flash Lite e passa subito al prossimo modello dopo un 503', async () => {
    const transport = new GeminiTransport()
    const models: string[] = []
    vi.spyOn(transport, 'generateContentStream').mockImplementation(
      async (params) => {
        models.push(params.model)
        if (params.model === 'gemini-3.5-flash-lite') {
          throw new Error('503 Service Unavailable')
        }
        params.onChunk('fallback riuscito')
        return { data: 'fallback riuscito' }
      }
    )
    const service = new GeminiService({
      requestManager: new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 },
        transport
      )
    })

    let output = ''
    for await (const chunk of service.generateQnaResponse({
      apiKey: 'test-key',
      model: 'gemini-3.7-flash',
      thread
    }))
      output += chunk

    expect(output).toBe('fallback riuscito')
    expect(models).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ])
  })

  it('non ritenta uno stream che ha già mostrato contenuto', async () => {
    const transport = new GeminiTransport()
    const streamSpy = vi
      .spyOn(transport, 'generateContentStream')
      .mockImplementation(async (params) => {
        params.onChunk('risposta parziale')
        throw new Error('503 Service Unavailable')
      })
    const service = new GeminiService({
      requestManager: new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 },
        transport
      )
    })

    const received: string[] = []
    let failure: Error | null = null
    try {
      for await (const chunk of service.generateQnaResponse({
        apiKey: 'test-key',
        model: 'gemini-3.7-flash',
        thread
      }))
        received.push(chunk)
    } catch (error) {
      failure = error as Error
    }

    expect(received).toEqual(['risposta parziale'])
    expect(failure?.message).toMatch(/interrotto dopo l.inizio/i)
    expect(streamSpy).toHaveBeenCalledTimes(1)
  })

  it('applica il timeout del primo chunk nel transport', async () => {
    const transport = new GeminiTransport()
    vi.spyOn(transport, 'getClient').mockReturnValue({
      models: {
        generateContentStream: async () =>
          (async function* () {
            await new Promise((resolve) => setTimeout(resolve, 50))
            yield { text: 'troppo tardi' }
          })()
      }
    } as never)

    await expect(
      transport.generateContentStream({
        apiKey: 'test-key',
        model: 'gemini-3.7-flash',
        contents: 'domanda',
        onChunk: () => {},
        firstChunkTimeoutMs: 5,
        chunkInactivityTimeoutMs: 5
      })
    ).rejects.toThrow(/nessun contenuto/i)
  })

  it('applica il timeout anche se l SDK non apre lo stream', async () => {
    const transport = new GeminiTransport()
    vi.spyOn(transport, 'getClient').mockReturnValue({
      models: {
        generateContentStream: () => new Promise(() => {})
      }
    } as never)

    await expect(
      transport.generateContentStream({
        apiKey: 'test-key',
        model: 'gemini-3.7-flash',
        contents: 'domanda',
        onChunk: () => {},
        firstChunkTimeoutMs: 5,
        chunkInactivityTimeoutMs: 5
      })
    ).rejects.toThrow(/nessun contenuto/i)
  })
})

it('limita i riferimenti successivi al contesto completo e distingue gli altri Q&A dalle fonti', async () => {
 const gemini = new GeminiService({ requestManager: new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 }, new GeminiTransport()) })
 const thread: any = { quote: 'Introduzione', messages: [{ role: 'user', text: 'Spiega' }] }
 for await (const _chunk of gemini.generateQnaResponse({ apiKey: 'test', model: 'gemini-3.6-flash', thread })) { expect(_chunk).toBe('risposta') }
 expect(sdk.config.config.systemInstruction).toContain('CONTESTO LIMITATO:')
 expect(sdk.config.config.systemInstruction).not.toContain('PARAGRAFI SUCCESSIVI:')
 for await (const _chunk of gemini.generateQnaResponse({ apiKey: 'test', model: 'gemini-3.6-flash', thread, fullLectureText: 'Introduzione e capitoli successivi', otherQnaContext: 'Estratto sintetico precedente' })) { expect(_chunk).toBe('risposta') }
 expect(sdk.config.config.systemInstruction).toContain('PARAGRAFI SUCCESSIVI:')
 expect(sdk.config.config.systemInstruction).toContain('soltanto se la posizione è verificabile')
 expect(sdk.config.config.systemInstruction).toContain('derivazioni potenzialmente errate, non fonti originali')
 expect(sdk.config.config.systemInstruction).toContain('Estratto sintetico precedente')
})
