import { spawn } from 'node:child_process'
import { resolve, join } from 'node:path'
import { mkdir, writeFile, access, cp, readFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
const runtime = resolve('dist/win-unpacked/Lezionify.exe')
await access(runtime)
const directory = resolve('local-artifacts/rag-package-2026-10-23')
await mkdir(directory, { recursive: true })
const corrupt = process.argv.includes('--corrupt-model')
const download = process.argv.includes('--download-model')
if (corrupt && download) throw new Error('Choose one explicit diagnostic mode')
let fixture = resolve('local-artifacts/rag-semantic-model')
if (corrupt) {
  const target = join(directory, 'corrupted-public-model')
  await mkdir(target, { recursive: true })
  await cp(join(fixture, 'models'), join(target, 'models'), { recursive: true })
  await cp(join(fixture, 'ready.json'), join(target, 'ready.json'))
  const marker = JSON.parse(await readFile(join(target, 'ready.json'), 'utf8'))
  if (marker.model !== 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' || !/^[a-f0-9]{40}$/.test(marker.revision)) throw new Error('Unexpected public-model fixture')
  await writeFile(join(target, 'models', marker.model, marker.revision, 'tokenizer.json'), '{deliberately-corrupted')
  fixture = target
}
const env = { ...process.env, LEZIONIFY_RAG_MODEL_FIXTURE: fixture }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(runtime, ['--rag-self-check', ...(download ? ['--rag-self-check-download'] : [])], { windowsHide: true, env, stdio: ['ignore', 'pipe', 'pipe'] })
let stdout = '', stderr = ''
child.stdout.on('data', chunk => { stdout += chunk })
child.stderr.on('data', chunk => { stderr += chunk })
child.on('error', () => { console.error('Packaged RAG process could not start'); process.exitCode = 1 })
const timer = setTimeout(() => { child.kill(); process.exitCode = 1 }, download ? 300000 : 180000)
child.on('exit', async code => {
  clearTimeout(timer)
  await writeFile(join(directory, 'runtime.log'), stdout + stderr)
  if (corrupt) {
    const pass = code === 1 && (stdout + stderr).includes('RAG_PACKAGE_CHECK failed:')
    const hash = createHash('sha256'); for await (const chunk of createReadStream(resolve('dist/win-unpacked/resources/app.asar'))) hash.update(chunk)
    const result = { result: pass ? 'PASS' : 'FAIL', expectedFailure: 'corrupt_model', modelCorruptionRejected: pass, asarSha256: hash.digest('hex') }
    await writeFile(join(directory, 'corrupt-model.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result)); process.exitCode = pass ? 0 : 1; return
  }
  const line = stdout.split(/\r?\n/).find(line => line.startsWith('RAG_PACKAGE_CHECK '))
  if (code !== 0 || !line) { console.error('Packaged RAG check failed; see local runtime.log'); process.exitCode = 1; return }
  const result = JSON.parse(line.slice('RAG_PACKAGE_CHECK '.length))
  const hash = async file => { const value = createHash('sha256'); for await (const chunk of createReadStream(file)) value.update(chunk); return value.digest('hex') }
  result.runtimeSha256 = await hash(runtime)
  result.asarSha256 = await hash(resolve('dist/win-unpacked/resources/app.asar'))
  await writeFile(join(directory, download ? 'download-model.json' : 'runtime.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
})
