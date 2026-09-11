import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  Lecture,
  LectureStudySet,
  StudyStatus
} from '../../shared/archive'

interface UseLectureContentProps {
  selectedLecture: Lecture | null
  onRefreshLibrary: () => Promise<void>
  onUpdateLectureInState: (id: string, updates: Partial<Lecture>) => void
  onNotice: (msg: string | null) => void
  onClearSelectedLecture: () => void
}

interface CachedLectureData {
  transcript: string | null
  markdown: string | null
  markdownEn: string | null
  studySet: LectureStudySet | null
}

const lectureContentCache = new Map<string, CachedLectureData>()
const MAX_CACHED_LECTURES = 20

function cacheLecture(id: string, data: CachedLectureData): void {
  lectureContentCache.delete(id)
  lectureContentCache.set(id, data)
  while (lectureContentCache.size > MAX_CACHED_LECTURES) {
    const oldest = lectureContentCache.keys().next().value
    if (oldest) lectureContentCache.delete(oldest)
  }
}

export function invalidateLectureContentCache(id?: string) {
  if (id) {
    lectureContentCache.delete(id)
  } else {
    lectureContentCache.clear()
  }
}

export function useLectureContent({
  selectedLecture,
  onRefreshLibrary,
  onUpdateLectureInState,
  onNotice,
  onClearSelectedLecture
}: UseLectureContentProps) {
  const currentLecture = useRef(selectedLecture?.id)
  currentLecture.current = selectedLecture?.id
  const [activeTab, setActiveTab] = useState<
    'markdown' | 'transcript' | 'study' | 'info'
  >('markdown')
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [markdownText, setMarkdownText] = useState<string | null>(null)
  const [markdownEnText, setMarkdownEnText] = useState<string | null>(null)
  const [studySet, setStudySet] = useState<LectureStudySet | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isGeneratingStudySet, setIsGeneratingStudySet] = useState(false)
  const [studySetError, setStudySetError] = useState<string | null>(null)

  // Metadata editor state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [editCourseCode, setEditCourseCode] = useState('')
  const [editRecordedAt, setEditRecordedAt] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Paste modal
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteInputText, setPasteInputText] = useState('')

  // Timer ref to prevent memory leaks and overlapping timers (M1)
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const showCopyFeedback = useCallback((msg: string, durationMs = 2000) => {
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
    }
    setCopyFeedback(msg)
    copyFeedbackTimerRef.current = setTimeout(() => {
      setCopyFeedback(null)
      copyFeedbackTimerRef.current = null
    }, durationMs)
  }, [])

  // Cleanup feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current)
      }
    }
  }, [])

  // Load selected lecture content with cache & race condition fix
  useEffect(() => {
    if (!selectedLecture) {
      setTranscriptText(null)
      setMarkdownText(null)
      setMarkdownEnText(null)
      setStudySet(null)
      setIsEditingMetadata(false)
      setShowDeleteConfirm(false)
      setShowPasteModal(false)
      setStudySetError(null)
      return
    }

    let cancelled = false

    setEditCourseCode(selectedLecture.courseCode ?? '')
    setEditRecordedAt(selectedLecture.recordedAt ?? '')
    setIsEditingMetadata(false)
    setShowDeleteConfirm(false)
    setShowPasteModal(false)
    setStudySetError(null)

    // Check fast cache first for instant 0ms display
    const cached = lectureContentCache.get(selectedLecture.id)
    if (cached) {
      cacheLecture(selectedLecture.id, cached)
      setTranscriptText(cached.transcript)
      setMarkdownText(cached.markdown)
      setMarkdownEnText(cached.markdownEn)
      setStudySet(cached.studySet)
      if (cached.markdown) {
        setActiveTab('markdown')
      } else if (cached.transcript) {
        setActiveTab('transcript')
      } else {
        setActiveTab('info')
      }
      setIsLoadingContent(false)
    } else {
      setIsLoadingContent(true)
    }

    if (!window.archive) {
      setIsLoadingContent(false)
      return
    }

    Promise.all([
      selectedLecture.status === 'transcript-available'
        ? window.archive.readTranscript(selectedLecture.id)
        : Promise.resolve(null),
      selectedLecture.markdownFileName
        ? window.archive.readMarkdown(selectedLecture.id)
        : Promise.resolve(null),
      selectedLecture.markdownEnFileName
        ? window.archive.readMarkdownEn(selectedLecture.id)
        : Promise.resolve(null),
      window.archive.readStudySet(selectedLecture.id)
    ])
      .then(([transcript, markdown, markdownEn, loadedStudySet]) => {
        if (cancelled) return
        cacheLecture(selectedLecture.id, {
          transcript,
          markdown,
          markdownEn,
          studySet: loadedStudySet
        })
        setTranscriptText(transcript)
        setMarkdownText(markdown)
        setMarkdownEnText(markdownEn)
        setStudySet(loadedStudySet)
        if (!cached) {
          if (markdown) {
            setActiveTab('markdown')
          } else if (transcript) {
            setActiveTab('transcript')
          } else {
            setActiveTab('info')
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Error loading lecture content:', err)
        onNotice('Errore nel caricamento dei contenuti della lezione.')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContent(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedLecture, onNotice])

  const handleAttachTranscript = useCallback(async (): Promise<void> => {
    if (!selectedLecture) return
    try {
      const updated = await window.archive.attachTranscript(selectedLecture.id)
      if (updated) {
        onNotice('Trascrizione associata con successo.')
        await onRefreshLibrary()
        const text = await window.archive.readTranscript(selectedLecture.id)
        setTranscriptText(text)
        setActiveTab('transcript')
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Errore durante l’associazione.'
      console.error('Attach transcript error:', error)
      onNotice(msg)
    }
  }, [selectedLecture, onRefreshLibrary, onNotice])

  const handleSaveMetadata = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault()
      if (!selectedLecture) return
      try {
        await window.archive.updateLecture(selectedLecture.id, {
          courseCode: editCourseCode.trim() || null,
          recordedAt: editRecordedAt.trim() || null
        })
        onNotice('Metadati della lezione aggiornati.')
        setIsEditingMetadata(false)
        await onRefreshLibrary()
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Errore nel salvataggio dei metadati.'
        console.error('Save metadata error:', error)
        onNotice(msg)
      }
    },
    [
      selectedLecture,
      editCourseCode,
      editRecordedAt,
      onRefreshLibrary,
      onNotice
    ]
  )

  const handleStudyStatusChange = useCallback(
    async (newStatus: StudyStatus): Promise<void> => {
      if (!selectedLecture) return
      const previousStatus = selectedLecture.studyStatus
      // Optimistic update
      onUpdateLectureInState(selectedLecture.id, { studyStatus: newStatus })
      try {
        await window.archive.updateLecture(selectedLecture.id, {
          studyStatus: newStatus
        })
        await onRefreshLibrary()
      } catch (err) {
        console.error('Study status update error:', err)
        // Rollback
        onUpdateLectureInState(selectedLecture.id, {
          studyStatus: previousStatus
        })
        onNotice('Impossibile aggiornare lo stato di studio.')
      }
    },
    [selectedLecture, onRefreshLibrary, onUpdateLectureInState, onNotice]
  )

  const handlePasteFromClipboard = useCallback(async (): Promise<void> => {
    if (!selectedLecture) return
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText && clipText.trim().length > 10) {
        await window.archive.saveMarkdown(selectedLecture.id, clipText)
        setMarkdownText(clipText)
        setMarkdownEnText(null)
        invalidateLectureContentCache(selectedLecture.id)
        onNotice('Lezione Markdown incollata e renderizzata con successo.')
        await onRefreshLibrary()
      } else {
        setPasteInputText('')
        setShowPasteModal(true)
      }
    } catch {
      setPasteInputText('')
      setShowPasteModal(true)
    }
  }, [selectedLecture, onRefreshLibrary, onNotice])

  const handleConfirmPasteModal = useCallback(async (): Promise<void> => {
    if (!selectedLecture || !pasteInputText.trim()) return
    try {
      await window.archive.saveMarkdown(selectedLecture.id, pasteInputText)
      setMarkdownText(pasteInputText)
      setMarkdownEnText(null)
      invalidateLectureContentCache(selectedLecture.id)
      setShowPasteModal(false)
      onNotice('Lezione Markdown salvata e renderizzata.')
      await onRefreshLibrary()
    } catch (err) {
      console.error('Paste confirm error:', err)
      onNotice('Errore durante il salvataggio del testo.')
    }
  }, [selectedLecture, pasteInputText, onRefreshLibrary, onNotice])

  const handleDeleteLecture = useCallback(async (): Promise<void> => {
    if (!selectedLecture) return
    try {
      const ok = await window.archive.deleteLecture(selectedLecture.id)
      if (ok) {
        invalidateLectureContentCache(selectedLecture.id)
        onNotice('Lezione eliminata dall’archivio.')
        onClearSelectedLecture()
        await onRefreshLibrary()
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Errore durante l’eliminazione.'
      console.error('Delete lecture error:', error)
      onNotice(msg)
    }
  }, [selectedLecture, onNotice, onClearSelectedLecture, onRefreshLibrary])

  const handleCopyTranscript = useCallback((): void => {
    if (!transcriptText) return
    void navigator.clipboard.writeText(transcriptText)
    showCopyFeedback('Trascrizione copiata!')
  }, [transcriptText, showCopyFeedback])

  const handleCopyMarkdown = useCallback(
    (overrideText?: string): void => {
      const target = overrideText ?? markdownText
      if (!target) return
      void navigator.clipboard.writeText(target)
      showCopyFeedback('Markdown copiato!')
    },
    [markdownText, showCopyFeedback]
  )

  const handlePrintNotes = useCallback(async (): Promise<void> => {
    try {
      await window.archive.printLectureNotes()
    } catch {
      window.print()
    }
  }, [])

  const handleGenerateStudySet = useCallback(async (): Promise<void> => {
    if (!window.archive || !selectedLecture) return
    setIsGeneratingStudySet(true)
    setStudySetError(null)
    try {
      const res = await window.archive.generateStudySet(selectedLecture.id)
      invalidateLectureContentCache(selectedLecture.id)
      if (currentLecture.current !== selectedLecture.id) return
      if (res.success && res.studySet) {
        setStudySet(res.studySet)
        setActiveTab('study')
        onNotice('🎯 Quiz e flashcard generati con successo!')
      } else {
        setStudySetError(res.error ?? 'Errore durante la generazione dei quiz.')
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Errore durante la generazione dello studio set.'
      console.error('Study set generation error:', err)
      if (currentLecture.current === selectedLecture.id) setStudySetError(msg)
    } finally {
      setIsGeneratingStudySet(false)
    }
  }, [selectedLecture, onNotice])

  return {
    activeTab,
    setActiveTab,
    transcriptText,
    setTranscriptText,
    markdownText,
    setMarkdownText,
    markdownEnText,
    setMarkdownEnText,
    studySet,
    setStudySet,
    isLoadingContent,
    isGeneratingStudySet,
    studySetError,
    isEditingMetadata,
    setIsEditingMetadata,
    editCourseCode,
    setEditCourseCode,
    editRecordedAt,
    setEditRecordedAt,
    copyFeedback,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showPasteModal,
    setShowPasteModal,
    pasteInputText,
    setPasteInputText,
    handleAttachTranscript,
    handleSaveMetadata,
    handleStudyStatusChange,
    handlePasteFromClipboard,
    handleConfirmPasteModal,
    handleDeleteLecture,
    handleCopyTranscript,
    handleCopyMarkdown,
    handlePrintNotes,
    handleGenerateStudySet
  }
}
