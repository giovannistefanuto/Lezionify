import { useCallback, useEffect, useRef, type Dispatch, type RefObject, type SetStateAction, type WheelEvent } from 'react'

interface KeyboardLockApi {
  lock?: (keys: string[]) => Promise<void>
  unlock?: () => void
}

interface NavigatorWithKeyboard extends Navigator {
  keyboard?: KeyboardLockApi
}

interface FocusModeControllerOptions {
  isFullScreen: boolean
  setIsFullScreen: Dispatch<SetStateAction<boolean>>
  pauseTimerActive: boolean
  showFocusLock: boolean
  onClose: () => void
  requestExitFocus: (onExitConfirmed: () => void) => void
  exitFromPause: () => void
  resumeFromPause: () => void
  handleContinueFocus: () => void
  contentRef: RefObject<HTMLDivElement | null>
  zoomLabelRef: RefObject<HTMLSpanElement | null>
  zoomLevelRef: RefObject<number>
}

function keyboardApi(): KeyboardLockApi | undefined {
  return (navigator as NavigatorWithKeyboard).keyboard
}

export function useFocusModeController({
  isFullScreen,
  setIsFullScreen,
  pauseTimerActive,
  showFocusLock,
  onClose,
  requestExitFocus,
  exitFromPause,
  resumeFromPause,
  handleContinueFocus,
  contentRef,
  zoomLabelRef,
  zoomLevelRef
}: FocusModeControllerOptions) {
  const intentionalFullscreenExitRef = useRef(false)

  const leaveFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return
    intentionalFullscreenExitRef.current = true
    try {
      await document.exitFullscreen()
    } finally {
      intentionalFullscreenExitRef.current = false
    }
  }, [])

  const exitFocusMode = useCallback(() => {
    requestExitFocus(async () => {
      try {
        keyboardApi()?.unlock?.()
        await leaveFullscreen()
      } catch (error) {
        console.error(error)
      }
      setIsFullScreen(false)
    })
  }, [leaveFullscreen, requestExitFocus, setIsFullScreen])

  const handleQuitFromPause = useCallback(async () => {
    exitFromPause()
    try {
      keyboardApi()?.unlock?.()
      await leaveFullscreen()
    } catch (error) {
      console.error(error)
    }
    setIsFullScreen(false)
  }, [exitFromPause, leaveFullscreen, setIsFullScreen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (pauseTimerActive) {
        resumeFromPause()
      } else if (showFocusLock) {
        handleContinueFocus()
      } else if (!isFullScreen) {
        onClose()
      } else {
        exitFocusMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [
    exitFocusMode,
    handleContinueFocus,
    isFullScreen,
    onClose,
    pauseTimerActive,
    resumeFromPause,
    showFocusLock
  ])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (intentionalFullscreenExitRef.current) return
      if (!document.fullscreenElement && isFullScreen) exitFocusMode()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [exitFocusMode, isFullScreen])

  useEffect(
    () => () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      keyboardApi()?.unlock?.()
    },
    []
  )

  const enterFocusMode = useCallback(async () => {
    zoomLevelRef.current = 1
    if (contentRef.current) contentRef.current.style.zoom = '1'
    if (zoomLabelRef.current) zoomLabelRef.current.innerText = '100%'

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      }
      setIsFullScreen(true)
    } catch (error) {
      setIsFullScreen(false)
      console.warn('Fullscreen API:', error)
      return
    }

    try {
      await keyboardApi()?.lock?.(['Escape'])
    } catch (error) {
      console.warn('Keyboard lock API:', error)
    }
  }, [contentRef, setIsFullScreen, zoomLabelRef, zoomLevelRef])

  const handlePinchZoom = useCallback(
    (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      const nextZoom = Math.min(
        Math.max(zoomLevelRef.current - event.deltaY * 0.005, 0.5),
        4
      )
      zoomLevelRef.current = nextZoom
      if (contentRef.current) contentRef.current.style.zoom = String(nextZoom)
      if (zoomLabelRef.current) {
        zoomLabelRef.current.innerText = `${Math.round(nextZoom * 100)}%`
      }
    },
    [contentRef, zoomLabelRef, zoomLevelRef]
  )

  return { enterFocusMode, exitFocusMode, handlePinchZoom, handleQuitFromPause }
}
