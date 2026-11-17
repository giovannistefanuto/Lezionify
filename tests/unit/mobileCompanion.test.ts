import { describe, expect, it, vi } from 'vitest'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MobileCompanionService } from '../../electron/main/mobileCompanion'

describe('Sincronizzazione del telefono', () => {
  it('riprende senza perdere revisioni dopo un invio interrotto e non ripubblica dati invariati', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mobile-service-'))
    const key = randomBytes(32)
    const storage = { available: () => true,
      encrypt: (value: string) => { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]) },
      decrypt: (value: Buffer) => { const cipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); cipher.setAuthTag(value.subarray(12, 28)); return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString('utf8') } }
    const source = vi.fn().mockResolvedValue({ courses: [{ code: 'A' }], lectures: [{ courseCode: 'A', studyStatus: 'in-corso' }], dailyHistory: [] })
    const remote = vi.fn().mockRejectedValueOnce(new Error('connessione interrotta')).mockResolvedValue({ url: 'synthetic', unchanged: false })
    const path = join(directory, 'config.bin')
    try {
      const service = new MobileCompanionService(path, storage, source, remote)
      expect(await service.state()).toEqual({ enabled: false })
      await service.configure({ owner: 'student', repo: 'data', branch: 'main', token: 'token-sintetico' })
      expect(JSON.parse(Buffer.from(await service.pairing(), 'base64url').toString('utf8'))).not.toHaveProperty('token')
      expect((await service.publish()).error).toBe('connessione interrotta')
      const first = remote.mock.calls[0][0].snapshot
      const restarted = new MobileCompanionService(path, storage, source, remote)
      expect((await restarted.publish()).error).toBeUndefined()
      expect(remote.mock.calls[1][0].snapshot).toEqual(first)
      await restarted.publish()
      expect(remote).toHaveBeenCalledTimes(2)
      source.mockResolvedValue({ courses: [{ code: 'A' }], lectures: [], dailyHistory: [] })
      await restarted.publish()
      expect(remote.mock.calls[2][0].snapshot.revision).toBe(2)
      expect(remote.mock.calls[2][0].snapshot.courses[0].remaining).toBe(0)
      await restarted.disable()
      expect(await restarted.state()).toEqual({ enabled: false })
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
