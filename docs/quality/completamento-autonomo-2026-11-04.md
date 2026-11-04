# Lavoro implementativo del 4 novembre 2026

## Modifiche

- La stima raccoglie parole in grassetto, posizione nel documento e blocchi
  Nota/Note. Pesi limitati vengono considerati dopo 24 campioni arricchiti di
  almeno quattro documenti, solo se riducono del 5% l'errore tra documenti.
  Campioni precedenti restano utilizzabili; nessun contenuto viene salvato.
- RIPETERE conserva la durata del nuovo audio e lo accredita nelle statistiche.
  La prima apertura della valutazione completata richiede un credito separato
  di 900 secondi stimati. Il backend serializza le scritture e usa ID stabili:
  riapertura, concorrenza e riavvio non duplicano il credito. Le sessioni storiche
  sono escluse dalla nuova attribuzione automatica. La scelta del corso è
  esplicita prima dell'apertura; in sua assenza il tempo è Senza corso.
  I crediti usano le rettifiche esistenti della Dashboard. Il tracker della
  lezione è sospeso durante RIPETERE per evitare conteggi sovrapposti.
- Il RAG richiede al massimo una correzione delle conclusioni globali di
  assenza e delle attribuzioni di prima introduzione non giustificate dagli
  estratti. Il controllo resta fallibile e conserva avvisi quando necessario.

Decisioni: D-0471 e D-0472. Nessuna dipendenza aggiunta.

## Verifiche

- Traduttore: 4 prove WASM reali e 8 traduzioni tecniche reali senza rete.
  Formule, codice, URL e numeri conservati. Lettura qualitativa: testi numerici
  e aggiornamento della funzione valore adeguati, ma segmenti molto brevi vicino
  ai letterali producono talvolta punteggiatura duplicata e traduzioni deboli.
  Integrità strutturale e qualità linguistica restano criteri distinti.
- 93 test mirati traduzione; 9 test iniziali stima e 55 RIPETERE/RAG passati.
- Check generale fuori sandbox: typecheck, lint, 806 unit, 24 Python, 41 Node,
  React/Electron con riavvio, build e PDF reali passati. Gli errori precedenti
  su loopback, junction e rename non si riproducono fuori sandbox.
- Successiva regressione RAG: 30 test passati, inclusa la nuova correzione
  limitata dell'assenza globale.
- Electron mirato: raccolta DOM grassetto/Nota/posizione e apertura RIPETERE
  con richiesta di accredito passate. Il credito idempotente è verificato anche
  nel backend, separatamente dalla simulazione IPC del renderer.
- Recupero locale personale: 4 corsi, 46 lezioni, 122 fonti, 5.226 passaggi;
  confronti panoramici e vincoli di lezione verificati senza invii in rete.
- Benchmark lessicale heldout: 25 casi, recall@8 0,90, precision@8 0,642,
  falsi positivi 0,60. Provato filtro relativo 0,35: precision 0,80 ma recall
  0,85 e falsi positivi invariati. Modifica scartata, baseline conservata.
- La prova estesa semantica personale è scaduta al timeout di 120 secondi
  di un ranking. Non è un risultato positivo né una misura di risposta finale.

## Valutazione delle risposte personali RAG — voce 125

Letta l'intera prosa delle 11 risposte disponibili, da 138 a 326 parole.
Il tono è formale, didattico, generalmente leggibile. Le sezioni Fonti,
Deduzione e Integrazione distinguono l'origine, ma spesso ripetono il contenuto
e aggiungono una chiusa generale poco utile. Per definizioni e domande puntuali
le risposte sono tendenzialmente lunghe; per confronti matematici alcune sono
troppo sintetiche nei passaggi che risolvono il dubbio, pur avendo molta prosa.

