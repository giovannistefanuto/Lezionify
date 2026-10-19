/** Synthetic Mozilla/Bergamot pilot with local assets, never app integration. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { Worker } from 'node:worker_threads'
import { performance } from 'node:perf_hooks'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, 'local-artifacts/offline-translation')
const pkg = resolve(base, 'bergamot/node_modules/@browsermt/bergamot-translator')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const mode = process.argv[2]
if (!['--prepare', '--offline'].includes(mode) || process.argv.length !== 3) throw new Error('Use --prepare or --offline.')
const registry = JSON.parse(await readFile(resolve(base, 'mozilla-models.json'), 'utf8'))
if (mode === '--prepare') {
  const manifest = { registryGenerated: registry.generated, models: [] }
  for (const direction of ['en-it', 'it-en']) {
    const record = registry.models[direction].find(model => model.releaseStatus === 'Release')
    const files = []
    for (const [kind, info] of Object.entries(record.files)) {
      const response = await fetch(`${registry.baseUrl}/${info.path}`, { signal: AbortSignal.timeout(120_000) })
      if (!response.ok) throw new Error('Mozilla model download failed.')
      const compressed = Buffer.from(await response.arrayBuffer())
      const bytes = gunzipSync(compressed)
      if (info.uncompressedHash && sha(bytes) !== info.uncompressedHash) throw new Error('Mozilla model integrity check failed.')
      const path = resolve(base, 'mozilla-assets', direction, `${kind}.bin`)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes)
      files.push({ kind, path: info.path, bytes: bytes.length, sha256: sha(bytes), compressedBytes: compressed.length })
      console.log(JSON.stringify({ direction, kind, bytes: bytes.length }))
    }
    manifest.models.push({ direction, architecture: record.architecture, releaseStatus: record.releaseStatus, files })
  }
  await writeFile(resolve(base, 'mozilla-manifest.json'), JSON.stringify(manifest, null, 2))
} else {
  const report = { created: new Date().toISOString(), node: process.version, mode, package: 'Bergamot 0.4.9', results: [], complete: false }
  const manifest = JSON.parse(await readFile(resolve(base, 'mozilla-manifest.json'), 'utf8'))
  report.manifest = manifest
  report.runnerSha256 = sha(await readFile(fileURLToPath(import.meta.url)))
  const output = resolve(base, `mozilla-pilot-${Date.now()}.json`)
  const workers = []
  let networkAttempts = 0
  globalThis.fetch = () => { networkAttempts++; throw new Error('Network disabled for Mozilla pilot.') }
  // Supply the CommonJS scope omitted from the published worker package. The
  // two local file URL adjustments also make paths with spaces work on Windows.
  const runtime = resolve(base, 'bergamot-runtime')
  await mkdir(resolve(runtime, 'worker'), { recursive: true })
  await writeFile(resolve(runtime, 'package.json'), '{"type":"module"}')
  await writeFile(resolve(runtime, 'worker/package.json'), '{"type":"commonjs"}')
  await copyFile(resolve(pkg, 'translator.js'), resolve(runtime, 'translator.js'))
  for (const name of ['bergamot-translator-worker.js', 'bergamot-translator-worker.wasm']) await copyFile(resolve(pkg, 'worker', name), resolve(runtime, 'worker', name))
  const original = await readFile(resolve(pkg, 'worker/translator-worker.js'), 'utf8')
  const patched = original.replace('readFile(url.pathname)', 'readFile(url)').replace('return new URL(`file://${__filename}`);', "return require('node:url').pathToFileURL(__filename);")
  report.workerCompatibilityChanges = ['CommonJS scope', 'fs readFile receives file URL', 'pathToFileURL for Windows']
  report.workerOriginalSha256 = sha(original)
  report.workerPatchedSha256 = sha(patched)
  await writeFile(resolve(runtime, 'worker/translator-worker.js'), patched)
  globalThis.Worker = class {
    constructor(url) {
      const bootstrap = `const { workerData } = require('node:worker_threads'); const block = () => { throw new Error('Network disabled in Mozilla worker.'); }; globalThis.fetch = block; for (const name of ['node:http','node:https']) { const api = require(name); api.request = api.get = block; } const net = require('node:net'); net.connect = net.createConnection = net.Socket.prototype.connect = block; require('node:tls').connect = block; require(workerData);`
      this.worker = new Worker(bootstrap, { eval: true, workerData: fileURLToPath(url) })
      workers.push(this.worker)
    }
    addEventListener(name, callback) { this.worker.on(name, data => callback({ data })) }
    postMessage(message) { this.worker.postMessage(message) }
    terminate() { return this.worker.terminate() }
  }
  globalThis.window = { Worker: globalThis.Worker }
  const bounded = async promise => {
    let timer
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Mozilla pilot operation timed out.')), 30_000) })]) }
    finally { clearTimeout(timer) }
  }
  let translator
  let peakRss = process.memoryUsage().rss
  const sampling = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss) }, 25)
  try {
    const { LatencyOptimisedTranslator, TranslatorBacking } = await import(pathToFileURL(resolve(runtime, 'translator.js')).href)
    class LocalBacking extends TranslatorBacking {
      async loadModelRegistery() { return [{ from: 'en', to: 'it' }, { from: 'it', to: 'en' }] }
      async loadTranslationModel({ from, to }) {
        const direction = `${from}-${to}`
        const info = manifest.models.find(model => model.direction === direction)
        if (!info) throw new Error('Unexpected direction.')
        const buffers = {}
        for (const file of info.files) {
          const bytes = await readFile(resolve(base, 'mozilla-assets', direction, `${file.kind}.bin`))
          if (sha(bytes) !== file.sha256) throw new Error('Local Mozilla asset integrity mismatch.')
          buffers[file.kind] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        }
        return { model: buffers.model, shortlist: buffers.lexicalShortlist, vocabs: [buffers.vocab] }
      }
    }
    const options = { pivotLanguage: null, cacheSize: 0, useNativeIntGemm: false }
    const started = performance.now()
    translator = new LatencyOptimisedTranslator(options, new LocalBacking(options))
    await bounded(translator.worker)
    report.workerLoadMs = performance.now() - started
    const fixture = await readFile(resolve(root, 'tests/fixtures/offline-translation/cases.json'))
    report.fixtureSha256 = sha(fixture)
    const cases = JSON.parse(fixture)
    for (const direction of ['en-it', 'it-en']) {
      const [from, to] = direction.split('-')
      for (let repeat = 0; repeat < 3; repeat++) {
        for (const item of cases.filter(item => item.direction === direction)) {
          const begin = performance.now()
          const result = await bounded(translator.translate({ from, to, text: item.text, html: false }))
          const row = { ...item, repeat, latencyMs: performance.now() - begin, translation: result.target.text }
          report.results.push(row)
          console.log(JSON.stringify({ id: item.id, repeat, ms: Math.round(row.latencyMs), translation: row.translation }))
          await writeFile(output, JSON.stringify(report, null, 2))
        }
      }
    }
    report.complete = true
  } catch (error) {
    report.error = { name: error.name, message: error.message.slice(0, 800) }
    process.exitCode = 1
  } finally {
    clearInterval(sampling)
    report.sampledPeakRssBytes = Math.max(peakRss, process.memoryUsage().rss)
    report.mainFetchNetworkAttempts = networkAttempts
    report.networkGuard = 'JS fetch blocked in main; fetch/http/https/net/tls blocked in worker; not OS firewall/native audit'
    await Promise.allSettled(workers.map(worker => worker.terminate()))
    await writeFile(output, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ report: output, complete: report.complete, error: report.error }))
  }
}
