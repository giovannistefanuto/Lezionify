import React, { useState } from 'react'
import type { QuizQuestion } from '../../shared/archive'
import { MarkdownViewer } from './MarkdownViewer'

interface StudyQuizViewProps {
  questions: QuizQuestion[]
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

interface QuizQuestionCardProps {
  question: QuizQuestion
  qIndex: number
  selectedIdx: number | undefined
  onSelectOption: (questionId: string, optionIdx: number) => void
}

const QuizQuestionCard = React.memo(function QuizQuestionCard({
  question: q,
  qIndex,
  selectedIdx,
  onSelectOption
}: QuizQuestionCardProps) {
  const isAnswered = selectedIdx !== undefined
  const isCorrect = isAnswered && selectedIdx === q.correctOptionIndex

  return (
    <div
      className={`quiz-card ${
        isAnswered ? (isCorrect ? 'is-correct-card' : 'is-wrong-card') : ''
      }`}
    >
      <div className="quiz-card-top">
        <span className="quiz-q-num">Domanda {qIndex + 1}</span>
        <span className="quiz-concept-pill">{q.keyConcept}</span>
      </div>

      <div className="quiz-question-text">
        <MarkdownViewer content={q.question} />
      </div>

      <div className="quiz-options-list">
        {q.options.map((opt, optIdx) => {
          const isThisSelected = selectedIdx === optIdx
          const isThisCorrectOption = optIdx === q.correctOptionIndex

          let optionClass = 'quiz-option'
          if (isAnswered) {
            if (isThisCorrectOption) {
              optionClass += ' option-correct'
            } else if (isThisSelected) {
              optionClass += ' option-wrong'
            } else {
              optionClass += ' option-dimmed'
            }
          }

          return (
            <button
              key={optIdx}
              className={optionClass}
              disabled={isAnswered}
              onClick={() => onSelectOption(q.id, optIdx)}
            >
              <span className="option-letter">{OPTION_LETTERS[optIdx]}</span>
              <div className="option-content">
                <MarkdownViewer content={opt} />
              </div>
              {isAnswered && isThisCorrectOption && (
                <span className="option-icon">✅</span>
              )}
              {isAnswered && isThisSelected && !isThisCorrectOption && (
                <span className="option-icon">❌</span>
              )}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div className={`quiz-explanation ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
          <div className="explanation-title">
            <strong>{isCorrect ? '✅ Risposta esatta!' : '❌ Risposta errata'}</strong>
          </div>
          <div className="explanation-body">
            <MarkdownViewer content={q.explanation} />
          </div>
        </div>
      )}
    </div>
  )
})

export function StudyQuizView({ questions }: StudyQuizViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})

  const totalQuestions = questions.length
  const answeredCount = Object.keys(selectedAnswers).length
  const correctCount = questions.filter(
    (q) => selectedAnswers[q.id] === q.correctOptionIndex
  ).length

  const handleSelectOption = React.useCallback((questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => {
      if (prev[questionId] !== undefined) return prev
      return {
        ...prev,
        [questionId]: optionIdx
      }
    })
  }, [])

  const handleResetQuiz = React.useCallback(() => {
    setSelectedAnswers({})
  }, [])

  return (
    <div className="study-quiz-container">
      <div className="quiz-header-bar">
        <div className="quiz-progress-info">
          <span>
            Avanzamento: <strong>{answeredCount}</strong> di {totalQuestions} domande
          </span>
          {answeredCount > 0 && (
            <span className="quiz-score-badge">
              Punteggio: {correctCount}/{answeredCount} (
              {Math.round((correctCount / answeredCount) * 100)}%)
            </span>
          )}
        </div>
        {answeredCount > 0 && (
          <button className="text-button" onClick={handleResetQuiz}>
            🔄 Ricomincia quiz
          </button>
        )}
      </div>

      <div className="quiz-questions-list">
        {questions.map((q, qIndex) => (
          <QuizQuestionCard
            key={q.id || qIndex}
            question={q}
            qIndex={qIndex}
            selectedIdx={selectedAnswers[q.id]}
            onSelectOption={handleSelectOption}
          />
        ))}
      </div>

      {answeredCount === totalQuestions && (
        <div className="quiz-summary-card">
          <div className="summary-score-header">
            <h3>🏁 Quiz Completato!</h3>
            <p>
              Hai risposto correttamente a <strong>{correctCount}</strong> su{' '}
              <strong>{totalQuestions}</strong> domande (
              {Math.round((correctCount / totalQuestions) * 100)}%).
            </p>
          </div>
          <button className="primary-button" onClick={handleResetQuiz}>
            🔄 Ripeti il Quiz
          </button>
        </div>
      )}
    </div>
  )
}
