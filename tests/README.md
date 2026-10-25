# Test

Aggiornamento del 23 ottobre (D-0400–D-0407): 739 Vitest in 56 file.

`node tools/benchmark_course_rag.mjs --study-questions --semantic` esegue gli
otto casi realistici sintetici; senza il flag resta il benchmark storico di
22 casi. `node tools/run_course_rag_private_local.mjs --study-questions`
ispeziona 32 varianti sulle fonti reali: richiede autorizzazione e conserva
gli estratti soltanto in local-artifacts, senza chiamate Gemini. Entrambi
misurano recupero, non correttezza delle risposte generate. Regressioni su
vincoli ereditati, copertura tra lezioni, originale exam in inglese, ricerca
riformulata e avvisi mai parlato nelle suite courseRagArchitecture/Maintenance.

Le regressioni successive al RAG coprono risposte Spotify 200 vuote per tutti
i comandi, JSON malformato nelle letture e dati reali collusion/collusione.
`--study-pause-only` verifica il limite esatto di cinque minuti, continua,
rientro e rimozione del testo della pausa scaduta. `--dictionary-only` copre
Ctrl+T con selezione IT/EN, apertura prima della traduzione e fallback anche
con suggerimenti. `--music-only` combina i controlli Spotify con un vero loop
Web Audio su WAV sintetico silenzioso; il confine account Spotify è simulato.
`node tools/run_offline_translation_regressions.cjs` usa modelli già presenti
per quattro prove WASM reali: frasi protette e parole singole nelle due lingue.
`courseRagMaintenance.test.ts` copre ripresa, cache corrotta, ENOSPC simulato,
priorità, conservazione dei backup/citazioni, schema malformato, numerazione,
istruzioni ostili e controlli parziali. `courseRagPdfLayout.test.ts` usa PDF reali
sintetici multicolonna, tabella e pagina grafica. Il gate pubblico
`node tools/evaluate_course_rag.mjs --gate` entra in CI senza modello o API.
I collaudi semantici espliciti richiedono i pesi locali e falliscono se mancanti;
`check_semantic_cancellation.mjs` verifica il crash nativo corretto.
`check_packaged_rag.mjs` verifica il vero eseguibile in profilo temporaneo:
`--download-model` scarica esplicitamente solo pesi pubblici, `--corrupt-model`
è un controllo negativo atteso. Il runner remoto della giornata ha consumato
59 dei 60 invii autorizzati: non azzerare il contatore, non confondere questo
budget con il precedente runner sintetico e non ripetere chiamate non necessarie.
[Uso, risultati e limiti](../docs/product/rag-completamento-2026-10-23.md).

Aggiornamento del 22 ottobre: `--october22-only` esegue tastiera nativa, Q&A
Media/bozza/ritorno al focus, contrasto in entrambi i temi, Focus Lock 100/200%,
copia protetta e fuori fascia, chat lunga e scelta esplicita per i corsi nuovi.
Incluso nella suite completa. Le regressioni RAG coprono JSON invalido,
citazioni non inviate, fallback e retry senza duplicare la domanda; quelle
GitHub coprono esclusione, cambio consenso durante l'invio, commit locali
pendenti e migrazione senza ricifrare credenziali.

`node tools/run_course_rag_real.cjs --end-to-end` è **opzionale e invia a Gemini**:
richiede autorizzazione esplicita, legge le chiavi configurate in memoria e usa
solo fonti sintetiche. Il contatore locale per questa sessione limita a quattro
invii complessivi ed è già esaurito; non azzerarlo per ripetere una prova senza
un nuovo budget autorizzato. Non è incluso in `npm run check`.
Il collaudo non apre né modifica conversazioni personali. [Esiti e limiti](../docs/product/interventi-2026-10-22.md).

Aggiornamento del 21 ottobre: `studyCorrections.test.ts` verifica rettifiche
persistenti, riavvio, concorrenza e nuovi snapshot del timer;
`connectivity.test.ts` copre offline prima di generazione/upload/polling e
rete persa senza fallback, `soundShuffle.test.ts` i giri casuali senza ripetizioni.
`--today-only` include ora CSS Q&A caricato per ultimo, Breve/Lunga persistente,
Memo piatto con appunti conservati e dialogo Togli tempo. `--study-pause-only`
verifica sospensione Memo e conservazione della pausa esplicita;
`--dictionary-only` controlla frasi lunghe e riquadri con caratteri uguali.

