import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { phraseSegments, validatePhrase } from '../../shared/offlineTranslation'
import { OfflineTranslationService } from '../../electron/main/offlineTranslation'

it('conserva formule codice URL e spazi senza placeholder traducibili', () => {
  const text = 'Use $x_i = 4$ and \\(a+b\\), $$c=d$$. Read `foo()` and https://example.org/p?q=a\n```ts\nconst x = 1\n```'
  const segments = phraseSegments(text)
  expect(segments.map(item => item.text).join('')).toBe(text)
  expect(segments.filter(item => item.protected).map(item => item.text)).toEqual(['$x_i = 4$', '\\(a+b\\)', '$$c=d$$', '`foo()`', 'https://example.org/p?q=a', '```ts\nconst x = 1\n```'])
  expect(() => validatePhrase('', 'en-it')).toThrow()
  expect(() => validatePhrase('a'.repeat(2001), 'it-en')).toThrow()
  expect(() => validatePhrase('hello', '../../')).toThrow()
})

it('nessun download implicito e installazione fallita recuperabile senza frasi nella rete', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-offline-'))
  const requests: string[] = []
  try {
    const service = new OfflineTranslationService(root, root, (async (url: string) => { requests.push(url); return new Response('bad', { status: 503 }) }) as typeof fetch)
    expect(await service.status()).toMatchObject({ installed: false, installing: false })
    await expect(service.translate('Private synthetic phrase', 'en-it')).rejects.toThrow('Scarica prima')
    expect(requests).toEqual([])
    await expect(service.install()).rejects.toThrow('Installazione')
    expect((await service.status()).installing).toBe(false)
    expect(requests).toHaveLength(1)
    expect(requests[0]).not.toContain('Private')
    await expect(service.install()).rejects.toThrow('Installazione')
    expect(requests).toHaveLength(2)
  } finally { await rm(root, { recursive: true, force: true }) }
})
