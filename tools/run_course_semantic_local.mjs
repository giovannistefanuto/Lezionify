import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const directory = join(process.cwd(), 'local-artifacts/rag-semantic-test')
await mkdir(directory, { recursive: true })
const output = join(directory, 'run.mjs')
await build({ entryPoints: ['tests/integration/courseSemanticLocal.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
const runtime = process.argv.includes('--electron') ? createRequire(import.meta.url)('electron') : process.execPath
const runtimeEnv = { ...process.env }
delete runtimeEnv.ELECTRON_RUN_AS_NODE
let entry = output
if (process.argv.includes('--electron')) {
  entry = join(directory, 'electron.cjs')
  await writeFile(entry, `const {app}=require('electron');app.whenReady().then(()=>import(${JSON.stringify(pathToFileURL(output).href)})).catch(()=>app.exit(1));`)
}
const child = spawn(runtime, [entry, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: runtimeEnv })
child.on('exit', code => { process.exitCode = code ?? 1 })
