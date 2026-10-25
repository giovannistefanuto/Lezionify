import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
const directory = join(process.cwd(), 'local-artifacts/rag-private-2026-10-22')
await mkdir(directory, { recursive: true })
const output = join(directory, 'run.mjs')
await build({ entryPoints: ['tests/integration/courseRagPrivateLocal.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
const child = spawn(process.execPath, [output, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true })
child.on('exit', code => { process.exitCode = code ?? 1 })
