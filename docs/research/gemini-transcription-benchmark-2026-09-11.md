# Collaudo trascrizione Gemini — 11 settembre 2026

## Obiettivo

Verificare se Gemini puo sostituire o affiancare Whisper Large-v3 nella trascrizione di una lezione tecnica, senza assumere che la trascrizione Large-v3 sia una ground truth perfetta.

## Ricerca preliminare

- Il modello appropriato e `gemini-3.5-transcribe`, dedicato allo speech-to-text. Supporta modalita verbatim, 85+ lingue, vocabolario personalizzato e file fino a un'ora: <https://ai.google.dev/gemini-api/docs/transcribe>.
- `gemini-3.8-flash` accetta audio ed e adatto alla comprensione multimodale, ma non e il modello ASR specializzato: <https://ai.google.dev/gemini-api/docs/audio>.
- Le quote Gemini sono applicate per progetto, non per chiave. La rotazione e quindi efficace fra chiavi associate a progetti distinti, non fra chiavi duplicate dello stesso progetto: <https://ai.google.dev/gemini-api/docs/rate-limits>.
- La strategia raccomandata per `429`, `408` e `5xx` e backoff esponenziale con jitter; errori permanenti come chiave invalida o richiesta errata non vanno ritentati allo stesso modo: <https://ai.google.dev/gemini-api/docs/troubleshooting>.
- I file caricati tramite Files API sono conservati al massimo 48 ore. Il benchmark tenta la cancellazione subito dopo ogni richiesta: <https://ai.google.dev/gemini-api/docs/files>.
- Nel Free Tier i contenuti possono essere usati per migliorare i prodotti Google; l'upload di audio reali deve quindi restare una scelta esplicita: <https://ai.google.dev/gemini-api/docs/pricing>.

## Metodo

- Audio: `test_whisper_lezioni.mp3`.
- Durata misurata dai frame MP3: 1.023,05 secondi, cioe 17 minuti e 3 secondi.
- Riferimento: `test_whisper_lezioni_OPENAI_LARGE_V3.txt`, scelto in coerenza con D-0103.
- Suddivisione: tre segmenti lossless da circa 5 minuti e 41 secondi, con due secondi di sovrapposizione per proteggere le parole sui confini.
- Modello: `gemini-3.5-transcribe`, modalita `verbatim`, lingua `en-US`, senza timestamp, diarizzazione o vocabolario ricavato dal riferimento.
- Chiavi: 15 credenziali cifrate recuperate dalle impostazioni locali e passate al processo Python solo via standard input.
- Metriche: WER, CER, similarita sequenziale e F1 bag-of-words, calcolate dopo normalizzazione Unicode e della punteggiatura.

## Risultati

| Metrica | Gemini 3.5 Transcribe |
|---|---:|
| Parole Large-v3 | 1.825 |
| Parole Gemini | 1.808 |
| Sostituzioni | 120 |
| Cancellazioni | 77 |
| Inserimenti | 60 |
| WER rispetto a Large-v3 | 14,082% |
| CER rispetto a Large-v3 | 9,292% |
| Similarita sequenziale | 89,623% |
| F1 bag-of-words | 92,486% |

Il test ha completato tutti i segmenti. Due richieste hanno ricevuto `429 RESOURCE_EXHAUSTED`; la pipeline ha letto l'attesa indicata dal server, messo in cooldown la singola chiave e proseguito con la successiva. I checkpoint sono stati scritti dopo ogni segmento.

Il confronto con `gemini-3.8-flash` non e stato completato: quattro progetti consecutivi hanno restituito `503 UNAVAILABLE` per domanda elevata e un progetto ha restituito `429`. Il test e stato interrotto senza perdita dei risultati gia completati del modello Transcribe.

## Lettura qualitativa

Gemini corregge diversi termini che nel testo Large-v3 sono quasi certamente errati nel contesto della visual servoing:

