import React, { act, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { useStudyTracker } from '../../src/hooks/useStudyTracker'
import { useStudyEstimate } from '../../src/hooks/useStudyEstimate'
import { useLectureContent } from '../../src/hooks/useLectureContent'
import { StudyDayTimeline } from '../../src/components/StudyDayTimeline'
import { getStudyHistoryClient } from '../../src/utils/studyHistoryClient'
import { studyDayBounds } from '../../shared/studyHistory'

declare const require: any
export async function runStudyHistoryScenarios(root: Root, api: any) {
  const ipc = require('electron').ipcRenderer
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const previous = { ...api }, stored = { ...localStorage }
  const originalNow = Date.now, originalFocus = document.hasFocus, originalInterval = window.setInterval, originalClear = window.clearInterval
  const performanceDescriptor = Object.getOwnPropertyDescriptor(performance,'now'), hiddenDescriptor = Object.getOwnPropertyDescriptor(document,'hidden')
  const style = document.createElement('style'); style.textContent = await ipc.invoke('video-import-styles'); document.head.append(style)
  const timers = new Map<number,()=>void>(); let next = 0, now = Date.parse('2026-11-09T09:00:00Z'), tracker: any, estimate: any, content: any
  const noop = () => {}
  const source = '# Studio sintetico\n\n' + 'Concetti e parole della lezione.\n\n'.repeat(20)
  const lecture: any = { id:'history-integration', courseCode:'TEST', studyStatus:'in-corso', markdownFileName:'synthetic.md' }
  const render = async (node: React.ReactNode) => act(async()=>root.render(node))
  const until = async (condition:()=>boolean, message:string) => {
    for(let i=0;i<80;i++) { if(condition())return; await act(async()=>{await new Promise(r=>setTimeout(r,40))}) }
    throw new Error(message)
  }
  function Harness({memo=false}:{memo?:boolean}) {
    const ref=useRef<HTMLDivElement>(null)
    tracker=useStudyTracker({activeLectureId:lecture.id,courseCode:'TEST',isFocusMode:true,activeTab:'markdown',isEnabled:true,suspended:memo})
    estimate=useStudyEstimate({lectureId:lecture.id,markdown:source,enabled:true,paused:tracker.trackingPaused,language:'it',rootRef:ref,managedActivity:true})
    content=useLectureContent({selectedLecture:lecture,onRefreshLibrary:async()=>{},onUpdateLectureInState:noop,onNotice:noop,onClearSelectedLecture:noop})
    return <><div data-history-root ref={ref} style={{height:200,overflow:'auto'}}><div className="markdown-body">{Array.from({length:20},(_,i)=><p key={i} style={{height:200,margin:0}}>Paragrafo {i}. {'Studio sintetico di parole. '.repeat(20)}</p>)}</div></div><div className="focus-qna-column" tabIndex={0}>Q&amp;A</div></>
  }
  const tick = async (seconds:number) => {
    for(let i=0;i<seconds;i++) await act(async()=>{now+=1000;for(const cb of [...timers.values()])cb()})
    await act(async()=>{await getStudyHistoryClient(lecture.id)?.flush()})
  }
  try {
    localStorage.clear()
    localStorage.setItem('lezionify.paragraph-samples.v1',JSON.stringify(['A','B'].map(document=>({document,day:'2026-11-01',words:100,numbers:0,formulas:0,seconds:60}))))
    api.saveStudyObservations=(batch:any)=>ipc.invoke('study-test-observe',batch)
    api.recordStudyPrediction=(request:any)=>ipc.invoke('study-test-predict',request)
    api.resetStudyForecast=(id:string,sessionId:string)=>ipc.invoke('study-test-reset',id,sessionId)
    api.importLegacyStudyForecast=(data:any)=>ipc.invoke('study-test-legacy',data)
    api.getStudyDay=(date:string,filter:any)=>ipc.invoke('study-test-day',date,filter)
    api.updateLecture=(id:string,updates:any)=>ipc.invoke('study-test-complete',id,updates.studyCheckpoint)
    api.readMarkdown=async()=>source;api.readMarkdownEn=async()=>null;api.readTranscript=async()=>'';api.readStudySet=async()=>null
    api.getLectureStudySeconds=async()=>0
    Date.now=()=>now;document.hasFocus=()=>true
    Object.defineProperty(performance,'now',{configurable:true,value:()=>now-Date.parse('2026-11-09T09:00:00Z')})
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>false})
    window.setInterval=((cb:()=>void)=>{timers.set(++next,cb);return next}) as typeof window.setInterval
    window.clearInterval=id=>{timers.delete(id)}
    await render(<Harness />)
    await tick(10)
    let day=await api.getStudyDay('2026-11-09')
    check(tracker.activeSeconds===10 && day.creditedSeconds===10,'Journal and Focus clock disagree')
    await render(<Harness memo />);await tick(5)
    const translator=document.createElement('div');translator.setAttribute('data-dictionary-overlay','');document.body.append(translator)
    await render(<Harness />);await tick(5)
    await act(async()=>translator.remove())
    await tick(2)
    await act(async()=>document.querySelector('.focus-qna-column')!.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})))
    await tick(8)
    check(tracker.activeSeconds===20,'Tools counted study or Q&A did not count')
    await act(async()=>document.dispatchEvent(new CustomEvent('study-system-state',{detail:{reason:'locked',active:true}})))
    await tick(5)
    await act(async()=>document.dispatchEvent(new CustomEvent('study-system-state',{detail:{reason:'locked',active:false}})))
    await tick(5)
    check(tracker.activeSeconds===25,'Lock state counted time or failed to resume')
    const scroller=document.querySelector<HTMLElement>('[data-history-root]')!
    scroller.scrollTop=scroller.scrollHeight
    await act(async()=>scroller.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})))
    await tick(1)
    await until(()=>Boolean(estimate.uncertainty),'Forecast result was not returned from main')
    day=await api.getStudyDay('2026-11-09')
    check(day.creditedSeconds===26 && day.interruptions.some((r:any)=>r.reason.includes('translator')) && day.interruptions.some((r:any)=>r.reason.includes('locked')),'Timeline lost exclusions or credited seconds')
    check(day.interruptions.find((r:any)=>r.reason==='translator')?.seconds===5,'Translator boundary drifted between heartbeats')
    check(day.segments.some((s:any)=>s.activity==='qna' && s.creditedSeconds>0),'Q&A attribution missing from durable journal')
    await act(async()=>{check(await content.handleStudyStatusChange('completata'),'Completion command failed')})
    await render(null); await getStudyHistoryClient(lecture.id)?.flush()
    await ipc.invoke('study-test-restart')
    day=await api.getStudyDay('2026-11-09')
    check(day.forecasts.some((p:any)=>typeof p.actual==='number'),'Production completion flow did not create a recoverable outcome')
    Date.now=originalNow;window.setInterval=originalInterval;window.clearInterval=originalClear
    if(performanceDescriptor)Object.defineProperty(performance,'now',performanceDescriptor);else Reflect.deleteProperty(performance,'now')
    const start='2026-11-09T09:00:00Z'
    await ipc.invoke('study-test-seed',[
      {id:'legacy-history',lectureId:null,courseCode:'TEST',startTime:start,endTime:'2026-11-09T10:00:00Z',durationSeconds:1800,mode:'focus',date:'2026-11-09'},
      {id:'repetition-reading:synthetic',lectureId:null,courseCode:'TEST',startTime:start,endTime:start,durationSeconds:900,mode:'manual',date:'2026-11-09'},
      {id:'declared-history',lectureId:null,courseCode:'TEST',startTime:'2026-11-09T10:15:00Z',endTime:'2026-11-09T10:45:00Z',durationSeconds:1800,mode:'manual',date:'2026-11-09',provenance:'manual',timingQuality:'declared'},
      {id:'repetition-audio:synthetic',lectureId:null,courseCode:'TEST',startTime:start,endTime:'2026-11-09T09:05:00Z',durationSeconds:300,mode:'manual',date:'2026-11-09',provenance:'repetition-audio',timingQuality:'observed'}])
    await render(<main style={{padding:20,maxWidth:1120,margin:'auto'}}><StudyDayTimeline courses={['TEST']} /></main>)
    const date=document.querySelector<HTMLInputElement>('.study-day-date input')!
    if(date.value!=='2026-11-09') await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(date,'2026-11-09');date.dispatchEvent(new Event('input',{bubbles:true}))})
    await until(()=>Boolean(document.querySelector('.study-day-chart')),'Timeline did not display durable history')
    check(document.body.textContent?.includes('RIPETERE · lettura stimata') && document.body.textContent?.includes('Storico senza dettaglio'),'Estimated and legacy credits were not distinguished')
    check(!document.querySelector('.study-day-bar.legacy-unlocated'),'Legacy credit invented a timed bar')
    await act(async()=>document.querySelector<HTMLElement>('.study-day-details summary')!.click())
    check(document.querySelector('table caption') && document.body.textContent?.includes('orario dichiarato'),'Accessible provenance table missing')
    await ipc.invoke('capture-video-import','oct28-history-light')
    document.documentElement.setAttribute('data-theme','dark');await ipc.invoke('capture-video-import','oct28-history-dark')
    await ipc.invoke('feature-test-window-size',{width:390,height:750});await act(async()=>{window.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,80))})
    check(document.querySelector('.study-day')!.getBoundingClientRect().right<=innerWidth,'Timeline overflows narrow window')
    await ipc.invoke('capture-video-import','oct28-history-narrow')
    await ipc.invoke('feature-test-window-size',{width:1240,height:820});await ipc.invoke('feature-test-zoom',2)
    await act(async()=>{window.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,80))})
    check(document.querySelector('.study-day')!.getBoundingClientRect().right<=innerWidth,'Timeline overflows at 200% zoom')
    await ipc.invoke('capture-video-import','oct28-history-zoom')
    const bounds=studyDayBounds('2026-10-25','Europe/Rome')
    check(bounds.end-bounds.start===25*3600000,'Full-day timeline assumes 24 hours at DST boundary')
    api.getStudyDay=async()=>{throw new Error('synthetic read error')}
    await act(async()=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Aggiorna')!.click())
    await until(()=>Boolean(document.querySelector('[role="alert"]')),'Read failure was displayed as a successful empty day')
  } finally {
    await render(null)
    Date.now=originalNow;document.hasFocus=originalFocus;window.setInterval=originalInterval;window.clearInterval=originalClear
    if(performanceDescriptor)Object.defineProperty(performance,'now',performanceDescriptor);else Reflect.deleteProperty(performance,'now')
    if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else Reflect.deleteProperty(document,'hidden')
    Object.keys(api).forEach(key=>{if(!Object.hasOwn(previous,key))delete api[key]});Object.assign(api,previous)
    localStorage.clear();for(const [key,value] of Object.entries(stored))localStorage.setItem(key,value)
    style.remove();document.documentElement.removeAttribute('data-theme')
    await ipc.invoke('feature-test-zoom',1);await ipc.invoke('feature-test-window-size',false)
  }
}
