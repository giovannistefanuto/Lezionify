// Trusted local worker; only bytes and the installed PDF.js module URL are accepted.
const { parentPort, workerData } = require('node:worker_threads')
const { fileURLToPath } = require('node:url')
;(async () => {
  const { getDocument } = await import(workerData.moduleUrl)
  const asset = folder => fileURLToPath(new URL(`../../${folder}/`, workerData.moduleUrl)).replaceAll('\\', '/')
  const task = getDocument({ data: workerData.bytes, useSystemFonts: false,
    standardFontDataUrl: asset('standard_fonts'), cMapUrl: asset('cmaps'), cMapPacked: true, wasmUrl: asset('wasm'), useWorkerFetch: false })
  try {
    const pdf = await task.promise
    if (pdf.numPages > 2000) throw new Error()
    const pages = []
    let length = 0
    for (let page = 1; page <= pdf.numPages; page++) {
      let text = ''
      try {
        const documentPage = await pdf.getPage(page)
        const content = await documentPage.getTextContent()
        text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('')
        documentPage.cleanup()
      } catch { /* Retain a coverage gap for this page; never invent searchable text. */ }
      length += text.length
      if (length > 10_000_000) throw new Error()
      pages.push({ page, text })
    }
    parentPort.postMessage({ pages })
  } finally { await task.destroy() }
})().catch(() => parentPort.postMessage({ error: 'PDF non leggibile o oltre i limiti di estrazione.' }))
