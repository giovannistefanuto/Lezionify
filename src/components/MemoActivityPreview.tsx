import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** A new dwell starts on every movement, including movement within the same row. */
export function MemoActivityPreview({
  text,
  children
}: {
  text: string
  children: React.ReactNode
}) {
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const wrapper = useRef<HTMLDivElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{
    left: number
    top: number
    text: string
  } | null>(null)
  const cancel = () => {
    clearTimeout(timer.current)
    setAnchor(null)
  }
  useEffect(() => {
    const hide = (event: Event) => {
      if (event.type === 'scroll' && event.target === tooltip.current) return
      clearTimeout(timer.current)
      setAnchor(null)
    }
    const scrollPreview = (event: WheelEvent) => {
      if (!tooltip.current) return
      event.preventDefault()
      tooltip.current.scrollTop += event.deltaY
    }
    const element = wrapper.current
    element?.addEventListener('wheel', scrollPreview, { passive: false })
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    window.addEventListener('blur', hide)
    return () => {
      clearTimeout(timer.current)
      element?.removeEventListener('wheel', scrollPreview)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
    }
  }, [text])
  const schedule = (element: HTMLElement) => {
    cancel()
    timer.current = setTimeout(() => {
      const bounds = element.getBoundingClientRect()
      setAnchor({
        text,
        left: Math.max(
          12,
          Math.min(
            bounds.left,
            window.innerWidth - Math.min(520, window.innerWidth - 24) - 12
          )
        ),
        top: Math.max(12, Math.min(bounds.bottom + 8, window.innerHeight - 220))
      })
    }, 1000)
  }
  return (
    <div
      ref={wrapper}
      className="memo-activity-preview"
      aria-describedby={anchor ? id : undefined}
      onPointerEnter={(event) => schedule(event.currentTarget)}
      onPointerMove={(event) => schedule(event.currentTarget)}
      onPointerLeave={cancel}
      onPointerDown={cancel}
      onKeyDown={cancel}
      onBlur={cancel}
    >
      {children}
      {anchor &&
        anchor.text === text &&
        createPortal(
          <div
            ref={tooltip}
            id={id}
            role="tooltip"
            className="memo-full-text"
            style={{
              left: anchor.left,
              top: anchor.top,
              maxHeight: Math.max(60, window.innerHeight - anchor.top - 12)
            }}
          >
            {text}
          </div>,
          document.fullscreenElement ?? document.body
        )}
    </div>
  )
}
