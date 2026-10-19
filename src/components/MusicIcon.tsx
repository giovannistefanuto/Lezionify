import type { CSSProperties } from 'react'
const paths = {
  play: 'M8 5v14l11-7z', pause: 'M6 5h4v14H6z M14 5h4v14h-4z',
  previous: 'M6 5v14 M18 5l-10 7 10 7z', next: 'M18 5v14 M6 5l10 7-10 7z',
  volume: 'M11 5L6 9H3v6h3l5 4z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14',
  computer: 'M3 4h18v12H3z M8 20h8 M12 16v4', refresh: 'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M19 16a8 8 0 0 1-13 3l-2-3',
  external: 'M14 3h7v7 M21 3L10 14 M11 5H4v15h15v-7', close: 'M6 6l12 12 M18 6L6 18',
  music: 'M9 18V5l12-2v13 M9 7l12-2 M9 18c0 3-6 4-6 1 0-2 6-4 6-1 M21 16c0 3-6 4-6 1 0-2 6-4 6-1',
  heart: 'M12 21L3 12C-3 4 7-1 12 6c5-7 15-2 9 6z', back: 'M15 5l-7 7 7 7', search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', check: 'M5 12l4 4L19 6'
}
export function MusicIcon({ name, size = 20, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={['play', 'pause', 'heart'].includes(name) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>
}
