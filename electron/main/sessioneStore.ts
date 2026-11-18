import { mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { atomicWrite } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { addCalendarDays, formatLocalCalendarDate } from '../../shared/calendarDate'
import { activeExamSession, collectPlanExams, dueExamAttempts, emptySessionArchive, listSessionAppointments,
  passedExamSteps, planProblems, type SessionArchive, type SessionCommand, type SessionResult } from '../../shared/sessione'
import { validSessionArchive, validSessionCommand } from './sessioneValidation'

export class SessionStore {
  private readonly mutex = new AsyncMutex()

  constructor(
    private readonly file: string,
    private readonly write = (path: string, content: string) => atomicWrite(path, content, undefined, validSessionArchive),
    private readonly today = formatLocalCalendarDate
  ) {}

  private async read(file: string): Promise<SessionArchive> {
    const raw = await readFile(file, 'utf8')
    const data: unknown = JSON.parse(raw)
    if (!validSessionArchive(data)) throw new SyntaxError('Archivio Sessione non valido.')
    return data
  }

  private async load(): Promise<SessionArchive> {
    try {
      return await this.read(this.file)
    } catch (primary) {
      const missing = (primary as NodeJS.ErrnoException).code === 'ENOENT'
      if (!missing && !(primary instanceof SyntaxError)) throw primary
      try {
        return await this.read(`${this.file}.bak`)
      } catch (backup) {
        if (missing && (backup as NodeJS.ErrnoException).code === 'ENOENT') return emptySessionArchive()
        throw new Error('Archivio Sessione illeggibile. Ripristina una copia valida.')
      }
    }
  }

  state(): Promise<SessionArchive> {
    return this.mutex.runExclusive(async () => {
      const archive = await this.load()
      materializeAttempts(archive, this.today())
      return archive
    })
  }

  async apply(input: unknown): Promise<SessionResult> {
    if (!validSessionCommand(input)) throw new Error('Dati Sessione non validi.')
    return this.mutex.runExclusive(async () => {
      const archive = await this.load()
      const today = this.today()
      materializeAttempts(archive, today)
      if (archive.commands.includes(input.commandId)) return { status: 'saved', archive }
      if (input.baseRevision !== archive.revision) return { status: 'conflict', archive }
      const revision = archive.revision + 1

      if (input.type === 'save') {
        const existing = archive.sessions.find(item => item.draft.id === input.draft.id)
        if (existing) {
          if (existing.confirmed && !input.draft.plans.some(plan => plan.id === existing.confirmed!.planId))
            throw new Error('Il piano confermato deve essere conservato.')
          existing.draft = input.draft
        } else {
          archive.sessions.push({ draft: input.draft })
        }
      } else if (input.type === 'confirm') {
        const session = archive.sessions.find(item => item.draft.id === input.sessionId)
        const plan = session?.draft.plans.find(item => item.id === input.planId)
        if (!session || !plan) throw new Error('Piano Sessione non trovato.')
        const passed = passedExamSteps(session)
        const errors = planProblems(session.draft, plan, passed, session.attempts, today)
        if (errors.length) throw new Error(errors[0])
        session.confirmed = {
          planId: plan.id, name: plan.name, revision,
          courses: session.draft.courses.map(course => course.code),
          exams: collectPlanExams(session.draft, plan, passed)
        }
        archive.activeSessionId = session.draft.id
        materializeAttempts(archive, today)
      } else if (input.type === 'switch-appointment') {
        switchConfirmedAppointment(archive, input, revision, today)
        materializeAttempts(archive, today)
      } else {
        updateExamAttempts(archive, input, today)
      }

      archive.revision = revision
      archive.commands = [...archive.commands.slice(-124), input.commandId]
      if (!validSessionArchive(archive)) throw new Error('Limite dell’archivio Sessione superato.')
      await mkdir(dirname(this.file), { recursive: true })
      await this.write(this.file, JSON.stringify(archive))
      return { status: 'saved', archive }
    })
  }

  async renameCourse(before: string, after: string): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const archive = await this.load()
      const affected = archive.sessions.filter(session =>
        session.draft.courses.some(course => course.code === before) || session.confirmed?.courses.includes(before) ||
        session.attempts?.some(attempt => attempt.exam.course === before))
      if (!affected.length) return
      for (const { draft, confirmed, attempts } of affected) {
        if (draft.courses.some(course => course.code === before) && draft.courses.some(course => course.code === after))
          throw new Error('La sessione contiene entrambi i corsi. Risolvi i relativi appelli prima di unire i corsi.')
        for (const course of draft.courses) if (course.code === before) course.code = after
        for (const plan of draft.plans) for (const choice of plan.choices) if (choice.course === before) choice.course = after
        if (confirmed) {
          confirmed.courses = [...new Set(confirmed.courses.map(course => course === before ? after : course))]
          for (const exam of confirmed.exams) if (exam.course === before) exam.course = after
        }
        for (const attempt of attempts ?? [])
          if (attempt.exam.course === before) attempt.exam.course = after
      }
      archive.revision++
      if (!validSessionArchive(archive)) throw new Error('Dati Sessione non validi dopo la rinomina.')
      await this.write(this.file, JSON.stringify(archive))
    })
  }
}

