import * as React from 'react'
import type { Reminder, ReminderKind } from '../../shared/archive'
import {
  formatReminderDuration,
  getNearestReminder,
  getReminderRemainingSeconds,
  isReminderDue
} from '../../shared/reminders'
import { useReminders } from '../hooks/useReminders'

interface ReminderNotification {
  id: string
  title: string
  description: string
}

function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

function createAlarmDueAt(time: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  const dueAt = new Date()
  dueAt.setHours(hours, minutes, 0, 0)
  if (dueAt.getTime() <= Date.now()) dueAt.setDate(dueAt.getDate() + 1)
  return dueAt.toISOString()
}

function reminderTitle(reminder: Reminder): string {
  return (
    reminder.label.trim() || (reminder.kind === 'timer' ? 'Timer' : 'Sveglia')
  )
}

export function describeReminder(reminder: Reminder, now = Date.now()): string {
  if (reminder.status === 'active') {
    if (reminder.kind === 'timer') {
      return `Timer: ${formatReminderDuration(
        getReminderRemainingSeconds(reminder, now)
      )}`
    }
    const seconds = getReminderRemainingSeconds(reminder, now)
    const minutes = Math.ceil(seconds / 60)
    const remaining = seconds === 0 ? 'scaduta' : seconds < 60 ? 'meno di un minuto rimanente' : `${minutes} ${minutes === 1 ? 'minuto rimanente' : 'minuti rimanenti'}`
    const tomorrow = new Date(reminder.dueAt ?? now).toDateString() !== new Date(now).toDateString()
    return `Sveglia: ${new Date(reminder.dueAt ?? now).toLocaleTimeString(
      'it-IT',
      { hour: '2-digit', minute: '2-digit' }
    )}${tomorrow ? ' domani' : ''} (${remaining})`
  }
  if (reminder.status === 'paused') return 'Timer in pausa'
  if (reminder.status === 'completed') return 'Concluso'
  return 'Fermato'
}

