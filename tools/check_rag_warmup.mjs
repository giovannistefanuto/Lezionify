// Benchmark existing model only. No download, no query text, no vector writes.
import { build } from 'esbuild'
import { mkdir, copyFile, access, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const directory = resolve('local-artifacts/rag-warmup')
const root = join(process.env.APPDATA, 'lezionify', 'course-rag', 'semantic')
await access(join(root, 'ready.json'))
await mkdir(join(directory, 'course-rag'), { recursive: true })
await copyFile('resources/course-rag/embedding-worker.cjs', join(directory, 'course-rag/embedding-worker.cjs'))
await build({ entryPoints: ['electron/main/courseRagSemantic.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: join(directory, 'semantic.mjs') })
const { LocalCourseSemantic } = await import(pathToFileURL(join(directory, 'semantic.mjs')))
const semantic = new LocalCourseSemantic(root)
try {
  if ((await semantic.state()).status !== 'ready') throw Error('Local model missing')
  const cold = performance.now(); await semantic.warmup(); const coldMs = performance.now() - cold
  const warm = performance.now(); await semantic.warmup(); const warmMs = performance.now() - warm
  console.log(JSON.stringify({ coldLoadMs: coldMs, repeatedWarmupMs: warmMs, querySent: false, download: false }))
} finally { semantic.dispose(); await rm(join(directory, 'semantic.mjs'), { force: true }) }
