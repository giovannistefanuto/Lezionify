import React, { useState, useEffect, useCallback } from 'react'
import type { Flashcard } from '../../shared/archive'
import { MarkdownViewer } from './MarkdownViewer'

interface StudyFlashcardViewProps {
  flashcards: Flashcard[]
}

export function StudyFlashcardView({ flashcards }: StudyFlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set())
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set())

  const total = flashcards.length
  const currentCard = flashcards[currentIndex]

  const handleNext = useCallback(() => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const handlePrev = useCallback(() => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleMarkMastered = (cardId: string) => {
    setMasteredIds((prev) => new Set(prev).add(cardId))
    setReviewIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    handleNext()
  }

  const handleMarkReview = (cardId: string) => {
    setReviewIds((prev) => new Set(prev).add(cardId))
    setMasteredIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    handleNext()
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't flip if typing in an input (though there are none here, good practice)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleFlip()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleFlip, handleNext, handlePrev])

  if (!currentCard) {
    return <p>Nessuna flashcard disponibile.</p>
  }

  const isMastered = masteredIds.has(currentCard.id)
  const isReview = reviewIds.has(currentCard.id)

  return (
    <div className="flashcards-container">
      <div className="flashcards-header-bar">
        <div className="flashcards-stats">
          <span>
            Scheda <strong>{currentIndex + 1}</strong> di {total}
          </span>
          <div className="flashcards-pills">
            <span className="mastered-pill">🟢 {masteredIds.size} apprese</span>
            <span className="review-pill">🔴 {reviewIds.size} da rivedere</span>
          </div>
        </div>
        <p className="flashcards-help-text">
          Premi <kbd>Spazio</kbd> per girare la scheda, <kbd>←</kbd> <kbd>→</kbd> per scorrere.
        </p>
      </div>

      <div
        className={`flashcard-scene ${isFlipped ? 'is-flipped' : ''}`}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
      >
        <div className="flashcard-inner">
          {/* FRONTE */}
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-top">
              <span className="card-side-tag">FRONTE (Domanda / Concetto)</span>
              {currentCard.category && (
                <span className="card-category-tag">{currentCard.category}</span>
              )}
            </div>
            <div className="flashcard-body">
              <MarkdownViewer content={currentCard.front} />
            </div>
            <div className="flashcard-bottom-hint">
              <span>👆 Clicca o premi Spazio per vedere la soluzione</span>
            </div>
          </div>

          {/* RETRO */}
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-top">
              <span className="card-side-tag is-solution">RETRO (Risposta & Formule)</span>
              {currentCard.category && (
                <span className="card-category-tag">{currentCard.category}</span>
              )}
            </div>
            <div className="flashcard-body">
              <MarkdownViewer content={currentCard.back} />
            </div>
            <div className="flashcard-bottom-hint">
              <span>👆 Clicca per tornare alla domanda</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flashcard-controls-row">
        <button
          className="secondary-button"
          onClick={handlePrev}
          title="Scheda precedente (Freccia Sinistra)"
        >
          ⬅ Precedente
        </button>

        <div className="flashcard-mastery-actions">
          <button
            className={`mastery-btn mark-review ${isReview ? 'is-active' : ''}`}
            onClick={() => handleMarkReview(currentCard.id)}
            title="Segna come da rivedere"
          >
            🔴 Da ripassare
          </button>
          <button
            className={`mastery-btn mark-mastered ${isMastered ? 'is-active' : ''}`}
            onClick={() => handleMarkMastered(currentCard.id)}
            title="Segna come appresa"
          >
            🟢 So già
          </button>
        </div>

        <button
          className="secondary-button"
          onClick={handleNext}
          title="Prossima scheda (Freccia Destra)"
        >
          Successiva ➡
        </button>
      </div>
    </div>
  )
}
