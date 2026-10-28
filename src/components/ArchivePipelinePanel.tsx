import type {
  ArchivePipelineStage,
  ArchivePipelineStatus
} from '../../shared/archive'

interface ArchivePipelinePanelProps {
  status: ArchivePipelineStatus
  onResume: () => void
  onStop: () => void
}

const STAGE_LABELS: Record<ArchivePipelineStage, string> = {
  transcription: 'Trascrizioni',
  notes: 'Dispense ITA',
  translation: 'Versioni ENG'
}

function completedCount(status: ArchivePipelineStatus): number {
  return status.tasks.filter((task) =>
    ['succeeded', 'failed', 'blocked', 'skipped'].includes(task.status)
  ).length
}

export function ArchivePipelinePanel({
  status,
  onResume,
  onStop
}: ArchivePipelinePanelProps) {
  const total = status.tasks.length
  const running = status.status === 'planning' || status.status === 'running'
  const resumable = status.status === 'paused'
  const problems = status.tasks.filter(task => task.status === 'failed' || task.status === 'blocked')

  if (status.status === 'idle' || total === 0) return null

  return (
    <section
      className={`archive-pipeline-panel pipeline-${status.status}`}
      aria-live="polite"
    >
      <div className="archive-pipeline-heading">
        <div>
          <h2>Elaborazione archivio</h2>
          <p>{status.message}</p>
          {Boolean(status.queuedImportLectureIds?.length) && <p>{status.queuedImportLectureIds!.length} import conservati per la coda successiva. Stop e pause impediscono il riavvio automatico.</p>}
        </div>
        <span className="archive-pipeline-total">
          {completedCount(status)}/{total}
        </span>
      </div>

      <div className="archive-pipeline-stages">
        {(Object.keys(STAGE_LABELS) as ArchivePipelineStage[]).map((stage) => {
          const summary = status.stageSummaries[stage]
          return (
            <div key={stage} className="archive-pipeline-stage">
              <span>{STAGE_LABELS[stage]}</span>
              <strong>
                {stage === 'translation' && !status.includeTranslation ? 'Non richieste' : `${summary.succeeded + summary.skipped}/${summary.total}`}
              </strong>
              {summary.pending > 0 && <small>{summary.pending} in attesa</small>}
              {summary.running > 0 && <small>{summary.running} in corso</small>}
              {summary.failed > 0 && <small>{summary.failed} non riuscite</small>}
              {summary.blocked > 0 && <small>{summary.blocked} bloccate dalla fase precedente</small>}
            </div>
          )
        })}
      </div>

      {!status.includeTranslation && <p className="archive-pipeline-translation-hint">
        Questa elaborazione non include le versioni ENG. Per aggiungere le versioni ENG mancanti usa “Elabora archivio” al termine; se l’elaborazione è in pausa, riprendila prima. Le nuove importazioni con elaborazione automatica abilitata includono anche l’inglese.
      </p>}
      {status.includeTranslation && status.stageSummaries.translation.pending > 0 && status.activeStage !== 'translation' && <p className="archive-pipeline-translation-hint">
        {status.status === 'stopped' ? 'Elaborazione interrotta: usa “Elabora archivio” per completare le versioni ENG mancanti.' : 'Le versioni ENG in attesa inizieranno dopo le trascrizioni e le dispense ITA. Se l’elaborazione è in pausa, premi “Riprendi elaborazione”.'}
      </p>}
      {problems.length > 0 && <details className="archive-pipeline-problems">
        <summary>Dettagli di {problems.length} attività da controllare</summary>
        <ul>{problems.map(task => <li key={`${task.lectureId}-${task.stage}`}>
          <strong>{task.title} · {STAGE_LABELS[task.stage]}</strong>: {task.status === 'blocked' ? 'Bloccata dalla fase precedente.' : 'Non riuscita.'} {task.error}
        </li>)}</ul>
        <p>{resumable ? 'Correggi il problema e premi “Riprendi elaborazione”. Gli errori di contenuto vanno controllati nella lezione.' : 'Dopo aver controllato il problema, usa “Elabora archivio” per riprovare gli elementi mancanti. Le fonti e le dispense già salvate vengono conservate.'}</p>
      </details>}

      {status.currentLectureTitle && (
        <p className="archive-pipeline-current">
          In corso: <strong>{status.currentLectureTitle}</strong>
        </p>
      )}

      <div className="archive-pipeline-actions">
        {running && (
          <button className="text-button danger" onClick={onStop}>
            Interrompi dopo l’attività corrente
          </button>
        )}
        {resumable && (
          <button className="secondary-button small" onClick={onResume}>
            ▶ Riprendi elaborazione
          </button>
        )}
      </div>
    </section>
  )
}
