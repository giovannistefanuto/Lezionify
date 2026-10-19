import { useEffect, useState, useRef } from 'react'

interface PauseTimerOverlayProps {
  show: boolean
  minutes: number
  onReturnToStudy: () => void
  onQuit: () => void
}

function formatMinutesAndSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

export function PauseTimerOverlay({
  show,
  minutes,
  onReturnToStudy,
  onQuit
}: PauseTimerOverlayProps) {
  const totalSeconds = Math.max(1, minutes * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds)
  const returnBtnRef = useRef<HTMLButtonElement | null>(null)
  const endTimeRef = useRef(0)

  // Reset del timer quando la modale si apre o cambiano i minuti
  useEffect(() => {
    if (show) {
      endTimeRef.current = Date.now() + totalSeconds * 1000
      setRemainingSeconds(totalSeconds)
      const focusTimer = setTimeout(() => {
        if (!document.querySelector('[data-dictionary-overlay]')) returnBtnRef.current?.focus()
      }, 50)
      return () => clearTimeout(focusTimer)
    }
  }, [show, totalSeconds])

  // Countdown timer
  useEffect(() => {
    if (!show) return

    const updateRemaining = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      )
    }
    const interval = setInterval(updateRemaining, 1000)
    document.addEventListener('visibilitychange', updateRemaining)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', updateRemaining)
    }
  }, [show])

  // Gestione tasto Escape: durante la pausa premere Esc torna a studiare
  useEffect(() => {
    if (!show) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.querySelector('[data-dictionary-overlay]')) return
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        onReturnToStudy()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [show, onReturnToStudy])

  if (!show) return null

  const isExpired = remainingSeconds <= 0
  const radius = 86
  const circumference = 2 * Math.PI * radius
  const progressRatio = remainingSeconds / totalSeconds
  const strokeDashoffset = circumference * (1 - progressRatio)

  return (
    <div className="pause-timer-overlay" role="dialog" aria-modal="true">
      <div className="pause-timer-card">
        <div className="pause-timer-badge">☕ PAUSA STUDIO</div>

        <h2 className="pause-timer-title">
          {isExpired ? 'Pausa terminata' : `Pausa programmata (${minutes} min)`}
        </h2>

        <p className="pause-timer-subtext">
          {isExpired
            ? 'La pausa prevista è terminata. Il tempo di studio resta fermo finché scegli di riprendere, anche se resti lontano più a lungo.'
            : 'Prenditi il tempo per riposare. Il tempo di studio resta fermo per tutta la pausa, anche dopo la scadenza.'}
        </p>

        {/* Cerchio SVG countdown pomodoro-style */}
        <div className="pause-timer-clock-wrapper">
          <svg className="pause-timer-radial-svg" width="210" height="210" viewBox="0 0 210 210">
            {/* Traccia di sfondo */}
            <circle
              className="pause-radial-bg"
              cx="105"
              cy="105"
              r={radius}
              strokeWidth="8"
            />
            {/* Anello di progresso animato */}
            <circle
              className="pause-radial-progress"
              cx="105"
              cy="105"
              r={radius}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 105 105)"
            />
          </svg>

          <div className="pause-timer-clock-content">
            {isExpired ? (
              <>
                <span className="pause-timer-bell-icon">🔔</span>
                <span className="pause-timer-expired-label">00:00</span>
              </>
            ) : (
              <>
                <span className="pause-timer-digits">
                  {formatMinutesAndSeconds(remainingSeconds)}
                </span>
                <span className="pause-timer-remaining-label">rimasti</span>
              </>
            )}
          </div>
        </div>

        <div className="pause-timer-actions">
          <div className={isExpired ? 'pause-timer-expired-actions' : undefined}>
            <button
              ref={returnBtnRef}
              className="pause-timer-resume-btn"
              onClick={onReturnToStudy}
              autoFocus
            >
              {isExpired ? '🟢 Sì, torniamo a studiare (Esc)' : '🟢 Torna a studiare adesso (Esc)'}
            </button>
            {isExpired && (
              <button
                className="pause-timer-quit-btn"
                onClick={onQuit}
              >
                🛑 No, ho finito per oggi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
