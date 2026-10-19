# Importazione delle lezioni video

Dal menu **Importa → Importa uno o più video**, selezionare da uno a cento file.
Trascinarli nell’ordine della lezione, oppure usare le frecce, poi premere
**Converti**. Al termine scegliere corso attivo, data, inizio/fine e titolo
facoltativo, quindi **Salva nell’archivio**.

La scorciatoia **Game Theory · lunedì 16:30–18:00** riconosce il corso dal nome
o dalla sigla GT, imposta gli orari e il lunedì più vicino alla data indicata:
da martedì a giovedì il precedente, da venerdì a domenica il successivo,
di lunedì quello stesso giorno; a parità di distanza si preferisce il successivo.
Data e orari restano visibili e modificabili: nessuna data viene
ricavata dal download Moodle o dall’anno della registrazione. La durata audio
effettiva è indipendente dall’orario accademico scelto.

L’audio risultante viene salvato nella libreria privata dell’app, in
`audio/<id>.mp3`, e associato al corso/data come gli audio del registratore.
Il file ha un nome di origine leggibile con corso, data e ora. Si usa poi
**Elabora tutto** per la pipeline normale: trascrizione, dispensa ITA, traduzione
EN. Questa importazione non avvia chiamate AI, anche se l’elaborazione automatica
degli import MP3 è stata abilitata nelle impostazioni.

## Conversione e formati

Nessuna nuova dipendenza: viene usato `ffmpeg-static` già incluso. Il percorso
assoluto verificato in sviluppo è `node_modules/ffmpeg-static/ffmpeg.exe`; nel
pacchetto è `resources/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe`.
`ffmpegPath.ts` controlla che l’eseguibile esista; tutte le operazioni usano
`spawn`/`execFile` senza shell e una directory di lavoro esistente. Non viene
cercato il comando `ffmpeg` nel PATH di Windows.

Il selettore accetta MP4, M4V, MKV, MOV, AVI, WebM, WMV, FLV, MPEG/MPG,
MTS/M2TS/TS, 3GP, OGV e VOB. La decodifica dipende dai codec supportati dalla
build FFmpeg inclusa: un’estensione accettata non garantisce che un file protetto,
corrotto o con codec non disponibile sia leggibile.

