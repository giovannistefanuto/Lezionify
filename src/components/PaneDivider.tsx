import { useEffect, useRef } from 'react'

/** Pointer capture, keyboard and reset are shared by the PDF and discussion panes. */
export function PaneDivider({ label, value, onStep, onReset, onDrag }: {
  label: string; value: number; onStep: (delta: number) => void
  onReset: () => void; onDrag: (clientX: number) => void
}) {
  const pointer = useRef<number | null>(null)
  useEffect(() => {
    const stop = () => { pointer.current = null }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])
  return <div className="focus-resizer" role="separator" aria-label={label} aria-orientation="vertical"
    aria-valuemin={15} aria-valuemax={85} aria-valuenow={Math.round(value * 100)} tabIndex={0}
    title="Trascina per ridimensionare · doppio clic per ripristinare"
    onDoubleClick={onReset}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); onStep(event.key === 'ArrowLeft' ? -0.03 : 0.03)
      }
      if (event.key === 'Home') { event.preventDefault(); onReset() }
    }}
    onPointerDown={event => {
      if (event.button !== 0) return
      pointer.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
    }}
    onPointerMove={event => { if (pointer.current === event.pointerId) onDrag(event.clientX) }}
    onLostPointerCapture={() => { pointer.current = null }}
    onPointerUp={event => {
      pointer.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    }} />
}
