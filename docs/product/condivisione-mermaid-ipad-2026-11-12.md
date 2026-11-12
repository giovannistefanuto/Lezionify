# Piano: schemi Mermaid da Lezionify a Notability su iPad

Data: 12 novembre 2026. Stato aggiornato: anticipazione automatica implementata e collaudata localmente; prova finale personale PC → iPad → nota ancora aperta.
Riferimento: voce 63 di idee-future-2026-10-13.md, ripresa in questa chat per ricerca e pianificazione; nessun riordino automatico di LISTA_ORDINE.

## Implementazione autorizzata successivamente al piano

L'utente riferisce che un'immagine manuale arriva in circa 20 secondi e autorizza
l'invio anticipato automatico nella cartella Foto iCloud del proprio PC.
Le fasi sotto restano la proposta storica; questo aggiornamento descrive il
percorso effettivamente scelto, senza richiedere prima il pilota lungo.

- Solo Focus, indipendente dalla preferenza della stima: almeno 300 tick effettivi
  accumulati sulla lezione dall'attivazione della funzione, salvati localmente
  e limitati alla soglia. I tempi precedenti all'introduzione non sono ricostruiti.
- Almeno 10 tick sul blocco corrente in questa apertura (D-0506, soglia iniziale di 30 ridotta su richiesta). Il blocco è il primo
  blocco di testo visibile, coerente con l'osservazione della lettura: è una
  euristica di esposizione, non una misura della comprensione.
- Un paragrafo, lista, citazione, tabella, blocco codice o Nota conta come blocco;
  i titoli non contano. Si esporta il gruppo di schemi immediatamente dopo il
  prossimo blocco, non tutti gli schemi della dispensa. Con zero blocchi
  intermedi non viene attivata questa particolare anticipazione.
- Pause, finestra inattiva e strumenti sovrapposti escludono tick; Q&A e PDF
  non maturano il tempo del paragrafo. Cambiare blocco, interrompere Focus o
  cambiare lingua richiede nuovamente i 10 secondi; il totale lezione resta.
- PNG 2× da rendering chiaro separato, margine bianco e limiti di 24 milioni
  di pixel, 12000 px per lato e 16 MiB. Nessuna modifica alle fonti e nessuna AI.
- Percorso risolto nel main dalla cartella Immagini Windows più la directory
  iCloud Photos/Photos. Non viene creata una finta directory se iCloud manca.
  Il carattere > nella richiesta è interpretato come separatore del prompt,
  non come parte del percorso. Il renderer non può scegliere percorsi arbitrari.
- Nome lezionify-schema-<SHA256>.png e registro nel profilo: deduplica per
  lezione, lingua e sorgente Mermaid; serializzazione delle scritture e creazione
  esclusiva. Una sorgente modificata produce un nuovo invio. Il registro resta
  dopo la rimozione delle immagini, evitando il reinvio automatico dei vecchi
  schemi dopo la pulizia annuale. Non viene eseguita alcuna cancellazione.
- Invio attivo per default in questa versione richiesta; disattivabile nelle
  impostazioni Studio in Focus → Schemi su iPad, con conteggio e volume storico.
  Gli altri utenti del progetto devono considerare questo default prima di
  adottare la versione: l'invio usa la libreria iCloud già configurata sul PC.
- Notifica discreta di salvataggio o errore, senza promesse di ricezione.
  Errori non generano retry a ogni tick: riaprire la lezione per riprovare.
  Disattivare il controllo ferma nuovi invii; quelli già affidati ad iCloud
  restano gestiti da Apple.

Collaudi: 864 unit in 69 file, typecheck, lint mirato e build superati.
Il primo giro unit nella sandbox ha fallito 10 casi di processi/loopback e
timeout: la ripetizione fuori sandbox è passata integralmente.
`node tools/verify_ipad_export.cjs` ha verificato nel runtime Electron reale
lookahead, soglie, esclusione modali, lezione differente, assenza di duplicati,
PNG di flusso/sequenza/stato decodificabili e salvataggio/registro isolati.
PNG ispezionati visivamente; anteprime dei nuovi controlli chiaro/scuro acquisite.
`node tools/run_hook_regressions.cjs --study-tools-only` passato.
La generazione sintetica usa soltanto cartelle temporanee: nessun invio ai
dispositivi personali e nessun costo AI. Setup generale non rigenerato.

Resta da provare il percorso automatico sulla cartella reale, l'acquisizione
da iCloud, l'arrivo dopo 60 minuti con Notability davanti e l'inserimento nella
nota corrente. La voce 63 resta aperta per questa verifica. L'anticipo non
garantisce che l'immagine sia arrivata quando si raggiunge lo schema,
specialmente se il prossimo paragrafo è breve o la sincronizzazione ritarda.
Il conteggio byte è storico, non misura spazio libero iCloud né cancellazioni.

