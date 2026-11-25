# YouTube locale — 25 novembre 2026

Richiesta: aggiungere Scarica in locale accanto alle aperture YouTube e sostituirlo
con Riproduci quando il file è disponibile. Implementazione D-0617 e chiusura verifiche D-0618; nessun installer
generale rigenerato e nessuna pubblicazione richiesta.

## Contratto implementato

- Catalogo e timestamp restano in `shared/musicCatalog.json`; download e protocollo
  accettano soltanto ID del catalogo. Nessun percorso o comando scelto dal renderer.
- `YoutubeAudioService` possiede stato, mutex, staging, cancellazione, verifica,
  metadati atomici e file in `userData/youtube-audio`. Una copia per compilation,
  fonte preservata e MP3 verificato con decodifica FFmpeg prima della disponibilità.
- Sottoprocessi con argv separati, senza shell, finestra nascosta, timeout e ambiente
  ridotto. Annullamento Windows termina l’albero dei processi e attende la chiusura
  prima della pulizia. Stop e drenaggio partecipano a chiusura e aggiornamento app.
- Hash e dimensioni di fonte e MP3 vengono verificati prima della lettura; la cache
  dei digest è invalidata da dimensioni, mtime e ctime. Percorsi reali e symlink sono
  controllati; il marker non può puntare fuori dalla cartella dedicata. Gli originali
  completati rimangono conservati anche se conversione, cancellazione o pubblicazione
  del marker falliscono. Nessun marker ready è scritto per un parziale.
- `media://youtube/<id>` riusa lo streaming locale con Range. Il lettore HTML audio
  persiste fuori dal ciclo di vita del pannello; niente decoding integrale in RAM
  di compilation lunghe. I timestamp oltre la durata sono segnalati.
- IPC protetti dal wrapper main esistente e dal gate updater; status/download/cancel/url
  in `shared/youtubeAudio.ts`. Nessun effetto su lezioni, tracker o provider AI.
- Download espliciti; nessun account o cookie letto. Argomenti ignore-config,
  no-plugin-dirs e no-remote-components; Deno/EJS locale. FFmpeg converte solo file
  locali con protocolli file/pipe. Errori utente fissi, senza stdout/stderr remoti.

## Dipendenze binarie e packaging

Manifest in `resources/youtube-tools/manifest.json`, licenze e NOTICE nello stesso
percorso. yt-dlp 2026.11.23 EXE SHA256
`622ed48023cac1daa52a3bf3a6ac38f03514de214b5f0fa069389fd0f6d17e5c`.
Deno 2.9.8 ZIP ufficiale SHA256
`cba84b26e0df5ae7f74fc66b86a95b866872a86292ebd84fa1e959927edd93bf`,
EXE estratto SHA256
`924397800533d3eb0ed0c889b20ad70e18b970d93acd8135bc043f425e528266`.

`tools/prepare_youtube_tools.py` acquisisce gli artefatti ufficiali e verifica gli
hash. `--verify` non usa rete ed è parte di `npm run build`; le procedure di
packaging passano dalla stessa verifica. CI e workflow di release preparano gli
strumenti prima del gate. Gli EXE sono ignorati da Git e copiati come extraResources
in `resources/youtube-tools` del pacchetto, con manifest, GPLv3, licenza sorgente
yt-dlp e MIT Deno. `verify_youtube_tools.cjs` è richiamato dal verificatore installer.
Gli EXE upstream sono esclusi dalla firma del packaging tramite signExts negativo,
per evitare che una firma futura ne cambi gli hash fissati. Il workflow release
controlla anche i file già copiati nel pacchetto. Compressione installer invariata; nessuna libreria npm aggiunta. Dimensioni dei due
EXE: 23.627.865 e 98.081.568 byte, circa 116 MiB non compressi aggiuntivi.

## Collaudi

- Unità: sette casi in `tests/unit/youtubeAudio.test.ts`: deduplicazione, timestamp
  condivisi, fonte e MP3, riavvio, corruzione e recupero, annullamento e drenaggio,
  concorrenza, ID e strumenti alterati, conversione/decodifica FFmpeg reale, junction
  esterne, conservazione fonte dopo errore e stop reale di processo con figlio Windows.
- Renderer Electron: `node tools/run_hook_regressions.cjs --youtube-local-only`.
  Status e sottoprocessi simulati al confine IPC; Audio nativo sostituito solo nel
  test della UI per controllare timestamp, mantenimento della sessione e pause.
  Verificati nessun download all’apertura, pulsanti su ogni riga, progresso,
  annullamento, ready→Riproduci, errori ritentabili e riapertura del pannello.
  Lo scenario è registrato anche nella suite completa. Screenshot chiaro/scuro e
  layout stretto in `local-artifacts/youtube-ui/`.
