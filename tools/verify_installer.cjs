// Verify the local Windows package against the exact build and preserved installer.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const asar = require('@electron/asar')
const assert = require('node:assert/strict')
const root = process.cwd()
const backups = path.join(root, 'local-artifacts', 'installer-backups')
const backup = path.resolve(process.argv[2] || path.join(backups, '20261022-diciassette-rag'))
assert(backup.startsWith(backups + path.sep), 'Unexpected backup directory')
const archive = path.join(root, 'dist', 'win-unpacked', 'resources', 'app.asar')
const setupName = 'Lezionify-Setup-0.1.0.exe'
const setup = path.join(root, 'dist', setupName)
const hash = async (file, algorithm = 'sha256', encoding = 'hex') => {
  const value = crypto.createHash(algorithm)
  for await (const chunk of fs.createReadStream(file)) value.update(chunk)
  return value.digest(encoding)
}
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)])
}
async function main() {
  const entries = asar.listPackage(archive).map(item => item.replaceAll('\\', '/').replace(/^\//, ''))
  assert(entries.every(item => item === 'package.json' || item === 'node_modules' || item.startsWith('node_modules/') || item === 'out' || item.startsWith('out/')), 'Unexpected top-level package content')
  assert(!entries.some(item => /(^|\/)(local-artifacts|\.library-data|settings\.json|library\.json|app\.log|scratchpad\.json)(\/|$)/.test(item)), 'Private artifact packaged')
  let verifiedBuildFiles = 0
  let javascript = ''
  for (const source of files(path.join(root, 'out'))) {
    const name = path.relative(root, source).replaceAll('\\', '/')
    const original = fs.readFileSync(source)
    const packed = asar.extractFile(archive, path.normalize(name))
    assert(original.equals(packed), 'Build/package mismatch: ' + name)
    verifiedBuildFiles++
    if (name.endsWith('.js') && !name.includes('translation-runtime')) javascript += packed.toString('utf8')
  }
  for (const marker of ['Risposta media: tra 200 e 400 parole.', '08:00', '17:30', 'Copia appunti', 'publishToGithub', 'legacyPublishingCourseCodes', 'responseJsonSchema', 'Elabora archivio', 'gemini_recovery_wait', 'lectureOrdinal', 'Riprova domanda']) assert(javascript.includes(marker), 'Missing feature: ' + marker)
  for (const marker of ['Sala di consultazione', 'Consulta il corso', 'Ricerche recenti', 'Materiali disponibili']) assert(javascript.includes(marker), 'Missing consultation start: ' + marker)
  if (process.argv.includes('--repetition')) {
    for (const marker of ['Come vuoi usare il registratore?', 'RIPETERE', 'Cambia appunti', 'Riprendi sessione', 'Cosa hai capito bene', 'Difficoltà che hai superato', 'Cosa devi rivedere', 'repetition:start', 'repetition:resume']) assert(javascript.includes(marker), 'Missing repetition feature: ' + marker)
  }
  assert(fs.statSync(path.join(archive + '.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')).size > 1000000, 'FFmpeg missing')
  assert(entries.some(item => item.startsWith('out/main/translation-runtime/') && item.endsWith('.wasm')), 'Offline runtime missing')
  if (process.argv.includes('--rag')) {
    for (const name of ['embedding-worker.cjs', 'pdf-worker.cjs', 'pdf-layout.cjs']) assert(fs.statSync(path.join(archive + '.unpacked', 'out/main/course-rag', name)).size > 100, 'RAG worker not unpacked: ' + name)
    assert(fs.statSync(path.join(archive + '.unpacked', 'node_modules/onnxruntime-node/bin/napi-v6/win32/x64/onnxruntime_binding.node')).size > 10000, 'ONNX native binding missing')
    for (const marker of ['grounding_review', 'Prepara / riprendi indice locale', 'Numero lezione non valido.', 'corpusRevision']) assert(javascript.includes(marker), 'Missing RAG feature: ' + marker)
    const runtime = JSON.parse(fs.readFileSync(path.join(root, 'local-artifacts/rag-package-2026-10-23/runtime.json'), 'utf8'))
    assert(runtime.result === 'PASS' && runtime.pdfWorker && runtime.inferenceNetworkBlocked, 'Packaged RAG diagnostic did not pass')
    assert.equal(runtime.asarSha256, await hash(archive), 'RAG runtime report refers to a different ASAR')
    assert.equal(runtime.runtimeSha256, await hash(path.join(root, 'dist/win-unpacked/Lezionify.exe')), 'RAG runtime report refers to another executable')
    const corruption = JSON.parse(fs.readFileSync(path.join(root, 'local-artifacts/rag-package-2026-10-23/corrupt-model.json'), 'utf8'))
    assert(corruption.modelCorruptionRejected && corruption.asarSha256 === runtime.asarSha256, 'Corrupt-model rejection not checked on this package')
    const download = JSON.parse(fs.readFileSync(path.join(root, 'local-artifacts/rag-package-2026-10-23/download-model.json'), 'utf8'))
    assert(download.result === 'PASS' && download.modelPreparation === 'explicit-public-download' && download.asarSha256 === runtime.asarSha256, 'Explicit public-model download not checked on this package')
    const embedded = JSON.parse(fs.readFileSync(path.join(root, 'local-artifacts/rag-package-2026-10-23/nsis-payload.json'), 'utf8'))
    assert(embedded.result === 'PASS' && embedded.asarSha256 === runtime.asarSha256 && embedded.setupSha256 === await hash(setup), 'Embedded NSIS payload differs from verified runtime')
  }
  const manifest = fs.readFileSync(path.join(root, 'dist', 'latest.yml'), 'utf8')
  const sha512 = await hash(setup, 'sha512', 'base64')
  assert(manifest.includes(sha512), 'Manifest SHA512 mismatch')
  assert(manifest.includes(String(fs.statSync(setup).size)), 'Manifest size mismatch')
  assert(fs.statSync(setup + '.blockmap').size > 0, 'Blockmap missing')
  const saved = JSON.parse(fs.readFileSync(path.join(backup, 'backup.json'), 'utf8'))
  for (const item of saved.files) assert.equal(await hash(path.join(backup, item.name)), item.sha256, 'Backup mismatch: ' + item.name)
  const result = { verifiedBuildFiles, setupBytes: fs.statSync(setup).size, setupSha256: await hash(setup), manifestSha512: sha512, backupFilesVerified: saved.files.length, runtimeVerified: true, noPrivateArtifacts: true, featuresVerified: true }
  fs.writeFileSync(path.join(backup, 'verification.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
}
main().catch(error => { console.error('Installer verification failed: ' + error.message); process.exitCode = 1 })
