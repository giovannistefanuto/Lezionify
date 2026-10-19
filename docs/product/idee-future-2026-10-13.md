# Idee e modifiche future — 13 ottobre 2026

Raccolta delle richieste dell’utente per lo sviluppo futuro di Lezionify,
iniziata il 13 ottobre e aggiornata con nuove idee fino al 19 ottobre 2026.
La classificazione è preliminare: gli interventi immediati hanno un obiettivo
già definito e non richiedono una ricerca preventiva; restano necessari i normali
controlli del codice e i collaudi. Gli approfondimenti richiedono invece una
valutazione prima di scegliere come implementarli.

La raccolta iniziale è stata registrata in D-0256. Le caselle indicano lo stato
delle attività; gli interventi immediati sono stati implementati il 13 ottobre.
Uso, scelte e verifiche: [Lettura ed esportazione PDF](lettura-export-pdf.md).

Revisione iterativa del 15 ottobre, autorizzata su tutte le voci aperte:
[resoconto, correzioni e scelte residue](resoconto-interventi-2026-10-15.md).
Le ricerche concluse non chiudono le caselle delle funzioni ancora da integrare.

## Coda LISTA_ORDINE

Ordine concordato il 14 ottobre 2026 per facilita' e velocita' di realizzazione
con Codex, esteso il 16 ottobre su richiesta dell'utente (D-0327). Le prime
dodici posizioni conservano ordine e stato; seguono le attività aggiunte nei
giorni successivi. Il 19 ottobre sono state aggiunte le posizioni 24–29,
senza riordinare le precedenti e senza avviare implementazioni.
Ogni comando `LISTA_ORDINE` avvia implementazione e collaudo della
prima voce ancora aperta, una sola per invocazione. Le descrizioni complete e
i requisiti restano nelle voci indicate sotto; una ricerca conclusa non basta
per segnare una funzione come implementata.

Per ogni invocazione si applica la selezione e l'uso delle skill pertinenti
previsti in `AGENTS.md`, consultando la [guida alle skill](guida-skill-codex.md)
anche per quelle aggiunte nei giorni precedenti (D-0328).

1. [x] **Ctrl+L per cambiare lingua** — voce 10; completata in D-0284.
2. [x] **Mermaid a scomparsa in Focus** — voce 11; completata in D-0286.
3. [x] **Pausa scaduta e tempo realmente studiato** — voce 16; completata in D-0287.
4. [x] **Riconoscimento automatico IT/EN nel vocabolario** — voce 14; completata in D-0288.
5. [x] **Mermaid piu' compatti nei PDF** — voce 4; completata in D-0289.
6. [x] **Cambio lingua sullo stesso capitoletto** — voce 15; completata in D-0290.
7. [x] **Traduzione della dispensa intera oppure a parti** — voce 13; completata in D-0293.
8. [x] **Dispensa troncata con `undefined`** — voce 12; corretta la visualizzazione in D-0294.
9. [x] **Slide come contesto a Gemini** — voce 8; implementata e collaudata in D-0306.
10. [x] **Modelli rapidi per le domande contestuali** — voce 9; istruzione successiva: Flash-Lite prima e altri modelli Gemini se non risponde. Nessun nuovo provider.
11. [x] **Traduzione offline di frasi** — voce 7; Mozilla/Bergamot integrato e collaudato in D-0307/D-0308.
12. [ ] **Sezione musica completa** — voce 5; compilation e pannello Spotify implementati (D-0309), pilota con account personale ancora necessario. Download/taglio rinviati dalla scelta 8 A.
13. [x] **Rimuovere la frase esplicativa dal vocabolario** — voce 28; testo rimosso e vocabolario ricollaudato in D-0331, campo unico e scorciatoie conservati.
14. [x] **Q&A con tono da docente, meno accomodante** — voce 26; istruzioni didattiche implementate e contratto SDK verificato in D-0332; qualità delle risposte reali da osservare.
15. [x] **Ultima lezione: ritorno alla lista dopo 2 secondi** — voce 27; attesa dopo salvataggio riuscito e ritorno a Tutte le lezioni, anche in Focus senza blocco di 15 secondi; D-0333.
16. [ ] **Indagare il nuovo bug Ctrl+L** — voce 33; riprodurre la selezione della schermata senza cambio lingua e correggere il caso verificato.
17. [x] **Valutare Lara3 di Translated** — voce 35; valutazione documentale conclusa in D-0336: nessun offline pubblico accertato, Free API 10.000 caratteri/mese, latenza reale non misurata; nessun provider integrato.
18. [x] **Suoni di sottofondo offline come Apple** — voce 30; catalogo 6 suoni equivalenti approvato, download esplicito, loop Web Audio gapless e auto-pausa con lezioni implementati in D-0340.
19. [x] **Tag e gruppi nelle catture rapide** — voce 34; gruppi per attività e note, clic/Alt+lettera, copia e trasferimento senza perdita dei dati storici, implementati e collaudati in D-0341.
20. [x] **Valutare la stima del tempo residuo di studio** — voce 36; stima dello studio dal ritmo personale dopo 10 minuti e 60% consolidato, visibile sotto 30 minuti; implementata e collaudata in D-0342, utilità personale da osservare.
21. [ ] **Timer della pausa sul telefono** — voce 32; riusare il lavoro Balance e verificare avviso sonoro a schermo bloccato e trasporto locale.
22. [ ] **Audio nel Q&A e registrazione dal telefono** — voce 31; acquisizione, trasferimento al portatile e domanda audio con invio AI esplicito.
23. [x] **RAG e domande su tutto il corso** — voce 37; chat e corpus locali, collegamento Notability/OneDrive per corso, citazioni versionate, conteggi completi e approfondimenti Gemini limitati, implementati e collaudati in D-0344; prove personali da osservare.
24. [ ] **Transizioni tra musica e suoni** — voce 38; dissolvenze tra suoni offline implementate, default 1 secondo scelto dall’utente e opzioni 1/2/4 (D-0370). Restano canzone → canzone e canzone → suono: limiti Spotify e player YouTube esterno documentati.
25. [x] **Grafica e usabilità della scheda Memo** — voce 39; gerarchia, gruppi, comandi, stati vuoti e layout adattabile implementati e collaudati in D-0367.
26. [x] **Nuovo flusso unico di esportazione PDF** — voce 40; modale Lezione/Corso, selezione completa iniziale, laboratori, lingua, nomi Windows e pagine Note implementati; UI e PDF reali collaudati in D-0369.
27. [x] **Testo completo delle attività Memo al passaggio del mouse** — voce 41; anteprima dopo un secondo fermo, reset al movimento, rotella per testi lunghi e pulizia alla chiusura collaudati in D-0367.
28. [x] **Log caricati progressivamente per giorno** — voce 42; oggi e precedente giorno con eventi al fondo, letture per intervalli di byte, filtri e aggiornamento senza duplicati implementati e collaudati in D-0368.
29. [x] **Diagnosi e correzione dell'errore ricorrente di integrità ENG** — voce 43; ripresa D-0364: replay reale Mermaid di 39 sezioni, quote legacy senza falsa sospensione dell'intero pool e fallback ENG completi. 615 test, cinque replay e nuova traduzione reale di 40 sezioni riusciti; 244 contenuti protetti identici. Protezioni sui frammenti incompleti conservate; setup aggiornato da installare.

Aggiornamento del 19 ottobre: le sei richieste sono descritte nelle voci 38–43.
L'importanza della diagnosi ENG è esplicita; non modifica da sola l'ordine
numerico o i rinvii già concordati. Alla registrazione D-0352 tutte e sei
erano aperte; la successiva diagnosi ENG, richiesta direttamente dall'utente,
è stata implementata e collaudata in D-0355 e poi riaperta per la ricorrenza
D-0357. A quell’aggiornamento le altre cinque restavano aperte;
la registrazione delle specifiche non ne certifica il completamento.

La domanda sui modelli già implementati (voce 29) è stata risposta in D-0326
e resta fuori dalla coda delle attività da eseguire. L'inserimento delle nuove
voci aggiorna la pianificazione: non avvia il primo lavoro e non approva già
le soluzioni ancora da valutare. Per le voci di sola ricerca o valutazione,
documentare esito e scelte residue; non dichiarare implementata una funzione
in base alla sola indagine. La voce 12 resta la prima aperta e non va saltata
automaticamente se il pilota personale richiede un'azione dell'utente.

Aggiornamento del 16 ottobre (D-0331): l'utente conferma l'account Spotify
collegato e chiede esplicitamente di rimandare il lavoro sulla musica e
passare alla voce successiva. Posizione 12 mantenuta aperta; posizione 13
completata in questa invocazione. La successiva dopo la 13 è la 14; il rinvio
non certifica il pilota e non modifica l'ordine della coda.

Successivo aggiornamento del 16 ottobre (D-0336): l'utente rimanda anche la
prova della copia diagnostica Ctrl+L e richiede la voce successiva. Posizione 16
mantenuta aperta; ricerca della posizione 17 conclusa. Musica e Ctrl+L restano
rinviati esplicitamente; dopo la 17 segue la 18, senza avviarla in questa
invocazione e senza riordinare la coda.

La prossima voce e' determinata dalle caselle, non da un indice separato.
Quando un'attivita' e' completata e verificata, aggiornare sia questa coda sia
la descrizione corrispondente e registrare la decisione tramite lo script Python.
Le attivita' gia' concluse prima della coda (riquadri inglesi, export PDF,
ripresa della lettura e ricerca sulla concentrazione) restano fuori dalla coda.

Aggiornamento diretto del 19 ottobre (D-0367–D-0370): su richiesta delle prime
cinque attività nella classifica per facilità, completate le voci 41, 39, 42 e 40
(posizioni 27, 25, 28 e 26); voce 38 parziale, casella aperta. [Uso, verifiche e
limiti](memo-log-pdf-transizioni-2026-10-19.md). Nessuna modifica dell'ordine;
musica e Ctrl+L conservano i rinvii precedenti.

## Interventi immediati, senza ricerca preventiva

### 1. Correggere `[!KEY CONCEPT]` nelle dispense inglesi

- [x] Verificare perché il riquadro funziona in italiano ma non in inglese e correggere la differenza.

Obiettivo: lo stesso marcatore deve produrre il riquadro previsto nelle due
lingue. Confrontare sintassi del Markdown, risultato della traduzione e rendering
per individuare la causa, senza presumerla già nota. Verificare entrambe le lingue
con esempi sintetici, senza alterare le fonti originali.

