import React, { useState, useEffect } from 'react'
import {
  findNextChronologicalLecture,
  type GenerationProgress,
  type Lecture,
  type LectureStudySet,
  type StudyStatus
} from '../../shared/archive'
import { MarkdownViewer } from './MarkdownViewer'
import { AudioPlayer } from './AudioPlayer'
import { FocusLockModal } from './FocusLockModal'
import { PauseTimerOverlay } from './PauseTimerOverlay'
import { FocusReminders } from './FocusReminders'
import { TranscriptPanel } from './TranscriptPanel'
import { useQna } from '../hooks/useQna'
import { useStudyTracker } from '../hooks/useStudyTracker'
import { useHighlights } from '../hooks/useHighlights'
import { useFocusModeController } from '../hooks/useFocusModeController'

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
  onStudyStatusChange: (status: StudyStatus) => void
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
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [showTechDetails, setShowTechDetails] = useState(false)

  const zoomLevelRef = React.useRef(1)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const standardContentRef = React.useRef<HTMLDivElement>(null)
  const zoomLabelRef = React.useRef<HTMLSpanElement>(null)

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
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
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
    (inFocus = false) => {
      onStudyStatusChange('completata')
      if (nextLecture && onSelectLecture) {
        if (inFocus) {
          keepFocusOnNextLectureRef.current = true
        }
        onSelectLecture(nextLecture.id)
      }
    },
    [nextLecture, onSelectLecture, onStudyStatusChange]
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

  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    isGeneratingQna,
    qnaError,
    qnaStatuses,
    createThread,
    sendMessage,
    deleteThread
  } = useQna(selectedLecture?.id ?? null)

  const {
    activeSeconds,
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
    isEnabled: isFullScreen
  })

  const {
    enterFocusMode,
    exitFocusMode,
    handlePinchZoom,
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
    zoomLevelRef
  })

  const hasEnglishTranslation = Boolean(
    markdownEnText || selectedLecture?.markdownEnFileName
  )
  const effectiveLanguage =
    activeLanguage === 'en' && hasEnglishTranslation ? 'en' : 'it'
  const currentMarkdown =
    effectiveLanguage === 'en' ? (markdownEnText ?? markdownText) : markdownText


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
    const container = isFullScreen
      ? contentRef.current
      : standardContentRef.current
    const scrollableHeight = container
      ? Math.max(0, container.scrollHeight - container.clientHeight)
      : 0
    const ratio = scrollableHeight > 0 ? container!.scrollTop / scrollableHeight : 0

    onToggleLanguage?.(targetLang)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetContainer = isFullScreen
          ? contentRef.current
          : standardContentRef.current
        if (targetContainer) {
          const targetScrollableHeight = Math.max(
            0,
            targetContainer.scrollHeight - targetContainer.clientHeight
          )
          targetContainer.scrollTop = Math.min(
            targetScrollableHeight,
            Math.max(0, ratio * targetScrollableHeight)
          )
        }
      })
    })
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
              ? `Lingua attiva: ${effectiveLanguage.toUpperCase()}. Clicca per passare a ${effectiveLanguage === 'it' ? 'Inglese (ENG)' : 'Italiano (ITA)'}`
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
    if (activeThreadId) setIsQnaSidebarOpen(true)
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
        <div className="focus-mode-overlay" onWheel={handlePinchZoom}>
          <div className="focus-mode-toolbar">
            <div className="focus-toolbar-left">
              <span className="focus-course">
                {selectedLecture.courseCode ?? 'Nessun corso'}
              </span>
              <span className="focus-title">
                {selectedLecture.sourceAudioFileName}
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
          <div className="focus-mode-layout">
            <div
              ref={contentRef}
              className="focus-mode-content"
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
              <React.Suspense
                fallback={<p className="loading">Caricamento Q&amp;A…</p>}
              >
                <QnaSidebar
                  threads={threads}
                  activeThreadId={activeThreadId}
                  setActiveThreadId={setActiveThreadId}
                  isGenerating={isGeneratingQna}
                  qnaStatus={
                    activeThreadId
                      ? (qnaStatuses[activeThreadId] ?? null)
                      : null
                  }
                  error={qnaError}
                  onSendMessage={sendMessage}
                  onDeleteThread={deleteThread}
                  onClose={() => setIsQnaSidebarOpen(false)}
                />
              </React.Suspense>
            )}
          </div>

          <FocusLockModal
            show={showFocusLock}
            courseCode={selectedLecture.courseCode}
            elapsedMinutes={Math.floor(activeSeconds / 60)}
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
            {selectedLecture.title?.trim() ||
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
      <nav className="drawer-tabs">
        <button
          className={`tab-btn ${activeTab === 'markdown' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('markdown')}
        >
          📝 Dispensa Didattica {markdownText && '•'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'transcript' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          📄 Trascrizione Grezza {transcriptText && '•'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'study' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('study')}
        >
          🎯 Quiz & Flashcard {studySet && '•'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'info' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          ⚙️ Info & Gestione
        </button>
      </nav>

      <div className="detail-body">
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
                <div className="card-header">
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
                          title="Stampa o salva in PDF con formule LaTeX"
                        >
                          🖨️ Stampa / PDF
                        </button>
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
                        <React.Suspense
                          fallback={
                            <p className="loading">Caricamento Q&amp;A…</p>
                          }
                        >
                          <QnaSidebar
                            threads={threads}
                            activeThreadId={activeThreadId}
                            setActiveThreadId={setActiveThreadId}
                            isGenerating={isGeneratingQna}
                            qnaStatus={
                              activeThreadId
                                ? (qnaStatuses[activeThreadId] ?? null)
                                : null
                            }
                            error={qnaError}
                            onSendMessage={sendMessage}
                            onDeleteThread={deleteThread}
                            onClose={() => setIsQnaSidebarOpen(false)}
                          />
                        </React.Suspense>
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
                            <div className="ai-generating-box">
                              <div className="ai-pulse-spinner" />
                              <div className="ai-generating-text">
                                <h4>
                                  🎙️ Ascolto audio ed elaborazione in corso…
                                </h4>
                                <p>
                                  Gemini sta trascrivendo il parlato ed
                                  estraendo la dispensa didattica strutturata.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="ai-cta-buttons">
                              <button
                                className="primary-button large ai-main-btn"
                                onClick={onTranscribeAudio}
                              >
                                🎙️ Trascrivi ed Elabora con Gemini AI
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
                          editRecordedAt ? editRecordedAt.slice(0, 16) : ''
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


