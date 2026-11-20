import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { afterEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ child: null as any, monitor: null as any }))
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  state.monitor = Object.assign(new EventEmitter(), { isOnBatteryPower: () => false })
  return { powerMonitor: state.monitor, safeStorage: { isEncryptionAvailable: () => false } }
})
vi.mock('node:child_process', async importOriginal => ({ ...await importOriginal<typeof import('node:child_process')>(), spawn: vi.fn(() => state.child) }))
import { startDeviceNotices } from '../../electron/main/deviceNotices'
import { DEFAULT_DEVICE_NOTICES } from '../../shared/deviceNotices'
import { SettingsService } from '../../electron/main/settings'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

afterEach(() => { vi.restoreAllMocks(); state.monitor.removeAllListeners() })
it('maps real power event names to one silent notice per transition, honors settings and disposes listeners', async () => {
  state.child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), kill: vi.fn() })
  let preferences = { ...DEFAULT_DEVICE_NOTICES }
  const read = async () => ({ deviceNotices: preferences }), notify = vi.fn()
  const monitor = startDeviceNotices(read, notify)
  const flush = () => new Promise(resolve => setImmediate(resolve))
  try {
    expect(notify).not.toHaveBeenCalled()
    state.monitor.emit('on-ac'); await flush()
    expect(notify).not.toHaveBeenCalled()
    state.monitor.emit('on-battery'); state.monitor.emit('on-battery'); await flush()
    expect(notify.mock.calls.map(call => call[0])).toEqual([{ kind: 'battery' }])
    state.monitor.emit('on-ac'); await flush()
    expect(notify).toHaveBeenLastCalledWith({ kind: 'ac' })
    preferences = { ...preferences, power: false }
    state.monitor.emit('on-battery'); await flush()
    expect(notify).toHaveBeenCalledTimes(2)
    if (process.platform === 'win32') {
      state.child.stdout.write('{"names":[]}\n'); await flush()
      state.child.stdout.write('{"names":["EarFun Air Pro 4"]}\n'); await flush()
      expect(notify).toHaveBeenLastCalledWith({ kind: 'headphones', name: 'EarFun Air Pro 4' })
      expect(monitor.status().bluetooth).toBe('ready')
      state.child.stdout.write('{"unavailable":true}\n'); await flush()
      expect(monitor.status().bluetooth).toBe('unavailable')
    }
  } finally { monitor.stop() }
  expect(state.monitor.listenerCount('on-ac')).toBe(0)
  expect(state.monitor.listenerCount('on-battery')).toBe(0)
  const count = notify.mock.calls.length
  state.monitor.emit('on-ac'); await flush()
  expect(notify).toHaveBeenCalledTimes(count)
})

it('persists notice preferences independently of other settings and rejects invalid values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lezionify-notice-settings-'))
  try {
    const settings = new SettingsService(directory)
    const deviceNotices = { headphonesName: 'Test headphones', headphones: false, power: true }
    await settings.saveSettings({ deviceNotices })
    await settings.saveSettings({ model: 'gemini-3.8-flash' })
    expect((await new SettingsService(directory).getSettings()).deviceNotices).toEqual(deviceNotices)
    for (const invalid of [{ ...deviceNotices, headphonesName: '' }, { ...deviceNotices, power: 'yes' }, { ...deviceNotices, unknown: true }]) {
      await expect(settings.saveSettings({ deviceNotices: invalid })).rejects.toThrow('avvisi')
    }
    expect((await settings.getSettings()).deviceNotices).toEqual(deviceNotices)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
