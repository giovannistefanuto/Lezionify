import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { ExamReminders } from '../../src/components/ExamReminders'
import { CourseManagementModal } from '../../src/components/CourseManagementModal'
import { FocusReminders } from '../../src/components/FocusReminders'
import { studySurfaceExclusions } from '../../src/utils/studyActivity'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { useQna } from '../../src/hooks/useQna'

declare const require: any
export async function runBatchRequestsScenarios(root: Root, api: any) {
  const saved = { ...api }, originalFocus = document.hasFocus
  const style = document.createElement('style'); style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles'); document.head.append(style)
  const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message) }
  const render = (node: React.ReactNode) => act(async () => root.render(node))
  const input = async (selector: string, value: string) => act(async () => {
    const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
    Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  let notices: any[] = [{ id: 'test', courseCode: 'TEST', examDate: '2026-12-20', title: 'Esame di TEST: 33 giorni', message: 'Mancano 33 giorni all’esame.', day: '2026-11-17', daysLeft: 33 }]
  let failDismiss = true, storedCourse: any, state: any, request: any[] | undefined
  const course = { code: 'TEST', publishToGithub: false, cfu: 6, lectureHours: 42, individualStudyHours: 108, totalHours: 150, startDate: '2026-09-01', endDate: '2026-12-31', examDate: '2026-12-20', schedule: [{ id: 'slot', dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] }
  function QnaHarness() {
    state = useQna('batch-lecture')
    return <QnaSidebar threads={state.threads} activeThreadId={state.activeThreadId} setActiveThreadId={state.setActiveThreadId} isGenerating={state.isGeneratingQna} error={state.qnaError} onSendMessage={state.sendMessage} onDeleteThread={state.deleteThread} onClose={() => {}} />
  }
  try {
    document.hasFocus = () => true
    api.getExamReminders = async () => structuredClone(notices)
    api.dismissExamReminder = async () => { if (failDismiss) throw new Error('synthetic'); notices = [] }
    await render(<ExamReminders onOpenCourses={() => {}} />)
    check(document.querySelector('[aria-label="Promemoria esame"]'), 'Exam notice missing from app')
    const dismiss = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Ho letto')!
    await act(async () => dismiss().click())
    check(document.body.textContent?.includes('Salvataggio non riuscito'), 'Failed dismissal must preserve the notice')
    failDismiss = false; await act(async () => dismiss().click())
    check(!document.querySelector('[aria-label="Promemoria esame"]'), 'Dismissed exam notice remains visible')
    api.getCourses = async () => [storedCourse ?? course]
    api.saveCourse = async (value: any) => { storedCourse = structuredClone(value) }
    await render(<CourseManagementModal isOpen onClose={() => {}} lectures={[]} onRefreshLibrary={async () => {}} onNotice={() => {}} />)
    await act(async () => document.querySelector<HTMLButtonElement>('[title="Modifica anagrafica e orario"]')!.click())
    const enable = document.querySelector<HTMLInputElement>('.exam-reminder-settings input[type="checkbox"]')!
    check(enable && !enable.checked, 'Legacy course reminders must start disabled')
    await act(async () => enable.click())
    await input('[aria-label="Frequenza promemoria esame"]', '')
    await act(async () => enable.click())
    check(document.querySelector<HTMLInputElement>('[aria-label="Frequenza promemoria esame"]')!.value === '1', 'Disabling an incomplete cadence must not trap course saving behind a disabled invalid field')
    await act(async () => enable.click())
    await input('[aria-label="Frequenza promemoria esame"]', '2')
    document.querySelector('.exam-reminder-settings')!.scrollIntoView({ block: 'center' })
    await require('electron').ipcRenderer.invoke('capture-video-import', 'oct28-batch-exam-settings')
    await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    check(storedCourse?.examReminder?.every === 2 && storedCourse.examReminder.unit === 'weeks' && storedCourse.examReminder.enabled, 'Exam cadence did not persist with the real course form')
    await render(null)
    api.getReminders = async () => []; api.saveReminders = async () => {}
    await render(<FocusReminders />)
    check(!studySurfaceExclusions().includes('modal'), 'Running timers must not pause study by themselves')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Timer e sveglie"]')!.click())
    check(studySurfaceExclusions().includes('modal'), 'Open reminder configuration must pause study')
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Timer e sveglie"]')!.click())
    check(!studySurfaceExclusions().includes('modal'), 'Closing reminder configuration must resume study')
    await render(null)
    api.loadQnaThreads = async () => [{ id: 'deep-test', quote: 'Fonte sintetica', messages: [], createdAt: '', updatedAt: '' }]
    api.saveQnaThreads = async () => {}
    api.onQnaChunk = () => () => {}; api.onQnaStatus = () => () => {}
    api.generateQnaResponse = async (...args: any[]) => { request = args; return { success: true, text: 'Risposta sintetica' } }
    await render(<QnaHarness />)
    await act(async () => state.setActiveThreadId('deep-test'))
    const deep = [...document.querySelectorAll<HTMLLabelElement>('label')].find(label => label.textContent === 'Pensa di più')!.querySelector<HTMLInputElement>('input')!
    check(!deep.checked, 'Deep reasoning must start off')
    await act(async () => deep.click())
    await input('[aria-label="Domanda sulla lezione"]', 'Spiega il passaggio')
    await act(async () => document.querySelector<HTMLButtonElement>('.qna-send-btn')!.click())
    check(request?.[6] === true && request?.[4] === 'brief' && request?.[5] === false, 'Deep option lost in hook request or changed length/web policy')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'oct28-batch-qna-deep')
  } finally {
    await render(null)
    document.hasFocus = originalFocus
    Object.assign(api, saved)
    style.remove()
  }
}
