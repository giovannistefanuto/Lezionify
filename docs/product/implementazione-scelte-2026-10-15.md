# Scelte confermate e implementazione — 15 ottobre 2026

Risposte esplicite dell'utente ai dieci punti. Questo documento è il punto di
ripresa operativo: salvare avanzamento e prove dopo ciascun blocco. Il mandato
autorizza l'implementazione di più voci, non una singola LISTA_ORDINE.

| Punto | Risposta dell'utente e vincolo adottato |
| --- | --- |
| 1 | A: immagini delle pagine PDF selezionate, anteprima e rimozione prima dell'invio |
| 2 | A: snapshot locali con la conversazione; aggiunta richiesta: menu nelle impostazioni per vedere tutte le immagini e cancellarle singolarmente, tutte o per giorno |
| 3 | A: immagini nel contesto dei turni successivi finché rimosse, allegati attivi sempre riconoscibili |
| 4 | Nessuna nuova integrazione Q&A: Gemini Flash attuale è sufficiente |
| 5 | Conservare la scelta del contesto completo oppure estratto |
| 6 | Motore e distribuzione della traduzione frasi delegati all'agente, sulla base dei test salvati; resta traduzione offline senza spiegazioni |
| 7 | A: telecomando Spotify, audio nel client ufficiale, pilota personale |
| 8 | A: compilation con timestamp e apertura al punto corretto; nessun download/taglio audio in questa versione. Titoli italiani non confermati separatamente |
| 9 | A, esplicito: import automatico con trascrizione, dispensa ITA e ENG |
| 10 | Accettati: apertura mini app una volta per sessione, telefono durante l'invio, sveglia al minuto, vibrazione più breve ma con stop automatico. Sono compromessi ammessi, non capacità già dimostrate |

Aggiornamento successivo dell’utente: per le domande usare prima Flash-Lite e,
se non risponde, gli altri modelli. Questa istruzione aggiorna il punto 4:
Gemini resta il provider, ma il Q&A ha una politica rapida indipendente dal
modello scelto per dispense e traduzioni. Catena: Flash-Lite 3.5 → Flash-Lite
3.1 → Flash 3.7 → modello configurato → Flash 3.5 → Flash 3.8, senza duplicati.
Primo testo entro 20 secondi per tentativo; risposte vuote, timeout e problemi di
disponibilità passano subito al successivo, nel budget globale e nelle quote.
Una risposta già iniziata e poi interrotta resta visibile come errore parziale,
senza mescolare testi di modelli diversi. Nessuna nuova richiesta live eseguita.

Le chiamate AI restano esplicite e tracciabili. Non inviare PDF interi, immagini
non selezionate o credenziali nei log. Audio originali e trascrizioni grezze
conservati. Le cancellazioni immagini devono rendere visibile che il contesto
non è più disponibile, senza reinviare silenziosamente una pagina diversa.

## Avanzamento reale

- [x] ENG automatico e testi delle impostazioni allineati; regressioni pertinenti (D-0305).
- [x] Doppia barra Focus: blocco scroll esterno e ripristino della posizione (D-0305).
- [x] Slide: archivio locale, validazione, IPC, selezione PDF, anteprime, contesto Q&A.
- [x] Immagini nelle impostazioni: elenco/anteprima e cancellazione per immagine, giorno o tutte; thread con allegati cancellati segnalati.
- [x] Traduzione frasi offline: Mozilla/Bergamot 0.4.9, integrazione e collaudi reali Node/Electron (D-0307, D-0308).
- [x] Spotify: pannello configurazione, PKCE, controlli computer, gestione errori e collaudi sintetici (D-0309).
- [ ] Spotify: pilota reale dopo configurazione del Client ID da parte dell'utente, come da risposta ricevuta; Premium, quota, PC e cuffie ancora da provare.
- [x] Compilation: sei video, 54 tracce annotate, correzioni locali e apertura dal timestamp (D-0309).
- [x] Balance: nucleo separato per programmazione, retry, conferma, rollback e scena finita (D-0310).
- [ ] Balance: trasporto e mini app installabile, integrazione nella pausa e verifica hardware; ricerca dell'utente attesa. Nessuna sostituzione di Zepp decisa.

## Scelte tecniche operative

Punto 6: scelto Mozilla/Bergamot, dai piloti CPU conservati: runtime JS/WASM e
asset più piccoli rispetto al percorso Python. Motore incluso nella build;
modelli opzionali dal bucket pubblico Mozilla, circa 53 MB di download e 74 MB
su disco, con hash e dimensioni verificati. Frasi entro 2000 caratteri, solo al
clic, EN/IT manuale, worker senza rete, limite 45 secondi. Formule delimitate,
codice tra backtick e URL restano letterali. Nessun glossario tecnico aggiunto
o garanzia di traduzione corretta; nessun fallback online.

Spotify: risposta successiva dell'utente «Prepara il pannello: configurerò l’app
Spotify dopo». Callback esatto: `http://127.0.0.1:43821/callback`; Client ID
pubblico nelle impostazioni. Nessun Client Secret richiesto. Token solo nel main,
cifrati con safeStorage; scollegamento rimuove anche il backup delle credenziali.
Gli errori di quota/rete non bloccano lo studio. Nessun controllo su telefoni o
altri dispositivi: selezione esplicita di un computer disponibile.

Balance: [prototipo e blocco concreto](../../prototypes/balance-pause/README.md).
Il nucleo testato non equivale a una mini app compilata né a un collegamento.

Uso e limiti delle funzioni: [guida del blocco](funzioni-approvate-2026-10-15.md).

## Collaudi del primo blocco

