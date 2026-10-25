import { useId, useRef, useState } from 'react'
import { MemoActivityPreview } from './MemoActivityPreview'

export function MemoTodoText({
  text,
  onSave
}: {
  text: string
  onSave: (text: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const textId = useId()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const cancelled = useRef(false)
  const start = () => {
    cancelled.current = false
    setDraft(text)
    setEditing(true)
  }
  const save = () => {
    if (cancelled.current) return
    const next = draft.trim()
    if (next && next !== text) onSave(next)
    setEditing(false)
  }
  if (editing)
    return (
      <input
        data-memo-editing
        className="todo-item-input is-editing"
        aria-label="Modifica testo attività"
        autoFocus
        value={draft}
        maxLength={10000}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter') {
            event.preventDefault()
            save()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            cancelled.current = true
            setEditing(false)
          }
        }}
      />
    )
  return (
    <div className="memo-todo-text">
      {!expanded && <MemoActivityPreview text={text}>
        <textarea className="todo-item-input memo-text-preview" aria-label="Testo attività" readOnly rows={2} value={text}
          title="Doppio clic per modificare · F2 o Invio da tastiera"
          onDoubleClick={start} onKeyDown={event => {
            if (event.key === 'F2' || event.key === 'Enter') { event.preventDefault(); start() }
          }} />
      </MemoActivityPreview>}
      {expanded && <p id={textId} className="memo-expanded-text">{text}</p>}
      <span className="memo-text-actions">
        <button type="button" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Riduci' : 'Leggi tutto'}</button>
        <button type="button" aria-label="Modifica attività" onClick={start}>Modifica</button>
      </span>
    </div>
  )
}
