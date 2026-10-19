/** Analyze synthetic pilot artifacts without model loading or network access. */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, 'local-artifacts/offline-translation')
const names = (await readdir(base)).filter(name => /^(pilot|argos-pilot|mozilla-pilot)-\d+\.json$/.test(name))
const summaries = []
for (const name of names) {
  const report = JSON.parse(await readFile(resolve(base, name), 'utf8'))
  if (!report.complete) continue
  const engine = name.startsWith('argos') ? 'argos-direct' : name.startsWith('mozilla') ? 'mozilla-wasm' : 'opus-onnx'
  const results = report.results.filter(row => engine !== 'argos-direct' || row.beam === 4)
  if (results.length !== 72 || new Set(results.map(row => row.id)).size !== 24) throw new Error('Incomplete pilot case set.')
  const directions = []
  for (const direction of ['en-it', 'it-en']) {
    const rows = results.filter(row => row.direction === direction && row.repeat > 0)
    const values = rows.map(row => row.latencyMs).sort((a, b) => a - b)
    if (values.length !== 24 || values.some(value => !Number.isFinite(value) || value <= 0)) throw new Error('Invalid measured latency.')
    directions.push({ direction, warmSamples: values.length, medianMs: (values[11] + values[12]) / 2, p95Ms: values[Math.ceil(values.length * .95) - 1], maxMs: values.at(-1), firstRequestMs: results.find(row => row.direction === direction && row.repeat === 0).latencyMs })
  }
  const unique = results.filter(row => row.repeat === 0)
  const literals = unique.filter(row => /-(formula|code)$/.test(row.id)).map(row => {
    const spans = row.text.match(/\$[^$]+\$|`[^`]+`/g) ?? []
    return { id: row.id, intact: spans.every(span => row.translation.includes(span)) }
  })
  // Structural screening only: semantic correctness requires human review.
  const numbers = unique.filter(row => row.id.endsWith('numbers')).map(row => ({ id: row.id, intact: ['12', '35', '8'].every(number => new RegExp(`\\b${number}\\b`).test(row.translation)) }))
  for (const row of unique) {
    if (new Set(results.filter(other => other.id === row.id).map(other => other.translation)).size !== 1) throw new Error('Unexpected variation between deterministic repeats.')
  }
  summaries.push({ engine, source: name, directions, literals, numbers, deterministicAcrossThreeRepeats: true, totalGenerations: report.results.length, peakRssBytes: report.sampledPeakRssBytes ?? report.memory.peakRssBytes, load: report.models ?? { workerLoadMs: report.workerLoadMs }, modelBytes: report.manifest.models ? report.manifest.models.map(model => ({ direction: model.direction, bytes: model.files.reduce((sum, file) => sum + file.bytes, 0) })) : report.manifest.map(model => ({ direction: model.direction, bytes: model.files.reduce((sum, file) => sum + file.bytes, 0) })), networkAttempts: report.networkAttemptsDuringInference ?? report.mainFetchNetworkAttempts })
}
await writeFile(resolve(base, 'summary.json'), JSON.stringify(summaries, null, 2))
console.log(JSON.stringify(summaries, null, 2))
