# PDF Notability nella modalita focus

Il pulsante discreto **PDF**, nella barra della spiegazione, apre la selezione
nativa dei file. Al primo utilizzo l'app cerca una cartella Notability dentro
le cartelle OneDrive del profilo Windows; successivamente ricorda la cartella
usata. Si puo navigare anche verso un'altra cartella locale.

Il PDF scelto viene ricordato per la lezione, senza copiarlo nell'archivio.
Percorso e associazioni sono salvati in `focus-pdfs.json` nel profilo locale
Electron, fuori dalla pubblicazione delle lezioni. Il renderer riceve solo
nome, ID temporaneo e URL locale. Chiudere o nascondere il pannello non
cancella il documento o la sua associazione.

- Slide a sinistra, spiegazione a destra; scorrimenti indipendenti.
- La barra PDF mostra il contatore **pagina/totale**, per esempio **6/12**,
  riferito alla prima pagina visibile. Segue lo scorrimento e resta sincronizzato
  dopo zoom, resize e riapertura delle slide temporaneamente nascoste. Cambiando
  PDF riprende la posizione salvata per quel documento e quella lezione, oppure
  riparte dalla prima pagina se non è mai stato letto; durante caricamento o
  errore non mostra dati del PDF precedente.
- Trascinare il divisore per cambiare le larghezze. Funzionano anche le frecce
  quando il divisore ha il focus; doppio clic o Home ripristinano la meta.
- Ogni pannello ha i propri controlli di zoom. Ctrl+rotella, pinch del trackpad,
  pinch touch e Ctrl+/Ctrl- agiscono solo sul pannello interessato.
- Lo zoom PDF al 100% adatta la pagina alla colonna; gli altri valori sono
  relativi a questa larghezza. Lo zoom della spiegazione ingrandisce il testo.
- Zoom, ridimensionamento della finestra e trascinamento del divisore conservano
  la pagina e il punto relativo di lettura nel PDF, anche con pagine di proporzioni
  diverse. La posizione resta disponibile quando le slide vengono nascoste
  temporaneamente per lasciare spazio alla domanda, dopo la chiusura della lezione
  e dopo il riavvio dell'app. Le posizioni sono locali e distinte per lezione e
  fingerprint PDF; un nuovo ID di accesso temporaneo non le azzera.
- Le domande sul testo conservano il flusso Gemini esistente. La risposta
  occupa una colonna propria; le slide si restringono, oppure si nascondono
  temporaneamente quando non rimangono almeno 300 px per il PDF e 360 px
  per la spiegazione. Chiudere la domanda ripristina la divisione precedente.
- Ricentrare il divisore o allargare esplicitamente le slide chiude solo il
  pannello della domanda: il thread rimane salvato.
- Sotto 720 px, testo e domanda rimangono leggibili con scorrimento orizzontale
  del workspace; nessuna colonna copre le altre.

I file sono aperti esclusivamente in lettura. Un PDF disponibile solo online
puo essere scaricato da OneDrive alla prima apertura. L'app mostra l'attesa,
consente di nascondere il lettore, e offre retry o selezione di un altro PDF
se il file non e disponibile. Non vengono inviati PDF all'AI.

PDF.js, worker, mappe font, font standard e decoder immagini sono inclusi
nella build locale; non viene usata una CDN. Il rendering delle pagine e
limitato alla zona vicina al viewport e i canvas lontani vengono liberati.
Il lettore visualizza le annotazioni gia presenti nel PDF e non offre strumenti
di modifica. I PDF protetti da password richiedono una copia non protetta.

Verifiche: regressioni su permessi temporanei, byte range, file mancanti,
annullamento, persistenza serializzata e conservazione dei sorgenti; scenario
React/Electron con PDF sintetico reale, zoom e scroll indipendenti, layout Q&A,
schermi stretti, cambio lezione e selezioni native tardive.
Contatore verificato su PDF da 12 e 1 pagine, scorrimento iniziale/finale,
zoom, resize, occultamento e ripristino, cambio PDF ed errore di lettura.
Ricontrollo del 9 ottobre 2026: typecheck, lint, 432 test Vitest, 14 Python,
scenari Electron del PDF e del vocabolario offline e build passati.

Riferimenti tecnici: [PDF.js](https://mozilla.github.io/pdf.js/examples/index.html)
e [selezione nativa Electron](https://www.electronjs.org/docs/latest/api/dialog).
