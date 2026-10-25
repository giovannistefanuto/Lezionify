import { expect, it, vi } from 'vitest'
import { completeCourseResponse, createCourseCompletionContext } from '../../electron/main/ai/courseRagCompletion'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiError } from '../../electron/main/ai/geminiErrors'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'

it('recupera un JSON RAG incompleto con il fallback invece di fermarsi come errore sconosciuto', async () => {
  const transport = new GeminiTransport()
  let calls = 0
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    const text = ++calls === 1 ? '{"action":"answer","text":"incompleta' : '{"action":"answer","text":"Risposta valida","passageIds":[]}'
    params.onChunk(text)
    return { data: text }
  })
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 1000, backoffBaseMs: 0 }, transport)
  const response = await completeCourseResponse({ requestManager: manager, getSettings: async () => ({ model: 'gemini-3.6-flash', autoRotateOnQuota: false }), getManagedKeys: async () => [{ key: 'synthetic' }] }, 'Dati sintetici', new AbortController().signal)
  expect(JSON.parse(response).text).toBe('Risposta valida')
  expect(calls).toBe(2)
})

it('riprova una risposta con citazioni inventate prima di accettarla dal gestore', async () => {
  const transport = new GeminiTransport()
  let calls = 0
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    const text = JSON.stringify({ action: 'answer', text: 'Risposta sintetica', passageIds: [++calls === 1 ? 'invented' : 'provided'] })
    params.onChunk(text)
    return { data: text }
  })
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 1000, backoffBaseMs: 0 }, transport)
  const prompt = JSON.stringify({ passages: [{ passage: { id: 'provided' } }] })
  const response = await completeCourseResponse({ requestManager: manager, getSettings: async () => ({ model: 'gemini-3.6-flash', autoRotateOnQuota: false }), getManagedKeys: async () => [{ key: 'synthetic' }] }, prompt, new AbortController().signal)
  expect(JSON.parse(response).passageIds).toEqual(['provided'])
  expect(calls).toBe(2)
})


it('mantiene la domanda attiva dopo un primo giro di timeout e 503 e recupera al giro successivo', async () => {
  let now = Date.now()
  const waits: number[] = []
  const transport = new GeminiTransport()
  let calls = 0
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    calls++
    if (calls <= 6) throw new GeminiError({ category: calls === 1 ? 'timeout' : 'service_unavailable', statusCode: calls === 1 ? undefined : 503, isRetryable: true, isDailyQuota: false, sanitizedMessage: calls === 1 ? 'Timeout streaming: nessun contenuto ricevuto entro 20s.' : 'Server Google temporaneamente sovraccarico o non disponibile. Riprova tra poco.' })
    const text = JSON.stringify({ action: 'answer', text: 'Risposta recuperata', passageIds: [] })
    params.onChunk(text)
    return { data: text }
  })
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 1000, backoffBaseMs: 0 }, transport, { now: () => now, sleep: async ms => { waits.push(ms); now += ms } })
  const response = await completeCourseResponse({ requestManager: manager, getSettings: async () => ({ model: 'gemini-3.6-flash', autoRotateOnQuota: false }), getManagedKeys: async () => [{ key: 'synthetic' }] }, 'Dati sintetici', new AbortController().signal)
  expect(JSON.parse(response).text).toBe('Risposta recuperata')
  expect(calls).toBe(7)
  expect(waits.some(ms => ms >= 15000)).toBe(true)
})


function recoveryFixture(call: (attempt: number, params: Parameters<GeminiTransport['generateContentStream']>[0]) => Promise<string>, sleep?: (ms: number) => void) {
  let now = Date.now()
  const transport = new GeminiTransport()
  let calls = 0
  vi.spyOn(transport, 'generateContentStream').mockImplementation(async params => {
    const text = await call(++calls, params)
    params.onChunk(text)
    return { data: text }
  })
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 1000, backoffBaseMs: 0 }, transport, { now: () => now, sleep: async ms => { now += ms; sleep?.(ms) } })
  return { deps: { requestManager: manager, getSettings: async () => ({ model: 'gemini-3.6-flash' as const, autoRotateOnQuota: false }), getManagedKeys: async () => [{ key: 'synthetic' }] }, calls: () => calls }
}
const validAnswer = JSON.stringify({ action: 'answer', text: 'Risposta', passageIds: [] })
const unavailable = () => new GeminiError({ category: 'service_unavailable', statusCode: 503, isRetryable: true, isDailyQuota: false, sanitizedMessage: 'Server non disponibile' })

