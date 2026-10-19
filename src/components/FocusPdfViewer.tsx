import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { FocusPdfDocument } from '../../shared/archive'
import { usePaneZoom } from '../hooks/usePaneZoom'
import { readPosition, writePosition } from '../utils/readingPosition'
import { QNA_IMAGE_LIMIT, QNA_IMAGE_MAX_BYTES, type QnaImageInput } from '../../shared/qnaImages'

GlobalWorkerOptions.workerSrc = workerUrl

function PdfPage({ document, number, width, ratio, scrollRoot, onGeometryChange, selected, onSelect }: {
  document: PDFDocumentProxy; number: number; width: number; ratio: number; scrollRoot: HTMLDivElement | null
  onGeometryChange: () => void
  selected?: boolean; onSelect?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [aspect, setAspect] = useState(ratio)
  const [error, setError] = useState(false)
  const previousAspect = useRef(aspect)
  useLayoutEffect(() => {
    if (previousAspect.current !== aspect) onGeometryChange()
    previousAspect.current = aspect
  }, [aspect, onGeometryChange])
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { root: scrollRoot, rootMargin: '700px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [scrollRoot])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !visible || width <= 0) return
    let cancelled = false
    let render: RenderTask | undefined
    void (async () => {
      try {
        const page = await document.getPage(number)
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        setAspect(base.height / base.width)
        const viewport = page.getViewport({ scale: width / base.width })
        // Limit a single canvas to ~8M pixels even at high zoom on a HiDPI screen.
        const outputScale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)))
        canvas.width = Math.ceil(viewport.width * outputScale)
        canvas.height = Math.ceil(viewport.height * outputScale)
        render = page.render({ canvas, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] })
        await render.promise
        if (!cancelled) setError(false)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
      render?.cancel()
      // Release offscreen bitmap memory; the page placeholder preserves scrolling.
      canvas.width = 0
      canvas.height = 0
    }
  }, [document, number, width, visible])
  return <div ref={ref} className="focus-pdf-page" style={{ width, height: width * aspect, position: 'relative' }} role="group" aria-label={`Pagina ${number}`}>
    {onSelect && <label className="pdf-page-select"><input type="checkbox" checked={Boolean(selected)} onChange={onSelect} aria-label={`Seleziona pagina ${number} per Gemini`} /> Pagina {number}</label>}
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    {error && <p className="focus-pdf-page-error" role="alert">Pagina {number} non leggibile. Riapri il PDF per riprovare.</p>}
  </div>
}

