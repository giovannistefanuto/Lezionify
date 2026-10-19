import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { usePaneZoom } from './usePaneZoom'

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
  hasContent: boolean
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
  zoomLevelRef,
  hasContent
}: FocusModeControllerOptions) {
  const intentionalFullscreenExitRef = useRef(false)
  const [textZoom, setTextZoom] = useState(1)
  const changeTextZoom = useCallback((delta: number) => {
    const next = Math.min(4, Math.max(0.5, zoomLevelRef.current + delta))
    zoomLevelRef.current = next
    setTextZoom(next)
    if (zoomLabelRef.current) zoomLabelRef.current.innerText = `${Math.round(next * 100)}%`
  }, [zoomLevelRef, zoomLabelRef])
  usePaneZoom(contentRef, changeTextZoom, isFullScreen && hasContent)

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
      if (document.querySelector('[data-dictionary-overlay], .settings-modal-overlay, .music-backdrop')) return
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
    setTextZoom(1)
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
  }, [setIsFullScreen, zoomLabelRef, zoomLevelRef])

  return { enterFocusMode, exitFocusMode, changeTextZoom, textZoom, handleQuitFromPause }
}
