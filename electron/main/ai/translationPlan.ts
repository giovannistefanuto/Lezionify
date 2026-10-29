import { GeminiError } from './geminiErrors'
import { protectedTranslationSpans, restoreOriginalMermaid, translationJsonPropertyCount, validateTranslationResponse, type TranslationEnvelope } from './translationIntegrity'

type TranslationPart = { keep: string } | { key: string; translate: string }
export type TranslationPlan = Record<string, TranslationPart[]>

/** Only prose is returned by the model; original literals are restored locally. */
export function prepareTranslationPlan(envelope: TranslationEnvelope): TranslationPlan {
  return Object.fromEntries(envelope.sections.map((section, i) => {
    const parts: TranslationPart[] = []
    let offset = 0
    let key = 0
    const prose = (text: string) => {
      if (!text) return
      if (/[\p{L}\p{N}]/u.test(text)) {
        const leading = text.match(/^\s*/)?.[0] ?? ''
        const core = text.trim()
        const trailing = text.slice(leading.length + core.length)
        if (leading) parts.push({ keep: leading })
        parts.push({ key: `p${key++}`, translate: core })
        if (trailing) parts.push({ keep: trailing })
      } else parts.push({ keep: text })
    }
    for (const span of protectedTranslationSpans(section)) {
      prose(section.slice(offset, span.start))
      parts.push({ keep: section.slice(span.start, span.end) })
      offset = span.end
    }
    prose(section.slice(offset))
    return [`s${i}`, parts]
  }))
}

export function translationPlanSchema(plan: TranslationPlan) {
  const properties = Object.fromEntries(Object.entries(plan).flatMap(([section, parts]) => {
    const keys = parts.flatMap(part => 'key' in part ? [part.key] : [])
    return keys.length ? [[section, { type: 'object', properties: Object.fromEntries(keys.map(key => [key, { type: 'string' }])), required: keys, additionalProperties: false }]] : []
  }))
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false }
}

/** Large dynamic schemas can be rejected by the provider before generation.
 * The complete local validator remains mandatory even when no grammar is sent.
 */
export function translationProviderSchema(plan: TranslationPlan) {
  const fields = Object.values(plan).reduce((count, parts) => count + 1 + parts.filter(part => 'key' in part).length, 0)
  return fields <= 128 ? translationPlanSchema(plan) : undefined
}

function invalidPlan(detail: string): never {
  throw new GeminiError({ category: 'invalid_output', isRetryable: false, isDailyQuota: false,
    sanitizedMessage: `Traduzione non salvata: frammenti di testo mancanti, duplicati, vuoti o inattesi nella risposta del modello. Dettaglio: ${detail}. Riprova la traduzione; la dispensa italiana e l’eventuale inglese precedente sono conservate.` })
}

/** Discard only redundant, standalone display copies already restored from this section. */
function removeCopiedDisplayMath(parts: TranslationPart[], fragment: string, location: string): { text: string; copies: number } {
  const originals = new Set(parts.flatMap(part => 'keep' in part &&
    (part.keep.startsWith('$$') && part.keep.endsWith('$$') || part.keep.startsWith('\\[') && part.keep.endsWith('\\]'))
    ? [part.keep] : []))
  let text = fragment.replace(/\r\n/g, '\n')
  let copies = 0
  for (const span of protectedTranslationSpans(text).reverse()) {
    const literal = text.slice(span.start, span.end)
    if (!originals.has(literal)) continue
    const lineBefore = text.slice(0, span.start).split('\n').at(-1) ?? ''
    const lineAfter = text.slice(span.end).split('\n')[0]
    if (lineBefore.trim() || lineAfter.trim()) continue
    text = text.slice(0, span.start) + text.slice(span.end)
    copies++
  }
  text = text.trim()
  if (!text) invalidPlan(location + '; testo vuoto dopo rimozione copie')
  return { text, copies }
}

/** Restore immutable spans from the source, then apply the original integrity check. */
export function validateTranslationPlan(envelope: TranslationEnvelope, plan: TranslationPlan, raw: string, finishReason: string | undefined, onNormalization?: (sections: { section: number; copies: number }[]) => void, onMermaidFallback?: (sections: { section: number; diagrams: number }[]) => void): string {
  if (finishReason !== 'STOP') return validateTranslationResponse(envelope, raw, finishReason)
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { invalidPlan('JSON non valido') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) invalidPlan('oggetto sezioni non valido')
  const response = parsed as Record<string, unknown>
  const expectedSections = translationPlanSchema(plan).required
  if (Object.keys(response).length !== expectedSections.length || Object.keys(response).some(key => !expectedSections.includes(key))) invalidPlan('sezioni mancanti o inattese')
  let expectedProperties = expectedSections.length
  const restored: Record<string, string> = {}
  const normalized: { section: number; copies: number }[] = []
  const recovered: { section: number; diagrams: number }[] = []
  for (const [section, parts] of Object.entries(plan)) {
    const location = `sezione ${Number(section.slice(1)) + 1}`
    const keys = parts.flatMap(part => 'key' in part ? [part.key] : [])
    const values = response[section]
    if (keys.length && (!values || typeof values !== 'object' || Array.isArray(values))) invalidPlan(location + '; oggetto frammenti non valido')
    const translated = (values ?? {}) as Record<string, unknown>
    if (Object.keys(translated).length !== keys.length || Object.keys(translated).some(key => !keys.includes(key))) invalidPlan(location + '; frammenti mancanti o inattesi')
    for (const [index, key] of keys.entries()) {
      const fragmentLocation = `${location}; frammento ${index + 1}`
      if (typeof translated[key] !== 'string') invalidPlan(fragmentLocation + '; tipo non valido')
      if (!(translated[key] as string).trim()) invalidPlan(fragmentLocation + '; testo vuoto')
    }
    expectedProperties += keys.length
    let copies = 0
    restored[section] = parts.map(part => {
      if ('keep' in part) return part.keep
      const result = removeCopiedDisplayMath(parts, translated[part.key] as string, `${location}; frammento ${keys.indexOf(part.key) + 1}`)
      copies += result.copies
      return result.text
    }).join('')
    const mermaid = restoreOriginalMermaid(envelope.sections[Number(section.slice(1))], restored[section])
    restored[section] = mermaid.text
    if (mermaid.restored) recovered.push({ section: Number(section.slice(1)) + 1, diagrams: mermaid.restored })
    if (copies) normalized.push({ section: Number(section.slice(1)) + 1, copies })
  }
  if (translationJsonPropertyCount(raw) !== expectedProperties) invalidPlan('chiavi JSON duplicate')
  const output = validateTranslationResponse(envelope, JSON.stringify(restored), finishReason)
  if (normalized.length) onNormalization?.(normalized)
  if (recovered.length) onMermaidFallback?.(recovered)
  return output
}
