import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { SpotifyService } from '../../electron/main/spotify'
import { spotifyCallback, chooseSpotifyComputer, spotifyImageUrl, spotifyItemUrl } from '../../shared/spotify'

const folders: string[] = []
const vault = { available: () => true, encrypt: (value: string) => Buffer.from(value).toString('base64'), decrypt: (value: string) => Buffer.from(value, 'base64').toString() }
const id = 'a'.repeat(32)
afterEach(async () => { vi.useRealTimers(); await Promise.all(folders.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function fixture(request: typeof fetch, open = async (_url: string) => {}) {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-spotify-')); folders.push(root)
  const file = join(root, 'spotify.json')
  return { file, service: new SpotifyService(file, vault, open, request) }
}
async function connected(request: typeof fetch, expires = Date.now() + 3600000, scope = '') {
  const value = await fixture(request)
  await writeFile(value.file, JSON.stringify({ clientId: id, tokens: vault.encrypt(JSON.stringify({ access: 'synthetic-access', refresh: 'synthetic-refresh', expires, scope })) }))
  return value
}

it('PKCE reale loopback con state, verifier, scope minimi e token protetti; scollega senza token nel renderer', async () => {
  let authorize = new URL('https://example.org')
  const request = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).toBe('https://accounts.spotify.com/api/token')
    const body = options.body as URLSearchParams
    expect(body.get('code')).toBe('synthetic-code')
    expect(body.get('redirect_uri')).toBe(spotifyCallback)
    expect(body.has('client_secret')).toBe(false)
    expect(createHash('sha256').update(body.get('code_verifier')!).digest('base64url')).toBe(authorize.searchParams.get('code_challenge'))
    return Response.json({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600 })
  })
  const { service, file } = await fixture(request as typeof fetch, async url => {
    authorize = new URL(url)
    expect(authorize.searchParams.get('scope')).toBe('user-read-playback-state user-modify-playback-state')
    expect((await fetch(`${spotifyCallback}?state=invalid&code=bad`)).status).toBe(400)
    await fetch(`${spotifyCallback}?state=${authorize.searchParams.get('state')}&code=synthetic-code`)
  })
  await service.configure(id)
  expect(await service.login()).toMatchObject({ clientId: id, connected: true, callback: spotifyCallback, libraryConnected: false })
  const raw = await readFile(file, 'utf8')
  expect(raw).not.toContain('synthetic-access'); expect(raw).not.toContain('synthetic-refresh')
  expect(await service.disconnect()).toMatchObject({ connected: false })
  await expect(readFile(`${file}.bak`, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await service.status()).toMatchObject({ connected: false })
  expect(request).toHaveBeenCalledTimes(1)
})

it('scelta esplicita di un computer, 204 senza falso stato e comandi validati', async () => {
  const calls: { url: string; options: RequestInit }[] = []
  const { service } = await connected((async (url: string, options: RequestInit) => {
    calls.push({ url, options })
    if (url.endsWith('/devices')) return Response.json({ devices: [{ id: 'pc', name: 'PC', type: 'Computer', is_active: true, is_restricted: false }, { id: 'phone', type: 'Smartphone', is_restricted: false }, { id: 'restricted', type: 'Computer', is_restricted: true }] })
    return new Response(null, { status: 204 })
  }) as typeof fetch)
  expect(await service.devices()).toEqual([{ id: 'pc', name: 'PC', active: true, type: 'Computer' }])
  expect(await service.playback()).toBeNull()
  await expect(service.command('play', 'phone')).rejects.toThrow('computer')
  await expect(service.command('DELETE', 'pc')).rejects.toThrow('non valido')
  await service.command('transfer', 'pc')
  expect(calls.at(-1)).toMatchObject({ url: 'https://api.spotify.com/v1/me/player', options: { method: 'PUT', body: JSON.stringify({ device_ids: ['pc'], play: false }) } })
  await service.command('next', 'pc')
  expect(calls.at(-1)).toMatchObject({ url: 'https://api.spotify.com/v1/me/player/next?device_id=pc', options: { method: 'POST' } })
})

it('refresh serializzato, token nuovo e rotazione persistita senza Client Secret', async () => {
  let refreshes = 0
  const { service, file } = await connected((async (url: string, options: RequestInit) => {
    if (url.includes('/api/token')) { refreshes++; expect((options.body as URLSearchParams).has('client_secret')).toBe(false); return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }) }
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer new-access')
    return Response.json({ devices: [] })
  }) as typeof fetch, 1)
  await Promise.all([service.devices(), service.devices()])
  expect(refreshes).toBe(1)
  const raw = JSON.parse(await readFile(file, 'utf8'))
  expect(JSON.parse(vault.decrypt(raw.tokens)).refresh).toBe('new-refresh')
})

