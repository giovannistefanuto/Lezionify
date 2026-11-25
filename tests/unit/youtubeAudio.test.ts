import { expect, it, vi } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { YoutubeAudioService, runYoutubeTool, type YoutubeToolRunner } from '../../electron/main/youtubeAudio'
import { getFfmpegPath } from '../../electron/main/ffmpegPath'
const id = 'mdJU5ogrPMY'
const resolveTools = async () => ({ ytdlp: 'download-fixture', deno: 'runtime-fixture' })
async function settled(service: YoutubeAudioService) {
  for (let n=0;n<200;n++) { const status=await service.status(); if (!status.some(item=>['downloading','converting'].includes(item.phase))) return status; await new Promise(resolve=>setTimeout(resolve,5)) }
  throw new Error('Download did not finish')
}
function fakeRunner(): YoutubeToolRunner {
  return async (exe,args,signal,line) => {
    signal.throwIfAborted()
    if (exe==='download-fixture') { await writeFile(args[args.indexOf('-o')+1].replace('%(ext)s','m4a'),'original audio'); line('YT:100:100'); return }
    if (args.includes('libmp3lame')) { await writeFile(args.at(-1)!, 'derived mp3'); return }
    line('out_time_us=1000000')
  }
}
it('scarica una compilation per tutti i timestamp, conserva la fonte e riconosce file integri al riavvio', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-local-')), run=vi.fn(fakeRunner())
  try {
    const service=new YoutubeAudioService(root,'unused',()=> 'ffmpeg-fixture',run,[id],resolveTools)
    expect((await service.status())[0].phase).toBe('missing')
    await expect(service.playbackUrl(id)).rejects.toThrow('non disponibile')
    await service.download(id)
    expect((await settled(service))[0]).toMatchObject({ phase:'ready',durationSeconds:1 })
    expect(await service.playbackUrl(id)).toBe(`media://youtube/${id}`)
    const audio=await service.audioPath(id)
    expect(await readFile(audio!,'utf8')).toBe('derived mp3')
    const record=JSON.parse(await readFile(join(root,`${id}.json`),'utf8'))
    expect(await readFile(join(root,record.directory,record.original),'utf8')).toBe('original audio')
    await service.download(id)
    expect(run).toHaveBeenCalledTimes(3)
    const restarted=new YoutubeAudioService(root,'unused',()=> 'ffmpeg-fixture',run,[id],resolveTools)
    expect((await restarted.status())[0].phase).toBe('ready')
    await writeFile(audio!,'corrupted')
    expect((await restarted.status())[0].phase).toBe('missing')
    await restarted.download(id); await settled(restarted)
    expect((await restarted.status())[0].phase).toBe('ready')
    expect(await readFile(join(root,record.directory,record.original),'utf8')).toBe('original audio')
  } finally { await rm(root,{recursive:true,force:true}) }
})
it('annulla e drena il processo prima di rimuovere lo staging, senza pubblicare file parziali', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-cancel-')); let started!:()=>void
  const ready=new Promise<void>(resolve=>{started=resolve})
  const run:YoutubeToolRunner=async (_exe,args,signal)=>{
    await writeFile(args[args.indexOf('-o')+1].replace('%(ext)s','m4a'),'partial'); started()
    await new Promise<void>(resolve=>signal.addEventListener('abort',()=>setTimeout(resolve,15),{once:true}))
    signal.throwIfAborted()
  }
  try {
    const service=new YoutubeAudioService(root,'unused',()=> 'ffmpeg-fixture',run,[id,'VB0xl9tem9o'],resolveTools)
    await service.download(id); await ready
    await expect(service.download('VB0xl9tem9o')).rejects.toThrow('già in corso')
    await service.cancel(id)
    expect(await readdir(root)).toEqual([])
    expect((await service.status())[0].phase).toBe('missing')
    expect(service.isBusy()).toBe(false)
  } finally { await rm(root,{recursive:true,force:true}) }
})
it('rifiuta ID estranei e strumenti alterati senza eseguire programmi', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-invalid-')),run=vi.fn(fakeRunner())
  try {
    const service=new YoutubeAudioService(root,root,()=> 'ffmpeg-fixture',run,[id])
    await expect(service.download('../anything')).rejects.toThrow('non valida')
    await expect(service.download('BaW_jenozKc')).rejects.toThrow('non valida')
    await writeFile(join(root,'yt-dlp.exe'),'tampered')
    await service.download(id)
    expect((await settled(service))[0].phase).toBe('error')
    expect(run).not.toHaveBeenCalled()
  } finally { await rm(root,{recursive:true,force:true}) }
})
it('verifica con FFmpeg reale che l’MP3 derivato sia decodificabile e abbia durata positiva', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-ffmpeg-')), ffmpeg=getFfmpegPath()
  const run:YoutubeToolRunner=async (exe,args,signal,line)=>{
    if(exe==='download-fixture') return runYoutubeTool(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','0.25','-c:a','aac',args[args.indexOf('-o')+1].replace('%(ext)s','m4a')],signal,line)
    return runYoutubeTool(exe,args,signal,line)
  }
  try {
    const service=new YoutubeAudioService(root,'unused',()=>ffmpeg,run,[id],resolveTools)
    await service.download(id)
    expect((await settled(service))[0]).toMatchObject({phase:'ready'})
    expect((await service.status())[0].durationSeconds).toBeGreaterThan(0.2)
  } finally { await rm(root,{recursive:true,force:true}) }
})
it('non serve registri manipolati che puntano a junction esterne', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-path-')), outside=await mkdtemp(join(tmpdir(),'youtube-outside-'))
  try {
    const service=new YoutubeAudioService(root,'unused',()=> 'ffmpeg-fixture',fakeRunner(),[id],resolveTools)
    await service.download(id); await settled(service)
    const marker=join(root,`${id}.json`),record=JSON.parse(await readFile(marker,'utf8'))
    const link=`${id}-11111111-1111-1111-1111-111111111111`
    await symlink(outside,join(root,link),'junction')
    record.directory=link; await writeFile(marker,JSON.stringify(record))
    expect(await service.audioPath(id)).toBeNull()
  } finally { await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true}) }
})
it('un errore di conversione non sostituisce l’originale e rimane ritentabile', async () => {
  const root=await mkdtemp(join(tmpdir(),'youtube-error-'))
  const base=fakeRunner()
  try {
    const run:YoutubeToolRunner=async(exe,args,signal,line)=>{ if(args.includes('libmp3lame'))throw new Error('Conversione non riuscita.'); return base(exe,args,signal,line) }
    const service=new YoutubeAudioService(root,'unused',()=> 'ffmpeg-fixture',run,[id],resolveTools)
    await service.download(id)
    expect((await settled(service))[0]).toMatchObject({phase:'error',error:'Conversione non riuscita.'})
    expect(await service.audioPath(id)).toBeNull()
    const preserved=await readdir(root)
    expect(preserved).toHaveLength(1)
    expect(await readFile(join(root,preserved[0],'source.m4a'),'utf8')).toBe('original audio')
  } finally { await rm(root,{recursive:true,force:true}) }
})

it('interrompe il processo reale e su Windows termina anche i figli prima di confermare annullamento', async () => {
  const controller=new AbortController()
  let descendant=0
  const script=process.platform==='win32'
    ? "const child=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log('READY:'+child.pid);setInterval(()=>{},1000)"
    : "console.log('READY:0');setInterval(()=>{},1000)"
  const guard=setTimeout(()=>controller.abort(),5000)
  try {
    await expect(runYoutubeTool(process.execPath,['-e',script],controller.signal,line=>{
      const match=/^READY:(\d+)$/.exec(line);if(match){descendant=Number(match[1]);controller.abort()}
    })).rejects.toThrow()
    expect(controller.signal.aborted).toBe(true)
    if(descendant) expect(()=>process.kill(descendant,0)).toThrow()
  } finally {
    clearTimeout(guard)
    if(descendant){try{process.kill(descendant)}catch{/* Already terminated by the process tree guard. */}}
  }
})