D-0305: 76 test qualità/pipeline, suite Electron completa e riavvio reale passati.
Allegati: 95 test pertinenti (archivio, Q&A e immagini), suite React/Electron
completa e riavvio reale passati. Preparazione PNG da PDF.js reale per due pagine,
snapshot indipendenti dal viewport; anteprime, salvataggio dei riferimenti,
follow-up, rimozione dagli invii e rollback su errore; cancellazione singola,
giorno/tutte, conferma, errore recuperabile e anteprime mancanti. Servizio su
filesystem temporaneo: proprietà per thread/lezione, riapertura, limiti,
integrità SHA-256, cancellazione e fonte sintetica conservata. Trasporto Gemini
multimodale con client sintetico, senza chiamata API reale.

## Collaudi conclusivi

`npm run check` passato integralmente: typecheck, lint, test unitari, 24 Python,
41 Node, suite React/Electron e riavvio, build e PDF ITA/ENG reali. Dopo le ultime
correzioni ripassati typecheck, lint e tutti i 500 Vitest (33 file), suite
React/Electron con riavvio e build. Scenario musica/frasi: installazione esplicita,
traduzione soltanto al clic, direzione manuale, timestamp modificabili persistenti,
errori recuperabili, login/configurazione sintetici e selezione esplicita computer.

Directory Windows prodotta con electron-builder --win --dir. File WASM e adapter
presenti fuori ASAR; traduzione reale EN→IT e IT→EN in Electron usando gli asset
della directory pacchettizzata passata, con formule/codice/URL conservati.
Schermate musica chiare/scure ispezionate. Nessun setup NSIS nuovo, installazione
nel sistema, login reale Spotify o collegamento hardware Balance eseguiti.


Prova aggiuntiva reale del servizio: download dei sei asset pubblici in una
cartella di test ignorata, verifica dimensioni/decompressione/SHA-256, invocazione
main→worker, alterazione di un asset con stessa dimensione, rifiuto della
traduzione e riparazione esplicita riuscita. Nessun modello installato nel profilo
personale. Script e modelli della prova: `local-artifacts/offline-installer-integration.cjs`
e `local-artifacts/offline-install-integration/`. Runtime pacchettizzato verificato
con `npx electron tools/run_offline_translation_regressions.cjs local-artifacts/offline-translation/mozilla-assets dist/win-unpacked/resources/app.asar.unpacked/out/main/translation-runtime`.

## Per riprendere

1. Spotify: l'utente configurerà l'app nel Dashboard. Dopo Client ID e consenso,
   provare PC/cuffie, 204 senza riproduzione, ripresa, trasferimento e limiti reali.
2. Balance: leggere la ricerca in arrivo e verificare il trasporto prima di creare
   un pacchetto installabile. Nucleo già disponibile, niente companion sostituito.
3. Setup: esiste la directory Windows di collaudo in `dist/win-unpacked`; il
   precedente installer NSIS non incorpora questi cambiamenti.

Decisioni registrate tramite script: D-0304–D-0311. Non eseguiti commit, push,
installazione dell'app o invii AI reali; modifiche preesistenti conservate.


## Aggiornamento Q&A rapido — D-0312

Richiesta successiva implementata: Flash-Lite prima e riserve se non risponde.
`npm run check` passato integralmente con 507 Vitest, 24 Python, 41 Node,
Electron e riavvio, build e PDF reali. Modello delle dispense invariato.
Nessuna chiamata API reale o nuova misura di velocità. La directory Windows
D-0311 e il vecchio installer non sono stati rigenerati per questa modifica;
la build `out/` contiene la politica nuova.


## Installer rigenerato su richiesta — D-0313

Setup NSIS Windows x64 0.1.0 aggiornato con tutte le modifiche fino a D-0312:
`dist/Lezionify-Setup-0.1.0.exe`, 190731253 byte.
SHA-256: `a6b7db3df517588e580bf3586db28da9c3cdebaf99f127c84c214233f1011193`.
Build e packaging riusciti; 361 file della build confrontati con ASAR, manifest
SHA-512/dimensione verificato, politica Flash-Lite e runtime offline inclusi,
profili e artefatti personali esclusi. Aggiornati anche blockmap, latest.yml e
win-unpacked. Nessuna installazione o pubblicazione automatica eseguita.
Questo aggiornamento supera le note precedenti sul setup non rigenerato.
Per installare: chiudere Lezionify e avviare il setup nella cartella dist.


## Revisione della musica richiesta dall’utente — D-0314

Dopo aver verificato il telecomando, l’utente chiede una UI visuale e meno passi
ripetuti, con riferimenti Spotify allegati. [Nuovo flusso](musica-ui-2026-10-15.md):
lettore con copertina/controlli/posizione/volume, selezione automatica del PC e
preferenza persistente, aggiornamenti automatici, playlist/preferiti dopo consenso
aggiuntivo una volta, YouTube con schede anteprima e tracce. Nessuna riproduzione
avviata dalla sola apertura e nessun consenso alla libreria implicito.
`npm run check` interamente passato con 513 Vitest, 24 Python, 41 Node, suite
Electron/riavvio, build e PDF reali. Screenshot con metadati/copertine sintetiche
ispezionati in chiaro/scuro; nessun accesso al conto personale dell’utente da
parte dell’agente. Installer rigenerato e verificato dopo il quality gate (D-0315).

Setup aggiornato della nuova UI musica: `dist/Lezionify-Setup-0.1.0.exe`,
190754593 byte. Precedente setup conservato localmente; nessuna installazione
automatica. Guida e screenshot sintetici nel documento della UI musicale.
