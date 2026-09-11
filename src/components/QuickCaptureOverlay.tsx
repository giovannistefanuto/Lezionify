import React, { useState, useRef, useEffect } from 'react'
import type { ScratchpadTodoItem } from '../../shared/archive'

interface QuickCaptureOverlayProps {
  isOpen: boolean
  onClose: () => void
  todos: ScratchpadTodoItem[]
  notes: string
  onAddTodo: (text: string) => void
  onToggleTodo: (id: string) => void
  onUpdateTodoText: (id: string, text: string) => void
  onDeleteTodo: (id: string) => void
  onClearCompletedTodos: () => void
  onUpdateNotes: (notes: string) => void
}

export function QuickCaptureOverlay({
  isOpen,
  onClose,
  todos,
  notes,
  onAddTodo,
  onToggleTodo,
  onUpdateTodoText,
  onDeleteTodo,
  onClearCompletedTodos,
  onUpdateNotes
}: QuickCaptureOverlayProps) {
  const [newTodoText, setNewTodoText] = useState('')
  const newTodoInputRef = useRef<HTMLInputElement | null>(null)
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Focus automatico sul campo di inserimento all'apertura
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        newTodoInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Aggiunta To-Do con Enter
  const handleKeyDownNewTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (newTodoText.trim()) {
        onAddTodo(newTodoText)
        setNewTodoText('')
      }
    }
  }

  // Supporto grassetto con Ctrl+B (senza scritte di tutorial)
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      const textarea = notesTextareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = notes.substring(start, end)
      const replacement = `**${selected}**`

      const newText = notes.substring(0, start) + replacement + notes.substring(end)
      onUpdateNotes(newText)

      setTimeout(() => {
        textarea.focus()
        if (selected.length > 0) {
          textarea.setSelectionRange(start + 2, end + 2)
        } else {
          textarea.setSelectionRange(start + 2, start + 2)
        }
      }, 10)
    }
  }

  const [copiedTodos, setCopiedTodos] = useState(false)
  const [copiedNotes, setCopiedNotes] = useState(false)

  const handleCopyTodos = () => {
    if (todos.length === 0) return
    const text = todos.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedTodos(true)
        setTimeout(() => setCopiedTodos(false), 1800)
      })
      .catch(console.error)
  }

  const handleCopyNotes = () => {
    if (!notes.trim()) return
    navigator.clipboard
      .writeText(notes)
      .then(() => {
        setCopiedNotes(true)
        setTimeout(() => setCopiedNotes(false), 1800)
      })
      .catch(console.error)
  }

  if (!isOpen) return null

  const hasCompleted = todos.some((t) => t.completed)

  return (
    <div className="quick-capture-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quick-capture-deck" onClick={(e) => e.stopPropagation()}>
        {/* Griglia Minimale a Due Colonne */}
        <div className="quick-capture-grid">
          {/* Colonna Sinistra: Cose da fare */}
          <div className="postit-card postit-todo">
            <div className="postit-header">
              <span className="postit-title">Cose da fare</span>
              <div className="postit-header-actions">
                {todos.length > 0 && (
                  <button
                    type="button"
                    className="postit-copy-btn"
                    onClick={handleCopyTodos}
                    title="Copia cose da fare negli appunti (formato checklist)"
                  >
                    {copiedTodos ? '✓ Copiato!' : '📋 Copia'}
                  </button>
                )}
                {hasCompleted && (
                  <button
                    type="button"
                    className="postit-clear-btn"
                    onClick={onClearCompletedTodos}
                    title="Pulisci completati"
                  >
                    Pulisci
                  </button>
                )}
              </div>
            </div>

            {/* Input per nuova voce */}
            <div className="postit-input-row">
              <span className="postit-bullet-icon">+</span>
              <input
                ref={newTodoInputRef}
                type="text"
                className="postit-input"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={handleKeyDownNewTodo}
              />
            </div>

            {/* Lista To-Do */}
            <div className="postit-todo-list">
              {todos.map((todo) => (
                <div key={todo.id} className={`todo-item-row ${todo.completed ? 'is-completed' : ''}`}>
                  <button
                    type="button"
                    className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                    onClick={() => onToggleTodo(todo.id)}
                  >
                    {todo.completed ? '✓' : ''}
                  </button>
                  <input
                    type="text"
                    className="todo-item-input"
                    value={todo.text}
                    onChange={(e) => onUpdateTodoText(todo.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="todo-delete-btn"
                    onClick={() => onDeleteTodo(todo.id)}
                    title="Elimina"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Colonna Destra: Note */}
          <div className="postit-card postit-notes">
            <div className="postit-header">
              <span className="postit-title">Note</span>
              <div className="postit-header-actions">
                {notes.trim().length > 0 && (
                  <button
                    type="button"
                    className="postit-copy-btn"
                    onClick={handleCopyNotes}
                    title="Copia note negli appunti"
                  >
                    {copiedNotes ? '✓ Copiato!' : '📋 Copia'}
                  </button>
                )}
                <button
                  type="button"
                  className="quick-capture-corner-close"
                  onClick={onClose}
                  title="Chiudi"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="postit-notes-body">
              <textarea
                ref={notesTextareaRef}
                className="postit-textarea"
                value={notes}
                onChange={(e) => onUpdateNotes(e.target.value)}
                onKeyDown={handleNotesKeyDown}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
