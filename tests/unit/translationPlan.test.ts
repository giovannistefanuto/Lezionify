import { describe, expect, it, vi } from 'vitest'
import { prepareTranslation } from '../../electron/main/ai/translationIntegrity'
import { prepareTranslationPlan, validateTranslationPlan, type TranslationPlan } from '../../electron/main/ai/translationPlan'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'

function translate(plan: TranslationPlan, change: (value: string) => string = value => value) {
  return Object.fromEntries(Object.entries(plan).flatMap(([section, parts]) => {
    const fields = Object.fromEntries(parts.flatMap(part => 'key' in part ? [[part.key, change(part.translate)]] : []))
    return Object.keys(fields).length ? [[section, fields]] : []
  }))
}

describe('Traduzione con formule e codice conservati localmente', () => {
  it('conserva ogni occorrenza matematica, parole LaTeX, codice e spazi anche se il modello restituisce solo prosa', () => {
    const source = '# Titolo\n\nLa variabile $q$ misura $q$.\n\n$$E=\\text{energia totale}$$\n\n`state` indica stato.\n\n```python\nprint("ciao")\n```\n\nFine.'
    const envelope = prepareTranslation(source)
    const plan = prepareTranslationPlan(envelope)
    const result = translate(plan, text => text.replace('Titolo', 'Title').replace('La variabile', 'The variable').replace('misura', 'measures').replace('indica stato', 'indicates state').replace('Fine.', 'End.'))
    const wire = JSON.stringify(result)
    expect(wire).not.toContain('energia totale')
    expect(wire).not.toContain('$q$')
    expect(wire).not.toContain('print(')
    const restored = validateTranslationPlan(envelope, plan, wire, 'STOP')
    expect(restored).toContain('The variable $q$ measures $q$.')
    expect(restored).toContain('$$E=\\text{energia totale}$$')
    expect(restored).toContain('```python\nprint("ciao")\n```')
    expect(restored).toContain('`state` indicates state.')
  })

  it.each(['$x$ e $x$', '$$\\frac{a}{b}$$', '\\(x\\) e \\[y\\]', '~~~text\n## Falso\n$x$\n~~~', 'Costo \\$5 e $x$.'])('mantiene intatta la sintassi protetta: %s', body => {
    const source = '# Titolo\n\n' + body
    const envelope = prepareTranslation(source)
    const plan = prepareTranslationPlan(envelope)
    expect(validateTranslationPlan(envelope, plan, JSON.stringify(translate(plan)), 'STOP')).toBe(source)
  })

  it('traduce le etichette Mermaid e conserva il diagramma originale se il modello altera le frecce', () => {
    const envelope = prepareTranslation('# Schema\n\n```mermaid\nflowchart LR\nA["Ingresso"] --> B["Uscita"]\n```')
    const plan = prepareTranslationPlan(envelope)
    const good = translate(plan, text => text.replace('Ingresso', 'Input').replace('Uscita', 'Output'))
    expect(validateTranslationPlan(envelope, plan, JSON.stringify(good), 'STOP')).toContain('A["Input"] --> B["Output"]')
    const bad = translate(plan, text => text.replace(' --> ', ' --- '))
    expect(validateTranslationPlan(envelope, plan, JSON.stringify(bad), 'STOP')).toContain('A["Ingresso"] --> B["Uscita"]')
  })

  it.each(['changed', 'missing', 'extra'])('recupera Mermaid %s conservando la prosa inglese e il codice originale', failure => {
    const diagram = '```mermaid\nflowchart LR\nA["Ingresso"] --> B["Uscita"]\n```'
    const envelope = prepareTranslation('# Schema\n\nPrima.\n\n' + diagram + '\n\nDopo.\n\n```python\nprint(1)\n```')
    const plan = prepareTranslationPlan(envelope)
    const response = translate(plan, text => {
      const english = text.replace('Prima.', 'Before.').replace('Dopo.', 'After.')
      return failure === 'changed' ? english.replace(' --> ', ' --- ')
        : failure === 'missing' ? english.replace(diagram, '') : english.replace(diagram, diagram + '\n\n' + diagram)
    })
    const restored = validateTranslationPlan(envelope, plan, JSON.stringify(response), 'STOP')
    expect(restored).toContain('Before.')
    expect(restored).toContain('After.')
    expect(restored).toContain('```python\nprint(1)\n```')
    expect(restored.split(diagram)).toHaveLength(2)
  })

  it('il recupero Mermaid non nasconde altri errori di integrità', () => {
    const envelope = prepareTranslation('# Schema\n\n```mermaid\nflowchart LR\nA --> B\n```\n\n## Fine\n\nTesto.')
    const plan = prepareTranslationPlan(envelope)
    const response = translate(plan, text => text.replace(' --> ', ' --- ').replace('## Fine', '### End'))
    expect(() => validateTranslationPlan(envelope, plan, JSON.stringify(response), 'STOP')).toThrow('titoli')
  })

  it.each(['missing', 'missing-section', 'extra', 'extra-section', 'duplicate', 'duplicate-section', 'section-array', 'empty', 'wrong-type', 'injected-math', 'incomplete'])(
    'rifiuta %s senza esporre frammenti', failure => {
      const envelope = prepareTranslation('# Titolo\n\nTesto $x$ e testo $x$.')
      const plan = prepareTranslationPlan(envelope)
      const result: Record<string, Record<string, unknown>> = translate(plan)
      let raw: string | undefined
      if (failure === 'missing') delete result.s0.p1
      if (failure === 'missing-section') delete result.s0
      if (failure === 'extra') result.s0.extra = 'PRIVATE FRAGMENT'
      if (failure === 'extra-section') result.extra = { p0: 'PRIVATE FRAGMENT' }
      if (failure === 'duplicate') raw = JSON.stringify(result).replace('"s0":{', '"s0":{"p0":"PRIVATE FRAGMENT",')
      if (failure === 'duplicate-section') raw = JSON.stringify(result).replace('{', '{"s0":{"p0":"PRIVATE FRAGMENT"},')
      if (failure === 'section-array') raw = '{"s0":[]}'
      if (failure === 'empty') result.s0.p1 = ' '
      if (failure === 'wrong-type') result.s0.p1 = 3
      if (failure === 'injected-math') result.s0.p1 = '$changed$ PRIVATE FRAGMENT'
      try { validateTranslationPlan(envelope, plan, raw ?? JSON.stringify(result), failure === 'incomplete' ? 'MAX_TOKENS' : 'STOP'); expect.fail('Risposta da rifiutare') }
      catch (error) { expect(error).toMatchObject({ category: 'invalid_output', isRetryable: false }); expect((error as Error).message).not.toContain('PRIVATE FRAGMENT') }
    }
  )

  it('non invia richieste AI quando la fonte contiene soltanto codice e formule', async () => {
    const manager = new GeminiRequestManager()
    const execute = vi.spyOn(manager, 'execute').mockRejectedValue(new Error('Unexpected AI call'))
    const service = new GeminiService({ requestManager: manager })
    const source = '```python\nprint(1)\n```\n\n$x$'
    await expect(service.translateToEnglish({ apiKey: 'synthetic', model: 'gemini-3.7-flash', markdownIta: source })).resolves.toBe(source)
    expect(execute).not.toHaveBeenCalled()
  })

  it.each(['$$x=1$$', '\\[x=1\\]'])('rimuove solo copie display identiche aggiunte dal modello, conservando tutte le occorrenze originali (%s)', formula => {
    const source = `# Formula\n\nPrimo passaggio.\n\n${formula}\n\nSecondo passaggio.\n\n${formula}\n\nConclusione.`
    const envelope = prepareTranslation(source)
    const plan = prepareTranslationPlan(envelope)
    const result = translate(plan)
    result.s0.p1 = `Second step.\n\n${formula}\n\nMore detail.`
    result.s0.p2 = `Conclusion.\n\n${formula}`
    const restored = validateTranslationPlan(envelope, plan, JSON.stringify(result), 'STOP')
    expect(restored.split(formula)).toHaveLength(3)
    expect(restored).toContain('Second step.')
    expect(restored).toContain('More detail.')
    expect(restored).toContain('Conclusion.')
  })

  it.each(['changed', 'new', 'inline-prose', 'inside-code', 'other-section', 'empty-after-cleanup'])(
    'non elimina formule %s nel tentativo di aggirare la validazione', failure => {
      const envelope = prepareTranslation('# Prima\n\nTesto.\n\n$$x=1$$\n\nConclusione.\n\n## Seconda\n\nTesto.\n\n$$y=2$$')
      const plan = prepareTranslationPlan(envelope)
      const result = translate(plan)
      result.s0.p1 = failure === 'changed' ? 'Conclusion.\n\n$$x=2$$'
        : failure === 'new' ? 'Conclusion.\n\n$$z=3$$'
          : failure === 'inline-prose' ? 'Conclusion $$x=1$$ follows.'
            : failure === 'inside-code' ? 'Conclusion.\n\n```text\n$$x=1$$\n```'
              : failure === 'empty-after-cleanup' ? '$$x=1$$' : 'Conclusion.\n\n$$y=2$$'
      expect(() => validateTranslationPlan(envelope, plan, JSON.stringify(result), 'STOP')).toThrow('Traduzione non salvata')
    }
  )

  it('traccia soltanto conteggi e sezioni dopo una validazione riuscita', () => {
    const envelope = prepareTranslation('# Formula\n\nTesto.\n\n$$x=1$$\n\nConclusione.')
    const plan = prepareTranslationPlan(envelope)
    const result = translate(plan)
    result.s0.p1 = 'Conclusion.\n\n$$x=1$$'
    const normalized = vi.fn()
    expect(validateTranslationPlan(envelope, plan, JSON.stringify(result), 'STOP', normalized)).toContain('Conclusion.')
    expect(normalized).toHaveBeenCalledExactlyOnceWith([{ section: 1, copies: 1 }])
    normalized.mockClear()
    result.s0.p1 += '\n\n$$x=2$$'
    expect(() => validateTranslationPlan(envelope, plan, JSON.stringify(result), 'STOP', normalized)).toThrow()
    expect(normalized).not.toHaveBeenCalled()
  })
})


