import type { AppSettings } from './archive'
import { formatLocalCalendarDate, parseLocalCalendarDate } from './calendarDate'

export interface ExamAppointment {
  id: string
  date: string
  number?: number
  time?: string
  note?: string
  original?: { source: 'course' | 'dashboard'; date: string }
}

export interface ExamStep {
  id: string
  label: string
  number?: number
  completed: boolean
  appointments: ExamAppointment[]
}

export interface ExamPath {
  id: string
  kind: 'total' | 'partial' | 'unclassified'
  name: string
  steps: ExamStep[]
}

export interface SessionCourse {
  code: string
  paths: ExamPath[]
}

export interface ExamChoice {
  course: string
  pathId: string | null
  appointments: string[]
  locks: string[]
}

export interface ExamPlan {
  id: string
  name: string
  choices: ExamChoice[]
}

export interface ExamUnavailable {
  id: string
  start: string
  end: string
  label?: string
  blocking: boolean
}

export interface ExamSessionDraft {
  id: string
  name: string
  start: string
  end: string
  courses: SessionCourse[]
  plans: ExamPlan[]
  unavailable: ExamUnavailable[]
}

export interface PlannedExam {
  id: string
  course: string
  stepId: string
  label: string
  date: string
  time?: string
  pending?: boolean
}

export interface ConfirmedExamPlan {
  planId: string
  name: string
  revision: number
  courses: string[]
  exams: PlannedExam[]
}

export interface ExamSession {
  draft: ExamSessionDraft
  confirmed?: ConfirmedExamPlan
  attempts?: ExamAttempt[]
}

export type ExamOutcome = 'passed' | 'failed' | 'skipped' | 'pending'

export interface ExamAttempt {
  exam: PlannedExam
  status?: ExamOutcome
  updated?: string
  reviewOn?: string
}

export interface SessionArchive {
  version: 1
  revision: number
  sessions: ExamSession[]
  activeSessionId: string | null
  commands: string[]
}

export type SessionCommand = { commandId: string; baseRevision: number } & (
  { type: 'save'; draft: ExamSessionDraft } |
  { type: 'confirm'; sessionId: string; planId: string } |
  { type: 'switch-appointment'; sessionId: string; previousId: string; appointmentId: string } |
  { type: 'set-outcome'; sessionId: string; examId: string; examDate: string; outcome: ExamOutcome; retryDays?: number } |
  { type: 'defer-outcomes'; sessionId: string; examId?: string; examDate?: string }
)
export type SessionResult = { status: 'saved' | 'conflict'; archive: SessionArchive }
export interface SessionApi {
  state(): Promise<SessionArchive>
  apply(command: SessionCommand): Promise<SessionResult>
}

export const emptySessionArchive = (): SessionArchive => ({
  version: 1, revision: 0, sessions: [], activeSessionId: null, commands: []
})

type ExamSettings = Pick<AppSettings, 'courses' | 'courseConfigs' | 'archivedCourseCodes'>

export function activeExamSession(archive?: SessionArchive) {
  return archive?.sessions.find(item => item.draft.id === archive.activeSessionId)
}

export function legacyExamDates(settings: ExamSettings, code: string): NonNullable<ExamAppointment['original']>[] {
  const candidates = [
    { source: 'course' as const, date: settings.courses?.[code]?.examDate },
    { source: 'dashboard' as const, date: settings.courseConfigs?.[code]?.examDate }
  ]
  return candidates.flatMap(({ source, date }) => date && parseLocalCalendarDate(date) ? [{ source, date }] : [])
}

export function listSessionAppointments(draft: ExamSessionDraft) {
  return draft.courses.flatMap(course => course.paths.flatMap(path => path.steps.flatMap(step =>
    step.appointments.map(appointment => ({ course, path, step, appointment }))
  )))
}

export function passedExamSteps(session?: ExamSession): Set<string> {
  return new Set(session?.attempts?.filter(attempt => attempt.status === 'passed').map(attempt => attempt.exam.stepId))
}

export function dueExamAttempts(session: ExamSession | undefined, today: string): ExamAttempt[] {
  return (session?.attempts ?? []).filter(attempt =>
    attempt.exam.date < today && (!attempt.status || attempt.status === 'pending') &&
    (!attempt.reviewOn || attempt.reviewOn <= today))
    .sort((a, b) => a.exam.date.localeCompare(b.exam.date) || a.exam.id.localeCompare(b.exam.id))
}

