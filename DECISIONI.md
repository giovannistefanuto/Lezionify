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
