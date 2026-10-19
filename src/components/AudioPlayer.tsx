import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  audioUrl: string | null
}

const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0]

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) {
    const remMins = mins % 60
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  // Reset audio playback when URL changes
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPlaybackError(null)
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(prev => {
        if (audio.duration && Number.isFinite(audio.duration) && audio.duration > prev) {
          return audio.duration
        }
        return prev
      })
    }
    const updateDuration = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(prev => audio.duration > prev ? audio.duration : prev)
      }
      audio.playbackRate = playbackSpeed
    }
    const onPlay = () => {
      setIsPlaying(true)
      setPlaybackError(null)
      window.dispatchEvent(new CustomEvent('lezionify:lecture-playback', { detail: { playing: true } }))
    }
    const onPause = () => {
      setIsPlaying(false)
      window.dispatchEvent(new CustomEvent('lezionify:lecture-playback', { detail: { playing: false } }))
    }
    const onEnded = () => {
      setIsPlaying(false)
      window.dispatchEvent(new CustomEvent('lezionify:lecture-playback', { detail: { playing: false } }))
    }
    const onError = () => {
      setIsPlaying(false)
      setPlaybackError('Impossibile riprodurre questo file audio.')
      window.dispatchEvent(new CustomEvent('lezionify:lecture-playback', { detail: { playing: false } }))
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('durationchange', updateDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('durationchange', updateDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      window.dispatchEvent(new CustomEvent('lezionify:lecture-playback', { detail: { playing: false } }))
    }
  }, [audioUrl, playbackSpeed])

  function togglePlayPause(): void {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      setPlaybackError(null)
      audio.play().catch(() => {
        setIsPlaying(false)
        setPlaybackError('La riproduzione non può essere avviata.')
      })
    }
  }

  function handleSkip(seconds: number): void {
    const audio = audioRef.current
    if (!audio || duration <= 0) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>): void {
    const newTime = Number(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = newTime
    }
  }

  function handleSpeedChange(speed: number): void {
    setPlaybackSpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  if (!audioUrl) {
    return null
  }

  return (
    <footer className="persistent-audio-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />

      <div className="player-top-row">
        <div className="player-playback-controls">
          <button
            className="player-skip-btn"
            onClick={() => handleSkip(-10)}
            disabled={duration <= 0}
            title="Indietro 10 secondi"
          >
            ↺ 10s
          </button>
          <button
            className="player-play-btn"
            onClick={togglePlayPause}
            title={isPlaying ? 'Pausa' : 'Riproduci'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="player-skip-btn"
            onClick={() => handleSkip(10)}
            disabled={duration <= 0}
            title="Avanti 10 secondi"
          >
            10s ↻
          </button>
        </div>

        <div className="player-timeline-wrap">
          <span className="player-time">{formatAudioTime(currentTime)}</span>
          <input
            type="range"
            className="player-slider"
            min={0}
            max={duration > 0 ? duration : 1}
            value={duration > 0 ? Math.min(currentTime, duration) : 0}
            onChange={handleSeek}
            disabled={duration <= 0}
          />
          <span className="player-time">{formatAudioTime(Math.max(duration, currentTime))}</span>
        </div>

        <div className="player-speed-wrap">
          {PLAYBACK_SPEEDS.map((sp) => (
            <button
              key={sp}
              className={`speed-pill ${playbackSpeed === sp ? 'is-active' : ''}`}
              onClick={() => handleSpeedChange(sp)}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>
      {playbackError && <div className="audio-player-error" role="alert">{playbackError}</div>}
    </footer>
  )
}
