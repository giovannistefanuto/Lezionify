# Musica durante lo studio: Spotify, YouTube e file locali

Aggiornamento 15 ottobre: pannello Spotify PKCE e compilation a timestamp implementati e collaudati con API sintetiche (D-0309); account personale ancora da configurare dall’utente. Il piano e le ricerche sottostanti restano storici. [Uso e limiti](../product/funzioni-approvate-2026-10-15.md).

Indagine del **13 ottobre 2026** sulle voci 5 e 6 delle
[idee future](../product/idee-future-2026-10-13.md), inclusa l'appendice dei sei
video. Durante l'indagine l'utente ha proposto il proprio account Spotify Premium.
Questo documento valuta le possibilità e propone il lavoro successivo; non
descrive una funzione già implementata o un collegamento già effettuato.

## Raccomandazione

**Per l'uso personale, approfondire prima un telecomando Spotify in Lezionify:**
Spotify desktop sullo stesso PC riproduce la musica; Lezionify offre pochi
controlli e collegamenti alle playlist. Il Premium già posseduto rende questa
strada più conveniente rispetto alla costruzione di un archivio ottenuto da
YouTube. La Web API documenta il controllo dei client Spotify e richiede Premium
per l'avvio della riproduzione.
[Avvio/ripresa e scope](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback).

È una **raccomandazione architetturale da validare con un pilota**, non una
promessa di funzionamento sul particolare account. Il download offline rimane
nell'app Spotify. Per un futuro prodotto pubblico, accesso alle API e condizioni
di distribuzione richiedono una valutazione distinta. Se l'accesso personale
non funziona, il ripiego concreto è salvare link e aprirli nel client ufficiale.

## Confronto delle modalità

| Modalità | Ascolto e controllo | Offline | Valutazione per Lezionify |
| --- | --- | --- | --- |
| Spotify desktop + Web API | Audio nel client ufficiale; pulsanti in Lezionify via rete | Download gestiti da Spotify; telecomando API richiede rete | Prima opzione per il caso personale Premium |
| Link Spotify | Apre album, brano o playlist; controlli nel client | Eventuali download già presenti nel client | Minima complessità; utile anche come ripiego |
| Spotify Web Playback SDK | Crea un dispositivo Connect nel browser e riproduce lì | Nessun flusso offline documentato per l'SDK | Non prima scelta per Electron: compatibilità/DRM da dimostrare |
| Embed Spotify | Widget ufficiale per presentare contenuti | Nessun archivio musicale locale | Non assumere equivalenza con un client Premium completo |
| File audio locali | Player HTML audio e controlli totalmente locali | Sì, se il file è disponibile | Alternativa adatta a chi vuole ascolto indipendente dal servizio |
| Link YouTube esterno | Avvio dal timestamp; controlli nel browser | Non fornisce file a Lezionify | Conserva i sei link originali senza un nuovo player |
| YouTube IFrame API | Player video visibile, intervalli controllabili | Nessun download attraverso il player | Meno adatto a un sottofondo discreto in Focus |
| Estrattore YouTube | Acquisizione e taglio tecnicamente possibili in alcuni casi | Possibile soltanto dopo acquisizione consentita e riuscita | Manutenzione e condizioni della fonte non giustificano una scelta iniziale |

