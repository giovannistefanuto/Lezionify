const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatLocalCalendarDate(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

export function formatLocalCalendarDateTime(date: Date): string {
  return `${formatLocalCalendarDate(date)}T${[
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')}`
}

export function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? formatLocalCalendarDateTime(date).slice(0, 16)
    : ''
}

export function parseLocalCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

export function calendarDayDifference(from: string, to: string): number | null {
  const start = parseLocalCalendarDate(from)
  const end = parseLocalCalendarDate(to)
  if (!start || !end) return null
  return Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000
  )
}
