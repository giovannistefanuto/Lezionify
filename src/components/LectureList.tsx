import React, { useState, useCallback } from 'react'
import type { Lecture } from '../../shared/archive'

interface LectureListProps {
  selectedCourse: string
  isBatchGenerating: boolean
  isImporting: boolean
  onOpenSelectionModal: () => void
  onManualSync: () => void
  onImportFiles: () => void
  onImportFolder: () => void
  notice: string | null
  onDismissNotice: () => void
  visibleLectures: Lecture[]
  selectedLectureId: string | null
  onSelectLecture: (id: string) => void
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
  isBatchGenerating,
  isImporting,
  onOpenSelectionModal,
  onManualSync,
  onImportFiles,
  onImportFolder,
  notice,
  onDismissNotice,
  visibleLectures,
  selectedLectureId,
  onSelectLecture,
  isLoading,
  selectedStudyStatus,
  formatDate,
  formatFileSize,
  hasAnyLectures,
  hasConfiguredKey,
  onOpenSettings
}: LectureListProps) {
  // Import dropdown (C-04)
  const [showImportMenu, setShowImportMenu] = useState(false)

  // Clean up the folder name if it was split
  let displayCourseName = selectedCourse
  if (selectedCourse !== 'tutti') {
    if (selectedCourse.includes('/')) {
      const parts = selectedCourse.split('/')
      displayCourseName = parts[parts.length - 1].trim()
    } else if (selectedCourse.includes(' - ')) {
      const parts = selectedCourse.split(' - ')
      displayCourseName = parts[parts.length - 1].trim()
    } else {
      displayCourseName = selectedCourse
    }
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

  // Study status badge config with distinct accessibility shapes
  const studyBadge = (status: string) => {
    switch (status) {
      case 'completata':
        return {
          icon: '🟢',
          cls: 'badge-done',
          shapeCls: 'shape-circle',
          label: 'Completata'
        }
      case 'in-corso':
        return {
          icon: '🔘',
          cls: 'badge-inprogress',
          shapeCls: 'shape-ring',
          label: 'In corso'
        }
      default:
        return {
          icon: '🟡',
          cls: 'badge-todo',
          shapeCls: 'shape-square',
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
        text: 'Dispensa IT+EN',
        cls: 'pipeline-md',
        tooltip:
          'Dispensa didattica bilingue (Italiano + Inglese con formule LaTeX)'
      }
    if (lecture.markdownFileName)
      return {
        text: 'Dispensa IT',
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
            {visibleLectures.length} lezioni
          </span>
        </div>
        <div className="actions">
          <button
            className="secondary-button small"
            disabled={isImporting || isBatchGenerating}
            onClick={onOpenSelectionModal}
            title="Genera dispense multiple"
          >
            ⚡ Generazione Multipla
          </button>
          <button
            className="secondary-button small"
            disabled={isImporting || isBatchGenerating}
            onClick={onManualSync}
            title="Sincronizza cartelle"
            aria-label="Sincronizza cartelle"
          >
            🔄 Sync
          </button>

          {/* Import dropdown (C-04) */}
          <div
            className="import-dropdown-wrap"
            style={{ position: 'relative' }}
          >
            <button
              className="primary-button small"
              disabled={isImporting || isBatchGenerating}
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notice banner with severity styling (M-01) */}
      {notice && (
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
                  className={`lecture-row ${selectedLectureId === lecture.id ? 'is-selected' : ''}`}
                  key={lecture.id}
                  onClick={() => onSelectLecture(lecture.id)}
                  onKeyDown={(e) => handleRowKeyDown(e, lecture.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Apri lezione ${mainHeading}`}
                >
                  <div className="row-left">
                    <div className="lecture-row-icon">
                      {lecture.markdownFileName
                        ? '📝'
                        : lecture.status === 'transcript-available'
                          ? '📄'
                          : '🎵'}
                    </div>
                    <div className="lecture-row-info">
                      {/* Primary descriptive topic title */}
                      <h3 className="lecture-row-title">{mainHeading}</h3>
                      <div className="lecture-row-meta">
                        {lecture.courseCode && (
                          <span className="lecture-row-course-tag">
                            {lecture.courseCode}
                          </span>
                        )}
                        <span className="lecture-row-filename">
                          {lecture.sourceAudioFileName}
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
                      className={`study-status-dot ${badge.cls} ${badge.shapeCls}`}
                      title={`Stato di studio: ${badge.label}`}
                      aria-label={`Stato: ${badge.label}`}
                    >
                      {badge.icon}
                    </span>
                    <span className="lecture-row-date">
                      {formatDate(lecture.recordedAt)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}
