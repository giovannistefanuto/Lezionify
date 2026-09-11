import { useCallback, useEffect, useRef, useState } from 'react'
import type { Reminder } from '../../shared/archive'

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [error, setError] = useState<string | null>(null)
  const remindersRef = useRef<Reminder[]>([])

  useEffect(() => {
    let cancelled = false
    void window.archive
      .getReminders()
      .then((saved) => {
        if (cancelled) return
        remindersRef.current = saved
        setReminders(saved)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare i promemoria.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateReminders = useCallback(
    (transform: (current: Reminder[]) => Reminder[]) => {
      const next = transform(remindersRef.current)
      remindersRef.current = next
      setReminders(next)
      setError(null)
      void window.archive.saveReminders(next).catch(() => {
        setError('Impossibile salvare i promemoria.')
      })
      return next
    },
    []
  )

  return { reminders, error, updateReminders }
}
