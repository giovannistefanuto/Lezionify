import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { contentFingerprint } from '../../shared/contentFingerprint'
import type { StudyBatch } from '../../shared/studyHistory'

let root: string, archive: ArchiveService, lesson: string, fingerprint: string
const now=Date.parse('2026-11-09T09:00:00Z')
const batch=(seconds:number):StudyBatch=>({version:2,sessionId:'archive-clock',lectureId:lesson,courseCode:'A',timeZone:'Europe/Rome',eligible:true,fingerprint,
 observations:Array.from({length:seconds/10+1},(_,i)=>({sequence:i,at:new Date(now+i*10000).toISOString(),monotonicMs:i*10000,creditedSeconds:i*10,activity:'reading',exclusions:[],position:.95}))})
beforeEach(async()=>{
 root=await mkdtemp(join(tmpdir(),'lezionify-history-archive-'));await new LibraryRepository(root).initialize()
 archive=new ArchiveService(root,undefined,false)
 const file=join(root,'A 2026-1109-10-00-00.mp3');await writeFile(file,'synthetic audio')
 lesson=(await archive.importFiles([file])).imported[0].id
 await archive.saveMarkdown(lesson,'# Lezione sintetica\n\nContenuto locale per il collaudo.')
 const text=await archive.readMarkdown(lesson);fingerprint=`${contentFingerprint(text!)}:`
 await archive.saveStudyObservations(batch(60))
 await archive.recordStudyPrediction({lectureId:lesson,sessionId:'archive-clock',fingerprint,predicted:60,position:.7,language:'it',method:'paragraph-v2'})
 await archive.saveStudyObservations({...batch(120),observations:batch(120).observations.slice(7)})
})
afterEach(async()=>{vi.restoreAllMocks();archive.destroy();await rm(root,{recursive:true,force:true})})

test('all archive completion routes commit the source-checked outcome once and exclude current projected sessions',async()=>{
 expect(await archive.getLectureStudySeconds(lesson,'archive-clock')).toBe(0)
 const result=await archive.updateLecture(lesson,{studyStatus:'completata',studyCheckpoint:{sessionId:'archive-clock',sequence:12}})
 expect(result.studyCompletionOperationId).toBeTruthy()
 await archive.updateLecture(lesson,{studyStatus:'completata'})
 const day=await archive.getStudyDay('2026-11-09')
 expect(day.forecasts).toHaveLength(1);expect(day.forecasts[0].actual).toBe(60)
 expect(day.creditedSeconds).toBe(120)
 archive.destroy();archive=new ArchiveService(root,undefined,false)
 expect((await archive.getStudyDay('2026-11-09')).forecasts).toHaveLength(1)
 await archive.removeStudyTime(`lecture:${lesson}`,1)
 const corrected=await archive.getStudyDay('2026-11-09')
 expect(corrected.creditedSeconds).toBe(60);expect(corrected.forecasts[0].invalid).toBeTruthy()
})

test('failed library commit is retryable; changed source never generates an outcome for an old fingerprint',async()=>{
 vi.spyOn(LibraryRepository.prototype,'writeLibrary').mockRejectedValueOnce(new Error('synthetic metadata failure'))
 await expect(archive.updateLecture(lesson,{studyStatus:'completata',studyCheckpoint:{sessionId:'archive-clock',sequence:12}})).rejects.toThrow('synthetic metadata failure')
 expect((await archive.getStudyDay('2026-11-09')).forecasts[0].actual).toBeUndefined()
 await archive.saveMarkdown(lesson,'# Fonte modificata\n\nNuovo testo sintetico.')
 await archive.updateLecture(lesson,{studyStatus:'completata',studyCheckpoint:{sessionId:'archive-clock',sequence:12}})
 const saved=JSON.parse(await readFile(join(root,'study/forecasts/cases.json'),'utf8'))
 expect(saved).toEqual([])
})

test('manual declared intervals split at midnight while undated credits remain unlocated',async()=>{
 await archive.addManualStudyTime('A',30,'2026-11-09','23:50')
 await archive.addManualStudyTime('A',15,'2026-11-09')
 const first=await archive.getStudyDay('2026-11-09',{provenance:'manual'})
 const second=await archive.getStudyDay('2026-11-10',{provenance:'manual'})
 expect(first.creditedSeconds).toBe(1500);expect(first.unlocatedSeconds).toBe(900)
 expect(second.creditedSeconds).toBe(1200);expect(second.credits[0].quality).toBe('declared')
 expect(second.credits[0].start).toBeTruthy()
})
