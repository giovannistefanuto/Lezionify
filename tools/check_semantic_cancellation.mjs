import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const directory = join(process.cwd(), 'local-artifacts/rag-semantic-cancellation')
await mkdir(directory, { recursive: true })
const output = join(directory, 'check.mjs'), entry = join(directory, 'entry.cjs')
await build({ entryPoints: ['tests/integration/courseSemanticCancellation.electron.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
await writeFile(entry, `import(${JSON.stringify(pathToFileURL(output).href)}).catch(()=>require('electron').app.exit(1))`)
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
const child = spawn(createRequire(import.meta.url)('electron'), [entry], { windowsHide: true, env, stdio: ['ignore', 'pipe', 'pipe'] })
let outputText = ''
child.stdout.on('data', chunk => { outputText += chunk; process.stdout.write(chunk) })
child.stderr.on('data', chunk => process.stderr.write(chunk))
child.on('error', () => { process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code === 0 && outputText.includes('SEMANTIC_CANCEL_PASS') ? 0 : 1 })
