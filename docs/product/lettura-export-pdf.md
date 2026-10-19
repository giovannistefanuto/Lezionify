# Lettura ed esportazione PDF — 13 ottobre 2026

## Riquadri in inglese

Il renderer riconosce `[!CONCETTO CHIAVE]` e `[!KEY CONCEPT]`, senza distinguere
maiuscole e minuscole. Il secondo mostra il titolo «Key concept». Sono supportati
il blockquote e il marcatore isolato a inizio paragrafo, con formattazione, liste
e formule. I marcatori citati dentro un paragrafo o codice restano testo. La causa
era il riconoscimento limitato al nome italiano, non la fonte o le chiamate AI.

## Esportazione locale

- **Esporta** nell'archivio, nella lezione e in Focus apre la stessa modale
  **Lezione / Corso**, con pulsante **Indietro** (D-0369, 19 ottobre).
- **Lezione** mostra tutte le lezioni con pulsanti Italiano/Inglese. Il clic sulla
  lingua apre **Salva con nome** di Windows; le lingue senza dispensa sono
  disabilitate, senza traduzioni implicite.
- **Corso** elenca i corsi con nome completo e sigla, poi tutte le lezioni con
  checkbox inizialmente selezionate, laboratori inclusi. Offre Seleziona/Deseleziona
  tutto, Includi/Escludi laboratori, modifica individuale e lingua del documento.
  Sono disponibili anche i corsi archiviati, senza dipendere dai filtri della lista.
- Il comando finale **Esporta** apre il salvataggio nativo. Una selezione vuota
  disabilita il comando; annullare il salvataggio conserva le scelte nella modale.
- Nomi proposti: `Lezione_<Titolo>_<IT/EN>_<Data_Lezione>.pdf` e
  `Corso_<Sigla>_<IT/EN>_<Data_Esportazione>.pdf`; date locali `YYYY-MM-DD`,
  spazi in underscore e caratteri Windows non validi sostituiti.
- Il flusso UI a due clic e la casella laboratorio D-0346 sono sostituiti;
  i vecchi chiamanti IPC restano compatibili. [Collaudi e limiti](memo-log-pdf-transizioni-2026-10-19.md).
- Il corso segue l'ordine cronologico crescente, con ripiego sulla data di
  importazione e ID come spareggio. Copertina e indice elencano le lezioni selezionate;
  ogni lezione comincia su una nuova pagina.
- Dopo ogni lezione segue una pagina **Note** (**Notes** in inglese), con
  quadrettatura vettoriale molto chiara da 5 mm. Vale anche per l'export singolo
  e per le voci con dispensa mancante, senza una pagina bianca extra alla fine.
- Le intestazioni e l'indice rispettano i titoli indipendenti IT/EN modificabili
  con doppio clic o F2 sulla riga della lezione; la modifica aggiorna anche H1
  nella dispensa della sola lingua interessata, senza traduzioni automatiche.
- Le dispense mancanti hanno un avviso al proprio posto nell'indice e nel testo;
  il messaggio finale riporta quante sono. Non viene inserita automaticamente
  una lingua diversa. Se non esiste alcuna dispensa, l'esportazione si interrompe.

Il PDF A4 contiene titoli, tabelle, riquadri, formule KaTeX, diagrammi Mermaid
e numeri di pagina. Una finestra Electron nascosta carica gli stessi renderer
dell'app e attende font, immagini e diagrammi prima di `printToPDF`. Un diagramma
non valido mantiene avviso e codice leggibile, senza il limite d'altezza del
codice nella vista a schermo. Nei PDF i diagrammi usano margini di 8 px,
padding del canvas di 4 px e un'intestazione ridotta, senza altezza minima.
Dal 18 ottobre il renderer PDF usa un profilo Mermaid dedicato: font di base
14 px (10,5 pt), distanza fra nodi 24 px, fra livelli 28 px e padding dei nodi
8 px, con etichette a capo entro 180 px. Per i diagrammi di sequenza compatta
partecipanti e messaggi e abilita l'andata a capo del testo. La lettura ordinaria
e Focus mantengono il profilo precedente; le dispense salvate non cambiano.

Le proporzioni SVG sono conservate entro la larghezza della pagina e il limite
di 230 mm d'altezza. Se un flowchart richiederebbe caratteri inferiori a circa
8,5 pt sul foglio A4, viene provata anche la disposizione perpendicolare
(verticale/orizzontale). È adottata soltanto se migliora di oltre cinque punti
percentuali la scala disponibile. Etichette, nodi, frecce e stili sono gli stessi;
cambia solo la disposizione nella copia di stampa. Un errore della prova
mantiene il primo SVG valido. Diagrammi estremi possono comunque richiedere
una pagina o un adattamento: la soglia guida la scelta e non garantisce una
dimensione minima universale. Il sorgente originale non viene riscritto.

