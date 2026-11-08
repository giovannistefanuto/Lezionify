import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { studySurfaceBlocked } from '../utils/studyActivity'

export function StudyEstimateDetails({ label, uncertainty, paused, onRecalculate }: {
  label: string | null; uncertainty: string | null; paused: boolean; onRecalculate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 48 })
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => { if (paused) { setOpen(false); setPinned(false) } }, [paused])
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = button.current?.getBoundingClientRect()
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.right - 360, window.innerWidth - Math.min(360, window.innerWidth - 24) - 12)), top: Math.max(12, Math.min(rect.bottom, window.innerHeight - 92)) })
    }
    place()
    const observer = new ResizeObserver(place)
    const toolbar = button.current?.closest('.focus-mode-toolbar')
    if (toolbar) observer.observe(toolbar)
    window.addEventListener('resize', place)
    return () => { observer.disconnect(); window.removeEventListener('resize', place) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { setOpen(false); setPinned(false) }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !studySurfaceBlocked()) {
        event.preventDefault(); event.stopPropagation(); button.current?.focus(); setPinned(false); setOpen(false)
      }
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])
  return <div ref={root} className="study-estimate-details"
    onMouseEnter={() => setOpen(true)}
    onMouseLeave={() => { if (!pinned && !root.current?.contains(document.activeElement)) setOpen(false) }}
    onFocus={() => setOpen(true)}
    onBlur={event => { if (!root.current?.contains(event.relatedTarget)) { setOpen(false); setPinned(false) } }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault(); event.stopPropagation(); button.current?.focus(); setPinned(false); setOpen(false)
      }
    }}>
    <button ref={button} type="button" className="study-estimate-trigger" aria-label="Stima del tempo di studio"
      aria-expanded={open} aria-controls={id} onClick={() => { setPinned(!pinned); setOpen(!pinned) }}>
      <span aria-hidden="true">🌱</span>
    </button>
    {open && <section id={id} className="study-estimate-panel" aria-label="Stima del tempo di studio" style={{
      left: `clamp(12px, ${position.left}px, calc(100vw - min(360px, calc(100vw - 24px)) - 12px))`,
      top: `clamp(12px, ${position.top}px, calc(100dvh - 92px))`,
      maxHeight: `calc(100dvh - clamp(12px, ${position.top}px, calc(100dvh - 92px)) - 12px)`
    }}>
      <h3>Tempo di studio</h3>
      <p>{paused ? 'Stima sospesa' : label ?? 'Raccolta dei primi campioni di studio…'}</p>
      {!paused && label && uncertainty && <p className="study-estimate-uncertainty">{uncertainty}</p>}
      <p className="study-estimate-help">Il margine usa gli errori delle lezioni completate nella stessa fase: inizio, metà o fine. Non misura la comprensione.</p>
      <button type="button" className="secondary-button small" onClick={onRecalculate}>Ricalcola da qui</button>
      <small>Riparte dalla posizione attuale; scarta le previsioni in corso, conserva lo storico concluso.</small>
    </section>}
  </div>
}
