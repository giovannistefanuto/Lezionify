import React, { act, useCallback, useRef, useState } from 'react'
import type { Root } from 'react-dom/client'
import { FocusWorkspace } from '../../src/components/FocusWorkspace'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { usePaneZoom } from '../../src/hooks/usePaneZoom'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'

declare const require: any

export function syntheticPdf(pageCount = 12): string {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`]
  for (let index = 0; index < pageCount; index++) {
    const stream = '0.13 0.40 0.29 rg 40 230 520 110 re f\n0.80 0.90 0.85 rg 40 50 520 155 re f\n'
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 ${index % 2 ? 900 : 400}] /Resources << >> /Contents ${4 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)
  }
  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const start = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  return pdf + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
}

export async function runFocusPdfScenarios(root: Root, api: any) {
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  const until = async (condition: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 75; attempt++) { if (condition()) return; await settle() }
    throw new Error(message)
  }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(style)
  const url = URL.createObjectURL(new Blob([syntheticPdf()], { type: 'application/pdf' }))
  const singleUrl = URL.createObjectURL(new Blob([syntheticPdf(1)], { type: 'application/pdf' }))
  const brokenUrl = URL.createObjectURL(new Blob(['Synthetic unreadable PDF'], { type: 'application/pdf' }))
  const source = { id: 'synthetic-pdf', name: 'Slide annotate.pdf', url }
  let openQuestion!: (open: boolean) => void
  let lecture!: (id: string) => void
  const releases: string[] = []
  const attachments: Array<{ page: number; data: string }> = []
  api.getFocusPdf = async (id: string) => id === 'A' ? source : null
  api.selectFocusPdf = async () => null
  api.releaseFocusPdf = async (id: string) => { releases.push(id) }
  function Harness() {
    const [qna, setQna] = useState(false)
    const [composing, setComposing] = useState(false)
    const [lectureId, setLecture] = useState('A')
    const [zoom, setZoom] = useState(1)
    const scroll = useRef<HTMLDivElement>(null)
    const change = useCallback((delta: number) => setZoom(previous => Math.min(4, Math.max(0.5, previous + delta))), [])
    usePaneZoom(scroll, change)
    openQuestion = setQna; lecture = setLecture
    return <div id="focus-fixture" className="focus-mode-overlay" style={{ width: 1240 }}>
      <div className="focus-mode-toolbar" style={{ color: 'var(--text-main)' }}>Modalità focus · lezione sintetica</div>
      <FocusWorkspace lectureId={lectureId} onTextZoom={change} textZoom={zoom} onCloseQna={() => setQna(false)} canSelectSlides={qna && composing} onAttachPages={async images => { attachments.push(...images) }} qna={qna ? <QnaSidebar
        threads={[{ id: 'question', quote: ('La rappresentazione del problema con **concetti principali** e formula $x^2$. ').repeat(40), anchorString: 'La rappresentazione', contextHeading: null, createdAt: '', updatedAt: '', messages: Array.from({ length: 12 }, () => ({ role: 'ai' as const, text: 'Questa risposta occupa una colonna dedicata, insieme alla spiegazione della lezione.', timestamp: '' })) }]}
        activeThreadId="question" setActiveThreadId={() => {}} isGenerating={false} error={null} onCompositionChange={setComposing} onSendMessage={() => {}} onDeleteThread={() => {}} onClose={() => setQna(false)} /> : null}>
        <div ref={scroll} className="focus-mode-content" tabIndex={0}><div className="focus-text-document" style={{ zoom }}>
          <MarkdownViewer content={'# La rappresentazione del problema\n\n' + 'Durante questa lezione il professore descrive i concetti principali. Le slide annotate restano visibili accanto alla spiegazione, con uno scorrimento indipendente.\n\n'.repeat(35)} />
        </div></div>
      </FocusWorkspace>
    </div>
  }
  try {
    await act(async () => root.render(<Harness />))
    await until(() => (document.querySelector<HTMLCanvasElement>('.focus-pdf-page canvas')?.width ?? 0) > 0, 'Real PDF.js canvas did not render')
    const pageCounter = () => document.querySelector('.focus-pdf-page-count')?.textContent
    check(pageCounter() === '1/12', 'PDF counter must start at page one and use the real document total')
    let pdfScroll = document.querySelector<HTMLElement>('.focus-pdf-scroll')!
    const readingPosition = () => {
      const top = pdfScroll.getBoundingClientRect().top
      const pages = Array.from(document.querySelectorAll<HTMLElement>('.focus-pdf-page'))
      const page = pages.findIndex(item => item.getBoundingClientRect().bottom > top)
      const bounds = pages[page].getBoundingClientRect()
      return { page, fraction: (top - bounds.top) / bounds.height }
    }
    const keepPosition = async (change: () => void | Promise<void>, label: string) => {
      const before = readingPosition()
      await act(async () => { await change() })
      await settle()
      await settle()
      const after = readingPosition()
      check(before.page === after.page && Math.abs(before.fraction - after.fraction) < 0.015,
        `${label} lost PDF reading position: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`)
      check(pageCounter() === `${after.page + 1}/12`, `${label} lost synchronization of the visible PDF page counter`)
    }
    const textScroll = document.querySelector<HTMLElement>('.focus-mode-content')!
    await until(() => pdfScroll.scrollHeight > pdfScroll.clientHeight && textScroll.scrollHeight > textScroll.clientHeight, 'Both panes must scroll after the width observer settles')
    const canvas = document.querySelector<HTMLCanvasElement>('.focus-pdf-page canvas')!
    await until(() => { const pixel = canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.25), 1, 1).data; return pixel[3] === 255 && pixel[1] > pixel[0] }, 'PDF page bitmap remained empty')
    check(!document.querySelector('.pdf-attach-toolbar') && !document.querySelector('.pdf-page-select'), 'Reading must hide all slide selection controls')
    await act(async () => openQuestion(true))
    check(!document.querySelector('.pdf-attach-toolbar'), 'Reading a discussion must not activate composition')
    // The headless Electron window may not own OS focus; dispatch the native focusin too.
    await act(async () => { const field = document.querySelector<HTMLTextAreaElement>('.qna-input-row textarea')!; field.focus(); field.dispatchEvent(new FocusEvent('focusin', { bubbles: true })) })
    await until(() => Boolean(document.querySelector('.pdf-attach-toolbar')), `Focusing an empty question must enable slide selection; active=${document.activeElement?.outerHTML.slice(0, 140)}`)
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Adatta PDF alla colonna"]')!.focus())
    check(Boolean(document.querySelector('.pdf-attach-toolbar')), 'Moving focus from question to PDF must keep composition active')
    await act(async () => {
      document.querySelector<HTMLInputElement>('[aria-label="Seleziona pagina 1 per Gemini"]')!.click()
      document.querySelector<HTMLInputElement>('[aria-label="Seleziona pagina 2 per Gemini"]')!.click()
    })
    await act(async () => document.querySelector<HTMLButtonElement>('.pdf-attach-toolbar button')!.click())
    await until(() => attachments.length === 2, 'Selected PDF pages were not prepared as local image attachments')
    check(attachments.map(image => image.page).join(',') === '1,2' && attachments.every(image => image.data.startsWith('iVBOR')), 'Attachments must contain only selected pages rendered to PNG in page order')
    check(document.querySelector<HTMLInputElement>('[aria-label="Seleziona pagina 1 per Gemini"]')?.checked === false && document.querySelector<HTMLInputElement>('[aria-label="Seleziona pagina 2 per Gemini"]')?.checked === false, 'Prepared page selection must not stay checked')
    const snapshot = new Image(); snapshot.src = `data:image/png;base64,${attachments[0].data}`; await snapshot.decode()
    check(Math.max(snapshot.naturalWidth, snapshot.naturalHeight) <= 2048 && snapshot.naturalWidth > 500, 'Image quality must be independent of the displayed viewport and bounded for the request')
    const questionInput = document.querySelector<HTMLTextAreaElement>('.qna-input-row textarea')!
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(questionInput, 'Spiega le slide'); questionInput.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => questionInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
    check(!document.querySelector('.pdf-attach-toolbar') && attachments.length === 2, 'Sending must hide selection without deleting prepared attachments')
    await act(async () => openQuestion(false))
    pdfScroll.scrollTop = 150
    const pdfTop = pdfScroll.scrollTop
    check(textScroll.scrollTop === 0, 'PDF scrolling changed explanation')
    textScroll.scrollTop = 120
    check(pdfScroll.scrollTop === pdfTop, 'Explanation scrolling changed PDF')
    const wheel = new WheelEvent('wheel', { ctrlKey: true, deltaY: -20, bubbles: true, cancelable: true })
    await act(async () => pdfScroll.dispatchEvent(wheel))
    check(wheel.defaultPrevented, 'PDF pinch was not scoped/prevented')
    check(document.querySelector('[aria-label="Adatta PDF alla colonna"]')!.textContent === '110%', 'PDF zoom did not change')
    check(document.querySelector('[aria-label="Ripristina zoom spiegazione"]')!.textContent === '100%', 'PDF pinch changed text zoom')
    await act(async () => textScroll.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -20, bubbles: true, cancelable: true })))
    check(document.querySelector('[aria-label="Ripristina zoom spiegazione"]')!.textContent === '110%', 'Text pinch did not zoom')
    check(document.querySelector('[aria-label="Adatta PDF alla colonna"]')!.textContent === '110%', 'Text pinch changed PDF zoom')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Adatta PDF alla colonna"]')!.click())
    await act(async () => {
      pdfScroll.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
      pdfScroll.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100, bubbles: true }))
      pdfScroll.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 230, clientY: 100, bubbles: true, cancelable: true }))
      pdfScroll.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', bubbles: true }))
      pdfScroll.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', bubbles: true }))
    })
    check(document.querySelector('[aria-label="Adatta PDF alla colonna"]')!.textContent === '124%', 'Touch pinch did not zoom PDF')
    check(document.querySelector('[aria-label="Ripristina zoom spiegazione"]')!.textContent === '110%', 'Touch pinch changed text zoom')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Adatta PDF alla colonna"]')!.click())
    // A later portrait slide catches pixel-scroll regressions hidden by page-one tests.
    const targetPage = document.querySelectorAll<HTMLElement>('.focus-pdf-page')[5]
    pdfScroll.scrollTop += targetPage.getBoundingClientRect().top - pdfScroll.getBoundingClientRect().top + targetPage.clientHeight * 0.25
    pdfScroll.dispatchEvent(new Event('scroll'))
    await settle()
    await settle()
    check(readingPosition().page === 5, 'Could not reach the sixth slide')
    check(pageCounter() === '6/12', 'Scrolling must update the counter to the sixth slide')
    check(document.querySelector('.focus-pdf-page-count')?.getAttribute('aria-label') === 'Pagina 6 di 12', 'PDF counter must expose the current and total pages accessibly')
    const beforeReopen = readingPosition()
    await act(async () => root.render(null))
    api.getFocusPdf = async (id: string) => id === 'A' ? { ...source, id: 'new-native-grant' } : null
    await act(async () => root.render(<Harness />))
    await until(() => pageCounter() === '6/12' && (document.querySelectorAll<HTMLCanvasElement>('.focus-pdf-page canvas')[5]?.width ?? 0) > 0, 'Reopening PDF with a new grant did not restore the sixth slide')
    await settle(); await settle()
    pdfScroll = document.querySelector<HTMLElement>('.focus-pdf-scroll')!
    const afterReopen = readingPosition()
    check(afterReopen.page === beforeReopen.page && Math.abs(afterReopen.fraction - beforeReopen.fraction) < 0.015, 'PDF lost its relative reading point after closing and reopening')
    await keepPosition(() => document.querySelector<HTMLButtonElement>('[aria-label="Aumenta zoom PDF"]')!.click(), 'Zoom in')
    await keepPosition(() => document.querySelector<HTMLButtonElement>('[aria-label="Adatta PDF alla colonna"]')!.click(), 'Fit width')
    await keepPosition(() => { pdfScroll.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -20, bubbles: true, cancelable: true })) }, 'Wheel zoom')
    await keepPosition(() => document.querySelector<HTMLButtonElement>('[aria-label="Adatta PDF alla colonna"]')!.click(), 'Reset wheel zoom')
    const separator = document.querySelector<HTMLElement>('[role="separator"]')!
    const dividerBounds = separator.getBoundingClientRect()
    const dividerX = Math.round(dividerBounds.left + dividerBounds.width / 2)
    const nativeEvents: string[] = []
    const track = (event: Event) => { const pointer = event as PointerEvent; nativeEvents.push(`${event.type}:${(event.target as HTMLElement).className}:${pointer.clientX}:${pointer.clientY}:capture=${separator.hasPointerCapture(pointer.pointerId)}`) }
    window.addEventListener('pointerdown', track, true); window.addEventListener('pointermove', track, true)
    await keepPosition(() => require('electron').ipcRenderer.invoke('focus-pdf-drag', dividerX, dividerX - 70, Math.round(dividerBounds.top + 80)), 'Native divider drag')
    await settle()
    window.removeEventListener('pointerdown', track, true); window.removeEventListener('pointermove', track, true)
    check(Number(separator.getAttribute('aria-valuenow')) < 50, 'Native pointer drag did not move divider: ' + separator.getAttribute('aria-valuenow') + ' / ' + document.querySelector('[role="separator"]')!.getAttribute('aria-valuenow') + ': ' + nativeEvents.join(','))
    await keepPosition(() => { separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })) }, 'Recenter divider')
    await keepPosition(() => { separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) }, 'Keyboard divider')
    const previous = document.querySelector('.focus-pdf-column')!.getBoundingClientRect().width
    await require('electron').ipcRenderer.invoke('capture-video-import', 'focus-pdf-light')
    await keepPosition(() => openQuestion(true), 'Open question')
    await settle()
    const slides = document.querySelector('.focus-pdf-column')!.getBoundingClientRect()
    const text = document.querySelector('.focus-explanation-column')!.getBoundingClientRect()
    const question = document.querySelector('.focus-qna-column')!.getBoundingClientRect()
    check(slides.width < previous && slides.width >= 300 && text.width >= 360 && question.width >= 320, 'Question did not reserve readable space')
    check(slides.right <= text.left && text.right <= question.left + 1, 'Focus columns overlap')
    const discussionDivider = document.querySelector<HTMLElement>('[aria-label="Larghezza della discussione"]')!
    const initialDiscussionWidth = question.width
    const discussionBounds = discussionDivider.getBoundingClientRect()
    const dragX = Math.round(discussionBounds.left + discussionBounds.width / 2)
    const discussionEvents: string[] = []
    const trackDiscussion = (event: Event) => { const pointer = event as PointerEvent; discussionEvents.push(`${event.type}:${(event.target as HTMLElement).className}:${pointer.clientX}:capture=${discussionDivider.hasPointerCapture(pointer.pointerId)}`) }
    window.addEventListener('pointerdown', trackDiscussion, true); window.addEventListener('pointermove', trackDiscussion, true)
    await require('electron').ipcRenderer.invoke('focus-pdf-drag', dragX, dragX - 230, Math.round(discussionBounds.top + 80))
    await settle()
    window.removeEventListener('pointerdown', trackDiscussion, true); window.removeEventListener('pointermove', trackDiscussion, true)
    await require('electron').ipcRenderer.invoke('capture-video-import', 'focus-pdf-qna')
    check(document.querySelector('.focus-qna-column')!.getBoundingClientRect().width > initialDiscussionWidth + 50, `Native discussion divider drag should widen the chat: ${initialDiscussionWidth} -> ${document.querySelector('.focus-qna-column')!.getBoundingClientRect().width}, divider ${discussionDivider.getAttribute('aria-valuenow')}, events ${discussionEvents.join(',')}`)
    check(getComputedStyle(document.querySelector('.focus-pdf-column')!).display === 'none', 'Slides should yield space to a widened discussion')
    await act(async () => discussionDivider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    await settle()
    await settle()
    check(Math.abs(document.querySelector('.focus-qna-column')!.getBoundingClientRect().width - initialDiscussionWidth) < 2 && getComputedStyle(document.querySelector('.focus-pdf-column')!).display !== 'none', 'Reset discussion divider should restore chat and slides')
    const quote = document.querySelector<HTMLElement>('.qna-context-quote')!
    const toggle = document.querySelector<HTMLButtonElement>('.qna-anchor-toggle')!
    const chat = document.querySelector<HTMLElement>('.qna-messages-container')!
    const compactHeight = quote.clientHeight
    check(compactHeight <= Number.parseFloat(getComputedStyle(quote).lineHeight) * 3 + 1, 'Anchor exceeds three lines')
    check(toggle.getAttribute('aria-expanded') === 'false' && quote.scrollHeight > compactHeight, 'Long anchor has no expand control')
    chat.scrollTop = 0
    const anchorTop = quote.getBoundingClientRect().top
    chat.scrollTop = 150
    check(chat.scrollTop > 0 && quote.getBoundingClientRect().top === anchorTop, 'Chat does not scroll independently of pinned anchor')
    await act(async () => toggle.click())
    check(toggle.getAttribute('aria-expanded') === 'true' && quote.clientHeight > compactHeight, 'Anchor did not expand')
    check(quote.scrollHeight > quote.clientHeight && chat.clientHeight > 100, 'Expanded anchor hides chat or cannot scroll')
    await act(async () => toggle.click())
    check(toggle.getAttribute('aria-expanded') === 'false' && quote.clientHeight === compactHeight, 'Anchor did not return to three lines')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'focus-pdf-qna')
    const beforeHide = readingPosition()
    document.getElementById('focus-fixture')!.style.width = '900px'
    await until(() => getComputedStyle(document.querySelector('.focus-pdf-column')!).display === 'none', 'Slides not suspended at narrow widths')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chiudi domanda e ripristina colonne"]')!.click())
    await until(() => getComputedStyle(document.querySelector('.focus-pdf-column')!).display !== 'none', 'Slides not restored after question closes')
    document.getElementById('focus-fixture')!.style.width = '1240px'
    await until(() => Math.abs(document.querySelector('.focus-pdf-column')!.getBoundingClientRect().width - previous) < 2, 'Previous divider ratio not restored')
    await settle()
    const afterHide = readingPosition()
    check(beforeHide.page === afterHide.page && Math.abs(beforeHide.fraction - afterHide.fraction) < 0.015, 'Hidden slides lost reading position on return')
    check(pageCounter() === `${afterHide.page + 1}/12`, 'Restoring hidden slides must retain the visible page counter')
    await keepPosition(() => { document.getElementById('focus-fixture')!.style.width = '1140px' }, 'Window resize')
    await keepPosition(() => { document.getElementById('focus-fixture')!.style.width = '1240px' }, 'Restore window size')
    await act(async () => openQuestion(true))
    await act(async () => document.querySelector('[role="separator"]')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    check(!document.querySelector('.focus-qna-column'), 'Recentring did not dismiss visible question')
    check(document.querySelector('[role="separator"]')!.getAttribute('aria-valuenow') === '50', 'Recentring did not restore equal split')
    document.documentElement.setAttribute('data-theme', 'dark')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'focus-pdf-dark')
    await act(async () => { pdfScroll.scrollTop = pdfScroll.scrollHeight; pdfScroll.dispatchEvent(new Event('scroll')) })
    // The final portrait page initially has an estimated landscape placeholder.
    // Let PDF.js load its actual geometry before testing the end of the document.
    await until(() => {
      const last = document.querySelectorAll<HTMLElement>('.focus-pdf-page')[11]
      return last.clientHeight > last.clientWidth && (last.querySelector('canvas')?.width ?? 0) > 0
    }, 'Final slide geometry did not finish loading')
    await settle()
    await act(async () => { pdfScroll.scrollTop = pdfScroll.scrollHeight; pdfScroll.dispatchEvent(new Event('scroll')) })
    await until(() => pageCounter() === '12/12', 'Counter must reach the last slide when scrolling to the end')
    await act(async () => { pdfScroll.scrollTop = 0; pdfScroll.dispatchEvent(new Event('scroll')) })
    await until(() => pageCounter() === '1/12', 'Counter must return to the first slide when scrolling back')
    api.selectFocusPdf = async () => ({ id: 'single-pdf', name: 'Una slide.pdf', url: singleUrl })
    await act(async () => document.querySelector<HTMLButtonElement>('.focus-pdf-name')!.click())
    await until(() => pageCounter() === '1/1' && document.querySelectorAll('.focus-pdf-page').length === 1, 'Selecting another PDF must reset both current page and total')
    api.selectFocusPdf = async () => ({ id: 'broken-pdf', name: 'PDF non leggibile.pdf', url: brokenUrl })
    await act(async () => document.querySelector<HTMLButtonElement>('.focus-pdf-name')!.click())
    await until(() => Boolean(document.querySelector('.focus-pdf-status[role="alert"]')), 'Unreadable PDF must show an error')
    check(!document.querySelector('.focus-pdf-page-count'), 'An unreadable PDF must not show the previous document counter')
    api.selectFocusPdf = async () => source
    await act(async () => document.querySelector<HTMLButtonElement>('.focus-pdf-name')!.click())
    await until(() => pageCounter() === '1/12', 'A new valid PDF must restore its correct total after an error')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Nascondi PDF"]')!.click())
    check(getComputedStyle(document.querySelector('.focus-pdf-column')!).display === 'none', 'Hide PDF did not restore space')
    await act(async () => lecture('B'))
    check(!document.querySelector('.focus-pdf-column') && releases.includes(source.id), 'Changing lecture reused old PDF or leaked grant')
    check(!document.querySelector('.focus-pdf-page-count'), 'A lesson without a PDF must not retain a stale counter')
    let finishSelection!: (document: any) => void
    api.selectFocusPdf = () => new Promise(resolve => { finishSelection = resolve })
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Scegli PDF della lezione"]')!.click())
    await act(async () => root.render(null))
    await act(async () => finishSelection({ ...source, id: 'late-pdf' }))
    check(releases.includes('late-pdf'), 'Late native selection was not revoked after unmount')
  } finally {
    await act(async () => root.render(null))
    URL.revokeObjectURL(url)
    URL.revokeObjectURL(singleUrl)
    URL.revokeObjectURL(brokenUrl)
    document.documentElement.removeAttribute('data-theme')
    style.remove()
  }
}
