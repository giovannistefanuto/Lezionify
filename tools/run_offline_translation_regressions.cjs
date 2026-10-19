// Real WASM regression using previously downloaded public models; never downloads.
const { Worker } = require('node:worker_threads')
const { resolve } = require('node:path')
const { readFileSync } = require('node:fs')
const assert = require('node:assert/strict')
const run = async () => {
  for (const direction of ['en-it', 'it-en']) {
    const segments = [{ text: direction === 'en-it' ? 'The student reads a book. ' : 'Lo studente legge un libro. ', protected: false }, { text: '$x_i = 4$ `foo()` https://example.org/', protected: true }]
    const text = await new Promise((accept, reject) => {
      const worker = new Worker(resolve(process.argv[3] || 'out/main/translation-runtime', 'runner.cjs'), { workerData: { root: resolve(process.argv[2] || 'local-artifacts/offline-translation/mozilla-assets'), manifest: JSON.parse(readFileSync('resources/translation/models.json', 'utf8')), direction, segments } })
      const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Offline test timed out')) }, 45000)
      worker.once('error', reject)
      worker.once('message', value => { clearTimeout(timer); void worker.terminate(); value.error ? reject(new Error('Worker translation failed')) : accept(value.text) })
    })
    assert.equal(typeof text, 'string')
    assert(text.endsWith('$x_i = 4$ `foo()` https://example.org/'))
    assert.notEqual(text, segments.map(segment => segment.text).join(''))
    assert(direction === 'en-it' ? /studente.*libro/i.test(text) : /student.*book/i.test(text))
    console.log(`PASS ${direction}: real WASM translation with protected literals`)
  }
}
if (process.versions.electron) {
  const { app } = require('electron')
  app.whenReady().then(run).then(() => app.quit()).catch(error => { console.error(error.message); app.exit(1) })
} else run().catch(error => { console.error(error.message); process.exitCode = 1 })