Rilievi: due assenze generalizzate senza citazioni, un confronto affrontato
nel contesto di un altro corso, attribuzioni storiche da verificare negli
originali, una risposta che equipara due scritture matematiche senza mostrarne
l'equivalenza e un caso che mescola un esempio didattico con indicazioni d'esame.
La forma corretta è proporzionata alla domanda: risposta diretta iniziale,
evidenze pertinenti e spiegazione dei passaggi dubbi; integrazioni solo utili.
Non è opportuno imporre una lunghezza unica o assumere che tre sezioni piene
rendano una risposta completa. Questa lettura non certifica tutte le citazioni
o una validazione umana indipendente. Non sono state riscritte le conversazioni.

## ENG: stato reale e limiti

L'inventario attuale differisce da D-0467: 46 ITA e 45 ENG, tutti i 45 file
inglesi referenziati presenti. La nuova lezione senza ENG è stata importata
il 3 novembre; la fonte italiana contiene circa 35 KB. Non va dichiarato che
il recupero storico di 45/45 copra automaticamente il nuovo import.

Le regressioni coprono schema/JSON, frammenti, contenuti protetti, salvataggio
e prosecuzione coda. Restano da completare diagnosi del nuovo caso, controllo
qualitativo e verifica delle dispense personali nell'interfaccia. La coda contiene la fase ENG fallita come input: rifiuto di integrità per
frammenti mancanti o inattesi nella sezione 27, con tentativo locale conservato.
La fase è stata pianificata; non è un caso di traduzione saltata. Nessuna nuova
traduzione remota è stata avviata in questo intervento.

## Vincoli esterni e domande conservate per la ripresa

1. Nuovi collaudi remoti RAG/ENG: definire un budget attuale di invii e spesa.
   Il runner storico RAG contiene una deadline fissa del 23 ottobre già scaduta:
   non riusarlo come prova odierna e non azzerarne i budget storici.
2. Validazione RAG 90/91: servono giudizi umani indipendenti per misurare la
   concordanza del controllo semantico. L'analisi dell'agente non li sostituisce.
3. Stima 124: servono nuovi campioni personali arricchiti per attestare il
   beneficio; fino ad allora resta attiva la baseline quando necessario.
4. Musica 38: Spotify vieta segue/mix/overlap tra contenuti Spotify e altro
   audio, compresi altri brani Spotify. Il player YouTube esterno non espone
   controllo locale affidabile. Non è stato implementato un crossfade fittizio.
   Restano utilizzabili le dissolvenze offline già presenti e i comandi normali
   dei player; un ampliamento a sorgenti diverse richiede una scelta di prodotto.

