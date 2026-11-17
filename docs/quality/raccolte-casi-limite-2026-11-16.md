# Verifica delle raccolte e dei casi limite

Data: 16 novembre 2026. Riferimento: voce 134 e
[specifica delle raccolte](../product/raccolte-altro-piano-2026-11-16.md).

## Perimetro ed esito

L'utente richiede una seconda verifica completa, controllo dei casi limite e
conferma che nessun test sia stato disabilitato per errore. Ha inoltre indicato
un audio reale per la raccolta podcast. I materiali personali e i risultati
specifici rimangono in `local-artifacts/collections-real-2026-11-16/`, ignorato.

Il gate completo `npm run check` è passato dopo le correzioni: **914 test
unitari in 74 file**, senza filtri; nessun file di test è stato rimosso,
nessun marcatore di esclusione trovato e nessun controllo preesistente eliminato.
Sono passati anche typecheck, lint, RAG offline, **24 test Python**, **41 test
Node**, updater, Electron con riavvio, contratto Release, build, percorso
raccolte su due processi e app compilata, PDF reali. Il rapporto JSON della
suite completa conferma **914 passati, 0 falliti, 0 pending/skip, 0 TODO**.
Il rapporto e i log locali sono in `local-artifacts/collections-unit-audit.json`
e `local-artifacts/collections-real-final-check.log`, esclusi da Git.

## Difetti riprodotti e corretti

Ogni correzione è preceduta da una prova fallita sul comportamento precedente;
nessun test fallito è stato trasformato in skip o rimosso.

| Caso | Difetto osservato | Protezione verificata |
| --- | --- | --- |
| Errore temporaneo di inizializzazione | La Promise rifiutata era conservata per tutta la sessione. | Il tentativo successivo può inizializzare nuovamente il modulo senza resettare i dati. |
| TXT non UTF-8 | Il decoder sostituiva byte invalidi con caratteri di rimpiazzo. | Decodifica UTF-8 rigorosa, rifiuto del testo non valido e conservazione dell'originale. Vale anche per parti testuali in gruppi misti. |
| Duplicati nello stesso lotto | Si confrontavano solo le fonti già archiviate. | Segnalazione anche per hash ripetuti nella selezione corrente, senza unire implicitamente i contenuti. |
| Emoji su un confine di estratto | Una coppia di surrogati UTF-16 poteva essere divisa. | Confini validi per ogni estratto; concatenazione identica alla fonte. |
| Trascrizione e cache mancanti | Una trascrizione già registrata poteva provocare una nuova chiamata ASR prima del fallimento. | Arresto prima dell'AI; versione precedente conservata e necessità di ripristinare il testo. |
| Annullamento durante la copia | Al ritorno della copia poteva partire comunque il lavoro AI. | L'intenzione di importazione viene annullata; eventuali copie locali complete restano, ma l'AI non viene avviata. |

Le prove del modulo raccolte sono ora **28**. Altri **4 test** verificano
l'adapter Gemini con trasporto simulato: contratto distinto per mappa e scheda,
modello e token restituiti, rifiuto di output troncato e cancellazione prima
dell'invio. Non vengono effettuate chiamate esterne nei test automatici.

Restano coperte dalle regressioni precedenti le cinque modalità, le istruzioni
ereditate e sostitutive vuote, l'ordine delle fonti, la conservazione delle
versioni, la fonte cambiata, le modifiche concorrenti, la ripresa dopo riavvio,
la preparazione dei lavori e l'isolamento da corsi, RAG e pubblicazione.

## Controllo dei test e dei runner

`tools/audit_test_inventory.cjs` analizza i sorgenti TypeScript tramite AST,
i marcatori Python e il confronto con HEAD. Rileva test mancanti, riduzioni
delle definizioni, `skip`/`only`/`todo` e selettori condizionali, scenari
importati ma non richiamati, chiamate eliminate dal percorso Electron completo
e comandi eliminati dal gate. Un marcatore presente nei dati di una prova
(per esempio una stringa che contiene la parola only) non viene confuso con
una chiamata di esclusione.

Il controllo negativo è stato eseguito creando una fixture temporanea con
`it.skip`: l'audit ha restituito codice 1 e identificato la fixture, poi rimossa.
L'audit finale non ammette esclusioni nuove implicite. Eventuali eccezioni future
richiedono una motivazione esplicita e una revisione della regola; non esiste
un elenco di quarantena nascosto.

Durante la diagnosi è stato usato anche un filtro `-t` per riprodurre un singolo
difetto: i test non selezionati in quella sola esecuzione non erano disabilitati
nel codice. Il gate conclusivo viene eseguito senza filtri o flag `--*-only`.
Le modalità mirate dei runner restano disponibili come strumenti diagnostici;
il percorso normale mantiene tutti gli scenari precedenti e aggiunge le raccolte.

