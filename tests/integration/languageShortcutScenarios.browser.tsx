import React, { act, useState } from 'react'
import type { Root } from 'react-dom/client'
import { LectureDrawer } from '../../src/components/LectureDrawer'
import { syntheticPdf } from './focusPdfScenarios.browser'
import App from '../../src/App'

declare const require: any

export async function runLanguageShortcutScenarios(root: Root) {
  const api = window.archive as any
  const keys = ['getReminders', 'getFocusPdf', 'releaseFocusPdf', 'scanAndSyncLibrary', 'listLectures', 'getArchivedCourseCodes', 'getCourseStats', 'getSettings', 'getScratchpad', 'getArchivePipelineStatus', 'onArchivePipelineProgress', 'getLectureWordCounts', 'readMarkdown', 'readMarkdownEn', 'saveStudySession', 'languageShortcutDiagnosticsEnabled', 'logClientMessage']
  const originals = Object.fromEntries(keys.map(key => [key, api[key]]))
  const traces: any[] = []
  api.languageShortcutDiagnosticsEnabled = false
  api.logClientMessage = async (...entry: any[]) => { traces.push(entry) }
  const pdfUrl = URL.createObjectURL(new Blob([syntheticPdf(1)], { type: 'application/pdf' }))
  api.getReminders = async () => []
  api.getFocusPdf = async () => ({ id: 'native-shortcut-pdf', name: 'Synthetic.pdf', url: pdfUrl })
  api.releaseFocusPdf = async () => {}
  const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  const lecture = { id: 'native-language', courseCode: 'TEST', studyStatus: 'in-corso', markdownEnFileName: 'en.md', sourceAudioFileName: 'synthetic.mp3' }
  const noop = () => {}
  let language = 'it'
  const props: any = {
    selectedLecture: lecture, allLectures: [lecture], onClose: noop,
    activeTab: 'markdown', setActiveTab: noop, markdownText: '## Capitolo\n\nTesto italiano sintetico.',
    markdownEnText: '## Chapter\n\nSynthetic English text.', transcriptText: '', studySet: null,
    isGeneratingStudySet: false, onGenerateStudySet: noop, isLoadingContent: false, isGenerating: false,
    isTranscribing: false, setIsEditingMetadata: noop, setEditCourseCode: noop, setEditRecordedAt: noop,
    setShowDeleteConfirm: noop, existingCourses: [], settingsModel: 'gemini-3.6-flash',
    onStudyStatusChange: noop, onGenerateLectureNotes: noop, onPrintNotes: noop, onCopyMarkdown: noop,
    onCopyTranscript: noop, onAttachTranscript: noop, onTranscribeAudio: noop, onPasteFromClipboard: noop,
    onSaveMetadata: noop, onDeleteLecture: noop, onOpenSettings: noop, formatDate: () => '', formatFileSize: () => '',
    studyStatusLabels: Object.fromEntries(['da-studiare', 'in-corso', 'completata'].map(status => [status, { label: status, icon: '', className: '' }]))
  }
  function Fixture() {
    const [selected, setSelected] = useState<'it' | 'en'>('it')
    language = selected
    return <LectureDrawer {...props} activeLanguage={selected} onToggleLanguage={setSelected} />
  }
  const nativeShortcut = async () => act(async () => { await require('electron').ipcRenderer.invoke('language-shortcut-key') })
  const style = document.createElement('style')
  style.textContent = await require('electron').ipcRenderer.invoke('video-import-styles')
  document.head.append(style)
  try {
    await act(async () => root.render(<Fixture />))
    for (const focus of [false, true]) {
      if (focus) await act(async () => { await require('electron').ipcRenderer.invoke('language-shortcut-focus') })
      check(Boolean(document.querySelector('.focus-mode-overlay')) === focus, 'Fixture must enter the selected reading view')
      check(Boolean(document.fullscreenElement) === focus, 'Fixture must exercise real HTML fullscreen')
      const view = document.querySelector<HTMLElement>(focus ? '.focus-mode-content' : '.markdown-view-container')!
      view.tabIndex = 0; view.focus()
      const before = language
      const range = document.createRange()
      range.selectNodeContents(view)
      window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range)
      await nativeShortcut()
      check(language !== before, `Native Ctrl+L failed from reading text, Focus=${focus}, active=${document.activeElement?.tagName}`)
      check(view.textContent?.includes(language === 'en' ? 'Synthetic English' : 'italiano sintetico'), 'Native shortcut must change rendered notes')
      const toggle = document.querySelector<HTMLButtonElement>('.lang-toggle-pill')!
      await act(async () => toggle.click())
      check(language === before, `Language button must match shortcut in Focus=${focus}`)
      toggle.focus()
      await nativeShortcut()
      check(language !== before, `Native Ctrl+L failed from toolbar, Focus=${focus}`)
      if (focus) {
        for (let attempt = 0; attempt < 50 && !document.querySelector('.focus-pdf-page-count'); attempt++) {
          await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
        }
        check(document.querySelector('.focus-pdf-page-count'), 'Native test must load a real synthetic PDF')
        document.querySelector<HTMLElement>('.focus-pdf-scroll')!.focus()
        const pdfLanguage = language
        await nativeShortcut()
        check(language !== pdfLanguage, 'Native Ctrl+L must switch notes while focus is on PDF')
        const input = document.createElement('textarea')
        view.append(input); input.focus(); input.value = 'Synthetic draft'
        const editingLanguage = language
        await nativeShortcut()
        check(language === editingLanguage && input.value === 'Synthetic draft', 'Shortcut must preserve an active text draft')
        input.remove(); view.focus()
        await nativeShortcut()
        check(language !== editingLanguage, 'Shortcut must resume after focusing lecture text again')
      }
    }
    await act(async () => root.render(null))
    check(traces.length === 0, 'Shortcut diagnostics must remain off by default')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) })
    const fullLecture = { ...lecture, recordedAt: '2026-10-16T08:00:00.000Z', importedAt: '2026-10-16T08:00:00.000Z',
      status: 'notes-ready', title: 'Synthetic shortcut lesson', markdownFileName: 'it.md', transcriptFileName: null, byteSize: 1 }
    Object.assign(api, {
      languageShortcutDiagnosticsEnabled: true,
      scanAndSyncLibrary: async () => [fullLecture], listLectures: async () => [fullLecture],
      getArchivedCourseCodes: async () => [], getCourseStats: async () => [],
      getSettings: async () => ({ apiKey: '', apiKeys: [], activeKeyIndex: 0, autoRotateOnQuota: true, model: 'gemini-3.6-flash', courses: {} }),
      getScratchpad: async () => ({ todos: [], notes: '', updatedAt: '' }),
      getArchivePipelineStatus: async () => ({ runId: null, status: 'idle', tasks: [] }),
      onArchivePipelineProgress: () => () => {},
      getLectureWordCounts: async () => ({ [lecture.id]: 8 }),
      readMarkdown: async () => props.markdownText, readMarkdownEn: async () => props.markdownEnText,
      saveStudySession: async () => {}
    })
    const until = async (condition: () => boolean, message: string) => {
      for (let attempt = 0; attempt < 60 && !condition(); attempt++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)) })
      check(condition(), message)
    }
    await act(async () => root.render(<App />))
    await until(() => Boolean(document.querySelector('.lecture-row')), 'Full App must load synthetic library')
    await act(async () => document.querySelector<HTMLElement>('.lecture-row')!.click())
    await until(() => Boolean(document.querySelector('[title="Modalità studio immersiva"]')), 'Full App must load lecture notes')
    await act(async () => { await require('electron').ipcRenderer.invoke('language-shortcut-focus') })
    await until(() => Boolean(document.fullscreenElement && document.querySelector('.focus-mode-content')), 'Full App must enter real Focus')
    const fullView = document.querySelector<HTMLElement>('.focus-mode-content')!
    fullView.focus()
    await nativeShortcut()
    check(fullView.textContent?.includes('Synthetic English'), 'Native Ctrl+L must switch notes with the entire App mounted')
    await act(async () => document.querySelector<HTMLButtonElement>('.lang-toggle-pill')!.click())
    check(fullView.textContent?.includes('italiano sintetico'), 'Full App language button must switch back to Italian')
    await nativeShortcut()
    check(fullView.textContent?.includes('Synthetic English'), 'Native Ctrl+L must work after using the full App language button')
    check(traces.some(entry => entry[2].includes('renderer-capture')), 'Opt-in trace must observe native key arrival')
    check(traces.some(entry => entry[3]?.includes('toggle-requested')), 'Opt-in trace must record toggle outcome')
    check(traces.some(entry => entry[2].includes('language-state') && JSON.parse(entry[3]).language === 'en'), 'Opt-in trace must observe the committed language')
    check(!JSON.stringify(traces).includes('Synthetic') && !JSON.stringify(traces).includes(lecture.id), 'Trace must not include lesson text or identifiers')
    api.languageShortcutDiagnosticsEnabled = false
    const traceCount = traces.length
    await nativeShortcut()
    check(traces.length === traceCount, 'Disabled tracing must not emit events')
  } finally {
    await act(async () => root.render(null)); style.remove()
    Object.assign(api, originals); URL.revokeObjectURL(pdfUrl)
  }
}
