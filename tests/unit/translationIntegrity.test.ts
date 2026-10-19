import { describe, expect, it, vi } from 'vitest'
import { prepareTranslation, validateTranslation, validateTranslationResponse, translationSourceSections, translationResponseSchema } from '../../electron/main/ai/translationIntegrity'
import { GeminiService } from '../../electron/main/gemini'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { GeminiTransport } from '../../electron/main/ai/geminiTransport'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'
import type { TranslationPlan } from '../../electron/main/ai/translationPlan'

const source = '# 1. Introduzione\n\nUn automa con $x^2$ e `state`.\n\n## 1.1 Formula\n\n$$\n\\frac{a}{b}\n$$\n\n> [!KEY CONCEPT]\n> Concetto importante.\n\n```python\n# Titolo di esempio\nprint("ciao")\n```\n\n## 1.2 Schema\n\n```mermaid\nflowchart LR\nA["Ingresso"] --> B["Uscita"]\naccTitle: Schema\n```\n\nUltimo paragrafo.'
const english = (text: string) => text.replace('Introduzione', 'Introduction').replace('Un automa con', 'An automaton with').replace('Formula', 'Formula').replace('Concetto importante.', 'Important concept.').replace('Schema', 'Diagram').replace('Ingresso', 'Input').replace('Uscita', 'Output').replace('Ultimo paragrafo.', 'Last paragraph.')

