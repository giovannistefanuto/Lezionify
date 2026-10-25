import { build } from 'esbuild'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const output = join(process.cwd(), 'local-artifacts/rag-completion-2026-10-23/grounding-replay.mjs')
await build({ entryPoints: ['tests/integration/courseGroundingReplay.ts'], bundle: true, outfile: output, platform: 'node', format: 'esm', packages: 'external' })
await import(pathToFileURL(output).href)