Aggiornamento del 20 ottobre: `node tools/run_hook_regressions.cjs --today-only`
verifica zoom/larghezze Q&A, consenso al contesto, riapertura tra lezioni,
Memo Invio/Esc/focusout, emoji batteria e fullscreen, catalogo/download e
rendering del Fictitious Play. Incluso nel runner completo. Le regressioni
unitarie coprono opt-in nel servizio, estratti pertinenti e limiti, prompt,
soglia batteria, integrità e download parziali; il PDF reale include il caso
Mermaid completo. Gli audio pubblici eventualmente presenti in
`local-artifacts/today-sounds/` sono decodificati e verificati anche con Web Audio,
senza renderli necessari alla CI. [Esiti e limiti](../docs/product/interventi-2026-10-20.md).

Il test di estrazione PDF.js reale in `unit/courseRag.test.ts` ha un budget
specifico di 30 secondi per l'avvio a freddo del worker nei runner Windows
condivisi. Le asserzioni su testo e pagine e il timeout globale restano
invariati. [Timeout CI osservato e collaudi Node 22](../docs/quality/pubblicazione-github-2026-10-19.md).

Aggiornamento del 19 ottobre (D-0367–D-0370):
`node tools/run_hook_regressions.cjs --memo-logs-export-only` esegue anteprime
Memo con attesa e rotella, finestre strette, modale PDF e selezioni, log per
giorno con errore/riprova e corse asincrone dei suoni offline. Incluso anche
nel runner completo. `appLogDays.test.ts` misura i byte letti, date locali,
riavvio, pulizia e righe corrotte; `ambientLoopPlayer.test.ts` verifica inviluppi
complementari e arresto. Il test PDF reale include la selezione parziale e il
nome suggerito oltre alle pagine Note. [Esiti e limiti](../docs/product/memo-log-pdf-transizioni-2026-10-19.md).

Revisione del 15 ottobre: `unit/archivePipelinePanel.test.ts` distingue ENG
non richieste, in attesa, fallite/bloccate e quota con ripresa esplicita;
`archivePipeline.test.ts` copre import ITA seguito dal completamento manuale
delle sole ENG mancanti. `dictionary.test.ts` verifica «trascrivi» sui dati
reali, provenienza della voce aggiunta, forme italiane e ambiguità; lo scenario
Electron copre modalità automatica e manuale. `reading-position-only` esercita
anche il comando Mermaid collettivo della vera FocusWorkspace, tastiera,
stati misti, SVG, punto letto, cambio lezione e isolamento della discussione.
La suite completa verifica il pulsante PDF ordinario per ITA/ENG e assenza di
dispensa senza entrare in Focus né avviare traduzioni.

- `unit/`: suite Vitest deterministica per backend, persistenza, parsing, ricerca, prompt e utility UI.
- `python/`: regressioni offline della pipeline Gemini Transcribe (metriche, checkpoint, merge, validazione e fallback), estrazione Q&A conservativa e journal privo di testi privati.
- `integration/`: scenari React eseguiti in Electron e collaudi remoti opzionali.
- `node/`: regressioni offline del runner Q&A Groq/Cloudflare, senza credenziali
  personali o richieste di rete; fixture sintetiche in `fixtures/qna-benchmark/`.

`unit/publishing.test.ts` verifica la pubblicazione GitHub con dati sintetici,
filesystem temporaneo e runner Git simulato: non esegue Git, push reali o rete.
Include dispense ITA/EN, traduzioni aggiunte o corrette, README per data,
migrazione dei vecchi percorsi, conservazione dei file estranei e retry delle rimozioni.

`unit/geminiAudioOwnership.test.ts` verifica caricamenti audio per chiave,
rotazione tra progetti, 403 strutturati, pulizia e diagnostica con client
Gemini sintetici e rete bloccata.

`unit/translationIntegrity.test.ts` verifica la traduzione dell'intera dispensa
con client sintetici: confini delle sezioni, risposta completa, formule, codice,
Mermaid, riquadri e rifiuto di omissioni/duplicazioni/riordini strutturali senza
retry automatici. La fixture lunga ha 12 sezioni e 6.000 paragrafi. Un caso
documenta il limite sulle omissioni di prosa con struttura invariata.
`translationPlan.test.ts` verifica la risposta JSON dei soli frammenti di prosa,
il reinserimento locale di formule ripetute e codice, gli spazi ai bordi,
le etichette Mermaid e il rifiuto di frammenti mancanti, duplicati, vuoti o
alterati. Il caso senza prosa blocca esplicitamente la rete e verifica che
non venga invocato il gestore AI. Il collaudo reale separato e autorizzato
è documentato in `docs/quality/integrita-eng-indagine-2026-10-19.md`.
`archive.test.ts` controlla la conservazione di inglese precedente e fonti
dopo errore e il successivo retry esplicito. Nessuna chiamata Gemini reale.

