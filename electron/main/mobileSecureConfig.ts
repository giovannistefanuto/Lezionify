import { randomBytes } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { mobileRawUrl, type MobileGithubDestination } from './mobileGithubPublisher'
import type { MobileStatistics } from '../../shared/mobileStatistics'

/** The caller supplies Electron safeStorage and must not permit insecure fallbacks. */
export interface MobileSecretStorage {
  available(): boolean
  encrypt(value: string): Buffer
  decrypt(value: Buffer): string
}
export interface MobileSecureConfig {
  version: 1
  destination: MobileGithubDestination
  streamId: string
  key: string
  token: string
  revision?: number
  fingerprint?: string
  pending?: { snapshot: MobileStatistics; fingerprint: string }
  publishedAt?: string
}

function validate(value: MobileSecureConfig): MobileSecureConfig {
  if (!value || value.version !== 1 || typeof value.token !== 'string' || !value.token || /[\r\n]/.test(value.token) ||
      typeof value.key !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value.key) || Buffer.from(value.key, 'base64').length !== 32 ||
      typeof value.streamId !== 'string' || !value.destination) throw new Error('Configurazione non valida')
  mobileRawUrl(value.destination, value.streamId)
  return value
}

export async function saveMobileSecureConfig(path: string, config: MobileSecureConfig, secrets: MobileSecretStorage): Promise<void> {
  if (!secrets.available()) throw new Error('Protezione credenziali non disponibile')
  const encrypted = secrets.encrypt(JSON.stringify(validate(config)))
  if (!Buffer.isBuffer(encrypted) || encrypted.length === 0 || encrypted.length > 64_000) throw new Error('Protezione credenziali non riuscita')
  const temporary = `${path}.${randomBytes(12).toString('hex')}.tmp`
  try {
    await writeFile(temporary, encrypted, { mode: 0o600, flag: 'wx' })
    await rename(temporary, path)
  } finally { await rm(temporary, { force: true }) }
}

export async function loadMobileSecureConfig(path: string, secrets: MobileSecretStorage): Promise<MobileSecureConfig> {
  if (!secrets.available()) throw new Error('Protezione credenziali non disponibile')
  try {
    const encrypted = await readFile(path)
    if (!encrypted.length || encrypted.length > 64_000) throw new Error()
    return validate(JSON.parse(secrets.decrypt(encrypted)))
  } catch { throw new Error('Configurazione protetta non disponibile') }
}
