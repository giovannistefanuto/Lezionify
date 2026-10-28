import {
  lazy,
  Suspense,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from 'react'
import { ToolSettingsContext, type ToolSettingsSection } from './components/ToolSettingsContext'
import { BatteryIndicator } from './components/BatteryIndicator'
import { AmbientSoundProvider } from './components/AmbientSoundContext'
import type { StudyStatus, VideoImportSelection } from '../shared/archive'
import { Sidebar } from './components/Sidebar'
import { LectureList } from './components/LectureList'
import { SemesterReminderBanner } from './components/SemesterReminderBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useLectures } from './hooks/useLectures'
import { useSettings } from './hooks/useSettings'
import { useLectureContent, invalidateLectureContentCache } from './hooks/useLectureContent'
import { useGeminiGeneration } from './hooks/useGeminiGeneration'
import { useArchivePipeline } from './hooks/useArchivePipeline'
import { useQuickCapture } from './hooks/useQuickCapture'
import { useDictionaryShortcut } from './hooks/useDictionaryShortcut'
import { useFinalLectureReturn } from './hooks/useFinalLectureReturn'

const CourseChat = lazy(() => import('./components/CourseChat').then(module => ({ default: module.CourseChat })))
import { DictionaryOverlay } from './components/DictionaryOverlay'

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
const RecorderEntry = lazy(() =>
  import('./components/RecorderEntry').then((module) => ({
    default: module.RecorderEntry
  }))
)
const VideoImportModal = lazy(() => import('./components/VideoImportModal').then(module => ({ default: module.VideoImportModal })))
const RepetitionWindow = lazy(() => import('./components/RepetitionWindow').then(module => ({ default: module.RepetitionWindow })))

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
  const [courseChatOpen, setCourseChatOpen] = useState(false)
  const [courseChatLoaded, setCourseChatLoaded] = useState(false)
  const dictionary = useDictionaryShortcut()
  const [toolSettingsSection, setToolSettingsSection] = useState<ToolSettingsSection | undefined>()
  const [mainView, setMainView] = useState<'archive' | 'dashboard'>('archive')
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(
    null
  )
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showUsbModal, setShowUsbModal] = useState(false)
  const [showRepetitions, setShowRepetitions] = useState(false)
  const [videoSelection, setVideoSelection] = useState<VideoImportSelection | null>(null)
  const [isSelectingVideos, setIsSelectingVideos] = useState(false)
  const [isUsbConnected, setIsUsbConnected] = useState(false)
  const [dismissedSemesterReminder, setDismissedSemesterReminder] =
    useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Rilevamento automatico e reattivo del registratore USB
  const lastAutoPromptedSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    const checkUsb = async () => {
      try {
        const info = await window.archive?.detectUsbRecorder?.()
        if (isCancelled || !info) return
        if (info.detected) {
          setIsUsbConnected(true)
          const newFiles = info.files.filter((f) => !f.alreadyImported)
          if (newFiles.length > 0) {
            const signature = `${info.recordPath}_${newFiles
              .map((f) => `${f.name}:${f.byteSize}`)
              .join(';')}`
            if (lastAutoPromptedSignatureRef.current !== signature) {
              lastAutoPromptedSignatureRef.current = signature
              setShowUsbModal(true)
            }
          }
        } else {
          setIsUsbConnected(false)
          lastAutoPromptedSignatureRef.current = null
        }
      } catch (e) {
        console.error('Verifica registratore USB fallita:', e)
      }
    }

    void checkUsb()

    const onFocus = () => {
      void checkUsb()
    }
    window.addEventListener('focus', onFocus)

    const interval = setInterval(() => {
      void checkUsb()
    }, 5000)

    return () => {
      isCancelled = true
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

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
    activeLectures,
    archivedCourseCodes,
    isSelectedCourseArchived,
    isSavingCourseArchive,
    handleCourseArchive,
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
    inputApiKeyQuotaGroups,
    setQuotaGroupForKey,
    activeKeyIdx,
    setActiveKeyIdx,
    autoRotate,
    setAutoRotate,
    autoProcessOnImport,
    setAutoProcessOnImport,
    inputModel,
    setInputModel,
    newKeyInput,
    setNewKeyInput,
    keyTestStates,
    isSavingSettings,
    publishingEnabled,
    setPublishingEnabled,
    publishingRepoUrl,
    setPublishingRepoUrl,
    publishingToken,
    setPublishingToken,
    publishingStatus,
    loadSettings,
    openSettingsModal,
    handleAddKey,
    handleRemoveKey,
    handleTestKey,
    handleSaveSettings,
    saveCourseConfig
  } = useSettings((msg) => setNotice(msg))
  useEffect(() => { if (!showSettingsModal) setToolSettingsSection(undefined) }, [showSettingsModal])

  const courseDefinitions = useMemo(
    () => Object.values(settings.courses || {}),
    [settings.courses]
  )

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
      // Ctrl+Shift+L or Cmd+Shift+L → toggle system log modal
      if (!e.defaultPrevented && !e.isComposing && !e.repeat && !e.altKey && e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
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

  const finalLecture = useFinalLectureReturn({
    lecture: selectedLecture,
    lectures,
    saveStatus: handleStudyStatusChange,
    onReturn: () => {
      setSelectedLectureId(null)
      setSelectedCourse('tutti')
      setSelectedStudyStatus('tutti')
      setSearchQuery('')
      setSelectedCourseInfo(null)
      setMainView('archive')
    }
  })

  // 4. Gemini AI generation hook
  const {
    isGenerating,
    generationProgress,
    generationError,
    isTranscribing,
    transcribeError,
    isTranslating,
    translationError,
    handleGenerateLectureNotes,
    handleTranslateLectureNotes,
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

  const {
    pipelineStatus,
    startPipeline,
    resumePipeline,
    stopPipeline
  } = useArchivePipeline({
    onRefreshLibrary: refreshLibrary,
    onNotice: setNotice
  })

  // 5. Quick capture (Brain Dump / Post-it overlay) hook
  const quickCapture = useQuickCapture()

  return (
    <ToolSettingsContext.Provider value={{ isOpen: showSettingsModal, open: section => { setToolSettingsSection(section); openSettingsModal() } }}>
    <AmbientSoundProvider>
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
        totalLecturesCount={activeLectures.length}
        coursesWithCounts={coursesWithCounts}
        getCourseLecturesCount={(c) =>
          lectures.filter((l) => (l.courseCode ?? 'Senza corso') === c).length
        }
        courses={courseDefinitions}
        archivedCourseCodes={archivedCourseCodes}
        isSavingCourseArchive={isSavingCourseArchive}
        onCourseArchive={(code, archived) => {
          void handleCourseArchive(code, archived).then(saved => {
            if (saved && archived) setSelectedLectureId(current =>
              lectures.find(lecture => lecture.id === current)?.courseCode === code ? null : current)
          })
        }}
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
        onOpenCourseChat={() => { setCourseChatLoaded(true); setCourseChatOpen(true) }}
        onOpenQuickCapture={quickCapture.toggleOpen}
        onOpenLogViewer={() => setShowLogModal(true)}
        onOpenUsbRecorder={() => setShowUsbModal(true)}
        onOpenRepetitions={() => setShowRepetitions(true)}
        isUsbConnected={isUsbConnected}
      />

      {courseChatLoaded && <Suspense fallback={<LazyFallback />}><CourseChat open={courseChatOpen}
        courses={[...new Set([...courseDefinitions.map(course => course.code), ...coursesWithCounts.filter(course => course !== 'Senza corso')])]}
        initialCourse={selectedCourse} onClose={() => setCourseChatOpen(false)}
        onOpenLecture={(id, kind) => { setMainView('archive'); const lecture = lectures.find(item => item.id === id); if (lecture?.courseCode) setSelectedCourse(lecture.courseCode); setSelectedLectureId(id); setActiveTab(kind === 'transcript' ? 'transcript' : 'markdown'); setCourseChatOpen(false) }} /></Suspense>}

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
              isArchivedCourse={isSelectedCourseArchived}
              courses={courseDefinitions}
              isImporting={isImporting || isSelectingVideos || Boolean(videoSelection)}
              pipelineStatus={pipelineStatus}
              onStartPipeline={() => {
                if (!settings.apiKey && settings.apiKeys.length === 0) {
                  openSettingsModal()
                  setNotice(
                    'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
                  )
                  return
                }
                void startPipeline()
              }}
              onResumePipeline={() => {
                if (!settings.apiKey && settings.apiKeys.length === 0) {
                  openSettingsModal()
                  setNotice(
                    'Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.'
                  )
                  return
                }
                void resumePipeline()
              }}
              onStopPipeline={() => void stopPipeline()}
              onManualSync={() => void handleManualSync()}
              onImportFiles={() => void handleImport('files')}
              onImportFolder={() => void handleImport('folder')}
              onImportVideos={() => {
                setIsSelectingVideos(true)
                void window.archive.selectVideos().then(selection => setVideoSelection(selection)).catch(() => setNotice('❌ Impossibile selezionare i video. Verifica che i file siano accessibili.')).finally(() => setIsSelectingVideos(false))
              }}
              notice={notice}
              onDismissNotice={() => setNotice(null)}
              visibleLectures={visibleLectures}
              selectedLectureId={selectedLectureId}
              onSelectLecture={(id) => setSelectedLectureId(id)}
              onRenameLecture={async (id, titles) => {
                const updated = await window.archive.renameLectureTitles(id, titles)
                invalidateLectureContentCache(id)
                updateLectureInState(id, updated)
              }}
              onSetLaboratory={async (id, isLaboratory) => {
                try {
                  const updated = await window.archive.updateLecture(id, { isLaboratory })
                  updateLectureInState(id, updated)
                } catch {
                  setNotice('❌ Impossibile salvare la scelta Laboratorio. Riprova.')
                }
              }}
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
                archivedCourseCodes={archivedCourseCodes}
                selectedCourseInfo={selectedCourseInfo}
                setSelectedCourseInfo={setSelectedCourseInfo}
                onOpenCourseInfo={(code) => void handleOpenCourseInfo(code)}
                formatDuration={formatDuration}
                settings={settings}
                saveCourseConfig={saveCourseConfig}
                onOpenCourseManagement={() => setShowCourseModal(true)}
                onOpenQuickCapture={quickCapture.toggleOpen}
                scratchpadData={quickCapture.data}
              />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>

      {selectedLecture && mainView === 'archive' && (
        <Suspense fallback={<LazyFallback />}>
          <ErrorBoundary fallbackTitle="Errore nel pannello della lezione">
            <LectureDrawer
              memoOpen={quickCapture.isOpen}
              selectedLecture={selectedLecture}
              isReturningToList={finalLecture.isReturning}
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
              onStudyStatusChange={finalLecture.changeStatus}
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
        {dictionary.isOpen && <DictionaryOverlay onClose={dictionary.close} selection={dictionary.selection} />}
        {showCourseModal && (
          <CourseManagementModal
            isOpen
            onClose={() => {
              setShowCourseModal(false)
              void loadSettings()
            }}
            lectures={lectures}
            onRefreshLibrary={async () => {
              await refreshLibrary()
              await loadSettings()
            }}
            onNotice={setNotice}
          />
        )}

        {showSettingsModal && (
          <SettingsModal
            show
            onClose={() => { setShowSettingsModal(false); setToolSettingsSection(undefined) }}
            initialSection={toolSettingsSection}
            inputApiKeys={inputApiKeys}
            inputApiKeyQuotaGroups={inputApiKeyQuotaGroups}
            setQuotaGroupForKey={setQuotaGroupForKey}
            activeKeyIdx={activeKeyIdx}
            setActiveKeyIdx={setActiveKeyIdx}
            autoRotate={autoRotate}
            setAutoRotate={setAutoRotate}
            autoProcessOnImport={autoProcessOnImport}
            setAutoProcessOnImport={setAutoProcessOnImport}
            inputModel={inputModel}
            setInputModel={setInputModel}
            newKeyInput={newKeyInput}
            setNewKeyInput={setNewKeyInput}
            keyTestStates={keyTestStates}
            isSaving={isSavingSettings}
            publishingEnabled={publishingEnabled}
            setPublishingEnabled={setPublishingEnabled}
            publishingRepoUrl={publishingRepoUrl}
            setPublishingRepoUrl={setPublishingRepoUrl}
            publishingToken={publishingToken}
            setPublishingToken={setPublishingToken}
            publishingStatus={publishingStatus}
            onAddKey={handleAddKey}
            onRemoveKey={handleRemoveKey}
            onTestKey={(idx, key) => void handleTestKey(idx, key)}
            onSave={() => void handleSaveSettings()}
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
          <QuickCaptureOverlay capture={quickCapture} />
        )}

        {showLogModal && (
          <LogViewerModal show onClose={() => setShowLogModal(false)} />
        )}

        {showUsbModal && (
          <RecorderEntry
            onClose={() => setShowUsbModal(false)}
            onRefreshLibrary={refreshLibrary}
            onNotice={setNotice}
            courses={Object.values(settings.courses || {})}
          />
        )}
        {showRepetitions && <RepetitionWindow onClose={() => setShowRepetitions(false)} />}
        {videoSelection && <VideoImportModal
          selection={videoSelection}
          courses={Object.values(settings.courses || {}).filter(course => !archivedCourseCodes.includes(course.code))}
          onClose={() => setVideoSelection(null)}
          onImported={lecture => {
            setSelectedCourse(lecture.courseCode ?? 'tutti')
            setNotice('✅ Audio dei video importato. Usa “Elabora archivio” per trascrizione, dispensa e traduzione.')
            void refreshLibrary().catch(() => setNotice('⚠️ Audio salvato. Aggiorna l’archivio per visualizzare la lezione.'))
          }}
        />}
      </Suspense>
      <BatteryIndicator />
    </main>
    </AmbientSoundProvider>
    </ToolSettingsContext.Provider>
  )
}