Comandi principali:

Il collaudo PDF richiede la build e usa solo lezioni sintetiche con il renderer
di produzione, senza AI o libreria personale. Il collaudo degli hook avvia anche
un secondo processo Electron con lo stesso profilo temporaneo per verificare
la ripresa della lettura di dispense e slide dopo un vero riavvio.

`test:pdf-export` confronta anche l'ingombro di Mermaid piccoli, verticali e
larghi con le precedenti regole sullo stesso SVG. Verifica proporzioni,
riduzione dello spazio, caratteri almeno 8 pt nelle fixture del renderer e
codice di fallback completo oltre il vecchio limite di 260 px. Impostando
un profilo di stampa dedicato verifica inoltre flowchart troppo larghi e
ramificati e sequenze con messaggi lunghi; PDF.js controlla etichette e font
di almeno 8,5 pt nel PDF adattivo reale. Con
`LEZIONIFY_PDF_EXPORT_TEST_DIR` conserva i cinque PDF sintetici e
`diagram-layout.json` nella cartella scelta per il controllo visivo e delle
dimensioni effettive stampate. Senza variabile elimina i propri temporanei.
PDF.js verifica inoltre una pagina Note per ogni lezione, incluso l'ultimo
elemento e le dispense mancanti, senza pagine involontariamente vuote.

`tests/unit/lectureTitles.test.ts` copre rinomina IT/EN, persistenza, rigenerazione
e rollback. `npm run test:hooks -- --lecture-list-only` verifica anche l'editor
dei titoli nei quattro filtri, F2, focus, errori/riprova e lingue indipendenti.

```powershell
npm test
npm run test:benchmark
npm run test:hooks
npm run test:hooks -- --reading-position-only
npm run test:hooks -- --study-pause-only
npm run test:hooks -- --language-shortcut-only
npm run test:hooks -- --dictionary-only
npm run test:hooks -- --focus-pdf-only
npm run test:hooks -- --music-only
npm run build
npm run test:pdf-export
```

Il filtro `--reading-position-only` esegue la ripresa della dispensa e la
chiusura/riapertura indipendente dei Mermaid in Focus, con input nativo
Invio/Spazio, SVG conservato e punto di lettura stabile. Non avvia il secondo
processo per il riavvio; quello resta incluso nella suite completa.

Il filtro `--study-pause-only` esegue il caso di una pausa di 5 minuti
prolungata a 30 con orologio controllato e React reale in Electron: scadenza,
focus del pulsante conservato, finestra nascosta/ritorno, interazioni ordinarie,
ripresa esplicita con pulsante o Esc, sospensione durante lo studio e uscita
dalla pausa. Controlla sessione, totale della lezione e snapshot salvati senza
contare il tempo della pausa; usa solo dati sintetici e nessuna chiamata AI.
Lo stesso scenario e' incluso nella suite completa.

`--study-pause-only` include anche `runFinalLectureScenario`: ritorno dopo
2 secondi dall'ultima marcatura completata salvata, richieste duplicate,
lezioni precedenti ancora aperte, altri corsi, riapertura, errore e risposte
tardive, annullamento al cambio stato/selezione e smontaggio. La suite completa
verifica inoltre l'avviso nel drawer ordinario e Focus, l'uscita fullscreen
senza Focus Lock e la sessione salvata senza duplicati.

Il filtro `--language-shortcut-only` invia Ctrl+L nativo a Electron e usa
fullscreen HTML reale, confrontando tastiera/pulsante lingua, testo selezionato,
focus sulle slide PDF e campi editabili. Apre brevemente una finestra di test
con profilo temporaneo; non usa la libreria personale. Il filtro è separato
dalla suite completa. Il PASS non chiude il caso personale non riprodotto;
stato e limiti in `docs/quality/ctrl-l-diagnosi-2026-10-16.md`.

