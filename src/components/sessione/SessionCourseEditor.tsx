import { useUpdateSave } from '../../hooks/useUpdateSave'
import { useState } from 'react'
import type { AppSettings } from '../../../shared/archive'
import { legacyExamDates, type ConfirmedExamPlan, type ExamAppointment, type ExamPath, type ExamSessionDraft, type ExamStep } from '../../../shared/sessione'
import { replaceSessionCourse, sessionId } from './editSessionDraft'

export function AppointmentFields({ item, onChange }: { item: ExamAppointment; onChange: (next: ExamAppointment) => void }) {
  return <>
    <label>Data <input type="date" required value={item.date} onChange={event => onChange({ ...item, date: event.target.value })} /></label>
    <label>N. appello <input type="number" min="1" max="99" value={item.number ?? ''} onChange={event =>
      onChange({ ...item, number: event.target.value ? event.target.valueAsNumber : undefined })} /></label>
    <label>Ora <input type="time" value={item.time ?? ''} onChange={event => onChange({ ...item, time: event.target.value || undefined })} /></label>
    <label>Nota <input maxLength={800} value={item.note ?? ''} onChange={event => onChange({ ...item, note: event.target.value || undefined })} /></label>
  </>
}

interface Props {
  draft: ExamSessionDraft
  courseCode: string
  settings: AppSettings
  onSave: (draft: ExamSessionDraft) => Promise<boolean>
  busy: boolean
  confirmed?: ConfirmedExamPlan
}

