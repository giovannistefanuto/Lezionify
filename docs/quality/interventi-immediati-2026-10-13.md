# Interventi immediati del 13 ottobre 2026 — collaudo

Completate le voci 1, 2 e 3 di `docs/product/idee-future-2026-10-13.md`.
Le modifiche precedenti presenti nel workspace sono state conservate.

## Funzioni

- Riquadri italiani e inglesi, con marcatori quotati e isolati, formule, liste,
  grassetto e marcatori letterali preservati.
- Export della lezione nella lingua visualizzata e del corso completo ITA/EN,
  in ordine cronologico, con avvisi per dispense mancanti e nessun ripiego di lingua.
- Lettura delle dispense distinta per lingua e delle slide distinta per PDF,
  ripresa dopo chiusura, riapertura e un vero riavvio di Electron.

## Controlli

Il quality gate `npm run check` è passato: typecheck, lint, **439 test Vitest**,
**14 test Python**, scenari React/Electron, build e nuovo export PDF reale.

Il collaudo dell'app completa ha poi individuato l'attesa di frame di animazione
in una finestra nascosta. Eliminata questa dipendenza: la vista forza il layout,
attende font, immagini e diagrammi e notifica la disponibilità anche senza paint.
Ricontrollati typecheck, lint, test dell'export con finestre esplicitamente nascoste
e build definitiva. Il launcher valida il percorso temporaneo prima di rimuoverlo.

I PDF sintetici finali hanno 16 pagine ITA, 4 EN e 2 per la singola lezione:
renderizzati con Poppler e controllati visivamente per formule, riquadri, tabelle,
diagrammi, fallback e numeri di pagina. Estrazione del testo verificata per ordine,
contenuti attesi e avvisi di mancanza. Gli artefatti sono locali e ignorati da Git.

Il collaudo con main, preload e renderer nell'ASAR finale conferma:

- export avviato dal pulsante attraverso l'IPC reale e file PDF salvato;
- marcatore inglese renderizzato, slide reali, protocollo locale, byte range,
  revoca dei permessi e scroll/zoom indipendenti;
- **zero richieste di rete**, zero errori del renderer e hash delle slide intatto.

Log principali: `local-artifacts/immediate-ideas-check.log`,
`immediate-ideas-final-build.log`, `immediate-ideas-package-final.log` e
`immediate-ideas-packaged/packaged-smoke-result.json`.

## Setup Windows

- Setup NSIS x64 creato senza pubblicazione: `dist/Lezionify-Setup-0.1.0.exe`.
- Dimensione: **189560946 byte**.
- SHA-256: `08aba7ac619eac59ce43b7abef29692ef0dcdbb9d40f4d146d7b8c4ede317957`.
- **350 file della build identici all'ASAR**, manifesto e FFmpeg verificati.
- Profili, libreria privata, trascrizioni personali e artefatti locali esclusi.
- Precedente setup, blockmap e manifesto conservati nel backup indicato da
  `local-artifacts/current-immediate-ideas-installer-backup.txt`.

Per aggiornare: chiudere Lezionify e avviare il setup. L'installer non è stato
eseguito automaticamente. I collaudi usano solo dati sintetici; nessuna chiamata
AI reale, nessuna modifica alla libreria personale e nessuna nuova dipendenza.
