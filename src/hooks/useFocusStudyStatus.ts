import { useEffect, useRef } from 'react'
import type { StudyStatus } from '../../shared/archive'

interface FocusStudyStatusOptions {
  lectureId: string | null
  studyStatus: StudyStatus | undefined
  isFocusMode: boolean
  onStudyStatusChange: (status: StudyStatus) => void
}

export function useFocusStudyStatus({
  lectureId,
  studyStatus,
  isFocusMode,
  onStudyStatusChange
}: FocusStudyStatusOptions): void {
  const changeStatusRef = useRef(onStudyStatusChange)
  useEffect(() => {
    changeStatusRef.current = onStudyStatusChange
  }, [onStudyStatusChange])

  useEffect(() => {
    if (!isFocusMode || !lectureId || studyStatus !== 'da-studiare') return

    // Continuous time in the focus screen, independent of the activity timer.
    const timer = window.setTimeout(() => {
      changeStatusRef.current('in-corso')
    }, 15 * 60 * 1000 + 1)
    return () => window.clearTimeout(timer)
  }, [isFocusMode, lectureId, studyStatus])
}