| Large-v3 | Gemini | Valutazione contestuale |
|---|---|---|
| `image zircobian` | `image Jacobian` | Gemini plausibilmente corretto |
| `two symmetric matrix` | `skew-symmetric matrix` | Gemini plausibilmente corretto |
| `endless matrix` | `LS matrix` | Gemini plausibilmente corretto |
| `results are going` | `visual servoing algorithm` | Gemini plausibilmente corretto |
| `laser` | `base` | Gemini plausibilmente corretto |
| `perspective transformator` | `perspective transformation` | Gemini plausibilmente corretto |
| `directories` | `directly this` | Gemini plausibilmente corretto |
| `standard chain` | `standard chain rule` | Gemini plausibilmente corretto |

Gemini non e tuttavia perfettamente verbatim: omette l'apertura `Do you try to verify this?`, perde `I don't know` e rende `a bit more` come `before tomorrow`. Produce anche frammenti grammaticalmente incompleti. Di conseguenza il WER del 14,08% sovrastima alcuni errori reali di Gemini, perche Large-v3 contiene errori tecnici, ma non puo essere interpretato come prova di superiorita assoluta.

## Conclusione

La soluzione e tecnicamente fattibile e `gemini-3.5-transcribe` e abbastanza promettente da meritare un secondo benchmark con una ground truth manuale di 3-5 minuti. Sul campione completo mostra maggiore competenza terminologica di Large-v3 in numerosi punti, ma conserva omissioni incompatibili con l'uso come fonte unica non revisionata.

Prima di sostituire Colab/Whisper, il passo decisivo e correggere manualmente un estratto difficile ascoltando l'audio e calcolare WER e accuratezza terminologica di entrambi contro quella ground truth. Il vocabolario personalizzato va poi costruito dal corso e dalle slide, non dalla trascrizione di riferimento, per evitare contaminazione del benchmark.

## Artefatti e ripresa

Gli output reali sono in `benchmark_outputs/gemini_transcription/`, esclusi da Git. Il launcher sicuro e `tools/run_gemini_benchmark_with_app_keys.cjs`; la pipeline e `tools/gemini_transcription_benchmark.py`.

Il comando completo e:

```powershell
npm run benchmark:gemini-transcription -- --audio local-artifacts/asr/2026-09-10/test_whisper_lezioni.mp3 --reference local-artifacts/asr/2026-09-10/test_whisper_lezioni_OPENAI_LARGE_V3.txt --chunks 3
```

Con `--print-texts` il comando stampa integralmente prima il riferimento e poi la trascrizione Gemini. Senza questa opzione i testi restano nei rispettivi file per evitare output terminale eccessivo.

## Test limite: audio intero in una richiesta

E stato ripetuto lo stesso benchmark inviando i 1.023,05 secondi e 23,42 MiB come un solo file a `gemini-3.5-transcribe`, sempre in modalita verbatim, lingua `en-US`, senza timestamp, diarizzazione o vocabolario derivato dal riferimento.

- La richiesta e riuscita al primo tentativo con la prima chiave, senza rotazione o rate limit.
- L'elaborazione remota ha richiesto circa 67 secondi; il benchmark completo, comprese metriche e scritture locali, circa 76 secondi.
- La trascrizione contiene 1.807 parole e arriva allo stesso punto finale dell'audio: non risultano troncamenti.
- L'output a uno e a tre chunk ha una similarita sequenziale diretta del 96,874%.

| Metrica | 3 chunk | 1 chunk | Differenza favorevole a 1 chunk |
|---|---:|---:|---:|
| Parole Gemini | 1.808 | 1.807 | -1 |
| Sostituzioni | 120 | 124 | -4 |
| Cancellazioni | 77 | 70 | +7 |
| Inserimenti | 60 | 52 | +8 |
| WER vs Large-v3 | 14,082% | 13,479% | 0,603 punti |
| CER vs Large-v3 | 9,292% | 8,523% | 0,769 punti |
| Similarita sequenziale | 89,623% | 89,813% | 0,190 punti |
| F1 bag-of-words | 92,486% | 92,401% | -0,085 punti |

Il vantaggio numerico deriva soprattutto da meno cancellazioni e inserimenti, mentre le sostituzioni aumentano leggermente e il lessico complessivo resta sostanzialmente equivalente. Il chunk unico recupera quasi tutta la frase iniziale (`You try to verify this?`), rende `image Jacobian`, `skew-symmetric matrix`, `LS matrix`, `visual servoing algorithm`, `base frame`, `perspective transformation` e `chain rule`, e non introduce discontinuita da ricongiungimento.

Restano errori reali: `a bit more` diventa ancora `before tomorrow`, `I don't know` viene omesso e alcune frasi sono grammaticalmente incomplete. Inoltre il test a tre chunk conserva in qualche punto parole brevi che il chunk unico perde, per esempio `for a point`. Il riferimento Large-v3 contiene a sua volta errori tecnici, quindi il piccolo miglioramento di WER non equivale a un miglioramento assoluto della fedelta.

