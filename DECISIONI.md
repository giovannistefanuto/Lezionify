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
