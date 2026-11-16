export const APP_RELEASES_URL = 'https://github.com/giovannistefanuto/Lezionify/releases'

export interface AppUpdateState {
  currentVersion: string
  supported: boolean
  phase: 'idle' | 'checking' | 'current' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'
  version?: string
  notes?: string
  size?: number
  percent?: number
  checkedAt?: string
  message?: string
  installedNotes?: string
}

export interface AppUpdateApi {
  getState(): Promise<AppUpdateState>
  check(): Promise<AppUpdateState>
  download(): Promise<AppUpdateState>
  install(): Promise<AppUpdateState>
  openReleases(): Promise<void>
  acknowledge(): Promise<void>
  onState(callback: (state: AppUpdateState) => void): () => void
}