- Prova reale opzionale: `node tools/run_youtube_audio_smoke.cjs`, eseguita sul film
  pubblico della Blender Foundation `aqz-KE-bpKQ`, senza account/cookie. Fonte M4A
  30.760.667 byte, MP3 14.620.389 byte, durata decodificata 634,609 secondi. Download,
  conversione, decodifica, hash e originale conservato passati; rapporto locale in
  `local-artifacts/youtube-audio-smoke/report.json`. Il vecchio ID di test
  `BaW_jenozKc` rispondeva video non disponibile: non è stato usato come successo.
- App compilata reale: `node tools/run_youtube_native.cjs`, profilo temporaneo,
  rete bloccata, fonte di prova copiata sotto un ID catalogo soltanto nella fixture.
  Main/preload/renderer di produzione: IPC, risposta Range 206/128 byte, durata,
  playback MP3 nativo, seek 213 s, chiusura/riapertura e pausa per lezione passati.
  La richiesta Range è verificata dalla sessione Electron; un fetch cross-origin
  dal renderer non è il percorso del lettore nativo. Nessun profilo personale usato.
- Verifiche finali: **1006 test unitari in 93 file passati**, typecheck, lint e
  inventario verdi; nessun test disattivato. Suite completa React/Electron passata,
  compreso il riavvio del processo. Scenario YouTube mirato ripetuto anche per
  timestamp fuori durata e recupero dopo rimozione del file. Build finale passata;
  lettore nativo ricontrollato su quella build. Il vecchio filtro music-only dipende
  dal mock getSettings inizializzato nel percorso completo: la nuova prova autonoma
  ha precondizioni proprie e non modifica o salta le asserzioni della suite generale.
- Strumenti e licenze locali verificati; pacchetto cartella di prova separato in
  `local-artifacts/youtube-package/`, senza creare un installer. La stessa build
  viene riusata per il controllo dei file copiati e dell’ASAR. Verificati **385 file**
  identici alla build, assenza di artefatti personali e hash/avvisi degli strumenti
  corretti anche nel pacchetto finale. Rapporto locale `verification.json`.

## Limiti e stato distribuzione

Prova reale su un video pubblico; non sono state scaricate tutte le compilation del
catalogo né usati contenuti personali, privati o con restrizioni. Il servizio YouTube
può cambiare; un errore mantiene apertura nel browser e possibilità di riprovare.
I file di prova sono negli artefatti ignorati. I download interrotti dall’app si
annullano; una terminazione forzata del processo può lasciare staging non pubblicato,
che non viene dichiarato scaricato. Non è implementata una ripresa automatica dei
frammenti dopo crash. Le fonti completate dopo errore sono conservate, un retry
acquisisce una nuova copia. Nessuna chiamata AI o pubblicazione di contenuti.

## Preparazione release Windows 0.8.0

D-0619 e D-0620: pubblicazione autorizzata esplicitamente. Profilo completo di
`npm run release:local` passato; rapporto locale
`local-artifacts/release-20261125-145239/report.json`, tutti e cinque i passaggi
verdi e impronta sorgenti invariata durante il processo. Discovery completo:
1.989 unitari in 181 file, comprendenti i 1.006 test attuali e 983 del vecchio
worktree locale; 49 Python, 41 Node, Java, Bluetooth Win32, RAG offline, updater,
React/Electron con riavvio, raccolte, Sessione compilata e PDF reali passati.

Il primo gate era terminato su Sessione con `document.hasFocus() === false`:
il timer sospeso era coerente con la perdita di focus. La prova isolata e il
successivo gate completo sono passati senza modificare codice, asserzioni o
criteri. Nessun test saltato. Lettore MP3 nativo ricontrollato sulla build finale.

Build unica riusata per NSIS; verificati 385 file build, nove componenti embedded,
tre backup e assenza di materiali personali. Estratti inoltre dal payload reale
tutti e sette i file `youtube-tools`: hash e licenze verificati. Identità EXE e
AuditShell passati. Setup 353.312.770 byte, SHA256
`89177cc6f79b32620601dd1e63993cf7d2b28e79a7b3b276a71e816c14b181f4`;
ASAR `03fb00453bd103bdc9eb6b2f681785b20dc96690a7bc58d9dfffe641c6956e7f`.
Firma effettiva `NotSigned`. Installer personale non eseguito; upgrade Windows
temporaneo, UAC e SmartScreen restano non collaudati. L’APK Android 0.2.0 già
preparato resta identico ai sorgenti e agli hash del rapporto originale.

D-0621: [v0.8.0 pubblicata](https://github.com/giovannistefanuto/Lezionify/releases/tag/v0.8.0)
stabile latest sul commit `c7e4c1326872ef688ad4d04e8687d1b6b8e8142f`.
Tre asset remoti verificati per dimensioni e SHA256, tag sul commit atteso e
manifesto pubblico anonimo identico ai byte locali. Android 0.2.0 pubblicato
separatamente e verificato senza cambiare latest Windows. Binari invariati.
