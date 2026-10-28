import { validateLaboratorySchedule } from './laboratorySchedule'
import { validateQnaImageIds } from '../../shared/qnaImages'
import type {
  CourseDefinition,
  LectureHighlight,
  QnaThread,
  Reminder,
  ScratchpadData,
  StudySession,
  UpdateLecturePayload
} from '../../shared/archive'
import { parseLocalCalendarDate } from '../../shared/calendarDate'
export function validateReminders(
  reminders: unknown
): asserts reminders is Reminder[] {
  if (!Array.isArray(reminders) || reminders.length > 50) {
    throw new Error('L elenco dei promemoria non è valido.')
  }
  for (const reminder of reminders) {
    const hasValidDueAt =
      !reminder.dueAt ||
      (typeof reminder.dueAt === 'string' &&
        Number.isFinite(new Date(reminder.dueAt).getTime()))
    const hasValidDuration =
      reminder.durationSeconds == null ||
      (Number.isInteger(reminder.durationSeconds) &&
        reminder.durationSeconds >= 0 &&
        reminder.durationSeconds <= 7 * 24 * 60 * 60)
    const hasValidRemaining =
      reminder.remainingSeconds == null ||
      (Number.isInteger(reminder.remainingSeconds) &&
        reminder.remainingSeconds >= 0 &&
        reminder.remainingSeconds <= 7 * 24 * 60 * 60)
    if (
      !reminder ||
      typeof reminder.id !== 'string' ||
      reminder.id.length === 0 ||
      reminder.id.length > 120 ||
      (reminder.kind !== 'timer' && reminder.kind !== 'alarm') ||
      !['active', 'paused', 'completed', 'stopped'].includes(reminder.status) ||
      typeof reminder.label !== 'string' ||
      reminder.label.length > 120 ||
      typeof reminder.createdAt !== 'string' ||
      !Number.isFinite(new Date(reminder.createdAt).getTime()) ||
      !hasValidDueAt ||
      !hasValidDuration ||
      !hasValidRemaining
    ) {
      throw new Error('Un promemoria contiene dati non validi.')
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isValidIsoDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 40 &&
    Number.isFinite(new Date(value).getTime())
  )
}

export function validateQnaThread(value: unknown): asserts value is QnaThread {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw new Error('Conversazione Q&A non valida.')
  }
  if (value.contextHeading === undefined) value.contextHeading = null
  validateQnaImageIds(value.attachmentIds)
  if (value.createdAt === undefined) value.createdAt = ''
  if (value.updatedAt === undefined) value.updatedAt = ''
  const validText = (text: unknown, max: number): text is string =>
    typeof text === 'string' && text.length <= max
  if (
    !validText(value.id, 120) ||
    value.id.length === 0 ||
    !validText(value.quote, 20_000) ||
    (value.anchorString !== undefined &&
      !validText(value.anchorString, 20_000)) ||
    (value.contextHeading !== null &&
      !validText(value.contextHeading, 2_000)) ||
    (value.createdAt !== '' && !isValidIsoDateTime(value.createdAt)) ||
    (value.updatedAt !== '' && !isValidIsoDateTime(value.updatedAt)) ||
    value.messages.length > 500
  ) {
    throw new Error('Conversazione Q&A non valida.')
  }
  for (const message of value.messages) {
    if (isRecord(message)) validateQnaImageIds(message.attachmentIds)
    if (isRecord(message) && message.timestamp === undefined) {
      message.timestamp = ''
    }
    if (
      !isRecord(message) ||
      (message.role !== 'user' && message.role !== 'ai') ||
      !validText(message.text, 200_000) ||
      (message.timestamp !== '' && !isValidIsoDateTime(message.timestamp))
    ) {
      throw new Error('Messaggio Q&A non valido.')
    }
  }
}

export function validateQnaThreads(value: unknown): asserts value is QnaThread[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new Error('Elenco delle conversazioni Q&A non valido.')
  }
  value.forEach(validateQnaThread)
}

