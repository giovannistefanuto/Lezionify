# Audio YouTube e MP3: strumenti e librerie — 25 novembre 2026

Ricerca documentale su fonti primarie, senza installare librerie, scaricare video/audio o integrare una nuova funzione. Le proposte sono valutazioni tecniche, non risultati di un benchmark. La consultazione è del 25 novembre 2026; le versioni nei rami principali non attestano automaticamente ciò che è già pubblicato su npm/PyPI.

## Risultato

Per un primo pilota Windows/Electron propongo **yt-dlp come processo separato e FFmpeg per l’eventuale conversione MP3**. È una scelta progettuale motivata dall’interfaccia CLI e dall’isolamento del downloader, non una superiorità misurata. Per un’integrazione tutta Node, **YouTube.js (`youtubei.js`)** e il **nuovo `@distube/ytdl-core`** sono candidati da provare; quest’ultimo non va scartato usando vecchi risultati di ricerca che lo descrivono archiviato.

Il flusso è: URL → metadati/formati → traccia audio disponibile → file locale → eventuale MP3. Nei formati documentati compaiono audio AAC in MP4/M4A e Opus in WebM: ottenere MP3 normalmente richiede una ricodifica. Cambiare soltanto l’estensione non converte il codec. La distinzione contenitore/codec emerge dagli [esempi ufficiali degli stream pytubefix](https://pytubefix.readthedocs.io/en/latest/user/streams.html); la differenza tra copia dello stream e ricodifica è spiegata da [FFmpeg](https://ffmpeg.org/ffmpeg.html#Streamcopy). Per mantenere la fonte senza una seconda compressione, proporrei di conservare anche il file audio scaricato: è una proposta coerente con Lezionify, non un requisito delle librerie.

## Confronto

| Strumento | Cosa offre | Integrazione e limite decisivo |
| --- | --- | --- |
| **yt-dlp** | CLI e libreria Python, selezione della traccia audio, conversione tramite FFmpeg, metadati e avanzamento. Eseguibile Windows autonomo con Python incluso. | Buon candidato come processo isolato. Per pieno supporto YouTube occorrono anche EJS e runtime JavaScript supportato; FFmpeg/ffprobe servono per il post-processing. [README ufficiale](https://github.com/yt-dlp/yt-dlp) |
| **youtube-dl-exec** | Wrapper Node di yt-dlp con Promise/stream, percorso personalizzato del binario. MIT. | Non è un downloader diverso: eredita dipendenze e problemi di yt-dlp. Il postinstall scarica normalmente l’ultimo binario; per build riproducibili usare un artefatto fissato e verificato. [Documentazione](https://github.com/microlinkhq/youtube-dl-exec) |
| **YouTube.js / `youtubei.js`** | Client JavaScript/TypeScript non ufficiale di InnerTube, con download e formati; MIT. | Evita Python, ma il deciphering richiede un valutatore JavaScript da configurare. Non produce magicamente un MP3. [README](https://github.com/LuanRT/YouTube.js), [guida](https://ytjs.dev/guide/getting-started) |
| **`@distube/ytdl-core` attuale** | API `Ytdl`/`Quality`, stream Node, scelta audio, ripresa; MIT. | Il README attuale richiede Node 22.22.2+ su 22.x, 24.15.0+ su 24.x oppure 26+, e descrive generazione PO in worker. La compatibilità con il Node incorporato in Electron va provata. [README corrente](https://raw.githubusercontent.com/distubejs/ytdl-core/main/README.md), [guida](https://distube.js.org/ytdl-core/guides/getting-started/) |
| **`fent/node-ytdl-core`** | Interfaccia storica `ytdl()` con stream, filtro audio e progresso; MIT. | Il README avvisa sviluppo attivo sospeso dal 14 luglio 2023. Ci sono però push recenti: non basta definirlo “abbandonato” sulla sola base del README. Per un nuovo progetto gli darei priorità inferiore, da verificare sul campo. [README](https://raw.githubusercontent.com/fent/node-ytdl-core/master/README.md), [metadati repository](https://api.github.com/repos/fent/node-ytdl-core) |
| **pytubefix / pytube** | Librerie Python; pytubefix documenta filtri audio, download e callback. Entrambe MIT. | Valide per script Python, meno dirette nello stack Electron. Il download dello stream non equivale a codifica MP3. Non è stata misurata l’affidabilità rispetto a yt-dlp. [pytubefix](https://github.com/JuanBindez/pytubefix), [quickstart](https://pytubefix.readthedocs.io/en/latest/user/quickstart.html), [pytube](https://github.com/pytube/pytube) |

### Stato dei progetti: correzione delle fonti obsolete

La verifica diretta dell’API GitHub in lettura conferma che i sei repository seguenti risultano `archived: false`. `pushed_at` indica soltanto un push, non certifica qualità del download o manutenzione dell’estrattore:

| Repository | `pushed_at` UTC osservato | Fonte primaria |
| --- | --- | --- |
| yt-dlp/yt-dlp | 2026-11-24 18:07:09 | [API](https://api.github.com/repos/yt-dlp/yt-dlp) |
| LuanRT/YouTube.js | 2026-11-18 13:11:38 | [API](https://api.github.com/repos/LuanRT/YouTube.js) |
| distubejs/ytdl-core | 2026-11-04 08:33:31 | [API](https://api.github.com/repos/distubejs/ytdl-core) |
| fent/node-ytdl-core | 2026-11-10 09:30:03 | [API](https://api.github.com/repos/fent/node-ytdl-core) |
| JuanBindez/pytubefix | 2026-11-22 15:54:03 | [API](https://api.github.com/repos/JuanBindez/pytubefix) |
| microlinkhq/youtube-dl-exec | 2026-11-24 21:04:30 | [API](https://api.github.com/repos/microlinkhq/youtube-dl-exec) |

Alcuni risultati indicizzati descrivevano il fork DisTube come archivio; README, API e documentazione attuali raccontano una situazione diversa. Per `fent` rimangono invece discordanti l’avviso di pausa e il push recente: non si conclude automaticamente che lo sviluppo pieno sia ripreso. Il ramo principale di YouTube.js riporta 18.3.0 nel [package.json](https://raw.githubusercontent.com/LuanRT/YouTube.js/main/package.json); è un riferimento al sorgente consultato, non una verifica della versione npm installabile.

## Come si fa con yt-dlp

Esempi illustrativi, **non eseguiti**. Presuppongono yt-dlp, runtime/EJS e strumenti FFmpeg correttamente predisposti:

```powershell
# Scaricare la migliore traccia solo audio disponibile, senza forzare MP3
.\yt-dlp.exe --no-playlist -f bestaudio -o "%(id)s.%(ext)s" -- "URL_DEL_VIDEO"

# Scaricare audio e convertirlo in MP3 con FFmpeg
.\yt-dlp.exe --no-playlist -f bestaudio -x --audio-format mp3 --audio-quality 0 -o "%(id)s.%(ext)s" -- "URL_DEL_VIDEO"
```

Le opzioni sono documentate nel [README yt-dlp](https://github.com/yt-dlp/yt-dlp#usage-and-options). `--audio-quality 0` seleziona la migliore impostazione VBR del convertitore: non ricrea qualità che manca alla fonte.

Con un file già locale, la conversione MP3 è separabile:

```powershell
.\ffmpeg.exe -i "audio-originale.webm" -map 0:a:0 -vn -c:a libmp3lame -q:a 2 "audio.mp3"
```

`libmp3lame` e il parametro di qualità VBR sono descritti nella [documentazione dei codec FFmpeg](https://ffmpeg.org/ffmpeg-codecs.html#libmp3lame).

### Dipendenze che non vanno dimenticate

La [guida EJS ufficiale](https://github.com/yt-dlp/yt-dlp/wiki/EJS), con modifica visibile del 12 luglio 2026, richiede script EJS e un runtime: Deno è raccomandato e abilitato per default; Node va abilitato esplicitamente. La guida indica Node minimo 22.0.0. Gli eseguibili ufficiali yt-dlp includono gli script EJS; rimane da predisporre il runtime. Per il pacchetto Electron non si può assumere che esista già un `node.exe` autonomo nel PATH: va scelto e verificato un eseguibile supportato.

Per YouTube.js la [guida](https://ytjs.dev/guide/getting-started#providing-a-custom-javascript-interpreter), aggiornata visibilmente il 20 ottobre 2026, mostra il caso web. Il vincolo esiste anche nell’entrypoint Node del sorgente consultato: [node.ts](https://raw.githubusercontent.com/LuanRT/YouTube.js/main/src/platform/node.ts) imposta `eval` al valutatore [default.ts](https://raw.githubusercontent.com/LuanRT/YouTube.js/main/src/platform/jsruntime/default.ts), che lancia un errore se non sostituito. Quindi la libreria JavaScript non elimina il lavoro sul runtime. La valutazione del codice remoto va progettata in un processo isolato, senza usare ciecamente `Function` nel main Electron privilegiato; questa è una raccomandazione architetturale.

### Limiti reali

La [guida PO Token](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide) distingue token richiesti da alcuni client per metadati, streaming e sottotitoli; senza quelli necessari possono comparire 403 o formati mancanti. La [pagina degli estrattori](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#youtube) documenta limiti di frequenza e contenuti che richiedono autenticazione. Non è corretto promettere che qualsiasi URL funzioni sempre. Non sono state effettuate prove con account, cookie, token o contenuti limitati.

## Distribuzione e licenze

Il sorgente yt-dlp è Unlicense, ma il README precisa che gli eseguibili PyInstaller includono componenti GPLv3+ e il lavoro combinato è GPLv3+: la licenza del solo repository non descrive tutto l’EXE. Verificare gli avvisi del preciso artefatto scelto. [Licensing yt-dlp](https://github.com/yt-dlp/yt-dlp#licensing).

FFmpeg è LGPL 2.1+ nella configurazione di base; componenti opzionali possono rendere la build GPL. Occorre controllare la build distribuita e le relative licenze, non dedurre la licenza dal nome `ffmpeg.exe`. [Fonte ufficiale](https://ffmpeg.org/legal.html). Le licenze dei wrapper MIT non sostituiscono quelle degli eseguibili che avviano.

Per l’uso dei contenuti restano separati autorizzazione del titolare e regole della piattaforma: i [termini YouTube](https://www.youtube.com/static?template=terms), datati 15 dicembre 2023 nella pagina consultata, pongono condizioni su download e accesso automatizzato. La fattibilità tecnica non costituisce un’autorizzazione.

## Collocazione possibile in Lezionify

Nel checkout esistono `ffmpeg-static`, `electron/main/ffmpegPath.ts` e il runner FFmpeg cancellabile di `electron/main/videoImporter.ts`. La build FFmpeg locale elenca `libmp3lame`, `libopus` e `aac`; `ffprobe` non è incluso nelle dipendenze osservate. Sono fatti locali, non un collaudo del downloader.

Proposta per un eventuale pilota: acquisizione esplicita di un singolo URL autorizzato, estrazione in staging locale, conservazione dell’audio scaricato, MP3 come derivato se richiesto, poi riuso dell’importazione esistente. yt-dlp può essere avviato con argomenti separati e senza shell, avanzamento e annullamento; i binari andrebbero fissati per versione/hash e inclusi fuori ASAR. Wrapper Node opzionale: `child_process.spawn` è già sufficiente per lanciare una CLI, quindi aggiungere `youtube-dl-exec` deve avere un vantaggio concreto. Queste sono proposte, non modifiche approvate o implementate.

Prima di decidere servirebbe un pilota su pochi contenuti autorizzati: video breve/lungo, sola traccia audio, annullamento, errore rete e riavvio; confronto fra originali e MP3 con codec, durata, dimensione e tempo misurati. Per le opzioni Node vanno verificati worker/interprete e packaging nella precisa versione Electron. Al termine di questa ricerca non sono presenti nuovi downloader nell’app e non è stato scaricato alcun media.

## Sviluppo successivo nella stessa giornata

Su richiesta esplicita successiva sono stati implementati download e riproduzione
locale delle compilation e dei timestamp, con gli strumenti fissati e collaudati.
La ricerca sopra rimane lo snapshot precedente alla scelta. Stato attuale:
[uso della funzione](../product/youtube-locale.md) e
[verifiche D-0617/D-0618](../quality/youtube-locale-2026-11-25.md).
