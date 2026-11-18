import { useState } from 'react'
import { activeExamSession, listSessionAppointments, type SessionArchive } from '../../../shared/sessione'
import type { SessionAction } from '../../hooks/useSessione'

export function ExternalSessionEdit({ archive, course, today, busy, apply, onOpenWorkspace, onDone }: {
  archive: SessionArchive
  course: string
  today: string
  busy: boolean
  apply: (action: SessionAction) => Promise<boolean>
  onOpenWorkspace: () => void
  onDone: () => void
}) {
  const [previousId, setPrevious] = useState('')
  const [appointmentId, setAppointment] = useState('')
  const session = activeExamSession(archive)
  if (!session?.confirmed) return null
  const exams = session.confirmed.exams.filter(exam => exam.course === course && exam.date >= today)
  const previous = exams.find(exam => exam.id === previousId) ?? exams[0]
  const options = listSessionAppointments(session.draft).filter(row => row.course.code === course &&
    row.step.id === previous?.stepId && row.appointment.date >= today &&
    (row.appointment.id !== previous.id || row.appointment.date !== previous.date || row.appointment.time !== previous.time))
  const next = options.find(row => row.appointment.id === appointmentId)
  return <div className="session-form">
    {previous ? <>
      <label>Prova confermata <select value={previous.id} onChange={event => {
        setPrevious(event.target.value); setAppointment('')
      }}>
        {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.label} · {exam.date}</option>)}
      </select></label>
      <label>Nuovo appello <select value={next?.appointment.id ?? ''} onChange={event => setAppointment(event.target.value)}>
        <option value="">Seleziona una data</option>
        {options.map(({ appointment }) => <option key={appointment.id} value={appointment.id}>
          {appointment.date}{appointment.time ? ` · ${appointment.time}` : ''}{appointment.number ? ` · Appello ${appointment.number}` : ''}
        </option>)}
      </select></label>
      {next && <p>Countdown e promemoria per {course} · {previous.label}: {previous.date} → {next.appointment.date}.</p>}
      {!options.length && <p>Non ci sono altri appelli per questa prova. Puoi aggiungerne uno in Sessione.</p>}
      <button type="button" disabled={busy || !next} className="session-primary" onClick={() => {
        if (!next) return
        void apply({ type: 'switch-appointment', sessionId: session.draft.id, previousId: previous.id,
          appointmentId: next.appointment.id }).then(saved => { if (saved) onDone() })
      }}>Conferma modifica</button>
    </> : <p>Nessun appello futuro è confermato per questo corso.</p>}
    <button type="button" onClick={onOpenWorkspace}>Apri Sessione</button>
  </div>
}
