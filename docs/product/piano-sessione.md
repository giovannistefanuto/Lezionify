# Piano implementativo della modalità Sessione

Documento di progettazione del 18 novembre 2026. Descrive il lavoro da realizzare e i criteri per accettarlo. La modalità deve integrarsi nell'app desktop local-first di Lezionify.

## 1. Risultato atteso

Sessione permette di vedere insieme gli appelli disponibili, costruire più piani e confermarne uno che alimenta Dashboard, countdown e promemoria. La vista si apre dalla sidebar e con Ctrl+Alt+S, come Memo, e permette di tornare allo studio nello stesso punto. La consultazione e la configurazione della sessione sospendono il conteggio del tempo e il campionamento delle stime di studio.

L'utente inserisce tutte le date di un corso insieme. Può avere un esame totale, più parziali obbligatori, solo i parziali ancora da sostenere e appelli totali di riserva. Ogni piano può escludere corsi dalla sessione e fissare una o più date secondo il percorso scelto.

## 2. Requisiti concordati

- Calendario da muro con il mese corrente e due o tre mesi successivi, tutte le date degli esami visibili nel periodo, più eventi per giorno e giorni passati barrati.
- Inserimento per corso, con numerazione originale di parziali e appelli, anche quando si inseriscono soltanto il secondo o il terzo.
- Più piani nominabili, visualizzati uno alla volta. Un piano confermato viene aperto per primo a ogni accesso.
- Prove scelte chiaramente distinguibili dalle alternative attraverso segni e contrasto, oltre al colore.
- Countdown al prossimo esame e ai successivi del piano visualizzato.
- Richiesta di aggiornamento degli esiti all'ingresso nell'app quando sono trascorse prove del piano confermato.
- Modifiche accessibili anche dalle schermate esistenti, con dati coerenti.
- Proposta automatica che distribuisce meglio le prove, anche se prolunga la sessione, rispettando corsi esclusi e date bloccate.
- Accesso rapido Ctrl+Alt+S e consultazione esclusa dal tempo di studio.
- Integrazione futura Google Calendar sia per vedere gli impegni sia per considerare indisponibilità nella proposta.

## 3. Regole progettuali proposte

Queste regole rendono implementabile il comportamento e vanno valutate nel prototipo.

- Apertura iniziale su tre mesi, estensione al quarto se serve. Navigazione dei mesi disponibile. Le date oltre la finestra hanno un riepilogo esplicito e un comando per raggiungerle.
- Intervallo della sessione esplicito e modificabile, distinto dai mesi attualmente visibili. Il calcolo cerca solo entro l'intervallo scelto e mostra la data dell'ultimo appello disponibile.
- Se l'utente sta consultando una sessione già conclusa, il calendario rimane sul suo periodo storico. Una nuova sessione parte dal mese corrente.
- La conferma pubblica una revisione del piano. Le modifiche successive diventano una bozza salvata, con indicatore delle modifiche da confermare. Dashboard e promemoria seguono l'ultima revisione confermata.
- Le schermate esterne a Sessione modificano il piano attivo attraverso lo stesso comando applicativo e richiedono la conferma esplicita della modifica prima di renderla effettiva. Il riepilogo mostra quale data e quali promemoria cambiano.
- Esito iniziale con Superato, Non superato, Saltato e In attesa di esito. È disponibile Rispondi più tardi e la correzione di un esito precedente.
- Google Calendar costituisce una fase successiva alla versione locale completa.

## 4. Modello dei dati

| Entità | Contenuto e responsabilità |
|---|---|
| Sessione | ID stabile, nome, inizio/fine, corsi coinvolti, piani, riferimento alla revisione confermata. |
| Percorso d'esame | Corso e percorso totale o a parziali, elenco delle prove richieste e relazioni con percorsi alternativi. Consente un totale di riserva rispetto ai parziali. |
| Prova | Tappa da completare, per esempio Secondo parziale RL. Identità autonoma dalla sua data, ordine e prerequisiti eventuali, stato già completato. |
| Appuntamento | Data ufficiale disponibile per una prova, numero originale dell'appello, eventuale ora e nota. Una prova può offrire più appuntamenti. |
| Piano | Nome, revisione, corsi inclusi o esclusi, percorso scelto per corso, appuntamenti selezionati e date bloccate. |
| Tentativo ed esito | Prova e appuntamento effettivo, stato dell'esito e data di aggiornamento. La cronologia è comune ai piani. Conserva i tentativi anche dopo il cambio di piano. |
| Indisponibilità | Intervallo locale, eventuale motivazione e livello informativo o vincolante. Usato prima localmente e poi dagli eventi Calendar selezionati. |

