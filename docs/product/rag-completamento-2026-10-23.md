# RAG: implementazione e verifiche del 23 ottobre 2026

Il pacchetto descritto qui è conservato nel backup. L'installer successivo
include lo stesso RAG e gli [interventi Focus, traduttore e Spotify](focus-traduttore-spotify-2026-10-23.md);
la ripresa seguente integra anche le [domande realistiche di studio](rag-domande-studio-2026-10-23.md).
Per l'impronta del setup finale da installare consultare quest'ultimo resoconto.

Richiesta diretta di controllare e attuare il lavoro residuo RAG entro le 14:00
Europe/Rome. Non è un comando LISTA_ORDINE: le altre attività della coda non
sono state avviate. Base D-0397–D-0399, autorizzazione di oggi in D-0400.
Consuntivo D-0401–D-0403, concluso prima delle 14:00.
L'utente ha autorizzato prove sulle fonti reali di tutti i corsi, fino a **60
invii fisici Gemini**, con il gestore esistente di quote/rotazione, e un nuovo
installer senza installazione nel profilo personale.

## Funzioni disponibili

In **Chat del corso → Fonti**:

1. **Scarica modello semantico locale** prepara esplicitamente i pesi pubblici.
   Il modello rimane opzionale. Non vengono inviati testi a Hugging Face.
2. **Prepara / riprendi indice locale** prepara tutti i passaggi del corso
   prima delle domande. Mostra progresso totale e per fonte; **Interrompi
   preparazione** conserva i vettori già scritti. Dopo riavvio un lavoro
   interrotto è in pausa: riparte soltanto con un comando esplicito.
3. **Spazio e derivazioni locali** misura modello, vettori condivisi e revisioni
   del corso. La pulizia conserva corpus attuale e corpus del backup; le
   citazioni storiche incorporano fonte ed estratto esatti. Svuotare i vettori
   di tutti i corsi rimuove solo derivazioni ricostruibili, a lavori fermi.
4. **Numeri delle lezioni** distingue riferimento stabile, numero ufficiale
   impostato esplicitamente e ordine cronologico corrente. Importazioni tardive
   e correzioni delle date non spostano i riferimenti già assegnati. I numeri
   riservati a lezioni non più presenti non vengono riutilizzati in silenzio.
   Un numero ufficiale già occupato viene rifiutato; i laboratori restano esclusi.
   I PDF esterni non associati non ereditano un numero dal solo nome del file.

La risposta include un controllo AI fallibile delle principali affermazioni,
con collegamenti ai passaggi, motivazioni, deduzioni/integrazioni distinte e
conflitti segnalati. Un controllo può chiedere **una sola correzione**, entro
il budget originale di 12 invii/10 minuti condiviso con la domanda. Ogni
singolo audit ha al massimo **3 tentativi e 90 secondi**: non consuma l'intero
budget tentando indefinitamente di verificare una risposta già disponibile.
Il renderer distingue controllo completato, parziale e non disponibile.

Il collegamento delle frasi tollera differenze di soli delimitatori Markdown,
LaTeX e spazi. Non normalizza negazioni, numeri, operatori o parole diverse.
Una frase non collegabile viene omessa dal giudizio, con conteggio visibile;
un ID di citazione inventato continua a far rifiutare l'audit. Questo controllo
verifica il collegamento, non dimostra l'entailment semantico.

Avvisi locali segnalano due errori osservati nei collaudi: interpretare un
**recap** come prima introduzione e trasformare **non trovato negli estratti**
in assenza nell'intero corso. Non riscrivono il contenuto come se fosse
certificato; indicano l'incertezza e rimandano alle fonti.

## Efficienza e ripresa

- Inferenza in un solo worker CPU, due thread intra-op e uno inter-op; lotti di
  otto passaggi e precedenza alle domande rispetto al lotto di fondo successivo.
- Ogni finestra di 384 token viene elaborata: un blocco lungo non perde
  silenziosamente la parte oltre i primi 512 token. I vettori delle finestre
  sono mediati e rinormalizzati; la politica di cache è `v4-window384-mean`.
