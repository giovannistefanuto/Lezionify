import type { CourseCitation } from './courseRag'

export interface CourseGroundingReview {
  status: 'reviewed' | 'partial' | 'unavailable'
  claims: {
    text: string
    kind: 'course' | 'deduction' | 'general'
    support: 'supported' | 'unsupported' | 'uncertain'
    passageIds: string[]
    reason: string
  }[]
  contradictions: string[]
  omittedClaims?: number
}

function canonicalQuote(text: string): { text: string; starts: number[]; ends: number[] } {
  let value = ''
  const starts: number[] = [], ends: number[] = []
  for (let index = 0; index < text.length;) {
    if (text.startsWith('**', index) || text.startsWith('__', index) || text.startsWith('\\[', index) || text.startsWith('\\]', index)) { index += 2; continue }
    const char = String.fromCodePoint(text.codePointAt(index)!)
    if (char === '$' || char === '`') { index += char.length; continue }
    for (const part of char.normalize('NFKC')) {
      if (/\s/.test(part)) {
        if (value && !value.endsWith(' ')) { value += ' '; starts.push(index); ends.push(index + char.length) }
      } else {
        value += part
        for (let unit = 0; unit < part.length; unit++) { starts.push(index); ends.push(index + char.length) }
      }
    }
    index += char.length
  }
  if (value.endsWith(' ')) { value = value.slice(0, -1); starts.pop(); ends.pop() }
  return { text: value, starts, ends }
}

export const COURSE_GROUNDING_SCHEMA = {
  type: 'object', properties: {
    claims: { type: 'array', maxItems: 16, items: { type: 'object', properties: {
      text: { type: 'string' }, kind: { type: 'string', enum: ['course', 'deduction', 'general'] },
      support: { type: 'string', enum: ['supported', 'unsupported', 'uncertain'] },
      passageIds: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' }
    }, required: ['text', 'kind', 'support', 'passageIds', 'reason'], additionalProperties: false } },
    contradictions: { type: 'array', items: { type: 'string' }, maxItems: 8 }
  }, required: ['claims', 'contradictions'], additionalProperties: false
}

/** Structural validation is separate from the model's fallible judgement. */
export function parseCourseGrounding(raw: string, answer: string, evidence: CourseCitation[]): CourseGroundingReview {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new Error('Controllo del supporto non valido.')
  const review = value as CourseGroundingReview
  const ids = new Set(evidence.map(item => item.passage.id))
  const canonical = canonicalQuote(answer)
  let omittedClaims = 0
  const claims: CourseGroundingReview['claims'] = []
  if (!Array.isArray(review.claims) || !review.claims.length || review.claims.length > 16 || !Array.isArray(review.contradictions) || review.contradictions.length > 8 || review.contradictions.some(text => typeof text !== 'string' || text.length > 1000)) throw new Error('Controllo del supporto incompleto.')
  for (const claim of review.claims) {
    if (claim && Array.isArray(claim.passageIds) && claim.passageIds.some(id => !ids.has(id))) throw new Error('Citazioni del controllo non verificabili.')
    if (!claim || typeof claim.text !== 'string' || !claim.text.trim() || claim.text.length > 3000 || !['course', 'deduction', 'general'].includes(claim.kind) || !['supported', 'unsupported', 'uncertain'].includes(claim.support) || !Array.isArray(claim.passageIds) || claim.passageIds.length > 12 || claim.passageIds.some(id => !ids.has(id)) || typeof claim.reason !== 'string' || claim.reason.length > 1200) throw new Error('Controllo del supporto non valido.')
    if (claim.kind === 'course' && claim.support === 'supported' && !claim.passageIds.length) throw new Error('Affermazione senza evidenza.')
    let text = claim.text
    if (!answer.includes(text)) {
      const quote = canonicalQuote(text).text
      const position = quote ? canonical.text.indexOf(quote) : -1
      if (position < 0) { omittedClaims++; continue }
      text = answer.slice(canonical.starts[position], canonical.ends[position + quote.length - 1])
    }
    claims.push({ ...claim, text })
  }
  if (!claims.length) throw new Error('Nessuna affermazione collegabile alla risposta.')
  return { status: omittedClaims ? 'partial' : 'reviewed', claims, contradictions: review.contradictions, ...(omittedClaims ? { omittedClaims } : {}) }
}
