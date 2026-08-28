import type { Lecture } from '../../shared/archive'

export type PromptPreset = 'dispensa-lezionify' | 'quiz-esame' | 'formule-algoritmi'

export const PROMPT_PRESETS: Record<
  PromptPreset,
  { title: string; description: string; systemPrompt: string; instruction: string }
> = {
  'dispensa-lezionify': {
    title: 'Dispensa Didattica Lezionify (Gems)',
    description: 'Formatta la dispensa secondo le tue regole di sintesi, enfasi esame, terminologia EN e formule LaTeX',
    systemPrompt: `Sei un assistente didattico universitario di alto livello per uno studente di Ingegneria Magistrale.

Task (Compito):
Convertire le trascrizioni grezze delle lezioni in dispense didattiche strutturate. Devi sintetizzare il parlato, citare brevemente le digressioni non pertinenti e riorganizzare i concetti in una struttura logica gerarchica. Cerca di replicare il filo logico del discorso del professore in modo completo ed immersivo, ma prioritizza la comprensione del concetto.

Operational Constraints (Vincoli Operativi):
- Analisi Enfasi: Se il docente usa ripetizioni o marcatori verbali ("importante", "attenzione", "esame"), classifica quel contenuto come "Concetto Chiave" e dagli priorità visiva (es. callout/grassetto).
- Esercizi: Se viene svolto un esercizio, o un determinato programma, ricostruisci i passaggi logici. Se la trascrizione è lacunosa, integra usando la logica ma dichiara: "Nota: Passaggio integrato con chiarezza didattica".
- Esame: Estrai separatamente ogni indicazione su esami o test in un box/callout "Note per l'Esame".
- Terminologia: Usa l'Italiano come lingua principale. Includi SEMPRE la traduzione inglese per i termini tecnici alla prima occorrenza (es. 'Automa a Stati Finiti (Finite Automaton)').
- Formule e Matematica: Scrivi SEMPRE ogni formula o simbolo matematico rigorosamente in formato LaTeX standard: $...$ per formule inline (es. $f(x) = x^2$) e $$...$$ per equazioni o blocchi isolati (es. $$\\sum_{i=1}^n x_i$$).
- Codice: Usa blocchi di codice con syntax highlighting opportuno (\`\`\`c, \`\`\`python, \`\`\`java, ecc.).

Output Format (Formato Richiesto):
Usa rigorosamente Markdown strutturato nel seguente modo:
# Titolo Lezione (H1)

## Overview Didattica
(Riassunto esecutivo dei concetti)

## Corpo della Lezione
(Usa H2 per sezioni tematiche, H3 per sottosezioni, Bullet points per liste chiare)

> [!NOTE]
> ### Note per l'Esame
> (Consigli, domande tipiche, avvisi del docente sul compito o prova orale)
`,
    instruction: `Genera la dispensa didattica strutturata per questa lezione seguendo rigorosamente tutte le regole e i vincoli operativi indicati nel System Prompt.`
  },
  'quiz-esame': {
    title: 'Quiz & Domande d\'Esame',
    description: 'Estrae possibili domande d\'esame con risposte dettagliate e flashcard',
    systemPrompt: `Sei un assistente didattico universitario per studenti di Ingegneria.`,
    instruction: `Analizza questa lezione ed estrai:
1. Le 5 domande d'esame più probabili su questi argomenti, con relativa risposta modello completa.
2. 5 flashcard rapide (Concetto -> Definizione/Formula) per il ripasso.
3. Formatta tutte le formule matematiche rigorosamente in LaTeX ($...$ e $$...$$) e includi la terminologia inglese tra parentesi.`
  },
  'formule-algoritmi': {
    title: 'Focus Formule & Algoritmi',
    description: 'Schematizza e spiega nel dettaglio tutte le formule matematiche e i passaggi degli algoritmi',
    systemPrompt: `Sei un assistente didattico universitario per studenti di Ingegneria.`,
    instruction: `Concentrati esclusivamente sugli aspetti matematici, computazionali e algoritmici di questa lezione:
1. Estrai tutte le formule matematiche, spiegando il significato di ogni variabile e passaggi di derivazione (formattate in LaTeX $$...$$).
2. Schematizza gli algoritmi, la loro complessità temporale/spaziale ($O(...)$) e i casi limite, con codice o pseudocodice formattato.`
  }
}

export function buildGeminiContextPrompt(
  lecture: Lecture,
  content: { transcriptText?: string | null; markdownText?: string | null },
  preset: PromptPreset = 'dispensa-lezionify'
): string {
  const course = lecture.courseCode ?? 'Corso universitario non specificato'
  const date = lecture.recordedAt
    ? new Date(lecture.recordedAt).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'Data non specificata'

  const bodyText = content.transcriptText
    ? `### TRASCRIZIONE GREZZA DELLA LEZIONE:\n\n${content.transcriptText}`
    : content.markdownText
      ? `### TESTO DELLA LEZIONE (Markdown esistente):\n\n${content.markdownText}`
      : 'Nessun testo associato.'

  const config = PROMPT_PRESETS[preset]

  return `${config.systemPrompt}

---
INFORMAZIONI LEZIONE:
- Corso: ${course}
- Data: ${date}
- File audio sorgente: ${lecture.sourceAudioFileName}
---

${bodyText}

---
ISTRUZIONE:
${config.instruction}
`
}
