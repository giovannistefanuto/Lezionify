export const COPY_GUARD_KEY = 'lezionify:memo-copy-hours:v1'
export const COPY_GUARD_DEFAULT = { start: '08:00', end: '17:30' }
export type CopyGuardHours = typeof COPY_GUARD_DEFAULT
const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
export function readCopyGuardHours(): CopyGuardHours {
  try {
    const value = JSON.parse(localStorage.getItem(COPY_GUARD_KEY) ?? 'null')
    if (validTime(value?.start) && validTime(value?.end)) return { start: value.start, end: value.end }
  } catch { /* defaults */ }
  return { ...COPY_GUARD_DEFAULT }
}
export function isCopyProtected(date: Date, hours: CopyGuardHours): boolean {
  const minute = date.getHours() * 60 + date.getMinutes()
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  const start = minutes(hours.start), end = minutes(hours.end)
  return start === end || (start < end ? minute >= start && minute < end : minute >= start || minute < end)
}
export const normalizeCopyPhrase = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT')
export const COPY_PHRASES = [
  'Prima di aprire altre conversazioni scelgo di proteggere la mia attenzione e di dedicare questo momento allo studio che conta per me.',
  'Posso affrontare un passaggio alla volta con calma, lasciando le distrazioni per dopo e dando valore al tempo che ho scelto di studiare.',
  'Una domanda precisa può aiutarmi a capire meglio, poi torno alla lezione e continuo il percorso con pazienza e attenzione.',
  'Mi fermo un momento per ricordare il mio obiettivo, scelgo il prossimo piccolo passo e uso questi appunti con intenzione.'
]
