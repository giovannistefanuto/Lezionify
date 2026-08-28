# Struttura del progetto

## Stato attuale

Il repository contiene l'applicazione desktop Electron con React e TypeScript aggiornata alla Milestone 3: archivio locale di MP3 e trascrizioni TXT, viewer Markdown con formule KaTeX, player audio persistente e generazione automatica 1-click di dispense universitarie strutturate tramite chiamata diretta alle API di Google Gemini con il prompt e i vincoli Gems personalizzati.

## File presenti

```text
Lezionify/
|-- AGENTS.md                 # istruzioni permanenti per agenti e nuove chat
|-- DECISIONI.md              # registro append-only delle decisioni
|-- electron/                 # processo principale, preload e accesso al filesystem
|-- IDEA_INIZIALE.md          # problema, visione, ambito e principi iniziali
|-- shared/                   # tipi TypeScript condivisi fra processi
|-- src/                      # interfaccia React dell'archivio
|-- tests/                    # test automatici (Vitest)
|-- STRUTTURA_PROGETTO.md     # mappa del progetto e stato della struttura
|-- tools/                    # script di sviluppo e manutenzione
|-- package.json              # dipendenze e comandi dell'app
`-- electron.vite.config.ts   # configurazione build desktop
```

## Struttura applicativa prevista

```text
Lezionify/
|-- electron/                 # processo principale e preload Electron
|-- shared/                   # contratti TypeScript IPC e dati dell'archivio
|-- src/                      # renderer React
|-- docs/                     # documentazione tecnica ulteriore, se necessaria
|-- tests/                    # test automatici
`-- tools/                    # script di sviluppo e manutenzione
```

## Responsabilita' previste

| Area | Responsabilita' |
| --- | --- |
| Importazione | Copia sicura degli audio, metadati, deduplicazione e associazione al corso. |
| Archivio locale | Inizialmente un file JSON privato dell'app con copie di audio e trascrizioni; database e indici arriveranno dopo. |
| Pipeline AI | Coda riprendibile per trascrizione, segmentazione e generazione Markdown. |
| Viewer | Rendering Markdown e LaTeX, accesso a sorgenti, copia del contesto. |
| Ricerca e progresso | Ricerca testuale iniziale, filtri per corso e stati separati di avanzamento. |
| Configurazione | Percorso dati, provider/modelli AI, vocabolario per corso e limiti di costo. |

## Dati che non devono essere versionati

- Audio originali e file generati dell'utente.
- Database locale con metadati personali.
- Chiavi API e file `.env`.
- Trascrizioni e lezioni reali, salvo campioni espressamente anonimizzati per i test.

Quando verra' creato codice o cambiera' una cartella, aggiorna questo documento e registra la scelta in `DECISIONI.md` tramite lo script previsto.
