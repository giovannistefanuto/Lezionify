import React, { useState } from 'react'
import type {
  BatchTranslationSummary,
  GenerationProgress,
  Lecture
} from '../../shared/archive'

interface BatchSelectionModalProps {
  show: boolean
  onClose: () => void
  candidateLectures: Lecture[]
  selectedBatchIds: string[]
  setSelectedBatchIds: (ids: string[]) => void
  isBatchGenerating: boolean
  generationProgress?: GenerationProgress | null
  onGenerateSelected: () => void
  candidateTranslationLectures?: Lecture[]
  selectedTranslationBatchIds?: string[]
  setSelectedTranslationBatchIds?: (ids: string[]) => void
  isBatchTranslating?: boolean
  onTranslateSelected?: () => void
  translationSummary?: BatchTranslationSummary | null
  formatDate: (date: string | null) => string
}

export function BatchSelectionModal({
  show,
  onClose,
  candidateLectures,
  selectedBatchIds,
  setSelectedBatchIds,
  isBatchGenerating,
  generationProgress,
  onGenerateSelected,
  candidateTranslationLectures = [],
  selectedTranslationBatchIds = [],
  setSelectedTranslationBatchIds,
  isBatchTranslating = false,
  onTranslateSelected,
  translationSummary = null,
  formatDate
}: BatchSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<'ita' | 'eng'>('ita')

  if (!show) return null

  const isBusy = isBatchGenerating || isBatchTranslating

  const isIta = activeTab === 'ita'
  const currentCandidates = isIta ? candidateLectures : candidateTranslationLectures
  const currentSelectedIds = isIta ? selectedBatchIds : selectedTranslationBatchIds
  const setCurrentSelectedIds = isIta
    ? setSelectedBatchIds
    : (setSelectedTranslationBatchIds ?? (() => {}))

  return (
    <div
      className="modal-backdrop"
      onClick={() => !isBusy && onClose()}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(680px, 90vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="modal-icon">{isIta ? '⚡' : '🌐'}</span>
            <h2>{isIta ? 'Genera Dispense Selezionate' : 'Traduci Dispense in Inglese'}</h2>
          </div>
          <button
            className="modal-close-btn"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              borderBottom: '1px solid #e2eae5',
              paddingBottom: 8
            }}
          >
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setActiveTab('ita')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'ita' ? '#172c23' : 'transparent',
                color: activeTab === 'ita' ? '#fff' : '#4b5563',
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer'
              }}
            >
              🇮🇹 Crea Dispense ITA ({candidateLectures.length})
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setActiveTab('eng')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'eng' ? '#172c23' : 'transparent',
                color: activeTab === 'eng' ? '#fff' : '#4b5563',
                fontWeight: 600,
                fontSize: 13,
                cursor: isBusy ? 'not-allowed' : 'pointer'
              }}
            >
              🇬🇧 Traduci in Inglese ENG ({candidateTranslationLectures.length})
            </button>
          </div>

          <p className="modal-subtitle">
            {isIta
              ? 'Seleziona le lezioni con trascrizione di cui vuoi creare la dispensa didattica approfondita con formule LaTeX:'
              : 'Seleziona le lezioni con dispensa in italiano di cui vuoi generare la traduzione identica in inglese (stessa struttura e formule):'}
          </p>

          {currentCandidates.length === 0 ? (
            <div className="empty-selection-state">
              <p>
                {isIta
                  ? 'Non ci sono nuove trascrizioni in attesa di dispensa.'
                  : 'Tutte le dispense hanno già la versione inglese, oppure non ci sono dispense ITA pronte da tradurre.'}
              </p>
            </div>
          ) : (
            <>
              <div className="selection-toolbar" style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
                <button
                  type="button"
                  className="text-btn"
                  disabled={isBusy}
                  onClick={() => setCurrentSelectedIds(currentCandidates.map((l) => l.id))}
                >
                  ✓ Seleziona tutte ({currentCandidates.length})
                </button>
                <button
                  type="button"
                  className="text-btn"
                  disabled={isBusy}
                  onClick={() => setCurrentSelectedIds([])}
                >
                  ✕ Deseleziona tutte
                </button>
              </div>

              <div className="selection-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentCandidates.map((lecture) => {
                  const isChecked = currentSelectedIds.includes(lecture.id)
                  return (
                    <label
                      key={lecture.id}
                      className={`selection-item-card ${isChecked ? 'is-checked' : ''}`}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: 12,
                        border: '1px solid #e2eae5',
                        borderRadius: 8,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        background: isChecked ? '#f4faf6' : '#fff'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isBusy}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCurrentSelectedIds([...currentSelectedIds, lecture.id])
                          } else {
                            setCurrentSelectedIds(currentSelectedIds.filter((id) => id !== lecture.id))
                          }
                        }}
                      />
                      <div className="selection-item-info">
                        <div className="selection-item-top" style={{ fontSize: 12, color: '#697a73', marginBottom: 4 }}>
                          <span
                            className={`course-tag small ${
                              !lecture.courseCode ? 'is-unassigned' : ''
                            }`}
                          >
                            {lecture.courseCode ?? 'CORSO DA ASSEGNARE'}
                          </span>
                          <span className="selection-item-date" style={{ marginLeft: 8 }}>
                            {formatDate(lecture.recordedAt)}
                          </span>
                        </div>
                        <span className="selection-item-title" style={{ fontSize: 14, fontWeight: 500, color: '#172c23' }}>
                          {lecture.title || lecture.sourceAudioFileName}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {isBatchGenerating && isIta && (
            <div className="batch-progress-box" style={{ marginTop: 24, padding: 16, background: '#f0f7f3', borderRadius: 8, border: '1px solid #bfe0cf', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="batch-spinner" />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 14, color: '#19523c', marginBottom: 4 }}>
                  Generazione in corso (Globale: elaborazione in background...)
                </strong>
                <span style={{ fontSize: 13, color: '#2d8c63' }}>
                  {generationProgress?.message ??
                    'Preparazione della pipeline multi-stadio e formule LaTeX...'}
                </span>
              </div>
            </div>
          )}

          {isBatchTranslating && !isIta && (
            <div className="batch-progress-box" style={{ marginTop: 24, padding: 16, background: '#f0f7f3', borderRadius: 8, border: '1px solid #bfe0cf', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="batch-spinner" />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 14, color: '#19523c', marginBottom: 4 }}>
                  Traduzione in inglese in corso...
                </strong>
                <span style={{ fontSize: 13, color: '#2d8c63' }}>
                  {generationProgress?.message ??
                    'Traduzione accademica Gemini in corso, mantenimento formule e tag...'}
                </span>
              </div>
            </div>
          )}

          {!isBatchTranslating && !isIta && translationSummary && (
            <div
              role="status"
              className={`batch-translation-summary ${
                translationSummary.failed > 0 ? 'has-failures' : 'is-success'
              }`}
              style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 8,
                border: `1px solid ${
                  translationSummary.failed > 0 ? '#f2b8b5' : '#bfe0cf'
                }`,
                background:
                  translationSummary.failed > 0 ? '#fff7f6' : '#f0f7f3'
              }}
            >
              <strong>
                Traduzione completata: {translationSummary.succeeded} riuscite,{' '}
                {translationSummary.failed} fallite.
              </strong>
              {translationSummary.failed > 0 && (
                <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                  {translationSummary.results
                    .filter((result) => !result.success)
                    .map((result) => {
                      const lecture = candidateTranslationLectures.find(
                        (candidate) => candidate.id === result.id
                      )
                      return (
                        <li key={result.id} style={{ marginTop: 6 }}>
                          <strong>
                            {result.courseCode ?? 'CORSO'} —{' '}
                            {result.title ?? lecture?.title ?? result.id}
                          </strong>
                          <br />
                          {result.error ?? 'Errore sconosciuto durante la traduzione.'}
                        </li>
                      )
                    })}
                </ul>
              )}
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            {isIta ? (
              <button
                className="primary-button"
                disabled={selectedBatchIds.length === 0 || isBusy}
                onClick={onGenerateSelected}
              >
                {isBatchGenerating
                  ? '⚡ Generazione avviata…'
                  : `🚀 Genera ${selectedBatchIds.length} ${
                      selectedBatchIds.length === 1 ? 'Dispensa' : 'Dispense'
                    }`}
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={selectedTranslationBatchIds.length === 0 || isBusy || !onTranslateSelected}
                onClick={onTranslateSelected}
              >
                {isBatchTranslating
                  ? '🌐 Traduzione avviata…'
                  : `🌐 Traduci ${selectedTranslationBatchIds.length} ${
                      selectedTranslationBatchIds.length === 1 ? 'Dispensa' : 'Dispense'
                    }`}
              </button>
            )}
            <button
              className="secondary-button"
              disabled={false}
              onClick={onClose}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
