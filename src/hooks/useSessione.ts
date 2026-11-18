import { useCallback, useEffect, useRef, useState } from 'react'
import { formatLocalCalendarDate } from '../../shared/calendarDate'
import type { SessionArchive, SessionCommand } from '../../shared/sessione'

type StripRequest<T> = T extends SessionCommand ? Omit<T, 'baseRevision' | 'commandId'> : never
export type SessionAction = StripRequest<SessionCommand>

export function isSessionShortcut(event: KeyboardEvent) {
  return !event.defaultPrevented && !event.repeat && !event.isComposing &&
    event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey &&
    !event.getModifierState('AltGraph') && (event.code === 'KeyS' || event.key.toLowerCase() === 's')
}

export function useSessione() {
  const [archive, setArchive] = useState<SessionArchive>()
  const [open, setOpen] = useState(false)
  const [externalCourse, setExternalCourse] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [today, setToday] = useState(formatLocalCalendarDate)
  const request = useRef(0)
  const saving = useRef(false)

  const refresh = useCallback(async () => {
    const api = window.archive?.sessione
    if (!api || saving.current) return
    const version = ++request.current
    try {
      const next = await api.state()
      if (request.current === version) { setArchive(next); setError('') }
    } catch {
      if (request.current === version) setError('Impossibile leggere l’archivio Sessione. Riprova.')
    }
  }, [])

  useEffect(() => {
    const update = () => setToday(formatLocalCalendarDate())
    const next = new Date()
    next.setHours(24, 0, 0, 25)
    const timer = window.setTimeout(update, next.getTime() - Date.now())
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [today])
  useEffect(() => { void refresh() }, [refresh, today])

  const apply = async (action: SessionAction) => {
    const api = window.archive?.sessione
    if (!api || !archive || saving.current) return false
    request.current++
    saving.current = true
    setBusy(true)
    try {
      const result = await api.apply({ ...action, commandId: crypto.randomUUID(), baseRevision: archive.revision })
      setArchive(result.archive)
      const ok = result.status === 'saved'
      setError(ok ? '' : 'I dati sono cambiati in un’altra schermata. Controlla la versione aggiornata prima di riprovare.')
      return ok
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : ''
      setError(message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '') || 'Impossibile salvare Sessione.')
      return false
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  const show = useCallback((course?: string) => {
    if (document.querySelector('.focus-lock-overlay')) return
    setExternalCourse(course)
    setOpen(true)
    void refresh()
  }, [refresh])
  const close = useCallback(() => { setOpen(false); setExternalCourse(undefined) }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open][data-study-exclusion="sessione"]')].at(-1)
      if (event.key === 'Escape' && dialog) {
        const menu = event.target instanceof HTMLElement ? event.target.closest<HTMLDetailsElement>('.session-menu[open]') : null
        event.preventDefault()
        event.stopImmediatePropagation()
        if (menu) {
          menu.open = false
          menu.querySelector('summary')?.focus()
        } else {
          dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
        }
      } else if (isSessionShortcut(event) && !document.querySelector('.focus-lock-overlay')) {
        if (dialog && !dialog.classList.contains('session-overlay')) return
        if (!open && [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].some(element =>
          !element.closest('.quick-capture-backdrop, [data-session-compatible]'))) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (open) close()
        else show()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [close, open, show])

  return { archive, open, externalCourse, busy, error, today, show, close, refresh, apply }
}
