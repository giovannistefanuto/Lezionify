/** Synthetic research only. Dependencies/models live in ignored local-artifacts. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { syncBuiltinESMExports } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, 'local-artifacts/offline-translation')
const models = [
  { direction: 'en-it', id: 'Xenova/opus-mt-en-it', revision: '075406e3c8c2c30634d4a1bd8f00c21d9e162011' },
  { direction: 'it-en', id: 'Xenova/opus-mt-it-en', revision: 'fd0b89b9c052adc1f2f64152f555aa17353728be' }
]
const files = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const mode = process.argv[2]
if (!['--prepare', '--offline'].includes(mode) || process.argv.length !== 3) throw new Error('Use --prepare (download public models) or --offline (synthetic CPU pilot).')
await mkdir(base, { recursive: true })

if (mode === '--prepare') {
  const manifest = { created: new Date().toISOString(), models: [] }
  for (const model of models) {
    const metadata = await (await fetch(`https://huggingface.co/api/models/${model.id}/revision/${model.revision}?blobs=true`)).json()
    if (metadata.sha !== model.revision) throw new Error('Unexpected model revision.')
    const record = { ...model, files: [] }
    for (const name of files) {
      const info = metadata.siblings.find(file => file.rfilename === name)
      if (!info) throw new Error('Missing expected model file.')
      const path = resolve(base, 'models', model.id, name)
      let bytes
      try { bytes = await readFile(path) } catch { /* Download only absent files. */ }
      if (!bytes || bytes.length !== info.size || (info.lfs && sha(bytes) !== info.lfs.sha256)) {
        const response = await fetch(`https://huggingface.co/${model.id}/resolve/${model.revision}/${name}`, { signal: AbortSignal.timeout(180_000) })
        if (!response.ok) throw new Error(`Model download failed: HTTP ${response.status}.`)
        bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length !== info.size || (info.lfs && sha(bytes) !== info.lfs.sha256)) throw new Error('Model integrity check failed.')
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, bytes)
      }
      record.files.push({ name, bytes: bytes.length, sha256: sha(bytes), upstreamLfsSha256: info.lfs?.sha256 ?? null })
      console.log(JSON.stringify({ downloaded: model.direction, file: name, bytes: bytes.length }))
    }
    manifest.models.push(record)
  }
  await writeFile(resolve(base, 'model-manifest.json'), JSON.stringify(manifest, null, 2))
} else {
  const manifest = JSON.parse(await readFile(resolve(base, 'model-manifest.json'), 'utf8'))
  for (const model of models) {
    const record = manifest.models.find(item => item.id === model.id && item.revision === model.revision)
    if (!record || record.files.length !== files.length) throw new Error('Model manifest mismatch.')
    for (const name of files) {
      const info = record.files.find(item => item.name === name)
      const bytes = await readFile(resolve(base, 'models', model.id, name))
      if (!info || bytes.length !== info.bytes || sha(bytes) !== info.sha256) throw new Error('Local model integrity check failed.')
    }
  }
  let networkAttempts = 0
  const block = () => { networkAttempts++; throw new Error('Network disabled for offline pilot.') }
  globalThis.fetch = block
  http.request = http.get = https.request = https.get = block
  net.connect = net.createConnection = tls.connect = block
  net.Socket.prototype.connect = block
  syncBuiltinESMExports()
  try { await fetch('https://example.invalid') } catch { /* Verify JS network guard. */ }
  if (networkAttempts !== 1) throw new Error('Network guard probe failed.')
  networkAttempts = 0
  const { pipeline, env } = await import(pathToFileURL(resolve(base, 'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href)
  env.allowRemoteModels = false
  env.allowLocalModels = true
  env.localModelPath = resolve(base, 'models')
  env.useFSCache = false
  const fixtureBytes = await readFile(resolve(root, 'tests/fixtures/offline-translation/cases.json'))
  const cases = JSON.parse(fixtureBytes)
  const report = {
    created: new Date().toISOString(), node: process.version, platform: process.platform,
    fixtureSha256: sha(fixtureBytes), runnerSha256: sha(await readFile(fileURLToPath(import.meta.url))),
    transformers: JSON.parse(await readFile(resolve(base, 'node_modules/@huggingface/transformers/package.json'), 'utf8')).version,
    onnxruntime: JSON.parse(await readFile(resolve(base, 'node_modules/onnxruntime-node/package.json'), 'utf8')).version,
    device: 'cpu', dtype: 'q8', threads: 4, generation: { max_new_tokens: 192, num_beams: 1, do_sample: false },
    networkGuard: 'JS fetch/http/https/net/tls blocked; not an OS firewall or native network audit',
    manifest, models: [], results: []
  }
  const output = resolve(base, `pilot-${Date.now()}.json`)
  const save = () => writeFile(output, JSON.stringify(report, null, 2))
  let peakRss = process.memoryUsage().rss
  const timer = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss) }, 25)
  try {
    for (const model of models) {
      const before = process.memoryUsage().rss
      const start = performance.now()
      const translator = await pipeline('translation', model.id, { local_files_only: true, dtype: 'q8', device: 'cpu', session_options: { intraOpNumThreads: 4, interOpNumThreads: 1 } })
      const info = { ...model, loadMs: performance.now() - start, rssBefore: before, rssAfter: process.memoryUsage().rss }
      report.models.push(info)
      for (let repeat = 0; repeat < 3; repeat++) {
        for (const item of cases.filter(item => item.direction === model.direction)) {
          const tokens = translator.tokenizer(item.text).input_ids.dims.at(-1)
          if (tokens > 256) throw new Error('Synthetic input exceeds pilot token limit.')
          const started = performance.now()
          const result = await translator(item.text, report.generation)
          const row = { id: item.id, direction: item.direction, repeat, text: item.text, check: item.check, inputTokens: tokens, latencyMs: performance.now() - started, translation: result[0].translation_text }
          report.results.push(row)
          console.log(JSON.stringify({ id: row.id, repeat, ms: Math.round(row.latencyMs), translation: row.translation }))
          await save()
        }
      }
      await translator.dispose()
    }
    report.networkAttemptsDuringInference = networkAttempts
    report.sampledPeakRssBytes = Math.max(peakRss, process.memoryUsage().rss)
    report.complete = true
    if (networkAttempts) throw new Error('An inference dependency attempted network access.')
  } finally {
    clearInterval(timer)
    await save()
  }
  console.log(JSON.stringify({ report: output, complete: report.complete, networkAttempts, peakMiB: Math.round(report.sampledPeakRssBytes / 2 ** 20) }))
}
