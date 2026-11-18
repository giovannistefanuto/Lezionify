import { useState, type FormEvent } from 'react'
import type { ExamSessionDraft } from '../../../shared/sessione'
import { sessionId } from './editSessionDraft'

export function SessionSettingsForm({ initial, onSave, busy }: {
  initial: ExamSessionDraft
  onSave: (draft: ExamSessionDraft) => Promise<boolean>
  busy: boolean
}) {
  const [draft, set] = useState(initial)
  const save = (event: FormEvent) => {
    event.preventDefault()
    void onSave(draft)
  }
  return <form className="session-form" onSubmit={save}>
    <fieldset disabled={busy}>
      <legend>Dati della sessione</legend>
      <label>Nome <input required maxLength={100} value={draft.name} onChange={event => set({ ...draft, name: event.target.value })} /></label>
      <label>Inizio <input required type="date" value={draft.start} onChange={event => set({ ...draft, start: event.target.value })} /></label>
      <label>Fine <input required type="date" min={draft.start} value={draft.end} onChange={event => set({ ...draft, end: event.target.value })} /></label>
      <fieldset><legend>Indisponibilità</legend>
        {draft.unavailable.map(block => <div className="session-actions" key={block.id}>
          <label>Dal <input type="date" required value={block.start} onChange={event =>
            set({ ...draft, unavailable: draft.unavailable.map(row => row.id === block.id ? { ...row, start: event.target.value } : row) })} /></label>
          <label>Al <input type="date" required min={block.start} value={block.end} onChange={event =>
            set({ ...draft, unavailable: draft.unavailable.map(row => row.id === block.id ? { ...row, end: event.target.value } : row) })} /></label>
          <label><input type="checkbox" checked={block.blocking} onChange={event =>
            set({ ...draft, unavailable: draft.unavailable.map(row => row.id === block.id ? { ...row, blocking: event.target.checked } : row) })} /> Impedisce esami</label>
          <button type="button" onClick={() => set({ ...draft, unavailable: draft.unavailable.filter(row => row.id !== block.id) })}>Rimuovi</button>
        </div>)}
        <button type="button" onClick={() => set({ ...draft, unavailable: [...draft.unavailable,
          { id: sessionId(), start: draft.start, end: draft.start, blocking: true }] })}>Aggiungi indisponibilità</button>
      </fieldset>
      <button className="session-primary">Salva sessione</button>
    </fieldset>
  </form>
}
