// Measures detection twice, never prints names, paths or content.
const { buildSync } = require('esbuild')
const { mkdtempSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const temp = mkdtempSync(join(tmpdir(), 'lezionify-usb-measure-'))
async function run() {
  buildSync({ stdin: { contents: "export { findUsbRecorderDrive } from './electron/main/usbDetector'; export { logger } from './electron/main/logger'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', outfile: join(temp, 'usb.cjs') })
  const { findUsbRecorderDrive, logger } = require(join(temp, 'usb.cjs'))
  for (let pass = 1; pass <= 2; pass++) {
    const start = performance.now()
    const result = await findUsbRecorderDrive()
    console.log(JSON.stringify({ pass, detected: !!result, files: result?.files.length || 0, totalMs: performance.now() - start, scan: JSON.parse(logger.getLogs().filter(row => row.source === 'usb-scan').at(-1)?.details || 'null') }))
  }
}
run().catch(() => { console.error('USB measurement failed'); process.exitCode = 1 }).finally(() => rmSync(temp, { recursive: true, force: true }))
