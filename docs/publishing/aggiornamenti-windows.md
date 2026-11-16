# Aggiornamenti Windows

Implementazione introdotta in 0.2.0, decisione D-0528. Ricerca e alternative:
[valutazione del 15 novembre](../research/aggiornamenti-automatici-github-2026-11-15.md).

## Comportamento dell'app

La versione installata Windows NSIS controlla le Release pubbliche di
`giovannistefanuto/Lezionify` una volta per processo, 1,5 secondi dopo la prima
sottoscrizione dell'interfaccia. La verifica non blocca l'apertura. Nessun token
GitHub, contenuto delle lezioni o chiamata AI è coinvolto. GitHub riceve i normali
metadati delle richieste HTTPS, incluso l'indirizzo IP.

Viene proposta solo una versione stabile maggiore. Download e installazione
sono separati: **Aggiorna · scarica**, poi **Riavvia e aggiorna**. Non si installa
alla normale chiusura. Più tardi nasconde l'avviso per quella sessione;
la sezione Generali delle impostazioni permette di riaprirlo. Gli errori di
rete restano nel pannello senza bloccare l'uso offline.

Le note sono Markdown con HTML, immagini e collegamenti remoti esclusi dal
rendering. Vengono mostrate le note incluse nei metadati della versione; se il
provider restituisce un changelog cumulativo viene conservato. Il collegamento
Tutti i rilasci consente di leggere le versioni intermedie quando i metadati
contengono soltanto le novità dell'ultima. Dopo un aggiornamento le note vengono
mostrate una volta, tramite una ricevuta locale fuori dall'archivio delle lezioni.

Prima del riavvio occorre chiudere lezione, Sala e finestre di modifica.
Le callback di Memo, storico di studio e bozze Sala attendono il salvataggio;
quelle fallite restano raggiungibili anche dopo la chiusura della vista.
Il main rifiuta l'installazione durante IPC pendenti, pipeline, RIPETERE,
pubblicazione o lavori RAG. Poi blocca nuovi IPC, differisce il publisher,
svuota lo storage Electron e i log prima di invocare NSIS. Un errore riabilita
il lavoro. Un lock di singola istanza evita due applicazioni installate aperte
contemporaneamente. Non si cambia il formato dei dati né il percorso del profilo.

Le build di sviluppo, il controllo CLI RAG e la portable non avviano controlli
automatici NSIS. La portable conserva l'accesso alla pagina dei rilasci.
La prima installazione di 0.2.0 resta manuale: le copie 0.1.0 non contengono
il codice per cercare aggiornamenti.

## Preparare ogni nuova versione

1. Incrementare la versione stabile, ad esempio `npm version 0.2.1 --no-git-tag-version`.
2. Creare `docs/releases/0.2.1.md` con sezioni Novità, Dati e riavvio, Limiti noti.
   Specificare eventuali cambiamenti ai dati. Aggiornare `releaseInfo.releaseNotesFile`
   in `electron-builder.yml` al nuovo file.
3. Eseguire `npm run release:validate` e il gate `npm run check`.
4. Per una build locale usare `npm run package:win -- --publish never`, poi
   `npm run release:validate -- --artifacts`. Installer, blockmap e `latest.yml`
   devono provenire dalla stessa build. Non ricaricare binari differenti con
   una versione già distribuita.
5. Nel workflow **Prepare Windows release**, avviato manualmente su GitHub,
   il gate e la costruzione precedono la creazione di una Release **in bozza**.
   Lo stesso file Markdown diventa il testo della Release. La bozza non viene
   pubblicata automaticamente: verificare prima il pacchetto e completare il
   collaudo su installazione temporanea Windows, quindi pubblicarla da GitHub.

La rigenerazione locale dell'installer generale resta soggetta al commit/push
automatico di AGENTS.md; i binari ignorati vanno invece negli asset della Release.
Il workflow non sovrascrive Release esistenti. Il suo token GitHub rimane in CI,
non nell'app. La destinazione è pubblica, verificata il 16 novembre tramite
il connettore GitHub: se il repository diventa
privato, predisporre un feed pubblico separato o progettare autenticazione utente,
senza incorporare un PAT condiviso.

## Firma e permessi

