import { afterEach, beforeEach, expect, test } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { StudyHistory } from '../../electron/main/studyHistory'
import { buildStudyDay, splitStudyInterval, studyCredit, type StudyBatch } from '../../shared/studyHistory'
import type { StudySession } from '../../shared/archive'

let root: string, history: StudyHistory, sessions: StudySession[], operations: Map<string, string>, failProjection: boolean
const start = Date.parse('2026-11-09T09:00:00Z')
const batch = (seconds = 30): StudyBatch => ({ version: 2, sessionId: 'session', lectureId: 'lesson', courseCode: 'TEST',
  timeZone: 'Europe/Rome', fingerprint: 'source', eligible: true,
  observations: Array.from({ length: seconds / 10 + 1 }, (_, i) => ({ sequence: i, at: new Date(start + i * 10_000).toISOString(),
    monotonicMs: i * 10_000, creditedSeconds: i * 10, activity: 'reading', exclusions: [], position: .95 })) })
function restart() {
  history = new StudyHistory(root, { readSessions: async () => structuredClone(sessions), writeSessions: async value => {
    if (failProjection) { failProjection = false; throw new Error('projection failed') }; sessions = value
  }, completionOperation: async lesson => operations.get(lesson) })
}
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'lezionify-history-')); sessions = []; operations = new Map(); failProjection = false; restart() })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

test('projects confirmed seconds once, preserves pauses and repairs a lost ACK/projection across restart', async () => {
  const input = batch()
  failProjection = true
  await expect(history.ingest(input)).rejects.toThrow('projection failed')
  restart()
  expect((await history.ingest(input)).seconds).toBe(30)
  await history.ingest(input)
  expect(sessions.reduce((n,s) => n + s.durationSeconds, 0)).toBe(30)
  const day = await history.getDay('2026-11-09', sessions, {}, [])
  expect(day.creditedSeconds).toBe(30)
  expect(day.observedSeconds).toBe(30)
  const pause = { ...input, observations: [{ sequence: 4, at: new Date(start + 31_000).toISOString(), monotonicMs: 31_000, creditedSeconds: 30, activity: 'reading' as const, exclusions: ['pause' as const] },
    { sequence: 5, at: new Date(start + 41_000).toISOString(), monotonicMs: 41_000, creditedSeconds: 30, activity: 'reading' as const, exclusions: ['pause' as const] }] }
  await history.ingest(pause)
  const paused = await history.getDay('2026-11-09', sessions, {}, [])
  expect(paused.creditedSeconds).toBe(30)
  expect(paused.interruptions.find(v=>v.reason==='pause')?.seconds).toBe(10)
})

test('splits credited seconds at midnight and on 23/25 hour calendar days', () => {
  const pieces = splitStudyInterval(Date.parse('2026-11-09T22:59:55Z'), Date.parse('2026-11-09T23:00:05Z'), 10, 'Europe/Rome')
  expect(pieces.map(p=>[p.date,p.seconds])).toEqual([['2026-11-09',5],['2026-11-10',5]])
  for (const [from,to,hours] of [['2026-03-28T23:00:00Z','2026-03-29T22:00:00Z',23],['2026-10-24T22:00:00Z','2026-10-25T23:00:00Z',25]] as const) {
    const day = splitStudyInterval(Date.parse(from),Date.parse(to),hours*3600,'Europe/Rome')
    expect(day).toHaveLength(1); expect(day[0].seconds).toBe(hours*3600)
  }
})

test('records both methods, seals only the acknowledged final counter and recovers after the metadata commit', async () => {
  await history.ingest(batch())
  const request = { lectureId: 'lesson', sessionId: 'session', fingerprint: 'source', predicted: 60, position: .5, language: 'it' as const }
  await history.recordPrediction({ ...request, method: 'viewport-v2' })
  await history.recordPrediction({ ...request, method: 'paragraph-v2' })
  await history.ingest({ ...batch(60), observations: batch(60).observations.slice(4) })
  const operation = await history.prepareCompletion('lesson', { sessionId: 'session', sequence: 6 })
  operations.set('lesson', operation!)
  restart(); await history.recover(); await history.recover()
  const cases = JSON.parse(await readFile(join(root,'study/forecasts/cases.json'),'utf8'))
  expect(cases).toHaveLength(2)
  expect(cases.map((c:any)=>c.actual)).toEqual([30,30])
  expect(cases.map((c:any)=>c.method)).toEqual(['viewport-v2','paragraph-v2'])
  expect(cases.every((c:any)=>c.lower === undefined)).toBe(true)
})