`npm run check` comprende ora, oltre ai controlli esistenti, l'inventario,
il RAG offline, il contratto Release e `test:collections` dopo la build.
Il workflow CI comprende anche l'inventario e il percorso delle raccolte con
due processi Electron e app compilata. Il workflow remoto non viene attestato
come eseguito: le verifiche di questa attività sono locali su Windows.

Le prove manuali che richiedono rete, credenziali o account personali restano
esplicite, secondo `CONTRIBUTING.md`: non equivalgono a test automatici saltati.

## Difetto riprodotto con la risposta Gemini reale

La prima generazione reale ha riprodotto un falso positivo: una citazione
letterale attraversava due estratti contigui, ma il validatore la cercava
interamente nel solo estratto indicato. La regressione sintetica è stata
eseguita prima del fix ed è fallita sullo stesso schema minimo.
Il validatore ora verifica il testo letterale nella fonte contigua e richiede
che la citazione inizi nell'estratto referenziato. Citazioni inventate,
testi non contigui e riferimenti al punto iniziale errato restano rifiutati.
La risposta originale salvata è stata riutilizzata per verificare la correzione,
senza ripetere quella chiamata API.

Gli errori di contratto hanno messaggi fissi e sicuri, senza contenuti privati,
e non vengono più confusi con problemi di chiavi o quota. La ripresa esplicita
può inviare al modello il motivo della validazione fallita; nessuna seconda
chiamata di verifica viene avviata automaticamente. La prova reale ha coperto
anche un riferimento iniziale errato, corretto alla ripresa con feedback.

L'interfaccia distingue inoltre il modello per la **Prossima scheda** dai modelli
effettivi nei dettagli della versione. Il modello mostrato segue il cambio
impostazioni senza avviare AI o riscrivere la provenienza delle versioni precedenti.

## Audio reale: verifica completa

Il file indicato è leggibile: durata circa **71 minuti e 27 secondi**.
Sono stati eseguiti importazione nel repository isolato, confronto SHA-256,
conversione tramite l'adapter FFmpeg dell'app e pianificazione reale dei tagli
sui silenzi: **5 blocchi**, con sovrapposizione prevista e nessun buco.
Audio originale invariato e copia conforme. Nessuna chiave letta e nessuna
chiamata in rete durante questa verifica locale.

La revisione automatica ha richiesto conferma esplicita dell'invio dell'audio
e della trascrizione alle API Gemini di Google. L'utente ha successivamente
fornito il consenso; la prova reale è stata avviata soltanto dopo tale risposta.
Originali, trascrizione, checkpoint e scheda sono conservati nell'archivio
isolato, con chiavi lette solo in memoria. Il runner usa il profilo Windows
di cifratura esistente: l'isolamento anche di sessionData rendeva le chiavi
illeggibili, come verificato con un confronto locale che non ne stampa i valori.
Questa modifica riguarda il solo runner privato di collaudo, non il prodotto.

La prova reale è completata: **11.362 parole** di trascrizione, **18 sezioni**,
**9.497 parole** nella scheda AI e **55 citazioni** verificate sulla trascrizione
completa. Controllati anche apertura e scorrimento della scheda nell'app
compilata, senza chiavi nel profilo del lettore e senza contaminare l'archivio
universitario. I confronti hash del runner confermano originale, copia audio,
impostazioni e indice della libreria personale invariati.

Il modello principale configurato ha incontrato timeout, 503 e limiti di quota.
La continuazione diagnostica del solo runner ha selezionato Gemini 3.5 Flash,
già riuscito nel fallback, senza cambiare le impostazioni personali. Restano
registrati i modelli effettivi Hydrogen, 3.7 Flash e 3.5 Flash. Le riprese hanno
riutilizzato trascrizione e sezioni riuscite. Non si attesta quindi che il modello
principale abbia completato da solo l'intera prova senza interventi.

La lettura dell'agente confronta citazioni ed esempi selezionati con il testo ASR,
senza certificare ogni parola dell'audio. Una precisazione non chiaramente
sostenuta dal parlato è stata rimossa solo da una copia riletta separata;
output AI e trascrizione originali restano conservati. Risultati e dettagli
privati: `scheda.md`, `scheda-rivista.md`, `trascrizione.txt`, `VERIFICA.md`,
`quality-result.json` e `scheda-app.png` nell'archivio locale ignorato.
La voce 134 resta aperta per la lettura e il giudizio finale dell'utente.
