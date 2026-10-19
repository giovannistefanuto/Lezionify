import { useState, useEffect, useRef } from 'react'
import type { QnaThread, QnaStatusUpdate } from '../../shared/archive'
import { QNA_IMAGE_LIMIT, type QnaImageInput } from '../../shared/qnaImages'

export function useQna(lectureId: string | null) {
  const [threads, setThreads] = useState<QnaThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const latestThreads = useRef(threads)
  latestThreads.current = threads
  const [isGeneratingQna, setIsGeneratingQna] = useState(false)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [qnaStatuses, setQnaStatuses] = useState<
    Record<string, QnaStatusUpdate | null>
  >({})

  const currentLecture = useRef(lectureId)
  currentLecture.current = lectureId
  const running = useRef(false)
  const adding = useRef(false)
  const [isAttachingImages, setIsAttachingImages] = useState(false)
  const streaming = useRef<{ lectureId: string; threadId: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setThreads([])
    setActiveThreadId(null)
    setQnaError(null)
    setQnaStatuses({})
    if (lectureId) {
      window.archive
        .loadQnaThreads(lectureId)
        .then((loaded) => {
          if (!cancelled) setThreads(loaded || [])
        })
        .catch(() => {
          if (!cancelled) setQnaError('Impossibile caricare la conversazione.')
        })
    }
    return () => {
      cancelled = true
    }
  }, [lectureId])

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
    const removeListener = window.archive.onQnaChunk(({ threadId, chunk }) => {
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
                text: lastMessage.text + chunk
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
    useFullContext: boolean
  ) => {
    if (!lectureId || running.current || adding.current || !text.trim()) return
    const currentThread = threads.find((t) => t.id === threadId)
    if (!currentThread) return
    const owner = lectureId
    running.current = true
    streaming.current = { lectureId: owner, threadId }
    setQnaError(null)
    setIsGeneratingQna(true)
    const requestThread: QnaThread = {
      ...currentThread,
      messages: [
        ...currentThread.messages,
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
        useFullContext
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
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : t
      )
      await window.archive.saveQnaThreads(owner, final)
      if (currentLecture.current === owner) setThreads(final)
    } catch (e) {
      if (currentLecture.current === owner) {
        setThreads(base)
        setQnaError(e instanceof Error ? e.message : 'Errore imprevisto')
      }
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
