import { describe, expect, it, vi } from 'vitest'
import { prepareTranslation } from '../../electron/main/ai/translationIntegrity'
import { partitionTranslationDocument, prepareTranslationDocument, readTranslationDocument, replayTranslationDocumentAttempt, restoreDocumentSection, translateDocument, translationDocumentSchema } from '../../electron/main/ai/translationDocument'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'

describe('Traduzione di sezioni intere con segnaposto verificati', () => {
  const envelope = prepareTranslation('# Titolo\n\nIl ritorno $G$ usa $n$ passi e $n$ pesi.\n\n```python\nprint(1)\n```\n\n## Fine\n\nConclusione.')
  const plan = prepareTranslationDocument(envelope)
  it('mantiene frasi intere e reinserisce formule ripetute e codice byte per byte', () => {
    expect(translationDocumentSchema(plan).properties.s0).toEqual({ type: 'string' })
    const translated = plan.s0.text.replace('Il ritorno', 'The return').replace('usa', 'uses').replace('passi e', 'steps and').replace('pesi', 'weights')
    expect(restoreDocumentSection(plan.s0, translated)).toContain('The return $G$ uses $n$ steps and $n$ weights.')
    expect(restoreDocumentSection(plan.s0, translated)).toContain('```python\nprint(1)\n```')
    expect(plan.s0.text).not.toContain('$G$')
    expect(plan.s0.text).not.toContain('print(1)')
  })
  it.each(['missing', 'duplicate', 'reordered', 'changed', 'other-section'])('rifiuta segnaposto %s', failure => {
    const first = plan.s0.prefix + '0@@', second = plan.s0.prefix + '1@@'
    let value = plan.s0.text
    if (failure === 'missing') value = value.replace(first, '')
    if (failure === 'duplicate') value += first
    if (failure === 'changed') value = value.replace(first, first.replace('_0@@', '_99@@'))
    if (failure === 'other-section') value = value.replace(first, plan.s1.prefix + '0@@')
    if (failure === 'reordered') value = value.replace(first, 'TEMP').replace(second, first).replace('TEMP', second)
    expect(() => restoreDocumentSection(plan.s0, value)).toThrow('segnaposto')
  })
  it.each(['duplicate', 'missing', 'extra', 'array', 'empty', 'number', 'json'])('rifiuta formato %s senza esporre contenuti', failure => {
    let response: unknown = { s0: plan.s0.text, s1: plan.s1.text }
    if (failure === 'missing') response = { s0: plan.s0.text }
    if (failure === 'extra') response = { ...response as object, PRIVATE: 'PRIVATE' }
    if (failure === 'array') response = { s0: ['PRIVATE'], s1: plan.s1.text }
    if (failure === 'empty') response = { s0: '', s1: plan.s1.text }
    if (failure === 'number') response = { s0: 42, s1: plan.s1.text }
    const raw = failure === 'json' ? 'PRIVATE' : failure === 'duplicate' ? JSON.stringify(response).replace('{', '{"s\\u0030":"PRIVATE",') : JSON.stringify(response)
    try { readTranslationDocument(plan, raw); expect.fail('Da rifiutare') }
    catch (e) { expect(e).toMatchObject({ category: 'invalid_output', isRetryable: false }); expect((e as Error).message).not.toContain('PRIVATE') }
  })

  it.each(['valid', 'invalid', 'incomplete', 'cancelled'])('riparazione singola con esito %s e validazione finale', async outcome => {
    const manager = new GeminiRequestManager(), controller = new AbortController()
    const attempts: boolean[] = []
    const rawAttempts: string[] = []
    const generateContent = vi.fn(async (params: any) => {
      const source = JSON.parse(params.contents.split('SOURCE_DOCUMENT_JSON:\n')[1]) as Record<string, string>
      if (generateContent.mock.calls.length === 1) source.s0 = source.s0.replace(/@@LZ_[^@]+@@/, '')
      else {
        expect(Object.keys(source)).toEqual(['s0'])
        if (outcome === 'cancelled') controller.abort()
        if (outcome === 'invalid') source.s0 = source.s0.replace('# Titolo', 'Title')
      }
      return { text: JSON.stringify(source), candidates: [{ finishReason: generateContent.mock.calls.length === 2 && outcome === 'incomplete' ? 'MAX_TOKENS' : 'STOP' }] }
    })
    vi.spyOn(manager.getTransport(), 'getClient').mockReturnValue({ models: { generateContent } } as never)
    vi.spyOn(manager, 'execute').mockImplementation(async options => options.call('synthetic', 'gemini-3.5-flash', controller.signal) as never)
    const task = translateDocument({ manager, envelope, keys: [{ key: 'synthetic', quotaGroup: 'test' }], preferred: 'gemini-3.5-flash', fallbacks: [], signal: controller.signal,
      onAttempt: async (raw, _preview, repair) => { attempts.push(Boolean(repair)); rawAttempts.push(raw) } })
    if (outcome === 'valid') {
      const expected = envelope.sections.map(s => s.trim()).join('\n\n')
      expect(await task).toBe(expected)
      expect(replayTranslationDocumentAttempt(envelope, rawAttempts[0], rawAttempts[1])).toBe(expected)
      expect(() => replayTranslationDocumentAttempt(prepareTranslation('# Fonte diversa'), rawAttempts[0])).toThrow('revisione')
    }
    else await expect(task).rejects.toMatchObject({ category: outcome === 'cancelled' ? 'cancelled' : 'invalid_output' })
    expect(generateContent).toHaveBeenCalledTimes(2)
    expect(attempts).toEqual(outcome === 'cancelled' ? [false] : [false, true])
  })

  it('limita le risposte senza tagliare sezioni o perdere ordine e conserva tutte le risposte grezze', async () => {
    const source = Array.from({ length: 20 }, (_, i) => `## ${i + 1}. Titolo\n\n${'Testo naturale con $x$. '.repeat(100)}`).join('\n\n')
    const envelope = prepareTranslation(source), plan = prepareTranslationDocument(envelope)
    const batches = partitionTranslationDocument(plan)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches.flatMap(batch => Object.keys(batch))).toEqual(Object.keys(plan))
    expect(batches.every(batch => Object.values(batch).reduce((n, s) => n + s.text.length, 0) <= 6000 || Object.keys(batch).length === 1)).toBe(true)
    const manager = new GeminiRequestManager()
    const wires: string[] = [], saved: { responses: string[] }[] = []
    let active = 0
    const generateContent = vi.fn(async (params: any) => {
      expect(++active).toBe(1)
      const raw = params.contents.split('SOURCE_DOCUMENT_JSON:\n')[1]
      wires.push(raw); active--
      return { text: raw, candidates: [{ finishReason: 'STOP' }] }
    })
    vi.spyOn(manager.getTransport(), 'getClient').mockReturnValue({ models: { generateContent } } as never)
    vi.spyOn(manager, 'execute').mockImplementation(async options => options.call('synthetic', 'gemini-3.5-flash', new AbortController().signal) as never)
    const result = await translateDocument({ manager, envelope, keys: [{ key: 'synthetic', quotaGroup: 'test' }], preferred: 'gemini-3.5-flash', fallbacks: [], onAttempt: async raw => { saved.push(JSON.parse(raw)) } })
    expect(result).toBe(envelope.sections.map(s => s.trim()).join('\n\n'))
    expect(saved.at(-1)?.responses).toEqual(wires)
    expect(generateContent).toHaveBeenCalledTimes(batches.length)
  })
})
