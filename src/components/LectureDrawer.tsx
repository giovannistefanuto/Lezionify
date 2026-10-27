import { useStudyEstimate } from '../hooks/useStudyEstimate'
import { toLocalDateTimeInput } from '../../shared/calendarDate'
import React, { useState, useEffect } from 'react'
import { lectureTitle } from '../../shared/lectureTitles'
import {
  findNextChronologicalLecture,
  type GenerationProgress,
  type Lecture,
  type LectureStudySet,
  type StudyStatus
} from '../../shared/archive'
import { MarkdownViewer } from './MarkdownViewer'
import { AudioPlayer } from './AudioPlayer'
import { LectureRecordingTimes } from './LectureRecordingTimes'
import { FocusLockModal } from './FocusLockModal'
import { PauseTimerOverlay } from './PauseTimerOverlay'
import { FocusReminders } from './FocusReminders'
import { TranscriptPanel } from './TranscriptPanel'
import { TranscriptionProgressBox } from './TranscriptionProgressBox'
import { useQna } from '../hooks/useQna'
import { useStudyTracker } from '../hooks/useStudyTracker'
import { useFocusStudyStatus } from '../hooks/useFocusStudyStatus'
import { useHighlights } from '../hooks/useHighlights'
import { useFocusModeController } from '../hooks/useFocusModeController'
import { FocusWorkspace } from './FocusWorkspace'
import { ResizableQnaPane } from './ResizableQnaPane'
import { useReadingPosition } from '../hooks/useReadingPosition'
import type { LanguageReadingPoint } from '../utils/sectionAlignment'
import { PdfExportButton } from './PdfExportButton'
import { countLectureWords, relativeLectureLength } from '../../shared/lectureLength'

const StudySetTab = React.lazy(() =>
  import('./StudySetTab').then((module) => ({ default: module.StudySetTab }))
)
const QnaSidebar = React.lazy(() =>
  import('./QnaSidebar').then((module) => ({ default: module.QnaSidebar }))
)

function formatStudyTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins < 60) {
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins < 10 ? '0' : ''}${remMins}m`
}

interface LectureDrawerProps {
  memoOpen?: boolean
  isReturningToList?: boolean
  selectedLecture: Lecture | null
  allLectures?: Lecture[]
  onSelectLecture?: (id: string) => void
  onClose: () => void
  activeTab: 'markdown' | 'transcript' | 'study' | 'info'
  setActiveTab: (tab: 'markdown' | 'transcript' | 'study' | 'info') => void
  markdownText: string | null
  transcriptText: string | null
  studySet: LectureStudySet | null
  isGeneratingStudySet: boolean
  studySetError: string | null
  onGenerateStudySet: () => void
  isLoadingContent: boolean
  isGenerating: boolean
  generationProgress?: GenerationProgress | null
  generationError: string | null
  isTranscribing: boolean
  transcribeError: string | null
  copyFeedback: string | null
  isEditingMetadata: boolean
  setIsEditingMetadata: (val: boolean) => void
  editCourseCode: string
  setEditCourseCode: (val: string) => void
  editRecordedAt: string
  setEditRecordedAt: (val: string) => void
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (val: boolean) => void
  existingCourses: string[]
  settingsModel: string
  onStudyStatusChange: (status: StudyStatus) => void | Promise<boolean>
  onGenerateLectureNotes: () => void
  onPrintNotes: () => void
  onCopyMarkdown: (overrideText?: string) => void
  onCopyTranscript: () => void
  onAttachTranscript: () => void
  onTranscribeAudio: () => void
  onPasteFromClipboard: () => void
  onSaveMetadata: (e: React.FormEvent) => void
  onDeleteLecture: () => void
  onOpenSettings: () => void
  formatDate: (date: string | null) => string
  formatFileSize: (bytes: number) => string
  studyStatusLabels: Record<
    StudyStatus,
    { label: string; icon: string; className: string }
  >
  activeLanguage?: 'it' | 'en'
  onToggleLanguage?: (lang: 'it' | 'en') => void
  markdownEnText?: string | null
  isTranslating?: boolean
  translationError?: string | null
  onTranslateLectureNotes?: () => void
}

export function LectureDrawer({
  memoOpen = false,
  isReturningToList = false,
  selectedLecture,
  allLectures,
  onSelectLecture,
  onClose,
  activeTab,
  setActiveTab,
  markdownText,
  transcriptText,
  studySet,
  isGeneratingStudySet,
  studySetError,
  onGenerateStudySet,
  isLoadingContent,
  isGenerating,
  generationProgress,
  generationError,
  isTranscribing,
  transcribeError,
  copyFeedback,
  isEditingMetadata,
  setIsEditingMetadata,
  editCourseCode,
  setEditCourseCode,
  editRecordedAt,
  setEditRecordedAt,
  showDeleteConfirm,
  setShowDeleteConfirm,
  existingCourses,
  settingsModel,
  onStudyStatusChange,
  onGenerateLectureNotes,
  onPrintNotes,
  onCopyMarkdown,
  onCopyTranscript,
  onAttachTranscript,
  onTranscribeAudio,
  onPasteFromClipboard,
  onSaveMetadata,
  onDeleteLecture,
  onOpenSettings,
  formatDate,
  formatFileSize,
  studyStatusLabels,
  activeLanguage = 'it',
  onToggleLanguage,
  markdownEnText,
  isTranslating = false,
  translationError = null,
  onTranslateLectureNotes
}: LectureDrawerProps) {
  const [wordCountResult, setWordCountResult] = useState<{
    lectureId: string; courseCode: string | null; counts: Record<string, number | null>
  } | null>(null)
  useEffect(() => {
    let cancelled = false
    setWordCountResult(null)
    if (selectedLecture?.courseCode && window.archive.getLectureWordCounts) {
      void window.archive.getLectureWordCounts(selectedLecture.id).then(counts => {
        if (!cancelled) setWordCountResult({ lectureId: selectedLecture.id, courseCode: selectedLecture.courseCode, counts })
      }).catch(() => { if (!cancelled) setWordCountResult(null) })
    }
    return () => { cancelled = true }
  }, [selectedLecture, allLectures, markdownText])
  const lectureWords = React.useMemo(() => markdownText !== null && !isLoadingContent ? countLectureWords(markdownText) : null, [markdownText, isLoadingContent])
  const wordCounts = wordCountResult?.lectureId === selectedLecture?.id && wordCountResult?.courseCode === selectedLecture?.courseCode ? wordCountResult?.counts : null
  const lengthPercent = wordCounts && selectedLecture && Object.hasOwn(wordCounts, selectedLecture.id)
    ? relativeLectureLength(lectureWords, { ...wordCounts, [selectedLecture.id]: lectureWords }) : null
  const [isFullScreen, setIsFullScreen] = useState(false)
  useFocusStudyStatus({
    lectureId: selectedLecture?.id ?? null,
    studyStatus: selectedLecture?.studyStatus,
    isFocusMode: isFullScreen,
    onStudyStatusChange
  })
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [showTechDetails, setShowTechDetails] = useState(false)

  const zoomLevelRef = React.useRef(1)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const standardContentRef = React.useRef<HTMLDivElement>(null)
  const zoomLabelRef = React.useRef<HTMLSpanElement>(null)
  const detailBodyRef = React.useRef<HTMLDivElement>(null)
  const markdownHeaderRef = React.useRef<HTMLDivElement>(null)
  const [floatingFocus, setFloatingFocus] = useState<{ lectureId: string; visible: boolean } | null>(null)
  const selectedLectureId = selectedLecture?.id
  const currentLectureId = React.useRef(selectedLectureId)
  currentLectureId.current = selectedLectureId

  useEffect(() => {
    const root = detailBodyRef.current
    const header = markdownHeaderRef.current
    if (!root || !header || isFullScreen || activeTab !== 'markdown' || !markdownText || !selectedLectureId) return

    const lectureId = selectedLectureId
    const updateVisibility = () => {
      const visible = header.getBoundingClientRect().bottom <= root.getBoundingClientRect().top
      setFloatingFocus(previous => previous?.lectureId === lectureId && previous.visible === visible
        ? previous : { lectureId, visible })
    }
    const observer = new ResizeObserver(updateVisibility)
    observer.observe(root)
    observer.observe(header)
    root.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)
    const frame = requestAnimationFrame(updateVisibility)
    return () => {
      observer.disconnect()
      root.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
      cancelAnimationFrame(frame)
    }
  }, [selectedLectureId, activeTab, markdownText, isLoadingContent, isFullScreen])

  // Calcolo della prossima lezione in ordine cronologico della stessa materia
  const nextLecture = React.useMemo(() => {
    if (!selectedLecture || !allLectures) return null
    return findNextChronologicalLecture(selectedLecture, allLectures)
  }, [selectedLecture, allLectures])

  const keepFocusOnNextLectureRef = React.useRef(false)

  // Reset dello stato full screen e search al cambio di lezione (tranne quando si avanza in Focus Mode)
  useEffect(() => {
    if (keepFocusOnNextLectureRef.current) {
      keepFocusOnNextLectureRef.current = false
      setShowRegenerateConfirm(false)
      setShowTechDetails(false)
      setFabStyle(null)
      setIsQnaSidebarOpen(false)
      return
    }

    setIsFullScreen(false)
    setShowRegenerateConfirm(false)
    setShowTechDetails(false)
    setFabStyle(null)
    setIsQnaSidebarOpen(false)
  }, [selectedLecture?.id])

  const handleCompleteAndAdvance = React.useCallback(
    async (inFocus = false) => {
      const completedId = selectedLecture?.id
      const isLastUnfinished = Boolean(selectedLecture?.courseCode && allLectures) && !allLectures?.some(item =>
        item.id !== selectedLecture?.id && item.courseCode === selectedLecture?.courseCode && item.studyStatus !== 'completata')
      const saved = await onStudyStatusChange('completata')
      if (saved === false || completedId !== currentLectureId.current || isLastUnfinished) return
      if (nextLecture && onSelectLecture) {
        if (inFocus) {
          keepFocusOnNextLectureRef.current = true
        }
        onSelectLecture(nextLecture.id)
      }
    },
    [nextLecture, onSelectLecture, onStudyStatusChange, selectedLecture, allLectures]
  )

  const handleGoToNextLecture = React.useCallback(
    (inFocus = false) => {
      if (nextLecture && onSelectLecture) {
        if (inFocus) {
          keepFocusOnNextLectureRef.current = true
        }
        onSelectLecture(nextLecture.id)
      }
    },
    [nextLecture, onSelectLecture]
  )

  // Floating Action Button per Q&A
  const [fabStyle, setFabStyle] = useState<React.CSSProperties | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [selectedAnchor, setSelectedAnchor] = useState('')
  const [selectedContext, setSelectedContext] = useState<string | null>(null)

  // Controlla la visibilità dell'intera Sidebar QnA
  const [isQnaSidebarOpen, setIsQnaSidebarOpen] = useState(false)
  const reopenQna = () => {
    if (!activeThreadId) {
      let saved: string | null = null
      try { saved = localStorage.getItem('lezionify:qna-last:' + selectedLecture?.id) } catch { /* Optional preference. */ }
      const last = threads.find(thread => thread.id === saved) ?? threads[threads.length - 1]
      if (last) setActiveThreadId(last.id)
    }
    setIsQnaSidebarOpen(true)
  }
  const [isQnaComposing, setIsQnaComposing] = useState(false)

  const {
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
  } = useQna(selectedLecture?.id ?? null)

  const {
    activeSeconds,
    lectureTotalSeconds,
    isPaused,
    showFocusLock,
    pauseTimerActive,
    pauseMinutes,
    startPauseTimer,
    resumeFromPause,
    exitFromPause,
    requestExitFocus,
    handleContinueFocus,
    handleConfirmExitFocus
  } = useStudyTracker({
    activeLectureId: selectedLecture?.id ?? null,
    courseCode: selectedLecture?.courseCode ?? null,
    isFocusMode: isFullScreen,
    activeTab,
    isEnabled: isFullScreen && !isReturningToList,
    suspended: memoOpen
  })

  const {
    enterFocusMode,
    exitFocusMode,
    changeTextZoom,
    textZoom,
    handleQuitFromPause
  } = useFocusModeController({
    isFullScreen,
    setIsFullScreen,
    pauseTimerActive,
    showFocusLock,
    onClose,
    requestExitFocus,
    exitFromPause,
    resumeFromPause,
    handleContinueFocus,
    contentRef,
    zoomLabelRef,
    zoomLevelRef,
    hasContent: activeTab === 'markdown' && Boolean(markdownText)
  })

  const hasEnglishTranslation = Boolean(
    markdownEnText || selectedLecture?.markdownEnFileName
  )
  const effectiveLanguage =
    activeLanguage === 'en' && hasEnglishTranslation ? 'en' : 'it'
  const currentMarkdown =
    effectiveLanguage === 'en' ? (markdownEnText ?? markdownText) : markdownText

  useEffect(() => {
    if (!selectedLecture || (!isFullScreen && activeTab !== 'markdown')) return
    const trace = (stage: string, event: KeyboardEvent, outcome?: string) => {
      if (!window.archive.languageShortcutDiagnosticsEnabled || !(event.ctrlKey || event.metaKey) ||
        (event.key.toLowerCase() !== 'l' && event.code !== 'KeyL')) return
      const target = event.target instanceof Element ? event.target : document.activeElement
      void window.archive.logClientMessage?.('info', 'shortcut-language', `[DEBUG-ctrl-l] ${stage}`, JSON.stringify({
        outcome, logicalL: event.key.toLowerCase() === 'l', physicalL: event.code === 'KeyL',
        trusted: event.isTrusted, prevented: event.defaultPrevented, repeat: event.repeat,
        composing: event.isComposing, shift: event.shiftKey, alt: event.altKey,
        editable: Boolean(target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')),
        dialog: Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]')),
        focus: isFullScreen, loading: isLoadingContent, generating: isGenerating, translating: isTranslating,
        hasNotes: Boolean(markdownText), hasEnglish: hasEnglishTranslation,
        callback: Boolean(onToggleLanguage), language: effectiveLanguage,
        focusLock: showFocusLock, pause: pauseTimerActive
      })).catch(() => {})
    }
    const capture = (event: KeyboardEvent) => trace('renderer-capture', event)
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey ||
        !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'l') { trace('renderer-result', event, 'event-excluded'); return }
      const target = event.target instanceof Element ? event.target : document.activeElement
      if (showFocusLock || pauseTimerActive || target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]') ||
        document.querySelector('[role="dialog"], [aria-modal="true"]')) { trace('renderer-result', event, 'interaction-excluded'); return }
      event.preventDefault()
      if (isLoadingContent || isGenerating || isTranslating || !markdownText || !hasEnglishTranslation) { trace('renderer-result', event, 'notes-unavailable'); return }
      onToggleLanguage?.(effectiveLanguage === 'it' ? 'en' : 'it')
      trace('renderer-result', event, onToggleLanguage ? 'toggle-requested' : 'callback-missing')
    }
    window.addEventListener('keydown', capture, true)
    document.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', capture, true); document.removeEventListener('keydown', handler) }
  }, [selectedLecture, isFullScreen, activeTab, isLoadingContent, isGenerating, isTranslating, markdownText, hasEnglishTranslation, effectiveLanguage, onToggleLanguage, showFocusLock, pauseTimerActive])

  useEffect(() => {
    if (!window.archive.languageShortcutDiagnosticsEnabled || !selectedLectureId) return
    void window.archive.logClientMessage?.('info', 'shortcut-language', '[DEBUG-ctrl-l] language-state',
      JSON.stringify({ language: effectiveLanguage, focus: isFullScreen })).catch(() => {})
  }, [effectiveLanguage, isFullScreen, selectedLectureId])

  const studyEstimate = useStudyEstimate({ lectureId: selectedLectureId ?? null, markdown: markdownText, english: markdownEnText,
    enabled: isFullScreen && !isLoadingContent && !isGenerating && !isTranslating && !isReturningToList,
    paused: isPaused || showFocusLock || pauseTimerActive, language: effectiveLanguage, rootRef: contentRef })

  const readingKey = selectedLecture ? `notes:${selectedLecture.id}:${effectiveLanguage}` : null
  const languageReadingPoint = React.useRef<LanguageReadingPoint | null>(null)
  useReadingPosition(contentRef, readingKey, currentMarkdown, isFullScreen && !isLoadingContent, undefined, languageReadingPoint)
  useReadingPosition(standardContentRef, readingKey, currentMarkdown, !isFullScreen && activeTab === 'markdown' && !isLoadingContent && !isGenerating, detailBodyRef, languageReadingPoint)


  const highlightKey = selectedLecture?.id
    ? effectiveLanguage === 'en'
      ? `${selectedLecture.id}_en`
      : selectedLecture.id
    : null

  const {
    isHighlightMode,
    toggleHighlightMode,
    highlights,
    addHighlight,
    removeHighlightAtOffset
  } = useHighlights(highlightKey)

  const handleToggleLanguage = (targetLang: 'it' | 'en') => {
    onToggleLanguage?.(targetLang)
  }

  const renderLanguageToggle = () => {
    if (!markdownText) return null

    return (
      <div className="language-control">
        <button
          type="button"
          className={`lang-toggle-pill ${!hasEnglishTranslation ? 'no-translation' : ''}`}
          title={
            hasEnglishTranslation
              ? `Lingua attiva: ${effectiveLanguage.toUpperCase()}. Clicca o premi Ctrl+L per passare a ${effectiveLanguage === 'it' ? 'Inglese (ENG)' : 'Italiano (ITA)'}. Mantiene il capitoletto; senza corrispondenza affidabile usa la percentuale del documento.`
              : isTranslating
                ? 'Traduzione inglese in corso con Gemini...'
                : 'Traduzione inglese non ancora generata. Clicca per tradurre.'
          }
          disabled={isTranslating}
          onClick={(e) => {
            e.stopPropagation()
            if (isTranslating) return
            if (!hasEnglishTranslation) {
              if (onTranslateLectureNotes) {
                onTranslateLectureNotes()
              }
              return
            }
            handleToggleLanguage(effectiveLanguage === 'it' ? 'en' : 'it')
          }}
        >
          <span
            className={`lang-choice ${effectiveLanguage === 'it' ? 'active' : ''}`}
          >
            IT
          </span>
          <span className="lang-sep">|</span>
          <span
            className={`lang-choice ${effectiveLanguage === 'en' ? 'active' : ''}`}
          >
            {isTranslating ? '⏳' : 'EN'}
          </span>
        </button>
        {translationError && (
          <div className="ai-error-box translation-error" role="alert">
            <strong>Errore traduzione:</strong>
            <p>{translationError}</p>
            <button
              type="button"
              className="secondary-button small"
              onClick={onTranslateLectureNotes}
            >
              Riprova
            </button>
          </div>
        )}
      </div>
    )
  }

  // Apri automaticamente la sidebar se c'è un thread attivo
  useEffect(() => {
    if (activeThreadId) {
      setIsQnaSidebarOpen(true)
    }
  }, [activeThreadId])

  const handleMouseUp = () => {
    if (activeTab !== 'markdown' || isHighlightMode) return
    const selection = window.getSelection()
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim().length < 5
    ) {
      setFabStyle(null)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // 1. Estrazione del contesto (Header più vicino)
    let contextHeading = null
    let node: Node | null = range.startContainer
    while (node && node.nodeName !== 'DIV') {
      if (node.previousSibling) {
        node = node.previousSibling
        if (
          node.nodeName === 'H2' ||
          node.nodeName === 'H3' ||
          node.nodeName === 'H1'
        ) {
          contextHeading = node.textContent
          break
        }
      } else {
        node = node.parentNode
      }
    }

    // 2. Ricostruzione del LaTeX per Gemini e Sidebar (da KaTeX)
    const clone = range.cloneContents()
    const div = document.createElement('div')
    div.appendChild(clone)

    const katexNodes = div.querySelectorAll('.katex')
    katexNodes.forEach((kNode) => {
      const annotation = kNode.querySelector(
        'annotation[encoding="application/x-tex"]'
      )
      if (annotation && annotation.textContent) {
        const isBlock = kNode.classList.contains('katex-display')
        const tex = annotation.textContent
        const replacement = document.createTextNode(
          isBlock ? `$$${tex}$$` : `$${tex}$`
        )
        kNode.parentNode?.replaceChild(replacement, kNode)
      }
    })

    // Rimuoviamo eventuali doppi spazi o a capo eccessivi nati dal clone
    const reconstructedQuote = (div.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()

    // 3. Estrazione dell'anchorString per l'evidenziatore DOM
    // Cerchiamo il text node più lungo all'interno della selezione originale
    let longestText = ''
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (n) {
          if (range.intersectsNode(n)) return NodeFilter.FILTER_ACCEPT
          return NodeFilter.FILTER_REJECT
        }
      }
    )

    let wNode
    while ((wNode = walker.nextNode())) {
      if (wNode.parentElement?.closest('.katex-mathml')) continue // Ignora MathML invisibile
      if (wNode.parentElement?.closest('.katex-html')) continue // Ignora HTML KaTeX per l'ancoraggio per sicurezza
      const txt = (wNode.nodeValue || '').trim()
      if (txt.length > longestText.length) {
        longestText = txt
      }
    }

    // Selezioniamo il testo pulito, o come fallback i primi 20 caratteri della selezione plain
    const fallbackAnchor = selection
      .toString()
      .replace(/\s+/g, ' ')
      .substring(0, 30)
      .trim()
    const finalAnchor = longestText.length > 5 ? longestText : fallbackAnchor

    setSelectedText(reconstructedQuote)
    setSelectedAnchor(finalAnchor)
    setSelectedContext(contextHeading)

    setFabStyle({
      top: rect.top - 40,
      left: rect.left + rect.width / 2
    })
  }

  // Hide FAB when scrolling or clicking outside
  useEffect(() => {
    const hideFab = () => setFabStyle(null)
    window.addEventListener('scroll', hideFab, true)
    return () => window.removeEventListener('scroll', hideFab, true)
  }, [])

  const handleAskGeminiClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setFabStyle(null)
    setIsQnaSidebarOpen(true)
    await createThread(selectedText, selectedAnchor, selectedContext)
    // Pulisci la selezione nativa per sicurezza
    window.getSelection()?.removeAllRanges()
  }

  const handleGenerateClick = () => {
    if (markdownText) {
      setShowRegenerateConfirm(true)
    } else {
      onGenerateLectureNotes()
    }
  }

  if (!selectedLecture) return null

  if (isFullScreen && activeTab === 'markdown') {
    if (!markdownText && isLoadingContent) {
      return (
        <div className="focus-mode-overlay focus-mode-loading-overlay">
          <div className="focus-loading-spinner-wrap">
            <div className="focus-spinner" />
            <p>Caricamento dispensa della prossima lezione...</p>
          </div>
        </div>
      )
    }

    if (markdownText) {
      return (
        <div className="focus-mode-overlay">
          {isReturningToList && <p className="final-lecture-notice" role="status">Ultima lezione · Ritorno a Tutte le lezioni…</p>}
          <div className="focus-mode-toolbar">
            <div className="focus-toolbar-left">
              <span className="focus-course">
                {selectedLecture.courseCode ?? 'Nessun corso'}
              </span>
              <span className="focus-title">
                {lectureTitle(selectedLecture, effectiveLanguage, currentMarkdown) || selectedLecture.sourceAudioFileName}
              </span>
              <span
                ref={zoomLabelRef}
                className="focus-zoom-level"
              >
                {Math.round(zoomLevelRef.current * 100)}%
              </span>
              <span
                className={`focus-timer-subtle${isPaused ? ' is-paused' : ''}`}
                title={
                  isPaused
                    ? showFocusLock
                      ? 'Timer fermo (in attesa di decisione / sblocco uscita)'
                      : pauseTimerActive
                        ? 'Timer in pausa (pausa programmata)'
                        : 'Timer in pausa (inattività)'
                    : 'Tempo di studio in modalità immersiva'
                }
              >
                ⏱️ {formatStudyTimer(activeSeconds)}
              </span>
            </div>
            <div className="focus-toolbar-right">
              {studyEstimate.preference && <span className="study-estimate" title="La stima richiede almeno 10 minuti e il 60% del tratto consolidato; compare sotto 30 minuti residui.">{studyEstimate.label ?? (isPaused || showFocusLock || pauseTimerActive ? 'Stima sospesa' : 'Stima: raccolta dati')}</span>}
              {studyEstimate.preference && <button type="button" onClick={studyEstimate.recalculate}
                title="Azzera i campioni e riprendi la stima da questa posizione">Ricalcola da qui</button>}
              <FocusReminders />
              {renderLanguageToggle()}
              <button
                className={`focus-highlighter-btn ${isHighlightMode ? 'active' : ''}`}
                onClick={toggleHighlightMode}
                title={
                  isHighlightMode
                    ? 'Disattiva evidenziatore'
                    : 'Attiva evidenziatore (giallo)'
                }
                aria-label="Evidenziatore"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 11-6 6v3h3l6-6" />
                  <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
                </svg>
              </button>
              <button
                className="focus-btn primary-focus-btn"
                onClick={exitFocusMode}
                title="Esci (Esc)"
              >
                ✕ Chiudi (Esc)
              </button>
            </div>
          </div>
          <FocusWorkspace lectureId={selectedLecture.id} onTextZoom={changeTextZoom} textZoom={textZoom}
            qnaButton={<button type="button" className="secondary-button small" onClick={reopenQna} aria-label="Apri domande Q&A">Q&amp;A · {threads.length}</button>}
            canSelectSlides={isQnaSidebarOpen && isQnaComposing}
            exportRequest={{ kind: 'lecture', lectureId: selectedLecture.id, language: effectiveLanguage }}
            onCloseQna={() => setIsQnaSidebarOpen(false)}
            onAttachPages={async images => {
              const threadId = activeThreadId ?? await createThread('Slide selezionate', '', 'Slide del PDF')
              await attachImages(threadId, images)
              setIsQnaSidebarOpen(true)
            }}
            qna={isQnaSidebarOpen ? (
              <React.Suspense fallback={<p className="loading">Caricamento Q&amp;A…</p>}>
                <QnaSidebar threads={threads} activeThreadId={activeThreadId} setActiveThreadId={setActiveThreadId}
                  onCompositionChange={setIsQnaComposing}
                  onSelectSlides={() => setIsQnaComposing(true)}
                  isGenerating={isGeneratingQna || isAttachingImages} qnaStatus={activeThreadId ? (qnaStatuses[activeThreadId] ?? null) : null}
                  error={qnaError} onSendMessage={sendMessage} onDeleteThread={deleteThread}
                  onClose={() => setIsQnaSidebarOpen(false)} onRemoveImage={removeImage} />
              </React.Suspense>
            ) : null}>
            <div
              ref={contentRef}
              className="focus-mode-content"
              data-notes-language={effectiveLanguage}
              tabIndex={0}
              aria-label="Testo della lezione: scorri o usa Ctrl e rotella per lo zoom"
              onMouseUp={handleMouseUp}
            >
              <div className="focus-text-document" style={{ zoom: textZoom }}>
              <MarkdownViewer
                content={currentMarkdown ?? ''}
                highlights={highlights}
                isHighlightMode={isHighlightMode}
                onAddHighlight={addHighlight}
                onRemoveHighlightAtOffset={removeHighlightAtOffset}
              />
              {selectedLecture && (
                <div className="lecture-end-action-wrapper">
                  {selectedLecture.studyStatus === 'completata' ? (
                    <div className="lecture-completed-actions-row">
                      <div className="lecture-completed-badge">
                        <span className="lecture-completed-badge-icon">✅</span>
                        <span className="lecture-completed-badge-text">
                          {nextLecture
                            ? 'Lezione completata'
                            : '🎉 Ultima lezione del corso completata!'}
                        </span>
                      </div>
                      {nextLecture && onSelectLecture && (
                        <button
                          type="button"
                          className="lecture-next-cta-btn"
                          onClick={() => handleGoToNextLecture(true)}
                          title={`Passa a: ${nextLecture.title || nextLecture.sourceAudioFileName}`}
                        >
                          <span>Prossima lezione</span>
                          <span className="lecture-next-cta-icon">▸</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="lecture-complete-btn-container">
                      <button
                        type="button"
                        className="lecture-complete-cta-btn"
                        onClick={() => handleCompleteAndAdvance(true)}
                      >
                        <span className="lecture-complete-cta-icon">✓</span>
                        <span>
                          {nextLecture
                            ? 'Segna come completata & Prossima lezione ▸'
                            : 'Segna come completata (Ultima del corso)'}
                        </span>
                      </button>
                      {nextLecture && (
                        <span className="lecture-next-hint">
                          Prossima:{' '}
                          <strong>
                            {nextLecture.title ||
                              nextLecture.sourceAudioFileName}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
              {fabStyle && (
                <button
                  className="floating-ask-btn"
                  style={{
                    position: 'fixed',
                    ...fabStyle,
                    transform: 'translateX(-50%)',
                    zIndex: 9999
                  }}
                  onMouseUp={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleAskGeminiClick}
                >
                  ✨ Chiedi a Gemini
                </button>
              )}
            </div>
          </FocusWorkspace>

          <FocusLockModal
            show={showFocusLock}
            courseCode={selectedLecture.courseCode}
            sessionSeconds={activeSeconds}
            lectureTotalSeconds={lectureTotalSeconds}
            onContinue={handleContinueFocus}
            onQuit={handleConfirmExitFocus}
            onPause={startPauseTimer}
          />

          <PauseTimerOverlay
            show={pauseTimerActive}
            minutes={pauseMinutes}
            onReturnToStudy={resumeFromPause}
            onQuit={handleQuitFromPause}
          />
        </div>
      )
    }
  }

  return (
    <aside className="detail-drawer" aria-label="Dettaglio e studio lezione">
      {isReturningToList && <p className="final-lecture-notice" role="status">Ultima lezione · Ritorno a Tutte le lezioni…</p>}
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="top-tags">
            <span
              className={`course-tag large ${
                !selectedLecture.courseCode ? 'is-unassigned' : ''
              }`}
            >
              {selectedLecture.courseCode ?? 'CORSO DA ASSEGNARE'}
            </span>
            <div className="study-status-select-wrap">
              {(['da-studiare', 'in-corso', 'completata'] as const).map(
                (st) => (
                  <button
                    key={st}
                    className={`study-status-toggle-btn ${
                      selectedLecture.studyStatus === st ? 'is-current' : ''
                    }`}
                    onClick={() => onStudyStatusChange(st)}
                    title={`Imposta stato come ${studyStatusLabels[st].label}`}
                  >
                    {studyStatusLabels[st].icon} {studyStatusLabels[st].label}
                  </button>
                )
              )}
            </div>
          </div>

          <h2>
            {lectureTitle(selectedLecture, effectiveLanguage, currentMarkdown) ||
              selectedLecture.sourceAudioFileName}
          </h2>
          <p className="detail-date">
            <span className="detail-audio-filename">
              {selectedLecture.sourceAudioFileName}
            </span>
            {' • '}
            <span>{formatDate(selectedLecture.recordedAt)}</span>
          </p>
        </div>

        <div className="header-right-actions">
          <button
            className="drawer-close-btn"
            onClick={onClose}
            title="Chiudi pannello"
            aria-label="Chiudi pannello lezione"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="drawer-tabs" role="tablist" aria-label="Sezioni della lezione">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'markdown'}
          className={`tab-btn ${activeTab === 'markdown' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('markdown')}
        >
          📝 Dispensa Didattica {markdownText && '•'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transcript'}
          className={`tab-btn ${activeTab === 'transcript' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          📄 Trascrizione Grezza {transcriptText && '•'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'study'}
          className={`tab-btn ${activeTab === 'study' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('study')}
        >
          🎯 Quiz & Flashcard {studySet && '•'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'info'}
          className={`tab-btn ${activeTab === 'info' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          ⚙️ Info & Gestione
        </button>
        {selectedLecture.markdownFileName && <span className="lecture-length-badge"
          title="Parole della dispensa italiana, esclusi codice, diagrammi e formule. Il 100% è la dispensa più lunga dello stesso corso; il confronto non dipende dai filtri. Per confrontare una lezione serve un corso assegnato.">
          {lectureWords === null ? 'Lunghezza non disponibile' : `${lectureWords.toLocaleString('it-IT')} parole · ${!selectedLecture.courseCode ? 'Assegna un corso per confrontare' : lengthPercent === null ? 'Confronto non disponibile' : `${lengthPercent}% di lunghezza`}`}
        </span>}
      </nav>

      <div className="detail-body" ref={detailBodyRef}>
        {activeTab === 'markdown' && markdownText && !isLoadingContent &&
          floatingFocus?.lectureId === selectedLecture.id && floatingFocus.visible && (
          <div className="drawer-floating-focus">
            <button
              type="button"
              className="secondary-button small print-btn"
              onClick={enterFocusMode}
              title="Modalità studio immersiva"
            >
              ⛶ Focus Mode
            </button>
          </div>
        )}
        {copyFeedback && (
          <div className="copy-toast">
            {copyFeedback}
          </div>
        )}
        {isLoadingContent ? (
          <p className="loading">Caricamento contenuti lezione…</p>
        ) : (
          <>
            {/* TAB 1: MARKDOWN VIEWER & AI GENERATION */}
            <div className="tab-pane" hidden={activeTab !== 'markdown'}>
              <div className="detail-card markdown-card">
                <div className="card-header" ref={markdownHeaderRef}>
                  <div className="card-title-group">
                    <h3>Dispensa Strutturata (LaTeX / Markdown)</h3>
                  </div>
                  <div className="card-actions">
                    {selectedLecture.status === 'transcript-available' &&
                      (showRegenerateConfirm ? (
                        <div className="regenerate-confirm-box">
                          <span>
                            Sovrascrivere la dispensa attuale? Questa azione non
                            è reversibile.
                          </span>
                          <button
                            className="danger-button small"
                            onClick={() => {
                              onGenerateLectureNotes()
                              setShowRegenerateConfirm(false)
                            }}
                          >
                            Conferma
                          </button>
                          <button
                            className="secondary-button small"
                            onClick={() => setShowRegenerateConfirm(false)}
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          className="ai-generate-header-btn"
                          onClick={handleGenerateClick}
                          disabled={isGenerating}
                          title="Genera o rigenera la dispensa didattica chiamando l'API di Gemini"
                        >
                          ⚡{' '}
                          {isGenerating
                            ? 'Generazione in corso…'
                            : markdownText
                              ? 'Rigenera con AI'
                              : 'Genera con AI'}
                        </button>
                      ))}
                    {markdownText && (
                      <>
                        {renderLanguageToggle()}
                        <button
                          className={`highlighter-toolbar-btn ${isHighlightMode ? 'active' : ''}`}
                          onClick={toggleHighlightMode}
                          title={
                            isHighlightMode
                              ? 'Disattiva evidenziatore'
                              : 'Attiva evidenziatore (giallo)'
                          }
                          aria-label="Evidenziatore"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m9 11-6 6v3h3l6-6" />
                            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
                          </svg>
                        </button>
                        <button
                          className="secondary-button small print-btn"
                          onClick={enterFocusMode}
                          title="Modalità studio immersiva"
                        >
                          ⛶ Focus Mode
                        </button>
                        <button
                          className="secondary-button small print-btn"
                          onClick={onPrintNotes}
                          title="Apri la finestra di stampa"
                        >
                          🖨️ Stampa
                        </button>
                        <button type="button" className="secondary-button small" onClick={reopenQna} aria-label="Apri domande Q&A">Q&amp;A · {threads.length}</button>
                        <PdfExportButton key={`${selectedLecture.id}-${effectiveLanguage}`} request={{ kind: 'lecture', lectureId: selectedLecture.id, language: effectiveLanguage }} />
                        <button
                          className="secondary-button small"
                          onClick={() =>
                            onCopyMarkdown(currentMarkdown ?? undefined)
                          }
                          title="Copia Markdown formattato"
                        >
                          📋 Copia Markdown
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Generation In Progress Box */}
                {isGenerating && (
                  <div className="ai-generating-box">
                    <div className="ai-generating-header">
                      <div className="ai-pulse-spinner" />
                      <div className="ai-generating-text">
                        <h4>
                          ⚡ Elaborazione con Google Gemini ({settingsModel})
                          {generationProgress &&
                            ` · ${generationProgress.percent}%`}
                        </h4>
                        <p className="ai-live-message">
                          {generationProgress?.message ??
                            "L'AI sta analizzando la trascrizione grezza, strutturando i concetti gerarchici e formattando le formule in LaTeX..."}
                        </p>
                        {generationProgress?.delayMs && generationProgress.delayMs > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '6px',
                              fontSize: '0.8rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(234, 179, 8, 0.15)',
                              color: '#ca8a04',
                              border: '1px solid rgba(234, 179, 8, 0.3)'
                            }}
                          >
                            ⏳ Limite di frequenza: attesa di {Math.round(generationProgress.delayMs / 1000)}s...
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="ai-progress-bar-track">
                      <div
                        className="ai-progress-bar-fill"
                        style={{
                          width: `${Math.max(5, generationProgress?.percent ?? 10)}%`
                        }}
                      />
                    </div>

                    {/* Visual Steps Checklist */}
                    <div className="ai-steps-checklist">
                      <div
                        className={`ai-step-item ${
                          (generationProgress?.percent ?? 0) >= 20
                            ? 'is-done'
                            : 'is-active'
                        }`}
                      >
                        <span className="step-icon">
                          {(generationProgress?.percent ?? 0) >= 20 ? '✓' : '1'}
                        </span>
                        <span>Segmentazione macro-argomenti</span>
                      </div>
                      <div
                        className={`ai-step-item ${
                          (generationProgress?.percent ?? 0) >= 85
                            ? 'is-done'
                            : (generationProgress?.percent ?? 0) >= 20
                              ? 'is-active'
                              : 'is-pending'
                        }`}
                      >
                        <span className="step-icon">
                          {(generationProgress?.percent ?? 0) >= 85
                            ? '✓'
                            : (generationProgress?.percent ?? 0) >= 20
                              ? '⚡'
                              : '2'}
                        </span>
                        <span>Elaborazione formule $\LaTeX$ in parallelo</span>
                      </div>
                      <div
                        className={`ai-step-item ${
                          (generationProgress?.percent ?? 0) >= 100
                            ? 'is-done'
                            : (generationProgress?.percent ?? 0) >= 85
                              ? 'is-active'
                              : 'is-pending'
                        }`}
                      >
                        <span className="step-icon">
                          {(generationProgress?.percent ?? 0) >= 100
                            ? '✓'
                            : (generationProgress?.percent ?? 0) >= 85
                              ? '⏳'
                              : '3'}
                        </span>
                        <span>Note d'esame e logistica corso</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {generationError && (
                  <div className="ai-error-box">
                    <strong>Errore durante la generazione:</strong>
                    <p>{generationError}</p>
                    <div className="error-actions">
                      <button
                        className="primary-button small"
                        onClick={onGenerateLectureNotes}
                      >
                        Riprova
                      </button>
                      <button
                        className="secondary-button small"
                        onClick={onOpenSettings}
                      >
                        Verifica Impostazioni API
                      </button>
                    </div>
                  </div>
                )}

                {/* Rendered Markdown or Call to Action */}
                {!isGenerating &&
                  (markdownText ? (
                    <div className="qna-standard-layout">
                      <div
                        ref={standardContentRef}
                        data-notes-language={effectiveLanguage}
                        className="markdown-view-container"
                        onMouseUp={handleMouseUp}
                      >
                        <MarkdownViewer
                          content={currentMarkdown ?? ''}
                          highlights={highlights}
                          isHighlightMode={isHighlightMode}
                          onAddHighlight={addHighlight}
                          onRemoveHighlightAtOffset={removeHighlightAtOffset}
                        />
                        {selectedLecture && (
                          <div className="lecture-end-action-wrapper">
                            {selectedLecture.studyStatus === 'completata' ? (
                              <div className="lecture-completed-actions-row">
                                <div className="lecture-completed-badge">
                                  <span className="lecture-completed-badge-icon">
                                    ✅
                                  </span>
                                  <span className="lecture-completed-badge-text">
                                    {nextLecture
                                      ? 'Lezione completata'
                                      : '🎉 Ultima lezione del corso completata!'}
                                  </span>
                                </div>
                                {nextLecture && onSelectLecture && (
                                  <button
                                    type="button"
                                    className="lecture-next-cta-btn"
                                    onClick={() => handleGoToNextLecture(false)}
                                    title={`Passa a: ${nextLecture.title || nextLecture.sourceAudioFileName}`}
                                  >
                                    <span>Prossima lezione</span>
                                    <span className="lecture-next-cta-icon">
                                      ▸
                                    </span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="lecture-complete-btn-container">
                                <button
                                  type="button"
                                  className="lecture-complete-cta-btn"
                                  onClick={() =>
                                    handleCompleteAndAdvance(false)
                                  }
                                >
                                  <span className="lecture-complete-cta-icon">
                                    ✓
                                  </span>
                                  <span>
                                    {nextLecture
                                      ? 'Segna come completata & Prossima lezione ▸'
                                      : 'Segna come completata (Ultima del corso)'}
                                  </span>
                                </button>
                                {nextLecture && (
                                  <span className="lecture-next-hint">
                                    Prossima:{' '}
                                    <strong>
                                      {nextLecture.title ||
                                        nextLecture.sourceAudioFileName}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {fabStyle && (
                          <button
                            className="floating-ask-btn"
                            style={{
                              position: 'fixed',
                              ...fabStyle,
                              transform: 'translateX(-50%)',
                              zIndex: 9999
                            }}
                            onMouseUp={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={handleAskGeminiClick}
                          >
                            ✨ Chiedi a Gemini
                          </button>
                        )}
                      </div>
                      {isQnaSidebarOpen && (
                        <ResizableQnaPane>
                        <React.Suspense
                          fallback={
                            <p className="loading">Caricamento Q&amp;A…</p>
                          }
                        >
                          <QnaSidebar
                            onCompositionChange={setIsQnaComposing}
                            threads={threads}
                            activeThreadId={activeThreadId}
                            setActiveThreadId={setActiveThreadId}
                            isGenerating={isGeneratingQna || isAttachingImages}
                            qnaStatus={
                              activeThreadId
                                ? (qnaStatuses[activeThreadId] ?? null)
                                : null
                            }
                            error={qnaError}
                            onSendMessage={sendMessage}
                            onDeleteThread={deleteThread}
                            onRemoveImage={removeImage}
                            onClose={() => setIsQnaSidebarOpen(false)}
                          />
                        </React.Suspense>
                        </ResizableQnaPane>
                      )}
                    </div>
                  ) : (
                    <div className="ai-cta-card">
                      {selectedLecture.status === 'transcript-available' ? (
                        <>
                          <div className="ai-cta-icon">⚡</div>
                          <h4>Genera la dispensa automaticamente</h4>
                          <p>
                            Hai a disposizione la trascrizione grezza. Puoi
                            generare istantaneamente la dispensa universitaria
                            con formule matematiche LaTeX, terminologia inglese
                            e note per l'esame.
                          </p>
                          <div className="ai-cta-buttons">
                            <button
                              className="primary-button large ai-main-btn"
                              onClick={onGenerateLectureNotes}
                            >
                              ⚡ Genera Dispensa con Gemini AI
                            </button>
                            <button
                              className="secondary-button"
                              onClick={onPasteFromClipboard}
                            >
                              📋 Incolla manualmente
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ai-audio-icon">🎙️</div>
                          <h4>Trascrizione e Dispensa Diretta da Audio</h4>
                          <p>
                            Questa lezione ha solo il file MP3. Gemini
                            Multimodale può ascoltare direttamente l'audio per
                            trascriverlo e generare la dispensa con formule
                            LaTeX.
                          </p>
                          {transcribeError && (
                            <div className="ai-error-box">
                              <strong>Errore trascrizione:</strong>
                              <p>{transcribeError}</p>
                            </div>
                          )}
                          {isTranscribing ? (
                            <TranscriptionProgressBox
                              progress={generationProgress}
                              error={transcribeError}
                            />
                          ) : (
                            <div className="ai-cta-buttons">
                              <button
                                className="primary-button large ai-main-btn"
                                onClick={onTranscribeAudio}
                              >
                                🎙️ Trascrivi Audio con Gemini
                              </button>
                              <button
                                className="secondary-button"
                                onClick={onAttachTranscript}
                              >
                                📁 Associa file TXT
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* TAB 2: RAW TRANSCRIPT */}
            <div className="tab-pane" hidden={activeTab !== 'transcript'}>
              <TranscriptPanel
                key={selectedLecture.id}
                lecture={selectedLecture}
                transcriptText={transcriptText}
                isGenerating={isGenerating}
                isTranscribing={isTranscribing}
                generationProgress={generationProgress}
                transcribeError={transcribeError}
                onGenerateLectureNotes={onGenerateLectureNotes}
                onCopyTranscript={onCopyTranscript}
                onAttachTranscript={onAttachTranscript}
                onTranscribeAudio={onTranscribeAudio}
              />
            </div>
            {/* TAB 3: QUIZ & FLASHCARDS */}
            <div className="tab-pane" hidden={activeTab !== 'study'}>
              <React.Suspense
                fallback={<p className="loading">Caricamento studio attivo…</p>}
              >
                <StudySetTab
                  studySet={studySet}
                  isLoading={isLoadingContent}
                  isGenerating={isGeneratingStudySet}
                  generationError={studySetError}
                  onGenerateStudySet={onGenerateStudySet}
                  onOpenSettings={onOpenSettings}
                  hasTranscriptOrMarkdown={Boolean(
                    selectedLecture.status === 'transcript-available' ||
                    selectedLecture.markdownFileName
                  )}
                  settingsModel={settingsModel}
                />
              </React.Suspense>
            </div>

            {/* TAB 4: INFO & METADATA */}
            <div className="tab-pane" hidden={activeTab !== 'info'}>
              {/* Course & Metadata Management */}
              <div className="detail-card metadata-card">
                <div className="card-header">
                  <h3>Metadati & Corso</h3>
                  {!isEditingMetadata && (
                    <button
                      className="text-button"
                      onClick={() => setIsEditingMetadata(true)}
                    >
                      Modifica
                    </button>
                  )}
                </div>

                <LectureRecordingTimes lecture={selectedLecture} />
                {isEditingMetadata ? (
                  <form onSubmit={onSaveMetadata} className="metadata-form">
                    <label>
                      Codice Corso:
                      <input
                        type="text"
                        value={editCourseCode}
                        onChange={(e) => setEditCourseCode(e.target.value)}
                        placeholder="Es. Sistemi Distribuiti, RC, ecc."
                      />
                    </label>

                    {existingCourses.length > 0 && (
                      <div className="quick-courses">
                        <span>Corsi esistenti:</span>
                        <div className="quick-courses-list">
                          {existingCourses.map((c) => (
                            <button
                              type="button"
                              key={c}
                              className="quick-course-chip"
                              onClick={() => setEditCourseCode(c)}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label>
                      Data Registrazione (ISO):
                      <input
                        type="datetime-local"
                        value={
                          toLocalDateTimeInput(editRecordedAt)
                        }
                        onChange={(e) => setEditRecordedAt(e.target.value)}
                      />
                    </label>

                    <div className="form-actions">
                      <button type="submit" className="primary-button small">
                        Salva modifiche
                      </button>
                      <button
                        type="button"
                        className="secondary-button small"
                        onClick={() => setIsEditingMetadata(false)}
                      >
                        Annulla
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="metadata-display">
                    <p>
                      <strong>Corso:</strong>{' '}
                      {selectedLecture.courseCode ?? 'Nessun corso assegnato'}
                    </p>
                    <p>
                      <strong>Data:</strong>{' '}
                      {formatDate(selectedLecture.recordedAt)}
                    </p>
                    <p>
                      <strong>Stato studio:</strong>{' '}
                      {studyStatusLabels[selectedLecture.studyStatus].label}
                    </p>
                    <p>
                      <strong>Dimensione audio:</strong>{' '}
                      {formatFileSize(selectedLecture.byteSize)}
                    </p>
                    <button
                      className="text-button tech-details-toggle"
                      onClick={() => setShowTechDetails(!showTechDetails)}
                    >
                      {showTechDetails
                        ? 'Nascondi dettagli tecnici ▾'
                        : 'Mostra dettagli tecnici ▸'}
                    </button>
                    {showTechDetails && (
                      <p>
                        <strong>SHA-256 Checksum:</strong>{' '}
                        <code>{selectedLecture.checksum}</code>
                      </p>
                    )}
                    <p>
                      <strong>Importata il:</strong>{' '}
                      {new Date(selectedLecture.importedAt).toLocaleString(
                        'it-IT'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Danger Zone: Delete Lecture */}
              <div className="danger-zone-label">ZONA PERICOLOSA</div>
              <div className="detail-card danger-card">
                <div className="card-header">
                  <h3>Elimina Lezione</h3>
                </div>
                {showDeleteConfirm ? (
                  <div className="delete-confirm-box">
                    <p>
                      Sei sicuro di voler eliminare questa lezione, l'audio e la
                      dispensa dall'archivio locale?
                    </p>
                    <div className="delete-actions">
                      <button
                        className="danger-button"
                        onClick={onDeleteLecture}
                      >
                        Conferma eliminazione
                      </button>
                      <button
                        className="secondary-button small"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="danger-outline-button"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Elimina dall'archivio
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AudioPlayer
        audioUrl={
          selectedLecture ? `media://audio/${selectedLecture.id}.mp3` : null
        }
      />
    </aside>
  )
}


