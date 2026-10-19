# Struttura del progetto

## Stato attuale

Lezionify è un'applicazione desktop Electron con React e TypeScript in fase alpha:

- **Backend:** `ArchiveService`, validazioni runtime, scritture atomiche serializzate, recovery, cache in memoria, ricerca MiniSearch, credenziali protette tramite `safeStorage`, gestione e verifica suoni di sottofondo offline e pipeline archivio persistente e riprendibile.
- **Frontend:** renderer React modulare con caricamento differito per Dashboard, drawer, Q&A, Markdown/KaTeX, Mermaid, suoni di sottofondo offline Web Audio e strumenti di studio; sidebar con corsi attivi e archiviati, menu contestuale e liste di studio limitate ai corsi attivi.
- **Qualità:** 625 test Vitest, 24 regressioni Python (14 ASR e 10 ricerca Q&A), 41 test Node Q&A, scenari React in Electron, typecheck, lint, build e CI Windows.
- **Ricerca:** benchmark riproducibili per confrontare pipeline ASR locali, Colab e Gemini senza versionare audio o trascrizioni reali.

Il controllo ENG in `electron/main/ai/translationIntegrity.ts` recupera i
diagrammi Mermaid originali quando la traduzione ne altera la struttura
(D-0366), conservando i controlli sul resto della sezione, e distingue
componente strutturale e indice di sezione negli errori, senza testo privato.
`translationPlan.ts` prepara i frammenti di prosa, lo schema JSON e la
ricostruzione locale di formule/codice e spazi: il modello vede tutto il
documento come contesto in una sola richiesta, ma restituisce soltanto la
prosa. Diagnosi e due collaudi reali riusciti in
`docs/quality/integrita-eng-indagine-2026-10-19.md` (D-0355).
La successiva ricorrenza D-0357 gestisce soltanto copie display aggiuntive,
identiche a formule già conservate nella stessa sezione e su righe autonome;
registra conteggi senza contenuti e mantiene il controllo finale. Replay reale
positivo e 609 test; un nuovo invio di verifica è stato bloccato dalla quota.

La ripresa D-0364 conferma sul replay reale la correzione delle etichette
Mermaid D-0361 e limita i fallback automatici ENG ai modelli completi.
`ArchiveService.getManagedKeys()` distingue gruppi configurati da appartenenze
legacy non verificate: queste conservano RPM e cooldown condivisi, ma una
quota giornaliera sospende soltanto la chiave effettivamente provata. I gruppi
noti conservano la sospensione per progetto, con budget assoluto di sei invii.

