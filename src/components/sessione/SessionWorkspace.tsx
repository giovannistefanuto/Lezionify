import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AppSettings } from '../../../shared/archive'
import { formatLocalCalendarDate } from '../../../shared/calendarDate'
import {
  collectPlanExams, listSessionAppointments, passedExamSteps, planProblems,
  type ExamAppointment, type ExamPlan, type ExamSessionDraft, type SessionArchive
} from '../../../shared/sessione'
import { AppointmentFields, SessionCourseEditor } from './SessionCourseEditor'
import { SessionSettingsForm } from './SessionSettingsForm'
import { SessionCalendar, type CalendarExam } from './SessionCalendar'
import { SessionDialog } from './SessionDialog'
import { shiftSessionMonth } from './sessionCalendarDates'
import { chooseAppointment, sessionId, setExamAppointment } from './editSessionDraft'
import { SessionOutcomes } from './SessionOutcomes'
import { SessionSpacing } from './SessionSpacing'
import type { SpacingRequest } from '../../../shared/sessionSpacing'

import type { SessionAction } from '../../hooks/useSessione'

type Panel =
  | { kind: 'setup' | 'newSession' | 'courses' | 'included' | 'confirm' | 'newPlan' | 'copy' | 'rename' | 'delete' }
  | { kind: 'course'; code: string }
  | { kind: 'exam'; id: string }
  | { kind: 'date'; appointment: ExamAppointment }
  | { kind: 'outcomes'; examId?: string }
  | { kind: 'spacing'; request: SpacingRequest; revision: number }

function SessionMenu({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (ref.current?.open && event.target instanceof Node && !ref.current.contains(event.target)) ref.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  return <details className="session-menu" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape' && ref.current?.open) {
      event.preventDefault()
      event.stopPropagation()
      ref.current.open = false
      ref.current.querySelector('summary')?.focus()
    }
  }}>
    <summary>{title}</summary>
    <div onClick={event => {
      if (event.target instanceof Element && event.target.closest('button') && ref.current) ref.current.open = false
    }}>{children}</div>
  </details>
}

function newDraft(today: string): ExamSessionDraft {
  const last = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) + 2, 0)
  return { id: sessionId(), name: 'Sessione', start: today, end: formatLocalCalendarDate(last),
    courses: [], plans: [{ id: sessionId(), name: 'Principale', choices: [] }], unavailable: [] }
}

function DateEditor({ initial, onSave, busy }: {
  initial: ExamAppointment
  onSave: (next: ExamAppointment) => Promise<boolean>
  busy: boolean
}) {
  const [value, set] = useState(initial)
  return <form className="session-form" onSubmit={event => { event.preventDefault(); void onSave(value) }}>
    <fieldset disabled={busy}><legend>Appello ufficiale</legend>
      <p>La nuova data vale per tutte le bozze che usano l’appello. Dashboard e promemoria cambiano alla prossima conferma.</p>
      <AppointmentFields item={value} onChange={set} />
      <button className="session-primary">Salva data</button>
    </fieldset>
  </form>
}

interface WorkspaceProps {
  archive: SessionArchive
  settings: AppSettings
  today: string
  busy: boolean
  error: string
  onApply: (action: SessionAction) => Promise<boolean>
}

