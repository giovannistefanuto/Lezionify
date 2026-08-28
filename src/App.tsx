import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppSettings,
  GeminiModel,
  ImportSummary,
  Lecture,
  StudyStatus
} from '../shared/archive'
import { MarkdownViewer } from './components/MarkdownViewer'
import {
  buildGeminiContextPrompt,
  PROMPT_PRESETS,
  type PromptPreset
} from './utils/contextPrompt'

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

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) {
    const remMins = mins % 60
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function importMessage(summary: ImportSummary): string {
  const imported = summary.imported.length
  const skipped = summary.skipped.length
  if (skipped === 0) return `${imported} ${imported === 1 ? 'lezione importata' : 'lezioni importate'}.`
  return `${imported} importate, ${skipped} non importate o gia' presenti.`
}

const STUDY_STATUS_LABELS: Record<StudyStatus, { label: string; icon: string; className: string }> = {
  'da-studiare': { label: 'Da studiare', icon: '🟡', className: 'status-todo' },
  'in-corso': { label: 'In corso', icon: '🔵', className: 'status-inprogress' },
  'completata': { label: 'Completata', icon: '🟢', className: 'status-done' }
}

const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0]

const AVAILABLE_MODELS: { value: GeminiModel; label: string; tag: string; description: string }[] = [
  {
    value: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    tag: 'Consigliato · Free Tier Ottimale',
    description: 'Il modello più equilibrato e accurato per formule LaTeX e dispense di ingegneria.'
  },
  {
    value: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    tag: 'Ultra Veloce (~700ms)',
    description: 'Generazione quasi istantanea, perfetto per lezioni veloci e consumo minimo di quota.'
  },
  {
    value: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tag: 'Veloce',
    description: 'Solido per elaborazioni ad alta capacità di contesto.'
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tag: 'Stabile',
    description: 'Collaudato per trascrizioni universitarie e dispense didattiche.'
  },
  {
    value: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    tag: 'Nuovo Flagship',
    description: 'Il modello più potente per compiti articolati (richiede quota disponibile).'
  }
]

