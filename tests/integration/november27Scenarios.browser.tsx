import { useFocusModeController } from '../../src/hooks/useFocusModeController'
import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { AudioImportModal } from '../../src/components/AudioImportModal'
import { FocusScreenshotButton } from '../../src/components/FocusScreenshot'
import { registerScreenshotSource } from '../../src/utils/screenshotSource'

declare const require: any
const ipc = require('electron').ipcRenderer
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
export async function runNovember27Scenarios(root: Root, api: any) {
  const previous = { ...api }
  const previousWindow = await ipc.invoke('nov27-window-state')
  const previousTheme = document.documentElement.getAttribute('data-theme')
  await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 })
  await ipc.invoke('feature-test-zoom', 1)
  document.documentElement.removeAttribute('data-theme')
  const style = document.createElement('style'); style.textContent = await ipc.invoke('video-import-styles'); document.head.append(style)
  const render = async (node: React.ReactNode) => act(async () => root.render(node))
  const until = async (test: () => boolean, message: string) => {
    for (let i = 0; i < 80; i++) { if (test()) return; await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) }) }
    throw new Error(`${message}; window=${JSON.stringify(await ipc.invoke('nov27-window-state'))}; dialog=${document.querySelector('.focus-screenshot-selection')?.getBoundingClientRect().toJSON ? JSON.stringify(document.querySelector('.focus-screenshot-selection')!.getBoundingClientRect().toJSON()) : 'closed'}; status=${document.querySelector('.screenshot-instructions')?.textContent}`)
  }
  const painted = async () => act(async () => { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await ipc.invoke('nov27-screenshot-painted') })
  const click = async (selector: string) => act(async () => (document.querySelector(selector) as HTMLElement).click())
  const selection = { token: 'synthetic-audio', files: [{ id: 'a', name: 'Registrazione sintetica.mp3', courseCode: null, recordedAt: '2026-11-24T10:30' }] }
  let imported: any = null, cancelled = 0, closed = 0, focusExits = 0
  function ScreenshotHarness() {
    const contentRef = useRef<HTMLDivElement>(null), zoomLabelRef = useRef<HTMLSpanElement>(null), zoomLevelRef = useRef(1)
    useFocusModeController({ isFullScreen: true, setIsFullScreen: () => { focusExits++ }, pauseTimerActive: false, showFocusLock: false,
      onClose: () => { focusExits++ }, requestExitFocus: () => { focusExits++ }, exitFromPause() {}, resumeFromPause() {}, handleContinueFocus() {},
      contentRef, zoomLabelRef, zoomLevelRef, hasContent: false })
    return <main style={{ padding: 60, height: '100vh', background: '#135c45' }}><h1>Studio sintetico</h1><FocusScreenshotButton /></main>
  }
  api.confirmAudioImport = async (_token: string, metadata: any) => { imported = metadata; return { imported: [], skipped: [] } }
  api.cancelAudioImport = async () => { cancelled++ }
  try {
    await render(<AudioImportModal selection={selection} courses={[]} onClose={() => { closed++ }} onImported={() => {}} />)
    check(!imported && document.querySelector('dialog[open] input[type="datetime-local"]'), 'Audio must wait for course and time confirmation')
    await ipc.invoke('capture-video-import', 'nov27-audio-light')
    document.documentElement.setAttribute('data-theme', 'dark')
    await ipc.invoke('capture-video-import', 'nov27-audio-dark')
    const originalSize = { width: 1240, height: 820 }
    await ipc.invoke('feature-test-window-size', { width: 390, height: 750 })
    const bounds = document.querySelector('dialog')!.getBoundingClientRect()
    check(bounds.left >= 0 && bounds.right <= innerWidth, 'Audio import overflows a narrow window')
    await ipc.invoke('capture-video-import', 'nov27-audio-narrow')
    await ipc.invoke('feature-test-window-size', originalSize)
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    check(imported?.[0]?.recordedAt === '2026-11-24T10:30' && closed === 1, 'Audio lost the chosen recording time')
    await render(null)
    imported = null
    await render(<AudioImportModal selection={selection} courses={[]} onClose={() => { closed++ }} onImported={() => {}} />)
    await click('button[type="button"]')
    check(cancelled === 1 && !imported, 'Cancel imported audio')
    await render(null)

    api.beginFocusScreenshot = () => ipc.invoke('nov27-screenshot-begin')
    api.cancelFocusScreenshot = (token: string) => ipc.invoke('nov27-screenshot-cancel', token)
    let fail = true, cropWasUsed = false
    api.saveFocusScreenshot = (token: string, rect: any, enhanced: any) => {
      if (fail) { fail = false; throw new Error('Errore sintetico di salvataggio') }
      cropWasUsed = enhanced instanceof Uint8Array
      return ipc.invoke('nov27-screenshot-save', token, rect, enhanced)
    }
    await render(<ScreenshotHarness />)
    await painted()
    await click('[aria-label="Screenshot"]')
    await until(() => Boolean(document.querySelector('.focus-screenshot-selection[open]')), 'Screenshot selection did not open')
    const source = document.querySelector('main')!
    const release = registerScreenshotSource(source, async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 320, 240)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve))
      return new Uint8Array(await blob!.arrayBuffer())
    })
    try {
      await act(async () => { await ipc.invoke('nov27-screenshot-drag', { x: 400, y: 400 }, { x: 240, y: 280 }) })
      await until(() => document.body.textContent!.includes('Errore sintetico'), 'Save error lost the frozen selection')
      await ipc.invoke('capture-video-import', 'nov27-screenshot-retry')
      await act(async () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Riprova')!.click())
      await until(() => !document.querySelector('.focus-screenshot-selection'), 'Successful retry did not close screenshot selection')
      const files = await ipc.invoke('nov27-screenshot-files')
      check(cropWasUsed && files.length === 1 && files[0].width === 320 && files[0].height === 240, 'Source crop was not saved as a valid PNG')
      release()
      await painted()
      await click('[aria-label="Screenshot"]')
      await until(() => Boolean(document.querySelector('.focus-screenshot-selection[open]')), 'Native screenshot did not open')
      await act(async () => { await ipc.invoke('nov27-screenshot-drag', { x: 400, y: 400 }, { x: 240, y: 280 }) })
      await until(() => !document.querySelector('.focus-screenshot-selection'), 'Native screenshot was not saved')
      const nativeFiles = await ipc.invoke('nov27-screenshot-files')
      check(nativeFiles.length === 2 && nativeFiles.some((file:any) => file.rgb === '19,92,69'), `Native crop lost the visible frozen content or contains selection decorations: ${JSON.stringify(nativeFiles)}`)
      await painted()
      await click('[aria-label="Screenshot"]')
      await until(() => Boolean(document.querySelector('.focus-screenshot-selection[open]')), 'Second screenshot did not open')
      await act(async () => { await ipc.invoke('nov27-screenshot-escape') })
      check(focusExits === 0, 'Screenshot Escape must not reach the Full Focus exit handler')
      await until(() => !document.querySelector('.focus-screenshot-selection'), 'Escape did not cancel screenshot')
      check((await ipc.invoke('nov27-screenshot-files')).length === 2, 'Cancellation created an extra PNG')
    } finally { release() }
  } finally {
    await render(null)
    Object.keys(api).forEach(key => { if (!Object.hasOwn(previous, key)) delete api[key] }); Object.assign(api, previous)
    style.remove(); if (previousTheme === null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', previousTheme)
    await ipc.invoke('feature-test-zoom', previousWindow.zoom)
    await ipc.invoke('feature-test-window-size', previousWindow.size)
  }
}
