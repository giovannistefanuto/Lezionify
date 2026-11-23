import { useState, useEffect, useRef, useCallback } from 'react'
import type { QnaThread, QnaStatusUpdate } from '../../shared/archive'
import { useUpdateSave } from './useUpdateSave'
import { QNA_IMAGE_LIMIT, type QnaImageInput } from '../../shared/qnaImages'

export function useQna(lectureId: string | null) {
  const [threads, setThreads] = useState<QnaThread[]>([])
  const [activeThreadId, setActiveThreadState] = useState<string | null>(null)
  const setActiveThreadId = useCallback((id: string | null) => {
    setActiveThreadState(id)
    if (id && lectureId) {
      try { localStorage.setItem('lezionify:qna-last:' + lectureId, id) } catch { /* Optional UI preference. */ }
    }
  }, [lectureId])
  const latestThreads = useRef(threads)
  latestThreads.current = threads
  const [isGeneratingQna, setIsGeneratingQna] = useState(false)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [qnaStatuses, setQnaStatuses] = useState<
    Record<string, QnaStatusUpdate | null>
  >({})

  const currentLecture = useRef(lectureId)
  currentLecture.current = lectureId
  const loadingThreads = useRef<Promise<void>>(Promise.resolve())
  const loadFailed = useRef(false)
  const running = useRef(false)
  const preparingUpdate = useRef(false)
  const adding = useRef(false)
  const [isAttachingImages, setIsAttachingImages] = useState(false)
  const streaming = useRef<{ lectureId: string; threadId: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setThreads([])
    setActiveThreadState(null)
    setQnaError(null)
    setQnaStatuses({})
    loadFailed.current = false
    if (lectureId) {
      loadingThreads.current = window.archive
        .loadQnaThreads(lectureId)
        .then((loaded) => {
          if (!cancelled) { latestThreads.current = loaded || []; setThreads(loaded || []) }
        })
        .catch(() => {
          if (!cancelled) { loadFailed.current = true; setQnaError('Impossibile caricare la conversazione.') }
        })
    }
    return () => {
      cancelled = true
    }
  }, [lectureId])

  useUpdateSave(async () => {
    if (!lectureId) return
    preparingUpdate.current = true
    try {
      await loadingThreads.current
      if (loadFailed.current) throw new Error('Conversazioni non caricate: salvataggio rinviato.')
      await window.archive.cancelQnaResponses()
      while (running.current || adding.current) await new Promise(resolve => setTimeout(resolve, 20))
      await window.archive.saveQnaThreads(lectureId, latestThreads.current)
    } finally { preparingUpdate.current = false }
  }, Boolean(lectureId))

  // Ascolta gli aggiornamenti di stato diagnostici da Gemini
  useEffect(() => {
    if (!window.archive?.onQnaStatus) return
    const removeListener = window.archive.onQnaStatus((status) => {
      if (
        streaming.current?.lectureId !== currentLecture.current ||
        streaming.current?.threadId !== status.threadId
      )
        return
      setQnaStatuses((prev) => ({
        ...prev,
        [status.threadId]: status
      }))
    })
    return () => removeListener()
  }, [])

  // Ascolta i chunk in arrivo
  useEffect(() => {
    const removeListener = window.archive.onQnaChunk(({ threadId, chunk, reset }) => {
      if (
        streaming.current?.lectureId !== currentLecture.current ||
        streaming.current?.threadId !== threadId
      )
        return
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t
          const messages = [...t.messages]
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage.role === 'ai') {
              messages[messages.length - 1] = {
                ...lastMessage,
                text: reset ? chunk : lastMessage.text + chunk
              }
            }
          }
          return { ...t, messages }
        })
      )
    })
    return () => removeListener()
  }, [])

  const createThread = async (
    quote: string,
    anchorString: string,
    contextHeading: string | null
  ): Promise<string> => {
    if (running.current || adding.current)
      throw new Error('Attendi il completamento della risposta.')
    const newThread: QnaThread = {
      id: `qna-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      quote,
      anchorString,
      contextHeading,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const updated = [...threads, newThread]
    latestThreads.current = updated
    setThreads(updated)
    setActiveThreadId(newThread.id)
    if (lectureId) {
      await window.archive.saveQnaThreads(lectureId, updated)
    }
    return newThread.id
  }

  const sendMessage = async (
    threadId: string,
    text: string,
    useFullContext: boolean,
    includeOtherQna = false,
    responseLength: 'brief' | 'medium' | 'long' = 'brief',
    searchOnline = false,
    thinkDeeper = false
  ) => {
    if (preparingUpdate.current || !lectureId || running.current || adding.current || !text.trim()) return false
    const currentThread = threads.find((t) => t.id === threadId)
    if (!currentThread) return false
    const owner = lectureId
    running.current = true
    streaming.current = { lectureId: owner, threadId }
    setQnaError(null)
    setIsGeneratingQna(true)
    const lastMessage = currentThread.messages.at(-1)
    const history = lastMessage?.role === 'user' && lastMessage.text.trim() === text.trim()
      ? currentThread.messages.slice(0, -1) : currentThread.messages
    const requestThread: QnaThread = {
      ...currentThread,
      messages: [
        ...history,
        { role: 'user', text: text.trim(), timestamp: new Date().toISOString(), ...(currentThread.attachmentIds?.length ? { attachmentIds: [...currentThread.attachmentIds] } : {}) }
      ],
      updatedAt: new Date().toISOString()
    }
    const base = threads.map((t) => (t.id === threadId ? requestThread : t))
    setThreads(
      base.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: [
                ...t.messages,
                { role: 'ai', text: '', timestamp: new Date().toISOString() }
              ]
            }
          : t
      )
    )
    try {
      await window.archive.saveQnaThreads(owner, base)
      const res = await window.archive.generateQnaResponse(
        owner,
        requestThread,
        useFullContext,
        includeOtherQna,
        responseLength,
        searchOnline,
        thinkDeeper
      )
      if (!res.success || !res.text?.trim())
        throw new Error(res.error || 'Risposta vuota dal modello.')
      const final = base.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: [
                ...t.messages,
                {
                  role: 'ai' as const,
                  text: res.text!,
                  model: res.model,
                  thinking: res.thinking,
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : t
      )
      await window.archive.saveQnaThreads(owner, final)
      if (currentLecture.current === owner) { latestThreads.current = final; setThreads(final) }
      return true
    } catch (e) {
      if (currentLecture.current === owner) {
        if (preparingUpdate.current) {
          const partial = latestThreads.current.map(thread => thread.id !== threadId ? thread : {
            ...thread, messages: thread.messages.filter(message => message.role !== 'ai' || message.text.trim()).map((message, index, messages) =>
              message.role === 'ai' && index === messages.length - 1 ? { ...message, text: message.text + '\n\n_Risposta interrotta per aggiornamento._' } : message)
          })
          latestThreads.current = partial
          setThreads(partial)
          await window.archive.saveQnaThreads(owner, partial)
        } else setThreads(base)
        setQnaError(e instanceof Error ? e.message : 'Errore imprevisto')
      }
      return false
    } finally {
      streaming.current = null
      running.current = false
      setIsGeneratingQna(false)
    }
  }

  const deleteThread = async (threadId: string) => {
    if (running.current || adding.current) return
    if (!lectureId) return
    const updated = threads.filter((t) => t.id !== threadId)
    setThreads(updated)
    if (activeThreadId === threadId) {
      setActiveThreadId(null)
    }
    await window.archive.saveQnaThreads(lectureId, updated)
  }

  const attachImages = async (threadId: string, inputs: QnaImageInput[]) => {
    const owner = lectureId
    const thread = latestThreads.current.find(thread => thread.id === threadId)
    if (!owner || !thread || running.current || adding.current) throw new Error('Apri una conversazione e attendi la fine della risposta prima di allegare slide.')
    if (!inputs.length || (thread.attachmentIds?.length ?? 0) + inputs.length > QNA_IMAGE_LIMIT) throw new Error(`Puoi mantenere attive al massimo ${QNA_IMAGE_LIMIT} slide. Rimuovine una prima di aggiungerne altre.`)
    adding.current = true; setIsAttachingImages(true)
    const saved: string[] = []
    try {
      for (const input of inputs) saved.push((await window.archive.saveQnaImage(owner, threadId, input)).id)
      if (currentLecture.current !== owner) throw new Error('La lezione è cambiata: seleziona nuovamente le slide.')
      const updated = latestThreads.current.map(thread => thread.id === threadId ? { ...thread, attachmentIds: [...(thread.attachmentIds ?? []), ...saved] } : thread)
      await window.archive.saveQnaThreads(owner, updated)
      latestThreads.current = updated
      if (currentLecture.current === owner) setThreads(updated)
    } catch (error) { await Promise.all(saved.map(id => window.archive.deleteQnaImages({ id }).catch(() => {}))); throw error }
    finally { adding.current = false; setIsAttachingImages(false) }
  }
  const removeImage = async (threadId: string, id: string) => {
    if (!lectureId || running.current || adding.current) return
    const owner = lectureId
    const updated = latestThreads.current.map(thread => thread.id === threadId ? { ...thread, attachmentIds: (thread.attachmentIds ?? []).filter(image => image !== id) } : thread)
    try {
      await window.archive.saveQnaThreads(owner, updated)
      if (currentLecture.current === owner) { latestThreads.current = updated; setThreads(updated) }
    } catch { if (currentLecture.current === owner) setQnaError('Impossibile rimuovere la slide dagli allegati attivi. Riprova.') }
  }

  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    isGeneratingQna,
    qnaError,
    qnaStatuses,
    createThread,
    sendMessage,
    deleteThread,
    attachImages,
    removeImage,
    isAttachingImages
  }
}
