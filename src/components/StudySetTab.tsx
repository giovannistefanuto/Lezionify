import React, { useState } from 'react'
import type { LectureStudySet } from '../../shared/archive'

const StudyQuizView = React.lazy(() =>
  import('./StudyQuizView').then((module) => ({
    default: module.StudyQuizView
  }))
)
const StudyFlashcardView = React.lazy(() =>
  import('./StudyFlashcardView').then((module) => ({
    default: module.StudyFlashcardView
  }))
)

interface StudySetTabProps {
  studySet: LectureStudySet | null
  isLoading: boolean
  isGenerating: boolean
  generationError: string | null
  onGenerateStudySet: () => void
  onOpenSettings: () => void
  hasTranscriptOrMarkdown: boolean
  settingsModel: string
}

export function StudySetTab({
  studySet,
  isLoading,
  isGenerating,
  generationError,
  onGenerateStudySet,
  onOpenSettings,
  hasTranscriptOrMarkdown,
  settingsModel
}: StudySetTabProps) {
  const [subTab, setSubTab] = useState<'quiz' | 'flashcards'>('quiz')

  if (isLoading) {
    return <p className="loading">Caricamento quiz e flashcard…</p>
  }

  return (
    <div className="tab-pane study-tab-pane">
      <div className="detail-card study-card">
        <div className="card-header">
          <div className="study-subnav">
            <button
              className={`study-subnav-btn ${subTab === 'quiz' ? 'is-active' : ''}`}
              onClick={() => setSubTab('quiz')}
            >
              🎯 Quiz d'Esame {studySet && `(${studySet.questions.length})`}
            </button>
            <button
              className={`study-subnav-btn ${subTab === 'flashcards' ? 'is-active' : ''}`}
              onClick={() => setSubTab('flashcards')}
            >
              🃏 Flashcard {studySet && `(${studySet.flashcards.length})`}
            </button>
          </div>

          <div className="card-actions">
            {hasTranscriptOrMarkdown && studySet && (
              <button
                className="secondary-button small"
                onClick={onGenerateStudySet}
                disabled={isGenerating}
                title="Genera nuove domande e flashcard con Gemini"
              >
                ⚡ {isGenerating ? 'Generazione…' : 'Rigenera con AI'}
              </button>
            )}
          </div>
        </div>

        {/* Generation Spinner */}
        {isGenerating && (
          <div className="ai-generating-box" style={{ margin: '16px 0' }}>
            <div className="ai-pulse-spinner" />
            <div className="ai-generating-text">
              <h4>⚡ Estrazione Quiz & Flashcard con Gemini ({settingsModel})...</h4>
              <p>
                L'AI sta analizzando i concetti e le formule della lezione per creare domande
                d'esame a risposta multipla con spiegazioni didattiche e schede di ripasso rapido.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {generationError && (
          <div className="ai-error-box" style={{ margin: '16px 0' }}>
            <strong>Errore durante la generazione dello studio set:</strong>
            <p>{generationError}</p>
            <div className="error-actions">
              <button className="primary-button small" onClick={onGenerateStudySet}>
                Riprova
              </button>
              <button className="secondary-button small" onClick={onOpenSettings}>
                Verifica Impostazioni API
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isGenerating &&
          (studySet ? (
            <div className="study-content-body">
              <React.Suspense
                fallback={<p className="loading">Caricamento esercizi…</p>}
              >
                {subTab === 'quiz' ? (
                  <StudyQuizView questions={studySet.questions} />
                ) : (
                  <StudyFlashcardView flashcards={studySet.flashcards} />
                )}
              </React.Suspense>
            </div>
          ) : (
            <div className="ai-cta-card">
              <div className="ai-cta-icon">🎯</div>
              <h4>Autovalutazione e Studio Attivo</h4>
              <p>
                Genera automaticamente 5 domande d'esame a risposta multipla e flashcard concettuali
                formattate in LaTeX per testare la tua preparazione su questa lezione.
              </p>
              {hasTranscriptOrMarkdown ? (
                <div className="ai-cta-buttons">
                  <button
                    className="primary-button large ai-main-btn"
                    onClick={onGenerateStudySet}
                  >
                    ⚡ Genera Quiz & Flashcard con Gemini AI
                  </button>
                </div>
              ) : (
                <p className="help-text">
                  Per generare i quiz è necessario prima associare una trascrizione o creare la
                  dispensa didattica.
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
