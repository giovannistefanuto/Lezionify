import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { VideoImportModal } from '../../src/components/VideoImportModal'

declare const require: any

export async function runVideoImportScenarios(root: Root, api: any) {
  function check(value: unknown, message: string) {
    if (!value) throw new Error(message)
  }
  function pending() {
    let resolve!: (value: any) => void
    let reject!: (error: Error) => void
    const promise = new Promise<any>((yes, no) => {
      resolve = yes
      reject = no
    })
    return { resolve, reject, promise }
  }
  const button = (text: string) =>
    Array.from(document.querySelectorAll('button')).find((item) =>
      item.textContent?.includes(text)
    )!
  const selection = {
    sessionId: 'video-session',
    files: [
      { id: 'a', name: 'Argomento 1.mp4', byteSize: 30_000_000 },
      { id: 'b', name: 'Argomento 2.mkv', byteSize: 20_000_000 },
      { id: 'c', name: 'Argomento 3.webm', byteSize: 10_000_000 }
    ]
  }
  const course = {
    code: 'GT',
    name: 'Game Theory',
    cfu: 6,
    lectureHours: 42,
    individualStudyHours: 108,
    totalHours: 150,
    startDate: '2026-09-01',
    endDate: '2027-01-31',
    schedule: []
  }
  let progress: (value: any) => void = () => {}
  let subscriptionCount = 0
  api.onVideoImportProgress = (callback: any) => {
    progress = callback
    subscriptionCount++
    return () => {
      subscriptionCount--
    }
  }
  let conversion = pending()
  let requestedOrder: string[] = []
  let conversionCount = 0
  api.convertVideos = (_id: string, ids: string[]) => {
    requestedOrder = ids
    conversionCount++
    return conversion.promise
  }
  const saved: any[] = []
  const imported: any[] = []
  const canceled: string[] = []
  let closed = 0
  let saveFails = true
  api.saveVideoImport = async (id: string, destination: any) => {
    saved.push({ id, destination })
    if (saveFails) throw new Error('Disco temporaneamente non disponibile')
    return { id: 'new-lecture', ...destination }
  }
  api.cancelVideoImport = async (id: string) => {
    canceled.push(id)
  }
  const render = async () => {
    await act(async () =>
      root.render(
        <React.StrictMode>
          <VideoImportModal
            selection={selection}
            courses={[course]}
            onClose={() => {
              closed++
            }}
            onImported={(lecture) => imported.push(lecture)}
          />
        </React.StrictMode>
      )
    )
  }
  // Visual QA runs only when explicitly requested by the local test launcher.
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke(
    'video-import-styles'
  )
  document.head.append(style)
  try {
    await render()
    check(
      subscriptionCount === 1,
      'StrictMode duplicated video progress subscriptions'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'order'
    )
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Sposta su Argomento 3.webm"]'
        )!
        .click()
    )
    await act(async () => {
      const rows = document.querySelectorAll('.video-import-files li')
      const transfer = new DataTransfer()
      rows[0].dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer })
      )
      rows[2].dispatchEvent(
        new DragEvent('drop', { bubbles: true, dataTransfer: transfer })
      )
    })
    await act(async () => button('Converti').click())
    check(
      requestedOrder.join() === 'c,b,a',
      'Drag/drop and arrow order was not sent to the converter'
    )
    await act(async () =>
      progress({ sessionId: 'other', percent: 99, message: 'wrong session' })
    )
    check(
      !document.body.textContent?.includes('wrong session'),
      'Progress from another import leaked into the dialog'
    )
    await act(async () =>
      progress({
        sessionId: selection.sessionId,
        percent: 50,
        message: 'Estrazione audio 2 di 3'
      })
    )
    check(
      document.querySelector('progress')?.value === 50,
      'Conversion progress not displayed'
    )
    await act(async () =>
      conversion.resolve({ durationSeconds: 4520, byteSize: 72_000_000 })
    )
    await act(async () => button('Game Theory').click())
    check(
      document.querySelector<HTMLSelectElement>('select')?.value === 'GT',
      'Shortcut did not select Game Theory'
    )
    for (const [selectedDate, expected] of [
      ['2026-10-01', '2026-09-28'],
      ['2026-10-02', '2026-10-05'],
      ['2026-10-03', '2026-10-05'],
      ['2026-10-04', '2026-10-05']
    ]) {
      await act(async () => {
        const input =
          document.querySelector<HTMLInputElement>('input[type="date"]')!
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )!.set!.call(input, selectedDate)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
      await act(async () => button('Game Theory').click())
      check(
        document.querySelector<HTMLInputElement>('input[type="date"]')!
          .value === expected,
        `Shortcut chose the wrong Monday for ${selectedDate}`
      )
    }
    const times =
      document.querySelectorAll<HTMLInputElement>('input[type="time"]')
    check(
      times[0].value === '16:30' && times[1].value === '18:00',
      'Shortcut did not set 16:30–18:00'
    )
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'destination-light'
    )
    document.documentElement.setAttribute('data-theme', 'dark')
    await require('electron').ipcRenderer.invoke(
      'capture-video-import',
      'destination-dark'
    )
    document.documentElement.removeAttribute('data-theme')
    await act(async () => button('Salva nell’archivio').click())
    check(
      document.querySelector('[role="alert"]')?.textContent?.includes('Disco'),
      'Save error not shown'
    )
    check(
      closed === 0 && imported.length === 0,
      'Failed save closed or claimed an imported lecture'
    )
    saveFails = false
    await act(async () => button('Salva nell’archivio').click())
    check(
      saved.length === 2 && conversionCount === 1,
      'Retry reconverted the video instead of saving the ready audio'
    )
    check(
      saved[1].destination.courseCode === 'GT' &&
        saved[1].destination.startTime === '16:30' &&
        saved[1].destination.date === '2026-10-05',
      'Wrong destination sent to archive'
    )
    check(
      closed === 1 && imported.length === 1,
      'Successful import did not refresh and close'
    )
    await act(async () => root.render(null))
    check(
      subscriptionCount === 0,
      'Video progress subscription leaked after unmount'
    )

    // Conversion failure retains the order, so the user can retry.
    conversion = pending()
    await render()
    await act(async () => button('Converti').click())
    await act(async () => conversion.reject(new Error('Audio assente')))
    check(
      Boolean(document.querySelector('.video-import-files')) &&
        document.querySelector('[role="alert"]')?.textContent ===
          'Audio assente',
      'Conversion failure lost the ordered selection'
    )
    await act(async () => button('Annulla').click())
    check(
      canceled[0] === selection.sessionId,
      'Cancel did not release the native session'
    )
    await act(async () => root.render(null))

    // A late conversion result must not reopen a canceled dialog.
    conversion = pending()
    await render()
    await act(async () => button('Converti').click())
    await act(async () => button('Annulla').click())
    await act(async () =>
      conversion.resolve({ durationSeconds: 10, byteSize: 100 })
    )
    check(
      !document.querySelector('select'),
      'Late conversion result reopened the destination after cancel'
    )
    await act(async () => root.render(null))
  } finally {
    style.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}
