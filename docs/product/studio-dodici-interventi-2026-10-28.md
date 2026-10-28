# Dodici interventi sullo studio — 28 ottobre 2026

Richiesta diretta sui dodici punti, distinta da `LISTA_ORDINE`; nessun punto
13 aggiuntivo. Scelte su stima, inattività e rigenerazione confermate
dall’utente. Decisioni D-0437–D-0444. Il lavoro è stato fermato su richiesta
e poi ripreso; il checkpoint locale non rappresenta la consegna finale.
Gate conclusivo D-0445: coda aggiornata a 44 concluse e 18 aperte, senza
cambiare l’ordine delle attività residue.

## Funzioni e uso

| Punto | Voce | Risultato |
| --- | --- | --- |
| 1 | 73 | Q&A usa la normalizzazione condivisa: epsilon inline, `cases` multilinea, delimitatori Gemini e risposta in streaming. Copia delle formule senza duplicare MathML e testo visivo. |
| 2 | 107 | Riparazioni mirate dei dollari monetari malformati, senza riscrivere le fonti o convertire in valuta gli scalari matematici validi. Codice e formule restano distinti. |
| 3 | 116 | `stateDiagram-v2` accetta gli stessi stili statici sicuri dei flowchart: colori esadecimali e bordo entro il limite esistente. Direttive concatenate, URL CSS e proprietà arbitrarie restano rifiutati. |
| 4 | 105 | Gli import autorizzati durante pianificazione/esecuzione sono conservati nel checkpoint. Dopo completamento normale viene preparata una nuova coda per quei soli ID, saltando le derivazioni già disponibili. |
| 5 | 71 | Ctrl+T parte come Traduttore; lo switch **Dizionario italiano** mostra definizioni italiane offline, anche per forme flesse. L’input resta al cambio modalità; una frase richiede una singola parola e non avvia traduzioni implicite. |
| 6 | 108 | Il tooltip della sveglia conserva l’ora e aggiunge minuti residui, domani, meno di un minuto e scadenza. |
| 7 | 109 | Aprire una discussione porta il focus alla domanda: intera lezione SÌ, altri Q&A NO, Breve. Le scelte restano visibili/modificabili; Invio invia, Shift+Invio e IME non inviano. |
| 8 | 111 | **Sottolineatura** in Focus con persistenza separata dallo stile evidenziatore. Gli stili possono sovrapporsi; rimozione riferita allo stile attivo. Dati legacy e isolamento IT/EN conservati. |
| 9 | 112 | **Cerca online per questa domanda**, inizialmente spento, passa esplicitamente Google Search al provider. Mostra un avviso su dati e costi e una sezione separata di fonti HTTP/S restituite. Il consenso si azzera dopo un invio riuscito. |
| 10 | 113 | Stima locale di paragrafo, residuo e totale; disponibile anche oltre trenta minuti, con campione sufficiente e incertezza dichiarata. Il ritmo di oggi viene smussato verso quello storico. |
| 11 | 56 | In Impostazioni → Studio in Focus, **Osserva il mio ritmo nell’app** abilita la raccolta volontaria. Dopo almeno tre sessioni, un’ora e intervalli sufficienti viene proposta una soglia da applicare esplicitamente. |
| 12 | 59 | **Rigenera sezione** in lettura e Focus: scelta del titolo, istruzioni, invio esplicito, anteprima, conferma e ripristino. L’inglese resta disponibile ma viene segnalato da aggiornare, con azione Gemini separata. |

## Pipeline e interruzioni

L’accodamento rispetta `autoProcessOnImport` sia all’arrivo sia nel passaggio
successivo. Richieste multiple sono deduplicate e gli avvii serializzati;
gli import arrivati dopo lo snapshot della pianificazione non vengono
cancellati dal suo completamento. Nessun ampliamento all’intero archivio.

Stop dell’utente, pausa del provider, errori e preferenza disabilitata non
avviano automaticamente la coda successiva. Gli ID restano conservati e
visibili nel pannello; dopo una chiusura si riprende esplicitamente il lavoro
interrotto. Non vengono creati cicli di retry illimitati o pipeline concorrenti.