function materializeAttempts(archive: SessionArchive, today: string) {
  const session = activeExamSession(archive)
  if (!session?.confirmed) return
  for (const exam of session.confirmed.exams) {
    if (exam.date > today) continue
    const attempts = session.attempts ??= []
    if (!attempts.some(row => row.exam.id === exam.id && row.exam.date === exam.date)) attempts.push({ exam: { ...exam } })
  }
}

function updateExamAttempts(archive: SessionArchive,
  input: Extract<SessionCommand, { type: 'set-outcome' | 'defer-outcomes' }>, today: string) {
  const session = archive.sessions.find(item => item.draft.id === input.sessionId)
  const attempt = session?.attempts?.find(item => item.exam.id === input.examId && item.exam.date === input.examDate)
  if (input.type === 'defer-outcomes') {
    const due = input.examId ? attempt ? [attempt] : [] : dueExamAttempts(session, today)
    for (const exam of due) if (!exam.status || exam.status === 'pending') exam.reviewOn = addCalendarDays(today, 1)
    return
  }
  if (!attempt || attempt.exam.date > today) throw new Error('Tentativo non trovato.')
  attempt.status = input.outcome
  attempt.updated = today
  attempt.reviewOn = input.outcome === 'pending' ? addCalendarDays(today, input.retryDays ?? 3) : undefined
}

function switchConfirmedAppointment(
  archive: SessionArchive,
  input: Extract<SessionCommand, { type: 'switch-appointment' }>,
  revision: number,
  today: string
) {
  const session = activeExamSession(archive)
  const confirmed = session?.confirmed
  if (!session || !confirmed || session.draft.id !== input.sessionId) throw new Error('Il piano attivo è cambiato.')
  const previous = confirmed.exams.find(exam => exam.id === input.previousId)
  const next = listSessionAppointments(session.draft).find(row => row.appointment.id === input.appointmentId)
  if (!previous || !next || previous.course !== next.course.code || previous.stepId !== next.step.id ||
      previous.date < today || next.step.completed || passedExamSteps(session).has(next.step.id) || next.appointment.date < today ||
      next.appointment.date < session.draft.start || next.appointment.date > session.draft.end ||
      session.draft.unavailable.some(block => block.blocking && next.appointment.date >= block.start && next.appointment.date <= block.end))
    throw new Error('L’appello non è disponibile per questa prova.')

  const order = next.path.steps.map(step => step.id)
  const index = order.indexOf(next.step.id)
  const date = next.appointment.date
  const time = next.appointment.time
  if (confirmed.exams.some(exam => {
    if (exam.course !== previous.course || exam.stepId === previous.stepId) return false
    const other = order.indexOf(exam.stepId)
    const compare = date.localeCompare(exam.date) || (time && exam.time ? time.localeCompare(exam.time) : 0)
    return other >= 0 && ((other < index && compare < 0) || (other > index && compare > 0))
  })) throw new Error('Il nuovo appello non rispetta l’ordine delle prove del piano.')

  confirmed.exams = confirmed.exams.map(exam => exam.id === previous.id
    ? { ...exam, id: next.appointment.id, label: next.step.label, date, time }
    : exam)
  confirmed.revision = revision
  const plan = session.draft.plans.find(plan => plan.id === confirmed.planId)
  const choice = plan?.choices.find(row => row.course === previous.course && row.pathId === next.path.id)
  if (choice?.appointments.includes(previous.id)) {
    choice.appointments = choice.appointments.map(id => id === previous.id ? next.appointment.id : id)
    choice.locks = choice.locks.map(id => id === previous.id ? next.appointment.id : id)
  }
}
