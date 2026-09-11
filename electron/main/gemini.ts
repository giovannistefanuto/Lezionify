import { GoogleGenAI, type Part } from '@google/genai'
import { readFile, stat } from 'node:fs/promises'
import type {
  GeminiModel,
  LectureStudySet,
  TestApiKeyResult,
  QnaThread
} from '../../shared/archive'

export const GEMS_SYSTEM_INSTRUCTION = `Sei un assistente didattico universitario per uno studente di Ingegneria Magistrale.

Task (Compito):
Convertire le trascrizioni grezze delle lezioni in dispense didattiche strutturate. Devi sintetizzare il parlato, citare brevemente le digressioni non pertinenti e riorganizzare i concetti in una struttura logica gerarchica. Cerca di replicare il filo logico del discorso del professore in modo completo ed immersivo, ma prioritizza la comprensione del concetto.
Evita toni eccessivamente accademici, prolissi o da "paper scientifico": mantieni un linguaggio chiaro, accessibile e proporzionato.

Operational Constraints (Vincoli Operativi):
- Analisi Enfasi: Se il docente usa ripetizioni o marcatori verbali ("importante", "attenzione", "esame"), classifica quel contenuto come "Concetto Chiave" e dagli priorità visiva (es. grassetto o box).
- Esercizi: Se viene svolto un esercizio, o un determinato programma, ricostruisci i passaggi logici. Se la trascrizione è lacunosa, integra usando la logica ma dichiara esplicitamente: "Nota: Passaggio integrato con chiarezza didattica".
- Indicazioni d'Esame: Includi indicazioni sull'esame ESCLUSIVAMENTE se il docente ne ha parlato esplicitamente a voce (date, regole, esercizi o argomenti confermati per la prova, parti escluse). NON inventare domande tipiche o quiz fittizi.
- Terminologia: Usa l'Italiano come lingua principale. Includi SEMPRE la traduzione inglese per i termini tecnici alla prima occorrenza (es. 'Automa a Stati Finiti (Finite Automaton)').
- Formule Matematiche: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ per formule inline (es. $f(x) = x^2$) e $$...$$ per equazioni o blocchi isolati (es. $$\\sum_{i=1}^n x_i$$).
- Codice: Usa blocchi di codice con syntax highlighting opportuno (\`\`\`c, \`\`\`python, \`\`\`java, ecc.).
- Schemi Mermaid: Quando una relazione, un processo, una sequenza, uno stato o una gerarchia richiederebbero diversi paragrafi per essere compresi, aggiungi uno schema in un blocco \`\`\`mermaid. Usalo solo quando ha reale valore didattico, mai come decorazione. Sono ammessi esclusivamente flowchart, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram e mindmap. Usa identificatori semplici, etichette testuali tra virgolette, accTitle e accDescr nella lingua della dispensa. Non usare frontmatter, direttive click, link, HTML, classDef, style, linkStyle, theme o configurazioni init.

Output Format (Formato Richiesto):
Usa rigorosamente Markdown strutturato:
# Titolo Lezione (H1)

## Overview Didattica
(Riassunto esecutivo dei concetti)

## Corpo della Lezione
(Usa H2 per sezioni tematiche, H3 per sottosezioni, Bullet points per liste chiare)
`

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export const SEGMENTATION_SYSTEM_INSTRUCTION = `Analizza la seguente lezione e dividila in sezioni. Per farlo, segui RIGOROSAMENTE queste tre regole in ordine di priorità:

1. **Integrità Logica:** Trova i naturali cambi di macroargomento. Non spezzare mai un concetto a metà.

2. **Bilanciamento:** Cerca di fare in modo che ogni parte abbia all'incirca lo stesso numero di frasi/parole.

3. **Ottimizzazione del numero di parti (tra 3 e 5):** Devi usare il numero **MINIMO** di parti strettamente necessario per rispettare le regole 1 e 2. Se 3 parti sono sufficienti per avere sezioni equilibrate e coerenti, non farne 4. Se ne servono 4, non farne 5.


Mostrami il risultato usando questo formato per ogni taglio:

* **Macroargomento:** [Nome dell'argomento]
* **Fine Parte:** "[Cita l'esatta frase finale di questa sezione]"
* **Inizio Parte Successiva:** "[Cita l'esatta frase iniziale della sezione seguente]"
`

