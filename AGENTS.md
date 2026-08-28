# Istruzioni per gli agenti di Lezionify

## Prima di iniziare

Leggi, nell'ordine:

1. `AGENTS.md`;
2. `IDEA_INIZIALE.md`;
3. `STRUTTURA_PROGETTO.md`;
4. le voci piu' recenti di `DECISIONI.md`.

Questi file descrivono rispettivamente le regole di lavoro, l'obiettivo del prodotto, la struttura prevista e le decisioni gia' prese.

## Registro obbligatorio delle decisioni

Per ogni modifica non banale a prodotto, architettura, dipendenze, dati, flusso utente, modello AI, sicurezza o configurazione, registra una decisione. Non modificare mai direttamente `DECISIONI.md` nella sezione `Registro`.

Per registrare una decisione, esegui direttamente lo script `tools/append_decision.py` passando i parametri via riga di comando (l'ID viene calcolato e incrementato automaticamente se omesso, la data e' quella odierna per default):

```bash
python tools/append_decision.py \
  --area "<area-breve>" \
  --titolo "<titolo breve>" \
  --decisione "<cosa viene adottato o modificato>" \
  --motivazione "<perche' questa scelta e' preferibile>" \
  --impatto "<effetti tecnici o sul flusso utente>" \
  --follow-up "<prossimo controllo, vincolo o nessuno>" \
  --file-coinvolti "<percorso1, percorso2>"
```

Opzionalmente e' possibile specificare `--id D-XXXX`, `--data YYYY-MM-DD`, `--stato <accettata|sostituita|annullata>`.
Lo script valida i campi, rifiuta ID duplicati, valori vuoti, date non valide e stati non ammessi, e appende direttamente la voce a `DECISIONI.md`.

Non richiedono una voce: correzioni puramente tipografiche, formattazione senza effetto semantico e verifiche senza modifiche. Se hai un dubbio, registra la decisione.

## Regole di progetto

- Il prodotto e' local-first: gli audio, le trascrizioni e le note restano organizzati localmente; le chiamate AI devono essere esplicite e tracciabili.
- Non inserire chiavi API o dati personali nei file versionati, nei log o nei messaggi di errore.
- Conserva sempre l'audio originale e la trascrizione grezza: il materiale generato dall'AI e' una derivazione, non la fonte primaria.
- Mantieni `IDEA_INIZIALE.md` come punto di partenza storico. Le scelte successive vanno in `DECISIONI.md`; aggiorna `STRUTTURA_PROGETTO.md` quando cambia la struttura reale del repository.
- Prima di aggiungere una dipendenza, verifica se risolve un bisogno concreto e registra la scelta.