Voce 5 LISTA_ORDINE completata il 14 ottobre (D-0289). Il confronto storico sulle stesse
figure sintetiche con le precedenti regole mostra una riduzione dell'ingombro
verticale, margini inclusi, del 46% (piccolo), 52% (largo) e 9% (verticale).
Il PDF A4 reale conserva etichette da 8,7 a 12 pt nei tre casi e il sorgente
completo di un diagramma errato di 32 righe. Verificati proporzioni, continuità
del testo, formule e riquadri IT/EN con export Electron e rendering Poppler.
Queste misure descrivono le fixture, non tutti i possibili grafi.
La preparazione forza il layout senza attendere frame di animazione, che una
finestra nascosta o minimizzata potrebbe sospendere.

Il renderer di export usa una sessione temporanea separata, non apre link e
blocca HTTP/HTTPS esterni, incluse le immagini remote. In sviluppo consente solo
l'origine locale di Vite. Nessuna chiamata AI e nessuna esportazione dei PDF
associati alle slide. I dati sono accessibili solo alla finestra dedicata con
token temporaneo. Una seconda esportazione contemporanea viene rifiutata.
Gli errori omettono percorsi privati. Il salvataggio sostituisce la destinazione
solo dopo la scrittura completa in un temporaneo; annullamenti ed errori di
lettura lasciano intatto il file precedente. Audio e trascrizioni sono conservati.

## Cambio lingua da tastiera

Ctrl+L cambia ITA ↔ EN nella scheda della dispensa e in Focus; su macOS è
disponibile anche Cmd+L. Usa lo stesso cambio lingua del pulsante e conserva
il capitoletto e la frazione letta al suo interno. Non avvia una traduzione
quando l'inglese manca. Durante caricamento, generazione o traduzione, con
campi di testo attivi, modali o pausa aperti, il comando non cambia lingua.
Ctrl+Shift+L (Cmd+Shift+L) apre i log di sistema.

La corrispondenza viene calcolata localmente sui titoli già renderizzati:
prima numerazione univoca (per esempio `10.` o `2.3`), poi titolo identico
univoco allo stesso livello. Se questi identificatori non bastano, usa l'ordine
soltanto con lo stesso numero di titoli e la stessa sequenza di livelli, senza
identificatori condivisi spostati, numeri mancanti o titolo attivo ripetuto.
Questo permette di passare dal decimo di dodici capitoletti italiani al decimo
inglese anche con lunghezze diverse e traduzioni preesistenti. Numerazioni e
titoli identici consentono anche sezioni aggiunte o riordinate. Un riordino di
titoli tutti tradotti, senza numeri o identificatori comuni, non è riconoscibile
dalla sola struttura: l'ordine compatibile è un'inferenza, non un confronto AI.

Con strutture divergenti, titoli ambigui o assenti, il ripiego è la percentuale
del documento; anche il tooltip del pulsante lo indica. Il punto interno usa
la frazione dello spazio tra il titolo corrente e quello successivo, non una
corrispondenza frase per frase. La posizione raggiunta sostituisce il precedente
segnalibro della lingua di destinazione e viene salvata con gli ancoraggi
esistenti. Chiusura, riavvio e selezione di un'altra lezione conservano le
posizioni separate. Nessun testo dei titoli viene salvato o inviato online.

## Ripresa della lettura

In Focus ogni Mermaid ha un pulsante **Nascondi schema / Mostra schema**,
raggiungibile con Tab e attivabile con Invio o Spazio. Nasconde anche il codice
eventualmente aperto; ogni schema mantiene uno stato indipendente nella vista
corrente. L'SVG resta montato e torna visibile senza una nuova renderizzazione
quando lo schema viene riaperto. Un cambio del sorgente riapre lo schema.

La barra della spiegazione offre anche **Nascondi tutti gli schemi / Mostra
tutti gli schemi**. Il comando segue lo stato reale dei singoli: con stati misti
propone di nasconderli tutti. I comandi individuali restano disponibili; cambiare
lezione riapre gli schemi e senza diagrammi il comando collettivo scompare.
Agisce solo sulla spiegazione Focus, mantiene SVG e punto letto, senza toccare
gli schemi della discussione o dell'esportazione. Tastiera: Tab e Invio/Spazio.
Il punto relativo al blocco di testo letto viene conservato usando gli stessi
ancoraggi della ripresa della lettura. Nella vista ordinaria e nei PDF esportati
gli schemi sono sempre visibili. Nessuna chiamata AI o nuova dipendenza.

Le posizioni sono nel `localStorage` del profilo Electron, fuori dalla libreria
pubblicata e da Git: solo identità e coordinate, senza testo, percorsi o log.

- Dispensa: punto relativo al blocco Markdown, distinto per lezione e lingua,
  condiviso tra vista ordinaria e Focus. Viene salvato durante lo scroll e resta
  disponibile dopo la chiusura, il cambio scheda e il riavvio dell'app.