it('429 rispetta Retry-After senza martellare; 403 e rete non rivelano risposte private', async () => {
  const request = vi.fn(async () => new Response('private provider body', { status: 429, headers: { 'Retry-After': '60' } }))
  const { service } = await connected(request as typeof fetch)
  await expect(service.devices()).rejects.toThrow('Limite Spotify')
  await expect(service.devices()).rejects.toThrow('Limite Spotify')
  expect(request).toHaveBeenCalledTimes(1)
  const forbidden = await connected((async () => new Response('secret', { status: 403 })) as typeof fetch)
  await expect(forbidden.service.devices()).rejects.toThrow('Premium')
  const offline = await connected((async () => { throw new Error('secret URL token') }) as typeof fetch)
  await expect(offline.service.devices()).rejects.toThrow('non raggiungibile')
})

it('configurazione senza rete, Client ID valido, dati corrotti recuperabili e vault obbligatorio', async () => {
  const request = vi.fn()
  const { service, file } = await fixture(request)
  expect((await service.status()).connected).toBe(false)
  await expect(service.configure('secret')).rejects.toThrow('Client ID')
  await writeFile(file, '{broken')
  await expect(service.status()).rejects.toThrow('non leggibile')
  await service.configure(id)
  expect(request).not.toHaveBeenCalled()
  const unavailable = new SpotifyService(file, { ...vault, available: () => false }, async () => {}, request)
  await expect(unavailable.login()).rejects.toThrow('Protezione')
})

it('ricorda il computer preferito senza trasferire audio e preserva token dopo riapertura', async () => {
  const request = vi.fn(async () => Response.json({ devices: [{ id: 'pc', name: 'Study PC', type: 'Computer', is_active: false }] }))
  const { service, file } = await connected(request as typeof fetch)
  await service.selectDevice('pc')
  expect((await service.status()).preferredDeviceId).toBe('pc')
  const reopened = new SpotifyService(file, vault, async () => {}, request as typeof fetch)
  expect(await reopened.status()).toMatchObject({ preferredDeviceId: 'pc', connected: true })
  expect(JSON.parse(vault.decrypt(JSON.parse(await readFile(file, 'utf8')).tokens)).access).toBe('synthetic-access')
  expect(request).toHaveBeenCalledTimes(1)
  await expect(service.selectDevice('phone')).rejects.toThrow('computer')
})

it('sceglie preferito, nome locale e computer attivo senza indovinare fra computer inattivi', () => {
  const devices = [{ id: 'one', name: 'LOCAL-PC', active: false, type: 'Computer' }, { id: 'two', name: 'Other PC', active: true, type: 'Computer' }]
  expect(chooseSpotifyComputer(devices, 'two', 'one', 'LOCAL-PC')).toBe('one')
  expect(chooseSpotifyComputer(devices, 'two', undefined, 'local-pc')).toBe('one')
  expect(chooseSpotifyComputer(devices, 'phone')).toBe('two')
  expect(chooseSpotifyComputer(devices.map(item => ({ ...item, active: false })))).toBe('')
  expect(chooseSpotifyComputer([devices[0]])).toBe('one')
})

