import { useEffect, useRef, useState } from 'react'
import type { FocusScreenshot as Capture, ScreenshotRect } from '../../shared/focusScreenshot'
import { screenshotSource } from '../utils/screenshotSource'

export function FocusScreenshotButton() {
  const [capture, setCapture] = useState<Capture | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const token = useRef<string | null>(null)
  const mounted = useRef(true)
  const [message, setMessage] = useState('')
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (token.current) void window.archive.cancelFocusScreenshot(token.current).catch(() => {}) } }, [])
  async function begin() {
    if (pending.current) return
    pending.current = true; setBusy(true); setMessage('')
    try {
      const value = await window.archive.beginFocusScreenshot()
      if (!mounted.current) { await window.archive.cancelFocusScreenshot(value.token); return }
      token.current = value.token; setCapture(value)
    } catch { setMessage('Screenshot non disponibile. Riprova.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <>
    <button type="button" className="focus-screenshot-button" title="Screenshot · seleziona un rettangolo e salva in iCloud" aria-label="Screenshot" disabled={busy} onClick={() => void begin()}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v13H4Z" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" /></svg>
    </button>
    {message && <small role="status">{message}</small>}
    {capture && <ScreenshotSelection capture={capture} onClose={saved => {
      token.current = null; setCapture(null); setMessage(saved ? 'Screenshot salvato in iCloud' : '')
    }} />}
  </>
}

export function ScreenshotSelection({ capture, onClose }: { capture: Capture; onClose: (saved: boolean) => void }) {
  const [rect, setRect] = useState<ScreenshotRect | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLDialogElement>(null)
  const initialViewport = useRef({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => { root.current?.showModal() }, [])
  async function cancel() {
    if (pending.current) return
    await window.archive.cancelFocusScreenshot(capture.token)
    onClose(false)
  }
  async function save(selection: ScreenshotRect) {
    if (pending.current) return
    if (selection.width < 2 || selection.height < 2) { setError('Trascina per selezionare un rettangolo.'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      const viewport = initialViewport.current
      if (viewport.width !== window.innerWidth || viewport.height !== window.innerHeight) throw new Error('La finestra è cambiata. Annulla e acquisisci di nuovo lo schermo.')
      const scaleX = capture.width / viewport.width, scaleY = capture.height / viewport.height
      let enhanced: Uint8Array | null = null
      try { enhanced = await screenshotSource(selection) } catch { /* Native capture remains available if a PDF cannot be rendered. */ }
      await window.archive.saveFocusScreenshot(capture.token, { x: selection.x * scaleX, y: selection.y * scaleY, width: selection.width * scaleX, height: selection.height * scaleY }, enhanced ?? undefined)
      onClose(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Screenshot non salvato. Riprova.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <dialog ref={root} className="focus-screenshot-selection" aria-label="Seleziona screenshot" onCancel={event => { event.preventDefault(); void cancel() }}
    onPointerDown={event => {
      if (busy || event.button !== 0 || (event.target as Element).closest('button')) return
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { x: event.clientX, y: event.clientY }; setRect(null); setError('')
    }} onPointerMove={event => {
      const start = drag.current
      if (!start || busy) return
      const x = Math.max(0, Math.min(window.innerWidth, event.clientX)), y = Math.max(0, Math.min(window.innerHeight, event.clientY))
      setRect({ x: Math.min(start.x, x), y: Math.min(start.y, y), width: Math.abs(x - start.x), height: Math.abs(y - start.y) })
    }} onPointerUp={event => {
      const start = drag.current
      if (!start || busy) return
      drag.current = null
      const x = Math.max(0, Math.min(window.innerWidth, event.clientX)), y = Math.max(0, Math.min(window.innerHeight, event.clientY))
      const selection = { x: Math.min(start.x, x), y: Math.min(start.y, y), width: Math.abs(x - start.x), height: Math.abs(y - start.y) }
      setRect(selection); void save(selection)
    }} onPointerCancel={() => { drag.current = null; setRect(null) }}>
    <img src={capture.dataUrl} alt="" draggable={false} />
    {rect && <div className="screenshot-rectangle" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />}
    <div className="screenshot-instructions" role="status">{busy ? 'Salvataggio…' : error || 'Trascina un rettangolo · Esc per annullare'}
      <button type="button" disabled={busy} onClick={() => void cancel()}>Annulla</button>
      {error && rect && <button type="button" disabled={busy} onClick={() => void save(rect)}>Riprova</button>}
    </div>
  </dialog>
}
