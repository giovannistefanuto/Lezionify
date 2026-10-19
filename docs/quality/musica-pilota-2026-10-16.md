# Pilota personale musica — 16 ottobre 2026

Prima voce aperta di `LISTA_ORDINE`: posizione 12, voce prodotto 5.
Requisiti e stato: [backlog](../product/idee-future-2026-10-13.md#5-reparto-musica-classica-nellapp).
Uso e configurazione: [funzioni approvate](../product/funzioni-approvate-2026-10-15.md#musica).

## Verifica tecnica eseguita

- `npx vitest run tests/unit/spotify.test.ts tests/unit/music.test.ts`: 13 test passati.
- `node tools/run_hook_regressions.cjs --music-only`: scenario React in Electron passato.

Le prove usano account e risposte sintetiche: coprono PKCE con callback HTTP
locale, token protetti, refresh, errori e quota, scelta del computer, comandi,
consenso libreria, navigazione persistente, polling e schede/timestamp YouTube.
Non dimostrano accesso API dell'account personale o ascolto sulle cuffie.
Nessuna modifica applicativa necessaria in base a questi risultati.

## Prova reale ancora necessaria

L'utente conferma l'account collegato il 16 ottobre, ma chiede di rimandare
il lavoro sulla musica e passare alla voce successiva (D-0331).
Il collegamento è dichiarato dall'utente; ascolto e comandi reali restano
da collaudare. Il pilota rimane aperto e non viene avviato in questa fase.

Da eseguire con l'utente, annotando solo esiti e messaggi privi di dati personali:

- [ ] Collegamento account dalle Impostazioni e ritorno nell'app riusciti.
- [ ] Spotify aperto sul PC e computer corretto visibile in Musica.
- [ ] Aprire Musica non sposta la riproduzione su un altro dispositivo.
- [ ] Play/pausa, precedente/successivo, posizione e volume agiscono sul PC scelto.
- [ ] Audio udibile sulle cuffie selezionate in Windows/Spotify.
- [ ] Consenso libreria e lettura/avvio di una playlist propria e una altrui verificati.
- [ ] Chiusura/riapertura del pannello e riavvio dell'app mantengono collegamento e preferenze.
- [ ] Errore di rete mostrato senza dichiarare riuscito un comando fallito;
      controllo dal client Spotify ancora disponibile.
- [ ] Scollegamento esplicito rimuove il collegamento da Lezionify.

Il refresh è verificato automaticamente con risposte simulate; la tenuta
della sessione reale va osservata anche dopo la scadenza del token.
Non scollegare o cambiare rete prima di concordare il momento della prova
con l'utente, per preservare la sua sessione di ascolto.

La voce resta aperta fino agli esiti reali. La posizione 13 (rimozione frase
vocabolario) non viene avviata da questa invocazione.
