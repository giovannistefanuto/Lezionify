import { useState } from 'react'
import { dueExamAttempts, type ExamAttempt, type ExamOutcome, type ExamSession } from '../../../shared/sessione'
import type { SessionAction } from '../../hooks/useSessione'

const labels: Record<ExamOutcome, string> = {
  passed: 'Superato', failed: 'Non superato', skipped: 'Saltato', pending: 'In attesa di esito'
}
const key = (item: ExamAttempt) => `${item.exam.id}:${item.exam.date}`

export function SessionOutcomes({ session, today, busy, apply, automatic = false, examId, onDone }: {
  session: ExamSession
  today: string
  busy: boolean
  apply: (action: SessionAction) => Promise<boolean>
  automatic?: boolean
  examId?: string
  onDone: () => void
}) {
  const [selected, setSelected] = useState('')
  const [awaiting, setAwaiting] = useState(false)
  const [cadence, setCadence] = useState(3)
  const attempts = automatic ? dueExamAttempts(session, today) : [...(session.attempts ?? [])]
    .filter(item => item.exam.date <= today && (!examId || item.exam.id === examId))
    .sort((a, b) => b.exam.date.localeCompare(a.exam.date))
  const current = attempts.find(item => key(item) === selected) ?? attempts[0]
  const choose = (value: string) => { setSelected(value); setAwaiting(false); setCadence(3) }
  if (!current) return <p>Nessun esito da aggiornare.</p>
  const request = { sessionId: session.draft.id, examId: current.exam.id, examDate: current.exam.date }
  async function send(action: SessionAction) {
    if (await apply(action)) {
      choose('')
      if (!automatic || attempts.length === 1) onDone()
    }
  }
  function setOutcome(outcome: ExamOutcome) {
    if (outcome === 'pending') { setAwaiting(true); return }
    void send({ ...request, type: 'set-outcome', outcome })
  }
  return <div className="session-form">
    {attempts.length > 1 && <label>Prova <select value={key(current)} onChange={event => choose(event.target.value)}>
      {attempts.map(item => <option key={key(item)} value={key(item)}>
        {item.exam.date} · {item.exam.course} · {item.exam.label}
      </option>)}
    </select></label>}
    <p>{current.exam.course} · {current.exam.label} · <time dateTime={current.exam.date}>{current.exam.date}</time></p>
    {current.status && <p>Ultimo esito: {labels[current.status]}{current.reviewOn ? ` · Nuovo avviso il ${current.reviewOn}` : ''}.</p>}
    {(current.status === 'skipped' || current.status === 'failed') && <p>Puoi scegliere un altro appello nel calendario e confermare il piano.</p>}
    <div className="session-actions">
      {(Object.keys(labels) as ExamOutcome[]).map(outcome => <button key={outcome} type="button" disabled={busy}
        onClick={() => setOutcome(outcome)}>{labels[outcome]}</button>)}
      {(automatic || !current.status || current.status === 'pending') && <button type="button" disabled={busy}
        onClick={() => void send({ ...request, type: 'defer-outcomes' })}>Rispondi più tardi</button>}
    </div>
    {awaiting && <form className="session-actions" onSubmit={event => {
      event.preventDefault()
      void send({ ...request, type: 'set-outcome', outcome: 'pending', retryDays: cadence })
    }}>
      <label>Ricordamelo fra <input required type="number" min="1" max="90" value={Number.isFinite(cadence) ? cadence : ''}
        onChange={event => setCadence(event.target.valueAsNumber)} /> giorni</label>
      <button className="session-primary" disabled={busy}>Salva esito</button>
    </form>}
  </div>
}
