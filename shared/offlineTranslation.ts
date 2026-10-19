import type { DictionaryDirection } from './dictionary'

export interface OfflineTranslationStatus { installed: boolean; installing: boolean; downloadBytes: number; diskBytes: number }
export interface OfflineTranslationResult { text: string; direction: DictionaryDirection; engine: 'Mozilla/Bergamot' }

export function validatePhrase(text: unknown, direction: unknown): asserts text is string {
  if (typeof text !== 'string' || !text.trim() || text.length > 2000 || !['en-it', 'it-en'].includes(String(direction))) throw new Error('Inserisci una frase entro 2000 caratteri e scegli EN → IT oppure IT → EN.')
}

// Translate prose only: protected material is never replaced with model-generated placeholders.
export function phraseSegments(text: string): { text: string; protected: boolean }[] {
  const pattern = /```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|https?:\/\/[^\s<>]+/g
  const segments: { text: string; protected: boolean }[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index! > cursor) segments.push({ text: text.slice(cursor, match.index), protected: false })
    segments.push({ text: match[0], protected: true }); cursor = match.index! + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), protected: false })
  return segments
}
