import { act, useRef, useState } from 'react'
import type { Root } from 'react-dom/client'
import { DictionaryOverlay } from '../../src/components/DictionaryOverlay'
import { SettingsModal } from '../../src/components/SettingsModal'
import { ToolSettingsContext, type ToolSettingsSection } from '../../src/components/ToolSettingsContext'
import { useFocusModeController } from '../../src/hooks/useFocusModeController'
import { OfflineTranslationSettings } from '../../src/components/OfflineTranslationSettings'

declare const require: any

export async function runToolSettingsScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
  const oldStatus = api.offlineTranslationStatus, oldInstall = api.installOfflineTranslation, oldTranslate = api.translatePhrase
  let installed = false, downloads = 0, translations = 0
  api.offlineTranslationStatus = async () => ({ installed, installing: false, downloadBytes: 53000000, diskBytes: 74000000 })
  api.installOfflineTranslation = async () => { installed = true; downloads++; return api.offlineTranslationStatus() }
  api.translatePhrase = async () => { translations++; return { text: 'A translated phrase', direction: 'it-en', engine: 'Mozilla/Bergamot' } }
  const noop = () => {}
  const settingsProps: any = { show: true, inputApiKeys: [], inputApiKeyQuotaGroups: [], setQuotaGroupForKey: noop,
    activeKeyIdx: 0, setActiveKeyIdx: noop, autoRotate: true, setAutoRotate: noop, autoProcessOnImport: false, setAutoProcessOnImport: noop,
    inputModel: 'gemini-3.5-flash-lite', setInputModel: noop, newKeyInput: '', setNewKeyInput: noop, keyTestStates: {}, isSaving: false,
    onAddKey: noop, onRemoveKey: noop, onTestKey: noop, onSave: noop, publishingEnabled: false, setPublishingEnabled: noop,
    publishingRepoUrl: '', setPublishingRepoUrl: noop, publishingToken: '', setPublishingToken: noop, publishingStatus: null }
  function Harness() {
    const [section, setSection] = useState<ToolSettingsSection | null>(null)
    return <ToolSettingsContext.Provider value={{ isOpen: section !== null, open: setSection }}>
      <DictionaryOverlay onClose={noop} />
      {section && <SettingsModal {...settingsProps} initialSection={section} onClose={() => setSection(null)} />}
    </ToolSettingsContext.Provider>
  }
  let exits = 0, closes = 0
  function FocusSettingsHarness() {
    const content = useRef<HTMLDivElement>(null), zoomLabel = useRef<HTMLSpanElement>(null), zoom = useRef(1)
    useFocusModeController({ isFullScreen: true, setIsFullScreen: noop, pauseTimerActive: false, showFocusLock: false,
      onClose: () => { exits++ }, requestExitFocus: () => { exits++ }, exitFromPause: noop, resumeFromPause: noop, handleContinueFocus: noop,
      contentRef: content, zoomLabelRef: zoomLabel, zoomLevelRef: zoom, hasContent: false })
    return <SettingsModal {...settingsProps} initialSection="music" onClose={() => { closes++ }} />
  }
  const click = async (text: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(value => value.textContent?.trim() === text || value.getAttribute('aria-label') === text)
    check(button, `Missing ${text}`); await act(async () => button!.click())
  }
  try {
    await act(async () => root.render(null))
    await act(async () => root.render(<Harness />)); await settle()
    const input = document.querySelector<HTMLInputElement>('[aria-label="Parola o frase"]')!
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Una frase'); input.dispatchEvent(new Event('input', { bubbles: true })) }); await settle()
    check(downloads === 0 && translations === 0, 'Missing models must not trigger automatic installation or online translation')
    await click('Apri Impostazioni traduttore'); await settle()
    check(Boolean(document.querySelector('[aria-label="Traduttore offline"]')), 'Missing-model link must open the exact settings section')
    check(getComputedStyle(document.querySelector('[data-dictionary-overlay]')!).display === 'none', 'Dictionary must yield keyboard and pointer access to settings')
    await click('Scarica / ripara modelli offline'); await settle()
    check(downloads === 1, 'Only the explicit download action may install models')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'tools-settings-translation')
    await click('Musica'); await settle()
    check(Boolean(document.querySelector('[aria-label="Client ID Spotify"]')) && !document.querySelector('[aria-label="Traduttore offline"]'), 'Music settings must contain account configuration in its own section')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'tools-settings-music')
    const modal = document.querySelector<HTMLElement>('[aria-label="Impostazioni"]')!
    await act(async () => modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))); await settle(); await settle()
    check(!document.querySelector('.settings-modal-overlay') && input.value === 'Una frase', 'Escape must close settings and restore the existing dictionary input')
    check(document.querySelector('[aria-label="Traduzione offline"]')?.textContent === 'A translated phrase' && translations === 1, 'Returning from model installation must resume local translation without retyping')
    await act(async () => root.render(<FocusSettingsHarness />)); await settle()
    await act(async () => document.querySelector<HTMLElement>('[aria-label="Impostazioni"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    check(closes === 1 && exits === 0, 'Escape in settings opened from Music must not exit Focus or close the lecture')
    let installing = true
    api.offlineTranslationStatus = async () => ({ installed: !installing, installing, downloadBytes: 53000000, diskBytes: 74000000 })
    await act(async () => root.render(<OfflineTranslationSettings />)); await settle()
    check(document.querySelector<HTMLButtonElement>('.offline-translation-settings button')?.disabled, 'A running model download must disable duplicate installation')
    installing = false
    await settle(); await settle(); await settle()
    check(document.body.textContent?.includes('Modelli installati') && !document.querySelector<HTMLButtonElement>('.offline-translation-settings button')?.disabled, 'Returning to a running install must refresh its eventual result')
  } finally {
    await act(async () => root.render(null))
    api.offlineTranslationStatus = oldStatus; api.installOfflineTranslation = oldInstall; api.translatePhrase = oldTranslate
  }
}