Il filtro `--dictionary-only` verifica riconoscimento IT/EN, ambiguità e assenze,
locuzioni e flessioni, inversione manuale e ritorno all'automatismo, Focus,
risposte obsolete, errore di un solo dizionario e retry. Usa fixture sintetiche
senza rete; i test unitari consultano anche i due dizionari reali inclusi.
Non avvia il secondo processo di riavvio. È incluso nella suite completa.

Aggiornamento priorità 1–5: `--dictionary-only` include il campo unico con
parole/frasi, reset IT → EN, inversione, serializzazione e scarto delle bozze
obsolete. `--focus-pdf-only` verifica selezione assente in lettura, attivazione
dal campo domanda vuoto, passaggio al PDF e chiusura dopo invio da tastiera,
oltre alle regressioni di lettura del PDF reale. `--music-only` include
continuità di sorgente e sezione/pagina Spotify, timestamp nelle Impostazioni,
modelli assenti, download esplicito, ritorno alla bozza e download ancora in
corso dopo un rimontaggio. Il controller Focus reale verifica che Esc nelle
Impostazioni non chiuda la lezione. Tutte le risposte esterne sono simulate.
Il launcher stampa checkpoint con nomi fissi di scenario e concede 180 secondi
alla suite Electron ampliata; i filtri non avviano il secondo processo.

`unit/videoImport.test.ts` esegue FFmpeg incluso su video sintetici MP4/MKV/WebM
con codec, FPS, risoluzioni, durate, canali e frequenze diversi. Verifica anche
l’ordine reale dei toni, fonti immutate, annullamento, errori, duplicati e rollback.
`integration/videoImportScenarios.browser.tsx` aggiunge tre scenari al collaudo
React/Electron: riordino e scorciatoia con retry, conversione fallita, annullamento
con risposta tardiva. Non usa video personali, credenziali o richieste AI.
Impostando `LEZIONIFY_VIDEO_SCREENSHOT_DIR` il launcher salva facoltativamente
tre schermate sintetiche per il controllo visivo in una cartella locale ignorata.

`npm run test:qna-real` utilizza la configurazione cifrata dell'app e contatta Gemini. Non viene eseguito in CI e deve usare soltanto dati sintetici.

`npm run test:qna-benchmark` controlla stream SSE frammentati, UTF-8, delta
numerici, usage, budget, cancellazione reale, timeout, troncamenti, errori,
oscuramento dei segreti e corpus. `npm run benchmark:qna -- --suite pilot`
prepara solo il piano del run; aggiungere `--live` per contattare Groq e
Cloudflare usando le tre variabili del `.env` locale escluso da Git.
Il runner non contatta Gemini e non legge la libreria di lezioni.

Per riprendere usare lo stesso `--run <nome>` e la stessa suite/configurazione.
Un hash impedisce di mescolare misure ottenute con codice o fixture diversi.
Le prove con risultato già salvato non vengono reinviate; i consumi riservati
prima dell'invio restano conteggiati anche dopo un'interruzione.
Risultati, checkpoint e ledger sono in `local-artifacts/qna-benchmark/`.
Il fingerprint attuale include anche orchestrazione e helper di checkpoint.
I benchmark storici precedenti alle modifiche richiedono nomi nuovi per i
futuri live run. Le risposte salvate prima del risultato vengono recuperate;
una prenotazione senza checkpoint è ambigua e viene saltata. Il cap dei
tentativi considera anche le riserve del run. Dopo una pausa la sessione
mantiene l'intervallo minimo, senza recuperare le domande scadute in una raffica.

Per il replay privato, `tools/qna_prepare_private.py` legge solo libreria,
Q&A e Markdown, senza modificarli o aprire le impostazioni. Richiede selezioni
esplicite `--pick <indice-file-ordinato>:<indice-thread>` e salva il corpus solo
negli artefatti locali. `--context document` usa la dispensa attuale completa;
il flag originale del contesto non è persistito. Il runner distinto
`tools/qna_replay_private.mjs --run <nome> --live` legge quel corpus e usa lo
stesso ledger/lock, senza trattare le risposte precedenti come gold. Il filtro
`--candidates cloudflare-qwen` limita esplicitamente la prova a un candidato;
`--wait-lock-minutes 70` accoda il lavoro entro un'attesa massima, con chiavi
solo in memoria e nessuna richiesta mentre un altro runner possiede il lock.

