import { expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { KeyUsageStore } from '../../electron/main/ai/keyUsage'
import { GeminiRequestManager } from '../../electron/main/ai/geminiRequestManager'
import { DEFAULT_GEMINI_POLICY } from '../../electron/main/ai/geminiPolicy'

it('conserva successi ed errori per chiave al riavvio senza credenziali e scade a 30 giorni', () => {
  const root = mkdtempSync(join(tmpdir(), 'key-usage-')), file = join(root, 'usage.json')
  let now = 1_000_000
  try {
    const store = new KeyUsageStore(file, () => now)
    store.record('synthetic-a', true); store.record('synthetic-a', false, 'authentication')
    const reloaded = new KeyUsageStore(file, () => now)
    expect(reloaded.summary('synthetic-a')).toMatchObject({ successes: 1, errors: 1, suspensionReason: 'authentication' })
    expect(readFileSync(file, 'utf8')).not.toContain('synthetic-a')
    now += 30 * 86400_000
    expect(reloaded.summary('synthetic-a')).toMatchObject({ successes: 0, errors: 0, suspendedUntil: 0 })
  } finally { rmSync(root, { recursive: true, force: true }) }
})

it('privilegia chiavi funzionanti meno usate e riabilita i problemi temporanei dopo il cooldown', () => {
  let now = 1_000_000
  const store = new KeyUsageStore(undefined, () => now), keys = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
  for (let i = 0; i < 17; i++) store.record('a', true)
  store.record('b', true); store.record('b', true)
  for (let i = 0; i < 30; i++) store.record('c', false, 'authentication')
  expect(store.order(keys).map(k => k.key)).toEqual(['b', 'a', 'c'])
  store.record('b', false, 'rate_limited', 120_000)
  expect(store.order(keys)[0].key).toBe('a')
  now += 120_000
  expect(store.order(keys)[0].key).toBe('b')
})

it('bilancia chiamate reali del manager tra richieste e mantiene indici e alias configurati', async () => {
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 })
  const attempts: unknown[] = [], call = vi.fn(async (_key: string) => 'ok')
  for (let i = 0; i < 4; i++) await manager.execute({ jobId: `balance-${i}`, purpose: 'overview', preferredModel: 'synthetic', keys: [{ key: 'a', id: 'key-0', quotaGroup: 'a' }, { key: 'b', id: 'key-1', quotaGroup: 'b' }], call, onAttempt: info => attempts.push([info.keyIndex, info.keyAlias]) })
  expect(call.mock.calls.map(args => args[0])).toEqual(['a', 'b', 'a', 'b'])
  expect(attempts).toEqual([[0, 'Chiave 1'], [1, 'Chiave 2'], [0, 'Chiave 1'], [1, 'Chiave 2']])
})

it('non riprova una chiave non valida nelle richieste successive; la verifica esplicita può riabilitarla', async () => {
  const manager = new GeminiRequestManager({ ...DEFAULT_GEMINI_POLICY, rpmLimit: 10000 })
  const call = vi.fn(async (key: string) => { if (key === 'bad') throw new Error('401 unauthenticated'); return 'ok' })
  const options = { jobId: 'auth', purpose: 'overview' as const, preferredModel: 'synthetic', keys: [{ key: 'bad', quotaGroup: 'bad' }, { key: 'good', quotaGroup: 'good' }], call }
  await manager.execute(options); await manager.execute(options)
  expect(call.mock.calls.map(args => args[0])).toEqual(['bad', 'good', 'good'])
  await manager.execute({ ...options, purpose: 'key_verification', keys: [{ key: 'bad' }], call: async () => 'verified' })
  expect(manager.getKeyUsageStore().summary('bad').suspendedUntil).toBe(0)
})
