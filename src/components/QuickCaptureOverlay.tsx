import { useModalFocus } from '../hooks/useModalFocus'
import React, { useEffect, useRef, useState } from 'react'
import type { useQuickCapture } from '../hooks/useQuickCapture'
import { captureGroups, copyCapture } from '../utils/quickCapture'
import { MemoTodoText } from './MemoTodoText'
import { CopyGuardDialog } from './CopyGuard'
import { COPY_PHRASES, isCopyProtected, readCopyGuardHours } from '../utils/copyGuard'

type Capture = ReturnType<typeof useQuickCapture>
export function QuickCaptureOverlay({ capture }: { capture: Capture }) {
  const [pendingCopy, setPendingCopy] = useState<{ text: string; phrase: string } | null>(null)
  const [editing, setEditing] = useState<string | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [letter, setLetter] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const actions = useRef<HTMLDetailsElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useModalFocus(panel, true)
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (actions.current && !actions.current.contains(event.target as Node))
        actions.current.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLInputElement>('.postit-input')?.focus()
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [capture.selectedGroupId, capture.isLoaded])
  const performCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setPendingCopy(null)
      setFeedback('Copiato negli appunti.')
      return true
    } catch {
      setFeedback('Copia non riuscita. Riprova.')
      return false
    }
  }
  const copy = async (id?: string) => {
    const text = copyCapture(capture.data, id)
    if (isCopyProtected(new Date(), readCopyGuardHours())) {
      setPendingCopy({ text, phrase: COPY_PHRASES[Math.floor(Math.random() * COPY_PHRASES.length)] })
      return
    }
    await performCopy(text)
  }
  const groups = captureGroups(capture.data)
  return (
    <div className="quick-capture-backdrop" onClick={capture.closeOverlay}>
      <div
        className="quick-capture-deck"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Memo"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const items = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary'
            ) ?? []
          ).filter((element) => element.getClientRects().length)
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
          <div className="memo-heading-actions">
            <span className="memo-progress">
              {capture.todos.filter((todo) => !todo.completed).length} da fare
            </span>
            <button
              type="button"
              className="memo-close"
              onClick={capture.closeOverlay}
              aria-label="Chiudi Memo"
            >
              ×
            </button>
          </div>
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
                    setEditing(undefined)
                    setDeleting(null)
                    if (actions.current) actions.current.open = false
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
        </div>
        <div className="memo-view-actions">
          <div>
            <h3>
              {capture.selectedGroupId === 'all'
                ? 'Tutte le attività'
                : groups.find((group) => group.id === capture.selectedGroupId)
                    ?.name}
            </h3>
            <span>
              {capture.selectedGroupId === 'all'
                ? 'Una lista, tutti i gruppi'
                : 'Attività e appunti del gruppo'}
            </span>
          </div>
          <div className="memo-view-buttons">
            <button
              type="button"
              disabled={!capture.isLoaded}
              onClick={() =>
                void copy(
                  capture.selectedGroupId === 'all'
                    ? undefined
                    : capture.selectedGroupId
                )
              }
            >
              {capture.selectedGroupId === 'all'
                ? 'Copia tutto'
                : 'Copia gruppo'}
            </button>
            {capture.selectedGroupId !== 'all' && (
              <details
                className="memo-group-actions"
                ref={actions}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && actions.current?.open) {
                    event.preventDefault()
                    event.stopPropagation()
                    actions.current.open = false
                    actions.current.querySelector('summary')?.focus()
                  }
                }}
              >
                <summary aria-label="Azioni gruppo">⋯</summary>
                <div className="memo-group-action-list">
                  <button
                    type="button"
                    disabled={!capture.isLoaded}
                    onClick={() => {
                      void copy()
                      if (actions.current) actions.current.open = false
                    }}
                  >
                    Copia tutto
                  </button>
                  {capture.selectedGroupId !== '' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const group = groups.find(
                            (item) => item.id === capture.selectedGroupId
                          )!
                          setEditing(group.id)
                          setName(group.name)
                          setLetter(group.shortcut)
                          setError('')
                          if (actions.current) actions.current.open = false
                        }}
                      >
                        Modifica gruppo
                      </button>
                      <button
                        type="button"
                        className="memo-danger-action"
                        onClick={() => {
                          setDeleting(capture.selectedGroupId)
                          if (actions.current) actions.current.open = false
                        }}
                      >
                        Elimina gruppo
                      </button>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
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
            className="capture-toolbar memo-group-form"
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
        {capture.selectedGroupId === 'all' && (
          <>
            <CaptureGroup capture={capture} groupId="" notes="" all />
            <details className="memo-all-notes">
              <summary>Appunti</summary>
              {groups.map((group) => (
                <details key={group.id}>
                  <summary>{group.name}</summary>
                  <CaptureGroup
                    capture={capture}
                    groupId={group.id}
                    notes={group.notes}
                    notesOnly
                  />
                </details>
              ))}
            </details>
          </>
        )}
        {groups
          .filter((group) => capture.selectedGroupId === group.id)
          .map((group) => (
            <section
              key={group.id}
              className="capture-group"
              aria-label={group.name}
            >
              {deleting === group.id && (
                <div role="alert" className="memo-delete-confirm">
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
      {pendingCopy && <CopyGuardDialog phrase={pendingCopy.phrase} onCancel={() => setPendingCopy(null)} onConfirm={() => performCopy(pendingCopy.text)} />}
    </div>
  )
}
function CaptureGroup({
  capture,
  groupId,
  notes,
  all = false,
  notesOnly = false
}: {
  capture: Capture
  groupId: string
  notes: string
  all?: boolean
  notesOnly?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const todos = capture.todos.filter(
    (todo) => all || (todo.groupId ?? '') === groupId
  )
  return (
    <fieldset
      className={`quick-capture-grid capture-fields${all || notesOnly ? ' memo-compact-fields' : ''}`}
      disabled={!capture.isLoaded}
    >
      {!notesOnly && (
        <div className="postit-card postit-todo">
          <div className="postit-header">
            <span className="postit-title">Cose da fare</span>
            {todos.some((todo) => todo.completed) && (
              <button
                className="memo-clear-completed"
                onClick={() =>
                  capture.clearCompletedTodos(all ? undefined : groupId)
                }
              >
                Pulisci completati
              </button>
            )}
          </div>
          <form
            className="postit-input-row"
            onSubmit={(event) => {
              event.preventDefault()
              if (draft.trim()) {
                capture.addTodo(draft, all ? newGroup : groupId)
                setDraft('')
              }
            }}
          >
            {all && (
              <select
                aria-label="Gruppo nuova attività"
                value={newGroup}
                onChange={(event) => setNewGroup(event.target.value)}
              >
                {captureGroups(capture.data).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
            <input
              placeholder="Aggiungi un’attività e premi Invio"
              className="postit-input"
              aria-label="Nuova attività"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={10000}
            />
            <button
              className="memo-add-todo"
              type="submit"
              disabled={!draft.trim()}
              aria-label="Aggiungi attività"
            >
              +
            </button>
          </form>
          <div className="postit-todo-list">
            {!todos.length && (
              <p className="memo-empty">
                Nessuna attività. Aggiungi la prima qui sopra.
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
                <MemoTodoText
                  text={todo.text}
                  onSave={(text) => capture.updateTodoText(todo.id, text)}
                />
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
      )}
      {!all && (
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
      )}
    </fieldset>
  )
}

import './memo.css'
