# Catalogo equivalente per i suoni di sottofondo offline

Data: 2026-10-16. Voce 18 di LISTA_ORDINE. L'utente ha accettato equivalenti agli originali Apple. Questa ricerca propone asset e non decide il catalogo finale. La prima raccolta fonti non ha acquisito audio; successivamente l'agente principale ha scaricato i sei candidati per verificarli tecnicamente, come riportato sotto. Nessun ascolto umano o inclusione nell'app è attestato da questo rapporto. Nessun codice applicativo modificato da questa ricerca.

## Raccomandazione

Sei categorie sono ottenibili con fonti e licenze esplicite: pioggia, oceano e ruscello dal catalogo audio di Blanket; rumore bianco, rosa e marrone dai tre lavori CC0 di newagesoup. Non sono gli audio Apple e non è dimostrata l'equivalenza acustica. Il totale compresso proposto è **11.623.969 byte**, circa 11,1 MiB, sommando metadati GitHub e intestazioni HEAD, non un download misurato. Il download deve essere un'azione dell'utente; dopo acquisizione e verifica i file devono restare locali.

## Tre paesaggi naturali: Blanket

Snapshot esaminato: `775f2a767230a9681850d1b1e085be58656f1382`. La [tabella delle licenze audio](https://github.com/rafaelmardojai/blanket/blob/775f2a767230a9681850d1b1e085be58656f1382/SOUNDS_LICENSING.md) è distinta dalla licenza GPL del programma. Non si assume che la licenza del codice copra gli audio. Le [regole di contribuzione](https://github.com/rafaelmardojai/blanket/blob/775f2a767230a9681850d1b1e085be58656f1382/CONTRIBUTING.md#sounds) specificano Ogg Vorbis e criteri di volume; non garantiscono da sole un loop senza giunture.

| Categoria proposta | File | Byte secondo GitHub | Autore e modifica | Licenza verificata alla fonte originaria |
| --- | --- | ---: | --- | --- |
| Pioggia | `rain.ogg` | 3.133.874 | alex36917; adattamento Porrumentzio | [CC BY 4.0, pagina dell'autore](https://freesound.org/people/alex36917/sounds/524605/) |
| Oceano | `waves.ogg` | 2.765.739 | Luftrum; adattamento Porrumentzio | [CC BY 4.0, pagina dell'autore](https://freesound.org/people/Luftrum/sounds/48412/) |
| Ruscello | `stream.ogg` | 5.025.476 | gluckose | [CC0, pagina dell'autore](https://freesound.org/people/gluckose/sounds/333987/) |

Dimensioni e nomi derivano dalla [API GitHub contents sul commit](https://api.github.com/repos/rafaelmardojai/blanket/contents/data/resources/sounds?ref=775f2a767230a9681850d1b1e085be58656f1382). Download pubblici proposti, con commit fissato:

- Pioggia: <https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/rain.ogg>
- Oceano: <https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/waves.ogg>
- Ruscello: <https://raw.githubusercontent.com/rafaelmardojai/blanket/775f2a767230a9681850d1b1e085be58656f1382/data/resources/sounds/stream.ogg>

Le fonti originarie Freesound sono WAV stereo 44,1 kHz: pioggia 126,316 s, oceano 120 s, ruscello 156 s. **Queste durate descrivono gli originali, non i derivati Ogg di Blanket**, che vanno misurati dopo l'acquisizione. La pioggia originale descrive anche tuoni e un clacson ferroviario distante; non è stato verificato se l'adattamento Blanket li conservi. Non promettere un ambiente privo di eventi riconoscibili senza ascolto. Le stesse pagine documentano questi dettagli.

### Verifica tecnica locale dei tre derivati

L'agente principale ha acquisito i tre file agli URL fissati sopra in `local-artifacts/ambient-evaluation-2026-10-16/` e comunicato i seguenti risultati il 2026-10-16. Tutti sono Vorbis stereo 44.100 Hz; decodifica completa FFmpeg con codice di uscita 0. Questo verifica il formato e la leggibilità, non qualità percepita o loop senza click.

| File | Durata effettiva misurata | SHA-256 dei byte acquisiti |
| --- | ---: | --- |
| `rain.ogg` | 124,58 s | `b84c1daf259a24283be40b7663656d17676df4eb60c1e0332820570db891848a` |
| `waves.ogg` | 118,03 s | `20e1aec7c7542f71645275871650881ea33bc92bd9816b243ea920bb1daa51a0` |
| `stream.ogg` | 145,53 s | `ce372c5db561168636647dd7d4aac39ef1785ae5d415ad0e589186ce1b7c5796` |

Per CC BY mantenere in app e documentazione titolo, autore, URL originario, URL della licenza e indicazione dell'adattamento Blanket/Porrumentzio; dichiarare anche eventuali ulteriori modifiche. CC BY consente condivisione e adattamento, anche commerciale, con attribuzione e senza restrizioni aggiuntive. CC0 consente riuso senza richiesta di permesso; mantenere comunque provenienza. Fonti: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

## Tre rumori: newagesoup, CC0

Le pagine ufficiali dell'autore su Freesound dichiarano **CC0**, WAV stereo 48 kHz, 24 bit, 10 s, circa 2,8 MB per originale. Sono generati con Audition; il rosa ha ritardo di 500 ms fra canali, il marrone un ritardo minimo e il bianco è descritto come più aspro. Fonti: [rosa 349312](https://freesound.org/people/newagesoup/sounds/349312/), [marrone 349314](https://freesound.org/people/newagesoup/sounds/349314/), [bianco 349315](https://freesound.org/people/newagesoup/sounds/349315/).

I WAV originali richiedono login per il download. Le stesse pagine espongono in `data-static-file-url` un MP3 HQ sul CDN ufficiale, senza autenticazione. Verifica **HEAD** del 2026-10-16: tutti HTTP 200, `Content-Type: audio/mpeg`, dimensioni seguenti. I corpi sono stati acquisiti nella verifica locale successiva documentata sotto.

| Categoria | URL MP3 HQ | Content-Length |
| --- | --- | ---: |
| Rosa | <https://cdn.freesound.org/previews/349/349312_4067257-hq.mp3> | 233.760 |
| Marrone | <https://cdn.freesound.org/previews/349/349314_4067257-hq.mp3> | 232.704 |
| Bianco | <https://cdn.freesound.org/previews/349/349315_4067257-hq.mp3> | 232.416 |

Il CDN non è un archivio immutabile: fissare un SHA-256 dopo download controllato e rifiutare contenuti diversi. Non usare un hash Git blob come SHA-256 dei byte. Durata effettiva, padding MP3 e giuntura vanno misurati; 10 s è la durata dichiarata del WAV. Credito consigliato: titolo, newagesoup, URL della pagina e CC0, anche se non obbligatorio dalla dedica.

## Alternative e verifiche prima dell'adozione

- Blanket include bianco e rosa, ma non marrone. La tabella Blanket indica CC BY-SA per entrambi. La [pagina originale rosa](https://commons.wikimedia.org/wiki/File:Pink_noise.ogg) offre più versioni CC BY-SA e segnala possibili artefatti. La [pagina originale bianco](https://commons.wikimedia.org/wiki/File:White-noise-sound-20sec-mono-44100Hz.ogg) è incoerente fra riquadro public domain e dati strutturati CC BY-SA 3.0. I tre CC0 omogenei sopra evitano queste ambiguità; non si conclude che gli altri siano inutilizzabili.
- Generazione locale del rumore è possibile e viene sperimentata anche da Blanket, ma cambia il modello del catalogo: non è un asset scaricabile. Richiederebbe algoritmo originale o licenza del codice separatamente verificata, validazione spettrale, volume e loop. Non viene adottata da questa ricerca.
- Prima di pubblicare il manifest, acquisire i sei file, calcolare SHA-256 e dimensioni reali, decodificare con Chromium/FFprobe, ascoltare in cuffia, verificare assenza di clipping e giunture. Per Ogg lunghi il buffer float stereo può occupare decine di MB: a 48 kHz, 156 s sono circa 60 MB decimali. È una stima tecnica, non una misura di memoria dell'app. Tenere solo il buffer selezionato e rilasciare quelli precedenti.
- Il loop deve essere verificato sul file decodificato; `HTMLAudioElement.loop` non dimostra assenza di pausa o click. Eventuali crossfade modificano la riproduzione e vanno collaudati. I link terzi possono cessare di funzionare: errore chiaro, retry e copia già scaricata utilizzabile offline.

La voce rimane aperta fino a implementazione e collaudo. Questo rapporto documenta provenienza tecnica e condizioni dichiarate dai titolari; non costituisce una concessione autonoma dei diritti.


### Verifica dei tre rumori e totale effettivo

Acquisiti anche i tre MP3 HQ in `local-artifacts/ambient-evaluation-2026-10-16/`,
solo per valutazione; non inclusi nell'app né adottati nel manifest. GET tramite
Node fetch con verifica TLS attiva: HTTP 200, byte uguali ai Content-Length.
Il primo tentativo con Python 3.10 ha fallito la verifica del certificato;
non è stata disabilitata TLS. Node fetch e curl Windows hanno raggiunto la
stessa fonte con verifica ordinaria.

| File | Byte acquisiti | SHA-256 |
| --- | ---: | --- |
| pink.mp3 | 233760 | c23e7b346309371fabff5f3666fa3406278eebcbeb131b1938f383547509dbd7 |
| brown.mp3 | 232704 | bf9eedbc84f15c4851ab30c7201d9400c148f5ddfb491539f31e30b8843ba269 |
| white.mp3 | 232416 | 7744dc5bcdd5c1913f584c2389ddc2b860e3ec5e818ab8dcaf9175ea6e2a0630 |

Decodifica completa con FFmpeg incluso nel progetto: uscita 0 per tutti,
stereo 48 kHz, contenitore MP3 10,03 s con start 0,023021 s. Non è una misura
della durata del buffer decodificato in Chromium. Totale effettivo dei sei
file: 11.623.969 byte. Restano da verificare riproduzione Chromium, giuntura,
qualità percepita e comportamento dell'interfaccia. Nessun test applicativo
eseguito per questa valutazione; catalogo e due scelte del player sono stati
proposti all'utente e sono ancora in attesa di risposta.