Le prove già superate rimangono nella cronologia e soddisfano i rispettivi requisiti. Un secondo parziale può essere configurato senza duplicare il primo già svolto. La riuscita di un parziale soddisfa quella prova, mentre il completamento del corso dipende dal percorso configurato. Gli appelli futuri rimangono disponibili dopo un tentativo non superato.

Gli ID restano indipendenti dai nomi visualizzati. I riferimenti ai corsi riusano l'identità già esistente e devono seguire le operazioni di rinomina e archiviazione. L'eliminazione di un appuntamento referenziato mostra i piani coinvolti e chiede come risolvere i riferimenti. Il cambio della data ufficiale si propaga ai piani che usano quell'appuntamento e rende necessaria la revisione del piano confermato.

Gli esiti si riferiscono a tentativi reali. Le selezioni delle bozze non producono domande sugli esiti. Quando un piano viene sostituito, i tentativi già arrivati alla data prevista restano nella cronologia, evitando che scompaiano dalle domande arretrate.

## 5. Persistenza e compatibilità

1. Introdurre un archivio locale versionato per sessioni e relativi dati sotto la libreria, con API nel main Electron e validazione IPC. Il percorso preciso segue le convenzioni esistenti dopo aver verificato backup e recupero.
2. Riutilizzare le primitive di scrittura atomica, serializzazione e recupero presenti nel repository. Il main possiede le mutazioni e le revisioni.
3. Ogni modifica porta la revisione di partenza. Una revisione superata produce un conflitto leggibile e un ricaricamento, evitando sovrascritture silenziose tra schermate.
4. Salvare le bozze localmente e rendere visibili stato di salvataggio ed eventuali errori. La conferma diventa visibile a tutti i consumatori solo dopo il salvataggio riuscito.
5. Le vecchie date examDate vengono proposte nell'importazione del corso, mantenendo provenienza e valore originale. Si evita di inventare la numerazione dell'appello o il tipo di prova.
6. Creare un risolutore condiviso delle prossime prove. Per i corsi gestiti da Sessione legge il piano confermato. Per gli altri conserva il comportamento delle date esistenti. Un corso escluso dal piano non riattiva la vecchia data come ripiego.
7. Dashboard e promemoria consumano questo risolutore. Per più parziali la Dashboard può mostrare le prossime tappe, con la prossima prova del corso in evidenza.
8. La conferma invalida i promemoria obsoleti e ricalcola quelli futuri, preservando le ricevute degli avvisi già emessi ed evitando duplicati.
9. Le nuove informazioni entrano nei backup locali. Date, impegni e note personali restano nella libreria locale. L'integrazione Google richiede attivazione esplicita.

## 6. Interfaccia e flussi

### Prima configurazione

Apri Sessione, scegli un nome e il periodo, seleziona i corsi. Per ogni corso scegli il percorso, indica le prove già completate e aggiungi le date disponibili. Il calendario si popola subito. Il primo piano viene salvato come bozza e può essere confermato dopo la verifica delle selezioni.

Il form permette di aggiungere più righe senza riaprire il corso. Campi iniziali essenziali con tipo di prova, nome o numero e data. Ora e note restano facoltativi. Un riepilogo evidenzia date duplicate, prove incomplete e percorsi incompatibili. Due esami diversi nello stesso giorno sono ammessi e segnalati come sovrapposizione.

### Schermata principale

- Titolo della sessione e selettore del piano in alto a sinistra.
- Countdown ordinati in alto a destra, con indicazione Oggi e In attesa di esito al posto dei numeri negativi.
- Azioni Aggiungi esami, Gestisci corsi, Duplica piano, Distanza gli esami e Conferma piano. Le azioni meno frequenti stanno nel menu del piano.
- Calendario dominante. Prove scelte con spunta e contrasto maggiore, alternative con stile più discreto. Il colore del corso riusa quello configurato e rimane distinto dallo stato di selezione.
- Clic su una prova per dettaglio, scelta o rimozione dal piano, blocco della data e modifica dei dati ufficiali con effetto spiegato.
- Eventi del giorno sempre raggiungibili e leggibili. Nelle celle affollate si aumenta lo spazio disponibile e si apre un dettaglio completo. Gli esami del giorno devono essere identificabili anche senza hover.
- Distinzione visibile tra piano confermato, piano alternativo e bozza con modifiche. Mostrare un altro piano non cambia quello confermato.

