// Inspect the generated installer without running or installing it.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const assert = require('node:assert/strict')
const root = process.cwd()
const output = path.resolve(root, 'local-artifacts/rag-package-2026-10-23/nsis-payload')
assert(output.startsWith(path.resolve(root, 'local-artifacts') + path.sep))
const extractor = path.join(root, 'node_modules/electron-winstaller/vendor/7z-x64.exe')
const setup = path.join(root, 'dist/Lezionify-Setup-0.1.0.exe')
const hash = async file => { const value = crypto.createHash('sha256'); for await (const chunk of fs.createReadStream(file)) value.update(chunk); return value.digest('hex') }
function extract(archive, directory, names) {
  fs.mkdirSync(directory, { recursive: true })
  const result = spawnSync(extractor, ['x', '-y', '-o' + directory, archive, ...names], { windowsHide: true, encoding: 'utf8', timeout: 180000 })
  assert(result.status === 0 && !result.error, 'Trusted installer extraction did not complete')
}
async function main() {
  const outer = path.join(output, 'outer'), inner = path.join(output, 'inner')
  extract(setup, outer, ['$PLUGINSDIR\\app-64.7z'])
  const payload = path.join(outer, '$PLUGINSDIR/app-64.7z')
  assert(fs.statSync(payload).size > 1000000, 'Embedded application payload missing')
  const files = [
    'Lezionify.exe', 'resources/app.asar',
    ...['embedding-worker.cjs', 'pdf-worker.cjs', 'pdf-layout.cjs'].map(name => 'resources/app.asar.unpacked/out/main/course-rag/' + name),
    ...['onnxruntime_binding.node', 'onnxruntime.dll'].map(name => 'resources/app.asar.unpacked/node_modules/onnxruntime-node/bin/napi-v6/win32/x64/' + name),
    'resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe'
  ]
  extract(payload, inner, files.map(file => file.replaceAll('/', '\\')))
  for (const file of files) assert.equal(await hash(path.join(inner, file)), await hash(path.join(root, 'dist/win-unpacked', file)), 'Embedded installer file differs: ' + file)
  const result = { result: 'PASS', installerNotExecuted: true, verifiedEmbeddedFiles: files.length, setupSha256: await hash(setup), asarSha256: await hash(path.join(inner, 'resources/app.asar')), nativeRuntimeMatches: true }
  fs.writeFileSync(path.join(output, '../nsis-payload.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}
main().catch(() => { console.error('NSIS embedded payload verification failed'); process.exitCode = 1 })
