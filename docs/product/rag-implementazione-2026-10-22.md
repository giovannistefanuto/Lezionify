# Evoluzione RAG — piano e collaudo del 22 ottobre 2026

Richiesta diretta: attuare l'analisi architetturale e concludere entro le 17:00
Europe/Rome. Avvio alle 16:28. Non è un comando LISTA_ORDINE.

Aggiornamento successivo: [completamento e collaudi del 23 ottobre](rag-completamento-2026-10-23.md). I risultati e i limiti seguenti descrivono la situazione del 22 ottobre.

## Piano

1. Query strutturata: vincoli espliciti sulle lezioni, confronti senza tema,
   risoluzione prudente dei riferimenti nello storico e lacune dichiarate.
2. Evidenza dinamica: riselezione a ogni approfondimento, budget invariato,
   deduplicazione, copertura delle lezioni e risultati strumenti coerenti.
3. Passaggi strutturali: sezioni Markdown, paragrafi, codice e formule;
   riferimenti stabili alla fonte originale, vicinato recuperabile.
4. Provenienza: originali e derivazioni AI distinti, stessa lezione non vale
   come conferma indipendente; copertura salvata e visibile nella risposta.
5. Persistenza: corpus separato dalle conversazioni, migrazione locale
   compatibile, indice riutilizzabile e aggiornato per fonte/versione.
6. Ricerca ibrida: verificare un runtime di embedding locale; nessun download
   o invio di documenti implicito e nessuna dipendenza senza bisogno concreto.
7. Benchmark: casi con evidenza attesa, metriche di recupero e regressioni;
   collaudo sulle fonti personali autorizzate solo con risultati privati locali.
8. Gate: test, typecheck, lint, build, scenario Electron, decisioni e consuntivo.

## Criteri di accettazione

- Una domanda vincolata alla lezione 1 non recupera evidenza della lezione 2.
- Un confronto senza tema recupera sezioni rappresentative delle lezioni.
- I passaggi dichiarati consegnati da uno strumento sono nel prompt corrente.
- Un approfondimento può sostituire evidenza iniziale occupando lo stesso budget.
- Fonti mancanti, derivate e non sufficienti non sono presentate come verificate.
- Bozze, citazioni storiche, annullamento e budget Gemini restano compatibili.
- Il benchmark misura il recupero; i test simulati non certificano la verità
  delle risposte future del modello.

## Esito dell'implementazione

Completata e verificata prima delle 17:00 Europe/Rome. Decisione architetturale
D-0397; consuntivo finale nel registro. Nessuna voce LISTA_ORDINE avviata.

- `courseRagQuery.ts` produce argomento, intento e vincoli; i riferimenti
  espliciti valgono anche per una sola lezione e restano applicati alle ricerche
  successive del modello. Un seguito esplicito può riusare l'ultima domanda
  utente. Un confronto senza argomento usa passaggi rappresentativi.
- `courseRagContext.ts` ricompone il contesto dando spazio alla nuova evidenza,
  riservando copertura alle lezioni e mantenendo le immagini allegate. Deduplica
  il testo identico entro la stessa provenienza; fonti di lezioni diverse non
  vengono fuse. Gli strumenti riportano solo identificativi consegnati.
- I passaggi rispettano sezioni, paragrafi e blocchi di codice/formule fino al
  limite strutturale di 4.400 caratteri; la prosa resta normalmente entro 2.200.
  Offset e testo sono riferimenti esatti all'originale. `get_passage` può
  recuperare anche i vicini, sempre nei limiti della finestra corrente.
- Originali, derivazioni AI e metadati hanno provenienza esplicita. Una dispensa
  e la sua trascrizione appartengono allo stesso gruppo di provenienza. La chat
  mostra lezioni richieste/citate, lacune e conteggi dell'evidenza consultata.
- Il corpus esterno è scritto prima del puntatore nei metadati e conservato in
  file immutabili content-addressed. La migrazione avviene alla prima scrittura;
  il backup legacy e le citazioni storiche restano disponibili. Salvare una
  bozza non riscrive il corpus. Le revisioni precedenti non vengono eliminate
  automaticamente. MiniSearch è riutilizzato per corso, aggiornando fonti
  modificate e rimuovendo quelle non più consultabili.
