export interface ReadingPosition { page: number; y: number; x: number }
const PREFIX = 'lezionify.reading.v1:'

// Only opaque identities and coordinates are stored, never document text or paths.
export function contentFingerprint(content: string): string {
  let a = 2166136261
  let b = 5381
  for (let i = 0; i < content.length; i++) {
    a = Math.imul(a ^ content.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ content.charCodeAt(i)
  }
  return `${content.length}-${a >>> 0}-${b >>> 0}`
}

export function readPosition(key: string, fingerprint: string): ReadingPosition | null {
  try {
    const value = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null')
    if (!value || value.fingerprint !== fingerprint || !Number.isInteger(value.page) || value.page < 0 ||
      !Number.isFinite(value.x) || !Number.isFinite(value.y) || Math.abs(value.x) > 2 || Math.abs(value.y) > 2) return null
    return { page: value.page, y: value.y, x: value.x }
  } catch { return null }
}

export function writePosition(key: string, fingerprint: string, position: ReadingPosition): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ fingerprint, ...position })) }
  catch { /* Reading remains available when browser storage is unavailable. */ }
}

export function forgetPosition(key: string): void {
  try { localStorage.removeItem(PREFIX + key) } catch { /* Storage is optional. */ }
}
