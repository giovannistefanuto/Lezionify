import { useSyncExternalStore } from 'react'

type Playback = { videoId: string | null; playing: boolean; error: string | null }
let state: Playback = { videoId: null, playing: false, error: null }
let audio: HTMLAudioElement | null = null
let version = 0, listening = false, lecturePlaying = false
const listeners = new Set<() => void>()
const publish = (patch: Partial<Playback>) => { state = { ...state, ...patch }; for (const listener of listeners) listener() }
export function pauseYoutubeAudio() { version++; audio?.pause(); publish({ playing: false }) }
export function youtubeAudioElement(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(); audio.controls = true; audio.loop = true; audio.preload = 'metadata'
    audio.setAttribute('aria-label', 'Lettore YouTube locale')
    try { audio.volume = Math.min(1, Math.max(0, Number(localStorage.getItem('lezionify:youtube-volume') ?? '0.5'))) } catch { audio.volume = 0.5 }
    audio.addEventListener('volumechange', () => { try { localStorage.setItem('lezionify:youtube-volume', String(audio!.volume)) } catch { /* In-memory control remains available. */ } })
    audio.addEventListener('play', () => {
      if (lecturePlaying) { audio!.pause(); publish({ playing: false, error: 'Metti in pausa la lezione prima di avviare il sottofondo.' }); return }
      window.dispatchEvent(new CustomEvent('lezionify:background-playback', { detail: { source: 'youtube' } }))
      publish({ playing: true, error: null })
    })
    audio.addEventListener('pause', () => publish({ playing: false }))
    audio.addEventListener('error', () => publish({ playing: false, error: 'Audio locale non riproducibile. Scarica nuovamente la compilation se il file è stato modificato.' }))
  }
  if (!listening) {
    listening = true
    window.addEventListener('lezionify:lecture-playback', event => { lecturePlaying = Boolean((event as CustomEvent).detail?.playing); if (lecturePlaying) pauseYoutubeAudio() })
    window.addEventListener('lezionify:background-playback', event => { if ((event as CustomEvent).detail?.source !== 'youtube') pauseYoutubeAudio() })
  }
  return audio
}
export async function playYoutubeAudio(videoId: string, start = 0): Promise<void> {
  const element = youtubeAudioElement(), request = ++version
  publish({ error: null })
  if (lecturePlaying || [...document.querySelectorAll<HTMLAudioElement>('.persistent-audio-player audio')].some(item => !item.paused)) {
    publish({ error: 'Metti in pausa la lezione prima di avviare il sottofondo.' }); return
  }
  try {
    const url = await window.archive.youtubeAudio.playbackUrl(videoId)
    if (request !== version) return
    if (url !== `media://youtube/${videoId}`) throw new Error('URL audio locale non valido.')
    const seek = () => { if (request === version) element.currentTime = Math.min(start, Number.isFinite(element.duration) ? Math.max(0, element.duration - 0.05) : start) }
    if (state.videoId !== videoId || element.src !== url) {
      element.pause(); element.src = url
      element.addEventListener('loadedmetadata', seek, { once: true })
    } else seek()
    publish({ videoId })
    await element.play()
  } catch (error) { if (request === version) publish({ playing: false, error: error instanceof Error ? error.message : 'Riproduzione locale non riuscita.' }) }
}
export function useYoutubePlayback() {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback) } }, () => state)
}