export default function App() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('tutti')
  const [selectedStudyStatus, setSelectedStudyStatus] = useState<string>('tutti')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchMatchIds, setSearchMatchIds] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // App settings state
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    apiKeys: [],
    activeKeyIndex: 0,
    autoRotateOnQuota: true,
    model: 'gemini-3.6-flash'
  })
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [inputApiKeys, setInputApiKeys] = useState<string[]>([])
  const [activeKeyIdx, setActiveKeyIdx] = useState<number>(0)
  const [autoRotate, setAutoRotate] = useState<boolean>(true)
  const [inputModel, setInputModel] = useState<GeminiModel>('gemini-3.6-flash')
  const [newKeyInput, setNewKeyInput] = useState('')
  const [keyTestStates, setKeyTestStates] = useState<
    Record<number, { isTesting: boolean; result?: { valid: boolean; error?: string } }>
  >({})

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Selected lecture & drawer state
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'markdown' | 'transcript' | 'info'>('markdown')
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [markdownText, setMarkdownText] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  // Gemini context preset dropdown state
  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteInputText, setPasteInputText] = useState('')

  // Persistent audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)

  // Metadata editor state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [editCourseCode, setEditCourseCode] = useState('')
  const [editRecordedAt, setEditRecordedAt] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const selectedLecture = useMemo(
    () => lectures.find((l) => l.id === selectedLectureId) ?? null,
    [lectures, selectedLectureId]
  )

  async function refreshLibrary(): Promise<void> {
    setIsLoading(true)
    try {
      setLectures(await window.archive.listLectures())
    } catch {
      setNotice('Non riesco a leggere l’archivio locale.')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSettings(): Promise<void> {
    try {
      const s = await window.archive.getSettings()
      setSettings(s)
      setInputApiKeys(
        s.apiKeys.length > 0 ? s.apiKeys : s.apiKey ? [s.apiKey] : []
      )
      setActiveKeyIdx(s.activeKeyIndex >= 0 ? s.activeKeyIndex : 0)
      setAutoRotate(s.autoRotateOnQuota)
      setInputModel(s.model)
    } catch {
      // Ignora errore
    }
  }

  useEffect(() => {
    void refreshLibrary()
    void loadSettings()
  }, [])

  // Full text search debounced
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchMatchIds(null)
      return
    }

    const timer = setTimeout(() => {
      window.archive
        .searchFullText(query)
        .then((ids) => setSearchMatchIds(ids))
        .catch(() => setSearchMatchIds([]))
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset audio & load selected lecture content
  useEffect(() => {
    if (!selectedLecture) {
      setTranscriptText(null)
      setMarkdownText(null)
      setIsEditingMetadata(false)
      setShowDeleteConfirm(false)
      setShowPasteModal(false)
      setShowPresetMenu(false)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setGenerationError(null)
      return
    }

    setEditCourseCode(selectedLecture.courseCode ?? '')
    setEditRecordedAt(selectedLecture.recordedAt ?? '')
    setIsEditingMetadata(false)
    setShowDeleteConfirm(false)
    setShowPasteModal(false)
    setShowPresetMenu(false)
    setIsLoadingContent(true)
    setIsPlaying(false)
    setCurrentTime(0)
    setGenerationError(null)

    Promise.all([
      selectedLecture.status === 'transcript-available'
        ? window.archive.readTranscript(selectedLecture.id)
        : Promise.resolve(null),
      selectedLecture.markdownFileName
        ? window.archive.readMarkdown(selectedLecture.id)
        : Promise.resolve(null)
    ])
      .then(([transcript, markdown]) => {
        setTranscriptText(transcript)
        setMarkdownText(markdown)
        if (markdown) {
          setActiveTab('markdown')
        } else if (transcript) {
          setActiveTab('transcript')
        } else {
          setActiveTab('info')
        }
      })
      .catch(() => {
        setNotice('Errore nel caricamento dei contenuti della lezione.')
      })
      .finally(() => setIsLoadingContent(false))
  }, [selectedLecture?.id, selectedLecture?.status, selectedLecture?.markdownFileName])

  // Handle audio element updates
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [selectedLecture?.id])

  function togglePlayPause(): void {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  function handleSkip(seconds: number): void {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds))
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>): void {
    const newTime = Number(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  function handleSpeedChange(speed: number): void {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  const existingCourses = useMemo(() => {
    const list = Array.from(new Set(lectures.map((lecture) => lecture.courseCode).filter(Boolean))) as string[]
    return list.sort()
  }, [lectures])

  const coursesWithCounts = useMemo(() => {
    const allCourses = Array.from(new Set(lectures.map((lecture) => lecture.courseCode ?? 'Senza corso'))).sort()
    return allCourses
  }, [lectures])

  const visibleLectures = useMemo(() => {
    return lectures.filter((lecture) => {
      const course = lecture.courseCode ?? 'Senza corso'
      if (selectedCourse !== 'tutti' && course !== selectedCourse) return false
      if (selectedStudyStatus !== 'tutti' && lecture.studyStatus !== selectedStudyStatus) return false

      if (searchQuery.trim()) {
        if (searchMatchIds !== null) {
          return searchMatchIds.includes(lecture.id)
        }
        const query = searchQuery.toLowerCase()
        const matchesName = lecture.sourceAudioFileName.toLowerCase().includes(query)
        const matchesCourse = (lecture.courseCode ?? '').toLowerCase().includes(query)
        return matchesName || matchesCourse
      }

      return true
    })
  }, [lectures, selectedCourse, selectedStudyStatus, searchQuery, searchMatchIds])

  const transcriptCount = lectures.filter((lecture) => lecture.status === 'transcript-available').length
  const completedCount = lectures.filter((lecture) => lecture.studyStatus === 'completata').length
  const inProgressCount = lectures.filter((lecture) => lecture.studyStatus === 'in-corso').length

  async function handleImport(kind: 'files' | 'folder'): Promise<void> {
    setIsImporting(true)
    setNotice(null)
    try {
      const summary = kind === 'files' ? await window.archive.importFiles() : await window.archive.importFolder()
      if (!summary) return
      setNotice(importMessage(summary))
      await refreshLibrary()
    } catch {
      setNotice('L’importazione non è stata completata. Riprova o controlla i file selezionati.')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleAttachTranscript(): Promise<void> {
    if (!selectedLecture) return
    try {
      const updated = await window.archive.attachTranscript(selectedLecture.id)
      if (updated) {
        setNotice('Trascrizione associata con successo.')
        await refreshLibrary()
        const text = await window.archive.readTranscript(selectedLecture.id)
        setTranscriptText(text)
        setActiveTab('transcript')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore durante l’associazione.'
      setNotice(msg)
    }
  }

  async function handleSaveMetadata(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!selectedLecture) return
    try {
      await window.archive.updateLecture(selectedLecture.id, {
        courseCode: editCourseCode.trim() || null,
        recordedAt: editRecordedAt.trim() || null
      })
      setNotice('Metadati della lezione aggiornati.')
      setIsEditingMetadata(false)
      await refreshLibrary()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore nel salvataggio dei metadati.'
      setNotice(msg)
    }
  }

  async function handleStudyStatusChange(newStatus: StudyStatus): Promise<void> {
    if (!selectedLecture) return
    try {
      await window.archive.updateLecture(selectedLecture.id, { studyStatus: newStatus })
      await refreshLibrary()
    } catch {
      setNotice('Impossibile aggiornare lo stato di studio.')
    }
  }

  // AI automatic generation
  async function handleGenerateLectureNotes(): Promise<void> {
    if (!selectedLecture) return
    if (!settings.apiKey && settings.apiKeys.length === 0) {
      openSettingsModal()
      setNotice('Aggiungi prima almeno una chiave API Gemini nel pool delle Impostazioni.')
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    try {
      const res = await window.archive.generateLectureNotes(selectedLecture.id)
      if (res.success && res.markdown) {
        setMarkdownText(res.markdown)
        setActiveTab('markdown')
        setNotice('⚡ Dispensa generata con successo da Gemini!')
        await refreshLibrary()
      } else {
        setGenerationError(res.error ?? 'Errore sconosciuto durante la generazione.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore di connessione con l’API Gemini.'
      setGenerationError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  function openSettingsModal(): void {
    setInputApiKeys(
      settings.apiKeys.length > 0
        ? [...settings.apiKeys]
        : settings.apiKey
          ? [settings.apiKey]
          : []
    )
    setActiveKeyIdx(settings.activeKeyIndex >= 0 ? settings.activeKeyIndex : 0)
    setAutoRotate(settings.autoRotateOnQuota)
    setInputModel(settings.model)
    setNewKeyInput('')
    setKeyTestStates({})
    setShowSettingsModal(true)
  }

  function handleAddKey(): void {
    const trimmed = newKeyInput.trim()
    if (!trimmed) return
    if (inputApiKeys.includes(trimmed)) {
      setNotice('Questa chiave API è già presente nel pool.')
      return
    }
    const updated = [...inputApiKeys, trimmed]
    setInputApiKeys(updated)
    setNewKeyInput('')
  }

  function handleRemoveKey(idx: number): void {
    const updated = inputApiKeys.filter((_, i) => i !== idx)
    setInputApiKeys(updated)
    if (activeKeyIdx >= updated.length) {
      setActiveKeyIdx(Math.max(0, updated.length - 1))
    }
  }

  async function handleTestKey(idx: number, key: string): Promise<void> {
    setKeyTestStates((prev) => ({
      ...prev,
      [idx]: { isTesting: true }
    }))
    try {
      const res = await window.archive.testApiKey(key)
      setKeyTestStates((prev) => ({
        ...prev,
        [idx]: { isTesting: false, result: res }
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore di connessione'
      setKeyTestStates((prev) => ({
        ...prev,
        [idx]: { isTesting: false, result: { valid: false, error: msg } }
      }))
    }
  }

  async function handleSaveSettings(): Promise<void> {
    try {
      const updated = await window.archive.saveSettings({
        apiKeys: inputApiKeys,
        activeKeyIndex: activeKeyIdx,
        autoRotateOnQuota: autoRotate,
        model: inputModel
      })
      setSettings(updated)
      setShowSettingsModal(false)
      setNotice(`Impostazioni salvate: ${updated.apiKeys.length} chiavi API nel pool.`)
    } catch {
      setNotice('Errore durante il salvataggio delle impostazioni.')
    }
  }

  async function handlePasteFromClipboard(): Promise<void> {
    if (!selectedLecture) return
    try {
      const clipText = await navigator.clipboard.readText()
      if (clipText && clipText.trim().length > 10) {
        await window.archive.saveMarkdown(selectedLecture.id, clipText)
        setMarkdownText(clipText)
        setNotice('Lezione Markdown incollata e renderizzata con successo.')
        await refreshLibrary()
      } else {
        setPasteInputText('')
        setShowPasteModal(true)
      }
    } catch {
      setPasteInputText('')
      setShowPasteModal(true)
    }
  }

  async function handleConfirmPasteModal(): Promise<void> {
    if (!selectedLecture || !pasteInputText.trim()) return
    try {
      await window.archive.saveMarkdown(selectedLecture.id, pasteInputText)
      setMarkdownText(pasteInputText)
      setShowPasteModal(false)
      setNotice('Lezione Markdown salvata e renderizzata.')
      await refreshLibrary()
    } catch {
      setNotice('Errore durante il salvataggio del testo.')
    }
  }

  async function handleDeleteLecture(): Promise<void> {
    if (!selectedLecture) return
    try {
      const ok = await window.archive.deleteLecture(selectedLecture.id)
      if (ok) {
        setNotice('Lezione eliminata dall’archivio.')
        setSelectedLectureId(null)
        await refreshLibrary()
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore durante l’eliminazione.'
      setNotice(msg)
    }
  }

  function handleCopyTranscript(): void {
    if (!transcriptText) return
    void navigator.clipboard.writeText(transcriptText)
    setCopyFeedback('Trascrizione copiata!')
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  function handleCopyMarkdown(): void {
    if (!markdownText) return
    void navigator.clipboard.writeText(markdownText)
    setCopyFeedback('Markdown copiato!')
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  function handleCopyGeminiContext(preset: PromptPreset = 'dispensa-lezionify'): void {
    if (!selectedLecture) return
    const prompt = buildGeminiContextPrompt(selectedLecture, {
      transcriptText,
      markdownText
    }, preset)
    void navigator.clipboard.writeText(prompt)
    setShowPresetMenu(false)
    setCopyFeedback(`Prompt copiato: ${PROMPT_PRESETS[preset].title}!`)
    setTimeout(() => setCopyFeedback(null), 2500)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>Lezionify</span>
        </div>

        <p className="sidebar-label">ARCHIVIO</p>
        <button
          className={`course-button ${selectedCourse === 'tutti' ? 'is-active' : ''}`}
          onClick={() => setSelectedCourse('tutti')}
        >
          Tutte le lezioni <span>{lectures.length}</span>
        </button>

        <p className="sidebar-label">STATO STUDIO</p>
        <div className="study-filter-group">
          {(['tutti', 'da-studiare', 'in-corso', 'completata'] as const).map((st) => (
            <button
              key={st}
              className={`study-filter-btn ${selectedStudyStatus === st ? 'is-active' : ''}`}
              onClick={() => setSelectedStudyStatus(st)}
            >
              {st === 'tutti' && 'Tutti gli stati'}
              {st === 'da-studiare' && '🟡 Da studiare'}
              {st === 'in-corso' && '🔵 In corso'}
              {st === 'completata' && '🟢 Completata'}
            </button>
          ))}
        </div>

        <p className="sidebar-label">CORSI</p>
        <nav aria-label="Corsi">
          {coursesWithCounts.length === 0 ? (
            <p className="empty-courses">I corsi compariranno qui.</p>
          ) : (
            coursesWithCounts.map((course) => (
              <button
                className={`course-button ${selectedCourse === course ? 'is-active' : ''}`}
                key={course}
                onClick={() => setSelectedCourse(course)}
              >
                {course}
                <span>{lectures.filter((lecture) => (lecture.courseCode ?? 'Senza corso') === course).length}</span>
              </button>
            ))
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className="settings-trigger-btn"
            onClick={openSettingsModal}
          >
            <span>⚙️ Impostazioni AI</span>
            {settings.apiKeys.length === 0 && !settings.apiKey && (
              <span className="settings-warning-dot" title="Nessuna chiave API configurata">•</span>
            )}
          </button>
          <div className="stats-lines">
            <p><strong>{completedCount}</strong> completate · <strong>{inProgressCount}</strong> in studio</p>
            <p><strong>{transcriptCount}</strong> con testo / <strong>{lectures.length}</strong> totali</p>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">MILESTONE 3 · GENERAZIONE AUTOMATICA AI</p>
            <h1>{selectedCourse === 'tutti' ? 'Le tue lezioni' : selectedCourse}</h1>
            <p className="subtitle">Genera dispense universitarie strutturate con formule LaTeX tramite Google Gemini con 1 click.</p>
          </div>
          <div className="actions">
            <button className="secondary-button" disabled={isImporting} onClick={() => void handleImport('files')}>
              Seleziona file MP3
            </button>
            <button className="primary-button" disabled={isImporting} onClick={() => void handleImport('folder')}>
              {isImporting ? 'Importazione…' : 'Importa cartella'}
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice-banner">
            <span>{notice}</span>
            <button className="notice-close" onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        <section className="summary-grid" aria-label="Riepilogo archivio">
          <div className="summary-card"><span>Lezioni totali</span><strong>{lectures.length}</strong></div>
          <div className="summary-card"><span>In studio</span><strong>{inProgressCount}</strong></div>
          <div className="summary-card"><span>Completate</span><strong>{completedCount}</strong></div>
        </section>

        <section className="lecture-section">
          <div className="section-heading">
            <div className="search-bar-wrap">
              <h2>Archivio ({visibleLectures.length})</h2>
              <input
                type="search"
                className="search-input"
                placeholder="Cerca per corso, nome o testo trascrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <p className="loading">Caricamento archivio…</p>
          ) : visibleLectures.length === 0 ? (
            <div className="empty-state">
              <h2>Nessuna lezione trovata</h2>
              <p>
                {searchQuery || selectedStudyStatus !== 'tutti'
                  ? 'Nessuna lezione corrisponde ai filtri o alla ricerca impostata.'
                  : 'Importa i file MP3 dal registratore per iniziare a strutturare le tue lezioni.'}
              </p>
            </div>
          ) : (
            <div className="lecture-list">
              {visibleLectures.map((lecture) => (
                <article
                  className={`lecture-card ${selectedLectureId === lecture.id ? 'is-selected' : ''}`}
                  key={lecture.id}
                  onClick={() => setSelectedLectureId(lecture.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedLectureId(lecture.id)
                    }
                  }}
                >
                  <div className="lecture-icon">
                    {lecture.courseCode ? lecture.courseCode.slice(0, 2).toUpperCase() : '??'}
                  </div>
                  <div className="lecture-info">
                    <div className="lecture-topline">
                      <span className={`course-tag ${!lecture.courseCode ? 'is-unassigned' : ''}`}>
                        {lecture.courseCode ?? 'DA ASSEGNARE'}
                      </span>
                      <span>{formatDate(lecture.recordedAt)}</span>
                      <span className={`study-badge ${STUDY_STATUS_LABELS[lecture.studyStatus].className}`}>
                        {STUDY_STATUS_LABELS[lecture.studyStatus].icon} {STUDY_STATUS_LABELS[lecture.studyStatus].label}
                      </span>
                    </div>
                    <h3>{lecture.sourceAudioFileName}</h3>
                    <p>
                      {formatFileSize(lecture.byteSize)} ·{' '}
                      {lecture.markdownFileName ? '📝 Dispensa Pronta (LaTeX)' : lecture.sourceTranscriptFileName ? '📄 Trascrizione grezza' : 'Solo audio'}
                    </p>
                  </div>
                  <span className={`status-pill ${lecture.markdownFileName ? 'dispensa-ready' : lecture.status}`}>
                    {lecture.markdownFileName ? '✨ Dispensa AI' : lecture.status === 'transcript-available' ? 'Testo pronto' : 'Solo audio'}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {/* Detail Drawer */}
      {selectedLecture && (
        <aside className="detail-drawer" aria-label="Dettaglio e studio lezione">
          <div className="detail-header">
            <div className="detail-header-left">
              <div className="top-tags">
                <span className={`course-tag large ${!selectedLecture.courseCode ? 'is-unassigned' : ''}`}>
                  {selectedLecture.courseCode ?? 'CORSO DA ASSEGNARE'}
                </span>
                <div className="study-status-select-wrap">
                  {(['da-studiare', 'in-corso', 'completata'] as const).map((st) => (
                    <button
                      key={st}
                      className={`study-status-toggle-btn ${selectedLecture.studyStatus === st ? 'is-current' : ''}`}
                      onClick={() => void handleStudyStatusChange(st)}
                      title={`Imposta stato come ${STUDY_STATUS_LABELS[st].label}`}
                    >
                      {STUDY_STATUS_LABELS[st].icon} {STUDY_STATUS_LABELS[st].label}
                    </button>
                  ))}
                </div>
              </div>

              <h2>{selectedLecture.sourceAudioFileName}</h2>
              <p className="detail-date">{formatDate(selectedLecture.recordedAt)}</p>
            </div>

            <div className="header-right-actions">
              <div className="gemini-btn-split">
                <button
                  className="gemini-copy-btn"
                  onClick={() => handleCopyGeminiContext('dispensa-lezionify')}
                  title="Copia prompt strutturato per Gemini"
                >
                  ✨ {copyFeedback ?? 'Copia prompt'}
                </button>
                <button
                  className="gemini-dropdown-arrow"
                  onClick={() => setShowPresetMenu((prev) => !prev)}
                  title="Scegli preset di prompt"
                >
                  ▾
                </button>

                {showPresetMenu && (
                  <div className="preset-menu">
                    <p className="preset-menu-header">Scegli obiettivo per Gemini:</p>
                    {(Object.keys(PROMPT_PRESETS) as PromptPreset[]).map((key) => (
                      <button
                        key={key}
                        className="preset-menu-item"
                        onClick={() => handleCopyGeminiContext(key)}
                      >
                        <strong>{PROMPT_PRESETS[key].title}</strong>
                        <span>{PROMPT_PRESETS[key].description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="drawer-close-btn"
                onClick={() => setSelectedLectureId(null)}
                title="Chiudi pannello"
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
              className={`tab-btn ${activeTab === 'info' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              ⚙️ Info & Gestione
            </button>
          </nav>

          <div className="detail-body">
            {isLoadingContent ? (
              <p className="loading">Caricamento contenuti lezione…</p>
            ) : (
              <>
                {/* TAB 1: MARKDOWN VIEWER & AI GENERATION */}
                {activeTab === 'markdown' && (
                  <div className="tab-pane">
                    <div className="detail-card markdown-card">
                      <div className="card-header">
                        <div className="card-title-group">
                          <h3>Dispensa Strutturata (LaTeX / Markdown)</h3>
                        </div>
                        <div className="card-actions">
                          {selectedLecture.status === 'transcript-available' && (
                            <button
                              className="ai-generate-header-btn"
                              onClick={() => void handleGenerateLectureNotes()}
                              disabled={isGenerating}
                              title="Genera o rigenera la dispensa didattica chiamando l'API di Gemini"
                            >
                              ⚡ {isGenerating ? 'Generazione in corso…' : markdownText ? 'Rigenera con AI' : 'Genera con AI'}
                            </button>
                          )}
                          {markdownText && (
                            <button className="secondary-button small" onClick={handleCopyMarkdown}>
                              Copia Markdown
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Generation In Progress Box */}
                      {isGenerating && (
                        <div className="ai-generating-box">
                          <div className="ai-pulse-spinner" />
                          <div className="ai-generating-text">
                            <h4>⚡ Elaborazione con Google Gemini ({settings.model})...</h4>
                            <p>
                              L'AI sta analizzando la trascrizione grezza, strutturando i concetti gerarchici,
                              evidenziando i punti d'esame e formattando le formule in LaTeX (KaTeX).
                            </p>
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
                              onClick={() => void handleGenerateLectureNotes()}
                            >
                              Riprova
                            </button>
                            <button
                              className="secondary-button small"
                              onClick={() => setShowSettingsModal(true)}
                            >
                              Verifica Impostazioni API
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Rendered Markdown or Call to Action */}
                      {!isGenerating && (
                        markdownText ? (
                          <div className="markdown-view-container">
                            <MarkdownViewer content={markdownText} />
                          </div>
                        ) : (
                          <div className="ai-cta-card">
                            {selectedLecture.status === 'transcript-available' ? (
                              <>
                                <div className="ai-cta-icon">⚡</div>
                                <h4>Genera la dispensa automaticamente</h4>
                                <p>
                                  Hai a disposizione la trascrizione grezza. Puoi generare istantaneamente
                                  la dispensa universitaria con formule matematiche LaTeX, terminologia inglese e note per l'esame.
                                </p>
                                <div className="ai-cta-buttons">
                                  <button
                                    className="primary-button large ai-main-btn"
                                    onClick={() => void handleGenerateLectureNotes()}
                                  >
                                    ⚡ Genera Dispensa con Gemini AI
                                  </button>
                                  <button
                                    className="secondary-button"
                                    onClick={() => void handlePasteFromClipboard()}
                                  >
                                    📋 Incolla manualmente
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <h4>Trascrizione necessaria</h4>
                                <p>
                                  Per generare la dispensa con l'AI, associa prima un file di trascrizione `.txt` a questa lezione.
                                </p>
                                <button
                                  className="primary-button small"
                                  onClick={() => void handleAttachTranscript()}
                                >
                                  Associa file TXT
                                </button>
                              </>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: RAW TRANSCRIPT */}
                {activeTab === 'transcript' && (
                  <div className="tab-pane">
                    <div className="detail-card transcript-card">
                      <div className="card-header">
                        <div className="card-title-group">
                          <h3>Trascrizione grezza TXT</h3>
                          <span className={`status-pill ${selectedLecture.status}`}>
                            {selectedLecture.status === 'transcript-available' ? 'Disponibile' : 'Assente'}
                          </span>
                        </div>
                        <div className="card-actions">
                          {selectedLecture.status === 'transcript-available' ? (
                            <>
                              <button
                                className="ai-generate-header-btn"
                                onClick={() => void handleGenerateLectureNotes()}
                                disabled={isGenerating}
                              >
                                ⚡ Genera con AI
                              </button>
                              <button
                                className="secondary-button small"
                                onClick={handleCopyTranscript}
                                disabled={!transcriptText}
                              >
                                {copyFeedback ?? 'Copia testo'}
                              </button>
                              <button
                                className="secondary-button small"
                                onClick={() => void handleAttachTranscript()}
                              >
                                Sostituisci TXT
                              </button>
                            </>
                          ) : (
                            <button
                              className="primary-button small"
                              onClick={() => void handleAttachTranscript()}
                            >
                              Associa file TXT
                            </button>
                          )}
                        </div>
                      </div>

                      {transcriptText ? (
                        <div className="transcript-container">
                          <div className="transcript-stats">
                            <span>{transcriptText.split(/\s+/).filter(Boolean).length} parole</span>
                            <span>{transcriptText.length} caratteri</span>
                          </div>
                          <pre className="transcript-text">{transcriptText}</pre>
                        </div>
                      ) : (
                        <div className="transcript-empty">
                          <p>Nessun file di trascrizione `.txt` associato a questo audio.</p>
                          <p className="help-text">
                            Puoi selezionare un file `.txt` dal computer per associarlo a questa lezione.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: INFO & METADATA */}
                {activeTab === 'info' && (
                  <div className="tab-pane">
                    {/* Course & Metadata Management */}
                    <div className="detail-card metadata-card">
                      <div className="card-header">
                        <h3>Metadati & Corso</h3>
                        {!isEditingMetadata && (
                          <button className="text-button" onClick={() => setIsEditingMetadata(true)}>
                            Modifica
                          </button>
                        )}
                      </div>

                      {isEditingMetadata ? (
                        <form onSubmit={(e) => void handleSaveMetadata(e)} className="metadata-form">
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
                              type="text"
                              value={editRecordedAt}
                              onChange={(e) => setEditRecordedAt(e.target.value)}
                              placeholder="YYYY-MM-DDTHH:mm:ss"
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
                          <p><strong>Corso:</strong> {selectedLecture.courseCode ?? 'Nessun corso assegnato'}</p>
                          <p><strong>Data:</strong> {formatDate(selectedLecture.recordedAt)}</p>
                          <p><strong>Stato studio:</strong> {STUDY_STATUS_LABELS[selectedLecture.studyStatus].label}</p>
                          <p><strong>Dimensione audio:</strong> {formatFileSize(selectedLecture.byteSize)}</p>
                          <p><strong>SHA-256 Checksum:</strong> <code>{selectedLecture.checksum}</code></p>
                          <p><strong>Importata il:</strong> {new Date(selectedLecture.importedAt).toLocaleString('it-IT')}</p>
                        </div>
                      )}
                    </div>

                    {/* Danger Zone: Delete Lecture */}
                    <div className="detail-card danger-card">
                      <div className="card-header">
                        <h3>Elimina Lezione</h3>
                      </div>
                      {showDeleteConfirm ? (
                        <div className="delete-confirm-box">
                          <p>Sei sicuro di voler eliminare questa lezione, l'audio e la dispensa dall'archivio locale?</p>
                          <div className="delete-actions">
                            <button
                              className="danger-button"
                              onClick={() => void handleDeleteLecture()}
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
                )}
              </>
            )}
          </div>

          {/* PERSISTENT STICKY AUDIO PLAYER AT DRAWER BOTTOM */}
          <footer className="persistent-audio-player">
            <audio
              ref={audioRef}
              src={`media://audio/${selectedLecture.id}.mp3`}
              preload="metadata"
            />

            <div className="player-top-row">
              <div className="player-playback-controls">
                <button
                  className="player-skip-btn"
                  onClick={() => handleSkip(-10)}
                  title="Indietro 10 secondi"
                >
                  ↺ 10s
                </button>
                <button
                  className="player-play-btn"
                  onClick={togglePlayPause}
                  title={isPlaying ? 'Pausa' : 'Riproduci'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  className="player-skip-btn"
                  onClick={() => handleSkip(10)}
                  title="Avanti 10 secondi"
                >
                  10s ↻
                </button>
              </div>

              <div className="player-timeline-wrap">
                <span className="player-time">{formatAudioTime(currentTime)}</span>
                <input
                  type="range"
                  className="player-slider"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                />
                <span className="player-time">{formatAudioTime(duration)}</span>
              </div>

              <div className="player-speed-wrap">
                {PLAYBACK_SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    className={`speed-pill ${playbackSpeed === sp ? 'is-active' : ''}`}
                    onClick={() => handleSpeedChange(sp)}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </footer>

          {/* Paste Fallback Modal */}
          {showPasteModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>Incolla Dispensa Markdown da Gemini</h3>
                  <button className="modal-close" onClick={() => setShowPasteModal(false)}>✕</button>
                </div>
                <p className="modal-description">
                  Incolla qui sotto la risposta in Markdown generata da Gemini:
                </p>
                <textarea
                  className="modal-textarea"
                  value={pasteInputText}
                  onChange={(e) => setPasteInputText(e.target.value)}
                  placeholder="# Titolo Lezione..."
                  rows={10}
                />
                <div className="modal-actions">
                  <button
                    className="primary-button small"
                    onClick={() => void handleConfirmPasteModal()}
                    disabled={!pasteInputText.trim()}
                  >
                    Salva e Renderizza
                  </button>
                  <button
                    className="secondary-button small"
                    onClick={() => setShowPasteModal(false)}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content settings-modal-content">
            <div className="modal-header">
              <h3>⚙️ Configurazione AI & Pool Chiavi Gemini</h3>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <p className="modal-description">
              Configura il tuo pool di chiavi API per Google Gemini. Lezionify utilizzerà la chiave attiva e ruoterà automaticamente alla successiva in caso di limite di quota sul Free Tier.
            </p>

            <div className="settings-form">
              {/* Pool Header & List */}
              <div className="settings-field">
                <div className="field-label-row">
                  <span>Pool Chiavi API ({inputApiKeys.length}):</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="api-key-link"
                  >
                    Ottieni nuova chiave (gratuita) ↗
                  </a>
                </div>

                <div className="keys-pool-list">
                  {inputApiKeys.length === 0 ? (
                    <div className="keys-pool-empty">
                      Nessuna chiave nel pool. Aggiungine una sotto per iniziare.
                    </div>
                  ) : (
                    inputApiKeys.map((key, idx) => {
                      const isActive = idx === activeKeyIdx
                      const testState = keyTestStates[idx]
                      const maskedKey = `${key.slice(0, 8)}••••••••${key.slice(-4)}`

                      return (
                        <div
                          key={`${key}-${idx}`}
                          className={`key-pool-item ${isActive ? 'is-active-key' : ''}`}
                        >
                          <label className="key-select-label">
                            <input
                              type="radio"
                              name="active-api-key"
                              checked={isActive}
                              onChange={() => setActiveKeyIdx(idx)}
                            />
                            <div className="key-item-info">
                              <div className="key-item-title">
                                <strong>Chiave #{idx + 1}</strong>
                                {isActive && <span className="active-key-badge">Attiva</span>}
                              </div>
                              <span className="key-masked-text">{maskedKey}</span>
                            </div>
                          </label>

                          <div className="key-item-actions">
                            <button
                              type="button"
                              className="key-action-btn test-btn"
                              onClick={() => void handleTestKey(idx, key)}
                              disabled={testState?.isTesting}
                              title="Testa questa chiave"
                            >
                              {testState?.isTesting ? '⏳' : '🧪 Testa'}
                            </button>

                            <button
                              type="button"
                              className="key-action-btn delete-btn"
                              onClick={() => handleRemoveKey(idx)}
                              title="Elimina dal pool"
                            >
                              🗑️
                            </button>
                          </div>

                          {testState?.result && (
                            <div className={`key-test-feedback ${testState.result.valid ? 'is-valid' : 'is-error'}`}>
                              {testState.result.valid ? '✅ Valida' : `❌ ${testState.result.error || 'Errore'}`}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add new key input row */}
                <div className="add-key-row">
                  <input
                    type="text"
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddKey()
                      }
                    }}
                    placeholder="Incolla nuova chiave (AIzaSy...)"
                    className="api-key-input"
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleAddKey}
                    disabled={!newKeyInput.trim()}
                  >
                    + Aggiungi
                  </button>
                </div>
              </div>

              {/* Auto rotate checkbox */}
              <label className="auto-rotate-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                />
                <span>
                  <strong>Rotazione automatica del pool</strong> se la chiave attiva esaurisce la quota temporanea (Consigliato per Free Tier)
                </span>
              </label>

              {/* Model selection */}
              <div className="settings-field">
                <span>Modello Gemini Predefinito:</span>
                <div className="model-options-list">
                  {AVAILABLE_MODELS.map((m) => (
                    <label
                      key={m.value}
                      className={`model-option-card ${inputModel === m.value ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="gemini-model"
                        value={m.value}
                        checked={inputModel === m.value}
                        onChange={() => setInputModel(m.value)}
                      />
                      <div className="model-option-info">
                        <div className="model-option-title">
                          <strong>{m.label}</strong>
                          <span className="model-badge">{m.tag}</span>
                        </div>
                        <span className="model-desc">{m.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="primary-button"
                  onClick={() => void handleSaveSettings()}
                >
                  Salva Impostazioni
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