Il trascinamento costituisce un miglioramento successivo. L'assegnazione tramite form e calendario deve già coprire l'intero flusso da tastiera. Trascinare una scelta tra appelli deve usare date ufficiali esistenti. Modificare la data ufficiale richiede un'azione distinta e spiegata.

### Gestione dei piani

Creazione vuota o duplicazione di un piano, rinomina, cambio piano e cancellazione con protezione del piano confermato. L'anteprima della proposta automatica può essere applicata alla bozza o salvata come nuovo piano. Il comando Conferma mostra le variazioni rispetto al piano attivo. Un piano con corsi intenzionalmente rimandati è valido. Un piano con requisiti mancanti per un corso incluso richiede correzione prima della conferma.

### Esiti all'avvio

Dopo il caricamento dell'archivio, mostrare una sola finestra con le prove da aggiornare, partendo dalle più vecchie. Le prove del giorno corrente vengono chieste al successivo accesso dopo la data, salvo aggiornamento manuale. Rispondi più tardi rinvia almeno fino al giorno successivo, evitando richieste continue ai riavvii dello stesso giorno.

Superato aggiorna il requisito. Non superato e Saltato permettono di scegliere un altro appello o rimandare la decisione. In attesa di esito mantiene aperta la prova e consente una successiva richiesta con cadenza configurata nel dettaglio, con proposta iniziale di tre giorni. Qualsiasi nuova scelta futura richiede conferma del piano.

### Accesso rapido e studio

Ctrl+Alt+S apre e chiude Sessione con Lezionify in primo piano. Gestire ripetizione del tasto, composizione, AltGr e dialoghi sovrapposti. Esc chiude prima il dettaglio o il dialogo attivo e poi Sessione. La chiusura ripristina focus, scroll, lingua e punto della lezione.

Riutilizzare la gestione dei dialoghi e delle esclusioni di studio. Aggiungere un'esclusione esplicita Sessione condivisa da tracker, cronologia e stima, evitando di registrare la consultazione come Memo. L'apertura chiude correttamente il segmento di studio corrente. La ripresa usa un nuovo riferimento temporale e non recupera i secondi trascorsi nel calendario. Le pause manuali e Focus Lock rimangono governate dai loro stati.

Sessione deve potersi sovrapporre temporaneamente a Full Focus. Se è già attivo un dialogo Focus Lock, la scorciatoia rispetta lo stack e non lo scavalca. Verificare il comportamento effettivo attraverso il percorso di uscita focus esistente, che applica un'attesa dopo cinque minuti.

## 7. Algoritmo Distanza gli esami

L'algoritmo è locale, deterministico e usa gli appuntamenti configurati. Riceve il piano, il periodo della sessione, la data locale corrente, i corsi inclusi, il percorso di ciascun corso e i blocchi.

### Vincoli

- Una scelta per ogni prova ancora richiesta, con ordine dei parziali e prerequisiti rispettati.
- Percorso scelto per corso conservato. Il passaggio tra totale e parziali si effettua nel piano prima del calcolo.
- Date bloccate mantenute. Corsi esclusi ignorati dal calcolo.
- Appuntamenti passati e prove già superate esclusi dalle scelte future.
- Indisponibilità vincolanti rispettate. Un blocco incompatibile produce un conflitto con le date coinvolte.
- Esami nello stesso giorno hanno intervallo zero. Con orari mancanti si segnala un possibile conflitto senza inventare sovrapposizioni certe.

### Obiettivo

Ordinare le prove per data e includere l'intervallo tra oggi e la prima. Massimizzare l'intervallo minimo, poi ridurre la dispersione degli intervalli e infine ridurre le modifiche rispetto al piano di partenza. Una parità finale usa un ordinamento stabile e preferisce la conclusione più vicina. Non si aggiunge un premio ai giorni dopo l'ultimo esame.

Con un solo esame questa regola favorisce l'appello più tardo disponibile nel periodo. Rendere evidente questo comportamento nell'anteprima, perché consegue dalla preferenza di ottenere più tempo anche allungando la sessione.

I numeri mostrano giorni di calendario, calcolati come differenza tra date locali e non come ore divise per 24. Non rappresentano ore di preparazione disponibili. Festività, impegni parziali e studio contemporaneo di più corsi non vengono convertiti implicitamente in giornate intere.

### Calcolo e presentazione

Per le dimensioni usuali usare una ricerca esatta con potatura, eseguita fuori dal thread UI, con cancellazione. Confrontare il risultato con enumerazione completa su piccoli casi di prova. Stabilire un limite operativo dopo una misura su dati sintetici. Se il limite è raggiunto, mostrare Migliore proposta trovata e il limite della ricerca. La dicitura Migliore combinazione disponibile richiede una ricerca completata con garanzia di ottimalità.

