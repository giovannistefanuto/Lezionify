# YouTube: download e ascolto locale

Implementazione richiesta il 25 novembre 2026, decisione D-0617.

In **Musica → YouTube**, accanto ad **Apri su YouTube**, compare **Scarica in
locale**. Lo stesso comando è presente accanto a ciascuna traccia con timestamp.
Scaricare una traccia acquisisce una sola copia della compilation: dopo il
completamento, tutti i suoi pulsanti diventano **Riproduci** e avviano quel file
nel punto scelto. I timestamp restano modificabili dalle Impostazioni.

Il download parte solo premendo il pulsante. Avanzamento e conversione sono
visibili; **Annulla download** è disponibile anche cambiando compilation.
Un solo download alla volta evita duplicati e carico concorrente. Non parte
alcuna riproduzione al termine del download: premere Riproduci quando desiderato.
Le compilation già disponibili si possono ascoltare mentre un’altra si scarica.

Il lettore locale offre pausa, ricerca nella traccia e volume. Continua a
suonare chiudendo il pannello Musica o passando a un’altra sorgente della
libreria; riaprendo il pannello si ritrovano file e posizione. L’avvio effettivo
di un suono ambientale mette in pausa YouTube locale e viceversa. L’audio della
lezione mette in pausa il sottofondo locale. Dopo la lezione si può riprendere
manualmente dal lettore. Spotify rimane gestito dal proprio player esterno.

Gli audio sono in `youtube-audio/` nel profilo dell’app, separati da lezioni,
trascrizioni, statistiche, RAG e pubblicazione. Per ogni video sono conservati
l’audio scaricato e l’MP3 derivato. I file finiti sono riconosciuti verificando
dimensioni e SHA256, anche dopo il riavvio. Se mancano o sono alterati, torna
Scarica in locale. Una conversione fallita conserva l’originale già completato;
i frammenti di un download annullato vengono eliminati dopo l’arresto dei processi.

Non sono usati account, cookie personali o chiavi API. Se YouTube non rende
il video disponibile o rifiuta la richiesta, l’app mostra un errore ritentabile
e mantiene Apri su YouTube. Non si promette disponibilità universale dei video.
Il limite è 2 GiB per la fonte e 24 ore di audio; il processo ha un timeout di
90 minuti. Nessun contenuto viene aggiunto automaticamente all’archivio lezioni.

## Preparazione tecnica

Il pacchetto Windows x64 comprende yt-dlp 2026.11.23, con EJS incorporato, e Deno
2.9.8 in `resources/youtube-tools`, fuori dall’ASAR; FFmpeg è quello già incluso.
Versioni e hash sono fissati nel manifest; non si autoaggiornano nell’app.
I binari sono ignorati da Git. Per un nuovo checkout:

```powershell
npm run prepare:youtube-tools
npm run build
```

La build verifica hash e avvisi di licenza prima di compilare. I workflow CI e
release preparano esplicitamente gli stessi strumenti. Il verificatore del
pacchetto controlla nuovamente gli hash degli eseguibili e gli avvisi inclusi.
La conversione è gestita direttamente da FFmpeg, perciò non viene aggiunto ffprobe.
Gli estrattori non leggono configurazioni o plugin personali; le componenti
remote opzionali sono disabilitate. Non viene aggiunta una dipendenza npm.

[Prove e limiti](../quality/youtube-locale-2026-11-25.md).
