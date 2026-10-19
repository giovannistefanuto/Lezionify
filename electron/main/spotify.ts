import { createServer } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import { hostname } from 'node:os'
import { atomicWrite } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { spotifyCallback, spotifyImageUrl, validSpotifyUri, type SpotifyCommand, type SpotifyConnection, type SpotifyDevice, type SpotifyPlayback, type SpotifyLibraryPage } from '../../shared/spotify'

interface Tokens { access: string; refresh: string; expires: number; scope?: string }
interface Config { clientId: string; tokens?: string; preferredDeviceId?: string }
interface Vault { available: () => boolean; encrypt: (value: string) => string; decrypt: (value: string) => string }
interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }
const playerScope = 'user-read-playback-state user-modify-playback-state'
const libraryScopes = ['playlist-read-private', 'playlist-read-collaborative', 'user-library-read']
interface ApiItem { uri?: string; name?: string; artists?: { name?: string }[]; images?: { url?: string }[]; album?: { images?: { url?: string }[] }; owner?: { display_name?: string }; tracks?: { total?: number }; duration_ms?: number }
interface DeviceResponse { devices?: { id: string | null; name: string; type: string; is_active: boolean; is_restricted: boolean }[] }
export class SpotifyService {
  private readonly mutex = new AsyncMutex()
  private cancelLogin: (() => void) | null = null
  private refreshPending: Promise<Tokens> | null = null
  private blockedUntil = 0
  private loginPending = false
  constructor(private file: string, private vault: Vault, private open: (url: string) => Promise<void>, private request: typeof fetch = fetch) {}
  private async config(): Promise<Config> {
    try { const value = JSON.parse(await readFile(this.file, 'utf8')) as Config; if (value.clientId !== '' && !/^[a-f0-9]{32}$/i.test(value.clientId)) throw new Error('config'); return value }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { clientId: '' }
      // eslint-disable-next-line preserve-caught-error -- Never attach credential-file parse errors to IPC errors.
      throw new Error('Configurazione Spotify non leggibile. Salva nuovamente il Client ID.')
    }
  }
  async status(): Promise<SpotifyConnection> {
    const value = await this.config()
    let libraryConnected = false
    try { if (value.tokens && this.vault.available()) { const tokens = JSON.parse(this.vault.decrypt(value.tokens)) as Tokens; libraryConnected = libraryScopes.every(scope => tokens.scope?.split(' ').includes(scope)) } } catch { /* Keep credentials private; reconnect will report errors. */ }
    return { clientId: value.clientId, connected: Boolean(value.tokens), callback: spotifyCallback, libraryConnected, preferredDeviceId: value.preferredDeviceId, computerName: hostname() }
  }
  async configure(clientId: unknown) {
    if (typeof clientId !== 'string' || !/^[a-f0-9]{32}$/i.test(clientId)) throw new Error('Client ID Spotify non valido: sono richiesti 32 caratteri esadecimali.')
    this.cancelLogin?.()
    return this.mutex.runExclusive(async () => { let old: Config; try { old = await this.config() } catch { old = { clientId: '' } } await atomicWrite(this.file, JSON.stringify(old.clientId === clientId ? old : { clientId })); if (old.clientId !== clientId) await rm(`${this.file}.bak`, { force: true }); return this.status() })
  }
  async disconnect() {
    this.cancelLogin?.()
    return this.mutex.runExclusive(async () => { const value = await this.config(); await atomicWrite(this.file, JSON.stringify({ clientId: value.clientId })); await rm(`${this.file}.bak`, { force: true }); return this.status() })
  }
  private async exchange(body: URLSearchParams): Promise<TokenResponse> {
    try {
      const response = await this.request('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000), redirect: 'error' })
      if (!response.ok) throw new Error('token')
      const value = await response.json() as TokenResponse
      if (typeof value.access_token !== 'string' || !Number.isFinite(value.expires_in) || value.expires_in! <= 0) throw new Error('token')
      return value
    } catch { throw new Error('Autorizzazione Spotify non riuscita o scaduta. Collega nuovamente l’account.') }
  }
  private async persist(config: Config, result: TokenResponse, previousRefresh?: string, previousScope?: string): Promise<Tokens> {
    const refresh = result.refresh_token ?? previousRefresh
    if (!refresh || !this.vault.available()) throw new Error('Protezione delle credenziali non disponibile: account non salvato.')
    const tokens = { access: result.access_token!, refresh, expires: Date.now() + result.expires_in! * 1000 }
    const current = await this.config()
    const scopedTokens = { ...tokens, scope: result.scope ?? previousScope }
    await atomicWrite(this.file, JSON.stringify({ ...current, clientId: config.clientId, tokens: this.vault.encrypt(JSON.stringify(scopedTokens)) }))
    return scopedTokens
  }
  async login(includeLibrary = false): Promise<SpotifyConnection> {
    if (this.loginPending) throw new Error('Collegamento Spotify già in corso.')
    this.loginPending = true
    try { return await this.performLogin(includeLibrary) } finally { this.loginPending = false }
  }
  private async performLogin(includeLibrary: boolean): Promise<SpotifyConnection> {
    if (!this.vault.available()) throw new Error('Protezione delle credenziali non disponibile su questo sistema.')
    const config = await this.config()
    if (!config.clientId) throw new Error('Configura prima il Client ID Spotify.')
    const verifier = randomBytes(48).toString('base64url'), state = randomBytes(24).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const scope = includeLibrary ? `${playerScope} ${libraryScopes.join(' ')}` : playerScope
    let cancelled = false
    const code = await new Promise<string>((resolve, reject) => {
      let settled = false
      const server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', spotifyCallback)
        if (request.method !== 'GET' || url.pathname !== '/callback' || url.searchParams.get('state') !== state) { response.writeHead(400); response.end('Richiesta non valida.'); return }
        const value = url.searchParams.get('code')
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
        response.end('Puoi tornare a Lezionify.', () => { if (!value || value.length > 2048 || url.searchParams.has('error')) finish('Autorizzazione Spotify annullata.'); else finish(undefined, value) })
      })
      server.headersTimeout = 5000; server.requestTimeout = 5000
      const finish = (error?: string, value?: string) => { if (settled) return; settled = true; clearTimeout(timer); server.close(); server.closeAllConnections(); this.cancelLogin = null; if (error) reject(new Error(error)); else resolve(value!) }
      const timer = setTimeout(() => finish('Collegamento Spotify scaduto. Riprova.'), 120000)
      this.cancelLogin = () => { cancelled = true; finish('Collegamento Spotify annullato.') }
      server.once('error', () => finish('Callback Spotify non disponibile: la porta 43821 potrebbe essere occupata.'))
      server.listen(43821, '127.0.0.1', () => {
        const params = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: spotifyCallback, code_challenge_method: 'S256', code_challenge: challenge, state, scope })
        void this.open(`https://accounts.spotify.com/authorize?${params}`).catch(() => finish('Impossibile aprire il browser per Spotify.'))
      })
    })
    return this.mutex.runExclusive(async () => {
      const current = await this.config()
      if (cancelled || current.clientId !== config.clientId) throw new Error('Configurazione Spotify cambiata: ripeti il collegamento.')
      const result = await this.exchange(new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, code, redirect_uri: spotifyCallback, code_verifier: verifier }))
      await this.persist(config, result, undefined, scope); return this.status()
    })
  }
  private async token(force = false): Promise<Tokens> {
    if (this.refreshPending) return this.refreshPending
    const config = await this.config()
    if (!config.tokens || !this.vault.available()) throw new Error('Collega l’account Spotify nelle impostazioni.')
    let tokens: Tokens
    try { tokens = JSON.parse(this.vault.decrypt(config.tokens)) as Tokens; if (!tokens.access || !tokens.refresh || !Number.isFinite(tokens.expires)) throw new Error('token') }
    catch { throw new Error('Credenziali Spotify non leggibili. Scollega e collega nuovamente l’account.') }
    if (!force && tokens.expires > Date.now() + 30000) return tokens
    this.refreshPending = this.mutex.runExclusive(async () => {
      const current = await this.config()
      if (current.clientId !== config.clientId || !current.tokens) throw new Error('Collegamento Spotify cambiato. Riprova.')
      if (current.tokens !== config.tokens) {
        try { return JSON.parse(this.vault.decrypt(current.tokens)) as Tokens } catch { throw new Error('Collegamento Spotify cambiato. Riprova.') }
      }
      return this.persist(config, await this.exchange(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: config.clientId })), tokens.refresh, tokens.scope)
    }).finally(() => { this.refreshPending = null })
    return this.refreshPending
  }
  private async api(path: string, method = 'GET', body?: object, retry = true, resource = false): Promise<unknown> {
    if (Date.now() < this.blockedUntil) throw new Error('Limite Spotify raggiunto. Attendi prima di riprovare.')
    const tokens = await this.token()
    let response: Response
    try { response = await this.request(`https://api.spotify.com/v1${resource ? path : `/me/player${path}`}`, { method, headers: { Authorization: `Bearer ${tokens.access}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000), redirect: 'error' }) }
    catch { throw new Error('Spotify non raggiungibile. Controlla la rete; puoi continuare dal client Spotify.') }
    if (response.status === 401 && retry) { await this.token(true); return this.api(path, method, body, false, resource) }
    if (response.status === 429) { const seconds = Number(response.headers.get('retry-after')); this.blockedUntil = Date.now() + (Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : 30) * 1000; throw new Error('Limite Spotify raggiunto. Attendi prima di riprovare.') }
    if (response.status === 403) throw new Error('Spotify non consente questo comando: controlla Premium, utenti autorizzati e quota dell’app nel Developer Dashboard.')
    if (response.status === 404) throw new Error('Apri Spotify sul PC, avvia un brano e aggiorna i dispositivi.')
    if (!response.ok) throw new Error('Comando Spotify non riuscito. Riprova dal client ufficiale.')
    if (response.status === 204) return null
    try { return await response.json() } catch { throw new Error('Risposta Spotify non leggibile. Riprova.') }
  }
  async devices(): Promise<SpotifyDevice[]> {
    const result = await this.api('/devices') as DeviceResponse
    return (Array.isArray(result?.devices) ? result.devices : []).filter(device => typeof device.id === 'string' && !device.is_restricted && device.type === 'Computer').map(device => ({ id: device.id!, name: String(device.name).slice(0, 200), active: Boolean(device.is_active), type: device.type }))
  }
  async playback(): Promise<SpotifyPlayback | null> {
    const value = await this.api('') as { is_playing?: boolean; progress_ms?: number; device?: { id?: string; volume_percent?: number; supports_volume?: boolean }; item?: ApiItem } | null
    if (!value) return null
    return { playing: Boolean(value.is_playing), deviceId: value.device?.id ?? null, title: String(value.item?.name ?? '').slice(0, 500), artists: (Array.isArray(value.item?.artists) ? value.item.artists.map(item => item.name).join(', ') : '').slice(0, 500), imageUrl: spotifyImageUrl(value.item?.album?.images?.[0]?.url), uri: validSpotifyUri(value.item?.uri) ? value.item.uri : null, progressMs: Math.max(0, Number(value.progress_ms) || 0), durationMs: Math.max(0, Number(value.item?.duration_ms) || 0), volume: typeof value.device?.volume_percent === 'number' ? value.device.volume_percent : null, canSetVolume: value.device?.supports_volume !== false, observedAt: Date.now() }
  }
  async selectDevice(deviceId: unknown): Promise<SpotifyConnection> {
    if (typeof deviceId !== 'string' || !(await this.devices()).some(device => device.id === deviceId)) throw new Error('Seleziona un computer disponibile nell’elenco Spotify.')
    return this.mutex.runExclusive(async () => { const value = await this.config(); await atomicWrite(this.file, JSON.stringify({ ...value, preferredDeviceId: deviceId })); return this.status() })
  }
  async library(kind: unknown, offset: unknown = 0): Promise<SpotifyLibraryPage> {
    if (!['playlists', 'tracks'].includes(String(kind)) || typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0 || offset > 10000) throw new Error('Richiesta libreria Spotify non valida.')
    if (!(await this.status()).libraryConnected) throw new Error('Attiva playlist e preferiti per autorizzare la lettura della tua libreria Spotify.')
    const page = await this.api(`/me/${kind}?limit=20&offset=${offset}`, 'GET', undefined, true, true) as { items?: (ApiItem | { track?: ApiItem })[]; next?: string | null }
    const items: SpotifyLibraryPage['items'] = []
    for (const raw of (Array.isArray(page?.items) ? page.items : []).slice(0, 20)) {
      const value = kind === 'tracks' ? (raw as { track?: ApiItem })?.track : raw as ApiItem
      if (!value || !validSpotifyUri(value.uri) || !value.uri.startsWith(kind === 'tracks' ? 'spotify:track:' : 'spotify:playlist:')) continue
      items.push({ uri: value.uri, kind: kind === 'tracks' ? 'track' : 'playlist', title: String(value.name ?? '').slice(0, 500), subtitle: kind === 'tracks' ? (value.artists ?? []).map(item => item.name).join(', ').slice(0, 500) : String(value.owner?.display_name ?? 'Playlist').slice(0, 200), imageUrl: spotifyImageUrl((kind === 'tracks' ? value.album?.images : value.images)?.[0]?.url), durationMs: Math.max(0, Number(value.duration_ms) || 0) })
    }
    return { items, nextOffset: page?.next && offset < 10000 ? offset + 20 : null }
  }
  async playItem(uri: unknown, deviceId: unknown): Promise<void> {
    if (!validSpotifyUri(uri)) throw new Error('Elemento Spotify non valido.')
    await this.command('play', deviceId, uri)
  }
  async command(command: unknown, deviceId: unknown, argument?: unknown): Promise<void> {
    if (typeof command !== 'string' || !['play', 'pause', 'next', 'previous', 'transfer', 'seek', 'volume'].includes(command) || typeof deviceId !== 'string' || deviceId.length > 200) throw new Error('Comando o dispositivo Spotify non valido.')
    if (command === 'play' && argument !== undefined && !validSpotifyUri(argument)) throw new Error('Elemento Spotify non valido.')
    if (['seek', 'volume'].includes(command) && (typeof argument !== 'number' || !Number.isInteger(argument) || argument < 0 || argument > (command === 'volume' ? 100 : 86400000))) throw new Error('Posizione o volume Spotify non valido.')
    const device = (await this.devices()).find(device => device.id === deviceId)
    if (!device) throw new Error('Seleziona un computer disponibile nell’elenco Spotify.')
    if (command === 'transfer') { await this.api('', 'PUT', { device_ids: [deviceId], play: false }); return }
    if (command === 'play' && !device.active) await this.api('', 'PUT', { device_ids: [deviceId], play: false })
    if (command === 'seek' || command === 'volume') { await this.api(`/${command}?${command === 'seek' ? 'position_ms' : 'volume_percent'}=${argument}&device_id=${encodeURIComponent(deviceId)}`, 'PUT'); return }
    const operation = command as SpotifyCommand
    const body = command === 'play' && validSpotifyUri(argument) ? (argument.startsWith('spotify:track:') ? { uris: [argument] } : { context_uri: argument }) : undefined
    await this.api(`/${operation}?device_id=${encodeURIComponent(deviceId)}`, ['next', 'previous'].includes(operation) ? 'POST' : 'PUT', body)
  }
  dispose() { this.cancelLogin?.() }
}