### 2. Esportare le dispense in PDF

- [x] Aggiungere un pulsante «Esporta in PDF» per la singola lezione.
- [x] Aggiungere l’esportazione del corso in un PDF con tutte le lezioni, in ordine coerente con il corso.

Obiettivo: un documento locale leggibile con titoli, formule, riquadri e diagrammi.
Definire nel normale lavoro di implementazione quale lingua esportare e come
segnalare le lezioni senza dispensa disponibile. Conservare i file sorgente.
La compattazione dei diagrammi è un approfondimento separato, descritto sotto,
e non blocca l’esportazione di base.

### 3. Riprendere la lettura dopo la chiusura di una lezione

- [x] Salvare e ripristinare il punto di lettura della dispensa.
- [x] Salvare e ripristinare il punto di lettura del PDF associato.

Obiettivo: chiudendo e riaprendo la stessa lezione, ritrovare il punto raggiunto
in entrambi i pannelli, anche dopo il riavvio dell’app. Conservare localmente
posizioni separate per lezione, lingua della dispensa e PDF; gestire un documento
cambiato o rimosso con un ripiego valido.

La documentazione attuale descrive già la conservazione del punto PDF durante
zoom, resize e occultamento temporaneo: verificare ed estendere questo
comportamento alla chiusura e riapertura, senza considerarlo già completo.

## Idee che richiedono approfondimento

### 4. Ridurre lo spazio occupato dai diagrammi Mermaid nei PDF

- [x] Valutare margini, scala, orientamento e disposizione dei diagrammi nell’esportazione.

Completato il 14 ottobre in D-0289: eliminati altezza minima e padding da
schermo nell'export, ridotti margini e intestazione. Proporzioni e orientamento
restano invariati; gli schemi lunghi conservano lo spazio necessario entro
i limiti A4 esistenti. Tre fixture piccola, larga e verticale: ingombro ridotto
del 46%, 52% e 9%, con etichette da 8,7 a 12 pt nel PDF reale. Nessuna
riscrittura automatica del grafo o garanzia di leggibilità per schemi arbitrari.
Fallback con codice completo, formule e riquadri IT/EN verificati con Electron,
Poppler e ispezione visiva. Passati 53 test Vitest pertinenti, typecheck, lint,
build e test:pdf-export; nessuna dipendenza o chiamata AI.

Chiarire se lo spazio eccessivo deriva dal diagramma, dai margini del contenitore
o dall’impaginazione. Confrontare diagrammi piccoli e grandi e verificare la
leggibilità del testo stampato. Qui «comprimere» significa ridurre lo spazio
visivo, non soltanto il peso del file. Se non emerge una soluzione leggibile,
mantenere i diagrammi alle dimensioni necessarie: l’utente accetta questo esito.

### 5. Reparto musica classica nell’app

- [x] Valutare una sezione per ascoltare musica classica durante lo studio.
- [x] Valutare link YouTube aggiunti dall’utente e modalità di ascolto.
- [x] Valutare audio disponibili offline, incluso l’eventuale scaricamento da link tramite una libreria.
- [x] Confrontare il collegamento dell'account Spotify Premium proposto dall'utente durante l'indagine.
- [ ] Eseguire il pilota personale Spotify con account, PC e cuffie. Pannello e controlli implementati in D-0309 con API simulate; l’utente configurerà il Client ID successivamente.

Indagine documentale del 13 ottobre completata:
[Spotify, YouTube e file locali](../research/musica-integrazione-valutazione-2026-10-13.md).
Raccomandazione per l'uso personale: telecomando del client Spotify sul PC,
con login PKCE e pochi controlli in Lezionify, da validare con un pilota.
L'offline rimane nel client Spotify. Quota personale, distribuzione pubblica,
lettura delle playlist e compatibilità dello streaming in Electron hanno
vincoli distinti. Aggiornamento 15 ottobre: telecomando implementato, account reale
non collegato. Compilation con timestamp e correzioni locali disponibili;
download/taglio non previsti nella scelta 8 A. [Uso e limiti](funzioni-approvate-2026-10-15.md).

Richiesta: poter ascoltare dall’app usando l’uscita audio predefinita del sistema,
comprese le cuffie Bluetooth quando selezionate come uscita.

Prima dell’implementazione confrontare riproduzione di file locali, apertura di
link e player integrato. Per l’eventuale download verificare condizioni della
fonte, affidabilità e manutenzione degli strumenti, senza assumere che ogni audio
YouTube sia scaricabile. La precedente formulazione «assumere che ogni audio
YouTube sia scaricabile» non è sostenuta dalla verifica tecnica e dei termini.
Valutare anche le dimensioni dell’archivio, controlli di riproduzione e cambi dell’uscita audio.
Nessuna libreria è stata scelta.

L’integrazione richiesta comprende anche compilation con più brani nello stesso
video: selezione delle singole tracce per ascolto e download, usando i timestamp.
Tutti i link e gli elenchi forniti sono conservati nell’appendice musicale in
fondo a questo documento, insieme alla proposta di tradurre i titoli in italiano.

### 6. Ricerca scientifica sulla musica per concentrarsi

- [x] Cercare studi sulla relazione tra musica, concentrazione e prestazioni nello studio.

Disponibile la [sintesi delle evidenze](../research/musica-concentrazione-evidenze-2026-10-13.md):
sette studi, limiti e indicazioni per lettura, memoria e problemi. Nessun genere
risulta universalmente migliore; parole più rischiose per lettura e memoria,
benefici della musica strumentale non garantiti. Proposta: musica facoltativa,
avvio esplicito e silenzio come confronto. Nessuna sperimentazione personale eseguita.

Domanda da approfondire: esiste una musica più adatta a concentrarsi, e in quali
condizioni? Distinguere lettura, memorizzazione e risoluzione di problemi;
considerare musica con o senza parole, volume, preferenze personali e confronto
con il silenzio. Riportare fonti, qualità degli studi e limiti delle conclusioni,
senza anticipare un genere universalmente migliore. Usare gli esiti per orientare
la futura sezione musica.

### 7. Vocabolario offline rapido e supporto offline per frasi

- [x] **Parole e locuzioni:** funzione già implementata secondo D-0250 e D-0251, con Ctrl+T e dizionari locali inglese ↔ italiano.
- [x] **Frasi libere:** Mozilla/Bergamot EN ↔ IT integrato e collaudato; download esplicito dei modelli, nessun fallback online (D-0307/D-0308).
- [x] Recuperare il lavoro precedente e confrontare motori locali con piloti sintetici sul PC dell'utente.
- [ ] Ampliare le prove tecniche, verificare protezione di formule/codice e glossario, poi collaudare integrazione e installer.

Chiarimento del 13 ottobre: **solo traduzione, senza spiegazioni**. Disponibile
la [ricerca con tre piloti locali e piano di integrazione](../research/traduzione-frasi-offline-2026-10-13.md):
24 casi EN↔IT e 240 traduzioni; Argos e Mozilla rapidi su CPU, ma ancora errori
specialistici. Mozilla/Bergamot è il candidato da approfondire per un'integrazione
senza Python. Aggiornamento 15 ottobre: scelto e integrato dopo delega esplicita; [uso e limiti](funzioni-approvate-2026-10-15.md). Il glossario tecnico resta un eventuale miglioramento, non implementato.

L'utente ha proposto anche API online: disponibile la
[valutazione di quote e condizioni con pilota MyMemory](../research/traduzione-api-valutazione-2026-10-13.md).
Azure F0 è candidato al prossimo confronto, da eseguire con un account reale.
L'opzione online resta una proposta esplicita aggiuntiva, non un fallback
automatico né una sostituzione del requisito offline.

La richiesta originaria comprende entrambe le modalità. Non duplicare il
vocabolario esistente; eventuali problemi concreti di velocità o copertura
andranno verificati prima di modificarlo.

Per le frasi estendere il confronto dei motori e modelli locali su esempi
generici e tecnici. Valutare qualità, latenza, memoria,
dimensioni dei modelli, licenze e compatibilità con il computer dell’utente.
L’elaborazione deve restare offline e non passare automaticamente a Gemini.

Riferimento: [Vocabolario offline](vocabolario-offline.md).

### 8. Inviare una o più slide come contesto a Gemini

- [x] Consentire di selezionare una o più pagine del PDF e allegarle alla domanda contestuale (D-0306).

Analisi del 15 ottobre: [piano tecnico e alternative](../research/slide-contesto-qna-piano-2026-10-15.md).
Scelte confermate e implementate il 15 ottobre: PNG locali, fino a quattro pagine attive,
anteprima/rimozione e reinvio nei follow-up. Nelle impostazioni raccolta immagini con
cancellazione singola, per giorno o totale. [Uso e limiti](funzioni-approvate-2026-10-15.md).

Valutare immagini delle pagine, testo estratto o una combinazione, includendo
slide con formule e diagrammi. Definire selezione, anteprima, rimozione degli
allegati e limiti di pagine, risoluzione e dimensione.

L’invio deve essere esplicito e mostrare quali slide verranno condivise; i PDF
originali restano locali. Verificare compatibilità dei modelli, costo e quote,
gestione degli errori e tracciabilità senza registrare contenuti privati nei log.

### 9. Modelli più rapidi per le sole domande contestuali

Aggiornamento successivo del 15 ottobre: l’utente chiede Flash-Lite prima e altri
modelli se non risponde. Implementata catena Q&A dedicata: 3.5 Flash-Lite, 3.1
Flash-Lite, Flash e riserve, con primo testo entro 20 secondi per tentativo e
passaggio per risposta vuota o errore di disponibilità. Conservati contesto e
slide. Il provider resta Gemini; le alternative non Gemini seguenti sono rinviate.

- [x] Ricercare e confrontare modelli per risposte contestuali più veloci: ricerca conservata; valutazione chiusa dall’utente mantenendo Gemini Flash.

Chiarimento dell'utente del 13 ottobre: cercare **modelli diversi da Gemini**,
utilizzabili gratuitamente tramite API, e misurarne la velocità. Distinguere
quote gratuite rinnovabili da crediti iniziali o prove temporanee. I modelli
locali restano una possibilità separata; la pipeline delle dispense mantiene
la propria configurazione.