L'anteprima mostra date precedenti e proposte, intervallo minimo, data di fine e allungamento rispetto al piano attuale. Applica e Annulla devono essere sempre disponibili. Se cambiano date, esiti o indisponibilità durante il calcolo, il risultato viene invalidato e ricalcolato prima dell'applicazione. Se manca una combinazione valida, mostrare quali vincoli impediscono la proposta.

## 8. Integrazione futura Google Calendar

Prima dell'implementazione verificare documentazione ufficiale corrente su OAuth per app desktop, permessi minimi in lettura, disponibilità delle API e condizioni di distribuzione. Questa progettazione non assume che i connettori di Codex siano disponibili nell'app distribuita.

Il collegamento offre scelta dei calendari, importazione nell'intervallo della sessione, aggiornamento manuale e indicazione dell'ultimo aggiornamento. Gestire eventi giornalieri, ricorrenze, cancellazioni, fusi, ora legale, eventi su più giorni e duplicati tra calendari.

Gli impegni vengono mostrati come contesto. Per renderli vincolanti si sceglie Impedisce esami e si applica alla giornata o all'intervallo desiderato. Con esami senza orario si richiede una decisione sulla disponibilità giornaliera. Un evento informativo non impedisce una proposta.

Conservare token nel sistema di protezione credenziali già usato dal main. Gestire revoca, disconnessione, selezione dei dati locali da rimuovere e cache offline. Se la cache è obsoleta, mostrare la situazione e richiedere una scelta esplicita prima di calcolare usando indisponibilità non aggiornate. Un aggiornamento Calendar segnala conflitti e non modifica automaticamente il piano confermato.

## 9. Sequenza di realizzazione e criteri di uscita

| Fase | Lavoro | Condizione per proseguire |
|---|---|---|
| 0. Verifica tecnica | Leggere convenzioni attuali di archivio, backup, IPC, focus, scorciatoie e notifiche. Mappare tutti i lettori e scrittori delle date esistenti. | Elenco completo dei consumatori e strategia unica di compatibilità. |
| 1. Prototipo visivo | Calendario realistico con tre/quattro mesi, più piani, celle affollate, dettaglio e anteprima di spaziatura. Tema chiaro/scuro e finestra minima supportata. | Prova d'uso con compiti senza spiegazione e correzione degli ostacoli rilevati. |
| 2. Dati e servizio locale | Contratti, validazione, archivio versionato, salvataggio bozze e conferma atomica, compatibilità examDate. | Riavvio, recupero da errore e revisioni concorrenti verificati con dati sintetici. |
| 3. Prima funzione completa | Inserimento per corso, percorsi/parziali, calendario, scelta, blocchi, esclusioni e gestione piani. | Configurazione completa di una sessione e conferma persistente senza perdita di alternative. |
| 4. Integrazione app | Sidebar, overlay, Ctrl+Alt+S, esclusione studio, Dashboard e promemoria. | Flusso da Full Focus e ritorno verificato, countdown coerenti in tutte le viste, nessun accredito durante Sessione. |
| 5. Esiti | Domanda all'avvio, rinvio, correzione, storico dei tentativi e revisione piano. | Superato, fallito, saltato e attesa gestiti attraverso riavvii e cambi di piano. |
| 6. Spaziatura | Ricerca, vincoli, anteprima, applicazione a bozza o nuovo piano, annullamento. | Risultati esatti sui casi piccoli, vincoli rispettati, UI reattiva e risultati obsoleti rifiutati. |
| 7. Collaudo locale completo | Regressioni mirate, verifica visiva dell'app compilata e prova personale con una sessione rappresentativa. | Tutti i criteri obbligatori sotto superati e limiti documentati. |
| 8. Calendar | Ricerca ufficiale, collegamento, selezione calendari, cache e indisponibilità. | Revoca/offline/fusi e conflitti verificati, aggiornamento privo di modifiche implicite al piano. |

La versione locale completa comprende le fasi 0–7. Il trascinamento può seguire il collaudo del flusso base. La distribuzione richiederà il processo release applicabile al momento dell'implementazione.

## 10. Matrice di verifica

### Dati, regole e recupero

