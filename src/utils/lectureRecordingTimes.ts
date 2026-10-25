import type { Lecture } from '../../shared/archive'

export function lectureRecordingTimes(
  lecture: Pick<Lecture, 'recordedAt' | 'durationSeconds'>
) {
  // A date alone does not establish midnight as the recording's start time.
  const hasTime = lecture.recordedAt && /T\d{2}:\d{2}/.test(lecture.recordedAt)
  const candidate = hasTime ? new Date(lecture.recordedAt!) : null
  const start =
    candidate && Number.isFinite(candidate.getTime()) ? candidate : null
  const duration = lecture.durationSeconds
  const endCandidate =
    start &&
    typeof duration === 'number' &&
    Number.isFinite(duration) &&
    duration >= 0
      ? new Date(start.getTime() + duration * 1000)
      : null
  const end =
    endCandidate && Number.isFinite(endCandidate.getTime())
      ? endCandidate
      : null
  const time = (date: Date) =>
    date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const differentDay =
    start && end && start.toDateString() !== end.toDateString()
  return {
    start,
    end,
    startLabel: start ? time(start) : 'Non disponibile',
    endLabel: end
      ? `${time(end)}${differentDay ? ` · ${end.toLocaleDateString('it-IT')}` : ''}`
      : 'Non disponibile'
  }
}