- [x] Acquisire e archiviare la [ricerca completa](../research/qna-alternative-gratuite-non-gemini-2026-10-13.md).
- [x] Salvare [valutazione, vincoli e fonti verificate](../research/qna-alternative-gratuite-valutazione-2026-10-13.md).
- [x] Documentare il [piano di indagine a fasi](../research/qna-benchmark-piano-2026-10-13.md).
- [x] Misurare tempo alla prima risposta e consumo reale nel pilota; revisione qualitativa esplorativa salvata.
- [ ] Ampliare la validazione qualitativa e collaudare il provider scelto nell'app.

Confrontati Groq GPT-OSS-120B, Groq GPT-OSS-20B e Cloudflare Qwen3-30B-A3B:
[ripresa completa con risultati e limiti](../research/qna-non-gemini-ripresa-completa-2026-10-13.md).
Le prove API del 13 ottobre sono concluse; scelta definitiva, validazione estesa
e integrazione restano aperte. Il 15 ottobre sono stati recuperati i risultati,
senza nuove chiamate: [piani e scelte residue](../research/approfondimenti-backlog-2026-10-15.md).

Confrontare tempo alla prima risposta, durata totale, accuratezza rispetto al
contesto, gestione dell’incertezza, italiano e inglese, contesto disponibile e
supporto alle slide. Verificare prezzi e quote aggiornati e misurare il consumo
effettivo: un modello più rapido non garantisce da solo un minor uso delle quote.
Usare domande sintetiche con risposte attese e definire eventuali criteri di
ripiego verso un modello più capace. Nessun modello è stato scelto.

## Aggiunte del 14 ottobre 2026 — semplici

Classificazione preliminare delle nuove richieste: «semplici» indica interventi
circoscritti, da verificare comunque nel codice e nell’uso reale. Tutte le nuove
caselle restano aperte; questo aggiornamento raccoglie idee, senza implementarle.

### 10. Ctrl+L per cambiare lingua della dispensa

- [x] Aggiungere Ctrl+L per passare dalla dispensa italiana a quella inglese e viceversa, anche in modalità Focus.

Implementato il 14 ottobre: Ctrl+L (Cmd+L su macOS) cambia la lingua disponibile
nella dispensa aperta. Non avvia traduzioni AI, ignora campi di testo, modali,
tasti ripetuti e operazioni di generazione/caricamento. I log passano a
Ctrl+Shift+L. L'allineamento per capitoletto resta nella voce 15.

Riutilizzare il comando di cambio lingua e gestire la traduzione non disponibile
e i conflitti con altri comandi o campi di testo. La scorciatoia deve beneficiare
dell’allineamento per capitoletto della voce 15 quando sarà disponibile.

### 11. Diagrammi Mermaid a scomparsa in modalità Focus

- [x] Consentire di chiudere e riaprire i singoli schemi Mermaid per occupare meno spazio durante lo studio della dispensa.

Implementato e collaudato il 14 ottobre in D-0286: ogni schema in Focus ha
**Nascondi schema / Mostra schema**, attivabile con Tab e Invio/Spazio.
Lo stato e' indipendente e temporaneo; anche il codice eventualmente aperto
viene nascosto. Alla riapertura resta lo stesso SVG, correttamente visibile,
e il punto del testo letto viene mantenuto dagli ancoraggi esistenti.
Vista ordinaria ed export PDF conservano gli schemi visibili. Passati il
collaudo mirato e `npm run check` completo, incluso l'export PDF reale.

Prevedere un comando riconoscibile e utilizzabile da tastiera; verificare che
riaprire il diagramma lo renda correttamente e che il punto di lettura rimanga
stabile. Questa richiesta riguarda la lettura in Focus ed è distinta dalla
compattazione dei diagrammi nei PDF della voce 4.

## Aggiunte del 14 ottobre 2026 — difficili / da approfondire

La difficoltà è provvisoria: queste voci richiedono diagnosi o valutazione prima
di stimare una correzione. Le domande sul comportamento attuale restano aperte.

### 12. Dispensa troncata e comparsa di `undefined`

- [x] Indagare il caso segnalato «Sviluppando i prodotti all’interno della parentesi quadra: undefined», dopo il quale la lezione risulta tagliata a metà e l’utente deve rigenerarla.

Conservare questa frase come indizio per riprodurre il problema, senza attribuire
già la causa a formule, rendering o generazione. Verificare dove si interrompe
il contenuto tra risposta AI, assemblaggio, salvataggio e visualizzazione.
Obiettivo: evitare troncamenti silenziosi e permettere un recupero mirato senza
obbligare a rigenerare l’intera lezione. Preservare audio, trascrizione grezza e
derivazioni già disponibili; usare esempi sintetici e log senza testi privati.

Completato il 15 ottobre in D-0294 sul caso RL «Sostituendo iterativamente:
undefined». La dispensa salvata è completa: il blocco multilinea aperto con
`$$\begin{aligned}` e chiuso con `\end{aligned}$$` fa inglobare al parser il
testo successivo. Il viewer separa i delimitatori nella sola copia renderizzata,
recuperando tutti i 40 titoli e la conclusione senza modificare il file o chiamare
Gemini. Verificati lettura ordinaria, Focus ed export PDF IT/EN. Codice e formule
già compatibili restano invariati. La correzione riguarda il troncamento apparente
riprodotto; non certifica la completezza di qualunque risposta AI. Setup non
rigenerato; prossima voce 9 della coda, non avviata.

### 13. Traduzione della dispensa italiana in inglese: intera o a parti

- [x] Verificare se la traduzione attuale IT → EN elabora l’intera dispensa o singole parti e documentarlo.
- [x] Valutare se tradurre per sezioni sia preferibile per completezza, coerenza terminologica, limiti di output, costo e ripresa dopo un errore.

Completato il 14 ottobre in D-0293: la traduzione usa l'intera dispensa in una
richiesta logica. Conservata questa strategia dopo il confronto con le parti,
aggiungendo controlli prima del salvataggio: risposta completa, confini univoci
delle sezioni ATX in ordine, livelli/numeri dei titoli, formule, codice, riquadri
e struttura Mermaid. I confini temporanei non vengono salvati. Una risposta
invalida interrompe senza retry automatico e conserva fonti e inglese precedente;
si può riprovare esplicitamente. Non esiste ripresa granulare EN o fallback a
parti. I controlli non certificano qualità linguistica né ogni omissione di prosa.
Confronto di contesto, output, consumo e ripresa, con limiti e collaudi:
[Traduzione delle dispense](traduzione-dispense.md). Passati 470 Vitest,
suite React/Electron e riavvio reale, typecheck, lint e build. Nessuna nuova
dipendenza, chiamata API o invio di materiali personali.

Non scegliere in anticipo la traduzione a parti. Confrontare i due approcci,
controllando che nessuna sezione venga omessa o duplicata e che titoli, formule,
codice e contesto restino coerenti. Coordinare la valutazione con la voce 15,
che richiede una corrispondenza affidabile dei capitoletti nelle due lingue.

### 14. Riconoscere automaticamente la lingua nel traduttore

- [x] Riconoscere se la parola inserita è italiana o inglese e selezionare automaticamente la direzione corretta IT ↔ EN.

Implementato e collaudato il 14 ottobre in D-0288: il vocabolario confronta
le voci nei due dizionari locali, comprese locuzioni e flessioni inglesi già
supportate. Una voce esclusiva seleziona IT → EN o EN → IT; voci presenti in
entrambe le lingue e assenze mantengono l'ultima direzione e mostrano un messaggio.
L'inversione manuale resta attiva fino al comando **Riconosci automaticamente**
o alla chiusura della casella. Nessuna rete, chiamata AI o nuova dipendenza.
Passati 441 test Vitest, collaudo Electron mirato e suite completa con riavvio,
typecheck, lint e build. Dettagli: [Vocabolario offline](vocabolario-offline.md).

Estendere il vocabolario/traduttore esistente della voce 7, senza duplicarlo.
Valutare parole presenti in entrambe le lingue, termini tecnici, locuzioni e
parole assenti dai dizionari: nei casi ambigui mantenere la scelta manuale
accessibile, evitando inversioni imprevedibili. Distinguere il riconoscimento
della lingua dalla futura traduzione di frasi e mantenerlo locale ove possibile.

### 15. Cambiare lingua mantenendo lo stesso capitoletto

- [x] Sostituire il passaggio approssimativo per percentuale con il salto alla sezione corrispondente della dispensa nell’altra lingua.
- [x] Verificare la segnalazione aggiuntiva: il passaggio italiano → inglese oggi arriva soltanto vicino al punto desiderato, in base alla percentuale.

Completato il 14 ottobre in D-0290: pulsante e Ctrl+L conservano il capitoletto
e il punto interno in entrambe le direzioni, nella lezione e in Focus. Titoli
numerati o identici univoci hanno priorità; l'ordine è usato solo con struttura
compatibile e senza contraddizioni rilevabili. In assenza di una corrispondenza
affidabile resta il ripiego percentuale, descritto nel tooltip e nella
[documentazione di lettura](lettura-export-pdf.md). Il riordino di titoli tutti
tradotti e senza identificatori non è rilevabile dalla sola struttura.
Nessuna modifica delle dispense, dipendenza o chiamata AI. Collaudi sintetici
con 12 sezioni di lunghezze diverse, punto interno, segnalibri, strutture
divergenti, numerazioni, titoli ripetuti e riordini; suite React Electron con
pulsante, Ctrl+L, Focus e riavvio reale, 445 Vitest, typecheck, lint e build passati.

Esempio richiesto: con 12 titoli in italiano e 12 in inglese, passando dalla
sezione 10 italiana all’inglese si deve raggiungere la sezione 10 inglese, e
viceversa. Valutare una corrispondenza stabile tra i titoli e la conservazione
del punto interno alla sezione. Gestire titoli mancanti, aggiunti, ripetuti o
riordinati e traduzioni già esistenti: il solo indice numerico non basta quando
le strutture divergono. Definire un ripiego esplicito e collaudare entrambe le
direzioni, anche in Focus e con la futura scorciatoia Ctrl+L.

### 16. Pausa scaduta e tempo realmente studiato

- [x] Verificare cosa conteggiano i timer se viene avviata una pausa di 5 minuti ma l’utente resta lontano per 30 minuti.
- [x] Assicurare che i 25 minuti oltre la pausa prevista non vengano attribuiti automaticamente allo studio attivo.

