import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import type { Plugin } from 'vite'

// Keep font maps, fonts and image decoders local in both dev and packaged builds.
function translationAssets(): Plugin {
  return {
    name: 'offline-translation-assets',
    generateBundle() {
      const root = resolve('node_modules/@browsermt/bergamot-translator')
      const emit = (name: string, source: string | Buffer) => this.emitFile({ type: 'asset', fileName: `translation-runtime/${name}`, source })
      emit('package.json', '{"type":"module"}')
      emit('worker/package.json', '{"type":"commonjs"}')
      emit('translator.js', readFileSync(resolve(root, 'translator.js')))
      for (const name of ['bergamot-translator-worker.js', 'bergamot-translator-worker.wasm']) emit(`worker/${name}`, readFileSync(resolve(root, 'worker', name)))
      const original = readFileSync(resolve(root, 'worker/translator-worker.js'), 'utf8')
      if (!original.includes('readFile(url.pathname)') || !original.includes('return new URL(`file://${__filename}`);')) throw new Error('Bergamot worker changed: review Windows adapter.')
      emit('worker/translator-worker.js', original.replace('readFile(url.pathname)', 'readFile(url)').replace('return new URL(`file://${__filename}`);', "return require('node:url').pathToFileURL(__filename);"))
      for (const name of ['runner.cjs', 'NOTICE.md', 'LICENSE-MPL-2.0.txt', 'models.json']) emit(name, readFileSync(resolve('resources/translation', name)))
    }
  }
}

function courseRagAssets(): Plugin {
  return { name: 'course-rag-worker', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'course-rag/pdf-worker.cjs', source: readFileSync(resolve('resources/course-rag/pdf-worker.cjs')) })
  } }
}

function pdfAssets(): Plugin {
  const assets = new Map<string, Buffer>()
  for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
    const directory = resolve('node_modules/pdfjs-dist', folder)
    for (const file of readdirSync(directory)) {
      if (/\.(bcmap|pfb|ttf|wasm|mjs|js|bin)$/.test(file) || /^LICENSE/.test(file)) assets.set(`pdf-assets/${folder}/${file}`, readFileSync(resolve(directory, file)))
    }
  }
  return {
    name: 'local-pdf-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const asset = assets.get((request.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!asset) return next()
        response.end(asset)
      })
    },
    generateBundle() {
      for (const [fileName, source] of assets) this.emitFile({ type: 'asset', fileName, source })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), translationAssets(), courseRagAssets()],
    build: {
      lib: {
        entry: resolve('electron/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload/index.ts')
      }
    }
  },
  renderer: {
    plugins: [react(), pdfAssets()],
    root: '.',
    build: {
      rollupOptions: {
        input: resolve('index.html')
      }
    }
  }
})