describe('Traduzione intera con confini verificati', () => {
  it('conserva ordine, livelli, formule, codice, riquadri e struttura Mermaid eliminando soltanto i marcatori', () => {
    const envelope = prepareTranslation(source)
    expect(envelope.sections).toHaveLength(3)
    expect(validateTranslation(envelope, english(envelope.markdown), 'STOP')).toBe(english(source))
    expect(envelope.sections.join('')).toBe(source)
  })

  it('gestisce preambolo, assenza di titoli, CRLF e wrapper Markdown', () => {
    for (const text of ['Preambolo.\r\n\r\n# Titolo\r\n\r\nTesto.', 'Solo testo.', '```python\nprint(1)\n```']) {
      const envelope = prepareTranslation(text)
      expect(validateTranslation(envelope, `\`\`\`markdown\n${envelope.markdown}\n\`\`\``, 'STOP')).toBe(text.replace(/\r\n/g, '\n'))
    }
  })

  it('ignora titoli fittizi in fence tilde, inline code e formule multilinea', () => {
    const envelope = prepareTranslation('# Titolo\n\n~~~text\n## Falso\n~~~\n\n$$\n## Falso\n$$\n\n`## Falso`\n\n## Vero\nTesto.')
    expect(envelope.sections).toHaveLength(2)
    expect(validateTranslation(envelope, envelope.markdown, 'STOP')).toContain('## Vero')
  })

  it('traduce etichette su frecce Mermaid con trattini o pipe mantenendo la verifica della struttura', () => {
    const sourceWithEdges = '# Schema\n\n```mermaid\nflowchart TD\nA["Inizio"] --> B["Scelta"]\nB -- No --> A\nB -- Sì --> C["Fine"]\nC -->|Dato| D["Output"]\n```'
    const envelope = prepareTranslation(sourceWithEdges)
    const [m0, m1] = envelope.markers
    const translated = '# Diagram\n\n```mermaid\nflowchart TD\nA["Start"] --> B["Choice"]\nB -- No --> A\nB -- Yes --> C["End"]\nC -->|Data| D["Output"]\n```'
    expect(validateTranslation(envelope, `${m0}\n${translated}\n${m1}`, 'STOP')).toContain('B -- Yes --> C["End"]')
    const badArrow = translated.replace('B -- No --> A', 'B --- A')
    expect(() => validateTranslation(envelope, `${m0}\n${badArrow}\n${m1}`, 'STOP')).toThrow('diagrammi Mermaid')
  })

  it.each(['MAX_TOKENS', 'SAFETY', 'RECITATION', undefined])('rifiuta risposta non completa (%s) anche se contiene tutti i marcatori', reason => {
    const envelope = prepareTranslation(source)
    expect(() => validateTranslation(envelope, envelope.markdown, reason)).toThrow('risposta completa')
  })

  it.each(['missing', 'duplicate', 'reordered', 'end', 'empty', 'heading', 'numbering', 'formula', 'code', 'mermaid', 'alert', 'preamble', 'trailing'])(
    'rifiuta %s senza esporre testo privato nell’errore', failure => {
      const envelope = prepareTranslation(source)
      let output = english(envelope.markdown)
      const [first, second, third, end] = envelope.markers
      switch (failure) {
        case 'missing': output = output.replace(second, ''); break
        case 'duplicate': output = output.replace(second, second + second); break
        case 'reordered': output = output.replace(first, 'SWAP').replace(second, first).replace('SWAP', second); break
        case 'end': output = output.slice(0, output.indexOf(end)); break
        case 'empty': output = output.slice(0, output.indexOf(third) + third.length) + '\n' + end; break
        case 'heading': output = output.replace('## 1.1', '### 1.1'); break
        case 'numbering': output = output.replace('## 1.1', '## 1.3'); break
        case 'formula': output = output.replace('$x^2$', '$x^3$'); break
        case 'code': output = output.replace('print("ciao")', 'print("hello")'); break
        case 'mermaid': output = output.replace(' --> ', ' --- '); break
        case 'alert': output = output.replace('[!KEY CONCEPT]', '[!NOTE]'); break
        case 'preamble': output = 'Private explanatory text\n' + output; break
        case 'trailing': output += '\nPrivate explanatory text'; break
      }
      try { validateTranslation(envelope, output, 'STOP'); expect.fail('Doveva rifiutare la risposta') }
      catch (error) {
        expect(error).toMatchObject({ category: 'invalid_output', isRetryable: false })
        expect((error as Error).message).not.toContain('Private explanatory text')
        expect((error as Error).message).not.toContain('print(')
      }
    }
  )

  it('verifica 12 sezioni lunghe in una sola richiesta senza duplicarle o ometterle', () => {
    const document = '# Corso\n\n' + Array.from({ length: 12 }, (_, i) => `## ${i + 1}. Argomento\n\n${'Paragrafo tecnico.\n\n'.repeat(500)}\n`).join('\n')
    const envelope = prepareTranslation(document)
    expect(envelope.sections).toHaveLength(13)
    const translated = validateTranslation(envelope, envelope.markdown.replaceAll('Argomento', 'Topic').replaceAll('Paragrafo tecnico.', 'Technical paragraph.'), 'STOP')
    expect(translated.match(/^## /gm)).toHaveLength(12)
    expect(translated.match(/Technical paragraph\./g)).toHaveLength(6000)
    expect(translated).not.toContain('LEZIONIFY-')
  })

  it.each([
    ['formula', '$x^2$', '$x^3$', 'formule', 1],
    ['inline code', '`state`', '`changed`', 'codice inline', 1],
    ['heading', '## 1.1', '### 1.1', 'titoli', 2],
    ['alert', '[!KEY CONCEPT]', '[!NOTE]', 'riquadri', 2],
    ['code block', 'print("ciao")', 'print("hello")', 'blocchi di codice', 2],
    ['Mermaid', ' --> ', ' --- ', 'diagrammi Mermaid', 3]
  ] as const)('identifica %s e sezione senza includere contenuti nella diagnosi', (_name, before, after, component, section) => {
    const envelope = prepareTranslation(source)
    const output = english(envelope.markdown).replace(before, after)
    let message = ''
    try { validateTranslation(envelope, output, 'STOP') } catch (error) { message = (error as Error).message }
    expect(message).toContain(`Dettaglio: sezione ${section}; ${component}.`)
    for (const secret of [before, after, ...envelope.markers, 'Introduzione', 'Important concept.']) {
      expect(message).not.toContain(secret)
    }
  })

  it('distingue una sezione vuota e mantiene la verifica dell’ordine tra formule e codice inline', () => {
    const envelope = prepareTranslation('# Titolo\n\n$x$ e `code`')
    const reordered = envelope.markdown.replace('$x$ e `code`', '`code` and $x$')
    expect(() => validateTranslation(envelope, reordered, 'STOP')).toThrow('ordine di formule e codice inline')
    const empty = envelope.markers[0] + '\n' + envelope.markers[1]
    expect(() => validateTranslation(envelope, empty, 'STOP')).toThrow('Dettaglio: sezione 1; sezione vuota.')
  })

  it('rifiuta parole tradotte dentro LaTeX anche quando la matematica circostante è identica', () => {
    const text = '# Formula\n\n$$\nE = \\text{energia totale}\n$$'
    const envelope = prepareTranslation(text)
    expect(() => validateTranslation(envelope, envelope.markdown.replace('energia totale', 'total energy'), 'STOP'))
      .toThrow('Dettaglio: sezione 1; formule.')
    expect(validateTranslation(envelope, envelope.markdown.replace('# Formula', '# Equation'), 'STOP'))
      .toBe(text.replace('# Formula', '# Equation'))
  })

  it('rifiuta una ripetizione matematica omessa anche se ogni formula distinta è presente', () => {
    const text = '# Variabile\n\n$q$ è positivo; $q$ rappresenta una quantità.\n\n$$q > 0$$'
    const envelope = prepareTranslation(text)
    const output = envelope.markdown.replace('$q$ è positivo; $q$ rappresenta una quantità.', '$q$ is positive; it represents a quantity.')
    expect(() => validateTranslation(envelope, output, 'STOP')).toThrow('Dettaglio: sezione 1; formule.')
    const preserved = envelope.markdown.replace('$q$ è positivo; $q$ rappresenta una quantità.', '$q$ is positive; $q$ represents a quantity.')
    expect(validateTranslation(envelope, preserved, 'STOP')).toContain('$q$ is positive; $q$ represents')
  })

  it('documenta il limite: non riconosce l’omissione di prosa con struttura invariata', () => {
    const envelope = prepareTranslation('# Titolo\n\nPrima frase. Seconda frase.')
    expect(validateTranslation(envelope, envelope.markdown.replace('Seconda frase.', ''), 'STOP')).toBe('# Titolo\n\nPrima frase.')
  })

  it.each([true, false])('usa una sola richiesta logica e nessun retry di output invalido (valid=%s)', async valid => {
    const transport = new GeminiTransport()
    const generateContent = vi.fn(async ({ contents }: { contents: string }) => {
      const plan = JSON.parse(contents.split('SOURCE_TRANSLATION_PLAN_JSON:\n')[1]) as TranslationPlan
      const sections = Object.fromEntries(Object.entries(plan).flatMap(([key, parts]) => {
        const values = Object.fromEntries(parts.flatMap(part => 'key' in part ? [[part.key, english(part.translate)]] : []))
        return Object.keys(values).length ? [[key, values]] : []
      }))
      return { text: JSON.stringify(sections), candidates: [{ finishReason: valid ? 'STOP' : 'MAX_TOKENS' }] }
    })
    vi.spyOn(transport, 'getClient').mockReturnValue({ models: { generateContent } } as never)
    const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 100 }, transport)
    const execute = vi.spyOn(manager, 'execute')
    const service = new GeminiService({ requestManager: manager })
    const result = service.translateToEnglish({ apiKey: 'synthetic-key', model: 'gemini-3.7-flash', markdownIta: source })
    if (valid) await expect(result).resolves.toBe(english(source))
    else await expect(result).rejects.toMatchObject({ category: 'invalid_output', isRetryable: false })
    expect(execute).toHaveBeenCalledOnce()
    expect(generateContent).toHaveBeenCalledOnce()
    expect(generateContent.mock.calls[0][0]).toMatchObject({ config: { abortSignal: expect.any(AbortSignal), responseMimeType: 'application/json', responseJsonSchema: { required: ['s0', 's1', 's2'], additionalProperties: false } } })
  })
})

