# Piano Architetturale: Chat Globale di Corso (RAG Cross-Lezione)

Questo documento descrive in dettaglio la progettazione tecnica, l'analisi dei rischi e delle prestazioni, e le scelte architetturali per l'implementazione della **Chat Globale di Corso** in Lezionify.

> Aggiornamento del 17 ottobre 2026: proposta storica, superata per il comportamento
> effettivo da [Chat di corso e fonti locali](rag-corso-2026-10-17.md).
> Le stime di token e latenza qui sotto non sono risultati misurati.

---

## 🎯 Obiettivo del Modulo

Durante la fase di ripasso ed esame, gli studenti pongono domande orizzontali e comparative che collegano argomenti spiegati in lezioni tenute a settimane di distanza (es. *"In quale lezione abbiamo introdotto il criterio di Routh e come viene applicato negli esercizi successivi?"* oppure *"Fammi un riassunto comparativo tra protocollo TCP e UDP in base a quello che ha spiegato il professore"*).

La **Chat Globale di Corso** permette di interrogare l'AI sull'intero programma didattico di una materia specifica con:
- **Sintesi Cross-Lezione**: correlazione automatica tra dispense e trascrizioni multiple.
- **Citazioni Interattive**: riferimenti espliciti alle lezioni con badge/chip cliccabili che aprono direttamente la lezione citata.
- **Thread Multipli per Materia**: possibilità di aprire più conversazioni tematiche per lo stesso corso.
- **Budget di Token Ottimizzato**: architettura RAG ibrida (Course Map + Top-K chunk) per risposte veloci ed economiche.

---

## 🏗️ Architettura del Flusso Dati

```mermaid
flowchart TD
    User([Studente]) -->|Domanda sul corso| UI[CourseChatModal]
    UI -->|IPC archive:generate-course-qna| MainProcess[ArchiveService]
    
    subgraph RAG Cross-Lezione
        MainProcess --> Search[MiniSearch Course Index]
        Search -->|Top-K sezioni rilevanti| Aggregator[Course Context Aggregator]
        MainProcess --> Repo[Library Repository]
        Repo -->|Indice sintetico delle lezioni del corso| Aggregator
    end
    
    Aggregator -->|Prompt multi-lezione strutturato| Gemini[Gemini 2.5 Flash / Pro]
    Gemini -->|Streaming chunk con citazioni [ref:lectureId]| MainProcess
    MainProcess -->|IPC archive:course-qna-chunk| UI
    UI -->|Click su citazione [Lezione 4]| Drawer[Apre LectureDrawer con focus]
```

---

## 🛡️ Analisi Approfondita dei Rischi & Contromisure

### 1. Keyword Onnipresenti (es. "stabilità" presente in 25 lezioni su 25)
* **Rischio**: Una ricerca full-text semplice restituirebbe troppi risultati generici o sempre le prime lezioni.
* **Soluzione**: **Contesto Ibrido a 2 Livelli**:
  - *Tier 1 (Course Map Outline)*: Iniettiamo sempre l'indice sintetico di tutte le lezioni del corso (data, titolo, capitoli H1/H2) in ~1.000 token.
  - *Tier 2 (Top-K Chunks)*: Peschiamo le 4-6 sezioni più rilevanti tramite scoring BM25 potenziato.

### 2. Controllo del Budget di Token & Quote API
* **Rischio**: Inviare 30 dispense integrali ($160.000\text{ token}$) per ogni messaggio causerebbe latenza elevata (8-15s) e rapido esaurimento delle quote giornaliere.
* **Soluzione**: Con il chunking mirato, il prompt per messaggio rimane contenuto tra **5.000 e 10.000 token**, garantendo risposte in 2-3 secondi e consumi minimi.

### 3. Allucinazione di Citazioni o ID Mancanti
* **Rischio**: L'AI potrebbe inventare un ID lezione inesistente nel formato di citazione `[[ref:ID|Titolo]]`.
* **Soluzione**: Il frontend valida ogni `lectureId` rispetto alle lezioni effettive nell'archivio. Se una lezione citata è stata eliminata o non esiste, il chip viene renderizzato in modalità disattivata `[Lezione rimossa]` senza crash.

### 4. Navigazione Senza Perdita di Contesto (UX Fluida)
* **Rischio**: Cliccando su una citazione (`📚 Lezione 04 - 12/03/2026`) si apre il visualizzatore della lezione, rischiando di chiudere la chat o perdere la bozza di testo che si stava scrivendo.
* **Soluzione**: Lo stato della chat e le bozze rimangono memorizzati nel custom hook; lo studente può aprire la lezione citata e tornare alla chat esattamente da dove era rimasto.

### 5. Streaming Concorrente & Tasto Stop
* **Rischio**: Se lo studente cambia corso o nota che la risposta ha già chiarito il dubbio dopo poche righe, lo stream continuerebbe a consumare token.
* **Soluzione**: Aggiunta del pulsante **"⏹️ Interrompi Generazione"** e tagging di ogni pacchetto dati con `threadId` e `courseCode`.

---

## 📂 Specifiche Tecniche dei Componenti da Implementare

### 1. Contratti Dati (`shared/archive.ts`)
```ts
export interface CourseQnaCitation {
  lectureId: string
  lectureTitle: string
  recordedAt?: string | null
  contextSnippet?: string
}

export interface CourseQnaMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
  citations?: CourseQnaCitation[]
}

export interface CourseQnaThread {
  id: string
  courseCode: string
  title: string
  createdAt: string
  updatedAt: string
  messages: CourseQnaMessage[]
}
```

### 2. Backend Process (`electron/main/`)
* **`fileStorage.ts`**: Metodi `readCourseQnaThreads(courseCode)` e `writeCourseQnaThreads(courseCode, data)`.
* **`archive.ts`**:
  * `loadCourseQnaThreads(courseCode: string): Promise<CourseQnaThread[]>`
  * `saveCourseQnaThreads(courseCode: string, threads: CourseQnaThread[]): Promise<void>`
  * `generateCourseQnaResponse(courseCode: string, thread: CourseQnaThread)`
* **`gemini.ts`**: Generatore `generateCourseQnaResponse` con prompt di sistema per sintesi cross-lezione, formule in LaTeX ($ e $$) e sintassi citazioni `[[ref:lectureId|Titolo]]`.
* **`index.ts` & `preload/index.ts`**: Registrazione dei canali IPC.

### 3. Frontend React (`src/`)
* **`src/components/CourseChatModal.tsx`**: Componente modale split-view con:
  * Lista thread a sinistra con `+ Nuova Chat` ed elimina.
  * Vista messaggi con supporto Markdown + KaTeX, chip di citazione interattivi, suggerimenti di prompt d'esame e tasto Stop.
* **`src/hooks/useCourseQna.ts`**: Custom hook per il caricamento, invio, streaming e salvataggio delle conversazioni di corso.
* **`src/components/Sidebar.tsx` & `src/components/Dashboard.tsx`**: Punti di ingresso con pulsante *"💬 Chat di Corso"*.
* **`src/styles.css`**: Stili Dark e Light per layout split-view, chip di citazione e animazioni.

---

## 📌 Stato del Documento
- **Stato**: `Implementazione successiva disponibile` — leggere il documento del 17 ottobre e il consuntivo in DECISIONI.md.
- **Data di stesura**: 29 Agosto 2026.
