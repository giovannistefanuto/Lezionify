import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import './sessione.css'

export function SessionDialog({ title, onClose, children, workspace = false, alignSidebar = false }: {
  title: string
  onClose: () => void
  children: ReactNode
  workspace?: boolean
  alignSidebar?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useLayoutEffect(() => {
    const element = ref.current
    const previous = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={ref} aria-labelledby={titleId} data-study-exclusion="sessione"
    className={`session-dialog${workspace ? ' session-overlay' : ''}${alignSidebar ? ' session-docked' : ''}`}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}>
    <header className="session-dialog-header">
      <h2 id={titleId}>{title}</h2>
      <button type="button" onClick={onClose} aria-label={`Chiudi ${title}`}>×</button>
    </header>
    {children}
  </dialog>
}
