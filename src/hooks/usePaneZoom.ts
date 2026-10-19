import { useEffect, type RefObject } from 'react'

/** Trackpad pinch, Ctrl+wheel, touch pinch and keyboard zoom are scoped to one pane. */
export function usePaneZoom(ref: RefObject<HTMLElement | null>, change: (delta: number) => void, enabled = true) {
  useEffect(() => {
    const pane = ref.current
    if (!pane || !enabled) return
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      event.stopPropagation()
      change(-event.deltaY * 0.005)
    }
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !['+', '=', '-'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      change(event.key === '-' ? -0.1 : 0.1)
    }
    const touches = new Map<number, { x: number; y: number }>()
    let distance = 0
    const measure = () => {
      const points = [...touches.values()]
      return points.length === 2 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0
    }
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      distance = measure()
    }
    const move = (event: PointerEvent) => {
      if (!touches.has(event.pointerId)) return
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const next = measure()
      if (distance && next) { event.preventDefault(); change((next - distance) * 0.008) }
      distance = next
    }
    const up = (event: PointerEvent) => { touches.delete(event.pointerId); distance = measure() }
    pane.addEventListener('wheel', wheel, { passive: false })
    pane.addEventListener('keydown', key)
    pane.addEventListener('pointerdown', down)
    pane.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      pane.removeEventListener('wheel', wheel)
      pane.removeEventListener('keydown', key)
      pane.removeEventListener('pointerdown', down)
      pane.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [ref, change, enabled])
}
