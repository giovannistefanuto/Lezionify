# Roadmap di distribuzione — Lezionify

Data: 25 ottobre 2026. Obiettivo: passare dall'app personale a una prova privata sul Mac M3 Pro, poi a una piccola beta per studenti e infine a una distribuzione pubblica sostenibile.

Questa roadmap organizza le cose da capire, decidere, implementare e verificare. Non attesta compatibilità Mac o conformità già raggiunte. Le caselle si chiudono con l'evidenza indicata, non con la sola ricerca. Nessuna scadenza di calendario fissata: prima si risolvono le incognite che determinano il lavoro.

Riferimenti: [ricerca e inventario del codice](../research/distribuzione-studenti-fonti-2026-10-25.md), D-0411 e D-0412 in [DECISIONI.md](../../DECISIONI.md), [audit UX già svolto](../quality/audit-ux-ui-2026-10-21.md), [checklist GitHub](launch-checklist.md). La checklist storica riguarda soprattutto la pubblicazione dei sorgenti; qui si prepara l'uso dell'app da parte di altre persone.

## Punto di partenza

| Aspetto | Stato noto | Da determinare |
| --- | --- | --- |
| Primo dispositivo esterno | Mac M3 Pro, Apple Silicon/arm64 | Versione macOS e disponibilità del Mac per build/collaudo |
| Sistemi oggi documentati | Packaging e CI Windows x64 | Matrice di sistemi/versioni effettivamente supportati |
| Prima esperienza | Benvenuto con passaggi e configurazione chiave già presente | Dove una persona nuova si blocca |
| Aggiornamenti | Nessun updater applicativo individuato; versione 0.1.0 | Versionamento, release e percorso di aggiornamento |
| Licenza del progetto | Tutti i diritti riservati | Permesso per beta/uso gratuito oppure licenza open source |
| Servizi AI | Gemini configurato dall'utente | Condizioni per uso esterno, billing, quote e responsabilità dei costi |
| Sicurezza | Cifratura disponibile tramite safeStorage, con fallback Gemini in chiaro; hardening e audit dipendenze residui | Correzioni e verifiche necessarie per la prima consegna |
| Qualità | Collaudi Windows documentati; audit UX con interventi successivi | Prove su Mac e con persone esterne |

I riscontri sopra derivano dalla ricerca del 25 ottobre. Vanno ricontrollati sul commit scelto per ogni release: sviluppo parallelo e nuove dipendenze possono cambiare la situazione.

## Fasi e passaggi di avanzamento

| Fase | Domanda principale | Risultato necessario per avanzare |
| --- | --- | --- |
| 0. Perimetro | A chi lo diamo, per fare cosa e con quali limiti? | Scheda della prima prova e dati del Mac |
| 1. Condizioni di distribuzione | Possiamo consegnare questo pacchetto e usare questi servizi nel modo previsto? | Condizioni API, licenze e flussi di dati chiariti |
| 2. Preparazione tecnica | Il programma funziona davvero sul Mac destinatario? | Pacchetto arm64 verificato su profilo pulito e percorso dati sicuro |
| 3. Prova privata | Un'altra persona riesce a studiarci e torna a usarlo? | Resoconto di uso reale e correzioni prioritarie |
| 4. Uso autonomo | Uno studente riesce a iniziare senza essere accompagnato dall'autore? | Primo avvio, aiuto e gestione errori verificati |
| 5. Release ripetibili | Si può installare e aggiornare conservando i dati? | Release identificabile e aggiornamento provato |
| 6. Beta limitata | Il risultato si ripete con persone e corsi diversi? | Esiti di un piccolo gruppo e supporto sostenibile |
| 7. Pubblicazione | Come lo facciamo trovare e cosa promettiamo? | Pagina download, comunicazione e manutenzione pronte |

