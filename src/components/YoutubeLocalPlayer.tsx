import { useEffect, useRef } from 'react'
import catalog from '../../shared/musicCatalog.json'
import { useYoutubePlayback, youtubeAudioElement } from '../utils/youtubePlayback'

export function YoutubeLocalPlayer() {
  const state = useYoutubePlayback()
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = youtubeAudioElement(), container = host.current
    container?.appendChild(element)
    return () => { if (element.parentNode === container) container?.removeChild(element) }
  }, [])
  return <section className="youtube-local-player" aria-label="Riproduzione locale YouTube" hidden={!state.videoId && !state.error}>
    {state.videoId && <p><strong>{state.playing ? 'In riproduzione' : 'In pausa'}</strong> · {catalog.find(item => item.videoId === state.videoId)?.title}</p>}
    <div ref={host} />
    {state.error && <p className="music-error" role="alert">{state.error}</p>}
  </section>
}
