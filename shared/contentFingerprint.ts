/** Stable opaque identity shared by renderer observations and archive validation. */
export function contentFingerprint(content: string): string {
  let a = 2166136261, b = 5381
  for (let i = 0; i < content.length; i++) { a = Math.imul(a ^ content.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ content.charCodeAt(i) }
  return `${content.length}-${a >>> 0}-${b >>> 0}`
}
