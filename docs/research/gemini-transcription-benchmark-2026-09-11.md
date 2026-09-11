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
