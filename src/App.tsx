import {
  lazy,
  Suspense,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from 'react'
import type { StudyStatus } from '../shared/archive'
import { Sidebar } from './components/Sidebar'
import { LectureList } from './components/LectureList'
import { SemesterReminderBanner } from './components/SemesterReminderBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useLectures } from './hooks/useLectures'
import { useSettings } from './hooks/useSettings'
import { useLectureContent } from './hooks/useLectureContent'
import { useGeminiGeneration } from './hooks/useGeminiGeneration'
import { useQuickCapture } from './hooks/useQuickCapture'

const LectureDrawer = lazy(() =>
  import('./components/LectureDrawer').then((module) => ({
    default: module.LectureDrawer
  }))
)
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({
    default: module.Dashboard
  }))
)
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((module) => ({
    default: module.SettingsModal
  }))
)
const BatchSelectionModal = lazy(() =>
  import('./components/BatchSelectionModal').then((module) => ({
    default: module.BatchSelectionModal
  }))
)
const PasteModal = lazy(() =>
  import('./components/PasteModal').then((module) => ({
    default: module.PasteModal
  }))
)
const CourseManagementModal = lazy(() =>
  import('./components/CourseManagementModal').then((module) => ({
    default: module.CourseManagementModal
  }))
)
const QuickCaptureOverlay = lazy(() =>
  import('./components/QuickCaptureOverlay').then((module) => ({
    default: module.QuickCaptureOverlay
  }))
)
const LogViewerModal = lazy(() =>
  import('./components/LogViewerModal').then((module) => ({
    default: module.LogViewerModal
  }))
)

function LazyFallback() {
  return <p className="loading">Caricamento…</p>
}

function formatDate(value: string | null): string {
  if (!value) return 'Data da assegnare'
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}${timePart ? ` · ${timePart.slice(0, 5)}` : ''}`
}

function formatFileSize(byteSize: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1
  }).format(byteSize / 1024 / 1024)
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes} min`
}

const STUDY_STATUS_LABELS: Record<
  StudyStatus,
  { label: string; icon: string; className: string }
> = {
  'da-studiare': { label: 'Da studiare', icon: '🟡', className: 'status-todo' },
  'in-corso': { label: 'In corso', icon: '🔵', className: 'status-inprogress' },
  completata: { label: 'Completata', icon: '🟢', className: 'status-done' }
}

