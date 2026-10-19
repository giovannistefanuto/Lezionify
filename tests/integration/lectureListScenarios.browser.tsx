import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import type { Lecture } from '../../shared/archive'
import { LectureList } from '../../src/components/LectureList'

declare const require: any

export async function runLectureListScenarios(root: Root) {
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message)
  }
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.appendChild(style)
  const base: Lecture = {
    id: 'home-1', title: 'Introduzione al Corso: Organizzazione, Risorse e Panoramica sul Reinforcement Learning con tutti gli argomenti del semestre',
    courseCode: 'RL', recordedAt: '2026-09-28T08:36:00',
    sourceAudioFileName: 'private-source.mp3', sourceTranscriptFileName: null,
    audioFileName: 'audio.mp3', transcriptFileName: null,
    markdownFileName: 'notes.md', markdownEnFileName: 'notes.en.md',
    byteSize: 100_000_000, checksum: 'synthetic', importedAt: '2026-10-05',
    status: 'transcript-available', studyStatus: 'completata'
  }
  let lectures: Lecture[] = [base,
    { ...base, id: 'home-2', title: 'Introduzione alla Robotica', courseCode: 'IR', markdownEnFileName: null, isLaboratory: true, studyStatus: 'in-corso' },
    { ...base, id: 'home-3', title: 'Teoria dei Giochi', courseCode: 'GT', markdownEnFileName: null, studyStatus: 'da-studiare' }]
  let opened = 0
  let selectedCourse = 'tutti'
  let studyFilter = 'tutti'
  let renameEnabled = false
  let notice: string | null = null
  let dismissedNotices = 0
  const updates: Array<[string, boolean]> = []
  const render = async () => {
    await act(async () => root.render(<div style={{ width: 'calc(100vw - 260px)' }}><LectureList
      selectedCourse={selectedCourse} isImporting={false} pipelineStatus={null}
      onStartPipeline={() => {}} onResumePipeline={() => {}} onStopPipeline={() => {}}
      onManualSync={() => {}} onImportFiles={() => {}} onImportFolder={() => {}}
      notice={notice} onDismissNotice={() => { dismissedNotices++; notice = null; void render() }} visibleLectures={studyFilter === 'tutti' ? lectures : lectures.filter(lecture => lecture.studyStatus === studyFilter)}
      selectedLectureId={null} onSelectLecture={() => { opened++ }}
      onSetLaboratory={async (id, value) => {
        updates.push([id, value])
        lectures = lectures.map(lecture => lecture.id === id ? { ...lecture, isLaboratory: value } : lecture)
        await render()
      }}
      onRenameLecture={renameEnabled ? async (id, titles) => {
        const updated = await window.archive.renameLectureTitles(id, titles)
        lectures = lectures.map(item => item.id === id ? updated : item)
      } : undefined}
      isLoading={false} selectedStudyStatus={studyFilter} formatDate={value => value ?? ''}
      formatFileSize={() => '100 MB'} hasAnyLectures hasConfiguredKey onOpenSettings={() => {}}
    /></div>))
  }
  await render()
  const rows = () => Array.from(document.querySelectorAll<HTMLElement>('.lecture-row'))
  const title = document.querySelector<HTMLElement>('.lecture-row-title')!
  check(getComputedStyle(title).whiteSpace === 'nowrap' && getComputedStyle(title).textOverflow === 'ellipsis' && title.scrollWidth > title.clientWidth, 'Long titles must truncate with ellipsis')
  check(title.title === base.title, 'Full title tooltip missing')
  check(!document.querySelector('.lecture-row-date') && !document.body.textContent?.includes('private-source.mp3'), 'Filename or duplicate date still visible')
  check(document.querySelector('.lecture-row-recorded-at')?.textContent === '28 settembre 2026 · 08:36', 'Readable date and time missing')
  const badges = Array.from(document.querySelectorAll<HTMLElement>('.lecture-row .pipeline-badge'))
  check(badges[0].textContent === 'IT/ENG' && badges[1].textContent === 'IT', 'Language labels incorrect')
  const center = (element: HTMLElement) => { const rect = element.getBoundingClientRect(); return rect.left + rect.width / 2 }
  check(Math.abs(center(badges[0]) - center(badges[1])) < 1, 'Language badges not centered in same column')
  check(getComputedStyle(document.querySelector('.lecture-row-size')!).fontWeight === '400', 'Megabytes should not be bold')
  const icons = Array.from(document.querySelectorAll<HTMLElement>('.lecture-row-icon'))
  check(icons.every(icon => icon.classList.contains('has-course-color')) && new Set(icons.map(icon => getComputedStyle(icon).borderColor)).size === 3, 'Courses must have distinct colored icon frames')
  check(document.querySelectorAll('.lecture-laboratory-label').length === 1, 'Laboratory text missing or applied to ordinary lessons')
  await act(async () => rows()[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: innerWidth - 1, clientY: innerHeight - 1 })))
  const menu = document.querySelector<HTMLElement>('.lecture-context-menu')!
  check(opened === 0 && menu.getBoundingClientRect().right <= innerWidth, 'Context menu opened lecture or overflowed viewport')
  const option = document.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!
  check(option.getAttribute('aria-checked') === 'false' && document.activeElement === option, 'Menu checked state or focus incorrect')
  await act(async () => option.click())
  check(updates[0]?.[0] === base.id && updates[0]?.[1] === true && rows()[0].classList.contains('is-laboratory'), 'Laboratory choice did not update row')
  const longTitleLabel = rows()[0].querySelector<HTMLElement>('.lecture-laboratory-label')!
  check(longTitleLabel.textContent === ' - Laboratorio' && longTitleLabel.getBoundingClientRect().right <= rows()[0].querySelector('.row-right')!.getBoundingClientRect().left, 'Laboratory label should remain visible beside a truncated long title')
  await act(async () => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'F10', shiftKey: true })))
  check(document.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked') === 'true', 'Keyboard menu should show checked laboratory')
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })))
  check(!document.querySelector('.lecture-context-menu') && document.activeElement === rows()[0], 'Escape should close menu and restore row focus')
  await act(async () => rows()[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })))
  await act(async () => document.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!.click())
  check(!rows()[0].classList.contains('is-laboratory') && updates[1]?.[1] === false, 'Laboratory choice cannot be removed')
  await act(async () => rows()[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })))
  await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
  check(!document.querySelector('.lecture-context-menu'), 'Outside click must close context menu')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'home-light')
  document.documentElement.setAttribute('data-theme', 'dark')
  check(getComputedStyle(rows()[1]).backgroundColor === getComputedStyle(rows()[0]).backgroundColor, 'Blue laboratory row highlight should be removed')
  check(Number(getComputedStyle(document.querySelector('.lecture-laboratory-label')!).fontWeight) > Number(getComputedStyle(title).fontWeight), 'Laboratory text should be more prominent than title')
  await require('electron').ipcRenderer.invoke('capture-video-import', 'home-dark')
  document.documentElement.removeAttribute('data-theme')
  const completeNotice = '⚠️ Archivio già completo: non ci sono elaborazioni da avviare.'
  notice = completeNotice
  await render()
  const toast = document.querySelector<HTMLElement>('.archive-complete-toast')!
  check(toast?.getAttribute('role') === 'status' && toast.parentElement === document.body, 'Archive notice should be a top-level accessible toast')
  const toastStyle = getComputedStyle(toast)
  check(toastStyle.position === 'fixed' && toastStyle.animationDelay === '1s' && toastStyle.animationDuration === '1s', 'Toast should remain visible for one second and fade for one second')
  notice = '❌ Errore sintetico da mantenere visibile'
  await render()
  await act(async () => new Promise(resolve => setTimeout(resolve, 2100)))
  check(dismissedNotices === 0 && document.querySelector('.notice-error'), 'Previous toast timeout dismissed a newer error')
  notice = completeNotice
  await render()
  await act(async () => new Promise(resolve => setTimeout(resolve, 500)))
  await render()
  await act(async () => new Promise(resolve => setTimeout(resolve, 1600)))
  check(dismissedNotices === 1 && !document.querySelector('.archive-complete-toast'), 'Toast should dismiss after two seconds without resetting on rerender')
  notice = 'Eliminati 2 file dal registratore USB per liberare spazio. Copie locali al sicuro in Lezionify!'
  await render()
  const usbToast = document.querySelector<HTMLElement>('.archive-complete-toast')!
  check(usbToast.classList.contains('notice-success') && getComputedStyle(usbToast).animationDelay === '1s' && getComputedStyle(usbToast).animationDuration === '1s', 'USB cleanup should use the temporary animated success toast')
  await act(async () => new Promise(resolve => setTimeout(resolve, 2100)))
  check(dismissedNotices === 2 && !document.querySelector('.archive-complete-toast'), 'USB cleanup toast should dismiss after two seconds')
  const api = window.archive
  const originalExport = api.exportNotesPdf
  const exports: unknown[] = []
  api.exportNotesPdf = async request => { exports.push(request); return { canceled: true, missingCount: 0 } }
  try {
    selectedCourse = 'IR'
    await render()
    const button = () => document.querySelector<HTMLButtonElement>('.pdf-export-action button')!
    check(button().textContent === 'Esporta', 'Course toolbar must expose a unified export button')
    await act(async () => button().click())
    check(exports.length === 0 && document.querySelector('[aria-label="Esporta PDF"]'), 'Export should open modal without exporting')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chiudi esportazione"]')!.click())
    check(!document.querySelector('[aria-label="Esporta PDF"]'), 'Export modal should close')
  } finally { api.exportNotesPdf = originalExport }
  const originalRead = api.readMarkdown
  const originalReadEn = api.readMarkdownEn
  const originalRename = api.renameLectureTitles
  const renames: Array<{ id: string; titles: unknown }> = []
  let failRename = false
  api.readMarkdown = async id => `# Titolo italiano ${id}\n\nContenuto.`
  api.readMarkdownEn = async id => `# English title ${id}\n\nContent.`
  api.renameLectureTitles = async (id, titles) => {
    renames.push({ id, titles })
    if (failRename) { failRename = false; throw new Error('Synthetic write failure') }
    const current = lectures.find(item => item.id === id)!
    return { ...current, ...(titles.it ? { title: titles.it } : {}), titleOverrides: { ...current.titleOverrides, ...titles } }
  }
  try {
    selectedCourse = 'tutti'; renameEnabled = true
    const waitForTitles = async () => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (document.querySelector<HTMLInputElement>('[name="title-it"]')?.disabled === false) return
        await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
      }
      throw new Error(`Title editor did not finish loading in filter ${studyFilter}`)
    }
    for (const filter of ['tutti', 'da-studiare', 'in-corso', 'completata']) {
      studyFilter = filter
      await render()
      const beforeOpen = opened
      const row = rows()[0]
      await act(async () => {
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
        row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }))
      })
      await act(async () => new Promise(resolve => setTimeout(resolve, 550)))
      await waitForTitles()
      const titleInput = document.querySelector<HTMLInputElement>('[name="title-it"]')!
      const enInput = document.querySelector<HTMLInputElement>('[name="title-en"]')!
      check(opened === beforeOpen && document.querySelector<HTMLDialogElement>('.lecture-title-dialog')?.open, 'Double click must open title editing without opening the lecture in every filter')
      check(document.activeElement === titleInput && enInput.value.startsWith('English title'), `Editor must focus IT and load English: filter=${filter}, active=${document.activeElement?.getAttribute('name')}, disabled=${titleInput.disabled}, en=${enInput.value}`)
      if (filter === 'tutti') {
        await require('electron').ipcRenderer.invoke('capture-video-import', 'lecture-title-light')
        document.documentElement.setAttribute('data-theme', 'dark')
        await require('electron').ipcRenderer.invoke('capture-video-import', 'lecture-title-dark')
        document.documentElement.removeAttribute('data-theme')
        await act(async () => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(titleInput, 'Titolo italiano personalizzato')
          titleInput.dispatchEvent(new Event('input', { bubbles: true }))
        })
        failRename = true
        const submit = () => document.querySelector<HTMLButtonElement>('.lecture-title-dialog [type="submit"]')!
        await act(async () => submit().click())
        check(document.querySelector('[role="alert"]') && titleInput.value === 'Titolo italiano personalizzato', 'Save failure must retain the draft and permit retry')
        await act(async () => submit().click())
        await render()
        check(!document.querySelector('.lecture-title-dialog') && rows()[0].textContent?.includes('Titolo italiano personalizzato'), 'Successful rename must update the row and close the editor')
        check(JSON.stringify(renames[1].titles) === JSON.stringify({ it: 'Titolo italiano personalizzato' }), 'Changing IT must not submit an unchanged English title')
      } else {
        await act(async () => document.querySelector<HTMLDialogElement>('.lecture-title-dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })))
        check(!document.querySelector('.lecture-title-dialog') && document.activeElement === row, 'Cancel must preserve titles and restore focus')
      }
    }
    studyFilter = 'tutti'; await render()
    await act(async () => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'F2' })))
    await waitForTitles()
    check(document.querySelector<HTMLInputElement>('[name="title-it"]')?.value === 'Titolo italiano personalizzato', 'F2 and reopening must retain the saved manual title')
    const englishInput = document.querySelector<HTMLInputElement>('[name="title-en"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(englishInput, 'Custom English title')
      englishInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => document.querySelector<HTMLButtonElement>('.lecture-title-dialog [type="submit"]')!.click())
    await render()
    check(JSON.stringify(renames.at(-1)!.titles) === JSON.stringify({ en: 'Custom English title' }) && rows()[0].textContent?.includes('Titolo italiano personalizzato'), 'English edit must leave the Italian row title intact')
    await act(async () => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'F2' })))
    await waitForTitles()
    check(document.querySelector<HTMLInputElement>('[name="title-en"]')?.value === 'Custom English title', 'English manual title must persist on reopen')
    await act(async () => document.querySelector<HTMLDialogElement>('.lecture-title-dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })))
    const beforeSingleClick = opened
    await act(async () => rows()[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })))
    await act(async () => new Promise(resolve => setTimeout(resolve, 550)))
    check(opened === beforeSingleClick + 1, 'A single click must still open the lecture')
  } finally { api.readMarkdown = originalRead; api.readMarkdownEn = originalReadEn; api.renameLectureTitles = originalRename }
  await act(async () => root.render(null))
  style.remove()
}
