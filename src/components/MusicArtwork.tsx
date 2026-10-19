import { useState } from 'react'
import { MusicIcon } from './MusicIcon'

export function MusicArtwork({ src, title, wide = false }: { src?: string | null; title: string; wide?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  return <div className={`music-artwork${wide ? ' is-wide' : ''}`}>
    {src && failed !== src ? <img src={src} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)} /> : <span className="music-artwork-placeholder"><MusicIcon name="music" size={36} /></span>}
  </div>
}