Le fasi 1 e 2 possono avanzare insieme: compilazione e prove offline con dati sintetici non dipendono dal chiarimento dei termini AI. Prima di consegnare un pacchetto esterno vanno risolti gli aspetti applicabili della fase 1; prima delle chiamate AI di un tester vanno chiarite le condizioni di quell'uso.

## 0 — Definire la prima prova

- [x] Identificare il processore: M3 Pro, destinazione arm64.
- [ ] **PUB-01 — Raccogliere il contesto del Mac.** Versione macOS, spazio disponibile, eventuale gestione aziendale/universitaria e possibilità di build/prova sul dispositivo. **Esito:** scheda tecnica minima senza identificativi personali.
- [ ] **PUB-02 — Definire il caso di studio.** Un corso della tester, materiali che può utilizzare, compito attuale e risultato che vorrebbe ottenere. Rilevare se studia da audio, video, trascrizioni o PDF. **Esito:** percorso concreto da verificare e confronto con il suo metodo abituale.
- [ ] **PUB-03 — Concordare il perimetro.** Prova privata gratuita, durata indicativa 7–14 giorni, chi finanzia l'AI e come ricevere feedback. Nessuna promessa di assistenza continua. **Esito:** breve scheda della prova.

**Passaggio:** conoscere dispositivo, compito e modalità della prova. Non serve decidere subito monetizzazione, tutte le piattaforme o redesign completo.

## 1 — Chiarire API, licenze e dati

- [ ] **PUB-04 — Verificare l'inquadramento Gemini.** Ripartire dalle clausole su disponibilità di API client a utenti SEE, Paid Services, finalità d'uso e maggiorenni. Chiarire il caso desktop gratuito con chiave dell'utente; se il testo non risolve il caso, formulare una domanda specifica al provider. **Esito:** risposta documentata e modalità utilizzabile; eventuale blocco resta esplicito. Le alternative di provider richiedono una valutazione propria.
- [ ] **PUB-05 — Scegliere come gestire credenziali e costi del pilota.** Progetto della tester oppure progetto dedicato finanziato dall'autore, credenziali revocabili, quote realmente applicabili, verifica dei consumi e distinzione tra avvisi e limiti effettivi. **Esito:** procedura di configurazione e revoca, senza chiavi nell'installer o nei documenti.
- [ ] **PUB-06 — Scegliere le libertà concesse.** Distinguere permesso per la prova privata, uso gratuito del programma e open source con modifica/redistribuzione. Esaminare licenze standard in base all'obiettivo dell'autore e alla compatibilità con i componenti. **Esito:** concessione scritta adeguata alla distribuzione scelta; nessuna licenza è già selezionata da questa roadmap.
- [ ] **PUB-07 — Verificare le licenze del pacchetto.** Inventario di dipendenze, FFmpeg effettivamente incluso e sorgenti corrispondenti, runtime modificati, dizionari, modelli, suoni, font e marchi. Separare installato, incluso nel pacchetto e scaricato successivamente. **Esito:** obblighi soddisfatti, attribuzioni e sorgenti/modifiche disponibili dove richiesto.
- [ ] **PUB-08 — Descrivere i flussi dei dati.** Cosa resta locale, cosa viene inviato a Gemini, cosa può essere pubblicato su GitHub, cosa viene scaricato e cosa riceve eventualmente l'autore. Valutare informazione agli utenti e ruoli privacy sul flusso reale. **Esito:** spiegazione comprensibile e assenza di pubblicazione o invio AI inattesi.
- [ ] **PUB-09 — Verificare i materiali della prova.** Regole del corso/ateneo e diritti su audio e slide; separare studio personale, invio a provider e pubblicazione. **Esito:** materiali idonei al percorso scelto; demo pubbliche con esempi sintetici o autorizzati.

Fonti e incognite giuridiche sono nella [ricerca](../research/distribuzione-studenti-fonti-2026-10-25.md). Ogni soluzione deve essere verificata sulle condizioni applicabili al momento della distribuzione. Un'etichetta «gratis» o «open source» non risolve da sola questi punti.

