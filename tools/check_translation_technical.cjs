// Real service and WASM, existing models only. Synthetic text, no network.
const { buildSync } = require('esbuild')
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { resolve, join } = require('node:path')
const { performance } = require('node:perf_hooks')
const assert = require('node:assert/strict')
const temp = mkdtempSync(join(tmpdir(), 'lezionify-technical-'))
async function run() {
  buildSync({ entryPoints: ['electron/main/offlineTranslation.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(temp, 'service.cjs') })
  const { OfflineTranslationService } = require(join(temp, 'service.cjs'))
  let network = 0
  const service = new OfflineTranslationService(resolve('local-artifacts/offline-translation/mozilla-assets'), resolve(process.argv[2] || 'out/main/translation-runtime'), async () => { network++; throw Error('Network forbidden') })
  const cases = [
    ['en-it', 'The transition probability is $P(s_next|s,a)$. Use `policy[state]` to choose the action.'],
    ['it-en', 'La probabilità di transizione è $P(s_next|s,a)$. Usa `policy[state]` per scegliere l’azione.'],
    ['en-it', 'The matrix has 12 rows and 35 columns. The reward is 8.'],
    ['it-en', 'La matrice ha 12 righe e 35 colonne. La ricompensa è 8.'],
    ['en-it', 'Update the value function.\n```python\nvalue[s] = reward + gamma * value[next_s]\n```'],
    ['it-en', 'Aggiorna la funzione valore.\n```python\nvalue[s] = reward + gamma * value[next_s]\n```'],
    ['en-it', 'The Bellman equation is $$v = r + \\gamma P v$$. Read https://example.org/notes?q=1 .'],
    ['it-en', 'L’equazione di Bellman è $$v = r + \\gamma P v$$. Leggi https://example.org/notes?q=1 .']
  ]
  const results = []
  for (const [direction, text] of cases) {
    const start = performance.now()
    const translated = await service.translate(text, direction)
    const protectedSpans = text.match(/```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$]+\$|`[^`]+`|https:\/\/[^\s]+/g) || []
    assert(protectedSpans.every(span => translated.text.includes(span)), 'Protected source changed')
    if (text.includes('12')) for (const n of ['12', '35', '8']) assert(new RegExp('\\b' + n + '\\b').test(translated.text))
    results.push({ direction, source: text, translation: translated.text, ms: performance.now() - start })
  }
  assert.equal(network, 0)
  mkdirSync('local-artifacts/offline-translation', { recursive: true })
  writeFileSync('local-artifacts/offline-translation/technical-service.json', JSON.stringify({ results, network }, null, 2))
  console.log('PASS: 8 real technical translations; formulas, code, URLs, numbers intact; zero network requests')
}
run().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => rmSync(temp, { recursive: true, force: true }))
