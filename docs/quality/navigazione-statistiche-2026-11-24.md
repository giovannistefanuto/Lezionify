# Navigazione e statistiche — 24 novembre 2026

## Perimetro concordato

Le sole quindici richieste dell’utente, con approvazione della disposizione prima dell’implementazione (D-0607). Audio ha priorità rispetto a RIPETERE; Consulta diventa RAG. Nessuna altra voce della coda avviata e nessuna integrazione Mistral. Gli aggiornamenti documentali Mistral concorrenti sono conservati.

| Richiesta | Risultato |
| --- | --- |
| Musica nelle Statistiche | Accesso duplicato rimosso, accesso laterale conservato |
| Sottotitolo sui segnali | Rimosso |
| Stato di oggi | Messaggio dinamico sulla soglia esistente di 600 secondi; minuti mancanti o ✅ completato |
| Nota su record e crediti | Rimossa |
| Mattino/pomeriggio | Spiega che il tempo senza orario resta nel totale giornaliero |
| Dati insufficienti | Spiega interruzione delle osservazioni o cambio dell’orologio; fasce marcate Dati insufficienti |
| Voto di attenzione | Frase rimossa |
| Totali dell’archivio | Una riga richiudibile, dettagli secondari |
| Barra laterale in Sessione | Calendario affiancato non modale, editor ancora protetti; piano e sessione selezionati conservati |
| Scorciatoie | Sezione Impostazioni con gruppi apribili e contesto per ogni combinazione |
| 0.0 lez/giorno | Formattazione comune negli appelli e nelle schede corso; esempio 2 lezioni in 86 giorni |
| Rotazione dei controlli | Sostituita con evidenziazione di sfondo e bordo, anche da tastiera |
| Ricerca da Statistiche | Navigazione all’Archivio e focus del campo, risultati nella vista visibile |
| Posizione Cerca lezioni | Campo sopra l’elenco, accesso laterale e Ctrl+K |
| Organizzazione menu | Audio, Sessione, RAG, Memo e Pausa subito accessibili; RIPETERE, Log e Impostazioni in Strumenti |

La X di Sessione resta una X con area di 40×40 pixel, contrasto e focus visibile. Nessuna nuova dipendenza o migrazione dei materiali. Nessuna chiamata AI durante questi collaudi.

## Diagnosi e regressioni

Riproduzione iniziale deterministica in Electron: `node tools/run_hook_regressions.cjs --sidebar-menu-only` falliva con «Sessione blocks the visible sidebar with a modal dialog». La causa è `showModal()`, che rende inerte l’intero contenuto sottostante anche con backdrop trasparente. Correzione limitata al calendario affiancato: `show()`. Editor, appelli esterni e calendario sopra Full Focus usano ancora `showModal()`.

La ricerca prima viveva nella Sidebar e aggiornava `useLectures` senza cambiare vista. Ora `ArchiveSearch` vive nella vista Archivio; il comando laterale e Ctrl+K selezionano e mostrano la vista, poi focalizzano il campo. Ctrl+K non smonta gli editor modali aperti.

Il caso 2/86 produceva `0.0` con `toFixed(1)`. `formatExamPace` presenta carichi inferiori a una lezione al giorno come numero di lezioni nei giorni disponibili; i carichi maggiori mantengono il ritmo giornaliero con decimale italiano. Il completamento ha un messaggio proprio.

L’avviso sui dati insufficienti deriva dagli intervalli `unknown` del tracker: sequenza temporale non valida, differenza tra tempo monotono e orologio maggiore di tre secondi oppure osservazioni distanti più di quindici secondi. Non implica perdita delle fonti o azzeramento dello studio. La spiegazione in interfaccia resta descrittiva senza attribuire una causa unica ai dati storici.

## Verifiche

- Typecheck e lint passati durante l’implementazione.
- Test mirato del ritmo passato: carichi piccoli, singolare, completamento, scadenza odierna e decimali.
- Riproduzione della Sidebar passata dopo la correzione; aggiunta verifica che gli editor restino modali.
- Regressioni Electron di barra laterale e record passate; soglie di oggi provate a 0, 599, 600 e 3600 secondi.
- Scenario compilato esteso con ricerca reale di «ciao», cancellazione, passaggio da Statistiche e Sessione, Ctrl+K e riapertura del piano; passato anche con catalogo Scorciatoie, temi, finestre da 900 pixel, zoom al 125%, 150% e 200%, Full Focus e riavvio. Selettori del runner corretti a pulsanti con emoji e `.lecture-row`, senza alterare asserzioni di prodotto.
- La prova al 200% ha rilevato un debordo con barra visibile: corrette la dimensione minima della seconda colonna, la riserva della X sul solo titolo e la disposizione dei controlli. Una preparazione appena avviata è stata interrotta prima del packaging; il gate completo riparte dopo la correzione, senza saltare verifiche.
- Schermate sintetiche e log locali: `local-artifacts/navigation-statistics-20261124/`, esclusi da Git.

`npm run release:local` completato con profilo full: gate completo (421 s), packaging della stessa build (554 s), validazione asset, payload NSIS e confronto finale tutti con uscita 0. Rapporto locale: `local-artifacts/release-20261124-170545/report.json`. Nessun controllo escluso.

Passati 1978 test unitari in 179 file, periodi Java, query Win32 Bluetooth reale, RAG offline, 49 Python, 41 Node, updater reale e UI, regressioni React/Electron con riavvio, raccolte, Sessione sorgente e compilata con riavvio, PDF reali. Typecheck, lint, inventario e contratto release passati. Audit Windows Start: `com.lezionify.app` risolve Lezionify.

Verificati 385 file build, nove componenti NSIS, tre backup con hash, runtime e assenza di materiali privati. Nessuna seconda build dopo il gate; compressione invariata.

| Asset | Byte | SHA256 |
| --- | ---: | --- |
| Lezionify-Setup-0.7.0.exe | 300574402 | 2ce27be7fa3e60965b098fff899becc160ac44859578e74377b7b7a35ab3b8d7 |
| Lezionify-Setup-0.7.0.exe.blockmap | 306649 | 4f58985ede54aa7d2f19f9077e113050816d8f501dd2a014f69950a2e1452869 |
| latest.yml | 2670 | 470c645348779423d7ac1837a88af86468c5e76716e84d74484f02d0fd18699c |

ASAR SHA256: `85b0cb28146ad60264197bce33d4aeca5184ae8075ec9aadb7bfa596721ba6b6`. Firma effettiva: `NotSigned`. Installer estratto e verificato, non eseguito sul profilo personale.

Release stabile latest [v0.7.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.7.0) pubblicata e verificata sul commit dei binari `08ee3787deba829821e7f2676c8a7422035b0f0f`. Installer, blockmap e manifesto sono tutti uploaded con nomi, dimensioni e digest corrispondenti ai file locali. `verify` conferma release pubblica e manifesto anonimo identico byte per byte. Sorgenti verificati sul remoto `main`; documentazione finale pubblicata con commit successivo. L’aggiornamento è disponibile; nessuna installazione personale eseguita.

## Limiti

I dati insufficienti non vengono ricostruiti retroattivamente. Le scorciatoie Memo con Alt dipendono dalle lettere configurate nei gruppi. Il profilo personale non viene installato o modificato dai test; i collaudi usano archivi sintetici temporanei. Upgrade su Windows temporaneo, UAC e SmartScreen non disponibili su questo host. I binari restano non firmati, da verificare anche sugli asset finali.
