import { describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { publishMobileStatistics } from '../../electron/main/mobileGithubPublisher'
import { decryptMobileStatistics, encryptMobileStatistics } from '../../electron/main/mobileStatisticsCrypto'
import { createMobileIdentity, mobilePairingCode } from '../../electron/main/mobilePairing'
import type { MobileStatistics } from '../../shared/mobileStatistics'

const data: MobileStatistics = { version: 1, streamId: 'a'.repeat(32), revision: 2, generatedAt: '2026-11-17T14:00:00.000Z', timeZone: 'Europe/Rome', days: [{ date: '2026-11-17', seconds: 120 }], courses: [{ code: 'Corso sintetico', remaining: 2 }] }
const destination = { owner: 'student', repo: 'personal-statistics', branch: 'main' }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
const repo = () => json({ full_name: 'student/personal-statistics', private: false, archived: false })
const file = (contents: string) => json({ type: 'file', encoding: 'base64', sha: 'a'.repeat(40), content: Buffer.from(contents).toString('base64') })

describe('Pubblicazione statistiche su GitHub', () => {
  it('genera identita e codice compatibili con il telefono senza token GitHub', () => {
    const one = createMobileIdentity(), two = createMobileIdentity()
    expect(one.streamId).toMatch(/^[a-f0-9]{32}$/)
    expect(one.streamId).not.toBe(two.streamId)
    expect(one.key).toHaveLength(32)
    const pairing = JSON.parse(Buffer.from(mobilePairingCode(destination, one.streamId, one.key), 'base64url').toString('utf8'))
    expect(pairing).toEqual({ url: `https://raw.githubusercontent.com/student/personal-statistics/main/statistics/${one.streamId}.json`, streamId: one.streamId, key: one.key.toString('base64') })
    expect(pairing.token).toBeUndefined()
  })
  it('scrive solo testo cifrato e produce il collegamento raw per il telefono', async () => {
    const key = randomBytes(32)
    const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 201))
    const result = await publishMobileStatistics({ destination, token: 'token-sintetico', key, snapshot: data }, network)
    expect(result).toEqual({ url: `https://raw.githubusercontent.com/student/personal-statistics/main/statistics/${data.streamId}.json`, unchanged: false })
    const body = JSON.parse(network.mock.calls[2][1].body)
    expect(network.mock.calls[2][0]).toContain(`/contents/statistics/${data.streamId}.json`)
    const encrypted = Buffer.from(body.content, 'base64').toString('utf8')
    expect(encrypted).not.toContain('Corso sintetico')
    expect(JSON.parse(decryptMobileStatistics(JSON.parse(encrypted), key))).toEqual(data)
    expect(body.sha).toBeUndefined()
  })
  it('usa lo SHA esistente e non sostituisce revisioni piu recenti o incompatibili', async () => {
    const key = randomBytes(32), old = { ...data, revision: 1 }
    const existing = JSON.stringify(encryptMobileStatistics(JSON.stringify(old), key))
    const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(file(existing)).mockResolvedValueOnce(json({}, 200))
    await publishMobileStatistics({ destination, token: 'secret', key, snapshot: data }, network)
    expect(JSON.parse(network.mock.calls[2][1].body).sha).toBe('a'.repeat(40))
    const stale = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(file(JSON.stringify(encryptMobileStatistics(JSON.stringify({ ...data, revision: 3 }), key))))
    await expect(publishMobileStatistics({ destination, token: 'secret', key, snapshot: data }, stale)).rejects.toThrow('revisione')
    expect(stale).toHaveBeenCalledTimes(2)
  })
  it('rende idempotente il ritentativo della stessa revisione', async () => {
    const key = randomBytes(32)
    const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(file(JSON.stringify(encryptMobileStatistics(JSON.stringify(data), key))))
    expect((await publishMobileStatistics({ destination, token: 'secret', key, snapshot: data }, network)).unchanged).toBe(true)
    expect(network).toHaveBeenCalledTimes(2)
  })
  it('blocca repository privati, codice sorgente e contenuti non decifrabili', async () => {
    const key = randomBytes(32)
    const privateRepo = vi.fn().mockResolvedValueOnce(json({ full_name: 'student/personal-statistics', private: true, archived: false }))
    await expect(publishMobileStatistics({ destination, token: 'secret', key, snapshot: data }, privateRepo)).rejects.toThrow('pubblico')
    const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(file('non cifrato'))
    await expect(publishMobileStatistics({ destination, token: 'secret', key, snapshot: data }, network)).rejects.toThrow('incompatibili')
    await expect(publishMobileStatistics({ destination: { owner: 'giovannistefanuto', repo: 'Lezionify', branch: 'main' }, token: 'secret', key, snapshot: data }, network)).rejects.toThrow('Repository')
  })
  it('segnala conflitto senza riprovare o esporre il token', async () => {
    const key = randomBytes(32), secret = 'TOKEN-SEGRETO-SINTETICO'
    const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({ message: secret }, 409))
    await expect(publishMobileStatistics({ destination, token: secret, key, snapshot: data }, network)).rejects.toThrow('409')
    expect(network).toHaveBeenCalledTimes(3)
    const failing = vi.fn().mockRejectedValue(new Error(secret))
    await expect(publishMobileStatistics({ destination, token: secret, key, snapshot: data }, failing)).rejects.toThrow('Connessione GitHub non riuscita')
  })
})

it('rilegge note cifrate vicine al limite anche con il doppio involucro base64 GitHub', async () => {
  const key = randomBytes(32)
  const large: MobileStatistics = { ...data, memo: { groups: [{ id: '', name: 'Senza tag', notes: 'x'.repeat(230000) }], todos: [] } }
  const envelope = JSON.stringify(encryptMobileStatistics(JSON.stringify(large), key))
  const network = vi.fn().mockResolvedValueOnce(repo()).mockResolvedValueOnce(file(envelope))
  expect((await publishMobileStatistics({ destination, token: 'synthetic-token', key, snapshot: large }, network)).unchanged).toBe(true)
  expect(network).toHaveBeenCalledTimes(2)
})
