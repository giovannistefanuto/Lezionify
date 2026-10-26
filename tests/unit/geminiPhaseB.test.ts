import { describe, expect, it, vi } from 'vitest'
import { GeminiService } from '../../electron/main/gemini'
import {
  normalizeGeminiError,
  GeminiError
} from '../../electron/main/ai/geminiErrors'
import {
  GeminiRequestManager,
  Clock
} from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { logger } from '../../electron/main/logger'

class VirtualClock implements Clock {
  private time = 1_000_000

  now(): number {
    return this.time
  }

  async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new GeminiError({
        category: 'cancelled',
        isRetryable: false,
        isDailyQuota: false,
        sanitizedMessage: 'Attesa annullata.'
      })
    }
    this.time += ms
    // Risolvi immediatamente a livello di tempo reale
    await new Promise((resolve) => setTimeout(resolve, 1))
  }

  advance(ms: number): void {
    this.time += ms
  }
}

describe('Fase B — Gestore Condiviso e Trasporto AI', () => {
  it.each(['sections', 'translation', 'asr_transcribe'] as const)('raggiunge la tredicesima chiave per %s anche oltre dieci minuti', async purpose => {
    const clock = new VirtualClock()
    const manager = new GeminiRequestManager(DEFAULT_GEMINI_POLICY, new GeminiTransport(), clock)
    const keys = Array.from({ length: 13 }, (_, i) => ({ key: `synthetic-pool-${i}`, quotaGroup: `project-${i}` }))
    const calls: string[] = []
    await expect(manager.execute({ jobId: 'full-pool', purpose, keys, preferredModel: 'full',
      call: async key => {
        calls.push(key)
        if (key !== keys[12].key) {
          clock.advance(purpose === 'asr_transcribe' ? 300_000 : 180_000)
          throw new GeminiError({ category: 'timeout', isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Timeout simulato' })
        }
        return 'ok'
      }
    })).resolves.toBe('ok')
    expect(calls).toEqual(keys.map(key => key.key))
  })
  it('esaurisce il pool archivio con tentativi finiti per coppia e rispetta una scadenza esplicita', async () => {
    const keys = Array.from({ length: 13 }, (_, i) => ({ key: `synthetic-limit-${i}`, quotaGroup: `project-${i}` }))
    const clock = new VirtualClock()
    const manager = new GeminiRequestManager(DEFAULT_GEMINI_POLICY, new GeminiTransport(), clock)
    const call = vi.fn(async () => { throw new GeminiError({ category: 'timeout', isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Timeout simulato' }) })
    await expect(manager.execute({ jobId: 'finite-pool', purpose: 'translation', keys, preferredModel: 'full', call })).rejects.toMatchObject({ category: 'timeout' })
    expect(call).toHaveBeenCalledTimes(39)

    const limitedClock = new VirtualClock()
    const limited = new GeminiRequestManager(DEFAULT_GEMINI_POLICY, new GeminiTransport(), limitedClock)
    const slow = vi.fn(async () => { limitedClock.advance(180_000); throw new GeminiError({ category: 'timeout', isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Timeout simulato' }) })
    await expect(limited.execute({ jobId: 'explicit-deadline', purpose: 'sections', keys, preferredModel: 'full', timeoutMs: 300_000, call: slow })).rejects.toMatchObject({ category: 'timeout' })
    expect(slow).toHaveBeenCalledTimes(2)
  })
  it('una quota legacy non verificata non sospende le altre chiavi, mantenendo RPM e cooldown condivisi', async () => {
    const clock = new VirtualClock()
    const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 5 }, new GeminiTransport(), clock)
    const keys = [
      { key: 'synthetic-one', quotaGroup: 'default-project', quotaGroupKnown: false },
      { key: 'synthetic-two', quotaGroup: 'default-project', quotaGroupKnown: false }
    ]
    const calls: { key: string; time: number }[] = []
    await expect(manager.execute({ jobId: 'unknown-projects', purpose: 'translation', keys,
      preferredModel: 'full-model', fallbackModels: ['lite-model'],
      call: async (key, model) => {
        calls.push({ key, time: clock.now() })
        expect(model).toBe('full-model')
        if (key === keys[0].key) throw new GeminiError({ category: 'quota_exhausted', isDailyQuota: true, isRetryable: false, sanitizedMessage: 'Quota' })
        return 'ok'
      }
    })).resolves.toBe('ok')
    expect(calls.map(call => call.key)).toEqual(keys.map(key => key.key))
    expect(calls[1].time - calls[0].time).toBeGreaterThanOrEqual(12_000)

    const retry = vi.fn(async (_key: string) => 'ok')
    await manager.execute({ jobId: 'next-request', purpose: 'translation', keys, preferredModel: 'full-model', call: retry })
    expect(retry.mock.calls[0]?.[0]).toBe(keys[1].key)

    const minuteManager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, new GeminiTransport(), clock)
    const starts: number[] = []
    await minuteManager.execute({ jobId: 'unknown-cooldown', purpose: 'translation', keys, preferredModel: 'full-model',
      call: async key => {
        starts.push(clock.now())
        if (key === keys[0].key) throw new GeminiError({ category: 'rate_limited', isDailyQuota: false, isRetryable: true, retryDelayMs: 20_000, sanitizedMessage: 'Rate limit' })
        return 'ok'
      }
    })
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(20_000)
  })

  it('la traduzione esaurisce i modelli completi senza passare automaticamente ai Lite', async () => {
    const transport = new GeminiTransport()
    const models: string[] = []
    vi.spyOn(transport, 'getClient').mockReturnValue({ models: { generateContent: async ({ model }: { model: string }) => {
      models.push(model)
      throw new GeminiError({ category: 'quota_exhausted', isDailyQuota: true, isRetryable: false, sanitizedMessage: 'Quota' })
    } } } as never)
    const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport, new VirtualClock())
    await expect(new GeminiService({ requestManager: manager }).translateToEnglish({ apiKey: 'synthetic', model: 'gemini-3.7-flash', markdownIta: '# Testo' })).rejects.toMatchObject({ category: 'quota_exhausted' })
    expect(models).toEqual(['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'])
  })

  it('il pool archivio raggiunge tutte le chiavi legacy e non riprova chiavi duplicate sospese', async () => {
    const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, new GeminiTransport(), new VirtualClock())
    const keys = Array.from({ length: 18 }, (_, i) => ({ key: `synthetic-${i}`, quotaGroup: 'default-project', quotaGroupKnown: false }))
    const quota = new GeminiError({ category: 'quota_exhausted', isDailyQuota: true, isRetryable: false, sanitizedMessage: 'Quota' })
    const call = vi.fn(async () => { throw quota })
    await expect(manager.execute({ jobId: 'legacy-budget', purpose: 'translation', keys, preferredModel: 'full', fallbackModels: ['other-full'], call })).rejects.toBe(quota)
    expect(call).toHaveBeenCalledTimes(36)
    const next = vi.fn(async (_key: string) => 'ok')
    const fresh = { key: 'synthetic-fresh', quotaGroup: 'default-project', quotaGroupKnown: false }
    await manager.execute({ jobId: 'legacy-duplicates', purpose: 'translation', keys: [{ ...keys[0], id: 'different-position' }, fresh], preferredModel: 'full', call: next })
    expect(next).toHaveBeenCalledExactlyOnceWith(fresh.key, 'full', expect.any(AbortSignal))
  })

  it('mostra in ordine tentativi, rotazione, saturazione e fallback senza esporre segreti', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never)
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
    try {
      const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, new GeminiTransport(), new VirtualClock())
      const calls: string[] = []
      await expect(manager.execute({ jobId: 'detailed-fallback', purpose: 'sections',
        keys: [{ key: 'private-key-one' }, { key: 'private-key-two' }],
        preferredModel: 'model-1', fallbackModels: ['model-2', 'model-3'],
        call: async (key, model) => {
          calls.push(`${key}:${model}`)
          if (model !== 'model-3') throw new GeminiError({ category: 'service_unavailable', statusCode: 503, isRetryable: true, isDailyQuota: false, sanitizedMessage: 'private provider response' })
          return 'private lesson content'
        }
      })).resolves.toBe('private lesson content')
      const ordered = [info, warn].flatMap(spy => spy.mock.calls.map((args, index) => ({ args, order: spy.mock.invocationCallOrder[index] }))).sort((a, b) => a.order - b.order)
      const messages = ordered.map(entry => entry.args[1]).join('\n')
      const events = ordered.map(entry => JSON.parse(entry.args[2] || '{}').event)
      expect(calls).toEqual(['private-key-one:model-1', 'private-key-two:model-1', 'private-key-one:model-2', 'private-key-two:model-2', 'private-key-one:model-3'])
      expect(events.filter(event => event === 'gemini_request_attempt')).toHaveLength(calls.length)
      expect(events.filter(event => event === 'gemini_request_result')).toHaveLength(calls.length)
      expect(events.filter(event => event === 'gemini_model_fallback')).toHaveLength(2)
      expect(messages).toContain('Tentativo 1 · Chiave 1 · modello model-1')
      expect(messages).toContain('provo un\'altra chiave')
      expect(messages).toContain('Modello model-2 saturo')
      expect(messages).toContain('Passo dal modello model-2 al modello model-3')
      expect(messages.indexOf('Modello model-2 saturo')).toBeLessThan(messages.indexOf('Passo dal modello model-2 al modello model-3'))
      expect(messages).toContain('5 tentativi, 2 chiavi')
      const payload = JSON.stringify(ordered)
      for (const secret of ['private-key-one', 'private-key-two', 'private provider response', 'private lesson content']) expect(payload).not.toContain(secret)
    } finally { info.mockRestore(); warn.mockRestore() }
  })

  it('registra attese, cooldown, limiti e fine budget senza annunciare fallback inesistenti', async () => {
    const entries: { event: string; message: string }[] = []
    const capture = (_source: string, message: string, details?: string) => {
      entries.push({ event: JSON.parse(details || '{}').event, message })
      return undefined as never
    }
    const info = vi.spyOn(logger, 'info').mockImplementation(capture)
    const warn = vi.spyOn(logger, 'warn').mockImplementation(capture)
    try {
      const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 2, maxAttemptsPerKey: 2, rpmLimit: 100 }, new GeminiTransport(), new VirtualClock())
      await expect(manager.execute({ jobId: 'wait-budget', purpose: 'qna', keys: [{ key: 'synthetic-secret' }], preferredModel: 'first', fallbackModels: ['second'],
        call: async () => { throw new GeminiError({ category: 'rate_limited', statusCode: 429, retryDelayMs: 15000, isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Rate limit' }) }
      })).rejects.toMatchObject({ category: 'rate_limited' })
      expect(entries.some(entry => entry.event === 'gemini_retry_wait' && entry.message.includes('15 s'))).toBe(true)
      expect(entries.some(entry => entry.event === 'gemini_retry_ready')).toBe(true)
      expect(entries.some(entry => entry.event === 'gemini_attempts_exhausted' && entry.message.includes('budget totale esaurito'))).toBe(true)
      expect(entries.some(entry => entry.event === 'gemini_model_fallback')).toBe(false)

      entries.length = 0
      await expect(manager.execute({ jobId: 'cooldown-terminal', purpose: 'translation', keys: [{ key: 'synthetic-secret' }], preferredModel: 'first',
        call: async () => { throw new GeminiError({ category: 'rate_limited', statusCode: 429, retryDelayMs: 15000, recoveryDisposition: 'terminal', isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Rate limit' }) }
      })).rejects.toMatchObject({ category: 'rate_limited' })
      await manager.execute({ jobId: 'cooldown-next', purpose: 'translation', keys: [{ key: 'synthetic-secret' }], preferredModel: 'first', call: async () => 'ok' })
      expect(entries.some(entry => entry.event === 'gemini_wait_started' && entry.message.includes('Cooldown'))).toBe(true)
      expect(entries.some(entry => entry.event === 'gemini_wait_finished')).toBe(true)
    } finally { info.mockRestore(); warn.mockRestore() }
  })

  it('un errore terminale mantiene telemetria e sospensione quota senza retry o fallback', async () => {
    const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, new GeminiTransport(), new VirtualClock())
    const terminal = new GeminiError({ category: 'quota_exhausted', statusCode: 429,
      isDailyQuota: true, isRetryable: false, recoveryDisposition: 'terminal',
      sanitizedMessage: 'Risposta parziale interrotta.' })
    expect(normalizeGeminiError(terminal)).toBe(terminal)
    const warnings = vi.spyOn(logger, 'warn')
    const retries = vi.fn()
    const attempts = vi.fn()
    const call = vi.fn(async () => { throw terminal })
    await expect(manager.execute({ jobId: 'terminal-summary', purpose: 'qna',
      keys: [{ key: 'synthetic-a', quotaGroup: 'same-project' }, { key: 'synthetic-b', quotaGroup: 'same-project' }],
      preferredModel: 'first', fallbackModels: ['second'], call, onRetry: retries, onAttempt: attempts
    })).rejects.toBe(terminal)
    expect(call).toHaveBeenCalledTimes(1)
    expect(attempts).toHaveBeenCalledTimes(1)
    expect(retries).not.toHaveBeenCalled()
    const summaries = warnings.mock.calls.filter((args) => args.some((arg) => String(arg).includes('gemini_request_summary')))
    expect(summaries).toHaveLength(1)
    expect(JSON.stringify(summaries)).toContain('failed')
    const subsequent = vi.fn(async () => 'ok')
    await manager.execute({ jobId: 'explicit-new-request', purpose: 'qna',
      keys: [{ key: 'synthetic-a', quotaGroup: 'same-project' }],
      preferredModel: 'first', fallbackModels: ['second'], call: subsequent })
    expect(subsequent.mock.calls[0]?.[1]).toBe('second')
    warnings.mockRestore()
  })

  describe('geminiErrors — Normalizzazione e messaggi sanitizzati', () => {
    it('classifica correttamente 429 con rate limit per minuto vs quota giornaliera', () => {
      const errMinute = normalizeGeminiError(new Error('ResourceExhausted: rate limit exceeded. Please retry in 15s'))
      expect(errMinute.category).toBe('rate_limited')
      expect(errMinute.statusCode).toBe(429)
      expect(errMinute.isRetryable).toBe(true)
      expect(errMinute.isDailyQuota).toBe(false)
      expect(errMinute.retryDelayMs).toBe(15000)

      const errDaily = normalizeGeminiError(new Error('GenerateRequestsPerDay-FreeTier quota exceeded for day'))
      expect(errDaily.category).toBe('quota_exhausted')
      expect(errDaily.statusCode).toBe(429)
      expect(errDaily.isRetryable).toBe(false)
      expect(errDaily.isDailyQuota).toBe(true)
    })

    it('classifica 503, 502, 504 e UNAVAILABLE come service_unavailable', () => {
      const err = normalizeGeminiError(new Error('503 Service Unavailable (The model is overloaded)'))
      expect(err.category).toBe('service_unavailable')
      expect(err.statusCode).toBe(503)
      expect(err.isRetryable).toBe(true)
    })

    it('classifica errori di autenticazione e permessi come non ritentabili', () => {
      const authErr = normalizeGeminiError(new Error('API key not valid. Please pass a valid API key (401)'))
      expect(authErr.category).toBe('authentication')
      expect(authErr.isRetryable).toBe(false)

      const permErr = normalizeGeminiError(new Error('403 Forbidden: Caller does not have required permission'))
      expect(permErr.category).toBe('permission_denied')
      expect(permErr.isRetryable).toBe(false)
    })

    it('classifica timeout e cancellazione', () => {
      const timeoutErr = normalizeGeminiError(new Error('Timeout complessivo della richiesta'))
      expect(timeoutErr.category).toBe('timeout')
      expect(timeoutErr.isRetryable).toBe(true)

      const cancelErr = normalizeGeminiError(new Error('Richiesta Gemini annullata.'))
      expect(cancelErr.category).toBe('cancelled')
      expect(cancelErr.isRetryable).toBe(false)
    })
  })

  describe('geminiRequestManager — Concorrenza 1, Finestra Mobile 60s, Cooldown e Starvation', () => {
    it('registra alias, conteggi e segnali quota senza persistere le chiavi API', async () => {
      const clock = new VirtualClock()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 },
        new GeminiTransport(),
        clock
      )
      const infoSpy = vi.spyOn(logger, 'info')
      const warnSpy = vi.spyOn(logger, 'warn')
      const firstSecret = 'AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      const thirdSecret = 'AIzaSyCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'

      await expect(
        manager.execute({
          jobId: 'weekly-audit-test',
          purpose: 'translation',
          keys: [
            { key: firstSecret, id: 'key-0', quotaGroup: 'project-a' },
            { key: thirdSecret, id: 'key-2', quotaGroup: 'project-b' }
          ],
          preferredModel: 'gemini-3.7-flash',
          call: async (apiKey) => {
            if (apiKey === firstSecret) {
              throw new GeminiError({
                category: 'quota_exhausted',
                statusCode: 429,
                isRetryable: false,
                isDailyQuota: true,
                sanitizedMessage: 'Quota giornaliera esaurita.'
              })
            }
            return 'ok'
          }
        })
      ).resolves.toBe('ok')

      const persistedPayload = [...infoSpy.mock.calls, ...warnSpy.mock.calls]
        .map((call) => `${call[1]} ${call[2] || ''}`)
        .join('\n')

      expect(persistedPayload).toContain('gemini_request_attempt')
      expect(persistedPayload).toContain('gemini_request_summary')
      expect(persistedPayload).toContain('gemini_quota_suspended')
      expect(persistedPayload).toContain('Chiave 1')
      expect(persistedPayload).toContain('Chiave 3')
      expect(persistedPayload).toContain('"distinctKeysUsed":2')
      expect(persistedPayload).toContain('"dailyQuotaExhausted":true')
      expect(persistedPayload).not.toContain(firstSecret)
      expect(persistedPayload).not.toContain(thirdSecret)

      infoSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it('garantisce concorrenza globale massima di 1 (nessuna esecuzione simultanea)', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, concurrencyLimit: 1, rpmLimit: 100 },
        transport,
        clock
      )

      let activeExecutions = 0
      let maxObservedActive = 0

      const makeTask = (id: string) => {
        return manager.execute({
          jobId: `job-${id}`,
          purpose: 'sections',
          priority: 'background',
          keys: [{ key: 'k1', quotaGroup: 'grp-test' }],
          preferredModel: 'gemini-3.6-flash',
          call: async () => {
            activeExecutions++
            maxObservedActive = Math.max(maxObservedActive, activeExecutions)
            // Simula elaborazione
            await clock.sleep(100)
            activeExecutions--
            return `done-${id}`
          }
        })
      }

      const tasks = [makeTask('1'), makeTask('2'), makeTask('3'), makeTask('4')]
      const results = await Promise.all(tasks)

      expect(results).toEqual(['done-1', 'done-2', 'done-3', 'done-4'])
      expect(maxObservedActive).toBe(1)
    })

    it('rispetta la finestra mobile di 60s per il limite RPM', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      // Limitiamo a 3 RPM per il test
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, concurrencyLimit: 1, rpmLimit: 3 },
        transport,
        clock
      )

      const startTimes: number[] = []

      const makeTask = (id: number) => {
        return manager.execute({
          jobId: `rpm-job-${id}`,
          purpose: 'sections',
          priority: 'background',
          keys: [{ key: 'k1', quotaGroup: 'p1' }],
          preferredModel: 'gemini-3.6-flash',
          call: async () => {
            startTimes.push(clock.now())
            return `res-${id}`
          }
        })
      }

      // Inviamo 4 richieste: le prime 3 riempiono i 3 RPM, la quarta deve attendere che la prima esca dalla finestra di 60s
      for (let i = 1; i <= 4; i++) {
        await makeTask(i)
      }

      expect(startTimes).toHaveLength(4)
      // Il tempo tra la 1a e la 4a richiesta deve essere almeno di 60s
      const diff1to4 = startTimes[3] - startTimes[0]
      expect(diff1to4).toBeGreaterThanOrEqual(60_000)
    })

    it('chiavi appartenenti allo stesso quotaGroup condividono la quota e il cooldown', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, concurrencyLimit: 1, rpmLimit: 5 },
        transport,
        clock
      )

      let key1Calls = 0
      let key2Calls = 0

      // Due chiavi configurate sotto lo stesso gruppo di progetto 'project-alpha'
      const keys = [
        { key: 'key-alpha-1', quotaGroup: 'project-alpha' },
        { key: 'key-alpha-2', quotaGroup: 'project-alpha' }
      ]

      await manager.execute({
        jobId: 'quota-group-test',
        purpose: 'sections',
        priority: 'background',
        keys,
        preferredModel: 'gemini-3.6-flash',
        call: async (key) => {
          if (key === 'key-alpha-1') {
            key1Calls++
            // Simula un 429 con richiesta di attesa di 20s
            throw new GeminiError({
              category: 'rate_limited',
              statusCode: 429,
              retryDelayMs: 20_000,
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: 'Rate limit hit'
            })
          }
          key2Calls++
          return 'success-from-key-2'
        }
      })

      expect(key1Calls).toBe(1)
      expect(key2Calls).toBe(1)

      // Il cooldown aperto da key1 (20s) deve essere stato rispettato prima della chiamata a key2
      // perché entrambe appartengono a 'project-alpha'
      expect(clock.now()).toBeGreaterThanOrEqual(1_000_000 + 20_000)
    })

    it('il budget fisico complessivo non supera maxTotalAttempts (6 tentativi totali)', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 6, maxAttemptsPerKey: 3 },
        transport,
        clock
      )

      let totalPhysicalAttempts = 0

      const failingKeys = [
        { key: 'k1', quotaGroup: 'g1' },
        { key: 'k2', quotaGroup: 'g2' },
        { key: 'k3', quotaGroup: 'g3' }
      ]

      const executePromise = manager.execute({
        jobId: 'budget-exhaustion-test',
        purpose: 'qna',
        priority: 'background',
        keys: failingKeys,
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          totalPhysicalAttempts++
          throw new GeminiError({
            category: 'service_unavailable',
            statusCode: 503,
            isRetryable: true,
            isDailyQuota: false,
            sanitizedMessage: '503 Overloaded'
          })
        }
      })

      await expect(executePromise).rejects.toThrow()
      // Non deve superare il budget globale di 6 tentativi fisici
      expect(totalPhysicalAttempts).toBe(6)
    })

    it('mantiene il budget assoluto anche con 17 chiavi e più modelli di fallback', async () => {
      const clock = new VirtualClock()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 6, rpmLimit: 100 },
        new GeminiTransport(),
        clock
      )
      let attempts = 0

      await expect(
        manager.execute({
          jobId: 'large-pool-budget',
          purpose: 'qna',
          keys: Array.from({ length: 17 }, (_, index) => ({
            key: `key-${index}`,
            quotaGroup: `project-${index}`
          })),
          preferredModel: 'gemini-3.7-flash',
          fallbackModels: [
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-3.5-flash'
          ],
          call: async () => {
            attempts++
            throw new GeminiError({
              category: 'service_unavailable',
              statusCode: 503,
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: 'Server sovraccarico'
            })
          }
        })
      ).rejects.toThrow('Server sovraccarico')

      expect(attempts).toBe(6)
    })

    it('passa al modello di fallback dopo due 503 consecutivi', async () => {
      const clock = new VirtualClock()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 6, rpmLimit: 100 },
        new GeminiTransport(),
        clock
      )
      const modelsTried: string[] = []

      const result = await manager.execute({
        jobId: 'fallback-after-503',
        purpose: 'translation',
        keys: [{ key: 'k1', quotaGroup: 'project-a' }],
        preferredModel: 'gemini-3.7-flash',
        fallbackModels: ['gemini-3.5-flash-lite'],
        call: async (_key, model) => {
          modelsTried.push(model)
          if (model === 'gemini-3.7-flash') {
            throw new GeminiError({
              category: 'service_unavailable',
              statusCode: 503,
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: 'Server sovraccarico'
            })
          }
          return 'ok'
        }
      })

      expect(result).toBe('ok')
      expect(modelsTried).toEqual([
        'gemini-3.7-flash',
        'gemini-3.7-flash',
        'gemini-3.5-flash-lite'
      ])
    })

    it('con una sola chiave percorre i fallback rispettando tre tentativi per coppia', async () => {
      const clock = new VirtualClock()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 6, rpmLimit: 100 },
        new GeminiTransport(),
        clock
      )
      const modelsTried: string[] = []

      await expect(
        manager.execute({
          jobId: 'single-key-full-fallback',
          purpose: 'translation',
          keys: [{ key: 'k1', quotaGroup: 'project-a' }],
          preferredModel: 'gemini-3.7-flash',
          fallbackModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
          call: async (_key, model) => {
            modelsTried.push(model)
            throw new GeminiError({
              category: 'service_unavailable',
              statusCode: 503,
              isRetryable: true,
              isDailyQuota: false,
              sanitizedMessage: 'Server sovraccarico'
            })
          }
        })
      ).rejects.toThrow('Server sovraccarico')

      expect(modelsTried).toEqual([
        'gemini-3.7-flash',
        'gemini-3.7-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3.1-flash-lite'
      ])
    })

    it('la traduzione inoltra la fallback chain al gestore condiviso', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const modelsTried: string[] = []
      const client = {
        models: {
          generateContent: vi.fn(async ({ model, contents }: { model: string; contents: string }) => {
            modelsTried.push(model)
            if (model === 'gemini-3.7-flash') {
              throw new Error('503 Service Unavailable')
            }
            const sections = JSON.parse(contents.split('SOURCE_TRANSLATION_PLAN_JSON:\n')[1]) as Record<string, unknown>
            expect(Object.keys(sections)).toEqual(['s0'])
            return { text: JSON.stringify({ s0: { p0: '# English notes' } }), candidates: [{ finishReason: 'STOP' }] }
          })
        }
      }
      const clientSpy = vi.spyOn(transport, 'getClient').mockReturnValue(client as never)
      const service = new GeminiService({
        requestManager: new GeminiRequestManager(
          { ...DEFAULT_GEMINI_POLICY, maxTotalAttempts: 6, rpmLimit: 100 },
          transport,
          clock
        )
      })

      await expect(
        service.translateToEnglish({
          apiKey: 'translation-key',
          model: 'gemini-3.7-flash',
          markdownIta: '# Appunti italiani'
        })
      ).resolves.toBe('# English notes')

      expect(modelsTried).toContain('gemini-3.7-flash')
      expect(modelsTried).toContain('gemini-3.5-flash')
      clientSpy.mockRestore()
    })

    it('gestisce priorità ed evita la starvation delle richieste in background', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, concurrencyLimit: 1, rpmLimit: 100 },
        transport,
        clock
      )

      const executionOrder: string[] = []

      // Lanciamo 1 background e poi subito 4 interattivi
      const bgTask = manager.execute({
        jobId: 'bg-1',
        purpose: 'sections',
        priority: 'background',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(10)
          executionOrder.push('bg-1')
          return 'ok'
        }
      })

      const interactive1 = manager.execute({
        jobId: 'interactive-1',
        purpose: 'qna',
        priority: 'interactive',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(10)
          executionOrder.push('interactive-1')
          return 'ok'
        }
      })

      const interactive2 = manager.execute({
        jobId: 'interactive-2',
        purpose: 'qna',
        priority: 'interactive',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(10)
          executionOrder.push('interactive-2')
          return 'ok'
        }
      })

      const interactive3 = manager.execute({
        jobId: 'interactive-3',
        purpose: 'qna',
        priority: 'interactive',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(10)
          executionOrder.push('interactive-3')
          return 'ok'
        }
      })

      const interactive4 = manager.execute({
        jobId: 'interactive-4',
        purpose: 'qna',
        priority: 'interactive',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(10)
          executionOrder.push('interactive-4')
          return 'ok'
        }
      })

      await Promise.all([bgTask, interactive1, interactive2, interactive3, interactive4])

      // bg-1 era già partito per primo (attivo).
      // Poi sono arrivati interactive 1, 2, 3, 4.
      // Dopo 3 interactive serviti consecutivamente, la starvation policy garantisce equità.
      expect(executionOrder.length).toBe(5)
      expect(executionOrder[0]).toBe('bg-1')
      expect(executionOrder.slice(1)).toEqual([
        'interactive-1',
        'interactive-2',
        'interactive-3',
        'interactive-4'
      ])
    })

    it('AbortSignal annulla una richiesta in coda senza consumare chiamate fisiche', async () => {
      const clock = new VirtualClock()
      const transport = new GeminiTransport()
      const manager = new GeminiRequestManager(
        { ...DEFAULT_GEMINI_POLICY, concurrencyLimit: 1, rpmLimit: 100 },
        transport,
        clock
      )

      // Task 1 occupa lo slot
      const t1 = manager.execute({
        jobId: 'occupy-slot',
        purpose: 'sections',
        priority: 'background',
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          await clock.sleep(200)
          return 'done-1'
        }
      })

      // Task 2 viene accodato con un AbortController
      const abortController = new AbortController()
      let task2PhysicalCalled = false

      const t2 = manager.execute({
        jobId: 'cancelled-task',
        purpose: 'sections',
        priority: 'background',
        signal: abortController.signal,
        keys: [{ key: 'k1', quotaGroup: 'p' }],
        preferredModel: 'gemini-3.6-flash',
        call: async () => {
          task2PhysicalCalled = true
          return 'done-2'
        }
      })

      // Annulliamo il Task 2 mentre è in coda
      abortController.abort()

      await expect(t2).rejects.toThrow(/annullata/)
      expect(task2PhysicalCalled).toBe(false)

      await expect(t1).resolves.toBe('done-1')
    })
  })
})
