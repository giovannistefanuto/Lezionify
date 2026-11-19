# Identita Windows e icona, 19 novembre 2026

## Riproduzione e causa

`Get-StartApps` restituiva Electron per `com.lezionify.app`. L'EXE installato
era presente, versione 0.3.1.0, ProductName e FileDescription Lezionify.
La lettura delle proprieta Shell mostrava lo stesso AppUserModelID in due
collegamenti: Lezionify verso l'installazione NSIS, Electron verso il runtime
di sviluppo del checkout. Il main assegnava quell'ID in entrambi gli ambienti.
La registrazione automatica delle notifiche di Electron crea il collegamento
Electron: il relativo codice upstream e' collegato nella
[procedura di recupero](../../skills/lezionify-release/references/identita-windows.md).

Secondo difetto: l'icona BrowserWindow puntava a `resources/icon.png`, esclusa
dal pacchetto. Verificata l'assenza direttamente nell'ASAR 0.3.1. L'icona
dell'EXE e i metadati del pacchetto precedente erano invece corretti.
Non e' stata osservata una cancellazione dell'app da parte dell'updater.

## Correzione e collaudi

`windowsIdentity.ts` configura l'ID prima di finestre/notifiche: produzione
invariata, sviluppo con suffisso `.development`. Vite emette `app-icon.png`
accanto al main e BrowserWindow usa quel percorso. Tre test unitari: due
falliti con il comportamento precedente, tutti passati dopo la correzione.

Il recupero locale ha copiato e verificato il solo Electron.lnk in conflitto,
controllato ID e destinazione esatti e rimosso solo quel collegamento. Dopo
l'indicizzazione `AuditShell` passa: Windows risolve nuovamente Lezionify.
Nessun dato personale, eseguibile o collegamento NSIS modificato. Nessun
collegamento fissato alla barra verso Electron o Lezionify rilevato nell'inventario.

Prova aggiuntiva reale con Electron 44.3.0, profilo isolato e notifica sintetica:
il collegamento generato contiene l'ID di sviluppo; salvato e rimosso il solo
collegamento del test. Audit Start nuovamente passato. Un secondo controllo
Electron ha aperto una finestra Windows nascosta con l'icona nell'ASAR finale:
decodifica riuscita, immagine 512 x 512. Diagnostiche in `local-artifacts/`.

Preparazione `release-20261119-144545`, profilo completo: inventario test,
typecheck, lint, 957 unitari in 84 file, ricerca RAG, 49 Python, 41 Node,
updater reale, regressioni React/Electron e riavvio, raccolte, Sessione,
build unica ed esportazioni PDF reali superati. Nessun test escluso dal gate.
Packaging riusa la build; sorgenti invariati durante tutta la preparazione.

Verificati 385 file della build, nove componenti NSIS, tre backup, hash e
dimensioni di setup/blockmap/manifesto, icona ASAR uguale alla sorgente,
metadati EXE 0.3.2 e icona distinta dal runtime Electron. Nessun materiale
personale incluso. Setup 300542486 byte, SHA256
`39d3e41cbb89af8abe64c35b786435e29bd28a9639c2423428e0ae9c29596f19`.
ASAR SHA256 `230eac96e41a5bdca3535f26fda83d7ee0d556a3981f7b1f06c7cb1cf507b4cd`.

## Limiti

Setup NotSigned; nessuna installazione sul profilo personale, nessuna prova
di upgrade su Windows temporaneo, UAC o SmartScreen. Il recupero Start e le
prove native descritti sopra sono stati eseguiti sul Windows reale, con dati
sintetici separati dall'archivio. La nuova release non aggiorna altri checkout.
Skill versionata e copia installata aggiornate e confrontate tramite hash.
Stato della distribuzione nella [procedura Windows](../publishing/aggiornamenti-windows.md).
