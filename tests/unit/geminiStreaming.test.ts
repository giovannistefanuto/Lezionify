import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { normalizeGeminiError } from '../../electron/main/ai/geminiErrors'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { resolve, reject, promise }
}

it('retains stream usage metadata so authorized RAG evaluations can account for consumed tokens', async () => {
  const transport = new GeminiTransport()
  vi.spyOn(transport, 'getClient').mockReturnValue({ models: { generateContentStream: async () => (async function* () {
    yield { text: 'Risposta sintetica' }
    yield { usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4, totalTokenCount: 16 } }
  })() } } as never)
  const result = await transport.generateContentStream({ apiKey: 'synthetic', model: 'synthetic', contents: 'test', onChunk: () => {} })
  expect(result).toMatchObject({ data: 'Risposta sintetica', usageMetadata: { totalTokenCount: 16 } })
})

function request(
  transport: GeminiTransport,
  options: Record<string, unknown> = {}
) {
  const chunks: string[] = []
  const result = transport
    .generateContentStream({
      apiKey: 'synthetic-key',
      model: 'gemini-3.7-flash',
      contents: 'synthetic question',
      onChunk: (text) => chunks.push(text),
      firstChunkTimeoutMs: 60,
      chunkInactivityTimeoutMs: 45,
      ...options
    })
    .catch((error: unknown) => normalizeGeminiError(error))
  return { result, chunks }
}

function controlledSdk(transport: GeminiTransport, openingDelay = 0) {
  let signal!: AbortSignal
  let pending = deferred<IteratorResult<{ text?: string }>>()
  const returned = vi.fn(async () => ({
    done: true as const,
    value: undefined
  }))
  const sdk = vi.fn(async (params: any) => {
    signal = params.config.abortSignal
    if (openingDelay)
      await new Promise((resolve) => setTimeout(resolve, openingDelay))
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => pending.promise,
        return: returned
      })
    }
  })
  vi.spyOn(transport, 'getClient').mockReturnValue({
    models: { generateContentStream: sdk }
  } as never)
  return {
    sdk,
    returned,
    get signal() {
      return signal
    },
    emit: (text?: string) => {
      const previous = pending
      pending = deferred()
      previous.resolve({ done: false, value: { text } })
    },
    done: () => pending.resolve({ done: true, value: undefined }),
    fail: (error: unknown) => pending.reject(error)
  }
}

