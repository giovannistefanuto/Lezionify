import { addCalendarDays, calendarDayDifference, parseLocalCalendarDate } from './calendarDate'

export const STREAK_MINIMUM_SECONDS = 600
export interface StudyRecords {
  bestDay: { date: string; seconds: number } | null
  bestWeek: { date: string; seconds: number } | null
  bestStreak: { start: string; end: string; days: number } | null
  longestFocusSeconds: number | null
}

/** Calendar days, not 24-hour durations: correct across daylight saving changes. */
export function studyRecords(totals: Map<string, number>, today: string) {
  const days = [...totals].filter(([date, seconds]) => parseLocalCalendarDate(date) && date <= today && seconds > 0).sort(([a], [b]) => a.localeCompare(b))
  const weeks = new Map<string, number>()
  let bestDay: StudyRecords['bestDay'] = null
  let bestWeek: StudyRecords['bestWeek'] = null
  let bestStreak: StudyRecords['bestStreak'] = null
  let streak = 0, start = '', previous = ''
  for (const [date, seconds] of days) {
    if (!bestDay || seconds > bestDay.seconds) bestDay = { date, seconds }
    const day = parseLocalCalendarDate(date)!.getDay()
    const monday = addCalendarDays(date, -((day + 6) % 7))
    weeks.set(monday, (weeks.get(monday) ?? 0) + seconds)
    if (seconds >= STREAK_MINIMUM_SECONDS) {
      if (previous && calendarDayDifference(previous, date) === 1) streak++
      else { streak = 1; start = date }
      previous = date
      if (!bestStreak || streak > bestStreak.days) bestStreak = { start, end: date, days: streak }
    } else { streak = 0; previous = '' }
  }
  for (const [date, seconds] of weeks) if (!bestWeek || seconds > bestWeek.seconds) bestWeek = { date, seconds }
  let currentStreakDays = 0
  let date = (totals.get(today) ?? 0) >= STREAK_MINIMUM_SECONDS ? today : addCalendarDays(today, -1)
  while ((totals.get(date) ?? 0) >= STREAK_MINIMUM_SECONDS) { currentStreakDays++; date = addCalendarDays(date, -1) }
  return { currentStreakDays, records: { bestDay, bestWeek, bestStreak } }
}