Le voci Memo, log giornalieri e nuova esportazione sono implementate in
D-0367–D-0369: `MemoActivityPreview` e `memo.css` affiancano le catture esistenti;
`shared/appLogs.ts` espone la lettura di un giorno tramite indice di intervalli
in `AppLogger`; `PdfExportDialog` condivide selezione e lingua tra archivio,
drawer e Focus, con `lectureIds` validati nel main. `AmbientLoopPlayer` gestisce
le dissolvenze dei soli suoni offline (default 1 secondo, D-0370), con invalidazione
dei caricamenti superati nel provider. Transizioni Spotify/YouTube ancora aperte.
Uso, limiti e verifiche in `docs/product/memo-log-pdf-transizioni-2026-10-19.md`.

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
|   `-- research/              # ricerca ASR, Q&A, traduzione offline e musica durante lo studio
|-- electron/
|   |-- main/                  # servizi backend e processo principale
|   |   |-- publishing/        # pubblicazione testo su GitHub, Git, README e checkpoint per destinazione
|   |   `-- ai/                # richieste Gemini, abort streaming, scheduler, quote, checkpoint, pipeline persistente e categorie di fallimento
|   `-- preload/               # bridge IPC esposto al renderer
|-- resources/                 # icone per il packaging desktop
|-- public/dictionaries/       # dati EN/IT FreeDict/WikDict con attribuzione e licenza, inclusi nel renderer
|-- shared/                    # contratti IPC, tipi e helper condivisi
|-- src/
|   |-- components/            # componenti React
|   |-- hooks/                 # stato e orchestrazione del renderer
|   `-- utils/                 # helper del frontend
|-- tests/
|   |-- unit/                  # suite Vitest deterministica
|   |-- python/                # regressioni offline del benchmark Gemini
|   `-- integration/           # scenari Electron e test remoti opzionali
|-- tools/                     # manutenzione, collaudi e benchmark
|-- AGENTS.md                  # regole operative permanenti
|-- DECISIONI.md               # registro append-only delle decisioni
|-- IDEA_INIZIALE.md           # visione storica del prodotto
|-- README.md                  # presentazione pubblica
`-- STRUTTURA_PROGETTO.md      # questo documento
```

`local-artifacts/`, `.library-data/`, `benchmark_outputs/`, `out/` e `dist/` sono locali e ignorate da Git.

La chat di corso usa `shared/courseRag.ts`, `electron/main/courseRag.ts` e
`courseRagIndex.ts` per fonti, passaggi, conteggi, persistenza e richieste
strutturate Gemini. Collegamenti e testo estratto restano in
`userData/course-rag`, separati dall'archivio delle lezioni. PDF.js lavora nel
worker statico `resources/course-rag/pdf-worker.cjs`, emesso dalla build in
`out/main/course-rag`. `src/components/CourseChat.tsx` integra conversazioni,
fonti, citazioni e selezione esplicita di pagine nel lettore PDF esistente.
Uso, scelte e limiti in `docs/product/rag-corso-2026-10-17.md` (D-0343/D-0344).

Le catture rapide conservano gruppi opzionali e selezione in `scratchpad.json`,
con contratti condivisi, validazione runtime e salvataggio atomico. UI in
`QuickCaptureOverlay`, orchestrazione in `useQuickCapture` e copia raggruppata
in `src/utils/quickCapture.ts`. I dati precedenti restano in Senza tag.
`src/utils/studyEstimate.ts` contiene il calcolo puro dello studio residuo;
`useStudyEstimate` campiona il documento Focus e conserva solo coordinate,
tempi e impronte in `localStorage` per lezione. Preferenza nelle Impostazioni.
Scelte, uso e verifiche in
`docs/product/catture-gruppi-stima-studio-2026-10-17.md` (D-0341/D-0342).

`docs/product/attivita-future.md` raccoglie le attività richieste e il loro stato di
implementazione, con caselle di avanzamento e criteri adottati.

`docs/product/punto-ripresa-2026-10-16.md` conserva risultati, verifiche e rinvii
della sessione, con la voce 18 sui suoni offline completata in D-0340. La ricerca
`docs/research/suoni-sottofondo-apple-valutazione-2026-10-16.md` documenta fonti
Apple ed equivalenti open source. `docs/research/suoni-equivalenti-catalogo-2026-10-16.md`
raccoglie i sei suoni adottati con provenienza, licenze e verifiche locali;
i suoni scaricati risiedono in `userData/ambient-sounds` su richiesta esplicita.

`docs/product/guida-skill-codex.md` descrive l'uso delle otto skill Matt Pocock
installate nel profilo personale Codex, esterne al repository e al pacchetto
dell'app: criteri di scelta, prompt, limiti e coordinamento con le regole locali.
La guida include anche `grilling`, aggiunta successivamente per l'intervista;
`docs/product/priorita-1-5-2026-10-15.md` raccoglie scelte e verifiche risultanti.

`docs/product/idee-future-2026-10-13.md` conserva le nuove idee per lo studio,
distinguendo interventi immediati, approfondimenti e vocabolario già implementato.

`docs/product/resoconto-interventi-2026-10-15.md` è il punto di ripresa della
revisione iterativa autorizzata su tutte le voci aperte: esiti, scelte e collaudi.
`docs/product/implementazione-scelte-2026-10-15.md` registra le risposte approvate,
l’implementazione e i collaudi; `funzioni-approvate-2026-10-15.md` nella stessa
cartella descrive uso e limiti. Slide PNG locali in `qna-images`, anteprime e
pulizia nelle impostazioni; ENG anche negli import con elaborazione automatica.

`resources/translation/` conserva manifest, adattatore e licenze per Bergamot;
la build emette `out/main/translation-runtime`, fuori ASAR nel pacchetto Windows.
Modelli opzionali in `userData/offline-translation`, testi elaborati senza rete.
`shared/musicCatalog.json` conserva sei video e 54 inizi di traccia originali;
correzioni timestamp nel profilo renderer. `electron/main/spotify.ts` gestisce
PKCE loopback e credenziali cifrate in `userData/spotify.json`; pilota reale
account/dispositivi ancora da completare dall’utente.
`prototypes/balance-pause/` è un nucleo sperimentale con test, fuori dalla build
di produzione: non equivale a una mini app installabile o a un trasporto BLE.

`docs/research/traduzione-frasi-offline-2026-10-13.md` conserva il recupero del
vocabolario e tre piloti CPU per frasi EN ↔ IT: OPUS/ONNX, modelli Argos con
CTranslate2 e Mozilla/Bergamot WASM. I runner `tools/offline_translation_pilot.mjs`,
`offline_translation_argos_pilot.py`, `offline_translation_bergamot_pilot.mjs` e
`offline_translation_analyze.mjs` usano 24 casi sintetici in
`tests/fixtures/offline-translation/cases.json`. Modelli, ambienti sperimentali,
hash e risultati restano in `local-artifacts/offline-translation/`, ignorato da
Git. Questi piloti precedono l’integrazione Bergamot D-0307/D-0308 descritta sopra.

`docs/research/traduzione-api-valutazione-2026-10-13.md` confronta le API online
con i piloti locali e verifica quote e condizioni. `tools/translation_api_mymemory_pilot.mjs`
esegue una sola passata online dei 24 casi sintetici con budget e checkpoint;
report e pagine ufficiali in `local-artifacts/translation-api-research/`, ignorato
da Git. Azure F0 è candidato per una futura prova, senza integrazione o account creati.

`docs/research/lara-translated-valutazione-2026-10-16.md` verifica Lara 3 di
Translated: servizio web/API, quota gratuita distinta dal pilota commerciale,
assenza di pesi pubblici individuati, privacy e denominazioni SDK, claim di
latenza confrontati con misure storiche Bergamot. Ricerca conclusa senza
benchmark Lara, nuovo provider o modifica alla traduzione offline.

`docs/research/musica-integrazione-valutazione-2026-10-13.md` confronta Spotify,
YouTube e file locali, verifica i timestamp delle compilation fornite e propone
un pilota personale del telecomando Spotify. La successiva integrazione D-0309 è descritta sopra; account reale non collegato.
`docs/research/musica-concentrazione-evidenze-2026-10-13.md` sintetizza sette studi
su lettura, memoria, ragionamento e attenzione, distinguendo evidenze e proposte.

`docs/research/timer-pausa-amazfit-balance-valutazione-2026-10-14.md` conserva
requisiti e configurazioni tecniche, valutazione delle API Zepp/BLE, protocollo,
piste REA e piano di ripresa del timer pausa offline sul Balance originale.
`timer-pausa-amazfit-balance-deep-research-2026-10-14.md` nella stessa cartella
è la copia integrale invariata del report fornito dall’utente. Il nucleo sperimentale
successivo è in `prototypes/balance-pause/`; nessuna installazione o prova hardware.

`docs/research/qna-alternative-gratuite-non-gemini-2026-10-13.md` conserva
integralmente la ricerca fornita dall'utente per modelli Q&A gratuiti diversi
da Gemini. `docs/research/qna-alternative-gratuite-valutazione-2026-10-13.md`
raccoglie vincoli, verifiche ufficiali, candidati Groq/Cloudflare e benchmark
ancora da eseguire. Nessuna integrazione o scelta definitiva del modello.
`docs/research/qna-benchmark-piano-2026-10-13.md` dettaglia prove progressive,
quote degli account, pilota, qualità, contesto lungo e criteri di selezione.
`tools/qna_benchmark.mjs` e `qna_benchmark_core.mjs` eseguono prove sintetiche
Groq/Cloudflare separate dall'app, con checkpoint, ledger dei consumi e risultati
in `local-artifacts/qna-benchmark/`. Le credenziali sono nel `.env` locale
ignorato da Git. Fixture in `tests/fixtures/qna-benchmark/`, regressioni offline
con `npm run test:qna-benchmark`; registro delle prove in
`docs/research/qna-benchmark-esecuzione-2026-10-13.md`.
`tools/qna_prepare_private.py` estrae domande reali e contesto in sola lettura;
`tools/qna_replay_private.mjs` le confronta riusando lock e ledger. Corpus e
risposte sono privati negli artefatti locali. `qna_research_snapshot.py` appende
un giornale Python senza contenuti personali; `qna_analyze.mjs` analizza le fasi.
Risultati e limiti in `docs/research/qna-benchmark-risultati-2026-10-13.md`.
Il punto di ingresso per riprendere il lavoro è
`docs/research/qna-non-gemini-ripresa-completa-2026-10-13.md`: conserva obiettivo,
conclusioni, mappa degli artefatti, comandi, vincoli e piano delle prove residue.
`qna_nonstream_diagnostic.mjs` confronta una sola generazione sintetica completa
Cloudflare con gli stream osservati; non è una misura di reattività della UI.
`qna_benchmark_checkpoint.mjs` controlla recupero dei tentativi, riserve senza
risposta salvata e intervalli delle sessioni dopo una pausa.

## Responsabilità

| Area | Responsabilità |
| --- | --- |
| Importazione | Copia sicura degli audio, metadati, deduplicazione e associazione al corso; video riordinabili convertiti localmente in un unico MP3 con FFmpeg incluso |
| Archivio locale | Persistenza JSON recuperabile e separazione tra fonti e derivazioni AI |
| Pipeline AI | Coda locale riprendibile: tutte le trascrizioni, poi dispense ITA, poi traduzioni EN; Gemini gestisce centralmente attese, retry e fallback. Studio set e Q&A restano flussi espliciti separati. |
| Viewer | Rendering Markdown, GFM, LaTeX e Mermaid con fallback |
| Ricerca e progresso | Full-text search, filtri, stato di studio, timer e statistiche; corsi archiviati consultabili separatamente, esclusi dalle liste e ricerche generali |
| Configurazione | Provider, modelli, corsi, orari e protezione delle credenziali |
| Pubblicazione | Sincronizzazione automatica di trascrizioni grezze e dispense ITA/EN; cartelle con nome corso e data, titoli per più lezioni nello stesso giorno, README bilingui e migrazione dei precedenti percorsi con hash. Configurazione con PAT cifrato, confronto dei contenuti con il branch GitHub, controlli all'avvio e periodici, retry e aggiornamenti dopo modifiche/pipeline/traduzioni. Nessun pulsante Pubblica. |

## Dati che non devono essere versionati

- Audio originali e output generati dell'utente.
- Libreria locale, log e metadati personali.
- Chiavi API, file `.env` e credenziali decifrate.
- Trascrizioni o dispense reali, salvo fixture sintetiche o esplicitamente anonimizzate.
- Output grezzi di benchmark contenuti in `local-artifacts/` o `benchmark_outputs/`.

Quando cambia la struttura reale, aggiorna questo documento e registra la scelta tramite `tools/append_decision.py`.

## Verifiche disponibili

`tests/integration/languageShortcutScenarios.browser.tsx`, filtro
`--language-shortcut-only`, verifica Ctrl+L con input nativo Electron e
fullscreen HTML reale, testo/PDF e campi editabili. Profilo sintetico e finestra
di test temporanea; diagnosi personale ancora aperta in
`docs/quality/ctrl-l-diagnosi-2026-10-16.md`.

`electron/main/languageShortcutDiagnostics.ts` osserva soltanto Ctrl/Cmd+L
quando il processo parte con `LEZIONIFY_TRACE_CTRL_L=1`. Il preload espone
il flag booleano e il drawer registra arrivo/esito/stato della lingua nel log
locale senza testo o identificativi. Strumentazione temporanea da rimuovere
alla conclusione della diagnosi; prova nativa anche con l'intera `App` montata.

`useFinalLectureReturn` coordina in `App` il ritorno a Tutte le lezioni dopo
il salvataggio riuscito dell'ultima lezione da studiare del corso. Timer di
2 secondi annullabile, avviso nel drawer ordinario/Focus e sessione salvata
dal ciclo di vita esistente, senza Focus Lock automatico. Scenari e limiti in
`docs/quality/ultima-lezione-2026-10-16.md`.

`src/utils/markdownMath.ts` normalizza i delimitatori dei blocchi LaTeX multilinea
nella copia renderizzata da `MarkdownViewer`, condivisa fra lettura ordinaria,
Focus e PDF. Evita che il parser inglobi il resto della dispensa quando apertura
e chiusura aderiscono alla formula. Non riscrive file né contatta servizi AI;
regressioni in `tests/unit/markdownMath.test.ts`, filtro Electron
`--math-rendering-only` e fixture di export PDF IT/EN.

`src/utils/sectionAlignment.ts` collega localmente i capitoletti IT/EN per
numero, titolo univoco o struttura compatibile. `useReadingPosition` condivide
in memoria il punto corrente tra le viste e salva il nuovo segnalibro senza
testo. Regressioni in `tests/unit/sectionAlignment.test.ts` e nei collaudi
React Electron della lettura e del cambio lingua con pulsante/Ctrl+L in Focus.

- `npm test`: suite Vitest in `tests/unit/`, incluse regressioni della pipeline, errori strutturati, proprietà dei file audio durante la rotazione Gemini e fallback multimodale, archiviazione reversibile dei corsi, sincronizzazione GitHub bilingue e migrazione dei percorsi, scheduler offline, SDK streaming con fetch sintetico, importazione di video sintetici con FFmpeg reale e scelta del lunedì più vicino e persistenza reversibile del metadato Laboratorio; totale della singola lezione senza duplicazione della sessione corrente; conteggio delle parole delle dispense rispetto allo stesso corso, riassegnazione e archiviazione del corso, cache e diagnostica delle fasi senza contenuti privati; vocabolario offline con dati reali, flessioni, locuzioni, validazione e retry; log dettagliato Gemini e conservazione di 5000 eventi.
- `npm run test:benchmark`: 24 test Python offline: metriche, checkpoint, merge, lifecycle/fallback ASR, estrazione conservativa dei casi Q&A e journal senza testi privati.
- `npm run test:qna-benchmark`: 41 test Node offline per parser, timeout, abort, riserve di consumo, protezione delle credenziali, fixture, replay privato e ripresa conservativa dei tentativi/sessioni.
- `npm run test:hooks`: scenari React reali da `tests/integration/` in una finestra Electron nascosta, inclusi configurazione pubblicazione automatica, conservazione/pulizia PAT, filtri dei corsi archiviati, rollback/retry Q&A parziale, refresh della pipeline e importazione video con trascinamento, scorciatoia, retry e annullamento, home con titoli troncati, lingue allineate e menu Laboratorio; riquadri Markdown, tempi della lezione e conservazione della posizione PDF.
- `npm run test:qna-real`: collaudo Gemini opzionale con dati sintetici; report in `docs/quality/qna-live-check-2026-09-11.md`.
- `npm run audit:styles`: inventario dei selettori CSS; misura bundle in `docs/quality/renderer-bundle-report-2026-09-11.md`.
- `npm run check`: typecheck, lint, suite TypeScript/Python, scenari Electron e build di produzione.
- `.github/workflows/ci.yml`: esegue lo stesso quality gate su Windows senza credenziali esterne.

I collaudi manuali residui sono elencati in `docs/quality/quality-checklist.md`. La build non crea automaticamente una release firmata.

`electron/main/videoImporter.ts` gestisce selezioni native tramite ID opachi,
conversioni annullabili e staging in `video-import-temp/session-*` nell’archivio.
I temporanei propri interrotti vengono ripuliti all’avvio; l’MP3 finale usa
`audio/<id>.mp3` e gli stessi metadati di corso/data della pipeline esistente.
`electron/main/ffmpegPath.ts` centralizza il percorso assoluto dell’eseguibile
incluso, con risoluzione ASAR unpacked e senza ricerca nel PATH.
`src/components/VideoImportModal.tsx` è caricata su richiesta; i video originali
restano nella cartella dell’utente e i loro hash/ordine sono nei metadati locali.

La libreria locale contiene anche `publish-state.json` e `publish-repo/<hash-destinazione>/`;
il clone resta nella cartella dati dell'utente. I test di pubblicazione sono offline
e non eseguono Git né chiamate di rete. Piano e consuntivo:
`docs/product/publishing-implementation-plan.md`.

`electron/main/publishing/publicationLayout.ts` assegna percorsi leggibili e rifiuta
collisioni di nomi/titoli prima della scrittura. La migrazione rimuove soltanto file
generati nei percorsi posseduti dai checkpoint o dal precedente layout deterministico;
non elimina ricorsivamente cartelle o file estranei. Le traduzioni disponibili sono
pubblicate come `schema.en.md`, senza chiamate AI dal publisher. La proposta di una
repository unica per codice e lezioni è in `docs/product/repository-portfolio-plan.md`.

## Progetto Android separato (riferimento storico)

Le decisioni D-0186 e successive documentano anche un progetto autonomo di
diagnostica cellulare Android, precedentemente sviluppato in `APP_TELEFONIA/`.
La cartella non è presente in questo checkout e non fa parte dei sorgenti
pubblicati di Lezionify. Non è una funzione del runtime Electron né viene
verificata da `npm run check`.

## PDF locali nella modalita focus

`electron/main/focusPdf.ts` conserva cartella e associazioni per lezione in
`focus-pdfs.json` nel profilo Electron e concede URL temporanei solo per i PDF
selezionati tramite dialogo nativo. Legge le fonti senza scritture o cancellazioni.
`src/components/FocusWorkspace.tsx` gestisce divisore e spazio per Gemini;
`FocusPdfViewer.tsx` carica PDF.js su richiesta con canvas vicini al viewport.
Il lettore conserva pagina e coordinate relative durante zoom, variazioni del
divisore, resize e occultamento temporaneo. Le proporzioni delle singole pagine
caricate correggono la geometria senza spostare il punto di lettura.
La barra delle slide mostra prima pagina visibile/totale, aggiornata dalla stessa
geometria del punto di lettura. Il cambio PDF resetta il contatore; caricamenti,
errori e lezioni senza PDF non mostrano un totale precedente.
`usePaneZoom.ts` limita lo zoom al pannello interessato. Font, CMap, decoder e
worker vengono inclusi localmente dalla configurazione Vite. Nessun PDF viene
inviato all AI o incluso nelle pubblicazioni. Comportamento e limiti sono in
`docs/product/focus-pdf.md`; regressioni in `tests/unit/focusPdf.test.ts` e
`tests/integration/focusPdfScenarios.browser.tsx`.

## Classificazione automatica dei laboratori

`electron/main/laboratorySchedule.ts` applica le regole locali opzionali dei corsi:
appuntamenti con data e fascia oraria oppure giorni settimanali. I calendari
personali restano in `settings.json` nel profilo locale. Gli appuntamenti datati
hanno precedenza sugli slot ricorrenti nel matching, con soglia del 60 percento.
`electron/main/courseSchedule.ts` centralizza il calcolo della sovrapposizione.

Il flag `isLaboratory` resta sul record della lezione condiviso da audio,
trascrizione, dispensa ITA e traduzione EN. Si applica agli import USB, da cartella,
video e alle scansioni; le lezioni preesistenti vengono aggiornate all'avvio.
Le scelte esplicite true/false del menu destro prevalgono sulle regole automatiche.
La provenienza `laboratorySource: schedule` consente di ricalcolare soltanto i flag
automatici dopo variazioni di data, corso, calendario o durata. I vecchi flag senza
provenienza vengono conservati come scelte manuali. I ripieghi sulla data del file
e i campi di modifica usano giorno e ora locali.
La modifica o rinomina del corso conserva il calendario. I test in
`tests/unit/lectureLaboratory.test.ts` verificano anche conflitti, date, fasce,
periodo, conservazione delle derivazioni e fuso orario del ripiego mtime.

## Statistiche di studio dei corsi attivi

`getCourseStats` e `getStudyAnalytics` escludono i corsi archiviati dai conteggi,
totali e grafici; le sessioni restano salvate e tornano visibili al ripristino.
La media di studio per corso somma le sessioni per lezione completata con tempo
positivo, mostra il numero di lezioni del campione e distingue l'assenza di dati
con un valore nullo. I tempi generici non sono attribuiti alle singole lezioni.
Le sessioni collegate seguono il corso attuale della lezione.

`getLectureStudySeconds` legge il totale locale di una singola lezione su tutte
le date, escludendo la sessione indicata. `useStudyTracker` aggiunge i secondi
correnti per mostrarlo accanto alla sessione attuale nel Focus Lock, evitando
duplicazioni dei checkpoint e risposte obsolete. I tempi generici del corso
restano esclusi; in caso di lettura fallita il totale è Non disponibile.

`useLectures` ordina la vista generale per stato (In corso, Da studiare,
Completate) preservando l'ordine dentro ciascun gruppo. Il Dashboard mostra la
media e scarta risposte obsolete dopo un cambio dei corsi attivi. Regressioni in
`tests/unit/studyStatistics.test.ts` e nella suite React/Electron.

## Archivio, lunghezza delle dispense e discussione ridimensionabile

`src/utils/courseColor.ts` usa i colori configurati dei corsi e una palette
deterministica di ripiego per i riquadri delle icone in Tutte le lezioni.
Il metadato Laboratorio si presenta come etichetta in grassetto accanto al titolo,
senza evidenziare in azzurro la riga. La conferma di pulizia USB usa lo stesso
toast temporaneo dell’archivio completo: un secondo visibile e uno di dissolvenza.

`shared/lectureLength.ts` conta le parole del testo delle dispense italiane,
escludendo sintassi, codice, diagrammi e formule. `getLectureWordCounts` legge
le derivazioni locali dello stesso corso della lezione richiesta tramite IPC,
indipendentemente dai filtri e dall’archiviazione, e mantiene una cache in memoria
invalidata dai metadati dei file. Mancanza o errore di lettura sono distinti da
zero parole. Il drawer mostra conteggio e percentuale rispetto alla dispensa
più lunga dello stesso corso, indipendentemente dai filtri o dalla lingua
visualizzata. Senza corso assegnato mostra solo il conteggio e invita ad assegnarlo;
risposte obsolete dopo un cambio di lezione o corso vengono ignorate.

`PaneDivider.tsx` condivide trascinamento, frecce, Home e doppio clic tra PDF e
Discussione Contestuale. `ResizableQnaPane.tsx` gestisce la vista ordinaria;
`FocusWorkspace.tsx` riserva almeno 300 px alla discussione e 360 px alla
spiegazione, nascondendo temporaneamente le slide quando serve spazio.
Su finestre strette il layout consente lo scorrimento orizzontale.
`QnaSidebar.tsx` posiziona una nuova domanda una sola volta, conserva lo scroll
durante streaming e completamento e ripristina il punto di lettura dopo un resize.
La vista ordinaria limita l’altezza del pannello per mantenere separati gli scroll.

`electron/main/ai/progressDiagnostics.ts` traduce l’avanzamento delle dispense in
etichette di fase e contatori senza registrare titoli generati o contenuti privati.
Il log include segmentazione, singole sezioni, note d’esame, logistica del corso,
salvataggi, traduzioni e stati delle attività della pipeline. `LogViewerModal.tsx`
include queste sorgenti nel filtro AI Gemini e aggiorna i log ogni due secondi
solo mentre il pannello è aperto. La diagnostica non avvia nuove chiamate AI.
`geminiRequestManager.ts` registra anche coda, selezione e cambio modello,
rotazione/esclusione delle chiavi, quote, attese, retry, timeout e fine budget.
Ogni tentativo e risultato mostra numero, alias della chiave, modello e contesto
direttamente nel messaggio, con metadati strutturati nei dettagli tecnici.
Il pannello conserva gli ultimi 5000 eventi, anche dopo il riavvio, senza
registrare chiavi API, prompt o risposte. La rotazione del file resta a 5 MB.
Regressioni in `tests/unit/lectureLength.test.ts` e negli scenari Electron della
lista, del PDF e di `discussionDiagnosticsScenarios.browser.tsx`.

## Vocabolario offline

`public/dictionaries/` contiene i due dizionari FreeDict/WikDict 2025.11.23,
le attribuzioni e la licenza CC BY-SA 3.0, separata dal codice dell’app.
Vite copia questi dati in `out/renderer/dictionaries/` per il packaging.
`tools/build_dictionary.py` converte i sorgenti TEI locali e registra i loro hash.
`electron/main/localDictionary.ts` carica ogni dizionario al primo lookup,
riusando l’indice di `shared/dictionary.ts`. Il contratto IPC accetta solo testo
e direzione EN/IT, senza URL o percorsi; non usa rete e non registra le ricerche.

`useDictionaryShortcut.ts` gestisce Ctrl+T; `DictionaryOverlay.tsx` è caricata su
richiesta e usa un portal nell’elemento fullscreen o nel body. La casella offre
riconoscimento automatico IT/EN confrontando le voci nei due dizionari locali,
inversione manuale persistente nella casella, traduzioni, categorie, definizioni
della fonte, suggerimenti e retry. Ambiguità e assenze conservano la direzione.
Esc e autofocus delle modali sottostanti rispettano il vocabolario aperto.
Le flessioni inglesi comuni sono risolte solo verso lemmi presenti e compatibili
con la categoria grammaticale. Dal 15 ottobre alcune forme italiane comuni
di presente/imperativo rimandano a un unico lemma verbale attestato; più lemmi
non producono una scelta arbitraria. La lacuna «trascrivere» è colmata con una
sola voce inversa revisionata, riprodotta da `tools/build_dictionary.py` a partire
dalla coppia EN→IT locale e attribuita nei dati/NOTICE (29.661 voci IT→EN).
Le locuzioni richiedono una voce corrispondente;
non è un traduttore di frasi. Test in `dictionary.test.ts` e
`dictionaryScenarios.browser.tsx`; dettagli in `docs/product/vocabolario-offline.md`.

## Esportazione PDF e ripresa della lettura

I titoli personalizzati IT/EN sono in `Lecture.titleOverrides`, con regole in
`shared/lectureTitles.ts` e IPC dedicato in `ArchiveService`.
`LectureTitleEditor.tsx` si apre dalle righe di `LectureList` con doppio clic
o F2; cache UI e intestazioni di lettore, Focus e PDF sono aggiornate.
`PdfExportDocument` aggiunge una pagina Note a griglia SVG da 5 mm per ogni
lezione, compreso l export singolo. Uso e verifiche in
`docs/product/titoli-lezioni-note-pdf-2026-10-18.md`.

`shared/pdfExport.ts` definisce richieste, risultati e documenti di export.
`electron/main/pdfExport.ts` seleziona le derivazioni locali, ordina l'intero
corso e usa una finestra Electron nascosta con sessione temporanea separata.
`PdfExportDocument.tsx` riusa Markdown, KaTeX e Mermaid, attende il rendering e
applica `pdfExport.css` prima di printToPDF. Il salvataggio usa un temporaneo
nella destinazione scelta con dialogo nativo. Nessuna chiamata AI.
`PdfExportButton.tsx` e' presente nella lezione, in Focus e nell'archivio del
corso con scelta ITA/EN. Dispense mancanti segnalate, senza traduzioni implicite.

`src/utils/readingPosition.ts` conserva solo identita' e coordinate nel
localStorage del profilo Electron. `useReadingPosition.ts` condivide il punto
relativo al blocco Markdown tra drawer e Focus, distinto per lezione e lingua.
Un fingerprint del contenuto evita di riprendere una dispensa sostituita.
`FocusPdfViewer.tsx` usa pagina e coordinate relative per lezione e fingerprint
PDF.js, indipendentemente dal nuovo grant di accesso. Le posizioni restano
dopo la chiusura della lezione e il riavvio dell'app, fuori dalla pubblicazione.

`FocusWorkspace.tsx` offre il comando collettivo Mostra/Nascondi tutti gli schemi;
`useMermaidCollapseGroup` in `MermaidDiagram.tsx` sincronizza comandi collettivi
e individuali soltanto nella spiegazione Focus. SVG conservati, stato temporaneo
per lezione e nessun effetto sulla discussione o sui PDF. Il pulsante PDF nella
vista ordinaria è verificato per entrambe le lingue e ne descrive la destinazione.

`tests/integration/readingPositionScenarios.browser.tsx` verifica scroll,
lingue e cambio contenuto; `readingRestart.browser.tsx` verifica le due fonti
in due processi Electron distinti sullo stesso profilo temporaneo.
`npm run test:pdf-export`, dopo la build, usa `tools/run_pdf_export_regressions.cjs`
per esportare davvero PDF sintetici col renderer di produzione. Il controllo
include tre dimensioni di Mermaid, confronto dell'ingombro con le precedenti
regole, proporzioni e codice di fallback completo. `pdfExport.css` rimuove
gli spazi minimi della vista a schermo solo nei PDF, senza riscrivere i grafi.
`MermaidPrintContext` applica font e spaziatura dedicati alla stampa;
`src/utils/mermaidPrint.ts` stima la leggibilita su A4 e propone una disposizione
alternativa soltanto alla copia renderizzata dei flowchart troppo estesi.
I test PDF verificano anche layout alternativi e font effettivi tramite PDF.js;
le fonti e i grafi visualizzati nella lettura ordinaria restano invariati.
Il controllo
e' incluso in npm run check e CI Windows. Le regressioni di selezione e
permessi IPC sono in `tests/unit/pdfExport.test.ts`.
Uso e limiti: `docs/product/lettura-export-pdf.md`.

## Traduzione delle dispense

`electron/main/ai/translationIntegrity.ts` aggiunge confini temporanei alla
dispensa intera prima della richiesta Gemini e verifica risposta completa,
ordine delle sezioni ATX, livelli/numeri dei titoli, formule, codice, riquadri
e struttura Mermaid. I confini sono rimossi prima del salvataggio; la dispensa
italiana resta invariata. L'errore interrompe senza retry automatici e conserva
l'inglese precedente; nessun checkpoint EN o fallback a parti.
Regressioni in `translationIntegrity.test.ts`, `geminiPhaseB.test.ts` e
`archive.test.ts`. Confronto, scelta e limiti linguistici in
`docs/product/traduzione-dispense.md`.


`shared/qnaModelPolicy.ts` definisce la catena rapida delle domande, indipendente
dal modello delle dispense: Flash-Lite 3.5, Flash-Lite 3.1, Flash e riserve.
Il gestore centrale applica il passaggio immediato quando il modello non produce
risposta utilizzabile, entro budget e quote; primo chunk Q&A entro 20 secondi.
Contesto e slide restano identici, stream parziali non vengono mescolati.


La UI musicale visuale è separata in `MusicButton`, `SpotifyPanel`,
`SpotifyWorkspace`, `YoutubeLibrary`, `MusicArtwork`, `MusicIcon` e `music.css`.
`useSpotifyPlayer` coordina letture, polling visibile, selezione PC e comandi;
`shared/spotify.ts` contiene contratti e validazione URI/CDN. Il main conserva
la preferenza dispositivo nel profilo locale e gli scope nei token cifrati Spotify;
endpoint della libreria paginati e separati dal player. Artwork e metadata non
sono persistiti. `public/music/` contiene il wordmark ufficiale con attribuzione.
[Flusso e limiti](docs/product/musica-ui-2026-10-15.md).

Il vocabolario ha un campo unico per parole e frasi; le traduzioni locali sono
serializzate e ripartono da IT → EN a ogni apertura. `ToolSettingsContext`
collega vocabolario e musica alle sezioni di `SettingsModal` senza perdere la
bozza. `OfflineTranslationSettings` e `useOfflineTranslationStatus` gestiscono
modelli opzionali e osservazione dei download locali in corso, sostituendo la
precedente scheda `PhraseTranslator`. `musicPreferences` conserva soltanto
sorgente e tipo/pagina della libreria Spotify; il servizio player resta unico.
Il compositore Q&A controlla la disponibilità della selezione nel PDF.
