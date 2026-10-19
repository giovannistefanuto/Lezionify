// Lezionify adapter for @browsermt/bergamot-translator 0.4.9 (MPL-2.0).
/* eslint-disable @typescript-eslint/no-require-imports -- Node worker deliberately uses CommonJS. */
const { parentPort, workerData, Worker } = require('node:worker_threads')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const { pathToFileURL, fileURLToPath } = require('node:url')
const { createHash } = require('node:crypto')
const block = () => { throw new Error('Offline engine: networking disabled.') }
globalThis.fetch = block
for (const name of ['node:http', 'node:https']) { const api = require(name); api.request = api.get = block }
const net = require('node:net'); net.connect = net.createConnection = net.Socket.prototype.connect = block
require('node:tls').connect = block
const children = []
globalThis.Worker = class {
  constructor(url) {
    const bootstrap = `const block = () => { throw new Error('Offline engine.'); }; globalThis.fetch = block; for (const name of ['node:http','node:https']) { const api = require(name); api.request = api.get = block; } const net = require('node:net'); net.connect = net.createConnection = net.Socket.prototype.connect = block; require('node:tls').connect = block; require(require('node:worker_threads').workerData);`
    this.worker = new Worker(bootstrap, { eval: true, workerData: fileURLToPath(url) }); children.push(this.worker)
  }
  addEventListener(name, callback) { this.worker.on(name, data => callback(name === 'message' ? { data } : data)) }
  postMessage(value) { this.worker.postMessage(value) }
  terminate() { return this.worker.terminate() }
}
globalThis.window = { Worker: globalThis.Worker }
;(async () => {
  try {
    const { TranslatorBacking, LatencyOptimisedTranslator } = await import(pathToFileURL(join(__dirname, 'translator.js')).href)
    class LocalBacking extends TranslatorBacking {
      async loadModelRegistery() { return [{ from: 'en', to: 'it' }, { from: 'it', to: 'en' }] }
      async loadTranslationModel({ from, to }) {
        const model = workerData.manifest.models.find(item => item.direction === `${from}-${to}`)
        if (!model) throw new Error('direction')
        const buffers = {}
        for (const file of model.files) {
          const bytes = await readFile(join(workerData.root, model.direction, `${file.kind}.bin`))
          if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('integrity')
          buffers[file.kind] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        }
        return { model: buffers.model, shortlist: buffers.lexicalShortlist, vocabs: [buffers.vocab] }
      }
    }
    const options = { pivotLanguage: null, cacheSize: 0, useNativeIntGemm: false }
    const translator = new LatencyOptimisedTranslator(options, new LocalBacking(options))
    const [from, to] = workerData.direction.split('-')
    const parts = []
    for (const segment of workerData.segments) {
      if (segment.protected || !segment.text.trim() || !/\p{L}/u.test(segment.text)) { parts.push(segment.text); continue }
      const leading = segment.text.match(/^\s*/)[0], trailing = segment.text.match(/\s*$/)[0]
      const result = await translator.translate({ from, to, text: segment.text.trim(), html: false })
      parts.push(leading + result.target.text + trailing)
    }
    parentPort.postMessage({ text: parts.join('') })
  } catch { parentPort.postMessage({ error: true }) }
  finally { await Promise.allSettled(children.map(worker => worker.terminate())) }
})()