- Gli embedding usano `@huggingface/transformers` **4.3.1**, modello
  `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, q8 CPU, 384 dimensioni,
  revisione `2c4055b12046f11709e9df2c122e59ffbdc2f900`. Pesi e tokenizer occupano
  circa **135,4 MB**. Modello e cache dei vettori restano locali; fusione RRF
  dei ranghi lessicali e semantici. È una selezione deterministica dei candidati,
  non un reranker neurale separato.

## Uso e dati

In **Chat del corso → Fonti**, il pulsante **Scarica modello semantico locale**
abilita esplicitamente il download dei pesi pubblici da Hugging Face. Non invia
testi del corso. La prima domanda crea gli embedding necessari; quelle successive
riusano i vettori per contenuto e revisione. Un errore o un budget locale esaurito
mantiene disponibile la ricerca testuale. Interrompi annulla anche l'inferenza
locale. Ogni ricerca semantica ha un limite di 60 secondi entro la deadline
complessiva della domanda; le cache parziali restano riutilizzabili.

Il collaudo ha scaricato il modello soltanto in `local-artifacts/`, senza attivarlo
nel profilo dell'app dell'utente. Nell'app il download va quindi ancora richiesto
dal pulsante. Nessun installer è stato rigenerato o installato: il setup D-0396
resta quello precedente; questa attività consegna sorgenti e build aggiornati.

## Verifiche

- **37 test RAG** superati, comprese otto nuove regressioni architetturali:
  vincoli, seguito della domanda, struttura, sostituzione contesto, provenienza,
  aggiornamento indice, migrazione e risultati degli strumenti.
- Suite Vitest completa: **700/703** nel sandbox; i tre casi falliti richiedevano
  junction filesystem o callback loopback. Riesecuzione fuori sandbox delle due
  suite interessate: **102/102**, comprendenti tutti e tre i casi. RAG rieseguito
  dopo l'ultima modifica: **37/37**.
- Typecheck, lint senza avvisi e build superati. **24 Python**, **41 Node**,
  suite Electron completa con riavvio, scenario corso mirato e PDF reali passati.
- Inferenza multilingue reale locale passata in Node e nel runtime **Electron**,
  incluso caricamento a freddo della cache. Il test iniziale ha individuato una
  scoperta dei file del tokenizer sul ramo main che ignorava la revisione:
  il caricamento locale esplicito elimina quel percorso durante l'inferenza.
- Audit delle dipendenze runtime: nessuna segnalazione per Transformers.js,
  ONNX o sharp nel risultato npm audit; restano segnalazioni già presenti in
  altre dipendenze. Nessun aggiornamento indiscriminato applicato.

## Benchmark riproducibile

`tests/fixtures/courseRagBenchmark.ts` contiene **22 casi sintetici**: 20 con
evidenza attesa e due con vincoli non soddisfacibili. Include termini, formule,
confronti, panoramiche e parafrasi italiane/inglesi. I casi senza evidenza sono
valutati separatamente, non inclusi nella recall.

| Modalità attuale | Recall@8 (20 casi) | MRR@8 | Esclusione fuori vincolo (2 casi) |
| --- | ---: | ---: | ---: |
| Lessicale con nuovi vincoli | 0,850 | 0,7821 | 2/2 |
| Ibrida con embedding locali | 1,000 | 0,9375 | 2/2 |

Il confronto isola l'aggiunta degli embedding sullo stesso nuovo recupero;
non è una misura prima/dopo dell'intera applicazione. I casi sono piccoli e
sintetici: non autorizzano una stima del 100% sulle domande reali.

Comandi:

```powershell
node tools/run_course_semantic_local.mjs --download-model
node tools/run_course_semantic_local.mjs --electron
node tools/benchmark_course_rag.mjs
node tools/benchmark_course_rag.mjs --semantic
node tools/run_course_rag_private_local.mjs
```

Il primo comando scarica esplicitamente i soli pesi pubblici; gli altri lavorano
localmente. Risultati sintetici in `local-artifacts/rag-benchmark-2026-10-22/`.

## Prova sulle fonti personali autorizzate

L'utente ha autorizzato tutte le fonti per le prove. Il collaudo ha letto il
profilo senza modificarlo: **4 corsi, 33 lezioni, 66 fonti, 1.602 passaggi**;
panoramiche di quattro corsi, esclusione della lezione inesistente e confronto
RL con copertura delle lezioni 5, 6 e 7. Anche il recupero semantico RL è stato
eseguito localmente. Nessun documento è stato inviato online; nessuna chiamata
Gemini è stata effettuata in questa attività. Estratti e risultati privati
restano esclusivamente in `local-artifacts/rag-private-2026-10-22/`.

## Limiti sostanziali ancora da misurare

Il lavoro successivo è registrato nella coda operativa come **voci 89–98**:
[qualità RAG e collaudi successivi](idee-future-2026-10-13.md#aggiunte-del-22-ottobre-2026--qualità-rag-e-collaudi-successivi).
Le caselle restano aperte; registrarle non avvia l'implementazione.

- Il controllo delle citazioni certifica appartenenza all'evidenza consegnata,
  non che ogni frase sia vera. Non è stato aggiunto un giudice AI automatico
  né un verificatore semantico delle singole affermazioni.
- La qualità delle risposte generate richiede un insieme di risposte attese
  annotato e un collaudo Gemini separato; questo benchmark misura il recupero.
- Il primo indice semantico di un corpus grande può richiedere più domande per
  completare la cache entro il budget locale; i timeout usano il fallback.
- OCR, figure, scrittura a mano, numerazione ufficiale delle lezioni, testi
  strutturali oltre 4.400 caratteri e ricerca esaustiva restano limiti espliciti.
- Nessuna prova NSIS/ASAR aggiornata: il runtime è verificato in Electron dalla
  build e la configurazione native ASAR è preparata, ma il nuovo installer
  richiede un packaging e una verifica dedicati.

Fonti tecniche: [runtime Transformers.js](https://huggingface.co/docs/transformers.js/api/env),
[modello multilingue](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2),
[recupero ibrido e contesto](https://www.anthropic.com/research/contextual-retrieval),
[valutazione separata di recupero e risposte](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators?view=foundry).
