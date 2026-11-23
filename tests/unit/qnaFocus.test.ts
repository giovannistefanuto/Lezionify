import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiRequestManager, type LogicalRequestOptions } from '../../electron/main/ai/geminiRequestManager'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import { GeminiError } from '../../electron/main/ai/geminiErrors'

afterEach(() => vi.useRealTimers())
const cancelled = () => new GeminiError({ category: 'cancelled', isRetryable: false, isDailyQuota: false, sanitizedMessage: 'Annullato.' })
function setup() {
  vi.useFakeTimers()
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 1000 })
  manager.enableQnaFocus()
  const options = (id: string, interactive = false): LogicalRequestOptions<string> => ({
    jobId: id, purpose: interactive ? 'qna' : 'sections', priority: interactive ? 'interactive' : 'background',
    keys: [{ key: 'synthetic', quotaGroup: id }], preferredModel: 'synthetic-model', call: async () => id
  })
  return { manager, options }
}

describe('priorità Q&A e attesa background', () => {
  it('interrompe la richiesta attiva, la rimette prima delle altre e rinnova i tre minuti', async () => {
    const { manager, options } = setup()
    const starts: string[] = []
    let attempt = 0
    const background = manager.execute({ ...options('first'), call: async (_key, _model, signal) => {
      starts.push('first')
      if (++attempt > 1) return 'saved'
      return new Promise<string>((_resolve, reject) => signal.addEventListener('abort', () => reject(cancelled()), { once: true }))
    } })
    await vi.advanceTimersByTimeAsync(0)
    const second = manager.execute({ ...options('second'), call: async () => { starts.push('second'); return 'second' } })
    await expect(manager.execute({ ...options('q1', true), call: async () => { starts.push('q1'); return 'answer' } })).resolves.toBe('answer')
    expect(starts).toEqual(['first', 'q1'])
    await vi.advanceTimersByTimeAsync(179_000)
    await manager.execute(options('q2', true))
    await vi.advanceTimersByTimeAsync(179_999)
    expect(starts).toEqual(['first', 'q1'])
    await vi.advanceTimersByTimeAsync(1)
    await expect(background).resolves.toBe('saved')
    await second
    expect(starts).toEqual(['first', 'q1', 'first', 'second'])
  })

  it('una risposta oltre tre minuti mantiene sospeso il background fino alla conclusione', async () => {
    const { manager, options } = setup()
    let finish!: (value: string) => void
    const question = manager.execute({ ...options('q', true), call: () => new Promise(resolve => { finish = resolve }) })
    const work = vi.fn(async () => 'background')
    const background = manager.execute({ ...options('bg'), call: work })
    await vi.advanceTimersByTimeAsync(180_001)
    expect(work).not.toHaveBeenCalled()
    finish('answer'); await question; await background
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('lo svuotamento durante la pausa impedisce la ripartenza al termine del timer', async () => {
    const { manager, options } = setup()
    await manager.execute(options('q', true))
    const controller = new AbortController()
    const work = vi.fn(async () => 'background')
    const background = manager.execute({ ...options('bg'), signal: controller.signal, call: work })
    const rejected = expect(background).rejects.toMatchObject({ category: 'cancelled' })
    controller.abort(); await rejected
    await vi.advanceTimersByTimeAsync(180_000)
    expect(work).not.toHaveBeenCalled()
  })

  it('aggiornare durante la preemption annulla il lavoro riaccodato senza ripartenze', async () => {
    const { manager, options } = setup()
    const work = vi.fn(async (_key: string, _model: string, signal: AbortSignal) => new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(cancelled()), { once: true })
    }))
    const background = manager.execute({ ...options('bg'), call: work })
    const cancelledBackground = expect(background).rejects.toMatchObject({ category: 'cancelled' })
    await vi.advanceTimersByTimeAsync(0)
    await manager.execute(options('q', true))
    manager.setSuspended(true)
    await cancelledBackground
    await expect(manager.execute(options('new'))).rejects.toMatchObject({ category: 'cancelled' })
    await vi.advanceTimersByTimeAsync(180_000)
    manager.setSuspended(false)
    expect(work).toHaveBeenCalledTimes(1)
  })
})
