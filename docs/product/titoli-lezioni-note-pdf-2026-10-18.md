# Titoli indipendenti e pagine Note nei PDF

Decisioni D-0349 (titoli) e D-0350 (pagine Note).

Scelte confermate il 18 ottobre 2026 tramite grilling: doppio clic sulle lezioni,
due titoli indipendenti IT/EN, aggiornamento anche del primo titolo delle
dispense e una pagina Note dopo ciascuna lezione esportata.

## Uso

Il doppio clic sulla riga o **F2** apre **Modifica titoli della lezione** in Tutte
le lezioni, nei corsi e nei filtri Da studiare, In corso e Completate. Il clic
singolo apre ancora la lezione dopo 500 ms, per distinguerlo dal doppio clic;
Invio/Spazio la aprono subito. I campi Italiano e Inglese sono indipendenti.
Salva invia soltanto le lingue modificate; Annulla/Esc chiudono senza salvare e
riportano il focus alla riga. Durante il salvataggio i comandi sono bloccati;
un errore conserva la bozza per riprovare. Titoli non vuoti di massimo 500
caratteri su una riga; un campo gia vuoto puo rimanere vuoto.

La lista conserva il titolo italiano. Lettore, Focus e PDF usano la lingua
visualizzata/esportata; le dispense EN precedenti ricavano il titolo dal primo
H1. Se EN manca, si puo preparare il suo titolo senza creare o tradurre nulla.
Riavvio, sync e rigenerazioni conservano i titoli personalizzati. La rinomina
IT non invalida EN. La rigenerazione completa IT continua invece a invalidare
la vecchia traduzione, conservando il titolo EN per quella successiva.

## Persistenza

`Lecture.titleOverrides` e facoltativo, validato e clonato nella cache; `title`
resta compatibile con IT. `shared/lectureTitles.ts` riconosce il primo H1 ATX
fuori dai blocchi fenced e ne sostituisce solo la riga, preservando CRLF,
formule, codice e altri capitoli. Se manca H1, lo aggiunge. I caratteri speciali
digitati sono escapati per apparire letteralmente.

L'IPC dedicato `renameLectureTitles` legge le versioni correnti e serializza
le modifiche con il mutex dell'archivio. Le singole scritture sono atomiche;
errori di file o metadati ripristinano i contenuti precedenti. Non viene promessa
una transazione unica tra piu file in caso di arresto forzato durante il salvataggio.
Cache UI e ricerca sono aggiornate; l'eventuale publisher automatico configurato
mantiene il comportamento delle altre modifiche. File UUID, audio e trascrizioni
originali restano invariati. Nessuna dipendenza o chiamata AI per rinominare.
Come per gli altri cambi Markdown, i fingerprint di ripresa/stima possono
invalidarsi; stati di studio e tempi gia registrati restano conservati.

## Pagina Note

Ogni voce del PDF singolo o di corso riceve una pagina A4 dedicata, anche con
dispensa mancante: **Note** in IT o **Notes** in EN e normale numerazione.
La griglia SVG vettoriale locale e da 5 mm, alta 230 mm, tratto 0,5 px grigio
`#dedede`. Il contenitore da 250 mm rispetta i margini di stampa. La lezione
successiva inizia su pagina nuova; dopo l'ultima pagina Note non compare una
pagina bianca ulteriore. Non e forzato l'inizio sul recto nel fronte-retro.

## Verifiche

Passati 550 Vitest, typecheck, lint mirato e build. Nove test nuovi coprono
isolamento IT/EN, persistenza dopo riavvio/sync, rigenerazione con Gemini
simulato, rollback di file e metadati, input non validi, codice fenced e CRLF.
Electron `--lecture-list-only` verifica quattro filtri, doppio clic senza
apertura anticipata, F2, entrambe le lingue, errore/riprova, riapertura, focus,
annullamento e clic singolo. Screenshot chiaro/scuro ispezionati.
Electron `--reading-position-only` passato per lettura e Mermaid Focus.

`test:pdf-export` passa con renderer di produzione: singoli e corsi IT/EN,
laboratori, formule e Mermaid. PDF.js controlla una pagina Note per voce,
solo intestazione/footer, ultima pagina corretta e nessuna pagina vuota extra.
PNG Poppler della pagina Note ispezionato. Nei test e stato eliminato un `act`
annidato nel mock di salvataggio e corretto l'escaping della fixture PDF.

Artefatti sintetici in `local-artifacts/pdf-notes-titles-2026-10-18/`, ignorati.
Libreria personale non modificata, nessuna AI reale.

Installer Windows rigenerato successivamente con D-0351: nuova build e packaging
NSIS x64 completati, 369 file verificati identici nel pacchetto ASAR, manifest e
blockmap verificati. Setup in `dist/Lezionify-Setup-0.1.0.exe`; backup precedente
e rapporto in `local-artifacts/installer-backups/20261018-171132/`.
Nessuna pubblicazione, installazione, commit o push.
