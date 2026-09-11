/**
 * Decripta in memoria le chiavi salvate da Lezionify e le passa via stdin al
 * benchmark Python. Nessuna chiave viene stampata, inserita nella command line
 * o salvata in chiaro.
 */
const { app, safeStorage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

app.setPath('userData', path.join(app.getPath('appData'), 'lezionify'))

function fail(message) {
  console.error(`Errore: ${message}`)
  app.exit(1)
}

app.whenReady().then(() => {
  try {
    const separator = process.argv.indexOf('--')
    const forwardedArgs = separator >= 0 ? process.argv.slice(separator + 1) : process.argv.slice(2)
    if (!safeStorage.isEncryptionAvailable()) {
      fail('safeStorage non e disponibile in questa sessione Windows.')
      return
    }
    const settingsPath = path.join(app.getPath('userData'), 'library', 'settings.json')
    const backupPath = `${settingsPath}.bak`
    let settings
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch {
      settings = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
      console.warn('Impostazioni primarie non leggibili: uso il backup locale.')
    }
    const storedKeys = Array.isArray(settings.apiKeys)
      ? settings.apiKeys
      : typeof settings.apiKey === 'string'
        ? [settings.apiKey]
        : []
    const keys = storedKeys.flatMap((stored) => {
      try {
        const value = settings.keysEncrypted
          ? safeStorage.decryptString(Buffer.from(String(stored), 'base64')).trim()
          : String(stored).trim()
        return value ? [value] : []
      } catch {
        return []
      }
    })
    const uniqueKeys = [...new Set(keys)]
    if (uniqueKeys.length === 0) {
      fail('nessuna chiave Gemini decifrabile nelle impostazioni di Lezionify.')
      return
    }
    console.log(`Chiavi Gemini caricate in memoria: ${uniqueKeys.length} (valori non mostrati).`)
    const scriptPath = path.join(__dirname, 'gemini_transcription_benchmark.py')
    const child = spawn('python', [scriptPath, '--keys-stdin', ...forwardedArgs], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'inherit', 'inherit'],
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: '1' },
    })
    child.stdin.end(JSON.stringify(uniqueKeys))
    child.once('error', (error) => {
      console.error(`Impossibile avviare Python: ${error.message}`)
      app.exit(1)
    })
    child.once('exit', (code) => app.exit(code ?? 1))
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
})
