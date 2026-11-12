// Isolated Electron check: never touches the user's iCloud folder or profile.
const { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')
const directory = mkdtempSync(join(tmpdir(), 'lezionify-ipad-check-'))
mkdirSync(join(directory, 'photos'))
buildSync({ entryPoints: ['tests/integration/ipadExport.browser.tsx'], outfile: join(directory, 'test.js'), bundle: true, platform: 'browser', jsx: 'automatic', external: ['electron'] })
buildSync({ entryPoints: ['electron/main/ipadExport.ts'], outfile: join(directory, 'service.cjs'), bundle: true, platform: 'node', external: ['electron'] })
copyFileSync('src/styles.css', join(directory, 'test.css'))
writeFileSync(join(directory, 'index.html'), '<link rel="stylesheet" href="test.css"><div id="root"></div><script src="test.js"></script>')
writeFileSync(join(directory, 'main.cjs'), `
const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('node:fs'), path = require('node:path');
app.setPath('userData', path.join(__dirname, 'profile'));
app.whenReady().then(() => {
const { IpadExportService } = require('./service.cjs');
const service = new IpadExportService(app.getPath('userData'), path.join(__dirname, 'photos'));
ipcMain.handle('status', (_, enabled) => service.status(enabled));
ipcMain.handle('export', (_, request) => service.export(request));
ipcMain.handle('preview', (_, name, png) => {
const image = nativeImage.createFromBuffer(Buffer.from(png));
if (image.isEmpty() || image.getSize().width < 100) throw Error('PNG reale non valido');
const bitmap = image.getBitmap();
if (bitmap[0] !== 255 || bitmap[1] !== 255 || bitmap[2] !== 255) throw Error('Margine non bianco');
fs.writeFileSync(path.join(__dirname, name + '.png'), png);
});
ipcMain.handle('verify', async () => {
if (fs.readdirSync(path.join(__dirname, 'photos')).length !== 1) throw Error('Numero export errato');
const state = await service.status();
if (state.count !== 1 || state.bytes < 100) throw Error('Registro non coerente');
});
ipcMain.on('done', (_, message) => { console.log(message); app.exit(message.startsWith('PASS') ? 0 : 1) });
const win = new BrowserWindow({ show: false, width: 1100, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
ipcMain.handle('screenshot', async (_, name) => fs.writeFileSync(path.join(__dirname, name + '.png'), (await win.webContents.capturePage()).toPNG()));
win.loadFile(path.join(__dirname, 'index.html'));
setTimeout(() => { console.log('FAIL: timeout'); app.exit(1) }, 90000);
});
`)
console.log('Artifacts:', directory)
const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE
const result = spawnSync(require('electron'), [join(directory, 'main.cjs')], { env: environment, encoding: 'utf8', timeout: 110000, windowsHide: true })
console.log(result.stdout || '')
if (result.status !== 0) console.error(result.stderr || result.error || '')
process.exitCode = result.status === 0 ? 0 : 1