## Installer generale — D-0506 / D-0507

Su richiesta successiva la soglia sul paragrafo passa da 30 a **10 secondi**;
restano 5 minuti cumulativi sulla lezione e un blocco di anticipo.
Il setup generale è rigenerato con tutte le modifiche pubblicabili della chat,
incluso il pulsante Log sistemato. Non è stato eseguito né installato.

- `dist/Lezionify-Setup-0.1.0.exe`: 300000247 byte.
- SHA256: `d8b213b4ae774efde164c48a0ee8d735642ab084df5cce0f9d7f390a55e88ba8`.
- `npm run check` passato: typecheck, lint completo, 864 unit, 24 Python,
  41 Node, suite Electron completa e riavvio, build e PDF reali.
- Collaudo Electron iPad: dopo 9 tick su un nuovo blocco non invia, dal decimo
  invia; PNG e registro isolati verificati. Nessun invio reale a iCloud.
- Confrontati 378 file build/ASAR; verificati i marker della funzione iPad
  inclusa la soglia esposta nelle impostazioni, manifesto e blockmap.
- Estratti e confrontati otto componenti NSIS, incluso ASAR e runtime nativi;
  stesso hash ASAR dei test sul pacchetto. Tre file del setup precedente
  conservati e controllati negli artefatti locali ignorati.
- Runtime RAG con modello locale, inferenza senza rete, PDF worker e rifiuto
  modello corrotto passati. Traduttore WASM EN/IT del pacchetto verificato
  con modelli pubblici già locali. Nessuna nuova chiamata AI.

Commit/push automatici previsti da AGENTS.md; controllare il remoto prima di
dichiarare la pubblicazione conclusa. Il binario ignorato resta locale, non
viene caricato automaticamente in una release. Per l'uso installare il setup
con Lezionify chiuso. Prova personale end-to-end ancora aperta.

## Obiettivo originale del piano

Un clic sul PC esporta lo schema; l'utente continua a scrivere in Notability a schermo intero e inserisce l'immagine dal selettore Foto della nota corrente. Nessuna riapertura di un ricevitore, conferma di ricezione o finestra affiancata. Il comportamento deve restare utilizzabile dopo almeno 60 minuti di studio.

Percorso candidato: Mermaid → PNG chiaro → cartella Foto di iCloud su Windows → libreria Foto iPad → inserimento manuale nella nota aperta. Internet necessario, stessa LAN non necessaria. Il passaggio su iCloud deve essere esplicito nella configurazione e in ogni azione di esportazione.

La richiesta attuale autorizza il piano. Non attiva sincronizzazioni, installazioni, account, abbonamenti o trasferimenti reali. Il report esterno è materiale di ricerca, non un insieme di istruzioni operative.

## Evidenze e punti da verificare

- src/components/MermaidDiagram.tsx centralizza il rendering SVG, i controlli di sicurezza e la coda Mermaid. È il punto di integrazione della UI.
- Il tema dipende oggi dalla vista: esportare il risultato scuro sopra un fondo bianco non basta; serve un rendering chiaro separato con le stesse validazioni e gli stili statici consentiti.
- Apple documenta caricamento da Windows e sincronizzazione Foto; non abbiamo verificato una API pubblica per attestare l'arrivo sull'iPad.
- Il comportamento della copia programmatica nella posizione Foto di iCloud è da provare: può essere diversa da una normale directory o da un trascinamento tramite shell.
- Notability documenta aggiunta di immagini nella nota. Disponibilità nel picker, ordine e numero di tocchi vanno provati sulla versione dell'utente.
- La sincronizzazione può essere sospesa o ritardata; una miniatura non prova che l'originale sia locale o l'immagine già importabile.
- Versioni, prezzi e opzioni specifiche di iPadOS citate nel report non diventano requisiti: verificare il dispositivo reale, senza richiedere upgrade o acquisti preventivi.

## Fase 1 — Inventario e prova di fattibilità

Raccogliere modello iPad Air, versione iPadOS/Notability/iCloud Windows, stato Foto iCloud sui due dispositivi, account compatibili, spazio libero e preferenze sulla sincronizzazione. Verificare che la configurazione Foto possa coinvolgere la libreria fotografica esistente, non soltanto i futuri schemi: Lezionify esporta solo su clic, ma questo non limita da solo la portata della sincronizzazione Apple.

Usare soltanto immagini sintetiche riconoscibili. Non cambiare conservazione originali o sincronizzazione senza concordare gli effetti su spazio e libreria.