test('failed final save and unconfirmed sequence cannot create stale outcomes; aborted status can resume', async () => {
  await history.ingest(batch())
  await history.recordPrediction({ lectureId: 'lesson', sessionId: 'session', fingerprint:'source',predicted:60,position:.7,language:'it',method:'paragraph-v2' })
  const op = await history.prepareCompletion('lesson', { sessionId:'session', sequence: 6, failed:true })
  operations.set('lesson',op!); await history.finishCompletion('lesson',op)
  expect(JSON.parse(await readFile(join(root,'study/forecasts/cases.json'),'utf8'))).toEqual([])
  await history.reset('lesson','session')
  await history.recordPrediction({lectureId:'lesson',sessionId:'session',fingerprint:'source',predicted:60,position:.7,language:'it',method:'paragraph-v2'})
  await history.prepareCompletion('lesson',{sessionId:'session',sequence:3})
  // Library metadata was not committed: recovery must reopen, never finalize from its status alone.
  operations.clear(); await history.recover()
  await expect(history.recordPrediction({lectureId:'lesson',sessionId:'session',fingerprint:'source',predicted:60,position:.7,language:'it',method:'paragraph-v2'})).resolves.toBeDefined()
})

test('a correction excludes affected outcomes, preserves raw observations and is restart-safe', async () => {
  await history.ingest(batch())
  await history.recordPrediction({lectureId:'lesson',sessionId:'session',fingerprint:'source',predicted:60,position:.7,language:'it',method:'paragraph-v2'})
  const op = await history.prepareCompletion('lesson',{sessionId:'session',sequence:3})
  operations.set('lesson',op!); await history.finishCompletion('lesson',op)
  await history.invalidateSessions(['session'])
  const cases = JSON.parse(await readFile(join(root,'study/forecasts/cases.json'),'utf8'))
  expect(cases[0].invalid).toBe('Tempo rettificato.')
  restart(); expect((await history.getDay('2026-11-09',sessions,{},[])).segments).toHaveLength(3)
})

test('legacy credits and estimated reading have no fabricated interval; overlaps use a union', () => {
  const legacy: StudySession = {id:'old',lectureId:null,courseCode:'TEST',startTime:new Date(start).toISOString(),endTime:new Date(start+3600000).toISOString(),date:'2026-11-09',durationSeconds:1800,mode:'focus'}
  expect(studyCredit(legacy).start).toBeUndefined()
  const estimated = studyCredit({...legacy,id:'repetition-reading:abc',durationSeconds:900,mode:'manual'})
  expect(estimated.start).toBeUndefined()
  const day=buildStudyDay('2026-11-09','Europe/Rome',[],[studyCredit(legacy),estimated])
  expect(day.unlocatedSeconds).toBe(2700); expect(day.observedSeconds).toBe(0)
})

test('corrupt history remains an explicit error rather than an empty successful day', async () => {
  await history.ingest(batch())
  await writeFile(join(root,'study/forecasts/cases.json'),'{broken')
  await expect(history.getDay('2026-11-09',sessions,{},[])).rejects.toThrow()
})

test('native lock survives restart and overlays exclusions without duplicating study credit', async () => {
  await history.ingest(batch())
  await history.noteSystem('locked', true, start + 30000)
  restart()
  await history.noteSystem('locked', false, start + 60000)
  const day = await history.getDay('2026-11-09', sessions, {}, [])
  expect(day.creditedSeconds).toBe(30)
  expect(day.observedSeconds).toBe(30)
  expect(day.interruptions.find(i => i.reason === 'locked')).toEqual({ reason: 'locked', count: 1, seconds: 30 })
})

