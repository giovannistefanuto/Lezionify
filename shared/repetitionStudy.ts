import type { StudySession } from './archive'
import { formatLocalCalendarDate } from './calendarDate'

/** Actual recorder time when available; otherwise the session creation time. */
export function repetitionRecordingCredits(id: string, startTime: string, seconds: number): StudySession[] {
  const start = new Date(startTime)
  if (!/^[a-f0-9]{64}$/.test(id) || !Number.isFinite(start.getTime()) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 30 * 24 * 3600)
    throw new Error('Durata o data della ripetizione non valida.')
  const total = Math.round(seconds)
  const end = start.getTime() + total * 1000
  const sessions: StudySession[] = []
  let cursor = start.getTime(), assigned = 0
  while (cursor < end) {
    const day = new Date(cursor)
    const midnight = new Date(cursor); midnight.setHours(24, 0, 0, 0)
    const next = Math.min(end, midnight.getTime())
    const cumulative = Math.round((next - start.getTime()) / 1000)
    sessions.push({ id: `repetition-audio:${id}:${formatLocalCalendarDate(day)}`, lectureId: null, courseCode: null,
      startTime: new Date(cursor).toISOString(), endTime: new Date(next).toISOString(), durationSeconds: cumulative - assigned,
      mode: 'manual', date: formatLocalCalendarDate(day) })
    assigned = cumulative; cursor = next
  }
  return sessions
}