describe('Trasporto JSON delle sezioni ENG', () => {
  it('richiede ogni sezione e ricompone in ordine locale senza chiedere commenti al modello', () => {
    const envelope = prepareTranslation(source)
    const sections = translationSourceSections(envelope)
    expect(translationResponseSchema(envelope)).toEqual({ type: 'object', properties: { s0: { type: 'string' }, s1: { type: 'string' }, s2: { type: 'string' } }, required: ['s0', 's1', 's2'], additionalProperties: false })
    const result = Object.fromEntries(Object.entries(sections).reverse().map(([key, text]) => [key, english(text)]))
    expect(validateTranslationResponse(envelope, JSON.stringify(result), 'STOP')).toBe(english(source))
  })

  it.each(['missing', 'duplicate', 'extra', 'number', 'array', 'null', 'invalid-json', 'formula', 'empty', 'incomplete'])(
    'rifiuta %s anche con risposta JSON e conserva gli errori senza contenuti', failure => {
      const envelope = prepareTranslation(source)
      const result: Record<string, unknown> = { ...translationSourceSections(envelope) }
      let raw: string | undefined
      if (failure === 'missing') delete result.s1
      if (failure === 'extra') result.privateExtra = 'PRIVATE CONTENT'
      if (failure === 'number') result.s1 = 9
      if (failure === 'array') raw = '[]'
      if (failure === 'null') raw = 'null'
      if (failure === 'invalid-json') raw = '{"PRIVATE CONTENT"'
      if (failure === 'formula') result.s0 = String(result.s0).replace('$x^2$', '$x^3$')
      if (failure === 'empty') result.s1 = ''
      if (failure === 'duplicate') raw = JSON.stringify(result).replace('{', '{"s1":"PRIVATE CONTENT",')
      try {
        validateTranslationResponse(envelope, raw ?? JSON.stringify(result), failure === 'incomplete' ? 'MAX_TOKENS' : 'STOP')
        expect.fail('La risposta alterata deve essere rifiutata')
      } catch (error) {
        expect(error).toMatchObject({ category: 'invalid_output', isRetryable: false })
        expect((error as Error).message).not.toContain('PRIVATE CONTENT')
      }
    }
  )

  it('non confonde virgolette, backslash, due punti o nomi di campo nella prosa con chiavi duplicate', () => {
    const envelope = prepareTranslation('# Titolo\n\nEsempio: "s0": "testo", percorso C:\\cartella.\n\n$x$')
    const json = JSON.stringify(translationSourceSections(envelope))
    expect(validateTranslationResponse(envelope, json, 'STOP')).toBe(envelope.sections.join(''))
  })

  it('su 40 sezioni conserva 8 e 9 separatamente e rifiuta duplicati anche con chiavi JSON equivalenti', () => {
    const document = Array.from({ length: 40 }, (_, i) => `## ${i + 1}. Argomento\n\nTesto $x_${i}$` ).join('\n\n')
    const envelope = prepareTranslation(document)
    const result = translationSourceSections(envelope)
    const translated = JSON.stringify(Object.fromEntries(Object.entries(result).map(([key, text]) => [key, text.replace('Argomento', 'Topic').replace('Testo', 'Text')])))
    expect(validateTranslationResponse(envelope, translated, 'STOP').match(/^## /gm)).toHaveLength(40)
    const duplicate = translated.replace('{', '{"s8":"PRIVATE CONTENT",')
    expect(() => validateTranslationResponse(envelope, duplicate, 'STOP')).toThrow('duplicata')
    const escapedDuplicate = translated.replace('{', '{"s\\u0038":"PRIVATE CONTENT",')
    expect(() => validateTranslationResponse(envelope, escapedDuplicate, 'STOP')).toThrow('duplicata')
    delete result.s9
    expect(() => validateTranslationResponse(envelope, JSON.stringify(result), 'STOP')).toThrow('manca una sezione')
  })
})
