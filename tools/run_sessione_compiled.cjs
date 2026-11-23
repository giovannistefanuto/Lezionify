const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { tmpdir } = require('node:os')
const { pathToFileURL } = require('node:url')
const { spawnSync } = require('node:child_process')

const directory = mkdtempSync(join(tmpdir(), 'lezionify-sessione-compiled-'))
const profile = join(directory, 'profile')
const repository = resolve(__dirname, '..')
const screenshotDirectory = process.env.LEZIONIFY_SESSIONE_SCREENSHOTS
if (screenshotDirectory) mkdirSync(screenshotDirectory, { recursive: true })

function prepareFixture() {
  const library = join(profile, 'library')
  mkdirSync(join(library, 'markdown'), { recursive: true })
  const lesson = { id: 'sessione-lesson', title: 'Lezione sintetica Sessione', courseCode: 'RL',
    recordedAt: '2026-11-18T10:00:00', sourceAudioFileName: 'studio.wav', sourceTranscriptFileName: null,
    audioFileName: 'studio.wav', missingAudio: true, transcriptFileName: null, markdownFileName: 'sessione-lesson.md',
    markdownEnFileName: 'sessione-lesson_en.md', byteSize: 0, durationSeconds: 3600, checksum: 'fixture',
    importedAt: '2026-11-18T11:00:00Z', status: 'transcript-available', studyStatus: 'in-corso' }
  writeFileSync(join(library, 'library.json'), JSON.stringify({ version: 1, lectures: [lesson] }))
  const source = '# Lezione sintetica Sessione\n\n' + Array.from({ length: 45 }, (_, n) =>
    '## Argomento ' + (n + 1) + '\n\n' + 'Contenuto sintetico per la verifica del punto di lettura. '.repeat(5)).join('\n\n')
  writeFileSync(join(library, 'markdown', 'sessione-lesson.md'), source)
  writeFileSync(join(library, 'markdown', 'sessione-lesson_en.md'), source.replaceAll('Argomento', 'Topic'))
}