## 2 — Preparare e collaudare la versione Mac

- [ ] **PUB-10 — Definire dove produrre la build.** Mac locale o runner macOS adeguato; dipendenze per arm64, risorse e componenti nativi corretti, build riproducibile da commit identificato. Valutare costi del runner prima di adottarlo. **Esito:** procedura e pacchetto tracciabile.
- [ ] **PUB-11 — Adattare le integrazioni di piattaforma.** Menu Mac, Cmd e copia/incolla, finestre/Dock, sospensione, chiusura e riapertura dei servizi. Import file/cartella come percorso iniziale; documentare funzioni Windows non ancora presenti, come rilevamento USB o batteria. **Esito:** funzioni essenziali operative e limiti riconoscibili.
- [ ] **PUB-12 — Sistemare la gestione delle credenziali.** Rimuovere o disciplinare esplicitamente il salvataggio Gemini in chiaro quando manca safeStorage; provare Keychain, mancata disponibilità, riavvio e credenziali non più leggibili. **Esito:** nessun salvataggio in chiaro a sorpresa e messaggi recuperabili.
- [ ] **PUB-13 — Riesaminare sicurezza e dipendenze.** Audit attuale con distinzione tra tool di build e runtime, sandbox Electron, navigazione/link, IPC e contenuti importati. Riutilizzare controlli già implementati; correggere problemi applicabili prima della consegna. **Esito:** elenco dei rischi residui motivato, con verifiche delle correzioni.
- [ ] **PUB-14 — Collaudare il pacchetto reale.** Installazione da file trasferito/scaricato, primo avvio, archivio vuoto, importazione, riproduzione audio, conversione video se necessaria, PDF, worker RAG e traduttore opzionali. Verificare consumi di memoria/spazio, avvio a freddo e nessun requisito da sviluppatore per usare il binario. **Esito:** report Mac con versione OS/chip, commit e pacchetto testati.
- [ ] **PUB-15 — Preparare il recupero dei dati.** Individuare fonti, archivio, derivazioni, preferenze e credenziali; provare backup e ripristino in un profilo isolato. Distinguere backup dell'indice da quello degli originali e non trasferire credenziali cifrate come se fossero portabili. **Esito:** procedura verificata, comprensibile alla tester.
- [ ] **PUB-16 — Verificare la prima consegna.** Istruzioni per il percorso Mac scelto, autorizzazione della singola app quando applicabile e riconoscimento degli errori reali del pacchetto. Nessuna disattivazione globale delle protezioni. **Esito:** installazione sul Mac M3 Pro destinatario dopo i passaggi applicabili della fase 1.

**Passaggio:** prova del percorso essenziale nel pacchetto Mac, con dati originali conservati e gestione dei fallimenti verificata. I test Windows non bastano a chiudere questa fase.

## 3 — Eseguire la prova privata

- [ ] **PUB-17 — Osservare il primo utilizzo.** Far completare creazione corso, importazione e prima sessione di studio. Annotare punti in cui serve aiuto, aspettative sbagliate e termini poco chiari; aiutare quando necessario senza scambiare l'aiuto per successo autonomo. **Esito:** elenco di ostacoli riproducibili.
- [ ] **PUB-18 — Raccogliere uso autonomo.** Per 7–14 giorni indicativi osservare ritorno all'app, compiti completati, errori, costi e qualità sul diverso corso. Valutare campioni di trascrizione, dispense e risposte: i test tecnici non certificano la correttezza didattica. Raccolta manuale, senza introdurre telemetria come prerequisito. **Esito:** breve diario senza materiali privati versionati.
- [ ] **PUB-19 — Tirare le conseguenze.** Chiedere cosa ha sostituito, cosa ha complicato e perché è tornata agli strumenti precedenti. Ordinare i problemi per blocco del compito, frequenza e impatto; distinguere problema Mac, problema di comprensione e qualità AI. **Esito:** correzioni prioritarie e scelta se proseguire, rivedere o limitare il pubblico.

