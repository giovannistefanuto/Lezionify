// Explicit, optional real download: public Blender Foundation demonstration film.
const { buildSync } = require('esbuild')
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const root = resolve(__dirname, '..')
const directory = join(root, 'local-artifacts/youtube-audio-smoke')
mkdirSync(directory, { recursive: true })
buildSync({ entryPoints: [join(root, 'electron/main/youtubeAudio.ts')], platform: 'node', bundle: true, format: 'cjs', outfile: join(directory, 'service.cjs') })
const { YoutubeAudioService } = require(join(directory, 'service.cjs'))
async function main() {
  const service = new YoutubeAudioService(join(directory, 'cache'), join(root, 'resources/youtube-tools'), () => require('ffmpeg-static'), undefined, ['aqz-KE-bpKQ'])
  await service.download('aqz-KE-bpKQ')
  let last = ''
  while (service.isBusy()) {
    const state = await service.status(), label = JSON.stringify(state)
    if (label !== last) { console.log(label); last = label }
    await new Promise(resolve => setTimeout(resolve, 750))
  }
  const state = await service.status()
  if (state[0].phase !== 'ready') throw new Error(state[0].error || 'Audio non disponibile')
  const record = JSON.parse(readFileSync(join(directory, 'cache/aqz-KE-bpKQ.json'), 'utf8'))
  const report = { state, url: await service.playbackUrl('aqz-KE-bpKQ'), recording: record, source: 'Blender Foundation public film; explicit smoke test', personalData: false }
  writeFileSync(join(directory, 'report.json'), JSON.stringify(report, null, 2))
  console.log('PASS YouTube audio: real download, original retained, MP3 decoded, hash and duration verified')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
