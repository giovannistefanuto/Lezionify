import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { markdownSections, type SectionRevisionPreview } from '../../shared/sectionRevision'
import { MarkdownViewer } from './MarkdownViewer'
import { useModalFocus } from '../hooks/useModalFocus'

export function SectionRegenerator({ lectureId, markdown, english, disabled }: { lectureId: string; markdown: string; english: boolean; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(0)
  const [instructions, setInstructions] = useState('Riscrivi in modo più chiaro e dettagliato.')
  const [preview, setPreview] = useState<SectionRevisionPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLElement>(null)
  useModalFocus(dialog, open)
  useEffect(() => {
    if (!open || busy) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false) } }
    window.addEventListener('keydown', escape, true)
    return () => window.removeEventListener('keydown', escape, true)
  }, [open, busy])
  const sections = markdownSections(markdown)
  const changed = (content: string) => {
    window.dispatchEvent(new CustomEvent('lecture-section-revised', { detail: { id: lectureId, markdown: content } }))
    setOpen(false); setPreview(null)
  }
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await action() } catch (failure) { setError(failure instanceof Error ? failure.message : 'Operazione non riuscita.') }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" disabled={disabled || english || !sections.length} title={english ? 'Passa alla versione italiana per rigenerare una sezione.' : 'Rigenera una sezione dalla trascrizione'} onClick={() => { setStart(sections.find(section => section.level > 1)?.start ?? sections[0].start); setPreview(null); setError(''); setOpen(true) }}>Rigenera sezione</button>
    {open && createPortal(<div className="modal-overlay section-revision-backdrop"><section ref={dialog} tabIndex={-1} className="modal-content section-revision-dialog" role="dialog" aria-modal="true" aria-label="Rigenera sezione">
      <h2>Rigenera una sezione italiana</h2>
      <p>Invierai a Gemini la trascrizione completa, la sezione e le istruzioni. Il collegamento con il tratto originale non è certo: il modello riceve tutta la fonte, entro 1 MB. Audio e trascrizione restano invariati.</p>
      <label>Sezione <select disabled={busy || Boolean(preview)} value={start} onChange={event => setStart(Number(event.target.value))}>{sections.map(section => <option key={section.start} value={section.start}>{section.title}</option>)}</select></label>
      <label>Istruzioni <textarea aria-label="Istruzioni di rigenerazione" disabled={busy || Boolean(preview)} value={instructions} maxLength={4000} onChange={event => setInstructions(event.target.value)} /></label>
      {!preview && <button type="button" disabled={busy || !instructions.trim()} onClick={() => void run(async () => setPreview(await window.archive.previewSectionRevision(lectureId, markdown, start, instructions)))}>Genera anteprima con Gemini</button>}
      {preview && <><h3>Versione precedente</h3><MarkdownViewer content={preview.before} /><h3>Anteprima proposta</h3><MarkdownViewer content={preview.after} /><p>La versione precedente verrà conservata e potrai ripristinarla. La versione inglese resta disponibile, segnalata da aggiornare. Dopo la modifica controlla le annotazioni: sono legate alla posizione del testo.</p>
        <button type="button" disabled={busy} onClick={() => void run(async () => changed(await window.archive.applySectionRevision(lectureId, preview.token)))}>Conferma sostituzione</button>
        <button type="button" disabled={busy} onClick={() => setPreview(null)}>Scarta anteprima</button></>}
      <button type="button" disabled={busy} onClick={() => void run(async () => changed(await window.archive.restoreSectionRevision(lectureId)))}>Ripristina versione precedente</button>
      <button type="button" disabled={busy} onClick={() => setOpen(false)}>Chiudi</button>
      {busy && <p role="status">Operazione in corso…</p>}{error && <p role="alert">{error}</p>}
    </section></div>, document.fullscreenElement ?? document.body)}
  </>
}