**Passaggio:** il compito scelto è completabile, i problemi gravi sono risolti o dichiarati e c'è un motivo concreto per ampliare la prova. Una sola tester non dimostra domanda generale.

## 4 — Rendere possibile l'uso autonomo

- [ ] **PUB-20 — Migliorare il primo avvio esistente.** Spiegare risultato e limiti, offrire eventualmente esempio sintetico senza API, guidare corso/importazione e configurazione AI quando necessaria. Rendere guida e spiegazione dei costi riapribili. **Esito:** un nuovo utente raggiunge il primo risultato con la sola guida.
- [ ] **PUB-21 — Rivedere i percorsi principali.** Riutilizzare l'audit UX precedente; osservare importazione, elaborazione, studio, Q&A ed export. Controllare errori di quota/rete, annullamento, avanzamento e ripresa. **Esito:** risolti gli ostacoli osservati, senza richiedere un redesign generale preventivo.
- [ ] **PUB-22 — Verificare accessibilità e comandi.** Tastiera, focus, zoom, contrasto, VoiceOver sul Mac e verifiche Windows proporzionate; comandi disponibili anche senza scorciatoie, tooltip/menu con Ctrl o Cmd. **Esito:** prove manuali documentate e limiti espliciti.
- [ ] **PUB-23 — Decidere quando introdurre l'inglese.** Rilevare la lingua dei tester. Se necessario estrarre stringhe renderer/main, errori e date, gestire fallback e preferenza persistente, collaudare entrambe le lingue. **Esito:** implementazione verificata oppure rinvio motivato in base al pubblico; le dispense EN non chiudono questa voce.

## 5 — Preparare release e aggiornamenti

- [ ] **PUB-24 — Definire sistemi supportati e versioni.** Matrice OS/chip/versioni minime basata sui collaudi, requisiti disco/RAM misurati e limiti; numero diverso per ogni release distribuita. **Esito:** scheda di compatibilità senza promesse su sistemi non testati.
- [ ] **PUB-25 — Preparare una release scaricabile.** Pacchetti corretti per piattaforma, commit/tag, note, hash, build e controlli pertinenti; contenuti personali e credenziali esclusi. Valutare firma Windows e firma/notarizzazione Mac con costi e attrito reale. **Esito:** candidata pronta e verificata prima di rendere pubblici gli artefatti.
- [ ] **PUB-26 — Provare l'aggiornamento manuale.** Passaggio versione precedente → nuova su profilo di prova con corsi, fonti e lavori persistenti; verificare migrazioni, backup e recupero dopo fallimento. Documentare limiti del ritorno a versioni vecchie, senza promettere downgrade automatici. **Esito:** aggiornamento senza perdita dei dati e procedura d'emergenza.
- [ ] **PUB-27 — Valutare avviso e controllo aggiornamenti.** Confrontare iniziale collegamento alle release e comando in-app con notifica discreta; valutare richiesta di rete, errori, frequenza e dati trasmessi. **Esito:** download della versione corretta facilmente raggiungibile, senza bloccare lo studio.
- [ ] **PUB-28 — Valutare l'installazione automatica successivamente.** Solo dopo release e aggiornamento manuale affidabili: requisiti di firma, autenticità pacchetti, gestione lavori AI e riavvio, metadati e recupero. **Esito:** progetto verificabile e scelta esplicita di implementare o rinviare. Non è un prerequisito del primo pilota.

**Passaggio:** una persona installa e aggiorna seguendo istruzioni brevi, identifica la versione usata e conserva il proprio archivio. Un push dei sorgenti non costituisce questo risultato.

## 6 — Allargare a una piccola beta

