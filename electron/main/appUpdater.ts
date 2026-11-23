import type { AppUpdater, UpdateInfo } from 'electron-updater'
import { readFile, writeFile, rename } from 'node:fs/promises'
import type { AppUpdateState } from '../../shared/appUpdate'

/** Owns consent and the checked/downloaded version. No remote paths cross IPC. */
export class AppUpdateService {
  private state: AppUpdateState
  private operation = false
  private downloaded = false
  private installError = false

  constructor(private readonly updater: AppUpdater | null, currentVersion: string,
    private readonly notify: (state: AppUpdateState) => void,
    private readonly prepare: () => Promise<void>, private readonly resume: () => void,
    private readonly receiptPath: string) {
    this.state = { currentVersion, supported: Boolean(updater), phase: 'idle' }
    if (!updater) {
      this.state.message = 'Aggiornamento automatico disponibile nella versione Windows installata. Puoi scaricare il setup dalla pagina dei rilasci.'
      return
    }
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.allowPrerelease = false
    updater.allowDowngrade = false
    updater.fullChangelog = true
    // Never persist upstream error objects: they can contain URLs and headers.
    updater.logger = null
    updater.on('error', () => {
      this.installError = true
      this.resume()
      this.set({ phase: this.downloaded ? 'ready' : 'error', message: 'Aggiornamento non completato. Controlla la connessione e riprova; i dati locali sono conservati.' })
    })
    updater.on('download-progress', progress => {
      if (this.state.phase === 'downloading') this.set({ percent: Math.max(0, Math.min(100, progress.percent)) })
    })
  }

  getState(): AppUpdateState { return { ...this.state } }
  private set(patch: Partial<AppUpdateState>) {
    this.state = { ...this.state, ...patch }
    this.notify(this.getState())
  }

  async initialize() {
    try {
      const receipt: unknown = JSON.parse(await readFile(this.receiptPath, 'utf8'))
      if (receipt && typeof receipt === 'object' && 'version' in receipt && receipt.version === this.state.currentVersion && 'notes' in receipt && typeof receipt.notes === 'string') {
        this.set({ installedNotes: receipt.notes.slice(0, 40_000) })
      }
    } catch { /* First launch or no installed update receipt. */ }
  }

  private async receipt(value: { version: string; notes: string } | null) {
    await writeFile(`${this.receiptPath}.tmp`, JSON.stringify(value), 'utf8')
    await rename(`${this.receiptPath}.tmp`, this.receiptPath)
  }

  async acknowledge() {
    if (this.state.phase === 'installing') return
    await this.receipt(null)
    this.set({ installedNotes: undefined })
  }

  async check(): Promise<AppUpdateState> {
    if (!this.updater || this.operation || this.downloaded) return this.getState()
    this.operation = true
    this.set({ phase: 'checking', message: undefined, version: undefined, notes: undefined, percent: undefined, size: undefined })
    try {
      const result = await this.updater.checkForUpdates()
      if (!result) throw new Error('No update information')
      const info = result.updateInfo
      // Enforce the stable channel even if a provider returns prerelease metadata.
      const available = result.isUpdateAvailable && /^\d+\.\d+\.\d+$/.test(info.version)
      this.set({ phase: available ? 'available' : 'current', checkedAt: new Date().toISOString(),
        ...(available ? this.release(info) : {}) })
    } catch {
      this.set({ phase: 'error', message: 'Verifica non riuscita. Puoi continuare a usare Lezionify e riprovare più tardi.' })
    } finally { this.operation = false }
    return this.getState()
  }

  private release(info: UpdateInfo): Partial<AppUpdateState> {
    const notes = typeof info.releaseNotes === 'string' ? info.releaseNotes :
      info.releaseNotes?.map(item => `${item.version}\n${item.note}`).join('\n\n')
    return { version: info.version, notes: notes?.slice(0, 40_000) || 'Consulta la pagina dei rilasci per le novità.', size: info.files[0]?.size }
  }

  async download(): Promise<AppUpdateState> {
    if (!this.updater || this.operation || this.state.phase !== 'available') return this.getState()
    this.operation = true
    this.set({ phase: 'downloading', message: undefined, percent: 0 })
    try {
      const files = await this.updater.downloadUpdate()
      if (!files.length) throw new Error('No verified payload')
      this.downloaded = true
      this.set({ phase: 'ready', percent: 100, message: undefined })
    } catch {
      this.set({ phase: 'available', percent: undefined, message: 'Download non riuscito. Nessuna installazione eseguita. Riprova quando la connessione è disponibile.' })
    } finally { this.operation = false }
    return this.getState()
  }

  async install(): Promise<AppUpdateState> {
    if (!this.updater || this.operation || !this.downloaded || this.state.phase !== 'ready') return this.getState()
    this.operation = true
    this.installError = false
    this.set({ phase: 'installing', message: undefined })
    try {
      await this.prepare()
      await this.receipt({ version: this.state.version!, notes: this.state.notes! })
      if (!this.installError) this.updater.quitAndInstall(true, true)
    } catch {
      this.resume()
      this.set({ phase: 'ready', message: 'Riavvio rinviato: un salvataggio o l’interruzione di un lavoro non è terminato. I dati sono conservati; riprova.' })
    } finally { this.operation = false }
    return this.getState()
  }
}