- Cache per contenuto, modello, revisione e politica di pooling. Massimo 2.048
  vettori in memoria; cache corrotta/dimensioni o norma non valide vengono
  ricostruite. Gli errori di spazio e permessi conservano il lavoro riprendibile.
- Checkpoint atomico per lotto; il completamento è esposto soltanto dopo la
  persistenza. Una fonte modificata durante il lavoro produce stato da aggiornare.
- Gli aggiornamenti del progresso sono limitati a uno al secondo. Durante il
  lavoro si riusa lo snapshot dell'archivio, evitando riletture complete per
  ogni evento; a fine lavoro la revisione viene ricontrollata su fonti fresche.

Il collaudo locale ha completato **4 corsi, 66 fonti e 2.205 passaggi**.
Una preparazione iniziale osservata di 506 passaggi ha richiesto circa **171 s**;
la ripetizione a cache calda circa **1–2 s**. I corpus successivi hanno riusato
vettori prodotti anche dalle altre prove: non sono quattro misure a cache
interamente vuota. Le 66 fonti e `library.json` risultano immutati.
Il processo Node ha raggiunto circa 700 MB RSS, inclusi runtime e modello;
non è un limite globale dell'app o una misura della memoria su ogni PC.

## Guasti riprodotti e correzioni

- **Annullamento ONNX:** due chiusure native osservate durante le prove reali;
  riproduzione offline ridotta a otto passaggi, inizialmente con uscita 1.
  `worker.terminate()` durante inferenza nativa chiudeva Electron. Ora l'attesa
  dell'utente viene interrotta, il lotto attivo termina normalmente e i messaggi
  del worker sono serializzati. Stessa riproduzione positiva dopo la correzione.
  Un lotto nativo realmente bloccato può richiedere il riavvio dell'app: la
  terminazione forzata non viene presentata come recupero sicuro.
- **Corpus mancante:** non viene più scambiato per un corso nuovo/vuoto. Hash,
  sorgenti, messaggi, citazioni e campi usati dal renderer vengono validati
  prima di restituire o riscrivere il profilo. Se manca il file principale ma
  esiste un backup valido, lo storico viene letto e conservato; il successivo
  salvataggio ripristina i metadati senza ripristini concorrenti fuori mutex. Test rosso poi verde per un
  messaggio con testo di tipo errato; originale conservato byte per byte.
- **Ripartenza dell'indice:** uno stato completato precedente poteva essere
  letto durante l'avvio del nuovo lavoro. Stato attivo e persistenza ora hanno
  un ordine coerente, coperto da regressioni e dal corpus personale.
- **Output reale:** caratteri di controllo invisibili nelle citazioni rifiutati;
  riferimenti opachi nel testo convertiti in numeri quando corrispondono agli
  ID dichiarati. I token di utilizzo restituiti dallo streaming sono conservati.
- **Quote dell'audit:** replay senza rete di quattro risposte salvate: tre ora
  collegabili, due delle quali parziali; la quarta mantiene il rifiuto perché
  conteneva ID non consegnati. Nessun testo è stato reinviato per questo replay.

## Benchmark pubblico del recupero

Nuove annotazioni da testi sorgente, prima di eseguire il recupero: **33 domande**,
15 fonti sintetiche, quattro corsi separati, trascrizioni/derivazioni,
laboratorio, IT/EN, formule, confronto, seguito, conflitto e assenza di evidenza.
**8 casi di calibrazione e 25 di verifica**; questi ultimi includono 20 positivi
e cinque negativi. Restano anche i 22 casi della base precedente.

| Configurazione, 25 casi di verifica | Recall@8 | Precision@8 | MRR@8 | nDCG@8 |
| --- | ---: | ---: | ---: | ---: |
| Lessicale attuale | 0,900 | 0,642 | 0,875 | 0,882 |
| Ibrida, coda semantica precedente | 1,000 | 0,551 | 0,950 | 0,963 |
| Ibrida, coda semantica selezionata | 1,000 | 0,650 | 0,950 | 0,963 |

