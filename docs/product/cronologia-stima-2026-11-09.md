# Cronologia giornaliera e stima duratura

Implementazione del [piano](piano-cronologia-stima-2026-11-09.md), D-0487–D-0489.
Voci 130 e 131. Nessun nuovo servizio, dipendenza o invio AI.

## Uso

La Dashboard contiene **La mia giornata**: giorno, corso, provenienza e
intervallo utile oppure giornata intera. Lettura, Q&A, slide, pause/strumenti,
audio RIPETERE e studio manuale occupano corsie distinte. La tabella sotto il
grafico rende disponibili gli stessi dati da tastiera; i dettagli sono paginati.
Temi chiaro/scuro, finestra stretta e zoom 200% sono coperti dai collaudi.

Gli indicatori mostrano studio accreditato, unione del tempo osservato
collocabile, crediti senza orario, blocco continuo più lungo/mediano,
cambi di attività e numero/durata delle esclusioni per causa. Le cause
sovrapposte conservano ciascuna il proprio indicatore: non sommarle per
ottenere il totale delle pause. Nessun punteggio di attenzione.

Q&A e slide contano come studio; memo/RIPETERE aperto, traduttore, strumenti,
pausa, attesa di conferma, altra finestra, inattività, sospensione e blocco
schermo escludono tempo. Non vengono raccolti i nomi delle altre applicazioni.
La politica personale di inattività resta quella già confermata dall'utente.
Le lacune non osservabili sono dichiarate, senza attribuirle a distrazione.

I totali per fonte restano distinti. Audio con timestamp del dispositivo è
osservato; timestamp sostitutivo è stimato. Lettura RIPETERE mantiene il credito
stimato di 15 minuti. Il manuale può avere un orario dichiarato facoltativo:
senza orario resta un credito. Un credito legacy non diventa una fascia oraria.
L'unione degli intervalli osservati evita di sommare due volte le sovrapposizioni
fra registratore e Focus; resta distinta dai crediti attribuiti alle attività.
Le rettifiche riducono i totali e sono segnalate, senza tagliare arbitrariamente
gli eventi osservati. Mezzanotte e giorni da 23/25 ore rispettano il fuso salvato;
gli orari nella tabella comprendono l'offset per distinguere l'ora ripetuta.

## Persistenza e recupero

`StudyHistory` nel main possiede le scritture, serializzate anche dal repository.
Il renderer invia un contatore cumulativo, sequenze e transizioni; il heartbeat
è di 10 secondi, distinto dal tick condiviso di un secondo. Nessuna scrittura
sincrona su disco per tick UI. Coda limitata a 720 osservazioni e batch ritentabili.
Le transizioni di strumenti e focus sono rilevate anche fra due heartbeat,
confrontando le esclusioni prima di accodare un evento.
Un errore di conferma è visibile nella barra Focus anche con stima disattivata,
con pulsante Riprova; i batch restano ritentabili finché
il processo è vivo. Dopo un crash si conservano soltanto i secondi confermati,
senza inventare quelli rimasti in memoria.

Sotto la radice locale della libreria:

- `study/history/YYYY-MM-DD/`: frammenti limitati a 32 record e finestre di
  dieci minuti; ID stabili rendono idempotente il replay.
- `study/sessions/`: ultimo checkpoint, totali per giorno e parti non collocabili.
- `study/forecasts/`: run v2 per lezione, casi conclusi, revisioni archiviate
  e copia privata dei vecchi dati `legacy-v1`.
- `study/commits/`: intenti di completamento recuperabili.
- `study/system/`: inizio duraturo dei periodi nativi di sospensione/blocco.

L'ACK arriva dopo journal, contatore e proiezione nel vecchio archivio delle
sessioni. La proiezione ha ID di origine e sostituisce il writer precedente
nelle sessioni v2: non si somma due volte. Un errore della proiezione dopo la
scrittura viene riparato al replay, anche dopo il riavvio. Il tempo della sessione
UI è escluso dalla lettura del totale salvato prima di essere aggiunto a video.

Il completamento passa dal main per tutti i percorsi: prima salva un intento
con contatore finale confermato, poi lo stesso ID nei metadati della lezione,
infine produce i casi. Il recupero finalizza solo un intento corrispondente ai
metadati; altrimenti riapre la raccolta. Ripetere l'operazione non duplica esiti.
Checkpoint finale fallito, avanzamento insufficiente o fonte cambiata non
producono un caso valido. Le rettifiche invalidano i casi interessati.

La migrazione è additiva. Le vecchie sessioni e i campioni personali dei
paragrafi restano; il forecast localStorage v1 è copiato separatamente e non
entra nella calibrazione v2. Un file illeggibile produce un errore, non zero
studio. Il filtro segue le assegnazioni correnti e i corsi archiviati.
Il recupero automatico da backup lascia un avviso locale duraturo nella
Dashboard: una copia precedente può non contenere le ultime osservazioni.

## Intervallo statistico