describe('Streaming: deadline, abort e pulizia', () => {
  it.each(['timeout', 'user'] as const)(
    'manager distingue %s anche con AbortError generico del caller',
    async (cause) => {
      const parent = new AbortController()
      const manager = new GeminiRequestManager({
        ...DEFAULT_GEMINI_POLICY,
        maxTotalAttempts: 1,
        maxAttemptsPerKey: 1
      })
      const call = vi.fn(
        (_key: string, _model: string, signal: AbortSignal) =>
          new Promise((_, reject) => {
            signal.addEventListener(
              'abort',
              () => reject(new DOMException('aborted', 'AbortError')),
              { once: true }
            )
          })
      )
      const result = manager
        .execute({
          jobId: 'generic-abort',
          purpose: 'translation',
          signal: parent.signal,
          keys: [{ key: 'synthetic' }],
          preferredModel: 'test',
          call
        })
        .catch(normalizeGeminiError)
      await vi.advanceTimersByTimeAsync(0)
      if (cause === 'user') parent.abort()
      await vi.advanceTimersByTimeAsync(180_100)
      expect(await result).toMatchObject({
        category: cause === 'user' ? 'cancelled' : 'timeout'
      })
      expect(call).toHaveBeenCalledTimes(1)
    }
  )
  it('un segnale già annullato non apre il SDK', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport)
    const controller = new AbortController()
    controller.abort()
    expect(
      await request(transport, { signal: controller.signal }).result
    ).toMatchObject({ category: 'cancelled' })
    expect(sdk.sdk).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('usa una sola deadline tra apertura lenta e attesa del primo testo', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport, 40)
    const { result } = request(transport)
    await vi.advanceTimersByTimeAsync(40)
    expect(sdk.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    expect(await result).toMatchObject({ category: 'timeout' })
    expect(sdk.signal.aborted).toBe(true)
    expect(sdk.returned).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('chunk vuoti e metadati non prorogano la deadline iniziale', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport)
    const { result, chunks } = request(transport)
    await vi.advanceTimersByTimeAsync(20)
    sdk.emit(' ')
    await vi.advanceTimersByTimeAsync(20)
    sdk.emit()
    await vi.advanceTimersByTimeAsync(20)
    expect(await result).toMatchObject({ category: 'timeout' })
    expect(sdk.signal.aborted).toBe(true)
    expect(chunks).toEqual([])
  })

  it('inattività dopo testo annulla la lettura e sopprime i chunk tardivi', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport)
    const { result, chunks } = request(transport)
    await vi.advanceTimersByTimeAsync(10)
    sdk.emit('primo testo')
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(44)
    expect(sdk.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await result).toMatchObject({ category: 'timeout' })
    sdk.emit('testo tardivo')
    await vi.advanceTimersByTimeAsync(0)
    expect(chunks).toEqual(['primo testo'])
    expect(sdk.signal.aborted).toBe(true)
  })

  it.each(['opening', 'reading'] as const)(
    'propaga cancellazione durante %s e rimuove listener',
    async (phase) => {
      const transport = new GeminiTransport()
      const sdk = controlledSdk(transport, phase === 'opening' ? 100 : 0)
      const parent = new AbortController()
      const added = vi.spyOn(parent.signal, 'addEventListener')
      const removed = vi.spyOn(parent.signal, 'removeEventListener')
      const { result, chunks } = request(transport, { signal: parent.signal })
      await vi.advanceTimersByTimeAsync(0)
      parent.abort()
      expect(await result).toMatchObject({ category: 'cancelled' })
      expect(sdk.signal.aborted).toBe(true)
      expect(removed).toHaveBeenCalledWith('abort', added.mock.calls[0][1])
      await vi.advanceTimersByTimeAsync(100)
      expect(sdk.returned).toHaveBeenCalledTimes(1)
      expect(chunks).toEqual([])
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it.each(['success', 'error'] as const)(
    'pulisce timer/listener dopo %s',
    async (outcome) => {
      const transport = new GeminiTransport()
      const sdk = controlledSdk(transport)
      const parent = new AbortController()
      const added = vi.spyOn(parent.signal, 'addEventListener')
      const removed = vi.spyOn(parent.signal, 'removeEventListener')
      const { result } = request(transport, { signal: parent.signal })
      await vi.advanceTimersByTimeAsync(0)
      if (outcome === 'success') sdk.done()
      else sdk.fail(new Error('503 Service Unavailable'))
      expect(await result).toMatchObject(
        outcome === 'success'
          ? { data: '' }
          : { category: 'service_unavailable' }
      )
      expect(vi.getTimerCount()).toBe(0)
      expect(removed).toHaveBeenCalledWith('abort', added.mock.calls[0][1])
      expect(sdk.signal.aborted).toBe(true)
    }
  )

  it('osserva una rejection tardiva dell apertura dopo il timeout', async () => {
    const transport = new GeminiTransport()
    const opening = deferred<never>()
    let sdkSignal!: AbortSignal
    vi.spyOn(transport, 'getClient').mockReturnValue({
      models: {
        generateContentStream: (params: any) => {
          sdkSignal = params.config.abortSignal
          return opening.promise
        }
      }
    } as never)
    const { result } = request(transport)
    await vi.advanceTimersByTimeAsync(60)
    expect(await result).toMatchObject({ category: 'timeout' })
    expect(sdkSignal.aborted).toBe(true)
    opening.reject(new Error('late SDK rejection'))
    await vi.advanceTimersByTimeAsync(0)
  })

  it('non attende return bloccato e prevale il segnale posseduto dal trasporto', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport)
    sdk.returned.mockReturnValue(new Promise(() => {}))
    const foreign = new AbortController()
    const { result } = request(transport, {
      config: { abortSignal: foreign.signal }
    })
    await vi.advanceTimersByTimeAsync(60)
    expect(await result).toMatchObject({ category: 'timeout' })
    expect(sdk.signal).not.toBe(foreign.signal)
    expect(sdk.signal.aborted).toBe(true)
  })

  it('il timer totale del manager prevale su chunk regolari e conserva timeout', async () => {
    const transport = new GeminiTransport()
    const sdk = controlledSdk(transport)
    const manager = new GeminiRequestManager(
      { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 1 },
      transport
    )
    const result = manager
      .execute({
        jobId: 'total-deadline',
        purpose: 'qna',
        keys: [{ key: 'synthetic' }],
        preferredModel: 'test',
        call: (_, __, signal) =>
          transport.generateContentStream({
            apiKey: 'synthetic',
            model: 'test',
            contents: 'synthetic',
            signal,
            onChunk: () => {}
          })
      })
      .catch(normalizeGeminiError)
    await vi.advanceTimersByTimeAsync(0)
    for (let elapsed = 10_000; elapsed < 180_000; elapsed += 10_000) {
      await vi.advanceTimersByTimeAsync(10_000)
      sdk.emit('regular text')
      await vi.advanceTimersByTimeAsync(0)
    }
    await vi.advanceTimersByTimeAsync(10_000)
    await vi.advanceTimersByTimeAsync(100)
    expect(await result).toMatchObject({ category: 'timeout' })
    expect(sdk.signal.aborted).toBe(true)
  })
})