- Slide: pagina e coordinate relative separate per lezione e fingerprint
  PDF.js. Il nuovo ID temporaneo di accesso non cambia la posizione.
- Zoom, resize e rendering differito mantengono il punto relativo. Nella vista
  ordinaria viene seguito il contenitore che scorre, interno oppure esterno.
- Una dispensa modificata riparte dall'inizio. Un PDF diverso ha una posizione
  distinta; tornando a un PDF già letto si riprende il suo punto. Coordinate
  non valide o pagine assenti hanno ripiego all'inizio. Un PDF rimosso mostra
  l'errore esistente con retry o selezione di un altro file.

## Pausa programmata e tempo studiato

La pausa di 5, 15 o 30 minuti ferma il conteggio per tutta la sua durata reale,
anche oltre lo zero. Una pausa di 5 minuti prolungata a 30 esclude tutti i
30 minuti dalla sessione, dal totale della lezione e dalle statistiche salvate.
La modale resta aperta fino a **Torna a studiare** (o Esc) oppure **No, ho finito
per oggi**. Tornare nella finestra, muovere il mouse o scrivere non riprende
lo studio mentre la pausa e' aperta. Il pulsante di ripresa conserva il focus
alla scadenza, cosi' resta utilizzabile da tastiera.

Durante lo studio un salto dell'orologio superiore a 3 secondi (per esempio
alla sospensione del PC) non viene contato e mette il timer in pausa. Una nuova
interazione permette di riprendere; il tempo trascorso non viene recuperato.
Il countdown della pausa usa una scadenza assoluta e si aggiorna al ritorno
nella finestra, senza riavviare il timer di studio.

## Verifiche

I blocchi LaTeX multilinea con delimitatori aderenti alla formula, per esempio
`$$\begin{aligned}` e `\end{aligned}$$`, vengono resi compatibili con il parser
nella sola copia visualizzata. Questo evita che la formula inglobi i capitoli
successivi mostrando `undefined`. Il recupero vale per dispense esistenti, vista
ordinaria, Focus e PDF, senza rigenerazione AI o riscrittura dei file. Codice
fenced/inline e formule già compatibili sono preservati. I delimitatori mancanti
e gli altri errori LaTeX non sono riparati automaticamente.

`npm run test:hooks -- --math-rendering-only` isola il caso con formula aligned,
titolo e paragrafo finale successivi; è incluso anche nella suite completa.

La traduzione IT → EN elabora l'intera dispensa in una richiesta logica e
verifica confini delle sezioni, risposta completa e contenuti protetti prima
di salvare. Una risposta invalida conserva italiano e inglese precedente e
richiede un nuovo tentativo esplicito. Confronto con la traduzione a parti e
limiti dei controlli: [Traduzione delle dispense](traduzione-dispense.md).

`npm run test:hooks` include riquadri IT/EN, lingue separate, chiusura e riapertura,
documento sostituito, scroll interno/esterno e PDF reale con nuovo grant. Avvia
anche un secondo processo Electron sullo stesso profilo temporaneo per verificare
la ripresa della dispensa e delle slide dopo un vero riavvio.

`npm run test:hooks -- --reading-position-only` esegue solo gli scenari di
lettura Markdown, compresi gli schemi Focus indipendenti, Invio/Spazio nativi,
riapertura dello stesso SVG, codice nascosto, fallback d'errore e stabilita'
del punto letto quando uno schema precedente viene chiuso e riaperto.

`npm run test:hooks -- --study-pause-only` isola la pausa scaduta dopo 30 minuti,
le riprese esplicite, la sospensione e la persistenza dei soli secondi studiati.
Il caso e' incluso anche nella suite completa.

`npm run test:pdf-export`, dopo `npm run build`, esegue l'export reale con preload,
renderer di produzione e Chromium: corso IT/EN, singola lezione, formule,
riquadri, diagrammi, fallback, mancanze, annullamento ed errori di lettura.
Non usa la libreria personale o servizi AI. Fa parte di `npm run check` e CI
Windows. I PDF sintetici restano solo per collaudo impostando
`LEZIONIFY_PDF_EXPORT_TEST_DIR`; normalmente sono rimossi con il profilo temporaneo.
Le regressioni Vitest verificano selezione, ordinamento, errori e permessi IPC.
Il collaudo PDF comprende anche flowchart molto larghi, ramificazioni e diagrammi
di sequenza con messaggi lunghi, verificando con PDF.js i caratteri del PDF reale.
PDF.js controlla anche numero, contenuto e posizione delle pagine Note e
l'assenza di pagine bianche involontarie.
`npm run test:hooks -- --lecture-list-only` verifica anche il flusso PDF in due
clic, la posizione stabile di Conferma, la scelta laboratorio e gli azzeramenti.
