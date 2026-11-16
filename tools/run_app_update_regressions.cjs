// Real updater transport and React lifecycle in an isolated Electron profile.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')
const root = process.cwd()
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lezionify-update-'))
const screenshot = path.join(root, 'local-artifacts/app-update-ui.png')
try {
  buildSync({ entryPoints: ['electron/main/appUpdater.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(directory, 'service.cjs') })
  buildSync({ entryPoints: ['tests/integration/appUpdates.browser.tsx'], bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', external: ['electron'], outfile: path.join(directory, 'ui.js'), loader: { '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' } })
  fs.writeFileSync(path.join(directory, 'index.html'), '<meta charset="utf-8"><link rel="stylesheet" href="ui.css"><div id="root"></div><script src="ui.js"></script>')
  fs.writeFileSync(path.join(directory, 'main.cjs'), `
    const { app, BrowserWindow, ipcMain } = require('electron');
    const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict'), crypto = require('node:crypto');
    const root = ${JSON.stringify(root)}, dir = ${JSON.stringify(directory)};
    module.paths.push(path.join(root, 'node_modules'));
    const { NsisUpdater } = require('electron-updater');
    const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
    const { AppUpdateService } = require('./service.cjs');
    app.setPath('userData', path.join(dir, 'profile'));
    let downloads = 0, remoteVersion = '0.2.1', corrupt = false, signatureMismatch = false;
    const payload = Buffer.from('synthetic fixture - never executed');
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/latest.yml')) {
        const hash = crypto.createHash('sha512').update(corrupt ? Buffer.from('wrong') : payload).digest('base64');
        res.end('version: '+remoteVersion+'\\nfiles:\\n  - url: fixture.exe\\n    sha512: '+hash+'\\n    size: '+payload.length+'\\nreleaseDate: 2026-11-16T00:00:00.000Z\\nreleaseNotes: Note sintetiche\\n');
      } else if (req.url.startsWith('/fixture.exe')) { downloads++; res.end(payload) } else { res.statusCode=404; res.end() }
    });
    app.whenReady().then(async () => {
      await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
      const url = 'http://127.0.0.1:'+server.address().port;
      let count = 0;
      function create() {
        const home = path.join(dir, 'case-'+(++count)); fs.mkdirSync(home,{recursive:true});
        const config = path.join(home, 'app-update.yml'); fs.writeFileSync(config, 'updaterCacheDirName: fixture\\npublisherName: [Fixture]\\n');
        const adapter = { version:'0.2.0', name:'UpdateFixture', isPackaged:true, appUpdateConfigPath:config, userDataPath:home, baseCachePath:home, whenReady:async()=>{}, quit:()=>{throw Error('must not quit')}, relaunch:()=>{}, onQuit:()=>{throw Error('auto install must be disabled')} };
        const updater = new NsisUpdater({provider:'generic',url},adapter);
        updater.httpExecutor = new ElectronHttpExecutor(()=>{}); updater.disableDifferentialDownload=true;
        updater.setFeedURL({provider:'generic',url});
        updater.on('error', error => console.error('Fixture updater:', error.message));
        updater.verifyUpdateCodeSignature=async()=>signatureMismatch ? 'unexpected publisher' : null;
        let installs=0; updater.quitAndInstall=()=>{installs++};
        const service = new AppUpdateService(updater,'0.2.0',()=>{},async()=>{},()=>{},path.join(home,'receipt.json'));
        return {service, installed:()=>installs};
      }
      for (const version of ['0.2.0','0.1.9','0.3.0-beta.1']) {
        remoteVersion=version; const test=create(); await test.service.check(); assert.equal(test.service.getState().phase,'current',version);
      }
      remoteVersion='0.2.1'; const test=create(); await test.service.check(); assert.equal(test.service.getState().phase,'available'); assert.equal(downloads,0);
      await test.service.download(); assert.equal(test.service.getState().phase,'ready'); assert.equal(downloads,1); assert.equal(test.installed(),0);
      await test.service.install(); assert.equal(test.installed(),1);
      corrupt=true; const bad=create(); await bad.service.check(); await bad.service.download(); assert.equal(bad.service.getState().phase,'available'); assert.equal(bad.installed(),0);
      corrupt=false; signatureMismatch=true; const signed=create(); await signed.service.check(); await signed.service.download(); assert.equal(signed.service.getState().phase,'available'); assert.equal(signed.installed(),0);
      console.log('PASS real electron-updater: equal/older/prerelease, consent, download hash, rejected publisher, explicit install handoff');
      server.close();
      const win = new BrowserWindow({show:false,width:1000,height:800,webPreferences:{nodeIntegration:true,contextIsolation:false,backgroundThrottling:false}});
      ipcMain.handle('update-test:screenshot',async()=>{ fs.mkdirSync(path.dirname(${JSON.stringify(screenshot)}),{recursive:true}); fs.writeFileSync(${JSON.stringify(screenshot)},(await win.webContents.capturePage()).toPNG()) });
      ipcMain.on('update-test:done',(_,message)=>{console.log(message);app.exit(message.startsWith('PASS')?0:1)});
      await win.loadFile(path.join(dir,'index.html'));
    }).catch(error=>{console.error(error);server.close();app.exit(1)});
    setTimeout(()=>{console.error('Updater regression timeout');app.exit(1)},90000);
  `)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [path.join(directory, 'main.cjs')], { env, encoding: 'utf8', windowsHide: true, timeout: 100000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unexpected temporary directory')
  fs.rmSync(directory, { recursive: true, force: true })
}