### Esito operativo

Per audio compatibili con il limite del modello, il chunk unico diventa il candidato preferito per i prossimi collaudi: usa una sola richiesta invece di tre, elimina i rischi ai confini, ha completato questo campione senza retry e migliora moderatamente WER e CER. Il chunking resta necessario come fallback per file oltre il limite, errori persistenti sul file intero o esigenze di ripresa piu granulare. Prima di adottarlo nell'app servono almeno una ground truth manuale e una seconda lezione completa, idealmente piu lunga e con rumore diverso.

Gli output locali di questo test sono in `benchmark_outputs/gemini_transcription_one_chunk/`, esclusi da Git.

## Hardening successivo al test limite

La pipeline e stata rinforzata prima di usarla come possibile alternativa operativa a Colab:

- il chunk unico e ora il default e, se la richiesta viene rifiutata, la risposta risulta incompleta o ogni chiave incontra un errore transitorio, il programma riprova automaticamente con tre segmenti;
- la validazione anti-troncamento non accetta piu soltanto cinque parole: usa una soglia conservativa di 40 parole al minuto, configurabile con `--min-words-per-minute`, e nei benchmark non scende sotto il 50% delle parole attese dal riferimento per la durata del segmento;
- la deadline `--max-total-wait` comprende tempo di richieste, elaborazione remota e attese, ed e condivisa anche con il fallback;
- un checkpoint viene riutilizzato solo se firma di pipeline, prompt, modalita, audio, modello, lingua, vocabolario e policy di validazione coincidono e se l'hash del testo salvato e ancora corretto;
- il ricongiungimento elimina soltanto overlap testuali esatti, evitando che una somiglianza approssimata cancelli frasi legittime;
- oltre a WER e CER normalizzati, il report misura CER grezzo, errori di formattazione, punteggiatura, numeri e simboli;
- il riferimento Whisper e facoltativo: senza `--reference` il comando produce comunque una trascrizione validata, quindi puo essere usato come flusso autonomo;
- i client SDK vengono chiusi dopo ogni tentativo e il launcher gestisce anche la chiusura anticipata dello stdin senza stampare credenziali;
- le risposte parziali rifiutate vengono conservate con hash in file separati, ma non sono mai riutilizzate come segmenti validi;
- quattordici test Python offline coprono le regressioni principali e fanno parte del quality gate locale e della CI.

Il comando operativo minimo usa l'audio intero e non richiede un riferimento:

```powershell
npm run benchmark:gemini-transcription -- --audio percorso/della/lezione.mp3 --output-dir benchmark_outputs/nome-lezione
```

Il riferimento resta utile per un benchmark comparativo, ma Large-v3 non va interpretato come ground truth. La differenza osservata tra una singola esecuzione a uno e tre chunk resta indicativa: per stimare la variabilita del modello servono piu ripetizioni o una ground truth manuale.

## Collaudo su lezione OR completa da 87 minuti

