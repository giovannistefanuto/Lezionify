import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { AppUpdateState } from '../../shared/appUpdate'
import { useModalFocus } from '../hooks/useModalFocus'
import { prepareUpdateRestart, resetUpdateRestart } from '../utils/updatePreparation'
import './appUpdates.css'

const UpdateNotes = lazy(() => import('react-markdown'))

const UpdateContext = createContext<{ state: AppUpdateState | null; open: () => void }>({ state: null, open: () => {} })
export const useAppUpdates = () => useContext(UpdateContext)

export function AppUpdates({ children, canRestart }: { children: ReactNode; canRestart: boolean }) {
  const [state, setState] = useState<AppUpdateState | null>(null)
  const [open, setOpen] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const dismissed = useRef<string | undefined>(undefined)
  const panel = useRef<HTMLDivElement>(null)
  useModalFocus(panel, open)
  useEffect(() => {
    const api = window.appUpdate
    if (!api) return
    let live = true
    let received = false
    const unsubscribe = api.onState(next => {
      received = true
      if (live) {
        if (next.phase !== 'installing') resetUpdateRestart()
        setState(next)
      }
    })
    void api.getState().then(next => { if (live && !received) setState(next) }).catch(() => {})
    return () => { live = false; unsubscribe() }
  }, [])
  useEffect(() => {
    if (!state || (state.phase !== 'available' && !state.installedNotes)) return
    const key = state.installedNotes ? `installed:${state.currentVersion}` : state.version
    const reveal = () => {
      if (dismissed.current !== key && !document.querySelector('[role="dialog"]')) setOpen(true)
    }
    reveal()
    const observer = new MutationObserver(reveal)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [state])
  const close = () => {
    if (preparing || state?.phase === 'installing') return
    dismissed.current = state?.installedNotes ? `installed:${state.currentVersion}` : state?.version
    setOpen(false)
    setError('')
    if (state?.installedNotes) void window.appUpdate?.acknowledge().catch(() => {})
  }
  const install = async () => {
    if (preparing) return
    if (!canRestart || document.querySelectorAll('[role="dialog"]').length > 1) {
      setError('Chiudi la lezione, la Sala e le finestre di modifica prima di riavviare. Il pacchetto resterà pronto.')
      return
    }
    setPreparing(true)
    setError('')
    try {
      await prepareUpdateRestart()
      const next = await window.appUpdate!.install()
      setState(next)
      if (next.phase !== 'installing') resetUpdateRestart()
    } catch {
      resetUpdateRestart()
      setError('Salvataggio non completato. Il riavvio è stato rinviato: riprova dopo aver salvato il lavoro.')
    } finally { setPreparing(false) }
  }
  const busy = preparing || state?.phase === 'installing'
  const action = (work: () => Promise<unknown>) => { setError(''); void work().catch(() => setError('Operazione non riuscita. Riprova più tardi.')) }
  return <UpdateContext.Provider value={{ state, open: () => setOpen(true) }}>
    {children}
    {open && state && createPortal(<div className="modal-overlay app-update-overlay" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close() }
    }}>
      <div className="modal-content app-update-panel" role="dialog" aria-modal="true" aria-labelledby="app-update-title" tabIndex={-1} ref={panel}>
        <div className="modal-header">
          <h3 id="app-update-title">{state.installedNotes ? 'Lezionify è stato aggiornato' : 'Aggiornamenti di Lezionify'}</h3>
          <button type="button" className="modal-close" aria-label="Chiudi aggiornamenti" disabled={busy} onClick={close}>×</button>
        </div>
        <p className="app-update-version">Versione installata <strong>{state.currentVersion}</strong>{state.version ? ` → ${state.version}` : ''}</p>
        <div role="status" aria-live="polite">
          {!state.supported ? state.message : state.phase === 'checking' ? 'Controllo dei rilasci su GitHub…' :
            state.phase === 'current' ? 'Hai già la versione più recente disponibile.' :
            state.phase === 'available' ? 'È disponibile una nuova versione.' :
            state.phase === 'downloading' ? `Download in corso · ${Math.round(state.percent ?? 0)}%` :
            state.phase === 'ready' ? 'Aggiornamento scaricato e verificato. Pronto per il riavvio.' :
            state.phase === 'installing' || preparing ? 'Salvataggio e preparazione del riavvio…' : 'Il controllo avviene automaticamente all’apertura.'}
        </div>
        {state.phase === 'downloading' && <progress max={100} value={state.percent ?? 0} aria-label="Download aggiornamento" />}
        {(state.installedNotes || state.notes) && <section className="app-update-notes" aria-label="Novità della versione"><h4>Cosa cambia</h4><div className="app-update-notes-body"><Suspense fallback={<p>Caricamento delle novità…</p>}><UpdateNotes skipHtml allowedElements={['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'blockquote', 'br']}>{state.installedNotes ?? state.notes}</UpdateNotes></Suspense></div><p className="app-update-detail">Per le versioni intermedie consulta Tutti i rilasci.</p></section>}
        {state.size && <p className="app-update-detail">Pacchetto completo: {(state.size / 1024 / 1024).toFixed(1)} MB. Il download può essere più piccolo.</p>}
        {state.checkedAt && <p className="app-update-detail">Ultima verifica: {new Date(state.checkedAt).toLocaleString('it-IT')}</p>}
        {(state.message && state.supported) && <p role="status">{state.message}</p>}
        {error && <p role="alert">{error}</p>}
        {state.phase === 'ready' && <p>Salva e chiudi le modifiche aperte. Lezionify si chiuderà per installare l’aggiornamento e si riaprirà. Windows potrebbe chiedere i permessi.</p>}
        <div className="modal-actions app-update-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => action(() => window.appUpdate!.openReleases())}>Tutti i rilasci ↗</button>
          {state.supported && ['idle', 'error', 'current'].includes(state.phase) && <button type="button" className="primary-button" onClick={() => action(() => window.appUpdate!.check())}>Controlla aggiornamenti</button>}
          {state.phase === 'available' && <button type="button" className="primary-button" onClick={() => action(() => window.appUpdate!.download())}>Aggiorna · scarica</button>}
          {state.phase === 'ready' && <button type="button" className="primary-button" disabled={busy} onClick={() => void install()}>Riavvia e aggiorna</button>}
          <button type="button" className="secondary-button" disabled={busy} onClick={close}>{state.phase === 'available' || state.phase === 'ready' ? 'Più tardi' : 'Chiudi'}</button>
        </div>
      </div>
    </div>, document.fullscreenElement ?? document.body)}
  </UpdateContext.Provider>
}

export function AppUpdateSettings({ onClose }: { onClose: () => void }) {
  const updates = useAppUpdates()
  if (!updates.state) return null
  return <section className="publishing-settings">
    <h4>Aggiornamenti dell’app</h4>
    <p>Lezionify {updates.state.currentVersion} · {updates.state.phase === 'ready' ? 'Aggiornamento pronto' : updates.state.version ? `Disponibile ${updates.state.version}` : 'Controllo automatico all’apertura'}</p>
    <button type="button" className="secondary-button" onClick={() => { onClose(); updates.open() }}>Versione, novità e aggiornamenti</button>
  </section>
}
