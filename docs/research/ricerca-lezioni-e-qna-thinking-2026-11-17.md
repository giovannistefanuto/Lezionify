# Ricerca delle lezioni e opzione Q&A «Pensa di più»

Ricerca del 17 novembre 2026. Fonti primarie online e codice locale; nessuna
chiamata Gemini reale, nuova dipendenza o lettura di credenziali. Questo documento
è una ricerca e una proposta implementativa: l'implementazione e i suoi collaudi
vanno registrati separatamente.

## Risultato operativo

Per la ricerca conviene migliorare il motore locale già presente e conservare
il suo ordine di pertinenza fino alla lista visibile. Per il Q&A conviene un
controllo API del ragionamento, distinto dalla lunghezza della risposta, con
configurazione per modello e tempi d'attesa adeguati. Non serve cambiare provider.

## 1. Ricerca delle lezioni

### Stato trovato nel codice e duplicati

`electron/main/searchIndex.ts` usa già MiniSearch 7.2.0 su nomi, corso, data,
trascrizione e dispense italiana/inglese, con prefix e fuzzy 0,1. Restituisce
gli ID nell'ordine del motore. `ArchiveService.searchFullText` usa questo indice
e un ripiego locale durante l'inizializzazione.

Il punto che attualmente perde la pertinenza è `src/hooks/useLectures.ts`:
`visibleLectures` trasforma gli ID in un Set per filtrare, poi ordina sempre per
data decrescente. Questo era coerente con D-0531 e con la release 0.2.1, ma non
realizza la nuova richiesta di ordinare la ricerca per rilevanza.

La barra esiste quindi già; crearne un'altra sarebbe duplicazione. Nel backlog
storico la voce **37** copre ricerca e Q&A su tutte le fonti del corso (RAG),
mentre **90–92** riguardano qualità delle risposte e calibrazione del recupero.
La richiesta attuale aggiunge la qualità della ricerca nell'elenco lezioni:
va collegata a queste voci, senza riaprire come non esistente la funzione RAG.

### Cosa offre già MiniSearch

