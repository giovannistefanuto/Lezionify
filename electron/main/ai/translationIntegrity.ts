import { randomUUID } from 'node:crypto'
import { GeminiError } from './geminiErrors'

function invalidTranslation(detail: string): never {
  throw new GeminiError({
    category: 'invalid_output', isRetryable: false, isDailyQuota: false,
    sanitizedMessage: `Traduzione non salvata: ${detail} Riprova la traduzione; la dispensa italiana e l’eventuale inglese precedente sono conservate.`
  })
}

// Scan fences before headings/math: examples inside code are not document sections.
function fencedBlocks(markdown: string): { start: number; end: number; text: string; mermaid: boolean }[] {
  const blocks: ReturnType<typeof fencedBlocks> = []
  const lines = markdown.match(/[^\n]*(?:\n|$)/g) ?? []
  let offset = 0
  let open: { start: number; char: string; length: number; mermaid: boolean } | null = null
  for (const line of lines) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})([^\n]*)/)
    if (fence) {
      if (!open) {
        open = { start: offset, char: fence[1][0], length: fence[1].length, mermaid: fence[2].trim() === 'mermaid' }
      } else if (fence[1][0] === open.char && fence[1].length >= open.length && !fence[2].trim()) {
        const end = offset + line.replace(/\n$/, '').length
        blocks.push({ start: open.start, end, text: markdown.slice(open.start, end), mermaid: open.mermaid })
        open = null
      }
    }
    offset += line.length
  }
  if (open) blocks.push({ start: open.start, end: markdown.length, text: markdown.slice(open.start), mermaid: open.mermaid })
  return blocks
}

function maskFences(markdown: string): string {
  let masked = markdown
  for (const block of fencedBlocks(markdown).reverse()) {
    masked = masked.slice(0, block.start) + block.text.replace(/[^\n]/g, ' ') + masked.slice(block.end)
  }
  return masked
}

// Same literal syntax as the lecture prompts; dollars escaped as currency are ignored.
const LITERALS = /(`+)[^\n]*?\1|(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<![\\$])\$(?!\$)[^\n]*?(?<!\\)\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g

/** Same protected syntax as the validator; Mermaid remains translatable/validated. */
export function protectedTranslationSpans(markdown: string): { start: number; end: number }[] {
  return [
    ...fencedBlocks(markdown).filter(block => !block.mermaid).map(({ start, end }) => ({ start, end })),
    ...Array.from(maskFences(markdown).matchAll(LITERALS), match => ({ start: match.index!, end: match.index! + match[0].length }))
  ].sort((a, b) => a.start - b.start)
}

function maskedText(markdown: string): string {
  return maskFences(markdown).replace(LITERALS, text => text.replace(/[^\n]/g, ' '))
}

function headingOffsets(markdown: string): number[] {
  const offsets: number[] = []
  for (const match of maskedText(markdown).matchAll(/^ {0,3}#{1,6}[ \t]+.+$/gm)) offsets.push(match.index!)
  return offsets
}

function signature(markdown: string) {
  const outsideCode = maskFences(markdown)
  const literals = Array.from(outsideCode.matchAll(LITERALS), match => match[0])
  const headings = Array.from(maskedText(markdown).matchAll(/^ {0,3}(#{1,6})[ \t]+(?:([^\n]*))$/gm), match => {
    const numbering = match[2].match(/^(\d+(?:\.\d+)*)(?:[.)]?\s|$)/)?.[1] ?? ''
    return [match[1], numbering]
  })
  const alerts = Array.from(outsideCode.matchAll(/^\s*>\s*\[!([^\]\n]+)\]/gm), match => match[1])
  const blocks = fencedBlocks(markdown).map(block => ({
    mermaid: block.mermaid,
    text: block.mermaid
      ? block.text
          .replace(/"(?:\\.|[^"\\])*"/g, '"LABEL"')
          .replace(/^(\s*acc(?:Title|Descr)\s*:\s*).*$/gm, '$1LABEL')
          .replace(/(-->|-\.->|==>)\|([^|\n]+)\|/g, '$1|LABEL|')
          .replace(/(--|-\.-|==)\s*([^\n>-]+?)\s*(-->|-\.->|==>)/g, '$1 LABEL $3')
      : block.text
  }))
  return { literals, headings, alerts, blocks }
}

/** Return fixed labels only: never include source or response contents in errors/logs. */
function structuralDifferences(source: string, translated: string): string[] {
  const expected = signature(source)
  const actual = signature(translated)
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
  const differences: string[] = []
  if (!same(expected.literals, actual.literals)) {
    const inline = (literal: string) => literal.startsWith('`')
    if (!same(expected.literals.filter(inline), actual.literals.filter(inline))) differences.push('codice inline')
    if (!same(expected.literals.filter(value => !inline(value)), actual.literals.filter(value => !inline(value)))) differences.push('formule')
    if (!differences.length) differences.push('ordine di formule e codice inline')
  }
  if (!same(expected.headings, actual.headings)) differences.push('titoli')
  if (!same(expected.alerts, actual.alerts)) differences.push('riquadri')
  for (let i = 0; i < Math.max(expected.blocks.length, actual.blocks.length); i++) {
    if (!same(expected.blocks[i], actual.blocks[i])) {
      const label = expected.blocks[i]?.mermaid || actual.blocks[i]?.mermaid ? 'diagrammi Mermaid' : 'blocchi di codice'
      if (!differences.includes(label)) differences.push(label)
    }
  }
  return differences
}