Fonti per SDK/widget:
[Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk),
[Embeds](https://developer.spotify.com/documentation/embeds).
Le righe sui file locali sono proposte basate sul codice del progetto; le righe
YouTube sono approfondite sotto. Le modalità sono alternative di progetto:
questa tabella non propone un player unificato fra servizi.

## Spotify: cosa è verificato e cosa resta da provare

### Accesso personale e distribuzione

La modalità sviluppo richiede Premium al proprietario dell'app e consente fino
a **cinque utenti autenticati in allowlist**. L'estensione per un pubblico ampio
ha requisiti pubblicati per organizzazioni, servizio già avviato e almeno
250.000 utenti attivi mensili: non è il percorso normale di questo progetto
personale. Non presentare un Client ID condiviso come integrazione pubblica
pronta per tutti.
[Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

Il changelog di **luglio 2026** porta il limite di Client ID per sviluppatore a
**25** e aggrega le quote per account sviluppatore. Il valore «1» nella guida di
febbraio è quindi storico. La disponibilità effettiva della creazione dell'app
non è stata controllata nel dashboard dell'utente.
[Changelog luglio](https://developer.spotify.com/documentation/web-api/references/changes/july-2026).

La guida di migrazione 2026 limita la lettura degli elementi alle playlist
possedute dall'utente o collaborative; per altre playlist restituisce metadati
senza elenco. Search ha massimo 10 risultati per richiesta; diversi campi,
incluso `product` in `/me`, sono rimossi. **La restrizione di lettura non dimostra
che una playlist altrui non sia riproducibile:** provare separatamente avvio con
`context_uri` e lettura delle tracce. Non dipendere da `/me.product` per decidere
se il collegamento funziona.
[Guida di migrazione](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).

### Collegamento e credenziali

Proposta: registrare un'app personale «Lezionify» nel dashboard, usare il Client
ID e **Authorization Code con PKCE**, aprendo il login nel browser di sistema.
Nessuna password Spotify o Client Secret nell'app desktop. Validare `state`,
conservare il verifier solo per il tentativo corrente, chiudere il listener
dopo callback o timeout. Token e refresh devono restare nel processo principale,
protetti con `safeStorage`; il renderer riceve stato e metadati necessari.
[PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).

Il callback proposto è un listener temporaneo su `127.0.0.1`, con porta e percorso
registrati coerentemente. Spotify consente HTTP per IP loopback espliciti;
`localhost` non è ammesso. Non riutilizzare il server del renderer come callback
e non scrivere code, token, query OAuth o error body nei log.
[Redirect URI](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

Scope iniziali proposti: `user-read-playback-state` e
`user-modify-playback-state`. Aggiungere `playlist-read-private` e
`playlist-read-collaborative` solo quando si implementa la lettura delle playlist.
Non chiedere scope di scrittura playlist per un semplice telecomando.
[Elenco scope](https://developer.spotify.com/documentation/web-api/concepts/scopes).
La disconnessione dovrà eliminare token e cache personali e offrire il rimando
alla gestione delle autorizzazioni Spotify.

### Audio sul PC e cuffie Bluetooth

Un dispositivo **Spotify Connect** è un endpoint di riproduzione, per esempio
Spotify sul PC. Le cuffie Bluetooth collegate a Windows sono invece l'uscita
di quel PC: non vanno cercate come un secondo dispositivo Connect.
Proposta: selezione esplicita del PC per evitare di comandare per errore il
telefono; riproduzione gestita dal client e uscita verificata in Windows.

Gli ID dei dispositivi non sono garantiti permanenti; alcuni dispositivi non
compaiono e `is_restricted` può vietarne il controllo. Volume abilitato solo se
`supports_volume` è vero.
[Dispositivi](https://developer.spotify.com/documentation/web-api/reference/get-a-users-available-devices).
Il trasferimento deve essere esplicito; attendere lo stato prima dell'avvio,
senza inviare comandi paralleli.
[Transfer Playback](https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback).

Per il pannello iniziale bastano brano/artista/copertina, dispositivo, play/pausa,
successivo e «Apri Spotify». Un comando accettato non va mostrato come stato
confermato finché non viene riletto il player.
[Stato](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback),
[Pausa](https://developer.spotify.com/documentation/web-api/reference/pause-a-users-playback),
[Successivo](https://developer.spotify.com/documentation/web-api/reference/skip-users-playback-to-next-track).

Aggiornamenti a bassa frequenza mentre il pannello è attivo, refresh dopo comandi
e sospensione quando non serve. Gestire assenza del dispositivo, sessione privata,
token scaduto, 403 e perdita della rete. Su 429 rispettare `Retry-After` e distinguere
`QUOTA_EXCEEDED` dal limite temporaneo; non supporre una quota numerica fissa.
[Rate limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits).

### Offline e player dentro Electron

Premium consente download nel client ufficiale; su desktop i singoli brani si
possono mettere in una playlist da scaricare. Spotify richiede accesso online
almeno ogni 30 giorni per mantenerli. **Questo non crea MP3 importabili in
Lezionify**, né garantisce il controllo Web API senza connessione. In assenza
di rete si ascolta direttamente da Spotify in modalità offline.
[Ascolto offline](https://support.spotify.com/article/listen-offline/).

Il Web Playback SDK è documentato per browser supportati. La documentazione
non garantisce lo streaming nel runtime Electron di Lezionify; il supporto
Spotify descrive anche requisiti di contenuto protetto/Widevine.
[SDK](https://developer.spotify.com/documentation/web-playback-sdk),
[Assistenza web player](https://support.spotify.com/us/article/web-player-help/).
L'inferenza tecnica è preferire il controllo del client già funzionante, evitando
di introdurre un runtime alternativo prima di un bisogno dimostrato.

Verificato anche **Spotify Soloist**, client ufficiale headless per Linux, con
controllo CLI/WebSocket: non è una soluzione nativa per l'attuale Windows.
[Soloist](https://developer.spotify.com/documentation/soloist).

### Vincoli che incidono sul disegno

La policy richiede attribuzione e link ai contenuti, copertina e metadati durante
lo streaming, controllo dei dati e disconnessione. Limita monetizzazione delle
integrazioni streaming, integrazione con contenuti di altri servizi, sincronizzazione
con media visivi, sovrapposizione/mix di audio, analisi di ascolti e invio dei
contenuti Spotify a modelli AI.
[Developer Policy, I–IV](https://developer.spotify.com/policy).

Conseguenze proposte: niente playlist unificata Spotify/YouTube; niente musica
sincronizzata alle slide; pausa della musica prima dell'audio della lezione, con
verifica e comportamento esplicito se il comando fallisce; nessuna classificazione
AI dei contenuti Spotify o analisi della produttività collegata ai brani. Un
eventuale uso commerciale richiede una nuova valutazione. La proposta riguarda
l'ascolto scelto dall'utente durante la lettura, non l'uso della musica come
colonna sonora del PDF.

## YouTube e compilation: risultato dell'indagine originaria

### Sei link e timestamp

Le pagine pubbliche sono state aperte con lo strumento web. Dove è apparso un
titolo, questo è solo un riscontro documentale, **non un test live del player**;
gli errori dello strumento non dimostrano che un video sia rimosso.

| Video | Dati locali verificati | Riscontro web e limite |
| --- | --- | --- |
| [`mdJU5ogrPMY`](https://www.youtube.com/watch?v=mdJU5ogrPMY) | 31 tracce; ultimo inizio 8440 s (2:20:40) | Titolo restituito: Classical Music for Studying; durata/capitoli non acquisiti |
| [`VB0xl9tem9o`](https://www.youtube.com/watch?v=VB0xl9tem9o) | Nessuna traccia fornita | Errore dello strumento; disponibilità non determinata |
| [`7gtIh5dF9Xk`](https://www.youtube.com/watch?v=7gtIh5dF9Xk) | Nessuna traccia fornita | Titolo restituito: Just One More Drink -- Jazz Noir; tracce/durata non acquisite |
| [`7XPGU7dmZXg`](https://www.youtube.com/watch?v=7XPGU7dmZXg) | 23 tracce; ultimo inizio 3312 s (55:12) | Errore dello strumento; durata/capitoli non acquisiti |
| [`l-2hOKIrIyI`](https://www.youtube.com/watch?v=l-2hOKIrIyI) | Nessuna traccia fornita | Titolo restituito: 4 HOURS STUDY GIRL - Cozy lofi music and rain in background; «4 HOURS» non è una durata misurata |
| [`_B4NpBJIKq0`](https://www.youtube.com/watch?v=_B4NpBJIKq0) | Nessuna traccia fornita | Errore dello strumento; disponibilità non determinata |

Controllo locale realmente eseguito sulle **54 righe**: ID dei link corretti,
timestamp coerenti con `t`, inizi strettamente crescenti. Le fini delle ultime
tracce restano sconosciute. Non certificati diritti, disponibilità nel paese,
incorporabilità, presenza di parlato/canto o corrispondenza fra titolo e audio.

Per un futuro catalogo: conservare URL originale e ID canonico separati;
`list=RD...`/`start_radio` indicano un contesto radio, non le tracce interne.
`index` e `pp` non cambiano il video; `t` è un punto di partenza. Conservare titoli
originali, Unicode, crediti e un campo italiano facoltativo modificabile.
Gli elenchi forniti dall'utente possono essere importati senza chiamate AI.

### Intervalli nel player

L'IFrame API consente `startSeconds`/`endSeconds` nella forma a oggetto;
`seekTo` annulla l'effetto di `endSeconds`, perciò va ricostruito il limite o
controllato il confine. Il seek può raggiungere il keyframe vicino: non promettere
precisione al campione. Il player richiede almeno 200×200 px; errori 100,
101/150 e 153 distinguono contenuto non trovato, embed vietato e identificazione
client mancante.
[IFrame API](https://developers.google.com/youtube/iframe_api_reference).

L'app confezionata carica il renderer con `loadFile`: va verificato il Referer
nel pacchetto Windows, non solo in sviluppo. Le istruzioni ufficiali prevedono
identificazione dell'app desktop; `origin` non va trattato come sostituto
universale del Referer.
[Identità del player](https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity).

Le policy YouTube vietano il player nascosto usato per ascolto in background,
la separazione audio/video e l'offline tramite API senza approvazione. Questo
limita la desiderata barra musicale discreta mentre si studia in Focus.
[Developer Policies](https://developers.google.com/youtube/terms/developer-policies).

### Download: capacità dello strumento e autorizzazione della fonte

`yt-dlp` supporta sezioni per timestamp/capitoli e suddivisione dei capitoli con
FFmpeg. Per pieno supporto YouTube documenta anche `yt-dlp-ejs` e un runtime
JavaScript; il progetto Electron non fornisce automaticamente una CLI Node
compatibile a uno strumento esterno. I binari Windows aggregano componenti
con licenze diverse: non basta leggere «Unlicense» del sorgente. Aggiornamenti,
errori di estrazione e licenze rendono questa una dipendenza da mantenere.
[README ufficiale yt-dlp](https://github.com/yt-dlp/yt-dlp).

La possibilità tecnica non equivale al permesso di scaricare. I termini della
fonte prevedono usi autorizzati dal servizio o permessi applicabili: non assumere
che ogni audio dei sei link sia scaricabile. Nessun audio è stato scaricato e
nessun estrattore installato in questa indagine.
[Termini YouTube](https://www.youtube.com/static?template=terms).

Per una compilation locale autorizzata conviene prima una sola fonte e segmenti
virtuali `[inizio, fine)`, con la fine data dal prossimo inizio e l'ultima dalla
durata misurata. Esportare tracce fisiche solo su richiesta: conservare l'originale,
usare staging annullabile e nomi sicuri. FFmpeg può decodificare/ricodificare per
tagli più precisi; la copia dello stream dipende dai confini del formato.
[Opzioni di seek e stream copy](https://ffmpeg.org/ffmpeg.html).

Per CBR, stime decimali senza overhead: 57,6 MB/ora a 128 kb/s, 86,4 a 192,
115,2 a 256, 144 a 320. Fonte completa più tutte le tracce esportate può quasi
raddoppiare l'occupazione. I timestamp non identificano automaticamente la
stessa registrazione nel catalogo Spotify: per la classica servono compositore,
opera, movimento, arrangiamento e interpreti; gli altri video potrebbero non
avere corrispondenze. Non è stata verificata una migrazione delle 54 tracce.

## Alternativa completamente locale

Nel repository esistono già `src/components/AudioPlayer.tsx`, gestione range in
`electron/main/index.ts` e `electron/main/ffmpegPath.ts` con FFmpeg incluso.
È ragionevole riusare questa capacità, ma il player attuale è associato alla
lezione e si resetta al cambio URL: una coda musicale persistente richiede stato
indipendente dal drawer. Catalogo e file musicali devono restare separati dalle
lezioni, senza trascrizione, invio AI o pubblicazione automatica.

Proposta alternativa: import esplicito di file, play/pausa, volume, brano
precedente/successivo, coda e ripetizione, mantenendo l'uscita di sistema. Il
cambio cuffie o uscita durante l'ascolto richiede un collaudo Windows; non è
stato eseguito. Una selezione di uscita interna con `setSinkId` aggiungerebbe
permessi e casi d'errore: non serve per il requisito attuale.
[Audio Output API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId).

Musopen è una possibile fonte alternativa da consultare per registrazioni
scaricabili, controllando i termini del singolo file. Anche il sito distingue
composizione e registrazione e non garantisce lo stato di ogni upload; un'opera
classica antica non basta a rendere libera un'incisione recente.
[FAQ Musopen](https://musopen.org/faq/).

## Piano successivo concreto

1. **Pilota Spotify separato dall'app:** registrazione personale, PKCE, lettura
   dispositivi/stato, selezione esplicita del PC; prova play/pausa/successivo e
   una playlist scelta. Provare una playlist propria e una altrui distinguendo
   lettura e avvio. Non creare o modificare playlist automaticamente.
2. **Criteri di successo:** nessun dispositivo sbagliato comandato; refresh e
   disconnessione funzionanti; errori comprensibili; ascolto sulle cuffie
   selezionate; API del particolare account utilizzabili. Rete assente deve
   riportare il controllo al client Spotify, senza simulare comandi riusciti.
3. **Solo dopo il pilota:** piccolo pannello persistente in Focus e nell'archivio,
   collegamento opzionale, token cifrati e IPC validato. Conservare il comportamento
   normale di Lezionify anche quando Spotify è indisponibile. Nessuna nuova
   dipendenza appare necessaria per il telecomando HTTP, da confermare nel codice.
4. **Se il pilota non passa:** link al client ufficiale come opzione immediata;
   rivalutare un player locale se l'ascolto dentro Lezionify resta indispensabile.
5. **Prima di una distribuzione più ampia:** riesame di quota, privacy, branding,
   condizioni del player e combinazione con altri contenuti. Non trasferire
   automaticamente le conclusioni dell'uso personale a un prodotto pubblico.

Verifiche completate: lettura del codice, fonti ufficiali, confronto delle
modalità e controllo dei timestamp. Non eseguiti: login Spotify, creazione di
app, chiamate autenticate, ascolto/DRM, test Bluetooth o offline. L'indagine
scientifica è nel [documento dedicato](musica-concentrazione-evidenze-2026-10-13.md).
