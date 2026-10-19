import { useEffect, useState } from 'react'
import type { QnaImage, QnaImageDeletion } from '../../shared/qnaImages'
import { QnaImagePreview } from './QnaImagePreview'

export function QnaImageLibrary() {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<QnaImage[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [selection, setSelection] = useState<QnaImageDeletion | null>(null)
  const [day, setDay] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    void window.archive.listQnaImages().then(images => { if (!cancelled) setImages(images) }).catch(() => { if (!cancelled) setError('Impossibile caricare l’archivio immagini.') })
    return () => { cancelled = true }
  }, [open, revision])
  const remove = async () => {
    if (!selection || busy) return
    setBusy(true); setError(null)
    try {
      await window.archive.deleteQnaImages(selection)
      window.dispatchEvent(new Event('qna-images-changed'))
      setSelection(null); setPreview(null); setRevision(previous => previous + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Cancellazione non riuscita.') }
    finally { setBusy(false) }
  }
  const days = [...new Set(images.map(image => image.day))]
  return <section className="qna-image-library">
    <button type="button" className="secondary-button" aria-expanded={open} onClick={() => setOpen(value => !value)}>Immagini delle conversazioni</button>
    {open && <div>
      <p>Snapshot delle slide salvati sul computer. Cancellarli libera spazio e li rende indisponibili nelle conversazioni; i PDF originali restano conservati.</p>
      {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Riprova</button></p>}
      <div className="qna-image-library-actions">
        <span>{images.length} immagini · {(images.reduce((sum, image) => sum + image.byteSize, 0) / 1_000_000).toFixed(2)} MB</span>
        <select aria-label="Giorno delle immagini da cancellare" value={day} onChange={event => { setDay(event.target.value); setSelection(null) }}><option value="">Scegli giorno</option>{days.map(day => <option key={day} value={day}>{day}</option>)}</select>
        <button type="button" disabled={!day || busy} onClick={() => setSelection({ day })}>Cancella per giorno</button>
        <button type="button" disabled={!images.length || busy} onClick={() => setSelection({ all: true })}>Cancella tutte</button>
      </div>
      {selection && <div role="alert"><p>Eliminare definitivamente {'all' in selection ? 'tutte le immagini' : 'day' in selection ? `le immagini del ${selection.day}` : 'questa immagine'}? Le conversazioni conserveranno il testo e segnaleranno gli allegati mancanti.</p><button type="button" disabled={busy} onClick={() => void remove()}>Conferma cancellazione immagini</button><button type="button" disabled={busy} onClick={() => setSelection(null)}>Annulla</button></div>}
      {images.length === 0 && !error && <p>Nessuna immagine salvata.</p>}
      <ul>{images.map(image => <li key={image.id}><button type="button" onClick={() => setPreview(preview === image.id ? null : image.id)}>{image.day} · Pagina {image.page} · {Math.ceil(image.byteSize / 1000)} KB</button> <button type="button" disabled={busy} onClick={() => setSelection({ id: image.id })}>Cancella immagine</button>{preview === image.id && <QnaImagePreview id={image.id} />}</li>)}</ul>
    </div>}
  </section>
}
