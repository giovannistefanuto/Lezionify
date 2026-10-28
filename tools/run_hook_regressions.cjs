// Real React lifecycle tests in the bundled Electron runtime; no extra test dependencies.
const { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, cpSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')
const directory = mkdtempSync(join(tmpdir(), 'lezionify-hooks-'))
const screenshotDirectory = process.env.LEZIONIFY_VIDEO_SCREENSHOT_DIR || null
const repetitionOnly = process.argv.includes('--repetition-only')
const october22Only = process.argv.includes('--october22-only')
const interfacePolishOnly = process.argv.includes('--interface-polish-only')
const todayOnly = process.argv.includes('--today-only')
const memoLogsExportOnly = process.argv.includes('--memo-logs-export-only')
const lectureListOnly = process.argv.includes('--lecture-list-only')
const courseRagOnly = process.argv.includes('--course-rag-only')
const studyToolsOnly = process.argv.includes('--study-tools-only')
const readingRestartOnly = process.argv.includes('--reading-restart-only')
const readingPositionOnly = process.argv.includes('--reading-position-only')
const studyPauseOnly = process.argv.includes('--study-pause-only')
const musicOnly = process.argv.includes('--music-only')
const focusPdfOnly = process.argv.includes('--focus-pdf-only')
const dictionaryOnly = process.argv.includes('--dictionary-only')
const mathRenderingOnly = process.argv.includes('--math-rendering-only')
const languageShortcutOnly = process.argv.includes('--language-shortcut-only')
if (screenshotDirectory) mkdirSync(screenshotDirectory, { recursive: true })
try {
  cpSync('public/music', join(directory, 'music'), { recursive: true })
  cpSync('node_modules/katex/dist/fonts', join(directory, 'fonts'), { recursive: true })
  writeFileSync(join(directory, 'katex.css'), readFileSync('node_modules/katex/dist/katex.min.css'))
  writeFileSync(join(directory, 'pdf.worker.mjs'), readFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'))
  writeFileSync(join(directory, 'pdf-worker-url.js'), 'export default "./pdf.worker.mjs"')
  buildSync({
    entryPoints: ['./tests/integration/hookRegression.browser.tsx'],
    bundle: true,
    outfile: join(directory, 'test.js'),
    platform: 'browser',
    jsx: 'automatic',
    external: ['electron'],
    define: { 'process.env.NODE_ENV': '"development"' },
    alias: { 'pdfjs-dist/build/pdf.worker.min.mjs?url': join(directory, 'pdf-worker-url.js') }
  })
  writeFileSync(
    join(directory, 'index.html'),
    '<link rel="stylesheet" href="katex.css"><link rel="stylesheet" href="test.css"><div id="root"></div><script src="test.js"></script>'
  )
  writeFileSync(
    join(directory, 'main.cjs'),
    `
    const { app, BrowserWindow, ipcMain, protocol } = require('electron');
    app.setPath('userData', ${JSON.stringify(join(directory, 'profile'))});
    ipcMain.on('done', async (event, result) => { event.sender.session.flushStorageData(); await new Promise(resolve => setTimeout(resolve, 100)); console.log(result); app.exit(result.startsWith('PASS') ? 0 : 1) });
    ipcMain.on('test-checkpoint', (_, name) => { if (typeof name === 'string' && /^run[A-Za-z]+$/.test(name)) console.log('SCENARIO: ' + name) });
    app.whenReady().then(() => {
      // Public artwork is replaced by deterministic synthetic SVG; no CDN or account requests.
      protocol.handle('https', request => {
        const host = new URL(request.url).hostname;
        if (!['i.ytimg.com','i.scdn.co'].includes(host)) return new Response(null, {status:503});
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="a"><stop stop-color="#314d52"/><stop offset="1" stop-color="#a5b6a1"/></linearGradient></defs><rect width="640" height="360" fill="url(#a)"/><circle cx="480" cy="180" r="120" fill="none" stroke="#ffffff55" stroke-width="2"/><text x="45" y="180" font-family="serif" font-size="42" fill="white">Study collection</text><text x="48" y="220" font-family="sans-serif" font-size="16" fill="#ffffffbb">SYNTHETIC PREVIEW</text></svg>', {headers:{'Content-Type':'image/svg+xml'}});
      });
      const win = new BrowserWindow({ show: false, width: 1240, height: 820, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
      ipcMain.handle('course-rag-worker', async (_, pdf) => new Promise((resolve, reject) => {
        const { Worker } = require('node:worker_threads');
        const built = ${JSON.stringify(join(process.cwd(), 'out/main/course-rag/pdf-worker.cjs'))};
        const runner = require('node:fs').existsSync(built) ? built : ${JSON.stringify(join(process.cwd(), 'resources/course-rag/pdf-worker.cjs'))};
        const worker = new Worker(runner, { workerData: { bytes: new Uint8Array(Buffer.from(pdf)), moduleUrl: require('node:url').pathToFileURL(${JSON.stringify(require.resolve('pdfjs-dist/legacy/build/pdf.mjs'))}).href } });
        const timer = setTimeout(() => { void worker.terminate(); reject(new Error('PDF worker timed out')) }, 20000);
        worker.once('message', result => { clearTimeout(timer); void worker.terminate(); if (result.error) reject(new Error(result.error)); else resolve(result.pages) });
        worker.once('error', () => { clearTimeout(timer); reject(new Error('PDF worker failed')) });
      }));
      ipcMain.handle('feature-test-key', async (_, keyCode, shift) => {
        if (!['Tab','Enter','Space','Escape'].includes(keyCode)) throw new Error('Unsupported key');
        win.webContents.focus();
        const modifiers = shift ? ['shift'] : [];
        win.webContents.sendInputEvent({type:'keyDown', keyCode, modifiers});
        if (keyCode === 'Enter' || keyCode === 'Space') win.webContents.sendInputEvent({type:'char',keyCode:keyCode === 'Enter' ? String.fromCharCode(13) : ' ',modifiers});
        win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      ipcMain.handle('feature-test-zoom', (_, value) => { if (![1,2].includes(value)) throw new Error('Unsupported zoom'); win.webContents.setZoomFactor(value) });
      ipcMain.handle('feature-test-window-size', (_, narrow) => { if (narrow && typeof narrow === 'object' && Number.isInteger(narrow.width) && Number.isInteger(narrow.height) && narrow.width >= 360 && narrow.width <= 1600 && narrow.height >= 360 && narrow.height <= 1200) win.setContentSize(narrow.width, narrow.height); else win.setSize(narrow === true ? 640 : 1240, 820) });
      ipcMain.handle('video-import-styles', () => require('node:fs').readFileSync(${JSON.stringify(join(process.cwd(), 'src/styles.css'))}, 'utf8').replace(/^@import[^;]+;/, ''));
      ipcMain.handle('qna-styles', () => require('node:fs').readFileSync(${JSON.stringify(join(process.cwd(), 'src/qna.css'))}, 'utf8'));
      ipcMain.handle('language-shortcut-key', async () => {
        win.webContents.focus();
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'L', modifiers: ['control'] });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'L', modifiers: ['control'] });
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      ipcMain.handle('language-shortcut-focus', async () => {
        win.show();
        await Promise.race([
          win.webContents.executeJavaScript(${JSON.stringify("document.querySelector('[title=\"Modalità studio immersiva\"]').click()")}, true),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Native fullscreen test gesture timed out')), 5000))
        ]);
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      ipcMain.handle('mermaid-toggle-key', async (_, keyCode, all = false) => {
        if (!['Enter', 'Space'].includes(keyCode)) throw new Error('Unsupported test key');
        await win.webContents.executeJavaScript(all
          ? "Array.from(document.querySelectorAll('.focus-pane-toolbar button')).find(button => button.textContent.includes('tutti gli schemi')).focus()"
          : "document.querySelector('.mermaid-collapse-toggle').focus()");
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
        win.webContents.sendInputEvent({ type: 'char', keyCode: keyCode === 'Enter' ? String.fromCharCode(13) : ' ' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      ipcMain.handle('focus-pdf-drag', async (_, from, to, y) => {
        win.webContents.focus();
        win.webContents.sendInputEvent({ type: 'mouseMove', x: from, y });
        await new Promise(resolve => setTimeout(resolve, 80));
        win.webContents.sendInputEvent({ type: 'mouseDown', x: from, y, button: 'left', clickCount: 1 });
        await new Promise(resolve => setTimeout(resolve, 50));
        win.webContents.sendInputEvent({ type: 'mouseMove', x: to, y, button: 'left' });
        await new Promise(resolve => setTimeout(resolve, 50));
        win.webContents.sendInputEvent({ type: 'mouseUp', x: to, y, button: 'left', clickCount: 1 });
      });
      ipcMain.handle('capture-video-import', async (_, name) => {
        const directory = ${JSON.stringify(screenshotDirectory)};
        if (!directory || (!/^repeat-[a-z0-9-]+$/.test(name) && !/^oct22-[a-z0-9-]+$/.test(name) && !['polish-sidebar', 'polish-sidebar-narrow', 'polish-sidebar-collapsed', 'polish-memo-light', 'polish-memo-dark', 'polish-memo-narrow', 'polish-info', 'study-removal', 'dictionary-long', 'today-qna', 'today-memo', 'today-sounds', 'today-mermaid', 'today-battery', 'logs-light', 'logs-dark', 'sounds-light', 'sounds-dark', 'memo-narrow', 'export-narrow', 'memo-light', 'memo-dark', 'export-light', 'export-dark', 'tools-settings-translation', 'tools-settings-music', 'music-youtube-light', 'music-youtube-dark', 'music-light', 'music-dark', 'dictionary-light', 'dictionary-dark', 'discussion-light', 'discussion-dark', 'markdown-alerts-light', 'markdown-alerts-dark', 'focus-lock-times', 'dashboard-light', 'dashboard-dark', 'order', 'destination-light', 'destination-dark', 'home-light', 'home-dark', 'lecture-title-light', 'lecture-title-dark', 'drawer-focus-floating', 'focus-pdf-light', 'focus-pdf-dark', 'focus-pdf-qna'].includes(name))) return;
        await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 200))');
        await win.webContents.capturePage();
        await new Promise(resolve => setTimeout(resolve, 250));
        const screenshot = await win.webContents.capturePage();
        require('node:fs').writeFileSync(require('node:path').join(directory, name + '.png'), screenshot.toPNG());
      });
      win.loadFile(${JSON.stringify(join(directory, 'index.html'))}, process.argv.includes('--resume-reading') ? { query: { resumeReading: '1' } } : ${JSON.stringify(repetitionOnly ? { query: { 'repetition-only': '1' } } : october22Only ? { query: { 'october22-only': '1' } } : interfacePolishOnly ? { query: { 'interface-polish-only': '1' } } : todayOnly ? { query: { 'today-only': '1' } } : memoLogsExportOnly ? { query: { 'memo-logs-export-only': '1' } } : lectureListOnly ? { query: { 'lecture-list-only': '1' } } : courseRagOnly ? { query: { 'course-rag-only': '1' } } : studyToolsOnly ? { query: { 'study-tools-only': '1' } } : languageShortcutOnly ? { query: { languageShortcutOnly: '1' } } : focusPdfOnly ? { query: { focusPdfOnly: '1' } } : musicOnly ? { query: { musicOnly: '1' } } : mathRenderingOnly ? { query: { mathRenderingOnly: '1' } } : dictionaryOnly ? { query: { dictionaryOnly: '1' } } : studyPauseOnly ? { query: { studyPauseOnly: '1' } } : readingPositionOnly ? { query: { readingPositionOnly: '1' } } : readingRestartOnly ? { query: { readingRestartOnly: '1' } } : {})});
    });
    setTimeout(() => { console.error('Hook tests timed out'); app.exit(1) }, 180000);
  `
  )
  const env = { ...process.env }
  const syntaxCheck = spawnSync(process.execPath, ['--check', join(directory, 'main.cjs')], { encoding: 'utf8', windowsHide: true })
  if (syntaxCheck.status !== 0) throw new Error(syntaxCheck.stderr || 'Invalid Electron test launcher')
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [join(directory, 'main.cjs')], {
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 190000
  })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
  if (result.status === 0 && !repetitionOnly && !october22Only && !interfacePolishOnly && !todayOnly && !memoLogsExportOnly && !lectureListOnly && !courseRagOnly && !studyToolsOnly && !focusPdfOnly && !musicOnly && !readingPositionOnly && !studyPauseOnly && !dictionaryOnly && !mathRenderingOnly && !languageShortcutOnly) {
    const restarted = spawnSync(require('electron'), [join(directory, 'main.cjs'), '--resume-reading'], { env, encoding: 'utf8', windowsHide: true, timeout: 190000 })
    process.stdout.write(restarted.stdout || '')
    process.stderr.write(restarted.stderr || '')
    process.exitCode = restarted.status ?? 1
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
