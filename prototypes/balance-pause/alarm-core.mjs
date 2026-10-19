/** Prototype only. Inject real Zepp alarm/storage adapters after device validation. */
export function schedulePause(command, { now, read, write, setAlarm, cancelAlarm }) {
  if (!command || command.version !== 1 || typeof command.commandId !== 'string' || !/^[a-f0-9]{32}$/.test(command.commandId) || !Number.isSafeInteger(command.issuedAt) || !Number.isSafeInteger(command.deadline)) throw new Error('INVALID_COMMAND')
  const previous = read()
  if (previous !== null && (!Array.isArray(previous) || previous.length > 8 || previous.some(item => !item || typeof item.commandId !== 'string' || !Number.isSafeInteger(item.alarmId) || item.alarmId <= 0 || !Number.isSafeInteger(item.requestedDeadline) || !Number.isSafeInteger(item.scheduledDeadline)))) throw new Error('INVALID_LOCAL_STATE')
  const records = previous ?? []
  const duplicate = records.find(item => item.commandId === command.commandId)
  if (duplicate) {
    if (duplicate.requestedDeadline !== command.deadline) throw new Error('CONFLICTING_COMMAND_ID')
    return { version: 1, commandId: command.commandId, status: duplicate.scheduledDeadline > now ? 'DUPLICATE' : 'EXPIRED', scheduledDeadline: duplicate.scheduledDeadline, alarmId: duplicate.alarmId }
  }
  if (command.issuedAt > now + 30000 || now - command.issuedAt > 300000 || command.deadline < now + 5000 || command.deadline - now > 4 * 3600000) throw new Error('STALE_OR_INVALID_DEADLINE')
  // The user accepted minute precision. Round upward so the pause is never shortened.
  const scheduledDeadline = Math.ceil(command.deadline / 60000) * 60000
  const alarmId = setAlarm({ url: 'app-service/pause', time: scheduledDeadline / 1000, store: true, param: JSON.stringify({ version: 1, commandId: command.commandId, deadline: scheduledDeadline }) })
  if (!Number.isSafeInteger(alarmId) || alarmId <= 0) throw new Error('ALARM_NOT_SCHEDULED')
  const record = { commandId: command.commandId, alarmId, requestedDeadline: command.deadline, scheduledDeadline }
  // No success ACK before durable bookkeeping. Failure rolls back the new alarm only.
  try { write([...records, record].slice(-8)) } catch { cancelAlarm(alarmId); throw new Error('LOCAL_STORAGE_FAILED') }
  return { version: 1, commandId: command.commandId, status: 'SCHEDULED', scheduledDeadline, alarmId }
}

/** Documented finite built-in scene: no indefinite vibrator or JS stop timer. */
export function signalPauseEnd(vibrator) {
  vibrator.start({ mode: vibrator.VIBRATOR_SCENE_DURATION_LONG })
}
