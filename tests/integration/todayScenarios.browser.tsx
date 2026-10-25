import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { FocusWorkspace } from '../../src/components/FocusWorkspace'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { ResizableQnaPane } from '../../src/components/ResizableQnaPane'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { AmbientSoundPanel } from '../../src/components/AmbientSoundPanel'
import { AmbientSoundProvider } from '../../src/components/AmbientSoundContext'
import { BatteryIndicator } from '../../src/components/BatteryIndicator'
import { LectureDrawer } from '../../src/components/LectureDrawer'
import { MermaidDiagram } from '../../src/components/MermaidDiagram'
import { AMBIENT_SOUNDS } from '../../shared/ambientSounds'
import { StudyTimeRemovalDialog } from '../../src/components/StudyTimeRemovalDialog'
import type { QnaThread } from '../../shared/archive'
declare const require: any
export async function runTodayScenarios(root: Root, api: any) {
  const check = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message)
  }
  const wait = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })
  const until = async (test: () => unknown, message: string) => {
    for (let i = 0; i < 90; i++) {
      if (test()) return
      await wait()
    }
    check(test(), message)
  }
  const click = async (label: string) => {
    const button = document.querySelector<HTMLButtonElement>(
      `[aria-label="${label}"]`
    )
    check(button, 'Missing ' + label)
    await act(async () => button!.click())
    await wait()
  }
  const input = async (
    element: HTMLInputElement | HTMLTextAreaElement,
    text: string
  ) =>
    act(async () => {
      Object.getOwnPropertyDescriptor(
        element.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        'value'
      )!.set!.call(element, text)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    })
  const old = { ...api }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke(
    'video-import-styles'
  )
  document.head.appendChild(style)
  const lateQnaStyle = document.createElement('style')
  lateQnaStyle.textContent = await require('electron').ipcRenderer.invoke('qna-styles')
  document.head.appendChild(lateQnaStyle)
  const thread: QnaThread = {
    id: 'today-thread',
    quote: 'Equilibrio strategico',
    contextHeading: 'Introduzione',
    createdAt: '',
    updatedAt: '',
    messages: [
      { role: 'user', text: 'Come funziona?', timestamp: '' },
      {
        role: 'ai',
        text: 'Risposta con formula $x^2$. ' + 'Spiegazione. '.repeat(100),
        timestamp: ''
      }
    ]
  }
  const keys = [
    'lezionify:qna-text-zoom:v1',
    'lezionify:qna-width:standard:v1',
    'lezionify:qna-width:focus:v1',
    'lezionify:qna-length:v1'
  ]
  const stored = keys.map((key) => localStorage.getItem(key))
  keys.forEach((key) => localStorage.removeItem(key))
  try {
    let sent: unknown[] = []
    const qna = (
      <QnaSidebar
        threads={[thread]}
        activeThreadId={thread.id}
        setActiveThreadId={() => {}}
        isGenerating={false}
        error={null}
        onSendMessage={(...args) => {
          sent = args
          return false
        }}
        onDeleteThread={() => {}}
        onClose={() => {}}
      />
    )
    const renderChat = async () =>
      act(async () =>
        root.render(
          <div
            className="qna-standard-layout"
            style={{ width: 1100, height: 640 }}
          >
            <div className="markdown-view-container">Dispensa</div>
            <ResizableQnaPane>{qna}</ResizableQnaPane>
          </div>
        )
      )
    await renderChat()
    await wait()
    const paneBounds = document.querySelector('.resizable-qna-pane')!.getBoundingClientRect()
    const chatBounds = document.querySelector('.qna-sidebar')!.getBoundingClientRect()
    check(Math.abs(paneBounds.right - chatBounds.right) < 2 && Math.abs(paneBounds.width - chatBounds.width) < 2, 'Q&A leaves empty space inside its resized pane')
    const fontBefore = parseFloat(
      getComputedStyle(document.querySelector('.qna-message-content')!).fontSize
    )
    await click('Ingrandisci testo Q&A')
    check(
      parseFloat(
        getComputedStyle(document.querySelector('.qna-message-content')!)
          .fontSize
      ) > fontBefore,
      'Q&A text did not enlarge'
    )
    const zoomed = localStorage.getItem(keys[0])
    check(zoomed === '1.1', 'Q&A zoom not saved')
    await act(async () =>
      document
        .querySelector('.qna-sidebar')!
        .dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            ctrlKey: true,
            deltaY: -100,
            cancelable: true
          })
        )
    )
    check(
      localStorage.getItem(keys[0]) === '1.2',
      'Ctrl-wheel did not enlarge Q&A'
    )
    const pane = document.querySelector<HTMLElement>('.resizable-qna-pane')!
    const initialWidth = pane.clientWidth
    await act(async () =>
      document
        .querySelector('[aria-label="Larghezza della discussione"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
        )
    )
    await wait()
    check(pane.clientWidth > initialWidth, 'Q&A separator did not widen pane')
    check(Math.abs(pane.getBoundingClientRect().right - document.querySelector('.qna-sidebar')!.getBoundingClientRect().right) < 2, 'Resized Q&A leaves empty space on right')
    check(document.querySelector('.qna-length-toggle [aria-pressed="true"]')?.textContent === 'Breve', 'Q&A must default to Breve')
    await act(async () => Array.from(document.querySelectorAll<HTMLButtonElement>('.qna-length-toggle button')).find(button => button.textContent === 'Lunga')!.click())
    const savedWidth = localStorage.getItem(keys[1])
    const checks = document.querySelectorAll<HTMLInputElement>(
      '.qna-context-toggle input'
    )
    check(
      !checks[0].checked && !checks[1].checked,
      'Additional context must default off'
    )
    await act(async () => checks[1].click())
    await input(document.querySelector('textarea')!, 'Seconda domanda')
    await act(async () =>
      document.querySelector<HTMLButtonElement>('.qna-send-btn')!.click()
    )
    check(
      sent[2] === false && sent[3] === true && sent[4] === 'long',
      'Other Q&A opt-in changed full lesson consent'
    )
    check(document.querySelector<HTMLTextAreaElement>('.qna-input-row textarea')?.value === 'Seconda domanda', 'Failed Q&A request lost the editable draft')
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'today-qna'
    )
    await act(async () => root.render(null))
    await renderChat()
    await wait()
    check(document.querySelector('.qna-length-toggle [aria-pressed="true"]')?.textContent === 'Lunga', 'Q&A length preference did not survive remount')
    check(
      localStorage.getItem(keys[1]) === savedWidth &&
        document.querySelector('[aria-label="Ripristina testo Q&A"]')
          ?.textContent === '120%',
      'Q&A preferences did not survive remount'
    )
    await act(async () => root.render(null))

    api.getFocusPdf = async () => null
    await act(async () => root.render(<div style={{ width: 1100, height: 640, display: 'flex' }}><FocusWorkspace lectureId="today-focus" qna={qna} onCloseQna={() => {}} textZoom={1} onTextZoom={() => {}}><p>Dispensa con zoom indipendente</p></FocusWorkspace></div>))
    await wait()
    const focusPane = document.querySelector<HTMLElement>('.focus-qna-column')!
    const focusWidth = focusPane.clientWidth
    await act(async () => document.querySelector('[aria-label="Larghezza della discussione"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    await wait()
    check(focusPane.clientWidth > focusWidth && localStorage.getItem(keys[2]) !== null, 'Focus Q&A width did not change or persist')
    await click('Ingrandisci testo Q&A')
    check(document.querySelector('[aria-label="Ripristina zoom spiegazione"]')?.textContent === '100%', 'Q&A zoom changed the lesson zoom')
    await act(async () => root.render(null))

    let capture: any
    api.getScratchpad = async () => ({
      todos: [
        {
          id: 'memo-today',
          text: 'Testo originale',
          completed: true,
          createdAt: ''
        }
      ],
      notes: '',
      updatedAt: ''
    })
    let savedMemo: any
    api.saveScratchpad = async (data: any) => {
      savedMemo = data
    }
    function Memo() {
      capture = useQuickCapture()
      return capture.isOpen ? <QuickCaptureOverlay capture={capture} /> : null
    }
    await act(async () => root.render(<Memo />))
    await wait()
    await act(async () => capture.toggleOpen())
    await wait()
    const startEdit = async () =>
      act(async () =>
        document
          .querySelector('[aria-label="Testo attività"]')!
          .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      )
    check(
      document.querySelector<HTMLInputElement>('[aria-label="Testo attività"]')!
        .readOnly,
      'Memo must not edit on a single click'
    )
    await startEdit()
    await input(
      document.querySelector('[aria-label="Modifica testo attività"]')!,
      'Annullata'
    )
    await act(async () =>
      document
        .querySelector('[aria-label="Modifica testo attività"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        )
    )
    check(
      document.querySelector<HTMLInputElement>('[aria-label="Testo attività"]')
        ?.value === 'Testo originale',
      'Esc did not cancel Memo edit'
    )
    await startEdit()
    await input(
      document.querySelector('[aria-label="Modifica testo attività"]')!,
      'Testo aggiornato'
    )
    await act(async () =>
      document
        .querySelector('[aria-label="Modifica testo attività"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        )
    )
    await until(
      () => savedMemo?.todos[0].text === 'Testo aggiornato',
      'Memo edit not persisted'
    )
    check(
      savedMemo.todos[0].id === 'memo-today' &&
        savedMemo.todos[0].completed === true,
      'Memo lost identity or completion'
    )
    await startEdit()
    await act(async () =>
      document
        .querySelector<HTMLInputElement>(
          '[aria-label="Modifica testo attività"]'
        )!
        .focus()
    )
    await input(
      document.querySelector('[aria-label="Modifica testo attività"]')!,
      'Salvato uscendo'
    )
    check(
      document.activeElement ===
        document.querySelector('[aria-label="Modifica testo attività"]'),
      'Editor is not focused before blur'
    )
    await act(async () =>
      document
        .querySelector<HTMLInputElement>(
          '[aria-label="Modifica testo attività"]'
        )!
        .dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    )
    await until(
      () => savedMemo?.todos[0].text === 'Salvato uscendo',
      'Memo focusout did not save'
    )
    await act(async () => capture.saveGroup(null, 'Studio', 'S'))
    const groupId = capture.groups[0].id
    await act(async () => {
      capture.addTodo('Seconda attività', groupId)
      capture.updateNotes('Appunti conservati', groupId)
      capture.selectGroup('all')
    })
    check(document.querySelectorAll('.todo-item-row').length === 2 && !document.querySelector('.capture-group'), 'Tutti must show one flat list of all groups')
    const compact = document.querySelector('.memo-compact-fields')!
    check(compact.querySelector('.postit-todo')!.getBoundingClientRect().width > compact.getBoundingClientRect().width * 0.9, 'Compact Memo wastes half the available width')
    check(document.querySelector('.memo-all-notes') && !document.querySelector<HTMLDetailsElement>('.memo-all-notes')!.open, 'Group notes must be accessible and initially collapsed')
    await act(async () => document.querySelector<HTMLElement>('.memo-all-notes > summary')!.click())
    const noteDetails = Array.from(document.querySelectorAll<HTMLDetailsElement>('.memo-all-notes > details')).find(details => details.querySelector('summary')?.textContent === 'Studio')!
    await act(async () => noteDetails.querySelector<HTMLElement>('summary')!.click())
    check(noteDetails.querySelector<HTMLTextAreaElement>('textarea')?.value === 'Appunti conservati', 'Compact Memo lost group notes')
    await act(async () => document.querySelector<HTMLElement>('.memo-all-notes > summary')!.click())
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'today-memo'
    )
    await act(async () => root.render(null))

    let battery = { percent: 19, onBattery: true }
    api.getBatteryStatus = async () => battery
    await act(async () => root.render(<BatteryIndicator />))
    await wait()
    check(
      document
        .querySelector('.battery-charge-indicator')
        ?.textContent?.includes('🪫'),
      'Battery emoji missing below 20%'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'today-battery'
    )
    const fullscreenDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement')
    const fullscreenHost = document.createElement('div')
    document.body.appendChild(fullscreenHost)
    try {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: fullscreenHost })
      await act(async () => document.dispatchEvent(new Event('fullscreenchange')))
      check(fullscreenHost.querySelector('.battery-charge-indicator'), 'Battery indicator missing in fullscreen target')
    } finally {
      if (fullscreenDescriptor) Object.defineProperty(document, 'fullscreenElement', fullscreenDescriptor)
      else delete (document as any).fullscreenElement
      await act(async () => document.dispatchEvent(new Event('fullscreenchange')))
      fullscreenHost.remove()
    }
    battery = { percent: 19, onBattery: false }
    await act(async () => window.dispatchEvent(new Event('focus')))
    await wait()
    check(
      !document.querySelector('.battery-charge-indicator'),
      'Battery emoji remained on AC power'
    )
    battery = { percent: 20, onBattery: true }
    await act(async () => window.dispatchEvent(new Event('focus')))
    await wait()
    check(
      !document.querySelector('.battery-charge-indicator'),
      'Battery emoji appeared at 20%'
    )
    await act(async () => root.render(null))

    let removed: unknown[] = [], refreshed = 0, closed = false
    api.getStudyTimeRemovalTargets = async () => [{ id: 'today:TEST', kind: 'today', label: 'Oggi · TEST', availableSeconds: 600 }, { id: 'lecture:synthetic', kind: 'last-lecture', label: 'Ultima lezione · Titolo · 2026-10-20', availableSeconds: 1200 }]
    api.removeStudyTime = async (...args: unknown[]) => { removed = args }
    await act(async () => root.render(<StudyTimeRemovalDialog onClose={() => { closed = true }} onSaved={async () => { refreshed++ }} />))
    await wait()
    await input(document.querySelector('[aria-label="Minuti da togliere"]')!, '11')
    check(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, 'Removal must reject more than available')
    await input(document.querySelector('[aria-label="Minuti da togliere"]')!, '5')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'study-removal')
    await act(async () => document.querySelector<HTMLButtonElement>('button[type="submit"]')!.click())
    check(JSON.stringify(removed) === '["today:TEST",5]' && refreshed === 1 && closed, 'Time removal did not persist and refresh analytics')
    await act(async () => root.render(null))

    const installed = new Set<string>()
    const downloads: (string[] | undefined)[] = []
    const status = () => ({
      installed: installed.size === AMBIENT_SOUNDS.length,
      installing: false,
      installedBytes: 0,
      downloadBytes: 0,
      sounds: AMBIENT_SOUNDS.map((sound) => ({
        ...sound,
        installed: installed.has(sound.id)
      }))
    })
    api.ambientSoundStatus = async () => status()
    api.installAmbientSounds = async (ids?: string[]) => {
      downloads.push(ids)
      ;(ids ?? AMBIENT_SOUNDS.map((sound) => sound.id)).forEach((id) =>
        installed.add(id)
      )
      return status()
    }
    let plays = 0
    api.readAmbientSound = async () => {
      plays++
      throw new Error('Unexpected playback')
    }
    await act(async () =>
      root.render(
        <AmbientSoundProvider>
          <AmbientSoundPanel />
        </AmbientSoundProvider>
      )
    )
    await wait()
    check(
      document.querySelectorAll('.ambient-card').length === 16,
      'Expanded sound catalog missing'
    )
    await act(async () => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Casuale')!.click())
    check(downloads.length === 0 && plays === 0 && document.querySelector('[role="alert"]')?.textContent?.includes('Scarica almeno'), 'Casuale must explain missing sounds without downloading or playing')
    await click('Scarica Canto degli uccelli')
    check(
      JSON.stringify(downloads[0]) === '["birds"]',
      'Single sound download requested other files'
    )
    check(
      document.querySelector('[aria-label="Riproduci Canto degli uccelli"]'),
      'Download did not turn into Ascolta'
    )
    const all = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Scaricali tutti'
    )!
    await act(async () => all.click())
    await wait()
    check(
      downloads.length === 2 &&
        document.querySelectorAll('.ambient-play-btn').length === 16,
      'Download all did not update sound cards'
    )
    check(plays === 0, 'Download unexpectedly started playback')
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'today-sounds'
    )
    await act(async () => root.render(null))

    const source =
      'flowchart TD\n    accTitle: Ciclo del Fictitious Play\n    accDescr: Diagramma di flusso iterativo che descrive il processo di aggiustamento asincrono nel Fictitious Play.\n\n    A["Inizio: Profilo Strategico Iniziale s"] --> B["Selezione Giocatore i (Casuale o Round-Robin)"]\n    B --> C{"Il giocatore i ha rimpianti?<br/>(s_{-i} è fisso)"}\n    C -- "Sì" --> D["Deviazione a Risposta Ottima: s\'_i = BR(s_{-i})"]\n    D --> E["Aggiornamento Profilo Strategico"]\n    E --> B\n    C -- "No per tutti i giocatori" --> F["Stato Assorbente: Equilibrio di Nash"]\n\n    style A fill:#f9f9f9,stroke:#333333,stroke-width:2px;\n    style B fill:#ffffff,stroke:#333333,stroke-width:2px;\n    style C fill:#ffffff,stroke:#333333,stroke-width:2px;\n    style D fill:#ffffff,stroke:#333333,stroke-width:2px;\n    style E fill:#ffffff,stroke:#333333,stroke-width:2px;\n    style F fill:#d4edda,stroke:#28a745,stroke-width:2px;\n'
    await act(async () =>
      root.render(
        <div style={{ width: 1100, height: 750 }}>
          <MermaidDiagram source={source} />
        </div>
      )
    )
    await until(
      () => document.querySelector('.mermaid-diagram-canvas svg'),
      'Fictitious Play did not render SVG'
    )
    check(
      !document.querySelector('.mermaid-error'),
      'Fictitious Play remained in fallback'
    )
    check(
      document.querySelectorAll('.node').length === 6,
      'Fictitious Play lost nodes'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'today-mermaid'
    )
    await act(async () => root.render(null))
    // Decode the actual downloaded public recordings with the same browser decoder used by production.
    const fs = require('node:fs'),
      path = require('node:path')
    const audioVerification: any[] = []
    const audioContext = new AudioContext()
    try {
      for (const sound of AMBIENT_SOUNDS.slice(6)) {
        const file = path.join(
          process.cwd(),
          'local-artifacts/today-sounds',
          sound.id + '.ogg'
        )
        if (!fs.existsSync(file)) continue // CI has no downloaded artifacts; metadata and deterministic service tests still run.
        const bytes = fs.readFileSync(file)
        const decoded = await audioContext.decodeAudioData(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          )
        )
        check(
          decoded.duration > 1 && decoded.numberOfChannels > 0,
          'New audio failed decoding ' + sound.id
        )
        const hash = require('node:crypto')
          .createHash('sha256')
          .update(bytes)
          .digest('hex')
        check(
          bytes.length === sound.bytes && hash === sound.sha256,
          'Audio catalog integrity mismatch ' + sound.id
        )
        audioVerification.push({
          id: sound.id,
          bytes: bytes.length,
          sha256: hash,
          duration: decoded.duration,
          channels: decoded.numberOfChannels,
          sampleRate: decoded.sampleRate
        })
      }
    } finally {
      await audioContext.close()
    }
    if (audioVerification.length) {
      check(
        audioVerification.length === 10,
        'Expected ten verified public recordings'
      )
      fs.writeFileSync(
        path.join(
          process.cwd(),
          'local-artifacts/today-sounds/verification.json'
        ),
        JSON.stringify(audioVerification, null, 2)
      )
    }

    const selectedLecture = {
      id: 'focus-lecture',
      courseCode: 'ZERO',
      recordedAt: '2026-09-08T09:00:00.000Z',
      sourceAudioFileName: 'focus.mp3',
      sourceTranscriptFileName: null,
      audioFileName: 'focus.mp3',
      transcriptFileName: 'focus.txt',
      markdownFileName: 'focus.md',
      markdownEnFileName: null,
      byteSize: 1,
      checksum: 'focus',
      importedAt: '2026-09-08T09:00:00.000Z',
      status: 'transcript-available',
      studyStatus: 'da-studiare'
    }
    const drawerProps: any = {
      selectedLecture,
      allLectures: [selectedLecture],
      onClose() {},
      activeTab: 'markdown',
      setActiveTab() {},
      markdownText: '# Test focus',
      transcriptText: 'testo',
      studySet: null,
      isGeneratingStudySet: false,
      studySetError: null,
      onGenerateStudySet() {},
      isLoadingContent: false,
      isGenerating: false,
      generationProgress: null,
      generationError: null,
      isTranscribing: false,
      transcribeError: null,
      copyFeedback: null,
      isEditingMetadata: false,
      setIsEditingMetadata() {},
      editCourseCode: '',
      setEditCourseCode() {},
      editRecordedAt: '',
      setEditRecordedAt() {},
      showDeleteConfirm: false,
      setShowDeleteConfirm() {},
      existingCourses: [],
      settingsModel: 'gemini-3.6-flash',
      onStudyStatusChange() {},
      onGenerateLectureNotes() {},
      onPrintNotes() {},
      onCopyMarkdown() {},
      onCopyTranscript() {},
      onAttachTranscript() {},
      onTranscribeAudio() {},
      onPasteFromClipboard() {},
      onSaveMetadata() {},
      onDeleteLecture() {},
      onOpenSettings() {},
      formatDate: () => '',
      formatFileSize: () => '',
      studyStatusLabels: {
        'da-studiare': { label: '', icon: '', className: '' },
        'in-corso': { label: '', icon: '', className: '' },
        completata: { label: '', icon: '', className: '' }
      }
    }

    api.loadQnaThreads = async () => [thread]
    api.getHighlights = async () => []
    api.getReminders = async () => []
    api.getFocusPdf = async () => null
    api.getLectureWordCounts = async () => ({})
    let requests = 0
    api.generateQnaResponse = async () => {
      requests++
      return { success: true, text: 'Risposta' }
    }
    await act(async () => root.render(<LectureDrawer {...drawerProps} activeTab="info" selectedLecture={{ ...selectedLecture, recordedAt: '2026-10-21T10:32:00', durationSeconds: 6360 }} />))
    check(document.querySelector('.metadata-card .recording-times')?.textContent?.includes('12:18'), 'Info e Gestione did not show calculated audio end')
    check(!document.querySelector('.recording-times input'), 'Recording times must remain read-only')
    await act(async () => root.render(<LectureDrawer {...drawerProps} />))
    await wait()
    await click('Apri domande Q&A')
    await until(
      () => document.querySelector('.qna-message'),
      'Q&A reopening did not show existing discussion'
    )
    await click('Chiudi Q&A')
    check(!document.querySelector('.qna-sidebar'), 'Q&A did not close')
    await click('Apri domande Q&A')
    check(
      document.querySelector('.qna-message') && requests === 0,
      'Reopening Q&A sent an AI request'
    )
    const secondThread = { ...thread, id: 'second-first', quote: 'Prima discussione B', messages: [{ role: 'user' as const, text: 'Domanda B prima', timestamp: '' }] }
    api.loadQnaThreads = async (id: string) => id === 'second-lecture' ? [secondThread, { ...thread, id: 'second-last' }] : [thread]
    const lastKey = 'lezionify:qna-last:second-lecture'
    const oldLast = localStorage.getItem(lastKey)
    try {
      localStorage.setItem(lastKey, secondThread.id)
      await act(async () => root.render(<LectureDrawer {...drawerProps} />))
      await wait()
      await click('Apri domande Q&A')
      await act(async () => root.render(<LectureDrawer {...drawerProps} selectedLecture={{ ...selectedLecture, id: 'second-lecture' }} />))
      await wait()
      check(localStorage.getItem(lastKey) === secondThread.id, 'Changing lessons overwrote the remembered Q&A with the previous lesson thread')
      await click('Apri domande Q&A')
      check(document.querySelector('.qna-message-content')?.textContent === 'Domanda B prima', 'Did not restore the last consulted discussion in the second lesson')
    } finally { if (oldLast === null) localStorage.removeItem(lastKey); else localStorage.setItem(lastKey, oldLast) }
    await act(async () => root.render(null))
  } finally {
    await act(async () => root.render(null))
    Object.assign(api, old)
    for (const key of Object.keys(api)) if (!(key in old)) delete api[key]
    keys.forEach((key, index) => {
      const value = stored[index]
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    })
    style.remove()
    lateQnaStyle.remove()
  }
}
