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

Dalla 0.5.0 il comando **Aggiorna ora**, dopo il download verificato, salva
le modifiche aperte e le bozze ripristinabili senza richiedere chiusure manuali.
Memo, storico, Sala e Q&A partecipano alla preparazione; le risposte parziali
sono conservate con indicazione dell'interruzione. Gli editor conservano i dati
salvati o bozze locali riapribili. Un salvataggio fallito blocca il riavvio.
Poi il main congela nuovi IPC, interrompe le richieste AI, svuota la pipeline
e attende servizi e IPC già accettati. Pubblicazioni già in corso terminano
prima del riavvio. Storage Electron e log vengono scaricati su disco prima
che NSIS sia invocato. Errori riabilitano l'app; i lavori cancellati richiedono
un nuovo avvio esplicito. Il controllo e gli avvisi iniziali restano invariati.
Un lock di singola istanza evita due applicazioni installate aperte insieme.
Non si cambia il formato delle fonti né il percorso del profilo.

Le build di sviluppo, il controllo CLI RAG e la portable non avviano controlli
automatici NSIS. La portable conserva l'accesso alla pagina dei rilasci.
La prima installazione di 0.2.0 resta manuale: le copie 0.1.0 non contengono
il codice per cercare aggiornamenti.

## Correzione Windows 0.3.2, 19 novembre

Gate completo passato: 957 unitari, 49 Python, 41 Node, updater, regressioni
React/Electron con riavvio, raccolte, Sessione e PDF reali. Verificati 385 file,
nove componenti NSIS, tre backup e assenza di dati personali. Metadati e icona
EXE corretti, icona ASAR confrontata con la sorgente e caricata in una finestra
Windows nascosta. Recuperata la ricerca Start e verificato l'isolamento dello
sviluppo con una notifica reale. [Rapporto completo](../quality/identita-windows-2026-11-19.md).

Setup SHA256 `39d3e41cbb89af8abe64c35b786435e29bd28a9639c2423428e0ae9c29596f19`;
300542486 byte, NotSigned. Nessuna installazione sul profilo personale e nessuna
prova di upgrade su Windows temporaneo, UAC o SmartScreen.
[Release 0.3.2](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.3.2)
pubblicata e verificata sul commit dei binari
`bb07f7ebfef750826aa0815ca0ad0fcfa1c6f08c`: tre asset con dimensioni e digest
corrispondenti, tag sul commit atteso e manifesto pubblico identico byte per byte.
Aggiornamento disponibile, installazione personale non eseguita.

## Preparare ogni nuova versione

La verifica dell'identita Windows fa parte del packaging: metadati e icona EXE,
icona BrowserWindow presente nell'ASAR e identita distinta fra sviluppo e NSIS.
Sul PC installato controllare anche Start dopo i test. Diagnosi e recupero del
caso "Electron" sono nella [skill](../../skills/lezionify-release/references/identita-windows.md).

La skill [lezionify-release](../../skills/lezionify-release/SKILL.md) guida
l'esecuzione completa, incluse ripresa degli upload e verifica pubblica.
La [diagnosi della 0.2.2](../../skills/lezionify-release/references/incidenti-0.2.2.md)
distingue errori operativi, limiti dell'ambiente e cause ancora non dimostrate.

1. Incrementare la versione stabile, ad esempio `npm version 0.2.1 --no-git-tag-version`.
2. Creare `docs/releases/0.2.1.md` con sezioni Novità, Dati e riavvio, Limiti noti.
   Specificare eventuali cambiamenti ai dati. Aggiornare `releaseInfo.releaseNotesFile`
   in `electron-builder.yml` al nuovo file.
3. Scegliere il profilo e avviare `npm run release:local` come descritto sotto.
   Il comando automatizza backup, collaudi, build, packaging e verifiche.
4. In esecuzione manuale, dopo `npm run check` riusare la build con
   `npm exec -- electron-builder --win --publish never`, poi
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

## Profili di preparazione locale

Il comando `npm run release:local -- --dry-run` mostra il piano senza creare
backup o binari. Il profilo predefinito `full` mantiene l'intero `npm run check`.
Il packaging riusa `out/` prodotto dal gate: una sola build, compressione invariata.
Il workflow GitHub segue la stessa regola, mantenendo il gate completo.