export const SECTION_DEEP_SYSTEM_INSTRUCTION = `Sei un assistente didattico universitario per uno studente di Ingegneria Magistrale.

Task (Compito):
Converti questa specifica sezione di trascrizione grezza in una dispensa didattica strutturata. Devi sintetizzare il parlato e riorganizzare i concetti in una struttura logica gerarchica. Cerca di replicare il filo logico del discorso del professore in modo completo ed immersivo, ma prioritizza sempre la comprensione del concetto.
Evita un tono eccessivamente accademico, formale o da "paper scientifico": mantieni un linguaggio chiaro, diretto e accessibile, tipico di una buona lezione spiegata a voce.

Operational Constraints (Vincoli Operativi):
- Proporzionalità: Non allungare artificialmente la lezione. Se il docente fa un esempio veloce o cita un video al volo, riassumilo brevemente senza trasformarlo in una trattazione matematica complessa. Espandi in dettaglio SOLO se il docente stesso ha svolto tutti i calcoli e le dimostrazioni.
- Formule Matematiche: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ inline e $$...$$ per blocchi isolati.
- Analisi Enfasi: Se il docente usa ripetizioni o marcatori verbali ("importante", "attenzione", "esame"), classifica quel contenuto come "Concetto Chiave" con risalto visivo.
- Esercizi: Se viene svolto un esercizio, ricostruisci i passaggi logici. Se necessario integrare passaggi lacunosi per far tornare i calcoli, dichiara: "Nota: Passaggio integrato con chiarezza didattica".
- Terminologia: Italiano con traduzione inglese tra parentesi alla prima occorrenza (es. 'Automa a Stati Finiti (Finite Automaton)').
- Nessuna duplicazione di sezioni d'esame: NON inserire box o sezioni dedicate all'esame in questa parte (verranno gestite a livello globale).
- Schemi Mermaid: Se chiariscono davvero un processo, una sequenza, uno stato, una struttura o una gerarchia, inserisci un blocco \`\`\`mermaid usando solo flowchart, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram o mindmap. Usa identificatori semplici, etichette tra virgolette, accTitle e accDescr in italiano. Non usare frontmatter, click, link, HTML, classDef, style, linkStyle, temi o configurazioni init. Non aggiungere schemi puramente decorativi.

Output Format (Formato Richiesto):
Usa Markdown strutturato (H3 per i titoli principali della sezione, H4 per sottosezioni, Bullet points).
ATTENZIONE: NON inserire un titolo principale H1 o H2 per l'intera lezione, restituisci solo il contenuto relativo a questa sezione.`

export const EXAM_NOTES_EXTRACTION_INSTRUCTION = `Sei un assistente didattico universitario attento e scrupoloso.
Il tuo compito è analizzare la trascrizione di una lezione e identificare ESCLUSIVAMENTE avvisi, indicazioni reali o raccomandazioni esplicite pronunciate a voce dal docente riguardo all'esame:
- Date e modalità della prova o prove intermedie.
- Esercizi o domande che il docente ha dichiarato esplicitamente di richiedere spesso all'esame.
- Argomenti o dimostrazioni che il docente ha espressamente confermato essere fondamentali per la prova d'esame.
- Argomenti o passaggi che il docente ha espressamente detto che NON chiederà all'esame.

REGOLA FONDAMENTALE:
NON inventare MAI domande tipiche, quiz o consigli generici non detti a voce dal docente.
Se nella trascrizione non c'è NESSUN accenno esplicito o avviso sull'esame da parte del docente, rispondi ESATTAMENTE con una sola parola: NESSUNA_INDICAZIONE.

Formato di output (solo se ci sono indicazioni reali):
> [!NOTE]
> ### Note per l'Esame e Avvisi del Docente
> - [Avviso reale 1]
> - [Avviso reale 2]
`

export const COURSE_LOGISTICS_EXTRACTION_PROMPT = `Sei un estrattore di informazioni specializzato.
Il tuo compito è leggere la seguente trascrizione di una lezione universitaria e cercare SOLO ED ESCLUSIVAMENTE informazioni logistiche o regole sul corso e sull'esame.

Cosa devi cercare:
- Regole dell'esame (scritti, orali, voti, penalità).
- Orari, scadenze, o modalità di laboratorio.
- Consigli generali del docente per passare l'esame.
- Assegnazione di homework, compiti o crediti extra.

Cosa DEVI IGNORARE:
- Tutta la spiegazione teorica, formule, o argomenti di lezione pura.

Se non trovi NULLA di logistico in questa lezione, devi rispondere ESATTAMENTE E SOLO con la parola: NO_INFO
Se trovi informazioni logistiche, estraile in un elenco puntato Markdown chiaro e conciso.`

export const COURSE_LOGISTICS_MERGE_PROMPT = `Sei l'archivista logistico del corso.
Il tuo compito è aggiornare il file riepilogativo delle "Informazioni sul Corso e l'Esame" unendo le vecchie informazioni con quelle nuove emerse dall'ultima lezione.

REGOLA CRITICA: NON DEVI ASSOLUTAMENTE CANCELLARE, RIASSUMERE TROPPO O PERDERE NESSUNA INFORMAZIONE PRESENTE NEL FILE VECCHIO. Le informazioni nuove vanno ACCODATE o integrate in modo incrementale sotto le sezioni pertinenti (es. Modalità d'esame, Laboratori, Homework, Consigli del Docente).

Rispondi ESCLUSIVAMENTE restituendo il nuovo file testuale in formato Markdown, pronto per essere salvato (senza backtick di blocco \`\`\`markdown e senza convenevoli). Assicurati che l'organizzazione sia pulita e leggibile.`

