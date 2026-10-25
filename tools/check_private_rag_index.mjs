import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
const directory = join(process.cwd(), 'local-artifacts/rag-index-private-2026-10-23')
await mkdir(directory, { recursive: true })
const output = join(directory, 'check.mjs')
await build({ entryPoints: ['tests/integration/courseRagIndexPrivate.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
const child = spawn(process.execPath, [output], { stdio: 'inherit', windowsHide: true })
child.on('error', () => { console.error('Private local index process could not start'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
