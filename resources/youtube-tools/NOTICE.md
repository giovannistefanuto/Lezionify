# Strumenti YouTube per Windows x64

Preparare con `python tools/prepare_youtube_tools.py`. Il manifest fissa versioni,
URL ufficiali e SHA256; i binari sono ignorati da Git e inclusi come risorse esterne
all’ASAR. Nessun aggiornamento automatico degli eseguibili nell’app.

- yt-dlp 2026.11.23: sorgente Unlicense; l’eseguibile ufficiale PyInstaller include
  componenti GPLv3+ e il lavoro combinato è distribuito GPLv3+. Conservare
  GPL-3.0.txt e LICENSE.yt-dlp.txt con il binario. Fonte e istruzioni di build:
  https://github.com/yt-dlp/yt-dlp/tree/2026.11.23 e
  https://github.com/yt-dlp/yt-dlp#licensing . Il binario è invocato come programma
  separato; EJS è incluso nell’artefatto ufficiale.
- Deno 2.9.8: MIT, copyright dei contributori Deno; LICENSE.deno.txt incluso.
  Fonte: https://github.com/denoland/deno/tree/v2.9.8 .
- FFmpeg è la build già distribuita da ffmpeg-static nell’app, con i suoi avvisi;
  questa integrazione non la sostituisce. Il processo FFmpeg crea e verifica MP3.

I file personali scaricati non appartengono a questa directory: sono nel profilo
locale dell’utente, separati dall’archivio delle lezioni.