Verificato e completato il 14 ottobre in D-0287: la pausa programmata resta
attiva anche dopo lo zero; non esiste ripresa automatica alla scadenza. Tutti
i 30 minuti restano esclusi dalla sessione, dal totale della lezione e dalle
statistiche salvate. La modale ora lo dice esplicitamente e conserva il pulsante
di ripresa e il focus da tastiera quando cambia lo stato del countdown.
Si riprende solo con il pulsante o Esc; il ritorno nell'app e le interazioni
ordinarie non chiudono la pausa. La sospensione del PC non recupera il tempo
trascorso: fuori dalla pausa, un salto del heartbeat superiore a 3 secondi
ferma il conteggio, che puo' ripartire con una nuova interazione.
Collaudo React/Electron con orologio controllato e persistenza sintetica,
78 test archivio/statistiche, typecheck, lint e build passati. Suite Electron
completa e riavvio reale passati alla seconda esecuzione; la prima si e'
fermata sul controllo preesistente della posizione delle slide nascoste.

La domanda dell’utente sul comportamento attuale resta da verificare nel codice
e con una prova riproducibile. Distinguere durata della pausa, eventuale ripresa
automatica, tempo di studio della lezione e statistiche complessive. Valutare
una ripresa esplicita e controllare anche sospensione del PC e ritorno nell’app,
senza anticipare che i timer attuali escludano già quei minuti.

### 17. Timer pausa offline su Amazfit Balance originale

Aggiornamento 15 ottobre: accettati i quattro compromessi in D-0304.
[Nucleo prototipo e blocco del trasporto](../../prototypes/balance-pause/README.md)
collaudato in D-0310; mini app installabile e collegamento hardware non pronti.

- [ ] Implementare e collaudare l'invio della pausa da Lezionify al watch.
- [ ] Verificare il collegamento diretto PC ↔ Balance senza telefono né Internet.
- [ ] Verificare ricezione dal quadrante e vibrazione di circa 10 secondi con stop automatico.

Richiesta del 14 ottobre 2026: Esc e pausa di 5, 15 o 30 minuti devono avviare
il countdown sul Balance originale. Nessun tocco sul watch, al massimo un OK;
telefono accettato per installazione ma preferibilmente assente durante l'uso.
Non presumere Wi-Fi condivisa o Internet. La ripresa anticipata dello studio
non annulla il timer sul watch; la scadenza non riprende automaticamente lo studio.

[Requisiti, versioni, conclusioni e piano di ripresa](../research/timer-pausa-amazfit-balance-valutazione-2026-10-14.md)
con [Deep Research integrale](../research/timer-pausa-amazfit-balance-deep-research-2026-10-14.md).
Le API dirette esaminate richiedono Device App attiva: `mst*` è escluso dagli
App Service. L'apertura una volta per sessione con successivo spegnimento dello
schermo è un esperimento, non un compromesso già accettato. REA è proposto per
cercare un altro canale Zepp o un ingresso Android offline, senza installazione
o analisi eseguite. Funzione non implementata e non aggiunta alla coda
LISTA_ORDINE; le dodici priorità concordate conservano il loro ordine.

## Aggiunte del 15 ottobre 2026 — semplici

Interventi di interfaccia circoscritti; stato aggiornato dopo il collaudo
della revisione iterativa del 15 ottobre.

### 18. Un solo pulsante per nascondere tutti gli schemi Mermaid

- [x] Aggiungere un comando unico «Nascondi tutti gli schemi» e «Mostra tutti gli schemi» per la dispensa in Focus.

Completato e collaudato il 15 ottobre: comando nella barra della spiegazione,
stato collettivo coerente con i comandi individuali, SVG conservati e punto di
lettura stabile. Invio/Spazio verificati in Electron; cambio lezione resetta
lo stato, assenza di schemi nasconde il comando. Discussione e PDF indipendenti.

Richiesta: poter nascondere tutti i diagrammi insieme, senza dover premere un
pulsante per ciascuno schema. Estende la voce 11, completata per i soli comandi
individuali in D-0286. Verificare riapertura corretta di tutti i diagrammi,
accessibilità da tastiera e stabilità del punto di lettura. Il comando riguarda
la visualizzazione; conservare il Markdown e gli schemi nell'esportazione PDF.

### 19. Pulsante di esportazione PDF fuori dalla modalità Focus

- [x] Rendere disponibile il pulsante «Esporta in PDF» fuori dalla lezione aperta in modalità Focus.

Verificato il 15 ottobre: il pulsante era già nella vista ordinaria della
dispensa, accanto a Stampa e Focus Mode. Aggiunta descrizione di lingua e
destinazione nel tooltip; collaudati visibilità, richieste ITA/ENG della lezione
corrente e assenza del comando senza dispensa, senza entrare in Focus o usare AI.
Suite React/Electron completa e ripresa dopo riavvio passate.

Richiesta: esportare la dispensa senza dover entrare nella vista a tutto schermo.
Verificare la posizione attuale del comando e collocarlo nella vista ordinaria
della lezione, con destinazione e lingua riconoscibili. Riutilizzare l'export
locale della voce 2 e gestire le dispense non disponibili. La richiesta riguarda
la posizione del pulsante, senza richiedere un nuovo motore di esportazione.

## Aggiunte del 15 ottobre 2026 — difficili / da approfondire

Problemi segnalati dall'utente: diagnosi ed esiti aggiornati nelle singole voci.

### 20. Versioni ENG spesso mancanti nelle «Elaborazioni in corso»

- [ ] Indagare perché «Elaborazioni in corso» trascrive gli audio e genera le dispense italiane, ma di solito non produce le versioni ENG.

Diagnosi parziale del 15 ottobre in D-0300:
[stati ENG, percorsi automatico/manuale e prova residua](../quality/versioni-eng-diagnosi-2026-10-15.md).
L'import automatico esclude ENG per scelta storica, «Elabora tutto» le include;
il pannello ora mostra attesa, esclusione, errori e dipendenze. L'ultimo run locale
disponibile risulta riuscito: manca un caso manuale fallito per spiegare tutti
gli episodi. Nessuna traduzione avviata automaticamente e casella ancora aperta.

Conservare la segnalazione come comportamento osservato, senza attribuirgli
già una causa. Ricostruire un caso riproducibile e controllare impostazioni,
accodamento della fase EN, avanzamento, errori, quote e ripresa dei lavori.
Distinguere una traduzione ancora in attesa da una fase non avviata o fallita;
verificare che lo stato mostri chiaramente il motivo dell'assenza dell'inglese.
Riutilizzare la pipeline persistente e i controlli di traduzione della voce 13
e di D-0293. Conservare audio, trascrizione grezza e dispense già disponibili;
eventuali chiamate AI devono restare esplicite e tracciabili, senza contenuti
privati nei log.

