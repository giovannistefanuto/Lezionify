import { useEffect, useRef, useState } from 'react'
import type { StudyTimeRemovalTarget } from '../../shared/studyCorrections'

export function StudyTimeRemovalDialog({
  onClose,
  onSaved
}: {
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [targets, setTargets] = useState<StudyTimeRemovalTarget[]>([])
  const [targetId, setTargetId] = useState('')
  const [minutes, setMinutes] = useState('10')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    void window.archive
      .getStudyTimeRemovalTargets()
      .then((values) => {
        if (!cancelled) {
          setTargets(values)
          setTargetId(values[0]?.id ?? '')
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Impossibile leggere il tempo disponibile. Riapri la finestra.'
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      previous?.focus()
    }
  }, [])
  const target = targets.find((item) => item.id === targetId)
  const amount = Number(minutes)
  const valid =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount * 60 <= (target?.availableSeconds ?? 0)
  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!saving) onClose()
      }}
    >
      <div
        className="modal-content manual-study-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Togli tempo di studio"
        ref={panel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onClose()
          if (event.key === 'Tab') {
            const controls = Array.from(
              panel.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), select:not(:disabled), input:not(:disabled)'
              ) ?? []
            )
            const first = controls[0],
              last = controls.at(-1)
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <h2>Togli tempo di studio</h2>
        <form
          className="manual-study-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid || savingRef.current) return
            savingRef.current = true
            setSaving(true)
            setError('')
            void window.archive
              .removeStudyTime(targetId, amount)
              .then(async () => {
                await onSaved()
                onClose()
              })
              .catch((failure) =>
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Rettifica non riuscita. Riprova.'
                )
              )
              .finally(() => {
                savingRef.current = false
                setSaving(false)
              })
          }}
        >
          <label>
            Destinazione
            <select
              aria-label="Destinazione rettifica"
              disabled={loading || saving}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {targets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p>
            {loading
              ? 'Caricamento…'
              : target
                ? `Disponibili: ${Math.floor(target.availableSeconds / 60)} min ${target.availableSeconds % 60} s`
                : 'Nessun tempo di studio da correggere.'}
          </p>
          <label>
            Minuti da togliere
            <input
              aria-label="Minuti da togliere"
              type="number"
              min="1"
              max={Math.floor((target?.availableSeconds ?? 0) / 60)}
              step="1"
              value={minutes}
              disabled={saving}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          {valid && (
            <p>
              Togli {amount} minuti da: {target?.label}. Prima vengono
              rettificate le sessioni più recenti.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="modal-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!valid || loading || saving}
            >
              {saving ? 'Salvataggio…' : 'Conferma rettifica'}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={onClose}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
