# Struttura del progetto

## Stato attuale

Lezionify è un'applicazione desktop Electron con React e TypeScript in fase alpha:

- **Backend:** `ArchiveService`, validazioni runtime, scritture atomiche serializzate, recovery, cache in memoria, ricerca MiniSearch e credenziali protette tramite `safeStorage`.
- **Frontend:** renderer React modulare con caricamento differito per Dashboard, drawer, Q&A, Markdown/KaTeX, Mermaid e strumenti di studio.
- **Qualità:** 120 test Vitest, 24 scenari React in Electron, typecheck, lint, build e CI Windows.
- **Ricerca:** benchmark riproducibili per confrontare pipeline ASR locali, Colab e Gemini senza versionare audio o trascrizioni reali.

## Mappa del repository

```text
Lezionify/
|-- .github/
|   |-- workflows/ci.yml       # quality gate Windows
|   `-- ISSUE_TEMPLATE/        # moduli per bug e feature
|-- docs/
|   |-- assets/                # logo e segnaposto screenshot
|   |-- product/               # proposte di prodotto future
|   |-- publishing/            # checklist GitHub e bozza LinkedIn
|   |-- quality/               # checklist e report di collaudo
|   `-- research/              # ricerca e benchmark ASR
|-- electron/
|   |-- main/                  # servizi backend e processo principale
|   `-- preload/               # bridge IPC esposto al renderer
|-- resources/                 # icone per il packaging desktop
|-- shared/                    # contratti IPC, tipi e helper condivisi
|-- src/
|   |-- components/            # componenti React
|   |-- hooks/                 # stato e orchestrazione del renderer
|   `-- utils/                 # helper del frontend
|-- tests/
|   |-- unit/                  # suite Vitest deterministica
|   `-- integration/           # scenari Electron e test remoti opzionali
|-- tools/                     # manutenzione, collaudi e benchmark
|-- AGENTS.md                  # regole operative permanenti
|-- DECISIONI.md               # registro append-only delle decisioni
|-- IDEA_INIZIALE.md           # visione storica del prodotto
|-- README.md                  # presentazione pubblica
`-- STRUTTURA_PROGETTO.md      # questo documento
```

`local-artifacts/`, `.library-data/`, `benchmark_outputs/`, `out/` e `dist/` sono locali e ignorate da Git.

## Responsabilità

| Area | Responsabilità |
| --- | --- |
| Importazione | Copia sicura degli audio, metadati, deduplicazione e associazione al corso |
| Archivio locale | Persistenza JSON recuperabile e separazione tra fonti e derivazioni AI |
| Pipeline AI | Trascrizione, segmentazione, dispense, traduzione, studio set e Q&A |
| Viewer | Rendering Markdown, GFM, LaTeX e Mermaid con fallback |
| Ricerca e progresso | Full-text search, filtri, stato di studio, timer e statistiche |
| Configurazione | Provider, modelli, corsi, orari e protezione delle credenziali |

## Dati che non devono essere versionati

- Audio originali e output generati dell'utente.
- Libreria locale, log e metadati personali.
- Chiavi API, file `.env` e credenziali decifrate.
- Trascrizioni o dispense reali, salvo fixture sintetiche o esplicitamente anonimizzate.
- Output grezzi di benchmark contenuti in `local-artifacts/` o `benchmark_outputs/`.

Quando cambia la struttura reale, aggiorna questo documento e registra la scelta tramite `tools/append_decision.py`.

## Verifiche disponibili

- `npm test`: 120 test Vitest in `tests/unit/`.
- `npm run test:hooks`: 24 scenari React reali da `tests/integration/` in una finestra Electron nascosta.
- `npm run test:qna-real`: collaudo Gemini opzionale con dati sintetici; report in `docs/quality/qna-live-check-2026-09-11.md`.
- `npm run audit:styles`: inventario dei selettori CSS; misura bundle in `docs/quality/renderer-bundle-report-2026-09-11.md`.
- `npm run check`: typecheck, lint, suite automatiche e build di produzione.
- `.github/workflows/ci.yml`: esegue lo stesso quality gate su Windows senza credenziali esterne.

I collaudi manuali residui sono elencati in `docs/quality/quality-checklist.md`. La build non crea automaticamente una release firmata.
