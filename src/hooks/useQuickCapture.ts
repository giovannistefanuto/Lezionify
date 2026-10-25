import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ScratchpadData,
  ScratchpadTodoItem,
  ScratchpadGroup
} from '../../shared/archive'

export function useQuickCapture() {
  const [isOpen, setIsOpen] = useState(false)
  const [todos, setTodos] = useState<ScratchpadTodoItem[]>([])
  const [notes, setNotes] = useState('')
  const [groups, setGroups] = useState<ScratchpadGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [error, setError] = useState<string | null>(null)
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
            const loaded: ScratchpadData = {
              ...data,
              todos: data.todos || [],
              notes: data.notes || '',
              updatedAt: data.updatedAt || new Date().toISOString()
            }
            latestDataRef.current = loaded
            setGroups(loaded.groups ?? [])
            setSelectedGroupId(loaded.selectedGroupId ?? '')
            setTodos(loaded.todos)
            setNotes(loaded.notes)
            setIsLoaded(true)
          }
        } catch (err) {
          console.error('Errore durante il caricamento dello scratchpad:', err)
          if (isMounted)
            setError(
              'Impossibile caricare le catture. Riapri l’app prima di modificarle.'
            )
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
      ...latestDataRef.current,
      groups: latestDataRef.current.groups?.map((group) => ({ ...group })),
      todos: latestDataRef.current.todos.map((item) => ({ ...item })),
      notes: latestDataRef.current.notes,
      updatedAt: latestDataRef.current.updatedAt
    }
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      try {
        await window.archive.saveScratchpad(snapshot)
        setError(null)
        persistedRevisionRef.current = Math.max(
          persistedRevisionRef.current,
          revision
        )
      } catch (err) {
        setError(
          'Salvataggio non riuscito. Le modifiche sono ancora in memoria. Riprova.'
        )
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
    (
      nextTodos: ScratchpadTodoItem[],
      nextNotes: string,
      patch: Partial<ScratchpadData> = {}
    ) => {
      if (!isLoaded) return
      const snapshot: ScratchpadData = {
        ...latestDataRef.current,
        ...patch,
        todos: nextTodos,
        notes: nextNotes,
        updatedAt: new Date().toISOString()
      }
      latestDataRef.current = snapshot
      revisionRef.current += 1
      setGroups(snapshot.groups ?? [])
      setSelectedGroupId(snapshot.selectedGroupId ?? '')
      setTodos(nextTodos)
      setNotes(nextNotes)
      scheduleSave()
    },
    [scheduleSave, isLoaded]
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
        if (document.querySelector('[data-memo-copy-dialog]')) return
        if (e.target instanceof HTMLElement && e.target.closest('[data-memo-editing]')) return
        if (e.target instanceof HTMLElement && e.target.closest('.memo-group-actions[open]')) return
        if (document.querySelector('[data-dictionary-overlay]')) return
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
    (text: string, groupId = latestDataRef.current.selectedGroupId ?? '') => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (latestDataRef.current.todos.length >= 1_000) {
        setError(
          'Limite di 1.000 attività raggiunto. Elimina alcune voci prima di aggiungerne altre.'
        )
        return
      }
      const newItem: ScratchpadTodoItem = {
        ...(groupId && groupId !== 'all' ? { groupId } : {}),
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: trimmed,
        completed: false,
        createdAt: new Date().toISOString()
      }
      updateData(
        [...latestDataRef.current.todos, newItem],
        latestDataRef.current.notes
      )
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
        latestDataRef.current.todos.map((item) =>
          item.id === id ? { ...item, text } : item
        ),
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

  const clearCompletedTodos = useCallback(
    (groupId = latestDataRef.current.selectedGroupId ?? '') => {
      updateData(
        latestDataRef.current.todos.filter(
          (item) => !item.completed || (groupId !== 'all' && (item.groupId ?? '') !== groupId)
        ),
        latestDataRef.current.notes
      )
    },
    [updateData]
  )

  // --- Operazioni Note ---
  const updateNotes = useCallback(
    (
      newNotes: string,
      groupId = latestDataRef.current.selectedGroupId ?? ''
    ) => {
      updateData(
        latestDataRef.current.todos,
        groupId ? latestDataRef.current.notes : newNotes,
        groupId
          ? {
              groups: latestDataRef.current.groups?.map((group) =>
                group.id === groupId ? { ...group, notes: newNotes } : group
              )
            }
          : {}
      )
    },
    [updateData]
  )

  const selectGroup = useCallback(
    (id: string) => {
      updateData(latestDataRef.current.todos, latestDataRef.current.notes, {
        selectedGroupId: id
      })
    },
    [updateData]
  )
  const saveGroup = useCallback(
    (id: string | null, name: string, shortcut: string) => {
      const current = latestDataRef.current
      name = name.trim()
      shortcut = shortcut.trim().toUpperCase()
      const other = (current.groups ?? []).filter((group) => group.id !== id)
      if (!isLoaded) return 'Attendi il caricamento delle catture.'
      if (
        ['senza tag', 'tutti'].includes(name.toLocaleLowerCase()) ||
        !name ||
        name.length > 80 ||
        !/^[A-Z]$/.test(shortcut) ||
        other.some(
          (group) =>
            group.shortcut === shortcut ||
            group.name.toLocaleLowerCase() === name.toLocaleLowerCase()
        ) ||
        (!id && other.length >= 26)
      )
        return 'Usa un nome distinto (massimo 80 caratteri) e una lettera A–Z libera.'
      const group: ScratchpadGroup = {
        id: id ?? crypto.randomUUID(),
        name,
        shortcut,
        notes: current.groups?.find((group) => group.id === id)?.notes ?? ''
      }
      updateData(current.todos, current.notes, {
        groups: id
          ? current.groups?.map((item) => (item.id === id ? group : item))
          : [...other, group],
        selectedGroupId: group.id
      })
      return null
    },
    [updateData, isLoaded]
  )
  const deleteGroup = useCallback(
    (id: string) => {
      const current = latestDataRef.current
      const group = current.groups?.find((item) => item.id === id)
      if (!group) return
      if (
        current.notes.length + group.notes.length + group.name.length + 8 >
        1_000_000
      ) {
        setError(
          'Le note unite superano il limite. Copia o riduci le note prima di eliminare il gruppo.'
        )
        return
      }
      updateData(
        current.todos.map((item) =>
          item.groupId === id ? { ...item, groupId: undefined } : item
        ),
        group.notes
          ? [current.notes, `## ${group.name}\n${group.notes}`]
              .filter(Boolean)
              .join('\n\n')
          : current.notes,
        {
          groups: current.groups?.filter((item) => item.id !== id),
          selectedGroupId: ''
        }
      )
    },
    [updateData]
  )
  const moveTodo = useCallback(
    (id: string, groupId: string) => {
      updateData(
        latestDataRef.current.todos.map((item) =>
          item.id === id ? { ...item, groupId: groupId || undefined } : item
        ),
        latestDataRef.current.notes
      )
    },
    [updateData]
  )
  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent) => {
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        event.isComposing ||
        document.querySelector('[data-dictionary-overlay]')
      )
        return
      const group = groups.find(
        (item) => item.shortcut === event.key.toUpperCase()
      )
      if (group) {
        event.preventDefault()
        event.stopImmediatePropagation()
        selectGroup(group.id)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, groups, selectGroup])

  return {
    isOpen,
    groups,
    selectedGroupId,
    selectGroup,
    saveGroup,
    deleteGroup,
    moveTodo,
    isLoaded,
    error,
    retrySave: flushSave,
    data: latestDataRef.current,
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
