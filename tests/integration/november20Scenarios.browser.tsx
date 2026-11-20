import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { HomePause } from '../../src/components/HomePause'
import { DeviceNotices, DeviceNoticeSettings } from '../../src/components/DeviceNotices'
import { StudyRecords } from '../../src/components/StudyRecords'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { DEFAULT_DEVICE_NOTICES, type DeviceNotice } from '../../shared/deviceNotices'
declare const require: any

export async function runNovember20Scenarios(root: Root, api: any) {
  const ipc = require('electron').ipcRenderer, originals = { ...api }
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const render = async (node: React.ReactNode) => act(async () => root.render(node))
  const click = async (element: Element | null) => { check(element, 'Missing control'); await act(async () => (element as HTMLElement).click()) }
  const wait = async (ms = 50) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
  const style = document.createElement('style'); style.textContent = await ipc.invoke('video-import-styles'); document.head.append(style)
  const originalNow = Date.now
  const attributes = ['data-theme', 'class'].map(name => [name, document.documentElement.getAttribute(name)] as const)
  let emit: ((value: DeviceNotice) => void) | null = null, unsubscribed = 0
  let preferences = { ...DEFAULT_DEVICE_NOTICES }, saved = 0
  api.getSettings = async () => ({ deviceNotices: preferences })
  api.saveSettings = async (updates: any) => { saved++; preferences = updates.deviceNotices; return { deviceNotices: preferences } }
  api.getDeviceNoticeStatus = async () => ({ bluetooth: 'ready' })
  api.onDeviceNotice = (callback: (notice: DeviceNotice) => void) => { emit = callback; return () => { emit = null; unsubscribed++ } }
  try {
    await render(<HomePause />)
    for (const minutes of [5, 15, 30]) {
      await click(document.querySelector('.home-pause-button'))
      check(document.querySelector('[role="dialog"]')?.textContent?.includes('Quanto dura'), 'Home pause duration picker')
      await click([...document.querySelectorAll('.home-pause-presets button')].find(button => button.textContent === `${minutes} min`)!)
      check(document.querySelector('.pause-timer-overlay')?.textContent?.includes(`(${minutes} min)`), 'Reuse existing pause overlay for each preset')
      check(document.querySelector('.pause-timer-digits')?.textContent === `${minutes < 10 ? '0' : ''}${minutes}:00`, 'Countdown starts at selected duration')
      await click(document.querySelector('.pause-timer-resume-btn'))
      check(!document.querySelector('[role="dialog"]'), 'Returning home closes pause without opening a lesson')
    }
    await click(document.querySelector('.home-pause-button'))
    const input = document.querySelector<HTMLInputElement>('.home-pause-card input')!
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '17'); input.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    check(document.querySelector('.pause-timer-digits')?.textContent === '17:00', 'Custom pause duration is honored')
    await ipc.invoke('capture-video-import', 'november20-pause')
    const now = Date.now
    Date.now = () => now() + 18 * 60_000
    await wait(1100)
    check(document.querySelector('.pause-timer-title')?.textContent === 'Pausa terminata', 'Pause expires without returning to study automatically')
    Date.now = now
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    check(!document.querySelector('.pause-timer-overlay'), 'Escape explicitly returns to Home')

    const analytics: any = { currentStreakDays: 7, records: { bestDay: { date: '2026-11-17', seconds: 7500 }, bestWeek: { date: '2026-11-16', seconds: 24000 }, bestStreak: { start: '2026-11-14', end: '2026-11-20', days: 7 }, longestFocusSeconds: 2700 } }
    for (const dark of [false, true]) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      await render(<main className={dark ? 'dark-theme' : ''}><div style={{ width: '100vw', padding: 24 }}><StudyRecords analytics={analytics} /></div></main>)
      check(document.querySelectorAll('.study-records dd').length === 4, 'Four meaningful study records')
      check(document.querySelector('progress')?.value === 7, 'Seven-day progress milestone')
      await ipc.invoke('capture-video-import', dark ? 'november20-records-dark' : 'november20-records-light')
      await ipc.invoke('feature-test-window-size', { width: 390, height: 820 }); await wait()
      check(document.querySelector('.study-records')!.getBoundingClientRect().right <= window.innerWidth + 1, 'Records fit a narrow window')
      await ipc.invoke('feature-test-window-size', false)
    }
    await render(<StudyRecords analytics={null} />)
    check(document.querySelector('.study-records')?.textContent?.includes('Nessuno studio'), 'Empty records explain missing history')

    await render(<><DeviceNotices /><DeviceNoticeSettings /></>); await wait()
    check(document.querySelector<HTMLInputElement>('.device-notice-settings input[type=text]')?.value === 'EarFun Air Pro 4', 'Default headphones name')
    const toggle = document.querySelector<HTMLInputElement>('.device-notice-settings input[type=checkbox]')!
    await click(toggle)
    check(saved === 1 && preferences.headphones === false, 'Independent notification preference saves immediately')
    check(!document.querySelector('.device-notice'), 'Startup never fabricates a connection')
    const previousFocus = document.activeElement
    await act(async () => emit!({ kind: 'headphones', name: 'Synthetic headphones' }))
    check(document.activeElement === previousFocus, 'Notification never steals focus')
    check(getComputedStyle(document.querySelector('.device-notice')!).pointerEvents === 'none', 'Notification cannot block study input')
    await ipc.invoke('capture-video-import', 'november20-notice')
    await ipc.invoke('feature-test-fullscreen', true); await wait()
    await act(async () => emit!({ kind: 'ac' }))
    check(document.fullscreenElement?.contains(document.querySelector('.device-notice')!), 'Power notice is visible inside HTML fullscreen')
    await act(async () => emit!({ kind: 'battery' }))
    check(document.querySelector('.device-notice')?.textContent?.includes('scollegata'), 'Unplug event replaces older notice')
    await wait(5100)
    check(!document.querySelector('.device-notice'), 'Notice expires after five seconds')
    await ipc.invoke('feature-test-fullscreen', false)
    await render(null)
    check(unsubscribed === 1, 'Native listener is cleaned up')

    const noop = () => {}, props: any = { configuredModel: 'gemini-4-hydrogen', threads: [], activeThreadId: null, setActiveThreadId: noop, isGenerating: false, error: null, onSendMessage: noop, onDeleteThread: noop, onClose: noop }
    await render(<QnaSidebar {...props} />)
    // Select an existing thread so the response options are visible.
    const thread = { id: 'november20', quote: 'Synthetic', contextHeading: null, messages: [], createdAt: '', updatedAt: '' }
    await render(<QnaSidebar {...props} threads={[thread]} activeThreadId={thread.id} />)
    await click(document.querySelector('.qna-response-options summary') ?? document.querySelector('details summary'))
    const thinking = [...document.querySelectorAll<HTMLLabelElement>('label')].find(label => label.textContent?.includes('Pensa di più'))?.querySelector('input')
    await click(thinking!)
    check(document.querySelector('.qna-model-info')?.textContent?.includes('gemini-4-hydrogen, Think: HIGH'), 'Q&A retains selected Hydrogen with HIGH')
  } finally {
    Date.now = originalNow
    await render(null); for (const key of Object.keys(api)) if (!Object.hasOwn(originals, key)) delete api[key]; Object.assign(api, originals); style.remove()
    for (const [name, value] of attributes) { if (value === null) document.documentElement.removeAttribute(name); else document.documentElement.setAttribute(name, value) }
    if (document.fullscreenElement) await document.exitFullscreen()
    await ipc.invoke('feature-test-window-size', false)
  }
}
