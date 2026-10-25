import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
if (!process.argv.includes('--execute-authorized')) throw new Error('Richiede --execute-authorized: invia estratti personali a Gemini, massimo 60 invii.')
const directory = join(process.cwd(), 'local-artifacts/rag-completion-2026-10-23')
await mkdir(directory, { recursive: true })
const output = join(directory, 'evaluation.mjs')
await build({ entryPoints: ['tests/integration/courseRagEvaluationReal.electron.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
const entry = join(directory, 'entry.cjs')
await writeFile(entry, `import(${JSON.stringify(pathToFileURL(output).href)}).catch(error=>{console.error('RAG evaluation initialization failed: '+error.name);require('electron').app.exit(1)})`)
const child = spawn(createRequire(import.meta.url)('electron'), [entry, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env })
child.on('error', () => { console.error('RAG evaluation process could not start'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