export function collectPlanExams(draft: ExamSessionDraft, plan: ExamPlan, passed: ReadonlySet<string> = new Set()): PlannedExam[] {
  const choices = new Map(plan.choices.map(choice => [choice.course, choice]))
  return listSessionAppointments(draft).flatMap(({ course, path, step, appointment }) => {
    const choice = choices.get(course.code)
    return choice?.pathId === path.id && choice.appointments.includes(appointment.id) && !step.completed && !passed.has(step.id)
      ? [{ id: appointment.id, course: course.code, stepId: step.id, label: step.label,
        date: appointment.date, time: appointment.time }]
      : []
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.id.localeCompare(b.id))
}

/** Identify the exact definition that reached the consumer. Archived courses are hidden in active views. */
export function resolveExamTargets(archive: SessionArchive | undefined, settings: ExamSettings, today = formatLocalCalendarDate()): PlannedExam[] {
  const session = activeExamSession(archive)
  const confirmation = session?.confirmed
  const managed = new Set(confirmation?.courses ?? [])
  const hidden = new Set(settings.archivedCourseCodes ?? [])
  const codes = new Set([...Object.keys(settings.courses ?? {}), ...Object.keys(settings.courseConfigs ?? {})])
  const legacy = [...codes].flatMap(course => {
    if (managed.has(course) || hidden.has(course)) return []
    const date = legacyExamDates(settings, course)[0]?.date
    return date ? [{ id: 'legacy', course, stepId: 'legacy', label: 'Esame', date }] : []
  })
  const passed = passedExamSteps(session)
  const projected = (confirmation?.exams ?? []).flatMap(exam => {
    if (hidden.has(exam.course) || passed.has(exam.stepId)) return []
    const attempt = session?.attempts?.find(row => row.exam.id === exam.id && row.exam.date === exam.date)
    if (attempt?.status === 'failed' || attempt?.status === 'skipped') return []
    return [attempt && (attempt.status === 'pending' || exam.date < today) ? { ...exam, pending: true } : exam]
  })
  return [...legacy, ...projected]
    .sort((a, b) => a.date.localeCompare(b.date) || a.course.localeCompare(b.course))
}

export function planProblems(draft: ExamSessionDraft, plan: ExamPlan, passed: ReadonlySet<string> = new Set(),
  attempts: readonly ExamAttempt[] = [], today?: string): string[] {
  const choices = new Map(plan.choices.map(choice => [choice.course, choice]))
  const problems: string[] = []
  for (const course of draft.courses) {
    const choice = choices.get(course.code)
    if (!choice?.pathId) continue
    const path = course.paths.find(item => item.id === choice.pathId)
    if (!path || !path.steps.length) {
      problems.push(`${course.code}: scegli un percorso con almeno una prova.`)
      continue
    }
    let previous: ExamAppointment | undefined
    for (const step of path.steps) {
      if (step.completed || passed.has(step.id)) continue
      const matches = step.appointments.filter(appointment => choice.appointments.includes(appointment.id))
      if (matches.length !== 1) {
        problems.push(`${course.code}: scegli un appello per ${step.label}.`)
        continue
      }
      const current = matches[0]
      const attempt = attempts.find(row => row.exam.id === current.id && row.exam.date === current.date)
      if (attempt?.status === 'failed' || attempt?.status === 'skipped' || (today && current.date < today && !attempt))
        problems.push(`${course.code}: scegli un nuovo appello per ${step.label}.`)
      if (current.date < draft.start || current.date > draft.end) {
        problems.push(`${course.code}: ${step.label} è fuori dal periodo della sessione.`)
      }
      if (draft.unavailable.some(block => block.blocking && current.date >= block.start && current.date <= block.end)) {
        problems.push(`${course.code}: ${step.label} cade in una giornata indisponibile.`)
      }
      if (previous && (current.date < previous.date ||
        (current.date === previous.date && current.time && previous.time && current.time <= previous.time))) {
        problems.push(`${course.code}: controlla l’ordine di ${step.label}.`)
      }
      previous = current
    }
  }
  return problems
}
