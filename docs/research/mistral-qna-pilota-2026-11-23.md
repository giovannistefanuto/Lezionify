# Pilota privato: cinque Q&A Gemini storici e Mistral Large 4

Preparato il 23 novembre 2026 su richiesta dell'utente. Nessuna inferenza
Mistral eseguita durante la preparazione; serve la chiave locale.

## Campione e confronto

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
