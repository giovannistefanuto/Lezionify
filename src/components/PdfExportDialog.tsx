import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CourseDefinition, Lecture } from '../../shared/archive'
import type { PdfExportRequest } from '../../shared/pdfExport'
import { lectureTitle } from '../../shared/lectureTitles'
import './pdfExportDialog.css'

export function PdfExportDialog({
  initialLanguage,
  onClose
}: {
  initialLanguage: 'it' | 'en'
  onClose: () => void
}) {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [courses, setCourses] = useState<Record<string, CourseDefinition>>({})
  const [step, setStep] = useState<'kind' | 'lecture' | 'course' | 'selection'>(
    'kind'
  )
  const [course, setCourse] = useState('')
  const [selected, setSelected] = useState(new Set<string>())
  const [language, setLanguage] = useState(initialLanguage)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const panel = useRef<HTMLElement>(null)
  const alive = useRef(true)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [items, settings] = await Promise.all([
        window.archive.listLectures(),
        window.archive.getSettings()
      ])
      if (!alive.current) return
      setLectures(
        items.sort(
          (a, b) =>
            (a.recordedAt ?? a.importedAt).localeCompare(
              b.recordedAt ?? b.importedAt
            ) || a.id.localeCompare(b.id)
        )
      )
      setCourses(settings.courses ?? {})
    } catch {
      if (alive.current) setError('Elenco non disponibile. Riprova.')
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    alive.current = true
    void load()
    return () => {
      alive.current = false
    }
  }, [load])
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  }, [step])
  const entries = lectures.filter(
    (item) => (item.courseCode ?? 'Senza corso') === course
  )
  const labs = entries.filter((item) => item.isLaboratory)
  const allSelected =
    entries.length > 0 && entries.every((item) => selected.has(item.id))
  const allLabsSelected =
    labs.length > 0 && labs.every((item) => selected.has(item.id))
  const codes = [
    ...new Set([
      ...Object.keys(courses),
      ...lectures.map((item) => item.courseCode ?? 'Senza corso')
    ])
  ].sort()
  const run = async (request: PdfExportRequest) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await window.archive.exportNotesPdf(request)
      if (alive.current)
        setMessage(
          result.canceled
            ? 'Salvataggio annullato. La selezione è conservata.'
            : result.missingCount
              ? `PDF salvato. ${result.missingCount} dispense mancanti segnalate nel documento.`
              : 'PDF salvato.'
        )
    } catch (failure) {
      if (alive.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Esportazione non riuscita. Riprova.'
        )
    } finally {
      pending.current = false
      if (alive.current) setBusy(false)
    }
  }
  const back = () => {
    setStep(step === 'selection' ? 'course' : 'kind')
    setMessage('')
    setError('')
  }
  const title = (lecture: Lecture) => lectureTitle(lecture, 'it') || 'Lezione'
  const date = (item: Lecture) =>
    new Date(item.recordedAt ?? item.importedAt).toLocaleDateString('it-IT')
  return createPortal(
    <div
      className="pdf-export-overlay"
      onClick={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        ref={panel}
        className="pdf-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Esporta PDF"
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape' && !busy) {
            event.preventDefault()
            onClose()
          }
          if (event.key === 'Tab') {
            const controls = [
              ...panel.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
              )
            ]
            const first = controls[0],
              last = controls.at(-1)
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <header>
          <div>
            <h2>Esporta PDF</h2>
            <p>Dispense e pagine Note, pronte da salvare.</p>
          </div>
          <button
            disabled={busy}
            aria-label="Chiudi esportazione"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {step !== 'kind' && (
          <button disabled={busy} onClick={back}>
            ← Indietro
          </button>
        )}
        {loading ? (
          <p role="status">Caricamento lezioni…</p>
        ) : (
          <>
            {step === 'kind' && (
              <div className="pdf-export-kinds">
                <button onClick={() => setStep('lecture')}>
                  <strong>Lezione</strong>
                  <span>Una dispensa in italiano o inglese</span>
                </button>
                <button onClick={() => setStep('course')}>
                  <strong>Corso</strong>
                  <span>Scegli le lezioni da raccogliere</span>
                </button>
              </div>
            )}
            {step === 'lecture' && (
              <div className="pdf-export-list">
                {!lectures.length && <p>Nessuna lezione disponibile.</p>}
                {lectures.map((item) => (
                  <div className="pdf-export-row" key={item.id}>
                    <span>
                      <strong>{title(item)}</strong>
                      <small>
                        {item.courseCode ?? 'Senza corso'} · {date(item)}
                        {item.isLaboratory && ' · Laboratorio'}
                      </small>
                    </span>
                    <div>
                      {(['it', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          disabled={
                            busy ||
                            !(lang === 'it'
                              ? item.markdownFileName
                              : item.markdownEnFileName)
                          }
                          title={
                            !(lang === 'it'
                              ? item.markdownFileName
                              : item.markdownEnFileName)
                              ? 'Dispensa non disponibile'
                              : undefined
                          }
                          onClick={() =>
                            void run({
                              kind: 'lecture',
                              lectureId: item.id,
                              language: lang
                            })
                          }
                        >
                          {lang === 'it' ? 'Italiano' : 'Inglese'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {step === 'course' && (
              <div className="pdf-export-list">
                {!codes.length && <p>Nessun corso disponibile.</p>}
                {codes.map((code) => (
                  <button
                    key={code}
                    className="pdf-export-course"
                    onClick={() => {
                      setCourse(code)
                      setSelected(
                        new Set(
                          lectures
                            .filter(
                              (item) =>
                                (item.courseCode ?? 'Senza corso') === code
                            )
                            .map((item) => item.id)
                        )
                      )
                      setStep('selection')
                    }}
                  >
                    {courses[code]?.name
                      ? `${courses[code].name} (${code})`
                      : code}
                  </button>
                ))}
              </div>
            )}
            {step === 'selection' && (
              <>
                <h3>{courses[course]?.name ?? course}</h3>
                <div className="pdf-export-selection-actions">
                  <button
                    disabled={busy || !entries.length}
                    onClick={() =>
                      setSelected(
                        new Set(
                          allSelected ? [] : entries.map((item) => item.id)
                        )
                      )
                    }
                  >
                    {allSelected ? 'Deseleziona tutto' : 'Seleziona tutto'}
                  </button>
                  <button
                    disabled={busy || !labs.length}
                    onClick={() =>
                      setSelected((previous) => {
                        const next = new Set(previous)
                        for (const item of labs) {
                          if (allLabsSelected) next.delete(item.id)
                          else next.add(item.id)
                        }
                        return next
                      })
                    }
                  >
                    {allLabsSelected
                      ? 'Escludi laboratori'
                      : 'Includi laboratori'}
                  </button>
                  <span>
                    {selected.size} di {entries.length} selezionate
                  </span>
                </div>
                <div className="pdf-export-list">
                  {!entries.length && <p>Nessuna lezione in questo corso.</p>}
                  {entries.map((item) => (
                    <label className="pdf-export-row" key={item.id}>
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={selected.has(item.id)}
                        onChange={() =>
                          setSelected((previous) => {
                            const next = new Set(previous)
                            if (next.has(item.id)) next.delete(item.id)
                            else next.add(item.id)
                            return next
                          })
                        }
                      />
                      <span>
                        <strong>{title(item)}</strong>
                        <small>
                          {date(item)}
                          {item.isLaboratory && ' · Laboratorio'}
                          {!(language === 'it'
                            ? item.markdownFileName
                            : item.markdownEnFileName) &&
                            ' · Dispensa mancante'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
                <footer>
                  <label>
                    Lingua{' '}
                    <select
                      disabled={busy}
                      value={language}
                      onChange={(event) =>
                        setLanguage(event.target.value as 'it' | 'en')
                      }
                    >
                      <option value="it">Italiano</option>
                      <option value="en">Inglese</option>
                    </select>
                  </label>
                  <button
                    className="primary-button"
                    disabled={busy || !selected.size}
                    onClick={() =>
                      void run({
                        kind: 'course',
                        courseCode: course,
                        language,
                        lectureIds: [...selected]
                      })
                    }
                  >
                    {busy ? 'Esportazione…' : 'Esporta'}
                  </button>
                </footer>
                {entries.some(
                  (item) =>
                    selected.has(item.id) &&
                    !(language === 'it'
                      ? item.markdownFileName
                      : item.markdownEnFileName)
                ) && (
                  <p>
                    Le dispense mancanti saranno segnalate nel PDF. Se mancano
                    tutte, scegli un’altra lingua o selezione.
                  </p>
                )}
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert">
            {error}{' '}
            {step === 'kind' && (
              <button onClick={() => void load()}>Riprova</button>
            )}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
    </div>,
    document.fullscreenElement ?? document.body
  )
}