Aggiornamento dopo l'intervista sulle priorità 1–5: il nuovo import include
ENG già da D-0305. Verificati pipeline e recupero su fixture; corretto l'avviso
che generalizzava il vecchio comportamento. L'utente non ha ancora verificato
un caso successivo all'aggiornamento: la casella della segnalazione resta aperta.
[Esito e limite](priorita-1-5-2026-10-15.md#diagnosi-eng-e-limite-della-conclusione).

### 21. «trascrivi» non riconosciuto nel dizionario italiano → inglese

- [x] Indagare perché il vocabolario non riconosce la parola italiana «trascrivi» e correggere il caso dopo averne verificato la causa.

Corretto il 15 ottobre: mancavano sia «trascrivere» nel dizionario IT→EN sia
le flessioni italiane nel lookup. Aggiunta una sola voce inversa revisionata
dalla coppia locale già presente «transcribe → trascrivere», con provenienza e
licenza conservate e generatore riproducibile. Forme comuni di presente/imperativo
rimandano a un solo lemma verbale attestato; voci esatte prevalgono e più lemmi
possibili non producono una scelta arbitraria. «trascrivi → trascrivere →
transcribe» verificato su dati reali offline e in Electron in modalità automatica
e manuale. Le flessioni non sono universali; nessuna rete o nuova dipendenza.

Usare «trascrivi» come caso di regressione e confrontarlo con «trascrivere».
Distinguere copertura del dizionario, gestione delle forme verbali italiane e
riconoscimento automatico della direzione della voce 14 (D-0288). Verificare sia
IT → EN selezionato manualmente sia la modalità automatica; non presumere che
le flessioni italiane siano già supportate come quelle inglesi. Riutilizzare il
vocabolario offline della voce 7, senza fallback automatici a servizi AI o rete.
La classificazione resta da rivedere dopo la diagnosi.

### 22. Vocabolario unico con traduzione automatica delle frasi

- [x] Unificare le schede «Parole» e «Frasi offline» in un solo vocabolario con un unico campo di testo.
- [x] Dopo una pausa nella digitazione, verificare il testo: se contiene spazi interni tra parole, avviare automaticamente il modello locale per le frasi; per una parola singola mantenere il dizionario locale.
- [x] Per le frasi impostare inizialmente IT → EN e consentire di invertire la direzione con il pulsante, rispettando la scelta manuale nelle traduzioni successive.

Completata e collaudata dopo intervista (D-0323): campo unico; 500 ms per le frasi,
riconoscimento lessicale per le parole; IT → EN a ogni apertura e inversione
manuale limitata all’apertura corrente. Coda locale serializzata, bozze obsolete
scartate, input modificabile e modelli mancanti gestiti senza fallback online.

[Scelte e verifiche](priorita-1-5-2026-10-15.md).

La voce non modifica l'ordine della coda LISTA_ORDINE esistente.

### 23. Configurazione di traduttore e musica nelle Impostazioni

- [x] Spostare nelle Impostazioni il download e la gestione dei modelli del traduttore offline.
- [x] Raccogliere nelle Impostazioni la configurazione necessaria alla musica: Client ID Spotify, collegamento account, autorizzazioni aggiuntive e preferenze di configurazione.
- [x] Semplificare le viste quotidiane di vocabolario e musica, mantenendo in primo piano ricerca, traduzione, scelta dei contenuti e comandi di riproduzione.

Completata e collaudata (D-0323): sezioni Traduttore offline e Musica nelle
Impostazioni. Download/riparazione, account/consensi Spotify ed editor compatto
dei timestamp YouTube; collegamenti dalle viste quotidiane. Bozza del
vocabolario conservata, modelli e preferenze esistenti riusati, installazione
osservata anche dopo cambio scheda, focus e scorrimento verificati.

[Scelte e verifiche](priorita-1-5-2026-10-15.md).

La voce non modifica l'ordine della coda LISTA_ORDINE esistente.

### 24. Musica accessibile e controllabile anche fuori dal Focus

- [x] Rendere accessibile il pannello musicale anche nell'interfaccia ordinaria, senza dover entrare in modalità Focus.
- [x] Riutilizzare i controlli e i contenuti musicali disponibili, mantenendo coerenti stato e selezioni quando si entra o si esce dal Focus.

Completata e collaudata (D-0324): accesso ordinario già presente verificato;
conservati sorgente, compilation, sezione/pagina Spotify e dispositivo nelle
riaperture tra sidebar e Focus. Un solo polling per pannello, cleanup e nessun
comando audio alla riapertura. Nessun mini-player; riproduzione esterna invariata.

[Scelte e verifiche](priorita-1-5-2026-10-15.md).

La voce non modifica l'ordine della coda LISTA_ORDINE esistente.

### 25. Selezione slide visibile solo durante la composizione di una domanda

- [x] Mostrare il comando «Seleziona slide» soltanto mentre l'utente sta componendo una domanda nel Q&A, anziché lasciarlo sempre visibile durante la lettura.

Completata e collaudata (D-0324): dal focus nel campo domanda, anche vuoto,
compaiono i controlli; restano nel passaggio al PDF e scompaiono dopo invio o
chiusura della discussione. Preparazioni pendenti invalidate alla chiusura;
allegati già salvati e follow-up conservati. PDF reale sintetico e Enter verificati.

[Scelte e verifiche](priorita-1-5-2026-10-15.md).

La voce non modifica l'ordine della coda LISTA_ORDINE esistente.

## Aggiunte del 16 ottobre 2026 — semplici

Classificazione preliminare per interventi circoscritti, comunque da collaudare.
Dal 16 ottobre le attività aperte sono incluse nella coda LISTA_ORDINE (D-0327).
La voce 29 è una domanda
sullo stato attuale, risposta leggendo il codice; le altre restano da implementare.

### 26. Q&A con tono da docente, meno accomodante

- [x] Ridurre elogi automatici e approvazioni come «sei un grande»; usare il tono di un professore che vuole spiegarsi bene e verificare che lo studente capisca.

Spiegazioni chiare, correzioni esplicite degli errori e delle premesse sbagliate,
senza compiacenza né durezza gratuita. Valutare brevi domande di verifica quando
utili, senza imporre un interrogatorio a ogni risposta. Collaudare domande con
premesse errate, risposte parziali e richieste di chiarimento, mantenendo fedeltà
alle fonti e dichiarando ciò che il contesto non consente di sapere.

Implementazione del 16 ottobre (D-0332): metodo didattico nel prompt Q&A per
domande, follow-up e slide, identico nei fallback. Passati 21 test Q&A,
typecheck e lint mirato. Verificato il contratto SDK con risposte simulate;
nessuna chiamata AI reale o garanzia sul tono di ogni risposta. Casi sintetici,
criteri e limiti nel [report di verifica](../quality/qna-tono-didattico-2026-10-16.md).

### 27. Ultima lezione completata: ritorno automatico alla lista

- [x] Quando il completamento della lezione esaurisce le lezioni da studiare del corso, mostrare «Ultima lezione» e dopo circa 2 secondi chiudere la schermata tornando a «Tutte le lezioni».

In questo caso evitare l'uscita con la frizione dei 15 secondi: non c'è una
lezione successiva su cui decidere. Verificare lo stato dopo il salvataggio,
il corso con una sola lezione e l'eventuale riapertura di lezioni completate;
gestire pulizia del timer e persistenza della sessione senza doppie chiusure.

Completata il 16 ottobre (D-0333): timer avviato solo dal salvataggio riuscito
di una nuova marcatura Completata, controllo su tutte le lezioni del corso,
avviso in lettura ordinaria/Focus e sessione salvata senza Focus Lock automatico.
Riapertura, errori, risposte tardive e annullamento collaudati in Electron;
suite completa con riavvio, 513 Vitest, typecheck e lint mirato passati.
[Comportamento e verifiche](../quality/ultima-lezione-2026-10-16.md).

### 28. Rimuovere la frase esplicativa dal vocabolario

- [x] Togliere la scritta «Una parola: dizionario locale. Più parole: traduzione automatica offline dopo una breve pausa.».

La frase è presente in `src/components/DictionaryOverlay.tsx` nel suggerimento
mostrato a campo vuoto. Rimuovere quel testo conservando il funzionamento del
campo unico della voce 22. L'eventuale indicazione separata delle scorciatoie
Ctrl+T/Esc non è oggetto della richiesta di rimozione.

Completata il 16 ottobre in D-0331: rimosso solo il testo richiesto, mantenute
le indicazioni Ctrl+T/Esc. Passato il collaudo Electron `--dictionary-only`
per ricerca IT/EN, direzione manuale, ambiguità, Focus, risposte obsolete e retry.

### 29. Quali modelli sono implementati per generare la dispensa studio?

- [x] Rispondere in base al codice attuale, distinguendo scelte nell'interfaccia, supporto interno e disponibilità effettiva delle API.

Verifica statica del 16 ottobre 2026: nelle Impostazioni sono selezionabili
**Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.5 Flash, 2.5 Flash e 3.7 Flash**.
Il valore predefinito è **Gemini 3.6 Flash**. La generazione della dispensa usa
il modello salvato nelle Impostazioni, sia per il percorso breve sia per la
pipeline a sezioni. Il provider implementato per questa funzione è Gemini.

La validazione interna accetta anche `gemini-3.1-flash-lite`,
`gemini-3.1-pro-preview`, `gemini-2.5-pro` e `gemini-2.5-flash-lite`, che non
compaiono nel selettore. La catena di riserva parte dal modello configurato e
può poi tentare, escludendo duplicati: `gemini-3.7-flash`,
`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`,
`gemini-3.8-flash`. Il Q&A ha una propria catena e non determina il modello
principale della dispensa.

Fonti: `src/components/SettingsModal.tsx` (`AVAILABLE_MODELS`),
`electron/main/settings.ts` (`VALID_MODELS`, `DEFAULT_SETTINGS`),
`electron/main/archive.ts` (`generateLectureNotes`) ed
`electron/main/gemini.ts` (`getModelFallbackChain`, `generateLectureNotes`).
Questi sono gli identificativi configurati nel repository: la presenza nel
codice non certifica esistenza, quota o accessibilità del modello presso Google
per l'account corrente. Nessuna nuova chiamata API o misura di qualità/velocità
eseguita per questa risposta.

## Aggiunte del 16 ottobre 2026 — complesse / da approfondire

Le voci seguenti richiedono diagnosi, scelte di prodotto o verifiche tecniche.
Restano aperte e dal 16 ottobre sono incluse nella coda LISTA_ORDINE (D-0327).
L'aggiornamento della coda riguarda la pianificazione e non avvia implementazioni,
ricerche online o integrazioni con telefono e servizi esterni.

### 30. Suoni di sottofondo offline come quelli Apple

- [x] Avere gli stessi «Suoni di sottofondo» di Apple, scaricati e disponibili offline, con un'interfaccia simile per sceglierli e ascoltarli.

Completato in D-0340 con catalogo equivalente approvato di 6 suoni
(rumori continuo white/pink/brown da newagesoup CC0, paesaggi naturali
rain/waves/stream da Blanket CC BY 4.0/CC0) memorizzati in `userData/ambient-sounds`,
download atomico su richiesta esplicita dell'utente con verifica SHA-256,
riproduzione persistente con Web Audio API in loop gapless nativo nel pannello
Musica/Suoni, preferenze di volume e ultimo suono memorizzate, e auto-pausa
durante l'ascolto delle lezioni in `AudioPlayer` con ripresa automatica.

### 31. Domande audio nel Q&A e registrazione dal telefono

- [ ] Valutare la possibilità di allegare un audio al Q&A.
- [ ] Capire come registrare dal telefono e far arrivare automaticamente la registrazione al portatile, eventualmente con un'app dedicata.
- [ ] Valutare Bluetooth e un collegamento con il progetto Amazfit Balance della voce 17.

Distinguere acquisizione, trasferimento locale e interpretazione della domanda:
audio diretto al modello oppure trascrizione da rivedere prima dell'invio.
Definire associazione alla lezione/discussione, anteprima, limiti, errori,
duplicati e consenso all'eventuale invio AI. Conservare l'audio originale e la
trascrizione grezza; il trasferimento automatico dal telefono non implica invio
automatico a un provider. Confrontare i trasporti senza presumere che il prototipo
Balance offra già un canale Bluetooth utilizzabile dal telefono.

### 32. Timer della pausa sul telefono in tasca

- [ ] Valutare di trasferire dal Balance al telefono l'idea «mi distacco e vado in pausa», con un avviso sonoro alla scadenza mentre il telefono è in tasca.

Alternativa da valutare alla voce 17, senza cancellare la richiesta per il watch.
Riutilizzare ricerca e protocollo del prototipo in `prototypes/balance-pause/`.
Verificare sistema operativo del telefono, trasporto PC ↔ telefono, funzionamento
a schermo bloccato/in background, permessi e affidabilità del suono. Distinguere
avvio automatico del countdown dal rilevamento automatico dell'allontanamento,
che non è ancora un requisito definito. Conservare pausa 5/15/30 minuti e ripresa
esplicita dello studio; la scadenza non deve conteggiare automaticamente studio.

### 33. Ctrl+L seleziona la schermata ma non cambia lingua

- [ ] Riprodurre e indagare la segnalazione «Ctrl+L va a selezionare la schermata ma non cambia la lingua».

Nuova segnalazione del 16 ottobre, successiva all'implementazione della voce 10
(D-0284) e all'allineamento della voce 15 (D-0290). Le caselle storiche concluse
restano tali, ma non provano che questo caso funzioni. Verificare versione
installata, vista ordinaria/Focus, elemento con focus, disponibilità ENG e
intercettazione della scorciatoia tra finestra e renderer. Confrontare il pulsante
di cambio lingua con la tastiera e i collaudi già presenti; non attribuire già
la causa al browser o al sistema operativo. Registrare riproduzione e regressione
prima di chiudere la segnalazione.

Diagnosi del 16 ottobre: l'utente conferma Focus e pulsante lingua funzionante.
Il nuovo collaudo `--language-shortcut-only` con input nativo Electron,
fullscreen HTML reale, selezione testo e PDF passa; il sintomo personale resta
non riprodotto e la casella aperta. L'utente conferma che il problema persiste
anche dopo clic nel testo e uso del pulsante. Anche il collaudo dell'intera app
passa: predisposta diagnostica locale facoltativa con flag esplicito, senza
modificare il cambio lingua; serve acquisire l'episodio nella sessione reale.
[Evidenze e ripresa](../quality/ctrl-l-diagnosi-2026-10-16.md).

### 34. Tag personali e raggruppamento dinamico delle catture rapide

- [x] Aggiungere creazione di tag, per esempio «Lezionify» con lettera «L», «Studio», «Casa» e «Altro».
- [x] Selezionare il tag cliccando il suo nome o con una scorciatoia e salvare la nuova voce nel gruppo corrispondente.
- [x] Mostrare i contenuti raggruppati dinamicamente e consentire «Copia» per un singolo tag oppure per tutti.

Grilling e implementazione conclusi il 17 ottobre (D-0341): un gruppo per
attività, note separate, dati storici in Senza tag e ultimo gruppo conservato.
Ctrl+P apre, Alt+lettera seleziona senza consumare lettere normali. Gruppi in
ordine di creazione, rinomina, spostamento attività ed eliminazione confermata
con trasferimento del contenuto in Senza tag. Copia con checklist e note,
pulizia completati circoscritta al gruppo. [Uso, verifiche e limiti](catture-gruppi-stima-studio-2026-10-17.md).

### 35. Lara3 di Translated per traduzioni rapide

- [x] Approfondire il sistema indicato dall'utente come «Lara3», AI italiana di Translated, per capire se offra traduzioni gratuite in locale oppure API rapide e puntuali.

Verificare anzitutto denominazione/versione e documentazione ufficiale, poi
distinguere disponibilità dei pesi locali, servizio web e API. Controllare
gratuità continuativa rispetto a prove/crediti, licenza, requisiti hardware,
privacy, qualità EN ↔ IT e soprattutto latenza effettiva per frasi brevi e
tecniche. Riutilizzare casi e risultati delle ricerche della voce 7 per un
confronto con Bergamot. Nessuna gratuità o disponibilità offline già accertata;
eventuali chiamate online restano esplicite, senza fallback automatico.

Valutazione documentale conclusa il 16 ottobre (D-0336): nome Lara 3
confermato, pesi/runtime locali gratuiti non trovati nelle fonti ufficiali,
API Free 10.000 caratteri/mese distinta dal plafond web. I 50 ms pubblicizzati
riguardano Flash per grandi volumi, non dimostrano latenza Free o sul PC.
Confronto con misure Bergamot, privacy, denominazioni e condizioni di eventuale
prova nel [report Lara](../research/lara-translated-valutazione-2026-10-16.md).
Nessun account, chiamata di traduzione o integrazione: completata la ricerca,
non un benchmark reale o una nuova funzione.

### 36. Stima del tempo per terminare la sessione di studio

- [x] Valutare e implementare la stima dello studio restante della dispensa, mostrata solo sotto i 30 minuti.

Scelta dopo grilling del 17 ottobre (D-0342): estrapolare il ritmo personale
dello studio, comprese domande, slide e riletture. Almeno dieci minuti e 60%
di avanzamento consolidato; 45 secondi per intervallo, senza attribuire studio
alle parti attraversate con una scorsa rapida. Pausa, background e sospensione
esclusi. Indicatore discreto in Focus, fasce di cinque minuti smussate,
preferenza nelle Impostazioni e Ricalcola da qui. Campioni locali condivisi
IT/EN, invalidati dalle variazioni dei contenuti. Nessuna chiamata AI.

Implementazione e verifiche tecniche concluse; motivazione e utilità delle
soglie da osservare nell'uso. La permanenza non dimostra comprensione e i
salti possono lasciare la stima nascosta. [Criterio, uso e collaudi](catture-gruppi-stima-studio-2026-10-17.md).

### 37. Ricerca e Q&A su tutte le informazioni di un corso (RAG)

- [x] Raccogliere e organizzare tutte le informazioni disponibili sul corso: orari, regole d'esame, dispense, trascrizioni, slide, indicazioni del docente, laboratorio ed esercizi.
- [x] Consentire domande generali che richiedono di incrociare più lezioni e documenti, recuperando le fonti pertinenti.

Esempi dell'utente da conservare come casi di accettazione:

- «Quante volte ha parlato di John Nash?»
- «Come si risolverebbe la battaglia dei sessi con il teorema A?»
- «Cosa ha detto il prof sul laboratorio?»
- «Come si risolve questo esercizio? L'abbiamo mai fatto?»

RAG indica recuperare materiale pertinente prima di comporre la risposta;
gli embedding sono una possibile tecnica, non un requisito già scelto né
una categorizzazione sufficiente. Valutare ricerca testuale, semantica o ibrida,
segmentazione, metadati e aggiornamento dell'indice locale, riusando archivio,
ricerca e informazioni logistiche esistenti. Gestire duplicati tra trascrizioni,
dispense e traduzioni, versioni e avvisi superati, con citazioni apribili a
lezione/pagina/passaggio e distinzione tra parole del docente e deduzioni.

Il conteggio di menzioni richiede una ricerca completa con regole esplicite
su occorrenze/lezioni, non soltanto pochi risultati semanticamente vicini.
L'assenza di un esercizio tra i risultati non dimostra che non sia mai stato
svolto. La soluzione con il teorema richiede ragionamento e fonti, non semplice
somiglianza. Definire corpus, criteri e collaudi sintetici prima di scegliere
modelli o dipendenze; fonti e indice locali, invio AI esplicito e tracciabile.

Implementazione conclusa il 17 ottobre dopo grilling Q1–Q9 (D-0343/D-0344).
Ricerca locale per passaggi con MiniSearch, trascrizioni canoniche per i
conteggi, conversazioni e bozze persistenti, fonti collegate da selezione
nativa, scansione all'avvio e ogni cinque minuti, PDF.js nel worker e pagine
visive inviate soltanto con domanda esplicita. Gemini può richiedere ricerche,
passaggi, conteggi o documenti entro tre approfondimenti aggiuntivi. Citazioni
validate e versionate, con apertura del passaggio, lezione o pagina PDF.

Passati 536 Vitest, scenario e suite Electron con riavvio, typecheck, lint
mirato e build. L'indicizzazione non è OCR: figure e scrittura a mano richiedono
consultazione o invio visivo esplicito. Ricerca lessicale e assenza dai risultati
non provano assenza dal corso. Qualità Gemini e idratazione OneDrive sui dati
personali non collaudate; installer non rigenerato. [Uso e limiti](rag-corso-2026-10-17.md).

## Aggiunte del 19 ottobre 2026

### 38. Transizioni tra canzoni e suoni di sottofondo

- [ ] Introdurre una transizione nel passaggio da una canzone all'altra, da una canzone a un suono e da un suono a un altro suono.
- [ ] Valutare all'ascolto la durata migliore prima di fissare il valore adottato.

Riutilizzare la sezione musica (voce 5, D-0309) e i suoni offline (voce 30,
D-0340). Verificare quali controlli di volume e riproduzione sono effettivamente
disponibili per ciascuna sorgente; scegliere il tipo di dissolvenza e la durata
su queste basi. Evitare stacchi bruschi, picchi di volume e sovrapposizioni
residue dopo cambi rapidi, pausa o arresto. La durata non è ancora concordata:
confrontare più tempi e documentare scelta e limiti dei diversi player.

Aggiornamento D-0370: implementati e collaudati i passaggi tra suoni offline,
con default di **1 secondo** scelto dall'utente e opzioni 1/2/4 persistenti.
La voce complessiva resta aperta: Spotify non consente segue/mix/sovrapposizioni
tramite integrazioni e YouTube è un player esterno non controllato dall'app.
Limiti, fonti e ripresa nel [resoconto](memo-log-pdf-transizioni-2026-10-19.md).

### 39. Migliorare grafica e usabilità della scheda Memo

- [x] Migliorare resa grafica, leggibilità e facilità d'uso della scheda Memo.

Partire dalla schermata reale e dalle catture rapide già implementate
(voce 34, D-0341): attività, note, gruppi, copia e scorciatoie devono restare
utilizzabili e i dati locali conservati. Valutare gerarchia visiva, spaziatura,
testi lunghi e riconoscibilità dei comandi; il dettaglio grafico resta da
definire sul contesto esistente. Collaudare temi chiaro/scuro, tastiera e
dimensioni della finestra. Il comportamento puntuale del testo al passaggio
del mouse è una voce distinta (41), da coordinare senza chiuderla per il solo restyling.

Implementata e collaudata in D-0367; [uso, verifiche e limiti](memo-log-pdf-transizioni-2026-10-19.md).

### 40. Nuova esportazione PDF di lezione e corso

- [x] Mantenere un unico pulsante **Esporta**, eliminando la conferma («Sei d'accordo?» / Conferma) e il menu aggiuntivo dedicato ai laboratori.
- [x] Aprire un pop-up centrale con **Lezione** e **Corso**, navigazione a passaggi successivi e pulsante **Indietro** alle schermate precedenti.
- [x] Implementare selezione, lingua, nomi file e salvataggio nativo secondo i requisiti seguenti.
- [x] Verificare PDF singoli e di corso, ordine cronologico e intercalazione delle pagine Note.

**Singola lezione:** mostrare tutte le lezioni disponibili, con titolo a
sinistra e pulsanti **Italiano | Inglese** a destra per ogni riga. Il clic sulla
lingua apre direttamente la finestra nativa Windows **Salva con nome**, con
scelta della cartella. Nome suggerito:
`Lezione_<Titolo_Lezione>_<IT/EN>_<Data_Lezione>.pdf`, sostituendo gli spazi
con underscore e gestendo i caratteri non validi per i nomi file Windows.

**Corso, primo passaggio:** mostrare tutti i corsi disponibili come
**Nome completo (Sigla)**; selezionandone uno, aprire la selezione delle lezioni.

**Corso, selezione lezioni:** elencare tutte le lezioni del corso con checkbox
individuali, inizialmente tutte selezionate, **laboratori inclusi**. Consentire
aggiunta e rimozione manuale di ogni lezione. Offrire i comandi rapidi
**Seleziona tutto / Deseleziona tutto** e **Escludi laboratori / Includi laboratori**,
con etichette aggiornate in base allo stato. Mostrare infine scelta della lingua
**Italiano/Inglese** e pulsante **Esporta**. Gestire selezioni miste e nessuna
lezione selezionata in modo comprensibile; precisare questi dettagli durante
l'implementazione senza cambiare il requisito di selezione iniziale completa.

**Generazione e salvataggio del corso:** produrre un unico PDF delle sole
lezioni selezionate in ordine cronologico, mantenendo le relative pagine Note
intercalate (D-0350) e il renderer PDF esistente. Usare **Salva con nome** nativo
Windows con nome suggerito `Corso_<Sigla>_<IT/EN>_<Data_Esportazione>.pdf`.
D-0369 uniforma le date nei nomi file al formato locale `YYYY-MM-DD`.

Workflow richiesto: **Esporta → Corso → Seleziona corso → Escludi laboratori →
Deseleziona eventuali lezioni introduttive → Scegli lingua → Esporta → Salva PDF**.

D-0369 implementa questa specifica e sostituisce il flusso UI a due clic di
D-0346: selezione iniziale completa, laboratori inclusi. Il comportamento è
documentato in [Lettura ed esportazione PDF](lettura-export-pdf.md). Riutilizzare
anche titoli indipendenti IT/EN (D-0349) e Mermaid compatti (D-0347). Verificare
Indietro, annullamento del salvataggio, dispense mancanti e conservazione delle
fonti; nessuna rigenerazione AI implicita per esportare una lingua mancante.

### 41. Leggere per intero le attività Memo al passaggio del mouse

- [x] Mostrare il testo completo dell'attività quando il puntatore resta fermo sopra una cosa da fare nella schermata Memo per almeno un secondo.
- [x] Nascondere il testo esteso quando il puntatore si muove.

Il testo deve essere leggibile anche quando la riga normale è troncata.
Annullare l'attesa se il puntatore si muove prima della soglia, esce dalla voce
o la schermata viene chiusa; non lasciare anteprime di una voce precedente.
Verificare testi lunghi, movimento entro la stessa riga e passaggio tra righe,
coordinando la presentazione con la voce 39.

Implementata e collaudata in D-0367; [uso, verifiche e limiti](memo-log-pdf-transizioni-2026-10-19.md).

### 42. Caricamento progressivo dei log di sistema per giorno

- [x] All'apertura dei log caricare soltanto i dati di oggi.
- [x] Raggiungendo il fondo, caricare dinamicamente un giorno precedente alla volta.

Obiettivo: evitare il caricamento iniziale di migliaia di righe e velocizzare
l'apertura. Applicare il limite anche alla lettura dei dati, senza recuperare
tutto lo storico per poi nasconderlo nell'interfaccia. Usare i confini del giorno
locale e verificare giorni senza log, cambio data, filtri, fine dello storico,
assenza di duplicati o buchi e caricamenti ripetuti durante lo scroll. Rendere
visibili caricamento ed eventuali errori senza bloccare le righe già consultabili.
Conservare i log esistenti e le regole sui dati sensibili.

Implementata e collaudata in D-0368; [uso, verifiche e limiti](memo-log-pdf-transizioni-2026-10-19.md).

### 43. Errore ricorrente nella traduzione ENG: diagnosi della mancata corrispondenza

- [x] **Molto importante:** individuare perché la traduzione ENG viene spesso rifiutata dal controllo di integrità.
- [x] Correggere la causa verificata e collaudare i casi validi e quelli realmente incompleti o alterati; D-0364 verifica Mermaid, quote legacy e fallback ENG, con 615 test, cinque replay e nuova generazione reale di 40 sezioni riusciti. Setup aggiornato da installare; restano i possibili errori del provider e il rifiuto delle risposte realmente incomplete.

Messaggio segnalato dall'utente (identificativo della lezione omesso):

> Errore traduzione ENG per lezione [ID locale]: Traduzione non salvata: titoli, formule, codice o riquadri non corrispondono alla sezione italiana. Riprova la traduzione; la dispensa italiana e l’eventuale inglese precedente sono conservate.

La frequenza era segnalata dall'utente; la causa è ora riprodotta su una risposta reale.
L'[indagine del 19 ottobre](../quality/integrita-eng-indagine-2026-10-19.md)
conferma sette rifiuti nei log locali. La prosecuzione con un solo tentativo
Gemini autorizzato ha riprodotto il rifiuto sulla lezione più recente:
traduzione di parole dentro quattro formule LaTeX e omissione di un riferimento
matematico ripetuto. Prompt reso esplicito e diagnosi distinta per sezione e
componente, senza allentare la validazione. Il solo prompt non è bastato:
le prove successive hanno mostrato anche un confine copiato due volte e
ancora una ripetizione matematica omessa. D-0355 adotta quindi la traduzione
dei soli frammenti di prosa con risposta JSON obbligatoria e ricostruzione
locale di formule, codice e spazi, mantenendo il documento completo come
contesto in un'unica richiesta. Due lezioni reali da 40 e 36 sezioni hanno
superato il controllo al primo tentativo con la correzione finale; i casi
incompleti o alterati restano rifiutati. Nessuna nuova traduzione è stata
scritta nella libreria durante i collaudi. Installer aggiornato su richiesta
esplicita in D-0356, senza installazione automatica.

Nuova segnalazione dopo l'installazione: errore **sezione 5; formule**. La
versione installata è stata verificata identica al pacchetto aggiornato.
Un nuovo tentativo acquisito ha riprodotto il rifiuto nelle sezioni 7 e 11:
il modello aveva copiato tre formule display dei blocchi protetti nella prosa.
D-0357 rimuove soltanto copie aggiuntive byte per byte identiche a formule
conservate nella stessa sezione, su righe autonome, senza svuotare frammenti.
Tutte le occorrenze originali restano reinserite e il risultato deve superare
il controllo finale. Il replay reale passa; formule modificate, nuove,
provenienti da altre sezioni o inserite nella prosa restano rifiutate.
Nuova generazione bloccata dalla quota della chiave: casella riaperta per
il ricollaudo nell'app, senza attribuire automaticamente alla copia display
la causa della risposta originale della sezione 5, non disponibile per replay.
Setup aggiornato con D-0357 disponibile in D-0358, senza installazione
automatica; il ricollaudo online resta aperto per il blocco quota.
Riutilizzare i controlli e le ricerche della voce 13 (D-0293), la diagnosi ENG
della voce 20 e [il relativo report](../quality/versioni-eng-diagnosi-2026-10-15.md),
oltre ai test di integrità esistenti. Distinguere differenze legittime di titoli
tradotti o rinominati (D-0349), sintassi Markdown equivalente, formule, codice,
riquadri, troncamenti e allineamento delle sezioni: sono ipotesi da verificare,
non cause già dimostrate.

Riprodurre prima con fixture sintetiche; eventuale ispezione della lezione
reale deve restare locale, senza riportarne testo o identificativi nei documenti
versionati o nei log diagnostici. Conservare sempre italiano e inglese precedente;
non aggirare semplicemente la validazione per far passare il salvataggio.
Documentare causa, correzione e regressioni. Eventuali nuove chiamate AI devono
restare esplicite e tracciabili: questa raccolta non avvia traduzioni.

## Nota sulla classificazione

Le otto richieste originali sono tutte conservate. L’esportazione PDF e la
compattazione Mermaid sono separate, perciò il documento contiene nove voci.
Il vocabolario distingue ciò che risulta già implementato dal supporto per frasi
ancora da valutare. Priorità e soluzioni definitive saranno decise quando verrà
avviata ciascuna attività. Le aggiunte del 14 ottobre sono sette nuove voci
(10–16), divise tra semplici e difficili; il PS sul cambio lingua è incluso
nella voce 15 perché riguarda lo stesso problema.
La successiva voce 17 conserva il timer sul watch e la ricerca dedicata;
non estende automaticamente la coda di implementazione concordata.
Le quattro aggiunte del 15 ottobre sono le voci 18–21: due semplici e due da
approfondire, fuori dalla coda LISTA_ORDINE esistente. Stato aggiornato nelle
singole caselle e nel resoconto della revisione iterativa.
Le successive voci 22–25 conservano le richieste di unificare il vocabolario,
spostare la configurazione di traduttore e musica nelle Impostazioni e rendere
la musica controllabile anche fuori dal Focus, oltre a mostrare la selezione
slide soltanto durante la composizione di una domanda;
sono fuori dalla coda esistente e sono state completate in D-0323–D-0325.
Le dodici aggiunte del 16 ottobre sono le voci 26–37: quattro semplici
(inclusa la domanda sui modelli già risposta) e otto complesse/da approfondire.
Le undici attività future restano aperte e sono state aggiunte alle posizioni
13–23 della coda in D-0327, mantenendo invariate le dodici posizioni precedenti.

## Appendice musicale — link e tracce forniti dall’utente

Aggiornamento del 13 ottobre 2026. Questi dati sono trascritti dal messaggio
dell’utente, senza verifica dei video o dei metadati online. Conservare i titoli
originali, inclusi quelli giapponesi e coreani; valutare titoli italiani affiancati
agli originali («magari tradotte in italiano»).

### Requisiti aggiuntivi da approfondire

- [ ] Supportare tutti e sei i link riportati sotto come casi per la futura funzione musicale.
- [ ] Consentire di scegliere una o più canzoni contenute in un singolo video, per ascoltarle e scaricarle separatamente.
- [ ] Usare i timestamp forniti o i capitoli disponibili, permettendo di correggere titoli e confini delle tracce.
- [ ] Trattare i parametri `list`, `start_radio`, `index`, `t` e `pp` senza perdere l’identità del video: una compilation interna al video è distinta dalla playlist/radio YouTube indicata nell’URL.
- [ ] Valutare la traduzione in italiano dei titoli, mantenendo sempre l’originale e rendendo esplicite eventuali chiamate AI.

Per la suddivisione proposta, l’inizio del brano successivo determina la fine
del precedente. La fine dell’ultima traccia va ricavata dalla durata effettiva del
video, non fornita nel messaggio. Scelta tecnica, precisione dei tagli e modalità
di download restano da valutare insieme alla voce 5; nessun audio è stato scaricato.

### 1. Musica Classica per Studiare — `mdJU5ogrPMY`

[Link completo fornito](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&start_radio=1).
I collegamenti delle tracce conservano `list=RDmdJU5ogrPMY` e `index=1`;
due includono anche `pp=0gcJCWMAwfN6Pr3D`, come nel messaggio originale.

| Inizio | Brano |
| --- | --- |
| [0:00:00](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1) | Satie — Trois gymnopédies (Arr. for String Orchestra by M. Naughtin): No. 1, Lent et douloureux |
| [0:03:33](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=213s) | Satie — Trois gymnopédies (Arr. for String Orchestra by M. Naughtin): No. 2, Lent et triste |
| [0:06:31](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=391s) | Satie — Trois gymnopédies (Arr. for String Orchestra by M. Naughtin): No. 3, Lent et grave |
| [0:09:15](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=555s) | Schubert — Schwanengesang, D. 957: Ständchen (Serenade) |
| [0:13:24](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=804s) | Fauré — Shylock Suite, Op. 57: No. 5, Nocturne |
| [0:16:32](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=992s) | Rachmaninoff — Rhapsody on a Theme of Paganini, Op. 43: Variation XVIII. Andante cantabile |
| [0:19:52](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=1192s) | Grieg (arr. Naughtin) — Peer Gynt Suite No. 1, Op. 46: Morning Mood |
| [0:23:13](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=1393s) | Bach — Cantata, BWV 147: Jesu, Joy of Man’s Desiring |
| [0:27:30](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=1650s) | Bach-Gounod — Ave Maria, CG 89a |
| [0:32:14](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=1934s&pp=0gcJCWMAwfN6Pr3D) | Bach — Orchestral Suite No. 3 in D Major, BWV 1068: II. Air on the G String |
| [0:38:03](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=2283s) | Dvořák — Symphony No. 9, Op. 95 “From the New World”: II. Largo |
| [0:45:47](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=2747s) | Arensky — Suite No. 3, Op. 33: Theme. Andante |
| [0:47:14](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=2834s) | Schumann — Album für die Jugend, Op. 68: No. 40, Nordisches Lied. Gruß an G |
| [0:49:17](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=2957s&pp=0gcJCWMAwfN6Pr3D) | Dvořák — Serenade for Strings in E Major, Op. 22: I. Moderato |
| [0:54:35](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=3275s) | Dvořák — Serenade for Strings in E Major, Op. 22: II. Minuet. Allegro con moto - Trio |
| [1:01:47](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=3707s) | Sibelius — Suite for Violin and String Orchestra, JS 185 (Live): I. Country Scenery |
| [1:04:08](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=3848s&pp=0gcJCWMAwfN6Pr3D) | Sibelius — Suite for Violin and String Orchestra, JS 185 (Live): II. Evening in Spring |
| [1:08:36](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=4116s) | Tchaikovsky — Serenade for Strings, Op. 48: II. Valse |
| [1:12:24](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=4344s) | Tchaikovsky — String Quartet No. 1, Op. 11: II. Andante Cantabile (Arr. for String Orchestra) |
| [1:18:59](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=4739s) | Saint-Saëns — The Carnival of the Animals: XIII, The Swan * |
| [1:22:22](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=4942s) | Massenet — Thaïs, DO 24, Act II: “Méditation” (Arr. for Cello and String Orchestra – Live) ** |
| [1:28:23](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=5303s) | Tchaikovsky — 6 Pieces, Op. 51: No. Valse sentimentale. Tempo di Valse |
| [1:30:29](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=5429s) | Tchaikovsky — The Seasons, Op. 37: No. 10, October. Autumn Song |
| [1:34:13](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=5653s) | Tchaikovsky — 6 Pieces, Op. 19: No. 4, Nocturne. Andante sentimentale |
| [1:38:01](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=5881s) | Piazzolla — Ave Maria (Arr. for Cello and Piano by John Glanes Mortimer) |
| [1:42:31](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=6151s) | Piazzolla — Oblivion (Arr. for Cello and Piano by Fulvia Mancini) |
| [1:45:58](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=6358s) | De Falla — Siete Canciones Populares Españolas: No. 5, Nana (Arr. for Cello and Piano by Maurice Maréchal) |
| [1:48:10](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=6490s&pp=0gcJCWMAwfN6Pr3D) | Beethoven — Piano Concerto No. 3 in C Minor, Op. 37: II. Largo |
| [1:57:47](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=7067s) | Beethoven — Piano Concerto No. 1 in C Major, Op. 15: II. Largo |
| [2:07:40](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=7660s) | Brahms — Piano Concerto No. 1, Op. 15: II. Adagio |
| [2:20:40](https://www.youtube.com/watch?v=mdJU5ogrPMY&list=RDmdJU5ogrPMY&index=1&t=8440s) | Mozart — Piano Concerto No. 21 in C Major, K. 467: II. Andante |

Crediti riportati dall’utente, conservati senza aggiungere attribuzioni mancanti:

- Metamorphose String Orchestra, Pavel Lyubomudrov.
- `*` Mikael Samsonov; `**` Nike Hutchisson.
- Fulvia Mancini, Benjamin Engeli (riportati dopo De Falla).
- Orchestra da Camera Fiorentina, Giuseppe Lanzetta, Bruno Canino (riportati dopo i concerti Beethoven).
- Brahms: Metamorphose String Orchestra, Pavel Lyubomudrov, Denis Linnik.
- Mozart: Orchestra da Camera Fiorentina, Giuseppe Lanzetta, Jörg Demus.

Il titolo Schumann termina con «Gruß an G» e quello Tchaikovsky a 1:28:23
riporta «No. Valse sentimentale» senza numero: conservati come forniti,
da controllare quando si importeranno i metadati.

### 2. Video `VB0xl9tem9o`

[Link completo fornito](https://www.youtube.com/watch?v=VB0xl9tem9o&list=RDVB0xl9tem9o&start_radio=1).
Nessun elenco di tracce o titolo fornito: da acquisire o inserire in futuro.

### 3. Video `7gtIh5dF9Xk`

[Link fornito](https://www.youtube.com/watch?v=7gtIh5dF9Xk).
Nessun elenco di tracce o titolo fornito: da acquisire o inserire in futuro.

### 4. Video `7XPGU7dmZXg`

[Link fornito](https://www.youtube.com/watch?v=7XPGU7dmZXg).
Richiesta opzionale: titoli tradotti in italiano, affiancati agli originali.

| Inizio | Titolo originale |
| --- | --- |
| [00:00](https://www.youtube.com/watch?v=7XPGU7dmZXg) | Nebula Mirage |
| [02:36](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=156s) | 銀河の旋律 |
| [05:05](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=305s) | 별들의 속삭임 |
| [08:02](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=482s) | Orbiting Through Time |
| [10:11](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=611s) | 星屑の彼方 |
| [13:03](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=783s) | 우주를 떠나는 순간 |
| [16:20](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=980s) | Celestial Drift |
| [18:37](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1117s) | 星影の奇跡 |
| [20:19](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1219s) | 별빛을 가르는 길 |
| [24:17](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1457s) | Eclipsing Stars |
| [27:34](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1654s) | 夢見る銀河 |
| [30:10](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1810s) | 빛의 끝에서 |
| [32:11](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=1931s) | Waltz of the Comet |
| [34:18](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2058s) | 星屑に浮かぶ夢 |
| [36:18](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2178s) | 빛나는 하늘 |
| [39:19](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2359s) | Echoes from the Void |
| [40:54](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2454s) | 星座の誓い |
| [42:10](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2530s) | 미지의 별 |
| [45:41](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2741s) | Lunar Serenade |
| [47:18](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2838s) | 星の旋回 |
| [48:54](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=2934s) | 우주의 문을 열다 |
| [52:10](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=3130s) | The Silent Nebula |
| [55:12](https://www.youtube.com/watch?v=7XPGU7dmZXg&t=3312s) | /no stars |

### 5. Video `l-2hOKIrIyI`

[Link fornito](https://www.youtube.com/watch?v=l-2hOKIrIyI).
Nessun elenco di tracce o titolo fornito: da acquisire o inserire in futuro.

### 6. Video `_B4NpBJIKq0`

[Link fornito](https://www.youtube.com/watch?v=_B4NpBJIKq0).
Nessun elenco di tracce o titolo fornito: da acquisire o inserire in futuro.

## Implementazione delle risposte del 15 ottobre

[Scelte esatte e avanzamento](implementazione-scelte-2026-10-15.md),
[guida delle funzioni e limiti](funzioni-approvate-2026-10-15.md).
ENG automatico attivato quando la preferenza import è abilitata (D-0305);
corretta anche la doppia barra in Focus. Per la voce 20 restano distinguibili
gli eventuali errori delle pipeline personali storiche, non rieseguite.

Aggiornamento diagnostico voce 43 — D-0359: nuovo rifiuto dei frammenti
confermato nella versione installata D-0358. Aggiunti dettagli di errore
sanitizzati e 9 regressioni, 609 test passati. Nuova generazione sulla stessa
fonte e replay riusciti dopo una quota esaurita sulla prima chiave; risposta
originaria del rifiuto non acquisita, nessuna causa attribuita senza prova.
La casella di correzione/collaudo e la posizione 29 restano aperte.

Il successivo run diagnostico scade per timeout senza risposta acquisita.
Installer diagnostico D-0360 disponibile; nessuna causa del nuovo rifiuto
dichiarata risolta e nessun salvataggio delle prove nella libreria.

Ripresa successiva D-0364: verificato il falso rifiuto delle etichette sulle
frecce Mermaid con la risposta reale salvata da Gemini. Completata la gestione
delle quote legacy, senza inventare progetti indipendenti, ed esclusi i Lite
dalle alternative automatiche ENG. Tre nuove regressioni prima rosse, poi
615 test tutti verdi. Cinque replay accettati; nuovo collaudo online autorizzato
da 40 sezioni superato al primo invio del run con il pool, con 244 contenuti
protetti identici. La precedente prova aveva ricevuto HTTP 503. Dettagli e
limiti nel report di indagine; nessun risultato scritto in libreria. Le caselle
sono ora allineate all'implementazione e ai collaudi; nessuna altra voce avviata.
