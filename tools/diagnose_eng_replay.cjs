// Read-only replay of private attempts; prints counts and fixed validator messages only.
const { buildSync } = require('esbuild')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lezionify-eng-replay-'))
try {
  buildSync({ stdin: { contents: "export * from './electron/main/ai/translationIntegrity'; export * from './electron/main/ai/translationPlan'; export {prepareTranslationDocument, restoreDocumentSection, partitionTranslationDocument, replayTranslationDocumentAttempt} from './electron/main/ai/translationDocument'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: path.join(temp, 'api.cjs') })
  const api = require(path.join(temp, 'api.cjs'))
  const root = path.join(process.env.APPDATA, 'lezionify/library')
  const library = JSON.parse(fs.readFileSync(path.join(root, 'library.json'), 'utf8'))
  const results = []
  if (process.argv.includes('--roundtrip')) {
    let documents = 0, batches = 0, literals = 0
    for (const lecture of library.lectures) {
      if (!lecture.markdownFileName) continue
      const envelope = api.prepareTranslation(fs.readFileSync(path.join(root, 'markdown', lecture.markdownFileName), 'utf8'))
      const plan = api.prepareTranslationDocument(envelope)
      const restored = Object.fromEntries(Object.entries(plan).map(([key, section]) => {
        literals += section.literals.length
        return [key, api.restoreDocumentSection(section, section.text)]
      }))
      const result = api.validateTranslationResponse(envelope, JSON.stringify(restored), 'STOP')
      if (result !== envelope.sections.map(s => s.trim()).join('\n\n')) throw Error('Local round-trip mismatch')
      batches += api.partitionTranslationDocument(plan).length; documents++
    }
    console.log(JSON.stringify({ documents, batches, protectedOccurrences: literals, status: 'PASS', networkRequests: 0 }))
    process.exitCode = 0
  } else {
  for (const [index, lecture] of library.lectures.entries()) {
    if (!lecture.markdownFileName) continue
    const attempt = path.join(root, 'markdown', lecture.id + '_en_tentativo.txt')
    if (!fs.existsSync(attempt)) continue
    const source = fs.readFileSync(path.join(root, 'markdown', lecture.markdownFileName), 'utf8')
    const envelope = api.prepareTranslation(source)
    const plan = api.prepareTranslationPlan(envelope)
    const raw = fs.readFileSync(attempt, 'utf8')
    const parts = Object.values(plan).flat().filter(p => 'key' in p)
    const row = { case: index + 1, sourceBytes: Buffer.byteLength(source), sections: envelope.sections.length, fragments: parts.length, tinyFragments: parts.filter(p => p.translate.length < 15).length }
    const documentFormat = (() => { try { return JSON.parse(raw).format === 'lezionify-eng-sections-v1' } catch { return false } })()
    try {
      if (documentFormat) {
        const repairPath = path.join(root, 'markdown', lecture.id + '_en_riparazione_tentativo.txt')
        api.replayTranslationDocumentAttempt(envelope, raw, fs.existsSync(repairPath) ? fs.readFileSync(repairPath, 'utf8') : undefined)
      } else api.validateTranslationPlan(envelope, plan, raw, 'STOP')
      row.status = 'accepted'
    }
    catch (error) { row.status = 'rejected'; row.detail = error.category === 'invalid_output' ? error.message : 'local-error' }
    if (!documentFormat) try {
      const parsed = JSON.parse(raw)
      row.missing = []; row.empty = []
      for (const [section, entries] of Object.entries(plan)) for (const p of entries) if ('key' in p) {
        if (typeof parsed[section]?.[p.key] !== 'string') row.missing.push(section + '/' + p.key)
        else if (!parsed[section][p.key].trim()) row.empty.push(section + '/' + p.key)
      }
    } catch { row.invalidJson = true }
    results.push(row)
  }
  console.log(JSON.stringify({ attempts: results.length, accepted: results.filter(r => r.status === 'accepted').length, results }, null, 2))
  }
} catch {
  console.error('Diagnostica ENG interrotta: controllare gli input locali; contenuti e credenziali non mostrati.')
  process.exitCode = 1
} finally {
  const target = path.resolve(temp)
  if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('lezionify-eng-replay-')) throw Error('Unexpected temporary cleanup path')
  fs.rmSync(target, { recursive: true, force: true })
}
