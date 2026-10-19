import { expect, it } from 'vitest'
import { compilationUrl, formatMusicTimestamp, parseMusicTracks, validateMusicTracks } from '../../shared/music'
import catalog from '../../shared/musicCatalog.json'

it('conserva i sei video e le 54 tracce originali, con timestamp crescenti e URL limitati a YouTube', () => {
  expect(catalog).toHaveLength(6)
  expect(catalog.reduce((n, item) => n + item.tracks.length, 0)).toBe(54)
  for (const item of catalog) { validateMusicTracks(item.tracks); expect(compilationUrl(item.videoId, 0)).toMatch(/^https:\/\/www.youtube.com\/watch\?v=/) }
  expect(catalog[0].tracks.at(-1)?.start).toBe(8440)
  expect(catalog[3].tracks.at(-1)?.start).toBe(3312)
  expect(compilationUrl('mdJU5ogrPMY', 3275)).toBe('https://www.youtube.com/watch?v=mdJU5ogrPMY&t=3275s')
  expect(() => compilationUrl('javascript:', 0)).toThrow()
  expect(() => compilationUrl('mdJU5ogrPMY', -1)).toThrow()
})

it('salva correzioni e titoli originali senza inventare fine o durata delle tracce', () => {
  const tracks = parseMusicTracks('00:00 銀河の旋律\n02:36 별들의 속삭임\n1:00:00 Finale')
  expect(tracks).toEqual([{ start: 0, title: '銀河の旋律' }, { start: 156, title: '별들의 속삭임' }, { start: 3600, title: 'Finale' }])
  expect(parseMusicTracks(tracks.map(item => `${formatMusicTimestamp(item.start)} ${item.title}`).join('\n'))).toEqual(tracks)
  for (const text of ['00:99 Errore', '00:00 A\n00:00 B', '02:00 A\n01:00 B', '00:00', 'No timestamp']) expect(() => parseMusicTracks(text)).toThrow()
})
