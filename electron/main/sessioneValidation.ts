import { parseLocalCalendarDate } from '../../shared/calendarDate'
import type { ConfirmedExamPlan, ExamSessionDraft, SessionArchive, SessionCommand } from '../../shared/sessione'

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max && Boolean(value.trim())
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const day = (value: unknown): value is string => typeof value === 'string' && Boolean(parseLocalCalendarDate(value))
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
const time = (value: unknown) => value === undefined || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
const number = (value: unknown) => value === undefined || integer(value, 1, 99)
function array<T>(value: unknown, limit: number, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.length <= limit && value.every(guard)
}
function rows(value: unknown, limit: number): value is Record<string, unknown>[] {
  return array(value, limit, object)
}
const unique = (values: readonly unknown[]) => new Set(values).size === values.length

export function validSessionDraft(value: unknown): value is ExamSessionDraft {
  if (!object(value) || !id(value.id) || !str(value.name, 100) || !day(value.start) || !day(value.end) ||
      value.start > value.end || !rows(value.courses, 80) || !rows(value.plans, 60) ||
      !rows(value.unavailable, 200) || !unique(value.courses.map(course => course.code)) ||
      !unique(value.plans.map(plan => plan.id)) || !unique(value.unavailable.map(block => block.id))) return false

  const ids = new Set<string>()
  const add = (entry: unknown): entry is string => {
    if (!id(entry) || ids.has(entry)) return false
    ids.add(entry)
    return ids.size <= 3500
  }
  const paths = new Map<string, Map<string, string>>()
  const coursePaths = new Map<string, Set<string>>()
  for (const course of value.courses) {
    if (!str(course.code, 200) || !rows(course.paths, 12)) return false
    const ownedPaths = new Set<string>()
    coursePaths.set(course.code, ownedPaths)
    for (const path of course.paths) {
      if (!add(path.id) || !['total', 'partial', 'unclassified'].includes(String(path.kind)) ||
          !str(path.name, 100) || !rows(path.steps, 20) || (path.kind === 'total' && path.steps.length > 1)) return false
      ownedPaths.add(path.id)
      const appointments = new Map<string, string>()
      paths.set(path.id, appointments)
      for (const step of path.steps) {
        if (!add(step.id) || !str(step.label, 120) || !number(step.number) ||
            typeof step.completed !== 'boolean' || !rows(step.appointments, 40) ||
            !unique(step.appointments.map(row => [row.date, row.time ?? '', row.number ?? ''].join('|')))) return false
        for (const appointment of step.appointments) {
          if (!add(appointment.id) || !day(appointment.date) || !number(appointment.number) || !time(appointment.time) ||
              (appointment.note !== undefined && !str(appointment.note, 800))) return false
          const original = appointment.original
          if (original !== undefined && (!object(original) || !day(original.date) ||
              (original.source !== 'course' && original.source !== 'dashboard'))) return false
          appointments.set(appointment.id, step.id)
        }
      }
    }
  }

  for (const plan of value.plans) {
    if (!id(plan.id) || !str(plan.name, 100) || !rows(plan.choices, 80) ||
        !unique(plan.choices.map(choice => choice.course))) return false
    for (const choice of plan.choices) {
      if (!str(choice.course, 200) || !coursePaths.has(choice.course) ||
          !array(choice.appointments, 20, id) || !array(choice.locks, 20, id) ||
          !unique(choice.appointments) || !unique(choice.locks) ||
          !choice.locks.every(lock => (choice.appointments as string[]).includes(lock))) return false
      if (choice.pathId === null) {
        if (choice.appointments.length) return false
        continue
      }
      if (!id(choice.pathId) || !coursePaths.get(choice.course)?.has(choice.pathId)) return false
      const options = paths.get(choice.pathId)!
      if (!choice.appointments.every(option => options.has(option)) ||
          !unique(choice.appointments.map(option => options.get(option)))) return false
    }
  }

  return value.unavailable.every(block => id(block.id) && day(block.start) && day(block.end) &&
    block.start <= block.end && typeof block.blocking === 'boolean' && (block.label === undefined || str(block.label, 150)))
}

function validConfirmed(value: unknown): value is ConfirmedExamPlan {
  return object(value) && id(value.planId) && str(value.name, 100) && integer(value.revision, 1) &&
    array(value.courses, 80, (course): course is string => str(course, 200)) && unique(value.courses) &&
    rows(value.exams, 1600) && unique(value.exams.map(exam => exam.id)) &&
    value.exams.every(exam => id(exam.id) && id(exam.stepId) && str(exam.course, 200) &&
      (value.courses as string[]).includes(exam.course) && str(exam.label, 120) && day(exam.date) && time(exam.time))
}

export function validSessionArchive(value: unknown): value is SessionArchive {
  return object(value) && value.version === 1 && integer(value.revision) && array(value.commands, 125, id) &&
    unique(value.commands) && rows(value.sessions, 100) &&
    value.sessions.every(session => validSessionDraft(session.draft) &&
      (session.confirmed === undefined || (validConfirmed(session.confirmed) &&
        session.draft.plans.some(plan => plan.id === (session.confirmed as ConfirmedExamPlan).planId)))) &&
    unique(value.sessions.map(session => (session.draft as ExamSessionDraft).id)) &&
    (value.activeSessionId === null || (id(value.activeSessionId) &&
      value.sessions.some(session => (session.draft as ExamSessionDraft).id === value.activeSessionId && session.confirmed)))
}

export function validSessionCommand(value: unknown): value is SessionCommand {
  return object(value) && id(value.commandId) && integer(value.baseRevision) &&
    (value.type === 'save' ? validSessionDraft(value.draft) :
      value.type === 'confirm' && id(value.sessionId) && id(value.planId))
}