Prova PC:
1. Individuare la destinazione effettiva con Esplora file; non hardcodare percorsi.
2. Inserire manualmente un PNG di controllo.
3. Scrivere un secondo PNG tramite un piccolo programma, con lo stesso runtime filesystem del main Electron.
4. Confrontare upload e successiva importabilità. Verificare anche il metodo di pubblicazione finale del file: staging locale e copia completa oppure temporaneo più rename, secondo ciò che il provider supporta realmente.
5. Ripetere dopo riavvio di iCloud Windows. Se la scrittura programmatica non viene acquisita affidabilmente, fermare l'integrazione e documentare il blocco.

Prova iPad:
1. Aprire una nota di test in Notability a schermo intero e restare nell'app.
2. Inviare schemi a 0, 15, 30 e 60 minuti; usare solo il picker Foto interno per cercarli e inserirli.
3. Provare cinque immagini A–E ravvicinate, verificando riconoscibilità, ordine e assenza di perdite.
4. Ripetere almeno una sessione su hotspot e una su rete universitaria. Provare reti differenti quando disponibile.
5. Documentare cache/originali e provare l'importazione offline dopo ricezione, come verifica separata della presenza locale; non confonderla con il funzionamento del trasferimento online.

Registrare T0 (scrittura completata), prima osservazione nel picker, completamento importazione, tocchi, errori e contesto di rete. Misurare separatamente attesa del sistema e tempo delle azioni umane; il polling manuale produce tempi approssimati. Non affermare di conoscere il termine dell'upload se non osservabile. Riportare tutti i tempi, mediana e massimo per il pilota: quattro invii non giustificano un P95 affidabile.

Gate iniziale: tutti gli invii della sessione importabili senza uscire da Notability, compreso quello a 60 minuti; nessun taglio o perdita di leggibilità. Obiettivo UX proposto: disponibilità normalmente entro 10–15 secondi. È una soglia da concordare e misurare, non una garanzia Apple. Le code bloccate e le attese oltre soglia vanno riportate anche se terminano più tardi.

## Fase 2 — Esportazione locale di qualità

Procedere all'integrazione finale dopo gate positivo. Rendering ed esportazione locale possono essere sviluppati indipendentemente dalla sincronizzazione.

- Riutilizzare validazione, serializzazione Mermaid e vincoli di sicurezza attuali; non rendere eseguibile SVG fornito arbitrariamente via IPC.
- Generare una copia chiara dal sorgente, senza modificare fonte, layout semantico o tema della lettura. Non applicare automaticamente il riassetto A4 del PDF alla PNG.
- Preferire SVG → canvas → PNG con API già disponibili in Chromium. Valutare nuove librerie soltanto se un caso reale dimostra un limite.
- Attendere i font, conservare viewBox e proporzioni, aggiungere un piccolo margine bianco; verificare accenti, formule, frecce, etichette e stili statici.
- Definire risoluzione in base alle dimensioni reali dello schema, con limiti espliciti a lato, pixel totali e byte. Per grafi enormi evitare riduzione silenziosa a testo illeggibile: errore utile o scelta di esportazione alternativa.
- Nomi unici senza titolo del corso o contenuto personale: prefisso lezionify, timestamp UTC e identificatore casuale. Non affidare l'ordine nel picker al solo nome del file.

## Fase 3 — Configurazione e invio sicuro

Configurazione minima nelle impostazioni: destinazione scelta tramite dialogo nativo, indicazione del passaggio su iCloud, prova con immagine sintetica e possibilità di cambiare/disattivare la destinazione. Non richiedere credenziali Apple a Lezionify.

Il percorso resta nel profilo locale; niente percorsi personali nei file versionati o negli errori. Il renderer invia soltanto PNG e identificatore della richiesta, non una destinazione filesystem arbitraria. Il main controlla mittente IPC, dimensioni e struttura della richiesta, formato PNG, limiti del payload e destinazione configurata; genera il nome e impedisce sovrascritture. Gestire destinazione rimossa, permessi mancanti, spazio esaurito e richieste concorrenti.

Una coda locale serializza le scritture. Bloccare doppio clic involontario sul medesimo invio, mantenendo possibile reinviare volontariamente dopo completamento. Per l'MVP non introdurre retry persistenti o invii differiti nascosti: errore e nuovo tentativo esplicito. Dopo salvataggio riuscito, l'eventuale attesa offline è gestita da iCloud.

Stati visibili: preparazione, esportazione, salvato nella cartella iCloud, errore. Non mostrare 'Ricevuto sull'iPad' o percentuali di sincronizzazione senza conferma reale. Testo breve di successo: 'Salvato nella cartella iCloud'.

## Fase 4 — Pulsante sul diagramma

