# Studio, importazione e screenshot · 27 novembre 2026

## Perimetro

Sei richieste operative: previsione accanto alla lunghezza; metadati prima della trascrizione audio; screenshot Full Focus verso Foto di iCloud; spiegazione del paragrafo osservato; riletture accreditate alla lezione completata; rimozione dei log periodici di scansione. Gli appunti personali estranei al prodotto non sono stati salvati o trattati.

## Comportamento e diagnosi

L'importazione manuale precedente copiava subito i file e chiamava `queueAutomaticLectureProcessing` senza un passaggio di revisione. Ora selezione e conferma sono distinte: un token temporaneo mantiene nel main la corrispondenza ID/percorso, mentre la UI riceve solo nomi e proposte modificabili. Corso e data locale sono validati prima dell'importazione; annullamento e selezioni obsolete non possono avviare la coda. La copia, la deduplicazione e gli originali restano nel servizio esistente.

`scanAudioFiles` emetteva un riepilogo di tempi per ogni scansione, anche vuota o invariata. Due scansioni sintetiche riproducono due messaggi: la frequenza deriva dalla strumentazione nel percorso periodico. La vecchia segnalazione di scansione lenta era già ritirata (D-0469). Rimossi log e misure diagnostiche inutilizzate, mantenendo il controllo di integrità. I messaggi storici non sono cancellati.

Analisi aggregata in sola lettura del log personale, senza esportare percorsi o contenuti: 3.503 scansioni, di cui 2.005 vuote e 1.498 con audio; nessuna con errori registrati. Con audio presenti, mediana 98,69 ms e p95 167,86 ms; 20 scansioni oltre un secondo e 5 oltre cinque. Massimo complessivo 16.537,50 ms; il checksum assorbe l'88,68% del tempo complessivo misurato. Il normale percorso è rapido, con rari picchi principalmente nel controllo del contenuto; non viene introdotta una cache che indebolisca la verifica degli originali. I dati non provano la causa fisica dei picchi (disco, sistema o altro).

Il tracker non esclude le lezioni completate. `collecting: false` esclude gli esiti di previsione dalla calibrazione, senza fermare il registro dei secondi. La dicitura Info è aggiornata per rendere esplicite le riletture.

Il paragrafo è stimato geometricamente: blocchi visibili, porzione esposta e numero di parole distribuiscono i secondi; in Q&A un riferimento testuale univoco identifica il blocco, altrimenti vale l'ultimo osservato. Non è una misura dello sguardo o della comprensione. La previsione accanto alla lunghezza è di sola lettura, disponibile anche in Info; non scrive secondi o campioni.

Lo screenshot conserva in memoria una cattura della vista, con token e proprietario; il main valida il rettangolo e scrive un PNG univoco nella destinazione fissa già usata per gli schemi. Il renderer non può scegliere un percorso arbitrario. Rettangoli inversi e coordinate HiDPI sono normalizzati. Se tutta la selezione cade in una pagina PDF registrata, PDF.js renderizza solo il ritaglio su un canvas più definito, limitato a 24 milioni di pixel; in caso di indisponibilità resta la cattura nativa. Annullamento e successo liberano la cattura; un errore di scrittura la conserva per riprovare.

## Verifiche mirate eseguite

