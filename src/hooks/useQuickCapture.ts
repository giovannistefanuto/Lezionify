import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScratchpadData, ScratchpadTodoItem } from '../../shared/archive'

export function useQuickCapture() {
  const [isOpen, setIsOpen] = useState(false)
  const [todos, setTodos] = useState<ScratchpadTodoItem[]>([])
  const [notes, setNotes] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const revisionRef = useRef(0)
  const persistedRevisionRef = useRef(0)
  const latestDataRef = useRef<ScratchpadData>({
    todos: [],
    notes: '',
    updatedAt: new Date().toISOString()
  })

  // Caricamento iniziale dei dati
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      if (window.archive?.getScratchpad) {
        try {
          const data = await window.archive.getScratchpad()
          if (isMounted) {
            const loaded = {
              todos: data.todos || [],
              notes: data.notes || '',
              updatedAt: data.updatedAt || new Date().toISOString()
            }
            latestDataRef.current = loaded
            setTodos(loaded.todos)
            setNotes(loaded.notes)
            setIsLoaded(true)
          }
        } catch (err) {
          console.error('Errore durante il caricamento dello scratchpad:', err)
          if (isMounted) setIsLoaded(true)
        }
      }
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Funzione di salvataggio su disco
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (!window.archive?.saveScratchpad) return
    const revision = revisionRef.current
    if (revision <= persistedRevisionRef.current) return
    const snapshot: ScratchpadData = {
      todos: latestDataRef.current.todos.map((item) => ({ ...item })),
      notes: latestDataRef.current.notes,
      updatedAt: latestDataRef.current.updatedAt
    }
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await window.archive.saveScratchpad(snapshot)
        persistedRevisionRef.current = Math.max(persistedRevisionRef.current, revision)
      } catch (err) {
        console.error('Errore durante il salvataggio dello scratchpad:', err)
      }
    })
    await saveQueueRef.current
  }, [])

  // Trigger di salvataggio debouncato (300ms)
  const scheduleSave = useCallback(() => {
    if (!isLoaded) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      void flushSave()
    }, 300)
  }, [isLoaded, flushSave])

  const updateData = useCallback(
    (nextTodos: ScratchpadTodoItem[], nextNotes: string) => {
      const snapshot: ScratchpadData = {
        todos: nextTodos,
        notes: nextNotes,
        updatedAt: new Date().toISOString()
      }
      latestDataRef.current = snapshot
      revisionRef.current += 1
      setTodos(nextTodos)
      setNotes(nextNotes)
      scheduleSave()
    },
    [scheduleSave]
  )

  // Flush su scaricamento del componente
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        void flushSave()
      }
    }
  }, [flushSave])

  // Gestione scorciatoie da tastiera globali (Ctrl+M, Ctrl+P, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      // Toggle con Ctrl+M o Ctrl+P
      if (isCtrlOrCmd && (key === 'm' || key === 'p')) {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen((prev) => {
          if (prev) {
            // In chiusura, salvataggio immediato
            void flushSave()
          }
          return !prev
        })
        return
      }

      // Se l'overlay è aperto, Escape chiude SOLO l'overlay
      if (isOpen && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        setIsOpen(false)
        void flushSave()
      }
    }

    // Usa cattura (true) per avere priorità assoluta su altri listener (come modal o full screen)
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, flushSave])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) void flushSave()
      return !prev
    })
  }, [flushSave])

  const closeOverlay = useCallback(() => {
    setIsOpen(false)
    void flushSave()
  }, [flushSave])

  // --- Operazioni To-Do ---
  const addTodo = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const newItem: ScratchpadTodoItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        completed: false,
        createdAt: new Date().toISOString()
      }
      updateData([...latestDataRef.current.todos, newItem], latestDataRef.current.notes)
    },
    [updateData]
  )

  const toggleTodo = useCallback(
    (id: string) => {
      updateData(
        latestDataRef.current.todos.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item
        ),
        latestDataRef.current.notes
      )
    },
    [updateData]
  )

  const updateTodoText = useCallback(
    (id: string, text: string) => {
      updateData(
        latestDataRef.current.todos.map((item) => (item.id === id ? { ...item, text } : item)),
        latestDataRef.current.notes
      )
    },
    [updateData]
  )

  const deleteTodo = useCallback(
    (id: string) => {
      updateData(
        latestDataRef.current.todos.filter((item) => item.id !== id),
        latestDataRef.current.notes
      )
    },
    [updateData]
  )

  const clearCompletedTodos = useCallback(() => {
    updateData(
      latestDataRef.current.todos.filter((item) => !item.completed),
      latestDataRef.current.notes
    )
  }, [updateData])

  // --- Operazioni Note ---
  const updateNotes = useCallback(
    (newNotes: string) => {
      updateData(latestDataRef.current.todos, newNotes)
    },
    [updateData]
  )

  return {
    isOpen,
    setIsOpen,
    toggleOpen,
    closeOverlay,
    todos,
    notes,
    addTodo,
    toggleTodo,
    updateTodoText,
    deleteTodo,
    clearCompletedTodos,
    updateNotes
  }
}
