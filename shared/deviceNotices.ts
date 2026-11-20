export interface DeviceNoticePreferences { headphonesName: string; headphones: boolean; power: boolean }
export const DEFAULT_DEVICE_NOTICES: DeviceNoticePreferences = { headphonesName: 'EarFun Air Pro 4', headphones: true, power: true }
export type DeviceNotice = { kind: 'headphones' | 'ac' | 'battery'; name?: string }
export function deviceNoticePreferences(value?: Partial<DeviceNoticePreferences>): DeviceNoticePreferences {
  return {
    headphonesName: typeof value?.headphonesName === 'string' && value.headphonesName.trim() && value.headphonesName.length <= 120 ? value.headphonesName.trim() : DEFAULT_DEVICE_NOTICES.headphonesName,
    headphones: typeof value?.headphones === 'boolean' ? value.headphones : true,
    power: typeof value?.power === 'boolean' ? value.power : true
  }
}
/** State changes only. Startup, renamed target, failed reads and repeated samples never notify. */
export class HeadphoneConnection {
  private target = ''
  private connected: boolean | undefined
  sample(names: string[], preferences: DeviceNoticePreferences) {
    const target = preferences.headphonesName.trim().toLocaleLowerCase()
    const connected = names.some(name => name.trim().toLocaleLowerCase() === target)
    const changedTarget = target !== this.target
    const notify = !changedTarget && this.connected === false && connected && preferences.headphones
    this.target = target; this.connected = connected
    return notify
  }
  reset() { this.connected = undefined }
}