I test Node includono privacy del prompt, storico e modalità di contesto;
i test Python aggiungono estrazione conservativa e journal senza testi privati.
`python tools/qna_research_snapshot.py --run <nome>` appende il giornale di
metriche/errori, senza credenziali, domande o risposte. Rifiuta run invalidati.

`npm run test:hooks -- --reading-restart-only` isola il collaudo della ripresa
PDF/Markdown nei due processi Electron, senza sostituire il collaudo completo.

`unit/sectionAlignment.test.ts` verifica corrispondenze dei capitoletti numerati,
identici o tradotti con struttura compatibile, ripetizioni, riordini e assenze.
Il filtro `--reading-position-only` include 12 capitoletti di lunghezze diverse,
punto interno IT/EN, precedenza sul segnalibro vecchio, rimontaggio, ripiego
percentuale e isolamento per lezione con entrambi i contenitori di scroll.
La suite completa collauda anche il pulsante e Ctrl+L nella vera LectureDrawer,
sia ordinaria sia in Focus. Tutte le fixture sono sintetiche e senza rete.

`unit/markdownMath.test.ts` riproduce il blocco `aligned` multilinea con
delimitatori aderenti che inglobava il resto della lezione. Verifica il rendering
ReactMarkdown/GFM/KaTeX, titoli e testo successivi, idempotenza, CRLF, codice ed
escape preservati. `npm run test:hooks -- --math-rendering-only` esegue lo stesso
caso nel viewer React in Electron, nei contenitori ordinario e Focus, senza il
secondo processo. Lo scenario è incluso nella suite completa; `test:pdf-export`
verifica anche la formula e il finale nel renderer di stampa di produzione IT/EN.


## Blocco approvato del 15 ottobre

`unit/qnaImages.test.ts`: snapshot immutabili, proprietà thread/lezione, limiti,
integrità, cancellazioni, riapertura e compatibilità dei thread precedenti.
`integration/qnaImageScenarios.browser.tsx` e PDF.js reale verificano selezione,
PNG indipendenti dal viewport, follow-up, rollback, anteprime e raccolta immagini.

`unit/offlineTranslation.test.ts`: segmenti protetti e nessun download implicito;
`unit/spotify.test.ts`: PKCE con callback HTTP loopback reale e provider sintetico,
refresh serializzato, selezione computer, errori e pulizia del backup cifrato.
`unit/music.test.ts`: sei video, 54 tracce e validazione delle correzioni.
`integration/musicTranslationScenarios.browser.tsx`: interfacce frasi, Spotify e
compilation con persistenza, invii espliciti ed errori; schermate opzionali chiare/scure.

`node tools/run_offline_translation_regressions.cjs` usa i modelli pubblici già
scaricati dai piloti in local-artifacts; non scarica nulla. Verifica due direzioni
con WASM reale e letterali conservati. Ripetibile con `npx electron` e con percorso
runtime come terzo argomento, per provare gli asset nella directory pacchettizzata.
I modelli opzionali non sono richiesti alla CI ordinaria. `unit/balanceAlarmPrototype.test.ts`
verifica solo il nucleo con adattatori simulati, non un collegamento al watch.


La politica Q&A rapida è coperta in `unit/qnaRequest.test.ts`: Flash-Lite come
primo modello, chain senza duplicati, empty/timeout/404/503, fallback con identici
payload immagini e contesto, budget esaurito e stop dopo stream parziale o blocco
del provider. `unit/archive.test.ts` verifica gli stati connecting/rotating/fallback
e che il modello configurato per le dispense non venga modificato dal Q&A.


`npm run test:hooks -- --music-only` collauda la UI musica senza il secondo
processo di ripresa lettura. Copre lettura automatica, computer selezionato senza
trasferimento implicito, polling e cleanup, consenso separato, schede, comandi,
errori e correzioni YouTube persistenti. Le immagini pubbliche nei test sono
sostituite da SVG sintetici nel protocollo HTTPS Electron: nessun accesso a CDN
o account reali. Screenshot opzionali con LEZIONIFY_VIDEO_SCREENSHOT_DIR,
inclusi music-light/dark e music-youtube-light/dark.

## Catture raggruppate e studio residuo (17 ottobre 2026)

