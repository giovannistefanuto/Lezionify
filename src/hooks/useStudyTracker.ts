import { creditFocusRagStudy } from '../utils/focusRagPreparation'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { StudySession, StudySessionMode } from '../../shared/archive'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import { inactivityProfile, saveInactivityProfile } from '../utils/studyInactivity'

interface UseStudyTrackerProps {
  activeLectureId: string | null
  courseCode: string | null
  isFocusMode: boolean
  activeTab: string
  isEnabled?: boolean
  suspended?: boolean
}

export function useStudyTracker({
  activeLectureId,
  courseCode,
  isFocusMode,
  activeTab,
  isEnabled = false,
  suspended = false
}: UseStudyTrackerProps) {
  const [activeSeconds, setActiveSeconds] = useState(0)
  const [previousStudy, setPreviousStudy] = useState<{ lectureId: string; sessionId: string; seconds: number } | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showFocusLock, setShowFocusLock] = useState(false)
  const [inactivityPrompt, setInactivityPrompt] = useState(false)
  const inactivity = useRef(inactivityProfile())
  const withoutInputUntil = useRef(0)
  useEffect(() => {
    const update = () => { inactivity.current = inactivityProfile() }
    window.addEventListener('study-inactivity-preference', update)
    return () => window.removeEventListener('study-inactivity-preference', update)
  }, [])
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
  const suspendedRef = useRef(suspended)
  suspendedRef.current = suspended
  const showFocusLockRef = useRef(false)
  const focusEnteredAt = useRef<number | null>(null)

  useEffect(() => {
    focusEnteredAt.current = isEnabled && isFocusMode ? performance.now() : null
  }, [isEnabled, isFocusMode, activeLectureId])

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
  const observedInteraction = useRef(Date.now())
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
    if (inactivity.current.observing) saveInactivityProfile(inactivity.current)
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

  useEffect(() => {
    lastTickRef.current = Date.now()
    lastInteractionRef.current = Date.now()
    observedInteraction.current = Date.now()
    if (suspended) void flushCurrentSession()
  }, [suspended, flushCurrentSession])

  // Gestione ciclo di vita sessione: attiva SOLO quando isEnabled è true
  useEffect(() => {
    if (isEnabled && activeLectureId) {
      sessionIdRef.current = crypto.randomUUID()
      startTimeRef.current = new Date().toISOString()
      sessionSecondsRef.current = 0
      setActiveSeconds(0)
      lastTickRef.current = Date.now()
      lastInteractionRef.current = Date.now()
      observedInteraction.current = Date.now()
      withoutInputUntil.current = 0
      setIsPaused(false)
      pauseTimerActiveRef.current = false
      setPauseTimerActive(false)
      setPauseMinutes(0)
      showFocusLockRef.current = false
      setShowFocusLock(false)
      setInactivityPrompt(false)
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

  // Exclude the current session: its periodic snapshots are already persisted,
  // while activeSeconds includes the whole session, including unsaved seconds.
  useEffect(() => {
    setPreviousStudy(null)
    if (!isEnabled || !activeLectureId) return
    let cancelled = false
    const sessionId = sessionIdRef.current
    void flushQueue.current.then(async () => {
      // A failed save from a previous session makes a complete total unavailable.
      if (Array.from(pendingSessions.current.values()).some(session =>
        session.lectureId === activeLectureId && session.id !== sessionId)) return
      const seconds = await window.archive.getLectureStudySeconds(activeLectureId, sessionId)
      if (!cancelled) setPreviousStudy({ lectureId: activeLectureId, sessionId, seconds })
    }).catch(() => { /* Keep unavailable distinct from zero recorded study. */ })
    return () => { cancelled = true }
  }, [isEnabled, activeLectureId, showFocusLock])

  // Rilevamento interazioni utente (inactivity guard: max 15 min di inattività)
  useEffect(() => {
    const handleInteraction = () => {
      // Non aggiornare o rimuovere la pausa se siamo in Focus Lock o in pausa programmata
      if (suspendedRef.current || showFocusLockRef.current || pauseTimerActiveRef.current || !isEnabledRef.current || document.hidden) {
        observedInteraction.current = Date.now()
        return
      }
      lastInteractionRef.current = Date.now()
      if (inactivity.current.observing && isEnabledRef.current && !isPaused && !document.hidden) {
        const gap = (Date.now() - observedInteraction.current) / 1000
        if (gap >= 5 && gap <= 3600) inactivity.current.gaps = [...inactivity.current.gaps, gap].slice(-500)
      }
      observedInteraction.current = Date.now()
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
        observedInteraction.current = Date.now()
        setIsPaused(true)
        void flushCurrentSession()
      } else {
        observedInteraction.current = Date.now()
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
      if (suspendedRef.current || showFocusLockRef.current || pauseTimerActiveRef.current) {
        lastInteractionRef.current = now
        observedInteraction.current = now
        return
      }

      // Se il delta è anomalo (> 3s), il PC è andato in sospensione: congela e non contare tempo falso
      if (delta > 3000 || delta < 0) {
        observedInteraction.current = now
        setIsPaused(true)
        return
      }

      // Se non c'è interazione da oltre 15 minuti, pausa automatica
      if (now > withoutInputUntil.current && now - lastInteractionRef.current > (inactivity.current.thresholdMinutes ?? 15) * 60 * 1000) {
        setIsPaused(true)
        if (inactivity.current.thresholdMinutes !== null) {
          setInactivityPrompt(true)
          showFocusLockRef.current = true
          setShowFocusLock(true)
          void flushCurrentSession()
        }
        return
      }

      // Se la finestra è nascosta o siamo in pausa, non incrementare
      if (document.hidden || isPaused || isClosingRef.current) return

      if (isFocusModeRef.current) creditFocusRagStudy(courseCodeRef.current)
      sessionSecondsRef.current += 1
      if (inactivity.current.observing) {
        const profile = inactivity.current
        profile.sessions[sessionIdRef.current] = (profile.sessions[sessionIdRef.current] ?? 0) + 1
        if (sessionSecondsRef.current % 30 === 0) saveInactivityProfile(profile)
      }
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
    if (focusEnteredAt.current === null || performance.now() - focusEnteredAt.current < 5 * 60_000) {
      void flushCurrentSession()
      onExitConfirmed()
      return
    }
    pendingExitRef.current = onExitConfirmed
    showFocusLockRef.current = true
    setShowFocusLock(true)
    setIsPaused(true)
  }, [flushCurrentSession])

  const handleContinueFocus = useCallback(() => {
    setInactivityPrompt(false)
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
    setInactivityPrompt(false)
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
    setInactivityPrompt(false)
    showFocusLockRef.current = false
    setShowFocusLock(false)
    pauseTimerActiveRef.current = true
    setPauseTimerActive(true)
    setPauseMinutes(minutes)
    setIsPaused(true)
  }, [])

  // Termina la pausa timer e torna a studiare
  const resumeFromPause = useCallback(() => {
    setInactivityPrompt(false)
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
    setInactivityPrompt(false)
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
    inactivityPrompt,
    studyWithoutInput: () => {
      withoutInputUntil.current = Date.now() + 30 * 60_000
      handleContinueFocus()
    },
    activeSeconds,
    lectureTotalSeconds: previousStudy?.lectureId === activeLectureId && previousStudy.sessionId === sessionIdRef.current
      ? previousStudy.seconds + activeSeconds : null,
    isPaused: isPaused || suspended,
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
