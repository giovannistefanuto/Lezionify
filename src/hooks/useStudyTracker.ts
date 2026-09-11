import { useState, useEffect, useRef, useCallback } from 'react'
import type { StudySession, StudySessionMode } from '../../shared/archive'
import { formatLocalCalendarDate } from '../../shared/calendarDate'

interface UseStudyTrackerProps {
  activeLectureId: string | null
  courseCode: string | null
  isFocusMode: boolean
  activeTab: string
  isEnabled?: boolean
}

export function useStudyTracker({
  activeLectureId,
  courseCode,
  isFocusMode,
  activeTab,
  isEnabled = false
}: UseStudyTrackerProps) {
  const [activeSeconds, setActiveSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showFocusLock, setShowFocusLock] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [pauseTimerActive, setPauseTimerActive] = useState(false)
  const [pauseMinutes, setPauseMinutes] = useState(0)

  // Refs per evitare reset accidentali su re-render
  const isEnabledRef = useRef(isEnabled)
  const activeLectureIdRef = useRef(activeLectureId)
  const courseCodeRef = useRef(courseCode)
  const isFocusModeRef = useRef(isFocusMode)
  const activeTabRef = useRef(activeTab)
  const pauseTimerActiveRef = useRef(false)
  const showFocusLockRef = useRef(false)

  useEffect(() => {
    isEnabledRef.current = isEnabled
    activeLectureIdRef.current = activeLectureId
    courseCodeRef.current = courseCode
    isFocusModeRef.current = isFocusMode
    activeTabRef.current = activeTab
  }, [isEnabled, activeLectureId, courseCode, isFocusMode, activeTab])

  const sessionIdRef = useRef<string>(crypto.randomUUID())
  const startTimeRef = useRef<string>(new Date().toISOString())
  const sessionSecondsRef = useRef<number>(0)
  const lastTickRef = useRef<number>(Date.now())
  const lastInteractionRef = useRef<number>(Date.now())
  const isClosingRef = useRef(false)
  const pendingExitRef = useRef<(() => void) | null>(null)
  const pendingSessions = useRef(new Map<string, StudySession>())
  const flushQueue = useRef<Promise<void>>(Promise.resolve())

  // Determina la modalità di studio attuale
  const getStudyMode = useCallback((): StudySessionMode => {
    if (isFocusModeRef.current) return 'focus'
    if (activeTabRef.current === 'studyset') return 'quiz'
    if (activeTabRef.current === 'markdown') return 'reading'
    if (activeTabRef.current === 'transcript') return 'reading'
    return 'focus'
  }, [])

  // Funzione atomica di flush sessione verso il backend
  const flushCurrentSession = useCallback(async () => {
    if (sessionSecondsRef.current > 0) {
      const now = new Date()
      const session: StudySession = {
        id: sessionIdRef.current,
        lectureId: activeLectureIdRef.current,
        courseCode: courseCodeRef.current || null,
        startTime: startTimeRef.current,
        endTime: now.toISOString(),
        durationSeconds: sessionSecondsRef.current,
        mode: getStudyMode(),
        date: formatLocalCalendarDate(now)
      }
      pendingSessions.current.set(session.id, session)
    }
    flushQueue.current = flushQueue.current.then(async () => {
      while (pendingSessions.current.size > 0) {
        const [id, snapshot] = pendingSessions.current.entries().next().value!
        try {
          await window.archive.saveStudySession(snapshot)
          if (pendingSessions.current.get(id) === snapshot)
            pendingSessions.current.delete(id)
        } catch (err) {
          console.error('Errore nel salvataggio del tempo di studio:', err)
          return
        }
      }
    })
    return flushQueue.current
  }, [getStudyMode])

  // Gestione ciclo di vita sessione: attiva SOLO quando isEnabled è true
  useEffect(() => {
    if (isEnabled && activeLectureId) {
      sessionIdRef.current = crypto.randomUUID()
      startTimeRef.current = new Date().toISOString()
      sessionSecondsRef.current = 0
      setActiveSeconds(0)
      lastTickRef.current = Date.now()
      lastInteractionRef.current = Date.now()
      setIsPaused(false)
      pauseTimerActiveRef.current = false
      setPauseTimerActive(false)
      setPauseMinutes(0)
      showFocusLockRef.current = false
      setShowFocusLock(false)
    } else {
      // Quando si disattiva (es. si esce da Focus Mode), salva la sessione accumulata
      void flushCurrentSession()
      sessionSecondsRef.current = 0
      setActiveSeconds(0)
      pauseTimerActiveRef.current = false
      setPauseTimerActive(false)
      setPauseMinutes(0)
      showFocusLockRef.current = false
      setShowFocusLock(false)
    }

    return () => {
      void flushCurrentSession()
    }
  }, [isEnabled, activeLectureId, flushCurrentSession])

  // Rilevamento interazioni utente (inactivity guard: max 15 min di inattività)
  useEffect(() => {
    const handleInteraction = () => {
      // Non aggiornare o rimuovere la pausa se siamo in Focus Lock o in pausa programmata
      if (showFocusLockRef.current || pauseTimerActiveRef.current) {
        return
      }
      lastInteractionRef.current = Date.now()
      if (isPaused) setIsPaused(false)
    }

    window.addEventListener('mousemove', handleInteraction, { passive: true })
    window.addEventListener('keydown', handleInteraction, { passive: true })
    window.addEventListener('scroll', handleInteraction, { passive: true })
    window.addEventListener('click', handleInteraction, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
      window.removeEventListener('click', handleInteraction)
    }
  }, [isPaused])

  // Rilevamento visibilità finestra (pausa istantanea su minimizzazione/blur)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true)
        void flushCurrentSession()
      } else {
        lastTickRef.current = Date.now()
        lastInteractionRef.current = Date.now()
        if (!pauseTimerActiveRef.current && !showFocusLockRef.current) {
          setIsPaused(false)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [flushCurrentSession])

  // Flush alla chiusura della finestra
  useEffect(() => {
    let closing = false
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        closing ||
        (sessionSecondsRef.current === 0 && pendingSessions.current.size === 0)
      )
        return
      event.preventDefault()
      event.returnValue = ''
      isClosingRef.current = true
      void flushCurrentSession().then(() => {
        if (pendingSessions.current.size === 0) {
          closing = true
          window.close()
        } else {
          isClosingRef.current = false
        }
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [flushCurrentSession])

  // Heartbeat Timer: tick ogni 1s con Delta Checker (anti-sospensione PC)
  useEffect(() => {
    if (!isEnabled || !activeLectureId) return

    const timer = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      // Se siamo nel Focus Lock (attesa 15s / decisione) o in pausa programmata, il timer di studio rimane FERMO
      if (showFocusLockRef.current || pauseTimerActiveRef.current) {
        lastInteractionRef.current = now
        return
      }

      // Se il delta è anomalo (> 3s), il PC è andato in sospensione: congela e non contare tempo falso
      if (delta > 3000 || delta < 0) {
        setIsPaused(true)
        return
      }

      // Se non c'è interazione da oltre 15 minuti, pausa automatica
      if (now - lastInteractionRef.current > 15 * 60 * 1000) {
        setIsPaused(true)
        return
      }

      // Se la finestra è nascosta o siamo in pausa, non incrementare
      if (document.hidden || isPaused || isClosingRef.current) return

      sessionSecondsRef.current += 1
      setActiveSeconds(sessionSecondsRef.current)

      // Auto-flush periodico ogni 30 secondi
      if (sessionSecondsRef.current % 30 === 0) {
        void flushCurrentSession()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isEnabled, activeLectureId, isPaused, flushCurrentSession])

  // Richiesta di uscita da Focus Mode con Focus Lock a 15s obbligatorio
  const requestExitFocus = useCallback((onExitConfirmed: () => void) => {
    if (showFocusLockRef.current) return
    pendingExitRef.current = onExitConfirmed
    showFocusLockRef.current = true
    setShowFocusLock(true)
    setIsPaused(true)
  }, [])

  const handleContinueFocus = useCallback(() => {
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pendingExitRef.current = null
    lastInteractionRef.current = Date.now()
    lastTickRef.current = Date.now()
    pauseTimerActiveRef.current = false
    setPauseTimerActive(false)
    setPauseMinutes(0)
    setIsPaused(false)
  }, [])

  const handleConfirmExitFocus = useCallback(() => {
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pauseTimerActiveRef.current = false
    setPauseTimerActive(false)
    setPauseMinutes(0)
    void flushCurrentSession()
    if (pendingExitRef.current) {
      pendingExitRef.current()
      pendingExitRef.current = null
    }
  }, [flushCurrentSession])

  // Avvia la pausa timer volontaria (5, 15, 30 min)
  const startPauseTimer = useCallback((minutes: number) => {
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pauseTimerActiveRef.current = true
    setPauseTimerActive(true)
    setPauseMinutes(minutes)
    setIsPaused(true)
  }, [])

  // Termina la pausa timer e torna a studiare
  const resumeFromPause = useCallback(() => {
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pauseTimerActiveRef.current = false
    setPauseTimerActive(false)
    setPauseMinutes(0)
    setIsPaused(false)
    lastTickRef.current = Date.now()
    lastInteractionRef.current = Date.now()
  }, [])

  // Termina la pausa timer ed esce dal Focus Mode
  const exitFromPause = useCallback(() => {
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pauseTimerActiveRef.current = false
    setPauseTimerActive(false)
    setPauseMinutes(0)
    void flushCurrentSession()
    if (pendingExitRef.current) {
      pendingExitRef.current()
      pendingExitRef.current = null
    }
  }, [flushCurrentSession])

  const toggleZenMode = useCallback(() => {
    setIsZenMode((prev) => !prev)
  }, [])

  return {
    activeSeconds,
    isPaused,
    showFocusLock,
    isZenMode,
    toggleZenMode,
    pauseTimerActive,
    pauseMinutes,
    startPauseTimer,
    resumeFromPause,
    exitFromPause,
    requestExitFocus,
    handleContinueFocus,
    handleConfirmExitFocus,
    flushCurrentSession
  }
}
