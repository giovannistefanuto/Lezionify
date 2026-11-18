import { useEffect, useState } from 'react'
import type { ExamReminderNotice } from '../../shared/examReminders'
import './examReminders.css'

export function ExamReminders({ onOpenCourses, refreshKey }: { onOpenCourses: () => void; refreshKey?: number }) {
  const [notices, setNotices] = useState<ExamReminderNotice[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!window.archive?.getExamReminders) return
    let active = true, running = false
    const refresh = async () => {
      if (running) return
      running = true
      try { const values = await window.archive.getExamReminders(); if (active) { setNotices(values); setError(false) } }
      catch { if (active) setError(true) }
      finally { running = false }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [refreshKey])
  const notice = [...notices].sort((a, b) => a.examDate.localeCompare(b.examDate))[0]
  if (!notice) return error ? <p className="exam-reminder-error" role="status">Promemoria esami temporaneamente non disponibili. Nuovo controllo automatico fra un minuto.</p> : null
  const dismiss = async () => {
    try { await window.archive.dismissExamReminder(notice.id); setNotices(current => current.filter(value => value.id !== notice.id)); setError(false) }
    catch { setError(true) }
  }
  return <aside className="exam-reminder-banner" aria-label="Promemoria esame" role="status">
    <div><strong>{notice.title}</strong><p>{notice.message}</p>{notices.length > 1 && <small>Altri {notices.length - 1} promemoria da leggere</small>}{error && <small>Salvataggio non riuscito. Il promemoria è conservato.</small>}</div>
    <div className="exam-reminder-actions"><button type="button" onClick={onOpenCourses}>Impostazioni esami</button><button type="button" onClick={() => void dismiss()}>Ho letto</button></div>
  </aside>
}