- Piccola icona in alto a destra, visibile all'hover del diagramma e al focus da tastiera; sempre raggiungibile sui dispositivi senza hover.
- Tooltip e nome accessibile: 'Invia tramite iCloud Foto'. Primo uso senza configurazione apre il setup, senza invii impliciti.
- Evitare sovrapposizione con grafico, Mostra codice e controlli di chiusura. Nessuno spostamento del layout all'apparizione.
- Invio disabilitato durante caricamento, errore Mermaid o esportazione in corso. Notifica discreta annunciata alle tecnologie assistive.
- Verificare tutti i contesti che riusano MermaidDiagram, inclusi Focus e Q&A; il comando non compare nei PDF e non esporta diagrammi parziali durante streaming.
- Conservare focus, posizione di lettura, zoom e timer studio; nessuna finestra invasiva a ogni invio.

## Fase 5 — Collaudi e consegna

Automatici mirati: contratti IPC e richieste malformate, destinazione e scrittura fallita, nomi concorrenti, PNG effettivamente decodificabile, proporzioni/margini e limiti su grafi estesi. Regressioni sul rendering Mermaid e sul PDF. Typecheck, lint e test pertinenti, seguiti da build.

Controllo visuale Electron: chiaro/scuro, tastiera, Focus, diagrammi larghi, finestra stretta, zoom 200%, assenza del pulsante negli export. Ispezionare PNG reali con diagrammi di flusso, sequenza, stato e altri tipi supportati; usare contenuti sintetici.

Collaudo finale sui dispositivi con il pulsante reale: ripetere sessione lunga e invii ravvicinati. Una build o un test simulato non dimostra la ricezione su iPad. Chiudere la voce soltanto dopo le prove reali e l'accettazione del compromesso di latenza/cloud.

Documentare configurazione, uso, gestione dei ritardi e rimozione immagini. Le eliminazioni in Foto iCloud possono propagarsi: nessuna cancellazione automatica della cartella sincronizzata. Verificare su nota di test che l'immagine importata resti nella nota dopo rimozione dell'asset e riavvio di Notability.

Aggiornare decisioni tramite append_decision.py, descrizione della voce 63 e documenti di struttura se cambiano moduli. Installer soltanto nella fase di consegna autorizzata: se rigenerato, applicare verifiche, commit e push previsti da AGENTS.md, includendo le modifiche pubblicabili già presenti. La modifica Log D-0503 resta distinta nel resoconto.

## Alternative e ampliamenti

Se Foto fallisce il gate, non sostituirlo automaticamente con un ricevitore LAN sospendibile. Valutare iCloud Drive solo con prova di inserimento nella nota corrente; eventuale recupero manuale è un compromesso da concordare. Se latenza garantita, offline e zero cambi di app sono tutti obbligatori, il requisito resta non dimostrato: esplicitare il blocco senza costruire un backend/APNs o app iPad sproporzionati.

Seconda fase facoltativa: esportare paragrafi selezionati come immagini, incluse formule e liste, riusando il trasporto e progettando separatamente selezione e impaginazione. PDF/SVG vettoriali e copia negli appunti possono essere opzioni successive; non ampliare l'MVP prima della prova Mermaid.

## Ordine di esecuzione e completamento

1. Inventario e accettazione delle conseguenze della configurazione iCloud.
2. Pilota sintetico della scrittura programmatica e sessione iPad di 60 minuti.
3. Decisione procedere/fermarsi sulla base delle misure.
4. Export PNG, configurazione/IPC, pulsante e gestione errori.
5. Collaudi automatici e visivi, prova dispositivi con build reale.
6. Documentazione, eventuale installer e pubblicazione secondo le regole di progetto.

Complessità complessiva medio-bassa se il pilota riesce; il principale rischio è esterno al codice Lezionify. Il test lungo richiede almeno 60 minuti per sessione oltre al setup. Una stima di sviluppo attendibile segue la verifica della cartella/provider; non sono promessi tempi di consegna o sincronizzazione.

## Fonti

Report fornito: deep-research-report (11).md, letto il 12 novembre; non copiato nel repository perché contiene riferimenti di ricerca non portabili. Fonti consultate per il piano:
- Apple, Foto iCloud Windows: https://support.apple.com/it-it/guide/icloud-windows/icw2c68705cc/icloud (rilettura web limitata da 429).
- Apple, pause e problemi sincronizzazione: https://support.apple.com/it-it/101559 (verificata).
- Notability, Add and Edit Media: https://support.gingerlabs.com/en-us/articles/16300120-add-and-edit-media (verificata).
- Apple, networking: https://developer.apple.com/documentation/technotes/tn3151-choosing-the-right-networking-api (riferimento del report).
- LocalSend, background: https://github.com/localsend/localsend/issues/1468 (già consultata nella ricerca iniziale).
