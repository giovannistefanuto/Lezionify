import { expect, it, vi } from 'vitest'
// The prototype stays outside the production main/renderer bundles.
// @ts-expect-error standalone JavaScript prototype deliberately has no production API
import { schedulePause, signalPauseEnd } from '../../prototypes/balance-pause/alarm-core.mjs'

function fixture() {
  const now = 1792062001000
  let records: any = null
  const setAlarm = vi.fn(() => 23), cancelAlarm = vi.fn()
  const adapters = { now, read: () => records, write: (value: any) => { records = value }, setAlarm, cancelAlarm }
  const command = { version: 1, commandId: 'a'.repeat(32), issuedAt: now, deadline: now + 5 * 60000 }
  return { adapters, command, setAlarm, cancelAlarm }
}
it('programma prima della conferma, minuto successivo e duplicati senza nuovi alarm', () => {
  const { adapters, command, setAlarm } = fixture()
  const ack = schedulePause(command, adapters)
  expect(ack.status).toBe('SCHEDULED')
  expect(ack.scheduledDeadline % 60000).toBe(0)
  expect(ack.scheduledDeadline).toBeGreaterThanOrEqual(command.deadline)
  expect(ack.scheduledDeadline - command.deadline).toBeLessThan(60000)
  expect(setAlarm).toHaveBeenCalledWith(expect.objectContaining({ time: ack.scheduledDeadline / 1000, store: true }))
  expect(schedulePause(command, adapters).status).toBe('DUPLICATE')
  expect(setAlarm).toHaveBeenCalledTimes(1)
  expect(() => schedulePause({ ...command, deadline: command.deadline + 1000 }, adapters)).toThrow('CONFLICTING')
  expect(schedulePause(command, { ...adapters, now: ack.scheduledDeadline + 1 }).status).toBe('EXPIRED')
})
it('nessun successo se alarm fallisce, comando scaduto o salvataggio non persistito', () => {
  const { adapters, command, cancelAlarm } = fixture()
  expect(() => schedulePause(command, { ...adapters, setAlarm: () => 0 })).toThrow('ALARM_NOT')
  expect(() => schedulePause({ ...command, issuedAt: 1 }, adapters)).toThrow('STALE')
  expect(() => schedulePause({ ...command, commandId: '../bad' }, adapters)).toThrow('INVALID')
  expect(() => schedulePause(command, { ...adapters, write: () => { throw new Error('storage') } })).toThrow('LOCAL_STORAGE')
  expect(cancelAlarm).toHaveBeenCalledWith(23)
})
it('scena aptica finita e nessun timer JS per lo stop', () => {
  const start = vi.fn()
  signalPauseEnd({ start, VIBRATOR_SCENE_DURATION_LONG: 42 })
  expect(start).toHaveBeenCalledExactlyOnceWith({ mode: 42 })
})
