// Production main/preload/renderer + real media protocol, isolated synthetic profile.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const repository = path.resolve(__dirname, '..')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lezionify-youtube-native-'))
const profile = path.join(directory, 'profile')
const artifacts = path.join(repository, 'local-artifacts/youtube-native')
fs.mkdirSync(artifacts, { recursive:true })
const id = 'mdJU5ogrPMY'
async function exercise() {
  const assert=(value,label)=>{if(!value)throw Error(label)}
  const wait=async(check,label)=>{for(let n=0;n<150;n++){const value=check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,60))}throw Error(label)}
  const api=window.archive.youtubeAudio
  assert((await api.status()).find(item=>item.videoId==='mdJU5ogrPMY')?.phase==='ready','Production IPC did not recognize fixture')
  assert(await api.playbackUrl('mdJU5ogrPMY')==='media://youtube/mdJU5ogrPMY','Production playback URL changed')
  const open=await wait(()=>document.querySelector('[aria-label="Apri musica e suoni"]'),'Music entry missing');open.click()
  const youtube=await wait(()=>[...document.querySelectorAll('.music-source-nav button')].find(button=>button.textContent.trim()==='YouTube'),'YouTube source missing');youtube.click()
  const local=await wait(()=>document.querySelector('.youtube-detail-heading .youtube-local-action:not(:disabled)'),'Local play missing');local.click()
  const audio=await wait(()=>document.querySelector('[aria-label="Lettore YouTube locale"]'),'Native audio missing')
  await wait(()=>audio.duration>600 && !audio.paused && audio.currentTime>0.1,'Native MP3 playback did not start')
  document.querySelectorAll('.youtube-track-row .youtube-local-action')[1].click()
  await wait(()=>audio.currentTime>=213 && audio.currentTime<218,'Native timestamp seek failed')
  document.querySelector('[aria-label="Chiudi musica"]').click()
  assert(!audio.paused,'Closing panel paused native playback')
  document.querySelector('[aria-label="Apri musica e suoni"]').click()
  await wait(()=>document.querySelector('[aria-label="Lettore YouTube locale"]')===audio,'Reopening replaced the audio element')
  window.dispatchEvent(new CustomEvent('lezionify:lecture-playback',{detail:{playing:true}}))
  assert(audio.paused,'Native music did not pause for lecture audio')
  window.dispatchEvent(new CustomEvent('lezionify:lecture-playback',{detail:{playing:false}}))
  return { productionIpc:true, range206:true, nativeMp3:true, duration:audio.duration, seek:true, survivesClosing:true, pausesForLecture:true }
}
try {
  const smoke=JSON.parse(fs.readFileSync(path.join(repository,'local-artifacts/youtube-audio-smoke/report.json'),'utf8'))
  const cache=path.join(profile,'youtube-audio'),fixtureDirectory=id+'-11111111-1111-1111-1111-111111111111'
  fs.mkdirSync(path.join(cache,fixtureDirectory),{recursive:true})
  for(const name of ['audio.mp3',smoke.recording.original])fs.copyFileSync(path.join(repository,'local-artifacts/youtube-audio-smoke/cache',smoke.recording.directory,name),path.join(cache,fixtureDirectory,name))
  fs.writeFileSync(path.join(cache,id+'.json'),JSON.stringify({...smoke.recording,videoId:id,directory:fixtureDirectory}))
  const launcher=path.join(directory,'main.cjs')
  fs.writeFileSync(launcher,`
    const { app, dialog } = require('electron')
    const fs=require('node:fs')
    app.setAppPath(${JSON.stringify(repository)})
    app.setPath('userData',${JSON.stringify(profile)})
    app.setPath('sessionData',${JSON.stringify(profile)})
    dialog.showErrorBox=()=>{console.error('Production app startup failed');app.exit(1)}
    setTimeout(()=>{console.error('Native YouTube test timed out');app.exit(1)},45000).unref()
    app.once('browser-window-created',(_event,win)=>{
      win.hide();win.webContents.setBackgroundThrottling(false)
      win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_info,callback)=>callback({cancel:true}))
      win.webContents.once('did-finish-load',async()=>{
        try{
          const response=await win.webContents.session.fetch('media://youtube/mdJU5ogrPMY',{headers:{Range:'bytes=0-127'}})
          if(response.status!==206 || (await response.arrayBuffer()).byteLength!==128)throw Error('Production media Range failed')
          const report=await win.webContents.executeJavaScript('('+${JSON.stringify(exercise.toString())}+')()',true)
          fs.writeFileSync(${JSON.stringify(path.join(artifacts,'report.json'))},JSON.stringify(report,null,2))
          console.log('PASS production YouTube IPC, media Range, native MP3, seek, close/reopen and lecture pause')
          app.exit(0)
        }catch(error){console.error(error.message);app.exit(1)}
      })
    })
    import(${JSON.stringify(require('node:url').pathToFileURL(path.join(repository,'out/main/index.js')).href)})
  `)
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE
  const result=spawnSync(require('electron'),[launcher],{env,windowsHide:true,encoding:'utf8',timeout:55000})
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exitCode=result.status??1
} finally {
  if(path.dirname(directory)!==path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('lezionify-youtube-native-'))throw Error('Unexpected temporary profile')
  fs.rmSync(directory,{recursive:true,force:true})
}
