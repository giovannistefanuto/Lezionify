const { buildSync } = require('esbuild')
const { join } = require('node:path')

// The app uses Vite's inline worker import. The test harness loads the same compiled worker from its isolated directory.
module.exports = function sessioneTestWorker(directory) {
  buildSync({
    entryPoints: ['src/components/sessione/sessionSpacing.worker.ts'],
    bundle: true,
    platform: 'browser',
    outfile: join(directory, 'spacing-worker.js')
  })
  return {
    name: 'sessione-worker-fixture',
    setup(build) {
      build.onResolve({ filter: /sessionSpacing\.worker\?worker&inline$/ }, () => ({
        path: 'spacing-worker', namespace: 'sessione-test'
      }))
      build.onLoad({ filter: /^spacing-worker$/, namespace: 'sessione-test' }, () => ({
        contents: 'export default function() { return new Worker(new URL("spacing-worker.js", document.baseURI)) }'
      }))
    }
  }
}
