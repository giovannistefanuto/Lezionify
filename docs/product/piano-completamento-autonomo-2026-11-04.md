# Piano di completamento autonomo — 4 novembre 2026

## Mandato e perimetro

Richiesta: preparare un piano implementativo per i punti 1, 2, 4, 5, 6, 7,
8, 9, 10 e 11 della lista in chat. Corrispondono alle voci 7, 20, 38,
90, 91, 92, 122, 123, 124 e 125 del backlog. Il pilota personale Spotify
(punto 3, voce 5) resta escluso. Questo documento pianifica il lavoro;
non certifica implementazioni, collaudi o nuove autorizzazioni agli account.

L'ordine di esecuzione qui proposto raggruppa le dipendenze della richiesta
diretta; non cambia l'ordine permanente di LISTA_ORDINE. Preferire decisioni
tecniche autonome entro il perimetro, registrandole con append_decision.py.

## 0. Preparazione e stato iniziale

- Conservare le modifiche locali presenti, comprese le decisioni di recupero
  ENG precedenti alla chat. Il pull iniziale resta pendente per checkout sporco;
  non usare stash, reset, merge o rebase automatici. Completare la sincronizzazione
  quando le condizioni lo consentono; non dichiararla eseguita prima.
- Rileggere decisioni, report e codice interessati; acquisire una baseline dei
  controlli e separare difetti preesistenti dalle regressioni del lavoro.
- Inventariare, in sola lettura, archivio, modelli locali, conversazioni RAG,
  campioni di studio e capacità dei player. Creare backup prima di scritture
  personali. Usare profili isolati per prove e migrazioni.
- Conservare fonti, tentativi e credenziali. Contenuti personali, giudizi e
  risultati dettagliati restano in local-artifacts o fuori dal repository;
  nel report versionato soltanto metodo, conteggi e fixture sintetiche.

## 1. Traduttore offline — punto 1, voce 7

Riutilizzare offlineTranslation.ts, resources/translation/runner.cjs,
offlineTranslation.test.ts e i tool run_offline_translation_regressions.cjs
e check_translation_technical.cjs, leggendo prima opzioni e requisiti.

Ampliare i casi IT/EN con frasi tecniche, glossario, numeri, formule, codice,
testi lunghi e misti; verificare cambio lingua, annullamento, risposte obsolete,
modelli mancanti e riavvio. Correggere i difetti riprodotti e verificare il
runtime di produzione senza rete dopo la preparazione esplicita dei modelli.

Accettazione: contenuti protetti integri, nessuna risposta applicata al testo
sbagliato, errori recuperabili e casi tecnici letti manualmente. Un test di
struttura non certifica la qualità linguistica. Verificare anche il pacchetto.

## 2. Affidabilità ENG e archivio — punti 2 e 8, voci 20 e 122

Partire da D-0463–D-0467: l'ultimo stato registrato è 45 dispense ENG su 45,
con verifica in interfaccia della prima recuperata eventualmente pendente.
Controllare lo stato reale senza rigenerare automaticamente dispense valide.

Esaminare archivePipeline.ts, translationPlan.ts, translationIntegrity.ts e
le prove locali disponibili. Classificare separatamente: fase non pianificata,
quote, timeout, errori provider, troncamento, JSON invalido, frammenti mancanti,
falsi rifiuti strutturali, omissioni di prosa, salvataggio e ripresa della coda.
Riprodurre dai tentativi salvati; creare regressioni sintetiche per i difetti
confermati, applicare correzioni mirate e ripetere i casi originali.

Preservare la dispensa valida e distinguere sempre tentativo e risultato
accettato. Verificare stop, restart, errori per lezione, prosecuzione della
coda e protezione di audio, trascrizione e ITA. Controllare contenuto oltre
alla struttura: paragrafi, tabelle, formule, diagrammi e significato.