export function SessionCourseEditor({ draft, courseCode, settings, onSave, busy, confirmed }: Props) {
  const draftKey = 'lezionify:session-course-draft:' + draft.id + ':' + courseCode
  const [course, setCourse] = useState(() => {
    const fallback = draft.courses.find(row => row.code === courseCode) ?? { code: courseCode, paths: [] }
    try { const saved = JSON.parse(localStorage.getItem(draftKey) || 'null'); return saved?.code === courseCode && Array.isArray(saved.paths) ? saved as typeof fallback : fallback } catch { return fallback }
  })
  useUpdateSave(async () => { localStorage.setItem(draftKey, JSON.stringify(course)) })
  const [allowRemoval, setAllowRemoval] = useState(false)
  const updatePath = (updated: ExamPath) => setCourse(previous => ({ ...previous, paths: previous.paths.map(path => path.id === updated.id ? updated : path) }))
  const updateStep = (path: ExamPath, step: ExamStep) => updatePath({ ...path, steps: path.steps.map(row => row.id === step.id ? step : row) })
  const next = replaceSessionCourse(draft, course)
  const affected = draft.plans.filter((plan, index) => JSON.stringify(plan.choices) !== JSON.stringify(next.plans[index].choices))
  const sources = legacyExamDates(settings, courseCode)
  const allAppointments = course.paths.flatMap(path => path.steps.flatMap(step => step.appointments))
  const priorIds = new Set(draft.courses.find(row => row.code === courseCode)?.paths
    .flatMap(path => path.steps.flatMap(step => step.appointments.map(row => row.id))))
  const affectedConfirmed = confirmed?.exams.some(exam => exam.course === courseCode &&
    priorIds.has(exam.id) && !allAppointments.some(appointment => appointment.id === exam.id))
  const requiresConsent = affected.length > 0 || affectedConfirmed
  const imported = new Set(allAppointments.map(row => row.original?.date))
  const conflict = new Set(sources.map(source => source.date)).size > 1
  const sameDate = course.paths.some(path => path.steps.some(step => {
    const dates = step.appointments.filter(row => row.date).map(row => [row.date, row.time ?? '', row.number ?? ''].join('|'))
    return new Set(dates).size !== dates.length
  }))
  const addPath = (kind: 'total' | 'partial') => {
    const name = kind === 'total' ? 'Totale' : 'Parziali'
    const step = { id: sessionId(), label: kind === 'total' ? 'Esame totale' : 'Parziale', completed: false, appointments: [] }
    setCourse(previous => ({ ...previous, paths: [...previous.paths, { id: sessionId(), kind, name, steps: [step] }] }))
  }

  function importDate(source: NonNullable<ExamAppointment['original']>) {
    const existing = course.paths.find(path => path.kind === 'unclassified')
    const appointment: ExamAppointment = { id: sessionId(), date: source.date, original: source }
    if (existing) {
      const step = existing.steps[0]
      updateStep(existing, { ...step, appointments: [...step.appointments, appointment] })
    } else {
      setCourse(previous => ({ ...previous, paths: [...previous.paths, {
        id: sessionId(), kind: 'unclassified', name: 'Data precedente',
        steps: [{ id: sessionId(), label: 'Esame', completed: false, appointments: [appointment] }]
      }] }))
    }
  }

  return <form className="session-form" onSubmit={event => { event.preventDefault(); void onSave(next).then(saved => { if (saved) localStorage.removeItem(draftKey) }) }}>
    <fieldset disabled={busy}>
      <legend>{settings.courses?.[courseCode]?.name || courseCode}</legend>
      {sources.length > 0 && <div className="session-actions">
        {conflict && <p role="status">Gestione corsi e Dashboard contengono date diverse. Puoi conservare entrambe le alternative.</p>}
        {sources.map(source => <button type="button" key={source.source} disabled={imported.has(source.date)}
          onClick={() => importDate(source)}>Importa {source.date} da {source.source === 'course' ? 'Gestione corsi' : 'Dashboard'}</button>)}
      </div>}
      {course.paths.map(path => <fieldset key={path.id}>
        <legend>{path.kind === 'total' ? 'Totale' : path.kind === 'partial' ? 'Parziali' : 'Data precedente'}</legend>
        <div className="session-actions">
          <label>Nome percorso <input required maxLength={100} value={path.name} onChange={event => updatePath({ ...path, name: event.target.value })} /></label>
          <button type="button" onClick={() => setCourse({ ...course, paths: course.paths.filter(row => row.id !== path.id) })}>Rimuovi percorso</button>
        </div>
        {path.steps.map((step, index) => <fieldset key={step.id}>
          <legend>{step.label || `Prova ${index + 1}`}</legend>
          <div className="session-actions">
            <label>Nome prova <input required maxLength={120} value={step.label} onChange={event => updateStep(path, { ...step, label: event.target.value })} /></label>
            {path.kind === 'partial' && <label>N. parziale <input type="number" min="1" max="99" value={step.number ?? ''} onChange={event =>
              updateStep(path, { ...step, number: event.target.value ? event.target.valueAsNumber : undefined })} /></label>}
            <label><input type="checkbox" checked={step.completed} onChange={event => updateStep(path, { ...step, completed: event.target.checked })} /> Già superato</label>
            {path.kind === 'partial' && <>
              <button type="button" disabled={index === 0} onClick={() => {
                const steps = [...path.steps]
                ;[steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]
                updatePath({ ...path, steps })
              }}>Anticipa nell’ordine</button>
              <button type="button" onClick={() => updatePath({ ...path, steps: path.steps.filter(row => row.id !== step.id) })}>Rimuovi prova</button>
            </>}
          </div>
          {step.appointments.map((item, i) => <fieldset className="session-appointment-row" key={item.id}>
            <legend>Data {i + 1}</legend>
            <AppointmentFields item={item} onChange={updated => updateStep(path, { ...step, appointments: step.appointments.map(row => row.id === item.id ? updated : row) })} />
            <button type="button" onClick={() => updateStep(path, { ...step, appointments: step.appointments.filter(row => row.id !== item.id) })}>Rimuovi data</button>
          </fieldset>)}
          <button type="button" onClick={() => updateStep(path, { ...step, appointments: [...step.appointments, { id: sessionId(), date: '' }] })}>Aggiungi data</button>
        </fieldset>)}
        {path.kind === 'partial' && <button type="button" onClick={() => updatePath({ ...path, steps: [...path.steps,
          { id: sessionId(), label: 'Parziale', completed: false, appointments: [] }] })}>Aggiungi parziale</button>}
      </fieldset>)}
      <div className="session-actions">
        <button type="button" onClick={() => addPath('total')}>Aggiungi percorso totale</button>
        <button type="button" onClick={() => addPath('partial')}>Aggiungi percorso a parziali</button>
      </div>
      {sameDate && <p role="alert">Rimuovi le date duplicate per la stessa prova.</p>}
      {requiresConsent && <label>
        <input type="checkbox" checked={allowRemoval} onChange={event => setAllowRemoval(event.target.checked)} />
        {affected.length > 0 ? `Rimuovi i riferimenti nelle bozze: ${affected.map(plan => plan.name).join(', ')}. ` : ''}
        {affectedConfirmed ? `Il piano confermato «${confirmed?.name}» conserva queste date fino alla prossima conferma.` : ''}
      </label>}
      <button className="session-primary" disabled={sameDate || Boolean(requiresConsent && !allowRemoval)}>Salva appelli</button>
    </fieldset>
  </form>
}
