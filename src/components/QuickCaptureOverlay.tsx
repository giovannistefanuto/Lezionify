import React, { useEffect, useRef, useState } from 'react'
import type { useQuickCapture } from '../hooks/useQuickCapture'
import { captureGroups, copyCapture } from '../utils/quickCapture'
import { MemoActivityPreview } from './MemoActivityPreview'

type Capture = ReturnType<typeof useQuickCapture>
export function QuickCaptureOverlay({ capture }: { capture: Capture }) {
  const [editing, setEditing] = useState<string | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [letter, setLetter] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLInputElement>('.postit-input')?.focus()
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [capture.selectedGroupId, capture.isLoaded])
  const copy = async (id?: string) => {
    try {
      await navigator.clipboard.writeText(copyCapture(capture.data, id))
      setFeedback('Copiato negli appunti.')
    } catch {
      setFeedback('Copia non riuscita. Riprova.')
    }
  }
  const groups = captureGroups(capture.data)
  return (
    <div className="quick-capture-backdrop" onClick={capture.closeOverlay}>
      <div
        className="quick-capture-deck"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Catture rapide"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const items = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)'
            ) ?? []
          )
          const first = items[0],
            last = items.at(-1)
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <header className="memo-heading">
          <div>
            <span className="memo-eyebrow">IL TUO SPAZIO</span>
            <h2>Memo</h2>
            <p>Attività e appunti, organizzati per gruppo.</p>
          </div>
          <span className="memo-progress">
            {capture.todos.filter((todo) => !todo.completed).length} da fare
          </span>
        </header>
        <div className="capture-toolbar memo-main-toolbar">
          <nav aria-label="Gruppi delle catture">
            {[{ id: 'all', name: 'Tutti', shortcut: '' }, ...groups].map(
              (group) => (
                <button
                  type="button"
                  key={group.id}
                  aria-pressed={capture.selectedGroupId === group.id}
                  disabled={!capture.isLoaded}
                  onClick={() => {
                    capture.selectGroup(group.id)
                    setFeedback('')
                  }}
                >
                  {group.name}
                  {group.shortcut && ` · Alt+${group.shortcut}`}
                </button>
              )
            )}
          </nav>
          <button
            type="button"
            disabled={!capture.isLoaded}
            onClick={() => {
              setEditing(null)
              setName('')
              setLetter('')
              setError('')
            }}
          >
            + Gruppo
          </button>
          <button type="button" onClick={() => void copy()}>
            Copia tutto
          </button>
          <button
            type="button"
            onClick={capture.closeOverlay}
            aria-label="Chiudi catture rapide"
          >
            ×
          </button>
        </div>
        {capture.error && (
          <p role="alert">
            {capture.error}{' '}
            {capture.isLoaded && (
              <button onClick={() => void capture.retrySave()}>
                Riprova salvataggio
              </button>
            )}
          </p>
        )}
        {feedback && <p role="status">{feedback}</p>}
        {editing !== undefined && (
          <form
            className="capture-toolbar"
            onSubmit={(event) => {
              event.preventDefault()
              const problem = capture.saveGroup(editing, name, letter)
              if (problem) setError(problem)
              else {
                setEditing(undefined)
                setError('')
              }
            }}
          >
            <label>
              Nome{' '}
              <input
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </label>
            <label>
              Lettera{' '}
              <input
                value={letter}
                maxLength={1}
                onChange={(event) =>
                  setLetter(event.target.value.toUpperCase())
                }
              />
            </label>
            <button type="submit">Salva gruppo</button>
            <button type="button" onClick={() => setEditing(undefined)}>
              Annulla
            </button>
            {error && <span role="alert">{error}</span>}
          </form>
        )}
        {groups
          .filter(
            (group) =>
              capture.selectedGroupId === 'all' ||
              capture.selectedGroupId === group.id
          )
          .map((group) => (
            <section
              key={group.id}
              className="capture-group"
              aria-label={group.name}
            >
              <div className="capture-toolbar">
                <h3>{group.name}</h3>
                <button onClick={() => void copy(group.id)}>
                  Copia gruppo
                </button>
                {group.id && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(group.id)
                        setName(group.name)
                        setLetter(group.shortcut)
                        setError('')
                      }}
                    >
                      Modifica gruppo
                    </button>
                    <button onClick={() => setDeleting(group.id)}>
                      Elimina gruppo
                    </button>
                  </>
                )}
              </div>
              {deleting === group.id && (
                <div role="alert">
                  Eliminare «{group.name}»? Attività e note verranno spostate in
                  Senza tag.
                  <button
                    onClick={() => {
                      capture.deleteGroup(group.id)
                      setDeleting(null)
                    }}
                  >
                    Conferma eliminazione
                  </button>
                  <button onClick={() => setDeleting(null)}>Annulla</button>
                </div>
              )}
              <CaptureGroup
                capture={capture}
                groupId={group.id}
                notes={group.notes}
              />
            </section>
          ))}
      </div>
    </div>
  )
}
function CaptureGroup({
  capture,
  groupId,
  notes
}: {
  capture: Capture
  groupId: string
  notes: string
}) {
  const [draft, setDraft] = useState('')
  const todos = capture.todos.filter((todo) => (todo.groupId ?? '') === groupId)
  return (
    <fieldset
      className="quick-capture-grid capture-fields"
      disabled={!capture.isLoaded}
    >
      <div className="postit-card postit-todo">
        <div className="postit-header">
          <span className="postit-title">Cose da fare</span>
          {todos.some((todo) => todo.completed) && (
            <button onClick={() => capture.clearCompletedTodos(groupId)}>
              Pulisci completati
            </button>
          )}
        </div>
        <form
          className="postit-input-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim()) {
              capture.addTodo(draft, groupId)
              setDraft('')
            }
          }}
        >
          <span>+</span>
          <input
            placeholder="Aggiungi un’attività e premi Invio"
            className="postit-input"
            aria-label="Nuova attività"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={10000}
          />
        </form>
        <div className="postit-todo-list">
          {!todos.length && (
            <p className="memo-empty">
              Nessuna attività in questo gruppo. Aggiungi la prima qui sopra.
            </p>
          )}
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`todo-item-row ${todo.completed ? 'is-completed' : ''}`}
            >
              <button
                className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                aria-label="Completa attività"
                aria-pressed={todo.completed}
                onClick={() => capture.toggleTodo(todo.id)}
              >
                {todo.completed ? '✓' : ''}
              </button>
              <MemoActivityPreview text={todo.text}>
                <input
                  className="todo-item-input"
                  aria-label="Testo attività"
                  value={todo.text}
                  maxLength={10000}
                  onChange={(event) =>
                    capture.updateTodoText(todo.id, event.target.value)
                  }
                />
              </MemoActivityPreview>
              <select
                aria-label="Sposta attività nel gruppo"
                value={todo.groupId ?? ''}
                onChange={(event) =>
                  capture.moveTodo(todo.id, event.target.value)
                }
              >
                {captureGroups(capture.data).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <button
                className="todo-delete-btn"
                aria-label="Elimina attività"
                onClick={() => capture.deleteTodo(todo.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="postit-card postit-notes">
        <div className="postit-header">
          <span className="postit-title">Note</span>
        </div>
        <div className="postit-notes-body">
          <textarea
            className="postit-textarea"
            placeholder="Annota idee, promemoria e cose da approfondire…"
            aria-label="Note del gruppo"
            value={notes}
            maxLength={1000000}
            spellCheck={false}
            onChange={(event) =>
              capture.updateNotes(event.target.value, groupId)
            }
            onKeyDown={(event) => {
              if (
                !(event.ctrlKey || event.metaKey) ||
                event.key.toLowerCase() !== 'b'
              )
                return
              event.preventDefault()
              const field = event.currentTarget,
                start = field.selectionStart,
                end = field.selectionEnd
              capture.updateNotes(
                notes.slice(0, start) +
                  '**' +
                  notes.slice(start, end) +
                  '**' +
                  notes.slice(end),
                groupId
              )
              requestAnimationFrame(() => {
                field.focus()
                field.setSelectionRange(start + 2, end + 2)
              })
            }}
          />
        </div>
      </div>
    </fieldset>
  )
}

import './memo.css'
