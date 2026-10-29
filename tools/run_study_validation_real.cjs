const { buildSync } = require('esbuild')
const { spawnSync } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const { join } = require('node:path')
const directory = join(process.cwd(), 'local-artifacts/study-validation-2026-10-29')
mkdirSync(directory, { recursive: true })
const output = join(directory, 'validation.cjs')
buildSync({ entryPoints: ['tests/integration/studyValidationReal.electron.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: output })
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
const result = spawnSync(require('electron'), [output, ...process.argv.slice(2)], { env, encoding: 'utf8', windowsHide: true, timeout: 480000 })
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || ''); process.exitCode = result.status ?? 1