- [ ] **PUB-29 — Preparare il feedback.** Istruzioni per bug con versione, OS/chip, passaggi e risultato atteso; esempi depurati da chiavi, percorsi e materiali personali; canale riservato per vulnerabilità. **Esito:** segnalazioni utilizzabili senza chiedere l'archivio intero.
- [ ] **PUB-30 — Coinvolgere 5–10 studenti maggiorenni.** Numero orientativo; includere corsi e livelli tecnici diversi e solo piattaforme dichiarate. Rendere espliciti alpha/beta, costo dei servizi AI e supporto disponibile. **Esito:** elenco dei casi d'uso senza dati personali nel repository.
- [ ] **PUB-31 — Valutare utilità e carico di supporto.** Misurare installazioni completate, primo risultato autonomo, ritorno all'uso, problemi ricorrenti e tempo richiesto all'autore. Definire i criteri prima del test e riportare numeri e contesto, senza inferenze statistiche dal piccolo campione. **Esito:** decisione motivata di ampliare, correggere o mantenere la beta limitata.

## 7 — Pubblicare e mantenere il progetto

- [ ] **PUB-32 — Preparare la pagina per gli utenti.** Cosa fa, cosa non fa, screenshot/demo sintetici, piattaforme, costi API, pulsante download, guida breve, privacy e feedback. Tenere raggiungibili codice e documentazione tecnica per chi approfondisce. **Esito:** qualcuno estraneo al progetto capisce se gli serve e come iniziare.
- [ ] **PUB-33 — Preparare il racconto portfolio.** Problema personale, scelte, contributo dell'autore e uso dell'AI, prove e cambiamenti derivati dai tester. Riallineare README e dati di verifica alla release effettiva. **Esito:** caso concreto con limiti e risultati osservati; citazioni/testimonianze soltanto con permesso.
- [ ] **PUB-34 — Preparare la diffusione universitaria.** Verificare regole di affissione, scegliere messaggio e QR verso pagina stabile, inizialmente con invito alla beta se la distribuzione resta limitata. Evitare promesse di accuratezza AI o gratuità dei servizi non dimostrate. **Esito:** materiale pronto per il pubblico e il canale scelti.
- [ ] **PUB-35 — Definire manutenzione sostenibile.** Frequenza di controllo dipendenze/provider, sistemi supportati, gestione bug e vulnerabilità, compatibilità dei dati, eventuale sospensione dei download e comunicazione di fine supporto. **Esito:** aspettative realistiche per utenti e autore.

**Passaggio alla diffusione aperta:** condizioni di distribuzione risolte, percorsi essenziali e aggiornamenti collaudati, beta valutata e assistenza sostenibile. Il portfolio può essere valorizzato anche se la distribuzione rimane limitata.

## Prossime azioni, nell'ordine

1. Raccogliere versione macOS e caso di studio della tester (PUB-01/PUB-02).
2. Chiarire modalità Gemini e gestione dei costi, mentre si pianifica una build Mac offline con dati sintetici (PUB-04/PUB-05/PUB-10).
3. Definire le condizioni della consegna privata e verificare le componenti distribuite (PUB-06/PUB-07).
4. Affrontare correzioni e collaudi necessari per la prima prova, a partire da credenziali e percorso essenziale (fase 2).

## Regole di avanzamento

- Questa richiesta produce la roadmap: non avvia automaticamente le implementazioni, una pubblicazione o servizi a pagamento.
- La roadmap non cambia l'ordine della coda `LISTA_ORDINE`. I codici PUB identificano questo percorso di distribuzione; un'eventuale integrazione nella coda va concordata.
- Per ogni attività registrare decisione, file interessati, verifiche e limiti. Chiudere le caselle solo quando l'esito previsto è disponibile; una ricerca può risolvere una domanda, ma non certificare una funzione.
- Prima di modifiche future completare la sincronizzazione richiesta da AGENTS.md: in questa chat il fetch è riuscito, il pull resta pendente per modifiche locali conservate. La preparazione documentale qui svolta è indipendente.
- Quando viene rigenerato l'installer generale applicare le regole di verifiche, commit e push di AGENTS.md; la pubblicazione dei binari resta una scelta separata.