describe('SDK installato con fetch sintetico, senza rete', () => {
  it.each(['opening', 'reading'] as const)(
    'abort arriva al fetch durante %s',
    async (phase) => {
      let active = 0
      let aborted = false
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: unknown, init: RequestInit) => {
          active++
          const signal = init.signal!
          if (phase === 'opening')
            return new Promise<Response>((_, reject) => {
              signal.addEventListener(
                'abort',
                () => {
                  active--
                  aborted = true
                  reject(new DOMException('aborted', 'AbortError'))
                },
                { once: true }
              )
            })
          return Promise.resolve(
            new Response(
              new ReadableStream({
                start(controller) {
                  signal.addEventListener(
                    'abort',
                    () => {
                      active--
                      aborted = true
                      controller.error(
                        new DOMException('aborted', 'AbortError')
                      )
                    },
                    { once: true }
                  )
                }
              }),
              { headers: { 'content-type': 'text/event-stream' } }
            )
          )
        })
      )
      const { result } = request(new GeminiTransport())
      await vi.advanceTimersByTimeAsync(60)
      expect(await result).toMatchObject({ category: 'timeout' })
      expect(aborted).toBe(true)
      expect(active).toBe(0)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  )

  it('timeout seguito da fallback non sovrappone trasporti client attivi', async () => {
    let active = 0
    let maximum = 0
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: unknown, init: RequestInit) => {
        active++
        calls++
        maximum = Math.max(maximum, active)
        const signal = init.signal!
        if (calls === 1)
          return new Promise<Response>((_, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                active--
                reject(new DOMException('aborted', 'AbortError'))
              },
              { once: true }
            )
          })
        return Promise.resolve(
          new Response(
            new ReadableStream({
              start(controller) {
                signal.addEventListener(
                  'abort',
                  () => {
                    active--
                  },
                  { once: true }
                )
                controller.enqueue(
                  new TextEncoder().encode(
                    'data: {"candidates":[{"content":{"parts":[{"text":"synthetic answer"}]}}]}\n\n'
                  )
                )
                controller.close()
              }
            }),
            { headers: { 'content-type': 'text/event-stream' } }
          )
        )
      })
    )
    const transport = new GeminiTransport()
    const manager = new GeminiRequestManager(
      {
        ...DEFAULT_GEMINI_POLICY,
        maxAttemptsPerKey: 1,
        backoffBaseMs: 1,
        rpmLimit: 100
      },
      transport
    )
    const chunks: string[] = []
    const result = manager
      .execute({
        jobId: 'sdk-timeout-fallback',
        purpose: 'qna',
        preferredModel: 'gemini-3.7-flash',
        fallbackModels: ['gemini-3.5-flash-lite'],
        keys: [{ key: 'synthetic' }],
        call: (apiKey, model, signal) =>
          transport.generateContentStream({
            apiKey,
            model,
            contents: 'synthetic',
            signal,
            onChunk: (text) => chunks.push(text),
            firstChunkTimeoutMs: 60
          })
      })
      .catch(normalizeGeminiError)
    await vi.advanceTimersByTimeAsync(200)
    expect(await result).toEqual({ data: 'synthetic answer' })
    expect(chunks).toEqual(['synthetic answer'])
    expect(maximum).toBe(1)
    expect(active).toBe(0)
    expect(calls).toBe(2)
  })
})