export default function App() {
  const [mainView, setMainView] = useState<'archive' | 'dashboard'>('archive')
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(
    null
  )
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [dismissedSemesterReminder, setDismissedSemesterReminder] =
    useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Theme state (light / dark) with persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lezionify_theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lezionify_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  // 1. Lectures collection and library management hook
  const {
    lectures,
    selectedCourse,
    setSelectedCourse,
    selectedStudyStatus,
    setSelectedStudyStatus,
    searchQuery,
    setSearchQuery,
    isLoading,
    isImporting,
    notice,
    setNotice,
    courseStats,
    selectedCourseInfo,
    setSelectedCourseInfo,
    existingCourses,
    coursesWithCounts,
    visibleLectures,
    candidateLectures,
    candidateTranslationLectures,
    refreshCourseStats,
    refreshLibrary,
    syncAndRefreshLibrary,
    updateLectureInState,
    handleImport,
    handleManualSync,
    handleOpenCourseInfo
  } = useLectures()

  const [activeLanguage, setActiveLanguage] = useState<'it' | 'en'>('it')

  const selectedLecture = useMemo(
    () => lectures.find((l) => l.id === selectedLectureId) ?? null,
    [lectures, selectedLectureId]
  )

  // 2. Settings hook
  const {
    settings,
    showSettingsModal,
    setShowSettingsModal,
    inputApiKeys,
    activeKeyIdx,
    setActiveKeyIdx,
    autoRotate,
    setAutoRotate,
    inputModel,
    setInputModel,
    newKeyInput,
    setNewKeyInput,
    keyTestStates,
    isSavingSettings,
    loadSettings,
    openSettingsModal,
    handleAddKey,
    handleRemoveKey,
    handleTestKey,
    handleSaveSettings,
    saveCourseConfig
  } = useSettings((msg) => setNotice(msg))

  const [showLogModal, setShowLogModal] = useState(false)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // Global error reporting to internal app log
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      window.archive?.logClientMessage?.(
        'error',
        'renderer',
        event.message || 'Errore non gestito nel renderer',
        event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
      )
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      window.archive?.logClientMessage?.(
        'error',
        'renderer',
        'Promise non gestita nel renderer',
        String(event.reason?.stack || event.reason)
      )
    }
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // B-03/B-04: Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K → focus search input
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isSidebarCollapsed) setIsSidebarCollapsed(false)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      // Ctrl+L or Cmd+L → toggle system log modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        setShowLogModal((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isSidebarCollapsed])

  // 3. Selected lecture content hook
  const {
    activeTab,
    setActiveTab,
    transcriptText,
    setTranscriptText,
    markdownText,
    setMarkdownText,
    markdownEnText,
    setMarkdownEnText,
    studySet,
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
  } = useLectureContent({
    selectedLecture,
    onRefreshLibrary: refreshLibrary,
    onUpdateLectureInState: updateLectureInState,
    onNotice: setNotice,
    onClearSelectedLecture: () => setSelectedLectureId(null)
  })

  // 4. Gemini AI generation hook
  const {
    isGenerating,
    generationProgress,
    generationError,
    isBatchGenerating,
    isTranscribing,
    transcribeError,
    isTranslating,
    translationError,
    isBatchTranslating,
    showSelectionModal,
    setShowSelectionModal,
    selectedBatchIds,
    setSelectedBatchIds,
    selectedTranslationBatchIds,
    setSelectedTranslationBatchIds,
    handleGenerateLectureNotes,
    handleTranslateLectureNotes,
    openSelectionModal,
    handleGenerateSelected,
    handleTranslateSelected,
    handleTranscribeAudio
  } = useGeminiGeneration({
    selectedLecture,
    candidateLectures,
    candidateTranslationLectures,
    settings,
    onOpenSettingsModal: openSettingsModal,
    onNotice: setNotice,
    onRefreshLibrary: refreshLibrary,
    onSyncAndRefreshLibrary: syncAndRefreshLibrary,
    onSetMarkdownText: setMarkdownText,
    onSetMarkdownEnText: setMarkdownEnText,
    onSetTranscriptText: setTranscriptText,
    onSetActiveTab: setActiveTab
  })

  // 5. Quick capture (Brain Dump / Post-it overlay) hook
  const quickCapture = useQuickCapture()

  return (
    <main className={`app-shell ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <Sidebar
        mainView={mainView}
        setMainView={(view) => {
          setMainView(view)
          if (view === 'dashboard') {
            refreshCourseStats()
          }
        }}
        selectedCourse={selectedCourse}
        setSelectedCourse={(course) => {
          setSelectedCourse(course)
          setSelectedLectureId(null)
        }}
        selectedStudyStatus={selectedStudyStatus}
        setSelectedStudyStatus={setSelectedStudyStatus}
        totalLecturesCount={lectures.length}
        coursesWithCounts={coursesWithCounts}
        getCourseLecturesCount={(c) =>
          lectures.filter((l) => (l.courseCode ?? 'Senza corso') === c).length
        }
        onOpenSettings={openSettingsModal}
        hasConfiguredKey={Boolean(
          settings.apiKey || settings.apiKeys.length > 0
        )}
        onRefreshStats={refreshCourseStats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        searchInputRef={searchInputRef}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCourseManagement={() => setShowCourseModal(true)}
        onOpenQuickCapture={quickCapture.toggleOpen}
        onOpenLogViewer={() => setShowLogModal(true)}
      />

      <div className="main-content-wrapper">
        {!dismissedSemesterReminder && (
          <SemesterReminderBanner
            onOpenCourseManagement={() => setShowCourseModal(true)}
            onDismiss={() => setDismissedSemesterReminder(true)}
          />
        )}

        {mainView === 'archive' && (
          <ErrorBoundary fallbackTitle="Errore nel caricamento dell'archivio lezioni">
            <LectureList
              selectedCourse={selectedCourse}
              isBatchGenerating={isBatchGenerating}
              isImporting={isImporting}
              onOpenSelectionModal={openSelectionModal}
              onManualSync={() => void handleManualSync()}
              onImportFiles={() => void handleImport('files')}
              onImportFolder={() => void handleImport('folder')}
              notice={notice}
              onDismissNotice={() => setNotice(null)}
              visibleLectures={visibleLectures}
              selectedLectureId={selectedLectureId}
              onSelectLecture={(id) => setSelectedLectureId(id)}
              isLoading={isLoading}
              selectedStudyStatus={selectedStudyStatus}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              hasAnyLectures={lectures.length > 0}
              hasConfiguredKey={Boolean(
                settings.apiKey || settings.apiKeys.length > 0
              )}
              onOpenSettings={openSettingsModal}
            />
          </ErrorBoundary>
        )}

        {mainView === 'dashboard' && (
          <Suspense fallback={<LazyFallback />}>
            <ErrorBoundary fallbackTitle="Errore nel caricamento delle statistiche">
              <Dashboard
                courseStats={courseStats}
                selectedCourseInfo={selectedCourseInfo}
                setSelectedCourseInfo={setSelectedCourseInfo}
                onOpenCourseInfo={(code) => void handleOpenCourseInfo(code)}
                formatDuration={formatDuration}
                settings={settings}
                saveCourseConfig={saveCourseConfig}
                onOpenCourseManagement={() => setShowCourseModal(true)}
                onOpenQuickCapture={quickCapture.toggleOpen}
                scratchpadData={{
                  todos: quickCapture.todos,
                  notes: quickCapture.notes,
                  updatedAt: ''
                }}
              />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>

      {selectedLecture && mainView === 'archive' && (
        <Suspense fallback={<LazyFallback />}>
          <ErrorBoundary fallbackTitle="Errore nel pannello della lezione">
            <LectureDrawer
              selectedLecture={selectedLecture}
              allLectures={lectures}
              onSelectLecture={(id) => setSelectedLectureId(id)}
              onClose={() => setSelectedLectureId(null)}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              markdownText={markdownText}
              transcriptText={transcriptText}
              studySet={studySet}
              isGeneratingStudySet={isGeneratingStudySet}
              studySetError={studySetError}
              onGenerateStudySet={() => void handleGenerateStudySet()}
              isLoadingContent={isLoadingContent}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              generationError={generationError}
              isTranscribing={isTranscribing}
              transcribeError={transcribeError}
              copyFeedback={copyFeedback}
              isEditingMetadata={isEditingMetadata}
              setIsEditingMetadata={setIsEditingMetadata}
              editCourseCode={editCourseCode}
              setEditCourseCode={setEditCourseCode}
              editRecordedAt={editRecordedAt}
              setEditRecordedAt={setEditRecordedAt}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              existingCourses={existingCourses}
              settingsModel={settings.model}
              onStudyStatusChange={(st) => void handleStudyStatusChange(st)}
              onGenerateLectureNotes={() => void handleGenerateLectureNotes()}
              onPrintNotes={() => void handlePrintNotes()}
              onCopyMarkdown={handleCopyMarkdown}
              onCopyTranscript={handleCopyTranscript}
              onAttachTranscript={() => void handleAttachTranscript()}
              onTranscribeAudio={() => void handleTranscribeAudio()}
              onPasteFromClipboard={() => void handlePasteFromClipboard()}
              onSaveMetadata={(e) => void handleSaveMetadata(e)}
              onDeleteLecture={() => void handleDeleteLecture()}
              onOpenSettings={openSettingsModal}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              studyStatusLabels={STUDY_STATUS_LABELS}
              activeLanguage={activeLanguage}
              onToggleLanguage={setActiveLanguage}
              markdownEnText={markdownEnText}
              isTranslating={isTranslating}
              translationError={translationError}
              onTranslateLectureNotes={() => void handleTranslateLectureNotes()}
            />
          </ErrorBoundary>
        </Suspense>
      )}

      <Suspense fallback={null}>
        {showCourseModal && (
          <CourseManagementModal
            isOpen
            onClose={() => setShowCourseModal(false)}
            lectures={lectures}
            onRefreshLibrary={refreshLibrary}
            onNotice={setNotice}
          />
        )}

        {showSettingsModal && (
          <SettingsModal
            show
            onClose={() => setShowSettingsModal(false)}
            inputApiKeys={inputApiKeys}
            activeKeyIdx={activeKeyIdx}
            setActiveKeyIdx={setActiveKeyIdx}
            autoRotate={autoRotate}
            setAutoRotate={setAutoRotate}
            inputModel={inputModel}
            setInputModel={setInputModel}
            newKeyInput={newKeyInput}
            setNewKeyInput={setNewKeyInput}
            keyTestStates={keyTestStates}
            isSaving={isSavingSettings}
            onAddKey={handleAddKey}
            onRemoveKey={handleRemoveKey}
            onTestKey={(idx, key) => void handleTestKey(idx, key)}
            onSave={() => void handleSaveSettings()}
          />
        )}

        {showSelectionModal && (
          <BatchSelectionModal
            show
            onClose={() => setShowSelectionModal(false)}
            candidateLectures={candidateLectures}
            selectedBatchIds={selectedBatchIds}
            setSelectedBatchIds={setSelectedBatchIds}
            isBatchGenerating={isBatchGenerating}
            generationProgress={generationProgress}
            onGenerateSelected={() => void handleGenerateSelected()}
            candidateTranslationLectures={candidateTranslationLectures}
            selectedTranslationBatchIds={selectedTranslationBatchIds}
            setSelectedTranslationBatchIds={setSelectedTranslationBatchIds}
            isBatchTranslating={isBatchTranslating}
            onTranslateSelected={() => void handleTranslateSelected()}
            formatDate={formatDate}
          />
        )}

        {showPasteModal && (
          <PasteModal
            show
            onClose={() => setShowPasteModal(false)}
            inputText={pasteInputText}
            setInputText={setPasteInputText}
            onConfirm={() => void handleConfirmPasteModal()}
          />
        )}

        {quickCapture.isOpen && (
          <QuickCaptureOverlay
            isOpen
            onClose={quickCapture.closeOverlay}
            todos={quickCapture.todos}
            notes={quickCapture.notes}
            onAddTodo={quickCapture.addTodo}
            onToggleTodo={quickCapture.toggleTodo}
            onUpdateTodoText={quickCapture.updateTodoText}
            onDeleteTodo={quickCapture.deleteTodo}
            onClearCompletedTodos={quickCapture.clearCompletedTodos}
            onUpdateNotes={quickCapture.updateNotes}
          />
        )}

        {showLogModal && (
          <LogViewerModal show onClose={() => setShowLogModal(false)} />
        )}
      </Suspense>
    </main>
  )
}