La selezione mantiene candidati semantici sopra 0,25 e almeno il 75% del
massimo corrente, prima della fusione RRF (costante 30). È stata scelta sui
casi di calibrazione. Un filtro lessicale tentato è stato rimosso perché una
regressione esistente dimostrava perdita di una fonte utile trasversale.
Nessun reranker neurale aggiunto senza prova di beneficio.

Copertura dei confronti e vincoli di lezione rispettati. **3/5 negativi**
producono ancora candidati affini, sia nella base sia dopo la selezione:
una similarità non determina se esiste la risposta. L'astensione della
generazione viene valutata separatamente. Non si dichiara migliorata questa
metrica negativa. Il benchmark precedente mantiene recall 1 e MRR 0,9375.

I JSON contengono risultati per categoria, configurazione/revisioni e intervalli
bootstrap deterministici (1.000 campionamenti, seed 20261023). Per esempio la
precisione ibrida ha intervallo circa [0,517; 0,783]. Il campione è piccolo e
sintetico; non stima l'accuratezza su ogni domanda reale. Il gate CI senza
modello preserva il riferimento lessicale (recall almeno 0,85, precisione 0,60,
MRR 0,80, nessun confronto o vincolo perso). Il gate ibrido esplicito usa
recall 0,95 e MRR 0,90; nessuno dei due accetta un peggioramento oltre 3/5
negativi con candidati.

## Risposte reali e supporto delle affermazioni

**59/60 invii fisici avviati**, inclusi retry, audit e due invii interrotti
dalle chiusure native. Sei domande su quattro corsi, due esecuzioni per domanda:
**12 risposte conservate**, quattro delle quali su assenza di evidenza.
Il caso con carattere invisibile è conservato separatamente e sostituito da
una nuova risposta; anche una prova RL precedente è conservata come confronto.
Quattro prove aggiuntive del giudice con verdetti attesi hanno riconosciuto
**4/4** casi: tre affermazioni non supportate e una supportata.

Le annotazioni di pertinenza, completezza, supporto, condizioni e lacune sono
una **lettura preliminare di Codex**, non una valutazione umana indipendente.
Sono emersi limiti reali: affermazioni assolute con ipotesi omesse,
generalizzazione da una sezione specialistica, ambiguità di prima introduzione
e assenza estesa oltre gli estratti. Gli avvisi e i replay sono regressioni
concrete; non cancellano questi limiti né dimostrano che un giudice AI trovi
ogni errore. La gestione delle contraddizioni è coperta da fixture e UI,
non da un insieme reale annotato da persone.

Contatore e risposte restano in `local-artifacts/rag-completion-2026-10-23/`.
`quality-review.md` riunisce domande, risposte, estratti completi e campi per
revisione umana; `quality-review.json` distingue le sei dimensioni di giudizio.
`grounding-replay-summary.json` separa accettazione, omissioni e rifiuto atteso.
La telemetria restituita conteggia 295.482 token, ma alcune chiamate iniziali
non riportavano l'uso: il dato è parziale, non una fattura o una misura di costo.
Non è stato attivato alcun piano o modificata la configurazione delle chiavi.

## PDF, blocchi lunghi e OCR

PDF.js è verificato su PDF sintetici reali multicolonna, tabella e pagina
grafica senza testo. L'ordinamento delle colonne è prudente: richiede due
gruppi di paragrafi lunghi e mantiene l'ordine originale nei casi ambigui o
tabellari. Non garantisce layout arbitrari, formule come immagine o annotazioni.

Codice/formule oltre 4.400 caratteri sono suddivisi senza perdere testo non
vuoto e riportano il blocco strutturale originale e le sue posizioni. Offset
e contenuto restano esatti; il lettore indica che l'estratto è una continuazione.
Segmentazione `r3`, estrazione PDF `PDF-text-layout-v1` e politica vettori sono
versionate separatamente; citazioni storiche conservate.

Valutato Tesseract locale già installato, senza dipendenza aggiunta all'app:
tre immagini stampate sintetiche, due trascrizioni esatte, un simbolo alterato
nella notazione. Nessuna prova valida su scrittura a mano. **OCR automatico
non adottato**: testo OCR sperimentale e originali restano separati negli
artefatti ignorati; per scansioni e figure resta la scelta esplicita di pagine
da allegare a Gemini. La pagina non letta non viene dichiarata indicizzata.