export interface SegmentationCut {
  macroargomento: string
  fineParte: string
  inizioParteSuccessiva: string
}

export function cleanMarkdownOutput(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```markdown') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice('```markdown'.length, -3).trim()
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim()
  }
  return cleaned
}

export function parseSegmentationCuts(text: string): SegmentationCut[] {
  const cuts: SegmentationCut[] = []
  const pattern =
    /\*\s*\*\*Macroargomento:\*\*\s*(.+?)\s*\n\s*\*\s*\*\*Fine Parte:\*\*\s*["“«](.+?)["”»]\s*\n\s*\*\s*\*\*Inizio Parte Successiva:\*\*\s*["“«](.+?)["”»]/gis
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    cuts.push({
      macroargomento: match[1].trim(),
      fineParte: match[2].trim(),
      inizioParteSuccessiva: match[3].trim()
    })
  }
  return cuts
}

function normalizeSearchText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9àèéìòù]/gi, '')
}

export function sliceTranscriptByCuts(
  transcript: string,
  cuts: SegmentationCut[]
): { title: string; text: string }[] {
  if (!cuts || cuts.length === 0) {
    return [{ title: 'Trattazione della Lezione', text: transcript }]
  }

  const parts: { title: string; text: string }[] = []
  let currentIndex = 0
  const positions: number[] = []
  let normalizedFull = ''
  for (let j = 0; j < transcript.length; j++) {
    const normalized = normalizeSearchText(transcript[j])
    if (normalized) {
      normalizedFull += normalized
      positions.push(j)
    }
  }

  for (let i = 0; i < cuts.length; i++) {
    if (currentIndex >= transcript.length) break
    const cut = cuts[i]
    let splitIndex = -1

    // 1. Cerca l'inizio della parte successiva
    if (cut.inizioParteSuccessiva) {
      const searchTarget = cut.inizioParteSuccessiva.slice(0, 40)
      const foundPos = transcript.indexOf(searchTarget, currentIndex)
      if (foundPos !== -1) {
        splitIndex = foundPos
      } else {
        // Fallback su testo normalizzato
        const normTarget = normalizeSearchText(searchTarget)
        const normPos = normTarget
          ? normalizedFull.indexOf(
              normTarget,
              positions.findIndex((pos) => pos >= currentIndex)
            )
          : -1
        if (normPos !== -1) {
          // Stima proporzionale dell'indice nel testo originale
          splitIndex = positions[normPos]
        }
      }
    }

    // 2. Fallback: cerca fine della parte corrente
    if (splitIndex === -1 && cut.fineParte) {
      const searchTarget = cut.fineParte.slice(-40)
      const foundPos = transcript.indexOf(searchTarget, currentIndex)
      if (foundPos !== -1) {
        splitIndex = foundPos + searchTarget.length
      }
    }

    // 3. Fallback proporzionale sicuro
    if (splitIndex === -1 || splitIndex <= currentIndex) {
      splitIndex =
        currentIndex +
        Math.max(
          1,
          Math.floor((transcript.length - currentIndex) / (cuts.length - i + 1))
        )
    }

    const chunkText = transcript.slice(currentIndex, splitIndex)
    if (chunkText.length > 0) {
      parts.push({
        title: cut.macroargomento || `Parte ${i + 1}`,
        text: chunkText
      })
    }
    currentIndex = splitIndex
  }

  // Ultima parte rimanente
  const remainingText = transcript.slice(currentIndex)
  if (remainingText.length > 0) {
    parts.push({
      title: `Parte ${parts.length + 1}: Conclusioni e Approfondimenti`,
      text: remainingText
    })
  }

  return parts.length > 0
    ? parts
    : [{ title: 'Trattazione della Lezione', text: transcript }]
}

export function parseMultimodalAudioResponse(raw: string): {
  transcript: string
  markdown: string
} {
  const transcriptSep = '=== TRASCRIZIONE GREZZA ==='
  const dispensaSep = '=== DISPENSA DIDATTICA ==='

  const transcriptParts = raw.split(transcriptSep)
  const markdownParts = raw.split(dispensaSep)
  if (
    transcriptParts.length !== 2 ||
    markdownParts.length !== 2 ||
    raw.indexOf(transcriptSep) > raw.indexOf(dispensaSep)
  ) {
    throw new Error(
      'Risposta audio non valida: separatori mancanti, duplicati o fuori ordine. Riprova la trascrizione.'
    )
  }
  const transcript = transcriptParts[1].split(dispensaSep)[0].trim()
  const markdown = cleanMarkdownOutput(markdownParts[1]).trim()
  if (!transcript || !markdown)
    throw new Error('Risposta audio non valida: una sezione è vuota.')
  return { transcript, markdown }
}

export interface RetryOptions {
  maxRetries?: number
  retryDelayMs?: number
  maxRetryDelayMs?: number
  timeoutMs?: number
  signal?: AbortSignal
  onRetry?: (attempt: number, delayMs: number, reason: string) => void
}

function waitForRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Richiesta Gemini annullata.'))
      return
    }
    const timer = setTimeout(resolve, delayMs)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new Error('Richiesta Gemini annullata.'))
      },
      { once: true }
    )
  })
}

function runBeforeDeadline<T>(
  operation: Promise<T>,
  remainingMs: number,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Richiesta Gemini annullata.'))
    }
    const timer = setTimeout(
      () => reject(new Error('Timeout complessivo della richiesta Gemini.')),
      remainingMs
    )
    signal?.addEventListener('abort', onAbort, { once: true })
    operation.then(
      (value) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(Math.max(1, limit), values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++
        results[index] = await mapper(values[index], index)
      }
    }
  )
  await Promise.all(workers)
  return results
}

export async function callWithRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const isTest =
    process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const retryDelayMs = options?.retryDelayMs ?? (isTest ? 10 : 1_200)
  const maxRetryDelayMs = options?.maxRetryDelayMs ?? (isTest ? 100 : 15_000)
  const timeoutMs = options?.timeoutMs ?? (isTest ? 2_000 : 180_000)
  const deadline = Date.now() + timeoutMs

  let attempt = 0
  while (true) {
    try {
      if (options?.signal?.aborted) throw new Error('Richiesta Gemini annullata.')
      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) throw new Error('Timeout complessivo della richiesta Gemini.')
      return await runBeforeDeadline(fn(), remainingMs, options?.signal)
    } catch (error: unknown) {
      attempt++
      const msg = error instanceof Error ? error.message : String(error)
      const isRetryable =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429') ||
        msg.includes('Overloaded') ||
        msg.includes('fetch failed') ||
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('504')

      if (isRetryable && attempt <= maxRetries) {
        const retryAfterMatch = msg.match(/retry(?: after|-after)[^\d]*(\d+(?:\.\d+)?)/i)
        const hintedDelay = retryAfterMatch
          ? Math.round(Number(retryAfterMatch[1]) * 1000)
          : 0
        const exponentialDelay = retryDelayMs * 2 ** (attempt - 1)
        const jitter = isTest ? 1 : 0.8 + Math.random() * 0.4
        const delayMs = Math.min(
          maxRetryDelayMs,
          Math.max(hintedDelay, Math.round(exponentialDelay * jitter)),
          Math.max(0, deadline - Date.now())
        )
        if (delayMs <= 0) {
          throw new Error('Timeout complessivo della richiesta Gemini.', { cause: error })
        }
        if (options?.onRetry) {
          options.onRetry(attempt, delayMs, msg)
        }
        await waitForRetry(delayMs, options?.signal)
        continue
      }
      throw error
    }
  }
}

