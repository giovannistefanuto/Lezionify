import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { powerMonitor } from 'electron'
import { deviceNoticePreferences, HeadphoneConnection, type DeviceNotice, type DeviceNoticePreferences } from '../../shared/deviceNotices'
import { BLUETOOTH_PROBE } from './bluetoothProbe'

export function startDeviceNotices(read: () => Promise<{ deviceNotices?: DeviceNoticePreferences }>, notify: (notice: DeviceNotice) => void) {
  let stopped = false, busy = false, battery = powerMonitor.isOnBatteryPower()
  let bluetooth: 'starting' | 'ready' | 'unavailable' = process.platform === 'win32' ? 'starting' : 'unavailable'
  const connection = new HeadphoneConnection()
  const power = (next: boolean) => {
    if (battery === next) return
    battery = next
    void read().then(settings => { if (!stopped && deviceNoticePreferences(settings.deviceNotices).power) notify({ kind: next ? 'battery' : 'ac' }) }).catch(() => {})
  }
  const ac = () => power(false), onBattery = () => power(true)
  powerMonitor.on('on-ac', ac); powerMonitor.on('on-battery', onBattery)
  const child = process.platform === 'win32' ? spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(BLUETOOTH_PROBE, 'utf16le').toString('base64')],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }) : null
  const lines = child?.stdout ? createInterface({ input: child.stdout }) : null
  child?.on('error', () => { bluetooth = 'unavailable'; connection.reset() })
  child?.on('exit', () => { bluetooth = 'unavailable'; connection.reset() })
  lines?.on('line', line => {
    if (stopped || busy || line.length > 65536) return
    busy = true
    void (async () => {
      try {
        const value = JSON.parse(line)
        if (!Array.isArray(value.names) || !value.names.every((name: unknown) => typeof name === 'string')) { bluetooth = 'unavailable'; connection.reset(); return }
        bluetooth = 'ready'
        const preferences = deviceNoticePreferences((await read()).deviceNotices)
        if (!stopped && connection.sample(value.names, preferences)) notify({ kind: 'headphones', name: preferences.headphonesName })
      } catch { bluetooth = 'unavailable'; connection.reset() }
      finally { busy = false }
    })()
  })
  return { status: () => ({ bluetooth }), stop: () => {
    stopped = true; lines?.close(); child?.kill()
    powerMonitor.removeListener('on-ac', ac); powerMonitor.removeListener('on-battery', onBattery)
  } }
}
