# Pilota privato: cinque Q&A Gemini storici e Mistral Large 4

Preparato il 23 novembre 2026 su richiesta dell'utente. Inferenze eseguite
il 24 novembre dopo inserimento locale della chiave e conferma dell'utente.

## Esito del 24 novembre

Cinque risposte complete del modello fissato, senza retry API: 44.994 token
input e 8.009 completion, 0.0483147 USD calcolati al listino standard senza
sconto cache o imposte (non verifica della fattura). Medie per domanda:
8.999 input e 1.602 completion, includendo il reasoning fatturabile.
Tempi end-to-end 12.24, 34.91, 17.89, 16.20 e 32.23 secondi; mediana 17.89.

Valutazione dell'agente: stessa fascia pratica nei cinque casi, nessuna
superiorita generale dimostrata. Entrambi hanno imprecisioni; Mistral risolve
piu direttamente un dubbio sugli incentivi, ma aggiunge anch'esso una
digressione fuorviante. Una risposta ripete un errore matematico della fonte
sulla trasformazione affine dei payoff: la fedelta al documento non implica
correttezza. La fonte personale non e stata modificata.

Rendering statico con gli stessi plugin del Q&A: 73 formule Mistral e nessun
errore KaTeX nei dieci testi confrontati. Non e un collaudo visuale Electron.
Revisione dettagliata, punteggi soggettivi per caso, calcoli e misure restano
negli artefatti privati; nessun testo personale riportato qui.

Il primo tentativo sandbox ha incontrato un errore DNS. Verifica anonima
ENOTFOUND nella sandbox e HTTP 401 senza chiave fuori sandbox, poi marker
archiviato e ripresa manuale fuori sandbox. Nessuna credenziale stampata.
Il run completo non richiede altre chiamate: le risposte salvate si riusano.
Prossimo passo eventuale: decidere se integrare il provider, non ancora fatto.

## Campione e confronto

### Riprova Cloudflare e preventivo Terra, 24 novembre

Su richiesta dell'utente preparato replay delle stesse cinque domande con
dispensa completa e comando soft `/think`, usando il runner storico separato
`tools/qna_replay_private.mjs`, candidato `cloudflare-qwen`, output massimo
4096, temperatura 0.2 e budget giornaliero prudenziale condiviso invariato.
Prompt e limite output differiscono dal test Mistral: non sarebbe un confronto
controllato a identica configurazione. `/think` e un comando soft Qwen, non
la prova che il servizio abbia attivato il ragionamento.

Il primo invio restituisce HTTP 410 dopo circa 392 ms, senza testo, reasoning
o usage. Il runner storico classifica genericamente 410 come invalid_request,
disabilita il candidato e salta gli altri quattro casi. Le pagine ufficiali
Cloudflare confermano ritiro del modello dal 20 novembre 2026. Nessuna nuova
misura di qualita o latenza del modello; nessuna attestazione di costo zero
in fattura. Il ledger conserva la prenotazione prudenziale della richiesta
senza usage, non un consumo effettivamente misurato. Artefatti privati in
`local-artifacts/qna-benchmark/cloudflare-think-five-20261124/`.

Per GPT-6.1 Terra, listino ufficiale consultato il 24 novembre: Standard
1 USD/M input e 5 USD/M output. Applicando queste tariffe agli stessi conteggi
del pilota Mistral, senza assumere identica tokenizzazione o reasoning, il
conto ipotetico e 0.085039 USD per cinque richieste, 0.017008 per domanda,
8.50 USD per 500 e 13.61 USD per 800. Nessuna chiamata Terra eseguita;
cache, imposte, retry e strumenti esclusi. Con input medio 9000 e output
fatturabile 5000 il conto salirebbe a 0.034 USD per domanda.

La documentazione Terra descrive ragionamento regolabile e capacita visive;
queste caratteristiche lo rendono candidabile a una prova testuale e slide,
ma non dimostrano superiorita rispetto a Gemini o Mistral sulle nostre domande.
Un confronto iniziale medium dovrebbe misurare anche TTFT in streaming e
correttezza rispetto alle fonti, senza assumere che meno reasoning sia gratis
in termini di qualita o che garantisca una latenza specifica.

Fonti consultate:

