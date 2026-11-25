import { useEffect, useState } from 'react'
import type { Lecture } from '../../shared/archive'

export function studyDurationLabel(seconds: number): string {
  if (seconds <= 0) return 'Nessun tempo registrato'
  if (seconds < 60) return 'Meno di un minuto'
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  const label = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return [hours ? label(hours, 'ora', 'ore') : '', remainder ? label(remainder, 'minuto', 'minuti') : ''].filter(Boolean).join(' e ')
}

export function LectureStudyTime({ lecture, visible }: { lecture: Lecture; visible: boolean }) {
  const [result, setResult] = useState<{ id: string; seconds: number } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setResult(null)
    setFailed(false)
    // A fresh ID excludes no stored session: this is a read of the full credited total.
    void Promise.resolve().then(() => window.archive.getLectureStudySeconds(lecture.id, crypto.randomUUID())).then(seconds => {
      if (!cancelled) setResult({ id: lecture.id, seconds })
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [lecture.id, lecture.studyStatus, visible])
  return <section className="lecture-study-time" aria-label="Tempo di studio della lezione">
    <span>{lecture.studyStatus === 'completata' ? 'Completata in' : 'Tempo di studio'}</span>
    <strong>{failed ? 'Tempo non disponibile' : result?.id === lecture.id ? studyDurationLabel(result.seconds) : 'Caricamento…'}</strong>
  </section>
}
