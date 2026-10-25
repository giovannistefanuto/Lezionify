// No document is sent over the network. Only prepare explicitly permits model download.
const { parentPort, workerData } = require('node:worker_threads')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
let extractor
let lastProgressAt = 0
const originalFetch = globalThis.fetch
const http = require('node:http')
const https = require('node:https')
const requests = { http: http.request, https: https.request, httpGet: http.get, httpsGet: https.get }
async function run({ id, operation, texts }) {
  try {
    if (operation === 'dispose') { await extractor?.dispose(); parentPort.close(); return }
    const denied = () => { throw new Error('Network disabled during local embedding inference') }
    globalThis.fetch = operation === 'prepare' ? originalFetch : denied
    http.request = operation === 'prepare' ? requests.http : denied
    https.request = operation === 'prepare' ? requests.https : denied
    http.get = operation === 'prepare' ? requests.httpGet : denied
    https.get = operation === 'prepare' ? requests.httpsGet : denied
    const { AutoTokenizer, BertTokenizer, AutoModel, FeatureExtractionPipeline, env } = await import(workerData.moduleUrl)
    env.allowRemoteModels = operation === 'prepare'
    env.cacheDir = workerData.cacheDirectory
    env.logLevel = 50
    if (!extractor) {
      const options = {
      dtype: 'q8', device: 'cpu', local_files_only: operation !== 'prepare',
      cache_dir: workerData.cacheDirectory, revision: workerData.revision,
      session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
      progress_callback: event => {
        if (event.status === 'progress' && Date.now() - lastProgressAt >= 1000) {
          lastProgressAt = Date.now()
          parentPort.postMessage({ id, progress: Math.floor(event.progress || 0) })
        }
      }
      }
      // Explicit components avoid pipeline() probing the main-branch file list
      // when a pinned revision must be loaded entirely from the offline cache.
      const localTokenizer = () => {
        const root = join(workerData.cacheDirectory, workerData.model, workerData.revision)
        return new BertTokenizer(JSON.parse(readFileSync(join(root, 'tokenizer.json'), 'utf8')), JSON.parse(readFileSync(join(root, 'tokenizer_config.json'), 'utf8')))
      }
      const [tokenizer, model] = await Promise.all([
        operation === 'prepare' ? AutoTokenizer.from_pretrained(workerData.model, options) : Promise.resolve(localTokenizer()),
        AutoModel.from_pretrained(workerData.model, options)
      ])
      extractor = new FeatureExtractionPipeline({ task: 'feature-extraction', tokenizer, model })
    }
    env.allowRemoteModels = false
    // Embed every token window, not just a long formula/code passage's prefix.
    const vectors = []
    for (const text of texts ?? []) {
      const tokens = extractor.tokenizer.encode(text, { add_special_tokens: false })
      const windows = []
      for (let offset = 0; offset < tokens.length; offset += 384) windows.push(extractor.tokenizer.decode(tokens.slice(offset, offset + 384), { skip_special_tokens: true }))
      if (!windows.length) windows.push(' ')
      const chunks = (await extractor(windows, { pooling: 'mean', normalize: true, truncation: true, max_length: 512 })).tolist()
      const vector = Array.from({ length: 384 }, (_, i) => chunks.reduce((sum, chunk) => sum + chunk[i], 0) / chunks.length)
      const norm = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0))
      vectors.push(vector.map(n => n / norm))
    }
    parentPort.postMessage({ id, vectors })
  } catch {
    parentPort.postMessage({ id, error: 'Modello semantico locale non disponibile. Scaricalo dalle fonti e riprova.' })
  }
}
let pending = Promise.resolve()
parentPort.on('message', message => { pending = pending.then(() => run(message)) })
