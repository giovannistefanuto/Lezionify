import type { AppLogEntry } from './archive'

export interface AppLogDay {
  day: string
  entries: AppLogEntry[]
  previousDay: string | null
}
export function localLogDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function validateLogDay(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    localLogDay(new Date(`${value}T12:00:00`)) !== value
  )
    throw new Error('Giorno dei log non valido.')
  return value
}
