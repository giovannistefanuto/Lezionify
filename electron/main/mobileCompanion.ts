import { createHash } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { AsyncMutex } from './asyncMutex'
import { makeMobileStatistics } from '../../shared/mobileStatistics'
import { studyCalendarDate } from '../../shared/studyHistory'
import type { MobileCompanionSetup, MobileCompanionStatus } from '../../shared/mobileCompanion'
import { createMobileIdentity, mobilePairingCode } from './mobilePairing'
import { publishMobileStatistics } from './mobileGithubPublisher'
import { loadMobileSecureConfig, saveMobileSecureConfig, type MobileSecretStorage } from './mobileSecureConfig'

type Source = () => Promise<{
  courses: Array<{ code: string; archived?: boolean }>
  lectures: Array<{ courseCode: string | null; studyStatus: string }>
  dailyHistory: Array<{ date: string; totalSeconds: number }>
}>

export class MobileCompanionService {
  private readonly lock = new AsyncMutex()
  private error: string | undefined
  constructor(private readonly file: string, private readonly secrets: MobileSecretStorage, private readonly source: Source,
    private readonly publishRemote = publishMobileStatistics) {}

  private async read() { return loadMobileSecureConfig(this.file, this.secrets) }
  async state(): Promise<MobileCompanionStatus> {
    try {
      const config = await this.read()
      return { enabled: true, destination: `${config.destination.owner}/${config.destination.repo}`, publishedAt: config.publishedAt, error: this.error }
    } catch {
      const exists = await import('node:fs/promises').then(fs => fs.stat(this.file).then(() => true, () => false))
      return exists ? { enabled: false, error: 'Configurazione protetta non disponibile.' } : { enabled: false }
    }
  }
  async configure(input: MobileCompanionSetup): Promise<MobileCompanionStatus> {
    return this.lock.runExclusive(async () => {
      if ((await this.state()).enabled) throw new Error('Disattiva prima il collegamento esistente.')
      const current = await this.state()
      if (current.error) throw new Error(current.error)
      if (!input || typeof input.owner !== 'string' || typeof input.repo !== 'string' || typeof input.branch !== 'string' || typeof input.token !== 'string') throw new Error('Configurazione non valida.')
      const identity = createMobileIdentity()
      await saveMobileSecureConfig(this.file, { version: 1, destination: { owner: input.owner.trim(), repo: input.repo.trim(), branch: input.branch.trim() }, streamId: identity.streamId, key: identity.key.toString('base64'), token: input.token.trim(), revision: 0 }, this.secrets)
      this.error = undefined
      return this.state()
    })
  }
  async pairing(): Promise<string> {
    const config = await this.read()
    return mobilePairingCode(config.destination, config.streamId, Buffer.from(config.key, 'base64'))
  }
  async disable(): Promise<MobileCompanionStatus> {
    return this.lock.runExclusive(async () => { await rm(this.file, { force: true }); this.error = undefined; return { enabled: false } })
  }
  async publish(): Promise<MobileCompanionStatus> {
    return this.lock.runExclusive(async () => {
      try {
        let config = await this.read()
        const send = async () => {
          const pending = config.pending!
          await this.publishRemote({ destination: config.destination, token: config.token, key: Buffer.from(config.key, 'base64'), snapshot: pending.snapshot })
          config = { ...config, revision: pending.snapshot.revision, fingerprint: pending.fingerprint, pending: undefined, publishedAt: new Date().toISOString() }
          await saveMobileSecureConfig(this.file, config, this.secrets)
        }
        if (config.pending) await send()
        const source = await this.source(), now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const snapshot = makeMobileStatistics({ ...source, streamId: config.streamId, revision: (config.revision ?? 0) + 1, generatedAt: now.toISOString(), timeZone, today: studyCalendarDate(now.getTime(), timeZone) })
        const fingerprint = createHash('sha256').update(JSON.stringify({ day: studyCalendarDate(now.getTime(), timeZone), timeZone, days: snapshot.days, courses: snapshot.courses })).digest('hex')
        if (fingerprint !== config.fingerprint) {
          config = { ...config, pending: { snapshot, fingerprint } }
          await saveMobileSecureConfig(this.file, config, this.secrets)
          await send()
        }
        this.error = undefined
      } catch (e) { this.error = e instanceof Error ? e.message : 'Sincronizzazione non riuscita.' }
      return this.state()
    })
  }
}
