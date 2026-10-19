import type { CourseTimeSlot, DayOfWeek } from '../../shared/archive'

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length < 2) return 0
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

export function calculateScheduleOverlap(
  recordedDate: Date,
  durationSeconds: number,
  slot: CourseTimeSlot
): { overlapMinutes: number; confidence: number } {
  const day = recordedDate.getDay() as DayOfWeek
  if (day !== slot.dayOfWeek) {
    return { overlapMinutes: 0, confidence: 0 }
  }

  const recStartMinutes =
    recordedDate.getHours() * 60 + recordedDate.getMinutes()
  const recDurationMinutes = Math.max(15, Math.round(durationSeconds / 60))
  const recEndMinutes = recStartMinutes + recDurationMinutes

  const slotStartMinutes = parseTimeToMinutes(slot.startTime)
  const slotEndMinutes = parseTimeToMinutes(slot.endTime)
  const slotDurationMinutes = Math.max(15, slotEndMinutes - slotStartMinutes)

  const overlapStart = Math.max(recStartMinutes, slotStartMinutes)
  const overlapEnd = Math.min(recEndMinutes, slotEndMinutes)
  const overlapMinutes = Math.max(0, overlapEnd - overlapStart)

  if (overlapMinutes <= 0) {
    return { overlapMinutes: 0, confidence: 0 }
  }

  // Copertura bidirezionale: gestisce sia lezioni complete che spezzoni/pause
  const recordingCoverage = (overlapMinutes / recDurationMinutes) * 100
  const slotCoverage = (overlapMinutes / slotDurationMinutes) * 100

  // Se l'audio cade quasi tutto nello slot (es. 45 min dentro 2 ore) ha alta confidenza
  const confidence = Math.min(
    100,
    Math.round(Math.max(recordingCoverage, slotCoverage * 0.9))
  )

  return { overlapMinutes, confidence }
}
