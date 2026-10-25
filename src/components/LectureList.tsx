import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type {
  ArchivePipelineStatus,
  CourseDefinition,
  Lecture,
  LectureTitleUpdates
} from '../../shared/archive'
import { ArchivePipelinePanel } from './ArchivePipelinePanel'
import { formatCourseDisplayName } from '../utils/courseFormat'
import { courseColor } from '../utils/courseColor'
import { PdfExportButton } from './PdfExportButton'
import { LectureTitleEditor } from './LectureTitleEditor'

interface LectureListProps {
  selectedCourse: string
  isArchivedCourse?: boolean
  courses?: CourseDefinition[]
  isImporting: boolean
  pipelineStatus: ArchivePipelineStatus | null
  onStartPipeline: () => void
  onResumePipeline: () => void
  onStopPipeline: () => void
  onManualSync: () => void
  onImportFiles: () => void
  onImportFolder: () => void
  onImportVideos?: () => void
  notice: string | null
  onDismissNotice: () => void
  visibleLectures: Lecture[]
  selectedLectureId: string | null
  onSelectLecture: (id: string) => void
  onSetLaboratory?: (id: string, isLaboratory: boolean) => Promise<void>
  onRenameLecture?: (id: string, titles: LectureTitleUpdates) => Promise<void>
  isLoading: boolean
  selectedStudyStatus: string
  formatDate: (date: string | null) => string
  formatFileSize?: (bytes: number) => string
  hasAnyLectures: boolean
  hasConfiguredKey: boolean
  onOpenSettings: () => void
}

/** Derive notice severity from emoji prefix for styling (M-01) */
function getNoticeSeverity(
  notice: string
): 'success' | 'error' | 'warning' | 'info' {
  if (
    notice.startsWith('✅') ||
    notice.startsWith('⚡') ||
    notice.startsWith('🎯') ||
    notice.startsWith('🎙️')
  )
    return 'success'
  if (notice.startsWith('❌')) return 'error'
  if (notice.startsWith('⚠️')) return 'warning'
  return 'info'
}

