import { randomBytes } from 'node:crypto'
import { mobileRawUrl, type MobileGithubDestination } from './mobileGithubPublisher'

export function createMobileIdentity() {
  return { streamId: randomBytes(16).toString('hex'), key: randomBytes(32) }
}

/** Secret output for explicit display to the user only. Never log or store in the source tree. */
export function mobilePairingCode(destination: MobileGithubDestination, streamId: string, key: Buffer): string {
  if (key.length !== 32) throw new Error('Chiave non valida')
  return Buffer.from(JSON.stringify({ url: mobileRawUrl(destination, streamId), streamId, key: key.toString('base64') }), 'utf8').toString('base64url')
}
