import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SpotifyPanel } from './SpotifyPanel'
import { YoutubeLibrary } from './YoutubeLibrary'
import { AmbientSoundPanel } from './AmbientSoundPanel'
import { MusicIcon } from './MusicIcon'
import './music.css'
import { useToolSettings } from './ToolSettingsContext'
import { musicPreferences, type MusicSource } from '../utils/musicPreferences'

export function MusicButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        type="button"
        ref={button}
        className={compact ? 'sidebar-icon-btn' : 'button secondary'}
        title="Musica e suoni"
        aria-label="Apri musica e suoni"
        onClick={() => setOpen(true)}
      >
        ♫{!compact && ' Musica'}
      </button>
      {open && (
        <MusicDialog
          onClose={() => {
            setOpen(false)
            button.current?.focus()
          }}
        />
      )}
    </>
  )
}

export function MusicDialog({ onClose }: { onClose: () => void }) {
  const settings = useToolSettings()
  const settingsOpen = useRef(settings.isOpen)
  settingsOpen.current = settings.isOpen
  const [source, setSource] = useState<MusicSource>(musicPreferences.source)
  const selectSource = (value: MusicSource) => {
    setSource(value)
    musicPreferences.selectSource(value)
  }
  const close = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!settings.isOpen) close.current?.focus()
  }, [settings.isOpen])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (settingsOpen.current) return
      if (document.querySelector('[data-dictionary-overlay]')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
      }
      if (event.key === 'Tab') {
        const controls = [
          ...(dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary'
          ) ?? [])
        ].filter((element) => element.getClientRects().length)
        const first = controls[0]
        const last = controls.at(-1)
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.current?.contains(document.activeElement))
        ) {
          event.preventDefault()
          last?.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.current?.contains(document.activeElement))
        ) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [onClose])

  if (settings.isOpen) return null

  return createPortal(
    <div
      className="music-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialog}
        className="music-dialog music-studio"
        role="dialog"
        aria-modal="true"
        aria-label="Musica per lo studio"
      >
        <header className="music-dialog-header">
          <div className="music-title">
            <span className="music-title-icon">
              <MusicIcon name="music" size={22} />
            </span>
            <div>
              <h2>Musica per lo studio</h2>
              <p>Trova il tuo ritmo. Poi torna alla lezione.</p>
            </div>
          </div>
          <button
            type="button"
            ref={close}
            className="music-icon-button music-close"
            aria-label="Chiudi musica"
            onClick={onClose}
          >
            <MusicIcon name="close" />
          </button>
        </header>
        <div className="music-studio-layout">
          <nav className="music-source-nav" aria-label="Sorgente musicale">
            <span className="music-eyebrow">LA TUA MUSICA</span>
            <button
              type="button"
              aria-pressed={source === 'spotify'}
              onClick={() => selectSource('spotify')}
            >
              <span className="music-provider-dot spotify-dot" /> Spotify
            </button>
            <button
              type="button"
              aria-pressed={source === 'youtube'}
              onClick={() => selectSource('youtube')}
            >
              <span className="youtube-brand-icon">
                <MusicIcon name="play" size={12} />
              </span>{' '}
              YouTube
            </button>
            <button
              type="button"
              aria-pressed={source === 'ambient'}
              onClick={() => selectSource('ambient')}
            >
              <span className="ambient-nav-icon">🍃</span> Suoni
            </button>
            <p>
              La colonna sonora
              <br />
              delle tue sessioni.
            </p>
            <button type="button" onClick={() => settings.open('music')}>
              Impostazioni musica
            </button>
          </nav>
          <div className="music-content" key={source}>
            {source === 'spotify' ? (
              <SpotifyPanel />
            ) : source === 'youtube' ? (
              <YoutubeLibrary />
            ) : (
              <AmbientSoundPanel />
            )}
          </div>
        </div>
      </section>
    </div>,
    document.fullscreenElement ?? document.body
  )
}
