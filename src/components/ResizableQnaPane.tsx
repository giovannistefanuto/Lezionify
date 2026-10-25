import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PaneDivider } from './PaneDivider'
import { useNumericPreference } from '../hooks/useNumericPreference'
import { discussionWidth } from '../utils/focusLayout'

export function ResizableQnaPane({ children }: { children: ReactNode }) {
  const pane = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(1000)
  const [ratio, setRatio] = useNumericPreference('lezionify:qna-width:standard:v1', 0.4, 0.15, 0.85)
  useEffect(() => {
    const parent = pane.current?.parentElement
    if (!parent) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])
  const resize = (next: number) => setRatio(Math.max(0.15, Math.min(0.85, next)))
  return <>
    <PaneDivider label="Larghezza della discussione" value={ratio} onStep={delta => resize(ratio - delta)}
      onReset={() => setRatio(0.4)} onDrag={clientX => {
        const bounds = pane.current?.parentElement?.getBoundingClientRect()
        if (bounds) resize((bounds.right - clientX) / bounds.width)
      }} />
    <section ref={pane} className="resizable-qna-pane" style={{ width: discussionWidth(width, ratio) }} aria-label="Domande sulla lezione">
      {children}
    </section>
  </>
}