`tests/unit/quickCaptureGroups.test.ts` verifica formato storico, copie,
validazione dei riferimenti e persistenza su disco dopo un nuovo servizio.
`tests/unit/studyEstimate.test.ts` verifica scorse, soglie, buchi, tempo nel
Q&A, riletture, sospensione, ripresa e invalidazione dei campioni.
`tests/integration/studyToolsScenarios.browser.tsx` esercita i componenti React
e gli hook in Chromium con tempo controllato. È incluso nella suite completa;
per isolarlo: `node tools/run_hook_regressions.cjs --study-tools-only`.
La prova non usa dati personali o chiamate AI e non equivale a una validazione
motivazionale su lezioni reali. Uso e limiti nel documento prodotto del 17 ottobre.

## Orari audio, Musica e comandi Memo (21 ottobre 2026)

`tests/unit/lectureRecordingTimes.test.ts` copre orari mancanti, dati non validi,
fine calcolata e passaggio del giorno. `interfacePolishScenarios.browser.tsx`
esercita sidebar con pagina lunga e molti corsi, viewport bassa/ridotta,
Memo adattabile, menu, cancellazione conservativa e salvataggio. Invocazione
mirata: `node tools/run_hook_regressions.cjs --interface-polish-only`;
è inclusa anche nella suite completa. `todayScenarios` verifica gli orari nel
drawer reale. Schermate sintetiche opzionali con la variabile già esistente
`LEZIONIFY_VIDEO_SCREENSHOT_DIR`. Nessuna libreria personale o chiamata AI.

## Chat RAG del corso (17 ottobre 2026)

`tests/unit/courseRag.test.ts` verifica ricerca, sincronizzazione, persistenza,
conteggi e azioni AI attraverso il modulo pubblico con fonti sintetiche.
Comprende il worker PDF.js reale con un PDF testuale/grafico costruito nel test.
`tests/integration/courseChatScenarios.browser.tsx` copre chat, bozze, fonti,
citazioni, apertura di pagina PDF, scelta e invio esplicito delle immagini,
conteggi e isolamento dei corsi. Il launcher verifica anche il worker Node
nel runtime Electron; usa l'asset emesso dalla build quando disponibile.

Scenario mirato: `node tools/run_hook_regressions.cjs --course-rag-only`.
Incluso anche in `npm run test:hooks`, con la ripresa dopo riavvio già prevista.
Il collaudo è sintetico: non usa la libreria personale, API Gemini reali o
download OneDrive. Limiti e controlli manuali nel documento prodotto RAG.

La suite `translationPlan.test.ts` verifica anche nove dettagli sanitizzati del
rifiuto JSON: formato, sezioni, frammenti, tipo, vuoto iniziale o dopo la
rimozione di copie e chiavi duplicate, senza contenuti della risposta.

D-0364: geminiPhaseB e archive verificano progetti legacy non identificati, sospensione giornaliera limitata alla chiave provata, RPM e cooldown condivisi, gruppi espliciti, duplicati e riordino, limite assoluto di sei invii e fallback ENG senza Lite automatici. Cinque nuove regressioni; suite completa 615/615 test. Prove reali e replay in docs/quality/integrita-eng-indagine-2026-10-19.md.
### Recupero Mermaid ENG — D-0366

La pipeline mantiene le etichette inglesi quando il diagramma conserva la
struttura; altrimenti recupera l'originale italiano. Quattro nuove regressioni
coprono diagrammi alterati, omessi, aggiunti e la conservazione degli altri
controlli. Suite completa: 619 test in 41 file; typecheck, lint mirato e build
verificati. Replay offline della risposta reale rifiutata alla sezione 28:
accettata con un solo diagramma originale recuperato, senza nuove chiamate AI.

## RAG: architettura e ricerca semantica locale

Regressioni: `npx --no-install vitest run tests/unit/courseRag.test.ts tests/unit/courseRagCompletion.test.ts tests/unit/courseRagArchitecture.test.ts --maxWorkers=2`.
Benchmark senza modello: `node tools/benchmark_course_rag.mjs`.
Download pubblico esplicito e prova locale: `node tools/run_course_semantic_local.mjs --download-model`.
Prova nel runtime desktop: `node tools/run_course_semantic_local.mjs --electron`.
Benchmark ibrido: `node tools/benchmark_course_rag.mjs --semantic`.
`node tools/run_course_rag_private_local.mjs` legge le fonti personali: eseguirlo
solo con autorizzazione dell'utente; risultati ed estratti restano in local-artifacts.
Piano, revisioni, metriche e limiti in docs/product/rag-implementazione-2026-10-22.md.
