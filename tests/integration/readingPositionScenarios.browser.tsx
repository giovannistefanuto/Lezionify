import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'
import { useReadingPosition } from '../../src/hooks/useReadingPosition'
import { MermaidCollapseContext } from '../../src/components/MermaidDiagram'
import { FocusWorkspace } from '../../src/components/FocusWorkspace'
import { captureLanguagePoint, type LanguageReadingPoint } from '../../src/utils/sectionAlignment'

declare const require: any

export async function runReadingPositionScenarios(root: Root) {
  const content = '# Test\n\n' + Array.from({ length: 80 }, (_, index) => `## Sezione ${index}\n\n${'Testo sintetico per verificare la ripresa della lettura. '.repeat(15)}\n\n`).join('')
  const check = (value: boolean, message: string) => { if (!value) throw new Error(message) }
  function Fixture({ language = 'it', id = 'reading-test', text = content, nested = false, focus = false, align = false }: { language?: string; id?: string; text?: string; nested?: boolean; focus?: boolean; align?: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    const outer = useRef<HTMLDivElement>(null)
    const languagePoint = useRef<LanguageReadingPoint | null>(null)
    useReadingPosition(ref, `notes:${id}:${language}`, text, true, nested ? outer : undefined, align ? languagePoint : undefined)
    return <div ref={outer} style={{ height: nested ? 300 : undefined, overflow: 'auto' }}><div style={{ height: nested ? 100 : 0 }}>Toolbar</div><div ref={ref} style={{ height: nested ? 'auto' : 300, width: 580, overflow: 'auto' }}><MermaidCollapseContext.Provider value={focus}><MarkdownViewer content={text} /></MermaidCollapseContext.Provider></div></div>
  }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  const pane = () => document.querySelector<HTMLElement>('#root > div > div:last-child')!
  const point = (scroller: HTMLElement) => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.markdown-body > *'))
    const top = scroller.getBoundingClientRect().top
    const index = blocks.findIndex(block => block.getBoundingClientRect().bottom > top)
    return { index, y: (top - blocks[index].getBoundingClientRect().top) / blocks[index].getBoundingClientRect().height }
  }
  for (const nested of [false, true]) {
    await act(async () => root.render(<Fixture nested={nested} />)); await settle()
    const scroller = nested ? pane().parentElement! : pane()
    scroller.scrollTop = 4200; scroller.dispatchEvent(new Event('scroll')); await settle()
    const before = point(scroller)
    await act(async () => root.render(null))
    await act(async () => root.render(<Fixture nested={nested} />)); await settle()
    const restored = point(nested ? pane().parentElement! : pane())
    check(restored.index === before.index && Math.abs(restored.y - before.y) < 0.02, `Markdown reading position lost on remount, nested=${nested}`)
    await act(async () => root.render(<Fixture nested={nested} language="en" />)); await settle()
    check((nested ? pane().parentElement! : pane()).scrollTop === 0, 'English must start with its separate position')
    const englishPane = nested ? pane().parentElement! : pane()
    englishPane.scrollTop = 1600; englishPane.dispatchEvent(new Event('scroll')); await settle()
    await act(async () => root.render(<Fixture nested={nested} />)); await settle()
    check(point(nested ? pane().parentElement! : pane()).index === before.index, 'Switching language lost the Italian point')
    await act(async () => root.render(<Fixture nested={nested} id="another-lecture" />)); await settle()
    check((nested ? pane().parentElement! : pane()).scrollTop === 0, 'Another lecture reused the old point')
    await act(async () => root.render(<Fixture nested={nested} text="# Documento sostituito\n\nTesto nuovo." />)); await settle()
    check((nested ? pane().parentElement! : pane()).scrollTop === 0, 'Changed document must fall back to the start')
    await act(async () => root.render(null))
    for (const key of Object.keys(localStorage)) if (key.includes('reading-test') || key.includes('another-lecture')) localStorage.removeItem(key)
  }
  // Different section lengths make document-percentage switching visibly wrong.
  const italian = Array.from({ length: 12 }, (_, i) => `## Capitolo ${i + 1}\n\n${'Testo italiano sintetico. '.repeat(i === 9 ? 140 : 25)}\n\n`).join('')
  const english = Array.from({ length: 12 }, (_, i) => `## Chapter ${i + 1}\n\n${'Synthetic English text. '.repeat(i === 9 ? 210 : 100)}\n\n`).join('')
  for (const nested of [false, true]) {
    await act(async () => root.render(<Fixture text={italian} nested={nested} align />)); await settle()
    const scroller = () => nested ? pane().parentElement! : pane()
    const readingPoint = () => captureLanguagePoint(document.querySelector('.markdown-body')!, scroller(), 'test')
    const headings = document.querySelectorAll<HTMLElement>('.markdown-body > h2')
    const start = headings[9].getBoundingClientRect().top
    const end = headings[10].getBoundingClientRect().top
    scroller().scrollTop += start - scroller().getBoundingClientRect().top + (end - start) * 0.4
    scroller().dispatchEvent(new Event('scroll')); await settle()
    const before = readingPoint()
    check(before.section === 9, 'Test must start in Italian section 10')
    await act(async () => root.render(<Fixture language="en" text={english} nested={nested} align focus />)); await settle()
    check(readingPoint().section === 9 && Math.abs(readingPoint().progress - before.progress) < 0.02, 'English must preserve section 10 and its internal point')
    scroller().scrollTop += 75; scroller().dispatchEvent(new Event('scroll')); await settle()
    const moved = readingPoint()
    await act(async () => root.render(<Fixture text={italian} nested={nested} align />)); await settle()
    check(readingPoint().section === 9 && Math.abs(readingPoint().progress - moved.progress) < 0.02, 'Italian must follow the new English point instead of its older bookmark')
    const saved = point(scroller())
    await act(async () => root.render(null))
    await act(async () => root.render(<Fixture text={italian} nested={nested} align />)); await settle()
    check(point(scroller()).index === saved.index && Math.abs(point(scroller()).y - saved.y) < 0.02, 'Language alignment must persist the destination bookmark')
    const ratio = readingPoint().documentProgress
    await act(async () => root.render(<Fixture language="en" text={content} nested={nested} align />)); await settle()
    check(Math.abs(readingPoint().documentProgress - ratio) < 0.01, 'Divergent outlines need the documented percentage fallback')
    await act(async () => root.render(<Fixture id="another-lecture" text={english} nested={nested} align />)); await settle()
    check(scroller().scrollTop === 0, 'Section alignment must not leak into a different lecture')
    await act(async () => root.render(null))
    for (const key of Object.keys(localStorage)) if (key.includes('reading-test') || key.includes('another-lecture')) localStorage.removeItem(key)
  }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.append(style)
  const diagram = '```mermaid\nflowchart TD\nA[Audio] --> B[Trascrizione] --> C[Dispensa]\n```'
  const diagramText = '# Schemi\n\n' + diagram + '\n\n' + diagram + '\n\n' + content
  await act(async () => root.render(<Fixture text={diagramText} focus />))
  for (let attempt = 0; attempt < 80; attempt++) {
    if (document.querySelectorAll('.mermaid-diagram-canvas svg').length === 2) break
    await settle()
  }
  check(document.querySelectorAll('.mermaid-diagram-canvas svg').length === 2, 'Focus diagrams did not render')
  const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>('.mermaid-collapse-toggle'))
  check(toggles.length === 2 && toggles.every(button => button.getAttribute('aria-expanded') === 'true'), 'Each Focus diagram needs an expanded toggle')
  const target = document.getElementById(toggles[0].getAttribute('aria-controls')!)!
  const svg = target.querySelector('svg')
  // A diagram above the reading point must not move the paragraph being read.
  pane().scrollTop = 1800; pane().dispatchEvent(new Event('scroll')); await settle()
  const before = point(pane())
  await act(async () => toggles[0].click()); await settle()
  const folded = point(pane())
  check(target.hidden && toggles[0].getAttribute('aria-expanded') === 'false', 'Collapse did not hide the diagram accessibly')
  check(toggles[1].getAttribute('aria-expanded') === 'true', 'Collapsing one diagram changed another')
  check(folded.index === before.index && Math.abs(folded.y - before.y) < 0.02, 'Folding a diagram moved the reading point')
  await act(async () => toggles[0].click()); await settle()
  check(!target.hidden && target.querySelector('svg') === svg && svg!.getBoundingClientRect().height > 0, 'Reopening did not preserve a visible rendered SVG')
  const reopened = point(pane())
  check(reopened.index === before.index && Math.abs(reopened.y - before.y) < 0.02, 'Reopening moved the reading point')
  // Exercise native button activation, not a synthetic click posing as keyboard input.
  pane().scrollTop = 0; pane().dispatchEvent(new Event('scroll')); await settle()
  toggles[0].focus()
  await act(async () => { await require('electron').ipcRenderer.invoke('mermaid-toggle-key', 'Enter') }); await settle()
  check(target.hidden && document.activeElement === toggles[0], 'Enter did not fold the diagram and retain button focus')
  await act(async () => { await require('electron').ipcRenderer.invoke('mermaid-toggle-key', 'Space') }); await settle()
  check(!target.hidden, 'Space did not reopen the diagram')
  // Folding also hides source code and the safe error fallback without removing them.
  await act(async () => (document.querySelector('.mermaid-source-toggle') as HTMLButtonElement).click())
  await act(async () => toggles[0].click()); await settle()
  check(target.querySelector<HTMLElement>('.mermaid-source-code')!.getBoundingClientRect().height === 0, 'Source remained visible in a folded diagram')
  await act(async () => root.render(<Fixture text={diagramText} />)); await settle()
  check(!document.querySelector('.mermaid-collapse-toggle') && !target.hidden, 'Ordinary reading must always show diagrams')
  await act(async () => root.render(<Fixture text={'```mermaid\ngantt\ntitle Non supportato\n```'} focus />)); await settle()
  const errorToggle = document.querySelector<HTMLButtonElement>('.mermaid-collapse-toggle')!
  await act(async () => errorToggle.click()); await settle()
  await act(async () => errorToggle.click()); await settle()
  check(document.querySelector<HTMLElement>('.mermaid-diagram-error')!.getBoundingClientRect().height > 0, 'Safe Mermaid error fallback lost after reopening')
  await act(async () => root.render(null))
  // Exercise the real Focus toolbar and its group, including mixed individual states.
  const api = window.archive
  const oldGetPdf = api.getFocusPdf
  api.getFocusPdf = async () => null
  function GroupFixture({ id = 'collective-reading-test', text = diagramText }: { id?: string; text?: string }) {
    const ref = useRef<HTMLDivElement>(null)
    useReadingPosition(ref, `notes:${id}:it`, text, true)
    return <div style={{ height: 500 }}><FocusWorkspace lectureId={id} onTextZoom={() => {}} textZoom={1} onCloseQna={() => {}} qna={<MarkdownViewer content={diagram} />}>
      <div ref={ref} style={{ height: 300, overflow: 'auto' }} data-group-scroller><MarkdownViewer content={text} /></div>
    </FocusWorkspace></div>
  }
  try {
    await act(async () => root.render(<GroupFixture />)); await settle()
    const explanation = () => document.querySelector<HTMLElement>('.focus-explanation-column')!
    for (let attempt = 0; attempt < 80; attempt++) {
      if (explanation().querySelectorAll('.mermaid-diagram-canvas svg').length === 2) break
      await settle()
    }
    const allButton = () => Array.from(explanation().querySelectorAll<HTMLButtonElement>('.focus-pane-toolbar button')).find(button => button.textContent?.includes('tutti gli schemi'))!
    const individual = () => Array.from(explanation().querySelectorAll<HTMLButtonElement>('.mermaid-collapse-toggle'))
    const targets = () => individual().map(button => document.getElementById(button.getAttribute('aria-controls')!)!)
    const originalSvgs = targets().map(target => target.querySelector('svg'))
    check(originalSvgs.every(Boolean) && Boolean(allButton()), 'Real Focus must register all rendered diagrams')
    const scroller = document.querySelector<HTMLElement>('[data-group-scroller]')!
    const currentPoint = () => {
      const blocks = Array.from(scroller.querySelector<HTMLElement>('.markdown-body')!.children)
      const top = scroller.getBoundingClientRect().top
      const index = blocks.findIndex(block => block.getBoundingClientRect().bottom > top)
      const bounds = blocks[index].getBoundingClientRect()
      return { index, y: (top - bounds.top) / bounds.height }
    }
    scroller.scrollTop = 1800; scroller.dispatchEvent(new Event('scroll')); await settle()
    const saved = currentPoint()
    await act(async () => allButton().click()); await settle()
    check(targets().every(target => target.hidden) && allButton().textContent === 'Mostra tutti gli schemi', 'Collective command must hide all explanation diagrams')
    check(currentPoint().index === saved.index && Math.abs(currentPoint().y - saved.y) < 0.02, 'Collective hide moved the reading point')
    check(document.querySelector<HTMLElement>('.focus-qna-column .mermaid-diagram-canvas')!.getBoundingClientRect().height > 0, 'Collective hide must not affect Q&A diagrams')
    await act(async () => allButton().click()); await settle()
    check(targets().every((target, index) => !target.hidden && target.querySelector('svg') === originalSvgs[index]), 'Collective show must preserve the rendered SVGs')
    check(currentPoint().index === saved.index && Math.abs(currentPoint().y - saved.y) < 0.02, 'Collective show moved the reading point')
    await act(async () => individual()[0].click()); await settle()
    check(allButton().textContent === 'Nascondi tutti gli schemi', 'Mixed individual states must offer hide all')
    await act(async () => allButton().click()); await settle()
    await act(async () => individual()[0].click()); await settle()
    check(!targets()[0].hidden && targets()[1].hidden && allButton().textContent === 'Nascondi tutti gli schemi', 'Individual reopen after hide all must update collective state')
    scroller.scrollTop = 0; scroller.dispatchEvent(new Event('scroll')); await settle()
    await act(async () => { await require('electron').ipcRenderer.invoke('mermaid-toggle-key', 'Enter', true) }); await settle()
    check(targets().every(target => target.hidden) && document.activeElement === allButton(), 'Enter must hide all and retain toolbar focus')
    await act(async () => { await require('electron').ipcRenderer.invoke('mermaid-toggle-key', 'Space', true) }); await settle()
    check(targets().every(target => !target.hidden), 'Space must show all diagrams')
    await act(async () => allButton().click()); await settle()
    await act(async () => root.render(<GroupFixture id="next-collective-reading-test" />)); await settle()
    check(targets().every(target => !target.hidden), 'Collective state must reset for a different lecture, even with identical text')
    await act(async () => root.render(<GroupFixture text="# Nessuno schema" />)); await settle()
    check(!allButton(), 'The collective command must disappear when no diagrams remain')
  } finally {
    await act(async () => root.render(null))
    api.getFocusPdf = oldGetPdf
  }
  style.remove()
  for (const key of Object.keys(localStorage)) if (key.includes('reading-test')) localStorage.removeItem(key)
}
