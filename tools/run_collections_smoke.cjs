// Exercise the compiled application, real preload and guarded IPC in an isolated profile.
const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { join, resolve, basename } = require('node:path')
const { tmpdir } = require('node:os')
const { pathToFileURL } = require('node:url')
const { spawnSync } = require('node:child_process')
const directory = mkdtempSync(join(tmpdir(), 'lezionify-collections-smoke-'))
const repository = resolve(__dirname, '..')
try {
  const profile = join(directory, 'profile')
  mkdirSync(profile)
  const source = join(directory, 'synthetic.txt')
  writeFileSync(source, 'Una esperienza concreta viene raccontata insieme a una riflessione. Nessun contenuto personale.')
  writeFileSync(join(directory, 'main.cjs'), `
    const { app, dialog, BrowserWindow } = require('electron');
    app.setAppPath(${JSON.stringify(repository)});
    app.setPath('userData', ${JSON.stringify(profile)});
    app.setPath('sessionData', ${JSON.stringify(profile)});
    dialog.showOpenDialog = async options => options?.title === 'Aggiungi contenuti ad Altro'
      ? {canceled:false,filePaths:[${JSON.stringify(source)}]} : {canceled:true,filePaths:[]};
    dialog.showErrorBox = (_title, _message) => { console.error('FAIL: application startup'); app.exit(1) };
    const timer = setTimeout(()=>{console.error('FAIL: collections smoke timeout');app.exit(1)},45000);
    app.on('browser-window-created', (_event, window) => {
      window.webContents.once('did-finish-load', async () => {
        try {
          await window.webContents.executeJavaScript('new Promise(resolve=>setTimeout(resolve,700))');
          await window.webContents.executeJavaScript(${JSON.stringify(`(async()=>{
            const assert=(ok,message)=>{if(!ok)throw Error(message)};
            const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
            assert(window.collections,'Collections preload absent');
            const settings=await window.archive.getSettings();
            assert(!settings.apiKeys.length && !settings.apiKey,'Smoke profile must not contain credentials');
            const start=await window.collections.state();
            assert(!start.items.length,'Smoke profile must be empty');
            const collection=await window.collections.saveCollection({name:'Raccolta smoke',mode:'podcast',instructions:'Conserva gli esempi.',archived:false});
            const selection=await window.collections.selectFiles();
            const imported=await window.collections.importFiles({token:selection.token,fileIds:selection.files.map(f=>f.id),collectionId:collection.id,grouped:false,title:'Episodio smoke',recordedAt:null,sourceUrl:'',mode:null,instructions:null});
            await window.collections.process([imported.items[0].id],false);
            for(let i=0;i<60;i++){if(!(await window.collections.state()).busy)break;await pause(100)}
            const read=await window.collections.read(imported.items[0].id);
            assert(read.transcript.includes('esperienza concreta'),'Imported text missing');
            assert(!read.generations.length,'Text-only processing must not invoke AI');
            assert(!(await window.archive.listLectures()).length,'Collections leaked into course archive');
            const toggle=document.querySelector('button[aria-label="Altro"]');
            assert(toggle && toggle.getAttribute('aria-expanded')==='false','Altro not initially collapsed');
            toggle.click();await pause(300);
            const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Raccolta smoke');
            assert(button,'Collection navigation missing');button.click();
            for(let i=0;i<60;i++){if(document.querySelector('.collection-item'))break;await pause(100)}
            assert(document.querySelector('.collections-workspace h1')?.textContent==='Raccolta smoke','App navigation not connected');
            document.querySelector('.collection-item').click();await pause(400);
            const transcript=[...document.querySelectorAll('.collections-tabs button')].find(b=>b.textContent==='Trascrizione');
            assert(transcript,'Reader not connected');transcript.click();await pause(150);
            assert(document.querySelector('.collection-transcript')?.textContent.includes('esperienza concreta'),'Compiled reader lost transcript');
            await window.collections.updateItem(imported.items[0].id,{title:'Titolo modificato',recordedAt:null,sourceUrl:'',mode:'conference',instructions:''});
            assert((await window.collections.read(imported.items[0].id)).item.instructions==='','Empty instruction override lost in IPC');
            let refused=false;try{await window.collections.read('../outside')}catch{refused=true}
            assert(refused,'IPC accepted invalid content ID');
            return true;
          })()`)});
          clearTimeout(timer); console.log('PASS: compiled app, preload, guarded collections IPC, native selection, local text import, navigation, reader and course isolation');
          app.exit(0);
        } catch { console.error('FAIL: compiled collections smoke'); app.exit(1) }
      });
    });
    import(${JSON.stringify(pathToFileURL(join(repository, 'out/main/index.js')).href)}).catch(()=>{console.error('FAIL: compiled application import');app.exit(1)});
  `)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.ELECTRON_RENDERER_URL
  const result = spawnSync(require('electron'), [join(directory, 'main.cjs')], { env, encoding: 'utf8', windowsHide: true, timeout: 55000 })
  // The app may emit local hardware diagnostics; report only test outcome lines.
  const outcomes = (result.stdout || '').split(/\r?\n/).filter(line => /^(PASS|FAIL):/.test(line))
  process.stdout.write(outcomes.join('\n') + '\n')
  if (result.error) process.stderr.write('FAIL: unable to launch compiled app smoke\n')
  process.exitCode = result.status ?? 1
} finally {
  if (!basename(directory).startsWith('lezionify-collections-smoke-') || resolve(directory) === resolve(tmpdir())) throw Error('Unsafe cleanup target')
  rmSync(directory, { recursive: true, force: true })
}
