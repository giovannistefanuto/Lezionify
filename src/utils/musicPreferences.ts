import type { SpotifyLibraryKind } from '../../shared/spotify'

export type MusicSource = 'spotify' | 'youtube' | 'ambient'

const sourceKey = 'lezionify:music-source:v1'
const libraryKey = 'lezionify:spotify-library-view:v1'
const ambientSoundKey = 'lezionify:ambient-sound:v1'
const ambientVolumeKey = 'lezionify:ambient-volume:v1'

// Only navigation metadata: no track names, images, account IDs or credentials.
export const musicPreferences = {
  source(): MusicSource {
    try {
      const val = localStorage.getItem(sourceKey)
      if (val === 'youtube' || val === 'ambient') return val
      return 'spotify'
    } catch {
      return 'spotify'
    }
  },
  selectSource(source: MusicSource) {
    try {
      localStorage.setItem(sourceKey, source)
    } catch {
      /* Navigation still works without storage. */
    }
  },
  library(): { kind: SpotifyLibraryKind; offset: number } {
    try {
      const value = JSON.parse(localStorage.getItem(libraryKey) ?? 'null')
      if (value && ['playlists', 'tracks'].includes(value.kind) && Number.isInteger(value.offset) && value.offset >= 0 && value.offset <= 10000) return { kind: value.kind, offset: value.offset }
    } catch {
      /* Use the first page when metadata is missing or invalid. */
    }
    return { kind: 'playlists', offset: 0 }
  },
  selectLibrary(view: { kind: SpotifyLibraryKind; offset: number }) {
    try {
      localStorage.setItem(libraryKey, JSON.stringify(view))
    } catch {
      /* Keep navigation in memory. */
    }
  },
  ambientSound(): { soundId: string | null; volume: number } {
    try {
      const soundId = localStorage.getItem(ambientSoundKey) || null
      const rawVol = localStorage.getItem(ambientVolumeKey)
      const parsedVol = rawVol !== null ? parseFloat(rawVol) : 0.5
      const volume = Number.isFinite(parsedVol) ? Math.max(0, Math.min(1, parsedVol)) : 0.5
      return { soundId, volume }
    } catch {
      return { soundId: null, volume: 0.5 }
    }
  },
  selectAmbientSound(soundId: string | null, volume?: number) {
    try {
      if (soundId) {
        localStorage.setItem(ambientSoundKey, soundId)
      } else {
        localStorage.removeItem(ambientSoundKey)
      }
      if (typeof volume === 'number' && Number.isFinite(volume)) {
        localStorage.setItem(ambientVolumeKey, Math.max(0, Math.min(1, volume)).toString())
      }
    } catch {
      /* Keep in memory */
    }
  }
}
