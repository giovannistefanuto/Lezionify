import { useState, useEffect, useRef } from 'react'
import type { QnaThread, QnaStatusUpdate } from '../../shared/archive'

export function useQna(lectureId: string | null) {
  const [threads, setThreads] = useState<QnaThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [isGeneratingQna, setIsGeneratingQna] = useState(false)
  const [qnaError, setQnaError] = useState<string | null>(null)
  const [qnaStatuses, setQnaStatuses] = useState<
    Record<string, QnaStatusUpdate | null>
  >({})

  const currentLecture = useRef(lectureId)
  currentLecture.current = lectureId
  const running = useRef(false)
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
    if (running.current)
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
    if (!lectureId || running.current || !text.trim()) return
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
        { role: 'user', text: text.trim(), timestamp: new Date().toISOString() }
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
    if (running.current) return
    if (!lectureId) return
    const updated = threads.filter((t) => t.id !== threadId)
    setThreads(updated)
    if (activeThreadId === threadId) {
      setActiveThreadId(null)
    }
    await window.archive.saveQnaThreads(lectureId, updated)
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
    deleteThread
  }
}
