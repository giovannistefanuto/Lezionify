import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToolSettings } from './ToolSettingsContext'
import { useOfflineTranslationStatus } from '../hooks/useOfflineTranslationStatus'
import { detectDictionaryDirection, dictionaryPartOfSpeech, type DictionaryDirection, type DictionaryResult } from '../../shared/dictionary'

// Bergamot accepts one request at a time. Keep this queue across overlay remounts;
// cancelled drafts are skipped before calling the worker.
let phraseWork: Promise<void> = Promise.resolve()

export function DictionaryOverlay({ onClose }: { onClose: () => void }) {
  const settings = useToolSettings()
  const settingsOpen = useRef(settings.isOpen); settingsOpen.current = settings.isOpen
  const [direction, setDirection] = useState<DictionaryDirection>('it-en')
  const lastDirection = useRef<DictionaryDirection>('it-en')
  const [phraseDirection, setPhraseDirection] = useState<DictionaryDirection>('it-en')
  const [phraseResult, setPhraseResult] = useState('')
  const [phraseError, setPhraseError] = useState('')
  const [composing, setComposing] = useState(false)
  const [manualDirection, setManualDirection] = useState<DictionaryDirection | null>(null)
  const [detection, setDetection] = useState<'detected' | 'ambiguous' | 'unknown' | null>(null)
  const [query, setQuery] = useState('')
  const isPhrase = /\s/.test(query.trim())
  const shownDirection = isPhrase ? phraseDirection : direction
  const [result, setResult] = useState<DictionaryResult | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [retry, setRetry] = useState(0)
  const { status, statusError } = useOfflineTranslationStatus(!settings.isOpen, retry)
  const modelsReady = Boolean(status?.installed && !status.installing)
  const [host, setHost] = useState<Element>(document.fullscreenElement ?? document.body)
  const panel = useRef<HTMLElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const restoreFocus = useRef(true)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    input.current?.focus()
    const outside = (event: PointerEvent) => {
      if (settingsOpen.current) return
      if (!panel.current?.contains(event.target as Node)) { restoreFocus.current = false; onClose() }
    }
    const escape = (event: KeyboardEvent) => {
      if (settingsOpen.current) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onClose() }
    }
    const fullscreen = () => setHost(document.fullscreenElement ?? document.body)
    window.addEventListener('keydown', escape, true)
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('fullscreenchange', fullscreen)
    return () => {
      window.removeEventListener('keydown', escape, true)
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('fullscreenchange', fullscreen)
      if (restoreFocus.current && previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [onClose])
  useEffect(() => { if (!settings.isOpen) input.current?.focus() }, [host, settings.isOpen])
  useEffect(() => {
    let cancelled = false
    setPhraseResult(''); setPhraseError('')
    if (!isPhrase || !modelsReady || composing || settings.isOpen) return
    setLoading(true)
    const timer = window.setTimeout(() => {
      phraseWork = phraseWork.then(async () => {
        if (cancelled) return
        try {
          const value = await window.archive.translatePhrase(query.trim(), phraseDirection)
          if (!cancelled) setPhraseResult(value.text)
        } catch (failure) { if (!cancelled) setPhraseError(failure instanceof Error ? failure.message : 'Traduzione non riuscita. Riprova.') }
        finally { if (!cancelled) setLoading(false) }
      })
    }, 500)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, isPhrase, phraseDirection, modelsReady, composing, settings.isOpen, retry])
  useEffect(() => {
    let cancelled = false
    setResult(null); setDetection(null); setError(false)
    if (isPhrase) { if (!modelsReady || composing || settings.isOpen) setLoading(false); return }
    setLoading(Boolean(query.trim()) && !composing && !settings.isOpen)
    if (!query.trim() || composing || settings.isOpen) return
    const timer = window.setTimeout(() => {
      void Promise.resolve().then(async () => {
        if (manualDirection) return { value: await window.archive.lookupDictionary(query, manualDirection), selected: manualDirection, status: null }
        const [english, italian] = await Promise.all([
          window.archive.lookupDictionary(query, 'en-it'), window.archive.lookupDictionary(query, 'it-en')
        ])
        const detected = detectDictionaryDirection(english, italian)
        const selected = detected ?? lastDirection.current
        const status = detected ? 'detected' as const : english.entries.length && italian.entries.length ? 'ambiguous' as const : 'unknown' as const
        return { value: selected === 'en-it' ? english : italian, selected, status }
      }).then(({ value, selected, status }) => {
        if (!cancelled) {
          lastDirection.current = selected; setDirection(selected); setDetection(status); setResult(value); setLoading(false)
        }
      }).catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    }, 120)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query, manualDirection, retry, isPhrase, composing, settings.isOpen, modelsReady])
  return createPortal(<div className="dictionary-overlay" data-dictionary-overlay style={settings.isOpen ? { display: 'none' } : undefined}>
    <section className="dictionary-panel" ref={panel} role="dialog" aria-label="Vocabolario offline">
      <header><strong>Vocabolario <span>offline</span></strong><button type="button" aria-label="Chiudi vocabolario" onClick={onClose}>×</button></header>
      <div className="dictionary-search-row">
        <input ref={input} aria-label="Parola o frase" placeholder="Scrivi una parola o una frase…" maxLength={2000} value={query} onChange={event => setQuery(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} autoComplete="off" spellCheck={false} />
        <button type="button" className="dictionary-direction" aria-label="Inverti le lingue" title="Inverti le lingue" onClick={() => {
          const selected = shownDirection === 'en-it' ? 'it-en' : 'en-it'
          setPhraseDirection(selected)
          lastDirection.current = selected; setDirection(selected); setManualDirection(selected); input.current?.focus()
        }}>{shownDirection === 'en-it' ? 'EN → IT' : 'IT → EN'} ⇄</button>
      </div>
      <div className="dictionary-results" aria-live="polite" aria-busy={loading}>
        {isPhrase ? <>
          <p className="dictionary-hint">Traduzione automatica sul PC · Mozilla/Bergamot · può sbagliare termini tecnici. Formule, codice tra backtick e URL restano invariati.</p>
          {!modelsReady && <p>{status?.installing ? 'Installazione dei modelli in corso…' : status ? 'Per tradurre le frasi servono i modelli offline.' : 'Verifica dei modelli offline…'} <button type="button" onClick={() => settings.open('translation')}>Apri Impostazioni traduttore</button></p>}
          {loading && <p role="status">Traduzione…</p>}
          {phraseResult && <div className="phrase-result" aria-label="Traduzione offline">{phraseResult}</div>}
          {(phraseError || statusError) && <p role="alert">{phraseError || statusError} <button type="button" onClick={() => setRetry(value => value + 1)}>Riprova</button></p>}
        </> : <>
        <p className="dictionary-hint">{manualDirection ? <>Direzione manuale · <button type="button" onClick={() => { setManualDirection(null); input.current?.focus() }}>Riconosci automaticamente</button></> : 'Riconoscimento automatico IT/EN'}
          {detection === 'detected' && ` · Voce ${direction === 'en-it' ? 'inglese' : 'italiana'}`}
          {detection === 'ambiguous' && ' · Voce presente in entrambe le lingue: puoi invertire la direzione.'}
          {detection === 'unknown' && ' · Lingua non riconosciuta: direzione mantenuta, puoi invertirla.'}
        </p>
        {!query.trim() && <p className="dictionary-hint">Ctrl+T per aprire o chiudere · Esc per tornare alla lezione.</p>}
        {loading && <p>Ricerca…</p>}
        {error && <p role="alert">Vocabolario locale non disponibile. <button type="button" onClick={() => setRetry(value => value + 1)}>Riprova</button></p>}
        {result?.inflected && <p className="dictionary-hint">“{query.trim()}”: forma flessa di <strong>{result.lemma}</strong>.</p>}
        {result?.entries.map((entry, index) => <article key={index} className="dictionary-entry">
          <h3>{entry.word}: {entry.senses.map(sense => sense.translations.join(', ')).join('; ')}</h3>
          <p className="dictionary-grammar">{dictionaryPartOfSpeech(entry.partOfSpeech)} {entry.pronunciation}</p>
          {entry.senses.map((sense, senseIndex) => sense.definitions.length > 0 && <p key={senseIndex}>{sense.definitions.join(' ')}</p>)}
        </article>)}
        {result && result.entries.length === 0 && <>
          <p>Nessuna voce trovata.</p>
          {result.suggestions.length > 0 && <div className="dictionary-suggestions" aria-label="Voci suggerite">{result.suggestions.map(word => <button type="button" key={word} onClick={() => { setQuery(word); input.current?.focus() }}>{word}</button>)}</div>}
        </>}
        </>}
      </div>
      <details className="dictionary-source"><summary>FreeDict / WikDict · CC BY-SA 3.0</summary><p>Dizionari di Karl Bartel, dai contributi Wiktionary tramite DBnary · versione 2025.11.23. Le definizioni restano nella lingua della fonte e possono mancare. Dati adattati da TEI a JSON, disponibili sotto CC BY-SA 3.0. Nessuna ricerca viene inviata online.</p><p>freedict.org · wikdict.com · wiktionary.org · creativecommons.org/licenses/by-sa/3.0</p></details>
    </section>
  </div>, host)
}
