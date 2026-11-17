# Raccolte in Altro e rielaborazione per modalità

Data: 16 novembre 2026. Voce collegata: **134**, posizione **80** della coda
LISTA_ORDINE. Requisiti confermati dall'utente dopo l'intervista `grilling`.
Stato: **prima versione implementata; collaudo personale del podcast ancora aperto**.
Il piano non cambia l'ordine della coda e non avvia altre attività.

## Stato dell'implementazione

La verifica successiva dei casi limite, le correzioni e l'audit dei test sono
descritti nel [rapporto del 16 novembre](../quality/raccolte-casi-limite-2026-11-16.md).
Il file reale indicato dall'utente è stato collaudato localmente fino alla
conversione e alla pianificazione dei blocchi; dopo il consenso esplicito
richiesto dalla revisione automatica è stata completata la prova Gemini reale.

L'utente ha autorizzato l'implementazione completa della prima versione dopo
la conferma del piano. Le sezioni successive conservano la specifica e la
sequenza progettuale; questo riepilogo descrive lo stato effettivo.

- [x] Archivio additivo con ID stabili, raccolte e contenuti distinti dai corsi.
- [x] Audio, video locali, TXT/Markdown; originali verificati con SHA-256,
  selezione nativa, riordino e raggruppamento espliciti, segnalazione duplicati.
- [x] Cinque profili con istruzioni ereditate o sostitutive (anche vuote),
  avvio esplicito, mappa dei temi, sezioni e percorso breve fino a 12.000 caratteri.
- [x] Checkpoint, cancellazione, ripresa esplicita e configurazione immutabile
  del lavoro; nuova generazione senza ripetere la trascrizione.
- [x] Schede versionate con selezione della versione corrente, controlli delle
  citazioni e conservazione del documento precedente in caso di errori,
  fonte cambiata, scelta concorrente di versione o modifica esterna al Markdown.
- [x] Navigazione Altro inizialmente chiusa, raccolte archiviate, ricerca locale,
  impostazioni, lettore Markdown, trascrizione, fonti e posizione di lettura.
- [x] Esclusione da lezioni, statistiche, RAG e pubblicazione dei corsi;
  integrazione con la barriera dell'updater e la chiusura dell'app.
- [x] Collaudi tecnici su fixture sintetiche, renderer Electron, FFmpeg reale,
  due processi distinti e applicazione compilata con preload/IPC reali.
- [x] Prova Gemini reale sul podcast lungo fornito dall'utente, autorizzata
  esplicitamente: 18 sezioni e 55 citazioni verificate, con riprese dai checkpoint
  e lettura nell'app compilata. Artefatti esclusivamente locali.
- [ ] Giudizio finale dell'utente sulla fedeltà, ricchezza e utilità della scheda.

Moduli realizzati: `shared/collections.ts`, `electron/main/collections/`
(`repository`, `service`, `profiles`, `adapters`),
`CollectionNavigation.tsx`, `CollectionsWorkspace.tsx`, `collections.css`.
Collegamenti in archivio, main, preload, App e Sidebar.
Test in `collections.test.ts`, `collections.browser.tsx`, con regressioni
aggiuntive in `archive.test.ts` e `geminiAudioOwnership.test.ts`.

Le parti audio/video vengono convertite e trascritte separatamente nell'ordine
scelto e riunite in una trascrizione unica. Ogni parte completata resta
riutilizzabile; non serve ricostruire un unico file audio né perdere gli
originali. Il fallback ASR per le raccolte è neutro rispetto al dominio e
accetta anche pensieri brevi nella lingua originale.

`collections/index.json` contiene solo le definizioni delle raccolte; i
contenuti vengono ricostruiti scandendo i rispettivi `metadata.json`, senza
un secondo indice persistente dei contenuti. Le importazioni incomplete
restano in directory nascoste `.import-*` e non appaiono come contenuti riusciti;
non vengono eliminate automaticamente. Un gruppo già salvato resta disponibile
anche se un gruppo successivo della stessa importazione fallisce.

