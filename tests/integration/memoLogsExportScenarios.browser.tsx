import React, { act } from 'react'
import { runAmbientTransitionScenarios } from './ambientTransitionScenarios.browser'
import type { Root } from 'react-dom/client'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { PdfExportButton } from '../../src/components/PdfExportButton'
import { LogViewerModal } from '../../src/components/LogViewerModal'
import { localLogDay } from '../../shared/appLogs'

declare const require: any
export async function runMemoLogsExportScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message)
  }
  const wait = (ms = 30) =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms))
    })
  const click = async (text: string) => {
    const scope = document.querySelector('.pdf-export-dialog') ?? document
    const element = [...scope.querySelectorAll('button')].find(
      (button) =>
        button.textContent?.trim() === text ||
        button.querySelector('strong')?.textContent === text ||
        button.getAttribute('aria-label') === text
    )
    check(element, `Missing ${text}`)
    await act(async () => element!.click())
    await wait()
  }
  const original = { ...api }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke(
    'video-import-styles'
  )
  document.head.prepend(style)
  let capture: any
  const longText = 'Attività molto lunga da leggere per intero. '.repeat(40)
  api.getScratchpad = async () => ({
    todos: [{ id: 'long', text: longText, completed: false, createdAt: '' }],
    notes: 'Appunti sintetici',
    updatedAt: ''
  })
  api.saveScratchpad = async () => {}
  function Memo() {
    capture = useQuickCapture()
    return capture.isOpen ? <QuickCaptureOverlay capture={capture} /> : null
  }
  try {
    await act(async () => root.render(<Memo />))
    await act(async () => capture.toggleOpen())
    await wait()
    const preview = document.querySelector<HTMLElement>(
      '.memo-activity-preview'
    )!
    await act(async () =>
      preview.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    )
    await wait(550)
    check(
      !document.querySelector('[role="tooltip"]'),
      'Preview appeared before one second'
    )
    await act(async () =>
      preview.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    )
    await wait(550)
    check(
      !document.querySelector('[role="tooltip"]'),
      'Movement did not reset dwell'
    )
    await wait(600)
    check(
      document.querySelector('[role="tooltip"]')?.textContent === longText,
      'Full activity preview missing'
    )
    await act(async () =>
      preview.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 120
        })
      )
    )
    check(
      document.querySelector<HTMLElement>('[role="tooltip"]')!.scrollTop > 0,
      'Long preview cannot be read with the mouse wheel'
    )
    check(
      Number(
        getComputedStyle(document.querySelector('[role="tooltip"]')!).zIndex
      ) >
        Number(
          getComputedStyle(document.querySelector('.quick-capture-backdrop')!)
            .zIndex
        ),
      'Preview is hidden behind Memo'
    )
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke(
        'capture-video-import',
        `memo-${theme}`
      )
    }
    await act(async () =>
      preview.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    )
    check(
      !document.querySelector('[role="tooltip"]'),
      'Movement did not hide preview'
    )
    await require('electron').ipcRenderer.invoke(
      'feature-test-window-size',
      true
    )
    await wait(100)
    const memoBounds = document
      .querySelector('.quick-capture-deck')!
      .getBoundingClientRect()
    check(
      memoBounds.left >= 0 && memoBounds.right <= window.innerWidth + 1,
      'Memo overflows a narrow window'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'memo-narrow'
    )
    await require('electron').ipcRenderer.invoke(
      'feature-test-window-size',
      false
    )
    await act(async () => capture.closeOverlay())
    await wait(1100)
    check(
      !document.querySelector('[role="tooltip"]'),
      'Closed Memo left a stale preview'
    )
    await act(async () => root.render(null))

    const lectures = [
      {
        id: 'intro',
        title: 'Introduzione',
        courseCode: 'IR',
        recordedAt: '2026-10-01',
        importedAt: '',
        markdownFileName: 'intro.md',
        markdownEnFileName: null
      },
      {
        id: 'lab',
        title: 'Laboratorio',
        courseCode: 'IR',
        recordedAt: '2026-10-02',
        importedAt: '',
        isLaboratory: true,
        markdownFileName: 'lab.md',
        markdownEnFileName: 'lab.en.md'
      },
      {
        id: 'lesson',
        title: 'Lezione principale',
        courseCode: 'IR',
        recordedAt: '2026-10-03',
        importedAt: '',
        markdownFileName: 'lesson.md',
        markdownEnFileName: 'lesson.en.md'
      }
    ]
    const exports: any[] = []
    api.listLectures = async () => lectures
    api.getSettings = async () => ({
      courses: { IR: { code: 'IR', name: 'Information Retrieval' } }
    })
    api.exportNotesPdf = async (request: any) => {
      exports.push(request)
      return { canceled: true, missingCount: 0 }
    }
    await act(async () =>
      root.render(
        <PdfExportButton
          request={{ kind: 'course', courseCode: 'IR', language: 'it' }}
        />
      )
    )
    await click('Esporta')
    check(exports.length === 0, 'Opening export generated a PDF')
    await click('Corso')
    await click('Information Retrieval (IR)')
    check(
      [
        ...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      ].every((input) => input.checked),
      'Default selection must include labs'
    )
    await click('Escludi laboratori')
    await act(async () =>
      document
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click()
    )
    await click('Esporta')
    check(
      JSON.stringify(exports[0].lectureIds) === JSON.stringify(['lesson']),
      'Manual and lab exclusions were not preserved'
    )
    check(
      document.body.textContent?.includes('Salvataggio annullato') &&
        document.querySelectorAll('input:checked').length === 1,
      'Cancel discarded selection'
    )
    await click('Seleziona tutto')
    await click('Deseleziona tutto')
    check(
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '.pdf-export-dialog button'
        )
      ].find((button) => button.textContent === 'Esporta')!.disabled,
      'Empty export must be disabled'
    )
    await click('Seleziona tutto')
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke(
        'capture-video-import',
        `export-${theme}`
      )
    }
    await require('electron').ipcRenderer.invoke(
      'feature-test-window-size',
      true
    )
    await wait(100)
    const pdfBounds = document
      .querySelector('.pdf-export-dialog')!
      .getBoundingClientRect()
    check(
      pdfBounds.left >= 0 && pdfBounds.right <= window.innerWidth + 1,
      'PDF dialog overflows a narrow window'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'export-narrow'
    )
    await require('electron').ipcRenderer.invoke(
      'feature-test-window-size',
      false
    )
    await click('← Indietro')
    await click('← Indietro')
    await click('Lezione')
    const languages = [
      ...document.querySelectorAll<HTMLButtonElement>('.pdf-export-row button')
    ]
    check(
      languages[1].disabled,
      'Missing English notes should not trigger translation'
    )
    await act(async () => languages[3].click())
    await wait()
    check(
      exports.at(-1).kind === 'lecture' &&
        exports.at(-1).lectureId === 'lab' &&
        exports.at(-1).language === 'en',
      'Wrong individual PDF language'
    )
    await click('Chiudi esportazione')
    check(
      !document.querySelector('[aria-label="Esporta PDF"]'),
      'Export did not close'
    )
    await act(async () => root.render(null))

    const today = localLogDay(),
      older = '2026-01-01'
    const reads: string[] = []
    let fail = true
    api.getAppLogDay = async (day: string) => {
      reads.push(day)
      if (day === older && fail) {
        fail = false
        throw new Error('Synthetic IO failure')
      }
      return {
        day,
        entries: [
          {
            id: day,
            timestamp: `${day}T12:00:00`,
            level: 'info',
            source: 'system',
            message: day === today ? 'Evento odierno' : 'Evento precedente'
          }
        ],
        previousDay: day === today ? older : null
      }
    }
    await act(async () =>
      root.render(<LogViewerModal show onClose={() => {}} />)
    )
    await wait()
    check(
      reads.length === 1 &&
        reads[0] === today &&
        !document.body.textContent?.includes('Evento precedente'),
      'Initial logs must request only today'
    )
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke('capture-video-import', `logs-${theme}`)
    }
    const olderButton = () =>
      document.querySelector<HTMLButtonElement>('.log-load-previous')!
    await act(async () => olderButton().click())
    await wait()
    check(
      document.querySelector('[role="alert"]') &&
        document.body.textContent?.includes('Evento odierno'),
      'History failure must preserve visible rows'
    )
    await act(async () => olderButton().click())
    await wait()
    check(
      document.querySelectorAll('.log-entry-item').length === 2 &&
        !olderButton(),
      'History load failed or duplicated events'
    )
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('.log-action-btn.refresh')!
        .click()
    )
    await wait()
    check(
      document.querySelectorAll('.log-entry-item').length === 2,
      'Polling discarded history or duplicated today'
    )
    await runAmbientTransitionScenarios(root, api)
  } finally {
    await act(async () => root.render(null))
    await require('electron').ipcRenderer.invoke(
      'feature-test-window-size',
      false
    )
    Object.assign(api, original)
    style.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}
