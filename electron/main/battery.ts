import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { BatteryStatus } from '../../shared/battery'
const execute = promisify(execFile)
export async function readBatteryStatus(
  onBattery: boolean
): Promise<BatteryStatus> {
  if (process.platform !== 'win32') return { percent: null, onBattery: false }
  try {
    const { stdout } = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance -ClassName Win32_Battery | Select-Object -ExpandProperty EstimatedChargeRemaining | ConvertTo-Json -Compress'
      ],
      { windowsHide: true, timeout: 5000, maxBuffer: 4096 }
    )
    const parsed: unknown = JSON.parse(stdout.trim() || 'null')
    const values = (Array.isArray(parsed) ? parsed : [parsed]).filter(
      (value): value is number =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
    )
    return { percent: values.length ? Math.min(...values) : null, onBattery }
  } catch {
    return { percent: null, onBattery: false }
  }
}
