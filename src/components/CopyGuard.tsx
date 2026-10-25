import { useRef, useState } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import { COPY_GUARD_KEY, normalizeCopyPhrase, readCopyGuardHours } from '../utils/copyGuard'

export function CopyGuardSettings() {
  const [hours, setHours] = useState(readCopyGuardHours)
  const [error, setError] = useState(false)
  const update = (next: typeof hours) => {
    try { localStorage.setItem(COPY_GUARD_KEY, JSON.stringify(next)); setHours(next); setError(false) }
    catch { setError(true) }
  }
  return <section className="copy-guard-settings" aria-labelledby="copy-hours-title">
    <h4 id="copy-hours-title">Copia consapevole in Memo</h4>
    <p>Ogni giorno, nella fascia scelta, Copia tutto e Copia gruppo richiedono una frase da ricopiare. Fuori fascia la copia è immediata. Orari uguali: tutto il giorno.</p>
    <label>Dalle <input type="time" aria-label="Inizio copia protetta" value={hours.start} onChange={event => {
      if (!event.target.value) return
      update({ ...hours, start: event.target.value })
    }} /></label>{' '}
    <label>Alle <input type="time" aria-label="Fine copia protetta" value={hours.end} onChange={event => {
      if (!event.target.value) return
      update({ ...hours, end: event.target.value })
    }} /></label>
    <small>Salvataggio automatico su questo computer.</small>
    {error && <p role="alert">Impossibile salvare gli orari. Riprova.</p>}
  </section>
}

export function CopyGuardDialog({ phrase, onConfirm, onCancel }: { phrase: string; onConfirm: () => Promise<boolean>; onCancel: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [copying, setCopying] = useState(false)
  useModalFocus(panel, true)
  const correct = normalizeCopyPhrase(value) === normalizeCopyPhrase(phrase)
  const confirm = async () => {
    if (!correct || copying) return
    setCopying(true)
    try { if (!await onConfirm()) setError('Copia non riuscita. Riprova senza riscrivere la frase.') } finally { setCopying(false) }
  }
  return <div className="memo-copy-backdrop" onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget && !copying) onCancel() }}>
    <div ref={panel} data-memo-copy-dialog tabIndex={-1} className="memo-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="memo-copy-title"
      onCopy={event => event.preventDefault()} onCut={event => event.preventDefault()} onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()} onDragStart={event => event.preventDefault()} onContextMenu={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!copying) onCancel() }
        if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x'].includes(event.key.toLowerCase())) event.preventDefault()
      }}>
      <h2 id="memo-copy-title">Un momento prima di copiare</h2>
      <p>Ricopia questa frase per continuare:</p>
      <blockquote className="memo-copy-phrase">{phrase}</blockquote>
      <form onSubmit={event => { event.preventDefault(); void confirm() }}>
        <label>La tua frase<textarea aria-label="Ricopia la frase" value={value} autoComplete="off" spellCheck={false} maxLength={500} disabled={copying}
          onBeforeInput={event => { if (/insertFrom(Paste|Drop)/.test((event.nativeEvent as InputEvent).inputType)) event.preventDefault() }}
          onChange={event => setValue(event.target.value)} /></label>
        <p role="alert">{error}</p>
        <p role="status">{correct ? 'Frase corretta. Puoi copiare gli appunti.' : 'Maiuscole e spazi aggiuntivi non contano.'}</p>
        <div className="memo-copy-actions"><button type="button" disabled={copying} onClick={onCancel}>Annulla</button><button type="submit" disabled={!correct || copying}>{copying ? 'Copia…' : 'Copia appunti'}</button></div>
      </form>
    </div>
  </div>
}
