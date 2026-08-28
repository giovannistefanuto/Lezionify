import { GoogleGenAI } from '@google/genai'
import { readFile, stat } from 'node:fs/promises'
import type { GeminiModel, TestApiKeyResult } from '../../shared/archive'

export const GEMS_SYSTEM_INSTRUCTION = `Sei un assistente didattico universitario di alto livello per uno studente di Ingegneria Magistrale.

Task (Compito):
Convertire le trascrizioni grezze delle lezioni in dispense didattiche strutturate. Devi sintetizzare il parlato, citare brevemente le digressioni non pertinenti e riorganizzare i concetti in una struttura logica gerarchica. Cerca di replicare il filo logico del discorso del professore in modo completo ed immersivo, ma prioritizza la comprensione del concetto.

Operational Constraints (Vincoli Operativi):
- Analisi Enfasi: Se il docente usa ripetizioni o marcatori verbali ("importante", "attenzione", "esame"), classifica quel contenuto come "Concetto Chiave" e dagli priorità visiva (es. grassetto o box).
- Esercizi: Se viene svolto un esercizio, o un determinato programma, ricostruisci i passaggi logici. Se la trascrizione è lacunosa, integra usando la logica ma dichiara esplicitamente: "Nota: Passaggio integrato con chiarezza didattica".
- Esame: Estrai separatamente ogni indicazione su esami o test in un box "Note per l'Esame" formato come callout (> [!NOTE]).
- Terminologia: Usa l'Italiano come lingua principale. Includi SEMPRE la traduzione inglese per i termini tecnici alla prima occorrenza (es. 'Automa a Stati Finiti (Finite Automaton)').
- Formule Matematiche: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ per formule inline (es. $f(x) = x^2$) e $$...$$ per equazioni o blocchi isolati (es. $$\\sum_{i=1}^n x_i$$).
- Codice: Usa blocchi di codice con syntax highlighting opportuno (\`\`\`c, \`\`\`python, \`\`\`java, ecc.).

Output Format (Formato Richiesto):
Usa rigorosamente Markdown strutturato:
# Titolo Lezione (H1)

## Overview Didattica
(Riassunto esecutivo dei concetti)

## Corpo della Lezione
(Usa H2 per sezioni tematiche, H3 per sottosezioni, Bullet points per liste chiare)

> [!NOTE]
> ### Note per l'Esame
> (Consigli, domande tipiche, avvisi del docente sul compito o prova orale)
`

export function cleanMarkdownOutput(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```markdown') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice('```markdown'.length, -3).trim()
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim()
  }
  return cleaned
}

export function parseMultimodalAudioResponse(raw: string): { transcript: string; markdown: string } {
  const transcriptSep = '=== TRASCRIZIONE GREZZA ==='
  const dispensaSep = '=== DISPENSA DIDATTICA ==='

  if (raw.includes(transcriptSep) && raw.includes(dispensaSep)) {
    const afterTranscript = raw.split(transcriptSep)[1]
    const transcriptPart = afterTranscript.split(dispensaSep)[0].trim()
    const dispensaPart = raw.split(dispensaSep)[1].trim()

    return {
      transcript: transcriptPart,
      markdown: cleanMarkdownOutput(dispensaPart)
    }
  }

  // Fallback se l'LLM non ha inserito i separatori esatti
  return {
    transcript: 'Trascrizione generata dall’audio originale tramite Gemini AI.',
    markdown: cleanMarkdownOutput(raw)
  }
}