describe('Diagnostica sanitizzata del piano ENG', () => {
  it.each([
    ['json', 'JSON non valido'],
    ['root', 'oggetto sezioni non valido'],
    ['sections', 'sezioni mancanti o inattese'],
    ['section-type', 'sezione 1; oggetto frammenti non valido'],
    ['fields', 'sezione 1; frammenti mancanti o inattesi'],
    ['type', 'sezione 1; frammento 2; tipo non valido'],
    ['empty', 'sezione 1; frammento 2; testo vuoto'],
    ['copied-only', 'sezione 1; frammento 2; testo vuoto dopo rimozione copie'],
    ['duplicate', 'chiavi JSON duplicate'],
  ])('distingue %s senza esporre testo o chiavi del modello', (failure, detail) => {
    const envelope = prepareTranslation('# Titolo\n\nPrima.\n\n$$x=1$$\n\nDopo.')
    const plan = prepareTranslationPlan(envelope)
    const response: Record<string, Record<string, unknown>> = translate(plan)
    let raw: string | undefined
    if (failure === 'json') raw = 'PRIVATE FRAGMENT'
    if (failure === 'root') raw = '[]'
    if (failure === 'sections') response['PRIVATE FRAGMENT'] = {}
    if (failure === 'section-type') raw = '{"s0":[]}'
    if (failure === 'fields') response.s0['PRIVATE FRAGMENT'] = 'secret'
    if (failure === 'type') response.s0.p1 = 42
    if (failure === 'empty') response.s0.p1 = ' '
    if (failure === 'copied-only') response.s0.p1 = '$$x=1$$'
    if (failure === 'duplicate') raw = JSON.stringify(response).replace('"s0":{', '"s0":{"p0":"PRIVATE FRAGMENT",')
    try {
      validateTranslationPlan(envelope, plan, raw ?? JSON.stringify(response), 'STOP')
      expect.fail('Risposta da rifiutare')
    } catch (error) {
      expect((error as Error).message).toContain('Dettaglio: ' + detail + '.')
      expect((error as Error).message).not.toContain('PRIVATE FRAGMENT')
      expect(error).toMatchObject({ category: 'invalid_output', isRetryable: false })
    }
  })
})
