import { join } from 'node:path'

interface IdentityApp {
  isPackaged: boolean
  setAppUserModelId(id: string): void
}

/** Configure before any window or native notification can register with Windows. */
export function configureWindowsIdentity(app: IdentityApp, platform: string): void {
  if (platform === 'win32') {
    app.setAppUserModelId(app.isPackaged ? 'com.lezionify.app' : 'com.lezionify.app.development')
  }
}

export function windowIconPath(mainDirectory: string): string {
  return join(mainDirectory, 'app-icon.png')
}
