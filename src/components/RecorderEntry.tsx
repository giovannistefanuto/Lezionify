import { useRef, useState } from 'react'
import { UsbRecorderModal } from './UsbRecorderModal'
import { RepetitionWindow } from './RepetitionWindow'
import { useModalFocus } from '../hooks/useModalFocus'
import type { CourseDefinition } from '../../shared/archive'
import '../repetition.css'

export function RecorderEntry(props: {
  onClose: () => void
  onRefreshLibrary: () => Promise<unknown>
  onNotice: (message: string) => void
  courses: CourseDefinition[]
}) {
  const [mode, setMode] = useState<'choose' | 'study' | 'repeat'>('choose')
  const dialog = useRef<HTMLDivElement>(null)
  useModalFocus(dialog, mode === 'choose')
  if (mode === 'study') return <UsbRecorderModal isOpen {...props} />
  if (mode === 'repeat')
    return <RepetitionWindow autoStart onClose={props.onClose} />
  return (
    <div className="modal-overlay repetition-overlay">
      <div
        ref={dialog}
        className="modal-content recorder-choice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recorder-choice-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') props.onClose()
        }}
      >
        <header className="repetition-header">
          <h2 id="recorder-choice-title">Come vuoi usare il registratore?</h2>
          <button
            className="secondary-button"
            onClick={props.onClose}
            aria-label="Chiudi registratore"
          >
            Chiudi
          </button>
        </header>
        <div className="recorder-options">
          <button className="recorder-option" onClick={() => setMode('repeat')}>
            <span aria-hidden="true">↻</span>
            <strong>RIPETERE</strong>
            <p>
              Elabora automaticamente l’ultimo audio e confronta il tuo
              ragionamento con gli appunti.
            </p>
            <small>Avvia trascrizione e valutazione Gemini</small>
          </button>
          <button className="recorder-option" onClick={() => setMode('study')}>
            <span aria-hidden="true">▤</span>
            <strong>STUDIO</strong>
            <p>
              Scegli le registrazioni delle lezioni, importale e gestisci i file
              sul registratore.
            </p>
            <small>Apri l’acquisizione delle lezioni</small>
          </button>
        </div>
      </div>
    </div>
  )
}