export function SessionWorkspace({ archive, settings, today, busy, error, onApply }: WorkspaceProps) {
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [panel, setPanel] = useState<Panel>()
  const [editingInitial, setEditingInitial] = useState<ExamSessionDraft>()
  const [planName, setPlanName] = useState('')
  const session = archive.sessions.find(row => row.draft.id === (selectedSessionId || archive.activeSessionId)) ?? archive.sessions.at(-1)
  const draft = session?.draft
  const plan = draft?.plans.find(row => row.id === (selectedPlanId || session?.confirmed?.planId)) ?? draft?.plans[0]
  const archivedCodes = new Set(settings.archivedCourseCodes ?? [])
  const courseOptions = [...new Set([...Object.keys(settings.courses ?? {}), ...Object.keys(settings.courseConfigs ?? {}),
    ...(draft?.courses.map(course => course.code) ?? [])])].sort((a, b) => a.localeCompare(b, 'it'))
  const courseName = (code: string) => settings.courses?.[code]?.name || code
  const closePanel = () => setPanel(undefined)
  const save = async (next: ExamSessionDraft, close = true) => {
    if (!await onApply({ type: 'save', draft: next })) return false
    if (close) closePanel()
    return true
  }
  const create = () => {
    setEditingInitial(newDraft(today))
    setPanel({ kind: 'newSession' })
  }

  if (!draft || !plan) return <>
    <div className="session-empty">
      <p>Imposta il periodo e aggiungi gli appelli dei tuoi corsi.</p>
      <button type="button" className="session-primary" onClick={create}>Crea sessione</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {panel && editingInitial && <SessionDialog title="Nuova sessione" onClose={closePanel}>
      {error && <p role="alert">{error}</p>}
      <SessionSettingsForm initial={editingInitial} onSave={next => save(next)} busy={busy} />
    </SessionDialog>}
  </>

  const selected = new Set(plan.choices.flatMap(choice => choice.appointments))
  const passed = passedExamSteps(session)
  const choices = collectPlanExams(draft, plan, passed)
  const problems = planProblems(draft, plan, passed, session?.attempts, today)
  const oldExams = (session?.confirmed?.exams ?? []).filter(exam => !passed.has(exam.stepId))
  const isConfirmed = archive.activeSessionId === draft.id && session?.confirmed?.planId === plan.id
  const changed = JSON.stringify(choices) !== JSON.stringify(oldExams) ||
    JSON.stringify(draft.courses.map(course => course.code)) !== JSON.stringify(session?.confirmed?.courses)
  const canConfirm = !isConfirmed || changed || session?.confirmed?.name !== plan.name
  const rows = listSessionAppointments(draft)
  const attempts = session?.attempts ?? []
  const exams: CalendarExam[] = rows.map(({ course, step, appointment }) => {
    const attempt = attempts.find(row => row.exam.id === appointment.id && row.exam.date === appointment.date)
    const taken = attempt?.status === 'passed' || attempt?.status === 'failed' || attempt?.status === 'pending'
    return {
      id: appointment.id, date: appointment.date, course: courseName(course.code), code: course.code,
      color: settings.courses?.[course.code]?.color,
      label: step.label + (appointment.number ? ` · Appello ${appointment.number}` : ''),
      status: taken ? 'taken' : selected.has(appointment.id) ? 'chosen' : 'alternative',
      pending: selected.has(appointment.id) && (attempt?.status === 'pending' || Boolean(attempt && !attempt.status && appointment.date < today))
    }
  })
  const updatePlan = (next: ExamPlan, close = false) => save({ ...draft,
    plans: draft.plans.map(row => row.id === plan.id ? next : row) }, close)
  const selectPath = (code: string, pathId: string | null) => {
    const previous = plan.choices.find(choice => choice.course === code)
    if (previous?.pathId === pathId) return
    void updatePlan({ ...plan, choices: [...plan.choices.filter(choice => choice.course !== code),
      { course: code, pathId, appointments: [], locks: [] }] })
  }
  const startPlan = (kind: 'newPlan' | 'copy' | 'rename') => {
    setPlanName(kind === 'newPlan' ? '' : kind === 'copy' ? `Copia di ${plan.name}`.slice(0, 100) : plan.name)
    setPanel({ kind })
  }

  let dialog: ReactNode
  let title = ''
  if (panel?.kind === 'setup' || panel?.kind === 'newSession') {
    title = panel.kind === 'setup' ? 'Periodo della sessione' : 'Nuova sessione'
    dialog = <SessionSettingsForm initial={(panel.kind === 'setup' ? draft : editingInitial) ?? draft} busy={busy}
      onSave={async next => {
        if (!await save(next)) return false
        setSelectedSessionId(next.id)
        setSelectedPlanId('')
        return true
      }} />
  } else if (panel?.kind === 'courses') {
    title = 'Appelli dei corsi'
    dialog = <div className="session-form">
      {courseOptions.length === 0 && <p>Aggiungi un corso in Gestione corsi per configurarne gli appelli.</p>}
      {courseOptions.map(code => <button key={code} type="button" onClick={() => setPanel({ kind: 'course', code })}>
        {courseName(code)}{archivedCodes.has(code) ? ' (archiviato)' : ''}</button>)}
    </div>
  } else if (panel?.kind === 'course') {
    title = 'Date e prove'
    dialog = <SessionCourseEditor key={panel.code} draft={draft} settings={settings} courseCode={panel.code}
      onSave={next => save(next)} busy={busy} />
  } else if (panel?.kind === 'included') {
    title = 'Corsi nel piano'
    dialog = <div className="session-form">
      {!draft.courses.length && <p>Aggiungi gli appelli di un corso per includerlo nel piano.</p>}
      {draft.courses.map(course => <label key={course.code}>{courseName(course.code)}
        <select disabled={busy} value={plan.choices.find(choice => choice.course === course.code)?.pathId ?? ''}
          onChange={event => selectPath(course.code, event.target.value || null)}>
          <option value="">Rimanda il corso</option>
          {course.paths.map(path => <option value={path.id} key={path.id}>{path.name}</option>)}
        </select>
      </label>)}
      {problems.length > 0 && <ul>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
    </div>
  } else if (panel?.kind === 'confirm') {
    title = 'Conferma piano'
    const additions = choices.filter(exam => !oldExams.some(old => old.id === exam.id && old.date === exam.date && old.time === exam.time))
    const removals = oldExams.filter(exam => !choices.some(next => next.id === exam.id && next.date === exam.date && next.time === exam.time))
    dialog = <div className="session-form">
      <p>Dashboard e promemoria useranno le date del piano {plan.name}.</p>
      {!choices.length && <p>Il piano non contiene prove da sostenere.</p>}
      {removals.map(row => <p key={row.id}>Rimuovi — {courseName(row.course)} · {row.date}</p>)}
      {additions.map(row => <p key={row.id}>Aggiungi — {courseName(row.course)} · {row.label} · {row.date}</p>)}
      {problems.length > 0 && <ul>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
      <button type="button" className="session-primary" disabled={busy || problems.length > 0} onClick={() => {
        void onApply({ type: 'confirm', sessionId: draft.id, planId: plan.id }).then(success => { if (success) closePanel() })
      }}>Conferma e aggiorna</button>
    </div>
  } else if (panel?.kind === 'newPlan' || panel?.kind === 'copy' || panel?.kind === 'rename') {
    title = panel.kind === 'newPlan' ? 'Nuovo piano' : panel.kind === 'copy' ? 'Duplica piano' : 'Rinomina piano'
    const kind = panel.kind
    dialog = <form className="session-form" onSubmit={event => {
      event.preventDefault()
      const name = planName.trim()
      if (!name) return
      if (kind === 'rename') { void updatePlan({ ...plan, name }, true); return }
      const next = { id: sessionId(), name, choices: kind === 'copy' ? plan.choices : [] }
      void save({ ...draft, plans: [...draft.plans, next] }).then(success => {
        if (success) setSelectedPlanId(next.id)
      })
    }}>
      <label>Nome <input required maxLength={100} value={planName} onChange={event => setPlanName(event.target.value)} /></label>
      <button className="session-primary" disabled={busy || !planName.trim()}>Salva piano</button>
    </form>
  } else if (panel?.kind === 'delete') {
    title = 'Elimina piano'
    dialog = <div className="session-form"><p>Eliminare il piano {plan.name}?</p>
      <button type="button" disabled={busy || draft.plans.length < 2 || session?.confirmed?.planId === plan.id}
        onClick={() => void save({ ...draft, plans: draft.plans.filter(row => row.id !== plan.id) })}>Elimina piano</button>
    </div>
  } else if (panel?.kind === 'exam') {
    const row = rows.find(item => item.appointment.id === panel.id)
    const exam = exams.find(item => item.id === panel.id)
    if (row && exam) {
      const choice = plan.choices.find(item => item.course === row.course.code)
      const locked = choice?.locks.includes(exam.id)
      const collision = exams.some(item => item.id !== exam.id && item.date === exam.date)
      title = exam.course
      dialog = <div className="session-form">
        <p>{exam.label} · {exam.date}{row.appointment.time ? ` · ${row.appointment.time}` : ''}</p>
        {row.appointment.note && <p>{row.appointment.note}</p>}
        {choice?.pathId && choice.pathId !== row.path.id && <p>La scelta cambia il percorso del corso in {row.path.name}.</p>}
        {collision && <p>Altre prove sono previste lo stesso giorno. Controlla gli orari.</p>}
        {locked && <p>Data mantenuta fissa nella proposta di spaziatura.</p>}
        <div className="session-actions">
          <SessionMenu title="Azioni">
            {!selected.has(exam.id) && !row.step.completed && !passed.has(row.step.id) && exam.date >= today && <button type="button" disabled={busy}
              onClick={() => void updatePlan(chooseAppointment(draft, plan, exam.id), true)}>Scegli appello</button>}
            {choice && selected.has(exam.id) && <>
              <button type="button" disabled={busy} onClick={() => void updatePlan({ ...plan, choices: plan.choices.map(item =>
                item === choice ? { ...item, locks: locked ? item.locks.filter(id => id !== exam.id) : [...item.locks, exam.id] } : item) })}>
                {locked ? 'Sblocca data' : 'Blocca data'}
              </button>
              <button type="button" disabled={busy} onClick={() => void updatePlan({ ...plan, choices: plan.choices.map(item =>
                item === choice ? { ...item, appointments: item.appointments.filter(id => id !== exam.id), locks: item.locks.filter(id => id !== exam.id) } : item) }, true)}>Togli dal piano</button>
            </>}
            <button type="button" onClick={() => setPanel({ kind: 'date', appointment: row.appointment })}>Modifica data ufficiale</button>
            {attempts.some(attempt => attempt.exam.id === exam.id) &&
              <button type="button" onClick={() => setPanel({ kind: 'outcomes', examId: exam.id })}>Aggiorna esito</button>}
          </SessionMenu>
        </div>
      </div>
    }
  } else if (panel?.kind === 'date') {
    title = 'Modifica data ufficiale'
    dialog = <DateEditor initial={panel.appointment} busy={busy} onSave={next => save(setExamAppointment(draft, next))} />
  } else if (panel?.kind === 'outcomes' && session) {
    title = 'Esiti degli esami'
    dialog = <SessionOutcomes session={session} today={today} busy={busy} apply={onApply} examId={panel.examId} onDone={closePanel} />
  } else if (panel?.kind === 'spacing' && session) {
    title = 'Distanza gli esami'
    const fresh = panel.revision === archive.revision && panel.request.today === today
    dialog = fresh ? <SessionSpacing request={panel.request} nameOf={courseName} onCancel={closePanel}
      busy={busy} onApply={(proposal, copy) => {
        if (!fresh) return
        if (copy) {
          const next = { id: sessionId(), name: `Proposta · ${plan.name}`.slice(0, 100), choices: proposal.choices }
          void save({ ...draft, plans: [...draft.plans, next] }).then(success => {
            if (success) setSelectedPlanId(next.id)
          })
        } else void updatePlan({ ...plan, choices: proposal.choices }, true)
      }} /> : <div className="session-form">
        <p role="alert">Le date, gli esiti o il piano sono cambiati. Calcola una nuova proposta.</p>
        <button type="button" onClick={() => setPanel({ kind: 'spacing', request: { session, plan, today }, revision: archive.revision })}>Ricalcola</button>
        <button type="button" onClick={closePanel}>Annulla</button>
      </div>
  }

  const initialMonth = draft.end < today ? shiftSessionMonth(draft.start, 0) : shiftSessionMonth(today, 0)
  return <>
    <SessionCalendar key={draft.id} today={today} initialMonth={initialMonth} exams={exams}
      onExam={id => setPanel({ kind: 'exam', id })}
      header={<>
        <h3 className="session-name">{draft.name}</h3>
        <div className="session-actions">
          {archive.sessions.length > 1 && <select aria-label="Sessione visualizzata" value={draft.id} onChange={event => {
            setSelectedSessionId(event.target.value); setSelectedPlanId('')
          }}>
            {archive.sessions.map(row => <option key={row.draft.id} value={row.draft.id}>{row.draft.name}</option>)}
          </select>}
          <select aria-label="Piano visualizzato" value={plan.id} onChange={event => setSelectedPlanId(event.target.value)}>
            {draft.plans.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <span role="status">{busy ? 'Salvataggio…' : isConfirmed ? canConfirm ? 'Bozza da confermare' : 'Piano confermato' : 'Piano alternativo'}</span>
          <SessionMenu title="Esami">
            <button type="button" onClick={() => setPanel({ kind: 'courses' })}>Aggiungi o modifica appelli</button>
            <button type="button" onClick={() => setPanel({ kind: 'included' })}>Gestisci corsi nel piano</button>
            <button type="button" onClick={() => setPanel({ kind: 'outcomes' })}>Aggiorna esiti</button>
          </SessionMenu>
          <SessionMenu title="Piano">
            {session && <button type="button" disabled={busy} onClick={() =>
              setPanel({ kind: 'spacing', request: { session, plan, today }, revision: archive.revision })}>Distanza gli esami</button>}
            <button type="button" onClick={() => startPlan('newPlan')}>Nuovo piano</button>
            <button type="button" onClick={() => startPlan('copy')}>Duplica piano</button>
            <button type="button" onClick={() => startPlan('rename')}>Rinomina piano</button>
            <button type="button" disabled={draft.plans.length < 2 || session?.confirmed?.planId === plan.id}
              onClick={() => setPanel({ kind: 'delete' })}>Elimina piano</button>
            <button type="button" onClick={() => setPanel({ kind: 'setup' })}>Periodo e indisponibilità</button>
            <button type="button" onClick={create}>Nuova sessione</button>
          </SessionMenu>
          {canConfirm && <button type="button" className="session-primary" disabled={busy} onClick={() => setPanel({ kind: 'confirm' })}>Conferma piano</button>}
        </div>
        {error && <p className="session-error" role="alert">{error}</p>}
      </>} />
    {dialog && <SessionDialog title={title} onClose={closePanel}>
      {error && <p className="session-error" role="alert">{error}</p>}
      {dialog}
    </SessionDialog>}
  </>
}
