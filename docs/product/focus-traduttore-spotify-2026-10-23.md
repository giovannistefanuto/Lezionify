# Full Focus, traduttore e Spotify — 23 ottobre 2026

Il pacchetto D-0405 descritto qui è conservato nel backup. Il setup successivo
include queste modifiche e le [correzioni RAG sulle domande realistiche](rag-domande-studio-2026-10-23.md);
consultare quel resoconto per l'impronta dell'installer più recente.

Interventi richiesti direttamente dopo il lavoro RAG, registrati come voci
99–104 nella lista unica e in D-0404/D-0405. Conservati tutti gli interventi RAG e
i relativi limiti: le valutazioni qualitative 90–92 restano aperte.

## Comportamento

- Ogni ingresso in Full Focus concede cinque minuti di uscita immediata.
  A partire da 5:00 torna la conferma con conto alla rovescia di 15 secondi.
  Continua a studiare non azzera la soglia; rientrare o cambiare lezione sì.
  La soglia usa il tempo monotono trascorso dall'ingresso, separato dalle
  statistiche di studio; non include lo studio precedente fuori da Focus.
- Ctrl+T con testo selezionato nella dispensa apre il traduttore già compilato.
  La lingua proviene dalla dispensa effettivamente visualizzata. La direzione
  viene impostata dopo la prima visualizzazione: ITA → EN, ENG → ITA.
  Poi parte la traduzione offline. Il componente è disponibile subito nel
  renderer, senza attendere il caricamento di un modulo separato.
  Le selezioni non vengono troncate: oltre 2.000 caratteri viene mostrato il
  limite già previsto dal servizio. Se non c'è selezione, resta l'apertura vuota.
- Se il dizionario non trova una parola, tenta automaticamente lo stesso
  modello Bergamot usato per le frasi, anche in presenza di suggerimenti.
  Restano disponibili suggerimenti, copia, inversione della direzione,
  errore recuperabile e installazione esplicita dei modelli da Impostazioni.
  Il risultato del modello può essere impreciso sui termini specialistici.
- La pausa scaduta conserva titolo e controlli, omettendo il paragrafo indicato
  dall'utente. Il tempo resta fermo fino alla ripresa esplicita.
- I comandi Spotify accettano una risposta di successo senza JSON, sia 200
  sia 204. Le letture dello stato e dei dispositivi conservano la validazione
  JSON e gli errori di rete, autorizzazione e quota.

## Perché mancava “collusion”

Nel file EN→IT distribuito, versione FreeDict/WikDict 2025.11.23, le 53.255
voci originali non comprendevano né collusion né collude. Non era un errore
di maiuscole, ricerca o installazione. Nel file inverso la parola compariva
tra le traduzioni di complicità: le due direzioni non sono simmetriche.
Un caso precedente era trascrivi/trascrivere, già integrato con un supplemento
basato sulla voce inglese transcribe.

Integrata la coppia fattuale collusion/collusione in entrambe le direzioni,
senza copiare definizioni o pronunce. Provenienza e revisione nei metadati
`reviewedTranslationPairs`; la conversione `tools/build_dictionary.py`
riapplica il supplemento in modo riproducibile. Funzionano anche Collusion e
collusions con la ricerca esistente.

La coppia è verificata nel
[Sansoni inglese del Corriere](https://dizionari.corriere.it/dizionario_inglese/Inglese/C/collusion.shtml).
La mancanza di una singola voce non giustifica sostituire automaticamente
l'intero dizionario: il fallback copre già i successivi casi assenti, restando
offline. Nessuna nuova dipendenza o download di dizionari aggiunto.

## Diagnosi Spotify

Prima della correzione, sette regressioni con HTTP 200 vuoto producevano
esattamente «Risposta Spotify non leggibile. Riprova.», anche senza suoni.
Il codice trattava come prive di corpo soltanto le risposte 204 e tentava
`response.json()` dopo gli altri successi. Ora i comandi non richiedono un
corpo JSON; il risultato viene verificato con il successivo aggiornamento
dello stato del player. La
[documentazione Spotify per pausa](https://developer.spotify.com/documentation/web-api/reference/pause-a-users-playback)
descrive un'operazione di comando, distinta dalla lettura dello stato.

La prova combinata usa il vero decoder e loop Web Audio con un WAV sintetico
silenzioso e i controlli React Spotify. Pausa e ripresa non fermano il suono
ambientale. Le risposte dell'account Spotify sono simulate: non è stata
acquisita la risposta HTTP della sessione personale segnalata dall'utente.
La causa riprodotta spiega lo stesso errore e non richiede i suoni per apparire;
non si attribuiscono al test accesso o ascolto sul suo account reale.

## Verifiche

- 734 test Vitest in 56 file, tutti superati; typecheck e lint puliti.
- Regressioni Spotify prima rosse e poi verdi; dati reali del dizionario con
  rete disabilitata, singolare/plurale e entrambe le direzioni.
- Scenari Electron: uscita prima della soglia, limite esatto a cinque minuti,
  continua e rientro; pausa scaduta senza testo e statistiche conservate.
- Traduttore: selezioni nelle due lingue, campo compilato prima dell'avvio,
  fallback con e senza suggerimenti, direzione manuale, risposte obsolete.
- Runtime Bergamot WASM reale, entrambe le direzioni, conservazione di formule,
  codice e URL con modelli pubblici già presenti, senza rete. Quattro prove:
  una frase con contenuti protetti e collusion/collusione in ciascuna direzione.
- Suite completa React/Electron e ripristino delle posizioni di lettura dopo
  un vero riavvio dell'eseguibile, entrambi superati.

## Installer

Backup del pacchetto RAG precedente in
`local-artifacts/installer-backups/20261023-focus-traduttore-spotify`.
L'installer finale comprende anche il lavoro RAG ed è generato con
`electron-builder --win --publish never`. Nessuna installazione sul profilo
personale o pubblicazione automatica.

Setup finale: `dist/Lezionify-Setup-0.1.0.exe`, **294.213.454 byte**.
SHA256: `1b6edf310a21ed746b0ddcb5a461524a76d8e6ec41ed72c1a6e73df0bac633ed`.
ASAR: `d02f44e5ac4c39b7c457a4c2609c8d90a86523ed34c80e55ae40e2661b1b5697`.

Verificati 372 file della build, manifesto SHA512, blockmap e tre file di
backup. Otto componenti estratti dall'installer NSIS, inclusi eseguibile,
ASAR, worker e moduli nativi, sono identici al runtime collaudato.
Il setup non è stato eseguito durante questi controlli.

Nel nuovo eseguibile, in profili temporanei isolati, passano anche modello RAG
assente, download esplicito del modello pubblico, inferenza senza rete, cache
fredda/calda, rifiuto del modello corrotto, ricostruzione dei vettori corrotti,
ripristino, migrazione delle citazioni e worker PDF. Inferenza con fixture:
1.129 ms a freddo e 10 ms a caldo. Nessun nuovo invio Gemini, dati personali
o credenziali inseriti nel pacchetto. Contatore del lavoro RAG fermo a 59/60.

Chiudere Lezionify prima di avviare il setup. Il modello di traduzione resta
installabile esplicitamente dalle Impostazioni se non è già presente.
