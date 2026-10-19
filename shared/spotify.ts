export const spotifyCallback = 'http://127.0.0.1:43821/callback'
export interface SpotifyConnection { clientId: string; connected: boolean; callback: string; libraryConnected?: boolean; preferredDeviceId?: string; computerName?: string }
export interface SpotifyDevice { id: string; name: string; active: boolean; type: string }
export interface SpotifyPlayback { playing: boolean; title: string; artists: string; deviceId: string | null; imageUrl?: string | null; uri?: string | null; progressMs?: number; durationMs?: number; volume?: number | null; canSetVolume?: boolean; observedAt?: number }
export type SpotifyCommand = 'play' | 'pause' | 'next' | 'previous' | 'transfer' | 'seek' | 'volume'
export type SpotifyLibraryKind = 'playlists' | 'tracks'
export interface SpotifyLibraryItem { uri: string; title: string; subtitle: string; imageUrl: string | null; kind: 'playlist' | 'track'; durationMs?: number }
export interface SpotifyLibraryPage { items: SpotifyLibraryItem[]; nextOffset: number | null }

export function spotifyImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && (url.hostname.endsWith('.scdn.co') || url.hostname.endsWith('.spotifycdn.com')) ? url.href : null } catch { return null }
}
export function validSpotifyUri(value: unknown): value is string { return typeof value === 'string' && /^spotify:(track|playlist|album):[A-Za-z0-9]{22}$/.test(value) }
export function spotifyItemUrl(uri: unknown): string {
  if (!validSpotifyUri(uri)) throw new Error('Elemento Spotify non valido.')
  const [, kind, id] = uri.split(':'); return `https://open.spotify.com/${kind}/${id}`
}
export function chooseSpotifyComputer(devices: SpotifyDevice[], playbackId?: string | null, preferredId?: string, computerName?: string): string {
  const match = (id?: string | null) => devices.find(device => device.id === id)?.id
  return match(preferredId) ?? devices.find(device => computerName && device.name.toLocaleLowerCase() === computerName.toLocaleLowerCase())?.id ?? match(playbackId) ?? devices.find(device => device.active)?.id ?? (devices.length === 1 ? devices[0].id : '')
}