Ogni video viene decodificato separatamente: prima traccia audio obbligatoria,
video/sottotitoli/dati esclusi, timestamp audio ripartiti da zero, PCM a 48 kHz
mono. Le parti WAV/RF64 normalizzate vengono concatenate e codificate una sola
volta in MP3 a 128 kbit/s. FPS, risoluzione e codec video possono essere diversi;
codec, frequenze e canali audio vengono uniformati. Non si applicano tagli,
normalizzazione del volume, silenzi aggiunti o adattamento all’orario della lezione.
La concatenazione diretta richiederebbe stream/codec/time base compatibili:
[documentazione ufficiale FFmpeg](https://www.ffmpeg.org/ffmpeg-all.html#concat-1).

I WAV temporanei occupano circa 346 MB per ora di audio; il MP3 finale circa
58 MB/ora. Gli originali restano intatti nella cartella scelta. Nei metadati
locali vengono conservati nomi, hash SHA-256, durate e ordine dei video, più
l’orario accademico di fine. La trascrizione e le derivazioni AI mantengono
gli stessi percorsi e protezioni dell’archivio esistente.

## Errori, annullamento e verifiche

Un file senza audio, corrotto o modificato durante la conversione interrompe
l’intera operazione senza salvare una lezione parziale. L’utente può annullare
la conversione e i processi FFmpeg, inclusa la lettura per il checksum. Le sessioni
usano ID opachi: il renderer non può sostituire i percorsi scelti dal dialogo.
Il salvataggio valida corso attivo, data reale e intervallo orario; i duplicati
sono rifiutati tramite hash dell’MP3. Un errore nel commit elimina la copia
in archivio e conserva l’audio temporaneo pronto per riprovare il salvataggio.
I temporanei propri vengono puliti alla chiusura/annullamento e, dopo un arresto
dell’app, al successivo avvio. Nessun video originale viene cancellato.

Dieci regressioni Vitest usano FFmpeg reale con video sintetici: MP4 MPEG4/AAC
44,1 kHz mono, MKV FFV1/PCM 22,05 kHz stereo, WebM VP9/Opus 48 kHz stereo,
FPS/risoluzioni/durate diverse. L’ordine viene verificato anche misurando i toni
nell’audio finale. Tre scenari React/Electron coprono riordino nativo con drag/drop
e frecce, progressi isolati, scorciatoia, errore e retry del salvataggio,
conversione fallita, annullamento e risposta tardiva. Schermate sintetiche
in modalità chiara/scura conservate in `local-artifacts/video-import-check/`.

Non sono stati usati video Moodle reali né eseguite richieste AI di collaudo.

## Consuntivo del 3 ottobre 2026

`npm run check` superato: typecheck, lint, 374 Vitest, 14 Python,
35 scenari React/Electron e build. Dopo il collegamento dell’abort alla
distruzione del servizio, ripetuti i dieci test video, i 35 scenari UI e lint;
la build del setup include la modifica finale.

Le prime prove hanno evidenziato un difetto nel drag/drop: il riferimento al
video trascinato veniva letto nell’updater React dopo essere stato azzerato.
Il sorgente ora cattura l’ID prima di accodare il riordino. Due aspettative
iniziali della fixture backend sono state corrette: Sync aggiunge
`missingAudio: false`, e il rollback va simulato dopo l’inizializzazione della
libreria. Il launcher UI iniziale non risolveva `node:fs` in esbuild browser:
gli stili vengono ora letti nel processo principale di test tramite IPC.
Le prime catture mostravano il frame precedente: il launcher attende rendering
e transizioni prima della cattura. Schermate finali chiare/scure controllate.

Setup NSIS x64 rigenerato con `npm run package:win -- --publish never`:
167.911.354 byte, SHA-256
`d4bf0128b4d9eb100e4d6f8ecf5b39e9837aabeb744906507b7a9dcb4e87cb64`.
Verificati 143 file di build identici all’ASAR, hash SHA-512 e dimensione del
manifesto, FFmpeg unpacked presente e artefatti locali esclusi. Installer
precedente conservato in `local-artifacts/video-import-check/previous-installer/`.

Smoke del codice pacchettizzato in Electron, con profilo e video sintetici,
rete bloccata e PATH vuoto: selezione dal dialogo simulato, bridge/preload reali,
MP4/MKV invertiti, MP3 di 1,32 secondi e 21.165 byte, una lezione GT del
28/09/2026 alle 16:30, sette eventi di progresso, pipeline idle, menu video
presente, originali preservati e temporanei vuoti. Le prime prove del launcher
sono terminate per timeout perché il facade CommonJS non sostituiva il dialogo
importato dal bundle ESM; corretto il solo harness mutando il metodo del dialogo
nel processo di prova. Smoke finale superato, zero richieste di rete.

Il setup è disponibile in `dist/Lezionify-Setup-0.1.0.exe`; non è stato avviato
né installato automaticamente. Chiudere l’app e installarlo prima di usare
la nuova voce Importa nell’app già installata.

## Correzione della data della scorciatoia

Su richiesta dell’utente, il preset sceglie ora il lunedì più vicino, anziché
quello precedente: giovedì mantiene il precedente (tre giorni contro quattro),
venerdì anticipa il successivo (tre giorni contro quattro), così come sabato
e domenica. Lunedì resta la stessa data. Il confronto favorisce il futuro
in caso di parità e opera sui giorni di calendario locali, senza sottrarre
intervalli di 24 ore che possono cambiare durante l’ora legale.

Undici nuove regressioni coprono tutta la settimana, passaggi di mese/anno
e cambio dell’ora legale; il test React modifica la data nel campo reale per
giovedì, venerdì, sabato e domenica e verifica la data trasmessa al salvataggio.
`npm run check` passato: 385 Vitest, 14 Python, 35 scenari React/Electron,
typecheck, lint e build. Schermate aggiornate in
`local-artifacts/video-import-nearest-monday/`.

Colloquio con preload/IPC e interfaccia compilata nell’ASAR verificato anche
nel pacchetto: selezione e conversione sintetiche con PATH vuoto, preset
28/09 per giovedì 01/10 e 05/10 per venerdì 02/10, sabato 03/10 e domenica
04/10. Zero richieste di rete, originali conservati e staging vuoto dopo annulla.
I primi due tentativi del nuovo harness UI cliccavano il corso Game Theory
nella sidebar anziché il pulsante nel dialogo; corretto il selettore del solo
harness. Il profilo viene ricaricato dopo aver creato il corso sintetico via
API per allineare le impostazioni caricate dal renderer.

Installer generale rigenerato: 167.911.489 byte, SHA-256
`bc2902feccfdf0a8c75b4a23461cc9df367033052fc487961255df27b1233c9c`.
Verificati 143 file identici alla build, manifesto, FFmpeg e assenza di
artefatti locali; setup precedente conservato nella cartella locale di prova.
Percorso di consegna invariato: `dist/Lezionify-Setup-0.1.0.exe`.
