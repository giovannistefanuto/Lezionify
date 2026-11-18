import { calendarDayDifference } from './calendarDate'
import { passedExamSteps, type ExamAppointment, type ExamChoice, type ExamPlan, type ExamSession, type PlannedExam } from './sessione'

export const SPACING_NODE_LIMIT = 150_000

export interface SpacingRequest { session: ExamSession; plan: ExamPlan; today: string }
export interface SpacedPlan {
  choices: ExamChoice[]
  exams: PlannedExam[]
  minimum: number | null
  dispersion: number
  changes: number
  end: string | null
}

export interface SpacingResult {
  proposal?: SpacedPlan
  warnings: string[]
  complete: boolean
  visited: number
  limit: number
}

interface Candidate {
  appointment: ExamAppointment
  offset: number
}
interface Step {
  course: string
  stepId: string
  label: string
  previous?: string
  candidates: Candidate[]
}
interface Pick { step: Step; candidate: Candidate }

export function gapMetrics(offsets: number[]) {
  const ordered = [...offsets].sort((a, b) => a - b)
  let previous = 0, least = Infinity, sumSquares = 0
  for (const value of ordered) {
    const gap = value - previous
    previous = value
    least = Math.min(least, gap)
    sumSquares += gap * gap
  }
  return {
    minimum: ordered.length ? least : null,
    dispersion: ordered.length * sumSquares - previous * previous
  }
}

function compareTimes(left: ExamAppointment, right: ExamAppointment) {
  return left.date.localeCompare(right.date) ||
    (left.time && right.time ? left.time.localeCompare(right.time) : 0)
}

export function spaceSessionExams(request: SpacingRequest, limit = SPACING_NODE_LIMIT): SpacingResult {
  const { session, plan, today } = request
  const { draft } = session
  const satisfied = passedExamSteps(session)
  const total = new Map(draft.courses.map(course => [course.code, course]))
  const steps: Step[] = []
  const warnings: string[] = []

  for (const choice of [...plan.choices].sort((a, b) => a.course.localeCompare(b.course))) {
    if (!choice.pathId) continue
    const path = total.get(choice.course)?.paths.find(path => path.id === choice.pathId)
    if (!path?.steps.length) { warnings.push(`${choice.course}: aggiungi le prove richieste.`); continue }
    const chosen = new Set(choice.appointments)
    const locks = new Set(choice.locks)
    for (const step of path.steps) {
      if (step.completed || satisfied.has(step.id)) continue
      const locked = step.appointments.find(item => locks.has(item.id))
      const intervals = draft.unavailable.filter(item => item.blocking)
      const candidates = (locked ? [locked] : step.appointments).flatMap(appointment => {
        if (appointment.date < today || appointment.date < draft.start || appointment.date > draft.end ||
            intervals.some(item => appointment.date >= item.start && appointment.date <= item.end) ||
            session.attempts?.some(attempt => attempt.exam.id === appointment.id && attempt.exam.date === appointment.date && attempt.status)) return []
        const offset = calendarDayDifference(today, appointment.date)
        return offset === null ? [] : [{ appointment, offset }]
      }).sort((a, b) => b.offset - a.offset || a.appointment.id.localeCompare(b.appointment.id))
      if (!candidates.length) warnings.push(locked
        ? `${choice.course} · ${step.label}: il blocco del ${locked.date} è incompatibile con le date disponibili.`
        : `${choice.course} · ${step.label}: nessun appello futuro disponibile nel periodo e nelle giornate libere.`)
      steps.push({ course: choice.course, stepId: step.id, label: step.label, candidates,
        previous: step.appointments.find(item => chosen.has(item.id))?.id })
    }
  }

  if (warnings.length) return { warnings, complete: true, visited: 0, limit }
  const picks: Pick[] = []
  const offsets: number[] = []
  let best: SpacedPlan | undefined
  let bestKey = ''
  let visited = 0
  let complete = true

  function visit(depth: number) {
    if (visited >= limit) { complete = false; return }
    visited++
    const metrics = gapMetrics(offsets)
    if (metrics.minimum !== null && best?.minimum !== null && best?.minimum !== undefined &&
        metrics.minimum < best.minimum) return
    if (depth === steps.length) {
      const changes = picks.filter(({ step, candidate }) => step.previous !== candidate.appointment.id).length
      const last = picks.reduce<string | null>((end, pick) => !end || pick.candidate.appointment.date > end ? pick.candidate.appointment.date : end, null)
      const key = picks.map(pick => pick.candidate.appointment.id).join('|')
      if (best) {
        const delta = (metrics.minimum ?? 0) - (best.minimum ?? 0) ||
          best.dispersion - metrics.dispersion || best.changes - changes ||
          (best.end ?? '').localeCompare(last ?? '') || bestKey.localeCompare(key)
        if (delta <= 0) return
      }
      const exams = picks.map(({ step, candidate }): PlannedExam => ({
        id: candidate.appointment.id, course: step.course, stepId: step.stepId,
        label: step.label, date: candidate.appointment.date, time: candidate.appointment.time
      })).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.id.localeCompare(b.id))
      const byCourse = new Map<string, string[]>()
      for (const exam of exams) {
        const ids = byCourse.get(exam.course)
        if (ids) ids.push(exam.id)
        else byCourse.set(exam.course, [exam.id])
      }
      best = { ...metrics, end: last, changes, exams, choices: plan.choices.map(choice => {
        const appointments = byCourse.get(choice.course) ?? []
        return { ...choice, appointments, locks: choice.locks.filter(id => appointments.includes(id)) }
      }) }
      bestKey = key
      return
    }

    const step = steps[depth]
    const previous = picks.at(-1)
    for (const candidate of step.candidates) {
      if (previous?.step.course === step.course) {
        const comparison = compareTimes(candidate.appointment, previous.candidate.appointment)
        if (comparison < 0 || (comparison === 0 && candidate.appointment.time && previous.candidate.appointment.time)) continue
      }
      picks.push({ step, candidate })
      offsets.push(candidate.offset)
      visit(depth + 1)
      offsets.pop()
      picks.pop()
      if (!complete) return
    }
  }
  visit(0)
  if (!best) warnings.push(complete
    ? 'Non esiste una combinazione che rispetti l’ordine delle prove e i blocchi di data.'
    : 'La ricerca ha raggiunto il limite senza trovare una combinazione valida.')
  return { proposal: best, warnings, complete, visited, limit }
}
