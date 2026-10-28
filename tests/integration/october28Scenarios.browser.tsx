import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { MarkdownViewer } from '../../src/components/MarkdownViewer'
import { MermaidDiagram } from '../../src/components/MermaidDiagram'
import { DictionaryOverlay } from '../../src/components/DictionaryOverlay'
import { FocusReminders } from '../../src/components/FocusReminders'
import { SectionRegenerator } from '../../src/components/SectionRegenerator'
import { useHighlights } from '../../src/hooks/useHighlights'
import { useStudyTracker } from '../../src/hooks/useStudyTracker'
import { FocusLockModal } from '../../src/components/FocusLockModal'
import { saveInactivityProfile } from '../../src/utils/studyInactivity'
import { observeParagraphs } from '../../src/utils/paragraphObservation'

declare const require: any
export async function runOctober28Scenarios(root: Root, api: any) {
  const ipc = require('electron').ipcRenderer
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const wait = async (ms = 80) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
  const render = async (value: React.ReactNode) => { await act(async () => root.render(value)); await wait() }
  const click = async (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === label || item.getAttribute('aria-label') === label)
    check(button && !button.disabled, `Missing enabled button ${label}`)
    await act(async () => button!.click()); await wait()
  }
  const type = async (field: HTMLTextAreaElement, value: string) => act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const previous = { ...api }
  const style = document.createElement('style'); style.textContent = await ipc.invoke('video-import-styles'); document.head.append(style)
  const stored = Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]))
  try {
    const sends: any[] = []
    let thread: any = { id: 'oct28', quote: 'Politica $\\epsilon$-greedy', contextHeading: 'Politiche', messages: [], createdAt: '', updatedAt: '' }
    const questions = (generating = false) => <div style={{ height: 650, width: 500, display: 'flex' }}><QnaSidebar threads={[thread]} activeThreadId={thread.id} setActiveThreadId={() => {}} isGenerating={generating} error={null} onSendMessage={async (...args) => { sends.push(args); return true }} onDeleteThread={() => {}} onClose={() => {}} /></div>
    localStorage.setItem('lezionify:qna-length:v1', 'long')
    await render(questions())
    check(document.activeElement?.getAttribute('aria-label') === 'Domanda sulla lezione', 'Q&A opening did not focus the question')
    const choices = [...document.querySelectorAll<HTMLInputElement>('.qna-context-toggle input')]
    check(choices[0].checked && !choices[1].checked && !choices[2].checked, 'Q&A defaults must be full lesson, no others, web off')
    check(document.querySelector('.qna-length-toggle [aria-pressed="true"]')?.textContent === 'Breve', 'New Q&A must start brief')
    const input = document.querySelector<HTMLTextAreaElement>('textarea')!
    await type(input, 'Domanda sintetica')
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })))
    check(sends.length === 0, 'Shift+Enter sent a question')
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })))
    check(sends.length === 0, 'IME sent a question')
    await act(async () => choices[2].click())
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
    await wait()
    check(sends.length === 1 && sends[0][2] === true && sends[0][3] === false && sends[0][4] === 'brief' && sends[0][5] === true, 'Question options lost before send')
    check(!document.querySelectorAll<HTMLInputElement>('.qna-context-toggle input')[2].checked, 'Web consent persisted to another question')

    thread = { ...thread, messages: [{ role: 'ai', text: String.raw`Politiche \(\epsilon\)-greedy e \(\epsilon\)-soft.

\[\pi(a\mid s)=\begin{cases}
1-\epsilon+\frac{\epsilon}{|A(s)|} & \text{greedy} \\
\frac{\epsilon}{|A(s)|} & \text{altrimenti}
\end{cases}\]

Fine spiegazione.` }] }
    await render(questions())
    check(document.querySelectorAll('.qna-message-content .katex').length === 3, 'Q&A epsilon/cases did not render once each')
    check(!document.querySelector('.katex-error') && document.querySelector('.qna-message-content')?.textContent?.includes('Fine spiegazione.'), 'Q&A math swallowed prose')
    const mathml = document.querySelector<HTMLElement>('.qna-message-content .katex-mathml')!
    check(getComputedStyle(mathml).position === 'absolute', 'Accessible KaTeX tree is visually duplicated')
    const range = document.createRange(); range.selectNodeContents(document.querySelector('.qna-message-content')!)
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range)
    const clipboard = new DataTransfer()
    document.querySelector('.qna-message-content')!.dispatchEvent(new ClipboardEvent('copy', { clipboardData: clipboard, bubbles: true, cancelable: true }))
    check(clipboard.getData('text/plain').split('\\epsilon').length - 1 === 5, 'Copied formula duplicated visual/accessible content')
    selection.removeAllRanges()
    await ipc.invoke('capture-video-import', 'oct28-qna')
    const final = thread.messages[0].text
    thread.messages[0].text = final.slice(0, final.indexOf('\\end{cases}'))
    await render(questions(true))
    thread.messages[0].text = final
    await render(questions(false))
    check(document.querySelectorAll('.qna-message-content .katex').length === 3 && !document.querySelector('.katex-error'), 'Complete streamed math did not recover')
    await render(<MarkdownViewer content={String.raw`Prezzi 1.00\$$, 0.99,$ e $0.98,$$. Il costo è (c = 0.50\$$ nell'esempio). L'impresa opererebbe in perdita (\Pi < 0$). Formula vera: $Q > 0$.`} />)
    check(document.querySelectorAll('.katex').length === 1 && document.querySelector('.markdown-body')?.textContent?.includes("L'impresa opererebbe in perdita"), 'Money punctuation deformed prose or broke real math')

    await render(<MermaidDiagram source={'stateDiagram-v2\naccTitle: AB\n[*] --> A: Inizio (1/8)\nA --> B: R = 0 (100%)\nB --> [*]: R = 1 (75%)\nstyle A fill:#e1f5fe,stroke:#0288d1,stroke-width:2px\nstyle B fill:#fff3e0,stroke:#f57c00,stroke-width:2px'} />)
    for (let index = 0; index < 40 && !document.querySelector('.mermaid-diagram-canvas svg'); index++) await wait(100)
    check(document.querySelector('.mermaid-diagram-canvas svg'), `State diagram failed actual renderer: ${document.querySelector('.mermaid-diagram-error')?.textContent}`)
    await ipc.invoke('capture-video-import', 'oct28-state-diagram')

    const highlights = new Map<string, any[]>()
    api.getHighlights = async (id: string) => structuredClone(highlights.get(id) ?? [])
    api.saveHighlights = async (id: string, items: any[]) => { highlights.set(id, structuredClone(items)) }
    let annotations!: ReturnType<typeof useHighlights>, owner = 'annot-it'
    function Annotated() {
      annotations = useHighlights(owner)
      return <MarkdownViewer content={'## Paragrafo\n\nTesto sintetico prima della formula $Q$ e dopo la formula.'} highlights={annotations.highlights} isHighlightMode={annotations.isHighlightMode} onAddHighlight={annotations.addHighlight} onRemoveHighlightAtOffset={annotations.removeHighlightAtOffset} />
    }
    await render(<Annotated />)
    await act(async () => { annotations.setIsHighlightMode(true); annotations.setAnnotationStyle('underline') })
    const text = document.querySelector('.markdown-body p')!.firstChild!
    range.setStart(text, 0); range.setEnd(text, 15); selection.removeAllRanges(); selection.addRange(range)
    await act(async () => document.querySelector('.markdown-body')!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    await wait()
    check(highlights.get(owner)?.[0]?.style === 'underline', 'DOM selection not persisted as underline')
    check((CSS as any).highlights.get('lezionify-underline')?.size === 1, 'Underline missing from CSS highlight registry')
    await act(async () => annotations.setAnnotationStyle('highlight'))
    await act(async () => annotations.addHighlight(12, 30, 'Sovrapposto'))
    await wait()
    check(annotations.highlights.length === 2 && (CSS as any).highlights.get('lezionify-highlight-yellow')?.size === 1, 'Highlight and underline cannot overlap')
    const paragraph = document.querySelector('.markdown-body p')!
    range.setStart(paragraph.firstChild!, 5); range.setEnd(paragraph.lastChild!, paragraph.lastChild!.textContent!.length)
    selection.removeAllRanges(); selection.addRange(range)
    await act(async () => document.querySelector('.markdown-body')!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })))
    await wait()
    const clone = document.querySelector('.markdown-body')!.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.katex-mathml').forEach(node => node.remove())
    check(Math.max(...annotations.highlights.map(item => item.endOffset)) === clone.textContent!.length, 'Selection crossing a formula counted hidden MathML twice')
    owner = 'annot-en'; await render(<Annotated />)
    check(annotations.highlights.length === 0, 'English annotations reused Italian offsets')
    owner = 'annot-it'; await render(<Annotated />)
    check(annotations.highlights.length === 2, 'Reopening lost persisted annotations')
    await act(async () => { annotations.setAnnotationStyle('underline') })
    await act(async () => annotations.removeHighlightAtOffset(12))
    check(annotations.highlights.length === 1 && (CSS as any).highlights.get('lezionify-underline') === undefined, 'Removing underline removed highlight or left stale drawing')
    await render(null)

    localStorage.removeItem('lezionify.paragraph-samples.v1')
    localStorage.removeItem('lezionify.paragraph-progress.v1:synthetic-observations:it')
    await render(<div id="paragraph-root" style={{ height: 200, overflow: 'auto', width: 500 }}><div className="markdown-body">{Array.from({ length: 90 }, (_, index) => <p key={index} style={{ height: 200, margin: 0 }}>{`Blocco ${index}. ` + 'Studio locale di parole tecniche senza contenuti personali. '.repeat(12)}</p>)}</div></div>)
    const paragraphRoot = document.querySelector<HTMLElement>('#paragraph-root')!
    const observation = observeParagraphs('synthetic-observations', 'it')
    for (let index = 0; index < 30; index++) check(observation.tick(paragraphRoot, 1) === null, 'Insufficient paragraph samples produced a number')
    paragraphRoot.scrollTop = 200
    for (let index = 0; index < 30; index++) observation.tick(paragraphRoot, 1)
    paragraphRoot.scrollTop = 400
    const estimate = observation.tick(paragraphRoot, 1)
    check(estimate?.includes('Paragrafo:') && estimate.includes('provvisoria') && estimate.includes('incertezza'), 'Paragraph estimate missing provisional uncertainty')
    const remaining = Number(/Studio restante: circa (\d+)/.exec(estimate!)?.[1])
    check(remaining > 30, 'Paragraph estimate incorrectly retains old 30-minute visibility cap')
    observation.save()
    const observed = JSON.parse(localStorage.getItem('lezionify.paragraph-samples.v1')!)
    check(observed.length === 2 && observed.every((sample: any) => sample.seconds === 30 && !('text' in sample)), 'Viewport exposure duplicated time, skipped blocks or persisted text')
    check(observeParagraphs('synthetic-observations', 'it').tick(paragraphRoot, 1)?.includes('Paragrafo:'), 'Paragraph model not restored after reopening')
    await render(null)

    let translations = 0
    api.offlineTranslationStatus = async () => ({ installed: true, installing: false })
    api.translatePhrase = async () => { translations++; return { text: 'Traduzione' } }
    api.lookupDictionary = async (query: string, direction: string) => ({ query, entries: direction === 'it-it' ? [{ word: query, partOfSpeech: '', pronunciation: '', senses: [{ translations: [], definitions: ['Definizione italiana sintetica.'] }] }] : [], suggestions: [], lemma: query, inflected: false })
    await render(<DictionaryOverlay onClose={() => {}} />)
    await type(document.querySelector('textarea')!, 'algoritmo')
    await click('Dizionario italiano'); await wait(250)
    check(document.querySelector('.dictionary-results')?.textContent?.includes('Definizione italiana sintetica.'), 'Italian definition missing')
    const beforePhrase = translations
    await type(document.querySelector('textarea')!, 'una frase intera'); await wait(600)
    check(translations === beforePhrase && document.querySelector('.dictionary-results')?.textContent?.includes('una sola parola'), 'Monolingual mode silently translated a phrase')
    await click('Traduttore')
    check(document.querySelector('textarea')!.value === 'una frase intera', 'Mode change lost input')
    await render(null)

    api.getReminders = async () => [{ id: 'alarm', kind: 'alarm', status: 'active', label: '', createdAt: new Date().toISOString(), dueAt: new Date(Date.now() + 35 * 60_000).toISOString() }]
    api.saveReminders = async () => {}
    await render(<FocusReminders />)
    check(document.querySelector('.focus-reminders-trigger')?.getAttribute('title')?.includes('35 minuti rimanenti'), 'Alarm tooltip missing remaining minutes')
    await render(null)

    let applies = 0
    api.previewSectionRevision = async () => ({ token: 'preview', title: 'Sezione', before: 'Prima', after: 'Dopo', fullTranscript: true })
    api.applySectionRevision = async () => { applies++; return '# Titolo\n## Sezione\nDopo' }
    api.restoreSectionRevision = async () => '# Titolo\n## Sezione\nPrima'
    await render(<SectionRegenerator lectureId="A" markdown={'# Titolo\n\n## Sezione\nPrima'} english={false} disabled={false} />)
    await click('Rigenera sezione'); await click('Genera anteprima con Gemini')
    check(applies === 0 && document.querySelector('[aria-label="Rigenera sezione"]')?.textContent?.includes('Anteprima proposta'), 'Preview applied without confirmation')
    for (const width of [1440, 768, 390]) {
      await ipc.invoke('feature-test-window-size', { width, height: 820 }); await wait()
      const bounds = document.querySelector('.section-revision-dialog')!.getBoundingClientRect()
      check(bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight, 'Revision dialog clipped at ' + width)
      await ipc.invoke('capture-video-import', `oct28-revision-${width}`)
    }
    await click('Conferma sostituzione'); check(applies === 1 && !document.querySelector('[aria-label="Rigenera sezione"]'), 'Confirmed revision not applied exactly once')
    await render(null)

    // Pin only the tracker heartbeat: seconds advance without a three-minute wait.
    const now = Date.now, setIntervalNative = window.setInterval, clearIntervalNative = window.clearInterval
    let clock = now(), callback: (() => void) | null = null, tracker!: ReturnType<typeof useStudyTracker>
    Date.now = () => clock
    window.setInterval = ((fn: () => void, delay: number) => { if (delay === 1000) { callback = fn; return 999991 } return setIntervalNative(fn, delay) }) as any
    window.clearInterval = ((id: number) => { if (id !== 999991) clearIntervalNative(id) }) as any
    api.saveStudySession = async () => {}; api.getLectureStudySeconds = async () => 0
    saveInactivityProfile({ observing: true, sessions: {}, gaps: [], thresholdMinutes: 3 })
    function Tracker() { tracker = useStudyTracker({ activeLectureId: 'calibration', courseCode: 'TEST', isFocusMode: true, activeTab: 'markdown', isEnabled: true }); return null }
    try {
      await render(<Tracker />)
      for (let index = 0; index < 182; index++) await act(async () => { clock += 1000; callback?.() })
      check(tracker.inactivityPrompt && tracker.isPaused && tracker.showFocusLock, 'Inactivity did not ask and pause')
      const seconds = tracker.activeSeconds
      for (let index = 0; index < 20; index++) await act(async () => { clock += 1000; callback?.() })
      check(tracker.activeSeconds === seconds, 'Unanswered inactivity prompt counted study time')
      await act(async () => tracker.studyWithoutInput())
      for (let index = 0; index < 190; index++) await act(async () => { clock += 1000; callback?.() })
      check(!tracker.inactivityPrompt && tracker.activeSeconds > seconds, 'Reading without input did not resume counting')
      await render(null)
    } finally { Date.now = now; window.setInterval = setIntervalNative; window.clearInterval = clearIntervalNative }
    await render(<FocusLockModal show inactivity courseCode="TEST" sessionSeconds={100} lectureTotalSeconds={200} onContinue={() => {}} onQuit={() => {}} onStudyWithoutInput={() => {}} />)
    check(document.querySelector('#focus-lock-title')?.textContent === 'Stai ancora studiando?', 'Inactivity modal has wrong question')
  } finally {
    await render(null); Object.assign(api, previous); style.remove()
    localStorage.clear(); for (const [key, value] of Object.entries(stored)) if (value !== null) localStorage.setItem(key, value)
    await ipc.invoke('feature-test-window-size', false)
  }
}
