import { act } from 'react'
import type { Root } from 'react-dom/client'
import { MusicDialog } from '../../src/components/MusicButton'
import { SpotifyPanel } from '../../src/components/SpotifyPanel'
import { OfflineTranslationSettings } from '../../src/components/OfflineTranslationSettings'
import { YoutubeLibrary } from '../../src/components/YoutubeLibrary'
import { ToolSettingsContext } from '../../src/components/ToolSettingsContext'
import { runToolSettingsScenarios } from './toolSettingsScenarios.browser'
import { spotifyCallback } from '../../shared/spotify'
declare const require: any

export async function runMusicTranslationScenarios(root: Root, api: any) {
  const keys = ['connectSpotifyLibrary', 'selectSpotifyDevice', 'spotifyLibrary', 'playSpotifyItem', 'openSpotifyItem', 'spotifyConnection', 'configureSpotify', 'connectSpotify', 'disconnectSpotify', 'spotifyDevices', 'spotifyPlayback', 'spotifyCommand', 'openSpotify', 'openCompilation', 'offlineTranslationStatus', 'installOfflineTranslation', 'translatePhrase']
  const originals = Object.fromEntries(keys.map(key => [key, api[key]]))
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  const click = async (label: string) => { const button = [...document.querySelectorAll('button')].find(element => element.textContent?.trim() === label || element.getAttribute('aria-label') === label); check(button, `Missing ${label}`); await act(async () => button!.click()); await flush() }
  const change = async (selector: string, value: string) => {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    check(element, `Missing ${selector}`)
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })) })
  }
  let connected = false
  let configured = ''
  let failure = false
  let libraryConnected = false
  let preferredDeviceId = ''
  const openedSettings: string[] = []
  let installed = false
  let installs = 0
  let reads = 0
  let libraryReads = 0
  const cover = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#4b4536"/><stop offset="1" stop-color="#c39b4e"/></linearGradient></defs><rect width="300" height="300" fill="url(#a)"/><circle cx="150" cy="150" r="95" fill="none" stroke="#f2dfad" stroke-width="1"/><text x="150" y="142" text-anchor="middle" font-family="serif" font-size="30" fill="#fff7df">CLASSICAL</text><text x="150" y="178" text-anchor="middle" font-family="serif" font-size="23" fill="#fff7df">COLLECTION</text></svg>')
  const commands: any[] = [], videos: any[] = [], phrases: any[] = []
  const connection = () => ({ clientId: configured, connected, libraryConnected, preferredDeviceId, computerName: 'Study PC', callback: spotifyCallback })
  Object.assign(api, {
    spotifyConnection: async () => connection(), configureSpotify: async (id: string) => { configured = id; return connection() },
    connectSpotify: async () => { connected = true; return connection() }, disconnectSpotify: async () => { connected = false; return connection() },
    spotifyDevices: async () => { reads++; return [{ id: 'pc', name: 'Study PC', type: 'Computer', active: true }] }, spotifyPlayback: async () => ({ playing: true, title: 'Synthetic song', artists: 'Synthetic artist', deviceId: 'pc', imageUrl: cover, uri: 'spotify:track:' + 'a'.repeat(22), observedAt: Date.now(), progressMs: 43000, durationMs: 240000, volume: 40, canSetVolume: true }),
    connectSpotifyLibrary: async () => { libraryConnected = true; return connection() }, selectSpotifyDevice: async (id: string) => { preferredDeviceId = id; return connection() },
    spotifyLibrary: async (kind: string, offset = 0) => { libraryReads++; return { items: Array.from({ length: 4 }, (_, index) => ({ kind: kind === 'tracks' ? 'track' : 'playlist', uri: `spotify:${kind === 'tracks' ? 'track' : 'playlist'}:${String.fromCharCode(97 + index).repeat(22)}`, title: ['Classical Study', 'Piano essentials', 'Calm evenings', 'Focus collection'][index], subtitle: 'Synthetic collection', imageUrl: cover })), nextOffset: offset === 0 ? 20 : null } },
    playSpotifyItem: async (...args: any[]) => { commands.push(['item', ...args]) }, openSpotifyItem: async () => {},
    spotifyCommand: async (...args: any[]) => { if (failure) throw new Error('Limite Spotify raggiunto. Attendi prima di riprovare.'); commands.push(args) }, openSpotify: async () => {},
    openCompilation: async (...args: any[]) => { videos.push(args) }, offlineTranslationStatus: async () => ({ installed, installing: false, downloadBytes: 53000000, diskBytes: 74000000 }),
    installOfflineTranslation: async () => { installed = true; installs++; return { installed: true, installing: false, downloadBytes: 53000000, diskBytes: 74000000 } }, translatePhrase: async (...args: any[]) => { phrases.push(args); return { text: 'Lo studente legge $x_i$.', engine: 'Mozilla/Bergamot', direction: args[1] } }
  })
  const nativeInterval = window.setInterval, nativeClear = window.clearInterval
  const polls = new Map<number, () => void>()
  let timerId = 800000
  window.setInterval = ((handler: () => void, ms: number, ...args: any[]) => { if (ms === 10000) { polls.set(++timerId, handler); return timerId } return nativeInterval(handler, ms, ...args) }) as typeof window.setInterval
  window.clearInterval = ((id: number) => { if (!polls.delete(id)) nativeClear(id) }) as typeof window.clearInterval
  const navigationKeys = ['lezionify:music-source:v1', 'lezionify:spotify-library-view:v1']
  const navigationSaved = navigationKeys.map(key => localStorage.getItem(key))
  navigationKeys.forEach(key => localStorage.removeItem(key))
  const previousSelection = localStorage.getItem('lezionify:music-youtube-selection:v1')
  localStorage.removeItem('lezionify:music-youtube-selection:v1')
  const previous = localStorage.getItem('lezionify:compilation-tracks:v1')
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.append(style)
  const previousTheme = document.documentElement.getAttribute('data-theme')
  localStorage.removeItem('lezionify:compilation-tracks:v1')
  try {
    await act(async () => root.render(<OfflineTranslationSettings />)); await flush()
    check(installs === 0 && phrases.length === 0, 'Opening settings must not install models or translate')
    await click('Scarica / ripara modelli offline')
    check(installs === 1 && installed && document.body.textContent?.includes('Modelli installati'), 'Explicit settings download must update model status')
    await act(async () => root.render(<SpotifyPanel configuration />)); await flush()
    await change('input[aria-label="Client ID Spotify"]', 'a'.repeat(32)); await click('Salva Client ID'); await click('Collega account Spotify')
    check(configured.length === 32 && connected, 'Spotify configuration/login missing')
    await act(async () => root.render(<ToolSettingsContext.Provider value={{ isOpen: false, open: section => { openedSettings.push(section) } }}><MusicDialog onClose={() => {}} /></ToolSettingsContext.Provider>)); await flush()
    check(getComputedStyle(document.querySelector('.music-backdrop')!).position === 'fixed', 'Music dialog must overlay the viewport')
    const bounds = document.querySelector('.music-dialog')!.getBoundingClientRect()
    check(bounds.width <= window.innerWidth && bounds.height <= window.innerHeight && bounds.left >= 0, 'Music dialog must fit the viewport')
    check(reads > 0 && document.querySelector('[aria-label="Stato riproduzione Spotify"]')?.textContent?.includes('Synthetic song'), 'Playback must load automatically on opening')
    check((document.querySelector('select[aria-label="Computer Spotify"]') as HTMLSelectElement).value === 'pc', 'Only available PC must be selected automatically')
    check(commands.length === 0, 'Opening Music must not transfer or start playback')
    const beforePoll = reads
    await act(async () => { for (const poll of polls.values()) poll() }); await flush()
    check(reads === beforePoll + 1, 'Visible player must refresh automatically')
    check(libraryReads === 0, 'Library requires additional explicit consent')
    await click('Apri Impostazioni musica')
    check(openedSettings.at(-1) === 'music' && !libraryConnected, 'Daily player must route consent to settings without authorizing')
    await act(async () => root.render(<SpotifyPanel configuration />)); await flush(); await click('Attiva playlist e preferiti')
    await act(async () => root.render(<ToolSettingsContext.Provider value={{ isOpen: false, open: section => { openedSettings.push(section) } }}><MusicDialog onClose={() => {}} /></ToolSettingsContext.Provider>)); await flush()
    check(libraryReads > 0 && document.querySelectorAll('.spotify-library-card').length === 4, 'Library cards must load after consent')
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke('capture-video-import', `music-${theme}`)
    }
    await click('Riproduci Classical Study')
    check(commands[0][0] === 'item' && commands[0][2] === 'pc', 'Card must play on selected PC')
    check(document.body.textContent?.includes('Comando inviato'), 'Command acceptance must remain distinct from playback state')
    await click('Successivo')
    check(commands.at(-1)[0] === 'next' && commands.at(-1)[1] === 'pc', 'Wrong Spotify target')
    failure = true; await click('Pausa'); check(document.querySelector('[role="alert"]')?.textContent?.includes('Limite Spotify'), 'Recoverable Spotify errors missing')
    failure = false
    await click('Brani che ti piacciono'); await click('Pagina successiva →')
    check(document.querySelector('[aria-label="Raccolta Spotify"] button[aria-pressed="true"]')?.textContent?.includes('Brani'), 'Spotify library must switch to saved tracks')
    await click('YouTube')
    check(polls.size === 0, 'Switching away from Spotify must stop polling')
    check(document.querySelectorAll('.youtube-collection-card').length === 6, 'Six preview cards missing')
    check(document.querySelectorAll('.music-track-list li').length === 31, 'Bundled classical tracklist must contain 31 entries')
    const track = document.querySelectorAll('.music-track-list button')[1] as HTMLButtonElement
    await act(async () => track.click()); check(videos[0][0] === 'mdJU5ogrPMY' && videos[0][1] > 0, 'Track selection must open selected timestamp')
    check(document.body.textContent?.includes('Aperto su YouTube'), 'External playback must not be labelled as confirmed playing')
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke('capture-video-import', `music-youtube-${theme}`)
    }
    check(![...document.querySelectorAll('button')].some(button => button.textContent === 'Modifica titoli e timestamp'), 'Timestamp editor must not remain in daily playback')
    await click('Gestisci timestamp nelle Impostazioni'); check(openedSettings.at(-1) === 'music', 'Timestamp management must point to music settings')
    await act(async () => root.render(<YoutubeLibrary configuration />)); await flush()
    await click('Modifica titoli e timestamp'); await change('textarea[aria-label="Titoli e timestamp"]', '00:00 Prima\n00:00 Duplicata'); await click('Salva timestamp sul PC')
    check(Boolean(document.querySelector('[role="alert"]')), 'Invalid tracklist must be reported')
    await change('textarea[aria-label="Titoli e timestamp"]', '00:00 Prima\n01:30 Seconda'); await click('Salva timestamp sul PC')
    check(document.querySelector('[aria-label="Timestamp YouTube"]')?.textContent?.includes('2 tracce'), 'Track edits missing in settings')
    await act(async () => root.render(null)); await act(async () => root.render(<ToolSettingsContext.Provider value={{ isOpen: false, open: section => { openedSettings.push(section) } }}><MusicDialog onClose={() => {}} /></ToolSettingsContext.Provider>)); await flush()
    check(Boolean(document.querySelector('.youtube-library')), 'Reopening from another view must keep YouTube selected')
    await click('Spotify')
    check((document.querySelector('select[aria-label="Computer Spotify"]') as HTMLSelectElement).value === 'pc', 'Computer must be selected after reopening')
    check(document.querySelector('[aria-label="Raccolta Spotify"] button[aria-pressed="true"]')?.textContent?.includes('Brani') && document.body.textContent?.includes('Pagina precedente'), 'Spotify section and page must survive reopening')
    check(polls.size === 1, 'Reopening must create exactly one playback poll')
    await click('YouTube')
    check(document.querySelectorAll('.music-track-list li').length === 2, 'Local timestamp edits must survive reopen')
    await runToolSettingsScenarios(root, api)
  } finally {
    await act(async () => root.render(null)); check(polls.size === 0, 'Closing Music must clear polling timers'); window.setInterval = nativeInterval; window.clearInterval = nativeClear; Object.assign(api, originals)
    navigationKeys.forEach((key, index) => { const value = navigationSaved[index]; if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) })
    style.remove()
    if (previousSelection === null) localStorage.removeItem('lezionify:music-youtube-selection:v1'); else localStorage.setItem('lezionify:music-youtube-selection:v1', previousSelection)
    if (previousTheme === null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', previousTheme)
    if (previous === null) localStorage.removeItem('lezionify:compilation-tracks:v1'); else localStorage.setItem('lezionify:compilation-tracks:v1', previous)
  }
}