Il target è il tempo Focus attivo dal checkpoint fino al completamento esplicito,
con le stesse esclusioni del tracker. La raccolta prospettica salva il primo
checkpoint per fase (inizio/metà/fine), lingua e metodo: fino a dodici gruppi,
con posizione numerica, impronta della fonte e versione della misura. Un
ricalcolo archivia il run precedente e stabilisce una nuova baseline.

Per il margine servono almeno **20 lezioni diverse confrontabili**. Si usano le
ultime 100 di ciascun gruppo, escludendo la lezione corrente e i casi invalidati.
Il residuo è `abs(reale - previsto) / max(60 s, previsto)`. Il quantile di rango
`ceil((n+1)*0.9)` determina il margine; il limite inferiore è troncato a zero.
Non c'è una riduzione imposta dalla sola vicinanza alla fine. La fase seleziona
il gruppo empirico; errori uguali nelle tre fasi non impongono margini diversi.

La UI mostra minuti ± margine, limiti, livello **nominale 90%**, numerosità e
copertura delle previsioni già salvate prima degli esiti successivi. Il rapporto
coperti/verificati ha un intervallo Wilson 95% indicativo e segnala una verifica
ancora limitata sotto venti esiti. Lezioni correlate e cambiamenti del ritmo
possono rendere il livello nominale diverso dalla copertura personale: non è
una probabilità garantita che il singolo tempo sia corretto. Nessuna percentuale
inventata quando i dati mancano. I dodici checkpoint non sono dodici lezioni.

La voce 131 resta aperta per la **verifica personale su esiti futuri**. I test
sintetici verificano il codice e l'assenza di uso del futuro, non dimostrano
l'accuratezza sullo studio reale dell'utente.

## Prestazioni e conservazione

`node tools/benchmark_study_history.cjs` crea solo dati temporanei sintetici:
180 giorni, 1.142 file, 8.681.152 byte; giornata intensa da 2.160 intervalli.
Misura sul PC: prima lettura 246 ms, mediana a caldo 186 ms, massimo 273 ms
su dieci letture, entro l'obiettivo 300 ms.
Durante una prova concomitante alla scansione delle dipendenze del packaging e
alle suite complete, il massimo sale a 2.175 ms: il budget descrive la lettura
ordinaria, non garantisce la stessa latenza sotto saturazione del PC. Report locale non versionato in
`local-artifacts/study-history-2026-11-09/benchmark.json`.

La compattazione a 180 giorni era una proposta da misurare prima di attivarla.
Dopo queste misure si conserva il dettaglio senza cancellazioni automatiche:
evita di perdere eventi o riferimenti di run aperti. Rivalutare con librerie
molto più grandi. I casi compatti sono limitati a 2.400; ogni gruppo usa al
massimo cento lezioni. Non sono necessarie nuove dipendenze.

## Collaudi

Regressioni dedicate per ACK perso, errore dopo scrittura, replay e riavvio,
mezzanotte/cambio d'ora, dodici gruppi, revisioni della fonte, completamento
centrale e metadati falliti, rettifiche, lock nativo persistito, legacy e cause
sovrapposte. I due difetti riprodotti nel piano hanno test di regressione.

Lo scenario Electron usa tracker, stimatore, completamento e journal reale
su una libreria sintetica: lettura → memo → traduttore → Q&A → blocco → Q&A,
riavvio backend ed esito persistito. Verifica anche filtri, dettaglio accessibile,
giorno di 25 ore, temi, finestra stretta, zoom 200% ed errore distinto da zero.
Screenshot locali in `local-artifacts/study-history-2026-11-09/`.

Gli esiti finali del gate generale e del pacchetto sono registrati nel registro
decisioni al completamento della distribuzione. Nessun collaudo apre o modifica
la libreria personale e nessuna nuova richiesta AI è necessaria.

Gate eseguito: **836 test unitari in 66 file**, typecheck, lint, 24 test Python,
41 test Node, suite Electron completa con riavvio, scenario dedicato agli
strumenti di studio, regressioni del 28 ottobre e PDF reali. Tutti passati.
Nel pacchetto sono passati anche inferenza locale RAG senza rete, rifiuto del
modello corrotto e quattro prove del traduttore WASM IT/EN.


## Verifica finale rimasta aperta

Il 9 novembre la regressione Electron completa e lo scenario Focus isolato hanno
segnalato che il dettaglio della stima non si apre nel controllo tramite focus
da tastiera. Due esecuzioni complete precedenti erano passate, ma il difetto
si riproduce nelle successive prove isolate. L'evento focus raggiunge il
pulsante; la causa non è stata ancora individuata. Non considerare superato
il gate finale, né completata la voce 130, fino a diagnosi e nuova verifica.
Il setup generato supera integrità e controlli dei runtime, ma include questa
limitazione non risolta. Il push resta da completare dopo le verifiche.


## Risoluzione del collaudo Focus

Il collaudo sintetico lasciava nel documento due schermate Focus e selezionava
il primo pulsante, appartenente alla schermata precedente. Ora seleziona il
pulsante della schermata appena aperta; il test isolato e la suite Electron
completa con riavvio sono passati. La voce 130 è completata; la verifica
personale della copertura della voce 131 resta legata a lezioni future.
