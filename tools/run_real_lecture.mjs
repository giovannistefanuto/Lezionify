import { stat, readFile, writeFile } from 'node:fs/promises'
import { GoogleGenAI } from '@google/genai'

const SEGMENTATION_SYSTEM_INSTRUCTION = `Analizza la seguente lezione e dividila in sezioni. Per farlo, segui RIGOROSAMENTE queste tre regole in ordine di priorità:

1. **Integrità Logica:** Trova i naturali cambi di macroargomento. Non spezzare mai un concetto a metà.

2. **Bilanciamento:** Cerca di fare in modo che ogni parte abbia all'incirca lo stesso numero di frasi/parole.

3. **Ottimizzazione del numero di parti (tra 3 e 5):** Devi usare il numero **MINIMO** di parti strettamente necessario per rispettare le regole 1 e 2. Se 3 parti sono sufficienti per avere sezioni equilibrate e coerenti, non farne 4. Se ne servono 4, non farne 5.


Mostrami il risultato usando questo formato per ogni taglio:

* **Macroargomento:** [Nome dell'argomento]
* **Fine Parte:** "[Cita l'esatta frase finale di questa sezione]"
* **Inizio Parte Successiva:** "[Cita l'esatta frase iniziale della sezione seguente]"
`

const SECTION_DEEP_SYSTEM_INSTRUCTION = `Sei un assistente didattico universitario di alto livello per uno studente di Ingegneria Magistrale.

Task (Compito):
Converti questa specifica sezione di trascrizione grezza di una lezione in una trattazione didattica approfondita, rigorosa ed esaustiva. Devi mantenere TUTTI i dettagli tecnici, le formule matematiche, le dimostrazioni, le definizioni e gli esempi citati dal docente, senza sintetizzare eccessivamente.

Operational Constraints (Vincoli Operativi):
- Completezza e Profondità: Sviluppa in modo dettagliato ogni concetto, dimostrazione o formula presente nel testo.
- Formule Matematiche: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ inline e $$...$$ per blocchi isolati.
- Analisi Enfasi: Classifica i punti ribaditi come "Concetto Chiave" con risalto visivo.
- Esercizi: Ricostruisci tutti i passaggi logici. Se necessario integrare passaggi lacunosi, dichiara: "Nota: Passaggio integrato con chiarezza didattica".
- Terminologia: Italiano con traduzione inglese tra parentesi alla prima occorrenza.
- Note per l'Esame: Raccogli eventuali indicazioni d'esame in un box (> [!NOTE]).

Output Format:
## [Nome Macroargomento]
(Trattazione esaustiva con sottosezioni H3, elenchi, formule LaTeX e spiegazioni)
`

const GEMS_SYSTEM_INSTRUCTION = `Sei un assistente didattico universitario di alto livello per uno studente di Ingegneria Magistrale.

Task (Compito):
Convertire le trascrizioni grezze delle lezioni in dispense didattiche strutturate. Devi sintetizzare il parlato, citare brevemente le digressioni non pertinenti e riorganizzare i concetti in una struttura logica gerarchica. Cerca di replicare il filo logico del discorso del professore in modo completo ed immersivo, ma prioritizza la comprensione del concetto.

Operational Constraints (Vincoli Operativi):
- Analisi Enfasi: Se il docente usa ripetizioni o marcatori verbali ("importante", "attenzione", "esame"), classifica quel contenuto come "Concetto Chiave" e dagli priorità visiva (es. grassetto o box).
- Esercizi: Se viene svolto un esercizio, o un determinato programma, ricostruisci i passaggi logici. Se la trascrizione è lacunosa, integra usando la logica ma dichiara esplicitamente: "Nota: Passaggio integrato con chiarezza didattica".
- Esame: Estrai separatamente ogni indicazione su esami o test in un box "Note per l'Esame" formato come callout (> [!NOTE]).
- Terminologia: Usa l'Italiano come lingua principale. Includi SEMPRE la traduzione inglese per i termini tecnici alla prima occorrenza (es. 'Automa a Stati Finiti (Finite Automaton)').
- Formule Matematiche: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ per formule inline (es. $f(x) = x^2$) e $$...$$ per equazioni o blocchi isolati (es. $$\\sum_{i=1}^n x_i$$).
- Codice: Usa blocchi di codice con syntax highlighting opportuno (\`\`\`c, \`\`\`python, \`\`\`java, ecc.).
`

function cleanMarkdownOutput(raw) {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```markdown') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice('```markdown'.length, -3).trim()
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim()
  }
  return cleaned
}