La cronologia mostra configurazione, modelli effettivi e token restituiti dal
provider per le chiamate riuscite della scheda; questi token non comprendono
ASR o tentativi falliti e non equivalgono a un costo fatturato. Le prove AI
automatiche impiegano adapter deterministici: dimostrano i contratti e la
ripresa, non la qualità semantica di Gemini su registrazioni reali.

Comandi: `npm run check` per il gate generale e `npm run test:collections`
per lo scenario dedicato (con riavvio reale) e lo smoke della build compilata.
Eseguire quest'ultimo dopo `npm run build`. Gli strumenti utilizzano profili
temporanei, dati sintetici e nessuna credenziale personale. Screenshot locali
di verifica in `local-artifacts/collections-qa/`, esclusi da Git.
Il renderer è verificato anche a 768 e 390 pixel isolando il workspace;
la finestra desktop conserva il limite minimo preesistente di 900 pixel.

Il gate finale `npm run check` ha superato inventario anti-esclusioni,
typecheck, lint, **914 unit** (28 del modulo raccolte e 4 dell'adapter),
RAG offline, **24 Python**, **41 Node**, updater,
regressioni Electron con riavvio, build e PDF reali. Il percorso dedicato
`npm run test:collections` è passato anche fra due processi Electron e con
l'app compilata, preload e IPC reali. Le regressioni includono attesa e
interruzione di richieste già accettate ma ancora in preparazione: questa
fase conta come attività in corso anche per chiusura e updater.
Passato anche il contratto Release. Nessun test saltato o TODO nel rapporto
strutturato della suite; nessun test preesistente rimosso o disabilitato.
Nessun installer o Release rigenerati.

## Risultato atteso e perimetro

Lezionify conserva e rielabora anche materiali esterni allo studio universitario.
La barra laterale offre **Altro**, chiuso all'avvio, con raccolte a un livello
e una sottosezione **Raccolte archiviate**, anch'essa inizialmente chiusa.
Ogni raccolta contiene registrazioni, episodi o testi, senza CFU, calendario,
ore previste o data d'esame. Elenchi dal più recente e ricerca locale.

Le raccolte non entrano in Tutti i corsi, corsi archiviati, statistiche,
obiettivi, previsioni e conteggi universitari. È consentito riusare i moduli
di lettura senza attivare il tracciamento dello studio.

Modalità iniziali: **Lezione, Conferenza, Podcast e testimonianze, Riunione di
lavoro, Pensieri personali**. La provenienza (audio, video locale, trascrizione,
eventuale collegamento di riferimento) è distinta dalla modalità.
La modalità Lezione dentro Altro non trasforma la raccolta in un corso.

La raccolta contiene modalità e istruzioni testuali facoltative predefinite;
ogni contenuto può ereditarle oppure sostituirle esplicitamente. Distinguere
nel modello istruzioni ereditate, istruzioni sostitutive vuote e non vuote.
Le istruzioni personali non possono autorizzare invenzioni o ignorare la fonte.

L'importazione offre **Solo trascrizione** e **Trascrizione e scheda**, mostra
le impostazioni effettive e richiede un comando esplicito prima dell'invio AI.
Per un testo già trascritto il primo percorso salva il testo senza chiamate AI.
Ogni file è un contenuto distinto; l'utente può dichiarare e ordinare più file
come parti dello stesso contenuto. Gli originali si conservano sempre.

La scheda può essere lunga, senza tetto rigido di pagine e senza obbligo di
riepilogo iniziale breve. Organizzazione per temi che conserva sviluppo dei
racconti, esempi significativi, precisazioni, cambiamenti di posizione e voci
distinte. Comprimere solo ripetizioni prive di nuovo significato.
Nessuna aggiunta interpretativa, consiglio, domanda di riflessione o conclusione
che non emerga dalla fonte. Citazioni solo testuali, attribuzioni solo supportate,
incertezze riconoscibili. Non dedurre emozioni o intenzioni dalla sola trascrizione.

Il lettore mostra fonte, trascrizione e scheda corrente; consente di consultare
le versioni precedenti. La rigenerazione riusa il testo senza ritrascrivere;
la nuova scheda diventa corrente solo a generazione e salvataggio completati.
Cambi di modalità o istruzioni non avviano chiamate AI.
Pubblicazione GitHub esclusa per default e mai ereditata dai corsi.

## Punti del codice verificati

| Modulo esistente | Conseguenza per il lavoro |
| --- | --- |
| `shared/archive.ts`: `CourseDefinition`, `Lecture`, `AppSettings` | I corsi richiedono dati universitari; non rappresentare le raccolte come corsi fittizi. |
| `electron/main/libraryRepository.ts`, `fileStorage.ts`, `atomicFile.ts` | Riusare primitive locali affidabili; conservare il formato e i percorsi dell'archivio universitario. |
| `electron/main/archive.ts` | Coordina importazioni, generazione, logistica d'esame e pubblicazione; non instradare automaticamente qui le raccolte. |
| `electron/main/ai/archivePipeline.ts` | Pipeline attuale con trascrizione, dispense e traduzione; il comando generale include la traduzione. Serve selezione esplicita delle fasi per Altro. |
| `electron/main/gemini.ts` | Trascrizione riusabile; generazione esistente legata a segmentazione, overview e note d'esame. Separare le politiche dei documenti. |
| `electron/main/ai/aiJobStore.ts` | Checkpoint basati anche su testo e modello; la scheda deve includere modalità, istruzioni e versione del prompt nella propria identità. |
| `electron/main/videoImporter.ts` | Conversione e sessioni native da riusare; aggiungere conservazione degli originali prima della pulizia dei temporanei. |
| `src/components/Sidebar.tsx`, `src/hooks/useLectures.ts` | Aggiungere navigazione dedicata, senza cambiare il significato dei filtri universitari. |
| `LectureDrawer.tsx`, `FocusWorkspace.tsx`, `useLectureContent.ts` | Lettura intrecciata a tracker e stime; riusare il rendering tramite un contenitore privo di effetti di studio. |
| `electron/main/publishing/publishService.ts` | Consenso per corso e compatibilità legacy: le raccolte devono essere escluse anche nel main. |

## Architettura proposta

Queste sono scelte tecniche del piano, da verificare durante l'implementazione;
non descrivono funzionalità già disponibili.

### Archivio additivo delle raccolte

Introdurre `shared/collections.ts` con contratti distinti per raccolte,
contenuti, fonti, richieste di elaborazione, avanzamento e versioni generate.
Un modulo `electron/main/collections/` possiede persistenza, invarianti e
operazioni; il renderer accede tramite preload e richieste validate nel main.
L'interface espone creazione/modifica/archiviazione delle raccolte,
importazione, lettura, elaborazione esplicita e consultazione delle versioni.

Preferire metadati versionati sotto `library/collections/`, senza inserire
contenuti in `Library.lectures` o in `AppSettings.courses`. Usare ID stabili e
opachi, indipendenti dai nomi. Ridenominare una raccolta non muove gli originali.
Una disposizione iniziale proposta è:

```text
library/collections/
  index.json
  items/<content-id>/
    metadata.json
    sources/<source-id>.<ext>
    derivatives/audio.<ext>
    transcript.txt
    generations/<generation-id>/document.md
    generations/<generation-id>/manifest.json
```

Metadati: ID raccolta e contenuto, titolo, data della registrazione facoltativa,
data di importazione, elenco ordinato delle fonti con hash e durata disponibile,
modalità/istruzioni ereditate o sostitutive, trascrizione, versione corrente.
Ordinamento per data registrazione con fallback a importazione e spareggio stabile.
Un link di provenienza è solo metadato: non viene scaricato né aperto automaticamente.

Indice e metadati devono avere una fonte autorevole dichiarata: metadati degli
item autorevoli, indice ricostruibile. Scritture atomiche e serializzate;
copie incompiute non compaiono come importazioni riuscite.
Nessuna cancellazione automatica di originali, trascrizioni o vecchie schede.
La deduplicazione segnala gli hash già presenti e non unisce episodi arbitrariamente.

### Riuso della pipeline tramite un seam esplicito

Il modulo di elaborazione riceve una richiesta con sorgente, impostazioni
risolte e fasi autorizzate. Riusa trascrizione, FFmpeg, trasporto Gemini,
limiti, quote, retry e cancellazione esistenti tramite adapter.
Non duplicare chiavi, pool di richieste o fallback e non introdurre dipendenze
in questa fase. Usare ID di lavoro distinti per evitare collisioni con lezioni.

Sequenza: originali locali → eventuale estrazione/unione audio → trascrizione
completa → mappa dei temi → generazione delle sezioni → assemblaggio e verifiche
→ pubblicazione locale della nuova versione. Il testo breve può usare un
percorso ridotto; soglia deterministica da fissare e verificare con casi di
confine. La suddivisione tecnica audio non determina i temi della scheda.

La mappa dei temi conserva riferimenti agli estratti della trascrizione, anche
non contigui, e il contesto necessario a non perdere cronologia o attribuzione.
Una generazione per sezioni riceve anche il contesto generale e regole di
raccordo, evitando duplicazioni artificiali tra sezioni.

Usare un modulo di profili con identificativi stabili e prompt versionati:

| Profilo | Informazioni da conservare |
| --- | --- |
| Lezione | Spiegazioni, passaggi tecnici, definizioni, esempi e indicazioni d'esame solo se espresse. Nessun aggiornamento della logistica dei corsi da Altro. |
| Conferenza | Tesi, sviluppo degli argomenti, esempi, obiezioni e conclusioni dell'autore. |
| Podcast e testimonianze | Idee, episodi di vita, relazione fra esperienza e riflessione, scambi, precisazioni e differenze fra voci. |
| Riunione di lavoro | Problemi, proposte, decisioni effettive, responsabili/scadenze se dichiarati e questioni aperte. Non trasformare proposte in decisioni. |
| Pensieri personali | Intuizioni, dubbi, collegamenti e intenzioni espresse, senza diagnosi o suggerimenti aggiunti. |

Le sezioni assenti nella fonte non vanno inventate per riempire un modello.
Niente blocchi d'esame nei profili non accademici. Nessun obbligo di schemi
Mermaid, traduzione, esercizi o Q&A nella prima versione.
La pipeline universitaria mantiene i prompt e il comportamento precedenti.

Ogni lavoro salva uno snapshot immutabile di hash delle fonti/trascrizione,
modalità, istruzioni effettive, versione dei prompt, modello richiesto e fasi.
Registrare anche modelli realmente utilizzati e fallback nei metadati locali.
Checkpoint di generazione riusabili solo con fingerprint compatibile; i checkpoint
ASR restano indipendenti dal profilo della scheda.
Al riavvio mostrare i lavori interrotti e consentire la ripresa esplicita.
I cambi di configurazione durante un lavoro non ne alterano lo snapshot.

### Versioni e integrità

Scrivere la nuova scheda in un percorso distinto, verificare che sia completa
e non vuota, salvare manifest e infine aggiornare atomicamente il riferimento
alla versione corrente. Se la fonte cambia, fermare la pubblicazione della
generazione obsoleta e conservare la scheda corrente.
Un fallimento o una cancellazione non modifica la versione corrente.
Se nel frattempo l'utente modifica il documento, rilevare il conflitto tramite
fingerprint e non sovrascrivere il suo lavoro; conservare la nuova generazione
come versione separata da scegliere esplicitamente.
Includere modalità, istruzioni e data di generazione nella cronologia consultabile.

Controlli automatici su output vuoti/incompleti, riferimenti ad estratti e
citazioni testuali. Non introdurre una seconda chiamata AI di verifica implicita.
La fedeltà semantica non è dimostrabile con soli controlli strutturali: resta
un criterio del collaudo umano, non una garanzia assoluta.
Timestamp mostrati solo se supportati dai dati; i confini dei chunk ASR non
sono timestamp precisi delle singole frasi. Nessuna diarizzazione promessa.

### Navigazione e isolamento

Introdurre uno scope di navigazione esplicito distinto da `selectedCourse`:
raccolte non rappresentate come codici corso o come `courseCode: null`.
Ricerca locale limitata ad Altro o alla raccolta selezionata, inclusi titoli,
trascrizioni e scheda corrente; gli archiviati sono raggiungibili nel loro scope.
Il lettore riusa Markdown e posizione di lettura, ma non avvia tracker,
crediti, previsioni, logistica, pubblicazione o traduzioni automatiche.
L'esportazione manuale può essere collegata al modulo PDF esistente se compatibile,
senza rendere l'export collettivo dei corsi dipendente dalle raccolte.

Il main esclude le raccolte dal publisher attuale. Non offrire nella prima
versione un interruttore di pubblicazione che il publisher non sappia gestire;
l'eventuale supporto richiederà consenso specifico, senza fallback legacy.
Nessun contenuto personale, istruzione, prompt, risposta o chiave nei log
diagnostici o nei documenti versionati. Metadati tecnici sanitizzati.
Integrare i nuovi lavori nella barriera dell'updater e nella chiusura dell'app.

## Ordine implementativo e criteri di uscita

La tabella conserva l'ordine del piano originale; l'esito attuale è nel
riepilogo di implementazione sopra, con la sola accettazione personale aperta.

| Fase | Lavoro e file principali | Criterio di uscita |
| --- | --- | --- |
| 1. Contratti e archivio | `shared/collections.ts`, nuovo modulo collections, primitive atomiche | Creazione, modifica, archiviazione e riapertura persistenti; vecchia libreria identica; indice ricostruibile. |
| 2. Importazione | Adapter FFmpeg/ASR, dialoghi nativi e preload | Audio, video e TXT salvati; più file distinti o gruppo ordinato; hash degli originali verificati; nessuna chiamata prima della scelta. |
| 3. Profili e generazione | Modulo profili e prompt, adapter Gemini, checkpoint | Cinque modalità, istruzioni ereditate/sostitutive, scheda da trascrizione, progresso/annullamento/ripresa e isolamento dal percorso corsi. |
| 4. Versioni recuperabili | Repository generazioni e manifest | Rigenerazione senza ASR; vecchio documento disponibile durante errori; conflitti e fonte cambiata gestiti; riavvio coerente. |
| 5. Interfaccia | `Sidebar.tsx`, `App.tsx`, nuovi moduli UI raccolte e lettore | Altro chiuso all'avvio; CRUD, archiviazione, ricerca, importazione, istruzioni, lettura e cronologia utilizzabili da tastiera. |
| 6. Isolamento completo | Tracker, analytics, publisher, updater e selettori | Nessuna raccolta nei consumatori universitari; nessun invio GitHub; aggiornamento/chiusura rispettano i lavori attivi. |
| 7. Collaudo e documenti | Unit, Electron, materiali sintetici e prova reale | Gate tecnico superato e valutazione del podcast; solo allora chiusura della voce 134. |

Implementare in incrementi verificabili. Fasi 1–4 precedono il collegamento
completo dell'interfaccia; l'isolamento è un'invariante fin dal primo incremento,
non una correzione da rimandare alla fase 6.

## Piano di collaudo

1. **Compatibilità e dati:** archivio universitario precedente immutato;
   inizializzazione additiva/idempotente; ID stabili dopo rinomina; ripristino
   da interruzioni durante copia e cambio della versione corrente.
2. **Importazioni:** audio singolo, video locale, TXT, gruppo misto supportato,
   riordino parti, annullamento, duplicati, file mancanti e originali integri.
3. **Autorizzazione:** salvare TXT non chiama Gemini; Solo trascrizione non
   genera scheda; importazioni Altro non entrano nella pipeline automatica dei
   corsi; nessuna traduzione implicita. Cambi impostazioni senza traffico AI.
4. **Generazione:** fake del trasporto con cinque profili; profili e istruzioni
   distinti; invalidazione checkpoint su modifiche; nessuna invalidazione ASR
   per solo cambio di modalità; silenzi e trascrizioni problematiche visibili.
5. **Versioni:** rigenerazione, quota esaurita, timeout, annullamento, riavvio,
   modifica concorrente e fonte cambiata mantengono il documento precedente.
6. **Isolamento:** prove negative su publisher (anche con consenso legacy),
   RAG dei corsi, ricerca universitaria, tracker, crediti, dashboard e previsioni.
7. **Electron:** flusso completo, navigazione tastiera, finestre strette, ricerca,
   raccolte archiviate, stato chiuso all'avvio, cronologia e riavvio reale.
   Riutilizzare runner e convenzioni di `tests/integration/`.
8. **Qualità dei profili:** materiali sintetici con esempi ripetuti ma diversi,
   disaccordo, cambio di opinione, responsabile non dichiarato e passaggi ambigui.
   Verifica umana oltre alle asserzioni deterministiche; nessun golden test
   che pretenda identità testuale fra risposte generative.
9. **Prova personale:** episodio lungo di Cinque pani e due pesci fornito
   dall'utente. Confrontare scheda e trascrizione per temi, esempi, attribuzioni,
   omissioni e aggiunte. Giudizio finale dell'utente sull'utilità della scheda.
   Materiali e risultati personali soltanto in percorsi locali ignorati.

Eseguire controlli mirati a ogni incremento. Prima della chiusura eseguire
`npm run check`; aggiungere i nuovi scenari ai runner esistenti e verificare
che siano realmente eseguiti. Eventuali export modificati richiedono PDF reali.
Le chiamate AI reali usano l'azione esplicita concordata, con fasi e modello
visibili e risultati/costi tecnici disponibili quando restituiti dal provider.
La prova personale resta un requisito esterno finché il file non è disponibile
e l'utente non ha valutato il risultato; non segnare la voce completa prima.

## Migrazione, dipendenze e distribuzione

Non migrare corsi in raccolte automaticamente. La prima versione aggiunge un
archivio separato: vecchie lezioni, impostazioni, percorsi e checkpoint restano
compatibili. Nuove installazioni precedenti non vedranno Altro; prima di un
downgrade conservare backup completo e verificare che il vecchio programma non
elimini directory sconosciute. Non promettere retrocompatibilità non collaudata.

Nessuna nuova dipendenza prevista: FFmpeg, Gemini, scrittura atomica, rendering
Markdown e ricerca locale sono già presenti. Se emerge una necessità concreta,
verificarla e registrarla prima di aggiungere pacchetti.

L'attività attuale modifica i sorgenti e la documentazione, senza rigenerare
installer, cambiare versione o pubblicare Release. Al momento della distribuzione seguire
`docs/publishing/aggiornamenti-windows.md`, versione crescente e note; una
rigenerazione del setup attiva le regole di verifica, commit e push di AGENTS.

## Estensioni future esplicitamente richieste

- **Acquisizione da link:** scaricare il materiale da un collegamento e poi
  entrare nella stessa pipeline. Ricerca tecnica futura su trasporto, limiti,
  provenienza, errori e conservazione; nessuna dipendenza o downloader scelto ora.
- **Assistente alle istruzioni:** descrizione scritta o registrazione vocale,
  trascrizione della descrizione e chiamata esplicita a Gemini; proposta di
  istruzioni leggibile, modificabile e da applicare esplicitamente. Non analizza
  né inventa il contenuto della registrazione principale dalla sola descrizione.
- **Tag espressivi:** valutare se ricavare dall'audio etichette come scherzoso,
  riflessivo o concitato durante la trascrizione AI. Esperimento con riferimenti
  temporali e verifica umana; non assumere accuratezza o disponibilità universale.
  Annotazioni AI separate dal testo pronunciato, eliminabili e senza riscrivere
  la trascrizione grezza. Nessuna etichetta psicologica attribuita come fatto.

## Ripresa del lavoro

Prossimo passo: leggere scheda e verifica in
`local-artifacts/collections-real-2026-11-16/`, confrontarle con la fonte e
raccogliere il giudizio finale dell'utente. La copia riletta è distinta
dall'output AI originale e include una correzione puntuale dichiarata.
Consultare questa specifica e le decisioni successive prima di intervenire.
La posizione 80 della coda resta invariata e aperta fino all'accettazione;
questa attività non è un comando LISTA_ORDINE e non autorizza altre voci.