Fonte verificata il 4 novembre: [Spotify Developer Policy](https://developer.spotify.com/policy).

Il piano NON è concluso integralmente: voci 7,20,38,90,91,92,122,124 restano
aperte finché soddisfatti tutti i rispettivi criteri (stato del primo passaggio, aggiornato nella ripresa sotto). La valutazione richiesta
dalla voce 125 è stata svolta con i limiti sopra. Non sono richieste nuove
azioni all'utente durante il collaudo delle parti eseguibili.

## Installer e verifiche finali

Setup Windows 0.1.0 rigenerato: 299.976.722 byte, SHA256
`75b1a31266698efd01ca3c8fe459f64ea7e74f7d51b24168f21e42c084e68580`.
377 file build confrontati con ASAR, manifesto e tre file di backup verificati;
nessun dato personale nel pacchetto. Runtime RAG isolato passato con rete
bloccata durante inferenza e worker PDF. Traduttore del pacchetto: quattro
prove reali WASM passate. Dopo le ultime modifiche: 118 unit mirati, lint e
typecheck passati, scenari Electron RIPETERE e stima passati.
Backup e verifica: local-artifacts/installer-backups/20261104-studio-rag.
Non è stata installata l'app né pubblicato il binario in una release.

## Ripresa successiva del 4 novembre — D-0475–D-0477

- Riprodotto in Electron il mancato campionamento dei veri riquadri `[!NOTE]`:
  corretti selettore e riconoscimento, esclusa l'intestazione dai conteggi.
  Test prima rosso, poi verde; conservati paragrafi e campioni precedenti.
- Riprodotto il credito audio perso dopo errore di salvataggio e comando Riprendi:
  la verifica è ora nel percorso comune, prima di trascrivere. Test rosso/verde.
- `shared/repetitionStudy.ts` ripartisce l'audio sui giorni locali, usando la
  data del registratore quando disponibile e la creazione della sessione come
  ripiego. Verificati mezzanotte, cambio anno e giornate del cambio d'ora.
  Verificato che la riapertura non annulli le rettifiche della Dashboard.
- Le ipotesi Nota/posizione sono verificate separatamente su documenti sintetici
  indipendenti. Il beneficio personale resta da misurare su nuovi campioni.
- Il timeout RAG è stato distinto dall'avvio o corruzione del modello: il primo
  indice di 5.226 passaggi richiede circa 376 secondi, oltre i 120 secondi della
  singola prova. Il collaudo locale ora supporta `--prepare-index`, progresso
  aggregato e checkpoint delle domande. Dopo preparazione, 32 domande su quattro
  corsi concluse; 27 recuperano originali. Riprova calda: preparazione cache
  circa 2,7 secondi, domanda più lenta circa 1,2 secondi. Zero invii remoti.
  Sono misure del recupero, non giudizi sulle risposte generate.
- Nuova ENG: riletti fonte e tentativo per tutte le 37 sezioni. Il campo extra
  della sezione 27 contiene solo punteggiatura locale già ricostruita; bozza
  revisionata manualmente, mantenendo rigido il validatore del prodotto.
  Due diagrammi recuperati dalla fonte; tentativo e fonte conservati.
- Il renderer ha riprodotto un errore della fonte Mermaid (`P ["etichetta"]`):
  normalizzazione del solo rendering per dichiarazioni complete di nodi
  flowchart quotati, dopo i controlli di direttive. Nessuna modifica alla fonte.
  Verificati ancora blocco di click e conservazione delle etichette.
  Rendering della bozza con MarkdownViewer reale: 38 titoli, 6 diagrammi senza
  errori, 210 formule, rete bloccata. Non equivale a installazione nell'archivio.

### Blocco conservato per l'installazione ENG

La prova di installazione con controllo processi fuori sandbox si è fermata
prima di scrivere: Lezionify è aperto. La skill ripara-dispense-inglesi richiede
app e processi chiusi per backup e scritture locali. Nessun file dell'archivio
è stato modificato e nessuna coda è stata cancellata.

Domanda/azione da riprendere: chiudere Lezionify; poi installare la bozza con
il controllo ottimistico delle fonti e backup, verificare apertura e ricerca,
ricontrollare che non vi siano nuovi lavori indipendenti prima di azzerare la
coda terminale. Bozza e script protetto in
`local-artifacts/plan-2026-11-04/eng-recovery/`; il percorso resta privato e ignorato.

### Verifica finale della ripresa

Check generale superato: 812 unit in 63 file, 24 Python, 41 Node,
regressioni Electron con riavvio, typecheck, lint, build e PDF reali.
Ulteriore controllo della rettifica del credito passato. Benchmark ibrido
heldout 25 casi passato: recall@8 1,00, precision@8 0,65, MRR 0,95,
false-positive rate 0,60. Rimane da valutare l'astensione della risposta finale.

Setup aggiornato: 299.977.133 byte, SHA256
`262efea77f2ada79d3f131481a171ad753bf136722e22bc0d404666e72cfba42`.
Verificati 377 file build, nuovi marker funzionali, manifesto e tre backup.
Il controllo iniziale del manifesto era prematuro durante il packaging;
la verifica ripetuta dopo la fine del processo è passata. RAG nel pacchetto
isolato e quattro traduzioni WASM dal pacchetto passati, senza invii di testi.
Backup: local-artifacts/installer-backups/20261104-ripresa-note-calendario.