function parseSegmentationCuts(text) {
  const cuts = []
  const pattern = /\*\s*\*\*Macroargomento:\*\*\s*(.+?)\s*\n\s*\*\s*\*\*Fine Parte:\*\*\s*["“«](.+?)["”»]\s*\n\s*\*\s*\*\*Inizio Parte Successiva:\*\*\s*["“«](.+?)["”»]/gis
  let match
  while ((match = pattern.exec(text)) !== null) {
    cuts.push({
      macroargomento: match[1].trim(),
      fineParte: match[2].trim(),
      inizioParteSuccessiva: match[3].trim()
    })
  }
  return cuts
}

function sliceTranscriptByCuts(transcript, cuts) {
  if (!cuts || cuts.length === 0) {
    return [{ title: 'Trattazione della Lezione', text: transcript.trim() }]
  }

  const parts = []
  let currentIndex = 0

  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i]
    let splitIndex = -1

    if (cut.inizioParteSuccessiva) {
      const searchTarget = cut.inizioParteSuccessiva.slice(0, 35)
      const foundPos = transcript.indexOf(searchTarget, currentIndex)
      if (foundPos !== -1) splitIndex = foundPos
    }

    if (splitIndex === -1 && cut.fineParte) {
      const searchTarget = cut.fineParte.slice(-35)
      const foundPos = transcript.indexOf(searchTarget, currentIndex)
      if (foundPos !== -1) splitIndex = foundPos + searchTarget.length
    }

    if (splitIndex === -1 || splitIndex <= currentIndex) {
      splitIndex = Math.floor(transcript.length * ((i + 1) / (cuts.length + 1)))
    }

    const chunkText = transcript.slice(currentIndex, splitIndex).trim()
    if (chunkText.length > 0) {
      parts.push({
        title: cut.macroargomento || `Parte ${i + 1}`,
        text: chunkText
      })
    }
    currentIndex = splitIndex
  }

  const remaining = transcript.slice(currentIndex).trim()
  if (remaining.length > 0) {
    parts.push({
      title: `Parte ${parts.length + 1}: Conclusioni e Note Applicative`,
      text: remaining
    })
  }

  return parts
}

const AUDIO_PATH = 'C:/Users/Utente/Downloads/2026-0430-16-20-42.MP3'
const TXT_PATH = 'C:/Users/Utente/Downloads/2026-0430-16-20-42.txt'
const OUTPUT_MD_PATH = 'C:/Users/Utente/Downloads/2026-0430-16-20-42.md'
const SETTINGS_PATH = 'C:/Users/Utente/AppData/Roaming/lezionify/library/settings.json'

