// Real React lifecycle tests in the bundled Electron runtime; no extra test dependencies.
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')
const directory = mkdtempSync(join(tmpdir(), 'lezionify-hooks-'))
try {
  buildSync({
    entryPoints: ['./tests/integration/hookRegression.browser.tsx'],
    bundle: true,
    outfile: join(directory, 'test.js'),
    platform: 'browser',
    jsx: 'automatic',
    external: ['electron'],
    define: { 'process.env.NODE_ENV': '"development"' }
  })
  writeFileSync(
    join(directory, 'index.html'),
    '<div id="root"></div><script src="test.js"></script>'
  )
  writeFileSync(
    join(directory, 'main.cjs'),
    `
    const { app, BrowserWindow, ipcMain } = require('electron');
    app.setPath('userData', ${JSON.stringify(join(directory, 'profile'))});
    ipcMain.on('done', (_, result) => { console.log(result); app.exit(result.startsWith('PASS') ? 0 : 1) });
    app.whenReady().then(() => {
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
      win.loadFile(${JSON.stringify(join(directory, 'index.html'))});
    });
    setTimeout(() => { console.error('Hook tests timed out'); app.exit(1) }, 45000);
  `
  )
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [join(directory, 'main.cjs')], {
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 55000
  })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