/** Mermaid is optional translated material: recover only diagrams, never surrounding prose. */
export function restoreOriginalMermaid(source: string, translated: string): { text: string; restored: number } {
  const originals = fencedBlocks(source).filter(block => block.mermaid)
  const generated = fencedBlocks(translated).filter(block => block.mermaid)
  const expected = signature(source).blocks.filter(block => block.mermaid)
  const actual = signature(translated).blocks.filter(block => block.mermaid)
  if (JSON.stringify(expected) === JSON.stringify(actual)) return { text: translated, restored: 0 }
  let text = translated
  if (originals.length !== generated.length) {
    for (const block of [...generated].reverse()) text = text.slice(0, block.start) + text.slice(block.end)
    const code = fencedBlocks(text).filter(block => !block.mermaid)
    const insertions: { offset: number; text: string }[] = []
    let codeIndex = 0
    for (const block of fencedBlocks(source)) {
      if (!block.mermaid) { codeIndex++; continue }
      insertions.push({ offset: code[codeIndex]?.start ?? text.length, text: '\n\n' + block.text + '\n\n' })
    }
    for (const insertion of insertions.reverse()) text = text.slice(0, insertion.offset) + insertion.text + text.slice(insertion.offset)
    return { text, restored: Math.max(originals.length, generated.length) }
  }
  for (let i = generated.length - 1; i >= 0; i--) {
    const block = generated[i]
    text = text.slice(0, block.start) + (originals[i]?.text ?? '') + text.slice(block.end)
  }
  return { text, restored: Math.max(originals.length, generated.length) }
}

export interface TranslationEnvelope {
  markdown: string
  markers: string[]
  sections: string[]
}

/** Split the source; opaque boundaries are local validation metadata, never saved. */
export function prepareTranslation(markdownIta: string): TranslationEnvelope {
  const source = markdownIta.replace(/\r\n/g, '\n').trim()
  if (!source) invalidTranslation('la dispensa italiana è vuota.')
  const offsets = Array.from(new Set([0, ...headingOffsets(source)]))
  const sections = offsets.map((offset, i) => source.slice(offset, offsets[i + 1] ?? source.length))
  const nonce = randomUUID()
  const markers = Array.from({ length: sections.length + 1 }, (_, i) => `<!-- LEZIONIFY-${nonce}-${i} -->`)
  return { sections, markers, markdown: sections.map((section, i) => `${markers[i]}\n${section}`).join('\n') + `\n${markers.at(-1)}` }
}

/** Stable section keys are transport metadata, never part of saved lecture notes. */
export function translationSourceSections(envelope: TranslationEnvelope): Record<string, string> {
  return Object.fromEntries(envelope.sections.map((section, i) => [`s${i}`, section]))
}

export function translationResponseSchema(envelope: TranslationEnvelope) {
  const keys = Object.keys(translationSourceSections(envelope))
  return {
    type: 'object',
    properties: Object.fromEntries(keys.map(key => [key, { type: 'string' }])),
    required: keys,
    additionalProperties: false
  }
}

/** JSON.parse discards duplicate keys; count separators outside escaped strings. */
export function translationJsonPropertyCount(raw: string): number {
  let inString = false
  let escaped = false
  let properties = 0
  for (const char of raw) {
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === ':') properties++
  }
  return properties
}

/** Verify the wire shape locally too; a schema does not prove content fidelity. */
export function validateTranslationResponse(envelope: TranslationEnvelope, raw: string, finishReason: string | undefined): string {
  if (finishReason !== 'STOP') invalidTranslation('Gemini non ha confermato una risposta completa.')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { invalidTranslation('la risposta delle sezioni non è JSON valido.') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    invalidTranslation('la risposta delle sezioni non ha il formato previsto.')
  }
  const sections = parsed as Record<string, unknown>
  const expected = Object.keys(translationSourceSections(envelope))
  if (Object.keys(sections).length !== expected.length || expected.some(key => typeof sections[key] !== 'string')) {
    invalidTranslation('manca una sezione o sono presenti sezioni o valori inattesi.')
  }
  if (translationJsonPropertyCount(raw) !== expected.length) invalidTranslation('una sezione è duplicata nella risposta JSON.')
  const output = expected.map((key, i) => `${envelope.markers[i]}\n${sections[key]}`).join('\n') + `\n${envelope.markers.at(-1)}`
  return validateTranslation(envelope, output, finishReason)
}

/** Structural verification is conservative; it does not assess linguistic fidelity. */
export function validateTranslation(envelope: TranslationEnvelope, raw: string, finishReason: string | undefined): string {
  if (finishReason !== 'STOP') invalidTranslation('Gemini non ha confermato una risposta completa.')
  let output = raw.replace(/\r\n/g, '\n').trim()
  if (/^```(?:markdown)?\s*\n/.test(output) && output.endsWith('```')) {
    output = output.replace(/^```(?:markdown)?\s*\n/, '').slice(0, -3).trim()
  }
  let previous = -1
  const positions = envelope.markers.map(marker => {
    const position = output.indexOf(marker)
    if (position < 0 || position <= previous || output.indexOf(marker, position + marker.length) !== -1) {
      invalidTranslation('manca una sezione, oppure una sezione è duplicata o fuori ordine.')
    }
    previous = position
    return position
  })
  if (output.slice(0, positions[0]).trim() || output.slice(positions.at(-1)! + envelope.markers.at(-1)!.length).trim()) {
    invalidTranslation('sono presenti contenuti fuori dalla dispensa.')
  }
  const translated = envelope.sections.map((section, i) => {
    const text = output.slice(positions[i] + envelope.markers[i].length, positions[i + 1]).trim()
    const differences = text ? structuralDifferences(section.trim(), text) : ['sezione vuota']
    if (differences.length) {
      invalidTranslation(`titoli, formule, codice o riquadri non corrispondono alla sezione italiana. Dettaglio: sezione ${i + 1}; ${differences.join(', ')}.`)
    }
    return text
  })
  return translated.join('\n\n')
}
