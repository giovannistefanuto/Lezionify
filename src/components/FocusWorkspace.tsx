import React, { useEffect, useRef, useState } from 'react'
import type { FocusPdfDocument } from '../../shared/archive'
import { focusLayout } from '../utils/focusLayout'
import { PaneDivider } from './PaneDivider'
import { useNumericPreference } from '../hooks/useNumericPreference'
import { PdfExportButton } from './PdfExportButton'
import { MusicButton } from './MusicButton'
import { MermaidCollapseContext, useMermaidCollapseGroup } from './MermaidDiagram'
import type { PdfExportRequest } from '../../shared/pdfExport'

const FocusPdfViewer = React.lazy(() => import('./FocusPdfViewer').then(module => ({ default: module.FocusPdfViewer })))

export function FocusWorkspace({ lectureId, children, qna, onCloseQna, onTextZoom, textZoom, exportRequest, onAttachPages, canSelectSlides = false, qnaButton }: {
  lectureId: string; children: React.ReactNode; qna: React.ReactNode; onCloseQna: () => void
  onTextZoom: (delta: number) => void; textZoom: number
  exportRequest?: PdfExportRequest
  onAttachPages?: (images: import('../../shared/qnaImages').QnaImageInput[]) => Promise<void>
  qnaButton?: React.ReactNode
  canSelectSlides?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(window.innerWidth)
  const [ratio, setRatio] = useState(0.5)
  const [qnaRatio, setQnaRatio] = useNumericPreference('lezionify:qna-width:focus:v1', 0.29, 0.15, 0.85)
  const [pdf, setPdf] = useState<FocusPdfDocument | null>(null)
  const [showPdf, setShowPdf] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const granted = useRef<FocusPdfDocument | null>(null)
  const mermaid = useMermaidCollapseGroup(lectureId)

  useEffect(() => {
    if (!root.current) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const current = ++generation.current
    setPdf(null); setError(null); setShowPdf(true); setBusy(false)
    void window.archive.getFocusPdf?.(lectureId).then(document => {
      if (current !== generation.current) { if (document) void window.archive.releaseFocusPdf(document.id); return }
      granted.current = document
      setPdf(document)
    }).catch(() => { if (current === generation.current) setError('Le slide salvate non sono disponibili. Scegli nuovamente il PDF.') })
    return () => {
      // This counter intentionally invalidates later native picker responses as well.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++
      if (granted.current) void window.archive.releaseFocusPdf(granted.current.id).catch(() => {})
      granted.current = null
    }
  }, [lectureId])

  const select = async () => {
    if (busy) return
    const current = ++generation.current
    setBusy(true); setError(null)
    try {
      const document = await window.archive.selectFocusPdf(lectureId)
      if (current !== generation.current) { if (document) void window.archive.releaseFocusPdf(document.id); return }
      if (document) {
        if (granted.current) void window.archive.releaseFocusPdf(granted.current.id).catch(() => {})
        granted.current = document; setPdf(document); setShowPdf(true)
      }
    } catch { if (current === generation.current) setError('Impossibile aprire il PDF. Controlla OneDrive e riprova.') }
    finally { if (current === generation.current) setBusy(false) }
  }

  const layout = focusLayout(width, ratio, Boolean(pdf && showPdf), Boolean(qna), qnaRatio)
  const resizeQna = (next: number) => setQnaRatio(Math.max(0.15, Math.min(0.85, next)))
  const resize = (next: number) => {
    // An explicit widening of the slides dismisses the visible question, preserving its thread.
    if (qna && next > 0.56) onCloseQna()
    setRatio(Math.max(0.15, Math.min(0.85, next)))
  }
  const center = () => { if (qna) onCloseQna(); setRatio(0.5) }

  return <div ref={root} className={`focus-workspace${pdf && showPdf ? ' has-pdf' : ''}`}>
    {pdf && <div className="focus-pdf-column" style={{ width: layout.pdfWidth, display: layout.showPdf ? 'flex' : 'none' }}>
      <React.Suspense fallback={<p className="focus-pdf-status">Caricamento lettore PDF…</p>}>
        <FocusPdfViewer source={pdf} lectureId={lectureId} onChange={() => void select()} onHide={() => setShowPdf(false)} onAttachPages={canSelectSlides ? onAttachPages : undefined} />
      </React.Suspense>
    </div>}
    {layout.showPdf && <PaneDivider label="Larghezza delle slide" value={ratio} onReset={center} onStep={delta => resize(ratio + delta)}
      onDrag={clientX => {
        if (!root.current) return
        const bounds = root.current.getBoundingClientRect()
        const available = bounds.width - (qna ? layout.qnaWidth + 10 : 0) - 10
        const requested = (clientX - bounds.left) / available
        // Recentring or giving slides more space restores the two-column workspace.
        if (qna && requested >= 0.49) { onCloseQna(); resize((clientX - bounds.left) / (bounds.width - 10)) }
        else resize(requested)
      }} />}
    <section className="focus-explanation-column" aria-label="Spiegazione del professore">
      <div className="focus-pane-toolbar">
        <span className="focus-pane-label">Spiegazione</span>
        <MusicButton compact />
        {qnaButton}
        {exportRequest && <PdfExportButton key={`${lectureId}-${exportRequest.language}`} request={exportRequest} />}
        {mermaid.hasDiagrams && <button type="button" onClick={mermaid.toggleAll}>
          {mermaid.allHidden ? 'Mostra tutti gli schemi' : 'Nascondi tutti gli schemi'}
        </button>}
        <button aria-label="Riduci zoom spiegazione" onClick={() => onTextZoom(-0.1)}>−</button>
        <button aria-label="Ripristina zoom spiegazione" onClick={() => onTextZoom(1 - textZoom)}>{Math.round(textZoom * 100)}%</button>
        <button aria-label="Aumenta zoom spiegazione" onClick={() => onTextZoom(0.1)}>+</button>
        {pdf && !layout.showPdf && <button title={showPdf ? 'Le slide torneranno quando ci sarà spazio' : 'Mostra slide'} onClick={() => { setShowPdf(true); if (qna) onCloseQna() }}>Mostra PDF</button>}
        <button aria-label="Scegli PDF della lezione" title="Apri un PDF Notability in sola lettura" disabled={busy} onClick={() => void select()}>{busy ? 'Apertura…' : 'PDF'}</button>
      </div>
      {error && <div className="focus-pdf-inline-error" role="alert">{error} <button onClick={() => void select()}>Riprova</button><button aria-label="Chiudi errore PDF" onClick={() => setError(null)}>×</button></div>}
      {pdf && showPdf && !layout.showPdf && <div className="focus-pdf-space-hint">Slide temporaneamente nascoste per lasciare spazio alla lettura.</div>}
      <MermaidCollapseContext.Provider value={mermaid.controls}>{children}</MermaidCollapseContext.Provider>
    </section>
    {qna && <PaneDivider label="Larghezza della discussione" value={qnaRatio}
      onStep={delta => resizeQna(qnaRatio - delta)} onReset={() => setQnaRatio(0.29)}
      onDrag={clientX => {
        const bounds = root.current?.getBoundingClientRect()
        if (bounds) resizeQna((bounds.right - clientX) / bounds.width)
      }} />}
    {qna && <section className="focus-qna-column" style={{ width: layout.qnaWidth }} aria-label="Domande a Gemini">
      {qna}
    </section>}
  </div>
}
