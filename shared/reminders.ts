import type { Reminder } from './archive'

export function getReminderRemainingSeconds(
  reminder: Reminder,
  now = Date.now()
): number {
  if (reminder.status === 'paused') {
    return Math.max(0, Math.floor(reminder.remainingSeconds ?? 0))
  }
  if (reminder.status !== 'active' || !reminder.dueAt) return 0
  return Math.max(
    0,
    Math.ceil((new Date(reminder.dueAt).getTime() - now) / 1000)
  )
}

export function isReminderDue(reminder: Reminder, now = Date.now()): boolean {
  if (reminder.status !== 'active' || !reminder.dueAt) return false
  const dueAt = new Date(reminder.dueAt).getTime()
  return Number.isFinite(dueAt) && dueAt <= now
}

export function formatReminderDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function getNearestReminder(reminders: Reminder[]): Reminder | null {
  return (
    reminders
      .filter((reminder) => reminder.status === 'active' && reminder.dueAt)
      .sort(
        (first, second) =>
          new Date(first.dueAt!).getTime() - new Date(second.dueAt!).getTime()
      )[0] ?? null
  )
}
