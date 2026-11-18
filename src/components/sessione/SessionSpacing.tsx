import { useEffect, useState } from 'react'
import { calendarDayDifference } from '../../../shared/calendarDate'
import { gapMetrics, type SpacedPlan, type SpacingRequest, type SpacingResult } from '../../../shared/sessionSpacing'
import { collectPlanExams, passedExamSteps } from '../../../shared/sessione'
import SpacingWorker from './sessionSpacing.worker?worker&inline'

export function SessionSpacing({ request, nameOf, onApply, onCancel, busy }: {
  request: SpacingRequest
  nameOf: (code: string) => string
  onApply: (proposal: SpacedPlan, copy: boolean) => void
  onCancel: () => void
  busy: boolean
}) {
  const [response, setResponse] = useState<SpacingResult>()
  const [error, setError] = useState(false)
  useEffect(() => {
    let worker: Worker
    try { worker = new SpacingWorker() }
    catch { setError(true); return }
    worker.onmessage = (event: MessageEvent<SpacingResult>) => { setResponse(event.data); worker.terminate() }
    worker.onerror = () => { setError(true); worker.terminate() }
    worker.postMessage(request)
    return () => worker.terminate()
  }, [request])

  const current = collectPlanExams(request.session.draft, request.plan, passedExamSteps(request.session))
    .filter(exam => exam.date >= request.today)
  const baseline = gapMetrics(current.map(exam => calendarDayDifference(request.today, exam.date) ?? 0))
  const previousEnd = current.at(-1)?.date
  const proposal = response?.proposal
  const delta = previousEnd && proposal?.end ? calendarDayDifference(previousEnd, proposal.end) : null
  const coincident = new Map<string, number>()
  for (const exam of proposal?.exams ?? []) coincident.set(exam.date, (coincident.get(exam.date) ?? 0) + 1)
  return <div className="session-form">
    {error && <p role="alert">Impossibile avviare il calcolo locale. Riprova.</p>}
    {!response && !error && <p role="status">Sto confrontando gli appelli disponibili…</p>}
    {response?.warnings.map(warning => <p key={warning} role="alert">{warning}</p>)}
    {proposal && response && <>
      <p><strong>{response.complete ? 'Migliore combinazione disponibile' : 'Migliore proposta trovata'}</strong>
        {!response.complete && ` · Limite della ricerca: ${response.limit.toLocaleString('it-IT')} stati.`}</p>
      {proposal.exams.length ? <table className="session-proposal">
        <thead><tr><th>Prova</th><th>Data attuale</th><th>Data proposta</th></tr></thead>
        <tbody>{proposal.exams.map(exam => <tr key={exam.stepId}>
          <th scope="row">{nameOf(exam.course)} · {exam.label}</th>
          <td>{current.find(row => row.stepId === exam.stepId)?.date ?? 'Da scegliere'}</td>
          <td>{exam.date}{exam.time ? ` · ${exam.time}` : ''}</td>
        </tr>)}</tbody>
      </table> : <p>Il piano non contiene prove future richieste.</p>}
      <p>Intervallo minimo: {baseline.minimum ?? '—'} → {proposal.minimum ?? '—'} giorni.
        {proposal.end && ` Fine: ${proposal.end}`}{delta !== null && delta !== 0 && ` (${delta > 0 ? '+' : ''}${delta} giorni)`}.</p>
      {proposal.exams.length === 1 && <p>Per una sola prova la proposta favorisce l’ultimo appello disponibile nel periodo.</p>}
      {[...coincident].filter(([, count]) => count > 1).map(([date, count]) => <p key={date}>
        {date}: {count} esami lo stesso giorno. Controlla gli orari quando sono disponibili.
      </p>)}
      <div className="session-actions">
        <button type="button" className="session-primary" disabled={busy || !proposal.exams.length}
          onClick={() => onApply(proposal, false)}>Applica alla bozza</button>
        <button type="button" disabled={busy || !proposal.exams.length} onClick={() => onApply(proposal, true)}>Salva come nuovo piano</button>
      </div>
    </>}
    <button type="button" onClick={onCancel}>Annulla</button>
  </div>
}
