import { formatLocalCalendarDate, parseLocalCalendarDate } from '../../../shared/calendarDate'

export function shiftSessionMonth(date: string, delta: number): string {
  const day = parseLocalCalendarDate(date)!
  return formatLocalCalendarDate(new Date(day.getFullYear(), day.getMonth() + delta, 1))
}

export function getSessionWeekRows(month: string): (string | null)[][] {
  const first = parseLocalCalendarDate(shiftSessionMonth(month, 0))!
  const year = first.getFullYear()
  const monthIndex = first.getMonth()
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + days) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, column) => {
      const day = week * 7 + column - offset + 1
      return day >= 1 && day <= days
        ? formatLocalCalendarDate(new Date(year, monthIndex, day))
        : null
    })
  )
}

export function getSessionWindow(anchor: string, dates: readonly string[]) {
  const fourth = shiftSessionMonth(anchor, 3)
  const fifth = shiftSessionMonth(anchor, 4)
  const count = dates.some(date => date >= fourth && date < fifth) ? 4 : 3
  const months = Array.from({ length: count }, (_, i) => shiftSessionMonth(anchor, i))
  const last = shiftSessionMonth(anchor, count)
  const earlier = dates.filter(date => date < months[0]).sort().at(-1)
  const later = dates.filter(date => date >= last).sort()[0]
  return { months, earlier, later }
}