- Test Vitest: conferma necessaria, metadati conservati, coda chiamata una sola volta dopo conferma, token non riusabile; nessun log ordinario dopo due scansioni; geometria screenshot e previsione senza campioni.
- Electron reale: modulo audio, conferma e annullamento; selezione con gesto nativo inverso; errore e riprova; PNG da fonte più definita e da cattura normale con controllo dei pixel; annullamento senza file aggiuntivi. Screenshot sintetici nei temi chiaro/scuro sotto `local-artifacts/nov27-qa/` (ignorato).
- Il controllo pixel iniziale ha intercettato il fotogramma del modulo precedente in una sequenza sintetica senza attesa del repaint; la fixture ora attende due frame e il repaint nativo prima del gesto, mantenendo il confronto esatto dei pixel.
- La prova con Esc nativo e controller Full Focus reale riproduce il conflitto con la scorciatoia globale. Il controller ora lascia Esc ai nuovi dialoghi; annullamento senza uscita dal Focus verificato. La prima preparazione locale è stata interrotta durante i test, prima del packaging, per includere questa correzione.
- Il secondo gate si è fermato sul gesto della nuova fixture dopo gli scenari precedenti, prima della build. La fixture ora fissa esplicitamente dimensioni, zoom e focus della finestra per il gesto nativo, ripristina lo stato precedente e riporta la geometria in caso di errore. Nessun installer prodotto dal tentativo fallito.
- Dopo il passaggio completo della prima fase Electron, la riapertura ha esposto una creazione non idempotente della cartella screenshot della fixture (EEXIST). Corretta con mkdir ricorsivo, conservando i PNG e il riavvio reale previsto dal gate.
- Suite PDF reale: ritaglio da sorgente con dimensioni almeno doppie della selezione e regressioni di layout, lettura e Q&A.
- Suite studio: dopo completamento e riavvio del servizio, sette secondi di rilettura aumentano di sette il giornale della stessa lezione.
- TypeScript, lint e inventario dei test verificati prima del gate generale. La fixture del 27 novembre è richiamata anche dal runner completo.

## Limiti

Nessuna scrittura nella cartella iCloud personale durante i test: salvataggio reale su destinazione temporanea con lo stesso servizio. Sincronizzazione Apple non collaudata. Nessuna nuova chiamata AI, installazione personale o modifica ai dati dell'utente. Upgrade su Windows temporaneo, UAC e SmartScreen fuori dal collaudo disponibile.

## Gate completo e installer verificati

`local-artifacts/release-20261127-130108/report.json`: profilo full, tutti e cinque i passaggi con exit code 0 e sorgenti invariati durante la preparazione. `npm run check` include inventario, TypeScript, lint, 1.993 test Vitest in 183 file (il discovery comprende il checkout storico locale già presente), 49 Python, 41 Node, Java, Bluetooth, RAG, updater, React/Electron con riavvio, raccolte, Sessione e PDF reali.

La stessa build è stata confezionata senza ricostruzione. Verificati 385 file, nove componenti NSIS, tool YouTube e licenze, tre file di backup e assenza di materiali privati. Setup 353.318.491 byte, SHA256 `f4e9ea5938272f1b6d91f1c07f08830dddefa8c688119da79c3fe25f5a69477a`; ASAR SHA256 `249c95fba36b72904abab4fba1efbd93120be14e14419a21fe1bb5dac3b15efc`. Authenticode `NotSigned`. AuditShell successivo ai collaudi: Start risolve `com.lezionify.app` in Lezionify. Installer non eseguito sul profilo personale.

## Pubblicazione verificata

[Windows 0.9.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.9.0) pubblicata sul commit `09f9e61eb7cd3bc6726cfe1fdcf1a65568a97ca5`. Tutti e tre gli asset remoti sono uploaded e corrispondono per dimensione e SHA256 ai locali; `latest.yml` pubblico scaricato senza autenticazione è identico byte per byte. Aggiornamento disponibile, installazione personale non eseguita.

| Asset | Byte | SHA256 |
| --- | ---: | --- |
| Setup | 353318491 | `f4e9ea5938272f1b6d91f1c07f08830dddefa8c688119da79c3fe25f5a69477a` |
| Blockmap | 362116 | `41ef838a73f38739f6c3d8421abc81f151abfff4d7df4adf041366eb158c8d68` |
| latest.yml | 3185 | `4d2118efa319c47e81e4da70edbcabc34a457e8ca8277b6cb1bb973958b2bd40` |

Anche la [CI Windows del commit](https://github.com/giovannistefanuto/Lezionify/actions/runs/45998409643) è verde al secondo tentativo, sullo stesso codice: il primo si era fermato con ENOTEMPTY nella rimozione della cartella temporanea di un test Q&A preesistente. Le asserzioni applicative non erano fallite; nessun cambiamento o soppressione dei test per il retry. Il secondo tentativo completa unitari, Python/Node, React/Electron, updater, build, raccolte, Sessione e PDF. Il pull inizialmente sospeso per i documenti locali è stato completato con --ff-only dopo il commit, senza modifiche remote da integrare.