MiniSearch usa BM25+ dal ramo 5, quindi il ranking non equivale a ordinare per
numero grezzo di occorrenze. La documentazione consiglia di lasciare i parametri
BM25 predefiniti e preferire pesi dei campi per adattare la rilevanza.
[Changelog ufficiale](https://github.com/lucaong/minisearch/blob/master/CHANGELOG.md),
[opzioni ufficiali](https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html).

La libreria supporta ricerca locale in memoria, corrispondenze esatte, prefissi,
refusi, pesi dei campi e suggerimenti. Il normalizzatore predefinito converte in
minuscolo; stemming e stopword richiedono una scelta esplicita. Questo permette
di migliorare l'esperienza senza inviare lezioni a server di ricerca.
[README ufficiale](https://github.com/lucaong/minisearch/blob/master/README.md).

### Proposta per questa iterazione

1. Durante una query mostrare **Pertinenza / Data**. Usare il ranking degli ID
   per Pertinenza e conservare i filtri corso/stato/archiviati. Senza query
   mantenere l'ordine cronologico già richiesto dall'utente.
2. Favorire titolo/nome della lezione e corrispondenze precise rispetto a un
   riferimento incidentale nel corpo; provare i pesi su casi annotati, senza
   trasformarli in una promessa di comprensione semantica.
3. Per query composte verificare la copertura dei termini significativi. Unire
   termini con AND aumenta precisione ma può perdere materiale utile; un ripiego
   OR esplicito o una preferenza per copertura completa è da confrontare su esempi.
4. Gestire accenti e refusi in modo simmetrico fra indicizzazione e query,
   preservando simboli tecnici significativi. Non applicare stemming italiano
   aggressivo a formule e nomi propri senza un benchmark.
5. Conservare l'informazione di pertinenza in tutte le trasformazioni del frontend;
   eventuali pareggi possono usare data e ID per stabilità.

Queste sono raccomandazioni progettuali, non risultati di una prova di qualità
sull'archivio personale. Un insieme minimo di regressioni deve includere: tema
esatto in titolo, tema incidentale ripetuto, due parole di cui solo una presente,
refuso, accento, lezione vecchia più pertinente di una nuova, filtri combinati,
query vuota, risultati asincroni obsoleti e cambio ordinamento senza nuovo invio AI.

### Ricerca semantica: possibilità e confine

Il progetto contiene già `courseRagIndex.ts`: recupero lessicale per passaggi e
fusione dei ranghi lessicali/semantici; `courseRagSemantic.ts` gestisce un modello
multilingue locale con download esplicito e cache revisionate. La model card
del modello di origine descrive vettori da 384 dimensioni per frasi/paragrafi,
utilizzabili per ricerca semantica. [Model card dell'autore](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2).

Una futura estensione della barra può riusare quel recupero per passaggi,
raggruppandoli poi per lezione, mantenendo una corsia lessicale per nomi come
Stackelberg e mostrando estratti verificabili. Non va presentata come già
implementata nella barra generale. Introdurla automaticamente imporrebbe
preparazione dell'indice, consumo CPU/RAM e gestione del modello mancante;
le chiamate a un LLM per ogni tasto non sono necessarie. Il primo miglioramento
consigliato resta preservare e collaudare il ranking locale disponibile.

## 2. Q&A «Pensa di più»

### Stato trovato nel codice e duplicati

`shared/qnaModelPolicy.ts` definisce una catena dedicata: normalmente
`gemini-3.5-flash-lite`, con eccezione per Hydrogen configurato e riserve.
`GeminiService.generateQnaResponse` passa la configurazione al trasporto dentro
la callback del **modello effettivo** (`activeModel`), ma non configura thinking.
`GeminiTransport.generateContentStream` accetta timeout per chiamata; i default
Q&A sono primo testo 20 s, inattività 45 s, tentativo totale 180 s.

La voce storica **9** copre i modelli rapidi per domande contestuali; **53/72**
lunghezza breve/media/lunga; **112** ricerca web facoltativa. Nessuna di queste
coincide con un interruttore esplicito di sforzo di ragionamento. La voce **145**
valuta altri provider: non serve assorbirvi questa modifica Gemini.

### Capacità ufficiali verificate

Per GenerateContent il parametro è `config.thinkingConfig.thinkingLevel`.
Flash-Lite 3.5 e 3.1 supportano minimal/low/medium/high, con minimal predefinito;
3.8 Flash supporta low/medium/high. Hydrogen supporta low/medium/high/xhigh e
parte già da high. I modelli 2.5 usano invece `thinkingBudget`. Evitare di inviare
entrambi i controlli. Un livello più alto può richiedere più tempo e token;
`maxOutputTokens` include il ragionamento e un limite troppo basso può troncare
la risposta. [Guida ufficiale GenerateContent](https://aistudio.google.com/docs/thinking?generate-content=true).

Flash-Lite 3.5 è un modello stabile con supporto thinking documentato.
[Scheda ufficiale del modello](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite).
Il listino standard consultato indica 0,30 USD/milione di token in ingresso e
2,50 USD/milione in uscita, compresi i token di ragionamento; esistono quote free
con condizioni specifiche. Sono prezzi del 17 novembre, non una stima di costo
per domanda. [Listino ufficiale](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite).

### Proposta implementativa conservativa

- Checkbox **Pensa di più**, disattivata inizialmente, distinta da Breve/Media/Lunga
  e Ricerca online. L'etichetta ausiliaria deve avvertire di possibile maggiore
  attesa e consumo; la spunta da sola non avvia richieste.
- Per Flash-Lite 3.5 passare `ThinkingLevel.HIGH` quando attiva; conservare la
  politica rapida ordinaria quando spenta. Calcolare la configurazione su ogni
  `activeModel`, perché il fallback può avere capacità diverse.
- Limitare le riserve approfondite a modelli con supporto verificato, oppure
  dichiarare visibilmente l'eventuale degradazione. Non attribuire supporto ai
  nomi 3.5 Flash/3.7 soltanto perché appartengono alla stessa famiglia.
- Hydrogen è già high di default: reimpostare high non significa «più del
  default». La versione locale di `@google/genai` 2.19 espone nell'enum soltanto
  MINIMAL/LOW/MEDIUM/HIGH (`dist/genai.d.ts`, `ThinkingConfig`/`ThinkingLevel`).
  Evitare un cast cieco per XHIGH; scegliere livelli standard/approfondito
  espliciti compatibili, oppure motivare e verificare un aggiornamento SDK.
- Allungare soltanto l'attesa iniziale delle richieste approfondite, con un limite
  finito e annullamento reale. Il timeout non è un parametro di intelligenza:
  serve a non far fallire l'attesa prima che inizi il testo. Coordinare anche
  il limite totale del tentativo, senza moltiplicare retry costosi.
- Non abilitare automaticamente esposizione dei pensieri interni o riepiloghi
  del ragionamento. La funzione richiesta riguarda la qualità della risposta,
  non un nuovo contenuto da mostrare o registrare.

Sono scelte proposte per Lezionify, da confermare con test del contratto. Il
controllo HIGH aumenta lo sforzo richiesto, non garantisce correttezza o supporto
delle fonti. Non ho eseguito confronti di qualità/costo tramite API reali.

### Verifiche offline raccomandate

Testare checkbox e preferenza, snapshot per singola richiesta, inoltro
UI→preload→IPC→servizio→SDK, livello sul modello effettivo e sulle riserve,
assenza di campi incompatibili per 2.5, annullamento durante attesa, risposta
vuota, quota, interruzione dopo primo chunk e aggiornamenti obsoleti. Conservare
contesto/immagini e indipendenza della lunghezza. I test SDK simulati attestano
payload e gestione degli errori, non disponibilità del modello sul progetto
personale né superiorità qualitativa delle risposte reali.
