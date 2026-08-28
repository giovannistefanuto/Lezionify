/**
 * Script di test per verificare le chiavi API di Google Gemini e la compatibilità con i modelli Free Tier.
 * 
 * Uso:
 *   node tools/test_gemini_models.mjs <CHIAVE_API>
 */

import { GoogleGenAI } from '@google/genai'

const MODELS_TO_TEST = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Default consigliato)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Matematica avanzata)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Nuovo Flagship)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' }
]

const SAMPLE_PROMPT = `Sei un assistente universitario. Spiega in 2 righe il teorema di Shannon-Nyquist sul campionamento includendo la formula in LaTeX $f_s \\ge 2 f_{max}$.`

async function testApiKey(apiKey) {
  if (!apiKey) {
    console.error('❌ Errore: specifica la chiave API come argomento.')
    console.log('Esempio: node tools/test_gemini_models.mjs AIzaSy...')
    process.exit(1)
  }

  console.log(`\n========================================================`)
  console.log(`🔍 Test Connessione & Modelli Gemini Free Tier`)
  console.log(`Chiave testata: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)
  console.log(`========================================================\n`)

  const ai = new GoogleGenAI({ apiKey })

  for (const modelInfo of MODELS_TO_TEST) {
    process.stdout.write(`⏳ Test ${modelInfo.name.padEnd(42)} [${modelInfo.id}] ... `)
    const startTime = Date.now()
    try {
      const response = await ai.models.generateContent({
        model: modelInfo.id,
        contents: SAMPLE_PROMPT
      })

      const durationMs = Date.now() - startTime
      const text = response.text ? response.text.trim().replace(/\n/g, ' ') : ''
      const preview = text.length > 70 ? `${text.slice(0, 67)}...` : text

      console.log(`✅ OK (${durationMs}ms)`)
      console.log(`   └─ Risposta: "${preview}"\n`)
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`❌ FALLITO (${durationMs}ms)`)
      console.log(`   └─ Errore: ${errorMsg}\n`)
    }
  }

  console.log(`========================================================`)
  console.log(`Test completato.`)
}

const keyArg = process.argv[2] || process.env.GEMINI_API_KEY
testApiKey(keyArg)
