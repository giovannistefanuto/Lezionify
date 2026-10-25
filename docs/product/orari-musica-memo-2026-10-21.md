# Orari audio, accesso Musica e comandi Memo — 21 ottobre 2026

## Perimetro concordato

L'utente richiede direttamente intervista `grilling` e implementazione delle
prime tre posizioni della coda D-0386: voci 66, 64 e 65. Completate in D-0387. Conferma tutte le
proposte: orari della registrazione in sola lettura, Musica sopra la ricerca,
comandi Memo raggruppati e stile coerente con Lezionify. Questa richiesta
autorizza insieme le tre voci, senza avviare la successiva diagnosi Ctrl+L.

## Comportamento

- **Info e Gestione:** riquadro Inizio audio / Fine audio (calcolata), anche
  durante la modifica degli altri metadati. Usa `recordedAt` e la durata audio
  disponibile. Mostra la data finale se cambia giorno; «Non disponibile» se
  mancano ora iniziale o durata. Nessun nuovo campo di modifica.
- **Musica:** pulsante dedicato sopra la ricerca, icona nella sidebar ridotta;
  sidebar ancorata alla finestra e area corsi con scorrimento interno. L'accesso
  Focus e lo stato dei player conservano i percorsi precedenti.
- **Memo:** intestazione con conteggio e chiusura; navigazione gruppi separata
  con + Gruppo; copia della vista corrente visibile; menu ⋯ con Copia tutto,
  Modifica gruppo ed Elimina gruppo quando applicabili. Conferma prima di
  eliminare un gruppo. Esc chiude il menu senza chiudere Memo, clic esterno
  lo richiude. Campo attività con pulsante + e Invio; pulizia completati vicino
  alla lista. Spostamento attività direttamente disponibile in ogni riga.
- **Viste Memo:** Tutti conserva lista unica e appunti richiudibili; nel gruppo
  attività e note restano affiancate, in verticale su finestra stretta.
  Conservati doppio clic, Invio/Esc, Alt+lettera e Ctrl+B nelle note.

## Diagnosi e fonti degli orari

`node tools/run_hook_regressions.cjs --interface-polish-only` ha riprodotto
prima della modifica «Musica finisce fuori schermo con una lista lunga».
Il contenitore grid cresce con l'elenco principale e la sidebar, con la sola
altezza minima, si estende fino al fondo. L'area corsi non ha quindi un'altezza
limitata. La correzione limita la sidebar alla viewport e rende il comando
Musica indipendente dal contenuto che scorre. Lo stesso scenario poi passa.

Il timestamp dei normali MP3 è ricavato dal nome del file: il codice non può
certificare come ogni registratore assegni quel timestamp. L'interfaccia indica
perciò l'inizio come proveniente dai metadati. Una data senza ora non viene
interpretata come registrazione a mezzanotte. Per video l'inizio è assegnato
all'importazione e viene segnalato: `scheduledEndTime` è un orario programmato,
non la fine misurata dell'audio, e non viene usato per questo calcolo.
Visualizzazione nel fuso locale; il calcolo somma la durata all'istante iniziale.

## Verifiche

Scenari mirati già superati:

- 11 test unitari degli orari: fine corretta, mezzanotte, data sola, assenze,
  input non validi, durata zero e overflow.
- Scenario Electron `--interface-polish-only`: pagina lunga, molti corsi,
  sidebar ridotta, finestra bassa, Memo chiaro/scuro e stretto, menu, conferma
  cancellazione, conservazione di attività/note, persistenza e import video.
- Scenario `--study-tools-only`: gruppi, scorciatoie, spostamenti, cancellazione,
  riavvio e stima di studio precedenti.
- La suite `todayScenarios` verifica il riquadro anche dentro il vero drawer
  in Info e Gestione e l'assenza di campi di modifica negli orari.

Schermate sintetiche locali in
`local-artifacts/interface-polish-20261021/`, non versionate. Controllo visuale
su desktop, finestra stretta e temi chiaro/scuro; corretti conflitti con gli
stili globali precedenti, senza dipendere dall'ordine di caricamento CSS.

Tutti i controlli previsti da `npm run check` sono passati: typecheck, lint,
657 test Vitest in 50 file, 24 Python, 41 Node, suite Electron completa e ripresa
dopo riavvio, build e PDF reali IT/EN. Il comando aggregato iniziale si era
fermato nello scenario Focus; un secondo avvio Electron nel menu lezioni.
Stabilizzati nei test l'evento scroll e l'attesa del layout iniziale, senza
rimuovere o indebolire asserzioni: suite completa e riavvio poi positivi.
Build e PDF eseguiti separatamente dopo la ripresa del controllo.
Non sono state apportate correzioni applicative a Focus o al menu lezioni. Nessuna nuova dipendenza, chiamata AI reale o modifica alla libreria
personale. La prima consegna comprendeva la build; su richiesta successiva
il setup aggiornato è stato generato e verificato in D-0388, come descritto sotto.

## Ripresa

Decisione D-0387 registrata e caselle delle voci 64–66 aggiornate.
La successiva attività rimane la voce 33, diagnosi personale Ctrl+L, con i limiti
e i rinvii già documentati. Non è avviata da questo intervento.

## Installer aggiornato — D-0388

Su richiesta successiva dell'utente, generato il setup NSIS x64 con
`npx --no-install electron-builder --win --publish never`, dalla build già
collaudata D-0387. Packaging concluso con codice 0.

- Setup: `dist/Lezionify-Setup-0.1.0.exe`, 190.815.708 byte.
- SHA-256: `30811b4e7ee35a54f346d9916b1db2d315bab58c61211e2beca9dfcc59fd7194`.
- 370 file della build confrontati con il contenuto ASAR: identici.
- Presenza delle tre modifiche, FFmpeg, runtime offline e assenza di artefatti
  privati verificati. Manifesto SHA-512/dimensione e blockmap controllati.
- Backup precedente, blockmap e manifesto in
  `local-artifacts/installer-backups/20261021-orari-musica-memo/`, tutti e tre
  con hash verificati. Report `backup.json` e `verification.json` nella cartella.

Chiudere Lezionify e avviare il setup per aggiornare l'app installata.
Nessuna installazione, pubblicazione, commit o push automatici.
