import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { loadMobileSecureConfig, saveMobileSecureConfig } from '../../electron/main/mobileSecureConfig'

describe('Configurazione protetta telefono', () => {
  it('conserva credenziali cifrate e fallisce senza chiave o in caso di alterazione', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mobile-config-test-'))
    const path = join(dir, 'config.bin'), key = randomBytes(32)
    const config = { version: 1 as const, destination: { owner: 'student', repo: 'data', branch: 'main' }, streamId: 'a'.repeat(32), key: randomBytes(32).toString('base64'), token: 'token-sintetico' }
    const storage = { available: () => true,
      encrypt: (value: string) => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv); const body = Buffer.concat([c.update(value, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), body]) },
      decrypt: (value: Buffer) => { const d = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); d.setAuthTag(value.subarray(12, 28)); return Buffer.concat([d.update(value.subarray(28)), d.final()]).toString('utf8') } }
    try {
      await saveMobileSecureConfig(path, config, storage)
      const encrypted = await readFile(path)
      expect(encrypted.toString()).not.toContain(config.token)
      expect(encrypted.toString()).not.toContain(config.key)
      expect(await loadMobileSecureConfig(path, storage)).toEqual(config)
      await expect(saveMobileSecureConfig(path, config, { ...storage, available: () => false })).rejects.toThrow('non disponibile')
      encrypted[encrypted.length - 1] ^= 1
      await writeFile(path, encrypted)
      await expect(loadMobileSecureConfig(path, storage)).rejects.toThrow('non disponibile')
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})