test('collects all twelve phase/language/method groups and keeps source revisions separate', async () => {
  await history.ingest(batch())
  const request = { lectureId: 'lesson', sessionId: 'session', fingerprint: 'source', predicted: 60 }
  for (const position of [.1,.5,.9]) for (const language of ['it','en'] as const) for (const method of ['paragraph-v2','viewport-v2'] as const)
    await history.recordPrediction({...request, position, language, method})
  const before = await history.getDay('2026-11-09',sessions,{},[])
  expect(before.forecasts).toHaveLength(12)
  await history.recordPrediction({...request,fingerprint:'revised',position:.1,language:'it',method:'paragraph-v2'})
  const after = await history.getDay('2026-11-09',sessions,{},[])
  expect(after.forecasts).toHaveLength(1)
})

test('overlapping exclusion causes each retain one continuous indicator', () => {
  const input = (id:string,a:number,b:number,exclusions:('memo'|'translator')[]) => ({id,sessionId:'s',lectureId:'l',courseCode:'TEST',date:'2026-11-09',timeZone:'Europe/Rome',start:new Date(start+a*1000).toISOString(),end:new Date(start+b*1000).toISOString(),creditedSeconds:0,activity:'reading' as const,exclusions})
  const day=buildStudyDay('2026-11-09','Europe/Rome',[input('a',0,10,['memo']),input('b',10,20,['memo','translator']),input('c',20,30,['translator'])],[])
  expect(day.interruptions).toEqual([{reason:'memo',count:1,seconds:20},{reason:'translator',count:1,seconds:20}])
})

test('recovered counters retain a durable notice and replay repairs projections without duplication', async () => {
  await history.ingest(batch())
  await history.ingest({...batch(60),observations:batch(60).observations.slice(4)})
  const { readdir } = await import('node:fs/promises')
  const state = (await readdir(join(root,'study/sessions'))).find(f=>f.endsWith('.json'))!
  await writeFile(join(root,'study/sessions',state),'{broken')
  restart(); await history.ingest(batch(60))
  restart()
  const day = await history.getDay('2026-11-09',sessions,{},[])
  expect(day.recovered).toBe(true)
  expect(day.creditedSeconds).toBe(60)
  expect(day.observedSeconds).toBe(60)
})

test('v2 calibration uses completed distinct lessons and freezes limits before the next outcome', async () => {
  async function open(index:number) {
    const input={...batch(30),lectureId:`calibration-${index}`,sessionId:`calibration-session-${index}`}
    await history.ingest({...input,observations:input.observations.slice(0,2).map(p=>({...p,position:.1}))})
    const prediction=await history.recordPrediction({lectureId:input.lectureId,sessionId:input.sessionId,fingerprint:'source',predicted:60,position:.1,language:'it',method:'paragraph-v2'})
    return {input,prediction}
  }
  async function finish(input:StudyBatch) {
    await history.ingest({...input,observations:input.observations.slice(2)})
    const operation=await history.prepareCompletion(input.lectureId,{sessionId:input.sessionId,sequence:3})
    operations.set(input.lectureId,operation!);await history.finishCompletion(input.lectureId,operation)
  }
  for(let i=0;i<20;i++) {
    const {input,prediction}=await open(i)
    expect(prediction.band.lessons).toBe(i)
    expect(prediction.band.margin).toBeNull()
    await finish(input)
  }
  const held=await open(20)
  expect(held.prediction.band.margin).toBe(40)
  expect(held.prediction.band.checked).toBe(0)
  await finish(held.input)
  restart()
  const next=await open(21)
  expect(next.prediction.band.checked).toBe(1)
  expect(next.prediction.band.covered).toBe(1)
  const cases=JSON.parse(await readFile(join(root,'study/forecasts/cases.json'),'utf8'))
  const saved=cases.find((c:any)=>c.lesson==='calibration-20')
  expect([saved.lower,saved.upper,saved.actual]).toEqual([20,100,20])
},20000)