Per una piccola correzione esclusivamente visiva a miniature Q&A o relativi CSS:
`npm run release:local -- --profile ui --base <tag-ultima-release-pubblica>`.
Prima verificare il tag su GitHub, recuperarlo con `git fetch origin --tags`
se manca localmente ed esaminare l'intero diff, inclusi i commit
gia presenti: i cambiamenti devono riguardare solo dimensioni, spazi e aspetto,
con comportamento delle chiamate, stato e gestione dati invariati. Il controllo
automatico ammette solo i file UI elencati in `tools/prepare_release.py`, test,
documenti e metadati di versione; rifiuta altri file, nuove dipendenze e modifiche
alla configurazione builder diverse dal percorso delle note. L'elenco dei file
e' un limite aggiuntivo, non sostituisce la revisione semantica del diff.

Il profilo UI esegue inventario, typecheck, lint, tutti i test unitari, contratto
release, scenari Electron Focus/PDF/Q&A e build. I test non eseguiti (Python,
benchmark, updater, raccolte, PDF export e altri scenari Electron) vanno indicati
nel rapporto come fuori perimetro, senza dichiarare il gate completo superato.
Se il cambiamento visivo interessa altri flussi o restano dubbi usare `full`;
non passare a UI per aggirare un fallimento del gate completo.

Entrambi i profili conservano backup con hash e verificano asset, payload NSIS,
corrispondenza build/pacchetto e assenza di dati personali. I log e i tempi sono
in `local-artifacts/release-<timestamp>/`; sorgenti cambiati durante il processo
interrompono la preparazione. Non eseguire due preparazioni contemporaneamente.
Alla fine leggere i risultati, verificare la firma effettiva e seguire la skill
per commit/push, upload e pubblicazione. Il comando locale non pubblica da solo.
Una preparazione fallita conserva backup e log: diagnosticare prima di ripartire;
non ricostruire asset gia pubblicati e non riutilizzare un rapporto per altri sorgenti.

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

### Pacchetto 0.3.1 del 19 novembre

Lettura e Q&A: voci 158, 159, 161, 162 e 164 completate; 131 ancora aperta
per campioni insufficienti. Il profilo completo ha superato 954 test unitari,
49 Python, 41 Node, updater, React/Electron con riavvio, raccolte, Sessione
e PDF reali. [Dettagli e limiti](../quality/lettura-qna-2026-11-19.md).

Riutilizzata la build del gate. Verificati 384 file build, nove componenti NSIS
e tre asset del backup 0.2.5. Nessun artefatto personale nel pacchetto.

| Asset | Byte | SHA256 |
|---|---:|---|
| `Lezionify-Setup-0.3.1.exe` | 300328855 | `edc67ff703b2daa7fee73abdd64c12f63815fcd796de5c4f42fbe82250fdec09` |
| `Lezionify-Setup-0.3.1.exe.blockmap` | 305607 | `7d8a2cffd38a83a01bdfa679f4658eca07cb7c886e40c90dacc3b35f05fc393e` |
| `latest.yml` | 2784 | `c16a16f8e0932e17e0fd099d9b41edc7a33826cc997aa09173bf7bf04c8622b4` |

Authenticode: `NotSigned`. Installer estratto e verificato, non eseguito sul
profilo personale. Upgrade Windows reale, UAC e SmartScreen non collaudati.
Release stabile [v0.3.1](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.3.1)
pubblicata sul commit dei binari `5d725205175e63aadb6774c74aef8d75dd655439`.
Tutti e tre gli asset remoti hanno dimensioni e digest coincidenti con i file
locali; il manifesto pubblico scaricato senza credenziali è identico byte per byte.

### Pacchetto 0.3.0 del 18 novembre

Sessione riunisce gli appelli, le bozze e il piano confermato, con esiti,
promemoria e proposta di spaziatura. La versione include il collegamento Android
facoltativo introdotto nel setup locale 0.2.5. Il profilo completo è passato con
954 test unitari, 49 Python, 41 Node, ricerca locale, updater, Electron,
Sessione con riavvio, raccolte e PDF reali.

