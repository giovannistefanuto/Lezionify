> Report di ricerca preesistente fornito al progetto, conservato come documento
> storico dell’11 settembre 2026. Le specifiche, i prezzi e le classifiche
> riportati sotto non sono stati ricontrollati durante la pubblicazione del
> 19 ottobre. Per i risultati effettivamente ottenuti da Lezionify consultare
> [il benchmark del progetto](gemini-transcription-benchmark-2026-09-11.md).

# Gemini 3.5 Transcribe: analisi esaustiva

### Specifiche ufficiali, benchmark indipendenti e riscontro della developer community — settembre 2026

---

## Sintesi

Gemini 3.5 Transcribe (lanciato il 26 agosto 2026) è la prima famiglia di modelli speech-to-text a marchio "Gemini" di Google, pensata per sostituire Chirp 3. Arriva in due varianti — **gemini-3.5-transcribe** (file audio) e **gemini-3.5-transcribe-live** (streaming) — con un Word Error Rate dichiarato del 2,6% e 4,0% rispettivamente, misurato da Artificial Analysis.

Incrociando documentazione ufficiale, model card, benchmark indipendenti e decine di segnalazioni reali di sviluppatori, il quadro che emerge è più sfumato del comunicato stampa:

- **I numeri di accuratezza sono reali e verificati** da Artificial Analysis, ma Google si presenta come "il modello speech-to-text più preciso di sempre" mentre in classifica occupa la **5ª-7ª posizione**, non la prima — battuto da Microsoft MAI-Transcribe-2, ElevenLabs Scribe v2 e altri.
- **La documentazione ufficiale è internamente incoerente** su almeno due punti verificabili: lo stato di maturità del modello (GA/Stable/Preview a seconda della pagina) e il numero massimo di speaker gestiti in diarizzazione (8 secondo una pagina, 3 secondo un'altra).
- **La community conferma i punti di forza dichiarati** (costo, velocità, pulizia del testo) ma segnala in modo ricorrente due limiti pratici: la modalità "Smart" può alterare il significato di frasi precise, e la diarizzazione oltre 2-3 speaker resta inaffidabile.
- **Sul forum sviluppatori ufficiale di Google** sono stati confermati almeno quattro bug reali nelle prime due settimane di vita del prodotto, incluso uno per cui il modello restituisce output vuoto pur fatturando i token audio in ingresso.

Di seguito l'analisi completa, sezione per sezione.

---

## 1. Cos'è Gemini 3.5 Transcribe

Google DeepMind ha annunciato Gemini 3.5 Transcribe il 26 agosto 2026 come parte della famiglia "Gemini 3.5 Audio", che comprende anche Gemini 3.5 Live Translate. Non è un modello generalista a cui si chiede "trascrivi questo audio" (come si potrebbe fare con Gemini 3 Pro o 3.7 Flash), ma un modello verticale, costruito sulle capacità audio di Gemini 3 Pro e ottimizzato specificamente per il compito.

Il prodotto è in realtà **due endpoint distinti** con limiti e prezzi diversi:

| | `gemini-3.5-transcribe` | `gemini-3.5-transcribe-live` |
|---|---|---|
| Uso previsto | Audio pre-registrato (file) | Streaming in tempo reale via WebSocket |
| API | Interactions API | Live API (BidiGenerateContent) |
| Durata massima | 1 ora (30 min se attivi diarizzazione o timestamp) | 10 minuti per sessione |
| Diarizzazione | Sì (con riserve, vedi §4.2) | No |
| Timestamp a livello di parola | Sì (ma può ridurre l'accuratezza, avviso di Google stesso) | No — solo timestamp a livello di frase/enunciato |
| WER dichiarato (Artificial Analysis) | 2,6% (inglese) / 5,04% (FLEURS multilingue) | 4,0% (inglese) / 5,50% (FLEURS multilingue) |

È già integrato in Gboard Rambler (Android, dispositivi selezionati), nell'app Gemini per macOS, in Google Antigravity, e — tramite la variante Live — in Search Live e Workspace (Gmail, Docs, Keep). Per Chrome l'integrazione è annunciata come "in arrivo".

---

## 2. Le specifiche ufficiali

### 2.1 Model Card (26 agosto 2026)

Dalla [model card ufficiale di Google DeepMind](https://deepmind.google/models/model-cards/gemini-3-5-audio/):

- **Architettura**: basato su Gemini 3 Pro (non è un modello ASR addestrato da zero, ma un fine-tuning/adattamento delle capacità audio del modello di punta).
- **Finestra di contesto**: fino a 96K token in ingresso (audio + testo) per entrambe le varianti Transcribe.
- **Output**: solo testo, fino a 32K token.
- **Cutoff di conoscenza**: gennaio 2025 — ereditato da Gemini 3 Pro. Per un modello puramente trascrittivo (non deve rispondere a domande sul mondo) ha poca rilevanza pratica, ma è un dettaglio che sorprende per un rilascio di agosto 2026.
- **Limiti noti dichiarati da Google stessa**: possibili allucinazioni ("hallucinations", limite generico dei modelli fondativi) e occasionale lentezza o timeout.
- **Frontier Safety**: nessuna Tracked/Critical Capability Level raggiunta; la valutazione si appoggia a quella già fatta su Gemini 3.1 Pro e Gemini 3.7 Flash.

### 2.2 Funzionalità dichiarate

- Riconoscimento automatico della lingua su **85+ lingue/locali**, con gestione del code-switching infra-frase.
- **Vocabolario personalizzato**: fino a 1.000 termini (risultati migliori sotto i 100), per marchi, gergo tecnico, nomi propri.
- **Diarizzazione**: etichette `spk_1`, `spk_2`, ecc.
- **Timestamp a livello di parola** (solo file, non streaming).
- **Smart transcription**: rimuove disfluenze ("ehm", ripetizioni), risolve autocorrezioni pronunciate a voce ("ci vediamo martedì, anzi no, mercoledì" → "ci vediamo mercoledì"), formatta liste, date, numeri.
- **Verbatim** resta la modalità di default via API — riporta tutto parola per parola, incluse le disfluenze.
- Tre strategie di **Voice Activity Detection** per lo streaming: automatica (default), ibrida (VAD lato client + server per finalizzazione a bassissima latenza) e manuale (push-to-talk).

### 2.3 Limiti dichiarati esplicitamente da Google (non marketing, ma dalla documentazione tecnica)

Questi sono degni di nota perché è raro che la documentazione di un prodotto elenchi così chiaramente i propri compromessi interni:

- I timestamp a livello di parola **possono ridurre l'accuratezza complessiva** della trascrizione — avviso esplicito nei docs.
- **`custom_vocabulary` non è compatibile con diarizzazione né con i timestamp**: l'API rifiuta la richiesta con errore 400 se combinati.
- **Smart transcription non è compatibile** con timestamp o diarizzazione.
- Nello streaming, diarizzazione e timestamp a livello di parola **non sono disponibili affatto** — solo timestamp di enunciato.

### 2.4 Prezzi ufficiali

Dalla [pagina prezzi Gemini API](https://ai.google.dev/gemini-api/docs/pricing) (base di calcolo: 25 token audio/secondo in ingresso, 175 token testo/minuto in uscita):

| Modello | Input | Output | Tariffa effettiva (blended) |
|---|---|---|---|
| `gemini-3.5-transcribe` | $2,00 / 1M token (~$0,003/min) | $12,00 / 1M token (~$0,002/min) | **~$0,005/min** |
| `gemini-3.5-transcribe-live` | $3,50 / 1M token (~$0,005/min) | $21,00 / 1M token (~$0,004/min) | **~$0,009/min** |

Per confronto, il prezzo ufficiale di Google Cloud Speech-to-Text v2 (verificato direttamente su [cloud.google.com/speech-to-text/pricing](https://cloud.google.com/speech-to-text/pricing)) è $0,016/min per il riconoscimento standard in tempo reale (che scende a $0,004/min sopra i 2 milioni di minuti/mese), e $0,003/min per il livello "dynamic batch" a elaborazione differita. Gemini 3.5 Transcribe si posiziona quindi **sotto il prezzo standard di Google stessa**, ma non sotto il suo livello batch più economico.

---

## 3. Cosa dicono davvero i benchmark indipendenti (Artificial Analysis)

Qui inizia la parte di validazione/smentita richiesta: cosa regge e cosa no del confronto con i dati indipendenti.

### 3.1 I numeri di Google reggono?

Sì, sul dato puntuale: **confermato**. Ho verificato direttamente la [classifica Artificial Analysis per lo speech-to-text non-streaming](https://artificialanalysis.ai/speech-to-text/non-streaming) (aggiornata in continuo): Gemini 3.5 Transcribe segna **2,6% di WER**, **88,9x** di speed factor (elaborazione rispetto alla durata reale dell'audio) e **$5,00 per 1.000 minuti** (= $0,005/min) — cifra che coincide esattamente con quanto dichiarato da Google.

### 3.2 Ma la classifica reale non lo mette al primo posto

Qui la narrazione di marketing ("il nostro modello speech-to-text più preciso di sempre") va ridimensionata. Dalla stessa tabella Artificial Analysis, i modelli con WER più basso (quindi più accurati) di Gemini 3.5 Transcribe sul benchmark AA-WER non-streaming sono:

| Posizione | Modello | Provider | WER |
|---|---|---|---|
| 1 | Fun-Realtime-ASR-preview | — | 1,7% |
| 2 | MAI-Transcribe-2 | Microsoft | 2,0% |
| 3 | Scribe v2 | ElevenLabs | 2,2% |
| 4 | MAI-Transcribe-1.5 | Microsoft | 2,4% |
| 5 | Smallest AI Pulse Pro | Smallest.ai | 2,4% |
| =6 | **Gemini 3.5 Transcribe** | **Google** | **2,6%** |
| =6 | MAI-Transcribe-1 | Microsoft | 2,6% |

Più fonti indipendenti confermano questo posizionamento: sia [aixploria.com](https://www.aixploria.com/en/gemini-3-5-transcribe/) sia [intelligentliving.co](https://www.intelligentliving.co/gemini-35-transcribe-google-speech-text/) riportano che al lancio il modello occupava il 5° posto sulla classifica non-streaming, dietro a ElevenLabs Scribe v2 e Microsoft MAI-Transcribe-1.5. La posizione esatta oscilla (5ª-7ª) perché la classifica di Artificial Analysis è viva e si aggiorna quando arrivano nuovi modelli.

**Il confronto onesto**: Gemini 3.5 Transcribe è "il più preciso di sempre" rispetto alla propria storia (batte nettamente Chirp 3, fermo al 4,3% di WER sullo stesso benchmark, e la vecchissima Chirp originale al 31,2%), non rispetto al mercato nel suo complesso. È saldamente nel gruppo di testa, ma non è lo stato dell'arte assoluto.

### 3.3 Il confronto più interessante: modello dedicato vs. modello generalista

Un dato che vale la pena isolare: **Gemini 3.1 Pro Preview** (un modello di ragionamento generalista, non uno speech-to-text dedicato) ottiene un WER del 2,8% — praticamente alla pari con Gemini 3.5 Transcribe — ma con uno speed factor di appena **6,7x** contro 88,9x, e a un prezzo di $18,15 per 1.000 minuti contro $5,00. Questo conferma concretamente il valore di un modello verticale: l'accuratezza non migliora di molto rispetto a "chiedere a un LLM generico di trascrivere", ma la velocità aumenta di 13 volte e il costo scende a un terzo.

### 3.4 Streaming: il contesto competitivo

Per la variante Live la verifica indipendente è meno diretta: la pagina "streaming" di Artificial Analysis espone i dati tramite grafici interattivi e non una tabella testuale scaricabile, quindi non ho potuto estrarre la posizione esatta di Gemini 3.5 Transcribe Live con lo stesso livello di certezza della classifica non-streaming. Come riferimento di contesto, un [articolo Artificial Analysis di giugno 2026](https://artificialanalysis.ai/articles/new-streaming-speech-to-text-benchmark-aa-wer-streaming) (precedente al lancio di Gemini 3.5) indicava questi leader sull'accuratezza del "first partial" post fine-parlato: ElevenLabs Scribe v2 Realtime (3,65% WER, 0,13s di latenza), Cartesia Ink-2 (4,33%, 0,07s) e AssemblyAI U3 Realtime Pro (4,46%, 0,47s). Il 4,0% dichiarato da Google per la variante Live si collocherebbe quindi in una fascia competitiva ma verosimilmente non di testa — coerente con quanto riportato da uno sviluppatore su Hacker News (creatore del benchmark multilingue fliptalk.ai), secondo cui Gemini 3.5 Transcribe batte la concorrenza sull'accuratezza ma resta indietro sulla latenza rispetto a Soniox v5.

### 3.5 Un limite da tenere presente per qualunque benchmark

Vale la pena di segnalarlo esplicitamente: il benchmark AA-WER si basa su circa 8 ore di audio da tre dataset (AA-AgentTalk, VoxPopuli, Earnings22) — parlato prevalentemente in inglese, non specificamente pensato per riunioni rumorose, accenti misti o gergo tecnico di nicchia. Più fonti (incluso un confronto giapponese indipendente che ho consultato) e diversi sviluppatori su Hacker News notano che i numeri cambiano parecchio su audio reali — sale in ufficio con microfoni economici, conversazioni bilingue improvvisate, terminologia aziendale. Il posizionamento nella classifica è un'indicazione solida ma non una garanzia sul tuo caso d'uso specifico.

---

## 4. Le incoerenze interne alla documentazione ufficiale

Qui la ricerca ha trovato qualcosa che va oltre l'opinione soggettiva: contraddizioni verificabili tra pagine ufficiali Google.

### 4.1 Stable, GA o preview? Dipende da quale pagina apri

- Il [changelog ufficiale della Gemini API](https://ai.google.dev/gemini-api/docs/changelog) lo classifica come **"generally available (GA)"** al 26 agosto 2026.
- Il post di lancio sul blog Google lo descrive come **"in public preview"** sia per sviluppatori sia per aziende.
- La pagina dei modelli su Google Cloud / Gemini Enterprise Agent Platform usa ID modello con suffisso **"-preview"** (`gemini-3.5-transcribe-preview`, `gemini-3.5-transcribe-live-preview`).

Tre fonti ufficiali Google, tre etichette di maturità diverse per lo stesso prodotto. Il consiglio pratico che circola tra gli sviluppatori è di trattarlo come "production-adjacent ma non ancora del tutto assestato".

### 4.2 Diarizzazione: 8 speaker o 3?

- La [documentazione tecnica del modello](https://ai.google.dev/gemini-api/docs/transcribe) dichiara: "Speaker diarization supports up to 8 speakers. Speaker attribution for 3 or more speakers is experimental."
- Il [post di lancio](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/) parla invece di attribuzione affidabile "for up to three speakers", con il 3+ etichettato come sperimentale.

Le due frasi non sono tecnicamente incompatibili (si può leggere "fino a 8" come tetto massimo teorico e "3 o più è sperimentale" come soglia di affidabilità), ma la formulazione è ambigua e ha generato confusione — tanto che un blog specializzato ha esplicitamente segnalato la discrepanza consigliando di pianificare "intorno a tre, non a otto". La critica ricorrente della community (vedi §5.2) conferma che nella pratica la soglia di affidabilità reale è più vicina a 2-3 speaker che a 8.

---

## 5. Cosa dice davvero chi lo usa

La fonte più ricca di riscontro reale è il [thread di lancio su Hacker News](https://news.ycombinator.com/item?id=49468818) (363 punti, 127 commenti), dove decine di sviluppatori hanno testato il modello nelle prime ore/giorni e confrontato i risultati con la propria pipeline esistente. Ho integrato questo con il forum sviluppatori ufficiale di Google (sezione 6).

### 5.1 I punti di forza confermati dalla community

- **Qualità percepita alta per la dettatura**: chi lo usa come motore principale per dettare testo lo descrive come il miglior modello mai provato per accuratezza, latenza e formattazione — anche se va detto che questo specifico commento veniva da chi gestisce un prodotto di dettatura basato su Gemini, quindi non del tutto disinteressato.
- **Nessuna allucinazione riscontrata** su audio silenzioso o rumore puro, secondo un test approfondito condotto apposta da uno sviluppatore preoccupato che il modello ripetesse frasi a vuoto come faceva Chirp in condizioni simili — pur con una nota su un bug minore (un errore 403 sporadico esattamente dopo 20 secondi di silenzio).
- **Buon rapporto qualità/prezzo**: uno sviluppatore che gestisce un servizio di trascrizione di note vocali ha calcolato, sui propri dati reali, un costo di circa $0,12 per ora di audio contro $0,22 di ElevenLabs Scribe — giudicandolo conveniente se l'accuratezza si avvicina a quella di Scribe.
- Riscontri aziendali positivi citati da Google stessa (vivo, IntelliTek Health, Lingopal) su latenza, accuratezza e copertura linguistica — da leggere tenendo presente che sono testimonianze scelte dall'azienda per il proprio comunicato.

### 5.2 Le critiche più ricorrenti

- **La modalità "Smart" può cambiare il significato della frase, non solo ripulirla.** Il caso più citato: un utente ha testato ripetutamente la frase "ho esitato a controllarlo, avrei dovuto verificare" e la modalità Smart ha sistematicamente eliminato la prima parte, restituendo solo "avrei dovuto verificare" — perdendo la sfumatura che l'autore voleva comunicare. Non è un errore isolato: l'autore ha ripetuto il test più volte con lo stesso risultato.
- **Diarizzazione insufficiente per note di riunione**: la critica più ricorrente nel thread riguarda l'assenza di diarizzazione realmente affidabile oltre 2-3 persone, un'area in cui — secondo diversi commenti — Soniox e Deepgram fanno sensibilmente meglio.
- **Word Error Rate non cattura tutti i problemi pratici**: un utente Android segnala che il vero problema non è la percentuale di parole sbagliate, ma l'inserimento casuale di interruzioni di frase e la difficoltà a correggere il testo dopo, sulla tastiera mobile.
- **Rilevamento lingua non sempre affidabile**: uno sviluppatore riporta che, nei suoi test, lo svedese (sua lingua madre) veniva ripetutamente classificato come olandese dalla variante Live.
- **Confusione nella comunicazione di marketing**: il post di lancio menziona un "function calling" del modello di trascrizione che, secondo un'analisi dettagliata della documentazione tecnica, il modello Transcribe in sé non è in grado di eseguire — è una funzionalità dell'app Gemini che lo circonda, non del modello STT. Il fraintendimento ha generato diversi commenti confusi nel thread.
- **Una preoccupazione concettuale più ampia**, sollevata dal noto commentatore tecnico Simon Willison: se un modello di trascrizione è basato su un LLM, esiste il rischio che interpreti come istruzione un commento detto ad alta voce da chi parla (es. "anzi no, ignora quell'idea, facciamo così") anziché limitarsi a trascriverlo fedelmente — un rischio strutturalmente diverso da quello di un ASR classico.
- **Attrito nell'attivazione**: un utente segnala di aver atteso oltre 24 ore per l'attivazione del proprio account di fatturazione Google Cloud prima di poter testare il modello, un'esperienza che confronta sfavorevolmente con l'attivazione istantanea di gateway come OpenRouter.

### 5.3 Il confronto con i concorrenti secondo la community

Il quadro che emerge da Hacker News e da diversi confronti indipendenti è quello di un modello "solido ma non dominante": chi lavora con audio puliti e prevalentemente in inglese lo trova competitivo o migliore; chi lavora con audio multilingue misto, gergo tecnico o molti speaker tende a preferire alternative specializzate. Alcuni punti specifici:

- Diversi sviluppatori che testano riconoscimento vocale multilingue con code-switching (tedesco/italiano/inglese misti in riunioni aziendali) preferiscono ancora modelli locali come Voxtral Mini o servizi come ElevenLabs, e non avevano ancora testato Gemini 3.5 Transcribe su quello scenario specifico al momento del lancio.
- Whisper (soprattutto Large v3) mantiene un seguito fedele per via del costo zero in self-hosting e di pipeline già consolidate, nonostante numeri di WER peggiori sul benchmark Artificial Analysis.
- Un commento sintetizza bene la percezione di prezzo/prestazioni: più costoso e con prestazioni inferiori a ElevenLabs Scribe, con dubbi su quale sia il pubblico di riferimento — opinione non condivisa da tutti (vedi il calcolo costi sopra), ma rappresentativa di una frangia scettica.

---

## 6. Bug confermati sul forum sviluppatori ufficiale di Google

Google non ha una sezione pubblica dell'Issue Tracker per la Gemini API; il forum [discuss.ai.google.dev](https://discuss.ai.google.dev) (con staff Google che risponde attivamente) funge da equivalente. Ecco i problemi concreti e datati emersi nelle prime due settimane:

### 6.1 Trascrizione vuota, HTTP 200, zero token in output

**Segnalato il 28 agosto 2026.** Su tutti e tre i percorsi REST documentati (`:generateContent` con audio inline, `:generateContent` con file caricato, `/v1beta/interactions`), `gemini-3.5-transcribe` restituiva risposte HTTP 200 senza errore ma con output completamente vuoto — pur addebitando regolarmente i token audio in ingresso (138 token per 5,5 secondi di parlato, secondo il log allegato). Lo stesso identico file audio, passato a `gemini-3.5-flash-lite` con un prompt di trascrizione, restituiva il testo corretto senza problemi. Come workaround, l'autore consigliava proprio di usare `gemini-3.5-flash-lite` al posto del modello dedicato. Non risultano conferme pubbliche successive di una risoluzione.

### 6.2 `custom_vocabulary` ignorato silenziosamente in modalità "smart"

**Segnalato il 28 agosto, riprodotto da staff Google il 31 agosto 2026.** Un utente ha dimostrato con un test A/B (12 nomi inventati) che fornire `custom_vocabulary` non cambiava minimamente l'output in modalità Smart — byte-identico alla richiesta senza vocabolario. Lo staff Google (Pooja Kapse) ha confermato il problema e suggerito di verificare senza il parametro `mode`; l'autore ha confermato che il vocabolario personalizzato funziona "fino a un certo punto" solo in modalità verbatim, mentre in modalità Smart fallisce silenziosamente — un'interazione non documentata tra due funzionalità pubblicizzate separatamente.

### 6.3 Documentazione vs. API: vocabolario + diarizzazione + timestamp

**Segnalato il 31 agosto, risolto (a livello di chiarimento) il 1° settembre 2026.** La documentazione ufficiale mostrava un esempio di configurazione che combinava `custom_vocabulary`, `diarization_mode` e `timestamp_granularities` nella stessa richiesta. L'API rifiutava sistematicamente questa esatta combinazione documentata con errore 400. Lo staff Google (Ali Cevik) ha prima definito la cosa "un bug, arriva una correzione", poi ha corretto il tiro: si tratta di un'incompatibilità voluta e permanente, e sarebbe stata la documentazione a essere aggiornata (cosa che risulta fatta: la versione della documentazione che ho consultato per questo report riporta correttamente l'incompatibilità).

### 6.4 Sessioni Live che si bloccano silenziosamente

**Segnalato il 31 agosto 2026, ancora "in fase di indagine attiva" secondo l'ultima risposta pubblica del 2 settembre.** Con due sessioni simultanee di `gemini-3.5-transcribe-live` (stesso audio stereo sincronizzato, due progetti Google Cloud separati), una delle due sessioni smette in modo intermittente di restituire qualsiasi messaggio dal server — pur restando la connessione WebSocket aperta, l'invio di audio funzionante e nessun errore o codice di stato anomalo. Riavviare solo la sessione colpita risolve il problema. Lo sviluppatore ha escluso le cause più ovvie (lettura del campo sbagliato, VAD che filtra audio non vocale) fornendo un log dettagliato. Alla data di questa ricerca non risultano conferme pubbliche di risoluzione.

---

## 7. Verdetto complessivo

| Aspetto | Valutazione |
|---|---|
| Accuratezza assoluta (WER) | Solida, verificata indipendentemente, ma non allo stato dell'arte (5ª-7ª posizione, non 1ª) |
| Prezzo | Punto di forza reale — sotto il listino standard di Google Cloud STT e competitivo con gli specialisti |
| Velocità/latenza (file) | Ottima (88,9x lo speed factor in batch) |
| Latenza streaming | Competitiva ma non leader di categoria secondo i primi test indipendenti |
| Diarizzazione | Il limite più criticato — affidabile solo fino a 2-3 speaker, assente del tutto nello streaming |
| Smart transcription | Funzionalità distintiva ma rischiosa per usi dove la formulazione esatta conta (legale, ricerca, verbali) |
| Maturità/stabilità | Prodotto giovane: bug concreti confermati da Google stessa nelle prime due settimane, documentazione internamente incoerente su più punti |
| Ecosistema | Punto di forza unico — nessun concorrente è integrato così a fondo in tastiera, browser, Workspace e sistema operativo Android |

In sintesi: le specifiche ufficiali di Google reggono al confronto con i dati misurati da Artificial Analysis sui punti verificabili (WER, prezzo), ma la cornice comunicativa ("il più preciso di sempre") va ridimensionata alla luce della classifica reale. Il riscontro della community conferma un prodotto valido e conveniente per dettatura, trascrizione di singolo speaker e casi d'uso tolleranti a un margine d'errore, ma sconsigliato — almeno per ora — per trascrizioni multi-speaker ad alta affidabilità o per contesti dove la formulazione letterale non può essere alterata dalla ripulitura automatica.

---

## Fonti

**Documentazione ufficiale Google**
- [Model Card — Gemini 3.5 Audio (Google DeepMind)](https://deepmind.google/models/model-cards/gemini-3-5-audio/)
- [Audio transcription — Gemini API docs](https://ai.google.dev/gemini-api/docs/transcribe)
- [Live transcription — Gemini API docs](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)
- [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Changelog ufficiale Gemini API](https://ai.google.dev/gemini-api/docs/changelog)
- [Post di lancio — blog.google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5-transcribe/)
- [Gemini Enterprise Agent Platform docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-transcribe)
- [Google Cloud Speech-to-Text — pricing ufficiale](https://cloud.google.com/speech-to-text/pricing)

**Benchmark indipendenti**
- [Artificial Analysis — Speech to Text, non-streaming](https://artificialanalysis.ai/speech-to-text/non-streaming)
- [Artificial Analysis — Speech to Text, streaming](https://artificialanalysis.ai/speech-to-text/streaming)
- [Artificial Analysis — metodologia](https://artificialanalysis.ai/speech-to-text/methodology)
- [Artificial Analysis — annuncio benchmark streaming (giugno 2026)](https://artificialanalysis.ai/articles/new-streaming-speech-to-text-benchmark-aa-wer-streaming)

**Community e forum sviluppatori**
- [Thread di lancio su Hacker News (127 commenti)](https://news.ycombinator.com/item?id=49468818)
- [Forum sviluppatori Google — bug trascrizione vuota](https://discuss.ai.google.dev/t/gemini-3-5-transcribe-returns-empty-transcription-http-200-zero-output-tokens-on-all-documented-rest-paths/179937)
- [Forum sviluppatori Google — custom_vocabulary senza effetto](https://discuss.ai.google.dev/t/gemini-3-5-transcribe-custom-vocabulary-appears-to-have-no-effect/179892)
- [Forum sviluppatori Google — conflitto documentazione/API](https://discuss.ai.google.dev/t/gemini-3-5-transcribe-documented-custom-vocabulary-diarization-timestamps-configuration-is-rejected-by-the-interactions-api/180240)
- [Forum sviluppatori Google — sessioni Live bloccate](https://discuss.ai.google.dev/t/gemini-3-5-transcribe-live-sessions-stay-connected-but-silently-stop-returning-transcripts/180230)

**Analisi terze parti**
- [eesel AI — pricing, accuracy, and the real verdict](https://www.eesel.ai/blog/gemini-3-5-transcribe)
- [eesel AI — review: is it worth it?](https://www.eesel.ai/blog/gemini-3-5-transcribe-review)
- [AIxploria — recensione e alternative](https://www.aixploria.com/en/gemini-3-5-transcribe/)
- [Intelligent Living — analisi comparativa](https://www.intelligentliving.co/gemini-35-transcribe-google-speech-text/)
- [9to5Google — copertura del lancio](https://9to5google.com/2026/08/26/gemini-3-5-transcribe/)
- [MarkTechPost — copertura del lancio](https://www.marktechpost.com/2026/08/27/google-ai-releases-gemini-3-5-transcribe-a-speech-to-text-model-reporting-2-6-average-wer-across-85-languages/)

*Ricerca condotta l'11 settembre 2026. I benchmark di Artificial Analysis sono aggiornati in continuo: le posizioni esatte in classifica possono essere cambiate rispetto al momento di questa analisi.*
