import { useQuickCapture } from '../../src/hooks/useQuickCapture'
import { QuickCaptureOverlay } from '../../src/components/QuickCaptureOverlay'
import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { useModalFocus } from '../../src/hooks/useModalFocus'
import { RecorderEntry, RecorderOverlays } from '../../src/components/RecorderEntry'
import { RepetitionWindow } from '../../src/components/RepetitionWindow'
import {
  REPETITION_HEADINGS,
  type RepetitionSession
} from '../../shared/repetition'

declare const require: any

function RealMemoProbe() {
  const capture = useQuickCapture()
  return <><RepetitionWindow onClose={() => {}} />{capture.isOpen && <QuickCaptureOverlay capture={capture} />}</>
}

function MemoProbe() {
  const ref = React.useRef<HTMLDivElement>(null)
  useModalFocus(ref, true)
  return <div ref={ref} role="dialog"><input aria-label="Memo probe" /></div>
}

export async function runRepetitionScenarios(root: Root, api: any) {
  const original = { ...api }
  const ipc = require('electron').ipcRenderer
  const style = document.createElement('style')
  style.textContent = await ipc.invoke('video-import-styles')
  document.head.appendChild(style)
  const check = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message)
  }
  const wait = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 90))
    })
  const click = async (label: string) => {
    const button = [
      ...document.querySelectorAll<HTMLButtonElement>('button')
    ].find(
      (item) =>
        item.textContent?.trim() === label ||
        item.getAttribute('aria-label') === label
    )
    check(button, `Controllo assente: ${label}`)
    await act(async () => button!.click())
    await wait()
  }
  let scans = 0,
    starts = 0,
    selections = 0,
    resumes = 0,
    referenceName: string | null = null
  const id = 'a'.repeat(64)
  const session: RepetitionSession = {
    id,
    audioName: '2026-1028-09-00-00.mp3',
    referenceName: 'Appunti di reti.md',
    createdAt: '2026-10-28T09:00:00Z',
    status: 'completed',
    percent: 100,
    message: 'Valutazione salvata in RIPETERE.'
  }
  const assessment = REPETITION_HEADINGS.map(
    (title) =>
      `## ${title}\n\nEsempio sintetico: un tentativo iniziale viene corretto nella spiegazione successiva.`
  ).join('\n\n')
  api.repetitionState = async () => ({
    referenceName,
    busy: false,
    activeId: starts ? id : null,
    sessions: starts ? [session] : []
  })
  api.selectRepetitionReference = async () => {
    selections++
    referenceName = 'Appunti di reti.md'
    return true
  }
  api.startRepetition = async () => {
    starts++
    return id
  }
  api.resumeRepetition = async () => {
    resumes++
    session.status = 'completed'
    return id
  }
  api.readRepetition = async () => ({
    session,
    reference: '# Appunti di riferimento\nQuesti sono gli appunti usati.',
    transcript: 'Prima sbaglio. Mi correggo dopo aver controllato gli appunti.',
    assessment, conversation: []
  })
  api.detectUsbRecorder = async () => {
    scans++
    return { detected: false, files: [] }
  }
  let answers = 0
  api.answerRepetition = async (_id: string, text: string) => {
    answers++
    return [{ role: 'user', text }, { role: 'ai', text: 'Corretto: giustifica il passaggio.' }]
  }
  const renderEntry = async () => {
    await act(async () =>
      root.render(
        <RecorderEntry
          onClose={() => {}}
          onNotice={() => {}}
          onRefreshLibrary={async () => {}}
          courses={[]}
        />
      )
    )
    await wait()
  }
  try {
    await act(async () => root.render(<><RepetitionWindow onClose={() => {}} /><MemoProbe /></>))
    await wait()
    const memoInput = document.querySelector<HTMLInputElement>('[aria-label="Memo probe"]')!
    memoInput.focus()
    check(document.activeElement === memoInput && !memoInput.closest('[inert]'), 'Memo sopra RIPETERE deve accettare focus e scrittura')
    await act(async () => root.render(null))
    await wait()
    let persistedNotes = ''
    api.getScratchpad = async () => ({ todos: [], notes: persistedNotes, updatedAt: new Date().toISOString() })
    api.saveScratchpad = async (value: any) => { persistedNotes = value.notes }
    await act(async () => root.render(<RealMemoProbe />))
    await wait()
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, bubbles: true })))
    await wait()
    const notes = document.querySelector<HTMLTextAreaElement>('.postit-textarea')!
    check(notes, 'Ctrl+M apre Memo reale sopra RIPETERE')
    notes.focus()
    check(document.activeElement === notes && !notes.closest('[inert]'), 'Campo appunti reale scrivibile')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(notes, 'Nota sintetica persistita')
      notes.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)) })
    check(persistedNotes === 'Nota sintetica persistita', 'Appunti salvati da Memo sopra RIPETERE')
    for (const shift of [false, true]) {
      await ipc.invoke('feature-test-key', 'Tab', shift)
      check(document.querySelector('.quick-capture-deck')!.contains(document.activeElement), 'Tab deve restare nel Memo attivo')
    }

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, bubbles: true })))
    await wait()
    check(!document.querySelector('.quick-capture-deck'), 'Ctrl+M richiude Memo')
    check(!document.querySelector('.repetition-window')!.closest('[inert]'), 'RIPETERE torna interattivo')
    check(document.querySelector('.repetition-window')!.contains(document.activeElement), 'Il focus ritorna a RIPETERE')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', ctrlKey: true, bubbles: true })))
    await wait()
    check(document.querySelector<HTMLTextAreaElement>('.postit-textarea')?.value === persistedNotes, 'Memo riaperto conserva gli appunti')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await wait()
    check(!document.querySelector('.quick-capture-deck'), 'Escape chiude il Memo attivo')

    await act(async () => root.render(null))
    await wait()
    const overlays = (showUsb: boolean, showRepetitions: boolean) => <RecorderOverlays showUsb={showUsb} showRepetitions={showRepetitions} onCloseUsb={() => {}} onCloseRepetitions={() => {}} onRefreshLibrary={async () => {}} onNotice={() => {}} courses={[]} />
    await act(async () => root.render(overlays(false, true)))
    await wait()
    await act(async () => root.render(overlays(true, true)))
    await wait()
    check(document.querySelectorAll('[role="dialog"]').length === 1 && !document.querySelector('.recorder-choice'), 'Il popup USB tardivo deve essere differito durante RIPETERE')
    await act(async () => root.render(overlays(true, false)))
    await wait()
    check(document.querySelector('.recorder-choice') && starts === 0, 'Il popup accodato ritorna senza avviare AI')
    await act(async () => root.render(null))
    await wait()
    await renderEntry()
    check(
      scans === 0 && starts === 0,
      'L’apertura deve mostrare la scelta senza avviare AI o scansione STUDIO'
    )
    await ipc.invoke('capture-video-import', 'repeat-choice')
    const repeatButton = [
      ...document.querySelectorAll<HTMLButtonElement>('button')
    ].find(
      (button) => button.querySelector('strong')?.textContent === 'RIPETERE'
    )!
    await act(async () => repeatButton.click())
    await wait()
    check(
      starts === 1 && selections === 1,
      'RIPETERE deve chiedere il primo riferimento e partire automaticamente una sola volta'
    )
    check(
      scans === 0,
      'La schermata STUDIO non deve essere montata in RIPETERE'
    )
    check(
      document.querySelectorAll('.markdown-body h2').length === 3,
      'Valutazione con le tre sezioni'
    )
    check(
      document.querySelector('audio')?.getAttribute('src') ===
        `media://repetition/${id}`,
      'Audio originale accessibile dalla sessione'
    )
    const answerField = document.querySelector<HTMLTextAreaElement>('[aria-label="Verifica della comprensione"] textarea')!
    check(answerField && answers === 0, 'Gli esercizi non devono inviare automaticamente')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(answerField, 'La policy pesa le transizioni.')
      answerField.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click('Verifica con Gemini')
    check(answers === 1 && document.body.textContent?.includes('Corretto: giustifica'), 'Risposta testuale e feedback tutor devono comparire')
    await ipc.invoke('capture-video-import', 'repeat-result-light')
    await click('Trascrizione')
    check(
      document.querySelector('pre')?.textContent?.includes('Mi correggo'),
      'Trascrizione grezza consultabile'
    )
    await click('Appunti usati')
    check(
      document
        .querySelector('.markdown-body')
        ?.textContent?.includes('Questi sono gli appunti usati'),
      'Snapshot degli appunti consultabile'
    )
    await click('Valutazione')
    document.documentElement.dataset.theme = 'dark'
    await ipc.invoke('capture-video-import', 'repeat-result-dark')
    document.documentElement.dataset.theme = 'light'
    for (const width of [768, 390]) {
      await ipc.invoke('feature-test-window-size', { width, height: 820 })
      await wait()
      const panel = document
        .querySelector('.repetition-window')!
        .getBoundingClientRect()
      check(
        panel.left >= -1 && panel.right <= innerWidth + 1,
        `Pannello entro la finestra a ${width}px`
      )
      await ipc.invoke('capture-video-import', `repeat-result-${width}`)
    }
    await act(async () => root.render(null))
    await wait()
    await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 })
    await act(async () => root.render(<RepetitionWindow onClose={() => {}} />))
    await wait()
    check(starts === 1, 'Aprire l’archivio deve consultare senza avviare API')
    check(selections === 1, 'Riferimento memorizzato')
    await act(async () => root.render(null))
    await wait()
    session.status = 'paused'
    await act(async () => root.render(<RepetitionWindow onClose={() => {}} />))
    await wait()
    await click('Riprendi sessione')
    check(
      resumes === 1,
      'La ripresa usa la copia locale senza selezionare di nuovo il registratore'
    )
    await act(async () => root.render(null))
    await wait()
    await renderEntry()
    const studyButton = [
      ...document.querySelectorAll<HTMLButtonElement>('button')
    ].find(
      (button) => button.querySelector('strong')?.textContent === 'STUDIO'
    )!
    await act(async () => studyButton.click())
    await wait()
    check(
      scans > 0 &&
        document.body.textContent?.includes('Acquisizione Registratore USB'),
      'STUDIO mantiene il flusso USB esistente'
    )
    check(starts === 1, 'STUDIO non deve avviare RIPETERE')
  } finally {
    await act(async () => root.render(null))
    Object.assign(api, original)
    style.remove()
    document.documentElement.dataset.theme = 'light'
    await ipc.invoke('feature-test-window-size', { width: 1240, height: 820 })
  }
}