- Corso con totale a tre appelli, solo terzo inserito, primo parziale già svolto, due o più parziali obbligatori e totale alternativo.
- Piani duplicati e indipendenti, corso rimandato in un solo piano, una o più date bloccate, piano senza esami inclusi.
- Modifica di data comune a più piani, rinomina corso, archiviazione corso, cancellazione appuntamento referenziato e conferma con bozza incompleta.
- Riavvio, errore di scrittura, file danneggiato, recupero, comando ripetuto e modifica concorrente da due schermate.
- Importazione delle vecchie date ripetuta senza duplicati, valori conflittuali tra CourseDefinition e CourseConfig resi espliciti, corso escluso privo di countdown residuo.

### Calendario e accessibilità

- Tre e quattro mesi, cambio anno, febbraio bisestile, apertura a fine mese e aggiornamento a mezzanotte.
- Due o più prove nello stesso giorno, nomi lunghi, più di tre countdown e date fuori finestra raggiungibili.
- Tema chiaro/scuro, zoom 125/150/200 per cento, navigazione da tastiera, focus visibile, ordine di lettura e informazioni essenziali disponibili senza hover.
- Colore del corso e selezione distinguibili anche in scala di grigi. Le X dei giorni passati lasciano leggibili date ed eventi.

### Studio e integrazioni

- Aprire da lettura, Q&A, Memo e Full Focus. Verificare anche pausa manuale, pausa programmata e Focus Lock già aperto.
- Misurare con orologio controllato che calendario, editor date e domanda esiti accreditino zero secondi al tracker e zero campioni alla stima.
- Chiudere e riprendere senza credito retroattivo, senza doppio conteggio e senza perdere focus, scroll e lingua.
- Confermare un nuovo piano e verificare in un unico flusso Sessione, Dashboard, promemoria, riavvio e prima apertura sul piano confermato.

### Algoritmo ed esiti

- Confrontare con enumerazione su piccoli insiemi. Verificare date coincidenti, singolo esame, nessun esame, blocchi incompatibili, alternative insufficienti e soluzioni equivalenti.
- Misurare il calcolo su sessioni sintetiche di dimensione crescente. Verificare annullamento e interfaccia reattiva.
- Modificare un dato durante la ricerca, rifiutare la proposta superata e verificare che Annulla conservi il piano iniziale.
- Domande esito limitate ai tentativi pertinenti, rinvio rispettato, correzione possibile e primo parziale superato privo di completamento indebito dell'intero corso.

### Prova d'uso osservata

Chiedere a una persona che non conosce la funzione di inserire gli appelli di un corso, riconoscere quali sono in piano, scegliere il secondo appello, bloccare un parziale, rimandare un corso, duplicare un piano, leggere il prossimo countdown, scartare una proposta e confermarne un'altra. Osservare esitazioni, errori e richieste di spiegazione. Il collaudo visivo include screenshot reali dell'app, confronto con lo stile di Lezionify e verifica di testi tagliati, densità e significato dei colori.

## 11. Punti di aggancio verificati

- src/App.tsx ospita viste principali e scorciatoie. useQuickCapture e QuickCaptureOverlay forniscono il precedente per Memo.
- shared/archive.ts contiene examDate sia in CourseDefinition sia in CourseConfig. Dashboard e shared/examReminders.ts usano oggi una sola data per corso.
- CourseManagementModal e Dashboard possiedono ingressi di modifica delle date da portare sul comando condiviso.
- LectureDrawer passa già una sospensione a useStudyTracker. src/utils/studyActivity.ts centralizza esclusioni usate anche da useStudyEstimate.
- useStudyTracker contiene il flusso di uscita Focus Lock da collaudare esplicitamente con l'accesso rapido a Sessione.
- src/styles.css definisce palette verde, temi e carattere Inter da riutilizzare nel prototipo e nell'interfaccia finale.

Le denominazioni dei nuovi moduli saranno scelte durante l'implementazione seguendo la struttura effettiva. Riutilizzare servizi e componenti esistenti dove preservano i contratti. Valutare nuove dipendenze soltanto se emerge un'esigenza concreta.

## 12. Decisioni da validare nel prototipo

Le richieste funzionali sono definite. Restano proposte progettuali la gestione automatica del quarto mese, la navigazione per date esterne, il modello di revisione confermata con bozze, la conferma delle modifiche dalle schermate esterne, il rinvio degli esiti in attesa e il comportamento con un solo esame nell'ottimizzatore. Questi punti devono essere mostrati nel prototipo e confermati prima di stabilizzare i relativi contratti.

Il piano è completo quando la prima implementazione locale supera la matrice tecnica e la prova d'uso, con eventuali limiti visibili e registrati. Il collegamento Calendar ha un proprio collaudo e può essere distribuito successivamente.