La seconda lezione `OR 2025-1106-11-17-35.MP3` dura 5.222,48 secondi (87,04 minuti), quindi non puo essere inviata come chunk unico entro il limite documentato di un'ora. La modalita automatica l'ha divisa in sei pezzi cercando il punto piu silenzioso entro +/-60 secondi da ogni multiplo di 15 minuti. I punti scelti sono 926,55, 1.796,25, 2.697,35, 3.598,75 e 4.502,85 secondi. Ogni derivato e un WAV PCM indipendente, mono, 16 kHz e 16 bit, con due secondi di margine per lato; l'MP3 originale resta invariato.

I primi tentativi sui frammenti MP3 avevano prodotto risposte HTTP completate ma vuote. Il [report storico](gemini-35-transcribe-report-2026-09-11.md) ha permesso di collegare il sintomo a una segnalazione gia presente sul forum Google. La ripetizione con WAV ha escluso un errore generale della pipeline: i tre segmenti contenenti la lezione sono riusciti, mentre i pezzi di rumore prima e dopo la lezione hanno continuato a produrre output vuoto o soli eventi non vocali.

| Segmento | Intervallo audio | Esito | Parole accettate |
|---|---:|---|---:|
| 1 | 0:00-15:29 | rumore, nessun parlato secondo 3 chiavi | 0 |
| 2 | 15:25-29:58 | soli tag `cough`/`snort` o output vuoto secondo 3 chiavi | 0 |
| 3 | 29:54-44:59 | trascrizione valida al primo tentativo | 1.736 |
| 4 | 44:55-60:01 | trascrizione valida al primo tentativo | 1.572 |
| 5 | 59:57-75:05 | trascrizione valida al primo tentativo | 1.562 |
| 6 | 75:01-87:02 | rumore, nessun parlato secondo 3 chiavi | 0 |

Il risultato finale contiene 4.865 parole: cinque parole duplicate sono state eliminate grazie all'overlap esatto tra i segmenti 3 e 4. Le tre chiamate riuscite sui circa 15 minuti di lezione hanno richiesto all'incirca 28-33 secondi ciascuna. Il run WAV ha usato dodici chiavi distinte: tre successi e nove riscontri non vocali, senza `429`, chiavi invalide o errori di quota; le chiavi 13-15 non sono state usate. Gli otto tentativi MP3 precedenti restano archiviati nel checkpoint come audit separato.

La lettura manuale mostra un testo coerente con la lezione di Operations Research. Sono riconosciuti correttamente termini come `cutting plane`, `dual simplex`, `Gomory`, `Chvátal`, `Farkas`, `convex hull` e `floor function`, insieme a formule lineari espresse in testo. Non e pero una trascrizione perfettamente verbatim: compaiono frasi grammaticalmente incomplete, almeno un probabile `simplex` al posto di `CPLEX`, una grafia tronca di Chvátal e una chiusura sospesa (`However, if you are`). Senza riferimento per questa lezione non e possibile calcolare WER o stabilire ascoltando soltanto il testo se ogni omissione provenga dal modello o dall'audio.

### Hardening emerso dal collaudo

- i chunk lunghi vengono ricodificati in WAV standard per evitare header/metadati MP3 incoerenti nei tagli lossless;
- una risposta incompleta rimette il segmento in coda, permettendo di provare prima tutti gli altri pezzi;
- un segmento puo essere accettato come non parlato soltanto dopo tre risposte non vocali da chiavi diverse e soltanto se un altro segmento della stessa registrazione contiene parlato confermato;
- la firma del checkpoint comprende anche questa policy e conserva in `prior_attempts` l'audit delle strategie precedenti incompatibili;
- gli output vuoti legittimi producono file di segmento vuoti e tracciati, non buchi non spiegati nella pipeline.

Gli artefatti sono in `benchmark_outputs/gemini_or_full/`, esclusi da Git. Questo test dimostra che la pipeline completa e riprendibile funziona anche quando la registrazione contiene circa mezz'ora di rumore prima della lezione e dodici minuti dopo; non sostituisce ancora il confronto con una ground truth manuale.
