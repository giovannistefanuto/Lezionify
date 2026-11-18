import { listSessionAppointments, type ExamAppointment, type ExamPlan, type ExamSessionDraft, type SessionCourse } from '../../../shared/sessione'

export const sessionId = () => crypto.randomUUID()

export function chooseAppointment(draft: ExamSessionDraft, plan: ExamPlan, id: string): ExamPlan {
  const match = listSessionAppointments(draft).find(row => row.appointment.id === id)
  if (!match) return plan
  const { course, path, step } = match
  const previous = plan.choices.find(choice => choice.course === course.code)
  const current = previous?.pathId === path.id ? previous.appointments : []
  const sameStep = new Set(step.appointments.map(appointment => appointment.id))
  const appointments = [...current.filter(appointment => !sameStep.has(appointment)), id]
  const locks = previous?.locks.filter(appointment => appointments.includes(appointment)) ?? []
  return {
    ...plan,
    choices: [...plan.choices.filter(choice => choice.course !== course.code),
      { course: course.code, pathId: path.id, appointments, locks }]
  }
}

export function replaceSessionCourse(draft: ExamSessionDraft, updated: SessionCourse): ExamSessionDraft {
  const paths = new Map(updated.paths.map(path => [path.id, new Set(path.steps.flatMap(step => step.appointments.map(row => row.id)))]))
  return {
    ...draft,
    courses: draft.courses.some(course => course.code === updated.code)
      ? draft.courses.map(course => course.code === updated.code ? updated : course)
      : [...draft.courses, updated],
    plans: draft.plans.map(plan => ({
      ...plan,
      choices: plan.choices.map(choice => {
        if (choice.course !== updated.code || !choice.pathId) return choice
        const remaining = paths.get(choice.pathId)
        const appointments = choice.appointments.filter(id => remaining?.has(id))
        return { ...choice, pathId: remaining ? choice.pathId : null, appointments,
          locks: choice.locks.filter(id => appointments.includes(id)) }
      })
    }))
  }
}

export function setExamAppointment(draft: ExamSessionDraft, appointment: ExamAppointment): ExamSessionDraft {
  return { ...draft, courses: draft.courses.map(course => ({ ...course,
    paths: course.paths.map(path => ({ ...path, steps: path.steps.map(step => ({
      ...step, appointments: step.appointments.map(row => row.id === appointment.id ? appointment : row)
    })) }))
  })) }
}
