import type { CourseDefinition } from '../../shared/archive'
import {
  formatLocalCalendarDate,
  parseLocalCalendarDate
} from '../../shared/calendarDate'

export function gameTheoryCourse(
  courses: CourseDefinition[]
): CourseDefinition | undefined {
  return (
    courses.find((course) =>
      /\bgame[\s_-]*theory\b/i.test(`${course.code} ${course.name ?? ''}`)
    ) ?? courses.find((course) => course.code.toUpperCase() === 'GT')
  )
}

export function nearestMonday(value: string): string {
  const date = parseLocalCalendarDate(value) ?? new Date()
  const daysBefore = (date.getDay() + 6) % 7
  const daysAfter = 7 - daysBefore
  // Compare calendar days, so DST cannot shift the result. A tie favors the future.
  date.setDate(
    date.getDate() + (daysBefore < daysAfter ? -daysBefore : daysAfter)
  )
  return formatLocalCalendarDate(date)
}

export function reorderVideoFiles<T extends { id: string }>(
  files: T[],
  sourceId: string,
  targetId: string
): T[] {
  const from = files.findIndex((file) => file.id === sourceId)
  const to = files.findIndex((file) => file.id === targetId)
  if (from < 0 || to < 0 || from === to) return files
  const reordered = [...files]
  reordered.splice(to, 0, reordered.splice(from, 1)[0])
  return reordered
}
