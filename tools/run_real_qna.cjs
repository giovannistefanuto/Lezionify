const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')

const directory = mkdtempSync(join(tmpdir(), 'lezionify-qna-real-'))
try {
  const output = join(directory, 'qna-real.cjs')
  buildSync({
    entryPoints: ['./tests/integration/qnaReal.electron.ts'],
    bundle: true,
    outfile: output,
    platform: 'node',
    format: 'cjs',
    external: ['electron']
  })
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [output], {
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 90000
  })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