Accettazione voce 20: inventario coerente, nessuna ENG attesa mancante o
pendente senza causa e apertura verificata delle dispense recuperate.
Accettazione voce 122: matrice degli errori, difetti confermati corretti,
regressioni e limiti documentati; nessuna promessa di assenza universale di bug.
Eventuali nuovi invii richiedono un budget esplicito di richieste, tempo e
costo, controllo delle autorizzazioni già disponibili e tracciamento sanitizzato.

## 3. Valutazione e completamento RAG — punti 11, 5, 6 e 7

### Diagnosi delle risposte: voce 125 prima delle modifiche

Inventariare le conversazioni locali e selezionare un campione distribuito
per corso, lunghezza, domanda puntuale, confronto, esercizio, seguito e assenza
di risposta. Leggere domanda, risposta e fonti citate. Dichiarare dimensione
e limiti del campione e separare i casi di calibrazione da quelli di verifica.

Produrre un giudizio per risposta su formato, lunghezza proporzionata alla
domanda, tono, chiarezza, completezza e supporto. Restituire all'utente una
valutazione motivata prima di applicare eventuali cambiamenti di formato,
come previsto dalla voce 125. Nessuna lunghezza fissa assunta come ottimale.

### Risposte complete: voce 90

Riutilizzare fixture, benchmark e runner courseRagEvaluation esistenti.
Annotare indipendentemente concetti attesi, fonti pertinenti, conflitti e
risposta corretta in caso di evidenza insufficiente. Valutare separatamente
correttezza, completezza, pertinenza, citazioni e lacune. Trasformare i difetti
reali in regressioni sintetiche; conservare gli originali soltanto localmente.

### Supporto delle affermazioni: voce 91

Verificare courseRagGrounding.ts e il collegamento tra affermazioni e passaggi.
Includere citazioni irrilevanti, attribuzioni sbagliate, ipotesi omesse,
contraddizioni, deduzioni e trascrizione/dispensa della stessa provenienza.
Confrontare il controllo con lettura annotata, misurando falsi allarmi, errori
non rilevati, latenza e costo. Un giudizio del modello resta fallibile;
se mancano giudizi umani indipendenti, dichiarare il limite e non certificare
questa parte della validazione come completata.

### Recupero e astensione: voce 92

Confrontare lessicale, semantico e fusione su ranking, copertura, ridondanza,
astensione, latenza e memoria. Ridurre duplicati senza eliminare contraddizioni;
rispettare lezioni richieste e distribuzione delle evidenze. Valutare un
reranker locale e il contesto gerarchico; introdurli solo con beneficio misurato
sui casi tenuti da parte. Nuovi modelli o dipendenze richiedono motivazione,
licenze, spazio e decisione; nessun download implicito.

Accettazione RAG: confronto prima/dopo su campione indipendente, soglie fissate
prima della calibrazione, citazioni lette e nessuna regressione critica su
formule, vincoli o astensione. Riportare separatamente risultati reali,
sintetici e simulati. Chiudere ciascuna voce con le sue evidenze specifiche.

## 4. RIPETERE come studio — punto 9, voce 123

Collegare repetition.ts e i contratti shared al sistema di studio esistente.
Attribuire alla sessione e al corso la durata effettiva dell'audio registrato,
escludendo pause e tempo di attesa dell'AI. Verificare che la durata sia
disponibile e affidabile anche per audio importati dal registratore.

Scelta operativa proposta: aggiungere una sola volta 15 minuti stimati alla
prima apertura della valutazione pronta. Memorizzare separatamente durata
misurata e credito stimato; evitare doppi accrediti per riaperture, retry,
riavvii o sovrapposizione con un tracker già attivo. Riutilizzare le rettifiche
di studio esistenti per correggere l'accredito. Nessun accredito di lettura
per risultati mai aperti o falliti; nessuna retroattività implicita.

Accettazione: totali per corso/giorno coerenti e persistenti; test di pause,
mezzanotte, crash, migrazione, apertura ripetuta e mancata valutazione.