export const TRANSLATION_SYSTEM_INSTRUCTION = `You are a precise academic translator specializing in university-level engineering and science lecture notes.

Your task is to translate the following Italian university lecture notes to English.

Rules you MUST follow without exception:
1. Translate ONLY the natural language text: sentences, paragraphs, section titles, descriptions, explanations, and examples written in plain text.
2. Keep ALL LaTeX formulas, LaTeX commands, Markdown syntax (headings #, bold **, italic *, lists -, tables, code blocks), mathematical expressions, variable names, and any technical notation EXACTLY identical — character by character.
3. Do NOT add, remove, or reorder any sections, headings, formulas, or structural elements.
4. Do NOT add commentary, footnotes, or translator's notes.
5. Preserve all line breaks and whitespace structure as faithfully as possible.
6. Preserve any GitHub-style alerts (e.g. > [!NOTE], > [!WARNING]) exactly as they are, translating only the text content inside them.
7. Translate technical terms accurately — use established English terminology for the field (e.g. "Automa a Stati Finiti" → "Finite State Automaton").
8. Keep inline code (\`...\`) and non-Mermaid code blocks (\`\`\`...\`\`\`) completely untouched.
9. For every \`\`\`mermaid block, preserve the diagram type, node identifiers, arrows, relationships and line structure exactly. Translate only human-readable labels enclosed in quotes plus accTitle and accDescr. Never add frontmatter, click, links, HTML, classDef, style, linkStyle, themes or init directives.`

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
        error instanceof Error
          ? error.message
          : 'Errore sconosciuto durante la verifica della chiave.'
      const isModelUnavailable = /404|not found|model.*(?:unavailable|unsupported)/i.test(msg)
      if (isModelUnavailable) {
        return {
          valid: true,
          keyValid: true,
          modelAvailable: false,
          error: 'Chiave valida, ma il modello di verifica non è disponibile per questo account.'
        }
      }
      const isInvalidKey = /400|401|403|api.?key|permission denied|unauthenticated/i.test(msg)
      return isInvalidKey
        ? { valid: false, keyValid: false, error: msg }
        : { valid: false, error: msg }
    }
  }

  async segmentTranscript(params: {
    apiKey: string
    model: GeminiModel
    transcript: string
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): Promise<SegmentationCut[]> {
    const { apiKey, model, transcript, onRetry } = params
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    const prompt = `TESTO DELLA LEZIONE:
${transcript}`

    const rawText = await callWithRetry(
      async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: SEGMENTATION_SYSTEM_INSTRUCTION
          }
        })
        return response.text ?? ''
      },
      { onRetry }
    )

    return parseSegmentationCuts(rawText)
  }

  async generateSectionNotes(params: {
    apiKey: string
    model: GeminiModel
    sectionTitle: string
    sectionTranscript: string
    sectionIndex: number
    totalSections: number
    courseCode: string | null
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): Promise<string> {
    const {
      apiKey,
      model,
      sectionTitle,
      sectionTranscript,
      sectionIndex,
      totalSections,
      courseCode,
      onRetry
    } = params
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    const prompt = `INFORMAZIONI SEZIONE:
- Corso: ${courseCode ?? 'Ingegneria Magistrale'}
- Sezione: ${sectionIndex + 1} di ${totalSections} — ${sectionTitle}

---
TRASCRIZIONE GREZZA DI QUESTA SEZIONE:
${sectionTranscript}

---
ISTRUZIONE:
Elabora questa sezione in modo approfondito seguendo rigorosamente le regole del System Prompt. Includi tutte le formule in LaTeX ($...$ e $$...$$). Non inserire blocchi d'esame in questa sezione.`

    const rawText = await callWithRetry(
      async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: SECTION_DEEP_SYSTEM_INSTRUCTION
          }
        })
        return response.text ?? ''
      },
      { onRetry }
    )

    return cleanMarkdownOutput(rawText)
  }

  async generateOverviewAndTitle(params: {
    apiKey: string
    model: GeminiModel
    transcript: string
    courseCode: string | null
    recordedAt: string | null
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): Promise<{ title: string; overview: string }> {
    const { apiKey, model, transcript, courseCode, recordedAt, onRetry } =
      params
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    const course = courseCode ?? 'Corso universitario'
    const date = recordedAt
      ? new Date(recordedAt).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : ''

    const prompt = `Corso: ${course}
Data: ${date}

TRASCRIZIONE GREZZA DELLA LEZIONE:
${transcript.slice(0, 8000)}

Genera esclusivamente:
1. Il Titolo accademico principale della lezione (formato # Titolo Lezione)
2. L'Overview Didattica introduttiva (formato ## Overview Didattica con riassunto dei concetti chiave)

NON generare altre sezioni e NON inserire note per l'esame.`

    const rawText = await callWithRetry(
      async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: GEMS_SYSTEM_INSTRUCTION
          }
        })
        return response.text ?? ''
      },
      { onRetry }
    )

    const text = cleanMarkdownOutput(rawText)
    return {
      title: text.includes('# ')
        ? text.split('\n')[0]
        : `# Lezione di ${course}`,
      overview: text
    }
  }

  async extractExamNotes(params: {
    apiKey: string
    model: GeminiModel
    transcript: string
    courseCode: string | null
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): Promise<string | null> {
    const { apiKey, model, transcript, courseCode, onRetry } = params
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    const prompt = `Corso: ${courseCode ?? 'Ingegneria'}\n\nTRASCRIZIONE DELLA LEZIONE:\n${transcript}`

    const rawText = await callWithRetry(
      async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: EXAM_NOTES_EXTRACTION_INSTRUCTION
          }
        })
        return response.text ?? ''
      },
      { onRetry }
    )

    const cleaned = cleanMarkdownOutput(rawText)
    if (
      !cleaned ||
      cleaned.includes('NESSUNA_INDICAZIONE') ||
      cleaned.trim() === ''
    ) {
      return null
    }
    return cleaned
  }

  async generateLectureNotes(params: {
    apiKey: string
    model: GeminiModel
    transcript: string
    courseCode: string | null
    recordedAt: string | null
    sourceAudioFileName: string
    onProgress?: (step: string, percent: number) => void
  }): Promise<string> {
    const {
      apiKey,
      model,
      transcript,
      courseCode,
      recordedAt,
      sourceAudioFileName,
      onProgress
    } = params

    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        'Chiave API Gemini mancante. Configurala nelle Impostazioni.'
      )
    }
    if (!transcript || !transcript.trim()) {
      throw new Error('La lezione non ha una trascrizione testuale associata.')
    }

    const retryHandler = (attempt: number, delayMs: number) => {
      if (onProgress) {
        onProgress(
          `Server sovraccarico (503/429). Tentativo ${attempt}/3: attesa di ${Math.round(delayMs / 1000)}s prima di riprovare…`,
          60
        )
      }
    }

    const wordCount = transcript.split(/\s+/).filter(Boolean).length

    // Se il testo è breve (< 1200 parole), eseguiamo in 1 passaggio singolo
    if (wordCount < 1200) {
      if (onProgress) onProgress('Elaborazione dispensa rapida in corso…', 50)
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
      const rawText = await callWithRetry(
        async () => {
          const response = await ai.models.generateContent({
            model: model || 'gemini-3.6-flash',
            contents: prompt,
            config: {
              systemInstruction: GEMS_SYSTEM_INSTRUCTION
            }
          })
          return response.text
        },
        { onRetry: retryHandler }
      )

      if (!rawText || !rawText.trim())
        throw new Error('Gemini non ha restituito alcun testo.')
      if (onProgress) onProgress('Dispensa completata con successo!', 100)
      return cleanMarkdownOutput(rawText)
    }

    // PIPELINE MULTI-STADIO APPROFONDITA (PARALLELIZZATA)
    // Stadio 1: Segmentazione semantica in 3-5 parti con il Gem di taglio
    if (onProgress)
      onProgress('Fase 1/3: Segmentazione semantica in 3-5 macroargomenti…', 20)
    let cuts: SegmentationCut[]
    try {
      cuts = await this.segmentTranscript({
        apiKey,
        model,
        transcript,
        onRetry: retryHandler
      })
    } catch {
      cuts = []
    }

    const parts = sliceTranscriptByCuts(transcript, cuts)

    // Stadio 2: Elaborazione di ciascuna parte IN PARALLELO per massima velocità
    if (onProgress) {
      onProgress(
        `Fase 2/3: Elaborazione didattica di ${parts.length} sezioni in parallelo con formule LaTeX…`,
        50
      )
    }

    const [headerInfo, examNotes] = await Promise.all([
      this.generateOverviewAndTitle({
        apiKey,
        model,
        transcript,
        courseCode,
        recordedAt,
        onRetry: retryHandler
      }),
      this.extractExamNotes({
        apiKey,
        model,
        transcript,
        courseCode,
        onRetry: retryHandler
      })
    ])
    const sectionOutputs = await mapWithConcurrency(parts, 2, (part, i) =>
      this.generateSectionNotes({
            apiKey,
            model,
            sectionTitle: part.title,
            sectionTranscript: part.text,
            sectionIndex: i,
            totalSections: parts.length,
            courseCode,
            onRetry: retryHandler
      })
    )

    // Stadio 3: Assemblaggio finale
    if (onProgress)
      onProgress('Fase 3/3: Assemblaggio finale e note d’esame…', 90)

    let finalDocument = `${headerInfo.overview}

---

${sectionOutputs.join('\n\n---\n\n')}`

    if (examNotes) {
      finalDocument += `\n\n---\n\n${examNotes}`
    }

    if (onProgress) onProgress('Dispensa completata!', 100)
    return cleanMarkdownOutput(finalDocument)
  }

  async transcribeAndGenerateFromAudio(params: {
    apiKey: string
    model: GeminiModel
    audioFilePath: string
    courseCode: string | null
    recordedAt: string | null
    sourceAudioFileName: string
  }): Promise<{ transcript: string; markdown: string }> {
    const {
      apiKey,
      model,
      audioFilePath,
      courseCode,
      recordedAt,
      sourceAudioFileName
    } = params

    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        'Chiave API Gemini mancante. Configurala nelle Impostazioni.'
      )
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

    let uploadedFileName: string | null = null
    try {
      let audioPart: Part
      if (fileStats.size < 20 * 1024 * 1024) {
        const buffer = await readFile(audioFilePath)
        audioPart = {
          inlineData: {
            mimeType: 'audio/mp3',
            data: buffer.toString('base64')
          }
        }
      } else {
        const uploadResult = await ai.files.upload({
          file: audioFilePath,
          config: { mimeType: 'audio/mp3' }
        })
        if (!uploadResult.name) {
          throw new Error('Il server non ha restituito un ID per il file audio.')
        }
        uploadedFileName = uploadResult.name

        let file = await ai.files.get({ name: uploadResult.name })
        const processingDeadline = Date.now() + 5 * 60_000
        while (file.state === 'PROCESSING') {
          if (Date.now() >= processingDeadline) {
            throw new Error(
              'Timeout durante l’elaborazione del file audio sui server Google.'
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 4000))
          file = await ai.files.get({ name: uploadResult.name })
        }

        if (file.state === 'FAILED' || !file.uri) {
          throw new Error(
            'Elaborazione del file audio non riuscita sui server Google.'
          )
        }

        audioPart = {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType || 'audio/mp3'
          }
        }
      }

      const response = await callWithRetry(async () => {
        return await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: [audioPart, prompt],
          config: {
            systemInstruction: GEMS_SYSTEM_INSTRUCTION
          }
        })
      })

      const rawText = response.text
      if (!rawText || !rawText.trim()) {
        throw new Error(
          'Gemini non ha restituito alcun testo dall’analisi audio.'
        )
      }

      const initial = parseMultimodalAudioResponse(rawText)

    // Se la trascrizione estratta dall'audio è lunga, possiamo raffinare la dispensa con la pipeline multi-stadio
      if (initial.transcript && initial.transcript.split(/\s+/).length >= 1200) {
        try {
          const deepMarkdown = await this.generateLectureNotes({
            apiKey,
            model,
            transcript: initial.transcript,
            courseCode,
            recordedAt,
            sourceAudioFileName
          })
          return {
            transcript: initial.transcript,
            markdown: deepMarkdown
          }
        } catch {
          // Se la pipeline multi-stadio fallisce, manteniamo la prima generazione valida
        }
      }

      return initial
    } finally {
      if (uploadedFileName) {
        try {
          await ai.files.delete({ name: uploadedFileName })
        } catch (error) {
          console.warn('Pulizia del file audio remoto non riuscita:', error)
        }
      }
    }
  }

  async extractCourseLogistics(params: {
    apiKey: string
    model?: string
    transcript: string
  }): Promise<string | null> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey })

    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: params.model || 'gemini-3.6-flash',
        contents: [`Trascrizione Lezione:\n\n${params.transcript}`],
        config: {
          systemInstruction: COURSE_LOGISTICS_EXTRACTION_PROMPT,
          temperature: 0.2
        }
      })
    })

    const raw = response.text?.trim()
    if (!raw || raw.includes('NO_INFO')) return null
    return raw
  }

  async mergeCourseLogistics(params: {
    apiKey: string
    model?: string
    existingInfo: string
    newExtractedInfo: string
  }): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey })

    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: params.model || 'gemini-3.6-flash', // Fallback to user model or 3.6-flash because 3.1 Pro is not available
        contents: [
          `FILE ESISTENTE:\n${params.existingInfo}\n\nNUOVE INFORMAZIONI ESTRATTE:\n${params.newExtractedInfo}`
        ],
        config: {
          systemInstruction: COURSE_LOGISTICS_MERGE_PROMPT,
          temperature: 0.1
        }
      })
    })

    const merged = response.text?.trim()
    if (!merged) throw new Error('Failed to merge logistics')
    return cleanMarkdownOutput(merged)
  }

  async generateStudySet(params: {
    apiKey: string
    model?: GeminiModel
    transcript?: string | null
    markdown?: string | null
    courseCode?: string | null
    lectureId: string
  }): Promise<LectureStudySet> {
    const textContent = params.markdown
      ? `DISPENSA DIDATTICA DELLA LEZIONE:\n\n${params.markdown}`
      : `TRASCRIZIONE GREZZA DELLA LEZIONE:\n\n${params.transcript}`

    const ai = new GoogleGenAI({ apiKey: params.apiKey })
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: params.model || 'gemini-3.6-flash',
        contents: [
          `Corso: ${params.courseCode ?? 'Generale'}\n\n${textContent}`
        ],
        config: {
          systemInstruction: STUDY_SET_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      })
    })

    const raw = response.text?.trim()
    if (!raw) throw new Error('Nessuna risposta ricevuta da Gemini.')

    // 1. Pulisci i markdown codeblocks
    let jsonString = cleanMarkdownOutput(raw)
    // 2. Sanifica i backslash singoli che non sono sequenze di escape valide in JSON
    // Questo previene crash (es. \sin, \math) salvando il parser, senza toccare quelli già doppi (\\)
    jsonString = jsonString.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\')

    const parsed: unknown = JSON.parse(jsonString)
    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.questions) ||
      !Array.isArray(parsed.flashcards)
    ) {
      throw new Error('Formato del set di studio non valido.')
    }

    return {
      lectureId: params.lectureId,
      generatedAt: new Date().toISOString(),
      questions: parsed.questions.map((value: unknown, idx: number) => {
        const q = isRecord(value) ? value : {}
        const options = Array.isArray(q.options) ? q.options.map(String) : []
        return {
        id: typeof q.id === 'string' && q.id ? q.id : `q${idx + 1}`,
        question: String(q.question || ''),
        options,
        correctOptionIndex:
          typeof q.correctOptionIndex === 'number' &&
          q.correctOptionIndex >= 0 &&
          q.correctOptionIndex < options.length
            ? q.correctOptionIndex
            : 0,
        explanation: String(q.explanation || ''),
        keyConcept: String(q.keyConcept || 'Concetto chiave')
      }}),
      flashcards: parsed.flashcards.map((value: unknown, idx: number) => {
        const f = isRecord(value) ? value : {}
        return {
        id: typeof f.id === 'string' && f.id ? f.id : `f${idx + 1}`,
        front: String(f.front || ''),
        back: String(f.back || ''),
        category: f.category ? String(f.category) : undefined
      }})
    }
  }

  async *generateQnaResponse(params: {
    apiKey: string
    model: GeminiModel
    courseCode?: string | null
    lectureTitle?: string | null
    thread: QnaThread
    fullLectureText?: string
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): AsyncGenerator<string, void, unknown> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey })
    const { model, courseCode, lectureTitle, thread, fullLectureText } = params

    // Costruiamo il contesto del prompt
    let contextText = ''
    if (fullLectureText) {
      contextText = `CONTENUTO DELL'INTERA LEZIONE:\n${fullLectureText}\n\n`
    }
    contextText += `FRASE SELEZIONATA DALLO STUDENTE SU CUI VERTE LA DOMANDA:\n"${thread.quote}"\n\n`
    if (thread.contextHeading) {
      contextText += `(La frase si trova sotto il paragrafo: "${thread.contextHeading}")\n\n`
    }

    const questionIndex = thread.messages
      .map((m) => m.role === 'user' && !!m.text.trim())
      .lastIndexOf(true)
    if (questionIndex < 0) throw new Error('La domanda Q&A è vuota.')
    let historyContext = ''
    if (thread.messages && thread.messages.length > 1) {
      historyContext = `STORICO DELLA CONVERSAZIONE:\n`
      for (const m of thread.messages
        .slice(0, questionIndex)
        .filter((m) => m.text.trim())) {
        historyContext += `${m.role.toUpperCase()}: ${m.text}\n\n`
      }
    }

    const systemInstruction = `Sei un professore universitario di un corso magistrale (Corso: ${courseCode || 'Sconosciuto'}, Lezione: ${lectureTitle || 'Sconosciuta'}).
Lo studente sta studiando la dispensa e ti fa domande specifiche su una porzione di testo che ha selezionato.
Rispondi in italiano in modo chiaro, proporzionato (né troppo lungo né troppo corto), usando LaTeX ($...$ e $$...$$) per le formule matematiche.
Mantieni il contesto del discorso.

${contextText}
${historyContext}`

    const lastUserMessage = thread.messages[questionIndex].text

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    })

    const isTest =
      process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
    const stream = await callWithRetry(
      () => chat.sendMessageStream({ message: lastUserMessage }),
      {
        maxRetries: 1,
        retryDelayMs: isTest ? 10 : 1200,
        onRetry: params.onRetry
      }
    )

    for await (const chunk of stream) {
      yield chunk.text ?? ''
    }
  }

  async translateToEnglish(params: {
    apiKey: string
    model: GeminiModel
    markdownIta: string
    onRetry?: (attempt: number, delayMs: number, reason: string) => void
  }): Promise<string> {
    const { apiKey, model, markdownIta, onRetry } = params
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() })

    const prompt = `Translate the following Italian lecture notes to English:\n\n${markdownIta}`

    const rawText = await callWithRetry(
      async () => {
        const response = await ai.models.generateContent({
          model: model || 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
            temperature: 0.1
          }
        })
        return response.text ?? ''
      },
      { onRetry }
    )

    return cleanMarkdownOutput(rawText)
  }
}
export const STUDY_SET_SYSTEM_INSTRUCTION = `Sei un docente e assistente didattico universitario per studenti di Ingegneria Magistrale.
Il tuo compito è analizzare il contenuto della lezione (dispensa o trascrizione) ed estrarre un Set di Studio attivo composto da:
1. 5 Domande d'esame a risposta multipla (Quiz):
   - Domande concettuali, teoriche o su problemi/algoritmi/formule tipiche di prove d'esame universitarie.
   - Ogni domanda deve avere esattamente 4 opzioni (A, B, C, D) plausibili, con una sola corretta.
   - Fornisci l'indice 'correctOptionIndex' (da 0 a 3) della risposta esatta.
   - Fornisci una 'explanation' esaustiva che spieghi con chiarezza didattica perché l'opzione è corretta e perché le altre sono errate o fuorvianti.
   - Fornisci 'keyConcept' (nome del concetto o teorema verificato).
   - Formatta rigorosamente OGNI formula o simbolo matematico in formato LaTeX standard ($...$ per inline, $$...$$ per blocchi).

2. 6 Flashcard di ripasso rapido:
   - "front": Domanda precisa, nome del concetto da enunciare, o formula da ricordare.
   - "back": Definizione completa, enunciato, formula in LaTeX o dimostrazione sintetica.
   - "category": Argomento o tipologia (es. "Definizione", "Teorema", "Algoritmo", "Formula").

CRITICO PER JSON: Poiché l'output deve essere un JSON rigorosamente valido, DEVI EFFETTUARE L'ESCAPE DOPPIO di ogni backslash (\\) presente nel codice LaTeX.
Ad esempio, scrivi "\\\\frac{1}{2}" e NON "\\frac{1}{2}". Scrivi "\\\\tau" e NON "\\tau". Scrivi "\\\\textbf" e NON "\\textbf". Se non fai il doppio escape, il JSON.parse fallirà miseramente!

Devi restituire ESCLUSIVAMENTE un JSON valido con questa struttura esatta:
{
  "questions": [
    {
      "id": "q1",
      "question": "Testo della domanda con eventuali formule $f(x)$...",
      "options": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      "correctOptionIndex": 0,
      "explanation": "Spiegazione didattica...",
      "keyConcept": "Nome del concetto"
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "Cosa afferma il principio X?",
      "back": "Spiegazione con formule $$...$$",
      "category": "Teorema"
    }
  ]
}`