async function exercise(mode) {
  const assert = (condition, label) => { if (!condition) throw Error(label) }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const waitFor = async (check, label) => {
    for (let i = 0; i < 80; i++) {
      const result = check()
      if (result) return result
      await delay(45)
    }
    if (label === 'study did not start' || label === 'study did not resume') {
      throw Error(label + ' ' + JSON.stringify({ hidden: document.hidden, focused: document.hasFocus(), fullscreen: Boolean(document.fullscreenElement), modals: [...document.querySelectorAll('.modal-overlay, [aria-modal=true]')].map(element => ({ tag: element.tagName, classes: element.className, hidden: element.hidden, open: element.hasAttribute('open'), visible: Boolean(element.getClientRects().length), parentHidden: Boolean(element.closest('[hidden]')) })), sessione: Boolean(document.querySelector('[data-study-exclusion="sessione"]')), timer: document.querySelector('.focus-timer-subtle')?.getAttribute('title') }))
    }
    throw Error(label)
  }
  const findButton = (text, root = document) => [...root.querySelectorAll('button, summary')]
    .find(element => element.textContent.trim() === text || element.getAttribute('aria-label') === text)
  const keyboard = (key, modifiers = {}) => (document.activeElement || document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }))
  const openSession = async () => {
    const button = await waitFor(() => findButton('Apri Sessione'), 'missing sidebar entry')
    button.focus()
    button.click()
    return waitFor(() => document.querySelector('.session-layout'), 'workspace did not load')
  }
  const api = window.archive
  assert(api?.sessione, 'preload Sessione absent')
  assert((await api.detectUsbRecorder()).detected === false, 'compiled fixture must isolate physical USB recorders')
  const settings = await api.getSettings()
  assert(!settings.apiKey && !settings.apiKeys.length, 'test profile must not contain credentials')
  if (mode === 'run') {
    const date = (offset = 0) => {
      const day = new Date()
      day.setDate(day.getDate() + offset)
      return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-')
    }
    const meta = [['RL', 'Robot Learning', '#8b5cf6'], ['GA', 'Grafica avanzata', '#3b82f6'], ['SO', 'Sistemi operativi', '#f59e0b']]
    for (const [code, name, color] of meta) await api.saveCourse({
      code, name, color, cfu: 6, lectureHours: 42, individualStudyHours: 108, totalHours: 150,
      startDate: date(-60), endDate: date(50), examDate: date(40), schedule: [],
      examReminder: { enabled: true, every: 7, unit: 'days' }, publishToGithub: false
    })
    const courses = meta.map(([code], index) => ({
      code, paths: [{ kind: 'total', id: 'path-' + code, name: 'Totale',
        steps: [{ id: 'step-' + code, label: 'Esame totale', completed: false,
          appointments: [date(6 + index * 4), date(15 + index * 7)].map((day, rank) =>
            ({ id: code + rank, date: day, number: rank + 1 })) }] }]
    }))
    courses[0].paths[0].steps[0].appointments[1].date = date(12)
    courses[1].paths[0].steps[0].appointments[1].date = date(6)
    const draft = { id: 'sessione-sintetica', name: 'Sessione invernale', start: date(-14), end: date(55),
      courses, unavailable: [], plans: [{ id: 'principale', name: 'Principale', choices: courses.map(({ code }) =>
        ({ course: code, pathId: 'path-' + code, appointments: [code + '0'], locks: code === 'SO' ? [code + '0'] : [] })) }] }
    const apply = async action => {
      const archive = await api.sessione.state()
      return api.sessione.apply({ ...action, baseRevision: archive.revision, commandId: crypto.randomUUID() })
    }
    assert((await apply({ type: 'save', draft })).status === 'saved', 'save over compiled IPC failed')
    assert((await apply({ type: 'confirm', sessionId: draft.id, planId: 'principale' })).status === 'saved', 'confirm over compiled IPC failed')
    findButton('Gestisci corsi')?.click()
    const closeCourses = await waitFor(() => document.querySelector('.course-management-modal .close-btn'), 'course editor missing')
    closeCourses.click()
    if (document.querySelector('.dark-theme')) {
      findButton('Passa alla modalità giorno')?.click()
      await waitFor(() => !document.querySelector('.dark-theme'), 'light theme missing')
    }
    await openSession()
    await waitFor(() => document.querySelector('.session-note')?.textContent.includes('Robot Learning'), 'countdown missing course names')
    assert(document.querySelectorAll('.session-note tbody tr').length === 3, 'one countdown for each exam missing')
    assert(getComputedStyle(document.querySelector('.session-note button')).backgroundColor === 'rgba(0, 0, 0, 0)',
      'countdown text covered by a separate opaque button')
    assert(document.querySelectorAll('.session-legend').length === 1, 'missing compact legend')
    assert(document.querySelector('.session-day-past') && document.querySelector('[aria-current=date]'), 'today and past states missing')
    window.__sessioneCheck = { keyboard, waitFor, findButton, date, delay }
    return
  }
  const state = await api.sessione.state()
  assert(state.sessions[0]?.confirmed?.exams.some(exam => exam.id === 'RL1'), 'confirmed external change missing after restart')
  await openSession()
  assert(document.querySelector('[aria-label="Piano visualizzato"]').value === 'principale', 'first plan after restart is not the confirmed plan')
  assert(document.querySelector('.session-note').textContent.includes('Robot Learning'), 'restart lost course label')
}