Il flusso usa gli hash dell'updater e supporta la verifica Authenticode prevista
da NSIS quando il pacchetto contiene il publisher configurato. Il workflow
accetta i segreti `WINDOWS_CSC_LINK` e `WINDOWS_CSC_KEY_PASSWORD`; nessun
certificato è stato creato o acquistato da questa implementazione. Con build
non firmate non si deve dichiarare autenticazione del produttore: l'hash del
manifest garantisce coerenza del download, non un'identità indipendente da GitHub.
Prima della distribuzione pubblica definire publisher e firma e provare rinnovi.

La configurazione conserva l'installer assistito e propone l'installazione
per utente. Non migra automaticamente installazioni esistenti per macchina.
NSIS viene avviato in silent con riapertura richiesta; UAC può restare necessario
per installazioni amministrative. Non è previsto rollback automatico dei dati.

## Verifiche e limiti

### Pacchetto 0.2.1 del 16 novembre

Correzione dell'ordine delle lezioni e richiesta esplicita di pubblicazione:
D-0531 e D-0532. Gate completo passato con 880 unit, 24 Python, 41 Node,
updater su loopback, regressioni Electron con riavvio, build e PDF reali.
Regressione ordine rossa prima della modifica e verde dopo; gate della
ricerca locale e runtime RAG confezionato su profilo temporaneo passati.
Confrontati 378 file build, nove componenti NSIS, manifesto/note e tre backup.

Setup 300207519 byte, SHA256
`849a5775f03db6e6fab29de1f7b7dc95b2a1678d75890591e494617b7a2380a6`.
Installer `NotSigned`, non eseguito. Firma, upgrade tra installazioni reali,
UAC e SmartScreen restano non collaudati e dichiarati nelle note della Release.
La pubblicazione richiesta usa i tre asset verificati della medesima build;
non rappresenta una verifica dei limiti ancora aperti.

### Verifiche iniziali 0.2.0

Esito finale del 16 novembre: typecheck, lint, build di produzione e schema
builder superati; suite completa con 880 test unitari, 24 Python e 41 Node.
Regressioni React/Electron generali e persistenza dopo riavvio passate,
come il runner dedicato all'updater, il gate della ricerca locale e i PDF
reali. Un fallimento intermittente del menu corsi è stato riprodotto in un
caso minimo e corretto evitando lo scroll del focus (D-0529); la regressione
minima e la suite Electron completa sono passate dopo la correzione.

Setup `dist/Lezionify-Setup-0.2.0.exe` generato, 300207135 byte, SHA256
`2bf2de3357ce1aad48650ec594db99fbee0da5c91d45ff2df510a039f94ec612`.
Verificati 378 file build, nove componenti estratti dal payload NSIS incluso
`app-update.yml`, manifesto con note e tre backup dell'installer precedente.
Il runtime confezionato passa inferenza isolata, worker PDF, preparazione
esplicita del modello pubblico, recupero vettori e rifiuto modello corrotto.
Il setup è `NotSigned` e non è stato eseguito; nessuna Release binaria pubblicata.

- `tests/unit/appUpdater.test.ts`: consenso, serializzazione, retry, ricevuta,
  fallimenti di preparazione/installazione e gate IPC.
- `npm run test:app-update`: vero electron-updater 6.8.9 su server HTTP loopback
  e profilo temporaneo; versione uguale/minore/prerelease, assenza di download
  preventivo, hash errato e rifiuto del verificatore del publisher. Il verificatore
  del certificato è simulato; il controllo hash e il trasporto sono reali.
- Il medesimo runner verifica la UI React, rinvio, consenso, note sicure,
  fallimento del salvataggio e chiamata esplicita di riavvio. Screenshot sintetico
  ignorato in `local-artifacts/app-update-ui.png`.
- Il passaggio finale a `quitAndInstall` è intercettato nella fixture: non si
  esegue il file EXE sintetico. Non sono state installate due versioni reali,
  verificati UAC/SmartScreen o misurati aggiornamenti differenziali.
- Nessuna Release, tag, installer o certificato viene pubblicato da questi test.
  Prima di distribuire il bootstrap provare davvero upgrade per utente/macchina,
  riapertura, archivio personalizzato e rifiuto UAC in ambiente isolato.
