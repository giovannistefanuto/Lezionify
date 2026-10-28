import { useEffect, useState, useRef } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'

function formatStudyTime(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60)
  if (minutes === 0) return 'Meno di 1 min'
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}

interface FocusLockModalProps {
  inactivity?: boolean
  onStudyWithoutInput?: () => void
  show: boolean
  courseCode: string | null
  sessionSeconds: number
  lectureTotalSeconds: number | null
  onContinue: () => void
  onQuit: () => void
  onPause?: (minutes: number) => void
}

export function FocusLockModal({
  inactivity = false,
  onStudyWithoutInput,
  show,
  courseCode,
  sessionSeconds,
  lectureTotalSeconds,
  onContinue,
  onQuit,
  onPause
}: FocusLockModalProps) {
  const dialog = useRef<HTMLDivElement>(null)
  useModalFocus(dialog, show)
  const [countdown, setCountdown] = useState(15)
  const continueBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (show) {
      setCountdown(15)
      // Autofocus sul tasto Continua a studiare
      const focusTimer = setTimeout(() => {
        if (!document.querySelector('[data-dictionary-overlay]')) continueBtnRef.current?.focus()
      }, 50)

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const handleEscapeDuringLock = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (document.querySelector('[data-dictionary-overlay]')) return
          e.preventDefault()
          e.stopPropagation()
          // Premere ESC durante il countdown ti riporta allo studio
          onContinue()
        }
      }

      window.addEventListener('keydown', handleEscapeDuringLock, { capture: true })

      return () => {
        clearTimeout(focusTimer)
        clearInterval(timer)
        window.removeEventListener('keydown', handleEscapeDuringLock, { capture: true })
      }
    }
    return undefined
  }, [show, onContinue])

  if (!show) return null

  // Calcolo SVG per anello circolare antiorario
  const radius = 22
  const circumference = 2 * Math.PI * radius
  // Svuotamento in senso antiorario a partire da 15s fino a 0s
  const strokeDashoffset = circumference * (1 - countdown / 15)
  const isUnlocked = countdown === 0

  return (
    <div ref={dialog} tabIndex={-1} className="focus-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="focus-lock-title">
      <div className="focus-lock-card">
        <div className="focus-lock-badge-row">
          <div className="focus-lock-badge">🛡️ FOCUS LOCK</div>
          <div className="focus-lock-timer-paused-pill">⏸️ Timer di studio fermo</div>
        </div>
        
        <h2 id="focus-lock-title" className="focus-lock-title">{inactivity ? 'Stai ancora studiando?' : 'Sessione di Studio in Corso'}</h2>
        
        <p className="focus-lock-status">
          Stai studiando questa lezione
          {courseCode ? (
            <> su <span className="focus-lock-course">{courseCode}</span></>
          ) : null}.
        </p>

        <div className="focus-lock-study-times">
          <div><span>Totale della lezione</span><strong>{lectureTotalSeconds === null ? 'Non disponibile' : formatStudyTime(lectureTotalSeconds)}</strong></div>
          <div><span>Sessione attuale</span><strong>{formatStudyTime(sessionSeconds)}</strong></div>
        </div>

        <p className="focus-lock-subtext">
          Prenditi 15 secondi per respirare e decidere se fermarti davvero, fare una pausa o continuare il ritmo (il timer è fermo e questo tempo non viene conteggiato come studio).
        </p>

        <div className="focus-lock-actions">
          {inactivity && onStudyWithoutInput && <button type="button" onClick={onStudyWithoutInput}>Studio senza interagire per 30 minuti</button>}
          <button
            ref={continueBtnRef}
            className="focus-lock-continue-btn"
            onClick={onContinue}
          >
            🟢 Continua a Studiare (Esc)
          </button>

          {onPause && (
            <div className="focus-lock-pause-section">
              <span className="focus-lock-pause-title">Oppure prenditi una pausa immediata:</span>
              <div className="focus-lock-pause-presets">
                <button
                  type="button"
                  className="focus-lock-preset-btn"
                  onClick={() => onPause(5)}
                >
                  ☕ 5 min
                </button>
                <button
                  type="button"
                  className="focus-lock-preset-btn"
                  onClick={() => onPause(15)}
                >
                  🧘 15 min
                </button>
                <button
                  type="button"
                  className="focus-lock-preset-btn"
                  onClick={() => onPause(30)}
                >
                  🥪 30 min
                </button>
              </div>
            </div>
          )}

          {!isUnlocked ? (
            <button
              className="focus-lock-quit-btn locked"
              disabled
            >
              <div className="focus-lock-timer-container">
                <svg className="focus-lock-radial-clock" width="56" height="56" viewBox="0 0 56 56">
                  {/* Traccia di sfondo */}
                  <circle
                    className="radial-bg"
                    cx="28"
                    cy="28"
                    r={radius}
                    strokeWidth="4"
                  />
                  {/* Anello di progresso antiorario */}
                  <circle
                    className="radial-progress"
                    cx="28"
                    cy="28"
                    r={radius}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 28 28) scale(1, -1) translate(0, -56)"
                  />
                </svg>
                <span className="focus-lock-countdown-num">{countdown}s</span>
                <span className="focus-lock-wait-label">Attendi per sbloccare l'uscita</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="focus-lock-quit-btn unlocked"
              onClick={onQuit}
            >
              <span className="focus-lock-quit-label">🛑 Termina Sessione ed Esci</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
