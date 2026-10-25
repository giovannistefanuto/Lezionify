# Istruzioni per gli agenti di Lezionify

## Prima di iniziare

Leggi, nell'ordine:

1. `AGENTS.md`;
2. `IDEA_INIZIALE.md`;
3. `STRUTTURA_PROGETTO.md`;
4. le voci piu' recenti di `DECISIONI.md`.

Questi file descrivono rispettivamente le regole di lavoro, l'obiettivo del prodotto, la struttura prevista e le decisioni gia' prese.

### Pull automatico all'inizio di ogni chat

All'inizio di ogni nuova chat su questo progetto, dopo aver letto `AGENTS.md`
e prima di leggere gli altri documenti o modificare file, sincronizza il ramo
di lavoro con la repository GitHub collegata. Questa regola autorizza il pull
senza ulteriori conferme e si applica una volta per chat.

1. Controlla stato del checkout, ramo, remoto e upstream configurato.
2. Esegui `git fetch` dal remoto GitHub collegato e `git pull --ff-only`
   dall'upstream del ramo corrente quando il checkout e' pulito. Conserva gli
   eventuali commit locali; se il ramo e' gia' aggiornato, prosegui.
3. Rileggi `AGENTS.md` dopo la sincronizzazione, quindi continua con gli altri
   documenti nell'ordine previsto sopra, usando le versioni aggiornate.

Se ci sono modifiche locali non committate, upstream assente, HEAD scollegata,
storie divergenti o errori di rete/autenticazione, conserva il lavoro e segnala
il blocco concreto: il pull resta da completare. Prosegui soltanto con le parti
indipendenti dalla sincronizzazione. Non eseguire reset distruttivi, stash,
merge o rebase automatici per aggirare il blocco.

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

## Push automatico dopo la rigenerazione dell'installer generale

Ogni volta che viene rigenerato l'installer generale di Lezionify, sia su
richiesta dell'utente sia per iniziativa dell'agente, completa le verifiche
pertinenti e poi esegui automaticamente commit e push sulla repository GitHub
collegata. Questa regola autorizza commit e push senza ulteriori conferme.

- Includi tutte le modifiche pubblicabili presenti nel checkout, anche quelle
  precedenti alla rigenerazione: sorgenti, test, configurazioni e documentazione,
  compreso il registro decisioni aggiornato.
- Controlla il diff prima del commit e rispetta `.gitignore` e le regole sui dati
  personali e sulle credenziali. Gli installer e gli altri artefatti ignorati
  restano esclusi dal push; la loro distribuzione tramite release e' separata.
- Usa il remoto GitHub collegato e il ramo di lavoro con la destinazione Git
  configurata; verifica che il commit finale sia presente sul remoto prima di
  dichiarare conclusa l'attivita'. Se non ci sono nuove modifiche, pubblica
  comunque eventuali commit locali ancora da inviare.
- Se verifiche, rete, autenticazione o conflitti impediscono il push, conserva
  il lavoro, segnala il blocco concreto e indica il push come ancora da
  completare. Non usare force push per superare il blocco.

## Comando LISTA_ORDINE

Quando l'utente invia `LISTA_ORDINE`, avvia direttamente l'implementazione e il
collaudo della prima voce non completata nella sezione `Coda LISTA_ORDINE` di
`docs/product/idee-future-2026-10-13.md`, seguendo l'ordine numerico della coda.
Il comando autorizza una sola voce per invocazione, senza richiedere una nuova
conferma per iniziare. Leggi la descrizione completa della voce e le decisioni
successive prima di intervenire; riusa il lavoro e le ricerche gia' disponibili.

Per ogni invocazione consulta `docs/product/guida-skill-codex.md` e segui
questa sequenza. Leggi i relativi `SKILL.md` e comunica quali skill usi e
per quale scopo prima di applicarle.

1. **Chiarisci se serve:** usa `grilling` ("grill me") quando restano scelte
   di prodotto, requisiti o compromessi da concordare. Recupera prima i fatti
   dal codice e dai documenti; chiedi solo le scelte ancora aperte e attendi
   le risposte secondo la skill. Se la voce e' gia' definita e autorizzata,
   procedi direttamente senza una nuova intervista.
2. **Scegli il metodo:** seleziona e applica le skill utili alla voce fra
   quelle della guida e le altre disponibili nella sessione. Usa scelta
   rapida e percorsi della guida, rispettando le condizioni di ciascuna skill.
   Una modifica semplice puo' seguire il percorso diretto con verifiche
   proporzionate. Mantieni il perimetro di una sola voce.
3. **Prepara il contesto per la ripresa:** dopo implementazione, verifiche e
   aggiornamenti documentali, usa sempre `handoff`. Questa istruzione registra
   la richiesta esplicita dell'utente di usarla a fine `LISTA_ORDINE`, senza
   una nuova conferma. Salva il riepilogo in `%TEMP%` secondo la skill e
   restituisci il percorso completo in chat. Includi stato, riferimenti alle
   decisioni e ai file, verifiche e limiti, blocchi, prossimo passo e skill
   suggerite, rimandando ai documenti esistenti e omettendo dati sensibili.
   Se la voce resta bloccata, prepara comunque il riepilogo del lavoro svolto
   e dell'azione necessaria per riprenderla, mantenendo la casella aperta.
   `handoff` prepara una nuova sessione con contesto essenziale: non svuota
   automaticamente la chat corrente e non avvia un'altra voce. Se la skill
   non e' disponibile, segnala il limite e fornisci un riepilogo di ripresa
   equivalente, senza dichiarare di averla eseguita.

- Verifica lo stato reale nel codice e nei collaudi: una ricerca o un prototipo
  non equivalgono all'implementazione della funzione.
- Completa implementazione e verifiche pertinenti, registra la decisione con
  `tools/append_decision.py` e aggiorna la casella nella coda e nella descrizione
  della voce solo dopo il completamento. Riporta esito e prossima voce in chat.
- Se la voce risulta gia' implementata e verificata, allinea lo stato e passa
  alla prima ancora aperta. Se e' parzialmente implementata, completala.
- Se mancano informazioni, credenziali o un'azione necessaria dell'utente,
  avanza sulle parti indipendenti e segnala il blocco concreto; non segnare la
  voce come completata e non saltarla automaticamente.
- Mantieni le regole local-first e le chiamate AI esplicite e tracciabili.
  Non modificare l'ordine e non avviare altre voci senza una richiesta dell'utente.