## 5. Stima del tempo — punto 10, voce 124

Estendere paragraphEstimate.ts e paragraphObservation.ts con numero e quota
di parole in grassetto, posizione normalizzata nel documento e tipo Nota/Note.
Usare struttura Markdown/DOM e evitare di contare codice o marcatori come parole.
Conservare compatibilità con campioni precedenti; feature ignote restano ignote.

Usare come prima definizione riproducibile la posizione nel documento, evitando
dipendenza da zoom e dimensione della finestra. Confrontare anche la posizione
nella schermata solo se i dati permettono di valutarla separatamente.
Confrontare baseline attuale, singole feature e combinazioni con coefficienti
limitati. Il raddoppio per grassetto, la retta decrescente e la maggiore velocità
nelle note sono ipotesi: mantenerle solo se migliorano la validazione su altre
lezioni. Con dati insufficienti raccogliere nuovi campioni e usare la baseline.

Accettazione: nessuna stima negativa o instabile, campioni IT/EN e Nota/Note,
persistenza verificata, errore prima/dopo e stato provvisorio visibile. La
raccolta può essere completata autonomamente; il beneficio personale resta
da verificare se mancano campioni reali sufficienti.

## 6. Transizioni musicali — punto 4, voce 38

Rilevare le capacità effettive del player Spotify configurato e del player
YouTube esterno prima di progettare il trasporto. Verificare documentazione
ufficiale aggiornata prima di usare API o modificarne l'integrazione.
Il pilota personale account/cuffie della voce 5 resta escluso.

Per sorgenti controllabili implementare sequenza fade-out, cambio e fade-in,
con annullamento, gestione errori e protezione dai comandi concorrenti.
Distinguere questa sequenza da un vero crossfade, possibile solo con due
sorgenti controllabili simultaneamente. Conservare le dissolvenze offline.

Per player non controllabili mostrare il limite e offrire il passaggio manuale
più breve compatibile, senza fingere di aver fermato la riproduzione esterna.
Non aggiungere download/taglio o una nuova piattaforma musicale per aggirarlo.
Se l'obiettivo originale non è realizzabile con i player disponibili, completare
le parti supportate e lasciare aperta la voce con il vincolo dimostrato.

Accettazione: prove dei passaggi canzone/canzone e canzone/suono supportati,
assenza di sovrapposizioni involontarie, volume ripristinato e UI coerente
anche dopo errore. Separare simulazioni da ascolto reale e prova con account.

## 7. Collaudo, documentazione e consegna

Per ogni blocco: regressioni mirate, verifica UI in Electron, persistenza e
riavvio quando interessati; decisione e aggiornamento della voce solo a
criteri soddisfatti. Applicare diagnosing-bugs ai difetti riproducibili e
skill appropriate all'implementazione, leggendole prima dell'uso.

Al termine eseguire npm run check e npm run test:rag-retrieval, più runner
offline e runtime/pacchetto pertinenti. Analizzare ogni fallimento e distinguere
limiti ambientali da regressioni. I benchmark remoti si eseguono separatamente
con budget esplicito. Nessun test simulato sostituisce prova reale dichiarata.

Rigenerare infine il setup generale e verificarlo con verify_installer.cjs,
controllo del payload e runtime isolato RAG/traduttore. La rigenerazione attiva
la regola AGENTS: revisione di tutte le modifiche pubblicabili presenti,
commit e push senza force e verifica del commit sul remoto. Artefatti ignorati
e dati personali esclusi. Con blocchi di rete, sincronizzazione o collaudo,
conservare il lavoro e indicare il passo ancora pendente.

Consegnare riepilogo dei dieci punti, prove, metriche, limiti residui, percorso
installer e report di ripresa. La piena autonomia riguarda il lavoro eseguibile:
account indisponibili, campioni mancanti e validazioni indipendenti non vengono
trasformati in risultati positivi per chiudere artificialmente le caselle.
