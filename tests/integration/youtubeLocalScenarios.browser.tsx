import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import catalog from '../../shared/musicCatalog.json'
import { YoutubeLibrary } from '../../src/components/YoutubeLibrary'
import { pauseYoutubeAudio, youtubeAudioElement } from '../../src/utils/youtubePlayback'

declare const require: any
export async function runYoutubeLocalScenarios(root: Root, api: any) {
  const check=(value: unknown,message:string)=>{if(!value)throw new Error(message)}
  const flush=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))})
  const oldApi=api.youtubeAudio, savedSelection=localStorage.getItem('lezionify:music-youtube-selection:v1')
  const oldTracks=localStorage.getItem('lezionify:compilation-tracks:v1'),theme=document.documentElement.getAttribute('data-theme')
  const entry=catalog[0], id=entry.videoId
  let backend:any[]=[{videoId:id,phase:'missing'}],downloads=0,cancels=0
  const urls:string[]=[]
  const proto=HTMLMediaElement.prototype
  const keys=['src','duration','currentTime','paused','play','pause']
  const descriptors=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(proto,key)!]))
  const values=new WeakMap<HTMLMediaElement,{src:string;time:number;paused:boolean}>()
  const value=(element:HTMLMediaElement)=>{if(!values.has(element))values.set(element,{src:'',time:0,paused:true});return values.get(element)!}
  const style=document.createElement('style')
  style.textContent=await require('electron').ipcRenderer.invoke('video-import-styles');document.head.append(style)
  try {
    localStorage.removeItem('lezionify:compilation-tracks:v1');localStorage.setItem('lezionify:music-youtube-selection:v1',id)
    Object.defineProperties(proto,{
      src:{configurable:true,get(){return value(this).src},set(url:string){value(this).src=url;queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')))}},
      duration:{configurable:true,get(){return 10000}},
      currentTime:{configurable:true,get(){return value(this).time},set(time:number){value(this).time=time}},
      paused:{configurable:true,get(){return value(this).paused}},
      play:{configurable:true,value:function(){value(this).paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve()}},
      pause:{configurable:true,value:function(){value(this).paused=true;this.dispatchEvent(new Event('pause'))}}
    })
    api.youtubeAudio={status:async()=>structuredClone(backend),download:async(videoId:string)=>{check(videoId===id,'Wrong compilation download');downloads++;backend=[{videoId:id,phase:'downloading',progress:42}];return structuredClone(backend)},cancel:async()=>{cancels++;backend=[{videoId:id,phase:'missing'}];return structuredClone(backend)},playbackUrl:async(videoId:string)=>{urls.push(videoId);return `media://youtube/${videoId}`}}
    window.dispatchEvent(new CustomEvent('lezionify:lecture-playback',{detail:{playing:false}}))
    const render=()=>act(async()=>root.render(<div className="music-studio" style={{width:1000,padding:24,height:700,overflowY:'auto'}}><YoutubeLibrary /></div>))
    const button=(label:string)=>document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
    await render();await flush()
    check(downloads===0,'Opening YouTube must not download')
    check(document.querySelectorAll('.youtube-track-row .youtube-local-action').length===entry.tracks.length,'Every track needs a local action')
    await act(async()=>button(`Scarica in locale ${entry.title}`).click());await flush()
    check(document.body.textContent?.includes('Download 42%'),'Download progress missing')
    await act(async()=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent==='Annulla download')!.click());await flush()
    check(cancels===1 && downloads===1,'Cancellation did not reach service')
    await act(async()=>button(`Scarica in locale ${entry.title}`).click());await flush()
    backend=[{videoId:id,phase:'ready',durationSeconds:10000}]
    await act(async()=>window.dispatchEvent(new Event('focus')));await flush()
    check(button(`Riproduci in locale ${entry.title}`).textContent?.includes('Riproduci'),'Download action did not become Play')
    const track=entry.tracks[1]
    await act(async()=>button(`Riproduci in locale ${track.title}`).click());await flush()
    check(urls.length===1 && urls[0]===id && youtubeAudioElement().currentTime===track.start,'Local track must use one file and the correct timestamp')
    check(document.body.textContent?.includes('In riproduzione'),'Local player state missing')
    document.querySelector('.youtube-detail')!.scrollIntoView({block:'start'})
    const row=document.querySelector('.youtube-track-row')!, opening=row.querySelector('button')!, local=row.querySelector('.youtube-local-action')!
    check(opening.getBoundingClientRect().right<=local.getBoundingClientRect().left,'External and local actions overlap')
    for(const current of ['light','dark']) {document.documentElement.setAttribute('data-theme',current);await require('electron').ipcRenderer.invoke('capture-video-import',`youtube-local-${current}`)}
    const studio=document.querySelector<HTMLElement>('.music-studio')!;studio.style.width='520px'
    await require('electron').ipcRenderer.invoke('capture-video-import','youtube-local-narrow')
    await act(async()=>root.render(null));check(!youtubeAudioElement().paused,'Closing music must keep local playback alive')
    await render();await flush();check(document.body.textContent?.includes('In riproduzione'),'Reopening must retain local playback')
    await act(async()=>window.dispatchEvent(new CustomEvent('lezionify:lecture-playback',{detail:{playing:true}})));await flush()
    check(youtubeAudioElement().paused,'Lecture audio must pause local music')
    await act(async()=>button(`Riproduci in locale ${track.title}`).click());await flush()
    check(youtubeAudioElement().paused,'Local music must not restart over a playing lecture')
    await act(async()=>window.dispatchEvent(new CustomEvent('lezionify:lecture-playback',{detail:{playing:false}})))
    await act(async()=>button(`Riproduci in locale ${entry.title}`).click());await flush()
    await act(async()=>window.dispatchEvent(new CustomEvent('lezionify:background-playback',{detail:{source:'ambient'}})));await flush()
    check(youtubeAudioElement().paused,'Ambient playback must pause local YouTube')
    backend=[{videoId:id,phase:'ready',durationSeconds:60}]
    await act(async()=>window.dispatchEvent(new Event('focus')));await flush()
    const previousUrls=urls.length
    await act(async()=>button(`Riproduci in locale ${track.title}`).click());await flush()
    check(urls.length===previousUrls && [...document.querySelectorAll('[role="alert"]')].some(item=>item.textContent?.includes('supera la durata')),'Out of range timestamps must not play the end of the file')
    backend=[{videoId:id,phase:'missing'}]
    api.youtubeAudio.playbackUrl=async()=>{throw Error('Audio locale non disponibile.')}
    await act(async()=>button(`Riproduci in locale ${entry.title}`).click());await flush()
    check(Boolean(button(`Scarica in locale ${entry.title}`)),'A removed file must return to Download after a playback failure')
    backend=[{videoId:id,phase:'error',error:'Connessione non disponibile.'}]
    await act(async()=>window.dispatchEvent(new Event('focus')));await flush()
    check([...document.querySelectorAll('[role="alert"]')].some(item=>item.textContent?.includes('Connessione non disponibile')),'Download failure must be visible and retryable')
    check(Boolean(button(`Scarica in locale ${entry.title}`)),'Retry action missing')
    require('electron').ipcRenderer.send('test-checkpoint','YouTube local download, playback, timestamps, cancel, reopening and exclusions passed')
  } finally {
    await act(async()=>{pauseYoutubeAudio();root.render(null)})
    for(const key of keys) Object.defineProperty(proto,key,descriptors[key])
    api.youtubeAudio=oldApi;style.remove()
    for(const [key,saved] of [['lezionify:music-youtube-selection:v1',savedSelection],['lezionify:compilation-tracks:v1',oldTracks]]) {if(saved===null)localStorage.removeItem(key!);else localStorage.setItem(key!,saved!)}
    if(theme===null)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',theme)
  }
}