try {
  prepareFixture()
  const main = join(directory, 'main.cjs')
  writeFileSync(main, `
    const { app, dialog, BrowserWindow, ipcMain } = require('electron')
    const { writeFileSync } = require('node:fs')
    const { join } = require('node:path')
    app.setAppPath(${JSON.stringify(repository)})
    app.setPath('userData', ${JSON.stringify(profile)})
    app.setPath('sessionData', ${JSON.stringify(profile)})
    const offline = { urls: ['http://*/*', 'https://*/*'] }
    const restart = process.argv.includes('--restart')
    const screenshotDirectory = ${JSON.stringify(screenshotDirectory)}
    const trace = message => { if (process.env.LEZIONIFY_SESSIONE_TRACE) console.log('STEP: ' + message) }
    trace('launcher')
    dialog.showErrorBox = () => { console.error('FAIL: avvio app compilata'); app.exit(1) }
    setTimeout(() => { console.error('FAIL: timeout Sessione compilata'); app.exit(1) }, 60000).unref()
    app.once('browser-window-created', (_event, win) => {
      trace('window')
      // The scenario owns its clock and requires actual foreground Focus.
      win.webContents.setBackgroundThrottling(false)
      // This scenario owns a synthetic library and must not consult a physical recorder.
      // USB detection/import has its own integration coverage.
      ipcMain.removeHandler('archive:detect-usb-recorder')
      ipcMain.handle('archive:detect-usb-recorder', () => ({ detected: false, files: [] }))
      win.webContents.session.webRequest.onBeforeRequest(offline, (_info, callback) => callback({ cancel: true }))
      const run = (source, gesture = false) => win.webContents.executeJavaScript(source, gesture)
      const capture = async name => {
        if (!screenshotDirectory) return
        const debuggerApi = win.webContents.debugger
        debuggerApi.attach('1.3')
        try {
          const screenshot = await debuggerApi.sendCommand('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
          if (screenshot?.data) writeFileSync(join(screenshotDirectory, name + '.png'), Buffer.from(screenshot.data, 'base64'))
        } finally {
          if (debuggerApi.isAttached()) debuggerApi.detach()
        }
      }
      win.webContents.once('did-finish-load', async () => {
        try {
          trace('renderer')
          await run('new Promise(resolve => setTimeout(resolve, 500))')
          win.setContentSize(1450, 870)
          await run('(' + ${JSON.stringify(exercise.toString())} + ')(' + JSON.stringify(restart ? 'restart' : 'run') + ')')
          trace('fixture')
          if (!restart) {
            await capture('sessione-chiaro')
            await run(${JSON.stringify(`(async () => {
              const { keyboard, waitFor, findButton } = window.__sessioneCheck
              keyboard('Escape')
              findButton('Passa alla modalità notte')?.click()
              findButton('Apri Sessione').click()
              await waitFor(() => document.querySelector('.dark-theme .session-layout'), 'dark workspace missing')
            })()`)})
            await capture('sessione-scuro')
            win.setContentSize(900, 640)
            await run(${JSON.stringify(`(async () => {
              const { delay } = window.__sessioneCheck
              await delay(150)
              const dialog = document.querySelector('.session-overlay')
              if (dialog.scrollWidth > dialog.clientWidth + 1) throw Error('horizontal overflow at minimum window width')
            })()`)})
            await capture('sessione-900')
            for (const zoom of [1.25, 1.5, 2]) {
              win.webContents.setZoomFactor(zoom)
              await run(${JSON.stringify(`(async () => {
                await window.__sessioneCheck.delay(120)
                const dialog = document.querySelector('.session-overlay')
                if (dialog.scrollWidth > dialog.clientWidth + 1) throw Error('horizontal overflow at increased zoom')
              })()`)})
            }
            win.webContents.setZoomFactor(1)
            win.setContentSize(1450, 870)
            await run(${JSON.stringify(`(async () => {
              const { keyboard, waitFor, findButton } = window.__sessioneCheck
              findButton('Piano', document.querySelector('.session-overlay')).click()
              findButton('Distanza gli esami').click()
              await waitFor(() => [...document.querySelectorAll('dialog')].some(panel => panel.textContent.includes('Migliore combinazione disponibile')), 'compiled worker failed')
              findButton('Annulla').click()
              await waitFor(() => document.querySelectorAll('dialog[open]').length === 1, 'proposal did not close')
              keyboard('Escape')
              await waitFor(() => !document.querySelector('dialog[open]'), 'workspace did not close')
              const dashboard = await waitFor(() => [...document.querySelectorAll('.view-toggle button')].find(button => button.textContent.includes('Statistiche')), 'dashboard command missing')
              dashboard.click()
              const change = await waitFor(() => findButton('Cambia appello'), 'dashboard uses legacy dates instead of confirmed dates')
              change.click()
              const select = await waitFor(() => [...document.querySelectorAll('dialog select')].at(-1), 'external date confirmation missing')
              if (![...select.options].some(option => option.value === 'RL1')) throw Error('expected RL alternative is unavailable in Dashboard')
              select.value = 'RL1'
              select.dispatchEvent(new Event('change', { bubbles: true }))
              const confirm = await waitFor(() => {
                const button = findButton('Conferma modifica')
                return button && !button.disabled ? button : null
              }, 'alternative unavailable in Dashboard')
              confirm.click()
              await waitFor(() => !document.querySelector('dialog[open]'), 'external change did not save')
              const notices = await window.archive.getExamReminders()
              if (!notices.some(notice => notice.courseCode === 'RL' && notice.examDate === window.__sessioneCheck.date(12)) ||
                  notices.some(notice => notice.courseCode === 'RL' && notice.examDate === window.__sessioneCheck.date(6))) throw Error('notifications use obsolete choice')
            })()`)})
            await run(${JSON.stringify(`(async () => {
              const { waitFor, findButton } = window.__sessioneCheck
              ;[...document.querySelectorAll('.view-toggle button')].find(button => button.textContent.includes('Archivio'))?.click()
              const lecture = await waitFor(() => [...document.querySelectorAll('.lecture-card, .lecture-row, [role=button]')]
                .find(element => element.textContent.includes('Lezione sintetica Sessione')), 'synthetic lecture missing')
              lecture.click()
              const notes = await waitFor(() => [...document.querySelectorAll('button')].find(button =>
                button.textContent.includes('Dispensa Didattica')), 'lecture notes tab missing')
              notes.click()
              await waitFor(() => document.querySelector('button[title="Modalità studio immersiva"]'), 'focus button missing')
            })()`)})
            win.show(); win.focus()
            await run(${JSON.stringify(`document.querySelector('button[title="Modalità studio immersiva"]').click()`)}, true)
            await run(${JSON.stringify(`(async () => {
              const { keyboard, waitFor, delay } = window.__sessioneCheck
              await waitFor(() => document.fullscreenElement && document.querySelector('.focus-mode-overlay .markdown-body'), 'full Focus unavailable')
              const language = await waitFor(() => document.querySelector('.focus-mode-overlay .lang-toggle-pill:not(.no-translation)'), 'English fixture unavailable')
              language.click()
              const reading = await waitFor(() => document.querySelector('.focus-mode-content[data-notes-language="en"]'), 'English switch unavailable')
              await delay(180)
              reading.focus({ preventScroll: true })
              reading.scrollTop = 550
              const readingOffset = reading.scrollTop
              if (readingOffset < 100) throw Error('fixture cannot establish a reading position')
              if (document.querySelector('.recorder-choice')) throw Error('physical recorder contaminated the synthetic scenario')
              let ticks = 0
              const tick = () => { ticks++ }
              document.addEventListener('lezionify-study-tick', tick)
              await waitFor(() => ticks > 0, 'study did not start')
              keyboard('s', { code: 'KeyS', ctrlKey: true, altKey: true })
              await waitFor(() => document.querySelector('.session-overlay[open]'), 'Sessione missing over full Focus')
              const paused = ticks
              await delay(2300)
              if (ticks !== paused) throw Error('calendar consultation credited study')
              keyboard('Escape')
              await waitFor(() => !document.querySelector('.session-overlay'), 'Escape did not close Sessione')
              if (!document.fullscreenElement) throw Error('Escape lost full Focus')
              if (reading !== document.activeElement || reading.dataset.notesLanguage !== 'en' || Math.abs(reading.scrollTop - readingOffset) > 1)
                throw Error('closing the calendar lost the reading point or language')
              await waitFor(() => ticks > paused, 'study did not resume')
              document.removeEventListener('lezionify-study-tick', tick)
            })()`)})
          }
          console.log(restart ? 'PASS: Sessione compiled restart opens the confirmed revision' : 'PASS: Sessione compiled IPC, layout, worker, Dashboard, reminders, Full Focus and study clock')
          app.exit(0)
        } catch (error) {
          console.error('FAIL: ' + error.message)
          if (screenshotDirectory) await capture('sessione-debug').catch(() => {})
          app.exit(1)
        }
      })
    })
    import(${JSON.stringify(pathToFileURL(join(repository, 'out/main/index.js')).href)}).catch(error => {
      console.error('FAIL: ' + error.message)
      app.exit(1)
    })
  `)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const syntax = spawnSync(process.execPath, ['--check', main], { encoding: 'utf8', windowsHide: true })
  if (syntax.status !== 0) throw new Error(syntax.stderr || 'Launcher Sessione non valido.')
  for (const args of [[], ['--restart']]) {
    const result = spawnSync(require('electron'), ['--no-sandbox', '--disable-gpu', main, ...args],
      { env, encoding: 'utf8', windowsHide: true, timeout: 72000 })
    const lines = [result.stdout, result.stderr].join('\n').split(/\r?\n/).filter(line =>
      /^(PASS|FAIL):/.test(line) || (env.LEZIONIFY_SESSIONE_TRACE && line))
    if (lines.length) console.log(lines.join('\n'))
    if (result.error || result.status !== 0) {
      if (!lines.length) console.error('FAIL: unable to launch compiled Sessione test', result.error?.message ?? result.status)
      process.exitCode = 1
      break
    }
  }
} finally {
  rmSync(directory, { force: true, recursive: true })
}
