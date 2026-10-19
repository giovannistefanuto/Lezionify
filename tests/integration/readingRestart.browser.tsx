import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'
import { FocusPdfViewer } from '../../src/components/FocusPdfViewer'
import { useReadingPosition } from '../../src/hooks/useReadingPosition'
import { syntheticPdf } from './focusPdfScenarios.browser'

declare const require: any

/** Called in two separate Electron processes sharing only a temporary profile. */
export async function runReadingRestart(root: Root, resume: boolean) {
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(style)
  const content = '# Ripresa della lettura\n\n' + Array.from({ length: 45 }, (_, i) => `## Argomento ${i}\n\n${'Testo sintetico salvato soltanto nel collaudo. '.repeat(12)}\n\n`).join('')
  const url = URL.createObjectURL(new Blob([syntheticPdf(4)], { type: 'application/pdf' }))
  const source = { id: `grant-${Date.now()}`, name: 'Slide sintetiche', url }
  function Fixture() {
    const ref = useRef<HTMLDivElement>(null)
    useReadingPosition(ref, 'notes:restart-lecture:it', content, true)
    return <div style={{ display: 'flex', width: 1000, height: 460 }}>
      <div style={{ width: 450, height: 460, display: 'flex' }}><FocusPdfViewer source={source} lectureId="restart-lecture" onChange={() => {}} onHide={() => {}} /></div>
      <div className="restart-markdown" ref={ref} style={{ width: 500, height: 460, overflow: 'auto' }}><MarkdownViewer content={content} /></div>
    </div>
  }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  const until = async (test: () => boolean, message: string) => {
    for (let i = 0; i < 60; i++) { if (test()) return; await settle() }
    throw new Error(message)
  }
  const point = (scroller: HTMLElement, selector: string) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector))
    const top = scroller.getBoundingClientRect().top
    const page = nodes.findIndex(node => node.getBoundingClientRect().bottom > top)
    if (page < 0) throw new Error('Reading point has no visible element')
    const bounds = nodes[page].getBoundingClientRect()
    if (!bounds.height || !Number.isFinite(bounds.height)) throw new Error('Reading point geometry is not ready')
    return { page, y: (top - bounds.top) / bounds.height }
  }
  try {
    await act(async () => root.render(<Fixture />))
    await until(() => document.querySelectorAll('.focus-pdf-page').length === 4, 'Restart fixture PDF failed to load')
    const markdown = document.querySelector<HTMLElement>('.restart-markdown')!
    const pdf = document.querySelector<HTMLElement>('.focus-pdf-scroll')!
    // A newly created canvas defaults to width 300 even before PDF.js renders.
    // Wait for page geometry before scrolling or persisting an expected point.
    await until(() => pdf.clientWidth > 0 && pdf.clientHeight > 0 && Array.from(document.querySelectorAll<HTMLElement>('.focus-pdf-page')).every(page => page.getBoundingClientRect().height > 0), 'Restart fixture PDF geometry not ready')
    await settle(); await settle()
    if (!resume) {
      markdown.scrollTop = 1500; markdown.dispatchEvent(new Event('scroll'))
      const target = document.querySelectorAll<HTMLElement>('.focus-pdf-page')[2]
      pdf.scrollTop += target.getBoundingClientRect().top - pdf.getBoundingClientRect().top + target.clientHeight * 0.3
      pdf.dispatchEvent(new Event('scroll'))
      await until(() => (document.querySelectorAll<HTMLCanvasElement>('.focus-pdf-page canvas')[2]?.width ?? 0) > 0, 'Restart fixture target slide not rendered')
      await settle(); await settle()
      localStorage.setItem('lezionify.restart.expected', JSON.stringify({ markdown: point(markdown, '.markdown-body > *'), pdf: point(pdf, '.focus-pdf-page') }))
    } else {
      const expected = JSON.parse(localStorage.getItem('lezionify.restart.expected') ?? 'null')
      if (!expected) throw new Error('Temporary profile did not survive Electron process restart')
      await until(() => (document.querySelectorAll<HTMLCanvasElement>('.focus-pdf-page canvas')[expected.pdf.page]?.width ?? 0) > 0, 'Saved PDF slide not loaded after process restart')
      await settle(); await settle()
      for (const [name, actual] of [['markdown', point(markdown, '.markdown-body > *')], ['pdf', point(pdf, '.focus-pdf-page')]] as const) {
        if (actual.page !== expected[name].page || Math.abs(actual.y - expected[name].y) > 0.025) throw new Error(`${name} reading point lost on Electron restart: ${JSON.stringify(expected[name])} -> ${JSON.stringify(actual)}`)
      }
    }
  } finally { await act(async () => root.render(null)); style.remove(); URL.revokeObjectURL(url) }
}
