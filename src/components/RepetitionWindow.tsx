import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  RepetitionDocument,
  RepetitionState
} from '../../shared/repetition'
import { MarkdownViewer } from './MarkdownViewer'
import { useModalFocus } from '../hooks/useModalFocus'
import '../repetition.css'

export function RepetitionWindow({
  autoStart = false,
  onClose
}: {
  autoStart?: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const mounted = useRef(true)
  const [state, setState] = useState<RepetitionState | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [document, setDocument] = useState<RepetitionDocument | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [tab, setTab] = useState<'assessment' | 'transcript' | 'reference'>(
    'assessment'
  )
  useModalFocus(dialog, true)
  const refresh = useCallback(async () => {
    const next = await window.archive.repetitionState()
    if (mounted.current) setState(next)
    return next
  }, [])
  const launch = useCallback(async () => {
    setWorking(true)
    setError('')
    try {
      const current = await refresh()
      if (
        !current.referenceName &&
        !(await window.archive.selectRepetitionReference())
      )
        return
      const id = await window.archive.startRepetition()
      if (mounted.current) {
        setSelected(id)
        setTab('assessment')
      }
      await refresh()
    } catch (err) {
      if (mounted.current)
        setError(err instanceof Error ? err.message : 'Avvio non riuscito.')
    } finally {
      if (mounted.current) setWorking(false)
    }
  }, [refresh])
  useEffect(() => {
    mounted.current = true
    void refresh().catch(() => {
      if (mounted.current) setError('Archivio RIPETERE non disponibile.')
    })
    if (autoStart && !started.current) {
      started.current = true
      void launch()
    }
    let refreshing = false
    const timer = setInterval(() => {
      if (refreshing) return
      refreshing = true
      void refresh()
        .catch(() => {
          if (mounted.current) setError('Aggiornamento non riuscito.')
        })
        .finally(() => {
          refreshing = false
        })
    }, 1500)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [autoStart, launch, refresh])
  const id = selected ?? state?.activeId ?? state?.sessions[0]?.id
  const selectedStatus = state?.sessions.find((item) => item.id === id)?.status
  useEffect(() => {
    let alive = true
    setDocument(null)
    if (id)
      void window.archive
        .readRepetition(id)
        .then((value) => {
          if (alive) setDocument(value)
        })
        .catch(() => {
          if (alive) setError('Materiali della sessione non disponibili.')
        })
    return () => {
      alive = false
    }
  }, [id, selectedStatus])
  const active = state?.sessions.find((item) => item.id === state.activeId)
  const session = state?.sessions.find((item) => item.id === id)
  const busy = working || !!state?.busy
  const changeReference = async () => {
    setError('')
    setWorking(true)
    try {
      await window.archive.selectRepetitionReference()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selezione non riuscita.')
    } finally {
      setWorking(false)
    }
  }
  const stop = async () => {
    setWorking(true)
    try {
      await window.archive.stopRepetition()
      await refresh()
    } catch {
      setError('Impossibile sospendere la sessione.')
    } finally {
      setWorking(false)
    }
  }
  const resume = async () => {
    if (!id) return
    setWorking(true)
    setError('')
    try {
      setSelected(await window.archive.resumeRepetition(id))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ripresa non riuscita.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="modal-overlay repetition-overlay">
      <div
        ref={dialog}
        className="modal-content repetition-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repetition-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
      >
        <header className="repetition-header">
          <div>
            <span className="repetition-eyebrow">
              IL TUO STUDIO A VOCE ALTA
            </span>
            <h2 id="repetition-title">RIPETERE</h2>
          </div>
          <button
            className="secondary-button"
            onClick={onClose}
            aria-label="Chiudi RIPETERE"
          >
            Chiudi
          </button>
        </header>
        <div className="repetition-reference">
          <div>
            <strong>Appunti di riferimento</strong>
            <span>
              {state?.referenceName || 'Scegli un file Markdown o TXT'}
            </span>
          </div>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void changeReference()}
          >
            Cambia appunti
          </button>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => void launch()}
          >
            Elabora ultimo audio
          </button>
        </div>
        {error && (
          <p role="alert" className="repetition-error">
            {error}
          </p>
        )}
        {state?.busy && active && (
          <div className="repetition-progress" role="status">
            <strong>{active.audioName}</strong>
            <span>{active.message}</span>
            <progress
              value={active.percent}
              max={100}
              aria-label="Avanzamento RIPETERE"
            />
            <button
              className="secondary-button"
              disabled={working}
              onClick={() => void stop()}
            >
              Sospendi
            </button>
          </div>
        )}
        {working && <p role="status">Preparazione…</p>}
        <div className="repetition-layout">
          <nav
            className="repetition-history"
            aria-label="Sessioni di ripetizione"
          >
            <h3>Sessioni salvate</h3>
            {state?.sessions.length === 0 && (
              <p>Le tue ripetizioni compariranno qui.</p>
            )}
            {state?.sessions.map((item) => (
              <button
                key={item.id}
                className={`repetition-session ${id === item.id ? 'is-selected' : ''}`}
                aria-current={id === item.id ? 'true' : undefined}
                onClick={() => {
                  setSelected(item.id)
                  setTab('assessment')
                }}
              >
                <strong>{item.audioName}</strong>
                <span>{new Date(item.createdAt).toLocaleString('it-IT')}</span>
                <span>
                  {
                    {
                      completed: 'Completata',
                      paused: 'Sospesa',
                      failed: 'Da riprendere',
                      transcribing: 'Trascrizione',
                      evaluating: 'Valutazione'
                    }[item.status]
                  }
                </span>
              </button>
            ))}
          </nav>
          <section
            className="repetition-detail"
            aria-label="Materiali della sessione"
          >
            {session && (
              <>
                <h3>{session.audioName}</h3>
                <p className="repetition-source">
                  Confronto con {session.referenceName}
                </p>
                {['paused', 'failed'].includes(session.status) && (
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={() => void resume()}
                  >
                    Riprendi sessione
                  </button>
                )}
                <audio
                  key={session.id}
                  controls
                  preload="none"
                  src={`media://repetition/${session.id}`}
                  aria-label="Audio originale della ripetizione"
                />
                <div
                  className="repetition-tabs"
                  role="group"
                  aria-label="Materiale da leggere"
                >
                  {(
                    [
                      ['assessment', 'Valutazione'],
                      ['transcript', 'Trascrizione'],
                      ['reference', 'Appunti usati']
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={tab === value}
                      className="secondary-button"
                      onClick={() => setTab(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === 'assessment' ? (
                  document?.assessment ? (
                    <MarkdownViewer content={document.assessment} />
                  ) : (
                    <p>{session.message}</p>
                  )
                ) : tab === 'transcript' ? (
                  <pre className="repetition-transcript">
                    {document?.transcript ||
                      'La trascrizione sarà disponibile al termine della prima fase.'}
                  </pre>
                ) : (
                  document && <MarkdownViewer content={document.reference} />
                )}
              </>
            )}
            {!session && (
              <div className="repetition-empty">
                <h3>Ritrova il filo del tuo ragionamento</h3>
                <p>
                  Leggi, prova a spiegare e correggiti a voce alta. La
                  valutazione distingue ciò che hai capito, le difficoltà
                  superate e i punti da rivedere.
                </p>
              </div>
            )}
          </section>
        </div>
        <footer className="repetition-footer">
          Audio, trascrizione e risultati sono salvati localmente. Chiudere
          questa finestra lascia proseguire il lavoro.
        </footer>
      </div>
    </div>
  )
}