export class GeminiService {
  async testApiKey(apiKey: string): Promise<TestApiKeyResult> {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: 'Chiave API non inserita.' }
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() })
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: 'Test di verifica connessione. Rispondi con OK.'
      })

      if (response && response.text) {
        return { valid: true }
      }
      return { valid: false, error: 'Risposta non valida dall’API.' }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Errore sconosciuto durante la verifica della chiave.'
      return { valid: false, error: msg }
    }
  }

  async generateLectureNotes(params: {
    apiKey: string
    model: GeminiModel
    transcript: string
    courseCode: string | null
    recordedAt: string | null
    sourceAudioFileName: string
  }): Promise<string> {
    const { apiKey, model, transcript, courseCode, recordedAt, sourceAudioFileName } = params

    if (!apiKey || !apiKey.trim()) {
      throw new Error('Chiave API Gemini mancante. Configurala nelle Impostazioni.')
    }
    if (!transcript || !transcript.trim()) {
      throw new Error('La lezione non ha una trascrizione testuale associata.')
    }

    const course = courseCode ?? 'Corso universitario non specificato'
    const date = recordedAt
      ? new Date(recordedAt).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : 'Data non specificata'

    const prompt = `INFORMAZIONI LEZIONE:
- Corso: ${course}
- Data: ${date}
- File audio sorgente: ${sourceAudioFileName}

---
TRASCRIZIONE GREZZA DELLA LEZIONE:
${transcript}

---
ISTRUZIONE:
Genera la dispensa didattica strutturata per questa lezione seguendo rigorosamente tutte le regole e i vincoli operativi indicati nel System Prompt.`

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: GEMS_SYSTEM_INSTRUCTION
      }
    })

    const rawText = response.text
    if (!rawText || !rawText.trim()) {
      throw new Error('Gemini non ha restituito alcun testo.')
    }

    return cleanMarkdownOutput(rawText)
  }

  async transcribeAndGenerateFromAudio(params: {
    apiKey: string
    model: GeminiModel
    audioFilePath: string
    courseCode: string | null
    recordedAt: string | null
    sourceAudioFileName: string
  }): Promise<{ transcript: string; markdown: string }> {
    const { apiKey, model, audioFilePath, courseCode, recordedAt, sourceAudioFileName } = params

    if (!apiKey || !apiKey.trim()) {
      throw new Error('Chiave API Gemini mancante. Configurala nelle Impostazioni.')
    }

    const fileStats = await stat(audioFilePath)
    if (!fileStats.isFile()) {
      throw new Error('File audio non trovato o non valido.')
    }

    const course = courseCode ?? 'Corso universitario non specificato'
    const date = recordedAt
      ? new Date(recordedAt).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : 'Data non specificata'

    const prompt = `Ascolta attentamente questo file audio registrato in aula universitaria.
File sorgente: ${sourceAudioFileName}
Corso: ${course}
Data: ${date}

Esegui due compiti obbligatori:

1. Trascrivi fedelmente e integralmente il parlato in italiano, delimitando questa sezione con:
=== TRASCRIZIONE GREZZA ===
[Trascrizione qui]

2. Subito dopo, converti la lezione in una dispensa didattica strutturata e approfondita con formule LaTeX standard ($...$ e $$...$$) secondo i vincoli Gems, delimitando con:
=== DISPENSA DIDATTICA ===
[Dispensa in Markdown qui]`

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    // Caricamento audio: se < 20MB carichiamo in base64 inline, altrimenti tramite Files API
    let audioPart: any
    if (fileStats.size < 20 * 1024 * 1024) {
      const buffer = await readFile(audioFilePath)
      audioPart = {
        inlineData: {
          mimeType: 'audio/mp3',
          data: buffer.toString('base64')
        }
      }
    } else {
      const uploadResult = await (ai.files as any).upload({
        file: audioFilePath,
        mimeType: 'audio/mp3'
      })
      audioPart = uploadResult
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3.6-flash',
      contents: [audioPart, prompt],
      config: {
        systemInstruction: GEMS_SYSTEM_INSTRUCTION
      }
    })

    const rawText = response.text
    if (!rawText || !rawText.trim()) {
      throw new Error('Gemini non ha restituito alcun testo dall’analisi audio.')
    }

    return parseMultimodalAudioResponse(rawText)
  }
}