## Installer e verifiche di consegna

Il setup è verificato con confronto build/ASAR, manifesto e backup,
e collaudo sul vero eseguibile Windows: modello assente, cache fredda/calda,
inferenza con rete negata dal worker, vettori corrotti, ripristino dei pesi,
migrazione legacy e worker PDF. Il controllo negativo con tokenizer corrotto
ha rifiutato esplicitamente il modello; il risultato atteso è registrato separatamente.
Anche il download esplicito dei pesi pubblici dal pacchetto è passato in un
profilo temporaneo vuoto, seguito da inferenza locale senza rete.
L'eseguibile di prova usa un profilo temporaneo nuovo e non legge credenziali.

Backup precedente: `local-artifacts/installer-backups/20261023-rag-completion/`.
Setup finale: `dist/Lezionify-Setup-0.1.0.exe`, senza installazione o pubblicazione.
Dimensione **294.212.024 byte**; SHA256
`3809e2e37b66b25fac190ea8d066c5d59eff40daa6e98da826c2a3fab85f84c5`.
**374 file della build identici nel pacchetto**, tre backup verificati,
manifesto SHA512 e blockmap coerenti. Nessun artefatto privato incluso.
Verificato anche il contenuto dell'EXE NSIS senza eseguirlo: otto file estratti
dall'archivio incorporato (ASAR, eseguibile, worker, ONNX e FFmpeg) hanno hash
identici al runtime collaudato.
Nel runtime finale: inferenza fredda 1188 ms e calda 8 ms
sul campione sintetico; non è il tempo di indicizzazione di un corso.
Il modello usato nei collaudi resta separato dal profilo personale: nell'app
installata va preparato esplicitamente dal pannello Fonti.

Gate finale: **725 test Vitest in 56 file**, typecheck, lint senza avvisi,
build, **24 Python**, **41 Node**, suite React/Electron con riavvio e PDF reali
positivi. Scenario RAG mirato aggiornato positivo. Un precedente giro completo
ha avuto un timeout I/O publishing mentre il packaging era attivo; riesecuzione
completa a packaging fermo positiva, senza allargare timeout o ridurre asserzioni.
I blocchi sandbox sulle rinomine sono stati verificati fuori sandbox.

## Comandi e ripresa

```powershell
node tools/evaluate_course_rag.mjs --gate
node tools/evaluate_course_rag.mjs --semantic --gate
node tools/evaluate_course_rag.mjs --semantic --baseline
node tools/check_semantic_cancellation.mjs
node tools/check_private_rag_index.mjs
node tools/replay_course_grounding.mjs
python tools/evaluate_rag_ocr_local.py
node tools/check_packaged_rag.mjs --download-model
node tools/check_packaged_rag.mjs --corrupt-model
node tools/check_packaged_rag.mjs
node tools/verify_nsis_payload.cjs
node tools/verify_installer.cjs local-artifacts/installer-backups/20261023-rag-completion --rag
```

Modello richiesto nei collaudi semantici: prerequisito assente significa errore,
non successo simulato. Il benchmark pubblico lessicale entra in CI senza
download, dati personali o API. I runner separano unità, pesi locali e prove
remote. Il runner remoto della giornata ha un limite persistente di 60: non
azzerare il contatore e non riavviarlo senza una nuova necessità autorizzata.
Il pilota OCR richiede Pillow e Tesseract già installati: non sono componenti
aggiunti all'app e il comando usa soltanto immagini sintetiche locali.

Restano da chiudere qualitativamente le voci **90, 91 e 92**: giudizi umani,
conflitti reali annotati, calibrazione del verificatore e miglioramento
dell'astensione/ridondanza semantica, con eventuale prova di reranker locale.
Non sono requisiti soddisfatti dalla sola presenza del codice. Le voci
**89 e 93–98** sono allineate dopo il gate. La 95 riguarda le classi testuali
supportate e la valutazione OCR descritta, non ogni scansione o scrittura a mano.
La prima attività LISTA_ORDINE
resta la 33, diagnosi Ctrl+L personale; nessuna altra voce è stata avviata.
