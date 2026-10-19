# Piano di Implementazione — Pubblicazione Automatica delle Lezioni su GitHub

> **Scopo**: documento di handoff completo per implementare il sistema di pubblicazione
> automatica delle lezioni completate su un repository GitHub pubblico. Ogni sezione
> spiega *cosa* fare, *perché*, *come*, e *dove stare attenti*.
>
> **Data**: 2026-10-01  
> **Decisione di riferimento**: D-0176

## Presentazione leggibile e bilingue (2026-10-02)

D-0197 aggiorna il layout pubblico a `<nome-corso>/AAAA-MM-GG/` e, per più
lezioni dello stesso giorno, `<nome-corso>/AAAA-MM-GG/<titolo>/`. Non vengono
aggiunti hash, numeri di sequenza o identificativi ai nomi. Corsi o titoli
equivalenti dopo sanitizzazione e confronto senza distinzione maiuscole/minuscole
bloccano la sincronizzazione prima delle scritture con una richiesta di rinomina.

L'allowlist comprende `schema.md`, `schema.en.md` quando la traduzione esiste,
`trascrizione.txt`, README e `.gitignore`. Il reader inglese riceve il nome del
Markdown italiano, secondo il contratto di `FileStorageService.readMarkdownEn`.
Una traduzione dichiarata nei metadati ma mancante o vuota impedisce la
pubblicazione della lezione: non viene nascosta come una normale traduzione in attesa.
La pubblicazione non chiama l'AI. La conclusione di una traduzione nell'app
richiede una sincronizzazione, oltre ai trigger e controlli periodici esistenti.

I README spiegano il progetto, lettura online/offline, fonti, limiti delle
elaborazioni AI e navigazione ITA/EN. Le date nell'indice sono leggibili e ordinate
cronologicamente; i link usano date ISO. Anche modifiche o mancanze dei README
remoti vengono riparate quando i testi delle lezioni sono invariati.

La migrazione ritira solo file generati in percorsi del checkpoint o del precedente
layout deterministico. Rimuove singoli file, mai ricorsivamente cartelle; materiali
estranei vengono conservati. Gli indici dei corsi precedenti vengono rimossi solo
se non rimangono lezioni complete. Lo staging include una allowlist delle rimozioni,
usa pathspec letterali e `git rm --ignore-unmatch` per riprendere dopo un commit
locale il cui push è fallito. La cronologia Git conserva i percorsi precedenti.

Il README del codice rimanda all'archivio pubblico. La proposta per una repository
unica è in [repository-portfolio-plan.md](repository-portfolio-plan.md): il codice
non viene trasferito alla destinazione degli appunti in questa fase.

Le sezioni del 1 ottobre qui sotto restano il consuntivo storico precedente a
questa modifica; le esclusioni delle traduzioni e i percorsi con hash sono superati.

### Verifica e pubblicazione

Quality gate superato: typecheck, lint, 364 test Vitest (85 nella suite publishing),
14 regressioni Python, 32 scenari React/Electron e build. Dieci nuove regressioni
coprono inglese, nomi leggibili, collisioni, ordine delle date, README modificati,
migrazione, rinomina e ripresa dopo push fallito.

Pubblicate 16 lezioni nei quattro corsi della destinazione degli appunti già
configurata: commit `525076e1572b8ba1e3b6ceda24976ffadeeff406`.
Verificati 16 file ITA, 16 EN, 16 trascrizioni e nessun percorso con hash nel commit.
README pubblico letto anche da GitHub. Nessuna chiamata AI; impostazioni e
`library.json` invariati. Il collaudo remoto ha usato clone e checkpoint isolati
per evitare scritture nello stato in memoria dell'app già aperta.

L'harness iniziale non riusciva a decifrare il PAT e si è fermato prima di Git:
il profilo Chromium isolato deve usare la stessa directory per `userData` e
`sessionData`, con il solo `os_crypt` cifrato copiato prima dell'avvio. Corretta la
preparazione del profilo, la sincronizzazione è riuscita; nessun segreto nei log.

Setup Windows rigenerato e verificato: 141 file della build identici ad `app.asar`,
FFmpeg incluso, dati personali esclusi, manifesto SHA512 e dimensione corretti.
SHA256 setup: `6aea0e8d47c91ac0cbe2c1308b72053e894cfd2377c8d4933f52c7566b35e2ba`.
Smoke del pacchetto con profilo temporaneo e rete bloccata riuscito: renderer,
bridge IPC, pipeline vuota e corsi. Una copia del setup precedente è conservata
in `local-artifacts/installer-before-readable-lessons/`.

**Azione dell'autore:** chiudere l'app e installare il nuovo setup prima delle
prossime sincronizzazioni. Il processo attualmente aperto contiene ancora il
publisher precedente e potrebbe ricreare le cartelle con hash. Non è stata
eseguita un'installazione automatica né chiusa l'app dell'utente.

## Implementazione consegnata (2026-10-01)

Le fasi 1–11 sono implementate, con la successiva richiesta di sincronizzazione
completamente automatica. Gli esempi nelle sezioni successive descrivono il
piano originale: per comportamento e contratti effettivi fare riferimento ai moduli
in `electron/main/publishing/` e a `shared/archive.ts`.

- Pubblicazione disattivata nelle impostazioni precedenti. Quando configurata e
  abilitata, parte in background dopo la creazione della finestra (se
  `autoPublishOnStartup` è attivo) e dopo la finalizzazione di una pipeline
  `completed` o `completed_with_errors`. Una pipeline ripristinata da disco non
  viene scambiata per una nuova conclusione. Il passaggio a pausa o stop non
  richiede un controllo aggiuntivo; rimane attivo il controllo periodico.
- `PublishingSettings` accetta `githubToken` solo in scrittura. Le risposte di
  `archive:get-settings` e `archive:save-settings` lo omettono; ometterlo nelle
  scritture successive conserva la credenziale, passare la stringa vuota la cancella.
  `archive:get-publishing-status` restituisce solo configurazione, abilitazione,
  conteggio e ultimo esito. `archive:publish-lectures` avvia il batch manuale e
  rifiuta l'avvio durante una pipeline attiva.
- Il PAT usa un indicatore `tokenEncrypted` autonomo e `safeStorage`. Senza
  crittografia il salvataggio del PAT viene rifiutato; credenziali non decifrabili
  disabilitano la pubblicazione. Nessun fallback in chiaro e nessuna lettura di
  librerie o credenziali reali durante implementazione e test.
