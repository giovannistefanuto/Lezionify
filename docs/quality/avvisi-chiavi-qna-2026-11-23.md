# Avvisi, chiavi Gemini e recupero Q&A — 23 novembre 2026

Release Windows 0.6.0; richieste e scelte concordate in D-0602, adattamento del discovery Node in D-0603.

## Comportamento verificato

- Cuffiette: il monitor Win32 produce anche la disconnessione del nome configurato. Avvio, campioni ripetuti, cambio del nome, preferenza disattivata e letture fallite non inventano transizioni. L'avviso mostra il nome delle cuffiette e funziona anche in Full Focus.
- Avvisi di connessioni e alimentazione: durata totale e animazione di due secondi, compresa la modalità movimento ridotto. Gli avvisi temporanei dell'archivio erano già di due secondi; gli errori persistenti non vengono nascosti automaticamente.
- Pausa: pulsante nella stessa fila e con lo stesso stile di Sessione, anche nella barra compressa. Scelta dei minuti, timer, annullamento e ritorno esplicito restano verificati.
- Chiavi: registro locale `library/key-usage.json`, identità SHA256 senza credenziali, esiti completati e finestra mobile esatta di 30 giorni. Successi ed errori sono separati. Ordinamento per disponibilità, successi crescenti e tentativo meno recente; indici e alias configurati rimangono coerenti. Autenticazione sospesa 24 ore, problemi temporanei declassati per almeno un minuto quando esistono alternative. Una verifica esplicita riuscita riabilita la chiave. Quote per progetto/modello e preferenza sul failover restano applicate dal manager.
- Q&A: dopo testo parziale, timeout, rete, rate limit e indisponibilità temporanea consentono fino a due ulteriori chiamate fisiche. Un recupero senza testo consuma comunque un tentativo. La prima nuova porzione sostituisce il testo precedente tramite reset IPC; fonti web dei tentativi abbandonati non vengono concatenate. Annullamento, errori permanenti e blocchi del provider non avviano recuperi. Il percorso di salvataggio per aggiornamento continua a conservare il parziale.

## Collaudi

`npm run release:local`, profilo completo, ha terminato tutti i passaggi con codice 0 e sorgenti invariati durante gate e packaging. Rapporto locale: `local-artifacts/release-20261123-170825/report.json`.

- Inventario, typecheck e lint passati; 178 file e 1976 test unitari passati.
- Periodi Android Java, probe Bluetooth Win32, retrieval RAG, 49 test Python e 41 test Node passati.
- Cinque test offline del pilota Mistral preesistente passati separatamente con `node --test tests/node/mistral_qna_test.node.mjs`; nessuna inferenza del pilota eseguita.
- Updater reale e UI, scenari React/Electron, riavvio della lettura, raccolte e loro riavvio, Sessione compilata con IPC e riavvio, esportazioni PDF reali passati.
- Regressioni mirate: persistenza e scadenza dei conteggi, sospensioni e riabilitazione, bilanciamento tra richieste, alias, proprietà e pulizia dei file audio dopo cambio chiave; recuperi parziali, budget fisico, cancellazione, fonti web e reset del renderer.
- Scenari visivi aggiuntivi `--interface-polish-only` e `--november20-only` passati; schermate sintetiche in `local-artifacts/release-0.6.0-visuals/`. Per fotografare il popup in una finestra nascosta è stata acquisita anche l'anteprima di disconnessione con animazione congelata soltanto nel processo di cattura; i test normali hanno verificato separatamente la durata di due secondi. Nessuna modifica applicativa per la cattura.
- Audit Shell: Start risolve `com.lezionify.app` in Lezionify.

## Pacchetto

Build unica del gate riusata per il packaging, compressione invariata. Confrontati 385 file della build e nove componenti NSIS; verificati tre backup, runtime e assenza di materiali privati.

Setup: 300571533 byte, SHA256 `c4758fdad6f194895bf41136267647aebfb4582dd4fd1682dccc453bb8973d8f`.

ASAR: SHA256 `e07ffa241a7e74189fd09c37713e4fd8b9e4a124b2dcc444d5b9ccf565055688`.

Authenticode: `NotSigned`. Installer estratto e verificato, non eseguito sul profilo personale. Release [v0.6.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.6.0) pubblicata e verificata sul commit `9b09e0a0702600f8709dd5415e4ba957cf05cbeb`: tre asset uploaded con dimensioni e digest corrispondenti; release stabile latest e manifesto pubblico anonimo identico byte per byte. Dettagli anche nella procedura Windows e nel registro decisioni.

## Limiti

Il conteggio parte dalle chiamate con la nuova versione: non ricostruisce lo storico precedente e non misura token o fatturazione Google. Le chiamate di recupero consumano eventualmente altra quota. Le quote di uno stesso progetto non aumentano con la rotazione delle sue chiavi.

Le transizioni Bluetooth sono state collaudate con eventi sintetici sul runtime e query Win32 reale; non è stata comandata una disconnessione fisica delle cuffiette personali. Il supporto resta quello delle connessioni Bluetooth classiche con nome esatto.

Nessuna chiamata Gemini reale sui materiali personali durante questi collaudi. Upgrade su Windows temporaneo, UAC e SmartScreen non collaudati. Dati e chiavi personali restano esterni al setup. Il lavoro Mistral già presente è conservato, con la sola rinomina del test necessaria a separarne il runner da Vitest.