export function FocusPdfViewer({ source, lectureId, onChange, onHide, onAttachPages, startPage }: {
  startPage?: number
  source: FocusPdfDocument; lectureId: string; onChange: () => void; onHide: () => void
  onAttachPages?: (images: QnaImageInput[]) => Promise<void>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<{ page: number; y: number; x: number } | null>(null)
  const geometryRef = useRef<Array<{ top: number; left: number; width: number; height: number }>>([])
  const restoredScrollRef = useRef<{ top: number; left: number } | null>(null)
  const persistenceRef = useRef<{ key: string; fingerprint: string } | null>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [attaching, setAttaching] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const attachmentRevision = useRef(0)
  const selectionEnabled = Boolean(onAttachPages)
  useEffect(() => {
    if (!selectionEnabled) {
      attachmentRevision.current++
      setSelected([]); setAttaching(false); setAttachmentError(null)
    }
  }, [selectionEnabled])
  useEffect(() => {
    attachmentRevision.current++
    setSelected([]); setAttaching(false); setAttachmentError(null)
    // Invalidate in-flight renders on source change and unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { attachmentRevision.current++ }
  }, [source.id, lectureId])
  const attach = async () => {
    if (!document || !onAttachPages || attaching || !selected.length) return
    const revision = attachmentRevision.current
    setAttaching(true); setAttachmentError(null)
    try {
      const images: QnaImageInput[] = []
      for (const number of [...selected].sort((a, b) => a - b)) {
        const page = await document.getPage(number)
        if (revision !== attachmentRevision.current) return
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: Math.min(2048 / Math.max(base.width, base.height), 3) })
        const canvas = window.document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        try {
          await page.render({ canvas, viewport, background: '#ffffff' }).promise
          const data = canvas.toDataURL('image/png').split(',')[1]
          if (Math.ceil(data.length * 3 / 4) > QNA_IMAGE_MAX_BYTES) throw new Error('Una pagina supera 2 MB. Seleziona una pagina meno complessa; la qualità non viene ridotta in silenzio.')
          images.push({ page: number, data })
        } finally { canvas.width = 0; canvas.height = 0 }
      }
      if (revision !== attachmentRevision.current) return
      await onAttachPages(images)
      if (revision === attachmentRevision.current) setSelected([])
    } catch (error) { if (revision === attachmentRevision.current) setAttachmentError(error instanceof Error ? error.message : 'Impossibile allegare le slide. Riprova.') }
    finally { if (revision === attachmentRevision.current) setAttaching(false) }
  }
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [ratio, setRatio] = useState(1.414)
  const changeZoom = useCallback((delta: number) => setZoom(previous => Math.min(4, Math.max(0.5, previous + delta))), [])
  usePaneZoom(scrollRef, changeZoom)

  const preservePosition = useCallback(() => {
    const container = scrollRef.current
    if (!container || !container.clientWidth || !container.clientHeight) return
    const bounds = container.getBoundingClientRect()
    const geometry = Array.from(pagesRef.current?.children ?? []).map(element => {
      const page = element.getBoundingClientRect()
      return { top: page.top - bounds.top + container.scrollTop, left: page.left - bounds.left + container.scrollLeft, width: page.width, height: page.height }
    })
    if (!geometry.length || geometry.some(page => !page.height)) return
    const anchor = anchorRef.current
    if (anchor) {
      const page = geometry[anchor.page]
      if (page) {
        container.scrollTop = page.top + anchor.y * page.height
        container.scrollLeft = page.left + anchor.x * page.width
        restoredScrollRef.current = { top: container.scrollTop, left: container.scrollLeft }
      }
    } else {
      anchorRef.current = { page: 0, y: (container.scrollTop - geometry[0].top) / geometry[0].height, x: (container.scrollLeft - geometry[0].left) / geometry[0].width }
    }
    geometryRef.current = geometry
    const firstVisible = geometry.findIndex(page => page.top + page.height > container.scrollTop)
    setCurrentPage((firstVisible < 0 ? geometry.length - 1 : firstVisible) + 1)
  }, [])

  useLayoutEffect(preservePosition, [width, zoom, document, preservePosition])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const trackPosition = () => {
      if (!container.clientWidth || !container.clientHeight) return
      const restored = restoredScrollRef.current
      if (restored && Math.abs(restored.top - container.scrollTop) < 1 && Math.abs(restored.left - container.scrollLeft) < 1) return
      restoredScrollRef.current = null
      const pages = geometryRef.current
      if (!pages.length) return
      let page = pages.findIndex(item => item.top + item.height > container.scrollTop)
      if (page < 0) page = pages.length - 1
      const item = pages[page]
      anchorRef.current = { page, y: (container.scrollTop - item.top) / item.height, x: (container.scrollLeft - item.left) / item.width }
      const identity = persistenceRef.current
      if (identity) writePosition(identity.key, identity.fingerprint, anchorRef.current)
      setCurrentPage(page + 1)
    }
    container.addEventListener('scroll', trackPosition, { passive: true })
    const observer = new ResizeObserver(preservePosition)
    observer.observe(container)
    return () => { container.removeEventListener('scroll', trackPosition); observer.disconnect() }
  }, [preservePosition])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      // Keep the last visible geometry while Q&A temporarily hides the PDF.
      if (entries[0].contentRect.width > 0) setWidth(Math.max(100, entries[0].contentRect.width - 32))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    setDocument(null)
    setCurrentPage(1)
    setError(null)
    setZoom(1)
    anchorRef.current = null
    geometryRef.current = []
    restoredScrollRef.current = null
    persistenceRef.current = null
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    const assets = new URL('./pdf-assets/', window.location.href).href
    const task = getDocument({
      url: source.url, enableXfa: false,
      cMapUrl: `${assets}cmaps/`, cMapPacked: true,
      standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`
    })
    task.onPassword = () => {
      if (!cancelled) setError('Questo PDF richiede una password. Scegli una copia PDF senza password.')
      void task.destroy().catch(() => {})
    }
    void task.promise.then(async pdf => {
      const first = await pdf.getPage(1)
      if (cancelled) return
      const viewport = first.getViewport({ scale: 1 })
      const fingerprint = pdf.fingerprints[0]
      const key = fingerprint ? `pdf:${lectureId}:${fingerprint}` : null
      persistenceRef.current = key && fingerprint ? { key, fingerprint } : null
      const saved = key && fingerprint ? readPosition(key, fingerprint) : null
      anchorRef.current = startPage && startPage >= 1 && startPage <= pdf.numPages ? { page: startPage - 1, x: 0, y: 0 } : saved && saved.page < pdf.numPages ? saved : null
      setRatio(viewport.height / viewport.width)
      setDocument(pdf)
    }).catch(() => {
      if (!cancelled) setError(previous => previous ?? 'PDF non disponibile. Controlla la connessione e OneDrive, poi riprova.')
    })
    return () => {
      const identity = persistenceRef.current
      if (identity && anchorRef.current) writePosition(identity.key, identity.fingerprint, anchorRef.current)
      cancelled = true; void task.destroy().catch(() => {})
    }
  }, [source.id, source.url, lectureId, retry, startPage])

  return <section className="focus-pdf-viewer" aria-label="Slide PDF">
    <div className="focus-pane-toolbar">
      <button onClick={onChange} className="focus-pdf-name" title={`Scegli un altro PDF · ${source.name}`}>{source.name}</button>
      {document && !error && <span className="focus-pdf-page-count" aria-label={`Pagina ${currentPage} di ${document.numPages}`} title="Prima pagina visibile nel pannello delle slide">{currentPage}/{document.numPages}</span>}
      <button aria-label="Riduci zoom PDF" onClick={() => changeZoom(-0.1)}>−</button>
      <button aria-label="Adatta PDF alla colonna" title="Adatta alla larghezza" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
      <button aria-label="Aumenta zoom PDF" onClick={() => changeZoom(0.1)}>+</button>
      <button aria-label="Nascondi PDF" title="Nascondi PDF" onClick={onHide}>×</button>
    </div>
    {onAttachPages && document && !error && <div className="pdf-attach-toolbar">
      <button type="button" disabled={attaching || !selected.length} onClick={() => void attach()}>{attaching ? 'Preparazione locale…' : `Allega ${selected.length} slide alla domanda`}</button>
      <small>Massimo {QNA_IMAGE_LIMIT} pagine. Anteprima nella discussione prima di Invia.</small>
      {attachmentError && <p role="alert">{attachmentError}</p>}
    </div>}
    <div ref={scrollRef} className="focus-pdf-scroll" tabIndex={0} aria-label="Pagine PDF: scorri o usa Ctrl e rotella per lo zoom">
      {error ? <div className="focus-pdf-status" role="alert"><p>{error}</p><button onClick={() => setRetry(previous => previous + 1)}>Riprova</button><button onClick={onChange}>Scegli altro PDF</button></div>
        : !document ? <div className="focus-pdf-status" role="status"><p>Apertura PDF…</p><p>OneDrive potrebbe scaricare il file.</p><button onClick={onHide}>Annulla</button></div>
        : <div ref={pagesRef}>{Array.from({ length: document.numPages }, (_, index) => <PdfPage key={`${source.id}-${index}`} document={document} number={index + 1} width={width * zoom} ratio={ratio} scrollRoot={scrollRef.current} onGeometryChange={preservePosition} selected={selected.includes(index + 1)} onSelect={onAttachPages && !attaching ? () => {
          setAttachmentError(null)
          setSelected(previous => previous.includes(index + 1) ? previous.filter(page => page !== index + 1) : previous.length < QNA_IMAGE_LIMIT ? [...previous, index + 1] : previous)
          if (!selected.includes(index + 1) && selected.length >= QNA_IMAGE_LIMIT) setAttachmentError(`Seleziona al massimo ${QNA_IMAGE_LIMIT} pagine.`)
        } : undefined} />)}</div>}
    </div>
  </section>
}
