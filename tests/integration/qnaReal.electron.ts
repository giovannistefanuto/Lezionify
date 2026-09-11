import { app } from 'electron'
import { join } from 'node:path'

import type { QnaThread } from '../../shared/archive'
import { GeminiService } from '../../electron/main/gemini'
import { SettingsService } from '../../electron/main/settings'

async function collect(stream: AsyncGenerator<string>): Promise<string> {
  let response = ''
  for await (const chunk of stream) response += chunk
  return response.trim()
}

async function run(): Promise<void> {
  app.setName('Lezionify')
  await app.whenReady()

  const settings = await new SettingsService(
    join(app.getPath('userData'), 'library')
  ).getSettings()
  const keys = settings.apiKeys.length > 0 ? settings.apiKeys : [settings.apiKey]
  const key = keys[settings.activeKeyIndex] || keys[0]
  if (!key) throw new Error('Nessuna chiave Gemini configurata nell’app.')

  const gemini = new GeminiService()
  const thread: QnaThread = {
    id: 'real-multiturn-check',
    quote: 'Verifica sintetica dello storico di conversazione.',
    contextHeading: 'Collaudo Q&A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        role: 'user',
        text: 'Memorizza il codice FOCUS-2718 e rispondi soltanto CONFERMATO.',
        timestamp: new Date().toISOString()
      }
    ]
  }

  const first = await collect(
    gemini.generateQnaResponse({
      apiKey: key,
      model: settings.model,
      courseCode: 'TEST',
      lectureTitle: 'Collaudo multi-turno',
      thread
    })
  )
  if (!first) throw new Error('Il primo turno non ha prodotto una risposta.')

  thread.messages.push(
    { role: 'ai', text: first, timestamp: new Date().toISOString() },
    {
      role: 'user',
      text: 'Qual era il codice che ti ho chiesto di memorizzare? Rispondi soltanto con il codice.',
      timestamp: new Date().toISOString()
    }
  )
  const second = await collect(
    gemini.generateQnaResponse({
      apiKey: key,
      model: settings.model,
      courseCode: 'TEST',
      lectureTitle: 'Collaudo multi-turno',
      thread
    })
  )
  if (!second.toUpperCase().includes('FOCUS-2718')) {
    throw new Error('Il secondo turno non ha recuperato il dato dallo storico.')
  }

  console.log(
    `PASS: Q&A Gemini reale a 2 turni (${settings.model}); risposte ${first.length}/${second.length} caratteri.`
  )
  app.exit(0)
}

run().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`)
  app.exit(1)
})