export function FocusReminders() {
  const { reminders, error, updateReminders } = useReminders()
  const [isOpen, setIsOpen] = React.useState(false)
  const [mode, setMode] = React.useState<ReminderKind>('timer')
  const [label, setLabel] = React.useState('')
  const [hours, setHours] = React.useState('0')
  const [minutes, setMinutes] = React.useState('25')
  const [seconds, setSeconds] = React.useState('0')
  const [alarmTime, setAlarmTime] = React.useState(() =>
    toTimeInput(new Date(Date.now() + 5 * 60 * 1000))
  )
  const [formError, setFormError] = React.useState<string | null>(null)
  const [notifications, setNotifications] = React.useState<
    ReminderNotification[]
  >([])
  const [now, setNow] = React.useState(Date.now())
  const rootRef = React.useRef<HTMLDivElement>(null)

  const checkDueReminders = React.useCallback(() => {
    const currentNow = Date.now()
    setNow(currentNow)
    const due = reminders.filter((reminder) =>
      isReminderDue(reminder, currentNow)
    )
    if (due.length === 0) return

    const completedAt = new Date(currentNow).toISOString()
    setNotifications((current) => [
      ...current,
      ...due
        .filter(
          (reminder) =>
            !current.some((notification) => notification.id === reminder.id)
        )
        .map((reminder) => ({
          id: reminder.id,
          title:
            reminder.kind === 'timer' ? 'Timer concluso' : 'Sveglia arrivata',
          description: reminderTitle(reminder)
        }))
    ])
    updateReminders((current) =>
      current.map((reminder) =>
        isReminderDue(reminder, currentNow)
          ? {
              ...reminder,
              status: 'completed',
              completedAt,
              remainingSeconds: 0
            }
          : reminder
      )
    )
  }, [reminders, updateReminders])

  React.useEffect(() => {
    const interval = window.setInterval(checkDueReminders, 1000)
    const handleVisibility = () => {
      if (!document.hidden) checkDueReminders()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    checkDueReminders()
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkDueReminders])

  React.useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const nearest = getNearestReminder(reminders)
  const activeCount = reminders.filter(
    (reminder) => reminder.status === 'active' || reminder.status === 'paused'
  ).length

  const addReminder = (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const cleanLabel = label.trim().slice(0, 120)
    const createdAt = new Date().toISOString()
    const id = crypto.randomUUID()

    if (mode === 'timer') {
      const totalSeconds =
        Number(hours || 0) * 3600 +
        Number(minutes || 0) * 60 +
        Number(seconds || 0)
      if (
        !Number.isInteger(totalSeconds) ||
        totalSeconds < 1 ||
        totalSeconds > 604800
      ) {
        setFormError('Imposta una durata compresa tra 1 secondo e 7 giorni.')
        return
      }
      const reminder: Reminder = {
        id,
        kind: 'timer',
        label: cleanLabel,
        createdAt,
        status: 'active',
        dueAt: new Date(Date.now() + totalSeconds * 1000).toISOString(),
        durationSeconds: totalSeconds
      }
      updateReminders((current) => [...current, reminder])
    } else {
      const dueAt = createAlarmDueAt(alarmTime)
      if (!dueAt) {
        setFormError('Scegli un orario valido per la sveglia.')
        return
      }
      const reminder: Reminder = {
        id,
        kind: 'alarm',
        label: cleanLabel,
        createdAt,
        status: 'active',
        dueAt
      }
      updateReminders((current) => [...current, reminder])
    }
    setLabel('')
  }

  const pauseTimer = (id: string) => {
    const currentNow = Date.now()
    updateReminders((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? {
              ...reminder,
              status: 'paused',
              remainingSeconds: getReminderRemainingSeconds(
                reminder,
                currentNow
              ),
              dueAt: undefined
            }
          : reminder
      )
    )
  }

  const resumeTimer = (id: string) => {
    updateReminders((current) =>
      current.map((reminder) => {
        if (reminder.id !== id) return reminder
        const remainingSeconds = Math.max(1, reminder.remainingSeconds ?? 0)
        return {
          ...reminder,
          status: 'active',
          remainingSeconds: undefined,
          completedAt: undefined,
          dueAt: new Date(Date.now() + remainingSeconds * 1000).toISOString()
        }
      })
    )
  }

  const resetTimer = (id: string) => {
    updateReminders((current) =>
      current.map((reminder) => {
        if (reminder.id !== id || reminder.kind !== 'timer') return reminder
        const durationSeconds = Math.max(1, reminder.durationSeconds ?? 1)
        return {
          ...reminder,
          status: 'active',
          dueAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
          remainingSeconds: undefined,
          completedAt: undefined
        }
      })
    )
  }

  const stopReminder = (id: string) => {
    updateReminders((current) =>
      current.map((reminder) =>
        reminder.id === id
          ? {
              ...reminder,
              status: 'stopped',
              dueAt: undefined,
              remainingSeconds: 0
            }
          : reminder
      )
    )
  }

  return (
    <>
      <div className="focus-reminders" ref={rootRef}>
        <button
          type="button"
          className="focus-reminders-trigger"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Timer e sveglie"
          aria-expanded={isOpen}
          title={
            nearest
              ? `${describeReminder(nearest, now)}${
                  activeCount > 1 ? ` · altri ${activeCount - 1}` : ''
                }`
              : 'Timer e sveglie'
          }
        >
          <span aria-hidden="true">⏰</span>
          {activeCount > 0 && <span className="focus-reminders-indicator" />}
        </button>

        {isOpen && (
          <section
            className="focus-reminders-popover"
            aria-label="Timer e sveglie"
          >
            <div
              className="focus-reminders-tabs"
              role="tablist"
              aria-label="Tipo promemoria"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'timer'}
                className={mode === 'timer' ? 'active' : ''}
                onClick={() => setMode('timer')}
              >
                Timer
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'alarm'}
                className={mode === 'alarm' ? 'active' : ''}
                onClick={() => setMode('alarm')}
              >
                Sveglia
              </button>
            </div>

            <form className="focus-reminders-form" onSubmit={addReminder}>
              {mode === 'timer' ? (
                <div className="focus-reminders-duration">
                  <label>
                    Ore
                    <input
                      value={hours}
                      onChange={(event) => setHours(event.target.value)}
                      type="number"
                      min="0"
                      max="168"
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    Min
                    <input
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                      type="number"
                      min="0"
                      max="59"
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    Sec
                    <input
                      value={seconds}
                      onChange={(event) => setSeconds(event.target.value)}
                      type="number"
                      min="0"
                      max="59"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              ) : (
                <label className="focus-reminders-alarm-time">
                  Orario
                  <input
                    value={alarmTime}
                    onChange={(event) => setAlarmTime(event.target.value)}
                    type="time"
                    required
                  />
                </label>
              )}
              <label className="focus-reminders-label">
                Nome facoltativo
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  maxLength={120}
                  placeholder={mode === 'timer' ? 'Es. Pausa' : 'Es. Ripasso'}
                />
              </label>
              {formError && (
                <p className="focus-reminders-error" role="alert">
                  {formError}
                </p>
              )}
              {error && (
                <p className="focus-reminders-error" role="alert">
                  {error}
                </p>
              )}
              <button className="focus-reminders-add" type="submit">
                {mode === 'timer' ? 'Avvia timer' : 'Aggiungi sveglia'}
              </button>
            </form>

            <div className="focus-reminders-list" aria-live="polite">
              {reminders.length === 0 ? (
                <p>Nessun promemoria attivo.</p>
              ) : (
                reminders.map((reminder) => (
                  <div className="focus-reminder-row" key={reminder.id}>
                    <div>
                      <strong>{reminderTitle(reminder)}</strong>
                      <span>{describeReminder(reminder, now)}</span>
                    </div>
                    <div className="focus-reminder-actions">
                      {reminder.kind === 'timer' &&
                        reminder.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => pauseTimer(reminder.id)}
                          >
                            Pausa
                          </button>
                        )}
                      {reminder.kind === 'timer' &&
                        reminder.status === 'paused' && (
                          <button
                            type="button"
                            onClick={() => resumeTimer(reminder.id)}
                          >
                            Riprendi
                          </button>
                        )}
                      {reminder.kind === 'timer' &&
                        reminder.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => resetTimer(reminder.id)}
                          >
                            Reset
                          </button>
                        )}
                      {(reminder.status === 'active' ||
                        reminder.status === 'paused') && (
                        <button
                          type="button"
                          onClick={() => stopReminder(reminder.id)}
                        >
                          Stop
                        </button>
                      )}
                      <button
                        type="button"
                        className="focus-reminder-delete"
                        onClick={() =>
                          updateReminders((current) =>
                            current.filter((item) => item.id !== reminder.id)
                          )
                        }
                        aria-label={`Elimina ${reminderTitle(reminder)}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <div
        className="focus-reminders-notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {notifications.map((notification) => (
          <div
            className="focus-reminder-notification"
            key={notification.id}
            role="status"
          >
            <div>
              <strong>⏰ {notification.title}</strong>
              <span>{notification.description}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setNotifications((current) =>
                  current.filter((item) => item.id !== notification.id)
                )
              }
            >
              Chiudi
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