Il packaging ha riusato la build del gate. Verificati 383 file, nove componenti
NSIS e tutti e tre gli asset del backup 0.2.5. Materiali privati esclusi.

| Asset | Byte | SHA256 |
|---|---:|---|
| `Lezionify-Setup-0.3.0.exe` | 300226781 | `1f753c73038ccc2f35ebb1a290ef000702fc0e56402a9e694bbb334daef3090f` |
| `Lezionify-Setup-0.3.0.exe.blockmap` | 304930 | `a014790d8d86e7b50c6ccf6e2336ccbfd379349f5b82598c6c06986c8cce2939` |
| `latest.yml` | 2022 | `9ed93b227458e497383913e9d96b265fdf77c005ce922c86b86267d28c7a24eb` |

Release stabile pubblicata sul commit `9955c8cfe9c7618cd3c5baa00736b43d0329949a`.
Gli asset pubblici corrispondono ai digest locali e `latest.yml` scaricato
senza credenziali coincide byte per byte con il file locale.
[Release v0.3.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.3.0)

Authenticode ha restituito `NotSigned`. Setup verificato tramite estrazione,
senza eseguirlo sul PC personale. Il collaudo di upgrade tra installazioni
reali, UAC e SmartScreen resta aperto. Google Calendar è una fase successiva.

### Pacchetto 0.2.4 del 17 novembre

Miniature delle slide attive nel Q&A ridotte per lasciare spazio alla risposta,
con ingrandimento e rimozione mantenuti. Gate completo superato: 930 unit,
44 Python, benchmark Node, ricerca locale, updater, Electron con riavvio,
raccolte nell'app compilata e PDF. La regressione nel drawer riproduce la
miniatura precedente di 270 × 180 pixel e verifica dimensioni e ingrandimento.

Verificati 382 file build, nove componenti NSIS e tre backup della 0.2.3;
materiali privati esclusi. Setup 300212145 byte, SHA256
`0d17443c228d45f5aea763c488c3e66dff1f63695d5a98e7e917cd9ed6d5b4b3`.
Installer non firmato e non eseguito; upgrade reale, UAC e SmartScreen restano
non collaudati. Nessuna nuova prova del download modello semantico.

[Release v0.2.4 pubblicata](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.2.4)
sul commit `0dd81e62aa192ca384e2a628d05130fcfca35c86`. I tre asset remoti
sono verificati e il manifesto pubblico coincide byte per byte con quello locale.

### Pacchetto 0.2.3 del 17 novembre

Richieste 152–156: ricerca per pertinenza, ragionamento Q&A esplicito,
conteggio del traduttore e dei pannelli operativi, promemoria periodici esami.
Gate completo verde: 930 unit in 76 file, 40 Python, 41 Node, RAG offline,
updater, Electron con riavvio, build, raccolte nell'app compilata e PDF reali.
Controlli mirati finali studio/esami, typecheck e lint passati.
Inventario senza test mancanti, esclusioni o riduzioni. Contratto thinking SDK
con risposte sintetiche, nessun nuovo benchmark Gemini reale.

Verificati 382 file build, nove componenti NSIS e tre backup della 0.2.2.
Runtime confezionato con modello locale e worker PDF passato senza rete AI;
nessun nuovo tentativo del download pubblico non pertinente a questa modifica.
Setup 300212383 byte, SHA256
`7ee6b5b9fbb6ffd8349c1f42bc994b6b90a53ce7d1bb9e08115a8b2a0cf1a000`.
Installer NotSigned, non eseguito; limiti su installazione reale e notifiche
Windows dichiarati nelle note. Nessun materiale personale nel pacchetto.
Il lookup di una bozza senza tag materializzato è coperto dall'helper corretto:
fallback all'elenco autenticato e recupero esplicito sul commit originale dei
binari, con confronto dei soli cambiamenti documentali/test/strumento.
Le quattro nuove regressioni portano la suite Python finale a 44 test passati.

