import type {
  CourseDefinition,
  CourseTimeSlot,
  DayOfWeek,
  Lecture
} from '../../shared/archive'
import {
  formatLocalCalendarDate,
  parseLocalCalendarDate
} from '../../shared/calendarDate'
import { calculateScheduleOverlap } from './courseSchedule'

export function validateLaboratorySchedule(value: unknown): void {
  if (value === undefined) return
  const fail = (): never => {
    throw new Error('Calendario dei laboratori non valido.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail()
  const rules = value as Record<string, unknown>
  if (Object.keys(rules).some((key) => !['dates', 'daysOfWeek'].includes(key)))
    fail()
  if (
    rules.daysOfWeek !== undefined &&
    (!Array.isArray(rules.daysOfWeek) ||
      rules.daysOfWeek.length > 7 ||
      rules.daysOfWeek.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6
      ))
  )
    fail()
  if (rules.dates !== undefined) {
    if (!Array.isArray(rules.dates) || rules.dates.length > 500) fail()
    for (const item of rules.dates as unknown[]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) fail()
      const slot = item as Record<string, unknown>
      const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/
      if (
        typeof slot.date !== 'string' ||
        !parseLocalCalendarDate(slot.date) ||
        typeof slot.startTime !== 'string' ||
        !time.test(slot.startTime) ||
        typeof slot.endTime !== 'string' ||
        !time.test(slot.endTime) ||
        slot.startTime >= slot.endTime ||
        (slot.title !== undefined &&
          (typeof slot.title !== 'string' || slot.title.length > 240)) ||
        (slot.room !== undefined &&
          (typeof slot.room !== 'string' || slot.room.length > 200))
      )
        fail()
    }
  }
}

export function datedLaboratorySlots(
  course: CourseDefinition,
  date: Date
): CourseTimeSlot[] {
  const day = formatLocalCalendarDate(date)
  return (course.laboratorySchedule?.dates ?? [])
    .filter((slot) => slot.date === day)
    .map((slot, index) => ({
      id: `laboratory-${day}-${index}`,
      dayOfWeek: date.getDay() as DayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room
    }))
}

// The flag belongs to the lecture shared by all source/derived files.
// An explicit true/false from the context menu always takes precedence.
export function applyLaboratorySchedule(
  lecture: Lecture,
  course?: CourseDefinition
): boolean {
  const automatic = lecture.laboratorySource === 'schedule'
  if (!automatic && lecture.isLaboratory !== undefined) return false
  let matches = false
  if (course && lecture.recordedAt) {
    const date = new Date(lecture.recordedAt)
    if (Number.isFinite(date.getTime())) {
      const day = formatLocalCalendarDate(date)
      if (
        (!course.startDate || day >= course.startDate) &&
        (!course.endDate || day <= course.endDate)
      ) {
        matches = Boolean(
          course.laboratorySchedule?.daysOfWeek?.includes(
            date.getDay() as DayOfWeek
          ) ||
          datedLaboratorySlots(course, date).some(
            (slot) =>
              calculateScheduleOverlap(date, lecture.durationSeconds ?? 0, slot)
                .confidence >= 60
          )
        )
      }
    }
  }
  if (matches) {
    if (automatic && lecture.isLaboratory === true) return false
    lecture.isLaboratory = true
    lecture.laboratorySource = 'schedule'
    return true
  }
  if (automatic) {
    delete lecture.isLaboratory
    delete lecture.laboratorySource
    return true
  }
  return false
}