async function run() {
  console.log('🚀 AVVIO PIPELINE MULTI-STADIO LEZIONE REALE')
  console.log('📁 File audio:', AUDIO_PATH)

  const fileStats = await stat(AUDIO_PATH)
  console.log(`📊 Dimensione audio: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`)

  let settings = {}
  try {
    settings = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'))
  } catch (e) {
    console.error('Errore lettura settings:', e)
    return
  }

  const apiKeys = settings.apiKeys && settings.apiKeys.length > 0 ? settings.apiKeys : [settings.apiKey]
  const activeKey = apiKeys[settings.activeKeyIndex || 0] || apiKeys[0]

  console.log(`🔑 Chiave API selezionata: ${activeKey.slice(0, 8)}... (${apiKeys.length} disponibili nel pool)\n`)

  let fullTranscript = ''
  try {
    fullTranscript = await readFile(TXT_PATH, 'utf8')
    console.log(`✅ Trascrizione esistente caricata da TXT (${fullTranscript.length} caratteri, ${fullTranscript.split(/\s+/).length} parole)`)
  } catch {
    // STEP 1: Trascrizione Audio Integrale
    console.log('🎙️ STEP 1: Upload del file audio e trascrizione con Gemini Multimodale...')
    const ai = new GoogleGenAI({ apiKey: activeKey })

    const uploadResult = await ai.files.upload({
      file: AUDIO_PATH,
      mimeType: 'audio/mp3'
    })

    let file = await ai.files.get({ name: uploadResult.name })
    while (file.state === 'PROCESSING') {
      console.log('   └─ Audio in processing... attesa 4s')
      await new Promise(r => setTimeout(r, 4000))
      file = await ai.files.get({ name: uploadResult.name })
    }
    console.log('   └─ Audio pronto (ACTIVE)!')

    const transPrompt = `Ascolta attentamente questo file audio registrato in aula universitaria.
Trascrivi INTEGRALMENTE e fedelmente tutto il parlato del docente in italiano senza riassumere nulla.`

    const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash']
    let transcriptSuccess = false

    for (const transModel of candidateModels) {
      console.log(`   └─ Tentativo trascrizione con modello: ${transModel}...`)
      try {
        const transResp = await ai.models.generateContent({
          model: transModel,
          contents: [
            { fileData: { fileUri: file.uri, mimeType: file.mimeType || 'audio/mp3' } },
            transPrompt
          ]
        })

        if (transResp && transResp.text) {
          fullTranscript = cleanMarkdownOutput(transResp.text)
          await writeFile(TXT_PATH, fullTranscript, 'utf8')
          console.log(`✅ Trascrizione completata con ${transModel}! Salvata in: ${TXT_PATH} (${fullTranscript.length} caratteri)\n`)
          transcriptSuccess = true
          break
        }
      } catch (err) {
        console.warn(`   ⚠️ Modello ${transModel} temporaneamente non disponibile (${err.message}). Provo fallback...`)
      }
    }

    if (!transcriptSuccess) {
      throw new Error('Impossibile completare la trascrizione audio con i modelli disponibili.')
    }
  }

  // STEP 2: Segmentazione Semantica 3-5 Parti (Gem di Taglio)
  console.log('✂️ STEP 2: Segmentazione semantica in 3-5 parti con il Gem di Taglio...')
  let segKeyIdx = 1 % apiKeys.length
  const segAi = new GoogleGenAI({ apiKey: apiKeys[segKeyIdx] })

  const segResp = await segAi.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `TESTO DELLA LEZIONE:\n${fullTranscript}`,
    config: {
      systemInstruction: SEGMENTATION_SYSTEM_INSTRUCTION
    }
  })

  const segText = segResp.text || ''
  console.log('--- Output Gem di Taglio ---')
  console.log(segText)
  console.log('----------------------------\n')

  const cuts = parseSegmentationCuts(segText)
  console.log(`✅ Riconosciuti ${cuts.length} punti di taglio logici`)

  const parts = sliceTranscriptByCuts(fullTranscript, cuts)
  console.log(`📦 Trascrizione suddivisa in ${parts.length} parti bilanciate:`)
  parts.forEach((p, idx) => {
    console.log(`   [Parte ${idx + 1}] "${p.title}" (${p.text.split(/\s+/).length} parole)`)
  })
  console.log()

  // STEP 3: Sintesi Approfondita per Sezione (Gem Didattico)
  console.log('⚡ STEP 3: Generazione approfondita per ciascuna parte con il Gem Didattico...')
  const sectionOutputs = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const partKey = apiKeys[(i + 2) % apiKeys.length]
    console.log(`   ⏳ Elaborazione Sezione ${i + 1}/${parts.length}: "${part.title}" (chiave ${partKey.slice(0, 8)}...)...`)
    const partAi = new GoogleGenAI({ apiKey: partKey })

    const partPrompt = `INFORMAZIONI SEZIONE:
- Sezione ${i + 1} di ${parts.length} — ${part.title}

---
TRASCRIZIONE GREZZA DI QUESTA SEZIONE:
${part.text}

---
ISTRUZIONE:
Elabora questa sezione in modo approfondito ed esaustivo seguendo rigorosamente le regole del System Prompt. Includi tutte le formule in LaTeX ($...$ e $$...$$) e note operative.`

    const partResp = await partAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: partPrompt,
      config: {
        systemInstruction: SECTION_DEEP_SYSTEM_INSTRUCTION
      }
    })

    const partMd = cleanMarkdownOutput(partResp.text || '')
    sectionOutputs.push(partMd)
    console.log(`   ✅ Sezione ${i + 1} completata (${partMd.length} caratteri)`)
  }

  // STEP 4: Overview e Assemblaggio Finale
  console.log('\n📑 STEP 4: Generazione Overview didattica e unificazione finale...')
  const overviewAi = new GoogleGenAI({ apiKey: apiKeys[0] })
  const overviewResp = await overviewAi.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `TRASCRIZIONE GREZZA DELLA LEZIONE:
${fullTranscript.slice(0, 10000)}

Genera esclusivamente:
# Titolo Accademico della Lezione (H1)

## Overview Didattica
(Sintesi introduttiva dei concetti chiave trattati)`,
    config: {
      systemInstruction: GEMS_SYSTEM_INSTRUCTION
    }
  })

  const headerMd = cleanMarkdownOutput(overviewResp.text || '')

  const finalDispensa = `${headerMd}

---

${sectionOutputs.join('\n\n---\n\n')}`

  await writeFile(OUTPUT_MD_PATH, finalDispensa, 'utf8')
  console.log(`\n🎉🎉🎉 DISPENSA APPROFONDITA COMPLETATA! Salvata in: ${OUTPUT_MD_PATH}`)
  console.log('====================================================================')
  console.log(finalDispensa)
  console.log('====================================================================')
}

run().catch(console.error)