[Release v0.2.3 pubblicata](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.2.3)
il 17 novembre sul commit dei binari `c59a00e`. La correzione del solo helper
è pubblicata separatamente in `b3abfed`, senza modificare o ricaricare il setup.
I tre asset remoti hanno dimensioni e digest SHA256 coincidenti con i file
locali. Verificati tag sul commit originale, stato stabile latest e manifesto
pubblico scaricato senza autenticazione identico byte per byte.

### Pacchetto 0.2.2 del 17 novembre

Raccolte Altro e richiesta esplicita di pubblicazione: D-0534–D-0540.
Gate completo passato con 914 unit, 24 Python e 41 Node, RAG offline,
updater, Electron con riavvio, raccolte nell'app compilata, build e PDF reali.
Nessun test escluso. Due worker Vitest evitano contesa I/O senza cambiare
asserzioni o timeout. Il primo gate ristretto aveva impedito FFmpeg e loopback;
la ripetizione autorizzata fuori dal sandbox risolve questi errori.

Runtime confezionato con modello presente e rifiuto del modello corrotto
passati. Il download pubblico aggiuntivo si interrompe durante il trasferimento
in due tentativi: non viene dichiarato riuscito né riutilizzato il rapporto
di una versione precedente. Limite esplicitato nelle note 0.2.2.
Installer non firmato; installazione reale, UAC e SmartScreen non collaudati.
I materiali personali richiesti sono copiati e verificati solo nell'archivio
locale, esclusi da sorgenti, installer e asset pubblici.

[Release v0.2.2 pubblicata](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.2.2)
il 17 novembre sul commit `9de8675`. Installer finale 300209742 byte, SHA256
`a62984bafdb045e62aa19736899260da2d9e14cd201dacba855226785e44c3e9`.
Confrontati 382 file build, nove componenti NSIS e tre backup. Installer,
blockmap e `latest.yml` remoti hanno dimensioni e SHA256 coincidenti con i
file locali; manifesto pubblico scaricato senza autenticazione e identico.

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

[Release v0.2.1 pubblicata](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.2.1)
il 16 novembre sul commit `ec8e3f4` (D-0533). Installer, blockmap e `latest.yml`
risultano caricati con dimensioni e SHA256 remoti uguali ai file locali;
manifesto pubblico scaricato senza autenticazione e confrontato byte per byte.
Il primo caricamento interrotto è stato ripreso con gli stessi binari, senza
rigenerare o sostituire una versione già distribuita.

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

## Release stabile 0.4.0 — 20 novembre 2026

D-0591: gate completo e asset verificati, stessa build per NSIS, compressione
invariata. Setup 300545797 byte, SHA256
`be7e1dc0a38d36f60272083c3cecb191962c0771fb47911c4c8c19b87b081e40`.
385 file build e nove componenti embedded confrontati; tre backup verificati,
nessun artefatto personale incluso. Firma NotSigned; AuditShell passato.
[Collaudi e limiti](../quality/studio-connessioni-2026-11-20.md).
D-0592: [release pubblica stabile latest](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.4.0),
tag sul commit `6deff6916d1876adb983e5bd48a3d72ee3ef0926`.
I tre asset remoti coincidono per digest e dimensioni con i locali; il manifesto
pubblico scaricato senza credenziali è identico byte per byte. Aggiornamento
disponibile, installer personale non avviato.

## Preparazione Windows 0.5.0, 23 novembre

Gate completo verde nel checkout isolato dopo la riattivazione Bluetooth;
983 unitari, 49 Python, 41 Node e tutti gli scenari desktop passati. Setup
ricavato dalla stessa build; validati 384 file, nove componenti NSIS e tre
backup. Verificatore allineato al nuovo pulsante Aggiorna ora senza cambiare
i binari. Setup 300.561.964 byte, SHA256
`673ff8601e38464d9fb16e344de6eabcfaacdfc60adfdc1da1ee7f02a0659b0d`,
NotSigned. [Rapporto e limiti](../quality/coda-qna-widget-2026-11-23.md).
Android 0.1.2 installato sul telefono su richiesta, con dati e abbinamento
conservati tramite aggiornamento sul posto. Nessuna installazione Windows
personale eseguita. [Release Windows 0.5.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.5.0)
pubblicata stabile latest e verificata sul commit `728a4fda876cee32123cb3129fb65c3715fbaf02`.
Digest e dimensioni dei tre asset coincidono; manifesto pubblico anonimo
identico byte per byte. Gli asset sono quelli collaudati, senza ricostruzione.
Upload iniziale interrotto con bozza vuota; stesso installer trasferito con curl,
poi resume dei soli asset mancanti tramite helper e verifica pubblica completa.


