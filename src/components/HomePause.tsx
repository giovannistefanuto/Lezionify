import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocus } from '../hooks/useModalFocus'
import { PauseTimerOverlay } from './PauseTimerOverlay'
import './homePause.css'

export function HomePause({ compact = false }: { compact?: boolean }) {
  const [selecting, setSelecting] = useState(false)
  const [minutes, setMinutes] = useState(0)
  const [custom, setCustom] = useState('10')
  const dialog = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useModalFocus(dialog, selecting)
  const close = useCallback(() => { setSelecting(false); setMinutes(0); trigger.current?.focus() }, [])
  const start = (value: number) => { setSelecting(false); setMinutes(value) }
  const valid = Number.isInteger(Number(custom)) && Number(custom) >= 1 && Number(custom) <= 1440
  return <>
    <button ref={trigger} type="button" className={`home-pause-button ${compact ? "sidebar-icon-btn" : "settings-gear-btn"}`} aria-label="Fai una pausa" title="Fai una pausa" onClick={() => setSelecting(true)}>☕{!compact && <span className="sidebar-action-label">Pausa</span>}</button>
    {selecting && createPortal(<div className="home-pause-backdrop" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <div ref={dialog} className="home-pause-card" role="dialog" aria-modal="true" aria-labelledby="home-pause-title" tabIndex={-1}>
        <h2 id="home-pause-title">Quanto dura la pausa?</h2><p>Un momento per staccare, anche senza una lezione aperta.</p>
        <div className="home-pause-presets">{[5, 15, 30].map(value => <button key={value} type="button" onClick={() => start(value)}>{value} min</button>)}</div>
        <form onSubmit={event => { event.preventDefault(); if (valid) start(Number(custom)) }}>
          <label>Durata libera in minuti<input type="number" min="1" max="1440" step="1" value={custom} onChange={event => setCustom(event.target.value)} required /></label>
          <button type="submit" disabled={!valid}>Avvia pausa</button>
        </form><button type="button" className="secondary-button" onClick={close}>Annulla</button>
      </div>
    </div>, document.fullscreenElement ?? document.body)}
    {minutes > 0 && createPortal(<PauseTimerOverlay show minutes={minutes} homeMode onReturnToStudy={close} onQuit={close} />, document.fullscreenElement ?? document.body)}
  </>
}
