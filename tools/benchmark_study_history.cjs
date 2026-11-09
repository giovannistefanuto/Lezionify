/* Synthetic read benchmark: never opens the personal library. */
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { performance } = require('node:perf_hooks')
const { build } = require('esbuild')
async function main() {
  const root = await mkdtemp(join(tmpdir(), 'lezionify-history-benchmark-'))
  try {
    await build({ entryPoints: ['electron/main/studyHistory.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(root,'history.cjs') })
    const { StudyHistory } = require(join(root,'history.cjs'))
    const sessions = [], start = Date.parse('2026-05-14T08:00:00Z')
    let bytes = 0, files = 0
    for (let day=0;day<180;day++) {
      const at = start+day*86400000, date = new Date(at).toISOString().slice(0,10)
      const directory = join(root,'study','history',date)
      await mkdir(directory,{recursive:true})
      const count = day===179 ? 2160 : 180
      const spans = Array.from({length:count},(_,i)=>({id:`${day}:${i}`,sessionId:`session-${day}`,lectureId:'lesson',courseCode:'TEST',date,timeZone:'Europe/Rome',start:new Date(at+i*10000).toISOString(),end:new Date(at+(i+1)*10000).toISOString(),activity:i%3===0?'qna':'reading',creditedSeconds:i%10===0?0:10,exclusions:i%10===0?['memo']:[]}))
      for(let i=0;i<count;i+=32) {
        const text=JSON.stringify(spans.slice(i,i+32));bytes+=Buffer.byteLength(text);files++
        await writeFile(join(directory,(i/32).toString(16).padStart(4,'0')+'.json'),text)
      }
      sessions.push({id:`history:${day}`,lectureId:'lesson',courseCode:'TEST',date,startTime:new Date(at).toISOString(),endTime:new Date(at+count*10000).toISOString(),durationSeconds:count*9,mode:'focus',provenance:'focus-observed',timingQuality:'observed'})
    }
    const history = new StudyHistory(root,{readSessions:async()=>sessions,writeSessions:async()=>{},completionOperation:async()=>undefined})
    const date = new Date(start+179*86400000).toISOString().slice(0,10), times=[]
    for(let i=0;i<11;i++){const t=performance.now();const day=await history.getDay(date,sessions,{},[]);times.push(performance.now()-t);if(day.segments.length!==2160)throw Error('Incomplete fixture read')}
    const warm=times.slice(1).sort((a,b)=>a-b)
    const result={synthetic:true,days:180,files,bytes,intenseDaySegments:2160,coldMs:times[0],warmMedianMs:warm[5],warmMaxMs:warm.at(-1),budgetMs:300,passed:warm.at(-1)<300,retention:'No automatic deletion; measure before enabling compaction.'}
    const output=join('local-artifacts','study-history-2026-11-09');await mkdir(output,{recursive:true});await writeFile(join(output,'benchmark.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1
  } finally { await rm(root,{recursive:true,force:true}) }
}
main().catch(e=>{console.error(e);process.exitCode=1})
