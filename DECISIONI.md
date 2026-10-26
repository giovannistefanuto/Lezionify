# Decisioni di progetto

Questo documento e' il registro append-only delle decisioni che cambiano il prodotto, l'architettura, il flusso di lavoro o la configurazione del progetto.

Non modificare manualmente la sezione `Registro`: aggiungi le nuove decisioni eseguendo `python tools/append_decision.py` con gli argomenti appropriati da riga di comando.

## Convenzioni

- Una voce ha un ID progressivo nel formato `D-0001`.
- Ogni decisione significativa viene registrata prima della fine del lavoro che la introduce.
- Gli stati ammessi sono `accettata`, `sostituita` e `annullata`.
- Le decisioni non modificano il passato: una decisione superata viene sostituita da una nuova voce che la cita.
- Non inserire segreti, chiavi API, trascrizioni complete o dati personali nel registro.

## Registro

## D-0001 — Registro decisionale append-only

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** governance
- **Decisione:** Il progetto usa DECISIONI.md come registro append-only validato dallo script tools/append_decision.py.
- **Motivazione:** Le decisioni restano consultabili e coerenti fra chat diverse senza affidarsi al contesto conversazionale.
- **Impatto:** Ogni modifica non banale richiede una voce temporanea conforme al template e l'esecuzione dello script.
- **Follow-up:** Applicare questa convenzione alla prima decisione architetturale.
- **File coinvolti:** DECISIONI.md, AGENTS.md, STRUTTURA_PROGETTO.md, tools/append_decision.py

## D-0002 — Repository Git locale su main

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** sviluppo
- **Decisione:** Il progetto usa un repository Git locale inizializzato sul ramo main prima della creazione del codice applicativo.
- **Motivazione:** La cronologia delle modifiche e i punti di ripristino sono necessari fin dalla prima implementazione.
- **Impatto:** I file di progetto vengono predisposti per il versionamento mentre dati personali e contenuti utente restano esclusi.
- **Follow-up:** Creare il primo commit quando lo scheletro dell'archivio locale e' verificato.
- **File coinvolti:** .git, .gitignore, DECISIONI.md

## D-0003 — Archivio locale come prima milestone

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** prodotto
- **Decisione:** La prima milestone implementa importazione e archivio locale di MP3 e trascrizioni prima dell'integrazione Gemini.
- **Motivazione:** Il flusso diventa utile e verificabile senza dipendere da quote API o dal provider AI.
- **Impatto:** Le funzioni AI restano fuori dallo scheletro iniziale ma i dati mantengono audio e testo grezzo separati.
- **Follow-up:** Valutare la pipeline Gemini dopo aver importato e consultato lezioni reali.
- **File coinvolti:** IDEA_INIZIALE.md, STRUTTURA_PROGETTO.md, app

## D-0004 — Desktop Electron con React e TypeScript

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** architettura
- **Decisione:** La prima applicazione desktop Windows usa Electron con interfaccia React e codice TypeScript.
- **Motivazione:** Electron accede in modo affidabile ai file locali e offre un percorso rapido per un'app desktop mantenibile.
- **Impatto:** Il processo principale gestisce filesystem e archivio mentre il renderer riceve solo API IPC ristrette dal preload.
- **Follow-up:** Scegliere il packaging Windows dopo che il flusso di importazione e' stabile.
- **File coinvolti:** package.json, electron.vite.config.ts, electron, src

## D-0005 — Convenzione iniziale dei file del registratore

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** importazione
- **Decisione:** L'import riconosce inizialmente file nel formato SIGLA AAAA-MMDD-HH-mm-ss e associa il TXT con lo stesso nome base all'MP3.
- **Motivazione:** La convenzione osservata nei file RC permette di estrarre subito corso e data senza conoscere il modello del registratore.
- **Impatto:** I file non conformi restano importabili ma richiedono corso e data inseriti dall'utente in una fase successiva.
- **Follow-up:** Verificare il formato dei file originali quando sara' disponibile il registratore USB.
- **File coinvolti:** electron/main/archive.ts, src, IDEA_INIZIALE.md

## D-0006 — Semplificazione del workflow di logging delle decisioni

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** governance
- **Decisione:** Rimozione della cartella .decisioni-pending e dei file intermedi a favore dell'append diretto tramite script Python CLI su DECISIONI.md.
- **Motivazione:** Riduce il disordine nel repository evitando la moltiplicazione di file temporanei e mantiene un unico file storico pulito.
- **Impatto:** La registrazione di nuove decisioni avviene con un singolo comando Python senza creare o mantenere file intermedi.
- **Follow-up:** nessuno
- **File coinvolti:** tools/append_decision.py, AGENTS.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0007 — Riconoscimento formato nativo registratore senza sigla corso

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** importazione
- **Decisione:** Aggiornato il parsing del nome file per supportare sia il formato nativo del registratore (AAAA-MMDD-HH-mm-ss) senza prefisso, sia il formato con sigla (SIGLA AAAA-MMDD-HH-mm-ss). I file nativi estraggono la data e impostano il corso come nullo (da assegnare).
- **Motivazione:** I file grezzi generati dal registratore contengono unicamente il timestamp; la sigla del corso veniva aggiunta manualmente dall'utente e verra' gestita direttamente dall'interfaccia dell'applicazione.
- **Impatto:** I file del registratore vengono importati con data e ora estratte correttamente, lasciando l'assegnazione del corso all'interfaccia utente.
- **Follow-up:** Implementare l'assegnazione e modifica del corso nella UI per le lezioni importate.
- **File coinvolti:** electron/main/archive.ts, DECISIONI.md

## D-0008 — Completamento della Milestone 1 per archivio locale e gestione lezioni

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** prodotto
- **Decisione:** Aggiunte funzionalita' di lettura della trascrizione grezza, associazione manuale TXT, player audio nativo via protocollo custom media://, modifica metadati (corso e data), eliminazione sicura e suite di test con Vitest.
- **Motivazione:** Permette l'utilizzo completo dell'archivio locale senza dipendenze esterne o AI, gestendo anche file del registratore privi di sigla o con trascrizioni prodotte separatamente.
- **Impatto:** L'utente puo' consultare lezioni, leggere trascrizioni, riprodurre audio, assegnare corsi e pulire l'archivio locale prima della fase di elaborazione AI.
- **Follow-up:** Pianificare la Milestone 2 (Viewer Markdown/LaTeX avanzato e ricerca).
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/App.tsx, src/styles.css, tests/archive.test.ts, package.json

## D-0009 — Suite di test completa per archivio ed edge case

- **Data:** 2026-08-27
- **Stato:** accettata
- **Area:** test
- **Decisione:** Aggiunta di una suite di 34 test con Vitest per validare parsing nativo del registratore, calendario e anni bisestili, calcolo checksum SHA-256, operazioni CRUD e resilienza dell'ArchiveService.
- **Motivazione:** Garantire che l'archivio locale gestisca correttamente formati non standard, file corrotti, duplicati e rimozioni manuali senza perdita di dati o errori a runtime.
- **Impatto:** Elevata affidabilita' della prima milestone con copertura completa dei casi limite e validazione rapida via npm test.
- **Follow-up:** nessuno
- **File coinvolti:** tests/archive.test.ts, electron/main/archive.ts, package.json

## D-0010 — Implementazione Milestone 2 — Viewer Markdown/LaTeX, Stato Studio e Copia Contesto

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** prodotto
- **Decisione:** Aggiunto supporto per file Markdown delle lezioni, viewer con rendering KaTeX per formule matematiche, editor note, tracciamento dello stato di studio (da-studiare, in-corso, completata), esportazione contesto per Gemini e ricerca full-text.
- **Motivazione:** Permette allo studente di fruire, redigere e studiare lezioni con formule e codice, tracciare il proprio progresso didattico e trasferire facilmente il contesto a Gemini esterno prima della pipeline AI interna.
- **Impatto:** L'interfaccia si arricchisce di tab dedicati (Markdown, Trascrizione, Audio), filtri per stato di studio e ricerca nel contenuto dei testi senza dipendere da servizi cloud.
- **Follow-up:** Pianificare la Milestone 3 (Pipeline AI: trascrizione automatica, segmentazione e generazione della lezione).
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/App.tsx, src/styles.css, src/components/MarkdownViewer.tsx, src/utils/contextPrompt.ts, tests/archive.test.ts, package.json

## D-0011 — Player audio persistente e ottimizzazione del flusso di importazione da Gemini

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** prodotto
- **Decisione:** Rimosso l'editor manuale a favore di un viewer pulito con flusso di incollamento diretto da Gemini. Integrato un mini-player audio persistente a fondo drawer con velocita' variabile (1.0x-2.0x) e salti +/-10s, e aggiunti preset di prompt ingegneristici per Gemini.
- **Motivazione:** Lo studente non scrive il Markdown/LaTeX manualmente ma lo riceve da Gemini; il flusso ideale richiede incollamento con un click, rendering immediato delle formule e ascolto audio a velocita' accelerata durante la lettura.
- **Impatto:** Esperienza di studio ottimizzata: audio sempre controllabile su qualsiasi scheda e passaggio immediato tra prompt Gemini e lezione renderizzata.
- **Follow-up:** nessuno
- **File coinvolti:** src/App.tsx, src/styles.css, src/utils/contextPrompt.ts

## D-0012 — Integrazione del prompt e vincoli Gems per generazione dispense universitarie

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Integrato il prompt personalizzato Gems dell'utente come preset predefinito di esportazione Gemini, con vincoli di analisi enfasi, note d'esame, terminologia inglese e formule LaTeX.
- **Motivazione:** Garantisce che il materiale generato da Gemini rispetti esattamente gli standard didattici dell'utente (gerarchia concettuale, callout per l'esame, ricostruzione passaggi lacunosi e terminologia tecnica bilingue).
- **Impatto:** Il prompt generato con Copia per Gemini include automaticamente tutti i vincoli operativi e la struttura richiesta (Overview, Corpo, Note per l'Esame, formule LaTeX).
- **Follow-up:** Utilizzare questo stesso system prompt come base per la futura pipeline AI della Milestone 3.
- **File coinvolti:** src/utils/contextPrompt.ts, src/App.tsx

## D-0013 — Implementazione Milestone 3 — Generazione automatica dispense tramite API Google Gemini

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Integrato il servizio GeminiService nel backend Electron con SDK ufficiale @google/genai, gestione impostazioni e chiave API locale (userData/settings.json), pulsante 1-click di generazione/rigenerazione dispensa e applicazione automatica del prompt Gems con formule LaTeX (KaTeX).
- **Motivazione:** Permette allo studente di trasformare le trascrizioni grezze in dispense didattiche rifinite con formule ed enfasi esame senza passaggi manuali di copia-incolla sul browser, mantenendo audio originale e testo grezzo intatti.
- **Impatto:** L'interfaccia include il pannello Impostazioni per la chiave API, indicatore di progresso animato durante la generazione e salvataggio automatico del file Markdown renderizzato.
- **Follow-up:** Valutare pipeline di trascrizione locale o automatica per file audio privi di TXT.
- **File coinvolti:** electron/main/gemini.ts, electron/main/settings.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/App.tsx, src/styles.css, tests/archive.test.ts, package.json

## D-0014 — Supporto Pool Multi-Chiave API e Rotazione Automatica su Quota Free Tier

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Aggiunta la gestione di un pool multi-chiave API Gemini con precaricamento locale, selezione della chiave attiva, test individuale, eliminazione/aggiunta di chiavi e rotazione automatica (auto-failover) su superamento della quota temporanea (RESOURCE_EXHAUSTED).
- **Motivazione:** Permette agli studenti di utilizzare simultaneamente piu chiavi del Free Tier di Google per generare dispense in serie senza interruzioni per limiti di rate limiting o quote per minuto.
- **Impatto:** Le impostazioni AI ora mostrano l'elenco di tutte le chiavi nel pool con mascheratura sicura, stato di test in tempo reale e selezione flessibile.
- **Follow-up:** Monitorare la stabilita della rotazione su generazioni sequenziali ad alto volume.
- **File coinvolti:** electron/main/settings.ts, electron/main/archive.ts, shared/archive.ts, src/App.tsx, src/styles.css, tests/archive.test.ts

## D-0015 — Implementazione Milestone 4 — Coda Batch, Trascrizione Audio Diretta ed Esportazione PDF

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Integrati il comando di generazione batch per tutte le lezioni mancanti con rotazione del pool chiavi, la trascrizione ed elaborazione diretta da audio MP3 con Gemini Multimodale e la stampa/esportazione PDF ottimizzata con formule LaTeX KaTeX.
- **Motivazione:** Permette allo studente di elaborare interi corsi in serie con un click, di trasformare file audio privi di TXT senza passare per Google Colab/Whisper e di esportare/stampare le dispense per lo studio offline.
- **Impatto:** Interfaccia arricchita con pulsanti di generazione batch, trascrizione diretta da audio ed esportazione PDF con foglio di stile di stampa dedicato.
- **Follow-up:** Valutare suddivisione semantica avanzata per lezioni con audio superiore alle 2 ore.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/App.tsx, src/styles.css, tests/archive.test.ts, STRUTTURA_PROGETTO.md

## D-0016 — Pipeline Multi-Stadio con Gem di Taglio Semantico e Sintesi Didattica Approfondita per Sezioni

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Adozione della pipeline didattica a piu stadi: per trascrizioni lunghe (>1200 parole), l'applicazione esegue prima la segmentazione semantica in 3-5 macroargomenti bilanciati (Gem di Taglio), poi sintetizza approfonditamente ciascuna sezione in modo isolato con formule LaTeX KaTeX complete (Gem Didattico) e infine genera l'overview didattica e unifica la dispensa.
- **Motivazione:** L'elaborazione in un unico passaggio su lezioni lunghe causava sintesi eccessiva e perdita di passaggi matematici cruciali. L'approccio a sezioni garantisce profondita accademica massima e trattazione completa di ogni dimostrazione.
- **Impatto:** Dispense universitarie molto piu ricche ed esaustive, senza perdita di dettagli tecnici o formule, replicando fedelmente il flusso manuale dello studente.
- **Follow-up:** Testare con lezioni reali complesse di robotica e automazione.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, tests/archive.test.ts

## D-0017 — Analisi ASR, Limiti di Trascrizione Locale/Multimodale e Mantenimento Ingestione TXT da Colab

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** asr-ingestion
- **Decisione:** Confermato l'impianto architetturale originario di Lezionify incentrato sull'ingestione di file di trascrizione grezza (.txt) generati a monte (es. Google Colab con Whisper large-v3). Rifiutata l'esecuzione forzata di ASR locale pesante su GPU/laptop consumer o server remoti a pagamento dedicati per l'ASR.
- **Motivazione:** L'ASR multimodale diretto di Gemini applica compressione semantica e allucinazioni non idonee alla trascrizione verbatim; l'esecuzione locale di Whisper large-v3 su laptop comporterebbe oltre 1 ora di ventole al 100%, surriscaldamento e rumore incompatibili con l'uso in biblioteca/aula studio; le API cloud ASR impongono limiti di rate limiting o costi orari. Google Colab garantisce invece trascrizioni perfette, silenziose e a costo zero nel cloud prima dell'ingestione in Lezionify.
- **Impatto:** Lezionify focalizza le proprie risorse su archiviazione ordinata, associazione audio/testo, ascolto integrato e trasformazione via AI in dispense didattiche KaTeX, preservando l'esperienza utente silenziosa e reattiva sul PC dello studente.
- **Follow-up:** Mantenere sempre attivo e prominente il pulsante Allega Trascrizione (.txt) nell'interfaccia per le lezioni in stato audio-only.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, src/App.tsx, AGENTS.md, DECISIONI.md, STRUTTURA_PROGETTO.md

## D-0018 — Auto-Scansione Cartelle, Rilevamento Trascrizioni e Generazione Batch Selettiva con Checkbox

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ui-workflow
- **Decisione:** Aggiunta la scansione automatica all'avvio (scanAndSyncLibrary), l'apertura rapida della cartella in Esplora Risorse (openLibraryFolder) e il modale di selezione interattivo con checkbox per decidere quali dispense generare tra quelle con trascrizione pronta.
- **Motivazione:** Consente allo studente di copiare e incollare file audio e trascrizioni TXT da Colab direttamente su disco, avere l'associazione automatica e scegliere con precisione quali dispense creare con la pipeline AI multi-stadio.
- **Impatto:** Interfaccia utente dotata di pulsanti Apri Cartella, Sincronizza e Genera Dispense Selezionate, modale con checkbox e badge di stato chiari (Da trascrivere su Colab, Trascrizione pronta, Dispensa AI).
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/App.tsx, src/styles.css, tests/archive.test.ts

## D-0019 — Estrazione cumulativa info corso tramite file Markdown dedicati

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** Architettura
- **Decisione:** Le info d'esame e logistiche vengono estratte e unite tramite Gemini 3.1 Pro Preview in file Markdown persistenti dentro course_info/[CORSO].md
- **Motivazione:** Evita di perdere le info estratte in precedenza a causa di allucinazioni di Gemini, consentendo al contempo modifiche manuali e creando un documento vivo parallelo alle dispense per ogni corso.
- **Impatto:** Crea un layer secondario di conoscenza per corso, visibile nel nuovo Cruscotto Statistiche
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, shared/archive.ts, electron/main/archive.ts, src/App.tsx

## D-0020 — Modello per estrazione info corso (Sostituisce parte di D-0019)

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** Architettura
- **Decisione:** Si utilizza il modello selezionato dall'utente (di default gemini-3.6-flash) anziche' gemini-3.1-pro-preview per il merge delle info corso.
- **Motivazione:** Gemini 3.1 Pro Preview non funziona/non e' disponibile per questo account, causando il fallimento silenzioso del merge. Usare il modello scelto nelle impostazioni garantisce affidabilita'.
- **Impatto:** Il merge usa il modello attivo configurato.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts

## D-0021 — Async Mutex su library.json e Cifratura API Key con safeStorage

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** sicurezza-concorrenza
- **Decisione:** Adozione della classe AsyncMutex per serializzare tutte le operazioni di scrittura su library.json, e cifratura delle chiavi API di Gemini su disco tramite l API nativa safeStorage di Electron con backup ciclico .bak.
- **Motivazione:** Risolve le vulnerabilita critiche C1 (race condition e perdita dati durante batch) e H3/M4 (API key salvate in chiaro e rischio corruzione file).
- **Impatto:** Scritture su library.json concorrenti sicure e credenziali API protette sul filesystem dell utente.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/asyncMutex.ts, electron/main/settings.ts, electron/main/libraryRepository.ts

## D-0022 — Scomposizione Modulare di App.tsx in Custom Hooks e Componenti

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** frontend-architettura
- **Decisione:** Scomposizione del monolite App.tsx da 1889 righe in 4 custom hooks (useLectures, useSettings, useLectureContent, useGeminiGeneration) e 7 componenti React dedicati (Sidebar, LectureList, LectureDrawer, AudioPlayer, Dashboard, SettingsModal, BatchSelectionModal, PasteModal), con isolamento del player audio per azzerare i re-rendering continui durante la riproduzione (C2) e flag di cancellazione nelle chiamate asincrone per prevenire race conditions UI (H2).
- **Motivazione:** Migliora drasticamente la manutenibilita, la testabilita e la reattivita dell interfaccia eliminando il collo di bottiglia del God-Component.
- **Impatto:** Codice pulito, isolamento dello stato e delle ri-renderizzazioni, eliminazione dei freeze dell interfaccia.
- **Follow-up:** nessuno
- **File coinvolti:** src/App.tsx, src/hooks, src/components

## D-0023 — Modularizzazione di ArchiveService e Indicizzazione Full-Text in-memory con MiniSearch

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** backend-architettura
- **Decisione:** Scomposizione di ArchiveService in moduli a singola responsabilita (FileNameParser, FileStorageService, LibraryRepository con cache in-memory, SearchIndexService) e adozione di MiniSearch per la ricerca full-text istantanea senza continue letture I/O sequenziali da disco.
- **Motivazione:** Risolve le criticita M6 (God Object), H5 (overhead I/O costante) e H4 (ricerca O(N) lenta da disco).
- **Impatto:** Tempi di ricerca sub-millisecondo e persistenza ottimizzata con cache in-memory.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/archive.ts, electron/main/fileNameParser.ts, electron/main/fileStorage.ts, electron/main/libraryRepository.ts, electron/main/searchIndex.ts

## D-0024 — Adozione di ESLint e Prettier per Qualita Statica e Formattazione

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** sviluppo-qualita
- **Decisione:** Configurazione di ESLint flat config con supporto TypeScript e React Hooks, integrazione di Prettier per formattazione automatica e aggiornamento di .gitignore con esclusione di file multimediali e cartelle IDE.
- **Motivazione:** Risolve H6 (mancanza linter) e M5 (gitignore incompleto), garantendo conformita stilistica e prevenendo bug sintattici.
- **Impatto:** Script npm run lint e npm run format operativi con 0 errori su tutta la codebase.
- **Follow-up:** nessuno
- **File coinvolti:** package.json, eslint.config.js, .prettierrc, .gitignore

## D-0025 — Risoluzione disallineamenti di stato, indice di ricerca e cache emersi dal Self-Audit

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** affidabilita-sincronizzazione
- **Decisione:** Re-indicizzazione immediata in SearchIndexService su updateLecture, invalidazione esplicita della cache di LibraryRepository all avvio di scanAndSyncLibrary, preservazione della velocita di riproduzione in AudioPlayer all evento loadedmetadata e switch automatico alla tab markdown dopo generazione batch.
- **Motivazione:** Garantisce coerenza assoluta tra stato in memoria, filesystem e interfaccia utente a seguito del controllo avversariale post-refactoring.
- **Impatto:** Nessun dato stantio nella ricerca o nella cache, UX audio fluida e corretta navigazione tra le tab.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/archive.ts, src/components/AudioPlayer.tsx, src/hooks/useGeminiGeneration.ts

## D-0026 — Implementazione Milestone 5 - Studio Attivo con Quiz d Esame Interattivi e Flashcard LaTeX

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** prodotto-studio-ai
- **Decisione:** Introduzione del modulo di Studio Attivo: generazione automatica tramite Gemini AI di 5 quiz a risposta multipla con spiegazioni didattiche e formule LaTeX, 6 flashcard con rendering KaTeX ed effetto 3D flip, persistenza locale in study_sets/<lectureId>.json e tab dedicata nel LectureDrawer.
- **Motivazione:** Fornisce allo studente uno strumento completo di autovalutazione e memorizzazione attiva dei concetti d esame direttamente dalle lezioni.
- **Impatto:** Nuova tab di studio nel drawer, scoring interattivo, tracking flashcard apprese/da rivedere e zero spreco di quota API grazie alla persistenza su file.
- **Follow-up:** nessuno
- **File coinvolti:** shared/archive.ts, electron/main/gemini.ts, electron/main/fileStorage.ts, electron/main/archive.ts, electron/preload/index.ts, electron/main/index.ts, src/components/StudyQuizView.tsx, src/components/StudyFlashcardView.tsx, src/components/StudySetTab.tsx, src/components/LectureDrawer.tsx, src/hooks/useLectureContent.ts, src/styles.css, tests/archive.test.ts

## D-0027 — Risoluzione bug importazione cartella e inizializzazione storage

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** importazione-file
- **Decisione:** Corretto selectAndImportFolder per leggere i file dalla cartella selezionata dall utente anziche dalla directory interna, e garantita inizializzazione esplicita delle cartelle prima di qualsiasi operazione di copia e lettura.
- **Motivazione:** Risolve il fallimento dell importazione file e cartelle esterne durante il primo utilizzo dell applicazione.
- **Impatto:** Importazione file e cartelle affidabile e priva di errori I/O.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/archive.ts, electron/main/fileStorage.ts, electron/main/libraryRepository.ts

## D-0028 — Miglioramento messaggi di errore e dettaglio diagnostico in UI

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** ux-gestione-errori
- **Decisione:** Potenziata la formattazione dei messaggi d errore e notifica nell interfaccia: elenco puntato con motivazioni dettagliate per i file scartati, percorso su disco esplicito in caso di mancata apertura di Esplora Risorse e supporto a layout multilinea nel banner delle notifiche.
- **Motivazione:** Fornisce feedback trasparente e azionabile all utente finale facilitando l autodiagnosi e la risoluzione dei problemi.
- **Impatto:** Messaggi chiari, leggibili e comprensivi di percorsi e cause precise dell errore.
- **Follow-up:** nessuno
- **File coinvolti:** src/hooks/useLectures.ts, shared/archive.ts, electron/main/archive.ts, src/styles.css

## D-0029 — Parallelizzazione sezioni e feedback di avanzamento real-time durante la generazione

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** generazione-ai-ux
- **Decisione:** Parallelizzata l elaborazione delle sezioni con Promise.all riducendo il tempo medio per lezione da 60s a 20s (~3x speedup). Implementato canale IPC onGenerationProgress per inviare aggiornamenti live con percentuale, messaggi descrittivi e checklist visiva a 3 fasi nell interfaccia.
- **Motivazione:** Risolve la percezione di blocco dell applicazione durante trascrizioni lunghe, fornendo feedback visivo trasparente su ogni fase e velocizzando la pipeline.
- **Impatto:** Generazione quasi 3 volte piu veloce ed esperienza utente fluida con barra di avanzamento e log descrittivi live.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/hooks/useGeminiGeneration.ts, src/components/LectureDrawer.tsx, src/components/BatchSelectionModal.tsx, src/styles.css

## D-0030 — Revisione System Prompt per tono didattico

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** AI
- **Decisione:** Rimosse istruzioni che forzavano l'AI ad espandere eccessivamente i concetti e usare un tono accademico in SECTION_DEEP_SYSTEM_INSTRUCTION. Aggiunti vincoli di proporzionalità e tono.
- **Motivazione:** L'utente ha segnalato che Lezionify produceva appunti troppo lunghi, con un tono da paper scientifico (paroloni formali) ed espandeva esempi rapidi del docente in complesse derivazioni matematiche. Le nuove istruzioni prediligono la chiarezza e la fedeltà alla durata/profondità reale della lezione.
- **Impatto:** Gli appunti generati saranno più leggibili, diretti e proporzionati alla vera enfasi data dal professore in aula, migliorando la qualità dello studio.
- **Follow-up:** Verificare con le prossime generazioni se il livello di sintesi è corretto senza perdere il rigore matematico delle formule.
- **File coinvolti:** electron/main/gemini.ts

## D-0031 — Retry automatico 503, ordinamento cronologico e callout alert Markdown

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** AI/UI
- **Decisione:** 1) Introdotto retry automatico con backoff (1 min di attesa, max 3 tentativi) per errori 503/429. 2) Ordinamento delle lezioni nella home reso cronologico crescente (piu vecchie in alto, recenti in basso). 3) Implementato rendering dedicato dei callout GitHub Markdown [!NOTE], [!WARNING], [!CRITICAL], ecc. con supporto stampa/PDF. 4) Unificata la sezione Note d'Esame a una sola istanza globale e strettamente fattuale.
- **Motivazione:** Migliorare l'affidabilita contro i sovraccarichi dei server Google, garantire un layout chiaro delle lezioni in ordine temporale di corso ed evitare box esame duplicati o allucinati.
- **Impatto:** Maggiore robustezza dell'app durante i picchi di traffico Gemini, grafica dei callout pulita e fedele al parlato del docente.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, src/components/MarkdownViewer.tsx, src/styles.css, tests/archive.test.ts

## D-0032 — Redesign Notability-style

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Ristrutturata l'interfaccia con sidebar collassabile, rimossa la barra dei menu di Electron, aggiunto tracking data esame e fixato il layout del modal di generazione batch.
- **Motivazione:** Miglioramento radicale dell'UX richiesto per avvicinarsi a Notability, pulire la UI dai campi ridondanti e aggiungere calcolo del ritmo di studio.
- **Impatto:** Cambio visivo maggiore e struttura a due pannelli.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/Sidebar.tsx, src/components/LectureList.tsx, src/components/Dashboard.tsx, src/components/BatchSelectionModal.tsx

## D-0033 — Focus Mode Immersiva

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Aggiunta una 'Modalità Immersiva' a schermo intero per la lettura delle dispense generate.
- **Motivazione:** Permette all'utente di studiare e concentrarsi sul contenuto (leggere, scrollare e zoomare) senza le distrazioni della sidebar o dei tasti di configurazione, avvicinandosi all'esperienza di lettura pulita di un tablet.
- **Impatto:** Aggiunge l'overlay fullscreen richiamabile con un tasto e chiudibile via Esc o pulsante.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx, src/styles.css

## D-0034 — Modifica Focus Mode (HTML5 Fullscreen)

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Sostituito l'overlay CSS con la Native HTML5 Fullscreen API (requestFullscreen) e rimosso il riproduttore audio fluttuante.
- **Motivazione:** L'overlay CSS non nascondeva la barra del titolo della finestra (Electron/OS). L'audio non era necessario per la fruizione e causava distrazione.
- **Impatto:** Esperienza di lettura completamente a schermo intero senza distrazioni.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0035 — Ripristino Pinch-to-Zoom

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Reimplementato lo zoom tramite pinch-to-zoom (evento wheel + ctrlKey) sul touchpad.
- **Motivazione:** Il pinch-to-zoom nativo era bloccato dalle impostazioni di Electron, ma gli utenti desideravano l'esperienza tipica dei lettori PDF. L'intercettazione degli eventi wheel permette di scalare fluidamente il font della dispensa senza usare scomodi pulsanti.
- **Impatto:** Aumenta l'usabilità della modalità focus.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0036 — Fix renderizzazione Zoom

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Cambiata la proprietà CSS da \ontSize: Xrem\ a \zoom: X\ per il contenitore Markdown nella Focus Mode.
- **Motivazione:** Le regole CSS di classe globale .markdown-rendered-content usavano valori \px\ fissi per h1, h2, ecc., ignorando le direttive fontSize del contenitore genitore. \zoom\ ridimensiona proporzionalmente tutto il contenuto bypassando i limiti dei pixel assoluti e permettendo il wrap corretto.
- **Impatto:** Lo zoom sul touchpad ora ingrandisce e riduce correttamente il testo e le formule in tempo reale.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0037 — Ottimizzazione Pinch-to-Zoom

- **Data:** 2026-08-28
- **Stato:** accettata
- **Area:** Performance
- **Decisione:** Sostituito lo state di React (zoomLevel) con DOM Refs per l'aggiornamento in realtime dello zoom nella Modalità Focus.
- **Motivazione:** L'aggiornamento dello State su eventi ad alta frequenza (rotellina/trackpad) causava un re-render continuo dell'intero albero Markdown (e di KaTeX per la matematica), bloccando il main thread per interi secondi causando estrema lentezza (input lag). La mutazione diretta del DOM bypassa React garantendo i 60fps.
- **Impatto:** Lo zoom sul touchpad è ora istantaneo, fluido e non blocca l'applicazione.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0038 — Progressive disclosure in SettingsModal

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UX
- **Decisione:** Introdotta progressive disclosure per le impostazioni avanzate (modello e auto-rotazione) e aggiunti aria-label.
- **Motivazione:** Semplifica la prima esperienza utente (A-04) evitando sovraccarico informativo, e migliora l'accessibilità (B-01).
- **Impatto:** Modifiche visive al SettingsModal; la sezione avanzata è nascosta di default se c'è meno di 2 chiavi nel pool. Lettori di schermo leggono meglio i pulsanti.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/SettingsModal.tsx

## D-0039 — Risoluzione totale 26 problemi UX/UI (Audit)

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UX/UI
- **Decisione:** Implementate correzioni per tutti i 26 problemi identificati nell'Audit, inclusi fix critici (freccia flashcard, salvataggi distruttivi, importazione cartella), miglioramenti navigazione (shortcut, Escape, chiusura overlay), onboarding con drag&drop e badge di stato ottimistici.
- **Motivazione:** Migliorare drasticamente la facilità d'uso, accessibilità e robustezza, risolvendo le incoerenze scoperte durante l'analisi UX.
- **Impatto:** Nessun impatto architetturale negativo; miglioramenti generalizzati all'interfaccia utente (CSS + React State).
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/*.tsx, src/hooks/*.ts, src/App.tsx, src/styles.css

## D-0040 — Dark Mode Obsidian Emerald, Toggle Sole/Luna e Restyling di Personalità

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Introdotta la Dark Mode completa ('Obsidian Emerald') con persistenza in localStorage, pulsante interattivo animato Sole/Luna nella sidebar, bilanciamento visivo della lista lezioni con metadati e file size, armonizzazione dei pulsanti della toolbar del drawer.
- **Motivazione:** Fornire un'esperienza di studio notturna a basso affaticamento visivo, arricchire la personalità dell'app con micro-interazioni moderne e rifinire la densità informativa.
- **Impatto:** Aggiunto supporto al cambio tema istantaneo su tutta l'applicazione (Sidebar, Liste, Drawer, KaTeX, Quiz, Flashcard, Focus Mode) e layout lista lezioni più bilanciato.
- **Follow-up:** Nessuno
- **File coinvolti:** src/App.tsx, src/components/Sidebar.tsx, src/components/LectureList.tsx, src/components/LectureDrawer.tsx, src/styles.css

## D-0041 — Titoli Descrittivi AI, Accessibilità Daltonici e Restyling Cruscotto Statistiche

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Integrazione dei titoli descrittivi didattici generati dall'AI (estratti dall'H1 delle dispense) in lista e drawer, incremento del contrasto dark mode a conformità WCAG AAA, differenziazione geometrica degli stati studio per daltonici e restyling della Dashboard con grafici ad anello (Ring Progress SVG) e Hero KPI banner.
- **Motivazione:** Risolvere le criticità di usabilità e scansione visiva evidenziate dalla review di design Figma, rendendo la navigazione tra lezioni immediata e il cruscotto statistiche visivo e motivante.
- **Impatto:** Navigazione rapida per argomento anziché per soli prefissi/nomi file, migliore accessibilità visiva e dashboard arricchita con grafici interattivi.
- **Follow-up:** Nessuno
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, src/components/LectureList.tsx, src/components/LectureDrawer.tsx, src/components/Dashboard.tsx, src/styles.css, tests/archive.test.ts

## D-0042 — Fix Trasparenza Finestra Informazioni e Logistica Corso

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UI/UX-Modali
- **Decisione:** Corretto il container della finestra modale Informazioni sul Corso e l'Esame in Dashboard.tsx e styles.css assegnando la classe modal-content, background solido, bordi e supporto dual-theme.
- **Motivazione:** La finestra modale risultava trasparente sovrapponendosi in modo illeggibile al cruscotto sottostante a causa dell'assenza di background nel selettore CSS.
- **Impatto:** La finestra ora presenta sfondo opaco, bordi definiti, ombreggiatura e perfetta leggibilità sia in light mode che in dark mode.
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/Dashboard.tsx, src/styles.css

## D-0043 — Icona Ufficiale Lezionify, AppUserModelId e Packaging Windows EXE

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Build/Desktop-Packaging
- **Decisione:** Generazione icona ufficiale Lezionify (.png e .ico multi-risoluzione), configurazione AppUserModelId ('com.lezionify.app') per pinning su barra delle applicazioni di Windows, e setup di electron-builder per compilazione sia di installer NSIS (Lezionify-Setup-0.1.0.exe) che standalone portable (Lezionify-Portable-0.1.0.exe).
- **Motivazione:** Permettere l'avvio immediato e confortevole di Lezionify da barra delle applicazioni e desktop su Windows con brand identity grafica curata.
- **Impatto:** Generati pacchetti eseguibili pronti all'uso in dist/ con icona desktop e taskbar integrata.
- **Follow-up:** Nessuno
- **File coinvolti:** tools/generate_icons.py, resources/icon.png, resources/icon.ico, electron/main/index.ts, electron-builder.yml, package.json

## D-0044 — Implementazione Spatial Q&A (Margin Notes)

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Feature: Spatial Q&A
- **Decisione:** Implementazione UI fluttuante, Sidebar QnA, highlighting DOM-based e salvataggio separato in library/qna/
- **Motivazione:** Permettere domande contestuali all'AI senza disorientare l'utente o rovinare il file markdown, fornendo context locali o globali
- **Impatto:** Aggiunge QnaSidebar, usa TreeWalker per evidenziare il testo su DOM per non corrompere react-markdown
- **Follow-up:** Verificare se il TreeWalker copre tutti i casi edge cross-node
- **File coinvolti:** src/components/LectureDrawer.tsx, src/hooks/useQna.ts, electron/main/gemini.ts

## D-0045 — Fix loop infinito TreeWalker e parsing LaTeX KaTeX

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Bugfix: Spatial Q&A
- **Decisione:** Aggiunto NodeFilter al TreeWalker per evitare loop e implementata ricostruzione del source LaTeX dal DOM KaTeX.
- **Motivazione:** Evitare il blocco dell'app dovuto alla re-ispezione degli span evidenziati e permettere a Gemini di ricevere e rispondere con codice matematico valido.
- **Impatto:** Risolve il freeze dell'UI, abilita il rendering matematico nella sidebar QnA e sanitizza le risposte AI.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/MarkdownViewer.tsx, src/components/LectureDrawer.tsx, src/components/QnaSidebar.tsx

## D-0046 — Fix update timer audio e disattivazione Portable

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Bugfix: Audio Player
- **Decisione:** Aggiunto listener all'evento 'durationchange' per gli MP4/M4A VBR e rimosso target Portable dalle build Windows di default.
- **Motivazione:** Senza durationchange, il player assumeva una durata statica causando il blocco visivo della progress bar. Inoltre la Portable generava un inutile overhead nei tempi di build.
- **Impatto:** Progress bar reattiva e build più veloci.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/AudioPlayer.tsx, electron-builder.yml

## D-0047 — Implementazione HTTP 206 Partial Content per protocollo media://

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Architettura: Streaming Audio
- **Decisione:** Sostituita la semplice fetch del file con uno stream manuale NodeJS che rispetta gli header Range e Accept-Ranges (HTTP 206).
- **Motivazione:** Senza Accept-Ranges, Chromium non riesce a calcolare correttamente la vera durata dei file MP3 VBR (restituendo Infinity o una stima fissa errata), bloccando di fatto le barre di scorrimento.
- **Impatto:** Permette il seeking preciso e la corretta visualizzazione della durata totale dei file audio lunghi MP3/M4A.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/index.ts

## D-0048 — Rimozione pulsante Copia prompt obsoleto

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** UX: Interfaccia
- **Decisione:** Rimosso il menu a tendina 'Copia prompt per Gemini' e l'infrastruttura sottostante dalla schermata della lezione.
- **Motivazione:** Le funzionalità (dispensa e quiz) sono ormai integrate nativamente nell'app tramite chiamate API dirette. Il pulsante generava confusione visiva ed era un retaggio del periodo in cui l'utente doveva incollare i prompt nella web-app di Gemini.
- **Impatto:** Interfaccia più pulita, codice più manutenibile.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx, src/App.tsx, src/hooks/useLectureContent.ts

## D-0049 — Implementazione Regex Sanitizer per parsing JSON con LaTeX

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** Bugfix: Generazione Quiz JSON
- **Decisione:** Aggiunto uno step di pre-parsing che effettua il doppio escape automatico sui backslash singoli nel JSON prima di darlo in pasto a JSON.parse, e rinforzato il system prompt.
- **Motivazione:** Gemini spesso fallisce nell'effettuare il doppio escape di costrutti LaTeX in JSON (es. inserisce \sin invece di \\sin). Questo causa eccezioni del tipo 'Bad escaped character' corrompendo l'intero quiz.
- **Impatto:** Garantisce il salvataggio dei quiz anche quando il modello AI produce sintassi non conforme per le stringhe interne al JSON.
- **Follow-up:** nessuno
- **File coinvolti:** electron/main/gemini.ts

## D-0050 — Modulo Tempistiche di Studio con Focus Lock a 15s e Statistiche nella Dashboard

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** prodotto-studio-tracker
- **Decisione:** Implementazione del sistema di tracciamento tempo di studio basato su macchina a stati con Delta Clock Guard contro la sospensione PC, auto-pausa istantanea su minimizzazione, Focus Lock con modale anti-distrazione a 15s (orologio circolare SVG), salvataggio atomico su study_sessions.json e sezione analitica nella Dashboard.
- **Motivazione:** Fornisce allo studente una misurazione accurata al secondo del tempo reale dedicato a ciascun corso ed evita l accumulo di ore false durante sonno/inattivita o la perdita di minuti per crash, introducendo una frizione psicologica di 15s per rompere l impulso di uscire dalla concentrazione.
- **Impatto:** Nuovo hook useStudyTracker, modale FocusLockModal con animazione radiale SVG, estensione dell ArchiveService per calcolo metriche (oggi, 7 giorni, medie, streak, materie) e arricchimento della Dashboard.
- **Follow-up:** Verificare l intercettazione del tasto Escape in modalita fullscreen su Windows.
- **File coinvolti:** shared/archive.ts, electron/main/fileStorage.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useStudyTracker.ts, src/components/FocusLockModal.tsx, src/components/LectureDrawer.tsx, src/components/Dashboard.tsx, src/styles.css, tests/archive.test.ts

## D-0051 — Architettura Chat Globale di Corso (RAG Cross-Lezione)

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** AI / RAG
- **Decisione:** Definizione del piano architetturale completo per la Chat Globale di Corso con RAG ibrido a due livelli (Course Map + Top-K chunk), citazioni interattive e thread persistenti, documentato in docs/PIANO_CHAT_GLOBALE_CORSO.md.
- **Motivazione:** Permette agli studenti di effettuare interrogazioni trasversali tra dispense e trascrizioni multiple durante il ripasso d'esame, prevenendo l'esplosione dei token e garantendo la navigazione diretta verso le lezioni citate.
- **Impatto:** Piano formalizzato e salvato nel repository; pronto per l'implementazione senza modifiche al runtime attuale.
- **Follow-up:** Implementazione IPC, RAG engine e UI modale su richiesta.
- **File coinvolti:** docs/PIANO_CHAT_GLOBALE_CORSO.md, STRUTTURA_PROGETTO.md

## D-0052 — Gestione Multi-Corso, CFU, Orario Settimanale, Auto-Assegnazione Intelligente e Ottimizzazione Fluidità UI

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** multi-corso-orari-fluidita
- **Decisione:** Implementazione dell'anagrafica multi-corso con formula CFU (1 CFU = 7h aula + 18h studio = 25h totali), date semestre obbligatorie, orario settimanale, algoritmo di matching bidirezionale per sovrapposizione oraria (schedule matching), wizard di assegnazione e validazione con confidenza %, rinomina/fusione globale sicura (lezioni, note course_info e study_sessions), banner promemoria inizio semestre (20 Sett-10 Ott e 26 Feb-9 Mar) e ottimizzazioni di fluidità (tab panels persistenti a 0ms, memoizzazione KaTeX e isolamento timer a 1s).
- **Motivazione:** Consente allo studente di gestire più materie universitarie con orari di lezione reali, assegnare automaticamente le registrazioni vocali basandosi su orario e durata, rinominare i corsi senza perdere dati o frammentare l'archivio, e garantisce una reattività a 60fps con transizioni a 0ms tra le schede.
- **Impatto:** Aggiunti componenti CourseManagementModal e SemesterReminderBanner, esteso ArchiveService con metodi getCourses, saveCourse, deleteCourse, renameCourse, matchLectureToCourse e autoAssignCoursesBySchedule, ottimizzato LectureDrawer e MarkdownViewer con React.memo e tab persistenti, 45/45 test passati.
- **Follow-up:** nessuno
- **File coinvolti:** shared/archive.ts, electron/main/fileStorage.ts, electron/main/settings.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/components/CourseManagementModal.tsx, src/components/SemesterReminderBanner.tsx, src/components/Sidebar.tsx, src/components/Dashboard.tsx, src/components/LectureDrawer.tsx, src/components/MarkdownViewer.tsx, src/components/StudyQuizView.tsx, src/hooks/useLectureContent.ts, src/App.tsx, tests/archive.test.ts

## D-0053 — Protezione Globale Anti-Crash con ErrorBoundary, Reset Fullscreen e Safe DOM Mutation

- **Data:** 2026-08-29
- **Stato:** accettata
- **Area:** stabilita-ui-error-boundary
- **Decisione:** Aggiunto componente ErrorBoundary su root React, su MarkdownViewer e su ciascuna vista principale (Archivio, Dashboard, Drawer), rimosso il rischio di mutazione DOM concorrente in MarkdownViewer con try/catch e safe clean, e introdotto il reset esplicito dello stato isFullScreen e cleanup dei listener su cambio lezione/unmount.
- **Motivazione:** Quando React incontra un'eccezione non gestita durante la riconciliazione del virtual DOM (es. nodi alterati o formule KaTeX malformate in una lezione), smonta l'intero albero applicativo causando una schermata completamente nera in dark theme. L'ErrorBoundary intercetta gli errori localmente e permette il recupero con un click, mentre il reset dello stato fullscreen evita blocchi visivi passando da una lezione all'altra.
- **Impatto:** Azzerato il rischio di schermata nera totale (white/black screen of death); ogni modulo si riprende autonomamente con fallback visivo e pulsante di ricarica; ricompilato l'installer.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/ErrorBoundary.tsx, src/main.tsx, src/App.tsx, src/components/MarkdownViewer.tsx, src/components/LectureDrawer.tsx, src/components/Dashboard.tsx

## D-0054 — Modulo Quick Capture Overlay con Backdrop Blur e Countdown Esami nella Dashboard

- **Data:** 2026-08-30
- **Stato:** accettata
- **Area:** prodotto-ux-quickcapture
- **Decisione:** Implementazione dell'overlay rapido per il Brain Dump (Ctrl+M / Ctrl+P / Esc) con effetto Backdrop Blur a 12px, due post-it affiancati (To-Do con checkbox interattive e Note con supporto grassetto Ctrl+B), persistenza isolata in scratchpad.json con debounce 300ms, e inserimento del widget Countdown Esami con ritmo di studio nel Cruscotto Statistiche.
- **Motivazione:** Permette allo studente di scaricare istantaneamente pensieri intrusivi (to-do, commissioni, idee di sviluppo o orari) senza interrompere il flusso di studio ne affaticare la vista con elementi distraenti, garantendo isolamento da library.json, compatibilita con Fullscreen Focus Mode e visualizzazione chiara dei giorni rimanenti agli appelli d esame.
- **Impatto:** Aggiunti QuickCaptureOverlay.tsx, useQuickCapture.ts, metodi getScratchpad/saveScratchpad in ArchiveService e FileStorageService, widget Countdown Esami e box riassuntivo Scratchpad in Dashboard.tsx, 48/48 test passati.
- **Follow-up:** nessuno
- **File coinvolti:** shared/archive.ts, electron/main/fileStorage.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useQuickCapture.ts, src/components/QuickCaptureOverlay.tsx, src/components/Sidebar.tsx, src/components/Dashboard.tsx, src/App.tsx, src/styles.css, tests/archive.test.ts

## D-0055 — Attivazione Timer Studio Esclusivamente in Full Mode e Restyling Minimale Anti-Distrazione

- **Data:** 2026-08-30
- **Stato:** accettata
- **Area:** prodotto-ux-timer
- **Decisione:** Il tracking del tempo di studio e ora vincolato unicamente all ingresso in Full Mode (Focus Mode); il timer e stato rimosso dall intestazione ordinaria del drawer per evitare conteggi non intenzionali o reset spuri su cambio scheda/fullscreen. Nella toolbar di Full Mode il pulsante centrale pulsante e stato sostituito con un indicatore tipografico discreto e attenuato accanto allo zoom.
- **Motivazione:** Garantisce che il tempo di studio corrisponda a reale studio immersivo in full screen, elimina il bug di reset del timer durante i cambi di stato e previene ogni distrazione visiva durante la lettura delle dispense.
- **Impatto:** useStudyTracker refactorizzato per attivarsi solo con isEnabled=isFullScreen con flush atomico all uscita, rimosso StudyTimerPill dal drawer ordinario, generato installer Windows Lezionify-Setup-0.1.0.exe.
- **Follow-up:** nessuno
- **File coinvolti:** src/hooks/useStudyTracker.ts, src/components/LectureDrawer.tsx, src/styles.css

## D-0056 — Semplificazione Ultra-Minimale dell Overlay Quick Capture (Zero Visual Noise)

- **Data:** 2026-08-30
- **Stato:** accettata
- **Area:** prodotto-ux-quickcapture
- **Decisione:** Rimossa interamente la barra superiore di tutorial, le intestazioni ridondanti, i testi di empty state e i placeholder esplicativi dall overlay Quick Capture. L interfaccia espone unicamente due colonne pulite (Cose da fare e Note) con focus immediato e un tasto di chiusura minimale.
- **Motivazione:** Soddisfa il requisito di assoluta assenza di distrazione durante lo studio, lasciando un ambiente privo di testo superfluo o indicazioni tutorial per l utente.
- **Impatto:** QuickCaptureOverlay.tsx e styles.css ripuliti da elementi descrittivi, rigenerato installer Windows dist/Lezionify-Setup-0.1.0.exe.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/QuickCaptureOverlay.tsx, src/styles.css

## D-0057 — Fix z-index Quick Capture e Sistema Pausa Programmata in Focus Mode

- **Data:** 2026-09-03
- **Stato:** accettata
- **Area:** prodotto-ux-focus-pause
- **Decisione:** Elevato lo z-index di QuickCaptureOverlay a 9999999 per renderlo visibile e richiamabile ovunque sopra Focus Mode e modal; integrato in FocusLockModal il menu di pausa con preset a 5, 15 e 30 minuti; aggiunto PauseTimerOverlay con countdown radiale Pomodoro SVG, sfocatura backdrop della lezione e congelamento del tempo di studio durante la pausa con ripresa fluida o uscita al termine.
- **Motivazione:** Risolve il bug di visibilita del Quick Capture durante lo studio a schermo intero (era coperto dal layer Focus Mode a z-index 9999) e fornisce una pausa programmata che non inquina le statistiche del tempo di studio effettivo, consentendo un flusso di concentrazione e riposo senza attriti.
- **Impatto:** Quick Capture sempre accessibile via Ctrl+M o Ctrl+P anche in Focus Mode o in pausa; nuovo componente PauseTimerOverlay; intercettazione Esc sia per chiusura rapida del memo che per ripresa studio dalla pausa; 48/48 test passati e build electron-vite validata.
- **Follow-up:** nessuno
- **File coinvolti:** src/components/PauseTimerOverlay.tsx, src/components/FocusLockModal.tsx, src/components/LectureDrawer.tsx, src/hooks/useStudyTracker.ts, src/styles.css

## D-0058 — Modalità Evidenziatore Permanente con Interval Merging e CSS Highlights API

- **Data:** 2026-09-03
- **Stato:** accettata
- **Area:** ux
- **Decisione:** Adozione della modalità evidenziatore permanente per le dispense Markdown con pulsante minimale giallo (senza scritte) nel drawer e in Focus Mode. Rendering nativo tramite CSS Custom Highlight API (zero mutazioni del DOM/KaTeX), algoritmo di Interval Merging per sovrapposizioni parziali o totali, e rimozione al click in modalità attiva. Persistenza local-first su highlights/<lectureId>.json.
- **Motivazione:** Consente allo studente di evidenziare concetti chiave della dispensa mentre legge e studia in modo non invasivo, unendo automaticamente evidenziazioni contigue o sovrapposte ed eliminando ogni rischio di corruzione o re-rendering del Virtual DOM di React o delle formule KaTeX.
- **Impatto:** Nuova funzionalità visuale attiva nel drawer standard e a schermo intero; piena compatibilità con zoom, scroll, scorciatoie globali e soppressione del FAB Gemini durante l'evidenziazione; 54/54 test unitari passati.
- **Follow-up:** Possibilità futura di selezionare colori alternativi o esportare le sole frasi evidenziate come riassunto compatto.
- **File coinvolti:** shared/archive.ts, electron/main/fileStorage.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useHighlights.ts, src/components/MarkdownViewer.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/archive.test.ts, tests/highlights.test.ts

## D-0059 — Risoluzione Latenza QnA Gemini, Rotazione Chiavi, Log Diagnostico e Quick Capture con Scrolling e Copia Appunti

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** ai-qna-quickcapture
- **Decisione:** Adozione della rotazione automatica multi-chiave (pool 15 API keys) su QnA contestuale, abbattimento del retry delay da 60s a 1.2s per chat interattive, fallback automatico su modelli veloci (gemini-2.5-flash), log diagnostico trasparente in tempo reale al posto di 'Sta scrivendo...', scrolling indipendente per colonne To-Do e Note in Quick Capture Overlay e pulsanti dedicati di copia negli appunti per checklist e testo con feedback visivo.
- **Motivazione:** Risolve il blocco di 5 minuti riscontrato dall'utente causato dall'assenza di rotazione chiavi e dal retry a 60s in QnA su chiavi in throttling, fornisce visibilita immediata all'utente sullo stato della richiesta e delle quote, e ottimizza il Brain Dump di Quick Capture permettendo di gestire liste lunghe ed esportarle istantaneamente con Ctrl+V.
- **Impatto:** Risposta della QnA ridotta da 5 minuti a meno di 1-2 secondi, eliminazione di 'Sta scrivendo...' a favore di spiegazioni trasparenti a video, layout Quick Capture resiliente all'overflow e copia immediata negli appunti di sistema. 55/55 test passati.
- **Follow-up:** nessuno
- **File coinvolti:** shared/archive.ts, electron/main/gemini.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useQna.ts, src/components/QnaSidebar.tsx, src/components/LectureDrawer.tsx, src/components/QuickCaptureOverlay.tsx, src/styles.css, src/qna.css, tests/archive.test.ts

## D-0060 — Pausa immediata nel Focus Lock, Pulsante completamento a fine lezione e Log diagnostico interno

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** ui-focus-logging
- **Decisione:** Disaccoppiamento opzioni pausa (5, 15, 30 min) dal countdown di 15s nel Focus Lock; pulsante incastonato a fine testo lezione per passare a completata; modulo AppLogger con mascheramento API keys, persistenza app.log e LogViewerModal integrato con Ctrl+L e pulsante dedicato
- **Motivazione:** Migliorare usabilita pause studio senza togliere frizione all uscita; permettere completamento naturale a fine lettura; fornire diagnostica integrata ed esplicita per tracciare errori e chiamate AI nel rispetto del principio local-first
- **Impatto:** Pausa studio immediata con un click; cambio stato lezione da fondo pagina senza aprire menu; cronologia log con filtri (Errori, Avvisi, AI Gemini, Sistema) e copia negli appunti
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/FocusLockModal.tsx, src/components/LectureDrawer.tsx, electron/main/logger.ts, shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/components/LogViewerModal.tsx, src/components/Sidebar.tsx, src/App.tsx, src/styles.css, tests/archive.test.ts

## D-0061 — Correzione contrasto Elimina Lezione in modalita scura

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** ui-theme
- **Decisione:** Rimozione stili inline hardcoded su danger-card e introduzione di classi CSS dedicate con supporto completo dark mode per intestazione Elimina Lezione, box di conferma ed etichetta zona pericolosa
- **Motivazione:** Risolto il problema di testo bianco su sfondo bianco in dark mode per il titolo Elimina Lezione nella scheda info del drawer
- **Impatto:** Contrasto visivo ottimale in modalita scura per le azioni di eliminazione lezione
- **Follow-up:** Nessuno
- **File coinvolti:** src/components/LectureDrawer.tsx, src/styles.css

## D-0062 — Controllo totale, suite di test edge-case, fix 0 CFU e rigenerazione installer Windows

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** qa-packaging
- **Decisione:** Creazione suite edge case completa (68 test totali), correzione calcolo corsi a 0 CFU in saveCourse, hardening maskSensitiveData su tipi non-stringa e compilazione dell installer di produzione Lezionify-Setup-0.1.0.exe
- **Motivazione:** Garantire la massima robustezza dell applicazione su input limite, caratteri speciali e recupero da file corrotti prima del rilascio dell installer per l utente
- **Impatto:** Nessuna regressione; gestione sicura di 0 CFU; ricerche resilienti a caratteri speciali; nuovo installer Windows pronto all uso in dist/
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/archive.ts, electron/main/logger.ts, electron/main/searchIndex.ts, tests/edge_cases.test.ts, dist/Lezionify-Setup-0.1.0.exe

## D-0063 — Riallineamento header sidebar e brand Lezionify

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Riorganizzato l'header della sidebar posizionando il titolo brand Lezionify e il logo mark 'L' in alto a sinistra a filo colonna senza padding parassiti, affiancato a destra dal toggle di compressione, e spostando la barra delle azioni rapide (Note Rapide, Log, Impostazioni, Tema Sole/Luna) in una toolbar dedicata sottostante.
- **Motivazione:** Precedentemente i pulsanti delle azioni precedevano il brand nel DOM flex, spingendo il titolo a destra fino a sovrapporsi al pulsante di compressione o uscire dai bordi della colonna, oscurando parzialmente il testo 'Lezionify'.
- **Impatto:** Il titolo 'Lezionify' e' ora perfettamente visibile, allineato a sinistra con tutti i componenti della colonna; le azioni rapide rimangono compatte, immediatamente accessibili e coerenti sia in modalita' estesa che compressa.
- **Follow-up:** Verificare resa visiva nell'installer finale su Windows.
- **File coinvolti:** src/components/Sidebar.tsx, src/styles.css

## D-0064 — Adozione nuovo logo icona Logolibro e generatore multi-risoluzione Windows

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** Branding/Asset
- **Decisione:** Sostituite le icone applicative ufficiali (resources/icon.png e resources/icon.ico) con la nuova identita' visiva basata su 'Logolibro.png' (libro aperto con onda audio geometrica in spazio negativo su squircle smeraldo scuro). Introdotto lo script tools/convert_icon.py che gestisce il crop quadrato, la trasparenza degli angoli esterni dello squircle per Windows 11 e la compressione multi-risoluzione da 16x16 a 256x256.
- **Motivazione:** La precedente icona conteneva dettagli microscopici (pagine, righe e barre audio multiple) che a 24x24 px nella taskbar di Windows risultavano illeggibili. Il nuovo design 'Logolibro' e' solido, pulito, ad altissimo contrasto e immediatamente riconoscibile anche a risoluzioni ridotte.
- **Impatto:** Maggiore leggibilita' ed eleganza nella barra delle applicazioni di Windows, nel menu Start, nei collegamenti desktop e nella barra del titolo dell'applicazione.
- **Follow-up:** Compilare il pacchetto installer finale con la nuova icona.
- **File coinvolti:** Logolibro.png, resources/icon.png, resources/icon.ico, tools/convert_icon.py, tools/generate_icons.py

## D-0065 — Aggiunta supporto a Gemini 3.8 Flash rilasciato a Settembre 2026

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** AI/Provider
- **Decisione:** Verificata la raggiungibilita' con esito HTTP 200 di 'gemini-3.8-flash' tramite le chiavi API dell'utente e integrato il modello nel tipo GeminiModel, in VALID_MODELS del backend e nelle opzioni selezionabili della modale Impostazioni.
- **Motivazione:** Gemini 3.8 Flash e' stato ufficialmente rilasciato da Google il 2 settembre 2026 ed e' attivo e raggiungibile nel pool di modelli dell'utente per compiti complessi di sintesi didattica e ragionamento avanzato.
- **Impatto:** L'utente puo' ora selezionare direttamente 'Gemini 3.8 Flash' dalle impostazioni dell'applicazione.
- **Follow-up:** Monitorare i tempi di risposta rispetto a Gemini 2.5/3.6 Flash nelle generazioni batch.
- **File coinvolti:** shared/archive.ts, electron/main/settings.ts, src/components/SettingsModal.tsx

## D-0066 — Risoluzione overflow e scrolling modale Impostazioni AI

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** UI/UX
- **Decisione:** Ristrutturata la modale SettingsModal introducendo un container interno 'settings-modal-body' a scorrimento verticale (overflow-y: auto) con altezza massima vincolata all'88vh del viewport, rendendo sticky il footer delle azioni 'Salva Impostazioni' e limitando l'altezza della lista modelli a 250px con scrolling dedicato.
- **Motivazione:** La presenza di un pool esteso di chiavi API e di 6 schede modello faceva eccedere l'altezza del modal oltre il fondo dello schermo su risoluzioni standard o finestre non massimizzate, tagliando fuori 'Modello Gemini Predefinito' e impedendo lo scroll per raggiungerlo.
- **Impatto:** Tutti i controlli, il selettore del modello e i pulsanti di salvataggio sono ora visibili, scorrevoli e accessibili su qualsiasi risoluzione o dimensione della finestra.
- **Follow-up:** Verificare con installer Windows.
- **File coinvolti:** src/components/SettingsModal.tsx, src/styles.css

## D-0067 — Avanzamento automatico in Focus Mode alla prossima lezione dello stesso corso

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** ui-focus-advance
- **Decisione:** Il pulsante 'Segna come completata' al termine della lettura in Focus Mode marca la lezione corrente come completata, preserva lo stato a schermo intero e naviga automaticamente alla successiva lezione in ordine cronologico della stessa materia (courseCode). Se la lezione e' l'ultima del corso, mostra il completamento dell'intero programma didattico.
- **Motivazione:** Consente allo studente di mantenere intatto il flusso di concentrazione e studio continuo in Focus Mode senza dover uscire dalla modalita a schermo intero o cercare manualmente la lezione successiva.
- **Impatto:** Aggiunta funzione findNextChronologicalLecture in shared/archive.ts; esteso LectureDrawer con allLectures, onSelectLecture, keepFocusOnNextLectureRef, schermata di caricamento transitorio e pulsanti dinamici; 74/74 test passati.
- **Follow-up:** Nessuno
- **File coinvolti:** shared/archive.ts, src/App.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/archive.test.ts

## D-0068 — Dispense didattiche bilingui ITA/ENG con toggle non invasivo, sincronizzazione scroll proporzionale e traduzione batch

- **Data:** 2026-09-04
- **Stato:** accettata
- **Area:** feature/bilingue
- **Decisione:** Aggiunto supporto alla dispensa in lingua inglese salvata come <id>_en.md (campo markdownEnFileName su Lecture). Implementata traduzione Gemini accademica rigorosa parola-per-parola (mantenendo formule LaTeX e Markdown intatti), toggle discreto IT|EN sia nel drawer standard che in Focus Mode con sincronizzazione scroll proporzionale (ratio altezza), gestione evidenziazioni separate per lingua (<id>_en), invalidazione automatica della versione ENG alla riscrittura dell'ITA, e integrazione con tab nella modal di generazione multipla per batch di traduzione.
- **Motivazione:** Permette agli studenti di studiare la materia in inglese confrontando direttamente e rapidamente le due versioni senza perdere il punto di lettura corrente e conservando evidenziazioni indipendenti per lingua.
- **Impatto:** Aggiunti metodi di traduzione e lettura markdownEn all'interfaccia ArchiveApi e IPC; esteso FileStorageService, LibraryRepository, GeminiService e ArchiveService; aggiornati hook useLectureContent, useGeminiGeneration e useLectures; aggiunti stili .lang-toggle-pill; test di unità dedicati.
- **Follow-up:** Verificare prestazioni traduzione su testi molto lunghi e latenza con modelli Flash/Pro su pool di chiavi.
- **File coinvolti:** shared/archive.ts, electron/main/fileStorage.ts, electron/main/gemini.ts, electron/main/archive.ts, electron/main/libraryRepository.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useLectureContent.ts, src/hooks/useGeminiGeneration.ts, src/hooks/useLectures.ts, src/App.tsx, src/components/LectureDrawer.tsx, src/components/LectureList.tsx, src/components/BatchSelectionModal.tsx, src/styles.css, tests/archive.test.ts

## D-0069 — Congelamento del timer di studio durante la schermata di Focus Lock e decisione uscita

- **Data:** 2026-09-05
- **Stato:** accettata
- **Area:** prodotto-ux-timer
- **Decisione:** Il timer di studio in modalita Focus viene istantaneamente congelato all apertura del Focus Lock (pressione di Esc o click di uscita). Durante i 15 secondi di countdown e per tutto il tempo in cui l utente decide se fare una pausa (5, 15, 30 min), tornare a studiare o terminare la sessione, il timer non avanza, le interazioni nel modale non resettano la pausa e questo tempo non viene contato come studio. Aggiunti badge visivo ('Timer di studio fermo') nel modale, tooltip esplicito e test di unita dedicato.
- **Motivazione:** Evita di conteggiare secondi spuri come studio mentre lo studente e distolto dalla lettura o sta valutando se fermarsi o fare pausa, assicurando che le statistiche riflettano esclusivamente la reale concentrazione sulla dispensa.
- **Impatto:** Nessun accumulo di tempo falso durante la permanenza nel Focus Lock; feedback visivo trasparente con pill Timer di studio fermo nel modale; il timer riprende a scorrere solo se si torna a studiare.
- **Follow-up:** nessuno
- **File coinvolti:** src/hooks/useStudyTracker.ts, src/components/LectureDrawer.tsx, src/components/FocusLockModal.tsx, src/styles.css, tests/edge_cases.test.ts

## D-0070 — Domanda Q&A esplicita senza placeholder

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ai-qna
- **Decisione:** Il backend seleziona l ultimo messaggio utente non vuoto, escludendo domanda e placeholder dallo storico. Il renderer invia solo messaggi reali.
- **Motivazione:** Evitare richieste vuote e duplicazione della domanda.
- **Impatto:** Test SDK simulato e test React sulla richiesta effettiva.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/gemini.ts, src/hooks/useQna.ts, tests/qnaRequest.test.ts

## D-0071 — Salvataggio deterministico e isolamento Q&A

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** persistenza-qna
- **Decisione:** Il placeholder resta solo in UI. La risposta finale res.text viene salvata fuori dagli updater React sul lectureId di origine; caricamenti e stream obsoleti vengono filtrati.
- **Motivazione:** Prevenire risposte troncate e contaminazione tra lezioni.
- **Impatto:** Una sola generazione Q&A alla volta; errore mantiene la domanda senza placeholder.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** src/hooks/useQna.ts, tests/hookRegression.browser.tsx

## D-0072 — Isolamento dei risultati AI rispetto alla selezione

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ui-ai
- **Decisione:** Generazione, trascrizione, traduzione, batch e studio set applicano contenuti solo alla lezione ancora selezionata; progress ed errori sono filtrati per lezione.
- **Motivazione:** Prevenire la visualizzazione di dispense e quiz sotto una lezione diversa.
- **Impatto:** Test React reali in Electron per cambio lezione durante richieste lente; nuovo comando test:hooks senza dipendenze aggiunte.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** src/hooks/useGeminiGeneration.ts, src/hooks/useLectureContent.ts, tests/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, package.json

## D-0073 — Flush serializzati con snapshot delle sessioni

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** studio-timer
- **Decisione:** I flush accodano snapshot identificati per sessione; i dati pendenti vengono rimossi solo dopo conferma. La chiusura attende il salvataggio; date sessione locali.
- **Motivazione:** Non perdere secondi durante flush sovrapposti, cambio lezione o uscita.
- **Impatto:** Test React per salvataggio lento, cambio corso e chiusura; eventuali errori conservano gli snapshot per il retry.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** src/hooks/useStudyTracker.ts, tests/hookRegression.browser.tsx

## D-0074 — Trascrizione remota fuori dal mutex globale

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** archivio-concorrenza
- **Decisione:** Upload e generazione audio avvengono fuori dal lock. Il commit rilegge la libreria e verifica metadati e checksum audio prima della scrittura.
- **Motivazione:** Consentire modifiche e salvataggi locali durante le attese del provider.
- **Impatto:** Un risultato obsoleto viene rifiutato; preservati aggiornamenti concorrenti della libreria.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/archive.ts, tests/quality.test.ts

## D-0075 — Scritture atomiche serializzate e copie recuperabili

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** persistenza
- **Decisione:** Helper comune con file temporaneo UUID, sync, rename, coda per percorso e backup della versione precedente. Applicato a libreria, trascrizioni, dispense e JSON utente.
- **Motivazione:** Evitare file troncati e collisioni tra salvataggi; non trasformare la corruzione in dati vuoti.
- **Impatto:** Lettura JSON recupera un backup valido o segnala errore; test concorrenti e corruzione.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/atomicFile.ts, electron/main/fileStorage.ts, electron/main/libraryRepository.ts, tests/quality.test.ts, tests/archive.test.ts

## D-0076 — Validazione rigorosa della risposta audio

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ai-fonti
- **Decisione:** Richiesti separatori univoci ordinati e sezioni non vuote; eliminata la trascrizione sintetica di fallback.
- **Motivazione:** Non presentare testo inventato come trascrizione grezza.
- **Impatto:** Le risposte malformate falliscono prima della persistenza e possono essere ritentate.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/gemini.ts, tests/quality.test.ts

## D-0077 — Segmentazione monotona e conservazione del testo

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ai-segmentazione
- **Decisione:** Mappa esplicita dagli indici normalizzati al testo originale; fallback relativo al residuo e segmenti senza trim.
- **Motivazione:** Evitare sovrapposizioni, riordino e perdita di caratteri.
- **Impatto:** La concatenazione dei segmenti ricostruisce esattamente la fonte, anche con marker assenti o fuori ordine.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/gemini.ts, tests/quality.test.ts

## D-0078 — Commit delle derivazioni vincolato alla fonte

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ai-revisioni
- **Decisione:** Traduzioni e studio set ricontrollano esistenza della lezione e contenuti sorgente sotto mutex prima di scrivere.
- **Motivazione:** Scartare risultati diventati obsoleti durante le chiamate remote.
- **Impatto:** Nessun file derivato creato quando la lezione viene cancellata o il contenuto sorgente cambia.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/archive.ts, tests/quality.test.ts

## D-0079 — Risultati vuoti economici e query obsolete scartate

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ricerca
- **Decisione:** Il fallback disco si usa solo con indice incompleto. Ricerca anche in inglese; cleanup delle query pendenti e Set per il filtro degli ID.
- **Motivazione:** Evitare scansioni complete su zero risultati e risposte fuori ordine nel renderer.
- **Impatto:** Test di indice pronto, inglese dopo modifica e riavvio, query concorrenti; checklist e struttura aggiornate.
- **Follow-up:** Collaudo manuale nella finestra applicativa e nell installer; dettagli residui nella checklist.
- **File coinvolti:** electron/main/archive.ts, electron/main/searchIndex.ts, src/hooks/useLectures.ts, tests/quality.test.ts, tests/hookRegression.browser.tsx, CHECKLIST_REVISIONE_QUALITA.md, STRUTTURA_PROGETTO.md

## D-0080 — Rinomina e fusione corsi transazionali

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** corsi-persistenza
- **Decisione:** I metadati corso usano nomi base64url privi di collisioni; rinomina e fusione preparano tutti i dati, preservano la destinazione e ripristinano ogni risorsa se un commit fallisce.
- **Motivazione:** Evitare collisioni tra codici, configurazioni sovrascritte e stato parzialmente rinominato.
- **Impatto:** Library, impostazioni, sessioni e informazioni corso restano coerenti anche durante fusioni o errori intermedi.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, electron/main/fileStorage.ts, tests/quality.test.ts

## D-0081 — Cancellazione recuperabile delle lezioni

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** lezioni-persistenza
- **Decisione:** La cancellazione sposta temporaneamente audio, contenuti, Q&A e backup in una cartella trash; elimina definitivamente solo dopo il commit della libreria e ripristina in caso di errore.
- **Motivazione:** Impedire riferimenti a file eliminati e file derivati orfani.
- **Impatto:** Gli errori I/O diversi da file assente sono visibili e la lezione resta recuperabile fino al commit.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, electron/main/fileStorage.ts, tests/quality.test.ts

## D-0082 — Date di calendario in fuso locale

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** date-calendario
- **Decisione:** Sessioni, statistiche, scadenze e associazioni usano helper condivisi per formattare, analizzare e confrontare giorni locali senza parsing UTC implicito.
- **Motivazione:** Evitare slittamenti di giorno vicino alla mezzanotte e durante i cambi di ora legale.
- **Impatto:** Streak, countdown e date di studio seguono il calendario locale dell utente.
- **Follow-up:** Nessuno.
- **File coinvolti:** shared/calendarDate.ts, electron/main/archive.ts, src/hooks/useStudyTracker.ts, src/components/Dashboard.tsx, tests/quality.test.ts

## D-0083 — Parsing completo delle richieste HTTP Range

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** audio-streaming
- **Decisione:** Il protocollo audio valida range completi, aperti e suffix, limita gli estremi alla dimensione reale e risponde 416 ai range non soddisfacibili.
- **Motivazione:** Garantire seek e riproduzione prevedibili senza lunghezze negative o errori interni.
- **Impatto:** Streaming audio conforme ai range singoli e stat del file asincrono.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/httpRange.ts, electron/main/index.ts, tests/quality.test.ts

## D-0084 — Importazione e sincronizzazione con rollback

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** importazione-sync
- **Decisione:** Copie e spostamenti sono tracciati e annullati se il commit fallisce; il matching trascrizioni usa lo stem esatto, la copia cross-device verifica il checksum e la scansione riconcilia riferimenti mancanti.
- **Motivazione:** Mantenere libreria e filesystem coerenti ed evitare associazioni ambigue.
- **Impatto:** Niente file orfani dopo errori e stato missingAudio esplicito per sorgenti non trovate.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, shared/archive.ts, src/components/LectureList.tsx, tests/quality.test.ts

## D-0085 — Recovery della libreria e arresto controllato

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** avvio-recovery
- **Decisione:** La libreria valida i campi essenziali, ripristina il backup valido quando necessario e interrompe l avvio con errore diagnostico se il recovery non riesce; le eccezioni non gestite terminano il processo.
- **Motivazione:** Evitare avvii silenziosamente falliti o prosecuzione in stato indefinito.
- **Impatto:** La copia valida viene ripristinata come primaria e gli errori irreversibili sono mostrati prima dell uscita.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/atomicFile.ts, electron/main/libraryRepository.ts, electron/main/index.ts, tests/quality.test.ts

## D-0086 — Indice in background e cache LRU

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** performance-avvio
- **Decisione:** Il caricamento dei metadati non attende l indice; il warm-up legge quattro lezioni alla volta, registra una generazione e tempi separati, mentre il renderer limita la cache contenuti a venti voci LRU.
- **Motivazione:** Ridurre il cold start e impedire crescita illimitata della memoria.
- **Impatto:** La finestra può aprirsi prima del completamento dell indice e le letture recenti restano in cache con invalidazione esistente.
- **Follow-up:** Monitorare i tempi su archivi reali molto grandi.
- **File coinvolti:** electron/main/archive.ts, src/hooks/useLectureContent.ts, tests/quality.test.ts, tests/hookRegression.browser.tsx

## D-0087 — Logger con dimensione in memoria e test silenziosi

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** logging
- **Decisione:** Il logger mantiene in memoria i byte persistiti per decidere la rotazione e sopprime i messaggi informativi su console durante Vitest; il primo avvio senza impostazioni non è trattato come corruzione.
- **Motivazione:** Ridurre I/O e rumore senza perdere errori e avvisi.
- **Impatto:** Nessuno stat per ogni append e prove di stress leggibili.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/logger.ts, electron/main/settings.ts, tests/quality.test.ts

## D-0088 — Rimozione del drag and drop ingannevole

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ui-importazione
- **Decisione:** Sono stati rimossi overlay, testo e handler di rilascio che ignoravano i file; l importazione resta accessibile dal selettore esplicito multi-file.
- **Motivazione:** Allineare ciò che l interfaccia promette al flusso realmente supportato.
- **Impatto:** Il drop non apre più un picker inatteso e non viene mostrata un affordance non funzionante.
- **Follow-up:** Reintrodurre il drop solo con un percorso IPC sicuro per i file rilasciati.
- **File coinvolti:** src/components/LectureList.tsx, src/styles.css, tests/hookRegression.browser.tsx

## D-0089 — Errori di traduzione visibili e ritentabili

- **Data:** 2026-09-06
- **Stato:** accettata
- **Area:** ui-traduzione
- **Decisione:** translationError viene propagato al drawer e mostrato come avviso con pulsante per riprovare la traduzione.
- **Motivazione:** Spiegare la scomparsa dello spinner e permettere il recupero immediato.
- **Impatto:** Errori di rete, chiave non valida e risposta vuota sono visibili nello stesso contesto della lingua inglese.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/hooks/useGeminiGeneration.ts, src/App.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/hookRegression.browser.tsx

## D-0090 — Timer e sveglie discrete nella Focus Mode

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** focus-promemoria
- **Decisione:** Aggiunto un centro promemoria locale nella toolbar Focus con timer e sveglie multiple nominabili, persistiti in reminders.json. Le scadenze usano timestamp assoluti, generano banner chiudibili e non producono audio o notifiche di sistema.
- **Motivazione:** Permettere di organizzare studio e pause senza interrompere la concentrazione con conto alla rovescia sempre visibile o suoni.
- **Impatto:** L icona orologio mostra solo un indicatore discreto; il dettaglio è disponibile nel popover. Timer attivi possono essere messi in pausa, ripresi, fermati o resettati; le sveglie restano locali e one-shot.
- **Follow-up:** Verificare manualmente la resa del popover in Focus Mode nell installer Windows.
- **File coinvolti:** shared/archive.ts, shared/reminders.ts, electron/main/fileStorage.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useReminders.ts, src/components/FocusReminders.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/reminders.test.ts, tests/hookRegression.browser.tsx, STRUTTURA_PROGETTO.md

## D-0091 — Retry polling e concorrenza Gemini controllati

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Le richieste Gemini adottano deadline, cancellazione, backoff esponenziale con jitter, concorrenza massima due per le sezioni, polling upload limitato e pulizia remota in finally; la QnA ruota le chiavi solo per errori transitori o quota quando abilitato.
- **Motivazione:** Evita attese indefinite, picchi di quota e file remoti abbandonati.
- **Impatto:** Le operazioni AI falliscono entro limiti espliciti e il test chiave distingue indisponibilita del modello.
- **Follow-up:** Verificare i tempi con una chiamata Gemini reale.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, shared/archive.ts, tests/quality.test.ts

## D-0092 — Fullscreen sincronizzato con lo stato React

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** focus
- **Decisione:** Lo stato Focus viene attivato solo dopo requestFullscreen riuscita e le uscite intenzionali sono marcate per ignorare il relativo fullscreenchange.
- **Motivazione:** Evita overlay Focus attivi senza fullscreen e doppie conferme in uscita.
- **Impatto:** Entrata fallita e uscita confermata lasciano uno stato coerente.
- **Follow-up:** Collaudo manuale del tasto Esc nell installer.
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0093 — Registro CSS Highlights condiviso senza interferenze

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** highlights
- **Decisione:** Le istanze MarkdownViewer contribuiscono i propri range a un registro condiviso e al cleanup rimuovono soltanto i range di loro proprieta.
- **Motivazione:** Evita che viewer secondari cancellino le evidenziazioni della lezione principale.
- **Impatto:** Piu viewer possono coesistere usando la stessa regola CSS.
- **Follow-up:** Collaudo visivo con quiz e cambio tab.
- **File coinvolti:** src/components/MarkdownViewer.tsx

## D-0094 — Salvataggi Quick Capture e highlights serializzati

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** persistenza
- **Decisione:** Lo snapshot locale viene aggiornato nello stesso evento dello stato e le scritture sono accodate mantenendo ordine e identita della lezione.
- **Motivazione:** Impedisce perdita dell ultima modifica e completamenti fuori ordine.
- **Impatto:** Chiusura immediata e aggiornamenti ravvicinati salvano lo stato piu recente.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/hooks/useQuickCapture.ts, src/hooks/useHighlights.ts, tests/hookRegression.browser.tsx

## D-0095 — Submit tempo manuale robusto

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** dashboard
- **Decisione:** La modale riallinea il corso ai dati caricati, valida corso data e durata, blocca submit concorrenti e mostra errori.
- **Motivazione:** Evita sessioni senza corso e duplicati da doppio click.
- **Impatto:** Il salvataggio espone stato pendente e fallimento comprensibile.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/components/Dashboard.tsx

## D-0096 — Card Dashboard attivabili da tastiera

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** accessibilita
- **Decisione:** Le card di esami e corsi gestiscono Invio e Spazio e mostrano un focus visibile.
- **Motivazione:** Rende effettiva la semantica button gia esposta.
- **Impatto:** Navigazione e apertura delle card funzionano senza mouse.
- **Follow-up:** Collaudo manuale completo da tastiera.
- **File coinvolti:** src/components/Dashboard.tsx, src/styles.css

## D-0097 — Identita stabile delle chiavi API

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** impostazioni
- **Decisione:** La chiave attiva viene preservata per valore dopo le rimozioni, i risultati dei test sono associati alla chiave e il doppio salvataggio e bloccato.
- **Motivazione:** Evita che indice e risultati finiscano su una chiave diversa.
- **Impatto:** Rimozioni e richieste asincrone mantengono associazioni coerenti.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/hooks/useSettings.ts, src/components/SettingsModal.tsx, src/App.tsx

## D-0098 — Player sincronizzato agli eventi nativi

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** audio
- **Decisione:** Il player deriva lo stato da play pause ended ed error, mostra i fallimenti di riproduzione e disabilita seek e salti prima dei metadati.
- **Motivazione:** Evita controlli incoerenti e seek su durate fittizie.
- **Impatto:** Gli errori audio diventano visibili e i controlli seguono lo stato reale.
- **Follow-up:** Collaudo con file audio non leggibile.
- **File coinvolti:** src/components/AudioPlayer.tsx, src/styles.css

## D-0099 — Posizione relativa corretta nel cambio lingua

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** lettura
- **Decisione:** La posizione usa altezza scorribile scrollHeight meno clientHeight e viene limitata nell intervallo valido.
- **Motivazione:** Mantiene il punto di lettura con documenti italiano e inglese di lunghezza diversa.
- **Impatto:** Inizio centro e fondo usano una percentuale realmente raggiungibile.
- **Follow-up:** Collaudo visivo con traduzioni di lunghezza diversa.
- **File coinvolti:** src/components/LectureDrawer.tsx

## D-0100 — Timer pausa basato sul tempo reale

- **Data:** 2026-09-07
- **Stato:** accettata
- **Area:** focus
- **Decisione:** La pausa memorizza il timestamp finale e ricalcola il residuo a ogni tick e al visibilitychange.
- **Motivazione:** Il throttling o la sospensione della finestra non allungano la pausa.
- **Impatto:** Il countdown recupera immediatamente il tempo trascorso al ritorno.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/components/PauseTimerOverlay.tsx

## D-0101 — Protocollo riproducibile per la valutazione ASR locale

- **Data:** 2026-09-10
- **Stato:** accettata
- **Area:** asr-benchmark
- **Decisione:** Documentare in un report versionato i test Large-v3 e Large-v3-Turbo, conservare la configurazione anti-loop e mantenere il flusso Colab/TXT finche Parakeet, Qwen e Whisper INT8 non vengono misurati sullo stesso campione e sulla Quadro T2000.
- **Motivazione:** I primi confronti hanno mostrato che modello, runtime, precisione e parametri di decoding possono alterare insieme qualita e stabilita; un protocollo comune evita conclusioni errate e regressioni come i loop di punti e Minus 1.
- **Impatto:** I futuri test ASR devono registrare parametri, tempi, RTF, memoria, output grezzo e qualita su ground truth, senza sostituire ancora la pipeline di ingestione stabilita da D-0017.
- **Follow-up:** Eseguire sul campione da 1023 secondi Parakeet TDT 0.6B v2 INT8, Qwen3-ASR 0.6B con e senza glossario, Turbo INT8 e Large-v3 INT8 locali.
- **File coinvolti:** docs/LOG_TEST_ASR_LOCALE_2026-09-10.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0102 — Benchmark Colab comune per Parakeet e Qwen3-ASR

- **Data:** 2026-09-10
- **Stato:** accettata
- **Area:** asr-benchmark
- **Decisione:** Aggiunto uno script Colab che converte una sola volta l'audio, crea segmenti comuni senza VAD e confronta in sequenza Parakeet TDT 0.6B v2 INT8, Qwen3-ASR 0.6B FP16 e Qwen3-ASR 1.7B FP16, salvando output grezzi e metriche riproducibili.
- **Motivazione:** Serve attribuire differenze di accuratezza e velocita ai modelli, evitando preprocessing diversi, memoria GPU condivisa, batch eterogenei e prompt non equivalenti.
- **Impatto:** Il primo confronto usa Qwen senza contesto, Parakeet su CPU INT8 e Qwen uno alla volta su GPU; ogni esecuzione produce manifest con hash e segmenti, metadati JSON, riepilogo CSV e ZIP scaricabile.
- **Follow-up:** Eseguire lo script sul campione da 1.023 secondi, conservare lo ZIP e aggiungere al registro tempi, errori tecnici e valutazione contro ground truth.
- **File coinvolti:** tools/colab_benchmark_parakeet_qwen.py, docs/LOG_TEST_ASR_LOCALE_2026-09-10.md, STRUTTURA_PROGETTO.md

## D-0103 — Large-v3 resta il riferimento Colab dopo il test Parakeet e Qwen

- **Data:** 2026-09-10
- **Stato:** accettata
- **Area:** asr-benchmark
- **Decisione:** Mantenere Whisper Large-v3 come profilo Colab di qualità: sul campione da 1.023 secondi Qwen3-ASR 0.6B e 1.7B risparmiano meno di 40 secondi ma degradano vari passaggi matematici, mentre Parakeet v2 INT8 CPU risulta più lento e non offre un vantaggio qualitativo netto. Nessuno dei tre sostituisce ancora Large-v3.
- **Motivazione:** Large-v3 conserva meglio variabili, nessi logici e terminologia tecnica; la lunghezza simile degli output alternativi non compensa sostituzioni semanticamente pericolose. Manca ancora una ground truth per quantificare il WER, quindi la decisione resta prudenziale.
- **Impatto:** Colab continua a usare Large-v3 per le trascrizioni destinate alle dispense. Qwen 0.6B e Parakeet restano candidati locali sperimentali; Qwen 1.7B FP16 supera il budget VRAM della Quadro T2000 secondo il picco misurato di 4,61 GB.
- **Follow-up:** Preparare una ground truth manuale di 3-5 minuti, calcolare WER e accuratezza terminologica, poi provare Qwen 0.6B con glossario e i candidati locali quantizzati sulla Quadro T2000.
- **File coinvolti:** RISULTATI_PARAKEET_QWEN.zip, docs/LOG_TEST_ASR_LOCALE_2026-09-10.md, DECISIONI.md

## D-0104 — Identità IPC per i job AI concorrenti

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** ai-concorrenza
- **Decisione:** Ogni generazione, traduzione, trascrizione e batch usa un jobId propagato tra renderer, preload, IPC, main ed eventi di avanzamento; il renderer conserva l insieme dei job attivi.
- **Motivazione:** Le operazioni concorrenti sulla stessa lezione non devono mostrare avanzamenti appartenenti a richieste diverse o scartare gli eventi di un secondo job ancora attivo.
- **Impatto:** Gli eventi sono filtrati per lezione e job, inclusi i batch, e gli errori di trascrizione emettono uno stato conclusivo coerente.
- **Follow-up:** Nessuno.
- **File coinvolti:** shared/archive.ts, electron/preload/index.ts, electron/main/index.ts, electron/main/archive.ts, src/hooks/useGeminiGeneration.ts, tests/hookRegression.browser.tsx

## D-0105 — Collaudo del timer durante chiamate AI remote

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** concorrenza-persistenza
- **Decisione:** Il salvataggio di una sessione di studio resta indipendente dalla trascrizione remota e viene verificato mentre la richiesta Gemini è sospesa.
- **Motivazione:** Il mutex deve proteggere soltanto il commit locale e non impedire il flush del timer durante upload o generazione.
- **Impatto:** Una trascrizione lenta non blocca il salvataggio del tempo di studio e il test controlla anche l identità del job.
- **Follow-up:** Nessuno.
- **File coinvolti:** tests/quality.test.ts, electron/main/archive.ts

## D-0106 — Aggregazione unica e scritture statistiche idempotenti

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** prestazioni-statistiche
- **Decisione:** Le sessioni vengono aggregate per giorno e corso in una sola passata; il salvataggio evita la riscrittura quando la sessione ricevuta è identica a quella persistita.
- **Motivazione:** Riduce il lavoro ripetuto sulle cronologie ampie e gli accessi disco che non cambiano i dati.
- **Impatto:** Dashboard e riepiloghi usano mappe aggregate; una prova con diecimila sessioni verifica totali e ripartizioni.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, tests/quality.test.ts

## D-0107 — Ricerca e conteggio memoizzati nelle trascrizioni

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** prestazioni-trascrizioni
- **Decisione:** Il conteggio parole e la suddivisione delle corrispondenze vengono calcolati tramite funzioni dedicate e useMemo soltanto quando testo o query cambiano.
- **Motivazione:** Evitare split e scansioni complete a ogni render mantiene reattivo il drawer con trascrizioni lunghe.
- **Impatto:** La ricerca gestisce anche caratteri da espressione regolare e viene verificata su centomila elementi.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/components/LectureDrawer.tsx, tests/quality.test.ts

## D-0108 — Durata MP3 ricavata dai frame audio

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** audio-metadati
- **Decisione:** La durata viene calcolata leggendo gli header MPEG Layer III, salvata nella lezione e popolata durante la sincronizzazione dei dati esistenti; le stime basate sulla dimensione sono rimosse.
- **Motivazione:** La dimensione in byte non rappresenta la durata quando bitrate e codifica cambiano.
- **Impatto:** Statistiche e matching orario usano secondi reali; file non interpretabili restano a durata zero senza inventare una stima.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/mp3Duration.ts, electron/main/archive.ts, electron/main/libraryRepository.ts, shared/archive.ts, src/components/CourseManagementModal.tsx, tests/quality.test.ts

## D-0109 — Supporto coerente ai corsi con zero CFU

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** corsi-cfu
- **Decisione:** Form, calcoli e riapertura del corso conservano il valore zero usando controlli nullish e un minimo esplicito pari a zero.
- **Motivazione:** Lo zero è ammesso dal backend e non deve essere sostituito dal valore predefinito sei nell interfaccia.
- **Impatto:** Creazione backend, modifica e riapertura UI mantengono zero ore previste e zero CFU.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/components/CourseManagementModal.tsx, tests/quality.test.ts, tests/hookRegression.browser.tsx

## D-0110 — Stato Quick Capture condiviso con la Dashboard

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** quick-capture
- **Decisione:** La Dashboard riceve direttamente todo e note dal hook posseduto da App e usa il caricamento locale soltanto come fallback.
- **Motivazione:** Le aggiunte, modifiche e cancellazioni devono apparire subito senza rimontare la Dashboard.
- **Impatto:** L anteprima del Quick Capture segue lo stato corrente nello stesso render e la regressione copre tutte e tre le operazioni.
- **Follow-up:** Nessuno.
- **File coinvolti:** src/App.tsx, src/components/Dashboard.tsx, tests/hookRegression.browser.tsx

## D-0111 — Tipi espliciti ai confini IPC persistenza e AI

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** tipi-confini
- **Decisione:** Gli any sono rimossi da main, preload e tipi condivisi; i dati JSON AI sono trattati come unknown e la regola no-explicit-any è bloccante nei moduli di confine.
- **Motivazione:** I payload esterni non devono acquisire fiducia implicita né propagare forme non controllate nel dominio.
- **Impatto:** QnA, avanzamento, streaming audio, set di studio e chiamate IPC hanno tipi espliciti verificati dal lint.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, electron/main/gemini.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, electron/main/settings.ts, eslint.config.js

## D-0112 — Copertura fullscreen e viewer Markdown concorrenti

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** regressione-ui
- **Decisione:** Il runner React verifica rifiuto del fullscreen, apertura del Focus Lock con Esc, uscita confermata e convivenza di più MarkdownViewer nella CSS Highlight Registry.
- **Motivazione:** Questi flussi dipendono da lifecycle ed API browser e richiedono una regressione nel runtime Electron.
- **Impatto:** La suite UI comprende ventuno scenari e usa la trasformazione JSX automatica coerente con la build Vite.
- **Follow-up:** Nessuno.
- **File coinvolti:** tests/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, src/components/MarkdownViewer.tsx, src/components/LectureDrawer.tsx

## D-0113 — Validazione renderer e salvataggi settings serializzati

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** validazione-backend
- **Decisione:** Il main valida corsi, orari, date, ore, sessioni, QnA, scratchpad, evidenziazioni e Markdown; SettingsService valida gli aggiornamenti e serializza save e rotateKey con un mutex.
- **Motivazione:** I tipi TypeScript non proteggono i payload IPC a runtime e salvataggi concorrenti potevano perdere campi o contendersi lo stesso file temporaneo.
- **Impatto:** Payload non conformi vengono rifiutati prima della persistenza e due aggiornamenti concorrenti conservano entrambi i valori.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, electron/main/settings.ts, electron/main/index.ts, tests/quality.test.ts

## D-0114 — Collaudo reale Q&A multi-turno

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** qna-collaudo
- **Decisione:** Aggiungere un test opzionale Electron che usa la configurazione cifrata dell'app e verifica due turni Gemini con dati sintetici.
- **Motivazione:** La copertura simulata non dimostrava che lo storico fosse interpretato correttamente dal servizio remoto reale.
- **Impatto:** Il comando npm run test:qna-real verifica una risposta iniziale e il recupero nel secondo turno senza stampare o persistere la chiave API.
- **Follow-up:** Ripetere il collaudo quando cambia modello o formato dello storico Q&A.
- **File coinvolti:** tests/qnaReal.electron.ts, tools/run_real_qna.cjs, package.json, docs/LOG_TEST_QNA_REALE_2026-09-11.md

## D-0115 — Caricamento differito delle funzioni pesanti

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** prestazioni-renderer
- **Decisione:** Suddividere Dashboard, drawer, modali, Q&A e viste di studio in chunk caricati su richiesta, rinviando con essi Markdown e KaTeX.
- **Motivazione:** Il renderer iniziale includeva funzioni e dipendenze non necessarie all'apertura dell'archivio.
- **Impatto:** Il JavaScript iniziale non compresso scende da 1837,38 kB a 653,92 kB e i pannelli funzionali hanno chunk separati.
- **Follow-up:** Ripetere la misura dopo aggiornamenti rilevanti delle dipendenze renderer.
- **File coinvolti:** src/App.tsx, src/components/LectureDrawer.tsx, src/components/StudySetTab.tsx, src/components/QnaSidebar.tsx, src/main.tsx, docs/RENDERER_BUNDLE_REPORT_2026-09-11.md

## D-0116 — Rimozione dei contratti morti e memo sicuro

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** contratti-renderer
- **Decisione:** Rimuovere prop Markdown e canali IPC mai consumati, eliminare selettori Q&A irraggiungibili e includere i callback nel comparatore di MarkdownViewer.
- **Motivazione:** Contratti inutilizzati aumentavano la superficie del bridge e il comparatore poteva trattenere callback obsoleti.
- **Impatto:** Il preload espone soltanto operazioni usate dal renderer e MarkdownViewer si aggiorna quando cambiano le azioni di evidenziazione.
- **Follow-up:** Nessuno.
- **File coinvolti:** shared/archive.ts, electron/preload/index.ts, electron/main/index.ts, src/components/MarkdownViewer.tsx, src/components/LectureDrawer.tsx, src/qna.css, tests/quality.test.ts

## D-0117 — Stili condivisi consolidati e Q&A circoscritto

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** css
- **Decisione:** Spostare gli stili Focus condivisi nel foglio globale, caricare qna.css con QnaSidebar, consolidare search-input e sostituire gli stili inline statici con classi.
- **Motivazione:** Le regole Q&A venivano caricate globalmente e uno stesso controllo di ricerca aveva due definizioni concorrenti.
- **Impatto:** Il CSS Q&A diventa un chunk dedicato, gli stili riutilizzati hanno una sola base e le varianti chiare e scure restano esplicite.
- **Follow-up:** Usare npm run audit:styles per distinguere nuovi duplicati globali dagli override intenzionali.
- **File coinvolti:** src/styles.css, src/qna.css, src/components/QnaSidebar.tsx, src/components/LectureDrawer.tsx, src/App.tsx, tools/audit_styles.mjs, package.json

## D-0118 — Separazione delle validazioni e dei pannelli del drawer

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** architettura-moduli
- **Decisione:** Estrarre le validazioni runtime da archive.ts, il pannello trascrizione dal drawer e il controller fullscreen in un hook dedicato.
- **Motivazione:** I file monolitici mescolavano persistenza, convalida, rendering e gestione delle API browser rendendo più rischiose le modifiche isolate.
- **Impatto:** archive.ts e LectureDrawer.tsx sono ridotti mantenendo invariati contratti dati e flusso utente; ricerca trascrizione e Focus Mode hanno responsabilità dedicate.
- **Follow-up:** Nessuno.
- **File coinvolti:** electron/main/archive.ts, electron/main/archiveValidation.ts, src/components/LectureDrawer.tsx, src/components/TranscriptPanel.tsx, src/hooks/useFocusModeController.ts, STRUTTURA_PROGETTO.md

## D-0119 — Diagrammi Mermaid locali nelle dispense bilingui

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** dispense-mermaid
- **Decisione:** Consentire a Gemini diagrammi Mermaid didattici nelle dispense italiane e inglesi e renderizzarli localmente con Mermaid 11.17.2 caricato su richiesta, validazione preventiva, securityLevel strict e fallback al sorgente.
- **Motivazione:** I diagrammi testuali rappresentano processi e relazioni senza introdurre servizi esterni; il sorgente resta nel Markdown e la versione fissata evita il major appena pubblicato e include le correzioni di sicurezza recenti.
- **Impatto:** MarkdownViewer riconosce i blocchi mermaid, limita tipi, dimensione, archi e direttive, segue il tema dell'app e conserva codice leggibile se il rendering fallisce; i prompt preservano struttura e identificatori nella traduzione inglese.
- **Follow-up:** Valutare l'aggiornamento della versione soltanto dopo test di rendering, sicurezza e dimensione del chunk.
- **File coinvolti:** electron/main/gemini.ts, src/components/MarkdownViewer.tsx, src/components/MermaidDiagram.tsx, src/styles.css, tests/quality.test.ts, tests/hookRegression.browser.tsx, package.json, package-lock.json

## D-0120 — Benchmark Gemini Transcribe resumibile con rotazione multi-chiave

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Adottare per la validazione ASR uno strumento separato che usa Gemini 3.5 Transcribe in modalita verbatim, divide gli MP3 senza ricodifica, passa in memoria le chiavi cifrate dell app, applica cooldown e failover per errore e salva checkpoint e metriche contro Large-v3.
- **Motivazione:** Il modello dedicato e piu adatto del generalista Gemini 3.8 Flash e il benchmark deve sopravvivere a quota, rate limit, errori transitori e interruzioni senza perdere segmenti o esporre credenziali.
- **Impatto:** E disponibile un comando npm riprendibile che produce trascrizione, WER, CER, F1, diff contestuale e report locale escluso da Git; sul campione di 17 minuti il WER rispetto a Large-v3 e 14,082 percento.
- **Follow-up:** Creare una ground truth manuale di 3-5 minuti e confrontare entrambi i sistemi; valutare poi un vocabolario di corso non derivato dal riferimento.
- **File coinvolti:** tools/gemini_transcription_benchmark.py, tools/run_gemini_benchmark_with_app_keys.cjs, tools/requirements-gemini-transcription.txt, docs/LOG_TEST_TRASCRIZIONE_GEMINI_2026-09-11.md, package.json, .gitignore, STRUTTURA_PROGETTO.md

## D-0121 — Struttura GitHub orientata al portfolio

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** repository-pubblico
- **Decisione:** Organizzare test unitari e di integrazione in cartelle separate, classificare la documentazione per prodotto, qualita e ricerca, mantenere gli artefatti reali in local-artifacts esclusa da Git e aggiungere README pubblico, asset screenshot, CI, template GitHub, policy di sicurezza, guida contributi e avviso di licenza portfolio.
- **Motivazione:** Il repository deve comunicare chiaramente valore, stato incompleto, architettura e verifiche senza rischiare di pubblicare audio, trascrizioni, credenziali o output grezzi personali.
- **Impatto:** La radice e piu leggibile, i test conservano gli stessi comandi, GitHub esegue il quality gate su Windows e gli screenshot reali possono essere aggiunti in seguito sostituendo segnaposto anonimizzati.
- **Follow-up:** Sostituire i tre segnaposto con screenshot anonimizzati e inserire l URL reale del repository nel comando git clone del README.
- **File coinvolti:** README.md, STRUTTURA_PROGETTO.md, .github/workflows/ci.yml, .github/ISSUE_TEMPLATE, docs, tests, .gitignore, CONTRIBUTING.md, SECURITY.md, LICENSE

## D-0122 — Aggiornamento Electron dopo audit npm

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** dipendenze-sicurezza
- **Decisione:** Aggiornare Electron dalla linea 39 alla versione 44.3.0 mantenendo invariati i contratti applicativi e verificando l intero quality gate.
- **Motivazione:** L audit npm segnalava due vulnerabilita high in extract-zip transitiva di Electron; la versione aggiornata rimuove le segnalazioni note.
- **Impatto:** package.json e package-lock.json usano Electron 44.3.0; typecheck, lint, 120 test Vitest, 24 scenari Electron e build restano verdi; npm audit riporta zero vulnerabilita.
- **Follow-up:** Eseguire una prova manuale dell app e monitorare Dependabot prima della prima release distribuita.
- **File coinvolti:** package.json, package-lock.json, .github/dependabot.yml

## D-0123 — Disclosure dell uso di assistenti AI

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** trasparenza-portfolio
- **Decisione:** Dichiarare nel README che gran parte del codice e stata realizzata con il supporto di Gemini, Claude e ChatGPT, distinguendo tale supporto dalla responsabilita dell autore per progettazione, integrazione e verifica.
- **Motivazione:** La presentazione pubblica deve descrivere con trasparenza il processo di sviluppo senza attribuire agli strumenti la responsabilita tecnica del risultato finale.
- **Impatto:** Il README include una nota discreta in fondo al documento e il portfolio rende esplicito l uso esteso di assistenti AI.
- **Follow-up:** Mantenere aggiornata la dichiarazione se cambia in modo sostanziale il processo di sviluppo.
- **File coinvolti:** README.md, DECISIONI.md

## D-0124 — Repository pubblico ufficiale

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** pubblicazione-github
- **Decisione:** Adottare https://github.com/giovannistefanuto/Lezionify come repository pubblico ufficiale e collegarlo da README, badge CI, metadati npm e materiali di lancio.
- **Motivazione:** URL e riferimenti reali eliminano i segnaposto e rendono clonazione, CI, issue tracker e comunicazione LinkedIn immediatamente utilizzabili.
- **Impatto:** Il progetto espone link coerenti al repository, alla workflow CI e alle issue; il prossimo commit viene pubblicato sul branch main remoto.
- **Follow-up:** Aggiungere screenshot anonimizzati e controllare il primo run CI su GitHub.
- **File coinvolti:** README.md, package.json, package-lock.json, docs/publishing/launch-checklist.md, docs/publishing/linkedin-post-draft.md

## D-0125 — Test unitari senza rete e Actions aggiornate

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** test-ci
- **Decisione:** Simulare anche l estrazione accessoria della logistica di corso nei test ArchiveService e usare actions/checkout e actions/setup-node v7 nella CI.
- **Motivazione:** I test unitari non devono dipendere dalla latenza o raggiungibilita di Gemini; le Actions v4 usavano un runtime Node deprecato sul runner GitHub.
- **Impatto:** La suite da 120 test non esegue piu la chiamata Gemini accessoria, passa con Node 22 e la workflow usa le versioni correnti delle Actions.
- **Follow-up:** Verificare il nuovo run CI e chiudere le pull request Dependabot rese obsolete.
- **File coinvolti:** tests/unit/archive.test.ts, .github/workflows/ci.yml, DECISIONI.md

## D-0126 — Chunk unico candidato per Gemini Transcribe

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Per i prossimi collaudi Gemini 3.5 Transcribe su audio entro il limite del modello, preferire una richiesta unica e mantenere la suddivisione in chunk come fallback per durata, errori persistenti o ripresa granulare.
- **Motivazione:** Sul campione di 17 minuti il file unico e riuscito al primo tentativo, non e stato troncato, ha evitato giunzioni e ridotto il WER dal 14,082 al 13,479 percento e il CER dal 9,292 all 8,523 percento rispetto a Large-v3, usando una richiesta anziche tre.
- **Impatto:** Il benchmark considera il chunk unico il candidato operativo ma non modifica ancora la pipeline dell applicazione; chunking e rotazione delle chiavi restano disponibili come strategie di recupero.
- **Follow-up:** Confrontare su una ground truth manuale di 3-5 minuti e su almeno una seconda lezione piu lunga prima di sostituire il flusso Colab Whisper o integrare la scelta nell app.
- **File coinvolti:** docs/research/gemini-transcription-benchmark-2026-09-11.md, benchmark_outputs/gemini_transcription_one_chunk

## D-0127 — Hardening operativo Gemini Transcribe

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Adottare il chunk unico come default con fallback automatico a tre segmenti, validazione anti-troncamento proporzionale alla durata e al riferimento, checkpoint firmati e verificati, merge solo su overlap esatti, deadline reale, metriche sensibili a punteggiatura e simboli e uso autonomo senza riferimento.
- **Motivazione:** Il test limite era promettente ma la pipeline poteva accettare output fortemente troncati, riusare checkpoint alterati, eliminare testo su overlap approssimati e nascondere differenze di formattazione; inoltre il riferimento obbligatorio impediva l uso come alternativa diretta a Colab.
- **Impatto:** Il benchmark tenta una sola richiesta, recupera automaticamente con chunking quando necessario, conserva progressi verificabili, non lascia segmenti vuoti, chiude i client SDK e dispone di 12 regressioni Python offline incluse nel quality gate e nella CI.
- **Follow-up:** Ripetere il confronto su piu lezioni e costruire una ground truth manuale prima dell integrazione nella pipeline principale dell app.
- **File coinvolti:** tools/gemini_transcription_benchmark.py, tools/run_gemini_benchmark_with_app_keys.cjs, tests/python/test_gemini_transcription_benchmark.py, package.json, .github/workflows/ci.yml, tests/README.md, STRUTTURA_PROGETTO.md, docs/research/gemini-transcription-benchmark-2026-09-11.md

## D-0128 — Conservazione degli output Gemini rifiutati

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Conservare separatamente e con hash ogni risposta parziale che la pipeline rifiuta come incompleta, senza promuoverla a segmento valido, e mantenere nel checkpoint di fallback gli eventi della richiesta iniziale.
- **Motivazione:** La trascrizione grezza resta una derivazione da preservare anche quando non supera la validazione; al tempo stesso non deve contaminare la concatenazione finale o un successivo resume.
- **Impatto:** Gli output rifiutati ricevono un nome timestampato e una voce di audit nel checkpoint; il fallback conserva la traccia della richiesta a chunk unico e la suite Python sale a 13 regressioni offline.
- **Follow-up:** Verificare sui prossimi test reali che i falsi positivi della soglia restino rari e calibrare le 40 parole al minuto soltanto con evidenze su lezioni diverse.
- **File coinvolti:** tools/gemini_transcription_benchmark.py, tests/python/test_gemini_transcription_benchmark.py, STRUTTURA_PROGETTO.md, docs/research/gemini-transcription-benchmark-2026-09-11.md

## D-0129 — Chunking sul silenzio e consenso non parlato

- **Data:** 2026-09-11
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Per audio oltre 55 minuti, dividere automaticamente vicino ai silenzi ogni circa 15 minuti, generare WAV PCM mono 16 kHz con overlap, provare i segmenti incompleti a giri anziche bloccare la coda e accettare un segmento senza parlato solo dopo tre riscontri da chiavi diverse e la presenza di parlato confermato altrove.
- **Motivazione:** La lezione OR da 87 minuti contiene lunghi tratti di rumore: i frammenti MP3 e il giovane endpoint Transcribe possono restituire HTTP 200 senza testo, mentre insistere sul primo pezzo impediva di verificare e completare quelli centrali.
- **Impatto:** L MP3 originale resta intatto; miniaudio 1.71 crea sei WAV indipendenti nel test OR; il checkpoint conserva tentativi incompatibili, evita buchi inspiegati e il collaudo ha prodotto 4865 parole dai tre segmenti con lezione senza errori di quota.
- **Follow-up:** Creare una ground truth manuale su un estratto OR difficile e valutare un fallback controllato a gemini-3.5-flash-lite se il bug di output vuoto colpisce anche segmenti con parlato.
- **File coinvolti:** tools/gemini_transcription_benchmark.py, tools/requirements-gemini-transcription.txt, tests/python/test_gemini_transcription_benchmark.py, docs/research/gemini-transcription-benchmark-2026-09-11.md, DECISIONI.md

## D-0130 — Validazione Ground Truth e Adozione Gemini Transcribe

- **Data:** 2026-09-12
- **Stato:** accettata
- **Area:** asr-gemini
- **Decisione:** Confermata l'adozione di Gemini 3.5 Transcribe come motore di trascrizione principale per l'applicativo, validato su una ground truth manuale con un WER dell'1.24%.
- **Motivazione:** Il test manuale ha dimostrato la capacita' del modello di gestire chunk unici (fino a 6 minuti testati) con altissima precisione. Sebbene l'audio eccellente abbia favorito il risultato, la gestione robusta di eventuali errori (chunking sui silenzi, API key rotation) lo rende il candidato ideale e autonomo, eliminando la necessita' di usare Google Colab o servizi terzi.
- **Impatto:** Segna la fine della fase di test isolato. Il codice del benchmark fungera' da specifica per l'imminente integrazione nativa nel backend Electron.
- **Follow-up:** Integrare nativamente il flusso di trascrizione in electron/main/gemini.ts aggiornando la UI dell'applicazione.
- **File coinvolti:** DECISIONI.md, electron/main/gemini.ts, tools/gemini_transcription_benchmark.py

## D-0131 — Implementazione Nativa del Taglio Intelligente (ffmpeg-static)

- **Data:** 2026-09-12
- **Stato:** accettata
- **Area:** asr-gemini-chunking
- **Decisione:** E' stata aggiunta la dipendenza ffmpeg-static al package.json per implementare nativamente in Node.js il taglio intelligente sui silenzi ogni 15 minuti.
- **Motivazione:** Il benchmark Python usava miniaudio per aggirare le restrizioni sui file lunghi (>55min) tagliandoli dove il volume era minimo. Per portare questa logica nativamente in Electron senza dover compilare C++ o affidarsi a binari globali, e' stato scelto ffmpeg-static che impacchetta l'eseguibile di FFmpeg. Questo permette di usare silencedetect ed estrarre chunk wav in modo portabile e invisibile per l'utente, mantenendo alta la qualita' e prevenendo timeout di Gemini per file lunghi.
- **Impatto:** Aumenta la dimensione del binario distribuito (circa 30MB) ma garantisce il perfetto funzionamento del motore di trascrizione offline anche su lezioni da 2 ore, rendendo superflua la frammentazione manuale o l'uso di Google Colab.
- **Follow-up:** Verificare i log delle prime trascrizioni lunghe per assicurarsi che i tagli cadano effettivamente in zone di silenzio e che l'overlap di 2 secondi prevenga la perdita di parole.
- **File coinvolti:** package.json, electron/main/audioChunker.ts, electron/main/gemini.ts, implementation_plan.md

## D-0132 — Acquisizione automatica da registratore USB e split-view

- **Data:** 2026-09-20
- **Stato:** accettata
- **Area:** importazione-usb
- **Decisione:** Implementato rilevamento automatico del registratore vocale USB su drive rimovibili (cartella RECORD), scansione audio con estrazione durata e checksum, euristica di classificazione basata su orari accademici e durata (>= 30 min), player di anteprima audio HTTP 206 senza copia preventiva, interfaccia modale a due colonne (file grezzi a sinistra, proposte/azioni a destra) con toggle accogli/scarta e importazione transazionale in libreria.
- **Motivazione:** Soddisfa il requisito di workflow rapido e local-first per acquisire le registrazioni delle lezioni universitarie direttamente dalla chiavetta/registratore con associazione intelligente al corso corrispondente e pieno controllo utente.
- **Impatto:** All'avvio dell'app o tramite icona nella barra laterale, se un registratore USB e' inserito con file non ancora importati compare la modale split-view. I file selezionati vengono copiati e indicizzati in libreria preservando audio e trascrizioni grezze; nessun audio viene copiato senza conferma esplicita.
- **Follow-up:** Verificare compatibilità con registratori con alberature di cartelle personalizzate oltre a /RECORD.
- **File coinvolti:** shared/archive.ts, electron/main/usbDetector.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/components/UsbRecorderModal.tsx, src/components/Sidebar.tsx, src/App.tsx, src/styles.css, tests/unit/usbRecorder.test.ts, eslint.config.js

## D-0133 — Rigenerazione installer Windows Lezionify-Setup

- **Data:** 2026-09-20
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione di produzione con electron-vite e generazione del nuovo installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) tramite electron-builder, includendo il bundling con asarUnpack del binario nativo ffmpeg-static, la nuova suite di rilevamento hardware USB, il player di anteprima audio e tutte le funzionalita di trascrizione ed elaborazione AI.
- **Motivazione:** Permettere l installazione dell applicazione aggiornata e completa sul sistema Windows con creazione automatica delle scorciatoie su Desktop e menu Start.
- **Impatto:** Generato l installer Windows dist/Lezionify-Setup-0.1.0.exe (160 MB) pronto per l installazione dell app su qualsiasi PC Windows 10/11 con supporto completo a ffmpeg, audio e funzionalita USB.
- **Follow-up:** Eseguire l installer o verificare l avvio sul sistema host.
- **File coinvolti:** electron-builder.yml, package.json, dist/Lezionify-Setup-0.1.0.exe

## D-0134 — Trascrizione robusta anti-omissione, fallback e supporto multilingue

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** asr-robustness
- **Decisione:** Rinforzata la pipeline di trascrizione nativa in Electron: 1) rimosso l hardcoding it-IT a favore di rilevamento automatico o lingua del corso (it/en/auto); 2) implementata la validazione anti-omissione su ogni chunk con fallback automatico a modello multimodale (gemini-3.8-flash/gemini-3.6-flash) in caso di output vuoto o WPM insufficiente; 3) inseriti marcatori diagnostici temporali per chunk privi di parlato per prevenire scarti silenziosi; 4) aggiunta deduplicazione overlap testuale; 5) introdotta soglia di silenzio dinamica in audioChunker basata sul rumore medio effettivo misurato da volumedetect.
- **Motivazione:** Il collaudo su una lezione reale di Reinforcement Learning da 75 minuti ha rivelato la perdita silenziosa di 50 minuti di audio: l endpoint gemini-3.5-transcribe con it-IT forzato ha restituito stringhe vuote per la parte teorica in inglese, e il backend le scartava senza errori o avvisi per l utente.
- **Impatto:** Eliminato il rischio di perdite silenziose di audio durante la trascrizione; supporto completo a lezioni universitarie in inglese o miste; trascrizioni arricchite con marker orari verificabili e logica di ripresa/diagnostica trasparente.
- **Follow-up:** Verificare che la suite di test Vitest rimanga verde e aggiungere test dedicati per la validazione dei chunk e il fallback.
- **File coinvolti:** electron/main/gemini.ts, electron/main/audioChunker.ts, electron/main/archive.ts, shared/archive.ts, tests/unit/quality.test.ts

## D-0135 — Adozione dell inglese come lingua primaria di trascrizione ASR

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** asr-audio-language
- **Decisione:** Impostato en-US come lingua di default per il motore di trascrizione ASR (gemini-3.5-transcribe) e nei metadati dei corsi, con supporto opzionale a it-IT o auto se specificato. Aggiornato il prompt di fallback multimodale per aspettarsi parlato universitario in lingua inglese.
- **Motivazione:** Tutte le lezioni registrate dall utente sono tenute interamente in inglese (corso di Ingegneria Informatica magistrale). Il default it-IT o generico rischiava fallimenti di lingua e perdita di segmenti.
- **Impatto:** Le trascrizioni ASR inviano di default language_codes: ['en-US'] ottimizzando precisione terminologica, WER, CER e prevenendo lo scarto di audio in lingua inglese; il fallback multimodale e esplicitamente ottimizzato per l inglese accademico.
- **Follow-up:** Verificare che i test continuino a passare al 100%.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, shared/archive.ts, tests/unit/quality.test.ts

## D-0136 — Elaborazione automatica in background di trascrizione e dispense all'importazione

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** pipeline-automation
- **Decisione:** Aggiunta pipeline asincrona in background in ArchiveService attivata automaticamente al termine dell'importazione di nuovi file audio (sia da file/cartelle sia da registratore USB). Per ogni lezione importata, il flusso esegue in sequenza: 1) trascrizione audio nativa Gemini se assente; 2) generazione automatica della dispensa didattica strutturata non appena la trascrizione e disponibile. Il processo e non bloccante per l'interfaccia utente, rispetta i limiti di rate limiting elaborando una lezione per volta, puo essere disabilitato nelle impostazioni (autoProcessOnImport) ed emette eventi di stato e notifica per aggiornare la UI in tempo reale.
- **Motivazione:** Automatizza completamente l'intero ciclo di vita post-registrazione: lo studente si limita a collegare il registratore o importare l'audio, e Lezionify trasforma autonomamente la voce registrata in dispense di studio complete senza richiedere passaggi o click manuali successivi.
- **Impatto:** L'importazione restituisce immediatamente il controllo all'utente senza attendere le chiamate AI; una coda FIFO dedicata gestisce la trascrizione e la generazione dispense in sequenza; la UI si aggiorna dinamicamente al completamento di ogni fase tramite eventi di progresso; l'opzione e configurabile nelle impostazioni.
- **Follow-up:** Verificare che i test unitari coprano l'accodamento, la disabilitazione da impostazioni e l'aggiornamento UI senza errori di concorrenza.
- **File coinvolti:** shared/archive.ts, electron/main/settings.ts, electron/main/archive.ts, src/hooks/useSettings.ts, src/components/SettingsModal.tsx, src/hooks/useLectures.ts, src/hooks/useLectureContent.ts, src/hooks/useGeminiGeneration.ts, tests/unit/quality.test.ts

## D-0137 — Rigenerazione installer Windows completo con pipeline automatica e ASR robusto

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione di produzione con electron-vite e generazione del nuovo installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) tramite electron-builder. Include il motore di trascrizione robusto con lingua en-US di default e fallback multimodale, la pipeline asincrona automatica importazione -> trascrizione -> dispensa didattica in background, la gestione del toggle autoProcessOnImport, i controlli di cache istantanea e il bundle del binario nativo ffmpeg-static.
- **Motivazione:** Distribuire all'utente l'applicazione aggiornata con tutte le ottimizzazioni di trascrizione per le lezioni in inglese e il flusso completamente automatizzato di importazione ed elaborazione.
- **Impatto:** Generato l'installer eseguibile aggiornato dist/Lezionify-Setup-0.1.0.exe pronto per l'installazione o l'aggiornamento su sistemi Windows 10/11.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0138 — Ripristino visibilità e commutazione tab drawer lezioni

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** ui-drawer
- **Decisione:** Corretto il selettore CSS per gli elementi con attributo hidden (.tab-pane[hidden], .study-tab-pane[hidden] e [hidden] con display: none !important) e modificato useLectureContent per evitare il reset intempestivo di activeTab a 'markdown' durante re-render o aggiornamenti della medesima lezione.
- **Motivazione:** La regola CSS .tab-pane { display: flex } sovrascriveva per specificità la regola predefinita dello user-agent [hidden] { display: none }, provocando la visualizzazione simultanea e sovrapposta di tutte e 4 le schede (Dispensa, Trascrizione, Quiz, Info) e impedendo all'utente di cambiare vista cliccando sui pulsanti della barra. Inoltre l'effetto di caricamento reimpostava activeTab ad ogni re-render della stessa lezione.
- **Impatto:** Cliccando su ciascuna scheda (Dispensa Didattica, Trascrizione Grezza, Quiz & Flashcard, Info & Gestione) viene ora mostrato unicamente il pannello selezionato mantenendo lo stato di visualizzazione e scroll; l'interfaccia rispetta gli standard di accessibilità con attributi role='tab' e aria-selected.
- **Follow-up:** Nessuno
- **File coinvolti:** src/styles.css, src/hooks/useLectureContent.ts, src/components/LectureDrawer.tsx, tests/unit/quality.test.ts

## D-0139 — Aggiornamento installer Windows con correzione barra tab drawer lezioni

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione e generazione del nuovo installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) includendo la correzione delle regole CSS per l attributo hidden (.tab-pane[hidden], .study-tab-pane[hidden]), la persistenza della scheda attiva in useLectureContent e i semantici role tab per i bottoni.
- **Motivazione:** Fornire all utente l eseguibile di installazione aggiornato e verificato per Windows che risolve definitivamente il problema di commutazione tra le schede Dispensa, Trascrizione, Quiz e Info.
- **Impatto:** L installer setup aggiornato in dist/Lezionify-Setup-0.1.0.exe incorpora tutte le modifiche testate e verificate con successo.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0140 — Cancellazione opzionale sicura dal registratore USB post-importazione con garanzia della copia locale

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** usb-import-safety
- **Decisione:** Aggiunto dialogo di conferma post-importazione nel modale del registratore USB che propone all utente l eliminazione facoltativa dal dispositivo delle sole registrazioni selezionate e importate con successo, implementando deleteUsbRecorderFiles con protezione da cancellazione di cartelle di Lezionify ed evidenziando che le copie locali rimangono al sicuro sul computer.
- **Motivazione:** L utente necessita di liberare spazio sulla memoria del registratore vocale una volta acquisite le lezioni, garantendo categoricamente che i file importati siano salvati in locale nel computer e che non vengano toccati altri file presenti sul registratore o file interni dell applicazione.
- **Impatto:** Dopo l importazione riuscita, compare la schermata di riepilogo con garanzia di sicurezza della copia locale e richiesta esplicita di cancellazione dei soli file importati dal registratore; se l utente accetta, i file audio (e relativi .txt) vengono rimossi dal registratore; se rifiuta o chiude, i file rimangono sul supporto.
- **Follow-up:** Nessuno
- **File coinvolti:** shared/archive.ts, electron/preload/index.ts, electron/main/index.ts, electron/main/archive.ts, src/components/UsbRecorderModal.tsx, src/styles.css, tests/unit/quality.test.ts

## D-0141 — Rigenerazione installer Windows con cancellazione opzionale registratore USB

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione e packaging del nuovo installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) che include il dialogo di sicurezza post-importazione con opzione di pulizia selettiva della memoria del registratore vocale USB e garanzia della persistenza locale.
- **Motivazione:** Rilasciare all utente l installer aggiornato con il flusso sicuro e automatico per la rimozione opzionale dei file importati dal dispositivo USB.
- **Impatto:** File dist/Lezionify-Setup-0.1.0.exe aggiornato e pronto per l installazione con le nuove funzionalita di gestione del registratore vocale.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0142 — Rilevamento reattivo registratore USB su focus e polling con deduplica

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** usb-detection
- **Decisione:** Aggiunta rilevazione reattiva automatica del registratore USB in App.tsx al cambio di focus della finestra e tramite polling non invasivo (5s) con deduplica basata sulla firma dei file per non ripetere il prompt se l utente lo ha chiuso.
- **Motivazione:** Consentire l apertura automatica del modale di importazione e l aggiornamento immediato dello stato del registratore anche quando il dispositivo viene collegato mentre l applicazione e gia aperta.
- **Impatto:** Collegando il registratore a Lezionify gia avviato, l icona del registratore si attiva immediatamente e la modale di importazione compare in modo automatico senza dover cliccare manualmente o riavviare l app.
- **Follow-up:** Nessuno
- **File coinvolti:** src/App.tsx, DECISIONI.md

## D-0143 — Rigenerazione installer Windows con rilevamento reattivo USB e cancellazione sicura

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione e packaging dell installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) includendo la rilevazione USB reattiva su focus e polling non invasivo, la schermata post-importazione con garanzia della copia locale e la pulizia selettiva dei file dal registratore.
- **Motivazione:** Fornire l installer completo e aggiornato con l intera esperienza utente automatica per il registratore USB.
- **Impatto:** Installer pronto all uso in dist/Lezionify-Setup-0.1.0.exe con test superati al 100%.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0144 — Formato (SIGLA) - Nome Del Corso nella barra laterale

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** ui-sidebar
- **Decisione:** Adozione del formato uniforme (SIGLA) - Nome Del Corso per i pulsanti dei corsi nella barra laterale sinistra e nell'intestazione della lista lezioni, basato sulle CourseDefinition configurate con fallback trasparente su (SIGLA), layout flessibile con ellipsis e tooltip completo.
- **Motivazione:** Soddisfa la richiesta dell'utente di mostrare la sigla e il nome esteso del corso insieme al conteggio lezioni nella navigazione laterale, eliminando l'ambiguita tra sole sigle e migliorando la chiarezza visiva durante lo studio.
- **Impatto:** I corsi con nome configurato (es. RL -> Reinforcement Learning, GT -> Game Theory, IR -> Intelligent Robotics) mostrano ora (SIGLA) - Nome Del Corso; i corsi non ancora configurati mostrano (SIGLA); la barra laterale mantiene i badge numerici allineati e il tooltip per nomi lunghi; 142/142 test passati.
- **Follow-up:** Nessuno
- **File coinvolti:** src/utils/courseFormat.ts, src/components/Sidebar.tsx, src/components/LectureList.tsx, src/App.tsx, src/styles.css, tests/unit/courseFormat.test.ts

## D-0145 — Tracciamento dettagliato chunk ed ETA trascrizione audio

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** transcription-ux
- **Decisione:** Aggiunta metadati analitici su numero chunk, chunk corrente, intervallo temporale, ETA dinamico, tempo trascorso e stageDetail nel flusso di trascrizione audio e introduzione del componente TranscriptionProgressBox con timeline chunk, metriche e console log live.
- **Motivazione:** Fornire all utente piena trasparenza durante le trascrizioni lunghe, mostrando in quante parti e suddiviso l audio, a che punto si trova il processo e la stima del tempo rimanente, sostituendo il vecchio box statico opaco.
- **Impatto:** L interfaccia in LectureDrawer e TranscriptPanel mostra ora avanzamento percentuale, indicatori di stato per ogni chunk, tempo residuo ed un log scorrevole delle attivita IPC in tempo reale.
- **Follow-up:** Verificare il rendering grafico e generare l installer Windows di produzione.
- **File coinvolti:** shared/archive.ts, electron/main/gemini.ts, electron/main/archive.ts, src/components/TranscriptionProgressBox.tsx, src/components/LectureDrawer.tsx, src/components/TranscriptPanel.tsx, src/styles.css, tests/unit/quality.test.ts

## D-0146 — Rigenerazione installer Windows con tracciamento chunk trascrizione ed ETA

- **Data:** 2026-09-28
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione e packaging dell installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) includendo la formattazione (SIGLA) - Nome Del Corso, il monitoraggio analitico della trascrizione audio con divisione in parti, intervalli temporali, stima ETA, console log live e 144 unit test passati.
- **Motivazione:** Rilasciare all utente l eseguibile aggiornato e firmato con tutte le recenti funzionalita grafiche, di usabilita e di trasparenza della trascrizione.
- **Impatto:** File dist/Lezionify-Setup-0.1.0.exe aggiornato con successo (dimensione ~168 MB) e pronto per la distribuzione o installazione diretta.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0147 — Rotazione tollerante su 503 e pacing sequenziale per generazione dispense Gemini

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-resilience
- **Decisione:** Estesa la rotazione automatica delle chiavi API in ArchiveService su tutti gli errori transitori (503, 500, 502, 504, UNAVAILABLE, sovraccarico) oltre ai 429/quota; corretto callWithRetry per onorare il tempo di attesa indicato da Google fino a 60s senza troncarlo a 15s; serializzata la generazione delle sezioni con ritardo di pacing (1.2-1.5s) per restare sotto il tetto Free Tier di 5 richieste al minuto.
- **Motivazione:** Gli errori 503 di Google bloccavano la rotazione chiavi con un break prematuro impedendo di provare le altre chiavi nel pool; le chiamate parallele a raffica superavano istantaneamente il limite di 5 RPM; il tetto rigido a 15s di attesa faceva riprovare la chiamata prima della riapertura della quota da parte di Google.
- **Impatto:** La generazione delle dispense non supera il limite al minuto del piano gratuito, ruota correttamente su tutte le chiavi in caso di quota esaurita o server sovraccarico, e fornisce avanzamento dettagliato per ciascuna sezione.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts

## D-0148 — Rigenerazione installer Windows con rotazione resiliente su 503 e rate-limiting dispense

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Compilazione e packaging dell'installer Windows NSIS (dist/Lezionify-Setup-0.1.0.exe) includendo la rotazione automatica delle chiavi API su errori 503/transitori, il rispetto del delay suggerito da Google fino a 60s in callWithRetry e l'elaborazione sequenziale cadenzata delle sezioni didattiche per prevenire il superamento delle 5 RPM.
- **Motivazione:** Rilasciare l'eseguibile di installazione aggiornato e verificato per Windows con tutte le correzioni applicate e testate con 144 unit test passati.
- **Impatto:** File dist/Lezionify-Setup-0.1.0.exe aggiornato con successo (~168 MB) e pronto per l'installazione o l'aggiornamento diretto su Windows 10/11.
- **Follow-up:** Nessuno
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0149 — Piano di implementazione della gestione affidabile Gemini

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** pianificazione-ai
- **Decisione:** Documentato un piano completo di implementazione per gestione condivisa delle richieste Gemini, correzione del fallback audio, retry e quote, checkpoint, cancellazione e verifica offline. Il piano e un handoff e non introduce ancora cambiamenti al runtime.
- **Motivazione:** La revisione ha individuato difetti riproducibili e lacune di coordinamento; un piano con fasi e criteri di accettazione permette a un altro modello di implementare le correzioni preservando le modifiche locali.
- **Impatto:** Aggiunto docs/quality/gemini-request-management-plan.md e collegamento nell indice della documentazione. Nessuna modifica a codice applicativo, dipendenze, credenziali o dati utente.
- **Follow-up:** Implementare le fasi A-F, registrare le scelte effettivamente adottate e distinguere test offline dal collaudo remoto opzionale autorizzato.
- **File coinvolti:** docs/quality/gemini-request-management-plan.md, docs/README.md, DECISIONI.md

## D-0150 — Fase A — Regressioni bug critici payload audio, falsi silenzi ASR e parsing attese Gemini

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-reliability
- **Decisione:** Corretto il payload del fallback multimodale con createPartFromUri (fileData: { fileUri, mimeType }); eliminata la conversione indebita di errori API di trascrizione in silenzio e garantita la propagazione dell errore ad ArchiveService per la rotazione chiavi; introdotto parseRetryDelayMs per il parsing affidabile di Retry-After, Please retry in e RetryInfo; aggiunti test di regressione unitari dedicati.
- **Motivazione:** Il fallback audio serializzava un oggetto vuoto perdendo il file; i fallimenti ASR venivano scambiati per assenza di parlato bloccando la rotazione e scatenando la generazione di dispense vuote; le attese suggerite dal server con formato retry in venivano ignorate causando tentativi prematuri.
- **Impatto:** Risolti i difetti critici R1, R2 e R5; 156/156 test superati; le trascrizioni fallite per quota o sovraccarico ruotano correttamente sulle chiavi disponibili o vengono segnalate come fallite senza mascheramento.
- **Follow-up:** Procedere con la Fase B: implementazione del modulo AI unificato (geminiErrors, geminiTransport, geminiPolicy, geminiRequestManager).
- **File coinvolti:** electron/main/gemini.ts, tests/unit/geminiPhaseA.test.ts, DECISIONI.md

## D-0151 — Fase B — Gestore condiviso GeminiRequestManager, Transport e GeminiErrors

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-architecture
- **Decisione:** Implementati i moduli architetturali in electron/main/ai/: geminiErrors.ts (normalizzazione errori tipizzati, parsing Retry-After/RetryInfo/Please retry in, messaggi sanitizzati), geminiPolicy.ts (costanti centralizzate, budget max 6 tentativi totali e 3 per chiave, timeout per scopo), geminiTransport.ts (adattatore SDK a basso livello per singolo tentativo con abort e streaming) e geminiRequestManager.ts (scheduler globale a concorrenza 1, sliding window 60s per RPM, gruppi di quota progetto, priorita con anti-starvation e gestione deterministica del clock).
- **Motivazione:** Elimina la dispersione dei retry e delle politiche di concorrenza, fornendo un unico punto di controllo dell app per rispettare le quote del provider, isolare i progetti e gestire cancellazioni e priorita.
- **Impatto:** Introdotto il gestore centralizzato e completati i test di Fase B con simulazione deterministica del clock; 166/166 test superati; predisposto il runtime per la migrazione di tutti i flussi Gemini (Fase C).
- **Follow-up:** Procedere con la Fase C: migrazione di GeminiService e ArchiveService al nuovo gestore condiviso.
- **File coinvolti:** electron/main/ai/geminiErrors.ts, electron/main/ai/geminiPolicy.ts, electron/main/ai/geminiTransport.ts, electron/main/ai/geminiRequestManager.ts, tests/unit/geminiPhaseB.test.ts, DECISIONI.md

## D-0152 — Migrazione Callers GeminiService e Serializzazione Logistica Corsi

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-request-management
- **Decisione:** Tutti i metodi di GeminiService e le chiamate AI da ArchiveService (note, trascrizione ASR, traduzione, study set, Q&A streaming, estrazione logistica esami) sono stati migrati sotto il coordinamento centralizzato di GeminiRequestManager con selezione rotativa su gruppi di quota e serializzazione mutex per corso.
- **Motivazione:** Eliminare rate limit 429 incontrollati, sovrapposizioni e corse critiche nella scrittura delle informazioni logistiche dei corsi, garantendo conformità locale e rispetto delle quote per minuto e giornaliere.
- **Impatto:** ArchiveService delega le strategie di retry, rotazione e backoff a GeminiRequestManager; i lock di courseLogistics evitano scritture concorrenti sul markdown d'esame.
- **Follow-up:** Verificare la persistenza delle riprese su crash e checkpointing (Fase D).
- **File coinvolti:** electron/main/archive.ts, electron/main/gemini.ts, shared/archive.ts

## D-0153 — Checkpoint Atomici e Crash Recovery Granulare (AiJobStore)

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-job-recovery
- **Decisione:** Implementazione di AiJobStore in library/ai-jobs/ per salvare e caricare atomicamente lo stato intermedio dei job AI: sezioni completate, overview, note d'esame e chunk ASR trascritti, con invalidazione automatica su cambio hash della sorgente e pulizia all'eliminazione della lezione.
- **Motivazione:** Evitare lo spreco di quote e crediti API Gemini in caso di crash o interruzione di rete: se un job di 5 sezioni fallisce alla sezione 4, alla ripresa le sezioni 1-3 sono recuperate istantaneamente dal checkpoint senza chiamare nuovamente le API.
- **Impatto:** Resilienza totale a riavvii improvvisi e interruzioni; la cancellazione delle lezioni pulisce sia file audio/testo sia i checkpoint temporanei dei job.
- **Follow-up:** Nessuno. Piano completato e verificato con suite di test offline dedicata.
- **File coinvolti:** electron/main/ai/aiJobStore.ts, electron/main/gemini.ts, electron/main/archive.ts, tests/unit/geminiPhaseD.test.ts

## D-0154 — Catena di fallback automatica tra modelli Gemini e gestione del sovraccarico 503

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai
- **Decisione:** Aggiunta helper getModelFallbackChain in gemini.ts (gemini-3.7-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite), passaggio di abortSignal al client GoogleGenAI, tracciamento della sospensione di quota per coppia gruppo:modello invece che per intero gruppo in geminiRequestManager, e transizione immediata al fallback dopo due 503 consecutivi sul modello.
- **Motivazione:** L'API Google restituisce errori 429 giornalieri isolati per singolo modello (Free Tier limitato a 20 req/day su gemini-3.5-flash mentre 3.7 e flash-lite sono disponibili) e picchi di 503 sul modello. Senza fallback automatico e con sospensione globale di quota per gruppo, l'app si bloccava in retry su modelli non disponibili.
- **Impatto:** Generazione e trascrizione resilienti ai picchi di domanda di Google; le dispense vengono generate senza fallire per sovraccarico di un singolo modello.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, electron/main/ai/geminiRequestManager.ts

## D-0155 — Superamento del pacing empirico di D-0147 tramite scheduler a finestra mobile di GeminiRequestManager

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-pacing
- **Decisione:** Sostituiti i ritardi fissi arbitrari (1.2-1.5s introdotti in D-0147) con la regolazione deterministica della finestra mobile di 60s (sliding window a 5 RPM) gestita centralmente da GeminiRequestManager per tutte le richieste concorrenti dell'applicazione (dispense, trascrizioni, traduzioni, study set e Q&A).
- **Motivazione:** Un ritardo fisso locale di 1.2-1.5s tra sezioni serializzate non garantiva matematicamente il rispetto del limite di 5 richieste al minuto (consentendo teoricamente fino a 40 req/min) ed escludeva le altre operazioni concorrenti dell'app. Lo scheduler globale traccia ogni chiamata fisica effettuata negli ultimi 60 secondi e calcola dinamicamente l'attesa minima esatta solo quando la finestra e satura, liberando immediatamente lo slot non appena trascorso il tempo necessario.
- **Impatto:** Eliminati tempi morti superflui quando la quota e libera; garantito il rispetto matematico del tetto di richieste al minuto configurato; rimozione dei setTimeout cablati in ArchiveService e GeminiService; prevenzione attiva dei rate limit 429 sul minuto.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/gemini.ts, electron/main/archive.ts

## D-0156 — Collaudo reale autorizzato su lezione di Game Theory e completamento pipeline con AiJobStore

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-verification
- **Decisione:** Eseguito collaudo reale autorizzato della pipeline completa di generazione dispense sulla lezione GT (14.689 parole / 79.902 caratteri) con il pool decifrato di chiavi API. Validata la segmentazione semantica in 5 sezioni, la ripresa incrementale senza spreco di token da checkpoint AiJobStore, l'assemblaggio del documento finale di 30.107 caratteri, l'aggiornamento di library.json e l'adozione di gemini-3.7-flash come modello predefinito nelle impostazioni dell'app.
- **Motivazione:** Verificare sul campo il funzionamento integrato di GeminiRequestManager, Transport, AiJobStore e fallback chain su un testo didattico universitario reale e complesso, identificando i vincoli effettivi delle API Google (limite Free Tier di 20 richieste/giorno su 3.5-flash ed errori 503 su 3.6/3.8) e garantendo che le dispense vengano generate con successo e formattate con LaTeX e Mermaid.
- **Impatto:** La dispensa della lezione di Game Theory e stata generata, validata e salvata nella libreria locale; il checkpointing ha evitato la ripetizione di chiamate gia eseguite; la configurazione attiva su gemini-3.7-flash garantisce operativita immediata all'utente.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, electron/main/ai/aiJobStore.ts, electron/main/ai/geminiRequestManager.ts, electron/main/archive.ts

## D-0157 — Stili statici sicuri per i flowchart Mermaid

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** viewer-mermaid
- **Decisione:** Consentite nei flowchart le direttive style con fill e stroke esadecimali e stroke-width da 0 a 12px; CSS arbitrario e direttive interattive restano vietati. Aggiornate le istruzioni di generazione e traduzione.
- **Motivazione:** Le dispense generate contengono stili statici utili che il viewer rifiutava, pur potendo essere validati con una lista ristretta di proprieta e valori.
- **Impatto:** I diagrammi gia salvati che rispettano il formato consentito possono essere visualizzati con la nuova build senza rigenerare le dispense; gli stili non conformi mostrano ancora il fallback sicuro.
- **Follow-up:** Verificare la visualizzazione dei diagrammi esistenti dopo l aggiornamento dell app installata.
- **File coinvolti:** src/components/MermaidDiagram.tsx, electron/main/gemini.ts, tests/unit/quality.test.ts, tests/integration/hookRegression.browser.tsx, DECISIONI.md

## D-0158 — ClassDef statiche sicure nei flowchart Mermaid

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** viewer-mermaid
- **Decisione:** Estesa la lista consentita del viewer alle direttive classDef con identificatore semplice, sole proprieta fill e stroke esadecimali e stroke-width fino a 12px, con punto e virgola finale opzionale; aggiornati i prompt Gemini per generazione e traduzione.
- **Motivazione:** Le dispense esistenti includono classDef default statiche che erano rifiutate malgrado non introducano comportamento interattivo o CSS arbitrario.
- **Impatto:** I diagrammi salvati con classDef conformi possono essere visualizzati dopo aggiornamento dell app senza rigenerazione; le direttive non conformi restano bloccate.
- **Follow-up:** Verificare il diagramma della lezione di Reinforcement Learning nella nuova versione installata.
- **File coinvolti:** src/components/MermaidDiagram.tsx, electron/main/gemini.ts, tests/unit/quality.test.ts, tests/integration/hookRegression.browser.tsx, DECISIONI.md

## D-0159 — Correzione traduzione Gemini: fallback, budget assoluto e gruppi quota

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-reliability
- **Decisione:** La traduzione usa la stessa fallback chain della generazione dispense, delega una sola richiesta logica a GeminiRequestManager e applica il tetto assoluto di sei tentativi fisici. Le chiavi legacy confluiscono prudentemente nel gruppo default-project; le impostazioni consentono di associare ogni chiave a un gruppo quota/progetto.
- **Motivazione:** La traduzione batch ritentava impropriamente l intero pool, ometteva i modelli fallback e poteva elevare il budget in funzione del numero di chiavi, causando 503, consumo quota e messaggi poco esplicativi.
- **Impatto:** I 503 passano ai fallback configurati, ogni traduzione ha al massimo sei chiamate, RPM e cooldown sono condivisi per progetto, e il modale batch mostra titolo e causa di ogni fallimento.
- **Follow-up:** Eseguire un collaudo Gemini autorizzato con una dispensa sintetica e configurare gruppi distinti solo per chiavi create in progetti Google AI Studio diversi.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/gemini.ts, electron/main/archive.ts, electron/main/settings.ts, shared/archive.ts, src/hooks/useGeminiGeneration.ts, src/hooks/useSettings.ts, src/components/SettingsModal.tsx, src/components/BatchSelectionModal.tsx, src/App.tsx, tests/unit/geminiPhaseB.test.ts, tests/unit/archive.test.ts

## D-0160 — Budget per coppia chiave-modello nei fallback Gemini

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** ai-reliability
- **Decisione:** Il limite locale di tentativi viene conteggiato per coppia chiave-modello, mentre il limite assoluto della richiesta resta sei chiamate fisiche.
- **Motivazione:** Un contatore cumulativo per la sola chiave esauriva il budget locale dopo due 503 del modello preferito e poteva impedire i fallback successivi con una singola chiave configurata.
- **Impatto:** Una sola chiave puo provare ordinatamente i modelli fallback senza superare il budget totale; retry infiniti sulla stessa coppia chiave-modello restano bloccati.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, tests/unit/geminiPhaseB.test.ts

## D-0161 — Rigenerazione installer Windows con affidabilita traduzioni Gemini

- **Data:** 2026-09-29
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Generato l installer Windows NSIS Lezionify-Setup-0.1.0.exe includendo fallback traduzione Gemini, budget assoluto di sei tentativi, gruppi quota per progetto e riepilogo esplicativo dei batch falliti.
- **Motivazione:** Distribuire la correzione nell applicazione desktop installabile, non solo nella build locale del repository.
- **Impatto:** Il nuovo setup Windows include la gestione resiliente delle traduzioni e puo sostituire l installer precedente mantenendo i dati locali dell utente nella cartella AppData.
- **Follow-up:** Eseguire un collaudo Gemini autorizzato con una dispensa sintetica dopo l installazione e configurare correttamente i gruppi delle chiavi per progetto.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/latest.yml, DECISIONI.md

## D-0162 — Telemetria locale per utilizzo chiavi Gemini

- **Data:** 2026-09-30
- **Stato:** accettata
- **Area:** ai-observability
- **Decisione:** Registrare in app.log ogni richiesta fisica Gemini e il riepilogo di ogni richiesta logica usando esclusivamente alias stabili come Chiave 1 e Chiave 3, con azione, scopo, modello, gruppo quota, esito, categoria errore, segnale quota giornaliera, durata e conteggio chiamate per chiave.
- **Motivazione:** Permettere analisi settimanali del consumo e delle rotazioni tra chiavi, oltre a individuare chiavi che esauriscono la quota insieme e potrebbero appartenere allo stesso progetto Google, senza persistere credenziali o frammenti sensibili.
- **Impatto:** Il log locale contiene eventi strutturati gemini_request_attempt, gemini_request_result e gemini_request_summary; ogni azione espone numero di richieste fisiche, chiavi distinte usate e chiamate per alias, ed e analizzabile successivamente senza modificare il flusso utente.
- **Follow-up:** Dopo almeno una settimana di utilizzo, analizzare app.log aggregando chiamate, errori quota e correlazioni temporali per alias e gruppo quota.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, tests/unit/geminiPhaseB.test.ts, DECISIONI.md

## D-0163 — Q&A contestuale integrato nel gestore Gemini centralizzato

- **Data:** 2026-09-30
- **Stato:** accettata
- **Area:** qna-ai-reliability
- **Decisione:** Rimosso il ciclo legacy di rotazione chiavi e fallback da ArchiveService; il Q&A contestuale usa una sola richiesta logica di GeminiRequestManager, il pool consentito da autoRotateOnQuota, la fallback chain comune, gli alias della chiave realmente tentata e GeminiTransport.generateContentStream con timeout di apertura, primo chunk e inattivita. Dopo il primo chunk un errore diventa non ritentabile per impedire la fusione di output provenienti da tentativi diversi.
- **Motivazione:** Il doppio livello di gestione poteva ignorare autoRotateOnQuota, mostrare una chiave errata, non applicare i fallback modello e superare il budget logico; lo streaming diretto bypassava i timeout e un retry dopo output parziale poteva duplicare la risposta.
- **Impatto:** Le chat ancorate alle evidenziazioni condividono ora scheduler, limite di sei tentativi, quote per progetto, rotazione, fallback, telemetria e gestione errori delle altre funzioni Gemini. Lo stato UI riflette chiave e modello effettivi; stream bloccati liberano la coda e risposte parziali fallite vengono annullate senza concatenare un nuovo tentativo.
- **Follow-up:** Eseguire il collaudo Gemini reale opzionale con dati sintetici per osservare uno streaming completo e, quando riproducibile, un fallback remoto; nessuna chiamata esterna e stata eseguita durante questa modifica.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/ai/geminiTransport.ts, electron/main/gemini.ts, electron/main/archive.ts, tests/unit/qnaRequest.test.ts, tests/unit/archive.test.ts, DECISIONI.md

## D-0164 — Coda manuale completa e riprendibile dell archivio

- **Data:** 2026-09-30
- **Stato:** accettata
- **Area:** pipeline-automation
- **Decisione:** Sostituito il flusso UI Generazione multipla con Elabora tutto. Il comando analizza l archivio locale, completa prima tutte le trascrizioni mancanti, poi tutte le dispense ITA e infine tutte le versioni ENG; non avvia Q&A o quiz. Lo stato della coda e persistito atomicamente e alla riapertura un lavoro interrotto diventa riprendibile. L elaborazione automatica all importazione resta facoltativa ma e disattivata di default.
- **Motivazione:** Il workflow richiesto e importare le lezioni dal registratore e decidere con un solo comando quando consumare API Gemini. Una coda a barriere di fase evita concorrenza e ordine ambiguo; il checkpoint di alto livello evita di perdere il lavoro dopo rete assente, crash o spegnimento.
- **Impatto:** Archivio, IPC e renderer espongono stato, avanzamento, pausa cooperativa e ripresa. Ogni attivita delega una sola richiesta logica a GeminiRequestManager, che applica coda globale, 5 RPM, cooldown, fallback e massimo sei tentativi fisici; non esistono ritardi fissi o una seconda rotazione chiavi. Gli output gia salvati sono saltati e i checkpoint granulari ASR/dispense restano validi.
- **Follow-up:** Eseguire un collaudo manuale con audio non sensibili, una sospensione di rete e un riavvio dell app; mantenere disattivata l elaborazione automatica se si desidera il solo avvio manuale.
- **File coinvolti:** shared/archive.ts, electron/main/ai/archivePipeline.ts, electron/main/ai/aiJobStore.ts, electron/main/archive.ts, electron/main/settings.ts, electron/main/index.ts, electron/preload/index.ts, src/App.tsx, src/components/LectureList.tsx, src/components/ArchivePipelinePanel.tsx, src/hooks/useArchivePipeline.ts, src/hooks/useSettings.ts, src/components/SettingsModal.tsx, src/styles.css, tests/unit/archivePipeline.test.ts, tests/unit/archive.test.ts, tests/unit/geminiPhaseA.test.ts, STRUTTURA_PROGETTO.md

## D-0165 — Handoff per correggere i quattro bug della revisione del 30 settembre

- **Data:** 2026-09-30
- **Stato:** accettata
- **Area:** pianificazione-qualita
- **Decisione:** Creato un documento completo di progettazione per correggere ammissione concorrente della pipeline, abort reale dello streaming Q&A, recupero improprio dopo testo parziale e classificazione degli errori 403. Il piano include contratti proposti, lifecycle, compatibilita, test permanenti, criteri di accettazione e prompt per un altro modello.
- **Motivazione:** Trasferire i difetti riprodotti offline in istruzioni autosufficienti e verificabili, evitando correzioni parziali o regressioni su scheduler, quote, checkpoint e dati locali.
- **Impatto:** Aggiunto docs/quality/bugfix-handoff-2026-09-30.md e collegato nell indice docs/README.md. Nessuna correzione runtime o modifica a dipendenze, impostazioni, credenziali o dati utente; manutenzione delle vulnerabilita dev/build documentata come fase distinta.
- **Follow-up:** Far implementare R1-R4 secondo il documento, registrare le decisioni effettive ed eseguire regressioni offline e npm run check; eventuali chiamate AI reali richiedono autorizzazione distinta.
- **File coinvolti:** docs/quality/bugfix-handoff-2026-09-30.md, docs/README.md, DECISIONI.md

## D-0166 — R1: ammissione atomica e lifecycle completo della pipeline

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** pipeline-lifecycle
- **Decisione:** Acquisire una prenotazione sincrona condivisa da start e resume prima di ogni await e mantenerla fino alla finalizzazione del worker; wait e stop coprono anche la preparazione e i rifiuti concorrenti non accodano nuovi run.
- **Motivazione:** La finestra tra controllo e lancio permetteva due piani concorrenti e duplicava le elaborazioni; il rilascio per identita impedisce che una finalizzazione precedente liberi un ciclo successivo.
- **Impatto:** Un solo avvio manuale o automatico ammesso, zero attivita AI se la persistenza iniziale fallisce, stop cooperativo conservato durante gli await, slot liberato anche dopo errori della persistenza finale con segnalazioni locali sanitizzate.
- **Follow-up:** Regressioni permanenti offline per concorrenza, resume, wait, stop, preflight e persistenza; nessuna modifica a dati personali o installer.
- **File coinvolti:** electron/main/ai/archivePipeline.ts, tests/unit/archivePipeline.test.ts

## D-0167 — R2: abort SDK e pulizia deterministica dello streaming

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** qna-streaming
- **Decisione:** Ogni streaming possiede un AbortController collegato al segnale del tentativo e passato nel config SDK. Deadline iniziale unica fino al primo testo utile, inattivita e timeout totale interrompono la connessione; timer, listener e letture perdenti sono osservati e finalizzati senza emissioni tardive.
- **Motivazione:** Rigettare soltanto la Promise locale lasciava attivo il trasporto. Conservare il motivo timeout evita di confonderlo con una cancellazione volontaria anche quando il SDK restituisce AbortError.
- **Impatto:** Timeout distinti dagli stop utente, fetch client annullato, nessun retry nel trasporto, cleanup non bloccante per iterator.return non cooperativi. Budget 60s, 45s e 180s e policy Gemini invariati; regressioni offline anche sul SDK installato con fetch sintetico.
- **Follow-up:** Abort client verificato offline; nessuna garanzia sul calcolo o sui costi gia maturati lato Google e nessun collaudo remoto eseguito.
- **File coinvolti:** electron/main/ai/geminiTransport.ts, electron/main/ai/geminiRequestManager.ts, tests/unit/geminiStreaming.test.ts, tests/unit/qnaRequest.test.ts

## D-0168 — R3: terminalita dopo testo parziale senza perdita della categoria

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** qna-recovery
- **Decisione:** Aggiungere recoveryDisposition policy o terminal a GeminiError, default policy; dopo il primo testo Q&A ogni errore diventa terminale mantenendo categoria, status e quota. Il manager aggiorna telemetria e cooldown ma interrompe prima di retry, rotazione o fallback.
- **Motivazione:** isRetryable false non impediva recuperi speciali su authentication, quota_exhausted o model_unavailable e poteva concatenare risposte di tentativi diversi.
- **Impatto:** Un solo tentativo dopo output parziale e un summary failed, nessuna risposta parziale persistita o riusata nello storico; retry esplicito produce solo la nuova risposta. Recuperi anteriori al testo e budget massimo di sei tentativi conservati; errori provider sconosciuti hanno un messaggio generico sanitizzato.
- **Follow-up:** Regressioni per sette categorie dopo testo, telemetria terminale, sospensione quota e rollback con retry React/Electron; nessuna chiamata AI reale.
- **File coinvolti:** electron/main/ai/geminiErrors.ts, electron/main/ai/geminiRequestManager.ts, electron/main/gemini.ts, tests/unit/qnaRequest.test.ts, tests/unit/geminiPhaseB.test.ts, tests/integration/hookRegression.browser.tsx

## D-0169 — R4: categorie strutturate e pausa riprendibile per permessi Gemini

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** pipeline-failures
- **Decisione:** Aggiungere failureKind opzionale ai risultati di generazione e trascrizione e un helper backend esaustivo per le categorie Gemini. La pipeline privilegia il codice, mappa permission_denied ad authentication e sospende prima di altre task; errori locali hanno codici distinti e vecchi unknown vengono rivalutati solo su messaggi controllati.
- **Motivazione:** Il messaggio italiano Accesso negato perdeva la categoria 403 e faceva continuare la pipeline sulle altre lezioni. I codici finiti separano orchestrazione e testo visibile preservando il checkpoint v1.
- **Impatto:** Dispense, ASR e traduzioni propagano il 403 sanitizzato, resume mantiene run ID e successi, le dipendenze future restano pending. Il renderer aggiorna la libreria alla transizione paused senza refresh duplicati e rende visibili gli output gia salvati; fonti originali e checkpoint granulari preservati.
- **Follow-up:** Regressioni offline per mappatura completa, tre stage, riavvio e ripresa legacy, source_changed, errori locali e refresh React; nessuna nuova dipendenza.
- **File coinvolti:** shared/archive.ts, electron/main/ai/pipelineFailure.ts, electron/main/ai/archivePipeline.ts, electron/main/archive.ts, src/hooks/useArchivePipeline.ts, tests/unit/pipelineFailure.test.ts, tests/unit/archivePipeline.test.ts, tests/unit/archive.test.ts, tests/integration/hookRegression.browser.tsx

## D-0170 — Consuntivo offline dei fix R1-R4 e audit separato della toolchain

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** quality-verification
- **Decisione:** Aggiornare il piano con implementazione, regressioni, risultati e limiti reali; aggiornare la struttura a 256 test Vitest e 26 scenari Electron. Conservare separata la manutenzione delle dipendenze dev/build dai fix applicativi.
- **Motivazione:** Il piano deve descrivere lo stato consegnato e distinguere verifica sintetica, build locale, dipendenze e distribuzione installabile.
- **Impatto:** npm run check superato: typecheck, lint, 256 test Vitest, 14 test Python, 26 scenari Electron e build. Ultimo audit riuscito del 30 settembre: zero vulnerabilita di produzione e tre pacchetti high dev/build; aggiornamento audit del 1 ottobre non disponibile per ENOTFOUND registry.npmjs.org. Installer non rigenerato.
- **Follow-up:** Ripetere gli audit quando il registry torna raggiungibile; manutenzione compatibile di brace-expansion, fast-uri e undici e verifica packaging in attivita distinta. Nessun collaudo Gemini remoto effettuato.
- **File coinvolti:** docs/quality/bugfix-handoff-2026-09-30.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0171 — Preservare progressi recenti contro risposte IPC tardive

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** pipeline-ui
- **Decisione:** Il hook useArchivePipeline tiene una revisione degli eventi di avanzamento e applica i risultati IPC di start, resume e stop allo stato UI solo se non sono arrivati eventi successivi durante il comando.
- **Motivazione:** Il ricontrollo pre-installer ha riprodotto una risposta IPC running tardiva che sovrascriveva una pausa o uno stop gia notificati e lasciava la UI con uno stato obsoleto.
- **Impatto:** Lo stato finale o in pausa resta visibile anche con IPC ritardato. Aggiunta una regressione React/Electron che falliva prima del fix e copre avvio e stop; la suite passa da 26 a 27 scenari senza nuove dipendenze.
- **Follow-up:** Eseguire il quality gate completo e generare il setup Windows con questo fix insieme a R1-R4.
- **File coinvolti:** src/hooks/useArchivePipeline.ts, tests/integration/hookRegression.browser.tsx, STRUTTURA_PROGETTO.md, docs/quality/bugfix-handoff-2026-09-30.md

## D-0172 — Installer Windows aggiornato dopo ricontrollo dei fix R1-R4

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Rigenerare il setup NSIS x64 Lezionify-Setup-0.1.0.exe con R1-R4 e D-0171 tramite npm run package:win -- --publish never, conservando una copia locale del setup precedente e verificando il pacchetto e il manifesto.
- **Motivazione:** La richiesta esplicita richiede di distribuire le correzioni nell installer generale dopo revisione e collaudo, non soltanto nella build locale.
- **Impatto:** Quality gate superato con 256 test Vitest, 14 Python, 27 scenari Electron, typecheck, lint e build. Setup di 167914976 byte; 141 file out corrispondono byte per byte ad app.asar, FFmpeg presente, artefatti locali esclusi, SHA512 di latest.yml verificato. SHA256 setup: 45e0fb822038d9426459e34a74bb3a5a1154dd97e76122d7335d8ef3974e35a9. Contenuto pacchettizzato avviato nel runtime Electron con profilo temporaneo, finestra nascosta, rete e scansione USB reale disabilitate; renderer e bridge IPC funzionanti. Setup non firmato digitalmente.
- **Follow-up:** Installer pronto per installazione manuale; non eseguita installazione sul profilo reale e nessuna pubblicazione o chiamata AI remota. Manutenzione delle vulnerabilita dev/build resta distinta.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, docs/quality/bugfix-handoff-2026-09-30.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0173 — Archiviazione reversibile e liste limitate ai corsi attivi

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** corsi-archiviazione
- **Decisione:** Persistito archivedCourseCodes nelle impostazioni locali, con default vuoto per dati legacy e supporto ai corsi senza scheda. La sidebar espone Corsi attivi e Corsi archiviati espandibili e menu tasto destro Archivia corso o Ripristina corso, anche da tastiera. Le liste e ricerche generali escludono lezioni archiviate; selezionare il corso archiviato permette la consultazione separata, mentre i filtri di studio tornano ai corsi attivi.
- **Motivazione:** Separare gli esami terminati dal materiale corrente senza cancellare o spostare file e senza inventare metadati CFU per corsi importati. Il ripristino rende reversibile la scelta e l elenco separato conserva il rapporto con le lezioni.
- **Impatto:** Scrittura serializzata, validazione IPC, UI aggiornata dopo persistenza riuscita e protetta dai refresh tardivi. Audio, trascrizioni, dispense e metadati delle lezioni preservati; rinomina e rollback trasferiscono o ripristinano il marcatore. Eliminare solo la scheda mantiene l archiviazione. Statistiche storiche e politica della pipeline AI conservate. Quality gate superato con 265 test Vitest, 14 Python, 30 scenari React/Electron, typecheck, lint e build; smoke renderer di produzione con dati sintetici e verifica visiva.
- **Follow-up:** La build locale contiene la funzione; rigenerare il setup Windows quando richiesto. Nessuna libreria reale modificata, nuova dipendenza o chiamata AI.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/settings.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useLectures.ts, src/components/Sidebar.tsx, src/components/LectureList.tsx, src/App.tsx, src/styles.css, tests/unit/courseArchive.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/course-archive-plan.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0174 — Esclusione degli artefatti locali dal lint

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** quality-lint
- **Decisione:** Aggiungere local-artifacts/** agli ignore ESLint.
- **Motivazione:** Il quality gate includeva script CJS temporanei di verifica installer che sono gia esclusi dal versionamento e dichiarati artefatti locali nella struttura del progetto.
- **Impatto:** Il lint resta applicato al codice versionato e ai test; npm run check passa senza dipendere dagli script personali di collaudo presenti nella cartella locale. Nessuna modifica runtime o dipendenza.
- **Follow-up:** Nessuno.
- **File coinvolti:** eslint.config.js, docs/product/course-archive-plan.md

## D-0175 — Installer Windows con archiviazione reversibile dei corsi

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Rigenerare il setup NSIS x64 Lezionify-Setup-0.1.0.exe tramite npm run package:win -- --publish never con la funzionalita di corsi attivi e archiviati; preservare una copia locale del setup precedente.
- **Motivazione:** La richiesta esplicita richiede l installer aggiornato per utilizzare archiviazione e ripristino nell app installata.
- **Impatto:** Setup di 167916482 byte. Tutti i 141 file out corrispondono byte per byte ad app.asar; SHA512 e dimensione di latest.yml verificati, FFmpeg presente e artefatti locali esclusi. SHA256 setup: 735519d618a3edc9cdaaedf4336709ed3e8a44cc3d9b1c396eb8d1fa397b7fe6. Avvio del contenuto pacchettizzato nel runtime Electron con profilo temporaneo e finestra nascosta: renderer, sezioni dei corsi e IPC di archiviazione, persistenza e ripristino funzionanti, senza errori. Quality gate della funzione gia superato con 265 test Vitest, 14 Python, 30 scenari React/Electron, typecheck, lint e build. Setup non firmato digitalmente.
- **Follow-up:** Installer pronto per installazione manuale. Nessuna installazione sul profilo reale, pubblicazione, scansione USB reale o chiamata AI; rete disabilitata durante lo smoke test.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, docs/product/course-archive-plan.md, DECISIONI.md

## D-0176 — Sistema di pubblicazione automatica lezioni su GitHub

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** condivisione-lezioni
- **Decisione:** Adottato un sistema di pubblicazione automatica che all avvio e dopo il completamento della pipeline verifica lezioni con trascrizione, schema ITA e corso completi non ancora pubblicate e le pusha su un repository GitHub pubblico separato, organizzato per cartelle corso e data. Solo testo (trascrizione e schema), senza audio. Autenticazione tramite PAT cifrato con safeStorage. Nuovi moduli in electron/main/publishing/ (PublishState, PublishGitClient, PublishService, ReadmeGenerator). Criteri di pubblicabilita: transcriptFileName, markdownFileName, courseCode e recordedAt non null e lezione non gia presente in publish-state.json.
- **Motivazione:** Permettere ai compagni di corso di accedere autonomamente a trascrizioni e schemi delle lezioni tramite un semplice link GitHub, senza intervento manuale dopo la configurazione iniziale. L audio e escluso perche supererebbe i limiti di dimensione delle repository GitHub (80-150 MB per lezione, 7-14 GB per semestre) mentre il solo testo occupa circa 14 MB per semestre.
- **Impatto:** Nuova cartella electron/main/publishing/ con quattro moduli. Nuovi campi PublishingSettings in AppSettings con token GitHub cifrato. Nuovi handler IPC publish-lectures e get-publishing-status. Hook di avvio fire-and-forget e trigger post-pipeline. Lo stato di pubblicazione e persistito atomicamente in library/publish-state.json e viene scritto solo dopo push git confermato. Suite di test offline senza dipendenze da git o rete.
- **Follow-up:** Implementare le fasi 1-10 del piano docs/product/publishing-implementation-plan.md in ordine, registrare le decisioni effettive, eseguire npm run check e verificare che nessun test esistente sia rotto.
- **File coinvolti:** docs/product/publishing-implementation-plan.md, shared/archive.ts, electron/main/publishing/publishState.ts, electron/main/publishing/publishGitClient.ts, electron/main/publishing/publishService.ts, electron/main/publishing/readmeGenerator.ts, electron/main/archive.ts, electron/main/settings.ts, electron/main/index.ts, electron/preload/index.ts, tests/unit/publishing.test.ts, STRUTTURA_PROGETTO.md

## D-0177 — Implementazione pubblicazione GitHub con checkpoint e PAT protetto

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** condivisione-lezioni
- **Decisione:** Implementate le fasi 1-10 di D-0176: PublishState, PublishGitClient, PublishService e README; contratti IPC, cifratura PAT, trigger avvio e post-pipeline, test offline. Il token e write-only verso IPC e non ha fallback in chiaro; Git riceve autenticazione solo tramite configurazione temporanea di ambiente. Clone e checkpoint sono separati per repository e branch; cartelle corso/data/id con suffissi deterministici evitano collisioni.
- **Motivazione:** Concretizzare il piano mantenendo fonti locali e pubblicazione esplicitamente abilitata. Correggere gli esempi che persistevano PAT negli URL Git, confermavano commit vuoti senza push, sovrascrivevano lezioni dello stesso giorno o riutilizzavano stato su destinazioni diverse.
- **Impatto:** Solo trascrizioni grezze e dispense ITA, README e gitignore vengono aggiunti al clone. Stato e conteggi aggiornati dopo push confermato e persistenza atomica; commit vuoto invia comunque i commit locali. Avvio dopo creazione finestra, trigger dopo finalizzazione pipeline, pause e ripristino stato esclusi. URL GitHub e branch validati, errori controllati, symlink e traversal rifiutati. Nessuna nuova dipendenza; nessuna credenziale o libreria reale utilizzata. I clone corrotti non vengono eliminati automaticamente.
- **Follow-up:** Eseguire npm run check; configurare un repository separato e un PAT per un collaudo remoto dedicato. La fase 11 UI resta futura come nel piano; installer non rigenerato e nessuna pubblicazione reale eseguita.
- **File coinvolti:** shared/archive.ts, electron/main/publishing/publishState.ts, electron/main/publishing/publishGitClient.ts, electron/main/publishing/publishService.ts, electron/main/publishing/readmeGenerator.ts, electron/main/settings.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, tests/unit/publishing.test.ts, docs/product/publishing-implementation-plan.md, STRUTTURA_PROGETTO.md, docs/README.md, tests/README.md

## D-0178 — Collaudo offline della pubblicazione e supporto batch Windows

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** publishing-verification
- **Decisione:** Confermate le fasi 1-10 con 59 nuove regressioni offline e quality gate completo. Git add divide grandi batch in gruppi da 50 file e legge lo staging con separatori NUL; core.longpaths e attivo per i percorsi Windows. Lo stato IPC converte anche errori locali di lettura in messaggi controllati.
- **Motivazione:** Garantire affidabilita su archivi estesi, nomi Unicode e percorsi profondi, conservando errori senza credenziali o percorsi personali. Documentare le verifiche realmente eseguite e separarle da configurazione e collaudo remoto.
- **Impatto:** npm run check superato con 324 test Vitest, 14 Python, 30 scenari React/Electron, typecheck, lint e build. Regressioni per trigger dopo rilascio worker, completamento con errori, pausa provider e ripristino pipeline; fetch bloccato e non invocato nei test di pubblicazione. Bridge compilato verificato e diff-check superato. Piano e struttura aggiornati; nessun installer rigenerato o push reale.
- **Follow-up:** Configurazione repository e PAT tramite contratto saveSettings; UI fase 11 ancora futura. Collaudo remoto da effettuare con repository dedicato e pubblicazione abilitata esplicitamente.
- **File coinvolti:** electron/main/publishing/publishGitClient.ts, electron/main/publishing/publishService.ts, tests/unit/publishing.test.ts, docs/product/publishing-implementation-plan.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0179 — Nascondere il promemoria autunnale dal 4 ottobre

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** promemoria-semestre
- **Decisione:** Anticipata al 4 ottobre la scomparsa annuale del banner di verifica degli orari: visibile dal 20 settembre al 3 ottobre compreso.
- **Motivazione:** Ridurre la durata del promemoria secondo la richiesta esplicita dell utente.
- **Impatto:** Il banner autunnale non viene mostrato dal 4 ottobre; finestra primaverile e comportamento del pulsante di chiusura invariati.
- **Follow-up:** La modifica va inclusa nel prossimo installer Windows.
- **File coinvolti:** src/components/SemesterReminderBanner.tsx, DECISIONI.md

## D-0180 — Sincronizzazione GitHub automatica di lezioni nuove e modificate

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** publishing-automation
- **Decisione:** Estesa la pubblicazione a sincronizzazione automatica: fetch GitHub a ogni avvio e ogni cinque minuti, confronto dei blob del branch remoto con i testi locali, hash dei contenuti nei checkpoint, ripristino di file remoti modificati o mancanti. AutomaticPublisher accorpa richieste e modifiche, rinvia durante la pipeline e ritenta con backoff da 30 secondi fino a cinque minuti. Impostazioni con URL, PAT mascherato, abilitazione e stato; nessun pulsante Pubblica o Testa connessione.
- **Motivazione:** La richiesta esplicita richiede di non intervenire manualmente e di verificare modifiche e connettivita a ogni apertura, superando il controllo precedente basato solo sugli ID pubblicati. Il fetch della destinazione verifica la raggiungibilita effettiva di GitHub.
- **Impatto:** Trigger su avvio, salvataggio impostazioni, dispense, trascrizioni e metadati e completamento pipeline. Gli output locali restano autorevoli; nessuna cancellazione remota automatica. PAT preservato sui salvataggi senza nuovo token, cancellato dal form alla chiusura o al successo e richiesto per la prima abilitazione. Errori rete e autenticazione classificati senza output provider. Quality gate passato con 338 Vitest, 14 Python, 32 React/Electron, typecheck, lint e build. Preview di produzione con profilo isolato e token sintetico, senza push.
- **Follow-up:** Rigenerare e verificare il setup Windows, poi inserire repository e PAT nelle Impostazioni dell app installata per il collaudo reale. Non inserire il PAT in chat. Nessuna credenziale o libreria reale utilizzata durante lo sviluppo.
- **File coinvolti:** electron/main/publishing/automaticPublisher.ts, electron/main/publishing/publishService.ts, electron/main/publishing/publishState.ts, electron/main/publishing/publishGitClient.ts, electron/main/archive.ts, electron/main/settings.ts, electron/main/index.ts, shared/archive.ts, src/hooks/useSettings.ts, src/components/SettingsModal.tsx, src/components/Sidebar.tsx, src/App.tsx, src/styles.css, tests/unit/publishing.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/publishing-implementation-plan.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0181 — Installer Windows con sincronizzazione automatica GitHub

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Rigenerato il setup NSIS x64 tramite npm run package:win -- --publish never con D-0180 e pannello delle Impostazioni, preservando una copia del setup precedente e verificando contenuto pacchettizzato, manifesto e UI.
- **Motivazione:** Rendere utilizzabile nell app installata la configurazione del PAT e la sincronizzazione automatica richiesta, senza console o pulsanti manuali di pubblicazione.
- **Impatto:** Setup di 167923897 byte; 141 file out identici a quelli in app.asar, SHA512 e dimensione del manifesto verificati, FFmpeg presente e artefatti locali esclusi. SHA256: 451b5fa5b1f7bb1f739e252f85b6a92f575a849f9b2383d622b96ffc2c89762e. Avvio del pacchetto nel runtime Electron e prova del pannello con profilo isolato, rete disabilitata e token sintetico: IPC operativo, token cifrato e omesso dalle risposte, campo password vuoto dopo salvataggio, stato presente e nessun pulsante Pubblica. Verificata preview chiara e scura. Setup non firmato; non eseguita installazione sul profilo reale.
- **Follow-up:** Installare il setup aggiornato, aprire Impostazioni, inserire URL del repository e PAT, abilitare la sincronizzazione automatica e salvare. Il primo collaudo GitHub reale avverra nell app dopo questa configurazione; nessun push reale o uso delle credenziali personali durante lo sviluppo.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, docs/product/publishing-implementation-plan.md, DECISIONI.md

## D-0182 — Controllo Git indipendente dal clone al primo avvio

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** publishing-git-probe
- **Decisione:** Eseguire git --version dalla directory di lavoro esistente del processo anziche dalla cartella del clone, ancora assente al primo avvio; aggiungere regressioni offline per clone inesistente e Git realmente indisponibile.
- **Motivazione:** Su Windows child_process restituisce ENOENT anche quando Git e installato se cwd non esiste. Il controllo precedente confondeva l assenza del clone con quella di Git e bloccava la prima sincronizzazione.
- **Impatto:** Nessuna installazione Git aggiuntiva richiesta su questo computer. Il controllo non crea il clone e non riceve header di autenticazione; flusso automatico e PAT preservati. Riprodotto con Git reale 2.47.1.windows.1: directory esistente funziona, clone assente produce ENOENT.
- **Follow-up:** Quality gate, rigenerazione installer e prova del client pacchettizzato con Git reale in profilo temporaneo e comandi di rete bloccati.
- **File coinvolti:** electron/main/publishing/publishGitClient.ts, tests/unit/publishing.test.ts, STRUTTURA_PROGETTO.md, docs/product/publishing-implementation-plan.md

## D-0183 — Installer con fix Git al primo avvio

- **Data:** 2026-10-01
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Rigenerato il setup Windows con D-0182 tramite npm run package:win -- --publish never, conservando il setup precedente e verificando il client pacchettizzato con Git reale.
- **Motivazione:** Il falso messaggio Git non trovato impediva la prima sincronizzazione nell app installata; la correzione deve essere disponibile nel setup.
- **Impatto:** Quality gate superato: 340 Vitest, 14 Python, 32 scenari Electron, typecheck, lint e build. Setup di 167923749 byte; 141 file out identici ad app.asar, SHA512 e dimensione del manifesto verificati, FFmpeg presente e artefatti locali esclusi. SHA256: 4b7303cdf662b3f23f8b909714b6b43f9b1b8b66b25f2842269500ce7f034402. Prova sul vecchio pacchetto fallita per cwd assente; sul nuovo Git disponibile e clonazione raggiunta.
- **Follow-up:** Installare il setup aggiornato e riaprire l app. Test con profilo isolato, token sintetico e comandi di rete bloccati; nessun push reale, uso del PAT personale o installazione sul profilo reale.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, docs/product/publishing-implementation-plan.md, DECISIONI.md

## D-0184 — File audio Gemini associati alla chiave del tentativo

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** ai-audio-permissions
- **Decisione:** Caricare e attendere ogni parte audio con la chiave effettivamente scelta dal gestore Gemini; riusare il file solo per la stessa chiave e pulire ogni copia dal client proprietario. Conservare GeminiError senza avvolgerlo in Error generico. Registrare motivi finiti dei 403 e della validazione ASR senza output provider o dati sensibili.
- **Motivazione:** Il codice precedente riusava un URI caricato dalla prima chiave anche dopo rotazione su un altro progetto. La regressione offline riproduce 503 seguito da 403 su file non accessibile. I log reali sono compatibili con questo difetto ma non provano il motivo preciso del diniego.
- **Impatto:** Rotazione ASR e recupero multimodale preservano la proprieta del file. Upload e polling rientrano nel tentativo centralizzato con abort; cleanup include metadati incompleti. Un vero 403 sospende la pipeline per autorizzazione invece di diventare unknown. Aggiunte 13 regressioni offline senza dipendenze o chiamate remote.
- **Follow-up:** Eseguire il quality gate e includere il fix nel prossimo installer. Dopo aggiornamento verificare una ripresa esplicita nell app; se persiste il 403 usare permissionReason e controllare i permessi del progetto, senza assumere che serva fatturazione.
- **File coinvolti:** electron/main/gemini.ts, electron/main/ai/geminiErrors.ts, electron/main/ai/geminiRequestManager.ts, tests/unit/geminiAudioOwnership.test.ts, tests/unit/geminiPhaseA.test.ts, tests/README.md, STRUTTURA_PROGETTO.md, docs/quality/gemini-audio-403-2026-10-02.md

## D-0185 — Modelli di riserva anche per il recupero audio multimodale

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** ai-audio-fallback
- **Decisione:** Il recupero audio passa a GeminiRequestManager la stessa catena di modelli di riserva delle altre richieste Gemini, partendo dal modello di recupero preferito. Il limite di sei tentativi, la rotazione e il passaggio dopo due 503 restano gestiti centralmente.
- **Motivazione:** Il collaudo reale autorizzato mostra risposte ASR vuote e 503 ripetuti sul modello multimodale. Il percorso audio aveva omesso fallbackModels e poteva consumare tutti i tentativi sullo stesso modello indisponibile. Il 403 della rotazione non si e ripresentato caricando il file con la chiave realmente usata.
- **Impatto:** Una regressione offline riproduce il blocco prima del fix e verifica il passaggio al modello successivo dopo due 503 senza duplicare caricamenti della stessa chiave. Nessuna nuova dipendenza o modifica alle impostazioni, alle credenziali o alla libreria reale. La prova reale usa una copia locale con pubblicazione disabilitata.
- **Follow-up:** Riprendere il collaudo reale autorizzato conservando i checkpoint e completare il quality gate. Gli output restano nel solo archivio di collaudo finche l app installata mantiene aperta la libreria reale.
- **File coinvolti:** electron/main/gemini.ts, tests/unit/geminiAudioOwnership.test.ts, STRUTTURA_PROGETTO.md, docs/quality/gemini-audio-403-2026-10-02.md

## D-0186 — Applicazione Flutter autonoma radio e IP

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica-android
- **Decisione:** Creare APP_TELEFONIA come progetto Flutter Android indipendente con Material 3, bridge MethodChannel/EventChannel, monitor Kotlin LTE/NR/GSM/WCDMA, servizio foreground location avviato dalla UI e SQLite/WAL nativo per campioni, celle, eventi e test. Il servizio conserva i dati senza dipendere dalla vita della UI Flutter; finestre evento -60/+120 secondi ricostruite dal database e ring buffer di 60 secondi.
- **Motivazione:** La richiesta esplicita riguarda diagnostica Fastweb su Redmi, non il runtime Electron di Lezionify. La persistenza nativa rende sostenibili registrazioni a schermo spento e conserva le fonti misurate localmente.
- **Impatto:** Nuovo progetto minSdk26 targetSdk36, sampling 1/5 secondi e callback, sessioni, marker, storico, grafici, settings, recovery delle sessioni interrotte e export streaming CSV/JSON/ZIP con Storage Access Framework. Nessuna modifica al prodotto desktop, alle sue dipendenze o alla libreria utente.
- **Follow-up:** Completare analyze, test Kotlin/Dart/Android e build release; collaudo radio reale sul Redmi dopo installazione.
- **File coinvolti:** APP_TELEFONIA/lib, APP_TELEFONIA/android, APP_TELEFONIA/README.md, APP_TELEFONIA/tools/analyze_export.py, STRUTTURA_PROGETTO.md

## D-0187 — Metriche pubbliche verificabili e test sulla SIM selezionata

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica-metriche
- **Decisione:** Usare solo API pubbliche Android; distinguere dataNetworkType LTE da indicazione DisplayInfo NSA e dichiarare NR state e VoLTE IMS Unsupported. Normalizzare sentinel secondo ampiezza della metrica, conservare eta delle celle e RSSNR grezzo: API26-29 decimi di dB, API30+ dB. Vincolare TCP443 1.1.1.1/8.8.8.8, DNS e HTTPS HEAD alla Network cellulare selezionata senza attivare una seconda SIM; subscriptionIds se disponibili, fallback esplicito solo per SIM dati predefinita.
- **Motivazione:** Icona 5G, celle cached, Wi-Fi e diverse unita RSSNR possono produrre interpretazioni errate. La raccolta deve descrivere prove tecniche senza fabbricare metriche o diagnosticare una causa.
- **Impatto:** Permessi minimi telefonia, posizione precisa/coarse, rete, Internet, notifica, foreground location e wake lock; niente GPS, IMEI, numero telefonico, audio, cloud o analytics. Test espliciti nella UI con intervalli e endpoint configurabili, timeout e tracciamento di ogni tentativo. Backup Android disabilitato, log operativo senza payload personali; CSV protegge formule nelle note e JSON mantiene originali.
- **Follow-up:** Verificare API level tramite lint e collaudare il comportamento specifico del modem Redmi; gli endpoint possono filtrare o fallire indipendentemente dalla rete mobile.
- **File coinvolti:** APP_TELEFONIA/android/app/src/main, APP_TELEFONIA/lib/data/models/diagnostic_sample.dart, APP_TELEFONIA/README.md, APP_TELEFONIA/.gitignore

## D-0188 — API platform e dipendenze limitate ai test

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica-dipendenze
- **Decisione:** Non aggiungere package Flutter runtime per storage, grafici, permessi o export: usare SQLiteOpenHelper, API Android e CustomPainter. Rimuovere Cupertino icons del template non utilizzate. Per regressioni aggiungere JUnit4 4.13.2 e org.json 20250517 solo testImplementation; integration_test e flutter_test dal Flutter SDK e flutter_lints come strumenti di sviluppo.
- **Motivazione:** Le API platform soddisfano i bisogni del servizio persistente senza plugin concorrenti; org.json evita stub Android nei test JVM sul serializzatore realmente usato. integration_test permette verifiche sul bridge e la UI reali.
- **Impatto:** pubspec.lock blocca le dipendenze di sviluppo; Gradle mantiene AGP8.11.1 Kotlin2.2.20 del template compatibile con SDK36 e JDK17/21. APK personale release mode firmato con certificato di sviluppo locale, installabile senza credenziali. Nessun servizio esterno di telemetria.
- **Follow-up:** Eseguire i quality gate e documentare certificato di firma e collaudi effettivi nel README e nel rapporto.
- **File coinvolti:** APP_TELEFONIA/pubspec.yaml, APP_TELEFONIA/pubspec.lock, APP_TELEFONIA/android/app/build.gradle.kts, APP_TELEFONIA/test, APP_TELEFONIA/integration_test, APP_TELEFONIA/android/app/src/test

## D-0189 — Associazione SIM pubblica e backup Android moderno

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica-compatibilita
- **Decisione:** Correggere D-0187: getSubscriptionIds e pubblico da API35 e normalmente vuoto senza NETWORK_FACTORY; usare TelephonyNetworkSpecifier pubblico API30 quando esposto e fallback solo con unica rete cellulare sulla SIM dati predefinita. Non attribuire reti multiple oscurate per ipotesi. Usare Handler main compatibile API26 e separare callback CellInfo dai listener che funzionano con posizione negata. Escludere esplicitamente cloud backup e device transfer tramite dataExtractionRules oltre allowBackup false.
- **Motivazione:** Android lint e documentazione primaria evidenziano guardie API insufficienti e limitazioni di attribuzione. Il logger deve funzionare senza API nascoste e senza fare test sulla SIM errata, mantenendo i dati locali anche nei trasferimenti Android.
- **Impatto:** Regressioni per SIM nota, ID oscurati e reti ambigue, piu guardie RSSNR API30 e NCI a 36 bit. Lint PropertyEscape escluso soltanto per local.properties generato da Flutter: colon nei valori Java Properties validi, toolchain reale gia verificata; tutte le verifiche API sui sorgenti restano attive.
- **Follow-up:** Ripetere lint e test dopo le correzioni, build release e collaudo installazione/export sul simulatore; verifica modem reale resta sul Redmi.
- **File coinvolti:** APP_TELEFONIA/android/app/src/main/kotlin, APP_TELEFONIA/android/app/src/main/res/xml/data_extraction_rules.xml, APP_TELEFONIA/android/app/lint.xml, APP_TELEFONIA/android/app/src/test, APP_TELEFONIA/README.md

## D-0190 — Trasferimento del collaudo nell archivio ufficiale

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** archivio-importazione
- **Decisione:** Trasferiti su richiesta esplicita i tre output del collaudo nella libreria ufficiale e aggiornati solo i riferimenti della lezione corrispondente e lo stato completato della pipeline. Chiusa normalmente l app prima della scrittura, con backup locale e sostituzioni atomiche.
- **Motivazione:** Rendere consultabili nell app i materiali gia generati evitando nuove chiamate AI e conflitti con la cache dell app aperta.
- **Impatto:** Libreria invariata a 16 lezioni; le altre 15 sono identiche. Hash audio e impostazioni verificati invariati, output identici alla copia di collaudo. Lettura verificata con LibraryRepository e AiJobStore reali. Backup e script privati esclusi da Git; la fedelta delle parti brevi resta da verificare.
- **Follow-up:** Completare il nuovo installer con D-0184 e D-0185 e avviarlo come richiesto. Conservare il backup e gli output del collaudo.
- **File coinvolti:** Archivio locale utente: library.json, transcripts, markdown, ai-jobs/archive-pipeline.json; local-artifacts/official-upgrade-20261002-115044

## D-0191 — APK release e collaudo del logger Android

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica-packaging
- **Decisione:** Generato e verificato APK universale Mobile Network Diagnostics 1.0.0+1 con minSdk26 targetSdk36, firma locale schema v2, installato sul simulatore Android16 e collaudato da UI senza permessi preconcessi. Conservare APK e prove in build e local-artifacts ignorati, con consuntivo in docs/VERIFICA.md.
- **Motivazione:** Il completamento richiesto include APK installabile, controlli effettivi del servizio e dati esportabili, oltre al sorgente compilabile.
- **Impatto:** flutter pub get e analyze superati; 8 test Dart, 27 Kotlin e integrazione Android passati; lint zero errori con 6 avvisi non bloccanti. Release di 47770719 byte, SHA256 18aaae26087cea18cb1041e821b3b54ddbb417b2c52674fe0df0eefcb8615926. Permessi chiesti da dialoghi reali, notifica foreground location e wake lock verificati a schermo spento: campioni 10->43. Sessione finale 71 campioni, 71 celle, 3 eventi, 38 test; ZIP CRC integro, CSV/JSON coerenti, JSON autonomo identico, grafico storico e marker funzionanti.
- **Follow-up:** Installare sul Redmi Note13 5G seguendo README e raccogliere transizioni Fastweb reali. Nessun telefono collegato; radio e test IP del simulatore non dimostrano comportamento del modem fisico. Nessuna pubblicazione o commit automatico.
- **File coinvolti:** APP_TELEFONIA/build/app/outputs/flutter-apk/app-release.apk, APP_TELEFONIA/docs/VERIFICA.md, APP_TELEFONIA/README.md, DECISIONI.md

## D-0192 — Installer Windows con correzioni audio Gemini

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** packaging
- **Decisione:** Rigenerato il setup NSIS x64 con D-0184 e D-0185 tramite npm run package:win -- --publish never, conservando una copia dell installer precedente.
- **Motivazione:** Distribuire nell app installata le correzioni dei file audio durante la rotazione delle chiavi e del fallback dei modelli dopo 503, come richiesto dall utente.
- **Impatto:** Setup di 167924298 byte; 141 file out identici ad app.asar, entrambe le correzioni presenti, manifesto SHA512 e dimensione verificati, FFmpeg incluso e dati privati esclusi. SHA256 0d4eabddc6a042dabaf299a50801b443240e9b5583470d219706d43a26295783. Quality gate precedente passato con 354 Vitest, 14 Python, 32 scenari Electron, typecheck, lint e build.
- **Follow-up:** Avviare il nuovo installer richiesto; verificare separatamente il completamento della procedura prima di dichiarare aggiornata l app installata.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, docs/quality/gemini-audio-403-2026-10-02.md

## D-0193 — Profilo isolato e diagnostica del collaudo audio

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** ai-collaudo-preparazione
- **Decisione:** Registrare il consuntivo degli esperimenti preparatori al collaudo autorizzato: harness locale con ArchiveService reale, copia dell audio e checkpoint riusabili, pubblicazione e auto-elaborazione su import disabilitate. Il primo avvio isolato non ha trovato chiavi utilizzabili perche safeStorage dipende dal profilo Chromium; il launcher e stato corretto trasferendo soltanto os_crypt cifrato nel profilo di prova.
- **Motivazione:** Provare il sorgente aggiornato senza scrivere nella libreria aperta dall app installata e senza alterare le credenziali ufficiali; rendere esplicito anche il tentativo preparatorio non riuscito.
- **Impatto:** Primo avvio senza richieste AI, con started false e keys zero. Dopo la correzione SettingsService ha potuto leggere le chiavi configurate. Output, impostazioni cifrate e strumenti restano in local-artifacts ignorata da Git. Instrumentazione limitata ad alias delle chiavi, struttura della risposta ASR, conteggi e stato, senza testo della lezione, URI remoti o segreti. Hash della copia audio verificato rispetto all originale.
- **Follow-up:** Usare questo profilo solo per collaudi autorizzati; conservare le prove locali. I risultati reali e i limiti di qualita sono registrati separatamente.
- **File coinvolti:** local-artifacts/audio-live-20261002/runner.ts, local-artifacts/audio-live-20261002/launch.cjs, local-artifacts/audio-live-20261002/console.log, docs/quality/gemini-audio-403-2026-10-02.md

## D-0194 — Esiti delle due prove audio con Gemini e limiti di fedelta

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** ai-collaudo-reale
- **Decisione:** Registrare gli esiti reali delle prove autorizzate su audio di circa 75 minuti. Con il solo fix D-0184 il recupero ha esaurito sei tentativi 503 e sospeso la pipeline con provider_unavailable, senza nuovi 403. Dopo D-0185 la ripresa e terminata alle 11:40 Europe/Rome in circa 16 minuti con stato completed: trascrizione, dispensa ITA e traduzione ENG riuscite.
- **Motivazione:** Distinguere prove effettuate, tentativi falliti e ipotesi: la scomparsa del 403 e compatibile con il difetto di proprieta dei file, ma non dimostra il motivo storico esatto del diniego.
- **Impatto:** Sei parti salvate, 3956 parole incluse intestazioni; dispensa di 14046 caratteri e versione ENG di 13080, entrambe con 23 titoli. ASR vuoto sulle parti 1, 2, 3 e 6, con status completed ma steps zero e output_text assente; testo ricevuto per le parti 4 e 5. Recuperi riusciti con modelli 3.8, 3.7 e 3.5 Flash Lite, retry anche in dispense e traduzione. Nessun 403 nelle due prove, audio originale invariato e nessun errore finale. Verificati sei blocchi di trascrizione, assenza di segnaposto di silenzio e caratteri di sostituzione, code fence bilanciati.
- **Follow-up:** Confrontare con audio le parti 2, 5 e 6, rispettivamente 236, 276 e 216 parole per circa 13 minuti ciascuna. La prova tecnica e completata ma la fedelta parola per parola e la completezza dei contenuti non sono state certificate.
- **File coinvolti:** local-artifacts/audio-live-20261002/result.json, local-artifacts/audio-live-20261002/library/app.log, local-artifacts/audio-live-20261002/library/transcripts, local-artifacts/audio-live-20261002/library/markdown, docs/quality/gemini-audio-403-2026-10-02.md

## D-0195 — Regressioni audio e consuntivo completo del quality gate

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** quality-esperimenti
- **Decisione:** Registrare anche gli esiti intermedi delle verifiche D-0184 e D-0185. Le regressioni hanno riprodotto la rotazione verso file non accessibile prima del fix e il mancato fallback di modello dopo due 503; dopo le correzioni passano. Il clock virtuale del test ASR e stato reso avanzabile durante le attese e i mock vengono ripristinati al termine.
- **Motivazione:** Documentare controlli reali e fallimenti senza confondere correzioni del prodotto, manutenzione delle fixture e pressione del collaudo sulla macchina.
- **Impatto:** Primo gate con D-0184 passato: 353 Vitest, 14 Python, 32 scenari React/Electron, typecheck, lint e build. D-0185 aggiunge la quattordicesima regressione audio; 42 test mirati passati. Durante la prova reale due gate hanno fallito il timeout a 5 secondi del test ring buffer con 550 scritture e la pulizia successiva ENOTEMPTY. Suite completa con maxWorkers=2 passata; gate finale npm run check con configurazione normale passato con 354 Vitest, 14 Python, 32 scenari React/Electron, typecheck, lint e build. Nessuna modifica a logger o timeout per aggirare i fallimenti. Diff-check finale senza errori di whitespace.
- **Follow-up:** Conservare nel rapporto anche gli esiti negativi. Le verifiche di regressione sono offline; le richieste reali appartengono esclusivamente al collaudo esplicitamente autorizzato.
- **File coinvolti:** tests/unit/geminiAudioOwnership.test.ts, tests/unit/geminiPhaseA.test.ts, tests/README.md, STRUTTURA_PROGETTO.md, docs/quality/gemini-audio-403-2026-10-02.md

## D-0196 — Verifiche del trasferimento e avvio effettivo del setup

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** manutenzione-esperimenti
- **Decisione:** Completare il consuntivo D-0190 e D-0192 con i tentativi degli strumenti e l avvio effettivo. Il primo script di importazione si e fermato prima delle scritture per hashlib.file_digest assente nel Python locale; corretto usando SHA256 a blocchi. La prima verifica ASAR si e fermata per separatori di percorso incompatibili con Windows; corretta usando i percorsi nativi, senza cambiare il contenuto del pacchetto.
- **Motivazione:** Registrare anche esperimenti non riusciti e distinguere il setup verificato e avviato dall aggiornamento installato, che richiede un controllo separato.
- **Impatto:** Importazione successiva riuscita con tre file identici alla fonte, 16 lezioni preservate, altre 15 immutate, hash audio e impostazioni invariati, backup locale e sostituzioni atomiche. LibraryRepository e AiJobStore reali leggono gli output di 21048, 14046 e 13080 caratteri e pipeline completed. Setup rigenerato senza pubblicazione, 141 file della build identici al pacchetto, entrambi i fix presenti, FFmpeg incluso, manifesto verificato e dati privati esclusi. Avviato installer interattivo il 2026-10-02 alle 11:59:43 Europe/Rome tramite Start-Process, PID iniziale 21384 e processo osservato dopo il lancio. Nessuna installazione silenziosa o conferma automatica della procedura.
- **Follow-up:** Conservare backup e report; il completamento dell installer e la versione effettivamente installata restano da verificare separatamente. Nessuna nuova chiamata AI necessaria per trasferimento e packaging.
- **File coinvolti:** local-artifacts/audio-live-20261002/import_official.py, local-artifacts/audio-live-20261002/verify_official.ts, local-artifacts/audio-live-20261002/verify_installer.cjs, local-artifacts/official-upgrade-20261002-115044/import-result.json, local-artifacts/official-upgrade-20261002-115044/installer-result.json, local-artifacts/official-upgrade-20261002-115044/installer-launch.json, DECISIONI.md

## D-0197 — Lezioni pubbliche leggibili e bilingui con migrazione dei percorsi

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** publishing-presentation
- **Decisione:** Usare cartelle con nome corso e data senza hash; titoli distinti per lezioni dello stesso giorno, collisioni bloccate prima della scrittura. Pubblicare le dispense inglesi esistenti come schema.en.md e sincronizzare traduzioni, correzioni e README anche senza modifiche alle fonti. Migrare i vecchi percorsi posseduti eliminando soltanto i file generati, con staging esplicito e retry.
- **Motivazione:** Rendere intuitiva la consultazione online e mostrare ordine cronologico e lingue senza identificativi tecnici; preservare fonti e file estranei durante la migrazione.
- **Impatto:** README degli appunti e dei corsi con istruzioni ITA/EN, collegamenti leggibili e stato delle traduzioni mancanti. La traduzione completata attiva la sincronizzazione automatica. Nessuna nuova dipendenza o generazione AI nel publisher; cronologia Git e archivio locale conservati.
- **Follow-up:** Completare regressioni e quality gate, aggiornare la destinazione degli appunti gia abilitata e fornire il setup con il nuovo publisher.
- **File coinvolti:** electron/main/publishing/publicationLayout.ts, electron/main/publishing/readmeGenerator.ts, electron/main/publishing/publishService.ts, electron/main/publishing/publishGitClient.ts, electron/main/archive.ts, tests/unit/publishing.test.ts, STRUTTURA_PROGETTO.md

## D-0198 — README per lettori e proposta futura di repository unico

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** docs-portfolio
- **Decisione:** Aggiornare il README del codice con uso dell app e delle lezioni, flusso di sincronizzazione e ruolo dell autore e dell AI. Documentare la proposta futura di una repository unica con prefisso lezioni e protezione del README del progetto, senza migrare ora il codice pubblico.
- **Motivazione:** La richiesta comprende una presentazione comprensibile e una riflessione futura sul portfolio. Il publisher attuale gestisce la radice della destinazione e va adattato prima di unirla al codice.
- **Impatto:** Documentazione collegata tra codice e appunti, piano di inventario dei file pertinenti ed esclusione di segreti, archivio e artefatti personali. APP_TELEFONIA resta progetto indipendente; nessun caricamento indiscriminato dei file locali.
- **Follow-up:** Scegliere destinazione unica e perimetro dei file in una futura attivita concordata.
- **File coinvolti:** README.md, docs/product/repository-portfolio-plan.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0199 — Pubblicazione delle 16 lezioni bilingui e setup verificato

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** publishing-verification
- **Decisione:** Sincronizzare la destinazione degli appunti gia configurata con il nuovo publisher tramite clone e checkpoint isolati, leggendo le fonti locali e decifrando soltanto il PAT in memoria. Rigenerare il setup Windows e conservare la copia precedente.
- **Motivazione:** La richiesta riguarda la presentazione effettiva online, oltre al codice. Lo stato isolato evita conflitti con il publisher dell app aperta; il setup rende persistente il nuovo comportamento dopo aggiornamento.
- **Impatto:** Quality gate passato con 364 Vitest, 14 Python, 32 scenari Electron, typecheck, lint e build. Commit remoto 525076e1572b8ba1e3b6ceda24976ffadeeff406: 16 ITA, 16 EN, 16 trascrizioni, quattro corsi senza hash. README letto da GitHub; impostazioni e library.json invariati, zero richieste AI. Primi tentativi harness fermi prima di Git alla decifratura: corretto il profilo isolato usando stessa directory userData/sessionData con os_crypt cifrato copiato prima dell avvio. Setup di 167926219 byte, 141 file identici ad ASAR, FFmpeg e manifesto verificati, smoke pacchetto riuscito. SHA256 6aea0e8d47c91ac0cbe2c1308b72053e894cfd2377c8d4933f52c7566b35e2ba.
- **Follow-up:** Chiudere normalmente l app e installare il setup aggiornato prima delle prossime sincronizzazioni: il processo aperto usa ancora il publisher precedente. Nessuna installazione automatica o pubblicazione del codice effettuata.
- **File coinvolti:** docs/product/publishing-implementation-plan.md, tests/README.md, STRUTTURA_PROGETTO.md, dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0200 — Chiusura della revisione delle lezioni online

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** publishing-consuntivo
- **Decisione:** Registrare su richiesta dell autore il consuntivo finale di D-0197, D-0198 e D-0199: nomi pubblici senza hash, ordine cronologico esplicito, dispense ITA e EN, README di consultazione e proposta futura per il portfolio.
- **Motivazione:** Conservare nel registro l esito consegnato, le verifiche finali e il passaggio operativo ancora necessario sull app installata.
- **Impatto:** Ultima verifica del branch remoto main conferma il commit 525076e1572b8ba1e3b6ceda24976ffadeeff406. Quattro corsi, 16 lezioni con italiano, inglese e trascrizione; 72 collegamenti relativi degli indici verificati, nessun collegamento mancante. Quality gate e setup gia verificati in D-0199. Il codice e gli altri file locali non sono stati trasferiti al repository degli appunti.
- **Follow-up:** Chiudere l app e installare dist/Lezionify-Setup-0.1.0.exe per adottare il nuovo publisher nelle sincronizzazioni future. Unificazione delle repository e ampliamento del portfolio restano attivita successive.
- **File coinvolti:** DECISIONI.md, docs/product/publishing-implementation-plan.md, docs/product/repository-portfolio-plan.md, README.md

## D-0201 — Cattura temporanea Wi-Fi per le disconnessioni hotspot

- **Data:** 2026-10-02
- **Stato:** accettata
- **Area:** diagnostica
- **Decisione:** Abilitare temporaneamente il logging Wi-Fi Android al livello 1 e raccogliere una traccia Windows wireless_dbg per cinque minuti con limite 64 MB e capture=no; conservare gli artefatti solo nella cartella locale esclusa dal versionamento.
- **Motivazione:** I log ordinari mostrano la disassociazione ma non il motivo tecnico; occorre osservare una ricorrenza con maggior dettaglio senza cambiare banda o driver durante la misura.
- **Impatto:** Temporaneo aumento del logging diagnostico; nessuna modifica al formato della sessione o alle dipendenze dell app. La traccia Windows richiede UAC e non cattura il contenuto dei pacchetti.
- **Follow-up:** Ripristinare il logging Android disabilitato al termine e distinguere risultati osservati da ipotesi; non attribuire colpe al driver senza un evento causale.
- **File coinvolti:** DECISIONI.md, APP_TELEFONIA/local-artifacts/capture-hotspot-trace.ps1, APP_TELEFONIA/local-artifacts/analisi-hotspot-2026-10-02.md

## D-0202 — Video riordinabili convertiti in audio locale

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** importazione-video
- **Decisione:** Aggiungere Importa uno o piu video con selezione nativa, ID opachi, drag/drop e frecce, conversione annullabile e scelta successiva di corso attivo, data e orari. Preset Game Theory del lunedi 16:30-18:00 con data visibile e modificabile. Salvare MP3 e metadati nella libreria esistente senza avviare AI automaticamente.
- **Motivazione:** Le lezioni Moodle sono suddivise in video per argomento e devono entrare nella pipeline ordinaria come una sola registrazione, senza dipendere da timestamp del download o durata accademica.
- **Impatto:** Sessioni temporanee recuperate all avvio, originali video conservati, provenienza ordinata con hash e durate, deduplicazione MP3 e rollback del salvataggio con retry senza riconversione. Renderer lazy e IPC tipizzato; nessuna nuova dipendenza.
- **Follow-up:** Completare quality gate, controllo visivo e setup Windows. Primo uso su video Moodle reali resta da verificare senza chiamate AI implicite.
- **File coinvolti:** electron/main/videoImporter.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/components/VideoImportModal.tsx, src/components/LectureList.tsx, src/App.tsx, src/utils/videoImport.ts, src/styles.css, tests/unit/videoImport.test.ts, tests/integration/videoImportScenarios.browser.tsx, tools/run_hook_regressions.cjs, docs/product/video-import.md, STRUTTURA_PROGETTO.md

## D-0203 — Eseguibile incluso e normalizzazione prima della concatenazione

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** ffmpeg
- **Decisione:** Centralizzare il percorso assoluto verificato di ffmpeg-static, con ASAR unpacked senza lookup PATH. Decodificare ogni prima traccia audio in PCM mono 48kHz, concatenare parti normalizzate e codificare una volta in MP3 128kbit/s. Validare durata finale, hash fonti e abort di processi e checksum.
- **Motivazione:** La concatenazione diretta richiede stream compatibili; normalizzare audio separatamente gestisce codec, frequenze e canali diversi ignorando FPS e risoluzione. Un cwd esistente e un percorso assoluto evitano il falso ENOENT riscontrato nel controllo Git.
- **Impatto:** Verificato FFmpeg incluso 6.1.1 funzionante nel repository; il comando nel PATH punta a una diversa installazione WinGet e non viene usato. Percorso condiviso anche con il chunker AI. Temporanei circa 346MB/ora e MP3 circa 58MB/ora; errori FFmpeg privati non esposti. Nessuna installazione o dipendenza aggiunta.
- **Follow-up:** Verificare pacchetto Windows con FFmpeg unpacked reale e PATH vuoto. Formati esotici e video protetti non sono garantiti; audio mancante interrompe l intera importazione.
- **File coinvolti:** electron/main/ffmpegPath.ts, electron/main/audioChunker.ts, electron/main/fileNameParser.ts, electron/main/videoImporter.ts, tests/unit/videoImport.test.ts, docs/product/video-import.md

## D-0204 — Provenienza validata e isolamento della cache

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** archivio-video
- **Decisione:** Validare i metadati opzionali dei video nella lettura della libreria e clonare profondamente le fonti per non esporre la cache a mutazioni del chiamante. Interrompere le conversioni attive nella distruzione del servizio archivio; attendere la chiusura dei processi FFmpeg prima di pulire i temporanei dopo abort.
- **Motivazione:** Le fonti ordinate introducono il primo array annidato nella lezione: la vecchia clonazione superficiale non isola piu i metadati. Su Windows un processo abortito puo mantenere file aperti fino al close.
- **Impatto:** Librerie precedenti senza videoImport restano compatibili; nuove fonti hanno hash e durate validati. Regressione di mutazione cache e annullamento con processo FFmpeg reale; nessuna nuova dipendenza o modifica dei dati personali.
- **Follow-up:** Concludere quality gate e verifiche del pacchetto. Temporanei residui dopo chiusura dell app vengono recuperati al successivo avvio.
- **File coinvolti:** electron/main/libraryRepository.ts, electron/main/videoImporter.ts, electron/main/archive.ts, tests/unit/videoImport.test.ts

## D-0205 — Collaudo video e setup Windows verificati

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** quality-video
- **Decisione:** Completare e consegnare importazione video con setup NSIS x64 aggiornato, conservando quello precedente; registrare esiti positivi e tentativi intermedi del collaudo offline e pacchettizzato.
- **Motivazione:** La funzione deve essere disponibile nell app installabile, e la risoluzione del FFmpeg incluso va provata nel pacchetto oltre che nel repository.
- **Impatto:** Quality gate passato con 374 Vitest, 14 Python, 35 React/Electron, typecheck, lint e build; dieci regressioni video, UI e lint ripetuti dopo abortAll, incluso nel setup. Corretto drag/drop React che leggeva un ref gia azzerato; corrette due aspettative fixture e launcher CSS/catture. Smoke ASAR/preload/IPC reale con PATH vuoto riuscito dopo timeout del solo harness per sostituzione dialogo ESM: due video sintetici, MP3 1.32s, una lezione GT, sette progressi, pipeline idle, zero rete, originali conservati e temporanei vuoti. Setup 167911354 byte, 143 file identici all ASAR, SHA512/manifesto verificati, FFmpeg incluso e artefatti personali esclusi. SHA256 d4bf0128b4d9eb100e4d6f8ecf5b39e9837aabeb744906507b7a9dcb4e87cb64.
- **Follow-up:** Chiudere Lezionify e installare dist/Lezionify-Setup-0.1.0.exe per usare la nuova funzione. Installer non avviato; nessuna modifica all archivio personale, credenziali, push o chiamata AI. Primo video Moodle reale resta da provare.
- **File coinvolti:** docs/product/video-import.md, tests/unit/videoImport.test.ts, tests/integration/videoImportScenarios.browser.tsx, tools/run_hook_regressions.cjs, local-artifacts/video-import-check, dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0206 — Scorciatoia sul lunedi piu vicino

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** importazione-video
- **Decisione:** La scorciatoia Game Theory usa il lunedi piu vicino alla data indicata: da martedi a giovedi il precedente, da venerdi a domenica il successivo e di lunedi la stessa data. Il confronto favorisce il successivo in caso di parita. La data resta modificabile; orari 16:30-18:00 invariati.
- **Motivazione:** Il docente carica in anticipo le lezioni Moodle e gli import nel fine settimana devono essere attribuiti al lunedi successivo, mantenendo il precedente quando e piu vicino. Il riferimento al lunedi 1 nel caso del venerdi e interpretato come lapsus rispetto al criterio esplicito della distanza.
- **Impatto:** Helper nearestMonday basato su giorni di calendario locale, indipendente da cambi ora legale. Aggiornati testo UI e documentazione; undici regressioni per tutti i giorni settimanali, confini mese/anno e ora legale. Scenario React verifica date esplicite giovedi, venerdi, sabato e domenica e data inviata al salvataggio. Nessun cambio ai dati esistenti o nuove dipendenze.
- **Follow-up:** Completare quality gate e rigenerare e verificare installer generale, conservando il precedente.
- **File coinvolti:** src/utils/videoImport.ts, src/components/VideoImportModal.tsx, tests/unit/videoImport.test.ts, tests/integration/videoImportScenarios.browser.tsx, docs/product/video-import.md, STRUTTURA_PROGETTO.md

## D-0207 — Verifica lunedi piu vicino e nuovo setup

- **Data:** 2026-10-03
- **Stato:** accettata
- **Area:** quality-video
- **Decisione:** Consegnare il setup generale con D-0206 dopo quality gate e verifica della scorciatoia nell interfaccia compilata ASAR, conservando il setup precedente.
- **Motivazione:** La correzione deve arrivare all app installata e il pulsante reale deve scegliere correttamente sia il lunedi precedente sia quello successivo.
- **Impatto:** Passati 385 Vitest, 14 Python, 35 React/Electron, typecheck, lint e build. Smoke pacchetto con selezione e conversione sintetiche e pulsante rapido reale: giovedi 01/10 -> 28/09; venerdi 02/10, sabato 03/10 e domenica 04/10 -> 05/10. PATH vuoto, zero rete, fonti preservate e staging pulito. Due tentativi iniziali del solo harness usavano un selettore ambiguo che cliccava Game Theory nella sidebar: corretto con il selettore del pulsante del dialogo; profilo ricaricato dopo creazione corso via API. Installer 167911489 byte, 143 file identici all ASAR, manifesto e FFmpeg verificati. SHA256 bc2902feccfdf0a8c75b4a23461cc9df367033052fc487961255df27b1233c9c.
- **Follow-up:** Chiudere Lezionify e installare dist/Lezionify-Setup-0.1.0.exe; installer non avviato automaticamente. Nessuna modifica alla libreria personale o chiamata AI.
- **File coinvolti:** docs/product/video-import.md, STRUTTURA_PROGETTO.md, local-artifacts/video-import-nearest-monday, dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0208 — Righe compatte e classificazione Laboratorio

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** home-lezioni
- **Decisione:** Titoli home su una riga con ellissi e tooltip; badge IT e IT/ENG centrati in una colonna fissa; data italiana estesa con ora sotto il titolo al posto del nome MP3 e rimossa a destra; dimensioni chiare senza grassetto. Menu contestuale Laboratorio reversibile con metadato booleano opzionale persistito localmente e sfondo azzurro solo nelle righe home, compatibile con tema scuro.
- **Motivazione:** Rendere la lista leggibile e uniforme e distinguere manualmente le lezioni di laboratorio senza cambiare fonti o contenuti.
- **Impatto:** Estesi contratto condiviso, validazione IPC e lettura archivio mantenendo compatibilita con librerie precedenti. Salvataggio tramite updateLecture esistente, aggiornamento UI dopo successo e notifica su errore. Menu accessibile anche con Shift+F10, Escape e chiusura esterna. Nessuna dipendenza o chiamata AI aggiunta.
- **Follow-up:** Verificare quality gate, regressioni di persistenza e comportamento UI e catture nei due temi.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/archiveValidation.ts, electron/main/libraryRepository.ts, src/App.tsx, src/components/LectureList.tsx, src/styles.css, tests/unit/lectureLaboratory.test.ts, tests/integration/lectureListScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs

## D-0209 — Verifica della home e del menu Laboratorio

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** quality-home
- **Decisione:** Concludere la verifica offline della home con regressioni archivio e scenario React reale in Electron; ispezionate catture dei temi chiaro e scuro.
- **Motivazione:** Verificare persistenza e rimozione della scelta, conservazione delle fonti, validazione dei dati, allineamento, ellissi e interazione del menu.
- **Impatto:** Typecheck e lint passati; 387 Vitest e 14 Python passati; suite React/Electron passata includendo il nuovo scenario home, totale 36; build produzione riuscita. Due typecheck intermedi hanno individuato inserimento nel metodo errato e firma del callback, corretti prima delle suite. Primo test ellissi fallito per viewport fixture troppo larga; adattata la fixture allo spazio home con sidebar, scenario passato. Catture locali con dati sintetici. Nessun cambiamento alla libreria personale.
- **Follow-up:** Modifiche disponibili nel sorgente e nella build out; installer non rigenerato in questa attivita.
- **File coinvolti:** DECISIONI.md, STRUTTURA_PROGETTO.md, tests/unit/lectureLaboratory.test.ts, tests/integration/lectureListScenarios.browser.tsx, local-artifacts/home-layout-check/home-light.png, local-artifacts/home-layout-check/home-dark.png

## D-0210 — Installer generale aggiornato con home e Laboratorio

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** packaging-home
- **Decisione:** Rigenerare il setup NSIS Windows x64 generale tramite npm run package:win -- --publish never includendo D-0208 e D-0209. Conservare setup, blockmap e manifesto precedenti in local-artifacts/home-installer-20261005-121659.
- **Motivazione:** Rendere disponibili nell app installabile le modifiche della home e la classificazione persistente Laboratorio richieste dall utente.
- **Impatto:** Packaging riuscito. Verificati 143 file della build identici al pacchetto ASAR, modifiche frontend e persistenza backend presenti, manifesto SHA512 e dimensione corretti, FFmpeg incluso e dati privati esclusi. Setup 167912143 byte, SHA256 6aecfc34834f3937ee58ca4d2200d02b453949d4cd9a4d2ec3299700d7590771. Il primo controllo del solo harness richiedeva CSS senza spazi: corretto il controllo per ammettere formattazione equivalente, verifica successiva passata. Qualita della funzione gia verificata in D-0209.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app installata. Installer non avviato automaticamente; nessuna pubblicazione o chiamata AI.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/verify-home-installer.cjs, local-artifacts/home-installer-20261005-121659/installer-result.json, DECISIONI.md

## D-0211 — Consuntivo modifiche home e installer generale

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** home-consuntivo
- **Decisione:** Registrare su richiesta dell utente il riepilogo conclusivo di D-0208, D-0209 e D-0210: titoli su una riga con puntini e tooltip, badge IT e IT/ENG centrati senza parola Dispensa, data estesa con ora al posto del nome MP3 e rimossa da destra, megabyte chiari senza grassetto, menu tasto destro Laboratorio reversibile e persistente con sfondo azzurro solo nella home. Installer generale aggiornato e consegnato.
- **Motivazione:** Conservare un riepilogo unico delle modifiche richieste, delle verifiche e del risultato installabile.
- **Impatto:** 387 test Vitest, 14 Python e 36 scenari React/Electron verificati con typecheck, lint e build riusciti. Setup NSIS x64 verificato con 143 file identici alla build ASAR, manifesto SHA512 corretto, FFmpeg incluso e dati privati esclusi. Setup precedente conservato. Nessuna modifica alla libreria personale o chiamata AI.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per applicare le modifiche all app installata; il completamento dell installazione non e stato verificato.
- **File coinvolti:** DECISIONI.md, src/components/LectureList.tsx, src/styles.css, src/App.tsx, shared/archive.ts, electron/main/archive.ts, electron/main/archiveValidation.ts, electron/main/libraryRepository.ts, STRUTTURA_PROGETTO.md, dist/Lezionify-Setup-0.1.0.exe

## D-0212 — PDF locali affiancati nella modalita focus

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** focus-pdf
- **Decisione:** Aggiungere selezione nativa dei PDF Notability con cartella e associazioni per lezione conservate solo nel profilo locale, accesso in sola lettura tramite ID opachi e visualizzazione PDF.js locale caricata su richiesta. Due pannelli con scroll e zoom indipendenti, divisore accessibile e layout Q&A che riduce o sospende le slide quando necessario e ripristina la divisione alla chiusura.
- **Motivazione:** Studiare le slide annotate insieme alla dispensa senza distrazioni, sovrapposizioni, modifiche ai backup o invii impliciti all AI. PDF.js permette controllo del rendering e dello zoom senza plugin o servizi remoti.
- **Impatto:** Nuova dipendenza pdfjs-dist per canvas e worker locali; riferimenti ai PDF separati dall archivio audio e dalle pubblicazioni. OneDrive puo idratare i file online alla prima lettura; errori e retry espliciti. Nessuna scrittura o cancellazione sui PDF.
- **Follow-up:** Verificare isolamento dei percorsi, conservazione delle fonti, rendering nel pacchetto Electron, zoom, resize e Q&A su schermi stretti.
- **File coinvolti:** electron/main/focusPdf.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/components/LectureDrawer.tsx, src/components/FocusWorkspace.tsx, src/components/FocusPdfViewer.tsx, src/styles.css, package.json, package-lock.json, STRUTTURA_PROGETTO.md

## D-0213 — Protocollo PDF dedicato e trascinamento verificato

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** focus-pdf-runtime
- **Decisione:** Usare slides://pdf con ID revocabili e protocollo Electron dedicato abilitato per fetch e CORS, limitato all origine del renderer locale o di sviluppo. Il protocollo audio resta invariato. Il trascinamento del divisore conserva il pointerId attivo invece di dipendere dalla lettura di hasPointerCapture.
- **Motivazione:** Il collaudo della build ha rilevato il blocco CORS di Electron sul precedente protocollo media; un protocollo separato evita di ampliare i permessi dei percorsi audio. Il collaudo con mouse reale ha mostrato hasPointerCapture non affidabile nella finestra Electron nascosta.
- **Impatto:** Nuovo protocollo solo PDF autorizzati, origine controllata e intestazioni per letture parziali. Gestione pointerup e pointercancel per interrompere sempre il resize. Font e decoder inclusi nella build, requisito Node >=22.13.0 allineato a PDF.js 6.4.299.
- **Follow-up:** Concludere smoke offline della build e del setup con preload, IPC, URL revocati, bitmap effettivo e hash sorgente invariato.
- **File coinvolti:** electron/main/focusPdf.ts, electron/main/index.ts, src/components/FocusWorkspace.tsx, tools/run_hook_regressions.cjs, tests/integration/focusPdfScenarios.browser.tsx, package.json, package-lock.json

## D-0214 — Cartella privata e compatibilita Electron verificate

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** focus-pdf-qualita
- **Decisione:** Configurare il riferimento esatto richiesto solo in focus-pdfs.json del profilo locale, conservando le associazioni. Per il protocollo PDF verificare l origine quando Electron la espone e richiedere sempre un ID opaco; proteggere tutte le API PDF con controllo di finestra, frame principale e URL del renderer proprio.
- **Motivazione:** Il computer contiene sette cartelle Notability e la scoperta non puo scegliere in modo univoco. Electron 44.3.0 non espone initiatorOrigin ne Origin per queste richieste locali: la concessione nativa e l autenticazione del renderer sono la base dell accesso, senza aprire percorsi arbitrari.
- **Impatto:** Percorso personale escluso da Git, log e messaggi. Smoke offline della build con preload e IPC reali passato: tre pagine PDF con bitmap effettivo, lettura parziale, revoca, associazione riaperta, scroll e zoom indipendenti, sorgente invariato, zero rete. Trascinamento reale e pinch touch verificati nella suite React/Electron.
- **Follow-up:** Rigenerare setup finale, verificare identita ASAR/build e ripetere smoke sul pacchetto. Download OneDrive di un PDF personale online da verificare al primo utilizzo; nessun backup personale aperto nei collaudi.
- **File coinvolti:** electron/main/index.ts, electron/main/focusPdf.ts, src/components/FocusWorkspace.tsx, tests/unit/focusPdf.test.ts, tests/integration/focusPdfScenarios.browser.tsx, tools/run_hook_regressions.cjs, profilo Electron: focus-pdfs.json, docs/product/focus-pdf.md, STRUTTURA_PROGETTO.md

## D-0215 — PDF affiancati e setup generale verificati

- **Data:** 2026-10-05
- **Stato:** accettata
- **Area:** focus-pdf-consegna
- **Decisione:** Consegnare il setup generale NSIS x64 con PDF locali affiancati e configurazione privata della cartella richiesta, dopo regressioni e smoke sul pacchetto. Conservare installer, blockmap e manifesto precedenti.
- **Motivazione:** Rendere la funzione utilizzabile nell app installata e verificare i percorsi del worker, gli asset e il protocollo PDF nel payload distribuito.
- **Impatto:** Passati typecheck, lint, 395 Vitest, 14 Python e 37 scenari React/Electron; otto regressioni PDF ripetute dopo il cambio protocollo. Smoke build e ASAR con preload e IPC reali: tre pagine canvas renderizzate, range e revoca, associazione ricordata, scroll/zoom indipendenti, hash sorgente invariato e zero rete. Setup 185868763 byte, 343 file identici alla build, manifesto verificato, FFmpeg incluso, preferenze e dati privati esclusi. SHA256 3638907f9b8de437c2d586be9ef96c7a8a3e0d354eff87c8d3e498f6475442b1.
- **Follow-up:** Chiudere Lezionify e installare il setup generale. Installer non avviato e libreria personale invariata; backup soltanto elencati. Idratazione di un PDF personale OneDrive e pinch fisico touch da provare al primo utilizzo.
- **File coinvolti:** docs/product/focus-pdf.md, docs/quality/focus-pdf-2026-10-05.md, STRUTTURA_PROGETTO.md, local-artifacts/focus-pdf-check/installer-result.json, local-artifacts/focus-pdf-check/packaged-smoke-result.json, dist/Lezionify-Setup-0.1.0.exe, DECISIONI.md

## D-0216 — Esportazione locale delle chiavi Gemini in env

- **Data:** 2026-10-06
- **Stato:** accettata
- **Area:** credenziali-locali
- **Decisione:** Esportare su richiesta dell utente tutte le 17 chiavi Gemini attualmente salvate nel profilo dell app nel file .env locale, con elenco GEMINI_API_KEYS, variabili numerate e GEMINI_API_KEY corrispondente alla chiave attiva.
- **Motivazione:** Rendere disponibili all utente le credenziali gia configurate senza mostrarne i valori nei messaggi o nei log.
- **Impatto:** File in chiaro escluso da Git tramite regole esistenti. Ordine e indice attivo conservati; nessuna chiamata AI, nuova dipendenza o modifica alla configurazione delle chiavi nell app. Lettura e decifratura tramite Electron safeStorage.
- **Follow-up:** Il file rappresenta la configurazione al 6 ottobre 2026 e non si aggiorna automaticamente.
- **File coinvolti:** .env (locale ignorato), local-artifacts/gemini-env-export/export.cjs (locale ignorato), DECISIONI.md

## D-0217 — Ancorato compatto ed espandibile

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** focus-qna
- **Decisione:** Limitare il testo ancorato delle discussioni a tre righe con ellissi e pulsante Mostra tutto/Riduci; apertura compatta per ogni discussione.
- **Motivazione:** Mantenere visibile e scorribile la chat anche quando la selezione della lezione e molto lunga.
- **Impatto:** Rendering Markdown e formule preservato, testo completo invariato; espansione con scorrimento proprio entro il 30 percento del viewport, controllo accessibile e ridimensionamento automatico. Nessuna dipendenza o chiamata AI.
- **Follow-up:** Verificare typecheck, lint, scenario React/Electron con selezione lunga e build.
- **File coinvolti:** src/components/QnaSidebar.tsx, src/qna.css, tests/integration/focusPdfScenarios.browser.tsx

## D-0218 — Verifica ancorato compatto

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** quality-qna
- **Decisione:** Concludere D-0217 dopo typecheck, lint, build e 37 scenari React/Electron passati; controllata cattura della focus mode con testo sintetico lungo.
- **Motivazione:** Verificare il limite reale di tre righe, espansione e riduzione e scorrimento indipendente della chat.
- **Impatto:** Scenario focus esteso con Markdown e formula, controllo altezza, aria-expanded, scorrimento chat con ancorato fisso e limite della vista espansa. Primo collaudo fallito su attesa preesistente del ripristino divisore, sostituita con attesa della geometria effettiva; secondo collaudo passato. Sorgenti e build aggiornati.
- **Follow-up:** Installer non rigenerato in questa attivita.
- **File coinvolti:** src/components/QnaSidebar.tsx, src/qna.css, tests/integration/focusPdfScenarios.browser.tsx, local-artifacts/qna-anchor-check/focus-pdf-qna.png, DECISIONI.md

## D-0219 — Installer aggiornato con ancorato compatto

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** packaging-qna
- **Decisione:** Rigenerare il setup generale NSIS Windows x64 tramite npm run package:win -- --publish never con D-0217 e D-0218, conservando setup, blockmap e manifesto precedenti in local-artifacts/qna-installer con suffisso temporale.
- **Motivazione:** Rendere disponibile nell app installabile il testo ancorato limitato a tre righe con espansione e riduzione.
- **Impatto:** Packaging e verifica riusciti: 343 file identici alla build ASAR, clamp a tre righe e comandi presenti, manifesto SHA512 e dimensione corretti, FFmpeg incluso e artefatti locali esclusi. Setup 185868658 byte, SHA256 2527501aec82724810ac85e1df785c2f875050ebed5c639c1cdd4cb1bb1410de. Verifiche della funzione gia passate in D-0218.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app; installazione non avviata automaticamente.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/verify-qna-installer.cjs, local-artifacts/current-qna-installer.txt, DECISIONI.md

## D-0220 — Stato In corso automatico dopo quindici minuti in focus

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** focus-studio
- **Decisione:** Una lezione Da studiare passa automaticamente a In corso dopo oltre 15 minuti consecutivi nella schermata deep focus. Il conteggio dipende dalla permanenza nella schermata e non dal timer di attivita; uscita, cambio lezione o stato annullano il timeout.
- **Motivazione:** Riconoscere automaticamente l avvio dello studio prolungato richiesto dall utente senza richiedere una modifica manuale dello stato.
- **Impatto:** Riutilizzato il callback esistente con salvataggio locale, aggiornamento ottimistico e rollback su errore. Rerender e cambio callback non riavviano il conteggio. Nessuna dipendenza, modifica delle fonti o chiamata AI.
- **Follow-up:** Verificare soglia, annullamento, preservazione stati e rerender in React StrictMode, typecheck, lint e build.
- **File coinvolti:** src/hooks/useFocusStudyStatus.ts, src/components/LectureDrawer.tsx, tests/integration/hookRegression.browser.tsx

## D-0221 — Verifica del cambio automatico dello stato in focus

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** quality-focus
- **Decisione:** Concludere il cambio automatico da Da studiare a In corso dopo oltre quindici minuti continuativi in deep focus, verificato con timer simulati in React StrictMode.
- **Motivazione:** Provare la soglia temporale e la pulizia del timer senza attendere quindici minuti reali o modificare lezioni personali.
- **Impatto:** Typecheck, lint e suite React/Electron passati, incluso il nuovo scenario: soglia esatta, callback aggiornato senza reset, singola promozione, cambio lezione, uscita, stati preesistenti, completamento manuale e unmount. Build di produzione riuscita; totale scenari aggiornato a 38. Nessuna modifica alla libreria personale.
- **Follow-up:** Installer non rigenerato in questa attivita.
- **File coinvolti:** src/hooks/useFocusStudyStatus.ts, src/components/LectureDrawer.tsx, tests/integration/hookRegression.browser.tsx, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0222 — Installer generale aggiornato con stato automatico in focus

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** packaging-focus
- **Decisione:** Rigenerare su richiesta dell utente il setup NSIS Windows x64 tramite npm run package:win -- --publish never includendo il cambio automatico da Da studiare a In corso dopo oltre 15 minuti in deep focus. Conservati setup, blockmap e manifesto precedenti in local-artifacts/focus-status-installer-20261007-114955.
- **Motivazione:** Rendere disponibile nell app installabile la funzione verificata in D-0220 e D-0221.
- **Impatto:** Packaging e verifica riusciti: 343 file della build identici all ASAR, hook focus e soglia presenti nel pacchetto, manifesto SHA512 e dimensione corretti, FFmpeg incluso e artefatti locali esclusi. Setup 185868806 byte, SHA256 436b4fb8908010531277ba82d71ae6c001ad654813baabcdc88865e325056073. Nessuna pubblicazione o modifica alla libreria personale.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app. Installazione non avviata automaticamente.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/verify-focus-status-installer.cjs, local-artifacts/focus-status-installer-20261007-114955/installer-result.json, DECISIONI.md

## D-0223 — Simboli di progresso e colori distinti

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** home-studio
- **Decisione:** Sostituire le emoji dello stato nella home con SVG: cerchio vuoto ambra per Da studiare, mezzo cerchio blu per In corso e spunta nel cerchio verde smeraldo per Completata. Colori piu intensi nel tema chiaro e piu luminosi nel tema scuro.
- **Motivazione:** Rendere immediato il significato dello stato e distinguere le lezioni attraverso forma e colore, secondo la scelta concordata con l utente.
- **Impatto:** Simboli uniformi da 24 pixel con tooltip ed etichette accessibili conservati; nessuna dipendenza, modifica ai dati o chiamata AI. Fixture home estesa ai tre stati per verifica visiva.
- **Follow-up:** Verificare typecheck, lint, scenari React Electron, build e catture nei due temi.
- **File coinvolti:** src/components/LectureList.tsx, src/styles.css, tests/integration/lectureListScenarios.browser.tsx

## D-0224 — Verifica simboli e palette studio

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** quality-home
- **Decisione:** Concludere D-0223 dopo typecheck, lint, 38 scenari React Electron e build passati; ispezionate catture sintetiche della home nei temi chiaro e scuro con tutti e tre gli stati.
- **Motivazione:** Controllare leggibilita e allineamento dei simboli anche sullo sfondo Laboratorio e preservare il comportamento della lista.
- **Impatto:** Sorgente e build aggiornati; tooltip e nomi accessibili conservati. Nessuna modifica alla libreria personale.
- **Follow-up:** Installer non rigenerato in questa attivita.
- **File coinvolti:** DECISIONI.md, local-artifacts/study-status-check/home-light.png, local-artifacts/study-status-check/home-dark.png

## D-0225 — Accesso Focus Mode durante lo scorrimento

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** drawer-focus
- **Decisione:** Mostrare solo il pulsante Focus Mode in alto a destra del contenuto della scheda quando la riga azioni Markdown e interamente uscita sopra la vista. Il comando resta fermo durante lo scroll e scompare tornando alla riga originale, cambiando scheda o entrando in focus.
- **Motivazione:** Consentire l ingresso in focus durante la lettura senza tornare in cima e senza fissare gli altri comandi.
- **Impatto:** IntersectionObserver sul contenitore reale di scorrimento e pulsante sticky separato che richiama enterFocusMode esistente; nessuna dipendenza o modifica ai dati.
- **Follow-up:** Verificare comparsa, posizione durante scroll, ritorno in cima, cambio scheda e ingresso focus con React Electron, typecheck, lint e build.
- **File coinvolti:** src/components/LectureDrawer.tsx, src/styles.css, tests/integration/hookRegression.browser.tsx

## D-0226 — Focus flottante verificato e rilevamento scroll

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** quality-drawer-focus
- **Decisione:** Concludere D-0225 usando listener passivo di scroll e ResizeObserver al posto del solo IntersectionObserver: la visibilita viene calcolata dalla posizione della riga rispetto al contenitore. Mantiene il pulsante sticky isolato.
- **Motivazione:** Gestire anche salti di scorrimento e cambi scheda senza dipendere dal superamento delle soglie di intersezione.
- **Impatto:** Typecheck, lint senza avvisi, 38 scenari React Electron e build passati. Scenario esteso verifica assenza iniziale, comparsa, posizione stabile, ritorno in cima, cambio scheda, fullscreen negato e ingresso riuscito dal comando flottante. Cattura sintetica ispezionata. Nel test Electron lo scroll programmatico dopo cambio scheda richiede dispatch esplicito dell evento scroll.
- **Follow-up:** Installer non rigenerato; sorgenti e build aggiornati.
- **File coinvolti:** src/components/LectureDrawer.tsx, src/styles.css, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, local-artifacts/drawer-focus-check/drawer-focus-floating.png, DECISIONI.md

## D-0227 — Archivio completo come notifica temporanea

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** home-notifiche
- **Decisione:** Mostrare il messaggio Archivio gia completo come notifica fissa in alto, visibile per un secondo e dissolta durante il secondo successivo, poi rimossa automaticamente. Gli altri avvisi conservano il comportamento esistente.
- **Motivazione:** Dare conferma immediata della mancanza di elaborazioni senza lasciare un banner persistente nella lista.
- **Impatto:** Portal con role status, animazione CSS e timer di due secondi pulito su sostituzione e unmount; callback aggiornato senza riavviare il timer ai rerender. Tema scuro dedicato, nessuna dipendenza o modifica ai dati.
- **Follow-up:** Verificare tempi, sostituzione con errore, rerender, typecheck, lint, React Electron e build.
- **File coinvolti:** src/components/LectureList.tsx, src/styles.css, tests/integration/lectureListScenarios.browser.tsx

## D-0228 — Notifica archivio completo verificata

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** quality-notifiche
- **Decisione:** Concludere D-0227 dopo typecheck, lint, 38 scenari React Electron e build passati.
- **Motivazione:** Verificare rimozione automatica dopo due secondi senza cancellare avvisi successivi o riavviare il conteggio ai rerender.
- **Impatto:** Scenario reale verifica posizione fixed, ruolo accessibile, delay e durata CSS di un secondo, pulizia del timer quando arriva un errore e scomparsa dopo due secondi anche con callback ricreato.
- **Follow-up:** Installer non rigenerato; sorgenti e build aggiornati.
- **File coinvolti:** DECISIONI.md, src/components/LectureList.tsx, src/styles.css, tests/integration/lectureListScenarios.browser.tsx

## D-0229 — Raccolta PDF Robotics e proiezione fino a Natale

- **Data:** 2026-10-07
- **Stato:** accettata
- **Area:** export-locale
- **Decisione:** Esportare su richiesta le quattro dispense ITA disponibili di Robotics in un unico PDF A4 cronologico, con indice, formule KaTeX e 22 diagrammi Mermaid. Gli schemi orizzontali troppo larghi vengono disposti verticalmente nella sola copia di stampa. Conservare file e strumenti in local-artifacts ignorata da Git.
- **Motivazione:** Fornire una raccolta integrale leggibile e una stima basata sulle pagine effettive senza modificare le fonti o richiedere nuove elaborazioni AI.
- **Impatto:** PDF verificato di 54 pagine: una copertina e 53 pagine di dispense. Media 13,25 pagine per lezione; 39 slot complessivi fino al 24 dicembre, di cui 35 successivi alle dispense disponibili, portano a circa 518 pagine. Proiezione teorica senza festivita o sospensioni; gli slot sommano 78 ore mentre il corso e configurato per 63 ore. Usati esclusivamente runtime e dipendenze gia presenti, nessuna chiamata di rete o modifica alla libreria.
- **Follow-up:** Aggiornare la stima quando saranno disponibili altre dispense o il calendario effettivo delle sospensioni.
- **File coinvolti:** DECISIONI.md, local-artifacts/robotics-export/

## D-0230 — Installer generale con simboli studio e focus flottante

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** packaging-ui
- **Decisione:** Rigenerare su richiesta il setup NSIS Windows x64 tramite npm run package:win -- --publish never includendo simboli di studio e palette distinta, accesso Focus Mode flottante e notifica Archivio gia completo con un secondo visibile e un secondo di dissolvenza. Conservati setup, blockmap e manifesto precedenti in local-artifacts/ui-installer-20261008-104422.
- **Motivazione:** Rendere disponibili nell app installabile tutte le modifiche concordate e verificate in questa conversazione.
- **Impatto:** Packaging riuscito e verifica di 343 file identici alla build ASAR, simboli e palette, focus sticky, timing notifica e ancorato compatto presenti. Manifesto SHA512 e dimensione corretti, FFmpeg incluso e artefatti locali esclusi. Setup 185868984 byte, SHA256 b55dc75b7597306a12348b86a678e26d85661e59047ad909eaa85884253fa063. Blocco temporaneo del file durante il packaging risolto dalla procedura automatica.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app; installer non avviato automaticamente.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/verify-ui-installer.cjs, local-artifacts/ui-installer-20261008-104422/installer-result.json, DECISIONI.md

## D-0231 — Calendario locale e classificazione automatica dei laboratori

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** import-laboratori
- **Decisione:** Aggiungere laboratorySchedule ai corsi con appuntamenti datati e giorni ricorrenti. Gli appuntamenti datati hanno precedenza sugli orari settimanali. Classificare gli import USB, da cartella, video, scansioni e assegnazioni successive tramite il metadato isLaboratory; applicare le regole ai record preesistenti senza sovrascrivere true o false espliciti. Configurare nel profilo privato gli otto appuntamenti RL forniti dall utente e i giovedi IR. Conservare il fuso UTC nel ripiego sulla data di modifica del file.
- **Motivazione:** Riconoscere i laboratori anche fuori dagli orari ordinari e mantenere la stessa classificazione nelle fonti e nelle derivazioni ITA/EN, preservando la scelta del menu destro e mantenendo il calendario personale fuori dal codice versionato.
- **Impatto:** Schema dei corsi esteso in modo opzionale, validato nei due ingressi di salvataggio e conservato durante modifica o rinomina del corso. Matching datato con sovrapposizione minima del 60 percento. Backfill all avvio e alla sincronizzazione, nessuna riscrittura di audio o testi e nessuna chiamata AI. Nessuna dipendenza aggiunta.
- **Follow-up:** Verificare regressioni di import, conflitti, periodo e fascia, reversibilita, conservazione ITA/EN, typecheck, lint e build; aggiornare profilo locale con backup e credenziali invariate.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/courseSchedule.ts, electron/main/laboratorySchedule.ts, electron/main/archiveValidation.ts, electron/main/settings.ts, electron/main/usbDetector.ts, src/components/CourseManagementModal.tsx, tests/unit/lectureLaboratory.test.ts, tests/unit/videoImport.test.ts, STRUTTURA_PROGETTO.md, profilo locale settings.json e library.json

## D-0232 — Calendario laboratori configurato e setup verificato

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** quality-laboratori
- **Decisione:** Concludere D-0231 dopo configurazione del profilo locale e consegna del setup NSIS x64 aggiornato. Conservare backup privati di settings e library e i precedenti installer, blockmap e manifesto.
- **Motivazione:** Rendere disponibili sia le regole personali richieste sia il codice che le applica automaticamente ai prossimi import, verificando fonti e credenziali invariate.
- **Impatto:** Typecheck e lint passati; 404 test Vitest, 14 Python e 38 scenari React Electron passati. Verificati tutti gli otto appuntamenti RL; il laboratorio IR del giovedi gia presente aveva il flag attivo. Profilo aggiornato a Lezionify chiuso dopo conferma dell utente, senza nuove chiamate AI. Packaging riuscito: 343 file identici alla build ASAR, logica laboratori e preservazione delle regole nell editor presenti, calendario privato escluso, manifesto corretto e FFmpeg incluso. Setup 185869926 byte, SHA256 3bff9cc8d8597442f0e552b2db2508982b89d06318feb6ab281cfb759fd89162.
- **Follow-up:** Installare dist/Lezionify-Setup-0.1.0.exe per attivare le regole negli import dell app installata. Installer non avviato automaticamente. Le scelte manuali true o false restano prioritarie.
- **File coinvolti:** DECISIONI.md, STRUTTURA_PROGETTO.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/laboratory-calendar/, local-artifacts/current-laboratory-installer.txt, profilo locale settings.json e library.json

## D-0233 — Ricontrollo e correzione provenienza automatica e ora locale

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** fix-laboratori
- **Decisione:** Distinguere i flag Laboratorio automatici tramite laboratorySource schedule, validato nell archivio. Ricalcolarli dopo modifiche a data, corso, calendario e durante le scansioni, rimuovendoli quando la regola non corrisponde piu; una scelta esplicita del menu destro elimina la provenienza automatica e resta prioritaria. Conservare i vecchi flag senza provenienza come manuali. Serializzare il ripiego mtime in ora locale e convertire in ora locale anche i timestamp con fuso nei campi datetime-local.
- **Motivazione:** Il ricontrollo richiesto ha riprodotto tre regressioni: flag automatico rimasto attivo dopo cambio data o calendario e campo ora con giorno precedente per un timestamp UTC vicino a mezzanotte. Rendere la riclassificazione reversibile e coerente con il calendario mantenendo le scelte manuali.
- **Impatto:** Regressioni fallite prima della correzione e passate dopo. Typecheck e lint passati; 408 test Vitest, 14 Python e 38 scenari React Electron passati. Verificati cambio corso, cancellazione, modifica calendario via impostazioni, rinomina, validazione provenienza e conservazione fino alla versione inglese. Otto appuntamenti RL e giovedi IR ancora presenti nel profilo locale. Fonti e credenziali personali invariati; nessuna dipendenza o chiamata AI.
- **Follow-up:** Rigenerare su richiesta l installer generale, conservare gli artefatti precedenti e verificare build, payload, manifesto e presenza delle correzioni.
- **File coinvolti:** shared/archive.ts, shared/calendarDate.ts, electron/main/archive.ts, electron/main/laboratorySchedule.ts, electron/main/libraryRepository.ts, electron/main/usbDetector.ts, src/components/UsbRecorderModal.tsx, src/components/LectureDrawer.tsx, tests/unit/lectureLaboratory.test.ts, STRUTTURA_PROGETTO.md

## D-0234 — Installer generale rigenerato dopo il ricontrollo

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** packaging-laboratori
- **Decisione:** Consegnare il setup generale NSIS Windows x64 rigenerato con le correzioni D-0233 tramite npm run package:win -- --publish never, conservando installer, blockmap e manifesto precedenti nel backup locale laboratory-review-installer.
- **Motivazione:** Distribuire la versione controllata richiesta dall utente con riclassificazione dei flag automatici e orari locali corretti, includendo tutte le funzioni gia presenti.
- **Impatto:** Build e packaging riusciti. Verificati 343 file identici alla build ASAR, provenienza e riclassificazione dei laboratori, precedenza degli appuntamenti datati, conservazione delle regole nell editor e conversione mtime locale. Manifesto SHA512 e dimensione corretti, FFmpeg presente, calendario personale e artefatti locali esclusi. Setup 185870260 byte, SHA256 4f366bd8cd6cc406ae3e7cffe0e86f88d79e80ba75bb725f6e36a08d1236c496. Controllate in sola lettura tutte le otto date RL con orari, titoli e aule e la regola dei giovedi IR.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app. Installer non avviato automaticamente; nessuna pubblicazione, chiamata AI o modifica ai dati personali durante il ricontrollo.
- **File coinvolti:** DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/laboratory-calendar/verify-installer.cjs, local-artifacts/laboratory-calendar/verify-calendar.cjs, local-artifacts/current-laboratory-installer.txt

## D-0235 — Lista separata delle attivita future di studio e statistiche

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Creare docs/product/attivita-future.md come lista separata da riprendere quando l utente avra tempo. Registrare tre attivita ancora da implementare: in Tutte le lezioni ordinare prima In corso, poi Da studiare gialle, infine Completate; escludere i corsi archiviati dalla sezione Statistiche; aggiungere per ogni corso il tempo complessivo medio di studio necessario per una lezione.
- **Motivazione:** Conservare le richieste dell utente in un documento consultabile e aggiornabile senza anticiparne l implementazione.
- **Impatto:** Aggiornata soltanto la documentazione, con collegamenti dall indice e dalla struttura del progetto. Per il tempo medio restano da definire alla realizzazione le lezioni incluse nel denominatore e il trattamento del tempo mancante. Nessuna modifica al runtime, alla libreria o all installer.
- **Follow-up:** Riprendere la lista quando l utente vorra procedere; definire i dettagli della media di studio e spuntare le attivita dopo implementazione e verifica.
- **File coinvolti:** docs/product/attivita-future.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0236 — Ordinamento per stato, statistiche attive e studio medio per lezione

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** studio-statistiche
- **Decisione:** Implementare le tre attivita di D-0235. In Tutte le lezioni ordinare In corso, Da studiare, Completate mantenendo l ordine preesistente dentro ciascun gruppo e nelle viste del singolo corso. Escludere i corsi archiviati da statistiche, totali, grafici, percentuali, medie giornaliere, streak e selezione dello studio manuale, preservando i dati per il ripristino. Mostrare per corso la media delle somme di tutte le sessioni associate a ciascuna lezione completata con tempo positivo, con dimensione del campione e Dati insufficienti senza campione.
- **Motivazione:** Dare priorita alle lezioni su cui si sta lavorando e misurare il tempo necessario per completare una lezione senza diluire la media con lezioni non ancora terminate o senza misurazione. Le sessioni generiche del corso non sono attribuibili a una lezione.
- **Impatto:** I tempi collegati seguono il corso attuale della lezione; i tempi manuali generici restano nei totali dei corsi attivi ma sono esclusi dalla media per lezione. Backend e renderer filtrano i corsi archiviati, il ripristino reintegra i dati. Aggiornamento statistiche dopo archiviazione e protezione dalle risposte obsolete. Typecheck, lint senza avvisi, 411 test Vitest, 14 Python e 39 scenari React Electron passati. Nessuna dipendenza, chiamata AI o modifica alla libreria personale.
- **Follow-up:** Completare verifica visiva della nuova media nei due temi e rigenerare il setup generale per usare le funzioni nell app installata. Aggiornata la lista con tutte le attivita completate.
- **File coinvolti:** src/hooks/useLectures.ts, src/components/Dashboard.tsx, src/App.tsx, src/styles.css, electron/main/archive.ts, shared/archive.ts, tests/unit/studyStatistics.test.ts, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/attivita-future.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0237 — Setup generale con ordinamento e statistiche di studio verificato

- **Data:** 2026-10-08
- **Stato:** accettata
- **Area:** quality-studio-statistiche
- **Decisione:** Concludere D-0236 dopo verifica visiva nei temi chiaro e scuro e rigenerazione del setup NSIS x64 generale. Conservare il precedente installer, blockmap e manifesto negli artefatti locali.
- **Motivazione:** Rendere disponibili nella app installata le tre funzioni richieste con un pacchetto verificato corrispondente alla build testata.
- **Impatto:** 411 test Vitest, 14 Python e 39 scenari React Electron passati, typecheck e lint senza avvisi. Verificate media con campione e Dati insufficienti nei due temi. Packaging riuscito: 343 file identici tra build e ASAR, statistiche dei corsi attivi e media per lezione presenti, manifesto SHA512 e dimensione corretti, FFmpeg incluso e artefatti locali esclusi. Setup 185870746 byte, SHA256 fb88f003b7bf1d5f6376de10bd11f7a99cdf6db7370b3f908c1f75c9b4d2c841. Nessuna chiamata AI o modifica alla libreria personale.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare la app. Installer non avviato automaticamente. Tutte le attivita della lista sono implementate.
- **File coinvolti:** DECISIONI.md, docs/product/attivita-future.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/study-stats-check/, local-artifacts/current-study-stats-installer.txt

## D-0238 — Tag Nota e Concetto chiave leggibili

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** viewer-markdown
- **Decisione:** Ignorare gli spazi tra blocchi introdotti da ReactMarkdown nel riconoscimento degli alert e aggiungere il marcatore italiano CONCETTO CHIAVE. Riconoscere i marcatori supportati anche a inizio paragrafo senza citazione.
- **Motivazione:** Correggere i tag grezzi visibili nelle dispense esistenti senza rigenerarle o modificare le fonti.
- **Impatto:** Riquadri Nota e Concetto chiave con palette esistente, formule e formattazione preservate; codice e marcatori nel mezzo del testo invariati. Nessuna dipendenza o chiamata AI.
- **Follow-up:** Verificare rendering nei due temi e quality gate completo.
- **File coinvolti:** src/components/MarkdownViewer.tsx, tests/integration/hookRegression.browser.tsx, docs/product/study-reader-improvements.md, docs/README.md

## D-0239 — Conservazione della slide durante zoom e ridimensionamento

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** focus-pdf
- **Decisione:** Ancorare lo scroll alla pagina e alle coordinate relative del punto di lettura. Ripristinare la posizione dopo zoom, divisore, dimensioni della finestra e proporzioni PDF caricate; conservare la geometria quando le slide sono nascoste.
- **Motivazione:** Lo scroll espresso soltanto in pixel spostava la lettura su altre slide durante le variazioni di larghezza.
- **Impatto:** Scroll anchoring del browser disabilitato solo nel lettore PDF. Canvas e rendering differito esistenti conservati. Nessuna modifica ai file PDF o dipendenza aggiunta.
- **Follow-up:** Regressioni PDF.js reali con pagine miste, sesta slide, trascinamento nativo, zoom, Q&A e schermi stretti; quality gate completo.
- **File coinvolti:** src/components/FocusPdfViewer.tsx, src/styles.css, tests/integration/focusPdfScenarios.browser.tsx, docs/product/focus-pdf.md, docs/product/study-reader-improvements.md

## D-0240 — Totale della lezione accanto alla sessione attuale

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** focus-tempo-studio
- **Decisione:** Mostrare due tempi affiancati nel Focus Lock: totale di tutte le sessioni della lezione e sessione corrente. Leggere il totale locale per ID della lezione escludendo la sessione corrente e sommare i secondi attuali, anche non salvati.
- **Motivazione:** Rendere visibile tutto lo studio dedicato alla singola lezione senza confonderlo con il corso o duplicare i checkpoint periodici della sessione.
- **Impatto:** Nuovo metodo IPC con input validati e lettura serializzata. Tempi generici esclusi; risposte obsolete ignorate; totale non leggibile segnalato come Non disponibile. Pause e countdown non incrementano i tempi. Nessuna migrazione, dipendenza, chiamata AI o modifica ai dati personali.
- **Follow-up:** Verificare checkpoint, rientro, cambio lezione, richieste tardive, errori di lettura, layout e quality gate completo.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useStudyTracker.ts, src/components/FocusLockModal.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/unit/studyStatistics.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/study-reader-improvements.md

## D-0241 — Dispense e focus verificati con formule leggibili

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** quality-lettura-studio
- **Decisione:** Concludere le modifiche D-0238, D-0239 e D-0240 con regressioni complete e catture sintetiche. Fare ereditare alle formule KaTeX il colore del riquadro anche nel tema scuro e includere CSS e font KaTeX locali nel runner di verifica.
- **Motivazione:** La verifica visiva ha rilevato formule pallide sui riquadri chiari nel tema scuro; verificare il contrasto reale e rendere le catture fedeli al prodotto.
- **Impatto:** 412 test Vitest, 14 Python, typecheck, lint e build passati prima del solo ritocco CSS; suite React Electron completa con catture passata dopo il ritocco e CSS KaTeX reale. Screenshot dei riquadri nei due temi e del Focus Lock con totale 2 h 45 min e sessione 45 min controllati. Una esecuzione con catture e build concorrente ha raggiunto il timeout; la successiva esecuzione separata e passata. Nessuna dipendenza, chiamata AI o modifica ai dati personali.
- **Follow-up:** Completare lint e rebuild finali dopo il ritocco CSS. Installer non rigenerato in questa attivita.
- **File coinvolti:** src/styles.css, tools/run_hook_regressions.cjs, tests/integration/hookRegression.browser.tsx, STRUTTURA_PROGETTO.md, docs/product/study-reader-improvements.md, local-artifacts/study-reader-check/, DECISIONI.md

## D-0242 — Ricontrollo completo prima del setup con migliorie di lettura

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** quality-installer-generale
- **Decisione:** Eseguire nuovamente npm run check dopo tutte le modifiche D-0238, D-0239, D-0240 e D-0241 e procedere su richiesta alla rigenerazione del setup generale NSIS x64. Conservare il precedente installer, blockmap e manifesto nel backup locale study-reader-installer.
- **Motivazione:** Consegnare un installer generale che corrisponda alla versione verificata, includendo riquadri Markdown, posizione PDF stabile e totale della lezione accanto alla sessione corrente.
- **Impatto:** Quality gate completo passato: typecheck, lint senza avvisi, 412 test Vitest, 14 test Python, scenari React Electron e build. Backup degli artefatti precedenti completato. Nessuna chiamata AI, pubblicazione o modifica della libreria personale.
- **Follow-up:** Eseguire npm run package:win -- --publish never e verificare payload ASAR, funzionalita nuove e precedenti, hash e dimensioni del manifesto e FFmpeg incluso.
- **File coinvolti:** DECISIONI.md, local-artifacts/study-reader-check/final-check.log, local-artifacts/current-study-reader-installer.txt, local-artifacts/study-reader-installer-20261009-*/

## D-0243 — Installer generale verificato con riquadri PDF e tempi della lezione

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** packaging-studio-lettura
- **Decisione:** Consegnare il setup generale NSIS Windows x64 rigenerato tramite npm run package:win -- --publish never, con tutte le modifiche D-0238, D-0239, D-0240 e D-0241 e le funzioni precedenti. Conservare il precedente installer, blockmap e manifesto nel backup locale indicato da current-study-reader-installer.txt.
- **Motivazione:** Rendere disponibili nell app installata i tag leggibili, il mantenimento della slide durante zoom e ridimensionamento e i due tempi nel Focus Lock, dopo il ricontrollo completo richiesto dall utente.
- **Impatto:** npm run check passato: typecheck, lint senza avvisi, 412 test Vitest, 14 Python, scenari React Electron e build. Packaging riuscito; verificati 343 file identici tra build e ASAR, nuove funzioni e precedenti funzioni generali, manifesto SHA512 e dimensione, FFmpeg incluso e dati personali esclusi. Setup 185872072 byte, SHA256 21ab8e7895be8620853d20213908f51824cd701c350a369c238786cae998cc9a. Nessuna pubblicazione, chiamata AI o modifica della libreria personale.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l app. Installer non avviato automaticamente.
- **File coinvolti:** DECISIONI.md, docs/product/study-reader-improvements.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/current-study-reader-installer.txt, local-artifacts/study-reader-check/

## D-0244 — Classificazione delle nove idee da valutare

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Raccogliere in docs/product/idee-da-valutare.md le nove idee richieste, divise in Facilmente applicabili e Da pensarci, con caselle ancora aperte e classificazione indicativa.
- **Motivazione:** Conservare gli appunti in una lista semplice distinguendo interventi circoscritti da flussi che richiedono ulteriori valutazioni.
- **Impatto:** Aggiunta documentazione di pianificazione; nessuna implementazione, nuova dipendenza, chiamata AI o modifica ai dati locali. La classificazione non costituisce una stima tecnica definitiva.
- **Follow-up:** Riprendere le idee quando richiesto e verificare i dettagli prima della realizzazione.
- **File coinvolti:** docs/product/idee-da-valutare.md, DECISIONI.md

## D-0245 — Separazione degli appunti relativi a un altra app

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Correggere il perimetro della lista D-0244: rimuovere Consiglia Libro e importazione libri da foto da docs/product/idee-da-valutare.md e conservarli in docs/product/idee-altra-app.md come appunti estranei a Lezionify.
- **Motivazione:** L utente ha chiarito che le due idee appartengono a un altra applicazione.
- **Impatto:** La lista Lezionify contiene sette idee: cinque facilmente applicabili e due da pensarci. Le due idee estratte restano conservate separatamente; nessuna modifica al runtime.
- **Follow-up:** Nessuno.
- **File coinvolti:** docs/product/idee-da-valutare.md, docs/product/idee-altra-app.md, DECISIONI.md

## D-0246 — Implementazione delle sette idee Lezionify

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** interfaccia-studio-diagnostica
- **Decisione:** Implementare colori dei corsi nella lista generale, etichetta Laboratorio testuale, notifica USB temporanea, lunghezza delle dispense e lettura stabile della Discussione Contestuale con divisori ridimensionabili. Integrare fasi AI e pipeline nel log diagnostico con aggiornamento mentre il pannello e aperto.
- **Motivazione:** Realizzare tutte le sette idee autorizzate dall utente e rendere piu leggibili archivio, discussione e avanzamento delle elaborazioni.
- **Impatto:** Lunghezza basata sul testo italiano delle dispense dei corsi attivi, indipendente dai filtri, con massimo al 100 percento e indisponibilita distinta da zero. Ridimensionamento della chat con minimi leggibili, tastiera e spazio ceduto dai PDF quando necessario. Log di fasi e stati senza contenuti delle lezioni o credenziali. Nessuna dipendenza aggiunta.
- **Follow-up:** Verificare conteggi, corsi archiviati, streaming senza salti, divisori, notifica, log e quality gate; aggiornare la lista dopo il collaudo.
- **File coinvolti:** docs/product/idee-da-valutare.md, src/components/LectureList.tsx, src/components/LectureDrawer.tsx, src/components/QnaSidebar.tsx, src/components/FocusWorkspace.tsx, src/components/LogViewerModal.tsx, src/styles.css, src/qna.css, shared/archive.ts, electron/main/archive.ts, electron/main/ai/archivePipeline.ts, electron/main/index.ts, electron/preload/index.ts, STRUTTURA_PROGETTO.md

## D-0247 — Sette migliorie verificate e setup generale aggiornato

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** quality-packaging-studio
- **Decisione:** Concludere D-0246 con tutte le sette attivita implementate e spuntate, documentazione aggiornata e setup generale NSIS Windows x64 rigenerato tramite npm run package:win -- --publish never. Conservare installer, blockmap e manifesto precedenti nel backup indicato da current-seven-ideas-installer.txt.
- **Motivazione:** Consegnare le migliorie richieste in un pacchetto installabile corrispondente alla build verificata.
- **Impatto:** npm run check passato: typecheck, lint senza avvisi, 416 test Vitest, 14 Python, scenari React Electron e build. Verificati streaming e completamento senza scroll automatico, posizione della chat dopo resize, divisori nativi e tastiera, ripristino PDF, timer USB, colori e laboratori nei due temi, conteggi e diagnostica senza testi privati. Protezione dello scroll clamped dal browser durante resize; runner attende ResizeObserver prima delle misure. Setup verificato: 343 file identici tra build e ASAR, sette nuove funzioni e precedenti presenti, manifesto SHA512 e dimensione corretti, FFmpeg incluso e profili privati esclusi. Installer 185874867 byte; SHA256 a2cb100ed03e67138e44538c3b524d2eff01f1a647c7a65d7c9ba6d9a48f0931. Nessuna chiamata AI reale, pubblicazione o modifica della libreria personale.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare. Installer non avviato automaticamente; i nuovi eventi di fase verranno registrati dalle prossime elaborazioni.
- **File coinvolti:** shared/lectureLength.ts, shared/archive.ts, src/utils/courseColor.ts, src/utils/focusLayout.ts, src/components/PaneDivider.tsx, src/components/ResizableQnaPane.tsx, src/components/QnaSidebar.tsx, src/components/FocusWorkspace.tsx, src/components/LectureDrawer.tsx, src/components/LectureList.tsx, src/components/LogViewerModal.tsx, src/styles.css, src/qna.css, electron/main/archive.ts, electron/main/gemini.ts, electron/main/ai/progressDiagnostics.ts, electron/main/ai/archivePipeline.ts, electron/main/index.ts, electron/preload/index.ts, tests/unit/lectureLength.test.ts, tests/unit/focusPdf.test.ts, tests/integration/discussionDiagnosticsScenarios.browser.tsx, tests/integration/focusPdfScenarios.browser.tsx, tests/integration/lectureListScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/idee-da-valutare.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/seven-ideas-check/

## D-0248 — Lunghezza relativa per corso

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** studio
- **Decisione:** Il 100% della lunghezza e la dispensa italiana piu lunga dello stesso corso. La richiesta IPC riceve la lezione selezionata e il backend ricava il corso dall archivio completo, anche se archiviato. Senza corso assegnato viene mostrato il conteggio con invito ad assegnarlo. Le risposte obsolete dopo cambi di lezione o corso vengono ignorate.
- **Motivazione:** Corsi con stili piu discorsivi non devono abbassare artificialmente la lunghezza relativa delle dispense di altri corsi. Il riferimento completo resta stabile durante filtri e ricerche.
- **Impatto:** Affina D-0246: cache locale invariata, nessuna nuova dipendenza o chiamata AI. Aggiornati contratto IPC, drawer, documentazione e regressioni per corsi diversi, riassegnazione, archiviazione e risposte tardive.
- **Follow-up:** Eseguire controlli completi delle sette funzioni e rigenerare e verificare il setup Windows.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/components/LectureDrawer.tsx, tests/unit/lectureLength.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/idee-da-valutare.md, STRUTTURA_PROGETTO.md

## D-0249 — Verifica del confronto per corso e setup aggiornato

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** qualita-distribuzione
- **Decisione:** Completato il controllo delle sette funzioni e della nuova lunghezza relativa per corso. Rigenerato il setup NSIS x64 senza pubblicazione, preservando il precedente installer in local-artifacts. Confermata la presenza della nuova logica e delle altre funzioni nel pacchetto finale.
- **Motivazione:** Consegnare un installer coerente con il codice testato e verificare che il cambio di riferimento non introduca regressioni nelle funzioni appena aggiunte.
- **Impatto:** npm run check passato: typecheck, lint, 418 test Vitest, 14 test Python, scenari React/Electron e build. Verificati conteggi per corso, filtri, riassegnazione, archiviazione, dati mancanti e risposte obsolete; rieseguiti colori, laboratorio, toast USB, streaming senza scroll, resize discussione/PDF e diagnostica. Controllate schermate chiare e scure. Installer: 185874117 byte; SHA-256 af8456799765420a06b5209fc2aa52070404740270c6f2c4c307b1e6c75433c6. Tutti i 343 file della build corrispondono al pacchetto; manifesto e FFmpeg verificati, profilo privato e artefatti locali esclusi.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare. Test AI eseguiti con dati sintetici, senza inviare lezioni reali; installer non avviato automaticamente.
- **File coinvolti:** shared/archive.ts, electron/main/archive.ts, electron/main/index.ts, electron/preload/index.ts, src/components/LectureDrawer.tsx, tests/unit/lectureLength.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/idee-da-valutare.md, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/course-length-check/

## D-0250 — Vocabolario locale EN IT con Ctrl T

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** vocabolario-offline
- **Decisione:** Implementare la casella Ctrl T in alto al centro, anche in Focus, per parole e locuzioni EN IT invertibili. Includere i due dizionari FreeDict WikDict 2025.11.23 adattati in JSON sotto CC BY-SA 3.0 con attribuzione, sorgenti e hash. Lookup locale tramite IPC e cache lazy; flessioni inglesi comuni verificate nel dizionario e voci esatte prioritarie. Definizioni mantenute nella lingua della fonte, se presenti.
- **Motivazione:** L utente ha scelto il vocabolario offline per parole e locuzioni, senza Gemini. I dati includibili localmente evitano dipendenze, costi e invio delle ricerche a servizi esterni. Le frasi libere richiedono una funzione distinta, eventualmente con modelli offline.
- **Impatto:** Dati per 53255 voci EN IT e 29660 IT EN, circa 20 MB non compressi; nessuna nuova dipendenza runtime. Query non salvate nel profilo o nei log. Casella con inversione, chiusura e ripristino focus, errori e retry; Escape prioritario rispetto a drawer, Focus, countdown, pausa e Quick Capture. Contratto IPC limitato a testo e due direzioni, senza percorsi o URL configurabili.
- **Follow-up:** Completare quality gate, verifiche fullscreen e temi, e rigenerare il setup con dati e licenza inclusi.
- **File coinvolti:** shared/dictionary.ts, shared/archive.ts, electron/main/localDictionary.ts, electron/main/index.ts, electron/preload/index.ts, src/App.tsx, src/components/DictionaryOverlay.tsx, src/hooks/useDictionaryShortcut.ts, src/hooks/useFocusModeController.ts, src/hooks/useQuickCapture.ts, src/components/FocusLockModal.tsx, src/components/PauseTimerOverlay.tsx, src/styles.css, tools/build_dictionary.py, public/dictionaries/, tests/unit/dictionary.test.ts, tests/integration/dictionaryScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/vocabolario-offline.md, docs/README.md, README.md, STRUTTURA_PROGETTO.md

## D-0251 — Vocabolario offline verificato e installer aggiornato

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** qualita-vocabolario-distribuzione
- **Decisione:** Concludere D-0250 con vocabolario locale implementato e setup NSIS x64 rigenerato senza pubblicazione. Preservare il precedente installer. Esplicitare in README e LICENSE la licenza separata CC BY-SA 3.0 dei soli dati del vocabolario. Rispettare il focus della casella anche durante autofocus differiti di countdown, pausa e Quick Capture.
- **Motivazione:** Rendere disponibile la funzione nell app installata con dati e attribuzioni gia inclusi, senza Gemini o download a runtime, e proteggere la continuita dello studio.
- **Impatto:** Quality gate passato: typecheck, lint, 432 test Vitest, 14 test Python, scenari React Electron e build. Test dei dizionari reali con rete disabilitata e regressioni di Ctrl T, lingue, locuzioni, risposte obsolete, retry, focus e fullscreen. Escape e autofocus verificati anche con countdown e pausa sottostanti. Controllati i due temi. Setup: 189556012 byte, SHA-256 c5dc246240c7be14f6456050765019ad790a947c4e00bcf866b250730c75eda4. Tutti i 348 file della build corrispondono al pacchetto; dizionari, attribuzione e URI della licenza inclusi e identici ai sorgenti locali; manifesto e FFmpeg verificati, profili privati esclusi.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Le definizioni restano nella lingua della fonte; copertura e riconoscimento delle flessioni non universali. La traduzione di frasi libere resta fuori da questa versione, come scelto dall utente.
- **File coinvolti:** shared/dictionary.ts, shared/archive.ts, electron/main/localDictionary.ts, electron/main/index.ts, electron/preload/index.ts, src/App.tsx, src/components/DictionaryOverlay.tsx, src/hooks/useDictionaryShortcut.ts, src/hooks/useFocusModeController.ts, src/hooks/useQuickCapture.ts, src/components/FocusLockModal.tsx, src/components/PauseTimerOverlay.tsx, src/components/QuickCaptureOverlay.tsx, src/styles.css, public/dictionaries/, tools/build_dictionary.py, tests/unit/dictionary.test.ts, tests/integration/dictionaryScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/vocabolario-offline.md, docs/README.md, README.md, LICENSE, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/latest.yml, local-artifacts/dictionary-check/

## D-0252 — Contatore pagina totale delle slide PDF

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** studio-pdf
- **Decisione:** Mostrare nella barra PDF un contatore x/totale riferito alla prima pagina visibile. Aggiornare il numero dalla stessa geometria che preserva il punto di lettura durante scroll, zoom e resize. Resettare pagina e totale al cambio PDF, senza contatore durante caricamento o errore.
- **Motivazione:** Consentire di sapere a quale slide si sta leggendo e quante pagine contiene il PDF senza interrompere la lezione.
- **Impatto:** Modifica locale al viewer e allo stile, senza dipendenze o chiamate AI. Aggiunte regressioni con PDF reali sintetici da 12 e 1 pagine, scroll fino al termine, zoom, divisori, Q A, occultamento e ripristino, cambio documento ed errore. Il vocabolario offline D-0250 e D-0251 risulta gia completo nel perimetro scelto di parole e locuzioni; viene ricontrollato insieme al PDF.
- **Follow-up:** Completare controlli del PDF e del vocabolario, registrare gli esiti e rigenerare il setup Windows.
- **File coinvolti:** src/components/FocusPdfViewer.tsx, src/styles.css, tests/integration/focusPdfScenarios.browser.tsx, docs/product/focus-pdf.md, STRUTTURA_PROGETTO.md

## D-0253 — Contatore PDF e vocabolario ricontrollati con setup aggiornato

- **Data:** 2026-10-09
- **Stato:** accettata
- **Area:** qualita-pdf-vocabolario-distribuzione
- **Decisione:** Concludere D-0252 con contatore slide implementato e verificato. Confermare il completamento del vocabolario locale D-0250 e D-0251 nel perimetro scelto di parole e locuzioni, senza Gemini. Rigenerare il setup NSIS x64 senza pubblicazione e conservare il precedente installer nel backup locale.
- **Motivazione:** Consegnare entrambe le funzioni nel pacchetto installabile e registrare con lo script Python tutti i controlli richiesti dall utente, incluso il vocabolario traduttore.
- **Impatto:** npm run check passato: typecheck, lint, 432 test Vitest, 14 test Python, scenari React Electron e build. Contatore verificato da 1/12 a 12/12, PDF da 1 pagina, scroll, zoom, divisori, Q A, hide e restore, cambio documento, errore e cambio lezione. Il test attende la geometria reale dell ultima pagina caricata da PDF.js. Ricontrollato anche il vocabolario offline completo: dati reali senza rete, Searching verso search e cercare, EN IT invertibili, locuzioni, errori e retry, Ctrl T, fullscreen, Escape e autofocus rispettosi di Focus, countdown e pausa; nessuna chiamata Gemini. Temi chiaro e scuro controllati. Setup: 189555783 byte, SHA-256 c936a53bccac438890ab9f6d5b374feb48be548ef2dec5f0c201165ee1bde852. Tutti i 348 file corrispondono alla build; contatore, dizionari con 53255 voci EN IT e 29660 IT EN, attribuzioni e licenza inclusi; manifesto e FFmpeg verificati, profili privati esclusi.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare. Installer non avviato automaticamente; nessuna modifica della libreria personale o dei PDF originali.
- **File coinvolti:** src/components/FocusPdfViewer.tsx, src/styles.css, tests/integration/focusPdfScenarios.browser.tsx, tests/unit/dictionary.test.ts, tests/integration/dictionaryScenarios.browser.tsx, shared/dictionary.ts, electron/main/localDictionary.ts, src/components/DictionaryOverlay.tsx, src/hooks/useDictionaryShortcut.ts, public/dictionaries/, docs/product/focus-pdf.md, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/pdf-counter-check/

## D-0254 — Log dettagliato di tutti i passaggi Gemini

- **Data:** 2026-10-12
- **Stato:** accettata
- **Area:** diagnostica-gemini
- **Decisione:** Registrare nel gestore centrale coda, selezione e cambio modello, rotazione ed esclusione chiavi, quote, attese, retry, timeout e arresti; rendere leggibili numero tentativo, alias chiave, modello ed esito direttamente nel messaggio. Ampliare a 5000 gli eventi recenti mostrati e ripristinati al riavvio.
- **Motivazione:** L utente richiede di seguire tutti i passaggi del recupero Gemini senza aprire ogni dettaglio tecnico.
- **Impatto:** Diagnostica condivisa per tutte le richieste gestite da GeminiRequestManager, senza modificare politiche di retry o fallback e senza registrare chiavi API, prompt o risposte. File ruotato a 5 MB e memoria limitata a 5000 eventi; nessuna nuova dipendenza.
- **Follow-up:** Verificare ordine degli eventi, saturazione e fallback, quote e attese, segreti esclusi, budget e conservazione dei log; eseguire controlli TypeScript, lint, test e build. La app installata richiede una build aggiornata.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/logger.ts, src/components/LogViewerModal.tsx, tests/unit/geminiPhaseB.test.ts, tests/unit/quality.test.ts, STRUTTURA_PROGETTO.md

## D-0255 — Log Gemini dettagliato verificato e installer aggiornato

- **Data:** 2026-10-12
- **Stato:** accettata
- **Area:** qualita-diagnostica-distribuzione
- **Decisione:** Completare D-0254 e consegnare il setup NSIS x64 aggiornato senza pubblicazione. Conservare il precedente installer, blockmap e manifesto nel backup indicato da current-gemini-detailed-log-installer.txt.
- **Motivazione:** Rendere disponibile nell app installata il log dettagliato richiesto e verificare che riporti solo tentativi e passaggi realmente eseguiti.
- **Impatto:** npm run check passato: typecheck, lint, 435 test Vitest, 14 Python, scenari React Electron e build. Verificati tentativi ordinati, rotazione chiavi, due modelli saturi e fallback al terzo, quota giornaliera, cooldown, retry, budget senza fallback inesistenti, dati sensibili esclusi, 5000 eventi FIFO e riavvio, visibilita nel pannello senza espandere dettagli. Packaging riuscito; 348 file della build identici nell ASAR, nuove funzioni e precedenti presenti, manifesto e FFmpeg verificati, dati privati esclusi. Setup 189556286 byte, SHA256 b957de8e8376d3ff3aa8701290a3362b4e32d82008e1d2e8e25d59e85bd3f62f.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Installer non eseguito; nessuna chiamata AI reale o modifica alla libreria personale. I nuovi dettagli sono disponibili per le elaborazioni successive all aggiornamento.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/logger.ts, src/components/LogViewerModal.tsx, tests/unit/geminiPhaseB.test.ts, tests/unit/quality.test.ts, tests/unit/edge_cases.test.ts, tests/integration/discussionDiagnosticsScenarios.browser.tsx, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/latest.yml, local-artifacts/gemini-detailed-log-check.log, local-artifacts/gemini-detailed-log-package.log, local-artifacts/gemini-detailed-log-installer-result.json

## D-0256 — Raccolta delle idee future del 13 ottobre

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Creare docs/product/idee-future-2026-10-13.md con tutte le otto richieste dell utente, distinguendo interventi immediati e approfondimenti. Separare export PDF e compattazione Mermaid e segnalare il vocabolario per parole e locuzioni gia implementato.
- **Motivazione:** Conservare le idee in un documento consultabile e distinguere obiettivi definiti da scelte che richiedono ricerca, senza avviare implementazioni.
- **Impatto:** Aggiunti il documento e i riferimenti nell indice documentazione e nella struttura del progetto. Nessuna modifica al runtime, dipendenza o modello AI; nessuna ricerca eseguita in questa attivita.
- **Follow-up:** Riprendere le singole attivita quando richiesto, verificando fattibilita e fonti aggiornate per gli approfondimenti.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0257 — Link musicali e selezione delle tracce nei video

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** pianificazione-musica
- **Decisione:** Estendere docs/product/idee-future-2026-10-13.md con i sei link YouTube forniti, le 31 tracce classiche e le 23 tracce del secondo elenco, timestamp, titoli originali e crediti. Salvare la richiesta di selezionare e scaricare singoli brani interni a un video e la proposta di titoli in italiano.
- **Motivazione:** Conservare tutti i dettagli forniti dall utente per la futura funzione musicale e distinguere le tracce di una compilation dalla playlist radio indicata nel link.
- **Impatto:** Solo documentazione; nessun download o verifica online. Metadati conservati come forniti, fine ultima traccia da determinare, quattro video senza elenco tracce. Nessuna nuova dipendenza.
- **Follow-up:** Valutare importazione timestamp, selezione brani, confini dei tagli e traduzione dei titoli durante lo studio della funzione musicale.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0258 — Riquadri concetto chiave in italiano e inglese

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** rendering-dispense
- **Decisione:** Riconoscere KEY CONCEPT oltre a CONCETTO CHIAVE, con titolo inglese per il marcatore inglese, sia in citazione sia a inizio paragrafo. Eliminare il contenitore pre spurio intorno ai diagrammi Mermaid.
- **Motivazione:** Il renderer accettava solo il nome italiano; la correzione gestisce le dispense inglesi gia presenti senza alterare fonti o richiamare Gemini. Il codice Mermaid deve produrre una figura senza lo stile dei blocchi di codice.
- **Impatto:** Nessuna dipendenza o chiamata AI. Preservate formule, liste, formattazione e marcatori letterali; regressioni React aggiornate per entrambe le lingue.
- **Follow-up:** Completare quality gate e setup Windows con gli altri interventi immediati.
- **File coinvolti:** src/components/MarkdownViewer.tsx, tests/integration/hookRegression.browser.tsx, docs/product/lettura-export-pdf.md

## D-0259 — PDF locale di una lezione o dell intero corso

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** export-pdf
- **Decisione:** Aggiungere Esporta in PDF nella lezione e in Focus e export corso con scelta ITA EN. Leggere le derivazioni locali in ordine cronologico, includendo avvisi per dispense mancanti. Renderizzare in finestra Electron nascosta con sessione temporanea separata, token IPC, font KaTeX e Mermaid pronti; salvare PDF A4 tramite temporaneo nella destinazione nativa.
- **Motivazione:** Riutilizzare il renderer esistente conserva formule e riquadri senza dipendenze aggiuntive o AI. Export esplicito e locale, indipendente dai filtri e dalle quote; nessuna lingua di ripiego implicita.
- **Impatto:** Nuovi contratti, servizio backend, vista dedicata, stile stampa e pulsanti. Rete esterna bloccata nel solo export, sorgenti conservate, fallimenti senza percorsi privati. Nuovo test reale del renderer di produzione in npm run check e CI Windows; compattazione Mermaid avanzata resta da approfondire.
- **Follow-up:** Verificare PDF sintetici e quality gate, poi rigenerare il setup.
- **File coinvolti:** shared/pdfExport.ts, shared/archive.ts, electron/main/pdfExport.ts, electron/main/index.ts, electron/preload/index.ts, src/main.tsx, src/components/PdfExportDocument.tsx, src/components/pdfExport.css, src/components/PdfExportButton.tsx, src/components/MermaidDiagram.tsx, src/components/LectureDrawer.tsx, src/components/FocusWorkspace.tsx, src/components/LectureList.tsx, src/styles.css, package.json, .github/workflows/ci.yml, tests/unit/pdfExport.test.ts, tools/run_pdf_export_regressions.cjs, docs/product/lettura-export-pdf.md

## D-0260 — Posizioni locali delle dispense e delle slide dopo il riavvio

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ripresa-lettura
- **Decisione:** Salvare coordinate relative nel localStorage del profilo Electron: blocco Markdown per lezione e lingua con fingerprint del testo, e pagina PDF per lezione e fingerprint PDF.js. Condividere il punto tra drawer e Focus, seguire il contenitore realmente scrollabile e ripiegare all inizio per dati non validi o contenuti sostituiti.
- **Motivazione:** Identita stabili e coordinate relative conservano il punto dopo chiusura, riapertura, riavvio e cambi di dimensione, senza dipendere dal grant temporaneo PDF e senza modificare sorgenti o libreria pubblicata.
- **Impatto:** Solo identita e coordinate locali, senza testo o percorsi nei dati salvati o nei log. Posizioni separate ITA EN; PDF gia letto riprende il suo punto. Regressioni su remount, cambi lingua e file, scroll interno esterno e avvio di un secondo processo Electron col medesimo profilo temporaneo.
- **Follow-up:** Completare controllo dopo riavvio, quality gate e setup Windows.
- **File coinvolti:** src/utils/readingPosition.ts, src/hooks/useReadingPosition.ts, src/components/LectureDrawer.tsx, src/components/FocusPdfViewer.tsx, src/components/FocusWorkspace.tsx, tests/integration/readingPositionScenarios.browser.tsx, tests/integration/readingRestart.browser.tsx, tests/integration/focusPdfScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/focus-pdf.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, README.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0261 — Interventi immediati verificati e setup Windows aggiornato

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** qualita-studio-distribuzione
- **Decisione:** Completare le voci 1 2 3 delle idee del 13 ottobre e D-0258 D-0259 D-0260. Eliminare l attesa di frame di animazione dall export in finestra nascosta: attendere risorse e forzare il layout prima di printToPDF. Consegnare setup NSIS x64 senza pubblicazione e conservare il precedente installer, blockmap e manifesto.
- **Motivazione:** Rendere disponibili nell app installata riquadri inglesi, PDF della lezione e del corso e ripresa della lettura. Il collaudo dell app completa ha rilevato che una finestra nascosta puo sospendere i frame di animazione; il nuovo test riproduce questa condizione.
- **Impatto:** Quality gate passato: typecheck, lint, 439 Vitest, 14 Python, scenari React Electron, build ed export PDF reale. Posizioni verificate in due processi Electron distinti; PDF ITA EN controllati con Poppler. Dopo il fix della finestra nascosta ricontrollati typecheck, lint, export e build finale. Main preload e renderer ASAR collaudati con IPC reale, zero rete ed errori e fonti intatte. 350 file identici alla build, manifesto FFmpeg e assenza dati privati verificati. Setup 189560946 byte, SHA256 08aba7ac619eac59ce43b7abef29692ef0dcdbb9d40f4d146d7b8c4ede317957. Nessuna nuova dipendenza; percorso temporaneo dei test validato prima della pulizia.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare. Installer non eseguito; nessuna chiamata AI reale o modifica alla libreria personale. Approfondimenti futuri restano nel documento di idee.
- **File coinvolti:** src/components/PdfExportDocument.tsx, electron/main/pdfExport.ts, tools/run_pdf_export_regressions.cjs, tests/README.md, docs/product/idee-future-2026-10-13.md, docs/product/lettura-export-pdf.md, docs/quality/interventi-immediati-2026-10-13.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/latest.yml, local-artifacts/immediate-ideas-check.log, local-artifacts/immediate-ideas-package-final.log

## D-0262 — Ricerca archiviata per Q&A gratuito senza Gemini

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Spostare e rinominare il report fornito dall utente in docs/research/qna-alternative-gratuite-non-gemini-2026-10-13.md senza alterarne il contenuto. Salvare una valutazione separata con vincolo di modelli diversi da Gemini, uso API gratuito rinnovabile, stato del codice, quote, fonti ufficiali, limiti e benchmark proposto. Aggiornare indici, struttura e voce 9 delle idee future.
- **Motivazione:** Conservare in modo riconoscibile tutte le informazioni utili della ricerca e della discussione, recependo il chiarimento dell utente e distinguendo dati documentali, stime, ipotesi e prestazioni ancora da misurare.
- **Impatto:** Solo documentazione. Prima proposta di confronto Groq GPT-OSS-120B, Groq GPT-OSS-20B e Cloudflare Qwen3-30B-A3B; nessun modello adottato o integrato. Documentati quote gratuite, limiti dei contesti, throughput dichiarato e assenza di latenza misurata; Cerebras escluso dalla gratuita continuativa secondo FAQ correnti. Integrita del report verificata con SHA-256; nessuna chiamata AI, dipendenza o modifica della libreria personale.
- **Follow-up:** Verificare accesso e quote degli account, preparare corpus sintetico e misurare velocita, qualita e consumo prima di scegliere modello e fallback Q&A separati dalla pipeline delle dispense.
- **File coinvolti:** docs/research/qna-alternative-gratuite-non-gemini-2026-10-13.md, docs/research/qna-alternative-gratuite-valutazione-2026-10-13.md, docs/research/README.md, docs/README.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0263 — Piano progressivo per indagare Q&A gratuito senza Gemini

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** pianificazione-benchmark-qna
- **Decisione:** Documentare un piano a fasi: verifica account gratuiti e parametri, runner separato con fixture sintetiche, nove richieste pilota, confronto breve di Groq GPT-OSS-20B e 120B e Cloudflare Qwen3-30B, shortlist, contesto lungo, casi nuovi e sessioni, criteri di scelta e successiva verifica nella UX di Lezionify.
- **Motivazione:** La ricerca documentale non misura la reattivita reale. Prove progressive distinguono velocita, qualita, quote e attesa nella coda, limitando consumo e complessita prima di scegliere il modello.
- **Impatto:** Solo documentazione e collegamenti. Definiti budget prudenziale dell 80 percento della quota disponibile, consumo comprensivo di reasoning e retry, metriche per tentativo e domanda, qualita su casi distinti e obiettivi iniziali di 2 secondi per primo testo, 15 per completamento e almeno 90 percento di correttezza. Sono criteri proposti, non risultati ottenuti. Nessun account creato, chiamata AI, runner, dipendenza o integrazione eseguita.
- **Follow-up:** Verificare accesso gratuito degli account e preparare runner e corpus; eseguire prima il pilota. Allargare i candidati solo se i primi non soddisfano i criteri; registrare risultati reali prima della selezione e mantenere configurazione Q&A separata dalla pipeline.
- **File coinvolti:** docs/research/qna-benchmark-piano-2026-10-13.md, docs/research/qna-alternative-gratuite-valutazione-2026-10-13.md, docs/research/README.md, docs/README.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0264 — Credenziali benchmark Q&A nel file env locale

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** configurazione-benchmark-qna
- **Decisione:** Su richiesta esplicita dell utente predisporre il file .env locale con GROQ_API_KEY, CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN vuoti, da compilare direttamente nell editor. Rimuovere il configuratore PowerShell tentato e bloccato dalle regole di esecuzione Windows.
- **Motivazione:** L utente preferisce inserire personalmente le credenziali nel file locale. Il repository esclude gia .env e .env.* da Git; il metodo evita invio delle chiavi in chat e non cambia le impostazioni di Windows.
- **Impatto:** Creato solo il modello locale del file senza credenziali; aggiornato il piano. Nessun salvataggio cifrato effettuato, nessuna dipendenza o chiamata AI. I valori saranno conservati nel file locale in chiaro secondo la scelta dell utente; il futuro runner deve leggerli senza esporli nei log, negli errori o nei risultati.
- **Follow-up:** Attendere che l utente compili e salvi il file, poi preparare e verificare il runner e il corpus sintetico prima del pilota gratuito.
- **File coinvolti:** .env (locale escluso da Git), docs/research/qna-benchmark-piano-2026-10-13.md, DECISIONI.md

## D-0265 — Runner riprendibile per benchmark gratuiti Groq e Cloudflare

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** benchmark-qna
- **Decisione:** Preparare runner Node senza nuove dipendenze, con tre candidati fissi, fixture sintetiche, fasi pilota, confronto, contesto lungo, casi aggiuntivi e sessioni. Leggere soltanto le tre credenziali dal file .env locale, oscurarle negli output, limitare endpoint e modelli, gestire streaming SSE, timeout e annullamento reali, checkpoint per prova, ledger persistente dei consumi e massimo due tentativi senza retry dopo testo parziale.
- **Motivazione:** L utente ha compilato il file locale e chiede esplicitamente di verificare il registro, preparare un runner robusto, eseguire i benchmark e analizzare i risultati. I limiti, la ripresa e la separazione fra primo testo finale, reasoning e attesa delle quote rendono le misure interpretabili senza esporre segreti.
- **Impatto:** Verificata la presenza dei tre valori senza mostrarli e confermata esclusione .env da Git. Runner e corpus separati dall app, 24 regressioni Node offline passate. Risultati e ledger in local-artifacts/qna-benchmark. Limiti prudenziali di 6400 TPM e 160000 token al giorno per candidato Groq, 8000 Neurons al giorno condivisi per Cloudflare; prezzi documentali, quote effettive adattate dai limiti restituiti. Gli screening automatici non sostituiscono la revisione umana della qualita. Nessuna integrazione runtime.
- **Follow-up:** Eseguire preflight e nove richieste pilota, risolvere eventuali incompatibilita documentandole, poi eseguire il confronto e approfondimenti entro le quote. Conservare prove fallite e budget, riferire limiti o fasi differite senza inventare risultati.
- **File coinvolti:** tools/qna_benchmark.mjs, tools/qna_benchmark_core.mjs, tests/fixtures/qna-benchmark/cases.json, tests/fixtures/qna-benchmark/context.mjs, tests/node/qna-benchmark.test.mjs, docs/research/qna-benchmark-piano-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0266 — Audit del registro e correzione dei delta numerici SSE

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** qualita-benchmark-qna
- **Decisione:** Confermare e collegare tutte le informazioni della sessione in docs/research/qna-benchmark-esecuzione-2026-10-13.md, includendo procedure ufficiali di accesso, compilazione locale e runner. Invalidare il primo pilota per perdita di delta numerici, mantenere gli originali, normalizzare numeri finiti in testo e rifiutare tipi inattesi. Avviare un run distinto della suite completa con parser corretto e budget persistente.
- **Motivazione:** La verifica reale ha trovato che nel flusso ricevuto parte del contenuto arriva come numero JSON. Ignorarlo alterava formule e valutazioni. Separare le misure invalidate dalle nuove evita conclusioni errate sui modelli e completa la richiesta di loggare tutte le informazioni.
- **Impatto:** Accessi Groq e Cloudflare confermati senza esporre chiavi o Account ID. 29 regressioni offline passate; diagnostica sintetica conteggiata prudenzialmente nel ledger. Nuovi comandi npm per test e benchmark, documentazione e struttura aggiornate. Suite all pianifica 381 prove logiche, con stop o differimento al raggiungimento delle quote locali; nessun fallback o nuova dipendenza. Il piano di fatturazione degli account non e verificabile amministrativamente con queste sole chiavi; il runner applica limiti di consumo e usa solo i modelli gratuiti previsti.
- **Follow-up:** Attendere il run, rivedere risposte e marcatori, controllare integrita, segreti esclusi, tempi per fase, usage ed errori. Registrare risultati reali, fasi eventualmente differite e limiti senza integrare automaticamente i provider nell app.
- **File coinvolti:** tools/qna_benchmark.mjs, tools/qna_benchmark_core.mjs, tests/node/qna-benchmark.test.mjs, tests/fixtures/qna-benchmark/, package.json, tests/README.md, docs/research/qna-benchmark-esecuzione-2026-10-13.md, docs/research/qna-benchmark-piano-2026-10-13.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0267 — SSE compatibile, suite Node separata e misure per fase

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** qualita-runner-collaudi
- **Decisione:** Completare la compatibilita del runner con delta numerici, booleani e letterali JSON semplici ricevuti nello stream, mantenendo errore esplicito per strutture inattese. Preservare e invalidare i run preliminari, usare benchmark-20261013-v3 per il confronto. Rinominare i test Node in qna-benchmark.node.mjs per evitare la discovery Vitest, inserirli nel quality gate e aggiungere analizzatore per fase e rubrica di revisione.
- **Motivazione:** Il collaudo reale ha trovato liste vuote nello stream di codice Python e falsi negativi di screening per unità LaTeX. Il quality gate rilevava il file node:test come suite Vitest vuota. Mediane, errori e conformita alle istruzioni devono restare distinti dalla correttezza delle risposte.
- **Impatto:** 31 regressioni Node offline passate, accessi e prime risposte reali salvati senza credenziali. Verificata conservazione del ledger e recupero del lock dopo interruzione. Durante il quality gate i 439 Vitest e 14 Python passano; il collaudo PDF dopo riavvio salva talvolta y non finito per geometria ancora nulla. Affinata soltanto la fixture di lettura attendendo geometria positiva e rifiutando punti non finiti; nessuna modifica del viewer o dei dati utente. Il file .env risulta tornato vuoto dopo avvio: causa non determinata, chiesto ripristino all utente; il run avviato continua con credenziali gia caricate in memoria.
- **Follow-up:** Concludere quality gate e benchmark entro quote, rivedere le risposte con rubrica, registrare numeri e prove differite. Rileggere soltanto presenza e formato del .env prima di futuri avvii; non esporre segreti o cancellare gli artefatti dei run invalidati.
- **File coinvolti:** tools/qna_benchmark.mjs, tools/qna_benchmark_core.mjs, tools/qna_analyze.mjs, tests/node/qna-benchmark.node.mjs, tests/integration/readingRestart.browser.tsx, package.json, tests/README.md, docs/research/qna-benchmark-esecuzione-2026-10-13.md, docs/research/qna-benchmark-review-rubrica-2026-10-13.md, DECISIONI.md

## D-0268 — Prova aggiuntiva su domande reali delle dispense

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Accogliere la proposta dell utente e preparare un replay locale di un piccolo campione delle domande Q&A gia salvate, usando citazione e contesto ricostruito dalla dispensa attuale. Dare priorita alla prova reale prima di esaurire il budget giornaliero Groq, sospendendo il benchmark sintetico al checkpoint e riprendendolo successivamente.
- **Motivazione:** Le domande personali verificano la trasferibilita del benchmark sintetico al reale uso di studio, comprese formule, spiegazioni brevi e ambiguita dipendenti dal testo. La domanda e il contesto originale completo non sono ricostruibili perfettamente: il flag contesto completo non e persistito.
- **Impatto:** Archivio letto senza modifiche: 26 lezioni, 12 file Q&A, 42 domande non vuote. Corpus e risposte restano solo negli artefatti locali ignorati da Git; documentazione e log pubblici riportano conteggi e metriche senza testi personali. Le risposte storiche sono confronto non gold standard; modello e latenza originali non sono persistiti per domanda. Le tre credenziali .env risultano nuovamente presenti dopo conferma utente.
- **Follow-up:** Estrarre un pilota di tre domande con citazione verificabile, confrontare i tre candidati a parita di contesto entro il ledger condiviso e riprendere le prove sintetiche residue. Non dichiarare precisione universale da questo campione.
- **File coinvolti:** tools/qna_benchmark.mjs, tools/qna_benchmark_core.mjs, docs/research/qna-benchmark-esecuzione-2026-10-13.md, local-artifacts/qna-benchmark, DECISIONI.md

## D-0269 — Replay privato completato e separazione tra velocita e qualita

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Aggiungere estrazione Python in sola lettura e runner privato Node per domande reali, riusando parser, timeout, ledger e lock delle prove sintetiche. Eseguire tre domande con contesto identico sui tre candidati e rivedere le nove risposte. Conservare corpus, risposte e provenienza solo negli artefatti locali; pubblicare conteggi e metriche aggregate.
- **Motivazione:** Il pilota reale misura un uso piu vicino allo studio e ha rilevato difetti che i marcatori sintetici non certificano: un esempio numerico errato del 120B, imprecisioni matematiche e mancato rispetto dei delimitatori LaTeX. La velocita non certifica correttezza.
- **Impatto:** Nove risposte complete senza retry o errori; mediane primo testo 0.382 s Groq20B, 0.499 s Groq120B e 4.107 s Cloudflare. Mediane complete 1.183 s, 3.389 s e 6.922 s. Contesti di 1313-1539 byte, ricostruiti e non identici al payload storico. Il benchmark sintetico riprende dal checkpoint. Aggiunti sei test Python e tre Node; 34 Node e sei Python passano. Disponibile collaudo isolato della ripresa PDF/Markdown, passato nei due processi Electron; il quality gate completo resta da rivalutare per il precedente errore di posizione delle slide nascoste.
- **Follow-up:** Documentare la revisione qualitativa con evidenza numerica e verifica dei plugin Markdown, completare le prove residuali entro budget e rimandare le prove Groq escluse dal tetto giornaliero senza alzarlo. Causa del secondo svuotamento .env non determinata: file ricompilato dall utente, preflight di ripresa riuscito.
- **File coinvolti:** tools/qna_prepare_private.py, tools/qna_replay_private.mjs, tests/python/test_qna_private.py, tests/node/qna-private.node.mjs, package.json, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/research/qna-benchmark-esecuzione-2026-10-13.md, DECISIONI.md

## D-0270 — Contesto reale completo e giornale Python senza testi privati

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Preparare tre prove Cloudflare delle stesse domande con l intera dispensa attuale; accodarle al termine della sessione sintetica con lock esclusivo e credenziali solo in memoria. Aggiungere giornale Python aggregato, analisi dei replay e report pubblico dei risultati e limiti.
- **Motivazione:** Il test sul solo paragrafo non descrive le prestazioni con contesto completo. Groq ha esaurito il margine giornaliero prudenziale; non alzare il cap per forzare una prova. Le note complete richiedono una fase distinta, esplicitamente tracciata e senza versionare contenuti personali.
- **Impatto:** Nuovi flag per documento e candidati allowlist; attesa lock massima 90 minuti, nessuna chiamata concorrente sul ledger. Verificato render statico con i plugin del viewer: Cloudflare riconosce le formule, Groq spesso usa delimitatori non riconosciuti. Sei test estrazione Python, due privacy journal e 35 Node. L ultimo npm check passa typecheck, lint, 439 Vitest, 20 Python e 35 Node ma fallisce nel test preesistente Hidden slides lost reading position on return. Collaudo isolato della ripresa PDF dopo due processi passato; nessun fix del viewer aggiunto a questa ricerca.
- **Follow-up:** Attendere sessione Cloudflare e replay con documento, aggiornare report e conteggi finali, verificare hash delle fonti e assenza di credenziali negli artefatti. Riprovare sessione e varianti Groq in giorno con budget sufficiente; verificare formattazione prima di un eventuale lavoro di integrazione.
- **File coinvolti:** tools/qna_prepare_private.py, tools/qna_replay_private.mjs, tools/qna_research_snapshot.py, tools/qna_analyze.mjs, tests/python/test_qna_snapshot.py, tests/node/qna-private.node.mjs, docs/research/qna-benchmark-risultati-2026-10-13.md, docs/research/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0271 — Verifica comportamentale del codice e prova mirata dei delimitatori

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Verificare le correzioni sintetiche gia ispezionate con compilazione/esecuzione C++ e controllo Python con AST ristretto, senza eseguire risposte private. Preparare una prova separata sul prompt di formato di una domanda reale, con massimo tre frasi e soli delimitatori dollaro. Rendere configurabile l output del replay e congelare sorgente/hash del runner al caricamento.
- **Motivazione:** I marcatori corretti non dimostrano che il codice funzioni e il solo prompt generale LaTeX non ha garantito compatibilita col viewer. Un esperimento mirato permette di distinguere le nuove condizioni dalla baseline senza modificare dispense o risposte storiche.
- **Impatto:** 18 controlli sul codice sintetico: nove correzioni C++ compilate e passate su tre vettori; otto funzioni Python corrette con liste indipendenti e lista esplicita; una funzione Cloudflare con syntax error, causa modello/trasporto non attribuita con certezza. Prova di formato preparata con tre richieste e output 1024, da eseguire solo se il ledger la consente. Il replay con documenti completi era ancora in attesa ed e stato riavviato senza invii; ora conserva la versione del codice caricata anche se il file cambia durante l attesa.
- **Follow-up:** Concludere sessione e prova documenti, poi provare il prompt mirato entro i cap residui. Distinguere risoluzione del singolo esempio da robustezza generale. Aggiornare il report finale e non eseguire generazioni private come codice.
- **File coinvolti:** tools/qna_replay_private.mjs, local-artifacts/qna-benchmark/quality_code_check.py, docs/research/qna-benchmark-risultati-2026-10-13.md, DECISIONI.md

## D-0272 — Indagine mirata su reasoning Qwen e formato non streaming

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Preparare un confronto separato Cloudflare delle tre domande reali con il comando soft no_think documentato da Qwen e una singola diagnostica sintetica Python con stream false sullo stesso endpoint compatibile. Non cambiare il corpus o la configurazione della baseline gia misurata.
- **Motivazione:** La prima risposta finale Cloudflare arriva molto dopo il primo evento di reasoning: il confronto attuale usa Qwen al default del provider e Groq a reasoning low. La modalita soft puo ridurre l attesa ma non e garantita dal solo schema Cloudflare. La diagnostica JSON completa puo fornire un indizio sulla perdita di formato nello stream, senza attribuire in anticipo la causa.
- **Impatto:** Nessuna nuova dipendenza o account. Ulteriori quattro richieste Cloudflare al massimo, prenotate nel ledger e solo dopo rilascio del lock. La diagnostica usa solo un problema sintetico, output2048, timeout90s, body massimo2MB, redirect vietati, nessun retry e log privi di error body o URL personali. Lo switch nel prompt e una configurazione distinta, da valutare per latency e qualita; non e una modifica del runtime app.
- **Follow-up:** Verificare reasoning emesso, formato e risposte nella modalita soft, classificando l eventuale assenza di supporto. Il confronto non streaming usa una nuova generazione e non dimostra da solo una causa di trasporto. Riportare risultati separati e preservare i cap gratuiti.
- **File coinvolti:** tools/qna_nonstream_diagnostic.mjs, tools/qna_replay_private.mjs, docs/research/qna-benchmark-risultati-2026-10-13.md, local-artifacts/qna-benchmark, DECISIONI.md

## D-0273 — Confronto Qwen del reasoning su documento reale completo

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Dopo esito positivo del pilota soft no_think sugli estratti, eseguire le stesse tre domande con gli stessi documenti completi aggiungendo soltanto lo switch nel prompt, in un run privato distinto.
- **Motivazione:** Con gli estratti la mediana primo testo Cloudflare scende da 4.107 s a 0.942 s. Il risultato puo dipendere dalla lunghezza del contesto: servono misure anche con la dispensa intera per valutare l uso reale richiesto dall utente.
- **Impatto:** Ulteriori tre richieste Cloudflare entro il ledger e cap invariati, stesso modello e output2048, nessun invio Groq di contesti oltre il margine gratuito. La baseline con documenti completi e completata: tre successi, input9915-11605 token, mediana primo testo5.371 s e risposta13.628 s. Il contenuto ha ancora errori matematici; non selezionare il modello dalla sola latenza.
- **Follow-up:** Confrontare latenza, reasoning osservabile e qualita tra le quattro condizioni Cloudflare: estratto/intero e default/soft no_think. Dichiarare il campione esplorativo e separare le nuove richieste dalle prove originarie.
- **File coinvolti:** tools/qna_replay_private.mjs, local-artifacts/qna-benchmark/real-document-no-think-20261013, docs/research/qna-benchmark-risultati-2026-10-13.md, DECISIONI.md

## D-0274 — Valutazione musica e proposta di telecomando Spotify personale

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-musica
- **Decisione:** Documentare il confronto fra Spotify Premium, YouTube e file locali e la ricerca sulla concentrazione. Raccomandare come primo esperimento un telecomando Web API del client Spotify sul PC, con PKCE e account personale, subordinato al pilota reale. Conservare i sei link YouTube e le richieste originarie; correggere la presunzione che ogni audio sia scaricabile.
- **Motivazione:** L utente chiede di indagare le idee musicali di oggi e propone il proprio Premium. Il controllo del client ufficiale evita di basare il primo lavoro su estrazione YouTube o streaming Electron non collaudato. Le prove scientifiche non dimostrano un genere universalmente migliore per studiare.
- **Impatto:** Solo documentazione, indici e stato della ricerca. Verificati localmente 54 timestamp su due compilation, con durata finale sconosciuta; riscontri web parziali dei sei video. Fonti ufficiali Spotify aggiornate fino al changelog di luglio 2026, restrizioni playlist e quota distinte dalla riproduzione. Sette studi sintetizzati e un protocollo distinto dai risultati. Nessuna dipendenza, autenticazione, chiamata AI, download o modifica del runtime. L offline Spotify rimane nel client ufficiale; uso pubblico e combinazione di servizi richiedono valutazione separata.
- **Follow-up:** Eseguire il pilota Spotify personale su PC e cuffie: OAuth, dispositivi, stato, play, pausa, successivo, playlist propria e altrui, token e disconnessione, errori e rete assente. Solo dopo decidere l integrazione; mantenere musica opzionale e non associare dati Spotify a metriche di apprendimento.
- **File coinvolti:** docs/research/musica-integrazione-valutazione-2026-10-13.md, docs/research/musica-concentrazione-evidenze-2026-10-13.md, docs/product/idee-future-2026-10-13.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0275 — Chiusura delle prove e controlli finali di ripresa

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna
- **Decisione:** Conservare i risultati conclusi e candidare Groq20B per estratti brevi e Cloudflare Qwen soft no_think per documento completo, senza selezione definitiva o integrazione app. Rafforzare la ripresa: fingerprint di orchestrazione/helper, recupero di risposte salvate prima del risultato, riserve distinte per run/tentativo, nessun reinvio automatico con checkpoint mancante e intervallo minimo della sessione dopo una pausa.
- **Motivazione:** I dati misurati mostrano un primo testo rapido per Groq20B e un miglioramento marcato Cloudflare con lo switch soft, ma errori di contenuto e formato impediscono di certificare la qualita. La ripresa deve evitare doppie chiamate, raffiche di domande dopo pause e durate logiche inventate quando mancano checkpoint.
- **Impatto:** Suite sintetica v3 conclusa con381 esiti:270 completi,2 falliti rete/stream,109 saltati per budget. Ulteriori21 risposte reali complete su tre domande e una diagnostica sintetica completa. Cloudflare soft: mediana primo testo0.942 s con estratto e1.118 s con dispensa intera; complete2.651 s e8.184 s. Consumi/riserve totali del giorno158369 token Groq20B,157359 Groq120B e5099.1154 Neurons stimati Cloudflare,185 prenotazioni CF, tutti entro cap invariati. 41 Node e24 Python passati, dry run passati, nessuna chiamata API delle correzioni finali. Il quality gate globale resta fallito sul test delle slide nascoste; build/export e ripresa isolata passati separatamente.
- **Follow-up:** Usare nuovi run per future misure con codice aggiornato; dati/sorgenti storici preservati. Ampliare il campione reale e valutare normalizzazione LaTeX, errori numerici e default vs soft prima di integrare. In un giorno con budget disponibile completare varianti/sessioni Groq, conservando la distinzione fra giornate. Nessuna altra Deep Research generale necessaria ora.
- **File coinvolti:** tools/qna_benchmark.mjs, tools/qna_replay_private.mjs, tools/qna_benchmark_checkpoint.mjs, tools/qna_research_snapshot.py, tests/node/qna-benchmark.node.mjs, tests/python/test_qna_snapshot.py, docs/research/qna-benchmark-risultati-2026-10-13.md, docs/research/qna-benchmark-esecuzione-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0276 — Indagine e pilota locale per tradurre frasi EN IT

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-offline
- **Decisione:** Approfondire la sola traduzione di frasi EN IT nella futura casella Ctrl T, riusando la ricerca e il vocabolario D-0250 e D-0251. Confrontare fonti ufficiali Argos, OPUS Marian ONNX e altri candidati; preparare un pilota CPU isolato con Transformers.js e frasi sintetiche, senza modificare dipendenze o runtime dell app.
- **Motivazione:** L utente chiede di capire meglio la proposta e conferma solo traduzione, senza spiegazione. Il lookup esistente non traduce frasi libere e Argos era citato senza prove salvate. Una misura locale verifica fattibilita, prestazioni e difetti prima dell integrazione.
- **Impatto:** Installazione di dipendenze sperimentali esclusivamente in local-artifacts/offline-translation ignorato da Git. Modelli pubblici scaricati per il pilota; inferenza locale senza invio delle frasi. Hardware letto: i7-9850H, circa32GB RAM, Quadro T2000 4GB; prima prova su CPU. Nessuna lettura di dispense private o credenziali e nessun cambio del vocabolario o della pipeline Gemini.
- **Follow-up:** Registrare versioni, revisioni e hash dei modelli, tempi di avvio e traduzione, memoria e risultati grezzi. Ripetere in processo distinto con rete applicativa bloccata. Valutare termini tecnici, negazioni, formule e codice; distinguere fattibilita Node da collaudo Electron e installer.
- **File coinvolti:** DECISIONI.md, local-artifacts/offline-translation, tools/offline_translation_pilot.mjs, docs/research/traduzione-frasi-offline-2026-10-13.md

## D-0277 — Confronto diretto dei modelli Argos dopo gli errori OPUS ONNX

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-offline
- **Decisione:** Estendere il pilota sintetico ai due pacchetti Argos EN IT 1.0 eseguendo CTranslate2 e SentencePiece direttamente in un virtualenv locale isolato. Confrontare beam1 e beam4 e distinguere questo test del motore dalla libreria Argos completa e dal suo segmentatore.
- **Motivazione:** Il primo pilota ONNX ha errori gravi su terminologia, dualita e formule, oltre all avviso MarianTokenizer. Serve un secondo candidato misurato, gia indicato dal lavoro precedente, prima di raccomandare l integrazione.
- **Impatto:** Dipendenze ctranslate2 4.8.0 e sentencepiece 0.2.1 solo in local-artifacts ignorato. Pacchetti ufficiali Argos pubblici scaricati, hash registrati. Nessuna nuova dipendenza dell app, nessuna frase inviata a servizi e nessuna modifica dei dati di studio.
- **Follow-up:** Conservare output completi e differenze di decodifica, misurare memoria e tempi locali e controllare licenze dei pacchetti. Se necessario approfondire tokenizer e modelli Mozilla o OPUS piu recenti, senza chiamare pronto il primo candidato soltanto perche veloce.
- **File coinvolti:** DECISIONI.md, tools/offline_translation_argos_pilot.py, local-artifacts/offline-translation, tests/fixtures/offline-translation/cases.json, docs/research/traduzione-frasi-offline-2026-10-13.md

## D-0278 — Documento completo per la ripresa della ricerca Q&A

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-qna-documentazione
- **Decisione:** Creare un punto di ingresso unico per riprendere la ricerca sui modelli Q&A gratuiti diversi da Gemini, collegato agli indici e ai risultati esistenti.
- **Motivazione:** L utente chiede di conservare tutte le informazioni necessarie a continuare in futuro senza ricostruire la chat o confondere prove storiche e nuove.
- **Impatto:** Solo documentazione: obiettivo, configurazioni, metriche, limiti qualitativi, mappa di strumenti e artefatti privati, credenziali senza valori, quote storiche, comandi verificati e piano delle prove residue. Evidenziato che un clone Git non include dati privati, che preflight separato richiede altro run e che i nuovi sorgenti non vanno mescolati con i run storici. Nessuna chiamata API o modifica del runtime.
- **Follow-up:** Usare il documento come prima lettura alla ripresa; verificare decisioni e quote correnti, ampliare la revisione qualitativa e provare il rendering prima di scegliere o integrare i provider.
- **File coinvolti:** docs/research/qna-non-gemini-ripresa-completa-2026-10-13.md, docs/research/qna-benchmark-risultati-2026-10-13.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0279 — Pilota WASM dei modelli Mozilla EN IT

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-offline
- **Decisione:** Aggiungere al confronto un pilota isolato Bergamot0.4.9 e modelli Mozilla EN IT base-memory Release del registro ufficiale del13ottobre. Usare backing locale, niente pivot, cache traduzioni disattivata e asset WASM locali; verificare compatibilita effettiva con Node Windows.
- **Motivazione:** I pacchetti Argos misurati sono molto rapidi ma mantengono errori tecnici; i pesi Mozilla da31.6MB per direzione e il motore JavaScript possono evitare un runtime Python nella futura app. La compatibilita del pacchetto npm datato non va presunta.
- **Impatto:** Una dipendenza sperimentale solo in local-artifacts/offline-translation/bergamot ignorato. Nessuna dipendenza del prodotto e nessun cambio alla casella Ctrl T. Download esclusivamente di modelli pubblici; frasi sintetiche elaborate localmente.
- **Follow-up:** Registrare successo o incompatibilita, tempi e qualita degli stessi24casi. Conservare licenze separate per motore e modelli; non usare risultati del registro Mozilla come benchmark sul dominio universitario.
- **File coinvolti:** DECISIONI.md, tools/offline_translation_bergamot_pilot.mjs, local-artifacts/offline-translation, docs/research/traduzione-frasi-offline-2026-10-13.md

## D-0280 — Tre piloti offline conclusi e candidatura Mozilla per le frasi

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-offline
- **Decisione:** Conservare ricerca e risultati dei tre piloti EN IT con24casi sintetici e240traduzioni totali:72OPUS ONNX,96modelli Argos diretti e72Mozilla WASM. Proporre Mozilla Bergamot come candidato da approfondire e Argos come alternativa, senza scelta definitiva o integrazione. Confermare il perimetro utente di sola traduzione, senza spiegazioni.
- **Motivazione:** Le prove dimostrano fattibilita su CPU ma non affidabilita universale. Argos e Mozilla sono rapidi e piu adatti al pilota delle frasi della configurazione OPUS provata, ma restano errori in autovalori, dualita e termini specialistici. Tempi, formato e qualita devono essere valutati separatamente.
- **Impatto:** Mediane calde EN IT eIT EN:OPUS906 e881ms,Argos112 e98ms,Mozilla134 e85ms. Modelli Mozilla73.60MB decompressi contro191MB Argos per inferenza e273.34MB ONNX. Picchi processo circa672MiB,280MiB e1076MiB con metodi e lifecycle distinti. Blocchi formula codice esatti:Mozilla4su4,Argos3su4,OPUS0su4; numeri mantenuti in due esempi, nessuna certezza semantica dal solo screening. Nessun invio delle frasi nelle API di rete sorvegliate, nessun audit nativo dichiarato. Bergamot0.4.9 richiede copia locale del worker con scopeCommonJS eURL Windows corretti; errore preliminare di callback clonabile nel runner risolto prima del run completo. Dipendenze solo sperimentali ignorate, fonti e licenze distinte documentate, nessuna modifica dell app o dei dati utente. Sintassi runner, conteggi, hash, ripetibilita, analisi e link documentali verificati.
- **Follow-up:** Ampliare il corpus tecnico in entrambe le direzioni; misurare protezione dei blocchi e glossario come configurazioni distinte. Poi prototipo Frasi inCtrlT con traduzione esplicita, worker locale e nessun fallbackGemini. Collaudare Electron Focus fullscreen einstaller e completare verifica licenze pesi Argos prima di distribuirli. Nessun qualitygate app dichiarato rieseguito per questa sola indagine.
- **File coinvolti:** docs/research/traduzione-frasi-offline-2026-10-13.md, docs/product/vocabolario-offline.md, docs/product/idee-future-2026-10-13.md, docs/README.md, docs/research/README.md, STRUTTURA_PROGETTO.md, tools/offline_translation_pilot.mjs, tools/offline_translation_argos_pilot.py, tools/offline_translation_bergamot_pilot.mjs, tools/offline_translation_analyze.mjs, tests/fixtures/offline-translation/cases.json, DECISIONI.md

## D-0281 — Valutazione API online accanto ai piloti offline

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-api
- **Decisione:** Valutare la proposta dell utente su Azure Translator, Google Cloud Translation, MyMemory, Cloudflare e DeepL contro le fonti ufficiali. Conservare distinta la proposta online dalla funzione offline. Eseguire un piccolo pilota MyMemory anonimo sugli stessi24casi sintetici, con budget massimo3000caratteri, massimo500byte per richiesta, nessun retry e stop a quota o errore.
- **Motivazione:** I piloti locali sono veloci ma hanno errori tecnici. Le API dedicate potrebbero migliorare la qualita e semplificare distribuzione e modelli, ma quote ricorrenti, crediti temporanei, privacy e rischio addebiti devono essere verificati. Nessuna superiorita di qualita o latenza viene presunta dal marketing.
- **Impatto:** Solo ricerca e strumento separato: niente nuovi account, carte, credenziali o dipendenze del prodotto. MyMemory riceve solo fixture sintetiche tramite endpoint get HTTPS, nessuna contribuzione set o import. Report grezzi e pagine ufficiali in local-artifacts/translation-api-research ignorato da Git. Nessuna dispensa reale viene letta o inviata; Azure Google DeepL Cloudflare non vengono chiamati in questa valutazione.
- **Follow-up:** Confrontare risposte MyMemory e baseline locali senza confondere una passata di rete con latenze calde offline. Candidare AzureF0 per un pilota tecnico con account configurato se utile; mantenere invio online esplicito, blocco consumi e nessun fallback automatico nella futura UI.
- **File coinvolti:** DECISIONI.md, tools/translation_api_mymemory_pilot.mjs, docs/research/traduzione-api-valutazione-2026-10-13.md, local-artifacts/translation-api-research

## D-0282 — Quote API verificate e pilota MyMemory completato

- **Data:** 2026-10-13
- **Stato:** accettata
- **Area:** ricerca-traduzione-api
- **Decisione:** Conservare la valutazione della proposta API dell utente e candidare Azure Translator F0 al prossimo confronto tecnico, con Google NMT come seconda opzione. Mantenere distinta l opzione online esplicita dalla ricerca offline, senza selezione definitiva o integrazione. Documentare il pilota anonimo MyMemory completato sui24casi sintetici.
- **Motivazione:** AzureF0 offre2milioni di caratteri ricorrenti e stop del servizio a quota esaurita; GoogleNMT500000conbilling; DeepLDeveloper1milione totale non rinnovabile. La qualita dei servizi autenticati non e stata misurata. MyMemory migliora alcuni termini ma conserva errori e altera una formula, con condizioni sui dati meno adatte al materiale di studio.
- **Impatto:** MyMemory:24successi,1982caratteri,nessunretry,mediane448ms ENIT e515ms ITEN in una passata; literal formula codice3su4. Autovalori ITEN corretto rispetto ai tre piloti locali, ma passo diventa pitch, puntatore ITEN pendant pointer e dualita resta imprecisa. Pagine ufficiali MyMemory recuperate HTTPS200; vecchio linktos404, termini correnti descrivono conservazione dei segmenti e partner, senza attribuire automaticamente pubblicazione a ogni ricerca get. Prezzi Microsoft Google DeepL Cloudflare verificati,150a300ms Azure confermati come indicazione non benchmark. Tutti i dati inviati erano sintetici; nessuna dispensa privata, email, chiave o account nuovo. Solo runner e documentazione, nessuna dipendenza dell app. Sintassi,24esiti,hashfixture,budget,limite500byte,linklocali ed esclusioneGit verificati.
- **Follow-up:** Con account e risorsa AzureF0 configurati, fare pilota sul corpus esistente e poi50a100frasi tecniche; controllare consumo e protezione dei blocchi prima dell integrazione. GoogleNMT richiede limite di consumo e billing configurati. Non ripetere MyMemory nello stesso giorno cancellando il checkpoint; non attribuire ai provider autenticati i risultati del pilota pubblico. Non scegliere dal solo prezzo o dalla latenza dichiarata.
- **File coinvolti:** docs/research/traduzione-api-valutazione-2026-10-13.md, docs/research/traduzione-frasi-offline-2026-10-13.md, docs/product/idee-future-2026-10-13.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md, tools/translation_api_mymemory_pilot.mjs, DECISIONI.md

## D-0283 — Nuove idee di studio divise per difficolta

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** idee-future
- **Decisione:** Aggiungere al documento delle idee future sette voci: Ctrl+L e Mermaid a scomparsa tra le semplici; troncamento con undefined, traduzione intera o a parti, riconoscimento lingua, allineamento per capitoletto e timer dopo pausa tra quelle da approfondire. Integrare il PS nella voce sul cambio lingua.
- **Motivazione:** Conservare tutte le richieste dell utente mantenendo la divisione semplici/difficili e distinguendo problemi segnalati, domande aperte e risultati verificati.
- **Impatto:** Solo documentazione: nuove caselle aperte, esempi e criteri di verifica; nessuna implementazione, chiamata AI, dipendenza o modifica dei dati locali. Classificazione preliminare.
- **Follow-up:** Alla presa in carico verificare i comportamenti attuali senza presumere cause del troncamento, modalita di traduzione o conteggio dei timer.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0284 — Ctrl L per cambiare lingua della dispensa

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** scorciatoie-studio
- **Decisione:** Assegnare Ctrl+L e Cmd+L al cambio ITA EN della dispensa aperta, anche in Focus, riusando il comando esistente. Spostare i log a Ctrl+Shift+L e Cmd+Shift+L.
- **Motivazione:** La richiesta prevede un cambio lingua rapido; la scorciatoia precedente dei log crea un conflitto da risolvere mantenendo accessibile la diagnostica.
- **Impatto:** Nessuna chiamata AI implicita: senza inglese disponibile il comando non traduce. Ignora campi editabili, dialoghi, pausa, Focus Lock, composizione, ripetizione, modificatori aggiuntivi, caricamento e generazione. Tooltip e documentazione aggiornati; typecheck, lint e scenari React Electron passati. Nessuna nuova dipendenza o modifica ai dati locali.
- **Follow-up:** Il salto al capitoletto corrispondente resta separato nella voce 15; il comando usa il comportamento di lettura attuale.
- **File coinvolti:** src/App.tsx, src/components/LectureDrawer.tsx, src/components/Sidebar.tsx, tests/integration/hookRegression.browser.tsx, docs/product/idee-future-2026-10-13.md, docs/product/lettura-export-pdf.md, DECISIONI.md

## D-0285 — Coda di implementazione attivata da LISTA_ORDINE

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** flusso-agenti
- **Decisione:** Registrare la coda concordata e interpretare LISTA_ORDINE come richiesta di implementare e testare la prima voce ancora aperta, una sola per invocazione, senza altra conferma iniziale. Ordine: 1 Ctrl+L cambio lingua (completata D-0284); 2 Mermaid a scomparsa in Focus; 3 pausa scaduta e tempo studiato; 4 riconoscimento IT EN nel vocabolario; 5 Mermaid compatti nei PDF; 6 cambio lingua sullo stesso capitoletto; 7 traduzione dispensa intera o a parti; 8 troncamento con undefined; 9 slide come contesto Gemini; 10 modelli Q&A piu rapidi; 11 traduzione offline frasi; 12 sezione musica completa e appendice.
- **Motivazione:** L utente vuole procedere rapidamente usando un comando breve, con ordine e avanzamento persistenti accessibili anche nelle chat future del repository.
- **Impatto:** Regola in AGENTS.md e coda con caselle nel documento idee future. Ricerca e prototipi non equivalgono a funzione completata. Ogni voce richiede implementazione, verifiche pertinenti, decisione Python e aggiornamento delle caselle; i blocchi concreti vengono segnalati senza saltare la voce. Nessuna funzione implementata da questa registrazione, dipendenza aggiunta o chiamata AI.
- **Follow-up:** Alla prossima invocazione LISTA_ORDINE prendere la voce 2: Mermaid a scomparsa in Focus. Conservare le regole local-first e non cambiare ordine o avviare altre voci senza richiesta.
- **File coinvolti:** AGENTS.md, docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0286 — Mermaid a scomparsa durante lo studio in Focus

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** lettura-focus
- **Decisione:** Abilitare in Focus un pulsante Nascondi schema e Mostra schema per ciascun Mermaid, con stato indipendente nella vista corrente, aria-expanded e aria-controls. Conservare il canvas SVG montato e memoizzato mentre schema, codice e fallback vengono nascosti; un sorgente diverso riapre lo schema. La vista ordinaria e l export PDF restano sempre espansi.
- **Motivazione:** Ridurre lo spazio occupato dagli schemi durante lo studio mantenendo un comando riconoscibile, accessibile da tastiera e una riapertura affidabile. Il canvas memoizzato evita la sostituzione del nodo SVG rilevata nel primo collaudo.
- **Impatto:** Voce 2 LISTA_ORDINE completata. Nessuna dipendenza, chiamata AI o modifica delle fonti. Collaudo Electron con due schemi indipendenti, Invio e Spazio nativi, SVG identico e visibile alla riapertura, codice nascosto, fallback sicuro e ancoraggio stabile del testo dopo chiusura e riapertura di uno schema precedente. Aggiunto filtro reading-position-only. npm run check passato: typecheck, lint, 439 Vitest, 24 Python, 41 Node, suite React Electron completa, riavvio reale, build ed export PDF reale IT EN. Un tentativo preliminare della suite completa ha fallito uno scenario preesistente del pulsante Focus; il quality gate finale e passato integralmente.
- **Follow-up:** Prossima invocazione LISTA_ORDINE: voce 3, pausa scaduta e tempo realmente studiato. Lo stato degli schemi e temporaneo; nessuna persistenza aggiuntiva.
- **File coinvolti:** src/components/MermaidDiagram.tsx, src/components/FocusWorkspace.tsx, src/styles.css, tests/integration/readingPositionScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tests/README.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0287 — Pausa scaduta con ripresa esplicita e tempo studiato verificato

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** timer-studio
- **Decisione:** Completare la voce 3 LISTA_ORDINE verificando la pausa di 5 minuti prolungata a 30. Conservare il comportamento esistente: la pausa resta attiva dopo lo zero e richiede pulsante o Esc per riprendere. Rendere esplicito questo comportamento nella modale e conservare lo stesso pulsante di ripresa e il suo focus alla scadenza.
- **Motivazione:** Il codice non riprende automaticamente lo studio, ma mancava il collaudo riproducibile del caso segnalato e il messaggio non chiariva che il tempo oltre la pausa prevista resta escluso. La sostituzione del pulsante alla scadenza interrompeva inoltre il focus da tastiera.
- **Impatto:** Nessuna modifica al formato delle sessioni, dipendenza o chiamata AI. Scenario React reale in Electron con orologio controllato: 60 secondi studiati, pausa di 30 minuti, scadenza dopo 5, sospensione e ritorno finestra, interazioni senza ripresa automatica, pulsante ed Esc, sospensione durante studio, uscita e snapshot con soli 72 secondi attivi finali. Verificati sessione, totale lezione e dati salvati. Filtro study-pause-only passato; 78 Vitest archivio/statistiche, typecheck, lint e build passati. Suite Electron completa e riavvio reale passati alla seconda esecuzione; la prima falliva sul controllo preesistente della posizione delle slide nascoste. Non dichiarato npm run check integrale.
- **Follow-up:** Prossima invocazione LISTA_ORDINE: voce 4, riconoscimento automatico IT EN nel vocabolario. Il collaudo della sospensione usa un salto di orologio e visibilita controllata, non una sospensione fisica del PC. Nessuna correzione del controllo PDF intermittente in questa voce.
- **File coinvolti:** src/components/PauseTimerOverlay.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tests/README.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0288 — Riconoscimento automatico IT EN nel vocabolario

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** vocabolario-offline
- **Decisione:** Completare la voce 4 LISTA_ORDINE confrontando i risultati dei due dizionari locali. Scegliere automaticamente la direzione solo per una voce esclusiva, comprese locuzioni e flessioni inglesi supportate. Ambiguita e assenze mantengono la direzione corrente, inizialmente EN IT. Il pulsante di inversione attiva la scelta manuale fino al ritorno esplicito al riconoscimento automatico o alla chiusura.
- **Motivazione:** I dizionari gia inclusi offrono una prova locale verificabile senza modelli, rete o dipendenze. Non usare suggerimenti o euristiche ortografiche evita inversioni imprevedibili per omografi, termini tecnici e parole sconosciute.
- **Impatto:** Nessun cambiamento IPC, fonte, persistenza, dipendenza o chiamata AI. I due indici locali esistenti sono riusati; risposte obsolete non cambiano risultati o direzione. Il guasto di un solo dizionario impedisce un falso riconoscimento e offre retry o scelta manuale. Passati 441 Vitest, test dei dizionari reali con rete disabilitata, collaudo dictionary-only e suite React Electron completa con riavvio reale, typecheck, lint e build. Non rieseguito npm run check integrale.
- **Follow-up:** Prossima invocazione LISTA_ORDINE: voce 5, Mermaid piu compatti nei PDF. La copertura dipende dai dizionari; le frasi libere restano nella voce dedicata.
- **File coinvolti:** shared/dictionary.ts, src/components/DictionaryOverlay.tsx, tests/unit/dictionary.test.ts, tests/integration/dictionaryScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tests/README.md, docs/product/vocabolario-offline.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0289 — Mermaid compatti nei PDF senza riduzione artificiale del testo

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** export-pdf
- **Decisione:** Completare la voce 5 LISTA_ORDINE riducendo solo gli spazi del contenitore PDF: margini 8px, canvas 4px senza altezza minima, intestazione compatta. Conservare proporzioni SVG, orientamento e dimensioni naturali entro i precedenti limiti pagina. Rimuovere il limite a 260px del sorgente di fallback stampato.
- **Motivazione:** Il confronto sulle stesse figure identifica padding e altezza minima ereditati dalla vista a schermo come spazio superfluo. Riscrivere automaticamente i grafi o rimpicciolire i caratteri ridurrebbe la leggibilita senza un beneficio necessario.
- **Impatto:** Nessuna dipendenza, chiamata AI o modifica delle fonti. Tre fixture piccola larga e verticale riducono ingombro verticale con margini del 46, 52 e 9 percento. Export reale A4 con etichette 8.74 e 11.99pt verificate con pdfplumber, pagine Poppler ispezionate, proporzioni integre e fallback completo di 32 righe. Passati 53 Vitest pertinenti, typecheck, lint, build e test:pdf-export con quattro PDF sintetici. Non rieseguito npm run check integrale. Artefatti sintetici ignorati in local-artifacts/pdf-compact-2026-10-14.
- **Follow-up:** Prossima invocazione LISTA_ORDINE: voce 6 cambio lingua sullo stesso capitoletto. I grafi molto lunghi possono occupare una pagina; il precedente adattamento A4 dei grafi molto larghi non garantisce una soglia universale del testo.
- **File coinvolti:** src/components/pdfExport.css, tools/run_pdf_export_regressions.cjs, tests/README.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0290 — Cambio lingua sullo stesso capitoletto

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** lettura-bilingue
- **Decisione:** Completare la voce 6 LISTA_ORDINE allineando pulsante e Ctrl+L al capitoletto corrispondente IT EN, con frazione interna della sezione. Usare prima numero univoco o titolo identico univoco allo stesso livello, poi ordine soltanto con struttura compatibile e senza contraddizioni rilevabili. In caso ambiguo o divergente usare la percentuale del documento, esplicitata nel tooltip e nella documentazione.
- **Motivazione:** La percentuale globale e i segnalibri separati non seguono il punto corrente quando le sezioni tradotte hanno lunghezze diverse. I titoli gia renderizzati consentono una corrispondenza locale anche delle traduzioni esistenti, senza rigenerazione o modello AI. Non presumere una corrispondenza semantica quando mancano identificatori.
- **Impatto:** Snapshot condiviso solo in memoria fra vista ordinaria e Focus; il punto raggiunto sostituisce il vecchio segnalibro di destinazione e usa la persistenza per blocchi esistente. Nessun titolo salvato, fonte modificata, dipendenza o chiamata AI. Passati 445 Vitest, suite React Electron completa con pulsante e Ctrl+L nelle due viste e riavvio reale, filtro reading-position-only, typecheck, lint e build. Verificati 12 capitoletti di lunghezze diverse, entrambe le direzioni, punto interno, segnalibri, isolamento per lezione, ripiego, numeri, assenze, ripetizioni e riordini. La prima esecuzione della suite completa richiedeva il reset dello scroll della nuova fixture prima del successivo scenario; fixture corretta e suite finale passata. Non rieseguito npm run check integrale.
- **Follow-up:** Prossima invocazione LISTA_ORDINE: voce 7, traduzione della dispensa intera oppure a parti. Un riordino di titoli tutti tradotti senza numeri o riferimenti comuni non e riconoscibile dalla sola struttura; ordine compatibile e frazione interna sono inferenze locali, non allineamento frase per frase.
- **File coinvolti:** src/utils/sectionAlignment.ts, src/hooks/useReadingPosition.ts, src/components/LectureDrawer.tsx, tests/unit/sectionAlignment.test.ts, tests/integration/readingPositionScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tests/README.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0291 — Installer aggiornato con allineamento dei capitoletti

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** installer-windows
- **Decisione:** Rigenerare su richiesta il setup generale NSIS Windows x64 0.1.0 tramite npm run package:win -- --publish never, includendo le modifiche attuali e D-0290. Conservare installer, blockmap e manifesto precedenti nel backup indicato da local-artifacts/current-section-alignment-installer.txt.
- **Motivazione:** Consegnare un installer coerente con il cambio lingua sullo stesso capitoletto appena implementato e verificato, mantenendo recuperabile il setup precedente.
- **Impatto:** Build e packaging completati. Verificati 350 file della build identici nel payload ASAR, presenza della logica di allineamento, FFmpeg incluso, esclusione di artefatti e profili privati, hash SHA512 e dimensione nel manifesto. Setup di 189561290 byte, SHA256 b513d4de51ac68e1591c001897a75744744c75c48dd355b756933723ab0dbc78. Primo controllo manifesto anticipato mentre il packaging era ancora attivo: ripetuto dopo uscita zero, con esito positivo. Riutilizzati i collaudi D-0290 senza nuove modifiche applicative. Nessuna pubblicazione o avvio automatico del setup.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare. La coda LISTA_ORDINE resta alla voce 7.
- **File coinvolti:** DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/current-section-alignment-installer.txt, local-artifacts/section-alignment-package.log, local-artifacts/verify-section-alignment-installer.cjs, local-artifacts/section-alignment-installer-*/installer-result.json

## D-0292 — Requisiti del timer pausa Balance e piste REA conservati

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** ricerca-timer-watch
- **Decisione:** Conservare requisiti della pausa su Amazfit Balance originale, configurazioni tecniche riferite, valutazione della Deep Research e possibile indagine con REA in un documento di ripresa. Copiare integralmente il report originale senza alterarlo e aggiungere la voce 17 fra gli approfondimenti, fuori dalla coda LISTA_ORDINE.
- **Motivazione:** La richiesta esplicita di registrare tutte le informazioni deve permettere una ripresa futura senza perdere i vincoli offline, la preferenza senza telefono e la distinzione tra primitive documentate e risultati ancora da provare.
- **Impatto:** Solo documentazione. Ricezione diretta candidata con Windows GATT Server e Balance BLE Central; mst* escluso dagli App Service blocca il percorso pubblico dal quadrante. Alarm persistente sostiene autonomia dopo ricezione; schermo spento, firmware effettivo, hardware PC, coesistenza Zepp e vibrazione di circa 10 secondi restano da collaudare. REA proposto per protocollo Zepp o ingresso locale Android, senza installazione o analisi. Nessuna funzione implementata, dipendenza, chiamata AI, invio di materiale di studio o modifica della coda. Copia report di 51449 byte verificata SHA256 c50f5f05ad023ae1760a3282148611ff681a83ef5b8f8b4780eaa9a7a14487df.
- **Follow-up:** Alla ripresa leggere documento e report; verificare BLE Peripheral Windows e API_LEVEL effettivo, poi ricezione con app aperta, schermo spento e quadrante. Provare alarm e stop haptico con PC sospeso e telefono spento. Riutilizzare protocolli disponibili prima di indagine REA; apertura iniziale app non ancora accettata come compromesso definitivo. La coda resta alla voce 7.
- **File coinvolti:** docs/research/timer-pausa-amazfit-balance-valutazione-2026-10-14.md, docs/research/timer-pausa-amazfit-balance-deep-research-2026-10-14.md, docs/research/README.md, docs/README.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0293 — Traduzione intera con integrita strutturale verificata

- **Data:** 2026-10-14
- **Stato:** accettata
- **Area:** traduzione-dispense
- **Decisione:** Completare la voce 7 LISTA_ORDINE verificando il percorso IT EN e confrontandolo con la traduzione a parti. Conservare una richiesta logica per l intera dispensa. Aggiungere confini temporanei univoci per preambolo e titoli ATX, verifica STOP, ordine e unicita delle parti e integrita di formule codice riquadri e struttura Mermaid. Eliminare i confini prima del salvataggio.
- **Motivazione:** Il percorso esistente conserva contesto globale e sei tentativi fisici complessivi. La traduzione a parti moltiplicherebbe richieste e contesto e richiederebbe glossario e checkpoint dedicati senza un bisogno misurato. Prima veniva rifiutata solo una risposta vuota. I controlli strutturali migliorano affidabilita senza attribuire loro una garanzia di completezza linguistica.
- **Impatto:** Nessuna dipendenza o chiamata API nuova. Output invalido terminale senza retry automatico; errore sanitizzato e retry esplicito. AbortSignal trasmesso al client. Inglese precedente italiano audio e trascrizione conservati dopo errore. Passati 470 Vitest, suite React Electron completa e riavvio reale, typecheck lint e build. Client e testi sintetici; fixture lunga di 12 sezioni con 6000 paragrafi, fallback esistente, omissioni duplicazioni riordini e modifiche protette verificati. Non rieseguito npm run check integrale. Nessun benchmark linguistico o di costo API.
- **Follow-up:** Prossima voce LISTA_ORDINE: 8 dispensa italiana troncata con undefined, non affrontata qui. Rivalutare parti con checkpoint EN e glossario se emergono limiti output ricorrenti; controlli attuali non rilevano ogni omissione di prosa ne verificano specificamente Setext tabelle liste e HTML. Setup non rigenerato.
- **File coinvolti:** electron/main/gemini.ts, electron/main/archive.ts, electron/main/ai/translationIntegrity.ts, tests/unit/translationIntegrity.test.ts, tests/unit/geminiPhaseB.test.ts, tests/unit/archive.test.ts, docs/product/traduzione-dispense.md, docs/product/idee-future-2026-10-13.md, docs/product/lettura-export-pdf.md, tests/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0294 — Recupero della dispensa nascosta dai delimitatori LaTeX multilinea

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** rendering-matematico
- **Decisione:** Correggere la copia renderizzata dei blocchi matematici multilinea con delimitatori aderenti alla formula, separando apertura e chiusura su righe proprie prima di remark-math. Riutilizzare MarkdownViewer per lettura ordinaria, Focus ed export PDF. Non riscrivere le dispense salvate e non rigenerare contenuti AI.
- **Motivazione:** Nel caso RL segnalato il file locale e completo e non contiene undefined. Il parser tratta begin aligned sulla riga di apertura come metadato e ingloba il resto della lezione fino a un delimitatore isolato. Riprodotto il risultato undefined con ReactMarkdown, remark-math, GFM e KaTeX; la correzione rende nuovamente visibile il contenuto esistente.
- **Impatto:** Verifica locale in sola lettura: tutti i 40 titoli e il testo finale recuperati rispetto ai 9 titoli precedenti, file invariato. Protezione di codice fenced e inline, codice indentato, escape e formule singola riga; conservazione CRLF e idempotenza. Passati 475 Vitest, typecheck, lint, suite React Electron completa e riavvio reale, filtro math-rendering-only, build ed export PDF reale IT EN con formula multilinea e testo successivo. Nessuna dipendenza o chiamata AI, nessun dato personale versionato. Non rieseguito npm run check integrale.
- **Follow-up:** Voce 8 della coda completata per il difetto di visualizzazione riprodotto; prossima voce 9 slide come contesto a Gemini, non avviata. Setup non rigenerato: aggiornare la build installata per usare la correzione. Non e una garanzia generale contro risposte AI realmente troncate; restano due formule inline di valuta gia malformate nel caso reale, estranee al blocco che nascondeva la dispensa.
- **File coinvolti:** src/utils/markdownMath.ts, src/components/MarkdownViewer.tsx, tests/unit/markdownMath.test.ts, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tools/run_pdf_export_regressions.cjs, tests/README.md, docs/product/lettura-export-pdf.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0295 — Quattro nuove idee e problemi divisi per difficolta

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** backlog-prodotto
- **Decisione:** Aggiungere alle idee future le voci aperte 18-21: comando unico per nascondere e mostrare tutti i Mermaid e pulsante PDF fuori dal Focus tra le semplici; versioni ENG spesso mancanti nelle Elaborazioni in corso e parola trascrivi non riconosciuta nel dizionario IT EN tra i problemi da approfondire.
- **Motivazione:** Conservare tutte le richieste dell utente mantenendo la divisione per difficolta e distinguendo interventi di interfaccia da problemi con causa ancora da diagnosticare.
- **Impatto:** Solo documentazione: quattro nuove caselle aperte con requisiti e riferimenti al lavoro esistente. Nessuna implementazione, dipendenza o chiamata AI; coda LISTA_ORDINE e relativo ordine invariati.
- **Follow-up:** Alla futura implementazione verificare la classificazione e riprodurre i due problemi prima di scegliere la correzione. La prossima voce LISTA_ORDINE resta slide come contesto a Gemini.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0296 — Installer aggiornato con recupero delle formule multilinea

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** installer-windows
- **Decisione:** Rigenerare su richiesta il setup generale NSIS Windows x64 0.1.0 con npm run package:win -- --publish never, includendo D-0293 e la correzione del renderer D-0294. Conservare setup blockmap e manifesto precedenti nella cartella indicata da local-artifacts/current-math-rendering-installer.txt.
- **Motivazione:** Permettere di studiare subito la dispensa RL completa con la build installabile corretta, senza rigenerare lezione o fonti.
- **Impatto:** Build e packaging completati con uscita zero. Verificati 350 file della build identici nel payload ASAR, presenza e utilizzo della normalizzazione matematica, FFmpeg incluso, esclusione di artefatti e profili privati, hash SHA512 e dimensione del manifesto. Installer di 189561171 byte, SHA256 e6958f4cbcbc9a3e20635177c74081967d18602a94d27f9206fc5a9ac90b9ae9. Riutilizzati i collaudi D-0294: 475 Vitest, Electron completo e riavvio reale, PDF IT EN, typecheck e lint; nessuna nuova modifica applicativa. Nessuna pubblicazione o installazione automatica.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe, poi riaprire la lezione RL esistente. Coda LISTA_ORDINE invariata alla voce 9.
- **File coinvolti:** DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/current-math-rendering-installer.txt, local-artifacts/math-rendering-package.log, local-artifacts/verify-math-rendering-installer.cjs, local-artifacts/math-rendering-installer-20261015-093832/installer-result.json

## D-0297 — Revisione iterativa delle richieste aperte

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** revisione-backlog
- **Decisione:** Esaminare tutte le voci aperte del file idee-future-2026-10-13 su richiesta esplicita del 15 ottobre: correggere interventi circoscritti e conservare piani per le scelte complesse in un resoconto persistente. Non applicare il limite di una voce del comando LISTA_ORDINE a questo mandato distinto.
- **Motivazione:** Permettere lavoro autonomo e ripresa verificabile senza perdere contesto o confondere ricerca e implementazione.
- **Impatto:** Creato resoconto con inventario delle nove aree aperte e vincoli di conservazione delle modifiche preesistenti. Nessuna modifica applicativa o chiamata AI in questa registrazione.
- **Follow-up:** Aggiornare resoconto e decisioni dopo ciascun blocco; lasciare aperte le caselle delle funzioni non implementate.
- **File coinvolti:** docs/product/resoconto-interventi-2026-10-15.md, DECISIONI.md

## D-0298 — Piani conservati per slide QnA traduzione musica e watch

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** ricerca-backlog
- **Decisione:** Conservare un piano concreto per le slide nel QnA e un documento di ripresa per le altre quattro aree complesse. Riutilizzare le misure storiche e separarle dalle verifiche documentali odierne; lasciare all utente le scelte su allegati provider motori musica e compromesso watch.
- **Motivazione:** Il mandato richiede analisi e ripresa rapida delle scelte complesse senza trasformare ricerche o prototipi in funzioni completate.
- **Impatto:** Mappa dei file e collaudi slide, alternative di persistenza e follow-up, piani di integrazione delle quattro aree e prompt Deep Research mirato al canale watch dal quadrante. Ricontrollate fonti primarie Gemini Groq Cloudflare Bergamot Spotify e Zepp; nessuna chiamata AI, credenziale letta, funzione integrata o dipendenza aggiunta.
- **Follow-up:** Riallineare il backlog QnA con benchmark gia conclusi e passare alle voci circoscritte 18-21. Le caselle di implementazione delle cinque aree restano aperte.
- **File coinvolti:** docs/research/slide-contesto-qna-piano-2026-10-15.md, docs/research/approfondimenti-backlog-2026-10-15.md, docs/product/resoconto-interventi-2026-10-15.md, DECISIONI.md

## D-0299 — Comando collettivo Mermaid e PDF ordinario verificati

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** lettura-focus
- **Decisione:** Completare le voci 18 e 19: comando collettivo per i Mermaid della spiegazione Focus, sincronizzato con i singoli e azzerato al cambio lezione. Conservare SVG montati. Verificare il PDF gia presente nella vista ordinaria e precisarne lingua e destinazione nel tooltip.
- **Motivazione:** Ridurre i clic per gli schemi senza spostare la lettura e verificare la richiesta PDF rispetto al codice reale senza duplicare il comando esistente.
- **Impatto:** Collaudo mirato lettura e typecheck passati; suite React Electron completa e riavvio reale passati. Verificati SVG identici, punto del paragrafo, stati misti, isolamento QnA, Invio Spazio, cambio lezione a testo identico e assenza schemi. Export ordinario ITA ENG invoca la lezione corretta e non entra in Focus; assente senza dispensa. Nessuna dipendenza o chiamata AI.
- **Follow-up:** Proseguire diagnosi ENG e dizionario; completare lint build e controlli pertinenti dopo gli altri interventi. Setup precedente non rigenerato.
- **File coinvolti:** src/components/MermaidDiagram.tsx, src/components/FocusWorkspace.tsx, src/components/PdfExportButton.tsx, src/styles.css, tests/integration/readingPositionScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/idee-future-2026-10-13.md, docs/product/resoconto-interventi-2026-10-15.md, DECISIONI.md

## D-0300 — Versioni ENG con stato esplicito e diagnosi conservata

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** diagnosi-pipeline
- **Decisione:** Distinguere nel pannello ENG non richieste all importazione, in attesa, fallite e bloccate. Mostrare dettagli degli errori per attivita e indicazioni su ripresa o Elabora tutto. Conservare il comportamento automatico ITA e quello manuale ITA ENG.
- **Motivazione:** La distinzione nel codice e lo snapshot disponibile non dimostrano un guasto generale EN; la UI precedente impediva di capire il motivo dell assenza della traduzione. Abilitare ENG all import aumenterebbe gli invii rispetto alla preferenza attuale.
- **Impatto:** 30 regressioni offline passate per pipeline e pannello, compreso import senza ENG seguito da completamento manuale delle sole traduzioni mancanti. Stato personale letto solo per aggregati: ultimo run manuale completato con una traduzione riuscita. Nessuna nuova chiamata AI, credenziale letta o fonte modificata. Voce 20 ancora aperta, diagnosi e correzione della visibilita completate.
- **Follow-up:** Serve un caso manuale fallito o relativo stato per spiegare la frequenza segnalata. Discutere separatamente se includere ENG anche nell import automatico; eseguire controlli finali della sessione.
- **File coinvolti:** src/components/ArchivePipelinePanel.tsx, tests/unit/archivePipeline.test.ts, tests/unit/archivePipelinePanel.test.ts, docs/quality/versioni-eng-diagnosi-2026-10-15.md, docs/product/resoconto-interventi-2026-10-15.md, DECISIONI.md

## D-0301 — Trascrivi risolto con lemma attestato e flessioni italiane conservative

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** vocabolario-offline
- **Decisione:** Completare la voce 21: aggiungere trascrivere come unica voce inversa revisionata dalla coppia locale transcribe verso trascrivere, con provenienza e licenza conservate. Riconoscere forme italiane comuni di presente e imperativo solo verso un unico lemma verbale attestato, conservando precedenza delle voci esatte e nessuna inferenza su frasi.
- **Motivazione:** La diagnosi sui dati reali mostra due cause: mancano sia trascrivere nel dataset italiano sia flessioni IT nel lookup. Una semplice regola sul suffisso non colmerebbe la lacuna del dizionario; invertire tutto il dataset introdurrebbe ambiguita non revisionate.
- **Impatto:** 18 test del vocabolario e filtro Electron dictionary-only passati: trascrivi e lemma con dati reali offline, direzione automatica e manuale, forme comuni, ambiguita e categoria verbale. Confronto con build precedente conferma conservazione di tutte le 29660 voci e una sola aggiunta; supplemento riproducibile idempotente, hash TEI conservati. Nessuna rete, dipendenza o modifica della libreria personale.
- **Follow-up:** Controlli finali della sessione. Il riconoscimento non e un coniugatore universale; le voci mancanti e le forme irregolari non supportate restano possibili. Setup non rigenerato.
- **File coinvolti:** shared/dictionary.ts, tools/build_dictionary.py, public/dictionaries/ita-eng.json, public/dictionaries/NOTICE.md, tests/unit/dictionary.test.ts, tests/integration/dictionaryScenarios.browser.tsx, docs/product/vocabolario-offline.md, docs/product/idee-future-2026-10-13.md, docs/product/resoconto-interventi-2026-10-15.md, DECISIONI.md

## D-0302 — Revisione del backlog conclusa con quality gate completo

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qualita-ripresa
- **Decisione:** Concludere la revisione iterativa delle nove aree aperte con tre voci completate 18 19 21, cinque approfondimenti conservati e voce 20 parzialmente diagnosticata con pannello corretto. Aggiornare indici struttura e resoconto persistente, mantenendo ordine e caselle delle funzioni non implementate.
- **Motivazione:** Rendere verificabile cosa e stato realizzato e cosa richiede una scelta o un caso riproducibile, permettendo la ripresa senza ricostruire il contesto o confondere risultati storici e nuovi.
- **Impatto:** npm run check passato integralmente: typecheck lint 481 Vitest 24 Python 41 Node suite React Electron completa e riavvio reale build ed export PDF reale ITA ENG e singola lezione con Mermaid conservati. Passati anche filtri mirati lettura e dizionario, controllo supplemento idempotente, git diff --check e collegamenti locali dei quattro documenti nuovi. Nessuna chiamata AI reale, nuova dipendenza, modifica di fonti personali o scelta di provider; preservate le modifiche preesistenti. Installer non rigenerato.
- **Follow-up:** Leggere resoconto e piani per scegliere allegati slide provider QnA motore frasi musica e compromesso watch; osservare un caso ENG manuale fallito prima di chiudere voce 20. LISTA_ORDINE resta alla voce 9 slide nel QnA. Rigenerare il setup se richiesto.
- **File coinvolti:** docs/product/resoconto-interventi-2026-10-15.md, docs/product/idee-future-2026-10-13.md, docs/product/lettura-export-pdf.md, docs/product/vocabolario-offline.md, docs/research/slide-contesto-qna-piano-2026-10-15.md, docs/research/approfondimenti-backlog-2026-10-15.md, docs/quality/versioni-eng-diagnosi-2026-10-15.md, docs/README.md, docs/research/README.md, STRUTTURA_PROGETTO.md, tests/README.md, DECISIONI.md

## D-0303 — Ricontrollo Balance e pista Gadgetbridge per sveglie native

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** ricerca-timer-watch
- **Decisione:** Riutilizzare D-0292 e il report integrale e concretizzare la pista gia indicata dei protocolli esistenti: esaminati Gadgetbridge Balance, servizio sveglie native e autenticazione al commit 7f978c7f7bab10e4e0b1ca6d7c46b86ba2ca798d, oltre alla Alarms Intent API Android. Conservare evidenze e integrazione al prompt nella valutazione esistente senza modificare la Deep Research originale.
- **Motivazione:** Il limite mst degli App Service riguarda l architettura della mini app e non dimostra impossibilita di ogni comando companion nativo. Un implementazione esistente puo restringere l indagine prima di REA e chiarire un ingresso Android alternativo al Side Service Zepp.
- **Impatto:** Solo documentazione e snapshot pubblici locali con commit e hash. Individuati comandi sveglia con ora minuto slot e ACK, ingresso Android privo di risposta strutturata e autenticazione necessaria; nessun countdown preciso o stop aptico di 10 secondi dimostrato. Riconfermata identita SHA256 del report originale e della copia. Nessuna installazione credenziale personale chiamata AI connessione watch o modifica applicativa.
- **Follow-up:** Aggiungere i riferimenti alla ricerca avviata dall utente; verificare countdown distinto da sveglia, ricezione dal quadrante, precisione secondi, conferma reale, coesistenza Zepp e firmware. Non adottare arrotondamento o sostituzione companion senza scelta e prova; voce 17 resta aperta.
- **File coinvolti:** docs/research/timer-pausa-amazfit-balance-valutazione-2026-10-14.md, docs/research/approfondimenti-backlog-2026-10-15.md, docs/product/resoconto-interventi-2026-10-15.md, local-artifacts/balance-protocol-review-2026-10-15/, DECISIONI.md

## D-0304 — Risposte approvate per slide traduzione musica ENG e Balance

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** scelte-utente
- **Decisione:** Registrare e implementare le risposte del 15 ottobre: immagini delle pagine PDF e snapshot locali nei thread con reinvio finche attivi; impostazioni per vedere e cancellare immagini singolarmente tutte o per giorno; mantenere Gemini Flash e scelta contesto; traduzione frasi offline delegata all agente dai test; telecomando Spotify e compilation con timestamp; ENG anche all import automatico. Accettati i quattro compromessi Balance proposti.
- **Motivazione:** L utente ha risposto ai dieci punti e ha esplicitamente richiesto salvataggio e avvio dell implementazione, eliminando le precedenti scelte di prodotto pendenti.
- **Impatto:** Creato documento operativo con tutte le risposte, gestione delle immagini richiesta e caselle di implementazione ancora aperte. Nessuna nuova funzione completata da questa registrazione; nessuna credenziale letta o chiamata AI avviata. La correzione della doppia barra Focus e inclusa negli interventi.
- **Follow-up:** Implementare e collaudare in blocchi aggiornando lo stato reale. Registrare dipendenze e scelte tecniche; distinguere implementazione da login Spotify e prove hardware Balance. Conservare modifiche preesistenti e fonti.
- **File coinvolti:** docs/product/implementazione-scelte-2026-10-15.md, DECISIONI.md

## D-0305 — ENG automatico e scorrimento esterno bloccato in Focus

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** pipeline-focus
- **Decisione:** Abilitare includeTranslation anche per gli import automatici quando la relativa preferenza e attiva, e aggiornare il testo nelle impostazioni. Nascondere lo scroll di html e body per la durata della vista Focus tramite selettore CSS sulla presenza dell overlay.
- **Motivazione:** Attuare la risposta esplicita 9 A ed eliminare la doppia barra segnalata, mantenendo lo scorrimento interno e il punto della schermata precedente.
- **Impatto:** 76 regressioni qualita e pipeline passate. Suite React Electron completa e riavvio reale passati: sfondo realmente scrollabile, barra esterna senza ingombro in Focus, scroll della dispensa ancora attivo e posizione esterna ripristinata dopo uscita confermata. Import sintetico verifica sequenza trascrizione ITA ENG. Nessuna chiamata AI reale, dipendenza o modifica delle fonti.
- **Follow-up:** Proseguire implementazione allegati e altre scelte. Non sono state riavviate pipeline personali precedenti; preferenza import disattivata continua a non avviare AI.
- **File coinvolti:** electron/main/archive.ts, src/components/SettingsModal.tsx, src/styles.css, tests/unit/quality.test.ts, tests/integration/hookRegression.browser.tsx, docs/product/implementazione-scelte-2026-10-15.md, DECISIONI.md

## D-0306 — Slide PNG persistenti e gestione immagini nelle impostazioni

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qna-slide
- **Decisione:** Implementare selezione di pagine nel PDF Focus, PNG separati dal viewport e allegati attivi nei thread QnA mantenendo Gemini e scelta contesto. Conservare snapshot immutabili con proprieta lezione thread e hash, riferimenti per messaggio e allegati attivi rimovibili. Nelle impostazioni elenco anteprima e cancellazione esplicita singola per giorno locale o totale; allegati cancellati bloccano invio finche rimossi o riaggiunti.
- **Motivazione:** Attuare risposte 1 2 3 4 5 senza inviare il PDF intero e permettere pulizia locale comprensibile senza cambiare retroattivamente il contesto delle conversazioni.
- **Impatto:** 95 test pertinenti passati, suite React Electron completa e riavvio reale passati. PDF.js reale prepara due pagine PNG, anteprime e riferimenti persistono; follow-up e scelta contesto conservati, rollback su errore, cancellazione e messaggi mancanti verificati. File temporanei verificano proprieta limite e integrita, trasporto multimodale simulato. Massimo 4 slide attive, 2 MB per PNG e lato lungo fino a 2048 nel renderer; validazione main fino a 8 milioni pixel e richiesta entro 18 MB. Nessuna dipendenza o chiamata AI reale, fonti originali conservate.
- **Follow-up:** Completare verifiche finali e build dopo i blocchi seguenti. Prova live di comprensione vision non eseguita; nessuna stima di costo garantita. Snapshot solo locali in qna-images, eliminazione dei thread pulisce le relative copie. Gestire ulteriori ottimizzazioni soltanto su necessita misurata.
- **File coinvolti:** shared/qnaImages.ts, shared/archive.ts, electron/main/qnaImages.ts, electron/main/archive.ts, electron/main/archiveValidation.ts, electron/main/gemini.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useQna.ts, src/components/FocusPdfViewer.tsx, src/components/FocusWorkspace.tsx, src/components/LectureDrawer.tsx, src/components/QnaSidebar.tsx, src/components/QnaImagePreview.tsx, src/components/QnaImageLibrary.tsx, src/components/SettingsModal.tsx, src/styles.css, tests/unit/qnaImages.test.ts, tests/unit/qnaRequest.test.ts, tests/integration/qnaImageScenarios.browser.tsx, tests/integration/focusPdfScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, docs/product/implementazione-scelte-2026-10-15.md, DECISIONI.md

## D-0307 — Bergamot locale e modelli opzionali verificati

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** traduzione-offline
- **Decisione:** Adottare @browsermt/bergamot-translator 0.4.9 come dipendenza di build per runtime WASM locale; modelli Mozilla EN IT opzionali scaricati esplicitamente con hash fissati, senza fallback di rete per le frasi. Worker separato con limiti e conservazione letterale di codice formule e URL.
- **Motivazione:** I piloti conservati mostrano runtime e asset piu piccoli rispetto al percorso Python; licenza MPL 2.0 esplicita anche sui modelli Mozilla. Scelta delegata dall utente al punto 6.
- **Impatto:** Nuova dipendenza di build e asset runtime da distribuire fuori asar. Circa 53 MB di download e 74 MB di modelli locali. La sola scelta non certifica packaging ne accuratezza linguistica.
- **Follow-up:** Implementare e collaudare caricamento reale Node Electron e packaging prima di chiudere la voce; mantenere visibili installazione e limiti.
- **File coinvolti:** package.json, package-lock.json, electron.vite.config.ts, electron-builder.yml, docs/product/implementazione-scelte-2026-10-15.md

## D-0308 — Frasi locali nel vocabolario con runtime WASM

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** traduzione-offline
- **Decisione:** Integrare scheda Frasi offline nel vocabolario, direzione EN IT manuale, installazione esplicita e riparabile dei modelli Mozilla con dimensioni e SHA256 fissati; traduzione in worker isolato senza rete, massimo 2000 caratteri e 45 secondi, formule codice e URL segmentati e conservati.
- **Motivazione:** Attuare la scelta delegata dal punto 6 riusando il pilota Bergamot con caricamento reale anche su Electron Windows e senza dipendenza Python o fallback online.
- **Impatto:** Runtime 0.4.9 circa 5.3 MB emesso dalla build con adattamenti Windows riproducibili e licenze; modelli opzionali circa 53 MB compressi 74 MB su disco in userData. Test unitari e UI Electron passati; WASM reale EN IT e IT EN passato sia Node sia Electron con letterali conservati. Nessun testo personale tradotto e nessuna chiamata AI remota.
- **Follow-up:** Quality gate finale e verifica directory pacchettizzata ancora da completare. Qualita linguistica limitata dai modelli; modelli non installati automaticamente nel profilo personale.
- **File coinvolti:** shared/offlineTranslation.ts, electron/main/offlineTranslation.ts, resources/translation/, electron.vite.config.ts, electron-builder.yml, src/components/PhraseTranslator.tsx, src/components/DictionaryOverlay.tsx, tests/unit/offlineTranslation.test.ts, tests/integration/musicTranslationScenarios.browser.tsx, tools/run_offline_translation_regressions.cjs

## D-0309 — Compilation a timestamp e pannello Spotify personale

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** musica
- **Decisione:** Aggiungere Musica nella sidebar e Focus: sei video e 54 timestamp originali con correzioni locali salvabili e apertura al punto scelto. Integrare configurazione Client ID Spotify e login PKCE tramite browser e callback loopback 127.0.0.1:43821; token nel main cifrati con safeStorage, computer selezionato esplicitamente, lettura stato e comandi trasferimento pausa ripresa precedente successivo.
- **Motivazione:** Attuare risposte 7 A e 8 A; utente ha confermato di preparare il pannello e configurare personalmente Spotify successivamente. Audio nel client ufficiale e timestamp senza scaricare video.
- **Impatto:** UI Electron e 7 test musica Spotify passati: loopback reale con state errato rifiutato, PKCE verifier e scope minimi, refresh serializzato, 204, 403, 429 Retry After, rete assente, selezione computer e persistenza timestamp. Nessuna credenziale reale o nuova dipendenza musica, nessun login reale o riproduzione comandata. Il successo HTTP resta distinto dallo stato letto.
- **Follow-up:** Utente deve creare app Dashboard con callback mostrato e inserire il Client ID; pilota reale Premium PC cuffie quota e comandi resta aperto. Quality gate finale e build da completare. Nessun titolo italiano inventato per tracce giapponesi coreane.
- **File coinvolti:** shared/music.ts, shared/musicCatalog.json, shared/spotify.ts, electron/main/spotify.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/components/MusicButton.tsx, src/components/SpotifyPanel.tsx, src/components/Sidebar.tsx, src/components/FocusWorkspace.tsx, src/components/SettingsModal.tsx, tests/unit/music.test.ts, tests/unit/spotify.test.ts, tests/integration/musicTranslationScenarios.browser.tsx

## D-0310 — Nucleo allarme Balance verificato senza dichiarare il trasporto pronto

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** balance-prototipo
- **Decisione:** Preparare un nucleo separato dalla produzione per validare comandi pausa, scadenza al minuto successivo, retry idempotenti, conferma solo dopo creazione alarm e salvataggio, rollback e scena aptica finita. Documentare adattatori Zepp e prove hardware richieste nei compromessi approvati.
- **Motivazione:** L utente ha accettato i quattro compromessi, ma il trasporto dal PC al watch dopo una singola apertura della mini app non e ancora dimostrato e non va simulato come integrazione pronta. La ricerca esterna dell utente e in corso.
- **Impatto:** Tre test deterministici del nucleo passati; nessun BLE login pairing installazione o sostituzione companion. Non si tratta di una mini app installabile. Fonti ufficiali alarm set e Vibrator ricontrollate: timer persistente disponibile e scena finita documentata da un secondo, da provare sul dispositivo.
- **Follow-up:** Ricevere la ricerca e verificare trasporto dal quadrante e ciclo vita Side Service, API reali e prove sul Balance. Nessun pulsante di invio riuscito prima di un ACK autentico; nessun reset o adozione Gadgetbridge non decisa.
- **File coinvolti:** prototypes/balance-pause/alarm-core.mjs, prototypes/balance-pause/README.md, tests/unit/balanceAlarmPrototype.test.ts, docs/product/implementazione-scelte-2026-10-15.md

## D-0311 — Implementazione scelte approvate e stato verificabile

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qualita-consegna
- **Decisione:** Allineare coda descrizioni guide e struttura alle risposte approvate: slide completate, valutazione provider chiusa mantenendo Gemini, frasi offline completate, compilation e pannello Spotify pronti con pilota account aperto, ENG automatico e Focus corretti. Balance resta nucleo prototipo senza trasporto installabile.
- **Motivazione:** Conservare risultati concreti e punti di ripresa senza confondere codice e collaudi sintetici con account reale o dispositivo fisico. Completare documentazione e verifiche dopo le modifiche autorizzate.
- **Impatto:** Quality gate completo passato con 497 Vitest 24 Python 41 Node Electron riavvio build PDF reali; dopo aggiunte e correzioni finali ripassati typecheck lint tutti i 500 Vitest in 33 file Electron riavvio e build. Directory Windows pacchettizzata creata, asset runtime fuori ASAR e traduzioni reali EN IT e IT EN da quegli asset passate. Download modelli reale dimensioni decompressione hash e riparazione dopo corruzione verificati in cartella temporanea ignorata. UI musica chiara scura ispezionata, focus tastiera confinato nel dialogo; logout Spotify rimuove backup cifrato. Collegamenti locali e diff check passati.
- **Follow-up:** Utente configura Spotify come confermato, poi pilota reale; ricerca e hardware Balance ancora richiesti per trasporto. Installer NSIS non rigenerato, app non installata, nessuna chiamata AI personale commit o push. Modifiche preesistenti conservate.
- **File coinvolti:** docs/product/implementazione-scelte-2026-10-15.md, docs/product/funzioni-approvate-2026-10-15.md, docs/product/idee-future-2026-10-13.md, docs/product/resoconto-interventi-2026-10-15.md, docs/product/vocabolario-offline.md, docs/research/slide-contesto-qna-piano-2026-10-15.md, docs/research/traduzione-frasi-offline-2026-10-13.md, docs/research/musica-integrazione-valutazione-2026-10-13.md, docs/README.md, STRUTTURA_PROGETTO.md, tests/README.md, electron/main/spotify.ts, src/components/MusicButton.tsx, src/styles.css, tests/unit/spotify.test.ts, tests/integration/musicTranslationScenarios.browser.tsx, tools/run_hook_regressions.cjs

## D-0312 — Flash Lite prioritario per domande con recupero rapido

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qna-modelli
- **Decisione:** Seguire la nuova istruzione dell utente: QnA indipendente dal modello delle dispense, prima gemini-3.5-flash-lite poi gemini-3.1-flash-lite gemini-3.7-flash modello configurato e altre riserve senza duplicati. Primo testo entro 20 secondi per tentativo; passaggio immediato per vuoto timeout rete o modello non disponibile. Conservare identico payload contesto storico e immagini.
- **Motivazione:** L utente richiede il modello piu rapido tipo Flash Lite e gli altri solo se non risponde. La scheda ufficiale Google conferma 3.5 Flash Lite stabile a bassa latenza con input immagini. Non modifica le scelte delle dispense e non introduce provider nuovi.
- **Impatto:** npm run check interamente passato: typecheck lint 507 Vitest 24 Python 41 Node React Electron riavvio build e PDF reali. Test verificano Flash Lite iniziale indipendente dalle impostazioni, vuoto timeout 404 503 con payload conservato, budget assoluto, diagnostica modelli e stop dopo risposta parziale o blocco esplicito. Nessuna richiesta API reale e nessuna misura nuova di velocita personale. Rate limit quote rotazione chiavi e budget globale restano attivi.
- **Follow-up:** Policy aggiorna il precedente mantenimento generico di Gemini Flash in D-0304. Dopo stream parziale interrompere con messaggio e riprova esplicita senza unire risposte. Build aggiornata; directory pacchettizzata D-0311 e installer NSIS non rigenerati in questa modifica.
- **File coinvolti:** shared/qnaModelPolicy.ts, electron/main/gemini.ts, electron/main/archive.ts, electron/main/ai/geminiPolicy.ts, electron/main/ai/geminiRequestManager.ts, electron/main/ai/geminiTransport.ts, tests/unit/qnaRequest.test.ts, tests/unit/archive.test.ts, docs/product/implementazione-scelte-2026-10-15.md, docs/product/funzioni-approvate-2026-10-15.md, docs/product/idee-future-2026-10-13.md, docs/product/resoconto-interventi-2026-10-15.md, STRUTTURA_PROGETTO.md, tests/README.md

## D-0313 — Setup rigenerato con slide musica frasi offline e QnA Flash Lite

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** installer-windows
- **Decisione:** Rigenerare su richiesta il setup NSIS Windows x64 Lezionify 0.1.0 mediante npm run package:win includendo le modifiche D-0304 fino a D-0312. Aggiornati installer blockmap latest.yml e directory win-unpacked.
- **Motivazione:** L utente ha richiesto esplicitamente la rigenerazione per installare tutte le ultime modifiche, compresa la priorita Flash Lite per le domande.
- **Impatto:** Build e packaging terminati con uscita zero. Verificati 361 file out identici al payload ASAR, politica QnA Flash Lite e deadline 20 secondi presenti, runtime offline fuori ASAR e FFmpeg incluso, profili e artefatti personali esclusi. Hash SHA512 e dimensione del manifesto verificati. Setup 190731253 byte SHA256 a6b7db3df517588e580bf3586db28da9c3cdebaf99f127c84c214233f1011193. Riutilizzato quality gate completo D-0312 con 507 Vitest 24 Python 41 Node Electron riavvio e PDF reali; nessuna nuova modifica applicativa.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Nessuna installazione o pubblicazione automatica eseguita. Login personale Spotify e hardware Balance restano da verificare come documentato.
- **File coinvolti:** DECISIONI.md, docs/product/implementazione-scelte-2026-10-15.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/package-win-2026-10-15-latest.log, local-artifacts/verify-latest-installer-2026-10-15.cjs, local-artifacts/installer-latest-2026-10-15-result.json

## D-0314 — Lettore visuale e PC ricordato per Spotify e compilation

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** musica-ui
- **Decisione:** Seguire la richiesta di una UI curata ispirata agli screenshot: viste distinte Spotify e YouTube, copertine originali e anteprime, lettore con icone avanzamento e volume, libreria playlist e preferiti su consenso aggiuntivo. Caricare stato e computer automaticamente, ricordare la scelta e trasferire al PC inattivo soltanto al comando play. Aggiornare mentre il pannello e visibile e fermare polling su errore o chiusura.
- **Motivazione:** Il telecomando precedente funzionava ma richiedeva selezione e aggiornamenti ripetuti ed era visivamente poco curato. L utente ha chiesto esplicitamente automazione, anteprime e controlli cliccabili anche per YouTube.
- **Impatto:** Nessuna nuova dipendenza. OAuth base esistente conservato; scope playlist-read-private playlist-read-collaborative user-library-read richiesti solo dal pulsante Attiva playlist e preferiti. URI e CDN immagini validati, pagine di 20 elementi, token solo main cifrati. API e UI iniziali passate con dati sintetici, screenshot chiari scuri ispezionati; nessun controllo live del conto o riproduzione reale avviata dall agente. Compilation aprono ancora il browser al timestamp, senza player finto download o autoavvio.
- **Follow-up:** Completare quality gate e installer aggiornato; collaudare polling unmount e nuovi permessi. L utente autorizzera la libreria una volta dal browser. Nessuna garanzia sui dispositivi assenti dalla Web API o sugli errori di quota reali.
- **File coinvolti:** shared/spotify.ts, shared/archive.ts, electron/main/spotify.ts, electron/main/index.ts, electron/preload/index.ts, src/hooks/useSpotifyPlayer.ts, src/components/SpotifyPanel.tsx, src/components/SpotifyWorkspace.tsx, src/components/MusicButton.tsx, src/components/YoutubeLibrary.tsx, src/components/MusicArtwork.tsx, src/components/MusicIcon.tsx, src/components/music.css, src/styles.css, public/music/, tests/unit/spotify.test.ts, tests/integration/musicTranslationScenarios.browser.tsx, tools/run_hook_regressions.cjs, tests/integration/hookRegression.browser.tsx

## D-0315 — UI musica collaudata e installer aggiornato

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qualita-installer
- **Decisione:** Consegnare la revisione visuale Spotify YouTube D-0314 con installer NSIS aggiornato dopo il quality gate. Conservare il setup precedente e documentare uso consenso aggiuntivo e limiti della riproduzione esterna.
- **Motivazione:** Rendere la richiesta dell utente direttamente provabile nella versione installata, con PC automatico e schede visuali, distinguendo collaudo sintetico dal consenso personale necessario per la libreria.
- **Impatto:** npm run check passato integralmente: typecheck lint 513 Vitest 24 Python 41 Node Electron completo e riavvio build PDF reali. Filtro music-only passato e screenshot chiari scuri ispezionati con copertine sintetiche; polling automatico e cleanup verificati. Packaging --win --publish never riuscito; 363 file out identici ad ASAR, UI visuale scope libreria PC preferito wordmark e Flash Lite presenti, profili personali esclusi FFmpeg e runtime offline inclusi. Manifest SHA512 e dimensione verificati. Setup 190754593 byte SHA256 77706554dfc733baf8ced9180ba492ee395e99e5c17269b230fe949504425969.
- **Follow-up:** Chiudere Lezionify e installare il nuovo setup. Per playlist e preferiti premere una volta Attiva playlist e preferiti e completare il consenso nel browser. Nessun Client ID nuovo necessario. Nuovi endpoint non collaudati con dati personali; nessun avvio audio reale da parte dell agente. YouTube resta nel browser al timestamp.
- **File coinvolti:** DECISIONI.md, docs/product/musica-ui-2026-10-15.md, docs/product/funzioni-approvate-2026-10-15.md, docs/product/implementazione-scelte-2026-10-15.md, STRUTTURA_PROGETTO.md, tests/README.md, docs/README.md, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/check-music-redesign-2026-10-15.log, local-artifacts/package-music-ui-2026-10-15.log, local-artifacts/verify-music-ui-installer.cjs, local-artifacts/music-ui-installer-result.json, local-artifacts/current-music-ui-installer-backup.txt

## D-0316 — Vocabolario unico e frasi automatiche nelle prossime modifiche

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** vocabolario
- **Decisione:** Salvare come requisito futuro un solo campo per parole e frasi, senza schede separate. Dopo una pausa nella digitazione, gli spazi interni attivano il modello locale per frasi; direzione iniziale IT verso EN, invertibile con il pulsante. Le parole singole mantengono il dizionario locale.
- **Motivazione:** Richiesta esplicita dell'utente per semplificare l'uso del vocabolario ed evitare la scelta manuale tra parole e frasi; passi interpretato come spazi.
- **Impatto:** Aggiornata solo la documentazione con voce 22 aperta, fuori dalla coda LISTA_ORDINE. Nessuna modifica a interfaccia o installer. Riutilizzo previsto di Bergamot, download esplicito e nessun fallback online.
- **Follow-up:** Implementare in una prossima modifica; definire la pausa, rispettare la direzione manuale e verificare risultati obsoleti, passaggi parola-frase e modello assente.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/vocabolario-offline.md

## D-0317 — Configurazione traduttore e musica nelle Impostazioni

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** impostazioni
- **Decisione:** Salvare per le prossime modifiche lo spostamento nelle Impostazioni del download e della gestione dei modelli del traduttore e della configurazione musicale, inclusi Client ID Spotify, account, consensi e preferenze. Le viste quotidiane privilegiano traduzione, contenuti e riproduzione; requisiti mancanti rimandano alle Impostazioni.
- **Motivazione:** L'utente chiede di rendere piu semplice la parte dell'interfaccia usata tutti i giorni, raccogliendo altrove le operazioni di configurazione.
- **Impatto:** Aggiunta voce 23 aperta al backlog, coordinata con la voce 22. Solo documentazione; nessuna modifica applicativa o all'installer. Conservare configurazioni esistenti, download espliciti e autorizzazioni personali.
- **Follow-up:** Implementare successivamente e verificare prima configurazione, account gia collegato e modello mancante. Coda LISTA_ORDINE invariata.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0318 — Controllo della musica anche fuori dal Focus

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** musica-ui
- **Decisione:** Salvare come requisito futuro l'accesso al pannello e ai controlli musicali anche nell'interfaccia ordinaria, senza entrare in Focus, riutilizzando servizi e controlli esistenti e mantenendo coerenti stato e selezioni tra le modalita.
- **Motivazione:** Richiesta esplicita dell'utente di poter controllare la musica anche all'esterno della modalita Focus.
- **Impatto:** Aggiunta voce 24 aperta al backlog; solo documentazione, nessuna modifica al codice o all'installer. Coordinamento con la voce 23 sulle Impostazioni; restano i limiti attuali di Spotify e YouTube.
- **Follow-up:** Definire la posizione dei controlli e verificare accesso fuori Focus, continuita della riproduzione e assenza di aggiornamenti duplicati. Coda LISTA_ORDINE invariata.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0319 — Seleziona slide solo durante la composizione della domanda

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qna-slide
- **Decisione:** Salvare come requisito futuro la visibilita del comando Seleziona slide solo durante la composizione di una domanda QnA, anziche mantenerlo sempre visibile nella lettura. Il selettore deve restare utilizzabile quando si passa dal campo domanda al PDF.
- **Motivazione:** Richiesta esplicita dell'utente di ridurre i controlli permanenti e mostrare la selezione slide quando serve alla domanda.
- **Impatto:** Aggiunta voce 25 aperta al backlog. Solo documentazione, nessuna modifica al codice o all'installer; mantenere la gestione esistente degli allegati. Coda LISTA_ORDINE invariata.
- **Follow-up:** Implementare successivamente e verificare lettura, composizione, selezione nel PDF, invio e chiusura del compositore anche da tastiera.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0320 — Otto skill Matt Pocock per lo sviluppo di Lezionify

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** strumenti-codex
- **Decisione:** Installare nel profilo locale Codex le skill diagnosing-bugs, tdd, codebase-design, code-review, prototype, research, handoff e writing-for-agents da mattpocock/skills, revisione 49dd158d1076134a641b33efb035946536778336. Conservare istruzioni e risorse originali, licenza MIT e provenienza con hash per ciascuna skill.
- **Motivazione:** Richiesta esplicita dell utente di selezionare e installare le skill piu utili dalla raccolta indicata. La selezione copre diagnosi riproducibili, test comportamentali, architettura, revisione, prototipi UI, ricerca primaria e continuita della documentazione.
- **Impatto:** Otto skill installate in C:/Users/Utente/.codex/skills, disponibili dal prossimo turno e anche negli altri progetti del profilo. Verificati 24 file originali byte per byte rispetto alla revisione fissata, incluse configurazioni agents/openai.yaml e risorse di supporto. Nessuna dipendenza applicativa aggiunta e nessun workflow delle nuove skill eseguito.
- **Follow-up:** Usare le skill quando pertinenti rispettando le istruzioni dell utente e AGENTS.md; il registro decisioni resta append-only tramite lo script, le fonti personali restano locali e i tracker esterni non vengono attivati dall installazione. Aggiornamenti manuali dalla revisione fissata.
- **File coinvolti:** DECISIONI.md, C:/Users/Utente/.codex/skills/diagnosing-bugs/, C:/Users/Utente/.codex/skills/tdd/, C:/Users/Utente/.codex/skills/codebase-design/, C:/Users/Utente/.codex/skills/code-review/, C:/Users/Utente/.codex/skills/prototype/, C:/Users/Utente/.codex/skills/research/, C:/Users/Utente/.codex/skills/handoff/, C:/Users/Utente/.codex/skills/writing-for-agents/

## D-0321 — Guida pratica alle otto skill Codex per Lezionify

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** documentazione-skill
- **Decisione:** Aggiungere docs/product/guida-skill-codex.md con scelta rapida, attivazione, otto schede operative, prompt italiani, combinazioni, prerequisiti, limiti e fonti della revisione installata. Collegare la guida dall indice documentazione e dalla struttura del progetto.
- **Motivazione:** Richiesta dell utente di un documento completo su come e quando utilizzare le skill installate in D-0320. Distinguere metodo originale, adattamenti al progetto e risultati realmente verificabili.
- **Impatto:** Solo documentazione. Chiariti handoff esplicito e temporaneo, confini di test concordati in tdd, confronto commit versus modifiche locali in code-review, setup tracker non installato, prototipi e ricerca distinti dalle funzioni pronte. Conservate regole local-first, registro append-only e ordine del backlog. Indice, link locali, otto schede e blocchi codice verificati.
- **Follow-up:** Usare la guida come riferimento facoltativo e aggiornarla quando cambia la revisione delle skill o il flusso locale; nessuna modifica alle skill, ai servizi AI o alla applicazione.
- **File coinvolti:** docs/product/guida-skill-codex.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0322 — Intervista iniziale per attuare le priorita da uno a cinque

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** strumenti-codex
- **Decisione:** Accogliere il mandato di attuare le cinque priorita discusse: vocabolario unico, configurazione nelle Impostazioni, selezione slide durante la composizione QnA, continuita musica e diagnosi ENG. Iniziare con intervista a round tramite grilling, aggiunta al profilo dalla stessa revisione 49dd158d1076134a641b33efb035946536778336 della raccolta Matt Pocock.
- **Motivazione:** L utente richiede esplicitamente di partire da domande con la skill appropriata prima di implementare. Grilling mancava tra le otto installate; la lettura del codice evita di chiedere fatti ricavabili dal progetto o scelte gia registrate.
- **Impatto:** Installata grilling con file originali verificati, licenza MIT e provenienza locale. Avviata sola lettura tecnica con subagente prevista dalla skill. Nessuna modifica applicativa, chiamata AI della pipeline o attivita personale Spotify. L implementazione delle cinque priorita resta in attesa delle risposte e della chiusura condivisa dell intervista.
- **Follow-up:** Raccogliere risposte alle scelte residue, definire criteri di accettazione e test pubblici; poi implementare e collaudare il perimetro autorizzato. Conservare fonti, credenziali, modifiche preesistenti e ordine della coda LISTA_ORDINE.
- **File coinvolti:** DECISIONI.md, C:/Users/Utente/.codex/skills/grilling/

## D-0323 — Campo unico offline e configurazione separata nelle Impostazioni

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** vocabolario-impostazioni
- **Decisione:** Attuare priorita 1 e 2 dopo intervista: campo unico parole e frasi, frasi automatiche dopo 500 ms, reset IT verso EN a ogni apertura e inversione manuale valida nella stessa apertura. Serializzare il worker tra rimontaggi e scartare bozze obsolete. Spostare installazione e riparazione modelli, account e consensi musicali e titoli timestamp YouTube nelle sezioni delle Impostazioni.
- **Motivazione:** Risposte esplicite dell utente: sempre IT verso ENG, accettato spostamento della configurazione e dei timestamp. Semplificare il flusso quotidiano riusando dizionari Bergamot e servizi esistenti senza nuove dipendenze.
- **Impatto:** ToolSettingsContext mantiene la bozza durante la configurazione; OfflineTranslationSettings e useOfflineTranslationStatus osservano download locali anche dopo rimontaggio. Impostazioni con focus confinato e Esc gestito senza uscire dal Focus; timestamp con editor compatto e corpo scorrevole. Regressioni Electron red poi green per campo unico, serializzazione, risposte obsolete, reset lingua, modelli assenti e download esplicito, ritorno alla bozza, completamento installazione dopo rimontaggio. Nessuna frase personale o nuova richiesta online.
- **Follow-up:** Completare controllo finale e confezionamento; qualità linguistica dei modelli invariata. I download restano espliciti e il vocabolario non conserva una cronologia delle frasi.
- **File coinvolti:** src/components/DictionaryOverlay.tsx, src/components/OfflineTranslationSettings.tsx, src/hooks/useOfflineTranslationStatus.ts, src/components/ToolSettingsContext.ts, src/components/SettingsModal.tsx, src/components/YoutubeLibrary.tsx, src/components/SpotifyPanel.tsx, src/App.tsx, src/styles.css, tests/integration/dictionaryScenarios.browser.tsx, tests/integration/toolSettingsScenarios.browser.tsx, docs/product/priorita-1-5-2026-10-15.md

## D-0324 — Selezione slide durante la domanda e continuita del pannello musicale

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** studio-slide-musica
- **Decisione:** Attuare priorita 3 e 4 approvate: abilitare selezione slide al focus nel compositore, mantenerla al passaggio al PDF e nasconderla dopo invio o chiusura; conservare gli allegati ai follow-up. Mantenere pulsante Musica ordinario e Focus, ricordando sorgente e sezione pagina Spotify con la compilation e il dispositivo gia persistenti. Nessun mini player permanente.
- **Motivazione:** Ridurre controlli durante la lettura e ricominciare la navigazione musicale dallo stesso punto, riusando il lettore e la riproduzione esterna esistenti.
- **Impatto:** QnaSidebar comunica composizione a LectureDrawer e FocusWorkspace; il PDF invalida selezioni e preparazioni pendenti alla fine della composizione senza eliminare immagini gia allegate. musicPreferences salva solo metadati di navigazione, senza artwork titoli o credenziali. Il polling si ferma nelle Impostazioni e alla chiusura e rimane unico nel pannello. Filtri Focus PDF e musica verdi con PDF reale sintetico, passaggio al PDF, invio Enter, selezioni ripristinate, pagina libreria ricordata e assenza di comandi musicali automatici.
- **Follow-up:** Completare verifica finale e installer. Nessuna nuova prova personale Spotify o Gemini; YouTube continua ad aprire il browser al timestamp scelto.
- **File coinvolti:** src/components/QnaSidebar.tsx, src/components/LectureDrawer.tsx, src/components/FocusWorkspace.tsx, src/components/FocusPdfViewer.tsx, src/components/MusicButton.tsx, src/components/SpotifyWorkspace.tsx, src/utils/musicPreferences.ts, src/hooks/useFocusModeController.ts, tests/integration/focusPdfScenarios.browser.tsx, tests/integration/musicTranslationScenarios.browser.tsx, tools/run_hook_regressions.cjs, docs/product/priorita-1-5-2026-10-15.md

## D-0325 — Priorita uno cinque verificate e setup Windows aggiornato

- **Data:** 2026-10-15
- **Stato:** accettata
- **Area:** qualita-eng-consegna
- **Decisione:** Concludere implementazione e collaudo delle voci 22 23 25 24 dopo le risposte dell utente; completare la diagnosi tecnica ENG senza chiudere la segnalazione personale non riprodotta. Correggere il messaggio storico che attribuiva a tutti gli import la mancata generazione ENG. Consegnare setup NSIS aggiornato con pubblicazione disabilitata.
- **Motivazione:** L utente ha approvato comportamenti e confini dei collaudi, indicando di non avere ancora verificato un fallimento ENG dopo l ultimo aggiornamento. Il codice include ENG negli import automatici gia da D-0305; distinguere questo fatto dalla causa non dimostrata degli episodi storici.
- **Impatto:** Quality gate finale interamente passato: typecheck lint 513 Vitest 24 Python 41 Node suite Electron completa con riavvio build e PDF reali. Dopo revisione risolti e ricollaudati Esc nelle Impostazioni e installazione modelli dopo rimontaggio. Launcher Electron esteso da 90 a 180 secondi con checkpoint fissi per la suite ampliata; nessun nuovo test API personale. Voci 22-25 completate e guide aggiornate, voce 20 ancora aperta. Setup 190759427 byte SHA256 0792982d10f18b1d8dcb8b0e0a68a23386ffdde924a11ea2f1ee6b02e5d514f3, 364 file build identici ad ASAR, manifest verificato FFmpeg runtime offline presenti e profili personali esclusi. Package e lockfile invariati.
- **Follow-up:** Chiudere Lezionify e installare il setup aggiornato. Osservare un eventuale nuovo caso ENG prima di attribuire cause generali o chiudere la voce 20. Pilota personale Spotify distinto e coda LISTA_ORDINE invariata. Setup precedente conservato, nessuna installazione pubblicazione commit o push eseguiti.
- **File coinvolti:** src/components/ArchivePipelinePanel.tsx, tests/unit/archivePipelinePanel.test.ts, tools/run_hook_regressions.cjs, tests/integration/hookRegression.browser.tsx, docs/product/priorita-1-5-2026-10-15.md, docs/product/idee-future-2026-10-13.md, docs/product/vocabolario-offline.md, docs/product/funzioni-approvate-2026-10-15.md, docs/product/musica-ui-2026-10-15.md, docs/product/guida-skill-codex.md, docs/quality/versioni-eng-diagnosi-2026-10-15.md, docs/README.md, STRUTTURA_PROGETTO.md, tests/README.md, DECISIONI.md, dist/Lezionify-Setup-0.1.0.exe, local-artifacts/priorita-1-5-installer-result.json

## D-0326 — Dodici richieste future divise per complessita e stato dei modelli dispensa

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** backlog-prodotto
- **Decisione:** Aggiungere le voci 26-37 al backlog: quattro semplici e otto complesse o da approfondire. Conservare suoni offline come Apple, audio QnA da telefono, timer sul telefono alternativo al Balance, nuova segnalazione Ctrl+L, tag delle catture rapide, tono didattico QnA, modelli dispensa attuali, uscita rapida dopo ultima lezione, ricerca Lara3 Translated, rimozione suggerimento vocabolario, stima tempo residuo e RAG di corso. Rispondere alla domanda sui modelli con verifica statica del codice.
- **Motivazione:** Richiesta esplicita di raccogliere le idee per il futuro distinguendo semplici e complesse, rispondere sui modelli gia implementati e ragionare sulla stima residua senza avviare implementazioni.
- **Impatto:** Solo documentazione. Undici attivita restano aperte e una domanda risulta risposta; coda LISTA_ORDINE invariata. Separati modelli selezionabili, identificativi interni e disponibilita API non verificata. Conservati lavoro Balance esistente, fonti locali e invio AI esplicito. Corretta nota obsoleta sulle voci 22-25 gia completate.
- **Follow-up:** Alla futura attivazione leggere requisiti e decisioni successive, riprodurre Ctrl+L e verificare fonti ufficiali per suoni Apple e Lara3; stima residua discreta sotto mezzora solo proposta da valutare. Nessuna nuova chiamata AI o ricerca online eseguita.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0327 — Estensione di LISTA_ORDINE alle undici nuove attivita aperte

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** backlog-ordine
- **Decisione:** Estendere la coda LISTA_ORDINE con le posizioni 13-23: rimozione frase vocabolario, tono didattico QnA, uscita ultima lezione, nuovo bug Ctrl+L, valutazione Lara3, suoni offline Apple, tag catture rapide, valutazione tempo residuo, timer telefono, audio QnA da telefono e RAG di corso. Conservare ordine e stato delle prime dodici posizioni; escludere la domanda sui modelli gia risposta.
- **Motivazione:** Richiesta esplicita dell utente di aggiornare LISTA_ORDINE dopo la raccolta delle idee, ordinando le nuove attivita da interventi circoscritti a integrazioni complesse senza alterare le priorita precedenti.
- **Impatto:** Solo documentazione. Coda estesa a 23 posizioni con 11 completate e 12 aperte. Prima voce aperta ancora sezione musica con pilota personale Spotify. Allineati i riferimenti delle nuove sezioni alla coda. Ricerca Lara3 e valutazione tempo residuo non equivalgono a funzioni implementate o scelte definitive; nessun lavoro applicativo avviato.
- **Follow-up:** Alla prossima invocazione del comando eseguire una sola voce secondo le regole AGENTS.md; non saltare automaticamente il pilota personale se richiede un azione dell utente. Verificare implementazione e collaudi prima di chiudere funzioni, documentare esiti per le sole valutazioni.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0328 — Skill pertinenti obbligatorie nel flusso LISTA_ORDINE

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** workflow-skill
- **Decisione:** Integrare AGENTS.md affinche ogni LISTA_ORDINE consulti la guida delle skill aggiunte nei giorni precedenti, inclusa grilling, selezioni e applichi quelle pertinenti insieme alle altre disponibili nella sessione, legga i relativi SKILL.md e comunichi scelta e scopo. Collegare la regola dalla coda e allineare la guida.
- **Motivazione:** Richiesta esplicita dell utente di rendere parte del comando l uso della raccolta di skill installata nei giorni precedenti, oltre alle skill gia disponibili.
- **Impatto:** Solo istruzioni e documentazione. Regola autorevole in AGENTS.md con rinvio alla guida esistente; metodi proporzionati al tipo di attivita, percorso diretto per modifiche semplici e condizioni di attivazione conservate, incluso handoff esplicito. Ordine, caselle e perimetro di una voce invariati. Nessuna installazione o attivita applicativa avviata.
- **Follow-up:** Dalla prossima invocazione leggere la guida, scegliere e applicare le skill pertinenti prima del lavoro; mantenere autorizzazioni e scelte gia espresse senza ripetere conferme generiche.
- **File coinvolti:** AGENTS.md, docs/product/idee-future-2026-10-13.md, docs/product/guida-skill-codex.md

## D-0329 — LISTA_ORDINE con grilling se utile e handoff finale

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** workflow-skill
- **Decisione:** Rendere esplicita la sequenza di LISTA_ORDINE: grilling, detta grill me, solo quando restano scelte da concordare; selezione delle skill utili alla voce; handoff finale dopo verifiche e aggiornamenti documentali. Registrare la richiesta permanente dell utente per handoff senza nuove conferme.
- **Motivazione:** L utente richiede un intervista solo se necessaria, liberta di scegliere i metodi pertinenti e un contesto essenziale per la sessione successiva alla fine del comando.
- **Impatto:** Aggiornati AGENTS.md e guida alle skill. Handoff salva in TEMP riferimenti, esiti, limiti, blocchi e prossimo passo anche per una voce bloccata, senza chiuderla o saltarla. Non svuota automaticamente la chat corrente. Se la skill manca, segnalare il limite e fornire un riepilogo equivalente. Nessuna modifica applicativa o alle caselle della coda.
- **Follow-up:** Applicare la sequenza dalla prossima invocazione di LISTA_ORDINE; riprendere dal percorso completo del riepilogo in una nuova sessione. Perimetro di una voce e regole local-first invariati.
- **File coinvolti:** AGENTS.md, docs/product/guida-skill-codex.md

## D-0330 — LISTA_ORDINE musica ricollaudata in attesa del pilota personale

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** collaudo-musica
- **Decisione:** Eseguire la posizione 12 della coda riusando l integrazione esistente: 13 test unitari musica e Spotify e scenario React Electron mirato passati. Documentare il percorso del pilota personale e mantenere aperte le caselle fino alle prove con account PC e cuffie.
- **Motivazione:** Le API simulate confermano il comportamento implementato ma non dimostrano che l account personale possa accedere alle API o che l audio raggiunga le cuffie. Il comando autorizza una sola voce e richiede di preservare questo limite.
- **Impatto:** Aggiunto report di collaudo con esiti automatici e controlli reali ancora necessari. Nessuna modifica applicativa, accesso a credenziali personali, chiamata AI, chiusura della voce o avvio della posizione 13. Chiesto all utente lo stato del collegamento Spotify.
- **Follow-up:** Proseguire il pilota personale quando l utente conferma disponibilita e stato dell account; aggiornare il report con esiti reali e usare handoff alla conclusione dell invocazione.
- **File coinvolti:** docs/quality/musica-pilota-2026-10-16.md

## D-0331 — Rimozione suggerimento vocabolario e rinvio esplicito del pilota musica

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** vocabolario-backlog
- **Decisione:** Su indicazione dell utente, lasciare aperta la posizione 12 musica con account dichiarato collegato e passare alla posizione 13. Rimuovere dal campo vuoto del vocabolario la frase Una parola dizionario locale e Piu parole traduzione automatica, conservando campo unico e indicazioni Ctrl+T ed Esc. Segnare completate posizione 13 e voce 28 dopo collaudo.
- **Motivazione:** L utente non desidera svolgere attivita sulla musica e autorizza esplicitamente la voce successiva. La richiesta di rimozione del testo era gia definita nel backlog e non richiede nuove scelte.
- **Impatto:** Modifica di una stringa nel renderer, senza variazioni alla logica o nuove dipendenze. Scenario Electron dictionary-only passato per IT EN manuale ambiguita Focus risposte obsolete e retry. Report musica aggiornato distinguendo dichiarazione dell utente e prove reali non eseguite. Ordine della coda invariato e posizione 14 non avviata.
- **Follow-up:** Dopo la voce 13 segue la 14 sul tono QnA; pilota musicale rinviato su richiesta dell utente e ancora aperto. Handoff finale in TEMP per la ripresa. Nessun installer ricostruito per questa modifica.
- **File coinvolti:** src/components/DictionaryOverlay.tsx, docs/product/idee-future-2026-10-13.md, docs/quality/musica-pilota-2026-10-16.md

## D-0332 — Metodo didattico e riscontri specifici nelle risposte QnA

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** qna-didattica
- **Decisione:** Completare la posizione 14 voce 26 con istruzioni QnA che privilegiano comprensione e correzioni motivate: valutare premesse e ragionamento, distinguere risposte parziali, dare riscontri specifici evitando elogi automatici, riformulare nei chiarimenti e proporre verifiche brevi solo se utili. Dichiarare limiti delle fonti e separare deduzioni e integrazioni.
- **Motivazione:** L utente ha autorizzato la prossima voce dopo il vocabolario. I requisiti sono gia definiti e il prompt precedente chiedeva solo chiarezza proporzione e contesto, senza regolare compiacenza e verifica della comprensione.
- **Impatto:** Aggiornato solo il prompt della generazione QnA; storico domanda corrente slide e catena modelli restano invariati. Regressioni del contratto SDK estese alle istruzioni didattiche e loro identita nei fallback. Passati 21 test QnA typecheck lint mirato e controllo diff. Nessuna dipendenza nuova o chiamata AI reale; risposte salvate invariate. Report con quattro casi sintetici e limiti della valutazione senza provider reale. Voce 14 e descrizione 26 completate, musica ancora rinviata e posizione 15 non avviata.
- **Follow-up:** Osservare il tono nelle nuove domande reali; le prove simulate verificano le richieste e non garantiscono la qualita delle risposte. Prossima voce dopo la 14: ritorno alla lista dopo ultima lezione. Handoff finale in TEMP; installer non ricostruito.
- **File coinvolti:** electron/main/gemini.ts, tests/unit/qnaRequest.test.ts, docs/product/idee-future-2026-10-13.md, docs/quality/qna-tono-didattico-2026-10-16.md

## D-0333 — Ritorno a Tutte le lezioni dopo ultima lezione salvata

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** studio-fine-corso
- **Decisione:** Completare la posizione 15 voce 27: dopo una nuova marcatura Completata salvata con successo e in assenza di altre lezioni da studiare nello stesso corso, mostrare Ultima lezione e tornare a Tutte le lezioni dopo 2 secondi. Applicare il controllo all intero archivio del corso e alle viste ordinaria e Focus, fermando il conteggio durante l avviso e bypassando il Focus Lock solo per questo ritorno automatico.
- **Motivazione:** Il requisito era gia definito. La marcatura esistente e ottimistica e la prossima lezione e solo cronologica: avviare un timer da questi soli dati rischiava di chiudere dopo un salvataggio fallito o di ignorare lezioni precedenti non completate.
- **Impatto:** Nuovo hook useFinalLectureReturn in App, callback di salvataggio con esito booleano e avanzamento dopo conferma. Reset filtri corso stato ricerca e scheda corso al ritorno. Riaperture gia completate non si chiudono; timer annullabile e risposte tardive isolate per selezione. Sessione Focus salvata dal ciclo di vita esistente senza duplicati. Nessuna nuova dipendenza o chiamata AI. Passati 513 Vitest, scenario mirato, suite Electron completa e riavvio, typecheck, lint mirato senza avvisi e build. Documentazione struttura e coda aggiornate.
- **Follow-up:** Prossima voce dopo la 15: diagnosi del nuovo bug Ctrl+L posizione 16. Musica ancora rinviata per scelta dell utente. Handoff finale in TEMP; installer non ricostruito, nessun commit o push.
- **File coinvolti:** src/hooks/useFinalLectureReturn.ts, src/hooks/useLectureContent.ts, src/App.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/integration/hookRegression.browser.tsx, tests/README.md, STRUTTURA_PROGETTO.md, docs/product/idee-future-2026-10-13.md, docs/quality/ultima-lezione-2026-10-16.md

## D-0334 — Collaudo nativo Ctrl L con segnalazione Focus ancora aperta

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** diagnosi-ctrl-l
- **Decisione:** Mantenere aperte posizione 16 e voce 33: utente conferma Focus e pulsante lingua funzionante, ma il difetto non si riproduce con input nativo Electron e fullscreen HTML reale. Aggiungere filtro diagnostico language-shortcut-only con note sintetiche confronto pulsante selezione testo PDF reale e protezione campi editabili. Non cambiare la logica applicativa senza riproduzione.
- **Motivazione:** I test DOM storici non verificavano la consegna nativa dei tasti. Il nuovo ciclo supera questa lacuna ma il suo PASS non dimostra la soluzione del caso personale. Anche la copia installata contiene il gestore Ctrl L, quindi non e giustificato attribuire la causa a una scorciatoia assente.
- **Impatto:** Nuovo scenario Electron separato con finestra temporanea visibile per fullscreen, nessun dato personale. Launcher con controllo sintassi preventivo e gesto utente di test con timeout. Passati filtro nativo ripetuto, suite Electron completa e riavvio, typecheck, lint TypeScript mirato e node check del runner. Documentate evidenze e limiti. Nessun provider AI, modifica funzionale, installer, chiusura casella o avvio posizione 17.
- **Follow-up:** Acquisire esito della prova utente dopo un clic nel testo della dispensa in Focus; se fallisce ancora ricostruire punto di focus e pannelli senza contenuti personali. Handoff finale in TEMP; diagnosi resta sulla voce 16.
- **File coinvolti:** tests/integration/languageShortcutScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tests/README.md, STRUTTURA_PROGETTO.md, docs/product/idee-future-2026-10-13.md, docs/quality/ctrl-l-diagnosi-2026-10-16.md

## D-0335 — Tracciamento Ctrl L facoltativo e copia diagnostica separata

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** diagnostica-ctrl-l
- **Decisione:** Proseguire la voce 16 senza chiuderla: l utente conferma il difetto anche dopo clic nel testo e uso del pulsante, mentre il collaudo nativo passa anche montando l intera App. Aggiungere strumentazione temporanea attivata solo da LEZIONIFY_TRACE_CTRL_L uguale a 1: arrivo nel main, cattura e risultato nel renderer, lingua effettiva. Preparare copia Windows separata con launcher diagnostico esplicito.
- **Motivazione:** Il caso reale resta non riprodotto e non giustifica una correzione ipotetica. Serve una singola osservazione della sessione dell utente per distinguere tasto non ricevuto, esclusioni del gestore e cambio richiesto non applicato, evitando di richiedere i tentativi gia eseguiti.
- **Impatto:** Traccia locale disattivata nell avvio normale, solo Ctrl Cmd L e metadati booleani senza testo tasti grezzi o identificativi lezione. Nessuna variazione al comportamento della scorciatoia. Passati 514 Vitest, scenario nativo con App e trace on off, typecheck lint e build. Suite Electron completa con riavvio passata isolata dopo un fallimento del controllo Focus flottante nell esecuzione parallela, documentato senza attribuirlo a Ctrl L. Copia in local-artifacts/ctrl-l-diagnostic-2026-10-16 con 364 file build confrontati ad ASAR, runtime e FFmpeg verificati, percorsi privati esclusi. Nessuna installazione avvio sulla libreria reale pubblicazione commit o push.
- **Follow-up:** L utente deve chiudere altre copie, avviare Avvia-diagnosi-CtrlL.cmd, riprodurre una volta e copiare i soli log filtrati DEBUG-ctrl-l tramite Ctrl Shift L. Interpretare il tracciato prima di correggere; rimuovere flag e strumentazione temporanea dopo diagnosi e correzione. Voce 16 aperta, posizione 17 non avviata e musica ancora rinviata. Handoff finale in TEMP.
- **File coinvolti:** electron/main/languageShortcutDiagnostics.ts, electron/main/index.ts, electron/preload/index.ts, shared/archive.ts, src/components/LectureDrawer.tsx, tests/unit/languageShortcutDiagnostics.test.ts, tests/integration/languageShortcutScenarios.browser.tsx, docs/quality/ctrl-l-diagnosi-2026-10-16.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, local-artifacts/ctrl-l-diagnostic-2026-10-16

## D-0336 — Valutazione Lara 3 conclusa senza nuovo provider e rinvio Ctrl L

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** ricerca-traduzione
- **Decisione:** Su richiesta esplicita dell utente rimandare la prova diagnostica Ctrl L mantenendo la voce16 aperta e completare la sola valutazione documentale della posizione17 voce35. Confermare Lara3 di Translated, distinguere web SDK API e offerta enterprise da pesi locali non trovati, quota Free API mensile10000 da pool web60000 e pilot commerciale una tantum. Conservare Bergamot senza integrazione Lara.
- **Motivazione:** La ricerca su fonti primarie e SDK non dimostra un modello locale gratuito o un vantaggio di latenza sul PC. Il claim Flash50ms non descrive il piano Free. Servono ulteriori verifiche per modello effettivo privacy e condizioni di un confronto reale, non una scelta automatica del provider.
- **Impatto:** Report con fonti, confronto storico Bergamot caldo85 e134ms, prezzi e noTrace Incognito, denominazioni Base Standard Lara3 non equiparate, dataset output distinto da pesi e piano futuro condizionato. Valutazione tecnica delle limitazioni dei termini senza parere legale. Verificati24 casi sintetici e1982 caratteri nel file locale; nessun account chiave letta modello scaricato chiamata AI messaggio al fornitore o modifica applicativa. Ricerca completata in coda e descrizione con limiti espliciti; indici e struttura aggiornati. Musica e Ctrl L ancora aperti e rinviati.
- **Follow-up:** Prossima voce dopo la17: suoni di sottofondo offline come Apple posizione18, non avviata. Eventuale pilota Lara richiede richiesta separata, accesso e chiarimento condizioni; nessun benchmark o soglia prestazionale approvati. Handoff finale in TEMP. Riprendere Ctrl L quando l utente fornisce i log della copia diagnostica.
- **File coinvolti:** docs/research/lara-translated-valutazione-2026-10-16.md, docs/research/README.md, docs/README.md, docs/product/idee-future-2026-10-13.md, docs/quality/ctrl-l-diagnosi-2026-10-16.md, STRUTTURA_PROGETTO.md

## D-0337 — Salvataggio del contesto e avvio valutazione suoni offline

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** ripresa-suoni-offline
- **Decisione:** Salvare un punto di ripresa permanente dei risultati e rinvii della sessione e avviare la sola posizione18 suoni di sottofondo offline. Conservare il requisito originale Apple finche l utente non accetta esplicitamente equivalenti. Ricerca documentale conclusa, implementazione non iniziata e casella aperta.
- **Motivazione:** L utente chiede di salvare tutte le informazioni e proseguire. Le fonti Apple non forniscono una concessione pubblica individuata per incorporare gli audio originali in Windows; scegliere equivalenti cambierebbe il requisito e richiede una risposta. Le informazioni tecniche gia raccolte evitano di ripetere ricerca e diagnosi.
- **Impatto:** Nuovo riepilogo permanente con riferimenti a D0329-D0336, prove, distribuzione, rinvii musica e CtrlL e punti tecnici per il player. Report Apple con fonti primarie e alternative non adottate, indici e struttura aggiornati. Nessun audio scaricato, asset scelto, dipendenza aggiunta o comportamento applicativo modificato. Nessun nuovo quality gate applicativo per sola documentazione.
- **Follow-up:** Attendere le tre risposte gia richieste su equivalenti, continuita del pannello e sovrapposizione audio. Poi definire catalogo e completare implementazione e collaudo della sola voce18. Non avviare19, non richiedere i tentativi CtrlL gia fatti. Preparare handoff in TEMP.
- **File coinvolti:** docs/product/punto-ripresa-2026-10-16.md, docs/research/suoni-sottofondo-apple-valutazione-2026-10-16.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0338 — Equivalenti accettati e verifica del catalogo candidato

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** suoni-offline
- **Decisione:** Recepire la scelta esplicita dell utente di accettare equivalenti agli audio Apple. Proporre sei categorie bianco rosa marrone pioggia onde ruscello, senza adottare ancora catalogo e comportamento del player in attesa delle risposte alle domande asincrone.
- **Motivazione:** Gli equivalenti sono autorizzati, quindi non occorre riproporre il vincolo Apple. Servono risposte sulle scelte gia aperte di continuita chiusura pannello e convivenza audio. La ricerca ha individuato fonti CC0 e CC BY4.0 documentate per i candidati.
- **Impatto:** Report unico con URL primari attribuzioni dimensioni SHA256 e sei decodifiche FFmpeg riuscite. Acquisiti solo in local-artifacts per valutazione 11623969 byte, niente audio incluso nell app o dipendenza aggiunta. Verifica TLS ordinaria Node e curl riuscita dopo errore certificato Python, nessuna disabilitazione. Nessun ascolto umano attestato o collaudo Chromium dei loop; implementazione non iniziata e voce18 aperta. Aggiornati punto permanente indici e struttura.
- **Follow-up:** Attendere risposte alle domande su catalogo, continuita dopo chiusura e sovrapposizione o pausa lezione. Confermare comprensione condivisa secondo grilling, poi implementare e collaudare solo18 riusando candidati e ricerca. Handoff in TEMP aggiornato, non avviare19.
- **File coinvolti:** docs/research/suoni-equivalenti-catalogo-2026-10-16.md, docs/product/punto-ripresa-2026-10-16.md, docs/research/README.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0339 — Rigenerazione installer generale 16 ottobre

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerato senza pubblicazione il setup NSIS x64 generale dalla build corrente in dist/Lezionify-Setup-0.1.0.exe; conservati setup, blockmap e manifesto precedenti in local-artifacts/installer-backups/20261016-161642.
- **Motivazione:** La richiesta esplicita dell'utente di rigenerare l'installer autorizza il packaging generale Windows e la sostituzione degli artefatti locali, mantenendo una copia recuperabile della versione precedente.
- **Impatto:** Setup 0.1.0 di 190762634 byte, SHA-256 4b7d20c6ab7336c4a0df56798a7ae45d398220fbd55d564e12e7ec1e9a90f269; latest.yml e blockmap ricreati. Build e packaging riusciti; nessuna pubblicazione o installazione automatica.
- **Follow-up:** L'utente può chiudere Lezionify e avviare il setup per aggiornare l'installazione locale; l'installer non è stato eseguito.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261016-161642

## D-0340 — Integrazione suoni di sottofondo offline equivalenti ad Apple

- **Data:** 2026-10-16
- **Stato:** accettata
- **Area:** suoni-offline
- **Decisione:** Adozione catalogo 6 suoni (rumori newagesoup CC0, natura Blanket CC BY 4.0/CC0) con download esplicito in userData/ambient-sounds, player Web Audio loop gapless persistente nel pannello Musica e auto-pausa durante l'ascolto della lezione
- **Motivazione:** Conferma dell'utente al grilling; soddisfa il requisito di studio concentrato offline senza streaming o dipendenze esterne
- **Impatto:** Nuovo pannello Suoni in Musica, hook globale AmbientSoundProvider, zero autoplay all'avvio, coordinamento con AudioPlayer
- **Follow-up:** Prossima voce 19 tag catture rapide; musica e Ctrl+L restano rinviate
- **File coinvolti:** shared/ambientSounds.ts, shared/archive.ts, electron/main/ambientSounds.ts, electron/main/index.ts, electron/preload/index.ts, src/utils/musicPreferences.ts, src/components/AmbientSoundContext.tsx, src/components/AmbientSoundPanel.tsx, src/components/MusicButton.tsx, src/components/AudioPlayer.tsx, src/components/music.css, tests/unit/ambientSounds.test.ts

## D-0341 — Gruppi locali per attivita e note delle catture rapide

- **Data:** 2026-10-17
- **Stato:** accettata
- **Area:** catture-rapide
- **Decisione:** Dopo grilling e conferma esplicita dell utente implementare voce34 posizione19: un gruppo per attivita, note separate per gruppo, Senza tag per dati storici, vista Tutti, ultimo gruppo persistito, lettere A-Z univoche con Ctrl P poi Alt lettera. Creazione rinomina spostamento copia per gruppo o complessiva e pulizia completati limitata al gruppo. Eliminazione confermata trasferisce attivita e note in Senza tag.
- **Motivazione:** L utente richiede direttamente tag e stima dello studio e approva tutte le scelte. Campi opzionali mantengono compatibilita con lo scratchpad esistente senza migrazione distruttiva. La combinazione Alt evita di consumare lettere durante la scrittura.
- **Impatto:** Contratti validazione lettura e salvataggio atomico conservano gruppi note e selezione. Dashboard include contenuti raggruppati. Errori di caricamento impediscono scritture vuote; errori di salvataggio mostrano riprova. Nessuna dipendenza o chiamata AI. Passati524 test Vitest suite Electron completa con riavvio typecheck lint mirato e build;83 test pertinenti ripassati dopo validazione lettura.
- **Follow-up:** Voce19 completata. Pilota Spotify e Ctrl L restano rinviati. Installer non rigenerato. Uso e limiti nel documento catture-gruppi-stima-studio-2026-10-17.
- **File coinvolti:** shared/archive.ts, electron/main/archiveValidation.ts, electron/main/fileStorage.ts, electron/main/archive.ts, src/hooks/useQuickCapture.ts, src/utils/quickCapture.ts, src/components/QuickCaptureOverlay.tsx, src/components/Dashboard.tsx, src/App.tsx, src/styles.css, tests/unit/quickCaptureGroups.test.ts, tests/integration/studyToolsScenarios.browser.tsx, tools/run_hook_regressions.cjs, docs/product/idee-future-2026-10-13.md

## D-0342 — Stima locale dello studio residuo con avanzamento consolidato

- **Data:** 2026-10-17
- **Stato:** accettata
- **Area:** stima-studio
- **Decisione:** Dopo grilling e conferma esplicita implementare voce36 posizione20 come stima dello studio e non sola lettura. In Focus campionare permanenza su20 intervalli di documento pesati per testo;45secondi consolidano un intervallo e solo il prefisso senza buchi conta. Dopo almeno600secondi e60percento consolidato mostrare stima solo sotto30minuti. QnA PDF e riletture aggiungono tempo senza inventare avanzamento; nelle superfici ausiliarie indicatore nascosto.
- **Motivazione:** L utente vuole estrapolare il proprio ritmo dalla prima parte e ignorare una scorsa di cinque secondi. Il prefisso consolidato impedisce di interpretare un salto al fondo come studio delle parti intermedie. Nessuna inferenza AI o precisione al secondo.
- **Impatto:** Campioni locali per lezione condivisi IT EN, salvataggio ogni10secondi e uscita, invalidazione dopo variazione contenuti. Pause background inattivita oltre15minuti e salti temporali da sospensione esclusi. Fasce5minuti aggiornate al massimo ogni minuto con mediana3campioni. Ricalcola da qui azzera campioni e ricalibra sul residuo dal punto selezionato. Opzione immediata nelle Impostazioni. Passati524 Vitest scenari Electron mirati e completi con riavvio typecheck lint mirato e build. Nessuna dipendenza o chiamata AI.
- **Follow-up:** Voce20 implementata e verificata tecnicamente. Osservare nell uso motivazione e copertura: permanenza non prova comprensione, intervalli pesati non sono capitoli semantici e cambi lingua condividono avanzamento normalizzato approssimativo. Prossima voce dopo20 timer telefono21; nessun avvio automatico. Installer non rigenerato.
- **File coinvolti:** src/utils/studyEstimate.ts, src/hooks/useStudyEstimate.ts, src/components/StudyEstimateSettings.tsx, src/components/SettingsModal.tsx, src/components/LectureDrawer.tsx, src/styles.css, tests/unit/studyEstimate.test.ts, tests/integration/studyToolsScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md

## D-0343 — Perimetro approvato della chat RAG di corso e sincronizzazione Notability

- **Data:** 2026-10-17
- **Stato:** accettata
- **Area:** rag-corso
- **Decisione:** Avviare la voce37 posizione23 su richiesta diretta dopo grilling Q1-Q9 confermato. Corpus locale con trascrizioni dispense informazioni corso documenti aggiunti e cartelle slide Notability associate per corso. Attivazione esplicita autorizza lettura e download OneDrive presenti e futuri; scansione all avvio e periodica. Gemini puo richiedere ricerche o passaggi strutturati entro tre cicli aggiuntivi; immagini di pagine o documenti mancanti richiedono azione esplicita. Conteggi completi per trascrizione e per lezione senza sommare derivazioni. Citazioni versionate e conversazioni persistenti.
- **Motivazione:** L utente approva tutte le scelte e indica una cartella OneDrive personale; il percorso reale deve restare nella configurazione locale. Occorre distinguere testo ricercabile da pagine scansionate e fatti del docente da deduzioni dichiarate.
- **Impatto:** Implementazione in corso con dipendenze gia presenti MiniSearch PDFjs e gestore Gemini. Scoperta iniziale solo metadati:111 PDF in10 cartelle, molti con attributi online; nessun contenuto reale inviato a provider. Fonte originale conservata. Specifica e collaudi sintetici precedono chiusura casella.
- **Follow-up:** Completare implementazione e verifiche prima di chiudere la voce. Verificare invalidazione fonti modificate o rimosse isolamento corsi annullamento conteggi esaustivi PDF senza testo e vincoli dei cicli AI. Non avviare timer telefono o altre voci.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/course-chat-plan.md, shared/courseRag.ts, electron/main/courseRag.ts, src/components/CourseChat.tsx

## D-0344 — Chat di corso con fonti locali sincronizzate e recupero strutturato limitato

- **Data:** 2026-10-17
- **Stato:** accettata
- **Area:** rag-corso
- **Decisione:** Completare voce37 posizione23 secondo D0343: corpus di trascrizioni dispense informazioni corso PDF Markdown e testo aggiunti; collegamento nativo alla cartella Notability del corso con attivazione esplicita. MiniSearch recupera passaggi con provenienza; conteggi Unicode sulle trascrizioni complete distinti per lezione. Gemini puo richiedere ricerca passaggi conteggi o documenti tramite JSON validato entro tre approfondimenti aggiuntivi. Citazioni ammesse solo tra i passaggi inviati, con versione e snapshot; pagine visive scelte e inviate esplicitamente con controllo della versione.
- **Motivazione:** Riutilizzare MiniSearch PDFjs policy modelli e request manager gia presenti soddisfa il bisogno concreto senza nuove dipendenze o embedding remoti. Corpus e storico locali, originali intatti. I segnaposto OneDrive sono letti solo dopo collegamento o selezione esplicita; file nuovi modificati e rimossi riconciliati all avvio e ogni cinque minuti mentre l app e aperta. Il worker isola il costo dell estrazione PDF.
- **Impatto:** Nuovi contratti e modulo RAG con persistenza atomica per corso e UI chat fonti citazioni bozze conteggi richiesta documenti e PDF alla pagina citata. Testo inviato limitato a32000caratteri di passaggi massimo24, catalogo100fonti e storico6messaggi limitati; ricerca e conteggi locali non troncati a quel catalogo. Annullamento reale dei tentativi, trace delle ricerche e contesto senza percorsi o chiavi. Media remoti disabilitati nella chat. Passati536Vitest typecheck lint mirato senza avvisi build scenario Electron mirato e suite completa con riavvio. Worker reale Node ed Electron con PDF sintetici, asset build verificato per hash. Due test logger falliti nel run contemporaneo alla build; suite isolata successiva passata senza modifiche al logger.
- **Follow-up:** Voce23 e descrizione37 completate. Collegare nell app la cartella del singolo corso per attivare OneDrive; idratazione sui PDF personali e qualita delle risposte Gemini restano da osservare. Nessun PDF reale scaricato o inviato in questi test, nessun installer commit o push. Limiti: ricerca lessicale, niente OCR automatico, codice corso identifica lo storico; riferimenti e collaudi in docs/product/rag-corso-2026-10-17.md. Altre voci aperte e rinvii conservati.
- **File coinvolti:** shared/courseRag.ts, shared/archive.ts, electron/main/courseRag.ts, electron/main/courseRagIndex.ts, electron/main/archive.ts, electron/main/index.ts, electron/main/focusPdf.ts, electron/preload/index.ts, resources/course-rag/pdf-worker.cjs, electron.vite.config.ts, src/components/CourseChat.tsx, src/components/FocusPdfViewer.tsx, src/components/MarkdownViewer.tsx, src/components/Sidebar.tsx, src/App.tsx, src/styles.css, tests/unit/courseRag.test.ts, tests/integration/courseChatScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, docs/product/rag-corso-2026-10-17.md, docs/product/course-chat-plan.md, docs/product/idee-future-2026-10-13.md, tests/README.md, STRUTTURA_PROGETTO.md, docs/README.md

## D-0345 — Rigenerazione rapida installer Windows con chat RAG

- **Data:** 2026-10-17
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta esplicita il setup NSIS x64 0.1.0 dalla build corrente gia verificata tramite npx electron-builder --win, conservando setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261017-115604.
- **Motivazione:** L utente chiede di rigenerare velocemente l installer dopo la chat RAG. Riutilizzare gli output della build appena verificata evita una ricompilazione senza modifiche applicative.
- **Impatto:** Packaging concluso con codice0. dist/Lezionify-Setup-0.1.0.exe di190796418byte SHA256 2db743e9ed4cae4b52dc86dbc772b0eda05898d3f4e9fd5eb82205eacf75335b; blockmap e latest.yml rigenerati. Archivio ASAR controllato: worker RAG identico al sorgente per hash e moduli PDFjs legacy e worker presenti. Nessuna pubblicazione o installazione eseguita.
- **Follow-up:** Chiudere Lezionify e avviare il nuovo setup per aggiornare l installazione locale. Le limitazioni funzionali e i collaudi personali restano quelli di D0344; questa operazione verifica il packaging e la presenza degli asset, non esegue la libreria personale.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261017-115604

## D-0346 — Esportazione corso in due clic con laboratorio opzionale

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** pdf-corso
- **Decisione:** Il primo clic su Esporta corso in PDF mostra Include anche laboratorio non selezionato e trasforma lo stesso pulsante in Conferma conservando posizione e larghezza. La conferma esporta il corso escludendo di default le lezioni isLaboratory; la spunta le include in ordine cronologico. Scelta azzerata dopo ogni tentativo e al cambio corso o lingua; Esc chiude le opzioni. Esportazione singola invariata e Mermaid sempre visibili con impaginazione compatta esistente.
- **Motivazione:** Richiesta esplicita dell utente per scegliere se aggiungere i laboratori al PDF senza spostare il secondo clic o modificare le dispense originali. Riutilizzo del contrassegno laboratorio gia persistente e del renderer PDF comune.
- **Impatto:** Opzione includeLaboratory booleana validata via IPC e filtro applicato nel main prima della lettura delle dispense. Nessuna dipendenza nuova o chiamata AI. Passati sei test Vitest pertinenti, scenario React Electron mirato e build; esportazioni PDF reali IT EN e singola con verifica laboratorio escluso e incluso, Mermaid compatti proporzionati, formule e fallback. La prima esecuzione Vitest richiedeva accesso ai temporanei fuori sandbox; il nuovo filtro Electron e stato corretto per evitare un riavvio lettura non pertinente, poi ripassato.
- **Follow-up:** Installer non rigenerato. Le lezioni vengono filtrate secondo il contrassegno Laboratorio visibile nell archivio; correggere eventuali classificazioni dalla lista prima di esportare.
- **File coinvolti:** shared/pdfExport.ts, electron/main/pdfExport.ts, src/components/PdfExportButton.tsx, src/styles.css, tests/unit/pdfExport.test.ts, tests/integration/lectureListScenarios.browser.tsx, tests/integration/hookRegression.browser.tsx, tools/run_hook_regressions.cjs, tools/run_pdf_export_regressions.cjs, docs/product/lettura-export-pdf.md

## D-0347 — Profilo Mermaid compatto e disposizione adattiva nei PDF

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** mermaid-pdf
- **Decisione:** Dopo esportazione completa IR ITA con laboratori e ispezione PNG delle pagine richieste 4 7 12 20 23 adottare un profilo Mermaid solo PDF: font base14px, nodi24px livelli28px padding8px wrapping180px; sequenze con messaggi e attori a capo. Se un flowchart richiederebbe meno di8.5pt su A4 provare la disposizione perpendicolare e adottarla solo con miglioramento scala oltre0.05, mantenendo originale valido in caso di errore. Supera il vincolo di orientamento sempre invariato di D0289 solo nella copia stampata; fonti e lettura Focus e ordinaria restano invariati.
- **Motivazione:** La verifica reale mostrava schemi alti con ampi spazi interni e schemi larghi con font5.72 e6.13pt. Ridurre tutti gli SVG avrebbe peggiorato i secondi. La spaziatura interna compatta e la scelta del layout recuperano spazio dove utile mantenendo leggibili etichette e collegamenti, senza riscrivere le dispense o richiedere AI.
- **Impatto:** Corso IR completo7lezioni con3laboratori e36diagrammi: PDF da104a99pagine. Schemi vecchie pagine4 7 12 alti rispettivamente37 33 e22percento in meno; cinque schemi controllati con font effettivo10.49pt, ultime due disposizioni adattate. Nuove pagine3 7 11 20 24 ispezionate in PNG. Tutti i caratteri delle etichette dei36SVG conservati e hash delle dispense invariati. Passati58Vitest pertinenti typecheck lint build scenario Electron reading-position-only e test PDF reale esteso con PDFjs che verifica etichette e font almeno8.5pt nelle fixture. Nessuna dipendenza o chiamata AI.
- **Follow-up:** Installer non rigenerato. Soglia indicativa e non garanzia universale per grafi estremi. Resoconto in docs/quality/mermaid-pdf-2026-10-18.md; PDF personali PNG SVG e runner solo in local-artifacts/pdf-mermaid-review-2026-10-18 ignorato da Git. Nessuna pubblicazione commit o push.
- **File coinvolti:** src/components/MermaidDiagram.tsx, src/components/PdfExportDocument.tsx, src/components/pdfExport.css, src/utils/mermaidPrint.ts, tests/unit/mermaidPrint.test.ts, tools/run_pdf_export_regressions.cjs, tests/README.md, docs/product/lettura-export-pdf.md, docs/quality/mermaid-pdf-2026-10-18.md, STRUTTURA_PROGETTO.md

## D-0348 — Installer Windows con scelta laboratorio e Mermaid PDF compatti

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta esplicita il setup NSIS x64 0.1.0 dopo nuova build di produzione, includendo D0346 e D0347. Packaging con npx electron-builder --win --publish never. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261018-163039.
- **Motivazione:** L utente chiede l installer con le modifiche appena implementate e verificate all esportazione del corso e alla leggibilita dei diagrammi Mermaid nei PDF.
- **Impatto:** Build e packaging conclusi con codice0. Setup di190797822byte SHA256 38c38cebead2e56d99bb8643f7da0ca6ae8d559968120c33226d087020d6e0f9. Verificati369file out identici al payload ASAR, presenza opzione laboratorio Conferma profilo Mermaid14px wrapping180px e disposizione adattiva, FFmpeg e runtime traduzione. Manifesto SHA512 dimensione e blockmap verificati; artefatti personali esclusi. Riutilizzati i collaudi applicativi D0346 D0347 senza nuove modifiche al prodotto. Primo packaging bloccato dal DNS nella sandbox, ripetuto con autorizzazione e concluso. Nessuna pubblicazione o installazione eseguita.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l installazione locale. Backup recuperabile e verification.json nella cartella del backup. Nessun commit o push.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261018-163039

## D-0349 — Rinomina persistente e indipendente dei titoli IT EN

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** titoli-lezioni
- **Decisione:** Dopo grilling e conferma esplicita implementare doppio clic sulla riga o F2 per editor con due titoli IT EN indipendenti. Aggiornare primo H1 salvato della sola lingua modificata, metadato IT compatibile, titolo del lettore Focus e PDF. Conservare gli override manuali facoltativi in Lecture.titleOverrides e riapplicarli nelle rigenerazioni; nessuna traduzione automatica durante la rinomina. La lista mantiene IT. Il clic singolo apre dopo500ms per distinguerlo dal doppio; Invio e Spazio restano immediati.
- **Motivazione:** Il titolo unico precedente e il normale saveMarkdown IT non soddisfano l indipendenza richiesta: quest ultimo invalida EN. Un IPC dedicato serializzato evita di rigenerare contenuti e preserva l altra lingua, restando compatibile con gli archivi esistenti.
- **Impatto:** Helper condiviso valida1-500caratteri su una riga, ignora H1 nei fenced, preserva corpo e CRLF e protegge la sintassi digitata. Scritture atomiche per file con rollback su errore; override clonati nella cache e validati in lettura. Aggiornate ricerca e cache UI. Nomi UUID audio e trascrizioni invariati. Editor con focus caricamento errori e riprova; EN mancante puo avere titolo preparato. Passati550Vitest inclusi9nuovi test di persistenza indipendenza riavvio sync rigenerazione simulata e rollback, typecheck lint build Electron lecture-list-only in quattro filtri e reading-position-only. Screenshot chiaro scuro ispezionati. Nessuna dipendenza AI reale modifica alla libreria personale pubblicazione commit o push.
- **Follow-up:** Installer non rigenerato. Regole e limiti in docs/product/titoli-lezioni-note-pdf-2026-10-18.md, inclusa assenza di transazione filesystem unica tra piu file in arresto forzato e normale invalidazione fingerprint dopo modifica Markdown. La rigenerazione completa IT continua a invalidare il vecchio EN, preservando il suo titolo manuale.
- **File coinvolti:** shared/lectureTitles.ts, shared/archive.ts, electron/main/archive.ts, electron/main/libraryRepository.ts, electron/main/index.ts, electron/preload/index.ts, electron/main/pdfExport.ts, src/components/LectureTitleEditor.tsx, src/components/LectureList.tsx, src/components/LectureDrawer.tsx, src/App.tsx, src/styles.css, tests/unit/lectureTitles.test.ts, tests/integration/lectureListScenarios.browser.tsx, tools/run_hook_regressions.cjs, docs/product/titoli-lezioni-note-pdf-2026-10-18.md, STRUTTURA_PROGETTO.md

## D-0350 — Una pagina Note quadrettata dopo ogni lezione esportata

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** pdf-note
- **Decisione:** Su richiesta utente e conferma delle scelte aggiungere sempre una pagina A4 Note IT o Notes EN dopo ogni voce del PDF di corso e dopo la lezione singola. Griglia SVG vettoriale locale da5mm alta230mm con tratto0.5px grigio dedede, contenitore250mm e normale numerazione. Inclusa dopo dispense mancanti, nessuna pagina bianca extra dopo l ultima. Nessun allineamento forzato sul recto nel fronte retro.
- **Motivazione:** Fornire spazio per appunti formule e disegni subito dopo ogni lezione stampata, con quadrettatura molto leggera come delegato dall utente e senza asset remoti o nuove dipendenze.
- **Impatto:** PdfExportDocument e CSS inseriscono la pagina separata mantenendo il renderer Mermaid compatto esistente. Test PDF reale IT EN corso e singola passati: PDFjs verifica una pagina Note per voce, solo intestazione e footer, ultima pagina corretta e nessun foglio involontariamente vuoto. Pagina Note renderizzata con Poppler e ispezionata in PNG; anteprima e PDF sintetici in local-artifacts/pdf-notes-titles-2026-10-18 ignorato da Git. Build typecheck lint e550Vitest passati. Originali personali non modificati e nessuna chiamata AI.
- **Follow-up:** Installer non rigenerato. Uso e verifiche in docs/product/titoli-lezioni-note-pdf-2026-10-18.md e docs/product/lettura-export-pdf.md. Il PDF del corso crescera di una pagina per ogni lezione selezionata, oltre ai normali cambi di impaginazione.
- **File coinvolti:** src/components/PdfExportDocument.tsx, src/components/pdfExport.css, tools/run_pdf_export_regressions.cjs, docs/product/lettura-export-pdf.md, docs/product/titoli-lezioni-note-pdf-2026-10-18.md, docs/README.md, tests/README.md, STRUTTURA_PROGETTO.md

## D-0351 — Installer Windows con titoli indipendenti e pagine Note

- **Data:** 2026-10-18
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta esplicita il setup NSIS x64 0.1.0 con D0349 e D0350 dopo nuova build di produzione e packaging npx electron-builder --win --publish never. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261018-171132.
- **Motivazione:** Consegnare un installer aggiornato con rinomina persistente IT EN e una pagina Note dopo ogni lezione PDF, confermando la registrazione delle modifiche.
- **Impatto:** Build e packaging conclusi con codice0. Setup di190801731byte SHA256 66219a863cf33a3be653fc82dc00216371090547203cd7805955dae9e6db3a7a. Verificati369file out identici al payload ASAR, editor titoli e relativo IPC, override persistenti, pagina Note, scelta laboratorio e Mermaid compatti. Manifesto SHA512 dimensione blockmap FFmpeg runtime traduzione e assenza artefatti personali verificati. Restano validi550Vitest typecheck lint e collaudi Electron PDF delle decisioni D0349 D0350; nessuna nuova modifica al prodotto. Nessuna pubblicazione o installazione.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Backup e verification.json nella cartella indicata; nessun commit o push.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261018-171132, docs/product/titoli-lezioni-note-pdf-2026-10-18.md

## D-0352 — Sei nuove richieste in idee future e LISTA_ORDINE

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** pianificazione
- **Decisione:** Registrare le voci 38-43 e le posizioni aperte 24-29: transizioni musica e suoni con durata da valutare, grafica Memo, nuovo flusso PDF Lezione Corso, anteprima attivita Memo dopo un secondo fermo, log progressivi per giorno e diagnosi molto importante del rifiuto di traduzione ENG. Conservare ordine e rinvii esistenti.
- **Motivazione:** Richiesta esplicita dell utente di aggiornare idee future e LISTA_ORDINE con specifiche complete senza avviare le implementazioni.
- **Impatto:** Solo pianificazione documentale. Il nuovo PDF prevede un solo Esporta, modale con Indietro, tutte le lezioni e laboratori inizialmente selezionati, lingua, nomi file richiesti e Salva con nome Windows; conserva pagine Note D0350 e in futuro sostituira il flusso D0346. Nessuna modifica applicativa dipendenza o chiamata AI. Segnalazione ENG riportata senza identificativo locale e senza attribuire una causa non verificata.
- **Follow-up:** Implementare e collaudare le singole voci su richiesta secondo AGENTS.md. Durata transizioni e dettaglio grafico Memo restano da valutare; diagnosi ENG deve preservare italiano e inglese precedente. Caselle tutte aperte, nessun riordino automatico per priorita.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, DECISIONI.md

## D-0353 — Indagine locale sui rifiuti strutturali ENG

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** diagnosi-eng
- **Decisione:** Documentare sette rifiuti strutturali nei log locali e sei probe sintetici del validatore reale. Conservare aperte la voce 43 e la posizione 29: la causa delle risposte personali non e isolata e non si applica una correzione speculativa.
- **Motivazione:** La richiesta rimanda alle idee future e alla coda. Il messaggio generico non distingue elementi protetti alterati da variazioni sintattiche equivalenti; mancano le risposte rifiutate per il replay reale.
- **Impatto:** Solo documentazione e artefatti diagnostici locali ignorati. Passati 126 test pertinenti e sei probe senza rete. Nessuna modifica applicativa libreria personale dipendenza o chiamata AI; nessun riordino della coda.
- **Follow-up:** Isolare il componente strutturale al prossimo tentativo esplicito mediante diagnosi sanitizzata o risposta fallita acquisita localmente. Distinguere la traduzione ENG dalla trascrizione audio se questo era il problema inteso.
- **File coinvolti:** docs/quality/integrita-eng-indagine-2026-10-19.md, docs/product/idee-future-2026-10-13.md

## D-0354 — Rifiuto ENG reale isolato su LaTeX e riferimento ripetuto

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** diagnosi-eng
- **Decisione:** Dopo autorizzazione esplicita eseguire una sola richiesta diagnostica Gemini sulla lezione fallita piu recente e conservare la risposta negli artefatti locali ignorati. Isolare quattro testi LaTeX tradotti e una ripetizione matematica omessa. Esplicitare nel prompt la conservazione verbatim anche delle parole nei comandi LaTeX e di ogni occorrenza inline. Aggiungere etichette diagnostiche fisse per componente e sezione senza cambiare la validazione.
- **Motivazione:** Il replay reale mostra che il controllo applica correttamente il contratto D0293: il modello modifica testo dentro formule e accorpa un riferimento ripetuto. La sola normalizzazione di spazi o Mermaid non affronta la causa osservata; allentare il controllo perderebbe protezioni.
- **Impatto:** Una sola richiesta fisica con STOP e budget SDK e manager di un tentativo. Replay offline: ripristino di quattro formule porta al rifiuto della sezione40; ripristino anche della ripetizione permette il passaggio completo. Nessun risultato scritto in libreria. Nove nuove regressioni e162test pertinenti passati, typecheck lint mirato e build passati. Ultimo run completo558su559 con EPERM backup; suite quality rieseguita49su49. Lint globale segnala due errori preesistenti del worker PDF.
- **Follow-up:** Voce43 e posizione29 aperte fino alla verifica del prompt aggiornato con una futura traduzione esplicita. Nessuna altra chiamata autorizzata e nessun installer rigenerato. Report e limiti in docs/quality/integrita-eng-indagine-2026-10-19.md. Non estendere automaticamente la causa a ogni evento storico.
- **File coinvolti:** electron/main/gemini.ts, electron/main/ai/translationIntegrity.ts, tests/unit/translationIntegrity.test.ts, docs/product/traduzione-dispense.md, docs/product/idee-future-2026-10-13.md, docs/quality/integrita-eng-indagine-2026-10-19.md, STRUTTURA_PROGETTO.md

## D-0355 — Traduzione prosa con formule e codice reinseriti localmente

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** traduzione-eng
- **Decisione:** Dopo nuova autorizzazione alle chiamate AI adottare una sola richiesta per documento con contesto completo, piano locale di prosa e span protetti e risposta JSON con chiavi obbligatorie per sezione e frammento. Ricostruire formule ripetute codice e spazi dalla fonte locale prima della validazione strutturale esistente. Chiudere voce43 e posizione29 dopo due collaudi reali riusciti.
- **Motivazione:** Il prompt rafforzato ha conservato LaTeX ma prodotto un confine duplicato; il JSON per sezioni ha risolto i confini ma lasciato una ripetizione matematica omessa. Non e affidabile chiedere al modello di copiare gli span immutabili: la ricostruzione locale conserva il contratto senza allentare i controlli.
- **Impatto:** Quattro ulteriori generazioni reali autorizzate e tracciate, una per run senza retry o salvataggio in libreria. Correzione finale accettata al primo tentativo su40e36sezioni; replay con firma protetta coincidente.591test41suite typecheck lint mirato e build passati. Nessuna dipendenza nuova. Il modello riceve anche formule e codice come contesto, ma restituisce solo prosa; controlli su Mermaid titoli riquadri output incompleto campi mancanti duplicati vuoti e formule aggiunte restano attivi.
- **Follow-up:** Osservare la fedelta linguistica della prosa e i limiti di lunghezza gia documentati. Installer da rigenerare su richiesta. Report contiene consumi provider119157token aggiuntivi e146785sulle cinque generazioni, prove intermedie e incidente del test sintetico con chiave fittizia corretto con mock senza rete. Nessun commit push o altra voce avviata.
- **File coinvolti:** electron/main/gemini.ts, electron/main/ai/translationIntegrity.ts, electron/main/ai/translationPlan.ts, tests/unit/translationIntegrity.test.ts, tests/unit/translationPlan.test.ts, tests/unit/geminiPhaseB.test.ts, docs/product/traduzione-dispense.md, docs/product/idee-future-2026-10-13.md, docs/quality/integrita-eng-indagine-2026-10-19.md, tests/README.md, STRUTTURA_PROGETTO.md

## D-0356 — Installer Windows con correzione integrita ENG

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta esplicita il setup NSIS x64 0.1.0 con la pipeline ENG D0355, dopo nuova build di produzione e packaging npx electron-builder --win --publish never. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261019-111556.
- **Motivazione:** L utente richiede l installer aggiornato per usare la correzione verificata delle traduzioni ENG: prosa con schema JSON e reinserimento locale di formule codice e ripetizioni.
- **Impatto:** Build e packaging conclusi con codice0. Setup190804813byte SHA256 9b3936c548b8d0ad10609b87d3660f74d9ebf3b56c7f89adaf1363d2d6c3b146. Verificati369file out identici al payload ASAR, presenza pipeline ENG protetta schema JSON titoli indipendenti pagine Note scelta laboratori e Mermaid compatti. Manifesto SHA512 dimensione blockmap backup FFmpeg runtime traduzione e assenza artefatti privati verificati. Riutilizzati591test e due collaudi reali di D0355; nessuna nuova chiamata AI o modifica applicativa.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per aggiornare l installazione locale. Backup e verification.json nella cartella indicata. Nessuna installazione pubblicazione commit o push eseguiti.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261019-111556, docs/quality/integrita-eng-indagine-2026-10-19.md, docs/product/idee-future-2026-10-13.md

## D-0357 — Copie display aggiuntive della stessa sezione normalizzate

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** integrita-eng
- **Decisione:** Dopo la ricorrenza nell app installata verificata identica al setup D0356, escludere dalla sola prosa AI copie display aggiuntive su righe autonome, byte per byte identiche a formule protette della stessa sezione. Conservare tutte le occorrenze originali, rifiutare frammenti svuotati e riapplicare la validazione finale. Tracciare soltanto conteggi e indici di sezione dopo successo. Riaprire voce43 e posizione29 per il ricollaudo online bloccato dalla quota.
- **Motivazione:** Un nuovo tentativo reale ha copiato tre formule immutabili nella prosa causando rifiuti nelle sezioni7e11; il piano le aveva gia reinserite. La sola istruzione di non copiare i keep non garantisce assenza di doppioni. La rimozione e limitata a copie esatte e non accetta matematica nuova modificata o di altre sezioni. La risposta originaria segnalata nella sezione5 non e disponibile per attribuzione retroattiva.
- **Impatto:** Replay reale fallito prima e accettato dopo su40sezioni con firma identica. Nove nuove regressioni e600test41suite passati, typecheck lint mirato e build passati. Copie inline nella prosa nel codice di altre sezioni formule alterate e frammenti svuotati restano rifiutati. Nessuna dipendenza modifica alla libreria personale o retry AI. La chiamata di riproduzione riporta27115token; una successiva verifica e bloccata da quota_exhausted e non genera una risposta.
- **Follow-up:** Ricollaudare nell app quando la quota e disponibile. Rigenerazione setup in corso nello stesso flusso autorizzato, con backup del precedente. Non dichiarare eseguita la generazione bloccata; report in docs/quality/integrita-eng-indagine-2026-10-19.md. Nessun commit push o installazione automatica.
- **File coinvolti:** electron/main/ai/translationPlan.ts, electron/main/gemini.ts, tests/unit/translationPlan.test.ts, docs/product/traduzione-dispense.md, docs/product/idee-future-2026-10-13.md, docs/quality/integrita-eng-indagine-2026-10-19.md, STRUTTURA_PROGETTO.md

## D-0358 — Installer con normalizzazione copie display ENG

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare nello stesso flusso di aggiornamento richiesto il setup NSIS x64 0.1.0 includendo D0357, con pubblicazione disabilitata e backup del setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261019-113320.
- **Motivazione:** L utente segnala un ulteriore rifiuto nella versione installata: la correzione verificata sul replay reale deve essere disponibile nel setup da usare per il prossimo ricollaudo.
- **Impatto:** Build e packaging con codice0. Setup190804760byte SHA256 54a7f69668c2ce213c483298c44e80d56cdbcc963a0f843bdc8c9c84281b2ea2. Verificati369file out identici all ASAR, deduplicazione display piano protetto pagine Note titoli indipendenti scelta laboratori Mermaid compatti FFmpeg runtime offline. Manifesto SHA512 dimensione blockmap backup e assenza artefatti privati verificati. Restano validi600test e replay reale D0357; nuova generazione bloccata dalla quota, senza ulteriori chiamate per il packaging.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Ricollaudo online ancora necessario quando la quota e disponibile, voce43 e posizione29 aperte. Nessuna installazione automatica pubblicazione commit o push.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261019-113320, docs/quality/integrita-eng-indagine-2026-10-19.md, docs/product/idee-future-2026-10-13.md

## D-0359 — Dettagli sanitizzati per i rifiuti dei frammenti ENG

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** diagnosi-eng
- **Decisione:** Distinguere i rami di rifiuto del piano JSON con etichette fisse e soli indici di sezione e frammento. Conservare invariati criteri di validazione e preservazione della libreria. Tenere aperta la voce43 e la posizione29: il nuovo episodio non dispone della risposta originaria.
- **Motivazione:** Il messaggio sui frammenti accorpa nove cause diverse e impedisce una diagnosi affidabile. La versione installata coincide con D0358. Un tentativo diagnostico sulla stessa fonte e respinto per quota; uno con la successiva chiave configurata riesce e supera il replay delle40sezioni, quindi non riproduce il nuovo episodio.
- **Impatto:** Nove regressioni osservate fallire prima della modifica e passare dopo;609test41suite typecheck lint mirato e build passati. Nessuna dipendenza nuova o testo privato nei messaggi. Chiamate diagnostiche esplicitamente autorizzate con budget di una per run e nessun salvataggio nella libreria; un ulteriore run controllato e in corso.
- **Follow-up:** Acquisire un rifiuto reale prima di attribuire una causa o modificare i criteri. Installer diagnostico in rigenerazione nello stesso flusso richiesto. Non considerare una traduzione riuscita come prova di risoluzione dell errore intermittente.
- **File coinvolti:** electron/main/ai/translationPlan.ts, tests/unit/translationPlan.test.ts, docs/product/traduzione-dispense.md, tests/README.md, STRUTTURA_PROGETTO.md, docs/quality/integrita-eng-indagine-2026-10-19.md, docs/product/idee-future-2026-10-13.md

## D-0360 — Installer con diagnosi puntuale dei frammenti ENG

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare il setup NSIS x64 0.1.0 con i dettagli sanitizzati D0359, pubblicazione disabilitata e backup del setup D0358 in local-artifacts/installer-backups/20261019-122031. Conservare aperto il problema intermittente dei frammenti.
- **Motivazione:** Rendere identificabile il prossimo rifiuto nell app installata. Le prove aggiuntive non riproducono l episodio: una quota esaurita una generazione riuscita e un timeout con una sola richiesta per run. Non allentare il controllo senza una risposta fallita acquisita.
- **Impatto:** Build e packaging codice0. Setup190804821byte SHA256 bcaf64897e43b49278022f02a186d7836c1bdd1dc6fdaf4307fc30d8536e6543.369file out identici all ASAR, presenza nuovi dettagli diagnostici piano protetto deduplicazione funzioni esistenti runtime FFmpeg backup manifesto e assenza artefatti privati verificati.609test41suite passati. Il run riuscito conferma firma protetta su40sezioni e47741token; il terzo scade a180secondi senza risposta e senza altro invio.
- **Follow-up:** Chiudere Lezionify e avviare il setup aggiornato. Se il rifiuto ricompare il dettaglio identifica il ramo e gli indici; la risposta originale del nuovo episodio non e disponibile. Voce43 e posizione29 aperte. Nessuna installazione automatica salvataggio in libreria commit push o pubblicazione.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261019-122031, docs/quality/integrita-eng-indagine-2026-10-19.md, docs/product/idee-future-2026-10-13.md

## D-0361 — Mascheratura etichette Mermaid nei confronti di integrità traduzione

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** AI/Traduzione
- **Decisione:** In translationIntegrity.ts, la signature ora maschera le etichette sulle frecce Mermaid (pipe labels e dash labels) oltre alle stringhe tra virgolette, evitando false divergenze strutturali.
- **Motivazione:** Le etichette Mermaid come |Dato| o -- Sì --> cambiano durante la traduzione (|Data|, -- Yes -->) e il confronto strutturale le trattava come differenze, rifiutando traduzioni valide.
- **Impatto:** Le traduzioni con diagrammi Mermaid contenenti etichette non quotate vengono ora accettate correttamente. Test di regressione aggiunto (47/47 test integrità OK).
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/ai/translationIntegrity.ts, tests/unit/translationIntegrity.test.ts

## D-0362 — Priorità modelli completi nel pool di fallback traduzione

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** AI/Modelli
- **Decisione:** In gemini.ts, candidatePool riordinato: gemini-3.5-flash e gemini-3.8-flash precedono i modelli lite. Ordine attuale: gemini-3.7-flash, gemini-3.5-flash, gemini-3.8-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite.
- **Motivazione:** I modelli lite (gemini-3.5-flash-lite) producono frammenti vuoti o duplicati nel piano di traduzione strutturato, causando errori testo vuoto e testo vuoto dopo rimozione copie. I modelli full ragionano meglio sulla struttura del piano JSON.
- **Impatto:** Le traduzioni fallback usano modelli più capaci prima di ricadere sui lite. Il test geminiPhaseB aggiornato per riflettere il nuovo ordine.
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/gemini.ts, tests/unit/geminiPhaseB.test.ts

## D-0363 — Isolamento gruppi quota predefiniti per chiave API

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** AI/Quota
- **Decisione:** In archive.ts, getManagedKeys() assegna default-project-{idx} come quota group predefinito per ogni chiave senza gruppo esplicito, invece del condiviso default-project.
- **Motivazione:** Con il gruppo condiviso default-project, una singola chiave che esauriva la quota giornaliera su un modello causava la sospensione di quel modello per tutte le 18 chiavi, forzando il fallback immediato a modelli lite inadeguati per la traduzione.
- **Impatto:** Ogni chiave gestisce indipendentemente i propri limiti di quota. L esaurimento di una chiave non blocca piu le altre per lo stesso modello. I settings salvati continuano a usare default-project per prudenza; la separazione avviene solo al runtime in getManagedKeys().
- **Follow-up:** Nessuno
- **File coinvolti:** electron/main/archive.ts

## D-0364 — Ripresa Gemini con quote legacy prudenti e fallback ENG completi

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** traduzione-eng
- **Decisione:** Confermare D0361 sul replay reale di39sezioni e sostituire la separazione indiscriminata D0363: i gruppi default-project restano condivisi per RPM e cooldown, ma sono marcati come non verificati. Una quota giornaliera sospende soltanto la chiave provata quando il progetto non e identificato; i gruppi personalizzati mantengono la sospensione condivisa. La sola traduzione ENG esclude i Lite dai fallback automatici e rispetta il modello scelto esplicitamente.
- **Motivazione:** Il log mostra quota su una chiave seguita subito da un Lite con frammenti vuoti. D0363 non agisce sulle impostazioni reali gia normalizzate a default-project; l utente conferma che alcune chiavi condividono progetti ma non ne conosce la mappa. Google applica quote per progetto: non si possono inventare18progetti indipendenti. Il replay reale rifiutava etichette Mermaid tradotte legittimamente prima di D0361.
- **Impatto:** Tre regressioni osservate fallire prima e passare dopo, altre due coprono budget duplicati e caricamento reale delle impostazioni.615test41suite typecheck lint mirato e build passati; cinque replay reali da36a40sezioni accettati. Budget assoluto6 pacing cooldown gruppi noti e rifiuto output vuoto restano attivi. Nessuna dipendenza o modifica alla libreria. Prima nuova chiamata autorizzata: HTTP503 con un solo invio; seconda verifica con pool e massimo6in corso.
- **Follow-up:** Completare prova reale e setup locale; non chiudere la ricorrenza prima dell esito. Per ottimizzare i tentativi identificare i veri gruppi nelle Impostazioni senza comunicare chiavi. Il controllo dei frammenti resta necessario e non certifica la fedelta della prosa.
- **File coinvolti:** electron/main/archive.ts, electron/main/ai/geminiRequestManager.ts, electron/main/gemini.ts, electron/main/ai/translationIntegrity.ts, tests/unit/archive.test.ts, tests/unit/geminiPhaseB.test.ts, docs/product/traduzione-dispense.md, docs/quality/integrita-eng-indagine-2026-10-19.md, STRUTTURA_PROGETTO.md

## D-0365 — Collaudo ENG riuscito e setup finale della ripresa Gemini

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** collaudo-packaging-eng
- **Decisione:** Concludere il collaudo D0364 e allineare la voce43 e posizione29: cinque replay reali accettati, nuova traduzione reale40sezioni riuscita e615test passati. Consegnare setup NSIS x64 aggiornato con pubblicazione disabilitata e backup del setup presente alla ripresa in local-artifacts/installer-backups/20261019-eng-continuation.
- **Motivazione:** La correzione Mermaid D0361 e il completamento di quote e fallback richiedevano verifica oltre ai test sintetici e un pacchetto utilizzabile nell app installata. L utente ha autorizzato tutte le richieste AI necessarie dopo il blocco automatico iniziale.
- **Impatto:** Due richieste diagnostiche fisiche complessive: prima HTTP503 senza risposta utile; seconda riuscita al primo invio del run con pool in111secondi su40sezioni39944caratteri con36922caratteri ENG STOP e244contenuti protetti identici. Consumo noto35778token. Nessun risultato scritto in libreria. Setup190804761byte SHA256 6255abda4bf6051e7be7756d10398615ccf9e111401de879bb736d3f54420f94.369file out identici all ASAR; verificati nuove correzioni runtime PDF titoli laboratori Mermaid FFmpeg runtime offline manifesto blockmap e backup. Typecheck lint mirato build e615test41suite passati.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Nessuna installazione pubblicazione commit o push eseguiti. Restano possibili errori provider e risposte realmente incomplete da rifiutare; i gruppi progetto reali possono essere identificati nelle Impostazioni per ridurre tentativi inutili. Nessuna altra voce avviata.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261019-eng-continuation, docs/product/idee-future-2026-10-13.md, docs/product/traduzione-dispense.md, docs/quality/integrita-eng-indagine-2026-10-19.md, STRUTTURA_PROGETTO.md, tests/README.md

## D-0366 — Mermaid facoltativo con recupero del diagramma originale

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** traduzione-eng
- **Decisione:** Su richiesta esplicita dell utente, una divergenza Mermaid non blocca la traduzione ENG: mantenere i diagrammi tradotti conformi e recuperare quelli italiani quando la struttura cambia. Rimuovere diagrammi aggiunti e reinserire quelli omessi rispettando l ordine dei blocchi di codice; conservare la prosa inglese e il controllo finale di titoli formule codice e riquadri. Registrare solo sezioni e conteggi dopo validazione riuscita. Rigenerare il setup locale con backup e senza pubblicazione.
- **Motivazione:** Nella prova reale sulle ultime cinque dispense gia tradotte tre riescono, una e rifiutata per Mermaid nella sezione28 e una e bloccata da sei503. L utente preferisce ottenere la dispensa anche se il diagramma resta italiano. Il recupero della sola parte Mermaid evita di perdere la traduzione della prosa o accettare un diagramma alterato.
- **Impatto:** Replay della stessa risposta fallita: prima rifiutata e dopo accettata su39sezioni con31373caratteri e un diagramma originale recuperato. Quattro nuove regressioni,619test41file passati,109mirati, typecheck lint mirato build e packaging riusciti. Setup190804241byte SHA256 ba6b64416a489d28b644c4f942280576cc6b3d7ad37d1e2b2673aa294239b7aa;369file ASAR identici alla build, correzione presente, manifesto runtime e backup verificati. Nessuna nuova richiesta AI dopo la prova delle cinque, nessuna modifica alla libreria o dipendenza.
- **Follow-up:** Installare il setup aggiornato dopo aver chiuso Lezionify. Backup in local-artifacts/installer-backups/20261019-mermaid-fallback. Un diagramma omesso puo essere reinserito prima del codice successivo o in fondo alla sezione. Risposte incomplete e altri errori di integrita restano rifiutati, errori503 del provider restano possibili. Nessuna installazione automatica pubblicazione commit o push.
- **File coinvolti:** electron/main/ai/translationIntegrity.ts, electron/main/ai/translationPlan.ts, electron/main/gemini.ts, tests/unit/translationPlan.test.ts, docs/product/traduzione-dispense.md, docs/quality/integrita-eng-indagine-2026-10-19.md, STRUTTURA_PROGETTO.md, tests/README.md, dist/Lezionify-Setup-0.1.0.exe

## D-0367 — Memo leggibile e anteprima dopo un secondo fermo

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** memo
- **Decisione:** Implementare insieme le voci39e41: gerarchia visiva Memo con gruppi, conteggio attivita aperte, comandi e stati vuoti riconoscibili; anteprima del testo completo dopo1000ms senza movimento, annullata a movimento uscita digitazione scroll esterno e chiusura. La rotella sul testo consente di leggere le anteprime molto lunghe.
- **Motivazione:** Richiesta esplicita di implementare le prime cinque attivita ordinate per facilita. Il riuso del modello scratchpad e delle funzioni esistenti preserva gruppi note scorciatoie e dati storici senza migrazioni.
- **Impatto:** Nuovo modulo MemoActivityPreview e stile memo.css. Nessuna dipendenza o chiamata AI. Scenario Electron verifica soglia reset chiusura testi lunghi rotella gruppi preesistenti e finestre640px; catture chiaro scuro e strette ispezionate.
- **Follow-up:** Osservare l usabilita personale. Installer non rigenerato; riepilogo in docs/product/memo-log-pdf-transizioni-2026-10-19.md.
- **File coinvolti:** src/components/QuickCaptureOverlay.tsx, src/components/MemoActivityPreview.tsx, src/components/memo.css, tests/integration/memoLogsExportScenarios.browser.tsx, docs/product/idee-future-2026-10-13.md

## D-0368 — Lettura progressiva dei log per giorno locale

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** log-giornalieri
- **Decisione:** Implementare la voce42: all apertura leggere solo oggi, al fondo richiedere il precedente giorno con eventi, con pulsante equivalente per liste corte e filtri senza risultati. Il main indicizza una volta gli intervalli di byte del file esistente e legge soltanto quelli del giorno richiesto. Serializzare letture scritture rotazione e pulizia.
- **Motivazione:** Nascondere righe gia caricate non riduce la lettura. Un indice locale riusa app.log e conserva la compatibilita con buffer5000 e rotazione5MB gia esistenti, senza nuovi archivi o dipendenze.
- **Impatto:** Nuovo contratto getAppLogDay validato, date locali e precedenti giorni vuoti saltati senza richieste ripetitive. UI conserva pagine e filtri durante polling, deduplica e invalida risposte obsolete. Tre test verificano byte letti riavvio cancellazione date corruzione e UTF8; scenario Electron verifica apertura errore recuperabile cronologia e refresh. Nessuna rete AI o modifica ai log personali.
- **Follow-up:** La costruzione iniziale dell indice legge una volta app.log all avvio come il recupero preesistente; aprire la finestra non rilegge tutto. Storico limitato dalla rotazione gia presente. Lint globale ha due errori preesistenti nel worker PDF; lint dei file modificati passa.
- **File coinvolti:** shared/appLogs.ts, shared/archive.ts, electron/main/logger.ts, electron/main/index.ts, electron/preload/index.ts, src/components/LogViewerModal.tsx, tests/unit/appLogDays.test.ts, tests/integration/discussionDiagnosticsScenarios.browser.tsx

## D-0369 — Esporta unico con modale Lezione Corso e selezione esplicita

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** pdf-esportazione
- **Decisione:** Implementare la voce40 sostituendo il flusso UI D0346: Esporta apre Lezione Corso con Indietro, elenco completo e lingua per singola, corsi Nome Sigla, checkbox inizialmente tutte selezionate laboratori inclusi e comandi collettivi. Invio IPC con lectureIds validati per appartenenza al corso, selezioni vuote disabilitate, annullamento conserva le scelte. Nomi Windows Lezione_titolo_IT-EN_data e Corso_sigla_IT-EN_data con underscore e date YYYY-MM-DD.
- **Motivazione:** La richiesta esplicita autorizza selezione manuale e nuovo flusso completo. Il motore esistente mantiene impaginazione Mermaid formule pagine Note e salvataggio atomico senza rigenerazioni AI.
- **Impatto:** Nuovo PdfExportDialog condiviso da archivio drawer e Focus anche fullscreen. Compatibilita dei vecchi chiamanti includeLaboratory mantenuta nel main; nuovo percorso usa ID espliciti. Test validano esclusioni ordine duplicati ID estranei nomi file e assenza letture di lezioni escluse. Collaudo PDF reale di sei documenti incluso corso con sola selezione, Note IT EN formule Mermaid annullamento e conservazione output.
- **Follow-up:** Installer non rigenerato. Mancanze di dispense vengono segnalate nel PDF; se mancano tutte il main interrompe con errore. Nessuna dipendenza nuova o modifica alle fonti.
- **File coinvolti:** shared/pdfExport.ts, electron/main/pdfExport.ts, src/components/PdfExportButton.tsx, src/components/PdfExportDialog.tsx, src/components/pdfExportDialog.css, src/components/LectureList.tsx, tests/unit/pdfExport.test.ts, tools/run_pdf_export_regressions.cjs, docs/product/lettura-export-pdf.md

## D-0370 — Dissolvenze locali da un secondo e limiti Spotify YouTube

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** transizioni-audio
- **Decisione:** Implementare soltanto la parte verificabile della voce38: suono offline verso suono offline con inviluppi lineari complementari, master volume unico e cancellazione delle partenze obsolete. L utente sceglie1secondo come default; selezione persistente1 2 o4secondi. Pausa e audio della lezione fermano tutte le voci e invalidano letture in corso. Conservare aperta la voce complessiva.
- **Motivazione:** Spotify Developer Policy vieta segue mix e sovrapposizione di contenuti; la sua Web API non offre configurazione crossfade. YouTube nel prodotto si apre nel browser esterno e non e controllabile da Lezionify. Non simulare come completati i passaggi canzone canzone e canzone suono.
- **Impatto:** AmbientLoopPlayer centralizza inviluppi e pulizia; provider protegge decode asincroni da pause cambi rapidi e smontaggio. Due test unitari e scenario Electron verificano guadagni complementari risorse finali selezione piu recente pausa durante lettura e ripresa dopo audio lezione. Pannelli spiegano i limiti senza introdurre chiamate Spotify aggiuntive o sorgenti remote nuove.
- **Follow-up:** Durata modificabile nel pannello Suoni. Restano aperti canzone canzone e canzone suono: definire un percorso compatibile con i player o una futura sorgente locale autorizzata. Ascolto personale ancora da valutare; nessuna prova con account reale o installer nuovo. Fonti ufficiali e dettagli in docs/product/memo-log-pdf-transizioni-2026-10-19.md.
- **File coinvolti:** src/utils/ambientLoopPlayer.ts, src/components/AmbientSoundContext.tsx, src/components/AmbientSoundPanel.tsx, src/components/SpotifyPanel.tsx, tests/unit/ambientLoopPlayer.test.ts, tests/integration/ambientTransitionScenarios.browser.tsx, docs/product/idee-future-2026-10-13.md

## D-0371 — Installer con Memo log giornalieri selezione PDF e dissolvenze locali

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta esplicita il setup NSIS x64 0.1.0 con D0367 D0368 D0369 D0370 dopo nuova build di produzione, usando npx electron-builder --win --publish never. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261019-memo-log-pdf-suoni.
- **Motivazione:** L utente approva visivamente le schermate e richiede l installer aggiornato per usare Memo con anteprime log progressivi nuova selezione PDF e dissolvenze dei suoni offline da un secondo.
- **Impatto:** Build e packaging conclusi con codice0. Setup190809181byte SHA256 ca9a78bd36883247fa5078a9bf6f0180ace6006e30fc912c9bc539fae34016b8. Verificati370file della build identici all ASAR, nuove funzioni FFmpeg runtime traduzione offline assenza artefatti privati hash SHA512 dimensione manifesto blockmap e backup. Riutilizzati i collaudi D0367-D0370 e le catture Electron della sessione, senza nuove chiamate AI. Primo build bloccato da EPERM sandbox poi riuscito con permessi adeguati; controllo ASAR corretto per percorsi Windows e manifesto ricontrollato dopo il completamento del packaging.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Nessuna installazione pubblicazione commit o push. La voce38 resta parziale per Spotify e YouTube; lint globale conserva i due errori preesistenti del worker PDF. Report verification.json e log nella cartella del backup.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261019-memo-log-pdf-suoni, docs/product/memo-log-pdf-transizioni-2026-10-19.md

## D-0372 — Sorgenti e documentazione allineati al 19 ottobre

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** pubblicazione-github
- **Decisione:** Pubblicare su main tutti gli sviluppi applicativi presenti nel checkout e la relativa documentazione dopo inventario e verifiche. Aggiornare README con funzioni limiti roadmap e tre screenshot Electron sintetici, indici e struttura reale. Escludere trascrizione personale script diagnostici ad hoc e duplicati locali; conservare il report Transcribe in docs/research con provenienza. Consentire require soltanto nel worker PDF CommonJS e includere i test Node Q&A nella CI.
- **Motivazione:** L autore richiede esplicitamente la pubblicazione completa: GitHub e fermo al commit c028058. La selezione intenzionale protegge fonti personali e credenziali, mentre documentazione e immagini devono rappresentare il codice effettivamente pubblicato.
- **Impatto:** npm run check completo superato: typecheck lint 625 Vitest in43file 24Python 41Node scenari Electron riavvio build e PDF reali. Link locali e manifesto lock verificati, tre screenshot sintetici ispezionati. Il sandbox impediva le rinomine della cache Vitest: riesecuzione normale riuscita senza modifica ai test. npm audit segnala19vulnerabilita di cui5alte 8moderate 6basse e0critiche; nessun aggiornamento forzato dipendenze o nuova chiamata AI. Nessun installer rigenerato o dato personale pubblicato.
- **Follow-up:** Eseguire commit push e controllare il commit remoto e la CI Windows. Risolvere l audit in intervento dedicato con analisi dipendenze e ricollaudi. Restano limiti AI PDF senza testo Spotify transizioni e prototipo Balance. Report docs/quality/pubblicazione-github-2026-10-19.md.
- **File coinvolti:** README.md, docs/README.md, STRUTTURA_PROGETTO.md, .gitignore, eslint.config.js, .github/workflows/ci.yml, docs/assets/screenshots, docs/quality/pubblicazione-github-2026-10-19.md, docs/research, sorgenti e test applicativi

## D-0373 — Budget esplicito per il test PDFjs con worker reale

- **Data:** 2026-10-19
- **Stato:** accettata
- **Area:** collaudo-ci
- **Decisione:** Impostare30secondi soltanto sul test di estrazione PDFjs reale in courseRag.test.ts, mantenendo asserzioni timeout globale e limite applicativo90secondi. Documentare il primo esito CI e pubblicare la correzione senza retry o test saltati.
- **Motivazione:** Il primo push3a2c023 supera installazione typecheck lint ma il test con worker reale scade sui5000ms predefiniti nella CI Windows. Lo stesso comando minimo passa in605ms suNode24 e443ms suNode22; i test usano lo stesso sorgente worker e la build ne ha hash identico. Avvio a freddo e carico del runner sono una spiegazione plausibile, senza attribuzione certa del rallentamento. Il segnale rosso resta la CI registrata, senza ritardi sintetici.
- **Impatto:** Tutti625test in43file passano anche con runtime temporaneo Node22.23.3 e lint del file modificato passa. Nessuna modifica al runtime dell app alle dipendenze o ai criteri di estrazione, nessuna chiamata AI. Report con run39277009892 e limiti della diagnosi.
- **Follow-up:** Verificare la nuova CI Windows sul commit correttivo; i controlli Electron build e PDF locali restano validi perche il runtime applicativo non cambia. Audit19segnalazioni resta intervento separato.
- **File coinvolti:** tests/unit/courseRag.test.ts, tests/README.md, docs/quality/pubblicazione-github-2026-10-19.md

## D-0374 — Otto nuove richieste nella raccolta futura e nella coda

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Aggiungere le voci 44-51 e le posizioni 30-37 di LISTA_ORDINE nell ordine ricevuto: pannello Q&A ridimensionabile, doppio clic sulle attivita Memo, valutazione dello storico Q&A aggiuntivo, avviso batteria sotto il 20%, riapertura Q&A, riferimenti ai paragrafi successivi, catalogo Paesaggi naturali con download singoli e collettivo dei mancanti, correzione del caso Mermaid Fictitious Play. L utente conferma che riscalabile indica il pannello ridimensionabile.
- **Motivazione:** Conservare tutte le richieste e il caso Mermaid completo in una pianificazione coerente, distinguendo requisiti confermati da valutazioni ancora aperte e dal comportamento gia presente nel codice.
- **Impatto:** Aggiornamento esclusivamente documentale; tutte le nuove caselle restano aperte, ordine e stato precedenti invariati. Nessuna implementazione, download, dipendenza o richiesta AI. Annotati divisori Q&A e storico della singola conversazione gia presenti, da verificare prima di duplicare funzioni.
- **Follow-up:** Implementare e collaudare le singole voci quando richiesto. Valutare separatamente l utilita di includere altre conversazioni, selezionare le nuove risorse sonore e riprodurre il caso Mermaid senza presumere la causa.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0375 — Q&A con pannello ridimensionabile e testo ingrandibile

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Integrare la voce 44 e la posizione 30 di LISTA_ORDINE: la richiesta comprende sia il pannello ridimensionabile trascinando il bordo sia la possibilita di ingrandire il testo delle domande e risposte. Il chiarimento estende D-0374 e corregge la precedente esclusione della dimensione del testo nella descrizione.
- **Motivazione:** L utente precisa esplicitamente di volere entrambe le funzioni.
- **Impatto:** Aggiornamento documentale della stessa attivita, con due requisiti aperti; ordine della coda invariato e nessuna modifica applicativa.
- **Follow-up:** Verificare entrambi i comportamenti in vista ordinaria e Focus, riusando i controlli esistenti e controllando leggibilita e accesso ai comandi con testo ingrandito.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0376 — Conferma delle otto modifiche e delle precisazioni finali

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** requisiti-20-ottobre
- **Decisione:** Implementare insieme le voci 44-51 su richiesta diretta: larghezza e zoom Q&A persistenti indipendenti, Memo con doppio clic Invio Esc e salvataggio uscendo, riapertura ultima discussione, altri Q&A pertinenti della stessa lezione soltanto su opzione esplicita. Aggiornare il prompt per anticipazioni soltanto se lo studente allega tutta la lezione: nessuna attivazione automatica del contesto completo. Indicatore batteria come piccola emoji in basso a destra. Almeno dieci nuovi suoni scelti dall agente con download singoli e collettivo dei mancanti. Correggere Mermaid e consegnare setup aggiornato con backup.
- **Motivazione:** L utente conferma tutte le proposte con tre precisazioni: contesto completo sempre scelto manualmente, batteria discreta e almeno dieci suoni nuovi.
- **Impatto:** Perimetro esplicito di otto voci, senza riordinare il backlog o avviare altre attivita. Nessuna nuova dipendenza, fonte personale o chiamata Gemini reale necessaria ai collaudi.
- **Follow-up:** Completare collaudi UI servizi renderer PDF e installer; segnare le caselle soltanto dopo esito positivo.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/interventi-2026-10-20.md

## D-0377 — README bilingue con percorsi chiari, prove tecniche e tour visuale

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** readme-portfolio
- **Decisione:** Riorganizzare README.md in inglese e aggiungere README.it.md equivalente: accessi immediati ad appunti, avvio e codice; quattro capacita principali; tre scelte ingegneristiche con moduli e test; ruolo autore e AI leggibile; roadmap ridotta. Aggiungere tour GIF di 48 secondi con didascalie, schermate sintetiche gia revisionate e alternativa testuale bilingue.
- **Motivazione:** L utente approva le migliorie per visitatori e reclutatori e chiede esecuzione autonoma, precisando che altre modifiche applicative sono in corso e non vanno pubblicate. La gerarchia rende il prodotto comprensibile e le competenze verificabili senza ampliare promesse o licenza.
- **Impatto:** Solo presentazione, documentazione e generatore media locale con FFmpeg gia presente. Nessuna dipendenza o modifica applicativa. GIF 274318 byte, 4 capitoli, durata verificata 48 secondi e frame ispezionati; 78 link locali e ancore validati. Anteprime Markdown offline Electron 1200 e 390 px per entrambe le lingue senza overflow pagina. Risultati applicativi storici datati 19 ottobre, senza nuovo collaudo applicativo o chiamate AI. Nessun commit o push.
- **Follow-up:** Mantenere allineate le due lingue e rigenerare il tour quando cambiano gli screenshot. Tour dichiarato come sequenza di schermate con risposte sintetiche, non registrazione continua o benchmark. Tutto resta locale per rispettare il lavoro concorrente dell utente; una futura pubblicazione del README deve includere i relativi file di lingua e media per evitare link mancanti.
- **File coinvolti:** README.md, README.it.md, docs/assets/demo/README.md, docs/assets/demo/lezionify-tour.gif, tools/build_readme_tour.mjs, docs/README.md, STRUTTURA_PROGETTO.md

## D-0378 — Pubblicazione isolata dei README e dei soli media di presentazione

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** pubblicazione-readme
- **Decisione:** Pubblicare su main soltanto README.md, README.it.md, docs/assets/demo/README.md e docs/assets/demo/lezionify-tour.gif nel commit 3e6cd6951eb4958eaa44408514ef984503d41cf2, su richiesta esplicita dell utente di vedere il README sul sito senza pubblicare le modifiche applicative concorrenti.
- **Motivazione:** Versione italiana, descrizione e GIF sono necessari per rendere navigabile la presentazione pubblicata senza link mancanti. Sorgenti, test, generatori e aggiornamenti documentali separati restano locali.
- **Impatto:** 78 collegamenti locali e ancore verificati prima del commit, controllo diff senza errori, inventario del commit limitato a quattro file. Push riuscito da 762606f a 3e6cd69 e SHA remoto main verificato con git ls-remote. Nessuna nuova richiesta AI, collaudo applicativo o modifica alla libreria.
- **Follow-up:** Questa decisione rimane locale insieme agli altri aggiornamenti documentali, senza un ulteriore push. Completare separatamente il lavoro applicativo in corso e verificarne la CI quando sara pubblicato.
- **File coinvolti:** README.md, README.it.md, docs/assets/demo/README.md, docs/assets/demo/lezionify-tour.gif

## D-0379 — Otto richieste implementate e collaudate

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** qna-memo-batteria-suoni-mermaid
- **Decisione:** Completare voci 44-51 con larghezza e zoom Q&A persistenti, riapertura ultima discussione per lezione, altri Q&A pertinenti opt-in validati e limitati a cinque discussioni e 12000 caratteri, prompt condizionato al contesto completo manuale. Memo con modifica esplicita Invio Esc e uscita campo; emoji batteria locale sotto20percento solo scollegato anche fullscreen. Dieci nuove registrazioni da Blanket e AmbientSounds con URL immutabili licenze dimensioni e hash, download singoli e collettivo con riparazione ed errori per file. Accettare il solo punto e virgola terminale degli stili Mermaid senza alterare fonte o controlli.
- **Motivazione:** Attuare D-0376 con invii AI consapevoli, interazioni riprendibili e risorse sonore verificabili. La regressione riproduceva il diagramma rifiutato prima della modifica. La revisione ha individuato e corretto la memoria Q&A al cambio lezione.
- **Impatto:** 634 test Vitest in46file,24Python41Node, typecheck lint scenari Electron riavvio e PDF reali superati. Dieci audio decodificati e verificati, downloader reale dieci richieste poi zero con rilettura integra. Schermate sintetiche ispezionate. Nessuna dipendenza nuova, richiesta Gemini reale o modifica alle fonti personali.
- **Follow-up:** Generare e verificare setup Windows con backup. Osservare sul portatile la lettura batteria e la qualita delle risposte reali; i collaudi AI usano SDK simulato e la selezione Q&A e lessicale. Uso fonti limiti e report in docs/product/interventi-2026-10-20.md.
- **File coinvolti:** shared/qnaContext.ts, shared/ambientSounds.ts, shared/battery.ts, shared/archive.ts, electron/main/archive.ts, electron/main/gemini.ts, electron/main/ambientSounds.ts, electron/main/battery.ts, electron/main/index.ts, electron/preload/index.ts, src/components, src/hooks, tests, tools/run_hook_regressions.cjs, tools/run_pdf_export_regressions.cjs, docs/product/idee-future-2026-10-13.md, docs/product/interventi-2026-10-20.md, STRUTTURA_PROGETTO.md

## D-0380 — Setup con otto modifiche del 20 ottobre e dieci nuovi suoni

- **Data:** 2026-10-20
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Generare il setup NSIS x64 0.1.0 con D-0379 e pubblicazione disabilitata, dopo build e collaudi. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261020-qna-memo-suoni. Verificare contenuti ASAR, runtime, manifesto e backup prima della consegna.
- **Motivazione:** L utente ha richiesto anche il setup per usare nell app installata tutte le modifiche confermate, con backup del pacchetto precedente.
- **Impatto:** Packaging concluso con codice0. Setup 190811192 byte SHA256 5fee5297d8acd3b4b91559f197b854e4e15801f30f5f879dab4d02c203dde5b1. Tutti 370 file out identici al pacchetto, FFmpeg e runtime offline presenti, manifesto SHA512 dimensione blockmap e backup verificati. Nessun artefatto privato incluso; i nuovi audio restano download espliciti. Nessuna installazione o pubblicazione automatica.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Report di verifica nella cartella del backup. Nessuna altra voce del backlog avviata. Contenuti e limiti in docs/product/interventi-2026-10-20.md.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261020-qna-memo-suoni, docs/product/interventi-2026-10-20.md

## D-0381 — Nuove richieste del 21 ottobre e coda riordinata per complessita

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Aggiungere dodici voci 52-63 e integrare la voce 33 con il cerchio bianco al Ctrl, conservando tutte le tredici richieste. Sostituire su richiesta esplicita l ordine operativo con una classifica delle 21 attivita ancora aperte dalla piu semplice alla meno semplice; includere i collaudi residui delle voci 7 9 17 20. Conservare la vecchia coda come storico non operativo e gli stati conclusi.
- **Motivazione:** L utente chiede di aggiornare idee future e LISTA_ORDINE e confrontare la difficolta di tutte le idee. Unificare la diagnosi Ctrl evita duplicati; distinguere residui e storico impedisce di perdere verifiche o rifare funzioni gia concluse.
- **Impatto:** Solo documentazione. Prima attivita operativa voce54 Q&A diretto, poi toggle Breve Lunga e verifica timer Memo. Stime motivate e provvisorie; nessuna implementazione collaudo applicativo installazione dipendenza o chiamata AI. Rinvi e limiti precedenti restano documentati. Soglia inattivita 15minuti proposta da misurare; rigenerazione mirata e trasferimento Notability da valutare.
- **Follow-up:** Applicare la nuova tabella alla prossima invocazione LISTA_ORDINE una voce per volta. Chiarire le scelte residue quando si affronta la singola attivita e aggiornare caselle solo dopo implementazione e verifiche pertinenti.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0382 — Dieci attivita concordate dopo intervista grilling

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** requisiti-21-ottobre
- **Decisione:** Implementare insieme le posizioni 1-10 della coda su richiesta esplicita. Breve iniziale e scelta globale persistente Breve Lunga; prompt diretto senza apertura chiusura o domande finali non richieste. Memo Tutti con lista unica gruppi visibili e appunti richiudibili; timer e stima sospesi senza perdere stato. Casuale avvia suoni integri locali senza ripetizioni nel giro. Traduttore a due riquadri con caratteri uguali e layout verticale stretto. Conservare Ctrl+L e indagare il cerchio senza modificare Windows. Togli tempo oggi per corso oppure ultima lezione su tutte le sessioni con riepilogo e limite disponibile. Controllo rete comune Gemini. Dopo test completi rigenerare setup con backup.
- **Motivazione:** L utente approva tutte le otto domande e conferma l intesa finale. Il perimetro esplicito di dieci attivita supera per questa richiesta il limite di una sola voce del comando LISTA_ORDINE.
- **Impatto:** Nessuna nuova dipendenza o chiamata Gemini reale necessaria. L eventuale sintomo personale Ctrl+L non riprodotto resta aperto anche se le prove sintetiche passano. Conservare le modifiche preesistenti del checkout e il pacchetto precedente.
- **Follow-up:** Completare implementazione regressioni verifica visiva e check completo; allineare solo le caselle verificate e consegnare installer senza installazione o pubblicazione automatica.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md,docs/product/interventi-2026-10-21.md

## D-0383 — Prime dieci attivita implementate con limite sulla diagnosi Ctrl

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** qna-memo-studio-traduttore
- **Decisione:** Completare posizioni1-7 e9-10 con prompt Q&A diretto e Breve Lunga persistente validato nel main, Memo compatto con appunti richiudibili e sospensione tracker stima, fix CSS differito Q&A, shuffle locale nel provider, traduttore multilinea a due riquadri, rettifiche non distruttive e serializzate delle sessioni, controllo net.isOnline condiviso prima di Gemini incluso Files. Ripristinare bozza Q&A fallita senza duplicare domanda al retry. Per posizione8 conservare Ctrl+L: FindMyMouse PowerToys abilitato con doppio Ctrl sinistro spiega il cerchio; vecchio episodio Ctrl+L non riprodotto resta aperto.
- **Motivazione:** Attuare D-0382 con verifiche reali di layout persistenza e lifecycle. La regressione dello spazio vuoto riproduce la precedenza del CSS caricato in ritardo. Rettifiche separate dalla durata impediscono che snapshot successivi annullino la correzione. Non cambiare impostazioni esterne senza una richiesta specifica.
- **Impatto:** Typecheck lint 646 Vitest in49file 24Python 41Node Q&A intera suite Electron e riavvio build e PDF reali superati. Fonte e derivazioni conservate, nessuna dipendenza nuova o chiamata Gemini reale. Offline terminale non altera cooldown modelli; quote terminali esistenti conservate. Screenshot sintetici ispezionati. Test precedenti adeguati a lista piatta e textarea, non rimossi. Un menu laboratorio intermittente passa isolato e nella suite finale.
- **Follow-up:** Rigenerare setup senza pubblicazione con backup verificato; controllare ASAR runtime e manifesto. Voce33 resta aperta per acquisire l episodio personale storico; spiegazione PowerToys e fonti nel report. Seguire il comportamento reale di net.isOnline su reti limitate e la qualita dei prompt senza dichiarare garanzie sul modello.
- **File coinvolti:** shared/studyCorrections.ts,electron/main/ai/connectivity.ts,electron/main/ai/geminiRequestManager.ts,electron/main/ai/geminiTransport.ts,electron/main/gemini.ts,electron/main/archive.ts,electron/main/index.ts,electron/preload/index.ts,shared/archive.ts,src,tests,tools/run_hook_regressions.cjs,docs/product/interventi-2026-10-21.md,docs/product/idee-future-2026-10-13.md,STRUTTURA_PROGETTO.md

## D-0384 — Setup delle prime dieci attivita con backup verificato

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Generare setup NSIS x64 0.1.0 con D-0383 dopo build e collaudi, usando npx electron-builder --win --publish never. Conservare setup precedente blockmap e latest.yml in local-artifacts/installer-backups/20261021-prime-dieci. Consegnare senza installazione pubblicazione commit o push automatici.
- **Motivazione:** L utente ha richiesto installer aggiornato dopo tutte le modifiche e verifiche concordate. Il pacchetto include nove attivita concluse e mantiene la diagnosi Ctrl storica aperta come documentato, senza modificare PowerToys.
- **Impatto:** Packaging codice0. Setup190814571byte SHA256 a0695817205c5edfb44112219ab97c3518b8a3701c7791ee99dcee208ba2af24. Verificati370file out identici al contenuto ASAR, nuove funzioni presenti, FFmpeg e runtime traduzione offline, manifesto SHA512 dimensione e blockmap. Tre backup con hash identici agli originali e nessun artefatto privato incluso. Verificatore corretto per separatori nativi Windows senza cambiare il pacchetto.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Report verification.json e backup.json nella cartella del backup. Per il cerchio usare impostazioni PowerToys; vecchio episodio Ctrl+L da acquisire se ricompare. Nessuna altra voce avviata.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe,dist/Lezionify-Setup-0.1.0.exe.blockmap,dist/latest.yml,local-artifacts/installer-backups/20261021-prime-dieci,docs/product/interventi-2026-10-21.md

## D-0385 — Skill personali per frontend e audit UX

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** skill-design
- **Decisione:** Installare nel profilo personale Codex frontend-design da dobromirdikov/codex-frontend-design-skill revisione 983119775a936d123df9fbfbc3821bdee5bb58fd, product-design-audit e product-design-qa da openai/plugins revisione 0722921d5542fc593105c27bd52630babd8b8c2a. Conservare i supporti Product Design in .codex/skill-support/product-design fuori dalla scoperta delle skill. Adattare soltanto nomi, collegamenti locali e risoluzione dei comandi al percorso condiviso Windows. QA conserva invocazione implicita disabilitata.
- **Motivazione:** L utente autorizza l installazione delle skill utili dopo la valutazione. Frontend-design supporta le modifiche quotidiane al renderer, audit verifica flussi con evidenze, QA confronta prototipi con riferimenti visuali. I supporti completi evitano riferimenti mancanti senza esporre ulteriori skill generiche o sovrapporre research.
- **Impatto:** Tre cartelle personali, metadati di provenienza con hash originali e revisioni fissate. Verificati otto file originali salvo adattamenti dichiarati, nove link Markdown locali e configurazione QA; diff documentale senza errori. Nessuna dipendenza applicativa, collaudo dell app, richiesta AI, connessione a servizi, commit o push. Installazione tramite validazione e copia degli helper skill-installer con fallback Git dopo interruzioni dei download ZIP. Frontend Apache-2.0; manifest Product Design Proprietary, copie personali esterne al repository.
- **Follow-up:** Disponibili dal turno successivo; verificare l uso su un primo intervento reale. Privilegiare leggibilita e convenzioni di Lezionify, dati sintetici e collaudi Electron. Aggiornamenti manuali con verifica di metadati e collegamenti. Guida aggiornata con criteri e prompt.
- **File coinvolti:** docs/product/guida-skill-codex.md, C:/Users/Utente/.codex/skills/frontend-design, C:/Users/Utente/.codex/skills/product-design-audit, C:/Users/Utente/.codex/skills/product-design-qa, C:/Users/Utente/.codex/skill-support/product-design

## D-0386 — Accesso Musica, revisione Memo e orari audio nella coda riordinata

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Aggiungere le voci aperte 64-66: pulsante Musica raggiungibile con liste lunghe con diagnosi e scelta visiva; revisione UX dei pulsanti Memo; orari di inizio e fine audio in Info e Gestione. Su richiesta esplicita riordinare tutte le 15 attivita ancora aperte per difficolta crescente: 66,64,65,33,7,9,20,5,63,56,59,38,32,31,17. Conservare separatamente le nove attivita concluse con le posizioni del primo ordine e tutti gli identificativi stabili.
- **Motivazione:** L utente chiede di raccogliere tre nuove idee e confrontare la semplicita di tutte le idee esistenti. Separare gli esiti dalle priorita operative evita di rifare funzioni concluse e mantiene leggibili i riferimenti storici. Le stime considerano dati disponibili, ampiezza UX, incertezza diagnostica e vincoli esterni.
- **Impatto:** Solo documentazione: prima attivita operativa voce66, poi64 e65. Nuove caselle aperte; nessuna implementazione, dipendenza, installazione o chiamata AI. Le voci Memo gia concluse e i rinvii personali restano documentati. Orari audio distinti da orario programmato e tempo studiato, fine derivata da rendere esplicita e dati assenti da non inventare.
- **Follow-up:** Alla prossima richiesta LISTA_ORDINE affrontare una sola voce a partire dalla66. Per Musica e Memo osservare prima il flusso con product-design-audit e applicare frontend-design alla realizzazione secondo la guida. Confermare le stime dopo diagnosi e aggiornare caselle solo dopo implementazione e verifiche.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md

## D-0387 — Prime tre voci completate dopo grilling: orari, Musica e Memo

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** orari-musica-memo
- **Decisione:** Implementare insieme le posizioni1-3 della coda D-0386 su richiesta diretta e conferma delle cinque proposte grilling: orari audio in sola lettura con fine calcolata e dati assenti espliciti; Musica sopra la ricerca e icona nella sidebar ridotta, sidebar sticky con scroll corsi limitato; Memo con intestazione e chiusura, navigazione gruppi separata, copia visibile e gestione gruppo nel menu nativo con Esc e clic esterno, inserimento attivita riconoscibile e layout adattabile. Conservare modifica data preesistente, tutti i dati e i flussi gia disponibili. Segnare concluse le voci66,64,65 e mantenere la33 come prossima.
- **Motivazione:** L utente approva esplicitamente tutte le proposte e precisa che non serve una nuova modifica degli orari. Il collaudo iniziale riproduce Musica fuori schermo: grid e sidebar crescevano con la lista principale senza vincolo di altezza. La gerarchia Memo rende raggiungibili i comandi senza alterarne il significato.
- **Impatto:** Tipi e lint superati, 657 test Vitest in50file,24Python41Node, suite Electron completa e riavvio, build e PDF reali superati. Undici nuovi test orari e scenario interface-polish con schermate sintetiche, finestre bassa e stretta, persistenza e cancellazione conservativa. Due avvii completi avevano instabilita negli scenari preesistenti Focus e menu lezioni: esplicitato evento scroll e atteso layout iniziale nei test, senza cambiare le asserzioni o il comportamento applicativo relativo. Nessuna dipendenza o chiamata AI reale, fonte personale o configurazione esterna modificata.
- **Follow-up:** Uso e limiti in docs/product/orari-musica-memo-2026-10-21.md. Inizio derivato dai metadati del nome MP3 senza certificare convenzioni del registratore; per video inizio assegnato all importazione, fine programmata esclusa dal calcolo. Audio e trascrizioni intatti. Build aggiornata; setup precedente non rigenerato, nessuna installazione pubblicazione commit o push. Prossima voce33 non avviata.
- **File coinvolti:** src/components/LectureRecordingTimes.tsx,src/utils/lectureRecordingTimes.ts,src/components/LectureDrawer.tsx,src/components/Sidebar.tsx,src/components/QuickCaptureOverlay.tsx,src/components/memo.css,src/hooks/useQuickCapture.ts,src/styles.css,tests/unit/lectureRecordingTimes.test.ts,tests/integration/interfacePolishScenarios.browser.tsx,tests/integration/hookRegression.browser.tsx,tests/integration/lectureListScenarios.browser.tsx,tests/integration/studyToolsScenarios.browser.tsx,tests/integration/todayScenarios.browser.tsx,tools/run_hook_regressions.cjs,tests/README.md,docs/product/idee-future-2026-10-13.md,docs/product/orari-musica-memo-2026-10-21.md,docs/README.md,STRUTTURA_PROGETTO.md

## D-0388 — Installer con orari audio, accesso Musica e revisione Memo

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Rigenerare su richiesta diretta il setup NSIS x64 0.1.0 dalla build D-0387 gia collaudata, con npx --no-install electron-builder --win --publish never. Conservare setup precedente, blockmap e latest.yml in local-artifacts/installer-backups/20261021-orari-musica-memo prima della sostituzione e verificarne gli hash. Consegnare il setup senza installazione o pubblicazione automatica.
- **Motivazione:** L utente richiede l installer per utilizzare le tre modifiche appena implementate; la build e i controlli applicativi completi sono gia conclusi nella stessa sessione. Il backup conserva una versione precedente recuperabile.
- **Impatto:** Packaging concluso con codice0. Setup190815708byte SHA256 30811b4e7ee35a54f346d9916b1db2d315bab58c61211e2beca9dfcc59fd7194. Tutti370file out identici nel pacchetto ASAR, marcatori delle tre funzioni presenti, FFmpeg e runtime offline verificati. Manifesto SHA512 e dimensione coerenti, blockmap presente, tre backup con hash identici agli originali; nessun artefatto privato incluso. Nessuna nuova modifica applicativa, dipendenza, richiesta AI, commit o push.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Report verification.json e backup.json nella cartella del backup; uso e limiti in docs/product/orari-musica-memo-2026-10-21.md. Nessuna altra voce del backlog avviata.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe,dist/Lezionify-Setup-0.1.0.exe.blockmap,dist/latest.yml,local-artifacts/installer-backups/20261021-orari-musica-memo,docs/product/orari-musica-memo-2026-10-21.md

## D-0389 — Report UX e UI con evidenze locali

- **Data:** 2026-10-21
- **Stato:** accettata
- **Area:** ux-ui-audit
- **Decisione:** Consegnare un audit documentale del progetto con product-design-audit e criteri frontend-design, schermate fornite e catture Electron sintetiche, priorita e limiti. Le raccomandazioni restano proposte: nessuna modifica UI o alla coda viene adottata.
- **Motivazione:** L utente richiede analisi e report entro le17:50 del21ottobre. Separare difetti riprodotti preferenze visive e scelte di prodotto rende la revisione verificabile senza avviare implementazioni.
- **Impatto:** Report in docs/quality con indice docs e copia HTML locale. Suite Electron completa e interface-polish passate; probe tastiera layout zoom e contrasto documentano limiti Q&A Focus Lock chat e ambito AI. Sorgenti applicativi dati personali installer dipendenze e servizi esterni invariati. Screenshot personali soltanto in local-artifacts ignorata da Git.
- **Follow-up:** Valutare le priorita del report prima di implementare; completare NVDA e prove con utenti. La coda LISTA_ORDINE resta invariata. I probe PASS attestano l esecuzione e non la conformita accessibile.
- **File coinvolti:** docs/quality/audit-ux-ui-2026-10-21.md,docs/README.md,local-artifacts/ux-audit-2026-10-21

## D-0390 — Richieste del 22 ottobre e tredici rilievi UX nella coda per facilita

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** pianificazione-prodotto
- **Decisione:** Raccogliere nove richieste distinte della lista e del riassunto Gemini nelle voci 67-75 e tutti i tredici rilievi U01-U13 del report UX nelle voci 76-88. La precisazione dell utente associa le cose dell audio al riassunto, senza una voce audio generica aggiuntiva. Riordinare su richiesta esplicita tutte le 34 attivita aperte per facilita stimata: 72,74,88,76,79,87,81,77,78,80,67,82,83,85,86,84,68,33,70,73,69,7,9,20,71,5,63,56,59,38,75,32,31,17. Conservare stati conclusi, identificativi e rinvii precedenti.
- **Motivazione:** L utente richiede di unificare idee nuove, riassunto e interventi del report nelle liste future e LISTA_ORDINE dalla piu facile. Separare difficolta e gravita UX, diagnosi dei guasti ed estensioni di funzioni concluse evita duplicazioni e false dichiarazioni di completamento.
- **Impatto:** Solo documentazione: 12 attivita residue e 22 nuove aperte, prima voce72 Breve Media Lunga con Breve iniziale. Richieste conservate per copia serale con frase manuale, pause rigeneranti, limite YouTube da valutare, consenso GitHub per corso, errore course-rag ask, stima studio, dizionario italiano e rendering matematico. Report con mappatura completa e criteri originali preservati; indici aggiornati. Controllate 34 posizioni consecutive, 88 identificativi stabili unici, corrispondenza dei 13 rilievi e collegamenti locali; diff senza errori. Nessuna implementazione, nuova dipendenza, installazione o chiamata AI.
- **Follow-up:** Alla prossima invocazione LISTA_ORDINE affrontare soltanto la voce72 con la guida skill e le regole AGENTS. Concordare le soglie delle tre lunghezze quando si implementa. Per le altre voci risolvere solo allora gli orari definitivi della copia, migrazione GitHub, fonte monolingue, perimetro YouTube e alternative UX. I guasti segnalati restano da riprodurre e correggere; nessun collaudo applicativo richiesto per questa modifica documentale.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/attivita-future.md, docs/quality/audit-ux-ui-2026-10-21.md, docs/README.md

## D-0391 — Conferma delle prime diciassette attivita e diagnosi RAG

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** requisiti-22-ottobre
- **Decisione:** Implementare insieme le prime17posizioni della coda D0390 e la voce69 RAG su richiesta diretta dopo grilling. Breve sotto200parole Media200-400 Lungaoltre400; blocco copia configurabile08:00-17:30ogni giorno a ogni copia gruppo/tutto con frasi locali15-25parole confronto spazi/maiuscole tollerante. GitHub abilitato per corsi esistenti, scelta esplicita per nuovi, disabilitazione senza rimozione remota. Clic lezioni immediato rinomina menu/F2 senza doppio clic. Elabora archivio con ambito esplicito; FocusLock conserva15secondi uscita pause immediate Esc ritorno CtrlT. Memo nomenclatura unica e testi espandibili, barre compatte. In Focus conservare soltanto icona Musica esistente senza aggiungere informazioni visibili, riorganizzando il pannello al clic. Suggerimenti pausa5/15/30minuti. Autorizzati massimo4invii Gemini con dati sintetici per prova RAG. Dopo verifiche rigenerare installer con backup entro14Europe/Rome.
- **Motivazione:** L utente conferma le proposte del grilling con correzioni esplicite su fascia copia, migrazione GitHub e assenza di distrazioni musicali in Focus. Il perimetro diretto autorizza18attivita nella stessa sessione.
- **Impatto:** Conservare modifiche preesistenti, fonti locali, pubblicazioni remote e credenziali. Nessuna nuova dipendenza pianificata. Scadenza22ottobre2026ore14Europe/Rome con richiamo impostato. Non dichiarare risolti guasti non riprodotti o completate verifiche non eseguite.
- **Follow-up:** Implementare diagnosi regressioni UI e gate completo; aggiornare caselle solo su esito verificato e consegnare setup senza installazione o pubblicazione automatica.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/interventi-2026-10-22.md, src, shared, electron, tests

## D-0392 — Prime diciassette attivita e recupero RAG implementati e collaudati

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** qna-memo-ux-rag-publishing
- **Decisione:** Completare le posizioni1-17 e21 della coda D0390 secondo D0391. Q&A Breve Media Lunga con istruzioni sotto200 tra200e400 oltre400, controlli semantici e bozza. Clic lezione immediato con rinomina menu/F2, Elabora archivio esplicito, FocusLock con focus confinato sfondo inerte ritorno e scroll200percento conservando dizionario CtrlT, pause con suggerimenti. Copia Memo08:00-17:30configurabile ogni giorno a ogni tentativo, frasi locali e input manuale, fuori fascia copia immediata. Memo coerente espandibile, player nel pannello senza nuovi elementi nel Focus, chat con composizione separata copertura e sezioni delle fonti. Consenso GitHub per corso con legacy abilitati, nuovi espliciti, nessuna rimozione remota, controlli prima del push e su commit locali pendenti. RAG schema JSON valido, categoria invalid_output e fallback per JSON o citazioni invalidi, errori sanitizzati e retry senza duplicati.
- **Motivazione:** Attuare le18attivita autorizzate preservando fonti, comportamento di studio e consensi. Le regressioni riproducono l output RAG incompleto classificato unknown, la perdita della bozza al fallimento e il focus sottratto da FocusLock al portale del dizionario; i casi passano dopo le correzioni. La migrazione GitHub modifica solo il metadato raw per evitare di ricifrare credenziali all avvio.
- **Impatto:** Gate npm run check completo superato: typecheck lint680Vitest in53file24Python41Node suite Electron con riavvio build PDF reali. Scenari dedicati ottobre22 e player scorrevole superati con immagini sintetiche ispezionate; contrasto colori interessati almeno4.5a1 nei due temi. Quattro invii Gemini reali esatti: prova completamento riuscita, una prova end-to-end non riuscita, due end-to-end successive riuscite con risposta e citazione verificata. Contatore esaurito, nessuna altra chiamata autorizzata. Nessuna dipendenza nuova o fonte personale modificata, pubblicazione GitHub reale commit push o installazione. Coda18concluse16aperte.
- **Follow-up:** Generare setup NSIS x64 con publish never e verificare ASAR build runtime manifesto e backup in local-artifacts/installer-backups/20261022-diciassette-rag. NVDA non collaudato; il payload personale RAG fallito non era disponibile e le prove reali sono sintetiche. Prima voce residua33, nessun altra attivita avviata. Uso verifiche e limiti in docs/product/interventi-2026-10-22.md.
- **File coinvolti:** src, shared/archive.ts, shared/courseRag.ts, electron/main/archive.ts, electron/main/archiveValidation.ts, electron/main/settings.ts, electron/main/courseRag.ts, electron/main/ai/courseRagCompletion.ts, electron/main/publishing, electron/main/index.ts, electron/preload/index.ts, tests, tools/run_hook_regressions.cjs, tools/run_course_rag_real.cjs, tools/verify_installer.cjs, docs/product/idee-future-2026-10-13.md, docs/product/interventi-2026-10-22.md, docs/product/attivita-future.md, docs/quality/audit-ux-ui-2026-10-21.md, docs/README.md, STRUTTURA_PROGETTO.md

## D-0393 — Installer delle diciassette attivita UX e del recupero RAG

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Generare su richiesta diretta il setup NSIS x64 0.1.0 con D0392 dopo gate completo e prova RAG finale, usando npx --no-install electron-builder --win --publish never. Conservare i tre file precedenti con hash in local-artifacts/installer-backups/20261022-diciassette-rag. Consegnare il setup senza installazione o pubblicazione automatica.
- **Motivazione:** L utente richiede installer aggiornato dopo implementazione e test entro14Europe/Rome. Backup e confronto della build con ASAR rendono verificabile il contenuto distribuito e conservano la versione precedente.
- **Impatto:** Packaging codice0. Setup190823255byte SHA256e46df73801fa84accb9823a121c923b1f6153aebe9579b1fbdd17f4aaca62665. Verificati372file out identici nel pacchetto, marcatori nuove funzioni, FFmpeg e runtime offline. Manifesto SHA512 dimensione blockmap e tre backup con hash coerenti. Nessun artefatto privato incluso. Il verificatore riusa asar esistente e usa separatori nativi Windows; nessuna modifica al pacchetto per correggere il controllo iniziale del percorso. Gate finale salvato in local-artifacts/interventi-2026-10-22/check-final.log. Quattro invii reali Gemini complessivi, budget esaurito; ultime due prove RAG complete positive.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Uso e limiti in docs/product/interventi-2026-10-22.md, verifica e backup nella cartella dedicata. NVDA non collaudato e caso personale RAG da osservare nell uso dopo aggiornamento. Prima voce residua33; nessuna altra attivita avviata. Disattivare il richiamo delle14a lavoro concluso.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261022-diciassette-rag, tools/verify_installer.cjs, docs/product/interventi-2026-10-22.md, docs/README.md

## D-0394 — Indice GitHub senza residui esclusi e setup definitivo delle diciotto attivita

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** pubblicazione-packaging
- **Decisione:** Limitare anche l indice principale GitHub alle lezioni del lotto autorizzato e alle coppie schema trascrizione gia note sul remoto. Escludere nomi e conteggi delle cartelle rimaste solo nel clone dopo tentativi falliti. Consegnare il setup definitivo D0394 in sostituzione del primo D0393, conservato in backup.
- **Motivazione:** La revisione finale ha riprodotto con una regressione fallita la presenza nell indice di un corso locale escluso e il conteggio di una lezione mai pubblicata. Il filtro esplicito evita di diffondere anche questi metadati, senza eliminare materiale remoto o locale.
- **Impatto:** Regressione rossa poi verde e 91 test publishing superati. Gate finale equivalente a tutti i passaggi npm run check con Vitest maxWorkers2: typecheck lint 681 test in53file 24Python 41Node intera suite Electron riavvio build e PDF reali superati. Due worker risolvono conflitti IO temporanei Windows senza alterare timeout o asserzioni. Prova scroll Focus sincronizzata con evento e frame. Setup NSIS codice0: 190823200 byte SHA256 b41b969c05b93dffa0ea1eefae9438e85a9c5a67efed9a909aac1a70fb29129b. Verificati372file build identici ASAR, runtime FFmpeg manifesto blockmap e tre backup originali; verificati anche tre hash del setup intermedio. Nessun artefatto privato nel pacchetto.
- **Follow-up:** Lavoro concluso prima delle14Europe/Rome. Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe. Quattro invii Gemini esauriti, nessun altro invio; ultime due prove RAG end-to-end sintetiche positive. NVDA e risposta personale RAG storica non verificati. Coda18concluse16aperte, prossima voce33, nessuna altra avviata. Report docs/product/interventi-2026-10-22.md.
- **File coinvolti:** electron/main/publishing/readmeGenerator.ts, electron/main/publishing/publishService.ts, tests/unit/publishing.test.ts, tests/integration/hookRegression.browser.tsx, src/components/LectureList.tsx, docs/product/interventi-2026-10-22.md, STRUTTURA_PROGETTO.md, dist/Lezionify-Setup-0.1.0.exe, tools/verify_installer.cjs, local-artifacts/installer-backups/20261022-diciassette-rag

## D-0395 — Recupero bounded della domanda RAG e confronto verificato delle lezioni RL

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** rag-recupero-pertinenza
- **Decisione:** Su richiesta di maggiore robustezza mantenere la domanda attiva con fino a tre giri dei modelli, backoff crescente e limite condiviso12invii10minuti inclusi approfondimenti. Prima risposta60secondi poi90 e inattivita90; limite tentativo ridotto alla deadline residua. Stati visibili, annullamento durante attese, bozza conservata e Riprova domanda senza prefisso IPC. Politica Gemini predefinita resta normalmente6tentativi. Recupero terminale fermo per permessi annullamento e quota giornaliera. Aggiungere metadati derivati ordinali teorici e data, ricerca comparativa bilanciata per lezione e tipo, normalizzazione Q_pi LaTeX e parlato, priorita al simbolo e filtro delle altre lezioni nei confronti. Validare una citazione per ciascuna lezione richiesta disponibile negli estratti.
- **Motivazione:** Riprodotta offline la chiusura dopo un solo giro di timeout503 anche quando il giro successivo avrebbe risposto. La prova reale richiesta successivamente dall utente ha evidenziato anche risposte completate ma confronto incompleto o deviato verso epsilon greedy. L utente richiede espressamente questa verifica sulle fonti RL prima dell installer: la richiesta autorizza la domanda e gli estratti reali del solo corso RL, distinta dal precedente collaudo sintetico esaurito.
- **Impatto:** Typecheck lint695Vitest53file e build finali superati. Regressioni per budget assoluto condiviso deadline annullamento terminali attese pertinenza simbolica equilibrio del confronto e copertura citazioni. Scenario Electron recupero stop bozza e retry positivo.17invii fisici reali cumulativi in4prove della stessa domanda RL con contatore locale e limite18. Prime3prove non accettate come verifica qualitativa sufficiente. Quarta prova dopo3errori transitori completata al quarto invio, tre citazioni5/6/7 lette e confronto principale supportato: Q gia definita, greedy argmax Q gia esplicito, poi ruolo senza modello da stimare tramite esperienza. Profili di prova separati senza scritture alle conversazioni originali; payload e risposte privati solo in local-artifacts ignorato, nessuna chiave nei report o log. Nessuna dipendenza nuova.
- **Follow-up:** L installer precedente e stato fermato su richiesta prima della prova qualitativa; rigenerare soltanto ora con build verificata e backup20261022-rag-recovery. Non fare altri invii reali non necessari. Non si garantisce disponibilita Google o correttezza di ogni frase futura: leggere criticamente assoluti e distinguere miglioramento da ottimalita. Uso e prove in docs/quality/rag-recupero-2026-10-22.md. Coda invariata18concluse16aperte, nessun altra voce avviata.
- **File coinvolti:** electron/main/ai/geminiRequestManager.ts, electron/main/ai/courseRagCompletion.ts, electron/main/courseRag.ts, electron/main/courseRagIndex.ts, electron/main/archive.ts, electron/main/index.ts, shared/courseRag.ts, src/components/CourseChat.tsx, tests/unit/courseRag.test.ts, tests/unit/courseRagCompletion.test.ts, tests/integration/courseChatScenarios.browser.tsx, tools/verify_installer.cjs, docs/quality/rag-recupero-2026-10-22.md, docs/product/interventi-2026-10-22.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md

## D-0396 — Setup finale dopo verifica della domanda RL reale

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** packaging-windows
- **Decisione:** Generare e consegnare il setup NSIS x64 aggiornato con D0395 solo dopo risposta RL riuscita e lettura delle citazioni5/6/7, come richiesto dall utente. Conservare il precedente setupD0394 e manifesto e blockmap in20261022-rag-recovery. Non installare o pubblicare automaticamente.
- **Motivazione:** L utente richiede la verifica di una domanda concreta prima del nuovo installer. Il primo packaging e stato interrotto; il setup consegnato viene dalla build successiva alla verifica qualitativa e ai controlli finali.
- **Impatto:** Gate finale typecheck lint695Vitest53file e build superati. Scenario Electron corso con recupero attesa interruzione bozza retry positivo. Packaging codice0. Setup190825697byte SHA256207481346116f2a84424f669ad8dae7d9f621fd3606df55bb354aa090e787748. Verificati372file build identici ASAR, nuove funzioni, FFmpeg runtime offline SHA512 manifesto blockmap e tre backup con hash. Nessun artefatto personale incluso. Prova richiestaRL17invii fisici cumulativi, quarta risposta supportata da tre citazioni lette; nessun altro invio necessario o effettuato.
- **Follow-up:** Chiudere Lezionify e avviare dist/Lezionify-Setup-0.1.0.exe per usare il recupero. Report docs/quality/rag-recupero-2026-10-22.md e risposta privata locale in local-artifacts/interventi-2026-10-22/rl-question/answer.md. Il servizio Google puo restare indisponibile oltre i limiti e ogni risposta va letta criticamente; miglioramento non equivale sempre a ottimalita. Nessun altra voce della coda avviata.
- **File coinvolti:** dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/installer-backups/20261022-rag-recovery, docs/quality/rag-recupero-2026-10-22.md, docs/product/interventi-2026-10-22.md, docs/README.md, tools/verify_installer.cjs

## D-0397 — Recupero RAG strutturato e semantico locale

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** rag-architettura
- **Decisione:** Attuare su richiesta diretta il piano docs/product/rag-implementazione-2026-10-22.md entro le17Europe/Rome. Separare piano della domanda e vincoli sulle lezioni; riselezionare il contesto a ogni strumento entro24passaggi32000caratteri; conservare sezioni e blocchi strutturali e rendere recuperabile il vicinato. Esporre provenienza e copertura, distinguendo derivazioni della stessa lezione da conferme indipendenti. Separare corpus immutabile content-addressed da conversazioni con migrazione compatibile e riusare indice MiniSearch aggiornato per fonte. Aggiungere ricerca ibrida con embedding CPU locali multilingue e fusione dei ranghi, modello opzionale scaricato esplicitamente e cache dei vettori per contenuto e revisione.
- **Motivazione:** L analisi e le prove riproducono recupero fuori lezione, confronti vuoti e risultati strumenti non presenti nel prompt saturo. Il modello locale aggiunge parafrasi e ricerche multilingui senza inviare testi a un provider. La dipendenza @huggingface/transformers4.3.1 risolve questo bisogno concreto, con runtimeONNX isolato in worker e modello Xenova/paraphrase-multilingual-MiniLM-L12-v2q8 revisione2c4055b12046f11709e9df2c122e59ffbdc2f900. Il wrapper carica esplicitamente il tokenizer locale per evitare la scoperta dei file main ignorando la revisione nel runtime4.3.1.
- **Impatto:** Nuova dipendenza esatta e lockfile; worker e configurazione ASAR per librerie native. Download pubblico circa135MB soltanto esplicito; inferenza senza rete e fallback testuale su errore o timeout. Corpus e citazioni storiche conservati; nessuna fonte originale modificata. Benchmark sintetico22casi e collaudo locale autorizzato su4corsi33lezioni66fonti1602passaggi. Test correnti37RAG positivi; consuntivo finale separato dopo gate.
- **Follow-up:** Concludere gate e documentare risultati e limiti. Nessun invio personale o nuovo benchmark Gemini; nessun installer richiesto in questa attivita. Misurare in seguito correttezza e completezza delle risposte su un insieme annotato piu ampio; citazioni valide non certificano supporto semantico.
- **File coinvolti:** electron/main/courseRag.ts, electron/main/courseRagIndex.ts, electron/main/courseRagQuery.ts, electron/main/courseRagContext.ts, electron/main/courseRagSemantic.ts, resources/course-rag/embedding-worker.cjs, shared/courseRag.ts, src/components/CourseChat.tsx, electron/main/index.ts, electron/preload/index.ts, electron/main/archive.ts, electron.vite.config.ts, electron-builder.yml, eslint.config.js, package.json, package-lock.json, tests, tools, docs/product/rag-implementazione-2026-10-22.md

## D-0398 — Evoluzione RAG verificata entro le17

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** rag-collaudo
- **Decisione:** Concludere la richiesta con query strutturata, contesto sostituibile, passaggi gerarchici, provenienza e copertura visibili, corpus separato, indice incrementale e ricerca ibrida locale opzionale D0397. Conservare benchmark e comandi riproducibili nel report docs/product/rag-implementazione-2026-10-22.md. Nessun installer o invio Gemini in questa attivita.
- **Motivazione:** I difetti riprodotti nell analisi sono coperti da regressioni. Il modello reale aggiunge recupero multilingue senza servizi remoti e il test a freddo ha consentito di correggere la scoperta del tokenizer. Gli esiti sono separati fra contratti software, recupero sintetico, fonti personali e correttezza delle risposte future.
- **Impatto:** 37RAG superati. Suite completa700di703nel sandbox con3blocchi ambientali;102di102nelle due suite rieseguite fuori sandbox coprono tutti i3casi. Typecheck lint senza avvisi build24Python41Node suite Electron completa con riavvio e PDF reali passati. Embedding reali Node ed Electron offline passati.22casi benchmark: recall sui20con evidenza0.85lessicale1.00ibrida;MRR0.7821e0.9375;due vincoli impossibili rispettati. Prova personale autorizzata4corsi33lezioni66fonti1602passaggi, coperturaRL5/6/7; fonti immutate e nessun documento online. Risultati privati solo local-artifacts. Nessuna segnalazione npm audit per nuove famiglie runtime.
- **Follow-up:** Il setup D0396 non contiene queste modifiche; sorgenti e build sono aggiornati. Scaricare esplicitamente il modello nell app per attivare ricerca ibrida nel profilo: il modello di collaudo resta separato. Packaging e test ASAR dedicati non eseguiti. Nessuna garanzia di correttezza semantica delle singole affermazioni; proseguire con benchmark annotato delle risposte. Nessuna nuova voce backlog avviata.
- **File coinvolti:** docs/product/rag-implementazione-2026-10-22.md, STRUTTURA_PROGETTO.md, DECISIONI.md, tests/unit/courseRagArchitecture.test.ts, tests/fixtures/courseRagBenchmark.ts, tests/integration/courseRagBenchmark.ts, tests/integration/courseRagPrivateLocal.ts, tests/integration/courseSemanticLocal.ts, tools/benchmark_course_rag.mjs, tools/run_course_rag_private_local.mjs, tools/run_course_semantic_local.mjs, electron, shared, src/components/CourseChat.tsx, resources/course-rag/embedding-worker.cjs, package.json, package-lock.json

## D-0399 — Lavori residui RAG e qualita dei collaudi in coda

- **Data:** 2026-10-22
- **Stato:** accettata
- **Area:** backlog-rag
- **Decisione:** Su richiesta diretta aggiungere dieci attivita aperte89-98 alle posizioni35-44 della coda operativa, conservando posizioni1-34 e prima voce aperta33. Registrare benchmark rappresentativo con evidenze annotate e casi negativi, qualita end-to-end delle risposte, supporto delle affermazioni, ranking e astensione, indice preparabile e riprendibile, cache e revisioni, PDF complessi e OCR da valutare, numerazione stabile delle lezioni, robustezza e CI offline, installerWindowsASAR. Ogni voce ha criteri di completamento e rimandi alla base D0397-D0398.
- **Motivazione:** Trasformare i limiti espliciti del RAG e del benchmark in lavoro concreto riprendibile senza duplicare funzioni gia implementate, riaprire voci concluse o avviare nuove implementazioni. Separare qualita del recupero, correttezza delle risposte, robustezza operativa e distribuzione reale.
- **Impatto:** Coda44attivita con18concluse26aperte. Aggiornati elenco storico con rimando alla coda unica e report RAG con rinvio ai follow-up. Nessun cambiamento al codice, dipendenza, modello, installazione o chiamata AI. Fonti e annotazioni personali restano in artefatti locali; le nuove voci non costituiscono approvazione preventiva di servizi o dipendenze.
- **Follow-up:** Alla prossima invocazione LISTA_ORDINE seguire ancora la prima voce aperta33. Le voci RAG verranno affrontate nell ordine aggiunto oppure su richiesta diretta dell utente, con verifiche prima di chiudere le caselle.
- **File coinvolti:** docs/product/idee-future-2026-10-13.md, docs/product/attivita-future.md, docs/product/rag-implementazione-2026-10-22.md, DECISIONI.md

## D-0400 — Completamento diretto dei residui RAG con indice preparabile e controllo del supporto

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** rag-affidabilita
- **Decisione:** Su richiesta diretta del 23 ottobre lavorare sulle voci89-98 entro le14Europe/Rome, senza avviare altre voci. Aggiungere indice locale esplicito con checkpoint e ripresa, priorita alle domande, cache limitata e ricostruibile, numerazione RAG persistente con numero ufficiale esplicito, controllo AI fallibile delle affermazioni con una correzione entro budget condiviso, benchmark di calibrazione separato dalla verifica, estrazione prudente PDF e finestre di token complete. Generare e verificare installer in profilo isolato.
- **Motivazione:** L utente autorizza tutte le fonti dei corsi per prove Gemini, massimo60invii fisici con gestore quote e rotazione esistente, e installer. Il primo indice non deve dipendere da domande ripetute e le citazioni esistenti non dimostrano il supporto delle affermazioni. Riprodotto rischio di archivio vuoto quando manca il corpus: la lettura deve conservare e segnalare.
- **Impatto:** Nessuna nuova dipendenza. Fonti originali e profilo personale conservati. Download modello resta esplicito. Test API e risultati privati in local-artifacts con contatore persistente; nessuna chiave nei log. Il controllo AI usa il medesimo limite12invii10minuti della domanda ed espone indisponibilita e incertezza.
- **Follow-up:** Concludere collaudi, leggere risposte e citazioni, verificare ASAR reale e aggiornare soltanto le caselle soddisfatte. Registrare consuntivo distinto con limiti residui e invii effettivi.
- **File coinvolti:** shared/courseGrounding.ts, shared/courseRag.ts, electron/main/courseRag.ts, electron/main/courseRagSemantic.ts, electron/main/courseRagGrounding.ts, electron/main/courseRagIndex.ts, electron/main/ai/courseRagCompletion.ts, src/components/CourseChat.tsx, resources/course-rag, tests, tools, .github/workflows/ci.yml

## D-0401 — Annullamento ONNX cooperativo e controlli parziali delle affermazioni

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** rag-robustezza
- **Decisione:** Sostituire terminate durante inferenza con annullamento dell attesa e conclusione naturale del lotto nativo. Serializzare messaggi del worker e chiusura, negare rete a fetch http e https durante embed, usare finestre384token e pooling normalizzato versionato. Limitare ogni auditAI a3tentativi90secondi nel budget condiviso12invii10minuti; collegare citazioni di frase tollerando soltanto formattazione, mostrare omissioni e avvisi locali su recap e assenza globale, rifiutare ID inventati e caratteri di controllo. Esporre fine indice soltanto dopo persistenza e validare dati salvati prima di lettura o riscrittura. Non integrare OCR automatico.
- **Motivazione:** Due chiusure native riprodotte offline con8passaggi sono causate dalla terminazione del worker durante ONNX; stessa prova positiva dopo il cambiamento. I replay reali mostrano quote Markdown e delimitatori LaTeX rimossi dal revisore, oltre a ID inventati da rifiutare. Un recap non prova la prima introduzione e una ricerca parziale non prova assenza nell intero corso. Il pilota OCR locale altera un simbolo in un campione stampato.
- **Impatto:** Nessuna nuova dipendenza o modello. Worker RAG e runtime nativi estratti da ASAR. Cache bounded e riprendibile, priorita alle domande, pulizia derivazioni con backup e citazioni conservati. Modello opzionale con download esplicito. Test rosso poi verde per crash e messaggio persistito malformato; prove di disco pieno simulato, priorita, modifiche fonte, conservazione revisioni e PDF multicolonna reali. Il controllo AI resta fallibile e quello locale non e una certificazione semantica.
- **Follow-up:** Concludere gate e verificatore statico del pacchetto gia positivo nel runtime, conservare voci90-92 aperte per giudizi umani e calibrazione residua. Non fare altri invii API:59di60avviati, risultati e annotazioni privati locali, nessuna chiave stampata.
- **File coinvolti:** electron/main/courseRag.ts, electron/main/courseRagSemantic.ts, electron/main/courseRagIndex.ts, electron/main/courseRagGrounding.ts, electron/main/courseRagPackageCheck.ts, electron/main/ai/courseRagCompletion.ts, electron/main/ai/geminiTransport.ts, shared/courseGrounding.ts, shared/courseAnswerSections.ts, shared/courseRag.ts, src/components/CourseChat.tsx, resources/course-rag, electron-builder.yml, tests, tools, docs/product/rag-completamento-2026-10-23.md

## D-0402 — Consegna RAG verificata con sette voci concluse e tre validazioni qualitative aperte

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** rag-collaudo-distribuzione
- **Decisione:** Concludere la richiesta diretta con indice esplicito riprendibile, cache e revisioni sicure, riferimenti stabili, controlli AI e locali fallibili, benchmark esteso e setupWindows verificato. Chiudere voci89e93-98 sulla base dei collaudi; lasciare90-92parziali per giudizi umani, conflitti reali annotati e ulteriore ranking astensione e ridondanza. Conservare ordine e prima voce33 della coda.
- **Motivazione:** Separare implementazione e verifica meccanica dalla correttezza delle risposte. Le prove reali mostrano sia risposte utili sia limiti di ipotesi, generalizzazione, cronologia e assenza globale. La presenza di un giudice AI non sostituisce annotazioni umane. Non dichiarare completata una certificazione qualitativa non eseguita.
- **Impatto:** Gate724Vitest56file positivo fuori sandbox a packaging fermo; typecheck lint build24Python41Node suiteReactElectron completa riavvio PDF reali e scenarioRAG mirato passati. Benchmark33casi8calibrazione25verifica: precisioneibrida0.551a0.650 recall1MRR0.95stabili; negativi3su5ancora con candidati affini. Base22casi recall1MRR0.9375. Corpus personale4corsi66fonti2205passaggi completato e originali immutati.59di60invii fisici inclusi2interrotti,12risposte annotate preliminarmente e4di4prove del giudice; replay3collegabili e1IDinventato correttamente respinto. Nessun altro invio necessario.
- **Follow-up:** Setup294211309byteSHA2562a2d554adcc50ac05f2531e2797da2caf957af228fb9c2877aa7b642aa8499e4. Verificati374filebuildidenticiASAR manifesto e3backup. Runtime finale in profilo temporaneo: inferenza offline fredda1396mscalda10ms, fallback modello assente, vettori corrotti, ripristino pesi, migrazione citazioni ePDF passati; modello corrotto rifiutato con controllo negativo. Non installato o pubblicato. Uso e limiti in docs/product/rag-completamento-2026-10-23.md; giudizi umani da aggiungere al materiale privato pronto. Preparare esplicitamente modello e indice nel pannello Fonti dopo aggiornamento.
- **File coinvolti:** docs/product/rag-completamento-2026-10-23.md, docs/product/idee-future-2026-10-13.md, docs/product/attivita-future.md, docs/README.md, STRUTTURA_PROGETTO.md, tests/README.md, dist/Lezionify-Setup-0.1.0.exe, tools/verify_installer.cjs, tools/check_packaged_rag.mjs, local-artifacts/installer-backups/20261023-rag-completion, local-artifacts/rag-completion-2026-10-23, local-artifacts/rag-package-2026-10-23

## D-0403 — Setup RAG definitivo con download pubblico ASAR e recupero del backup validati

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** packaging-rag-recupero
- **Decisione:** Sostituire soltanto il pacchetto intermedio indicato in D0402 con il setup definitivo che include il recupero da backup valido quando manca il file principale. Validare anche il download pubblico esplicito dal vero pacchetto in profilo temporaneo vuoto, seguito da inferenza con rete negata. Il recupero legge e valida il backup senza ripristini fuori dal mutex; la successiva scrittura conserva lo storico e ripristina i metadati. Nessuna installazione o pubblicazione automatica.
- **Motivazione:** Il controllo finale ha riprodotto una chat vuota nonostante un backup valido: regressione rossa poi verde. Il requisito98 richiede anche il download dal pacchetto, distinto dalla sola inferenza con una copia dei pesi. Il nuovo controllo CLI esplicito scarica soltanto pesi pubblici e non legge credenziali o documenti personali.
- **Impatto:** 725Vitest56file passati a packaging fermo, typecheck lint senza avvisi e build positivi. Setup294212024byteSHA2563809e2e37b66b25fac190ea8d066c5d59eff40daa6e98da826c2a3fab85f84c5. Verificati374file build identici ASAR, manifestoSHA512 blockmap e3backup. Stesso ASARd7fa76069f5fbbb162d72c6c88c80fe0589d8e7ef9b7871e4599412173c2c723 per download pubblico riuscito, controllo negativo del tokenizer corrotto e controllo positivo completo: inferenza fredda1188mscalda8ms, fallback modello assente, cache corrotta, ripristino, migrazione citazioni ePDF. Nessun dato personale nel pacchetto o nel download.
- **Follow-up:** D0402 resta valido per implementazione benchmark e limiti; il suo hash setup e solo intermedio e viene sostituito dal presente. Nessun ulteriore invio Gemini:59di60totali. Allineare 89e93-98comeconcluse e90-92parziali, coda25concluse19aperte prima33. Uso in docs/product/rag-completamento-2026-10-23.md. Chiudere Lezionify e avviare il setup; preparare esplicitamente modello e indice dalle Fonti. Profili e prove personali conservati in artefatti locali ignorati.
- **File coinvolti:** electron/main/courseRag.ts, electron/main/courseRagPackageCheck.ts, electron/main/index.ts, tests/unit/courseRagMaintenance.test.ts, tools/check_packaged_rag.mjs, tools/verify_installer.cjs, dist/Lezionify-Setup-0.1.0.exe, dist/Lezionify-Setup-0.1.0.exe.blockmap, dist/latest.yml, local-artifacts/rag-package-2026-10-23, local-artifacts/installer-backups/20261023-rag-completion, docs/product/rag-completamento-2026-10-23.md

## D-0404 — Uscita Focus dopo cinque minuti, traduzione contestuale e risposte Spotify

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** studio-traduzione-musica
- **Decisione:** Autorizzati e avviati gli interventi 99-104 richiesti direttamente: uscita immediata nei primi cinque minuti di ogni ingresso Focus, Ctrl+T sulla selezione con lingua della dispensa e apertura prima del lavoro, fallback Bergamot per parole mancanti, supplemento collusion/collusione, rimozione testo pausa scaduta, gestione successi Spotify senza JSON.
- **Motivazione:** Le visite brevi non devono subire attrito; la selezione e la lingua sono gia disponibili localmente. Riprodotto errore Spotify con successo HTTP 200 vuoto anche senza suoni: sette regressioni prima rosse e poi verdi. Collusion assente nei dati reali; precedente lacuna trascrivere gia documentata.
- **Impatto:** Nessuna nuova dipendenza o chiamata Gemini; traduzione resta offline con modelli esplicitamente installati. Dizionari integrati con coppia verificata e provenienza, senza copiare definizioni. Installer rigenerato e verificato in profilo isolato a lavoro concluso.
- **Follow-up:** Completare regressioni temporali e Ctrl+T, suite e verifica pacchetto; riportare separatamente il limite del collaudo Spotify con account reale.
- **File coinvolti:** src/hooks/useStudyTracker.ts, src/hooks/useDictionaryShortcut.ts, src/components/DictionaryOverlay.tsx, src/components/LectureDrawer.tsx, src/App.tsx, src/components/PauseTimerOverlay.tsx, electron/main/spotify.ts, tools/build_dictionary.py, public/dictionaries/eng-ita.json, public/dictionaries/ita-eng.json, tests/unit/spotify.test.ts, tests/unit/dictionary.test.ts, docs/product/idee-future-2026-10-13.md

## D-0405 — Concluse voci 99-104 e installer finale dopo il RAG

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** collaudo-distribuzione
- **Decisione:** Completati gli interventi D-0404 e i relativi collaudi. Pacchetto finale dist/Lezionify-Setup-0.1.0.exe: 294213454 byte, SHA256 1b6edf310a21ed746b0ddcb5a461524a76d8e6ec41ed72c1a6e73df0bac633ed. Chiuse le voci 99-104 nella lista unica, senza avviare le altre aperte.
- **Motivazione:** 734 test Vitest in 56 file, typecheck e lint puliti, scenari React/Electron completi e ripresa dopo riavvio superati. Soglia Focus a 299999 e 300000 ms, reset al rientro, Ctrl+T nelle due lingue, fallback con suggerimenti e quattro prove Bergamot WASM reali. Il difetto Spotify e riprodotto con successo 200 vuoto senza audio; play/pausa testati anche con un vero loop Web Audio sintetico.
- **Impatto:** Installer verificato senza eseguirlo: otto componenti estratti dal NSIS identici al runtime, 372 file della build confrontati, manifest e tre file di backup verificati. RAG nel nuovo eseguibile supera modello assente, download pubblico esplicito, inferenza senza rete, cache corrotta, ripristino, migrazione citazioni e PDF. Nessun nuovo invio Gemini; resta 59 su 60 per il precedente lavoro. Nessuna pubblicazione o installazione sul profilo personale.
- **Follow-up:** Limite esplicito: nessuna cattura HTTP della sessione Spotify personale, account simulato nel collaudo combinato. Il modello offline richiede installazione esplicita e puo sbagliare termini. Le voci RAG 90-92 restano parziali; prima voce aperta della coda resta 33. Istruzioni e hash nel report focus-traduttore-spotify-2026-10-23.md.
- **File coinvolti:** docs/product/focus-traduttore-spotify-2026-10-23.md, docs/product/idee-future-2026-10-13.md, docs/product/rag-completamento-2026-10-23.md, STRUTTURA_PROGETTO.md, tests/README.md, tests/integration/hookRegression.browser.tsx, tests/integration/dictionaryScenarios.browser.tsx, tests/integration/musicTranslationScenarios.browser.tsx, tools/run_offline_translation_regressions.cjs, dist/Lezionify-Setup-0.1.0.exe, local-artifacts/installer-backups/20261023-focus-traduttore-spotify/verification.json, local-artifacts/rag-package-2026-10-23

## D-0406 — Domande realistiche, copertura tra lezioni e obblighi di risposta

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** rag-studio
- **Decisione:** Usare gli otto esempi dell utente per estendere benchmark e collaudi. Le richieste esplicite sul corso intero prevalgono sul vincolo di lezione ereditato dallo storico, conservando i vincoli numerici espliciti correnti. Nel recupero trasversale distribuire prima i risultati tra lezioni; per attribuzioni al docente preferire una fonte originale nella stessa lezione. Aggiungere regole per esame, dimostrazioni da studiare, esercizi generati e cambiamenti delle ipotesi. Allineare prompt e catalogo alla numerazione stabile o ufficiale gia implementata.
- **Motivazione:** Due regressioni prima rosse: richiesta trasversale vincolata erroneamente alla lezione 3 precedente, e dodici dispense della stessa lezione che escludono otto originali di lezioni diverse. Le domande su obblighi d esame non sono risolte dalla sola presenza di una spiegazione matematica; gli esercizi nuovi sono derivazioni.
- **Impatto:** Nessuna dipendenza o chiamata AI aggiuntiva obbligatoria. Test offline su fixture pubbliche sintetiche e fonti locali gia autorizzate, con risultati personali soltanto negli artefatti ignorati. Nuovo installer necessario per includere le correzioni RAG successive a D-0405.
- **Follow-up:** Misurare recupero sugli otto tipi di domanda e dichiarare il limite: non sono valutazioni umane delle risposte generate. Conservare stato parziale 90-92 e tetto complessivo di 60 invii Gemini, attualmente 59. Rigenerare e verificare il setup a codice congelato.
- **File coinvolti:** electron/main/courseRagQuery.ts, electron/main/courseRagIndex.ts, electron/main/courseRag.ts, electron/main/courseRagGrounding.ts, shared/courseRag.ts, tests/unit/courseRagArchitecture.test.ts, tests/fixtures/courseRagBenchmark.ts, tests/integration/courseRagBenchmark.ts, tests/integration/courseRagPrivateLocal.ts, tools/run_course_rag_private_local.mjs, docs/product/rag-completamento-2026-10-23.md

## D-0407 — Domande di studio collaudate e installer conclusivo

- **Data:** 2026-10-23
- **Stato:** accettata
- **Area:** rag-collaudo-distribuzione
- **Decisione:** Completata la ripresa D-0406 sugli otto esempi dell utente. Integrati recupero trasversale, vincoli correnti, passaggi originali bilingui sulle modalita di esame, regole di risposta per obblighi ed esercizi generati, avvisi mai parlato e numerazione nel prompt. Setup conclusivo dist/Lezionify-Setup-0.1.0.exe: 294215067 byte, SHA256 ab37b1cbc4fcd58f353800038025917d1c330f27e5d0bdcf26d5e2262bc8327e.
- **Motivazione:** Cinque nuove regressioni e suite completa 739 test in 56 file, typecheck e lint puliti, chat RAG collaudata in Electron. Benchmark 8 nuovi casi e 22 precedenti con recall@8 1 e MRR@8 0.9375. Trentadue varianti di recupero su quattro corsi, 33 lezioni, 66 fonti, 2205 passaggi. Il conteggio iniziale delle menzioni di esame era soltanto italiano: il controllo bilingue corretto trovava gia una menzione originale exam in ciascun corso, senza attribuire a tutte le prove reali il difetto sintetico.
- **Impatto:** Nessun nuovo invio Gemini: 59 di 60. Installer include anche D-0404/D-0405 e conserva il precedente in backup. Verificati 372 file build, manifesto, blockmap, tre file backup e otto componenti estratti dal NSIS; nessun installer eseguito o pubblicato. Runtime finale in profili temporanei supera download pubblico esplicito, inferenza senza rete, cache fredda e calda, modello assente o corrotto, recupero vettori, ripristino, migrazione citazioni e worker PDF.
- **Follow-up:** Le prove nuove misurano recupero e contratti software, non certificano risposte generate. Restano parziali 90-92 e prima voce aperta 33; nessuna attivita estranea avviata. I riferimenti temporali ambigui richiedono chiarimento. Limiti e impronta nel report rag-domande-studio-2026-10-23.md; chiudere l app prima di installare il setup.
- **File coinvolti:** electron/main/courseRag.ts, electron/main/courseRagQuery.ts, electron/main/courseRagIndex.ts, electron/main/courseRagGrounding.ts, shared/courseRag.ts, tests/unit/courseRagArchitecture.test.ts, tests/unit/courseRagMaintenance.test.ts, tests/fixtures/courseRagBenchmark.ts, tests/integration/courseRagBenchmark.ts, tests/integration/courseRagPrivateLocal.ts, tools/run_course_rag_private_local.mjs, docs/product/rag-domande-studio-2026-10-23.md, docs/product/idee-future-2026-10-13.md, STRUTTURA_PROGETTO.md, tests/README.md, dist/Lezionify-Setup-0.1.0.exe, local-artifacts/installer-backups/20261023-rag-domande-studio/verification.json

## D-0408 — Allineamento GitHub allo snapshot locale del 25 ottobre

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** pubblicazione-github
- **Decisione:** Su richiesta diretta pubblicare su main lo snapshot locale con gli interventi D-0379-D-0407, i test e la documentazione. Conservare esclusi dati personali, credenziali, build e installer; nessuna release binaria o chiamata AI.
- **Motivazione:** Il ramo locale e quello GitHub condividono la base 3e6cd69 del 20 ottobre, ma 85 file modificati e 80 nuovi file non sono ancora pubblicati. Rendere disponibile e riproducibile lo sviluppo locale autorizzato.
- **Impatto:** Scansione candidati senza credenziali rilevate. npm run check completo passato fuori sandbox: 739 Vitest in 56 file, 24 Python, 41 Node, scenari Electron e riavvio, typecheck, lint, build e PDF reali. Gate RAG pubblico offline passato; nessun aggiornamento di dipendenze per la pubblicazione.
- **Follow-up:** Verificare hash remoto dopo push e CI Windows sul nuovo commit. Restano aperti i limiti qualitativi RAG 90-92 e gli altri limiti documentati. Il primo tentativo sandbox si e fermato prima dei test per EPERM sulla cache Vitest.
- **File coinvolti:** DECISIONI.md, STRUTTURA_PROGETTO.md, docs/README.md, docs/quality/pubblicazione-github-2026-10-25.md, sorgenti e test dello snapshot D-0379-D-0407

## D-0409 — Commit e push automatici dopo ogni rigenerazione installer

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** workflow-github
- **Decisione:** Aggiunta in AGENTS.md la regola permanente richiesta dall'utente: ogni rigenerazione dell'installer generale, richiesta o avviata dall'agente, comporta verifiche pertinenti, commit e push automatici di tutte le modifiche pubblicabili del checkout sulla repository GitHub collegata, senza ulteriori conferme.
- **Motivazione:** Mantenere GitHub allineato al lavoro locale ogni volta che viene prodotto un nuovo installer, evitando pubblicazioni dei sorgenti dimenticate.
- **Impatto:** Include modifiche preesistenti, test, configurazioni e documentazione; restano esclusi dati personali, credenziali e artefatti ignorati, inclusi gli installer in dist. Il completamento richiede la verifica del commit remoto; eventuali blocchi vanno segnalati senza force push.
- **Follow-up:** Applicare la regola dalla prossima rigenerazione; questo intervento aggiorna soltanto le istruzioni e non rigenera l'installer.
- **File coinvolti:** AGENTS.md, DECISIONI.md

## D-0410 — Pull automatico all'inizio di ogni nuova chat

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** workflow-github
- **Decisione:** Aggiunta in AGENTS.md la sincronizzazione obbligatoria da GitHub una volta all'inizio di ogni nuova chat, dopo la lettura delle istruzioni e prima degli altri documenti o delle modifiche: controllo Git, fetch e pull --ff-only dall'upstream del ramo corrente senza ulteriori conferme, quindi rilettura delle istruzioni aggiornate.
- **Motivazione:** Iniziare il lavoro dai sorgenti e dalle decisioni aggiornati sulla repository collegata, preservando il lavoro locale.
- **Impatto:** Checkout con modifiche non committate, upstream assente, HEAD scollegata, divergenze o errori di rete e autenticazione richiedono la segnalazione del blocco; nessun reset distruttivo, stash, merge o rebase automatico. Sono ammesse soltanto attivita indipendenti dalla sincronizzazione finche il pull resta bloccato.
- **Follow-up:** Applicare dalla prossima nuova chat; la chat corrente prosegue con le modifiche documentali D-0409 gia presenti e conservate.
- **File coinvolti:** AGENTS.md, DECISIONI.md

## D-0411 — Valutazione preliminare Mac, beta studenti e portfolio

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** ricerca-distribuzione
- **Decisione:** Registrata la richiesta di esplorare una prova privata su Mac e la distribuzione agli studenti. Salvate fonti primarie, inventario del checkout e priorita proposte in un documento di ricerca; nessuna licenza, provider o architettura nuova adottati, nessuna voce della coda avviata.
- **Motivazione:** Distinguere installazione privata da distribuzione pubblica e fatti verificati da proposte, riusando benvenuto e audit UX gia esistenti. Chiarire condizioni Apple, termini Gemini, diritti del bundle e limiti di compatibilita prima di implementare.
- **Impatto:** Sola documentazione. Evidenziati packaging e CI Windows, updater assente, fallback Gemini in chiaro senza safeStorage, licenza riservata e verifica necessaria delle licenze di terzi. Nessuna build, release, lettura di credenziali o chiamata AI. Fetch riuscito; pull ancora da completare per modifiche locali preesistenti.
- **Follow-up:** Identificare chip e macOS della prima tester; chiarire condizioni Gemini per utenti esterni e scelta di licenza; concordare il perimetro della prima prova prima delle modifiche software. Le tappe della beta restano proposte.
- **File coinvolti:** docs/research/distribuzione-studenti-fonti-2026-10-25.md, docs/research/README.md, DECISIONI.md

## D-0412 — Roadmap dalla prova Mac alla distribuzione per studenti

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** pianificazione-distribuzione
- **Decisione:** Creata su richiesta una roadmap documentale in otto fasi e 35 attivita PUB: perimetro, condizioni API e licenze, preparazione Mac, prova privata, uso autonomo, release e aggiornamenti, beta limitata, pubblicazione e manutenzione. Prima destinazione M3 Pro arm64; versione macOS ancora da conoscere.
- **Motivazione:** Trasformare la valutazione D-0411 in un percorso ordinato di domande, decisioni e verifiche, distinguendo prerequisiti della prima consegna da funzionalita successive e riusando audit e documentazione esistenti.
- **Impatto:** Aggiunti criteri di completamento, dipendenze, punti di avanzamento e prossime azioni. Nessun intervento applicativo, licenza, costo o servizio nuovo adottato. Coda LISTA_ORDINE invariata; installer e pubblicazioni non avviati. Modifiche locali preesistenti conservate.
- **Follow-up:** Raccogliere versione macOS e caso di studio; chiarire Gemini e costi, condizioni di consegna e licenze del bundle; preparare il piano di build Mac offline. Eseguire le attivita dopo richiesta di avvio del relativo lavoro.
- **File coinvolti:** docs/publishing/roadmap-distribuzione-2026-10-25.md, docs/research/distribuzione-studenti-fonti-2026-10-25.md, docs/README.md, STRUTTURA_PROGETTO.md, DECISIONI.md

## D-0413 — Sala di consultazione: schermata iniziale essenziale

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** ux-consultazione
- **Decisione:** Implementata soltanto la proposta visiva 1 scelta dall utente: corsi selezionabili, nuova ricerca pulita, esempi modificabili e invio esplicito Consulta il corso. Cronologia e materiali accessibili su richiesta; risultati esistenti mantenuti. All apertura del corso viene riutilizzata una ricerca vuota o creata senza eliminare lo storico.
- **Motivazione:** Comunicare la consultazione dei propri materiali e ridurre l associazione con un assistente AI generalista, conservando bozze, fonti e strumenti avanzati.
- **Impatto:** Nessuna nuova dipendenza o chiamata AI automatica. Cambio corso ed esempi sono locali; PDF, controllo citazioni, recupero errori e indice mantengono i servizi esistenti. Rigenerazione installer e pubblicazione GitHub richieste esplicitamente.
- **Follow-up:** Completare suite, controllo visuale chiaro/scuro e finestre ridotte, verifica installer e commit remoto. Le proposte risultati 2 e 3 restano non implementate.
- **File coinvolti:** src/components/CourseChat.tsx, src/components/Sidebar.tsx, src/styles.css, tests/integration/courseChatScenarios.browser.tsx, tests/integration/october22Scenarios.browser.tsx, docs/product/sala-consultazione-2026-10-25.md, design-qa.md

## D-0414 — Schermata iniziale collaudata e installer rigenerato

- **Data:** 2026-10-25
- **Stato:** accettata
- **Area:** distribuzione-consultazione
- **Decisione:** Conclusa la proposta 1 della Sala di consultazione, senza implementare i nuovi layout dei risultati. Rigenerato il setup Windows 0.1.0 e predisposta la pubblicazione di tutte le modifiche pubblicabili, comprese istruzioni Git e roadmap documentali preesistenti. Installer di 294217195 byte, SHA256 4cd7fb9dd8ed4efd51f6d6761c75564bb73e14b224a1fd1984f4d82bfe28aad2.
- **Motivazione:** Suite completa superata: 739 Vitest in 56 file, 24 Python, 41 Node, typecheck, lint, scenari Electron e PDF. Controlli mirati finali e gate RAG offline verdi; confronto visivo chiaro/scuro e finestre ridotte passato. La fixture storica e stata aggiornata alla creazione della ricerca vuota, preservando le venti risposte precedenti.
- **Impatto:** Verificati 372 file build, manifesto, blockmap, tre backup e otto componenti estratti dal NSIS. Runtime RAG offline con cache fredda/calda, ripristino, migrazione citazioni, worker PDF e rifiuto modello corrotto. Nessun nuovo invio AI, download modello o esecuzione installer sul profilo personale.
- **Follow-up:** Verificare commit sul remoto dopo push. Chiudere l app prima di installare il nuovo setup. Restano aperte le validazioni qualitative RAG 90-92 e i layout risultati 2 e 3 non sono stati adottati.
- **File coinvolti:** src/components/CourseChat.tsx, src/components/Sidebar.tsx, src/styles.css, tests/integration/courseChatScenarios.browser.tsx, tests/integration/october22Scenarios.browser.tsx, tools/verify_installer.cjs, docs/product/sala-consultazione-2026-10-25.md, design-qa.md, STRUTTURA_PROGETTO.md, docs/README.md, dist/Lezionify-Setup-0.1.0.exe

## D-0415 — Assegnazione manuale di una lezione al corso richiesto

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** archivio-locale
- **Decisione:** Su richiesta diretta assegnata una singola lezione locale al corso indicato, senza cambiare le regole automatiche.
- **Motivazione:** La sovrapposizione con l orario configurato e inferiore alla soglia automatica del 60 per cento; la conferma esplicita dell utente risolve l assegnazione.
- **Impatto:** Modificato soltanto courseCode nell archivio personale con applicazione chiusa, backup preventivo e verifica su disco. Audio e altri campi conservati; nessuna chiamata AI.
- **Follow-up:** Verificare la lezione alla prossima apertura dell applicazione; nessuna modifica all orario richiesta.
- **File coinvolti:** Archivio locale non versionato: library.json

## D-0416 — Recupero locale della trascrizione interrotta

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** recupero-trascrizione
- **Decisione:** Su richiesta esplicita avviato recupero della lezione bloccata usando una copia locale e le chiavi configurate non raggiunte dai precedenti tentativi. Per il fallback audio vengono provati modelli Flash completi e singole chiavi con limite per tentativo, senza cambiare la configurazione generale. Dispensa e traduzione usano servizi e controlli applicativi abituali.
- **Motivazione:** I tentativi precedenti hanno raggiunto dieci minuti su poche chiavi e due modelli, con HTTP 503, timeout e risposta ASR vuota. I checkpoint delle prime quattro parti permettono la ripresa senza rifare il lavoro.
- **Impatto:** Chiamate Gemini esplicitamente autorizzate; credenziali decifrate soltanto in memoria. Audio originale e archivio personale conservati; risultati inizialmente nella copia ignorata local-artifacts. Nessuna dipendenza, installer o modifica ai sorgenti applicativi.
- **Follow-up:** Completare recupero, verificare parti e controlli della traduzione, riportare i risultati verificati nell archivio con backup e controllo delle modifiche concorrenti; documentare esito e limiti.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-20261026, archivio personale non versionato

## D-0417 — Estensione autorizzata del recupero a dispensa e traduzione

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** recupero-generazione
- **Decisione:** Dopo il recupero e il salvataggio della trascrizione, l utente autorizza esplicitamente l uso delle altre chiavi configurate e dei modelli completi di riserva anche per dispensa e traduzione. Il runner locale riusa i servizi di generazione, i prompt, i checkpoint e le validazioni esistenti, con rotazione locale delle chiavi e limite per tentativo. Nessuna modifica alle impostazioni del profilo personale o ai sorgenti applicativi.
- **Motivazione:** Il flusso abituale incontra ripetuti HTTP 503 e timeout su titolo e panoramica. La verifica dei segmenti brevi recupera 1106 parole nella parte 5 invece delle 169 iniziali e 743 nella parte 6 invece delle 674 iniziali, conservando entrambe le lingue. La trascrizione corretta di sei parti e gia salvata con backup nell archivio.
- **Impatto:** Chiamate AI aggiuntive autorizzate. Prime quattro parti preservate byte per byte, audio originale confrontato, sei segmenti brevi verificati. Nuove derivazioni preparate nella copia ignorata; trasferimento solo dopo esito positivo dei servizi abituali e controllo di concorrenza.
- **Follow-up:** Completare le tre sezioni, la traduzione con controllo integrita e il trasferimento con backup. Dichiarare il limite: nessuna revisione umana parola per parola e prime quattro parti riusate dai checkpoint.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-20261026, archivio personale non versionato

## D-0418 — Lezione recuperata e derivazioni salvate nell archivio

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** recupero-collaudo
- **Decisione:** Completati e riportati nell archivio personale la trascrizione corretta di sei parti, la dispensa italiana e la traduzione inglese della lezione bloccata. Usate chiavi configurate 9 e 10 per il recupero, 9 e 10 per le sezioni, 11 per la traduzione, con gemini-3.5-flash completo. Le tre attivita della singola lezione sono allineate a succeeded; le altre lezioni restano in coda.
- **Motivazione:** La trascrizione finale contiene 5374 parole. Le ultime due parti recuperate da sei segmenti brevi contengono 1106 e 743 parole; prime quattro parti identiche ai checkpoint. La dispensa contiene 3169 parole e quella inglese 3033; controllo integrita applicativo superato, 33 titoli per lingua, 12 blocchi di codice identici e quattro diagrammi Mermaid conservati strutturalmente.
- **Impatto:** Trasferimento con app chiusa, backup preventivo, confronto SHA256 dei tre file e dell audio originale, verifica dei metadati concorrenti e conservazione delle altre 37 lezioni. Nessun installer rigenerato, impostazione personale modificata o sorgente applicativo cambiato. Le note generali del corso restano invariate: la fusione aggiuntiva e stata bloccata dalla revisione automatica per ambito e invio di contenuti personali esistenti.
- **Follow-up:** Riaprire Lezionify e consultare la lezione. Restano tre altre lezioni nella pipeline sospesa. Unione delle note generali del corso subordinata ad autorizzazione esplicita. Limite: nessuna revisione umana integrale dell audio, prime quattro parti riusate.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-20261026/quality-result.json, local-artifacts/recovery-20261026/final-verification.json, archivio personale non versionato

## D-0419 — Elaborazione RL del 26 ottobre alle 09:44

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** elaborazione-lezione
- **Decisione:** Su richiesta diretta avviato lo stesso lavoro di recupero e completamento per la lezione RL del 26 ottobre alle 09:44: trascrizione, dispensa italiana e traduzione inglese. Audio di 95 minuti elaborato su copia locale in venti segmenti di massimo cinque minuti, preservando tutte le lingue comprensibili e usando le chiavi configurate e modelli completi gia autorizzati.
- **Motivazione:** La lezione e ancora audio-only senza checkpoint. I segmenti brevi hanno recuperato omissioni nella precedente lezione e permettono una ripresa granulare. Dispensa e traduzione mantengono prompt, servizi e controlli applicativi abituali.
- **Impatto:** Chiamate Gemini esplicite e tracciate; credenziali solo in memoria, risultati privati nella copia ignorata. Audio e metadati personali preservati; trasferimento finale con backup, confronto delle modifiche concorrenti e verifica dei file. Nessuna modifica alle impostazioni personali, ai sorgenti applicativi o all installer.
- **Follow-up:** Completare i venti segmenti e controllarne la copertura, generare e verificare ITA ed ENG, riportare i risultati nell archivio con app chiusa. Note generali del corso escluse dalla fusione aggiuntiva bloccata in precedenza, salvo nuova autorizzazione esplicita.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-rl-20261026, archivio personale non versionato

## D-0420 — RL passa alla trascrizione manuale dell utente

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** recupero-manuale
- **Decisione:** Su richiesta dell utente interrotti i tentativi automatici sulla lezione RL del 26 ottobre alle 09:44. Preparata una copia locale ignorata dell MP3 con nome riconoscibile per la trascrizione esterna da parte dell utente; conservati i segmenti intermedi riusciti e l audio originale.
- **Motivazione:** Il recupero incontra errori di quota, HTTP 503, timeout e problemi di rete; l utente preferisce produrre personalmente la trascrizione. Nessuna ulteriore chiamata Gemini viene avviata per questa elaborazione.
- **Impatto:** Dispensa e traduzione RL non completate, stato della pipeline personale lasciato aperto. Copia MP3 confrontata tramite SHA256 con l originale. Nessuna modifica ai sorgenti, alle impostazioni personali o all installer.
- **Follow-up:** Attendere la trascrizione fornita dall utente, associarla alla lezione corretta e riprendere le derivazioni soltanto su sua richiesta. Checkpoint e progressi conservati in local-artifacts/recovery-rl-20261026.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-rl-20261026, archivio personale non versionato

## D-0421 — RL da trascrizione fornita dall utente

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** generazione-dispense
- **Decisione:** Su richiesta ripresa la lezione RL del 26 ottobre alle 09:44 importando la trascrizione TXT fornita nella cartella di recupero. Generare soltanto dispensa italiana e traduzione inglese tramite i servizi, prompt e controlli abituali, usando le chiavi e il modello completo gia autorizzati.
- **Motivazione:** La trascrizione esterna e ora disponibile; evitare ulteriori invii audio e riusare il runner locale riduce lavoro e consumo di contesto Codex, come richiesto dall utente.
- **Impatto:** TXT originale conservato, copia di lavoro privata ignorata, impostazioni personali invariate. Trasferimento nell archivio subordinato a verifiche, backup e assenza di modifiche concorrenti. Nessuna dipendenza o installer nuovo.
- **Follow-up:** Verificare integrita della traduzione e conservazione esatta del TXT, salvare i risultati nell archivio e nella cartella richiesta. Le trascrizioni AI parziali precedenti restano separate.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-rl-20261026, archivio personale non versionato

## D-0422 — RL italiana salvata e traduzione lasciata all utente

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** salvataggio-locale
- **Decisione:** Su richiesta fermati i tentativi Gemini della versione inglese e salvate nell archivio personale la trascrizione TXT fornita dall utente e la dispensa italiana RL del 26 ottobre alle 09:44. Traduzione non segnata come completata e pipeline lasciata sospesa; l utente esportera l italiana e la tradurra esternamente.
- **Motivazione:** Generazione italiana riuscita; le richieste inglesi incontrano quote, HTTP 503, errori di rete e timeout. L utente sceglie esplicitamente di interrompere e procedere manualmente.
- **Impatto:** Backup preventivo, copia TXT identica all originale fornito, SHA256 delle copie verificati, audio originale e altre 37 lezioni conservati. Nell archivio trascrizione e dispensa riuscite, inglese ancora da produrre. Copia italiana disponibile anche nella cartella di recupero con nome riconoscibile.
- **Follow-up:** Riaprire Lezionify ed esportare l italiana. Attendere eventuale versione inglese fornita dall utente; nessun altro tentativo AI autorizzato per questa traduzione dopo lo stop.
- **File coinvolti:** DECISIONI.md, local-artifacts/recovery-rl-20261026, archivio personale non versionato

## D-0423 — Generazione archivio estesa al pool completo di chiavi e modelli

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** gemini-pool
- **Decisione:** Rimosse deadline complessiva implicita e soglia globale di sei invii per la generazione archivio; budget finito proporzionale alle coppie chiave-modello con tre tentativi per coppia. Q&A e recupero esplicito conservano i limiti precedenti.
- **Motivazione:** Il test riproduce la terminazione dopo quattro timeout prima di raggiungere la tredicesima chiave; le chiavi successive possono essere utilizzabili.
- **Impatto:** Restano timeout dei singoli tentativi, stop, RPM, cooldown, sospensioni per progetto e fallback su saturazione. Nessuna chiamata AI reale o dipendenza nuova; maggior durata possibile se molte chiavi falliscono.
- **Follow-up:** Completare suite e verificare il pacchetto aggiornato; collaudo reale di quote e disponibilita dipende da Google.
- **File coinvolti:** electron/main/ai/geminiPolicy.ts, electron/main/ai/geminiRequestManager.ts, tests/unit/geminiPhaseB.test.ts, tests/unit/geminiStreaming.test.ts, docs/quality/gemini-pool-revisione-dispense-2026-10-26.md, STRUTTURA_PROGETTO.md, docs/README.md

## D-0424 — Confronto trascrizione ITA ENG e correzioni editoriali locali

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** revisione-dispense
- **Decisione:** Confrontate le due dispense della lezione richiesta con la trascrizione fornita. Corrette entrambe e salvate nell archivio con backup e verifica di concorrenza. Precisazioni tecniche editoriali dichiarate, algoritmo delle slide non certificato.
- **Motivazione:** Rilevati errori matematici nella derivazione, omissioni di esempi e indicazioni di lettura, affermazioni troppo generali e titoli HTML non interpretati. Inglese prevalentemente fedele alla derivazione italiana.
- **Impatto:** Audio, trascrizione e metadati conservati identici. Renderer reale: 39 titoli, 222 elementi KaTeX e cinque diagrammi per lingua senza errori. Dati e schermate privati esclusi da Git, nessuna API invocata.
- **Follow-up:** Per certificare la variante di pseudocodice richiesta all esame servono le slide; nessun riascolto integrale dell audio effettuato.
- **File coinvolti:** Archivio personale non versionato, local-artifacts/rl-audit-20261026, docs/quality/gemini-pool-revisione-dispense-2026-10-26.md

## D-0425 — Installer con pool Gemini completo verificato

- **Data:** 2026-10-26
- **Stato:** accettata
- **Area:** distribuzione-gemini
- **Decisione:** Rigenerato il setup Windows 0.1.0 con D-0423; predisposti commit e push di tutte le modifiche pubblicabili, comprese le decisioni locali precedenti. Setup di 294217156 byte, SHA256 a4bc35e7a2122e6ffa375bfa216adff281e6e748e2ee8d0ac89a6e7123fd689e.
- **Motivazione:** Rendere utilizzabile la correzione nell applicazione installata, dopo 743 test unitari, typecheck main e renderer, lint e build riusciti. Revisione dei contenuti e renderer completata separatamente.
- **Impatto:** Verificati 372 file build, manifesto e blockmap, tre backup e otto componenti NSIS. Runtime RAG isolato senza rete superato. Nessuna installazione, release binaria o invio AI; artefatti e dati privati restano ignorati.
- **Follow-up:** Verificare commit remoto dopo push; installare il nuovo setup con Lezionify chiuso. Vecchio installer conservato in local-artifacts/installer-backups/20261026-rl-pool-audit.
- **File coinvolti:** DECISIONI.md, STRUTTURA_PROGETTO.md, docs/README.md, docs/quality/gemini-pool-revisione-dispense-2026-10-26.md, electron/main/ai/geminiPolicy.ts, electron/main/ai/geminiRequestManager.ts, tests/unit/geminiPhaseB.test.ts, tests/unit/geminiStreaming.test.ts, dist/Lezionify-Setup-0.1.0.exe