/** Build a human-readable lecture display title (A-06) */
function lectureDisplayTitle(
  lecture: Lecture,
  formatDate: (d: string | null) => string
): string {
  const course = lecture.courseCode
  const date = lecture.recordedAt ? formatDate(lecture.recordedAt) : null

  if (course && date) return `${course} — ${date}`
  if (course) return course
  if (date) return `Lezione del ${date}`

  // fallback: clean up filename
  return lecture.sourceAudioFileName
    .replace(/\.mp3$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
}

export function LectureList({
  selectedCourse,
  isArchivedCourse = false,
  courses = [],
  isImporting,
  pipelineStatus,
  onStartPipeline,
  onResumePipeline,
  onStopPipeline,
  onManualSync,
  onImportFiles,
  onImportFolder,
  onImportVideos,
  notice,
  onDismissNotice,
  visibleLectures,
  selectedLectureId,
  onSelectLecture,
  onSetLaboratory,
  onRenameLecture,
  isLoading,
  selectedStudyStatus,
  formatDate,
  formatFileSize,
  hasAnyLectures,
  hasConfiguredKey,
  onOpenSettings
}: LectureListProps) {
  const [editingTitle, setEditingTitle] = useState<{ lecture: Lecture; trigger: HTMLElement } | null>(null)
  const isArchiveCompleteNotice = notice?.trim() ===
    '⚠️ Archivio già completo: non ci sono elaborazioni da avviare.'
  const isUsbCleanupNotice = /^Eliminati \d+ file dal registratore USB per liberare spazio\. Copie locali al sicuro in Lezionify!$/.test(notice?.trim() ?? '')
  const isTransientNotice = isArchiveCompleteNotice || isUsbCleanupNotice
  const dismissNoticeRef = useRef(onDismissNotice)
  useEffect(() => {
    dismissNoticeRef.current = onDismissNotice
  }, [onDismissNotice])
  useEffect(() => {
    if (!isTransientNotice) return
    const timer = window.setTimeout(() => dismissNoticeRef.current(), 2000)
    return () => window.clearTimeout(timer)
  }, [notice, isTransientNotice])

  // Import dropdown (C-04)
  const [showImportMenu, setShowImportMenu] = useState(false)
  const [lectureMenu, setLectureMenu] = useState<{
    lecture: Lecture; x: number; y: number; trigger: HTMLElement
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [savingLaboratory, setSavingLaboratory] = useState(false)

  useEffect(() => {
    if (!lectureMenu) return
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const dismiss = () => setLectureMenu(null)
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) dismiss()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        dismiss()
        if (event.key === 'Escape') {
          event.preventDefault()
          lectureMenu.trigger.focus()
        }
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('blur', dismiss)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('blur', dismiss)
    }
  }, [lectureMenu])

  const openLectureMenu = (lecture: Lecture, trigger: HTMLElement, x: number, y: number) => {
    if ((!onSetLaboratory && !onRenameLecture) || savingLaboratory) return
    setLectureMenu({ lecture, trigger,
      x: Math.max(8, Math.min(x, window.innerWidth - 198)),
      y: Math.max(8, Math.min(y, window.innerHeight - 110)) })
  }

  const readableDate = (value: string | null) => {
    if (!value) return 'Data non disponibile'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Data non disponibile'
    const day = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? day :
      `${day} · ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
  }
  const isPipelineRunning =
    pipelineStatus?.status === 'planning' || pipelineStatus?.status === 'running'
  const isPipelinePaused = pipelineStatus?.status === 'paused'

  // Clean up the folder name if it was split and format as (SIGLA) - Nome Del Corso
  let displayCourseName = selectedCourse
  if (selectedCourse !== 'tutti') {
    if (selectedCourse.includes('/')) {
      const parts = selectedCourse.split('/')
      displayCourseName = parts[parts.length - 1].trim()
    } else if (
      selectedCourse.includes(' - ') &&
      !selectedCourse.startsWith('(') &&
      !selectedCourse.match(/^[A-Za-z0-9_-]{1,8}\s*-\s*/)
    ) {
      const parts = selectedCourse.split(' - ')
      displayCourseName = parts[parts.length - 1].trim()
    } else {
      displayCourseName = selectedCourse
    }
    displayCourseName = formatCourseDisplayName(displayCourseName, courses)
  }

  // Lecture row keyboard handler (B-02)
  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, lectureId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelectLecture(lectureId)
      }
    },
    [onSelectLecture]
  )

  // Study status uses both color and a distinct progress symbol.
  const studyBadge = (status: string) => {
    switch (status) {
      case 'completata':
        return {
          cls: 'badge-done',
          label: 'Completata'
        }
      case 'in-corso':
        return {
          cls: 'badge-inprogress',
          label: 'In corso'
        }
      default:
        return {
          cls: 'badge-todo',
          label: 'Da studiare'
        }
    }
  }

  // Pipeline status label with informative tooltips
  const pipelineLabel = (lecture: Lecture) => {
    if (lecture.missingAudio)
      return {
        text: 'Audio mancante',
        cls: 'pipeline-error',
        tooltip: 'Il file audio originale non è presente nella cartella locale'
      }
    if (lecture.markdownFileName && lecture.markdownEnFileName)
      return {
        text: 'IT/ENG',
        cls: 'pipeline-md',
        tooltip:
          'Dispensa didattica bilingue (Italiano + Inglese con formule LaTeX)'
      }
    if (lecture.markdownFileName)
      return {
        text: 'IT',
        cls: 'pipeline-md',
        tooltip: 'Dispensa didattica AI (Italiano) con formule LaTeX'
      }
    if (lecture.status === 'transcript-available')
      return {
        text: 'TXT',
        cls: 'pipeline-txt',
        tooltip: 'Trascrizione grezza pronta per generare la dispensa'
      }
    return {
      text: 'Audio',
      cls: 'pipeline-audio',
      tooltip: 'File audio senza trascrizione'
    }
  }

  return (
    <section className="content">
      <header className="content-header-clean">
        <div className="content-title">
          <h1>
            {selectedCourse === 'tutti'
              ? 'Tutte le lezioni'
              : displayCourseName}
          </h1>
          <span className="lecture-count-badge">
            {visibleLectures.length} lezioni{isArchivedCourse && ' · Corso archiviato'}
          </span>
        </div>
        <div className="actions">
          <span className="archive-pipeline-scope">{isPipelinePaused ? 'Riprende il piano in pausa · audio e testi a Gemini' : isPipelineRunning ? 'Elaborazione in corso · ambito e fasi nel pannello' : 'Intero archivio · audio e testi a Gemini · fasi mancanti ITA/ENG'}</span>
          <PdfExportButton request={{ kind: 'course', courseCode: selectedCourse, language: 'it' }} />
          <button
            className="secondary-button small"
            disabled={isImporting || isPipelineRunning}
            onClick={isPipelinePaused ? onResumePipeline : onStartPipeline}
            title={
              isPipelinePaused
                ? 'Riprendi l’elaborazione archivio interrotta'
                : 'Intero archivio, inclusi gli altri corsi: invia a Gemini audio e testi per completare trascrizioni e dispense ITA/ENG mancanti'
            }
          >
            {isPipelineRunning
              ? '⏳ Elaborazione in corso'
              : isPipelinePaused
                ? '▶ Riprendi elaborazione'
                : '▶ Elabora archivio'}
          </button>
          <button
            className="secondary-button small"
            disabled={isImporting || isPipelineRunning}
            onClick={onManualSync}
            title="Aggiorna cartelle"
            aria-label="Aggiorna cartelle"
          >
            🔄 Aggiorna cartelle
          </button>

          {/* Import dropdown (C-04) */}
          <div
            className="import-dropdown-wrap"
            style={{ position: 'relative' }}
          >
            <button
              className="primary-button small"
              disabled={isImporting || isPipelineRunning}
              onClick={() => setShowImportMenu((prev) => !prev)}
              aria-label="Importa file audio"
            >
              + Importa
            </button>
            {showImportMenu && (
              <div className="import-dropdown-menu">
                <button
                  className="import-dropdown-item"
                  onClick={() => {
                    setShowImportMenu(false)
                    onImportFiles()
                  }}
                >
                  🎵 Importa file MP3
                </button>
                <button
                  className="import-dropdown-item"
                  onClick={() => {
                    setShowImportMenu(false)
                    onImportFolder()
                  }}
                >
                  📂 Importa cartella registratore
                </button>
                {onImportVideos && <button className="import-dropdown-item" onClick={() => {
                  setShowImportMenu(false)
                  onImportVideos()
                }}>🎬 Importa uno o più video</button>}
              </div>
            )}
          </div>
        </div>
      </header>

      {pipelineStatus && (
        <ArchivePipelinePanel
          status={pipelineStatus}
          onResume={onResumePipeline}
          onStop={onStopPipeline}
        />
      )}

      {/* Notice banner with severity styling (M-01) */}
      {notice && isTransientNotice && createPortal(
        <div key={notice} className={`notice-banner notice-${isUsbCleanupNotice ? 'success' : 'warning'} archive-complete-toast`} role="status">
          <span>{notice}</span>
          <button type="button" className="notice-close" onClick={onDismissNotice} aria-label="Chiudi notifica">×</button>
        </div>, document.body
      )}
      {notice && !isTransientNotice && (
        <div
          className={`notice-banner notice-${getNoticeSeverity(notice)}`}
          role="alert"
        >
          <span>{notice}</span>
          <button
            className="notice-close"
            onClick={onDismissNotice}
            aria-label="Chiudi notifica"
          >
            ×
          </button>
        </div>
      )}

      <section className="lecture-section-clean">
        {isLoading ? (
          <p className="loading">Caricamento archivio…</p>
        ) : visibleLectures.length === 0 ? (
          /* Enhanced empty state / Onboarding (A-05) */
          !hasAnyLectures ? (
            <div className="onboarding-empty-state">
              <div className="onboarding-header">
                <span className="onboarding-logo">🎓</span>
                <h2>Benvenuto in Lezionify</h2>
                <p className="onboarding-subtitle">
                  Trasforma le tue registrazioni universitarie in dispense
                  strutturate con formule LaTeX e note per l'esame.
                </p>
              </div>

              <div className="onboarding-steps">
                <div className="onboarding-step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Importa i file audio MP3</strong>
                    <p>Dalla cartella del registratore o singoli file.</p>
                  </div>
                </div>
                <div className="onboarding-step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Associa le trascrizioni (.txt)</strong>
                    <p>
                      File TXT generati da Google Colab con Whisper, oppure usa
                      la trascrizione diretta di Gemini AI.
                    </p>
                  </div>
                </div>
                <div className="onboarding-step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>Genera le dispense con AI</strong>
                    <p>
                      Gemini crea dispense didattiche con formule $\LaTeX$, note
                      d'esame e quiz di autovalutazione.
                    </p>
                  </div>
                </div>
              </div>

              <div className="onboarding-actions">
                <button
                  className="primary-button large"
                  onClick={() => setShowImportMenu(true)}
                  disabled={isImporting}
                >
                  📂 Inizia importando i tuoi audio
                </button>
                {!hasConfiguredKey && (
                  <button className="secondary-button" onClick={onOpenSettings}>
                    ⚙️ Configura chiave API Gemini
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>Nessuna lezione trovata</h2>
              <p>
                {selectedStudyStatus !== 'tutti'
                  ? 'Nessuna lezione corrisponde al filtro impostato.'
                  : 'Prova a modificare i filtri o importa nuovi file.'}
              </p>
            </div>
          )
        ) : (
          <div className="lecture-list-clean">
            {visibleLectures.map((lecture) => {
              const badge = studyBadge(lecture.studyStatus)
              const pipeline = pipelineLabel(lecture)
              const mainHeading =
                lecture.title?.trim() ||
                lectureDisplayTitle(lecture, formatDate)

              return (
                <article
                  className={`lecture-row ${selectedLectureId === lecture.id ? 'is-selected' : ''} ${lecture.isLaboratory ? 'is-laboratory' : ''}`}
                  key={lecture.id}
                  onClick={() => onSelectLecture(lecture.id)}
                  onContextMenu={(e) => {
                    if (!onSetLaboratory && !onRenameLecture) return
                    e.preventDefault()
                    openLectureMenu(lecture, e.currentTarget, e.clientX, e.clientY)
                  }}
                  onKeyDown={(e) => {
                    if (onRenameLecture && e.key === 'F2') {
                      e.preventDefault(); setEditingTitle({ lecture, trigger: e.currentTarget })
                    } else if ((onSetLaboratory || onRenameLecture) && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
                      e.preventDefault()
                      const rect = e.currentTarget.getBoundingClientRect()
                      openLectureMenu(lecture, e.currentTarget, rect.left + 24, rect.bottom)
                    } else handleRowKeyDown(e, lecture.id)
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Apri lezione ${mainHeading}`}
                >
                  <div className="row-left">
                    <div className={`lecture-row-icon${selectedCourse === 'tutti' ? ' has-course-color' : ''}`}
                      style={selectedCourse === 'tutti' ? { '--course-color': courseColor(lecture.courseCode, courses) } as React.CSSProperties : undefined}>
                      {lecture.markdownFileName
                        ? '📝'
                        : lecture.status === 'transcript-available'
                          ? '📄'
                          : '🎵'}
                    </div>
                    <div className="lecture-row-info">
                      {/* Primary descriptive topic title */}
                      <div className="lecture-row-heading">
                        <h3 className="lecture-row-title" title={mainHeading}>{mainHeading}</h3>
                        {lecture.isLaboratory && <strong className="lecture-laboratory-label"> - Laboratorio</strong>}
                      </div>
                      <div className="lecture-row-meta">
                        {lecture.courseCode && (
                          <span
                            className="lecture-row-course-tag"
                            title={formatCourseDisplayName(lecture.courseCode, courses)}
                          >
                            {lecture.courseCode}
                          </span>
                        )}
                        <span className="lecture-row-recorded-at">
                          {readableDate(lecture.recordedAt)}
                        </span>
                        {lecture.byteSize && formatFileSize ? (
                          <span className="lecture-row-size">
                            • {formatFileSize(lecture.byteSize)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="row-right">
                    {/* Pipeline & study status badges with tooltips */}
                    <span
                      className={`pipeline-badge ${pipeline.cls}`}
                      title={pipeline.tooltip}
                    >
                      {pipeline.text}
                    </span>
                    <span
                      className={`study-status-dot ${badge.cls}`}
                      title={`Stato di studio: ${badge.label}`}
                      aria-label={`Stato: ${badge.label}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        {lecture.studyStatus === 'in-corso' && (
                          <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" />
                        )}
                        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" />
                        {lecture.studyStatus === 'completata' && (
                          <path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                      </svg>
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      {editingTitle && onRenameLecture && createPortal(<LectureTitleEditor key={editingTitle.lecture.id} lecture={editingTitle.lecture}
        onSave={onRenameLecture} onClose={() => { const trigger = editingTitle.trigger; setEditingTitle(null); trigger.focus() }} />, document.body)}
      {lectureMenu && createPortal(
        <div className="course-context-menu lecture-context-menu" ref={menuRef}
          role="menu" aria-label="Opzioni lezione"
          style={{ left: lectureMenu.x, top: lectureMenu.y }}>
          {onRenameLecture && <button type="button" role="menuitem" onClick={() => {
            const { lecture, trigger } = lectureMenu; setLectureMenu(null); setEditingTitle({ lecture, trigger })
          }}>Rinomina titoli… <small>F2</small></button>}
          {onSetLaboratory && <button type="button" role="menuitemcheckbox"
            aria-checked={Boolean(lectureMenu.lecture.isLaboratory)}
            onClick={async () => {
              const { lecture, trigger } = lectureMenu
              setLectureMenu(null)
              trigger.focus()
              setSavingLaboratory(true)
              try {
                await onSetLaboratory?.(lecture.id, !lecture.isLaboratory)
              } finally {
                setSavingLaboratory(false)
              }
            }}>
            <span aria-hidden="true">{lectureMenu.lecture.isLaboratory ? '✓' : '□'}</span> Laboratorio
          </button>}
        </div>, document.body
      )}
    </section>
  )
}
