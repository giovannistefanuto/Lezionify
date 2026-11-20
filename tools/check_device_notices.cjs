// Native read-only smoke check: no device names, addresses or power settings in output.
const { buildSync } = require('esbuild')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
if (process.platform !== 'win32') { console.log('SKIP: Windows Bluetooth API'); process.exit(0) }
const directory = mkdtempSync(join(tmpdir(), 'lezionify-bluetooth-'))
try {
  buildSync({ entryPoints: ['electron/main/bluetoothProbe.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: join(directory, 'probe.cjs') })
  const script = require(join(directory, 'probe.cjs')).BLUETOOTH_PROBE.replace('while ($true)', 'foreach ($once in 1)').replace('Start-Sleep -Seconds 3', '')
  const result = spawnSync(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, encoding: 'utf8', timeout: 30000 })
  let value
  try { value = JSON.parse(result.stdout?.trim()) } catch { throw new Error('Native Bluetooth probe returned no valid result.') }
  if (result.status !== 0 || !Array.isArray(value.names)) throw new Error('Windows Bluetooth connection query unavailable.')
  console.log('PASS: Win32 Bluetooth connection query; read-only, no inquiry or pairing. Device inventory omitted.')
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { rmSync(directory, { recursive: true, force: true }) }
