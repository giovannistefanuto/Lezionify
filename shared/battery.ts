export interface BatteryStatus {
  percent: number | null
  onBattery: boolean
}
export function needsCharging(status: BatteryStatus | null): boolean {
  return Boolean(
    status?.onBattery &&
    typeof status.percent === 'number' &&
    Number.isFinite(status.percent) &&
    status.percent >= 0 &&
    status.percent < 20
  )
}