- [Ritiri Cloudflare](https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/).
- [Scheda Qwen su Cloudflare](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/).
- [Switch soft Qwen](https://huggingface.co/Qwen/Qwen3-30B-A3B#advanced-usage-switching-between-thinking-and-non-thinking-modes-via-user-input).
- [Scheda e tariffe Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra).

Cinque prime domande di conversazioni distinte, due di RL e tre di GT:
Bellman come sistema lineare, aggiornamenti TD rispetto a Monte Carlo,
somma zero e significato di avversariale, strategie miste/comportamentali,
Nash nel gioco dell'ultimatum. Sono casi scelti deliberatamente per coprire
ragionamento e possibili errori: non un campione casuale rappresentativo.

`tools/prepare_mistral_qna.py` congela domanda, citazione, storico precedente,
risposta Gemini e dispensa completa attuale. Richiede cinque selezioni esplicite,
verifica la citazione letterale nelle fonti ITA/ENG e ne registra gli hash.
La libreria e le risposte storiche non vengono modificate. I cinque snapshot
sono gia preparati: non rieseguire l'estrazione per avviare il test.

I messaggi storici non conservano prompt, contesto completo, lunghezza richiesta,
usage, latenza o sempre il modello. Questo e un confronto con risposte storiche,
non un benchmark a parita esatta di payload. Quattro documenti sono inglesi,
uno italiano; tutti i quesiti sono in italiano. Slide escluse dal pilota.
Non effettuare nuove chiamate Gemini. La risposta storica resta esclusa dal
payload Mistral e non e assunta come soluzione corretta.

## Avvio

File chiave nella radice del repository, gia creato ed escluso da Git:

```dotenv
MISTRAL_API_KEY=
```

Nome: `.env.mistral-test`. Non incollare la chiave in chat, nei comandi o nei log.

```powershell
node tools/mistral_qna_test.mjs
node --test tests/node/mistral_qna_test.node.mjs
# Solo dopo aver compilato la chiave: cinque richieste autorizzate dall'utente.
node tools/mistral_qna_test.mjs --live
```

Il primo comando verifica il corpus senza leggere la chiave e senza rete.
Modello fissato `mistral-large-4-0`, reasoning `high`, temperatura 0.2,
massimo 8192 token output per richiesta, limite locale 1 USD prima delle imposte.
Risposte richieste brevi, con criteri didattici coerenti con l'app; il prompt
del runner e distinto da quello storico e non importa codice Electron.

La riserva conservativa del corpus preparato e circa 0.218 USD: input stimato
in byte UTF-8 piu framing e output massimo, non un consuntivo o tokenizer.
I prezzi standard documentali sono 0.70 USD/M input e 2.10 USD/M output.
Si conservano usage effettivo, modello restituito, hash richiesta e tempo
end-to-end. Non si misura TTFT (richiesta non streaming). Costo senza sconto
cache; fattura e imposte possono differire.

Nessun retry automatico. Lock esclusivo e marker persistente prima dell'invio:
un tentativo fallito o interrotto richiede ispezione manuale, senza rinvio
automatico potenzialmente duplicato. Risposte gia complete vengono riusate;
corpus/configurazione/sorgente diversi bloccano la ripresa. Output troncati
sono conservati e segnalati incompleti, senza procedere agli altri casi.

## Artefatti e valutazione

Tutto in `local-artifacts/qna-benchmark/mistral-five-20261123/`, ignorato da Git:

- `corpus.private.json`: fonti e baseline congelate;
- `baseline-review.private.md`: revisione preliminare e criteri congelati;
- `evaluation.private.md`: valutazione finale dell'agente, limiti e punteggi;
- `render-check.private.json`, `independent-checks.private.json`: verifiche offline;
- `case-*.attempt.private.json`: tentativi e riserve;
- `case-*.result.private.json`: risposte, usage, tempi e costi;
- `manifest.private.json`: configurazione e impronta per la ripresa;
- `summary.private.json` e `comparison.private.md`: risultati e confronto,
  prodotti solo dopo cinque risposte complete.

Dopo il run l'agente legge fonti e risposte e completa la valutazione locale:
correttezza (0-4), pertinenza (0-4), chiarezza (0-4), fedelta alle fonti (0-4),
errori gravi, formule/rendering e preferenza motivata per ogni caso. Giudicare
prima ogni risposta rispetto alla fonte e alle verifiche indipendenti, poi
confrontare i modelli. Non trasformare cinque casi in una percentuale generale
di accuratezza. Conservare separati ragionamento, testo finale e costo output;
il runner conserva solo il testo finale, non il reasoning privato.

## Fonti tecniche consultate

- [Listino](https://docs.mistral.ai/inference/pricing).
- [Reasoning Large 4](https://docs.mistral.ai/inference/conversations/reasoning):
  `high` raccomandato per qualita; supportati low/medium/high, non none.
- [Chat API](https://docs.mistral.ai/api/endpoint/chat).

Nessuna nuova dipendenza, modifica ai provider dell'app, packaging o pubblicazione.
