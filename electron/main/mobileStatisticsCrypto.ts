import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/** Version is authenticated as AAD; nonce must never be reused with a key. */
const AAD = Buffer.from('lezionify-mobile-statistics-v1', 'utf8')
export interface MobileEnvelope { version: 1; nonce: string; ciphertext: string; tag: string }

export function encryptMobileStatistics(plaintext: string, key: Buffer): MobileEnvelope {
  if (key.length !== 32) throw new Error('Chiave non valida')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return { version: 1, nonce: nonce.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

export function decryptMobileStatistics(envelope: MobileEnvelope, key: Buffer): string {
  if (key.length !== 32 || envelope.version !== 1) throw new Error('Messaggio non valido')
  const nonce = Buffer.from(envelope.nonce, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length > 256 * 1024) throw new Error('Messaggio non valido')
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAAD(AAD)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
