import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { DictionaryOverlay } from '../../src/components/DictionaryOverlay'
import { FocusLockModal } from '../../src/components/FocusLockModal'
import { PauseTimerOverlay } from '../../src/components/PauseTimerOverlay'
import { useDictionaryShortcut } from '../../src/hooks/useDictionaryShortcut'
import { useFocusModeController } from '../../src/hooks/useFocusModeController'
import { DictionaryIndex, type DictionaryEntry } from '../../shared/dictionary'

declare const require: any

export async function runDictionaryScenarios(root: Root, api: any) {
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 180)) })
  const until = async (condition: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 20 && !condition(); attempt++) await settle()
    check(condition(), message)
  }
  const entry = (word: string, translation: string): DictionaryEntry => ({ word, pronunciation: '', partOfSpeech: 'v', senses: [{ translations: [translation], definitions: ['Breve descrizione della voce.'] }] })
  const english = new DictionaryIndex({ entries: [entry('search', 'cercare'), entry('look up', 'cercare'), entry('sale', 'vendita')] })
  const italian = new DictionaryIndex({ entries: [entry('cercare', 'search'), entry('trascrivere', 'transcribe'), entry('sale', 'salt'), entry('a causa di', 'because of')] })
  const lookup = async (query: string, direction: 'en-it' | 'it-en') => (direction === 'en-it' ? english : italian).lookup(query, direction)
  const originalLookup = api.lookupDictionary
  const originalStatus = api.offlineTranslationStatus
  const originalTranslate = api.translatePhrase
  const phrases: { text: string; direction: string }[] = []
  api.offlineTranslationStatus = async () => ({ installed: true, installing: false, downloadBytes: 53000000, diskBytes: 74000000 })
  api.translatePhrase = async (text: string, direction: string) => { phrases.push({ text, direction }); return { text: `Traduzione: ${text}`, direction, engine: 'Mozilla/Bergamot' } }
  api.lookupDictionary = lookup
  let focusExitRequests = 0
  let drawerCloses = 0
  let fullscreen = false
  let auxiliary: 'lock' | 'pause' | null = null
  let continues = 0
  let fullscreenHost: Element | null = null
  const originalFullscreen = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenHost })
  function Harness() {
    const content = useRef<HTMLDivElement>(null)
    const label = useRef<HTMLSpanElement>(null)
    const zoom = useRef(1)
    // Register Focus first to exercise the actual Escape priority guard.
    useFocusModeController({ isFullScreen: fullscreen, setIsFullScreen: () => {}, pauseTimerActive: auxiliary === 'pause', showFocusLock: auxiliary === 'lock',
      onClose: () => { drawerCloses++ }, requestExitFocus: () => { focusExitRequests++ }, exitFromPause: () => {},
      resumeFromPause: () => {}, handleContinueFocus: () => {}, contentRef: content, zoomLabelRef: label, zoomLevelRef: zoom, hasContent: false })
    const dictionary = useDictionaryShortcut()
    return <div ref={content}><button id="dictionary-return-target">Torna alla lezione</button><p id="selected-notes" data-notes-language="en">A selected phrase from the notes.</p>
      {auxiliary === 'lock' && <FocusLockModal show courseCode="TEST" sessionSeconds={20} lectureTotalSeconds={40} onContinue={() => { continues++ }} onQuit={() => { focusExitRequests++ }} />}
      {auxiliary === 'pause' && <PauseTimerOverlay show minutes={5} onReturnToStudy={() => { continues++ }} onQuit={() => { focusExitRequests++ }} />}
      {dictionary.isOpen && <DictionaryOverlay onClose={dictionary.close} selection={dictionary.selection} />}
    </div>
  }
  const keyboard = async (key: string, ctrlKey = false, extra: Partial<KeyboardEventInit> = {}) => act(async () => {
    (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true, ...extra }))
  })
  const type = async (text: string) => act(async () => {
    const input = document.querySelector<HTMLTextAreaElement>('[aria-label="Parola o frase"]')!
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(style)
  try {
    await act(async () => root.render(<Harness />))
    document.getElementById('dictionary-return-target')!.focus()
    await keyboard('t', true)
    check(!document.querySelector('.dictionary-mode'), 'Words and phrases must share one field without mode tabs')
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('IT → EN'), 'Every opening must start IT to EN')
    check(document.querySelector('[data-dictionary-overlay]') && document.activeElement?.getAttribute('aria-label') === 'Parola o frase', 'Ctrl+T must open and focus the ordinary dictionary')
    await keyboard('t', true, { repeat: true })
    check(document.querySelector('[data-dictionary-overlay]'), 'Holding the shortcut must not toggle repeatedly')
    await type('Searching')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('search: cercare')), 'Inflected English lookup failed')
    check(document.querySelector('.dictionary-results')?.textContent?.includes('forma flessa di'), 'Resolved base form should be explained')
    await type('cercare')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('cercare: search')), 'Italian must be detected without a manual inversion')
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('IT → EN'), 'Automatic Italian detection must update the direction control')
    await type('trascrivi')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('trascrivere: transcribe')), 'Italian verb form must be detected and translated automatically')
    check(document.querySelector('.dictionary-results')?.textContent?.includes('forma flessa di'), 'Italian inflection must identify its lemma')
    await type('sale')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('sale: salt')), 'Ambiguity must retain the last direction')
    check(document.querySelector('.dictionary-results')?.textContent?.includes('entrambe le lingue'), 'Ambiguity must be explained')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Inverti le lingue"]')!.click())
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('sale: vendita')), 'Manual inversion must resolve ambiguity')
    await type('cercare')
    await until(() => Boolean(document.querySelector('.dictionary-results')?.textContent?.includes('Nessuna voce trovata')), 'Manual direction must remain stable for new queries')
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('EN → IT'), 'Detection must not override a manual choice')
    await act(async () => Array.from(document.querySelectorAll<HTMLButtonElement>('.dictionary-results button')).find(button => button.textContent === 'Riconosci automaticamente')!.click())
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('cercare: search')), 'Automatic mode must be recoverable')
    await type('a causa di')
    await until(() => Boolean(document.querySelector('[aria-label="Traduzione offline"]')?.textContent?.includes('a causa di')), 'Multiple words must translate automatically')
    check(phrases.at(-1)?.direction === 'en-it', 'Explicit inversion must persist for subsequent phrases within this opening')
    await type('zzzxxyy')
    await until(() => Boolean(document.querySelector('.dictionary-results')?.textContent?.includes('Lingua non riconosciuta')), 'Unknown input must explain the retained direction')
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('IT → EN'), 'Unknown input must not flip direction')
    await until(() => phrases.at(-1)?.text === 'zzzxxyy', 'Missing dictionary word must automatically fall back to the phrase model')
    check(phrases.at(-1)?.direction === 'it-en', 'Fallback must preserve the dictionary direction')
    await type('trascr')
    await until(() => phrases.at(-1)?.text === 'trascr', 'Suggestions must not prevent model fallback')
    check(document.querySelector('.dictionary-suggestions')?.textContent?.includes('trascrivere'), 'Dictionary suggestions must remain available')
    await type('Searching')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('search: cercare')), 'English must be detected after Italian')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'dictionary-light')
    document.documentElement.setAttribute('data-theme', 'dark')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'dictionary-dark')
    document.documentElement.removeAttribute('data-theme')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Inverti le lingue"]')!.click())
    await type('trascrivi')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('trascrivere: transcribe')), 'Italian verb form must also work with manual IT EN')
    await type('cercare')
    await until(() => Boolean(document.querySelector('.dictionary-entry')?.textContent?.includes('cercare: search')), 'Inverting languages must use the Italian lexicon')
    await keyboard('Escape')
    check(!document.querySelector('[data-dictionary-overlay]') && drawerCloses === 0, 'Escape must close only the dictionary, leaving the drawer open')
    check(document.activeElement?.id === 'dictionary-return-target', 'Closing must restore focus to the reading control')

    fullscreenHost = document.createElement('div')
    document.body.appendChild(fullscreenHost)
    fullscreen = true
    await act(async () => root.render(<Harness />))
    for (const language of ['en', 'it']) {
      const paragraph = document.getElementById('selected-notes')!
      paragraph.dataset.notesLanguage = language
      const range = document.createRange(); range.selectNodeContents(paragraph)
      window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range)
      const before = phrases.length
      await keyboard('t', true)
      check(document.querySelector<HTMLTextAreaElement>('[aria-label="Parola o frase"]')?.value === paragraph.textContent, 'Selected text must be present as soon as the translator opens')
      check(phrases.length === before, 'Translation must not start before the populated overlay opens')
      window.getSelection()!.removeAllRanges()
      await until(() => phrases.length > before, 'Selected notes must translate after opening')
      check(phrases.at(-1)?.direction === (language === 'en' ? 'en-it' : 'it-en'), 'Selected notes must use the actual source language')
      await keyboard('Escape')
    }
    await keyboard('t', true)
    check(fullscreenHost.querySelector('[data-dictionary-overlay]'), 'Dictionary portal must be visible inside the fullscreen element')
    await type('look up')
    await until(() => Boolean(document.querySelector('[aria-label="Traduzione offline"]')?.textContent?.includes('look up')), 'Automatic offline phrase translation failed')
    check(phrases.at(-1)?.direction === 'it-en', 'Reopening must reset phrase direction to IT EN')
    const beforeInversion = phrases.length
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Inverti le lingue"]')!.click())
    await until(() => phrases.length > beforeInversion, 'Inverting a phrase must automatically translate it again')
    check(phrases.at(-1)?.direction === 'en-it', 'Phrase inversion must use the chosen direction')
    await keyboard('Escape')
    check(focusExitRequests === 0 && !document.querySelector('[data-dictionary-overlay]'), 'Escape in the dictionary must not trigger Focus exit or lock countdown')
    await keyboard('t', true)
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('IT → EN'), 'Closing an inverted phrase must still reset IT EN on reopening')
    const resolveOld: (() => void)[] = []
    api.lookupDictionary = (query: string, direction: 'en-it' | 'it-en') => new Promise(resolve => { resolveOld.push(() => resolve((direction === 'en-it' ? english : italian).lookup(query, direction))) })
    await type('cercare')
    await settle()
    check(resolveOld.length === 2, 'Automatic detection must consult both local dictionaries')
    api.lookupDictionary = lookup
    await type('unknown whole sentence')
    await until(() => Boolean(document.querySelector('[aria-label="Traduzione offline"]')?.textContent?.includes('unknown whole sentence')), 'Phrase must use the local translator')
    const longPhrase = 'Una frase lunga con dettagli da tradurre. '.repeat(35)
    await type(longPhrase)
    await until(() => Boolean(document.querySelector('[aria-label="Traduzione offline"]')?.textContent?.includes(longPhrase.trim())), 'Long phrase was truncated')
    const sourceField = document.querySelector<HTMLTextAreaElement>('[aria-label="Parola o frase"]')!
    const translated = document.querySelector<HTMLElement>('[aria-label="Traduzione offline"]')!
    check(sourceField.value === longPhrase && parseFloat(getComputedStyle(sourceField).fontSize) === parseFloat(getComputedStyle(translated).fontSize), 'Translator must retain complete source and equally readable translation')
    check(sourceField.getBoundingClientRect().right < translated.getBoundingClientRect().left, 'Translator panels must be side by side on desktop')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'dictionary-long')
    await require('electron').ipcRenderer.invoke('feature-test-window-size', true)
    await settle()
    check(sourceField.getBoundingClientRect().bottom < translated.getBoundingClientRect().top && document.querySelector('.dictionary-panel')!.getBoundingClientRect().width <= window.innerWidth, 'Narrow translator must stack panels without horizontal overflow')
    await require('electron').ipcRenderer.invoke('feature-test-window-size', false)
    await settle()
    await act(async () => resolveOld.forEach(resolve => resolve()))
    check(!document.querySelector('.dictionary-entry'), 'A delayed previous search must not replace current results')
    check(document.querySelector('.dictionary-direction')?.textContent?.includes('IT → EN'), 'A delayed word lookup must not change phrase direction')
    api.lookupDictionary = async (query: string, direction: 'en-it' | 'it-en') => {
      if (direction === 'it-en') throw new Error('Synthetic unavailable lexicon')
      return lookup(query, direction)
    }
    await type('search')
    await until(() => Boolean(document.querySelector('.dictionary-results [role="alert"]')), 'Local failures must be recoverable')
    check(!document.querySelector('.dictionary-entry') && !document.querySelector('.dictionary-results')?.textContent?.includes('Voce inglese'), 'One unavailable dictionary must not produce a false language detection')
    api.lookupDictionary = lookup
    await act(async () => document.querySelector<HTMLButtonElement>('.dictionary-results [role="alert"] button')!.click())
    await until(() => Boolean(document.querySelector('.dictionary-entry')), 'Retry must recover the offline lookup')
    const pending: { text: string; resolve: (value: any) => void }[] = []
    api.translatePhrase = (text: string, direction: string) => new Promise(resolve => { pending.push({ text, resolve: value => resolve({ text: value, direction, engine: 'Mozilla/Bergamot' }) }) })
    await type('prima frase'); await until(() => pending.length === 1, 'First phrase request missing')
    await type('seconda frase'); await settle(); await settle(); await settle(); await settle()
    check(pending.length === 1, 'Only one local translation may run at a time')
    await type('ultima frase'); await settle(); await settle(); await settle(); await settle()
    await act(async () => pending[0].resolve('Risultato obsoleto'))
    await until(() => pending.length === 2, 'The newest queued phrase must run after the active translation')
    check(pending[1].text === 'ultima frase' && !document.querySelector('[aria-label="Traduzione offline"]'), 'Obsolete intermediate requests must be skipped and old results hidden')
    await act(async () => pending[1].resolve('Ultima traduzione'))
    check(document.querySelector('[aria-label="Traduzione offline"]')?.textContent === 'Ultima traduzione', 'Newest phrase result missing')
    await type('terza frase'); await until(() => pending.length === 3, 'Third phrase request missing')
    await type('cercare'); await until(() => Boolean(document.querySelector('.dictionary-entry')), 'Switching back to a word must restore dictionary lookup')
    await act(async () => pending[2].resolve('Non mostrare'))
    check(!document.querySelector('[aria-label="Traduzione offline"]'), 'Late phrase result must stay hidden in word mode')
    await keyboard('t', true)
    check(!document.querySelector('[data-dictionary-overlay]'), 'Ctrl+T must also close the dictionary in Focus')
    await keyboard('t', true)
    await act(async () => document.getElementById('dictionary-return-target')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
    check(!document.querySelector('[data-dictionary-overlay]'), 'Clicking outside must close the floating box')
    for (const mode of ['lock', 'pause'] as const) {
      auxiliary = mode
      await act(async () => root.render(<Harness />))
      await keyboard('t', true)
      await settle()
      check(document.activeElement?.getAttribute('aria-label') === 'Parola o frase', `${mode} autofocus must not steal focus from the dictionary`)
      await keyboard('Escape')
      check(continues === 0 && focusExitRequests === 0 && !document.querySelector('[data-dictionary-overlay]'), `${mode} Escape must leave the underlying countdown or pause intact`)
    }
  } finally {
    await act(async () => root.render(null))
    fullscreenHost?.remove()
    if (originalFullscreen) Object.defineProperty(document, 'fullscreenElement', originalFullscreen)
    else delete (document as any).fullscreenElement
    api.lookupDictionary = originalLookup
    api.offlineTranslationStatus = originalStatus
    api.translatePhrase = originalTranslate
    style.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}
