# Slide nel Q&A — analisi e piano del 15 ottobre 2026

Aggiornamento: le scelte sono state approvate e implementate in D-0304/D-0306. Questo piano conserva le alternative storiche. Stato reale: [implementazione](../product/implementazione-scelte-2026-10-15.md).

Stato: analisi del codice e documentazione ufficiale, nessuna funzione integrata,
nessuna chiamata AI o lettura di PDF personali. Voce 8 del backlog, 9 della coda.

## Dove intervenire

| File | Stato osservato e intervento proposto |
| --- | --- |
| `src/components/FocusPdfViewer.tsx` | PDF.js già incluso, pagine renderizzate su richiesta; aggiungere selezione e rendering dedicato dell'allegato |
| `src/components/FocusWorkspace.tsx` | Possiede grant e associazione PDF; mantenere qui la bozza delle pagine selezionate, distinta da zoom e visibilità |
| `src/components/LectureDrawer.tsx`, `QnaSidebar.tsx` | Anteprime, numeri pagina, rimozione, indicazione di ciò che sarà inviato e comando Invia |
| `src/hooks/useQna.ts` | Oggi invia testo, thread e flag contesto; congelare la bozza per tentativo, conservare allegati dopo errore e isolare cambi lezione |
| `shared/archive.ts` | QnaMessage oggi contiene solo ruolo/testo/data; definire allegati del singolo messaggio e provenienza locale |
| `electron/preload/index.ts`, `electron/main/index.ts`, `archiveValidation.ts` | Estendere IPC e validazione runtime, limiti di numero, MIME, byte e dimensioni |
| `electron/main/focusPdf.ts` | Grant opachi da selezione nativa; non aggiungere accesso a percorsi arbitrari o URL remoti |
| `electron/main/archive.ts`, `gemini.ts`, `ai/geminiTransport.ts` | Allegati nel contenuto utente multimodale; trasporto già accetta contents, ma Q&A oggi passa solo la stringa della domanda |

Non copiare il canvas attualmente a schermo: cambia con zoom, viewport e
virtualizzazione e può essere azzerato quando la pagina esce dalla vista.
Generare un'immagine distinta dal PDF originale, a geometria controllata.

## Alternative da sottoporre all'utente

| Alternativa | Vantaggi | Costi e limiti |
| --- | --- | --- |
| Immagini delle sole pagine scelte | Riusa PDF.js, mostra esattamente l'allegato; include grafici e scrittura a mano | Compressione e risoluzione da provare su formule minute; consumo vision |
| Testo estratto locale | Payload piccolo, utile per selezioni testuali | Perde struttura, disegni e annotazioni; insufficiente come unica modalità per il requisito |
| PDF ridotto alle pagine scelte | Conserva testo e geometria nativi | Occorre estrarre pagine senza inviare il file intero; nuova implementazione/libreria e collaudo |
| Immagini e testo estratto | Può aiutare termini e formule nativi | Duplica contesto; ordine del testo e guadagni qualitativi da misurare |

Proposta tecnica da discutere: iniziare con immagini delle pagine selezionate,
senza migrazione di framework e senza inviare l'intero PDF. Il solo testo può
essere un'aggiunta successiva misurata, non un sostituto invisibile della slide.

Le API Gemini documentano immagini inline in base64 e comprendono PDF tramite
visione. Il limite riportato per una richiesta con immagini inline è 20 MB
complessivi; la documentazione PDF riporta 50 MB o 1.000 pagine. Sono limiti del
servizio, non limiti consigliati per l'interfaccia. Le guide correnti mostrano
anche Interactions: l'app usa `generateContentStream`, per cui un futuro pilota
deve verificare il percorso esistente e i modelli configurati, senza migrare
copiando gli esempi più recenti.
Fonti consultate oggi: [immagini, Generate Content](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding),
[immagini, guida corrente](https://ai.google.dev/gemini-api/docs/image-understanding),
[PDF](https://ai.google.dev/gemini-api/docs/document-processing).

## Scelte ancora necessarie

1. **Conservazione e follow-up:** salvare uno snapshot locale dell'allegato con
   la conversazione oppure solo riferimento a PDF/pagina? Lo snapshot consente
   replay fedele anche se il PDF cambia, ma occupa spazio e richiede pulizia e
   backup. Un riferimento deve segnalare file cambiati o mancanti, mai reinviare
   una pagina diversa in silenzio. I grant temporanei non bastano per il riavvio.
2. **Contesto dei turni successivi:** le slide del primo messaggio vanno reinviate
   se la domanda successiva le usa. Mostrare gli allegati attivi prima dell'invio;
   nessun invio automatico di altre pagine o selezione implicita dal viewport.
3. **Limiti iniziali proposti, da misurare:** massimo 4 pagine, lato lungo 2.048 px,
   8 MB di immagini binarie complessive; calcolare anche base64, testo e JSON
   prima del trasporto. Non sono soglie sperimentalmente validate. Se la formula
   è illeggibile, consentire ritaglio/aumento esplicito o ridurre il numero di
   pagine, senza degrado silenzioso. PNG/JPEG da confrontare su fixture sintetiche.
4. **Compatibilità futura non Gemini:** i candidati testuali dei benchmark non
   vanno trattati come modelli vision. Nessun fallback che scarti gli allegati o
   cambi provider senza scelta esplicita. Separare modello Q&A testuale e vision.

## Piano attuabile dopo la scelta

1. Fixture PDF sintetiche: pagina testuale, equazione minuta, grafo, scansione,
   annotazioni. Produrre anteprime e misurare leggibilità/byte offline.
2. Contratto allegato locale e validazioni, con test di payload manipolati,
   pagine duplicate, dimensioni eccessive e cambio PDF durante la preparazione.
3. Bozza selezione con checkbox e numeri pagina, tastiera, anteprima, rimozione,
   indicazione del provider e Invia. Preparazione locale non avvia richieste AI.
4. Estensione Q&A con test di trasporto sintetico multimodale, abort, errore prima
   e dopo primo chunk, retry esplicito, rotazione chiave e conservazione bozza.
5. Persistenza/migrazione retrocompatibile in base alla scelta del punto 1;
   log solo conteggio pagine/byte, modello, tentativo ed esito. Niente immagini,
   testo delle slide, nomi file o percorsi privati nei log/pubblicazioni.
6. Prova live esplicita solo con fixture sintetiche, budget dichiarato e modello
   realmente configurato; misurare usage e latenza, senza inventare costi.
7. Electron reale in Focus e fuori, cambio lezione e riavvio, errore file mancante;
   installer e local-first. Solo allora chiudere casella e voce della coda.

Non serve una Deep Research generale per partire: ora servono scelta su
persistenza e contesto, poi un pilota ristretto di leggibilità e consumo.