export function validateStudySession(value: unknown): asserts value is StudySession {
  if (!isRecord(value)) throw new Error('Sessione di studio non valida.')
  const modes = ['focus', 'reading', 'quiz', 'flashcard', 'qna', 'manual']
  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > 120 ||
    (value.lectureId !== null && typeof value.lectureId !== 'string') ||
    (value.courseCode !== null && typeof value.courseCode !== 'string') ||
    !isValidIsoDateTime(value.startTime) ||
    !isValidIsoDateTime(value.endTime) ||
    typeof value.durationSeconds !== 'number' ||
    !Number.isInteger(value.durationSeconds) ||
    value.durationSeconds < 0 ||
    value.durationSeconds > 30 * 24 * 60 * 60 ||
    typeof value.mode !== 'string' ||
    !modes.includes(value.mode) ||
    typeof value.date !== 'string' ||
    !parseLocalCalendarDate(value.date)
  ) {
    throw new Error('Sessione di studio non valida.')
  }
}

export function validateScratchpad(value: unknown): asserts value is ScratchpadData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.todos) ||
    value.todos.length > 1_000 ||
    typeof value.notes !== 'string' ||
    value.notes.length > 1_000_000 ||
    (value.updatedAt !== '' && !isValidIsoDateTime(value.updatedAt))
  ) {
    throw new Error('Quick Capture non valido.')
  }
  const groups = value.groups ?? []
  if (!Array.isArray(groups) || groups.length > 26) throw new Error('Gruppi Quick Capture non validi.')
  const ids = new Set<string>()
  const letters = new Set<string>()
  const names = new Set<string>()
  for (const group of groups) {
    if (!isRecord(group) || typeof group.id !== 'string' || !group.id || group.id.length > 120 ||
      ['all', ''].includes(group.id) || ids.has(group.id) || typeof group.name !== 'string' ||
      !group.name.trim() || group.name.length > 80 || names.has(group.name.trim().toLocaleLowerCase()) ||
      typeof group.shortcut !== 'string' || !/^[A-Z]$/.test(group.shortcut) || letters.has(group.shortcut) ||
      typeof group.notes !== 'string' || group.notes.length > 1_000_000) {
      throw new Error('Gruppo Quick Capture non valido.')
    }
    ids.add(group.id); letters.add(group.shortcut); names.add(group.name.trim().toLocaleLowerCase())
  }
  if (value.selectedGroupId !== undefined && value.selectedGroupId !== '' && value.selectedGroupId !== 'all' &&
    !ids.has(value.selectedGroupId as string)) throw new Error('Gruppo selezionato non valido.')
  for (const todo of value.todos) {
    if (
      !isRecord(todo) ||
      typeof todo.id !== 'string' ||
      todo.id.length === 0 ||
      todo.id.length > 120 ||
      (todo.groupId !== undefined && todo.groupId !== '' && !ids.has(todo.groupId as string)) ||
      typeof todo.text !== 'string' ||
      todo.text.length > 10_000 ||
      typeof todo.completed !== 'boolean' ||
      (todo.createdAt !== '' && !isValidIsoDateTime(todo.createdAt))
    ) {
      throw new Error('Attività Quick Capture non valida.')
    }
  }
}

export function validateHighlights(
  value: unknown
): asserts value is LectureHighlight[] {
  if (!Array.isArray(value) || value.length > 5_000) {
    throw new Error('Elenco delle evidenziazioni non valido.')
  }
  for (const highlight of value) {
    if (
      !isRecord(highlight) ||
      typeof highlight.id !== 'string' ||
      highlight.id.length === 0 ||
      highlight.id.length > 120 ||
      typeof highlight.startOffset !== 'number' ||
      typeof highlight.endOffset !== 'number' ||
      !Number.isInteger(highlight.startOffset) ||
      !Number.isInteger(highlight.endOffset) ||
      highlight.startOffset < 0 ||
      highlight.endOffset <= highlight.startOffset ||
      typeof highlight.text !== 'string' ||
      highlight.text.length > 200_000 ||
      (highlight.style !== undefined && highlight.style !== 'highlight' && highlight.style !== 'underline') ||
      (highlight.color !== undefined &&
        (typeof highlight.color !== 'string' || highlight.color.length > 40)) ||
      !isValidIsoDateTime(highlight.createdAt)
    ) {
      throw new Error('Evidenziazione non valida.')
    }
  }
}

