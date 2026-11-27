// Real React lifecycle tests in the bundled Electron runtime; no extra test dependencies.
const { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, cpSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { build, buildSync } = require('esbuild')
const sessioneTestWorker = require('./sessione_test_worker.cjs')
const directory = mkdtempSync(join(tmpdir(), 'lezionify-hooks-'))
const screenshotDirectory = process.env.LEZIONIFY_VIDEO_SCREENSHOT_DIR || null
const hookTimeoutMs = Math.max(30000, Math.min(300000, Number(process.env.LEZIONIFY_HOOK_TIMEOUT_MS) || 180000))
const november27Only = process.argv.includes('--november27-only')
const october28Only = process.argv.includes('--october28-only')
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
const youtubeOnly = process.argv.includes('--youtube-local-only')
const focusPdfOnly = process.argv.includes('--focus-pdf-only')
const dictionaryOnly = process.argv.includes('--dictionary-only')
const mathRenderingOnly = process.argv.includes('--math-rendering-only')
const collectionsOnly = process.argv.includes('--collections-only')
const sidebarMenuOnly = process.argv.includes('--sidebar-menu-only')
const november20Only = process.argv.includes('--november20-only')
const languageShortcutOnly = process.argv.includes('--language-shortcut-only')
if (screenshotDirectory) mkdirSync(screenshotDirectory, { recursive: true })
async function run() {
try {
  buildSync({ entryPoints: ['./electron/main/focusScreenshot.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: join(directory, 'focus-screenshot.cjs') })
  buildSync({ entryPoints: ['./electron/main/studyHistory.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(directory, 'study-history.cjs') })
  buildSync({ entryPoints: ['./electron/main/collections/service.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(directory, 'collections.cjs') })
  buildSync({ entryPoints: ['./electron/main/languageShortcut.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: join(directory, 'language-shortcut.cjs') })
  cpSync('public/music', join(directory, 'music'), { recursive: true })
  cpSync('node_modules/katex/dist/fonts', join(directory, 'fonts'), { recursive: true })
  writeFileSync(join(directory, 'katex.css'), readFileSync('node_modules/katex/dist/katex.min.css'))
  writeFileSync(join(directory, 'pdf.worker.mjs'), readFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'))
  writeFileSync(join(directory, 'pdf-worker-url.js'), 'export default "./pdf.worker.mjs"')
  await build({
    entryPoints: ['./tests/integration/hookRegression.browser.tsx'],
    bundle: true,
    outfile: join(directory, 'test.js'),
    platform: 'browser',
    jsx: 'automatic',
    external: ['electron'],
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [sessioneTestWorker(directory)],
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
      const studyRoot = ${JSON.stringify(join(directory, 'study-fixture'))};
      const studyFs = require('node:fs'), studyPath = require('node:path');
      studyFs.mkdirSync(studyRoot, { recursive: true });
      let studySessions = [], studyOperations = new Map();
      const StudyHistory = require(${JSON.stringify(join(directory, 'study-history.cjs'))}).StudyHistory;
      const makeStudyHistory = () => new StudyHistory(studyRoot, { readSessions: async () => structuredClone(studySessions), writeSessions: async value => { studySessions = value; studyFs.writeFileSync(studyPath.join(studyRoot,'sessions.json'), JSON.stringify(value)) }, completionOperation: async lesson => studyOperations.get(lesson) });
      const screenshotDestination = require('node:path').join(${JSON.stringify(directory)}, 'screenshots');
      require('node:fs').mkdirSync(screenshotDestination, { recursive: true });
      const { FocusScreenshotService } = require(${JSON.stringify(join(directory, 'focus-screenshot.cjs'))});
      const screenshots = new FocusScreenshotService(screenshotDestination);
      ipcMain.handle('nov27-window-state', () => { const [width,height] = win.getContentSize(); return {size:{width,height},zoom:win.webContents.getZoomFactor()}; });
      ipcMain.handle('nov27-screenshot-escape', async () => { win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'}); win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'}); await new Promise(resolve => setTimeout(resolve, 80)); });
      ipcMain.handle('nov27-screenshot-painted', async () => { win.webContents.invalidate(); await win.webContents.capturePage(); await new Promise(resolve => setTimeout(resolve, 100)); });
      ipcMain.handle('nov27-screenshot-begin', event => screenshots.begin(event.sender));
      ipcMain.handle('nov27-screenshot-cancel', (event, token) => screenshots.cancel(event.sender, token));
      ipcMain.handle('nov27-screenshot-save', (event, token, rect, enhanced) => screenshots.save(event.sender, token, rect, enhanced));
      ipcMain.handle('nov27-screenshot-files', () => require('node:fs').readdirSync(screenshotDestination).map(name => { const image = require('electron').nativeImage.createFromPath(require('node:path').join(screenshotDestination,name)); const bytes = image.toBitmap(); return {name, ...image.getSize(), rgb: [bytes[2],bytes[1],bytes[0]].join(',')} }));
      ipcMain.handle('nov27-screenshot-drag', async (_, from, to) => {
        win.focus(); win.webContents.focus();
        win.webContents.sendInputEvent({type:'mouseMove', ...from});
        win.webContents.sendInputEvent({type:'mouseDown', ...from, button:'left', clickCount:1});
        await new Promise(resolve => setTimeout(resolve, 80));
        win.webContents.sendInputEvent({type:'mouseMove', ...to, button:'left', modifiers:['leftButtonDown']});
        await new Promise(resolve => setTimeout(resolve, 80));
        win.webContents.sendInputEvent({type:'mouseUp', ...to, button:'left', clickCount:1});
      });
      let studyHistory = makeStudyHistory();
      const CollectionsService = require(${JSON.stringify(join(directory, 'collections.cjs'))}).CollectionsService;
      const collectionRoot = studyPath.join(studyRoot, 'collection-fixture');
      studyFs.mkdirSync(collectionRoot, {recursive:true});
      const courseFixture = '{"version":1,"lectures":[]}';
      studyFs.writeFileSync(studyPath.join(collectionRoot,'library.json'), courseFixture);
      const wav = Buffer.alloc(32044); wav.write('RIFF'); wav.writeUInt32LE(32036,4); wav.write('WAVE',8); wav.write('fmt ',12); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(16000,24); wav.writeUInt32LE(32000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(32000,40);
      const collectionSource = studyPath.join(collectionRoot,'fixture.wav'); studyFs.writeFileSync(collectionSource,wav);
      const counters = {asr:0,generation:0};
      const collectionDeps = {model:async()=> 'synthetic-model',
        prepareAudio:async (source,destination,signal)=> { await require('node:util').promisify(require('node:child_process').execFile)(${JSON.stringify(require('ffmpeg-static'))},['-nostdin','-y','-i',source,'-vn','-ac','1','-ar','16000',destination],{signal,windowsHide:true}); },
        transcribe:async()=>{ counters.asr++; return 'Una trascrizione sintetica con una esperienza concreta e una riflessione.' },
        complete:async()=>{ counters.generation++; return {model:'synthetic-model',text:JSON.stringify({markdown:'## Il racconto\\n\\nUna esperienza concreta viene conservata insieme alla riflessione.',quotes:[]})} }
      };
      let collections = new CollectionsService(collectionRoot, collectionDeps);
      ipcMain.handle('collection-test',async (_,action,...args)=>{
        if(action==='state')return collections.state();
        if(action==='save')return collections.repository.saveCollection(args[0]);
        if(action==='update')return collections.repository.updateItem(...args);
        if(action==='select')return collections.repository.selectFiles([collectionSource]);
        if(action==='release')return collections.repository.releaseSelection(args[0]);
        if(action==='import')return collections.repository.importFiles(args[0]);
        if(action==='read')return collections.read(...args);
        if(action==='process')return collections.process(...args);
        if(action==='stop')return collections.stop();
        if(action==='activate')return collections.repository.activateGeneration(...args);
        if(action==='search')return collections.search(...args);
        if(action==='wait')return collections.wait();
        if(action==='restart'){ await collections.stop(); collections=new CollectionsService(collectionRoot,collectionDeps); return collections.state() }
        if(action==='counters')return counters;
        if(action==='course-unchanged')return studyFs.readFileSync(studyPath.join(collectionRoot,'library.json'),'utf8')===courseFixture;
        throw Error('Invalid collection test action');
      });
      ipcMain.handle('study-test-observe', (_, batch) => studyHistory.ingest(batch));
      ipcMain.handle('study-test-predict', (_, request) => studyHistory.recordPrediction(request));
      ipcMain.handle('study-test-reset', (_, lectureId, sessionId) => studyHistory.reset(lectureId, sessionId));
      ipcMain.handle('study-test-day', (_, date, filter) => studyHistory.getDay(date,studySessions,{},[],filter));
      ipcMain.handle('study-test-complete', async (_, lesson, checkpoint) => {
        const operation = await studyHistory.prepareCompletion(lesson, checkpoint);
        if (operation) { studyOperations.set(lesson, operation); await studyHistory.finishCompletion(lesson,operation) }
        return { id: lesson, studyStatus: 'completata' };
      });
      ipcMain.handle('study-test-restart', async () => { studyHistory = makeStudyHistory(); await studyHistory.recover(); return true });
      ipcMain.handle('study-test-seed', (_, values) => { studySessions.push(...values); return true });
      ipcMain.handle('study-test-legacy', (_, data) => studyHistory.importLegacy(data));
      // Public artwork is replaced by deterministic synthetic SVG; no CDN or account requests.
      protocol.handle('https', request => {
        const host = new URL(request.url).hostname;
        if (!['i.ytimg.com','i.scdn.co'].includes(host)) return new Response(null, {status:503});
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="a"><stop stop-color="#314d52"/><stop offset="1" stop-color="#a5b6a1"/></linearGradient></defs><rect width="640" height="360" fill="url(#a)"/><circle cx="480" cy="180" r="120" fill="none" stroke="#ffffff55" stroke-width="2"/><text x="45" y="180" font-family="serif" font-size="42" fill="white">Study collection</text><text x="48" y="220" font-family="sans-serif" font-size="16" fill="#ffffffbb">SYNTHETIC PREVIEW</text></svg>', {headers:{'Content-Type':'image/svg+xml'}});
      });
      const win = new BrowserWindow({ show: false, width: 1240, height: 820, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
      const shortcut = require(${JSON.stringify(join(directory, 'language-shortcut.cjs'))}).installLanguageShortcut(win.webContents);
      ipcMain.handle('language-shortcut-active', (_, active) => shortcut.setActive(active));
      ipcMain.handle('feature-test-fullscreen', async (_, active) => {
        if (active) await win.webContents.executeJavaScript('document.documentElement.requestFullscreen()', true);
        else await win.webContents.executeJavaScript('document.exitFullscreen()', true);
      });
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
        win.webContents.sendInputEvent({ type: 'mouseMove', x: to, y, button: 'left', modifiers: ['leftButtonDown'] });
        await new Promise(resolve => setTimeout(resolve, 50));
        win.webContents.sendInputEvent({ type: 'mouseUp', x: to, y, button: 'left', clickCount: 1 });
      });
      ipcMain.handle('capture-video-import', async (_, name) => {
        const directory = ${JSON.stringify(screenshotDirectory)};
        if (!directory || (!/^nov27-[a-z0-9-]+$/.test(name) && !/^youtube-local-[a-z0-9-]+$/.test(name) && !/^collections-[a-z0-9-]+$/.test(name) && !/^oct28-[a-z0-9-]+$/.test(name) && !/^repeat-[a-z0-9-]+$/.test(name) && !/^oct22-[a-z0-9-]+$/.test(name) && !['memo-study-info-completed', 'memo-study-info-dark', 'november20-records-light', 'november20-records-dark', 'november20-pause', 'november20-notice', 'polish-sidebar', 'polish-sidebar-narrow', 'polish-sidebar-collapsed', 'polish-memo-light', 'polish-memo-dark', 'polish-memo-narrow', 'polish-info', 'study-removal', 'dictionary-long', 'today-qna', 'today-memo', 'today-sounds', 'today-mermaid', 'today-battery', 'logs-light', 'logs-dark', 'sounds-light', 'sounds-dark', 'memo-narrow', 'export-narrow', 'memo-light', 'memo-dark', 'export-light', 'export-dark', 'tools-settings-translation', 'tools-settings-music', 'music-youtube-light', 'music-youtube-dark', 'music-light', 'music-dark', 'dictionary-light', 'dictionary-dark', 'discussion-light', 'discussion-dark', 'markdown-alerts-light', 'markdown-alerts-dark', 'focus-lock-times', 'dashboard-light', 'dashboard-dark', 'dashboard-history', 'order', 'destination-light', 'destination-dark', 'home-light', 'home-dark', 'lecture-title-light', 'lecture-title-dark', 'drawer-focus-floating', 'focus-pdf-light', 'focus-pdf-dark', 'focus-pdf-qna'].includes(name))) return;
        await win.webContents.executeJavaScript('new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 200))');
        await win.webContents.capturePage();
        await new Promise(resolve => setTimeout(resolve, 250));
        const screenshot = await win.webContents.capturePage();
        require('node:fs').writeFileSync(require('node:path').join(directory, name + '.png'), screenshot.toPNG());
      });
      win.loadFile(${JSON.stringify(join(directory, 'index.html'))}, process.argv.includes('--resume-collections') ? { query: { collectionsResume: '1' } } : process.argv.includes('--resume-reading') ? { query: { resumeReading: '1' } } : ${JSON.stringify(november27Only ? { query: { november27Only: '1' } } : youtubeOnly ? { query: { youtubeLocalOnly: '1' } } : november20Only ? { query: { november20Only: '1' } } : collectionsOnly ? { query: { collectionsOnly: '1' } } : sidebarMenuOnly ? { query: { sidebarMenuOnly: '1' } } : october28Only ? { query: { 'october28-only': '1' } } : repetitionOnly ? { query: { 'repetition-only': '1' } } : october22Only ? { query: { 'october22-only': '1' } } : interfacePolishOnly ? { query: { 'interface-polish-only': '1' } } : todayOnly ? { query: { 'today-only': '1' } } : memoLogsExportOnly ? { query: { 'memo-logs-export-only': '1' } } : lectureListOnly ? { query: { 'lecture-list-only': '1' } } : courseRagOnly ? { query: { 'course-rag-only': '1' } } : studyToolsOnly ? { query: { 'study-tools-only': '1' } } : languageShortcutOnly ? { query: { languageShortcutOnly: '1' } } : focusPdfOnly ? { query: { focusPdfOnly: '1' } } : musicOnly ? { query: { musicOnly: '1' } } : mathRenderingOnly ? { query: { mathRenderingOnly: '1' } } : dictionaryOnly ? { query: { dictionaryOnly: '1' } } : studyPauseOnly ? { query: { studyPauseOnly: '1' } } : readingPositionOnly ? { query: { readingPositionOnly: '1' } } : readingRestartOnly ? { query: { readingRestartOnly: '1' } } : {})});
    });
    setTimeout(() => { console.error('Hook tests timed out'); app.exit(1) }, ${hookTimeoutMs});
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
    timeout: hookTimeoutMs + 10000
  })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
  if (result.status === 0 && collectionsOnly) {
    const restarted = spawnSync(require('electron'), [join(directory, 'main.cjs'), '--resume-collections'], { env, encoding: 'utf8', windowsHide: true, timeout: hookTimeoutMs + 10000 })
    process.stdout.write(restarted.stdout || '')
    process.stderr.write(restarted.stderr || '')
    process.exitCode = restarted.status ?? 1
  }
  if (result.status === 0 && !november27Only && !youtubeOnly && !november20Only && !collectionsOnly && !sidebarMenuOnly && !october28Only && !repetitionOnly && !october22Only && !interfacePolishOnly && !todayOnly && !memoLogsExportOnly && !lectureListOnly && !courseRagOnly && !studyToolsOnly && !focusPdfOnly && !musicOnly && !readingPositionOnly && !studyPauseOnly && !dictionaryOnly && !mathRenderingOnly && !languageShortcutOnly) {
    const restarted = spawnSync(require('electron'), [join(directory, 'main.cjs'), '--resume-reading'], { env, encoding: 'utf8', windowsHide: true, timeout: 190000 })
    process.stdout.write(restarted.stdout || '')
    process.stderr.write(restarted.stderr || '')
    process.exitCode = restarted.status ?? 1
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
}
void run().catch(error => { console.error(error); process.exitCode = 1 })