it('ferma il recupero a 12 invii assoluti anche con tutti i modelli indisponibili', async () => {
  const f = recoveryFixture(async () => { throw unavailable() })
  const context = createCourseCompletionContext()
  await expect(completeCourseResponse(f.deps, '{}', new AbortController().signal, undefined, context)).rejects.toThrow('La domanda è conservata')
  expect(f.calls()).toBe(12)
  expect(context.remainingAttempts).toBe(0)
})

it('condivide il budget fra gli approfondimenti e non invia altre richieste una volta esaurito', async () => {
  const f = recoveryFixture(async () => validAnswer)
  const context = createCourseCompletionContext()
  context.remainingAttempts = 1
  const signal = new AbortController().signal
  await completeCourseResponse(f.deps, '{}', signal, undefined, context)
  await expect(completeCourseResponse(f.deps, '{}', signal, undefined, context)).rejects.toThrow('12 invii o 10 minuti')
  expect(f.calls()).toBe(1)
})

it('interrompe i giri successivi quando si annulla durante l attesa di recupero', async () => {
  const controller = new AbortController()
  let callsAtAbort = 0
  const f = recoveryFixture(async () => { throw unavailable() }, ms => { if (ms >= 15000) { callsAtAbort = f.calls(); controller.abort() } })
  await expect(completeCourseResponse(f.deps, '{}', controller.signal)).rejects.toThrow()
  expect(callsAtAbort).toBeGreaterThan(0)
  expect(f.calls()).toBe(callsAtAbort)
})

it('non ritenta errori terminali di permesso', async () => {
  const f = recoveryFixture(async () => { throw new GeminiError({ category: 'permission_denied', isRetryable: false, isDailyQuota: false, recoveryDisposition: 'terminal', sanitizedMessage: 'Accesso negato' }) })
  await expect(completeCourseResponse(f.deps, '{}', new AbortController().signal)).rejects.toThrow('Accesso negato')
  expect(f.calls()).toBe(1)
})

it('non avvia invii dopo la scadenza della domanda', async () => {
  const f = recoveryFixture(async () => validAnswer)
  const context = createCourseCompletionContext()
  context.deadline = Date.now() - 1
  await expect(completeCourseResponse(f.deps, '{}', new AbortController().signal, undefined, context)).rejects.toThrow('10 minuti')
  expect(f.calls()).toBe(0)
})

it('concede 60 secondi per il primo contenuto e 90 nel recupero, annunciando gli stati', async () => {
  const progress: string[] = []
  const f = recoveryFixture(async (attempt, params) => {
    expect(params.firstChunkTimeoutMs).toBe(attempt === 1 ? 60000 : 90000)
    expect(params.chunkInactivityTimeoutMs).toBe(90000)
    if (attempt <= 6) throw unavailable()
    return validAnswer
  })
  await completeCourseResponse(f.deps, '{}', new AbortController().signal, undefined, createCourseCompletionContext(message => progress.push(message)))
  expect(progress.some(message => message.includes('Riprovo automaticamente'))).toBe(true)
  expect(progress.some(message => message.includes('Tentativo 7/12'))).toBe(true)
})


it('rispetta la deadline anche durante il backoff prima del modello successivo', async () => {
  const f = recoveryFixture(async () => { throw unavailable() })
  const context = createCourseCompletionContext()
  context.deadline = Date.now() + 5000
  await expect(completeCourseResponse(f.deps, '{}', new AbortController().signal, undefined, context)).rejects.toThrow('La domanda è conservata')
  expect(f.calls()).toBe(2)
})

it('non riapre giri di recupero quando la quota giornaliera è esaurita', async () => {
  const f = recoveryFixture(async () => { throw new GeminiError({ category: 'quota_exhausted', statusCode: 429, isRetryable: false, isDailyQuota: true, sanitizedMessage: 'Quota giornaliera esaurita' }) })
  await expect(completeCourseResponse(f.deps, '{}', new AbortController().signal)).rejects.toThrow('Quota giornaliera esaurita')
  expect(f.calls()).toBe(6)
})


it('rifiuta un confronto che non cita tutte le lezioni richieste disponibili nel contesto', async () => {
  const f = recoveryFixture(async attempt => JSON.stringify({ action: 'answer', text: 'Confronto', passageIds: attempt === 1 ? ['p6', 'p7'] : ['p5', 'p6', 'p7'] }))
  const prompt = JSON.stringify({ question: 'Nella lezione 7 non avevamo già visto Q_pi nelle lezioni 5 e 6?', passages: [5, 6, 7].map(n => ({ source: { lectureOrdinal: n }, passage: { id: `p${n}` } })) })
  const response = await completeCourseResponse(f.deps, prompt, new AbortController().signal)
  expect(JSON.parse(response).passageIds).toEqual(['p5', 'p6', 'p7'])
  expect(f.calls()).toBe(2)
})