export function validateCourse(value: unknown): asserts value is CourseDefinition {
  if (!isRecord(value) || !Array.isArray(value.schedule)) {
    throw new Error('Corso non valido.')
  }
  const finiteNonNegative = (candidate: unknown, max: number): boolean =>
    typeof candidate === 'number' &&
    Number.isFinite(candidate) &&
    candidate >= 0 &&
    candidate <= max
  const validDate = (candidate: unknown): candidate is string =>
    typeof candidate === 'string' && Boolean(parseLocalCalendarDate(candidate))
  if (
    (value.publishToGithub !== undefined && typeof value.publishToGithub !== 'boolean') ||
    typeof value.code !== 'string' ||
    value.code.trim().length === 0 ||
    value.code.length > 120 ||
    (value.name !== undefined &&
      (typeof value.name !== 'string' || value.name.length > 300)) ||
    !finiteNonNegative(value.cfu, 60) ||
    !finiteNonNegative(value.lectureHours, 10_000) ||
    !finiteNonNegative(value.individualStudyHours, 10_000) ||
    !finiteNonNegative(value.totalHours, 20_000) ||
    !validDate(value.startDate) ||
    !validDate(value.endDate) ||
    value.startDate > value.endDate ||
    (value.examDate !== undefined && !validDate(value.examDate)) ||
    (value.color !== undefined &&
      (typeof value.color !== 'string' || value.color.length > 40)) ||
    value.schedule.length > 100
  ) {
    throw new Error('Dati del corso non validi.')
  }
  validateLaboratorySchedule(value.laboratorySchedule)
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  for (const slot of value.schedule) {
    if (
      !isRecord(slot) ||
      typeof slot.id !== 'string' ||
      slot.id.length === 0 ||
      slot.id.length > 120 ||
      typeof slot.dayOfWeek !== 'number' ||
      !Number.isInteger(slot.dayOfWeek) ||
      slot.dayOfWeek < 0 ||
      slot.dayOfWeek > 6 ||
      typeof slot.startTime !== 'string' ||
      typeof slot.endTime !== 'string' ||
      !timePattern.test(slot.startTime) ||
      !timePattern.test(slot.endTime) ||
      slot.startTime >= slot.endTime ||
      (slot.room !== undefined &&
        (typeof slot.room !== 'string' || slot.room.length > 200))
    ) {
      throw new Error('Orario del corso non valido.')
    }
  }
}

export function validateLectureUpdate(
  value: unknown
): asserts value is UpdateLecturePayload {
  if (!isRecord(value)) throw new Error('Aggiornamento lezione non valido.')
  const allowed = new Set(['title', 'courseCode', 'recordedAt', 'studyStatus', 'isLaboratory'])
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('Aggiornamento lezione non valido.')
  }
  if (
    (value.isLaboratory !== undefined && typeof value.isLaboratory !== 'boolean') ||
    (value.title !== undefined &&
      value.title !== null &&
      (typeof value.title !== 'string' || value.title.length > 500)) ||
    (value.courseCode !== undefined &&
      value.courseCode !== null &&
      (typeof value.courseCode !== 'string' || value.courseCode.length > 120)) ||
    (value.recordedAt !== undefined &&
      value.recordedAt !== null &&
      !isValidIsoDateTime(value.recordedAt)) ||
    (value.studyStatus !== undefined &&
      !['da-studiare', 'in-corso', 'completata'].includes(
        String(value.studyStatus)
      ))
  ) {
    throw new Error('Aggiornamento lezione non valido.')
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined
}

