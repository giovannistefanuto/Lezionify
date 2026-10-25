import type { Lecture, StudySession } from './archive'

export interface StudyTimeRemovalTarget {
  id: string
  kind: 'today' | 'last-lecture'
  label: string
  availableSeconds: number
}

export function effectiveStudySeconds(session: StudySession): number {
  return Math.max(
    0,
    session.durationSeconds -
      (session.corrections ?? []).reduce(
        (sum, correction) => sum + correction.seconds,
        0
      )
  )
}

export function studyTimeRemovalTargets(
  sessions: StudySession[],
  lectures: Lecture[],
  today: string
): StudyTimeRemovalTarget[] {
  const courses = [
    ...new Set(
      sessions
        .filter((session) => session.date === today)
        .map((session) => session.courseCode ?? '')
    )
  ]
  const targets: StudyTimeRemovalTarget[] = courses.map((code) => ({
    id: `today:${code}`,
    kind: 'today',
    label: `Oggi · ${code || 'Senza corso'} · ${today}`,
    availableSeconds: sessions
      .filter(
        (session) =>
          session.date === today && (session.courseCode ?? '') === code
      )
      .reduce((sum, session) => sum + effectiveStudySeconds(session), 0)
  }))
  const last = [...sessions]
    .filter(
      (session) =>
        session.lectureId &&
        lectures.some((lecture) => lecture.id === session.lectureId)
    )
    .sort((first, second) => second.endTime.localeCompare(first.endTime))[0]
  if (last) {
    const lecture = lectures.find((item) => item.id === last.lectureId)!
    targets.push({
      id: `lecture:${lecture.id}`,
      kind: 'last-lecture',
      label: `Ultima lezione studiata · ${lecture.title || lecture.id} · ${last.date} (tutte le sessioni)`,
      availableSeconds: sessions
        .filter((session) => session.lectureId === lecture.id)
        .reduce((sum, session) => sum + effectiveStudySeconds(session), 0)
    })
  }
  return targets
}

export function removeStudySeconds(
  sessions: StudySession[],
  targetId: string,
  seconds: number,
  today: string,
  createdAt: string
): StudySession[] {
  if (!Number.isInteger(seconds) || seconds <= 0)
    throw new Error('Durata da togliere non valida.')
  const matches = (session: StudySession) =>
    targetId.startsWith('today:')
      ? session.date === today &&
        (session.courseCode ?? '') === targetId.slice(6)
      : targetId.startsWith('lecture:') &&
        session.lectureId === targetId.slice(8)
  const selected = sessions
    .filter(matches)
    .sort(
      (first, second) =>
        second.date.localeCompare(first.date) ||
        second.endTime.localeCompare(first.endTime)
    )
  const available = selected.reduce(
    (sum, session) => sum + effectiveStudySeconds(session),
    0
  )
  if (seconds > available)
    throw new Error(
      'Il tempo richiesto supera quello disponibile. Aggiorna la selezione.'
    )
  let remaining = seconds
  const updated = new Map<string, StudySession>()
  for (const session of selected) {
    const removed = Math.min(remaining, effectiveStudySeconds(session))
    if (removed > 0)
      updated.set(session.id, {
        ...session,
        corrections: [
          ...(session.corrections ?? []),
          { seconds: removed, createdAt }
        ]
      })
    remaining -= removed
    if (!remaining) break
  }
  return sessions.map((session) => updated.get(session.id) ?? session)
}
