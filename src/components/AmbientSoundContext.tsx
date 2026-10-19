import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react'
import type { AmbientSoundStatus } from '../../shared/ambientSounds'
import { musicPreferences } from '../utils/musicPreferences'
import { AmbientLoopPlayer } from '../utils/ambientLoopPlayer'

export interface AmbientSoundContextValue {
  status: AmbientSoundStatus | null
  activeSoundId: string | null
  isPlaying: boolean
  volume: number
  transitionSeconds: number
  setTransitionSeconds: (seconds: number) => void
  isInstalling: boolean
  error: string | null
  pausedByLectureAudio: boolean
  play: (soundId: string) => Promise<void>
  pause: () => void
  toggle: (soundId: string) => Promise<void>
  setVolume: (volume: number) => void
  install: (soundIds?: string[]) => Promise<void>
  refreshStatus: () => Promise<void>
}

const AmbientSoundContext = createContext<AmbientSoundContextValue | null>(null)

export function useAmbientSound(): AmbientSoundContextValue {
  const context = useContext(AmbientSoundContext)
  if (!context) {
    throw new Error(
      'useAmbientSound deve essere utilizzato all’interno di AmbientSoundProvider'
    )
  }
  return context
}

export function AmbientSoundProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [status, setStatus] = useState<AmbientSoundStatus | null>(null)
  const [activeSoundId, setActiveSoundId] = useState<string | null>(
    () => musicPreferences.ambientSound().soundId
  )
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [volume, setVolumeState] = useState<number>(
    () => musicPreferences.ambientSound().volume
  )
  const [isInstalling, setIsInstalling] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [pausedByLectureAudio, setPausedByLectureAudio] =
    useState<boolean>(false)

  const [transitionSeconds, setTransitionState] = useState(() => {
    try {
      const value = Number(
        localStorage.getItem('lezionify:ambient-transition:v1')
      )
      return [1, 2, 4].includes(value) ? value : 1
    } catch {
      return 1
    }
  })
  const transitionRef = useRef(transitionSeconds)
  const setTransitionSeconds = useCallback((seconds: number) => {
    if (![1, 2, 4].includes(seconds)) return
    transitionRef.current = seconds
    setTransitionState(seconds)
    try {
      localStorage.setItem('lezionify:ambient-transition:v1', String(seconds))
    } catch {
      /* In-memory preference remains usable. */
    }
  }, [])
  const playbackVersion = useRef(0)
  const lecturePlaying = useRef(false)
  const player = useRef<AmbientLoopPlayer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const activeSoundIdRef = useRef<string | null>(activeSoundId)
  activeSoundIdRef.current = activeSoundId
  const isPlayingRef = useRef<boolean>(isPlaying)
  isPlayingRef.current = isPlaying
  const volumeRef = useRef<number>(volume)
  volumeRef.current = volume
  const pausedByLectureRef = useRef<boolean>(pausedByLectureAudio)
  pausedByLectureRef.current = pausedByLectureAudio

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      player.current = new AmbientLoopPlayer(ctx, volumeRef.current)
    }
    return audioContextRef.current
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      if (window.archive?.ambientSoundStatus) {
        const s = await window.archive.ambientSoundStatus()
        setStatus(s)
      }
    } catch (e) {
      console.error('Errore nel recupero dello stato dei suoni ambientali:', e)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const stopCurrentSource = useCallback(() => {
    playbackVersion.current++
    player.current?.stop()
    isPlayingRef.current = false
  }, [])

  const pause = useCallback(() => {
    stopCurrentSource()
    setIsPlaying(false)
    pausedByLectureRef.current = false
    setPausedByLectureAudio(false)
  }, [stopCurrentSource])

  const play = useCallback(
    async (soundId: string) => {
      const version = ++playbackVersion.current
      if (lecturePlaying.current) {
        setError('Metti in pausa la lezione prima di avviare il sottofondo.')
        return
      }
      setError(null)
      try {
        const ctx = getAudioContext()
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }

        // Recupera il buffer dalla cache o leggilo via IPC
        let audioBuffer = bufferCacheRef.current.get(soundId)
        if (!audioBuffer) {
          if (!window.archive?.readAmbientSound) {
            throw new Error('API archivio non disponibile.')
          }
          const rawBytes = await window.archive.readAmbientSound(soundId)
          const arrayBuffer = rawBytes.buffer.slice(
            rawBytes.byteOffset,
            rawBytes.byteOffset + rawBytes.byteLength
          ) as ArrayBuffer
          audioBuffer = await ctx.decodeAudioData(arrayBuffer)
          bufferCacheRef.current.set(soundId, audioBuffer)
        }

        if (version !== playbackVersion.current || lecturePlaying.current)
          return
        player.current!.replace(audioBuffer, transitionRef.current)
        activeSoundIdRef.current = soundId
        isPlayingRef.current = true
        setActiveSoundId(soundId)
        setIsPlaying(true)
        setPausedByLectureAudio(false)
        musicPreferences.selectAmbientSound(soundId, volumeRef.current)
      } catch (err) {
        if (version !== playbackVersion.current) return
        setError(
          err instanceof Error ? err.message : 'Riproduzione non riuscita.'
        )
      }
    },
    [getAudioContext]
  )

  const toggle = useCallback(
    async (soundId: string) => {
      if (activeSoundIdRef.current === soundId && isPlayingRef.current) {
        pause()
      } else {
        await play(soundId)
      }
    },
    [pause, play]
  )

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clamped)
    volumeRef.current = clamped
    player.current?.setVolume(clamped)
    musicPreferences.selectAmbientSound(activeSoundIdRef.current, clamped)
  }, [])

  const install = useCallback(async (soundIds?: string[]) => {
    setIsInstalling(true)
    setError(null)
    try {
      if (!window.archive?.installAmbientSounds) {
        throw new Error('API download non disponibile.')
      }
      const updatedStatus = await window.archive.installAmbientSounds(soundIds)
      setStatus(updatedStatus)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setIsInstalling(false)
    }
  }, [])

  // Ascolto eventi riproduzione audio lezione per pausa automatica e ripresa
  useEffect(() => {
    const handleLecturePlayback = (event: Event) => {
      const customEvent = event as CustomEvent<{ playing: boolean }>
      const isLecturePlaying = Boolean(customEvent.detail?.playing)
      lecturePlaying.current = isLecturePlaying
      if (isLecturePlaying) playbackVersion.current++

      if (isLecturePlaying) {
        if (isPlayingRef.current) {
          // Metti in pausa il sottofondo e annota che è stato fermato dalla lezione
          stopCurrentSource()
          setIsPlaying(false)
          pausedByLectureRef.current = true
          setPausedByLectureAudio(true)
        }
      } else {
        if (pausedByLectureRef.current && activeSoundIdRef.current) {
          // La lezione è andata in pausa o terminata: riprendi automaticamente il sottofondo
          const soundToResume = activeSoundIdRef.current
          setPausedByLectureAudio(false)
          void play(soundToResume)
        }
      }
    }

    window.addEventListener('lezionify:lecture-playback', handleLecturePlayback)
    return () => {
      window.removeEventListener(
        'lezionify:lecture-playback',
        handleLecturePlayback
      )
    }
  }, [play, stopCurrentSource])

  // Pulizia AudioContext alla chiusura dell'app
  useEffect(() => {
    return () => {
      stopCurrentSource()
      player.current?.dispose()
      player.current = null
      if (audioContextRef.current) void audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [stopCurrentSource])

  return (
    <AmbientSoundContext.Provider
      value={{
        status,
        activeSoundId,
        isPlaying,
        volume,
        transitionSeconds,
        setTransitionSeconds,
        isInstalling,
        error,
        pausedByLectureAudio,
        play,
        pause,
        toggle,
        setVolume,
        install,
        refreshStatus
      }}
    >
      {children}
    </AmbientSoundContext.Provider>
  )
}