## Corpus monolingue e licenza

Fonte: [koreader-dicts v1.2.0](https://github.com/DanielGregorini/koreader-dicts/releases/tag/v1.2.0),
Wiktionary tramite Kaikki, CC BY-SA 4.0.
`tools/build_italian_dictionary.py` scarica con TLS verificato, controlla
SHA256 e converte StarDict/HTML in testo e JSON compresso usando soltanto
Python standard. Nell’app il corpus è letto localmente dal main.

- 68.755 lemmi e 543.083 forme flesse distinte nella conversione.
- SHA256 ZIP: `25ca5cf2347b225f10a9c013e550f8ab358f53011319ffcaed21381f49bee2b2`.
- Licenza, attribuzione e README originali in `public/dictionaries/italian-*`.
- Verificati termini comuni e tecnici, accenti, flessioni e ambiguità come
  `ragazzi` verso `ragazzo` e `ragazza`.

Copertura parziale e possibili refusi/glosse sporche della fonte sono
esplicitati. Non è un dizionario scientifico certificato. Nessuna dipendenza
runtime aggiunta o consultazione online durante una ricerca nell’app.

## Ricerca online e provenienza

Il flag è validato nel main e tracciato nei log senza query o contenuti;
il trasporto raccoglie le fonti dai metadati del provider, filtrando i protocolli.
I fallback web sono limitati ai modelli documentati compatibili. In assenza
di fonti il risultato lo dichiara, senza inventare evidenze web.

Fonti ufficiali consultate il 28 ottobre:
[Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search)
e [prezzi Gemini](https://ai.google.dev/gemini-api/docs/pricing).
Per Gemini 3 e successivi la documentazione descrive fatturazione per query,
con franchigia condivisa e possibili query multiple per domanda. La UI non
garantisce gratuità o disponibilità per una chiave specifica: si applicano
piano, quote e prezzi del progetto Google.

Sono collaudati il contratto SDK simulato, il flag attraverso renderer/IPC,
l’esclusione di protocolli non sicuri e la separazione delle fonti. Non sono
state effettuate richieste Gemini reali: disponibilità e qualità sul progetto
personale non sono certificate da questi test.

## Stima e inattività: dati e limiti

Lo schema precedente conserva tempi aggregati e venti intervalli della
pagina: non consente di ricostruire retroattivamente il tempo dei singoli
paragrafi. La nuova raccolta salva conteggi di parole, numeri, formule,
tempi di esposizione, giorno e impronta, senza testo della dispensa.

Il tempo viene distribuito fra i blocchi visibili, senza duplicarlo; scorse
rapide e tratti saltati non producono campioni completi. I campioni richiedono
esposizione sufficiente e copertura del blocco. Baseline parole/tempo;
pesi aggiuntivi solo se migliorano il confronto su documenti lasciati fuori
dal fitting, dopo almeno tre documenti e dodici campioni. Con meno dati la
stima resta provvisoria. L’errore osservato non è un intervallo di confidenza
né una misura di comprensione. La verifica sintetica confronta baseline e
pesi; la precisione personale richiede nuovi campioni reali.

**Ricalcola da qui** azzera l’osservazione della lettura corrente e riparte
dalla posizione attuale; non elimina lo storico del modello né crea tempi
dei paragrafi a partire dalle vecchie sessioni aggregate. Durante raccolta
rimane disponibile il metodo precedente con le sue soglie conservative.

L’osservazione dell’inattività considera soltanto interazioni nell’app e
conteggi/tempi, senza tasti digitati o tracciamento del puntatore. La soglia
proposta non si attiva da sola. All’avviso **Stai ancora studiando?** il timer
si ferma; il tempo precedente resta valido. Senza risposta rimane fermo.
**Studio senza interagire per 30 minuti** permette lettura lunga o iPad.
Continuazione, pause e uscita riusano i comandi Focus. In assenza di soglia
personale confermata resta il comportamento fisso precedente. Le osservazioni
si possono disattivare o cancellare nelle impostazioni.

## Rigenerazione e conservazione

Il perimetro è una sezione ATX dal titolo al successivo titolo di livello
pari o superiore. Non si assume un mapping esatto con la trascrizione:
l’invio esplicito usa la fonte completa entro 1 MB, oltre al testo precedente
e alle istruzioni. Il modello non può applicare una modifica direttamente.

Conferma e ripristino verificano impronte e versione corrente; mutazioni
serializzate e compare-and-swap nel repository impediscono sovrascritture
concorrenti. Vecchie versioni italiane in `library/section_revisions`, con
anteprima in memoria a scadenza. Audio e trascrizione grezza invariati;
fonti modificate richiedono nuova anteprima. Titolo selezionato e sezioni
adiacenti sono conservati; titoli esterni nella risposta vengono rifiutati.

La versione ENG resta disponibile, marcata da aggiornare. **Aggiorna ENG con
Gemini** è un’azione distinta; dopo il ripristino il flag resta
conservativamente attivo finché non si ritraduce. Indice di ricerca e lettura
usano i percorsi esistenti di aggiornamento e impronta. Le annotazioni usano
offset del testo e vanno controllate dopo la sostituzione: non viene promesso
un riallineamento semantico automatico. Questa limitazione è visibile prima
della conferma. Correttezza didattica della nuova sezione da valutare
nell’anteprima; il test simulato non certifica il modello.

## Verifiche

- Regressioni dei due difetti originariamente `it.fails` convertite in
  aspettative positive; zero fallimenti attesi.
- Suite unit: 783 test riusciti su 59 file, inclusi nuovi casi di pianificazione,
  corpus reale, stima, concorrenza, ripristino e integrità ITA/ENG/fonti.
- Typecheck e lint; build di produzione; 24 test Python e 41 Node.
- Electron mirato: rendering matematico e Mermaid reale, copia, streaming,
  selezione anche attraverso formule, annotazioni persistenti e IT/EN,
  dizionario senza traduzioni implicite, tooltip, anteprima/conferma,
  inattività e campioni per paragrafo con riapertura.
- Dialogo verificato a 1440/768/390 px; schermate sintetiche locali ignorate
  in `local-artifacts/october28-qa`.
- Esportazioni PDF reali IT/EN, formule, diagrammi, annullamento e fonti.

Il gate Electron generale è riuscito, incluso il ripristino delle coordinate
di lettura dopo un riavvio completo del processo. Nessuna chiamata Gemini reale, lettura di credenziali per
benchmark o modifica dei materiali personali durante i collaudi. Il setup
installato precedente non viene aggiornato dalla sola modifica dei sorgenti.

## Installer generale aggiornato — D-0446

Rigenerato su richiesta con `npm run package:win -- --publish never`.

- Setup: `dist/Lezionify-Setup-0.1.0.exe`, 299.967.302 byte.
- SHA256: `ae1e97e69bb9e523d8053f3c37ec5ce4476aaa6d062fb0328d5d3ea5a78a5667`.
- ASAR: `36ea8afd1c4925aedd0d8704634b99943245bf1615e1b288e1d713bd3d896dd8`.
- Tre file precedenti conservati e verificati in
  `local-artifacts/installer-backups/20261028-studio-dodici`.

`verify_installer.cjs --repetition --study-oct28` confronta 378 file della
build con ASAR, controlla corpus italiano e licenze, funzioni nuove e RIPETERE,
manifesto, blockmap e backup. Il runtime RAG in profilo isolato passa con
modello già locale, inferenza senza rete e worker PDF. La verifica NSIS estrae
senza eseguire il setup e confronta otto componenti critici con il runtime.

Il binario resta locale e ignorato da Git; la regola AGENTS richiede commit e
push di tutte le modifiche pubblicabili, comprese quelle dei dodici punti.
Nessuna installazione, release binaria o richiesta AI eseguita. Per usare
l’aggiornamento, chiudere Lezionify e installare il nuovo setup.