- Autenticazione Git tramite header HTTPS e configurazione temporanea nell'ambiente
  dei soli comandi di rete, secondo la [documentazione Git](https://git-scm.com/docs/git-config#Documentation/git-config.txt-GITCONFIGCOUNT).
  Il token non viene inserito in argv, URL remoti, helper delle credenziali,
  `.git/config`, log o errori. I comandi hanno timeout, prompt disabilitati e
  output degli errori sostituito con messaggi controllati. I redirect HTTP sono
  disabilitati e il push usa esplicitamente l'URL GitHub validato. `core.longpaths`
  supporta i percorsi Windows profondi; `git add` usa batch di massimo 50 file
  per rispettare il limite della riga di comando. L'index preesistente è letto
  con separatori NUL, per gestire correttamente spazi e Unicode.
- `publish-state.json` versione 1 contiene `destinations`, indicizzato da hash di
  repository e branch, ciascuno con `publishedLectures`, `lastPublishAt` e
  `lastError`. I clone sono sotto `publish-repo/<hash-destinazione>/`.
  Cambiare destinazione non trasferisce commit locali o flag di pubblicazione.
- Percorsi: `<nome-corso>--<hash-codice>/YYYY-MM-DD/<hash-id-lezione>/schema.md`
  e `trascrizione.txt`. I suffissi sono deterministici: distinguono nomi di corsi
  equivalenti su Windows e più registrazioni nello stesso giorno. `recordedAt`
  supporta i timestamp reali dell'archivio, con controllo della data calendario.
  Symlink/junction, traversal e nomi Windows riservati sono gestiti prima delle
  scritture. I README indicizzano le lezioni complete con link codificati.
- Si leggono entrambe le fonti prima di copiare; si aggiungono a Git solo i due
  file di testo, i README e `.gitignore`. Audio, traduzioni, Q&A e dati privati
  dell'app non fanno parte dell'allowlist. Uno staging estraneo già presente
  interrompe la pubblicazione. Un errore di scrittura interrompe il batch.
- Commit vuoti eseguono comunque il push: un commit del tentativo precedente
  potrebbe essere ancora locale. Lo stato e i conteggi cambiano solo dopo push
  confermato e persistenza atomica riuscita. Il commit registrato è quello dopo
  l'eventuale rebase. Il rifiuto non-fast-forward consente un solo recupero;
  fetch e conflitti non vengono ignorati. Clone temporanei rendono riprendibile
  un primo clone fallito; sono supportati repository GitHub vuoti. Il clone
  conserva la storia completa per consentire il rebase di commit non inviati.
- Un clone corrotto richiede controllo locale: non viene cancellato
  automaticamente, per preservare eventuali commit non inviati. Eliminare una
  lezione locale non elimina il contenuto già pubblicato su GitHub.

La fase 11 è ora disponibile nelle Impostazioni: repository HTTPS, PAT mascherato,
consenso alla pubblicazione automatica e stato aggiornato senza pulsante Pubblica.
La configurazione rimane disponibile tramite il contratto `saveSettings` con
un oggetto `publishing` completo: `enabled`, `repoUrl`, `branch`,
`autoPublishOnStartup`, ed eventualmente `githubToken`. Il repository deve essere
creato separatamente su GitHub e destinato al materiale che si vuole condividere;
Lezionify non crea repository né cambia la loro visibilità. Non sono stati
effettuati push reali o modifiche alla libreria dell'utente; nessuna credenziale
reale è stata utilizzata per il collaudo.

La verifica offline è descritta in `tests/unit/publishing.test.ts`: persistenza,
cifratura, confine IPC, trigger automatici, mutex, cambio destinazione, push
fallito/commit vuoto, rebase, collisioni, percorsi e README. Git e rete sono
sostituiti da un runner sintetico nei test. Il collaudo remoto con repository
e PAT dedicati resta da svolgere dopo la configurazione.

**Esito finale:** `npm run check` superato il 2026-10-01: typecheck, lint,
324 test Vitest (59 nuovi test di pubblicazione), 14 test Python, 30 scenari
React/Electron e build di produzione. Verificato anche il contratto di
pubblicazione nel preload compilato e `git diff --check` sui file modificati.
I test di pubblicazione bloccano `fetch` e verificano che non venga invocato.
Questo primo consuntivo precede l'implementazione della UI e la nuova build installabile.

### Estensione: sincronizzazione interamente automatica

- Una volta inseriti URL e token nelle Impostazioni e abilitata la sincronizzazione,
  il salvataggio avvia il controllo in background. La UI conserva il PAT salvato
  quando il campo rimane vuoto e cancella il valore digitato dopo successo o chiusura.
  Il PAT non è richiesto alla chat e non viene salvato in file di progetto.
- All'avvio e ogni cinque minuti il servizio verifica direttamente la connessione
  a GitHub tramite fetch. Il controllo avviene anche senza nuove lezioni: non si
  usa un ping generico o il solo indicatore online del browser.
- `git ls-tree -r -z` sul branch remoto appena recuperato restituisce gli hash dei
  blob. Questi vengono confrontati con i due testi locali; i checkpoint includono
  anche un hash SHA256 di contenuto e percorso. Una dispensa modificata viene
  aggiornata; un testo eliminato o modificato da remoto viene ripristinato dalla
  fonte locale. Le copie pubblicate non sostituiscono mai le fonti sul computer.
  I fine riga della copia pubblica sono normalizzati LF; le fonti rimangono intatte.
- `AutomaticPublisher` accorpa modifiche ravvicinate, conserva una richiesta
  arrivata durante un push e rinvia il controllo mentre lavora la pipeline AI.
  Errori e rete assente producono retry dopo 30, 60, 120, 240 secondi e poi al
  massimo ogni cinque minuti. La chiusura interrompe i timer; il prossimo avvio
  riconcilia eventuali push interrotti. Salvataggio di dispense, trascrizioni,
  metadati e configurazione richiede un nuovo controllo; il completamento della
  pipeline lo anticipa. Pausa della pipeline non forza una pubblicazione.
- Il pannello mostra connessione assente, verifica, sincronizzazione, ultimo
  controllo, modifiche pendenti ed errori di autenticazione sanitizzati. Nessun
  pulsante Pubblica o Testa connessione: il controllo è automatico.
- Non sono eliminate automaticamente le copie già pubblicate quando una lezione
  viene cancellata o riclassificata localmente. La libreria locale resta autorevole
  per il contenuto dei percorsi attualmente associati alle lezioni pubblicabili.

Verifica dell'estensione: `npm run check` passato con 338 test Vitest (73 per
pubblicazione e scheduler), 14 Python, 32 scenari React/Electron, typecheck, lint e
build; verifica UI di produzione in un profilo temporaneo con token sintetico e
pubblicazione disabilitata. Nessun push reale o utilizzo delle credenziali dell'utente.

**Setup Windows aggiornato:** `dist/Lezionify-Setup-0.1.0.exe`, 167923897 byte,
SHA256 `451b5fa5b1f7bb1f739e252f85b6a92f575a849f9b2383d622b96ffc2c89762e`.
141 file di build verificati byte per byte in `app.asar`, manifesto SHA512 e
dimensione verificati, FFmpeg presente e artefatti personali esclusi. Il pacchetto
è stato avviato nel runtime Electron con profilo temporaneo e rete disabilitata;
renderer, IPC, cifratura del token sintetico, omissione del token nelle risposte,
campo password vuoto, stato e assenza del pulsante Pubblica verificati. Preview
chiara/scura controllata. Conservata una copia locale del setup precedente.
Setup non firmato; installazione nel profilo reale non eseguita.

### Correzione del controllo Git al primo avvio (D-0182)

`git --version` viene eseguito dalla directory di lavoro esistente del processo.
Prima il controllo usava la directory del clone, ancora assente alla prima
sincronizzazione: `child_process` restituiva `ENOENT` anche con Git installato,
mostrando erroneamente «Git non trovato nel PATH». Riprodotto su Windows con
Git 2.47.1; il controllo corretto non crea il clone e non riceve il PAT.
Due regressioni offline coprono il clone assente e Git realmente indisponibile.
Quality gate passato con 340 test Vitest (75 pubblicazione/scheduler), 14 Python,
32 scenari React/Electron, typecheck, lint e build.

Setup rigenerato dopo il fix: `dist/Lezionify-Setup-0.1.0.exe`, 167923749 byte,
SHA256 `4b7303cdf662b3f23f8b909714b6b43f9b1b8b66b25f2842269500ce7f034402`.
141 file di build identici in `app.asar`, SHA512 e dimensione del manifesto
verificati. Il client del vecchio pacchetto falliva la prova con clone assente;
il pacchetto corretto esegue `git --version` reale e arriva alla clonazione.
Profilo temporaneo, token sintetico e comandi di rete bloccati: nessun push reale.
Setup precedente conservato localmente; nessuna installazione nel profilo utente.

---

## Indice