it('passa al PC inattivo soltanto al comando play e accetta URI playlist o traccia validati', async () => {
  const calls: { url: string; options: RequestInit }[] = []
  const { service } = await connected((async (url: string, options: RequestInit) => { calls.push({ url, options }); return url.endsWith('/devices') ? Response.json({ devices: [{ id: 'pc', name: 'PC', type: 'Computer', is_active: false }] }) : new Response(null, { status: 204 }) }) as typeof fetch)
  const uri = `spotify:playlist:${'a'.repeat(22)}`
  await service.playItem(uri, 'pc')
  expect(calls.map(call => call.options.method)).toEqual(['GET', 'PUT', 'PUT'])
  expect(calls[1].options.body).toBe(JSON.stringify({ device_ids: ['pc'], play: false }))
  expect(calls[2].options.body).toBe(JSON.stringify({ context_uri: uri }))
  await expect(service.playItem('https://evil.example', 'pc')).rejects.toThrow('non valido')
  await expect(service.command('volume', 'pc', 101)).rejects.toThrow('non valido')
  await expect(service.command('seek', 'pc', -1)).rejects.toThrow('non valido')
  await service.command('volume', 'pc', 40)
  expect(calls.at(-1)?.url).toContain('/volume?volume_percent=40&device_id=pc')
})

it('libreria con consenso aggiuntivo, paginazione limitata e URL immagini filtrati', async () => {
  const uri = `spotify:playlist:${'b'.repeat(22)}`
  const scopes = 'playlist-read-private playlist-read-collaborative user-library-read'
  const request = vi.fn(async () => Response.json({ items: [{ uri, name: 'Synthetic playlist', images: [{ url: 'https://i.scdn.co/image/test' }], owner: { display_name: 'Synthetic owner' } }, { uri: 'javascript:bad', name: 'Rejected' }], next: 'https://evil.example/untrusted-next' }))
  const { service } = await connected(request as typeof fetch, Date.now() + 3600000, scopes)
  expect((await service.status()).libraryConnected).toBe(true)
  expect(await service.library('playlists')).toMatchObject({ items: [{ uri, title: 'Synthetic playlist', imageUrl: 'https://i.scdn.co/image/test' }], nextOffset: 20 })
  expect(request.mock.calls[0]?.[0]).toBe('https://api.spotify.com/v1/me/playlists?limit=20&offset=0')
  const legacy = await connected(request as typeof fetch)
  await expect(legacy.service.library('tracks')).rejects.toThrow('Attiva playlist')
  await expect(service.library('tracks', -1)).rejects.toThrow('non valida')
  for (const url of ['http://i.scdn.co/image/x', 'https://i.scdn.co.evil.example/x', 'https://i.scdn.co@evil.example/x', 'file:///private', 'data:image/png;base64,abc']) expect(spotifyImageUrl(url)).toBeNull()
  expect(spotifyItemUrl(`spotify:track:${'c'.repeat(22)}`)).toBe(`https://open.spotify.com/track/${'c'.repeat(22)}`)
})

it('legge copertina durata posizione e volume dal player senza inviare comandi', async () => {
  const { service } = await connected((async () => Response.json({ is_playing: true, progress_ms: 43000, device: { id: 'pc', volume_percent: 30, supports_volume: true }, item: { uri: `spotify:track:${'a'.repeat(22)}`, name: 'Synthetic track', duration_ms: 240000, artists: [{ name: 'Synthetic artist' }], album: { images: [{ url: 'https://i.scdn.co/image/cover' }] } } })) as typeof fetch)
  expect(await service.playback()).toMatchObject({ playing: true, progressMs: 43000, durationMs: 240000, volume: 30, imageUrl: 'https://i.scdn.co/image/cover', artists: 'Synthetic artist' })
})

it('autorizzazione libreria esplicita e scope mantenuti dopo refresh senza scope nella risposta', async () => {
  let authorized = false
  const scopes = 'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-library-read'
  const { service } = await fixture((async () => Response.json({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600 })) as typeof fetch, async url => {
    const authorize = new URL(url); expect(authorize.searchParams.get('scope')).toBe(scopes); authorized = true
    await fetch(`${spotifyCallback}?state=${authorize.searchParams.get('state')}&code=synthetic-code`)
  })
  await service.configure(id)
  expect(authorized).toBe(false)
  expect(await service.login(true)).toMatchObject({ connected: true, libraryConnected: true })
  const refreshed = await connected((async (url: string) => url.includes('/api/token') ? Response.json({ access_token: 'new', expires_in: 3600 }) : Response.json({ devices: [] })) as typeof fetch, 1, scopes)
  await refreshed.service.devices()
  expect((await refreshed.service.status()).libraryConnected).toBe(true)
})
