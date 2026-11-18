const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { build, buildSync } = require('esbuild')

async function run() {
  const scratch = mkdtempSync(join(tmpdir(), 'lezionify-sessione-ui-'))
  try {
  const file = name => join(scratch, name)
  await build({ entryPoints: ['tests/integration/sessione.browser.tsx'], bundle: true, platform: 'browser',
    jsx: 'automatic', external: ['electron'], outfile: file('browser.js'),
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'sessione-worker-fixture', setup(build) {
      build.onResolve({ filter: /sessionSpacing\.worker\?worker&inline$/ }, () => ({ path: 'spacing-worker', namespace: 'sessione-test' }))
      build.onLoad({ filter: /^spacing-worker$/, namespace: 'sessione-test' }, () => ({
        contents: 'export default function() { return new Worker(new URL("spacing-worker.js", document.baseURI)) }'
      }))
    } }] })
  buildSync({ entryPoints: ['src/components/sessione/sessionSpacing.worker.ts'], bundle: true, platform: 'browser',
    outfile: file('spacing-worker.js') })
  buildSync({ entryPoints: ['electron/main/sessioneStore.ts'], bundle: true, platform: 'node',
    format: 'cjs', outfile: file('store.cjs') })
  writeFileSync(file('index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="browser.css"><div id="root"></div><script src="browser.js"></script>')
  writeFileSync(file('main.cjs'), [
    "const { app, BrowserWindow, ipcMain } = require('electron')",
    "const { join } = require('node:path')",
    "const { SessionStore } = require('./store.cjs')",
    "app.setPath('userData', join(__dirname, 'profile'))",
    "const path = join(__dirname, 'sessione.json')",
    "let store = new SessionStore(path)",
    "ipcMain.handle('test:sessione', (_, method, command) => {",
    "  if (method === 'restart') store = new SessionStore(path)",
    "  return method === 'apply' ? store.apply(command) : store.state()",
    "})",
    "ipcMain.on('done', (_, result) => { console.log(result); app.exit(result.startsWith('PASS') ? 0 : 1) })",
    "app.whenReady().then(() => {",
    "  const win = new BrowserWindow({ show: false, width: 1240, height: 820, webPreferences: { nodeIntegration: true, contextIsolation: false } })",
    "  ipcMain.handle('test:layout', async (_, width, destination) => {",
    "    win.setContentSize(width, 820)",
    "    await new Promise(resolve => setTimeout(resolve, 200))",
    "    if (destination) require('node:fs').writeFileSync(destination, (await win.webContents.capturePage()).toPNG())",
    "  })",
    "  win.loadFile(join(__dirname, 'index.html'))",
    "})"
  ].join('\n'))
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), ['--no-sandbox', file('main.cjs')], { env, encoding: 'utf8',
    windowsHide: true, timeout: 60000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.error) console.error(result.error.message)
  process.exitCode = result.status ?? 1
  } finally {
    rmSync(scratch, { force: true, recursive: true })
  }
}
void run().catch(error => { console.error(error); process.exitCode = 1 })
