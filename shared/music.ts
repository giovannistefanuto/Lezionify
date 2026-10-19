export interface MusicTrack { start: number; title: string }
export function formatMusicTimestamp(seconds: number): string {
  return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
export function validateMusicTracks(value: unknown): asserts value is MusicTrack[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('Massimo 200 tracce per video.')
  let previous = -1
  for (const item of value) {
    if (!item || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 240 || !Number.isInteger(item.start) || item.start < 0 || item.start > 86400 || item.start <= previous) throw new Error('Inserisci titoli e timestamp validi in ordine crescente, senza duplicati (massimo 24 ore).')
    previous = item.start
  }
}
export function parseMusicTracks(text: string): MusicTrack[] {
  if (text.length > 60000) throw new Error('Elenco troppo lungo.')
  const tracks = text.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const match = line.match(/^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+?)\s*$/)
    if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error('Formato richiesto: 00:00 Titolo, oppure 1:00:00 Titolo.')
    return { start: Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]), title: match[4] }
  })
  validateMusicTracks(tracks); return tracks
}
export function compilationUrl(videoId: unknown, start: unknown): string {
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || typeof start !== 'number' || !Number.isInteger(start) || start < 0 || start > 86400) throw new Error('Video o timestamp non valido.')
  return `https://www.youtube.com/watch?v=${videoId}&t=${start}s`
}