## Release 0.6.0 del 23 novembre 2026

Pubblicata e verificata [v0.6.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.6.0), stabile latest, sul commit dei binari `9b09e0a0702600f8709dd5415e4ba957cf05cbeb`.
Le cinque richieste riguardano disconnessione cuffiette, avvisi di due secondi, Pausa compatta, conteggi e bilanciamento delle chiavi Gemini, recupero Q&A con massimo due ulteriori chiamate fisiche. [Collaudi e limiti](../quality/avvisi-chiavi-qna-2026-11-23.md), [note](../releases/0.6.0.md); D-0602–D-0605.

Profilo completo passato: 1976 unitari, 49 Python, 41 Node, periodi Java, Bluetooth Win32, RAG, updater reale e UI, React/Electron con riavvio, raccolte, Sessione compilata e PDF reali. Altri cinque test Node del pilota preesistente e scenari visivi mirati passati. Build unica riusata per il packaging, compressione invariata; verificati 385 file build, nove componenti NSIS e tre backup. Nessun materiale personale nel setup.

| Asset | Byte | SHA256 |
| --- | ---: | --- |
| `Lezionify-Setup-0.6.0.exe` | 300571533 | `c4758fdad6f194895bf41136267647aebfb4582dd4fd1682dccc453bb8973d8f` |
| `Lezionify-Setup-0.6.0.exe.blockmap` | 306300 | `e89941cd394a73829ecd5d8bd31edc49f351e1758673554bfb9e1c5d7ba48caa` |
| `latest.yml` | 2921 | `a4568ea3de90f2412a9f8ebf1a7f74fc25be632e5de70bd108ada2113b73a088` |

Tre asset remoti uploaded con dimensioni e digest coincidenti; manifesto pubblico scaricato senza credenziali identico byte per byte. Authenticode: `NotSigned`. Audit Shell passato; installer non eseguito sul profilo personale. Upgrade su Windows temporaneo, UAC e SmartScreen non collaudati. Il nuovo conteggio locale parte dalle chiamate effettuate con questa versione; nessuna ricostruzione dello storico precedente o misura della fatturazione Google. Nessuna inferenza reale sui materiali personali per questi collaudi.


## Pacchetto 0.7.0 — 24 novembre 2026

Le sole quindici richieste concordate per navigazione, ricerca, scorciatoie e
statistiche sono descritte nel [rapporto](../quality/navigazione-statistiche-2026-11-24.md).
Gate completo passato: 1978 unitari, 49 Python, 41 Node, periodi Java,
Bluetooth reale, RAG offline, updater, React/Electron con riavvio, raccolte,
Sessione e PDF reali. Layout collaudato da 900 pixel e fino al 200% di zoom.

Build unica riusata per NSIS con compressione invariata; verificati 385 file,
nove componenti NSIS e tre backup. Nessun materiale personale nel pacchetto.
Setup 300574402 byte, SHA256
`2ce27be7fa3e60965b098fff899becc160ac44859578e74377b7b7a35ab3b8d7`.
ASAR SHA256 `85b0cb28146ad60264197bce33d4aeca5184ae8075ec9aadb7bfa596721ba6b6`.
Authenticode `NotSigned`; Start risolve l’identità corretta. Nessuna installazione
sul profilo personale; upgrade Windows temporaneo, UAC e SmartScreen non collaudati.
Rapporto completo locale in `local-artifacts/release-20261124-170545/report.json`.
Release stabile latest [v0.7.0](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.7.0)
pubblicata e verificata sul commit dei binari `08ee3787deba829821e7f2676c8a7422035b0f0f`.
Tutti e tre gli asset remoti sono uploaded, con dimensioni e digest identici ai
file locali; il manifesto pubblico scaricato senza credenziali è identico byte
per byte. Aggiornamento disponibile, installazione personale non eseguita.
