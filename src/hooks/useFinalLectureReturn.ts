import { useEffect, useRef, useState } from 'react'
import type { Lecture, StudyStatus } from '../../shared/archive'

export function useFinalLectureReturn({ lecture, lectures, saveStatus, onReturn }: {
  lecture: Lecture | null
  lectures: Lecture[]
  saveStatus: (status: StudyStatus) => Promise<boolean>
  onReturn: () => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const current = useRef({ lecture, lectures, saveStatus, onReturn })
  current.current = { lecture, lectures, saveStatus, onReturn }
  const revision = useRef({ value: 0 })
  const saving = useRef(false)
  const lastLecture = Boolean(lecture?.courseCode) && !lectures.some(item =>
    item.id !== lecture?.id && item.courseCode === lecture?.courseCode && item.studyStatus !== 'completata')
  const isReturning = Boolean(pendingId && pendingId === lecture?.id && lecture.studyStatus === 'completata' && lastLecture)

  useEffect(() => {
    if (pendingId && !isReturning) setPendingId(null)
  }, [pendingId, isReturning])

  useEffect(() => {
    const lifecycle = revision.current
    lifecycle.value++
    saving.current = false
    setPendingId(null)
    return () => { lifecycle.value++ }
  }, [lecture?.id])

  useEffect(() => {
    if (!isReturning) return
    const timer = window.setTimeout(() => {
      setPendingId(null)
      current.current.onReturn()
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [isReturning])

  const changeStatus = async (status: StudyStatus): Promise<boolean> => {
    if (!current.current.lecture || saving.current) return false
    const id = current.current.lecture.id
    const wasCompleted = current.current.lecture.studyStatus === 'completata'
    const version = revision.current.value
    saving.current = true
    setPendingId(null)
    try {
      const saved = await current.current.saveStatus(status)
      if (!saved || version !== revision.current.value || current.current.lecture?.id !== id) return false
      const latest = current.current
      const noRemaining = Boolean(latest.lecture?.courseCode) && !latest.lectures.some(item =>
        item.id !== id && item.courseCode === latest.lecture?.courseCode && item.studyStatus !== 'completata')
      if (status === 'completata' && !wasCompleted && noRemaining) setPendingId(id)
      return true
    } finally {
      if (version === revision.current.value) saving.current = false
    }
  }
  return { changeStatus, isReturning }
}
