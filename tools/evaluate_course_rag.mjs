import { build } from 'esbuild'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
const directory = join(process.cwd(), 'local-artifacts/rag-evaluation-2026-10-23')
await mkdir(directory, { recursive: true })
const output = join(directory, 'evaluation.mjs')
const baseline = process.argv.includes('--baseline')
await build({ entryPoints: ['tests/integration/courseRagEvaluation.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external', plugins: baseline ? [{ name: 'documented-ranking-baseline', setup(builder) {
  builder.onLoad({ filter: /courseRag(?:Index|Semantic)\.ts$/ }, async ({ path }) => {
    let contents = await readFile(path, 'utf8')
    contents = contents.replace('result.score >= (lexical[0]?.score ?? 0) * .35', 'result.score >= 0')
    contents = contents.replace('Math.max(.25, (ranked[0]?.score ?? 0) * .75)', '.25')
    return { contents, loader: 'ts' }
  })
} }] : [] })
const child = spawn(process.execPath, [output, ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true })
child.on('error', () => { console.error('RAG benchmark process could not start'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
