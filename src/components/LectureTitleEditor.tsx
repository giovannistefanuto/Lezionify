import { useEffect, useRef, useState } from 'react'
import type { Lecture, LectureTitleUpdates } from '../../shared/archive'
import { extractLectureTitle, validateLectureTitles } from '../../shared/lectureTitles'

export function LectureTitleEditor({ lecture, onSave, onClose }: {
  lecture: Lecture; onSave: (id: string, changes: LectureTitleUpdates) => Promise<void>; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const firstInput = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState({ it: '', en: '' })
  const initial = useRef(values)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal() }, [])
  useEffect(() => { if (!loading && !loadError) firstInput.current?.focus() }, [loading, loadError])
  useEffect(() => {
    let canceled = false
    void Promise.all([window.archive.readMarkdown(lecture.id), window.archive.readMarkdownEn(lecture.id)])
      .then(([italian, english]) => {
        if (canceled) return
        const titles = { it: lecture.titleOverrides?.it || extractLectureTitle(italian) || lecture.title || '',
          en: lecture.titleOverrides?.en || extractLectureTitle(english) || '' }
        initial.current = titles; setValues(titles); setLoading(false); setLoadError(false); setError(null)
      }).catch(() => { if (!canceled) { setLoading(false); setLoadError(true); setError('Impossibile leggere i titoli. Riprova.') } })
    return () => { canceled = true }
  }, [lecture, attempt])
  const finish = () => { dialog.current?.close(); onClose() }
  const close = () => { if (!pending.current) finish() }
  return <dialog ref={dialog} className="lecture-title-dialog" aria-labelledby="lecture-title-editor-heading"
    onCancel={event => { event.preventDefault(); close() }}>
    <form onSubmit={async event => {
      event.preventDefault()
      if (pending.current || loading || loadError) return
      const changes: LectureTitleUpdates = {}
      for (const language of ['it', 'en'] as const) if (values[language].trim() !== initial.current[language].trim()) changes[language] = values[language].trim()
      if (!Object.keys(changes).length) { close(); return }
      try { validateLectureTitles(changes) } catch (reason) { setError((reason as Error).message); return }
      pending.current = true; setSaving(true); setError(null)
      try { await onSave(lecture.id, changes); finish() }
      catch { setError('Impossibile salvare i titoli. Le modifiche restano qui: riprova.') }
      finally { pending.current = false; setSaving(false) }
    }}>
      <h2 id="lecture-title-editor-heading">Modifica titoli della lezione</h2>
      <p>I titoli italiano e inglese sono indipendenti. Nessuna traduzione automatica.</p>
      {loading && <p role="status">Caricamento titoli…</p>}
      <label>Italiano<input ref={firstInput} name="title-it" type="text" maxLength={500} disabled={loading || loadError || saving}
        value={values.it} onChange={event => setValues(previous => ({ ...previous, it: event.target.value }))} /></label>
      <label>Inglese<input name="title-en" type="text" maxLength={500} disabled={loading || loadError || saving}
        value={values.en} onChange={event => setValues(previous => ({ ...previous, en: event.target.value }))} /></label>
      {!lecture.markdownEnFileName && <p>La dispensa inglese non è ancora presente. Puoi preparare il titolo per quando verrà creata.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="form-actions">
        {loadError && <button type="button" className="secondary-button" onClick={() => { setLoading(true); setAttempt(value => value + 1) }}>Riprova caricamento</button>}
        <button className="primary-button" type="submit" disabled={loading || loadError || saving}>{saving ? 'Salvataggio…' : 'Salva titoli'}</button>
        <button className="secondary-button" type="button" disabled={saving} onClick={close}>Annulla</button>
      </div>
    </form>
  </dialog>
}
