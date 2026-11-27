import { useEffect, useRef, useState } from 'react'
import type { AudioImportSelection } from '../../shared/audioImport'
import type { CourseDefinition, ImportSummary } from '../../shared/archive'

export function AudioImportModal({ selection, courses, onClose, onImported }: {
  selection: AudioImportSelection; courses: CourseDefinition[]; onClose: () => void; onImported: (result: ImportSummary) => void
}) {
  const [files, setFiles] = useState(selection.files)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  async function close() {
    if (pending.current) return
    await window.archive.cancelAudioImport(selection.token)
    onClose()
  }
  async function save() {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      const result = await window.archive.confirmAudioImport(selection.token, files.map(({ id, courseCode, recordedAt }) => ({ id, courseCode, recordedAt })))
      onImported(result); onClose()
    } catch {
      setError('Importazione non riuscita. Controlla corso e data/ora; se la selezione è scaduta, chiudi e scegli di nuovo i file.')
    } finally { pending.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className="audio-import-dialog" aria-labelledby="audio-import-title" onCancel={event => { event.preventDefault(); void close() }}>
    <form onSubmit={event => { event.preventDefault(); void save() }}>
      <h2 id="audio-import-title">Importa audio · Corso e registrazione</h2>
      <p>Controlla corso, data e ora prima di importare. L’elaborazione automatica, se attiva nelle Impostazioni, partirà solo dopo la conferma.</p>
      {!files.length && <p>Nessun file MP3 nella selezione.</p>}
      {files.map((file, index) => <fieldset key={file.id} disabled={busy}>
        <legend>{file.name}</legend>
        <label>Corso <select value={file.courseCode ?? ''} onChange={event => setFiles(current => current.map((item, i) => i === index ? { ...item, courseCode: event.target.value || null } : item))}>
          <option value="">Senza corso</option>
          {file.courseCode && !courses.some(course => course.code === file.courseCode) && <option value={file.courseCode}>{file.courseCode}</option>}
          {courses.map(course => <option key={course.code} value={course.code}>{course.name}</option>)}
        </select></label>
        <label>Data e ora di registrazione <input type="datetime-local" required value={file.recordedAt} onChange={event => setFiles(current => current.map((item, i) => i === index ? { ...item, recordedAt: event.target.value } : item))} /></label>
      </fieldset>)}
      {error && <p role="alert">{error}</p>}
      <div className="audio-import-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => void close()}>Annulla</button><button type="submit" className="primary-button" disabled={busy || !files.length}>{busy ? 'Importazione…' : 'Conferma e importa'}</button></div>
    </form>
  </dialog>
}
