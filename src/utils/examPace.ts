import type { CourseDefinition } from '../../shared/archive'
import { addCalendarDays, calendarDayDifference, parseLocalCalendarDate } from '../../shared/calendarDate'

/** Scheduled sessions strictly after today and before the exam, within the course period. */
export function futureExamLectures(course: CourseDefinition | undefined, today: string, exam: string): number {
  if (!course || !parseLocalCalendarDate(today) || !parseLocalCalendarDate(exam) ||
      !parseLocalCalendarDate(course.startDate) || !parseLocalCalendarDate(course.endDate)) return 0
  const first = [addCalendarDays(today, 1), course.startDate].sort().at(-1)!
  const last = [addCalendarDays(exam, -1), course.endDate].sort()[0]
  const days = calendarDayDifference(first, last)
  if (days === null || days < 0 || days > 3660) return 0
  const sessions = new Set<string>()
  for (let offset = 0; offset <= days; offset++) {
    const date = addCalendarDays(first, offset)
    const weekday = parseLocalCalendarDate(date)!.getDay()
    for (const slot of course.schedule) {
      if (slot.dayOfWeek === weekday) sessions.add(`${date}:${slot.startTime}`)
    }
    for (const slot of course.laboratorySchedule?.dates ?? []) {
      if (slot.date === date) sessions.add(`${date}:${slot.startTime}`)
    }
  }
  return sessions.size
}

/** Round only the displayed daily rate; never turn a positive rate into apparent zero. */
export function formatExamPace(lecturesLeft: number, daysLeft: number): string {
  const remaining = Math.max(0, lecturesLeft)
  if (!remaining) return 'Lezioni completate'
  const days = Math.max(1, daysLeft)
  const pace = remaining / days
  if (pace < 0.0001) return '< 0,0001 lez/giorno'
  return `${pace.toLocaleString('it-IT', { maximumFractionDigits: 4 })} lez/giorno`
}