1. [Contesto e vincoli](#1-contesto-e-vincoli)
2. [Assunzioni operative](#2-assunzioni-operative)
3. [Nuovi file da creare](#3-nuovi-file-da-creare)
4. [File esistenti da modificare](#4-file-esistenti-da-modificare)
5. [Fase 1 — Tipi e contratti condivisi](#5-fase-1--tipi-e-contratti-condivisi)
6. [Fase 2 — PublishState (persistenza stato)](#6-fase-2--publishstate-persistenza-stato)
7. [Fase 3 — PublishGitClient (operazioni git)](#7-fase-3--publishgitclient-operazioni-git)
8. [Fase 4 — ReadmeGenerator](#8-fase-4--readmegenerator)
9. [Fase 5 — PublishService (orchestratore)](#9-fase-5--publishservice-orchestratore)
10. [Fase 6 — Integrazione in ArchiveService](#10-fase-6--integrazione-in-archiveservice)
11. [Fase 7 — Settings: validazione e cifratura token](#11-fase-7--settings-validazione-e-cifratura-token)
12. [Fase 8 — IPC e Preload](#12-fase-8--ipc-e-preload)
13. [Fase 9 — Hook di avvio in index.ts](#13-fase-9--hook-di-avvio-in-indexts)
14. [Fase 10 — Test unitari](#14-fase-10--test-unitari)
15. [Fase 11 (futura) — UI](#15-fase-11-futura--ui)
16. [Matrice degli errori](#16-matrice-degli-errori)
17. [Checklist di accettazione](#17-checklist-di-accettazione)
18. [Trappole e punti di attenzione](#18-trappole-e-punti-di-attenzione)

---

## 1. Contesto e vincoli

### Cos'è Lezionify

App desktop Electron + React + TypeScript. Lo studente importa audio di lezioni,
l'app li trascrive (Gemini ASR), genera dispense strutturate in Markdown (Gemini) e
conserva tutto in una libreria locale sotto `app.getPath('userData')/library/`.

### Struttura dati locale (da `FileStorageService`)

```
library/
├── audio/              ← file .mp3 (da registratore USB)
├── transcripts/        ← file .txt (trascrizione grezza)
├── markdown/           ← file .md (dispensa ITA) e _en.md (traduzione EN)
├── course_info/        ← info logistiche dei corsi
├── study_sets/         ← quiz e flashcard
├── qna/                ← thread domande e risposte
├── highlights/         ← evidenziature
├── ai-jobs/            ← checkpoint della pipeline AI
├── lectures.json       ← indice delle lezioni (array di Lecture)
├── settings.json       ← impostazioni (chiavi cifrate, corsi, modello)
└── study_sessions.json ← sessioni di studio
```

### Interfaccia `Lecture` (da `shared/archive.ts`)

```typescript
export interface Lecture {
  id: string
  title?: string | null
  courseCode: string | null          // ← sigla corso (es. "RL")
  recordedAt: string | null          // ← data lezione "YYYY-MM-DD"
  sourceAudioFileName: string
  sourceTranscriptFileName: string | null
  audioFileName: string
  transcriptFileName: string | null  // ← es. "uuid.txt" in transcripts/
  markdownFileName: string | null    // ← es. "uuid.md" in markdown/
  markdownEnFileName: string | null
  byteSize: number
  durationSeconds?: number
  checksum: string
  importedAt: string
  status: LectureStatus
  studyStatus: StudyStatus
}
```

### Corsi (da `AppSettings`)

```typescript
courses?: Record<string, CourseDefinition>
// CourseDefinition ha: code, name?, startDate, endDate, schedule, ...
```

### Vincoli GitHub

| Vincolo | Limite |
|---|---|
| File singolo (git standard) | 100 MB max |
| Repo consigliata | < 1 GB (warning a 5 GB) |
| GitHub Pages sito | < 1 GB |

**Solo testo** (trascrizione ~50 KB + schema ~100 KB ≈ 150 KB per lezione):
90 lezioni × 150 KB = **~14 MB per semestre** → nessun problema con i limiti.

### Git installato sulla macchina

```
git version 2.49.0.windows.1
```

Git è già disponibile. Non servono librerie JS pure.

---

## 2. Assunzioni operative

Queste assunzioni guidano l'implementazione. Se l'utente dice diversamente, adattare.

| # | Assunzione | Motivazione |
|---|---|---|
| A1 | **Solo testo** (no audio nella repo pubblica) | Audio occupa troppo spazio; i compagni vogliono leggere, non riascoltare |
| A2 | **Git come dipendenza esterna** — `git` deve essere nel PATH | Già installato; evita la complessità di isomorphic-git |
| A3 | **PAT (Personal Access Token)** per autenticazione | Più semplice di SSH key o GitHub App |
| A4 | **Token cifrato con `safeStorage`** come le API key Gemini | Pattern esistente in `settings.ts` |
| A5 | **Pubblicazione all'avvio + dopo completamento pipeline** | "Non pensarci più" |
| A6 | **Branch `main`** di default | Standard GitHub |
| A7 | **Il file `schema.md` è `markdownFileName`** — la dispensa ITA | Confermato dal data model |

---

## 3. Nuovi file da creare

```
electron/main/publishing/
├── publishState.ts          ← Persistenza atomica dello stato di pubblicazione
├── publishGitClient.ts      ← Wrapper git: clone, pull, add, commit, push
├── publishService.ts        ← Orchestratore: discovery, staging, publish
└── readmeGenerator.ts       ← Generazione README.md radice e per corso

tests/unit/
└── publishing.test.ts       ← Suite test (offline, mock git)
```

---

## 4. File esistenti da modificare

| File | Modifica |
|---|---|
| `shared/archive.ts` | Aggiungere tipo `PublishingSettings`, campi in `AppSettings`, metodi in `ArchiveApi` |
| `electron/main/settings.ts` | Validazione dei nuovi campi `publishing`, cifratura/decifratura del token GitHub |
| `electron/main/archive.ts` | Integrare `PublishService`, esporre metodi di pubblicazione |
| `electron/main/index.ts` | Aggiungere handler IPC per i metodi di pubblicazione |
| `electron/preload/index.ts` | Esporre i nuovi canali IPC al renderer |
| `STRUTTURA_PROGETTO.md` | Documentare la nuova cartella `publishing/` |

---

## 5. Fase 1 — Tipi e contratti condivisi

**File**: `shared/archive.ts`

### 5.1 Nuovo tipo `PublishingSettings`

Aggiungere **dopo** l'interfaccia `AppSettings` (o dentro di essa come campo):

```typescript
export interface PublishingSettings {
  enabled: boolean              // default: false
  repoUrl: string               // es. "https://github.com/user/lezionify-notes.git"
  githubToken: string           // PAT — cifrato in settings.json, qui in chiaro
  branch: string                // default: "main"
  autoPublishOnStartup: boolean // default: true
}
```

### 5.2 Aggiungere campo `publishing` ad `AppSettings`

```typescript
export interface AppSettings {
  // ... campi esistenti ...
  publishing?: PublishingSettings
}
```

### 5.3 Nuovo tipo `PublishResult`

```typescript
export interface PublishResult {
  published: number     // lezioni pubblicate con successo
  skipped: number       // lezioni saltate (file mancanti, etc.)
  errors: string[]      // messaggi di errore leggibili
  commitHash?: string   // hash del commit se push riuscito
}
```

### 5.4 Aggiungere metodi ad `ArchiveApi`

```typescript
export interface ArchiveApi {
  // ... metodi esistenti ...
  publishLectures: () => Promise<PublishResult>
  getPublishingStatus: () => Promise<{
    configured: boolean
    enabled: boolean
    unpublishedCount: number
    lastPublishAt: string | null
    lastError: string | null
  }>
}
```

### ATTENZIONE

- Non spostare né riformattare codice esistente in `archive.ts`.
- Aggiungere i nuovi tipi **dopo** quelli esistenti, prima della definizione di `ArchiveApi`.
- Aggiungere i nuovi metodi **alla fine** dell'interfaccia `ArchiveApi`.

---

## 6. Fase 2 — PublishState (persistenza stato)

**File**: `electron/main/publishing/publishState.ts`

### 6.1 Scopo

Tracciare quali lezioni sono state pubblicate con successo. Lo stato viene scritto
**solo dopo** un push git confermato. In caso di crash o errore, le lezioni vengono
ri-pubblicate al prossimo avvio (git è idempotente su contenuto identico).

### 6.2 Formato su disco

File: `library/publish-state.json`

```json
{
  "version": 1,
  "publishedLectures": {
    "uuid-1": {
      "publishedAt": "2026-10-01T12:00:00.000Z",
      "commitHash": "abc123f",
      "coursePath": "Reinforcement Learning/2026-09-15"
    }
  },
  "lastPublishAt": "2026-10-01T12:00:00.000Z",
  "lastError": null
}
```

### 6.3 Implementazione

```typescript
import { atomicWrite, readRecoverable } from '../atomicFile'
import * as path from 'node:path'

export interface PublishedLectureEntry {
  publishedAt: string        // ISO 8601
  commitHash: string
  coursePath: string         // es. "Reinforcement Learning/2026-09-15"
}

export interface PublishStateData {
  version: 1
  publishedLectures: Record<string, PublishedLectureEntry>  // key = lecture.id
  lastPublishAt: string | null
  lastError: string | null
}

export class PublishState {
  private readonly filePath: string
  private data: PublishStateData

  constructor(libraryDir: string) {
    this.filePath = path.join(libraryDir, 'publish-state.json')
    this.data = { version: 1, publishedLectures: {}, lastPublishAt: null, lastError: null }
  }

  async load(): Promise<void> {
    try {
      const raw = await readRecoverable(this.filePath)
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 1 && typeof parsed.publishedLectures === 'object') {
        this.data = parsed as PublishStateData
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('PublishState: errore lettura stato, ripartenza da zero', error)
      }
      // File mancante o corrotto → stato vuoto, ri-pubblica tutto
    }
  }

  async save(): Promise<void> {
    await atomicWrite(this.filePath, JSON.stringify(this.data, null, 2) + '\n', 'utf8')
  }

  isPublished(lectureId: string): boolean {
    return lectureId in this.data.publishedLectures
  }

  markPublished(lectureId: string, commitHash: string, coursePath: string): void {
    this.data.publishedLectures[lectureId] = {
      publishedAt: new Date().toISOString(),
      commitHash,
      coursePath
    }
    this.data.lastPublishAt = new Date().toISOString()
    this.data.lastError = null
  }

  /** Rimuove una lezione dallo stato (se cancellata dall'archivio). */
  removePublished(lectureId: string): void {
    delete this.data.publishedLectures[lectureId]
  }

  setLastError(error: string): void {
    this.data.lastError = error
  }

  getLastPublishAt(): string | null { return this.data.lastPublishAt }
  getLastError(): string | null { return this.data.lastError }
  getPublishedCount(): number { return Object.keys(this.data.publishedLectures).length }
  getAllPublished(): Record<string, PublishedLectureEntry> { return { ...this.data.publishedLectures } }
}
```

### ATTENZIONE — Punti critici

1. **Usare `atomicWrite` e `readRecoverable`** da `../atomicFile` — è il pattern usato
   ovunque nel progetto per scritture crash-safe (write-rename con backup `.bak`).
2. **Non salvare mai lo stato PRIMA del push**. Il flusso è: push git → successo → `markPublished` → `save()`.
3. **Se il file è corrotto, ripartire da zero**: ri-pubblicare tutte le lezioni è sicuro
   perché git fa un diff a livello di contenuto. Se il file è identico, il commit sarà vuoto.
4. **Non mettere dati sensibili** (token, chiavi) nel file di stato.

---

## 7. Fase 3 — PublishGitClient (operazioni git)

**File**: `electron/main/publishing/publishGitClient.ts`

### 7.1 Scopo

Wrapper sottile attorno a `git` (via `child_process.execFile`). Responsabile di:
- Verificare che `git` sia nel PATH
- Clonare la repo se non esiste localmente
- Fare pull (con rebase) prima di aggiungere file
- Fare add, commit, push
- Gestire conflitti e errori

### 7.2 Dove clonare la repo

```
library/publish-repo/          ← clone locale della repo pubblica
```

Questa cartella è **dentro** la libreria dell'utente (non nel repository sorgente di
Lezionify). È locale, non viene mai versionata.

### 7.3 Implementazione

```typescript
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'

const execFile = promisify(execFileCb)

/** Timeout per operazioni git di rete (clone, pull, push): 2 minuti. */
const NETWORK_TIMEOUT_MS = 120_000
/** Timeout per operazioni git locali (add, commit): 30 secondi. */
const LOCAL_TIMEOUT_MS = 30_000

export interface GitClientOptions {
  repoUrl: string         // URL HTTPS della repo
  githubToken: string     // PAT per autenticazione
  branch: string          // es. "main"
  localPath: string       // path locale dove clonare
  authorName?: string     // default: "Lezionify"
  authorEmail?: string    // default: "lezionify@local"
}

export class PublishGitClient {
  private readonly opts: Required<GitClientOptions>

  constructor(options: GitClientOptions) {
    this.opts = {
      authorName: 'Lezionify',
      authorEmail: 'lezionify@local',
      ...options
    }
  }

  /** Verifica che git sia disponibile nel PATH. */
  async checkGitAvailable(): Promise<boolean> {
    try {
      await execFile('git', ['--version'], { timeout: LOCAL_TIMEOUT_MS })
      return true
    } catch {
      return false
    }
  }

  /**
   * URL con token embedded per il push.
   * Formato: https://<token>@github.com/user/repo.git
   *
   * ATTENZIONE: non loggare MAI questo URL. Usarlo solo come argomento
   * a git push/pull, che non lo mostra nell'output.
   */
  private authenticatedUrl(): string {
    const url = new URL(this.opts.repoUrl)
    url.username = this.opts.githubToken
    url.password = ''  // PAT va nello username per GitHub
    return url.toString()
  }

  /** Assicura che la repo locale esista. Clone se necessario, pull altrimenti. */
  async ensureRepo(): Promise<void> {
    const gitDir = path.join(this.opts.localPath, '.git')
    if (existsSync(gitDir)) {
      await this.pull()
    } else {
      await this.clone()
    }
  }

  private async clone(): Promise<void> {
    await mkdir(this.opts.localPath, { recursive: true })
    // Clonare in una cartella temporanea e poi rinominare è più sicuro,
    // ma per semplicità cloniamo direttamente. Se il clone fallisce,
    // la cartella resta vuota e il prossimo tentativo ri-clona.
    const parentDir = path.dirname(this.opts.localPath)
    const dirName = path.basename(this.opts.localPath)
    await this.exec(
      ['clone', '--depth', '1', '--branch', this.opts.branch,
       this.authenticatedUrl(), dirName],
      { cwd: parentDir, timeout: NETWORK_TIMEOUT_MS }
    )
    await this.configUser()
  }

  private async pull(): Promise<void> {
    try {
      // Imposta il remote URL (potrebbe essere cambiato nelle impostazioni)
      await this.exec(
        ['remote', 'set-url', 'origin', this.authenticatedUrl()],
        { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
      )
      await this.exec(
        ['pull', '--rebase', 'origin', this.opts.branch],
        { cwd: this.opts.localPath, timeout: NETWORK_TIMEOUT_MS }
      )
    } catch (error) {
      // Pull fallito (rete assente, etc.) — non è fatale.
      // Procediamo con lo stato locale; il push segnalerà l'errore.
      console.warn('PublishGitClient: pull fallito, si prosegue con stato locale', error)
    }
  }

  private async configUser(): Promise<void> {
    await this.exec(
      ['config', 'user.name', this.opts.authorName],
      { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
    )
    await this.exec(
      ['config', 'user.email', this.opts.authorEmail],
      { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
    )
  }

  /** Aggiunge tutti i file modificati/nuovi. */
  async addAll(): Promise<void> {
    await this.exec(
      ['add', '--all'],
      { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
    )
  }

  /**
   * Crea un commit. Restituisce l'hash del commit o null se non c'è nulla da committare.
   */
  async commit(message: string): Promise<string | null> {
    try {
      // Verifica se c'è qualcosa da committare
      const { stdout: statusOut } = await this.exec(
        ['status', '--porcelain'],
        { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
      )
      if (!statusOut.trim()) return null  // Nessuna modifica

      await this.exec(
        ['commit', '-m', message],
        { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
      )
      const { stdout: hashOut } = await this.exec(
        ['rev-parse', 'HEAD'],
        { cwd: this.opts.localPath, timeout: LOCAL_TIMEOUT_MS }
      )
      return hashOut.trim()
    } catch (error) {
      // "nothing to commit" non è un errore
      if (String(error).includes('nothing to commit')) return null
      throw error
    }
  }

  /**
   * Push al remote. Ritenta una volta con pull --rebase in caso di rifiuto.
   */
  async push(): Promise<void> {
    try {
      await this.exec(
        ['push', 'origin', this.opts.branch],
        { cwd: this.opts.localPath, timeout: NETWORK_TIMEOUT_MS }
      )
    } catch (firstError) {
      // Se rifiutato (non-fast-forward), tenta pull --rebase + push
      if (String(firstError).includes('rejected') ||
          String(firstError).includes('non-fast-forward') ||
          String(firstError).includes('fetch first')) {
        await this.exec(
          ['pull', '--rebase', 'origin', this.opts.branch],
          { cwd: this.opts.localPath, timeout: NETWORK_TIMEOUT_MS }
        )
        await this.exec(
          ['push', 'origin', this.opts.branch],
          { cwd: this.opts.localPath, timeout: NETWORK_TIMEOUT_MS }
        )
      } else {
        throw firstError
      }
    }
  }

  /** Percorso locale della repo clonata. */
  getLocalPath(): string {
    return this.opts.localPath
  }

  private async exec(
    args: string[],
    options: { cwd: string; timeout: number }
  ): Promise<{ stdout: string; stderr: string }> {
    // IMPORTANTE: non loggare gli argomenti completi perché
    // possono contenere l'URL autenticato con il token.
    const safeArgs = args.map(a =>
      a.includes('@') ? '<authenticated-url>' : a
    )
    try {
      const result = await execFile('git', args, {
        cwd: options.cwd,
        timeout: options.timeout,
        maxBuffer: 10 * 1024 * 1024,  // 10 MB
        env: {
          ...process.env,
          // Disabilita prompt interattivi di git (es. password)
          GIT_TERMINAL_PROMPT: '0',
          // Evita paginator
          GIT_PAGER: ''
        }
      })
      return result
    } catch (error) {
      // Sanitizza l'errore per non esporre il token nei log
      const sanitized = String(error).replace(
        /https:\/\/[^@]+@/g,
        'https://***@'
      )
      throw new Error(`git ${safeArgs.join(' ')} fallito: ${sanitized}`)
    }
  }
}
```

### ATTENZIONE — Punti critici

1. **MAI loggare l'URL autenticato o il token.** Il metodo `exec` sanitizza gli errori
   e `safeArgs` mascera gli URL. Verificare che nessun altro punto del codice esponga il token.
2. **`GIT_TERMINAL_PROMPT=0`** — fondamentale. Senza, `git` potrebbe bloccarsi in attesa
   di input se il token è sbagliato, congelando l'app.
3. **`--depth 1`** nel clone — la repo pubblica non ha bisogno della storia completa.
   Risparmia tempo e disco.
4. **Timeout** — operazioni di rete a 2 minuti, operazioni locali a 30 secondi.
   Senza timeout, un push verso un server lento congela il processo main di Electron.
5. **`remote set-url`** al pull — se l'utente cambia l'URL nelle impostazioni, il remote
   deve aggiornarsi senza re-clone.
6. **Conflitti** — il pattern pull-rebase-push gestisce il caso in cui l'utente modifica
   manualmente la repo online (improbabile ma possibile). Se il rebase fallisce (conflitto
   vero), l'errore viene propagato e l'utente ne viene notificato.

---

## 8. Fase 4 — ReadmeGenerator

**File**: `electron/main/publishing/readmeGenerator.ts`

### 8.1 Scopo

Generare automaticamente:
- **README.md** nella radice della repo pubblica (indice di tutti i corsi)
- **README.md** dentro ogni cartella corso (elenco delle lezioni)

### 8.2 Struttura target della repo pubblica

```
lezionify-notes/
├── README.md
├── Reinforcement Learning/
│   ├── README.md
│   ├── 2026-09-15/
│   │   ├── trascrizione.txt
│   │   └── schema.md
│   └── 2026-09-22/
│       ├── trascrizione.txt
│       └── schema.md
├── Game Theory/
│   ├── README.md
│   └── 2026-09-16/
│       ├── trascrizione.txt
│       └── schema.md
└── .gitignore
```

### 8.3 Implementazione

```typescript
import * as path from 'node:path'
import { readdir, stat } from 'node:fs/promises'

export interface PublishedLesson {
  courseName: string       // "Reinforcement Learning"
  date: string             // "2026-09-15"
  title?: string | null    // titolo lezione (opzionale)
}

/**
 * Scansiona la repo pubblica e genera i README.md leggendo le cartelle effettive.
 * Questo approccio è più robusto che basarsi sullo stato locale: se qualcuno
 * modifica la repo a mano, i README restano consistenti.
 */
export async function generateRootReadme(repoPath: string): Promise<string> {
  const courses = await scanCourses(repoPath)

  const rows = courses
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `| [${c.name}](./${encodeURIComponent(c.name)}/) | ${c.lessonCount} |`)
    .join('\n')

  const now = new Date().toISOString().split('T')[0]

  return `# 📚 Appunti di Lezione

Materiale generato automaticamente da [Lezionify](https://github.com/giovannistefanuto/Lezionify).

Ogni cartella contiene la **trascrizione grezza** e lo **schema/dispensa** della lezione.

## Corsi

| Corso | Lezioni |
|---|---|
${rows}

---
*Ultimo aggiornamento: ${now}*
`
}

export async function generateCourseReadme(
  repoPath: string,
  courseName: string
): Promise<string> {
  const coursePath = path.join(repoPath, courseName)
  const dates = await scanDates(coursePath)

  const rows = dates
    .sort()
    .map(d => `| [${d}](./${d}/) | [schema.md](./${d}/schema.md) | [trascrizione.txt](./${d}/trascrizione.txt) |`)
    .join('\n')

  return `# ${courseName}

| Data | Schema | Trascrizione |
|---|---|---|
${rows}
`
}

interface CourseInfo {
  name: string
  lessonCount: number
}

async function scanCourses(repoPath: string): Promise<CourseInfo[]> {
  const entries = await readdir(repoPath, { withFileTypes: true })
  const courses: CourseInfo[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.')) continue  // .git, .gitignore
    const dates = await scanDates(path.join(repoPath, entry.name))
    if (dates.length > 0) {
      courses.push({ name: entry.name, lessonCount: dates.length })
    }
  }
  return courses
}

async function scanDates(coursePath: string): Promise<string[]> {
  try {
    const entries = await readdir(coursePath, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
      .map(e => e.name)
  } catch {
    return []
  }
}
```

### 8.4 Il `.gitignore` nella repo pubblica

Generare nella radice un `.gitignore` minimo:

```
*.tmp
*.bak
Thumbs.db
.DS_Store
```

### ATTENZIONE

- **`encodeURIComponent` nei link del README** — i nomi dei corsi possono contenere spazi
  (es. "Reinforcement Learning"). I link Markdown devono essere codificati.
- **Scansione dalle cartelle, non dallo stato** — se la repo viene modificata manualmente
  (es. l'utente aggiunge file), i README restano coerenti.
- **Ordinamento date** — le stringhe `YYYY-MM-DD` si ordinano lessicograficamente in modo corretto.

---

## 9. Fase 5 — PublishService (orchestratore)

**File**: `electron/main/publishing/publishService.ts`

### 9.1 Scopo

Componente principale. Gestisce l'intero ciclo: scoperta lezioni nuove → copia file
→ generazione README → commit → push → aggiornamento stato.

### 9.2 Implementazione

```typescript
import * as path from 'node:path'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import type { Lecture, CourseDefinition, PublishResult } from '../../../shared/archive'
import { PublishState } from './publishState'
import { PublishGitClient } from './publishGitClient'
import { generateRootReadme, generateCourseReadme } from './readmeGenerator'
import { FileStorageService } from '../fileStorage'

export interface PublishServiceDeps {
  listLectures: () => Promise<Lecture[]>
  getCourses: () => Promise<Record<string, CourseDefinition>>
  storage: FileStorageService
}

export class PublishService {
  private readonly state: PublishState
  private readonly libraryDir: string
  private gitClient: PublishGitClient | null = null
  private readonly deps: PublishServiceDeps
  private publishing = false  // mutex semplice

  constructor(libraryDir: string, deps: PublishServiceDeps) {
    this.libraryDir = libraryDir
    this.state = new PublishState(libraryDir)
    this.deps = deps
  }

  /** Inizializza: carica lo stato da disco. */
  async initialize(): Promise<void> {
    await this.state.load()
  }

  /**
   * Configura il client git con le impostazioni correnti.
   * Chiamare DOPO aver letto le impostazioni con il token decifrato.
   */
  configureGit(repoUrl: string, githubToken: string, branch: string): void {
    this.gitClient = new PublishGitClient({
      repoUrl,
      githubToken,
      branch,
      localPath: path.join(this.libraryDir, 'publish-repo')
    })
  }

  /**
   * Pubblica tutte le lezioni nuove (non ancora pubblicate).
   *
   * Flusso:
   * 1. Verifica prerequisiti (git disponibile, client configurato)
   * 2. Elenca lezioni pubblicabili
   * 3. Se non ce ne sono, termina
   * 4. Assicura la repo locale (clone o pull)
   * 5. Copia i file nella struttura Corso/Data/
   * 6. Rigenera i README
   * 7. git add + commit + push
   * 8. Aggiorna stato SOLO dopo push riuscito
   */
  async publishNew(): Promise<PublishResult> {
    // Impedisce esecuzioni concorrenti
    if (this.publishing) {
      return { published: 0, skipped: 0, errors: ['Pubblicazione già in corso'] }
    }
    this.publishing = true

    try {
      return await this.doPublish()
    } finally {
      this.publishing = false
    }
  }

  private async doPublish(): Promise<PublishResult> {
    const result: PublishResult = { published: 0, skipped: 0, errors: [] }

    // --- 1. Prerequisiti ---
    if (!this.gitClient) {
      result.errors.push('Pubblicazione non configurata')
      return result
    }
    const gitOk = await this.gitClient.checkGitAvailable()
    if (!gitOk) {
      const msg = 'git non trovato nel PATH. Installa git per abilitare la pubblicazione.'
      result.errors.push(msg)
      this.state.setLastError(msg)
      await this.state.save()
      return result
    }

    // --- 2. Scoperta lezioni pubblicabili ---
    const allLectures = await this.deps.listLectures()
    const courses = await this.deps.getCourses()
    const publishable = allLectures.filter(l => this.isPublishable(l))

    if (publishable.length === 0) {
      return result  // Niente da fare
    }

    // --- 3. Assicura repo locale ---
    try {
      await this.gitClient.ensureRepo()
    } catch (error) {
      const msg = `Impossibile preparare la repo: ${sanitizeError(error)}`
      result.errors.push(msg)
      this.state.setLastError(msg)
      await this.state.save()
      return result
    }

    const repoPath = this.gitClient.getLocalPath()

    // --- 4. Copia file nella struttura ---
    const staged: Array<{ lecture: Lecture; coursePath: string }> = []

    for (const lecture of publishable) {
      try {
        const coursePath = await this.stageLecture(lecture, courses, repoPath)
        staged.push({ lecture, coursePath })
      } catch (error) {
        result.skipped++
        result.errors.push(
          `Lezione ${lecture.title ?? lecture.id} saltata: ${sanitizeError(error)}`
        )
      }
    }

    if (staged.length === 0) {
      return result  // Tutti saltati
    }

    // --- 5. Genera README ---
    try {
      const courseNames = new Set(staged.map(s => s.coursePath.split('/')[0]))
      for (const courseName of courseNames) {
        const readmeContent = await generateCourseReadme(repoPath, courseName)
        await writeFile(path.join(repoPath, courseName, 'README.md'), readmeContent, 'utf8')
      }
      const rootReadme = await generateRootReadme(repoPath)
      await writeFile(path.join(repoPath, 'README.md'), rootReadme, 'utf8')
    } catch (error) {
      // README falliti non bloccano la pubblicazione
      result.errors.push(`README generation warning: ${sanitizeError(error)}`)
    }

    // --- 6. Commit & Push ---
    try {
      await this.gitClient.addAll()
      const commitMsg = `📚 Aggiunte ${staged.length} lezione/i\n\n` +
        staged.map(s => `- ${s.coursePath}`).join('\n')
      const commitHash = await this.gitClient.commit(commitMsg)

      if (commitHash) {
        await this.gitClient.push()

        // --- 7. Aggiorna stato SOLO DOPO push riuscito ---
        for (const { lecture, coursePath } of staged) {
          this.state.markPublished(lecture.id, commitHash, coursePath)
          result.published++
        }
        result.commitHash = commitHash
        await this.state.save()
      } else {
        // Nessuna modifica effettiva (file identici)
        for (const { lecture, coursePath } of staged) {
          // Segna comunque come pubblicate per non rielaborarle
          this.state.markPublished(lecture.id, 'no-change', coursePath)
          result.published++
        }
        await this.state.save()
      }
    } catch (error) {
      const msg = `Push fallito: ${sanitizeError(error)}`
      result.errors.push(msg)
      this.state.setLastError(msg)
      await this.state.save()
      // NON segnare come pubblicate — si riproverà al prossimo avvio
      return result
    }

    return result
  }

  /** Criteri per considerare una lezione pubblicabile. */
  private isPublishable(lecture: Lecture): boolean {
    return (
      lecture.transcriptFileName !== null &&
      lecture.markdownFileName !== null &&
      lecture.courseCode !== null &&
      lecture.recordedAt !== null &&
      !this.state.isPublished(lecture.id)
    )
  }

  /**
   * Copia trascrizione e schema nella struttura della repo pubblica.
   * Restituisce il percorso relativo (es. "Reinforcement Learning/2026-09-15").
   */
  private async stageLecture(
    lecture: Lecture,
    courses: Record<string, CourseDefinition>,
    repoPath: string
  ): Promise<string> {
    // Nome cartella del corso: nome esteso se disponibile, altrimenti codice
    const courseCode = lecture.courseCode!
    const courseDef = courses[courseCode]
    const courseName = courseDef?.name ?? courseCode

    // Nome cartella data
    const date = lecture.recordedAt!  // Già validato da isPublishable

    // Sanitizza nome corso per uso come nome cartella
    const safeCourseName = sanitizeDirName(courseName)
    const coursePath = `${safeCourseName}/${date}`
    const targetDir = path.join(repoPath, safeCourseName, date)
    await mkdir(targetDir, { recursive: true })

    // Copia trascrizione
    const transcriptContent = await this.deps.storage.readTranscript(lecture.transcriptFileName!)
    if (!transcriptContent || transcriptContent.trim().length === 0) {
      throw new Error('Trascrizione vuota o mancante')
    }
    await writeFile(path.join(targetDir, 'trascrizione.txt'), transcriptContent, 'utf8')

    // Copia schema/dispensa ITA
    const markdownContent = await this.deps.storage.readMarkdown(lecture.markdownFileName!)
    if (!markdownContent || markdownContent.trim().length === 0) {
      throw new Error('Schema/dispensa vuota o mancante')
    }
    await writeFile(path.join(targetDir, 'schema.md'), markdownContent, 'utf8')

    return coursePath
  }

  /** Conta le lezioni non ancora pubblicate. */
  async countUnpublished(): Promise<number> {
    const allLectures = await this.deps.listLectures()
    return allLectures.filter(l => this.isPublishable(l)).length
  }

  getLastPublishAt(): string | null { return this.state.getLastPublishAt() }
  getLastError(): string | null { return this.state.getLastError() }
}

/** Sanitizza un nome per uso come cartella (rimuove caratteri illegali su Windows). */
function sanitizeDirName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')     // Caratteri illegali Windows
    .replace(/\s+/g, ' ')             // Normalizza spazi
    .trim()
    || 'Senza Nome'
}

/** Sanitizza errori per non esporre token o path sensibili. */
function sanitizeError(error: unknown): string {
  return String(error)
    .replace(/https:\/\/[^@\s]+@/g, 'https://***@')
    .replace(/[A-Za-z]:\\Users\\[^\\]+/g, '~')
    .slice(0, 500)
}
```

### ATTENZIONE — Punti critici

1. **Mutex `this.publishing`** — impedisce che due pubblicazioni concorrenti (es. una da
   startup e una manuale) si sovrappongano. Un `AsyncMutex` sarebbe più robusto ma un
   booleano semplice è sufficiente perché il codice è single-threaded in Electron main.

2. **Ordine critico**: push → markPublished → save. **MAI** invertire. Se il push fallisce,
   le lezioni restano "non pubblicate" e saranno ripubblicate al prossimo tentativo.

3. **Commit vuoto** — se i file sono identici a quelli già nella repo (es. ri-pubblicazione
   dopo crash), `git status --porcelain` non restituisce nulla. In questo caso segniamo
   comunque come pubblicate (il contenuto è già online).

4. **`sanitizeDirName`** — su Windows i nomi cartella non possono contenere `<>:"/\|?*`.
   Se il nome del corso contiene questi caratteri, li rimuoviamo.

5. **Verifica contenuto non vuoto** — prima di copiare, verifica che trascrizione e schema
   non siano vuoti. Una lezione con `markdownFileName` non null ma file vuoto su disco è
   un caso limite possibile (es. crash durante la scrittura).

6. **`sanitizeError`** — ogni messaggio di errore che finisce nei log o nella UI viene
   privato di token e path personali.

---

## 10. Fase 6 — Integrazione in ArchiveService

**File**: `electron/main/archive.ts`

### 10.1 Modifiche al constructor

Aggiungere `PublishService` come dipendenza opzionale:

```typescript
// Nuovi import
import { PublishService } from './publishing/publishService'
import type { PublishResult, PublishingSettings } from '../../shared/archive'

// Nel constructor, dopo la creazione di archivePipeline:
this.publishService = new PublishService(this.rootDirectory, {
  listLectures: () => this.listLectures(),
  getCourses: async () => {
    const settings = await this.settingsService.getSettings()
    return settings.courses ?? {}
  },
  storage: this.storage
})
```

### 10.2 Nuovi metodi pubblici

```typescript
/** Inizializza il servizio di pubblicazione (da chiamare dopo initialize). */
async initializePublishing(): Promise<void> {
  await this.publishService.initialize()
  const settings = await this.settingsService.getSettings()
  if (settings.publishing?.enabled && settings.publishing.githubToken) {
    this.publishService.configureGit(
      settings.publishing.repoUrl,
      settings.publishing.githubToken,
      settings.publishing.branch ?? 'main'
    )
  }
}

/** Pubblica le lezioni nuove. */
async publishLectures(): Promise<PublishResult> {
  return this.publishService.publishNew()
}

/** Stato della pubblicazione. */
async getPublishingStatus(): Promise<{
  configured: boolean
  enabled: boolean
  unpublishedCount: number
  lastPublishAt: string | null
  lastError: string | null
}> {
  const settings = await this.settingsService.getSettings()
  const configured = Boolean(settings.publishing?.repoUrl && settings.publishing?.githubToken)
  const enabled = Boolean(settings.publishing?.enabled)
  return {
    configured,
    enabled,
    unpublishedCount: enabled && configured
      ? await this.publishService.countUnpublished()
      : 0,
    lastPublishAt: this.publishService.getLastPublishAt(),
    lastError: this.publishService.getLastError()
  }
}
```

### 10.3 Trigger dopo pipeline completata

Nella classe `ArchivePipeline` (in `electron/main/ai/archivePipeline.ts`), dopo che
lo stato cambia a `completed`, emettere un segnale che `ArchiveService` usa per lanciare
la pubblicazione:

**Approccio consigliato**: aggiungere un callback opzionale `onPipelineCompleted` che
`ArchiveService` usa per invocare `publishLectures()` in modo asincrono (fire-and-forget):

```typescript
// In ArchiveService, dopo aver configurato archivePipeline:
this.archivePipeline.setCompletionCallback(async () => {
  const settings = await this.settingsService.getSettings()
  if (settings.publishing?.enabled) {
    // Fire-and-forget: non bloccare la pipeline per la pubblicazione
    this.publishLectures().catch(err => {
      console.error('Pubblicazione automatica post-pipeline fallita:', err)
    })
  }
})
```

### ATTENZIONE

- **`initializePublishing()`** deve essere chiamato DOPO `initialize()` di ArchiveService
  e DOPO che `app.whenReady()` è risolto (per `safeStorage`).
- **Fire-and-forget** per la pubblicazione post-pipeline: non bloccare mai la pipeline.
  Se la pubblicazione fallisce, verrà ritentata all'avvio successivo.
- **Non aggiungere il `PublishService` come parametro del constructor** — crearlo internamente
  come si fa con `ArchivePipeline`, per non rompere i test esistenti.

---

## 11. Fase 7 — Settings: validazione e cifratura token

**File**: `electron/main/settings.ts`

### 11.1 Validazione dei nuovi campi

Aggiungere `'publishing'` alla lista `allowed` in `validateSettingsUpdate`:

```typescript
const allowed = new Set([
  // ... campi esistenti ...
  'publishing'
])
```

Aggiungere la validazione del campo `publishing`:

```typescript
if (value.publishing !== undefined) {
  if (!isRecord(value.publishing))
    throw new Error('Impostazioni di pubblicazione non valide.')
  const p = value.publishing as Record<string, unknown>
  if (p.enabled !== undefined && typeof p.enabled !== 'boolean')
    throw new Error('Impostazioni di pubblicazione non valide.')
  if (p.repoUrl !== undefined &&
    (typeof p.repoUrl !== 'string' || p.repoUrl.length > 500))
    throw new Error('URL repository non valido.')
  if (p.githubToken !== undefined &&
    (typeof p.githubToken !== 'string' || p.githubToken.length > 500))
    throw new Error('Token GitHub non valido.')
  if (p.branch !== undefined &&
    (typeof p.branch !== 'string' || p.branch.length > 100))
    throw new Error('Branch non valido.')
  if (p.autoPublishOnStartup !== undefined &&
    typeof p.autoPublishOnStartup !== 'boolean')
    throw new Error('Impostazioni di pubblicazione non valide.')
}
```

### 11.2 Cifratura del token GitHub

Seguire **esattamente** il pattern delle API key Gemini in `readSettingsFile` e
`saveSettingsUnlocked`. Il token GitHub va:
- **Cifrato** quando salvato su disco (con `safeStorage.encryptString`)
- **Decifrato** quando letto (con `safeStorage.decryptString`)

In `readSettingsFile`, dopo aver processato le API key, aggiungere:

```typescript
let publishing: PublishingSettings | undefined = undefined
if (parsed.publishing && isRecord(parsed.publishing)) {
  const p = parsed.publishing as Record<string, unknown>
  let token = ''
  if (typeof p.githubToken === 'string' && p.githubToken.length > 0) {
    if (parsed.keysEncrypted && isEncryptionAvailable()) {
      try {
        token = safeStorage.decryptString(Buffer.from(p.githubToken as string, 'base64'))
      } catch {
        console.warn('Impossibile decifrare il token GitHub.')
      }
    } else if (!parsed.keysEncrypted) {
      token = (p.githubToken as string).trim()
    }
  }
  publishing = {
    enabled: p.enabled === true,
    repoUrl: typeof p.repoUrl === 'string' ? p.repoUrl.trim() : '',
    githubToken: token,
    branch: typeof p.branch === 'string' ? p.branch.trim() : 'main',
    autoPublishOnStartup: p.autoPublishOnStartup !== false  // default true
  }
}
```

E nel return dell'oggetto `AppSettings`, aggiungere `publishing`.

In `saveSettingsUnlocked`, quando si salva il JSON, cifrare il token:

```typescript
// Nella parte dove si costruisce l'oggetto da scrivere su disco:
if (merged.publishing) {
  const tokenToStore = isEncryptionAvailable() && merged.publishing.githubToken
    ? safeStorage.encryptString(merged.publishing.githubToken).toString('base64')
    : merged.publishing.githubToken ?? ''
  serialized.publishing = {
    ...merged.publishing,
    githubToken: tokenToStore
  }
}
```

### ATTENZIONE

- **Il flag `keysEncrypted`** è già usato in `settings.ts` per le API key Gemini. Lo stesso
  flag copre anche il token GitHub: se `keysEncrypted === true`, entrambi sono cifrati.
- **Se `safeStorage` non è disponibile** (es. nei test), il token resta in chiaro. Questo
  è il comportamento esistente per le API key.
- **Non esporre mai il token nei log**, messaggi di errore, o IPC verso il renderer.
  Passare al renderer solo `configured: true/false`, mai il token stesso.

---

## 12. Fase 8 — IPC e Preload

### 12.1 Nuovi handler IPC (`electron/main/index.ts`)

Aggiungere dopo gli handler esistenti:

```typescript
ipcMain.handle('publish-lectures', async () => {
  return archiveService.publishLectures()
})

ipcMain.handle('get-publishing-status', async () => {
  return archiveService.getPublishingStatus()
})
```

### 12.2 Preload (`electron/preload/index.ts`)

Aggiungere ai metodi esposti:

```typescript
publishLectures: () => ipcRenderer.invoke('publish-lectures'),
getPublishingStatus: () => ipcRenderer.invoke('get-publishing-status'),
```

### ATTENZIONE

- **NON** esporre `configureGit` o il token via IPC. La configurazione del git client
  avviene solo nel processo main quando le impostazioni vengono salvate.
- Quando `saveSettings` viene invocato con un nuovo `publishing`, il main process
  deve re-invocare `configureGit` con i nuovi parametri. Aggiungere questo nel handler
  `save-settings` esistente:

```typescript
// Dopo aver salvato le impostazioni:
if (updates.publishing) {
  const saved = await archiveService.getSettings()
  if (saved.publishing?.enabled && saved.publishing.githubToken) {
    archiveService.publishService.configureGit(
      saved.publishing.repoUrl,
      saved.publishing.githubToken,
      saved.publishing.branch ?? 'main'
    )
  }
}
```

---

## 13. Fase 9 — Hook di avvio in index.ts

**File**: `electron/main/index.ts`

Dopo l'inizializzazione di `ArchiveService`, aggiungere:

```typescript
// Pubblicazione automatica all'avvio
app.whenReady().then(async () => {
  // ... codice esistente ...

  // Inizializza il sistema di pubblicazione
  await archiveService.initializePublishing()

  // Pubblica lezioni nuove (se abilitato) — fire-and-forget
  const settings = await archiveService.getSettings()
  if (settings.publishing?.enabled && settings.publishing?.autoPublishOnStartup) {
    archiveService.publishLectures().then(result => {
      if (result.published > 0) {
        console.log(`Pubblicazione automatica: ${result.published} lezione/i pubblicate`)
      }
      if (result.errors.length > 0) {
        console.warn('Pubblicazione automatica — errori:', result.errors)
      }
    }).catch(err => {
      console.error('Pubblicazione automatica fallita:', err)
    })
  }
})
```

### ATTENZIONE

- **Fire-and-forget**: la pubblicazione all'avvio non deve MAI bloccare l'apertura della
  finestra. L'utente deve poter usare l'app immediatamente.
- **Ordine**: `initializePublishing()` DEVE essere chiamato DOPO `archiveService.initialize()`
  e dopo che la libreria è stata caricata, perché ha bisogno di leggere `settings.json`.
- **`app.whenReady()`**: necessario per `safeStorage` (richiede che l'app sia pronta).

---

## 14. Fase 10 — Test unitari

**File**: `tests/unit/publishing.test.ts`

### 14.1 Strategia

Test **completamente offline** — nessuna dipendenza da git o rete.

- `PublishState` — testato direttamente con file system temporaneo
- `PublishGitClient` — mockato: non eseguire git reale nei test
- `PublishService` — mockare `PublishGitClient` e `FileStorageService`, testare la logica
- `ReadmeGenerator` — testato con cartelle temporanee create ad hoc
- Validazione settings — testare che `publishing` venga validato/rifiutato correttamente

### 14.2 Test da scrivere

```
PublishState
  ✓ carica stato da disco
  ✓ restituisce dati vuoti se file mancante
  ✓ restituisce dati vuoti se file corrotto
  ✓ markPublished aggiunge la lezione
  ✓ isPublished restituisce true per lezione pubblicata
  ✓ isPublished restituisce false per lezione non pubblicata
  ✓ save + load round-trip
  ✓ removePublished rimuove la lezione

PublishService
  ✓ non pubblica se non configurato
  ✓ non pubblica se git non disponibile
  ✓ non pubblica se nessuna lezione è pubblicabile
  ✓ pubblica lezioni con trascrizione, schema, corso e data
  ✓ salta lezione senza trascrizione
  ✓ salta lezione senza schema
  ✓ salta lezione senza corso
  ✓ salta lezione senza data
  ✓ salta lezione già pubblicata
  ✓ salta lezione con contenuto vuoto
  ✓ non segna come pubblicata se push fallisce
  ✓ segna come pubblicata solo dopo push riuscito
  ✓ gestisce commit vuoto (file identici)
  ✓ impedisce pubblicazioni concorrenti
  ✓ sanitizza nomi corso con caratteri speciali
  ✓ errori non bloccano le altre lezioni

ReadmeGenerator
  ✓ genera README radice con lista corsi
  ✓ genera README corso con lista date
  ✓ gestisce cartella vuota
  ✓ ignora file e cartelle dot

Settings validation
  ✓ accetta publishing valido
  ✓ rifiuta publishing.repoUrl troppo lungo
  ✓ rifiuta publishing.enabled non booleano
  ✓ rifiuta publishing non-object
```

### 14.3 Pattern per mock

Seguire il pattern dei test esistenti (es. `archive.test.ts`, `archivePipeline.test.ts`):
- Creare una directory temporanea con `mkdtemp`
- Istanziare `PublishState` con quella directory
- Per `PublishService`, iniettare mock delle dipendenze

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { PublishState } from '../../electron/main/publishing/publishState'

describe('PublishState', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'publish-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('restituisce dati vuoti se file mancante', async () => {
    const state = new PublishState(tempDir)
    await state.load()
    expect(state.isPublished('any-id')).toBe(false)
    expect(state.getPublishedCount()).toBe(0)
  })

  // ... altri test ...
})
```

### ATTENZIONE

- **NON eseguire git nei test.** Usare stub/mock del `PublishGitClient`.
- **Pulizia directory temporanee** — afterEach con `rm({ recursive: true, force: true })`.
- **Importare da percorsi relativi corretti** — i test sono in `tests/unit/`, i moduli
  in `electron/main/publishing/`.

---

## 15. Fase 11 (futura) — UI

> Questa fase **non fa parte dell'implementazione corrente** ma è documentata per contesto.

### Sezione Impostazioni

Nuova sezione "📤 Pubblicazione Lezioni" in `SettingsModal.tsx`:
- Toggle on/off
- Campo URL repo (text input)
- Campo token GitHub (password input, mascherato)
- Campo branch (text input, default "main")
- Pulsante "Testa connessione" (invoca `checkGitAvailable` + clone di prova)
- Pulsante "Pubblica ora"

### Feedback nella UI

- Badge nella sidebar: "N lezioni da pubblicare"
- Notifica toast dopo pubblicazione: "Pubblicate 3 nuove lezioni"
- In caso di errore: notifica con link alle impostazioni

---

## 16. Matrice degli errori

| # | Errore | Rilevamento | Strategia | Riprovare? |
|---|---|---|---|---|
| E1 | Git non nel PATH | `checkGitAvailable` → false | Log, disabilita, notifica | No |
| E2 | Token invalido/scaduto | Push → 403/401 | Log errore, notifica utente | No |
| E3 | URL repo errato | Clone fallisce | Log errore, notifica utente | No |
| E4 | Rete assente | Clone/pull/push → timeout/network error | Skip, riprova al prossimo avvio | Sì |
| E5 | Push rifiutato (conflitto) | Push → "non-fast-forward" | Pull --rebase + retry push (1 volta) | Sì, 1× |
| E6 | Rebase fallito (conflitto vero) | Rebase → errore merge | Log, skip, richiede intervento manuale | No |
| E7 | File sorgente mancante | `readTranscript`/`readMarkdown` → null | Skip lezione, continua le altre | No |
| E8 | File sorgente vuoto | Contenuto `.trim().length === 0` | Skip lezione, log warning | No |
| E9 | Disco pieno | Qualsiasi write → ENOSPC | Catch, log, abort batch | No |
| E10 | Crash mid-push | Processo termina | Stato non aggiornato → ri-pubblica | Sì, auto |
| E11 | Lezione cancellata tra scan e stage | `readTranscript` → null | Skip silenzioso | No |
| E12 | Pubblicazione concorrente | `this.publishing === true` | Return immediato | No |
| E13 | Repo locale corrotta | Pull/add falliscono | Cancella `publish-repo/`, re-clone | Sì, 1× |
| E14 | Token non decifrabile | `safeStorage.decryptString` throws | Token vuoto, pubblicazione disabilitata | No |

### Principio fondamentale

> Lo stato "pubblicata" viene scritto **SOLO DOPO** il push confermato. In caso di dubbio,
> ri-pubblica. Git è idempotente per contenuto identico (commit vuoto).

---

## 17. Checklist di accettazione

Prima di considerare l'implementazione completa, verificare:

- [ ] `npm run check` passa (typecheck + lint + test + build)
- [ ] `npm test` include i nuovi test in `publishing.test.ts` (tutti verdi)
- [ ] Nessun test esistente rotto
- [ ] Il token GitHub non appare mai in:
  - [ ] Console/log dell'app
  - [ ] Messaggi di errore
  - [ ] Canali IPC verso il renderer
  - [ ] File JSON su disco (deve essere cifrato)
- [ ] `publish-state.json` viene scritto solo dopo push confermato
- [ ] La pubblicazione all'avvio non blocca l'apertura della finestra
- [ ] La pubblicazione non interferisce con la pipeline "Elabora tutto"
- [ ] File con nomi corso contenenti spazi e caratteri speciali funzionano
- [ ] Lezioni senza corso, senza data, senza trascrizione o senza schema vengono saltate
- [ ] Se git non è installato, l'app funziona normalmente (publishing disabilitato)
- [ ] Se la rete è assente, l'app funziona normalmente
- [ ] I README generati contengono link Markdown validi e navigabili
- [ ] `STRUTTURA_PROGETTO.md` è aggiornato con la nuova cartella `publishing/`

---

## 18. Trappole e punti di attenzione

### 🚨 Sicurezza del token

Il token GitHub PAT ha permessi di scrittura su repository. Se esposto:
- Chiunque può scrivere sulla repo pubblica
- L'utente deve rigenerare il token

**Regola**: il token esiste in chiaro **solo in memoria** nel processo main di Electron.
Su disco è sempre cifrato (`safeStorage`). Non passa mai al renderer. Non appare nei log.

### 🚨 Nomi cartella su Windows

Windows proibisce `<>:"/\|?*` nei nomi. Alcuni corsi potrebbero avere nomi con caratteri
problematici (es. "Q&A Systems" contiene `&` che va bene su Windows ma meglio sanitizzare).
Usare `sanitizeDirName` su tutti i nomi prima di creare cartelle.

### 🚨 Lunghezza path

Windows ha un limite di 260 caratteri per i path. Con la struttura
`library/publish-repo/Corso/YYYY-MM-DD/trascrizione.txt` è improbabile superarlo,
ma nomi corso molto lunghi potrebbero causare problemi. `sanitizeDirName` dovrebbe
troncare a ~80 caratteri.

### 🚨 Race condition con pipeline

La pipeline "Elabora tutto" modifica i file markdown durante l'elaborazione. Se la
pubblicazione parte DURANTE l'elaborazione, potrebbe copiare un file markdown incompleto.
**Soluzione**: il trigger post-pipeline (nella callback `onPipelineCompleted`) garantisce
che la pubblicazione parta solo quando la pipeline è terminata. Il trigger da startup è
sicuro perché la pipeline non è in esecuzione all'avvio.

### 🚨 `atomicWrite` import path

Il modulo `atomicFile` è in `electron/main/atomicFile.ts`. Importare con path relativo
corretto: `import { atomicWrite, readRecoverable } from '../atomicFile'` da dentro
`publishing/`.

### 🚨 Test: non rompere la CI

I test esistenti passano con `npm test` (Vitest). I nuovi test devono:
- Non importare Electron reale (in CI non c'è display)
- Non eseguire git reale
- Non accedere alla rete
- Usare directory temporanee pulite

### 🚨 `.gitignore` della repo Lezionify

La cartella `library/` (e quindi `publish-repo/` dentro di essa) è già in `.gitignore`
del repo Lezionify (`local-artifacts/`, `.library-data/` sono esclusi, e la library è
in `userData`). Ma verificare che nessun file della repo pubblica finisca versionato nel
repo sorgente di Lezionify.

### 🚨 Electron `app` nei test

`ArchiveService` usa `app.getPath('userData')` nel constructor. Nei test si passa un
`customRootDirectory`. Il `PublishService` non deve mai importare `app` direttamente —
riceve `libraryDir` dal constructor.

### 🚨 Ordine delle fasi di implementazione

Le fasi 1-5 sono indipendenti dal resto dell'app e possono essere implementate e testate
isolatamente. Le fasi 6-9 richiedono modifiche a file esistenti e devono essere fatte
con attenzione per non rompere nulla. Implementare in ordine.

---

## Riepilogo file e modifiche

| Fase | File | Azione |
|---|---|---|
| 1 | `shared/archive.ts` | Aggiungere tipi |
| 2 | `electron/main/publishing/publishState.ts` | **Nuovo** |
| 3 | `electron/main/publishing/publishGitClient.ts` | **Nuovo** |
| 4 | `electron/main/publishing/readmeGenerator.ts` | **Nuovo** |
| 5 | `electron/main/publishing/publishService.ts` | **Nuovo** |
| 6 | `electron/main/archive.ts` | Integrare PublishService |
| 7 | `electron/main/settings.ts` | Validazione + cifratura token |
| 8 | `electron/main/index.ts` | Handler IPC |
| 8 | `electron/preload/index.ts` | Esporre IPC |
| 9 | `electron/main/index.ts` | Hook di avvio |
| 10 | `tests/unit/publishing.test.ts` | **Nuovo** |
| — | `STRUTTURA_PROGETTO.md` | Aggiornare mappa |
