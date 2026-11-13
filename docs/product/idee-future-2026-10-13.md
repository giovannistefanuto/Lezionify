# Idee e modifiche future — attività residue

Lista ripulita e aggiornata il 13 novembre 2026: restano **14 attività aperte operative**
e **7 sospese**, con numeri delle voci e posizioni originali invariati.
La prima attività operativa resta la **voce 7**, posizione 22.

Le attività concluse, i precedenti ordini, le due voci ritirate (114 e 115)
e tutti gli aggiornamenti storici sono conservati nel
[backup integrale prima della pulizia](idee-future-backup-2026-11-13.md).
Il backup conserva anche il contesto delle attività residue: è una fotografia
storica, mentre questo file è la lista attiva. Nessuno stato di completamento
è stato cambiato durante la pulizia.

## Coda LISTA_ORDINE

Ogni invocazione di `LISTA_ORDINE` autorizza una sola attività: la prima
casella aperta nell'ordine seguente. Leggere descrizione completa, decisioni
successive e [guida alle skill](guida-skill-codex.md), come previsto in
`AGENTS.md`. Un blocco non autorizza a saltare la voce. Aggiornare lo stato
soltanto dopo implementazione e verifiche pertinenti.

| Ordine e stato | Attività | Voce | Difficoltà stimata e motivo |
| --- | --- | --- | --- |
| 22. [ ] | Collaudi residui del traduttore offline | 7 | Media: prove tecniche, formule/codice e glossario; funzione base già integrata. |
| 27. [ ] | Anticipazione automatica Mermaid → iPad → nota Notability corrente | 63 | Riattivata il 12 novembre: soglie 5 minuti/10 secondi, PNG iCloud e registro implementati; prova finale sulla nota personale ancora aperta. |
| 30. [ ] | Completare transizioni canzone → canzone / canzone → suono | 38 | Alta e vincolata ai player: dissolvenze offline già implementate, limiti D-0370. |
| 36. [ ] | RAG: valutare le risposte complete sulle fonti reali | 90 | Medio/alta: giudizi annotati, budget AI tracciato e prove ripetute. |
| 37. [ ] | RAG: verificare il supporto delle singole affermazioni | 91 | Alta: citazioni pertinenti, contraddizioni e provenienza senza false garanzie. |
| 38. [ ] | RAG: calibrare ranking, deduplicazione e astensione | 92 | Alta: confronti sul benchmark e qualità dei primi risultati, non sola recall. |
| 68. [ ] | Indagare e collaudare le difficoltà della traduzione delle dispense ITA→ENG | 122 | Alta e incerta: diagnosi completa dei fallimenti, regressioni, qualità delle traduzioni e limiti del provider. |
| 70. [ ] | Stima di studio: grassetto, posizione e note | 124 | Da valutare sui dati: peso del grassetto, posizione percentuale e lettura rapida di Nota/Note, confrontati con la stima attuale. |
| 74. [ ] | Revisione complessiva dell'interfaccia | 128 | Medio/alta e ampia: inventario dei flussi, verifica visiva e correzioni con regressioni. |
| 75. [ ] | Controllo aggiornamenti GitHub all'avvio e pulsante Aggiorna | 129 | Alta: versionamento, distribuzione e aggiornamento recuperabile. |
| 77. [ ] | Intervallo statistico del tempo restante calibrato sullo storico | 131 | D-0482: raccolta prospettica e intervalli implementati/collaudati; resta la calibrazione personale su almeno 20 lezioni confrontabili per fase, lingua e metodo. |
| 80. [ ] | Sezione Altre cose per materiali fuori dagli esami | 134 | Ampia: organizzazione e riuso dei flussi audio, video e dispense da definire. |
| 83. [ ] | Notifica Bluetooth animata in Focus per connessione cuffiette | 137 | Da verificare: eventi reali Windows e animazione non invasiva di 5 secondi. |

| 91. [ ] | Valutare chiavi API e modelli di altri provider | 145 | Da definire: operazioni supportate, credenziali, costi e compatibilità. |
| 92. [x] | Riepilogo settimanale in un box sotto Tempo per Materia | 146 | Separare il riepilogo mantenendo chiari periodo e confronto. |
| 93. [x] | Media per giorno della settimana in un box con grafico dedicato | 147 | Scegliere una rappresentazione leggibile con denominatori espliciti. |
| 94. [x] | Settimane del grafico da lunedì a domenica | 148 | Sostituire le finestre mobili con settimane di calendario locali. |
| 95. [x] | Pagina Memo completa accessibile dal menu in alto a sinistra | 149 | Riorganizzare accesso, tag e contenuti preservando le scorciatoie. |
| 96. [x] | Tempo di studio mattutino e pomeridiano con soglia configurabile | 150 | Ripartire i crediti effettivi, anche a cavallo della soglia. |
| 97. [x] | Evidenziazione immediata al rilascio della selezione | 151 | Verificare parole, frasi, più righe e più paragrafi. |

**Aggiunte del 13 novembre dopo la pulizia:** sette richieste, voci 145–151,
posizioni 91–97, nell’ordine ricevuto. La prima voce operativa resta la 7.
Le voci 146–151 sono implementate; la voce 145 sulle API resta aperta.

## Archiviate per ora — attività sospese

Queste sette attività non sono completate né annullate e non vengono avviate
da `LISTA_ORDINE`. Riattivazione soltanto su richiesta esplicita dell’utente.
Le posizioni precedenti sono conservate per riferimento.

| Posizione precedente | Attività | Voce | Stato tecnico conservato |
| --- | --- | --- | --- |
| 18 | Ctrl / Ctrl+L e cerchio bianco attorno al mouse | 33 | Media incerta: test nativi positivi e cerchio spiegato; serve l'episodio personale storico. |
| 31 | Valutare limite YouTube di 30 minuti al giorno negli orari di studio | 75 | Alta: strumento esterno e perimetro d'uso da concordare, affidabilità su PC da provare. |
| 32 | Timer pausa sul telefono | 32 | Alta: trasporto locale e avvisi affidabili a schermo bloccato. |
| 33 | Audio nel Q&A e registrazione dal telefono | 31 | Alta: acquisizione, trasferimento, allegati e invio AI esplicito. |
| 34 | Timer pausa su Amazfit Balance originale | 17 | Molto alta/bloccata sul trasporto: prototipo presente, collegamento hardware non pronto. |
| 52 | Comandi delle cuffiette EarFun per musica e suoni | 106 | Media: integrazione comandi multimediali e prova hardware. |
| 56 | Ordine modelli per schemi e confronto Gemini 3.8 / 4 | 110 | Media: benchmark reale con quote, tempi e costi tracciati. |

## Descrizioni delle attività operative

### 7. Vocabolario offline rapido e supporto offline per frasi

**Prova personale dell'11 novembre:** l'utente conferma il funzionamento
senza internet e riporta questi esiti, conservati come risultati osservati:

- `collusion`: «collusione»; `policy`: «politica, prassi; politica; polizza»;
  `reward`: «ricompensa; taglia, ricompensa».
- Per `overfitting` riporta lingua non riconosciuta, direzione mantenuta,
  nessuna voce trovata e passaggio al traduttore offline.
- «L'agente sceglie un'azione secondo la sua politica.»
- «La ricompensa viene osservata dopo il passaggio allo stato successivo.»
- «Il sovraadattamento si verifica quando un modello si adatta ai dati di
  allenamento troppo da vicino.»
- «Politics associates each state with a distribution of odds on stocks.»
- «The expected value of the reward depends on the policy adopted.»
- «Se x > 0, restituire f(x); altrimenti restituire 0.»

La frase con «Politics», «odds» e «stocks» segnala un errore di terminologia
nel contesto RL. Gli input originali e l'associazione completa input/output
non sono stati riportati: ricostruirli prima di attribuire cause o confermare
protezione di formule e codice. Restano da verificare glossario tecnico,
direzione/rilevamento lingua e qualità delle frasi. Nessuna correzione avviata.

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

### 63. Mermaid dalla dispensa alla nota corrente di Notability su iPad

**Stato attuale: riattivata su richiesta diretta il 12 novembre 2026. Implementata l'anticipazione automatica, collaudo personale finale ancora aperto.**

- [x] Esaminare l'intera catena di componenti, strumenti e possibili installazioni per trasferire l'immagine di uno schema Mermaid da Lezionify all'iPad.
- [x] Confrontare i percorsi per inserirla nella nota Notability su cui si sta già lavorando, riducendo passaggi e tempo totale.
- [ ] Eseguire un pilota del percorso scelto, distinguendo esportazione, trasferimento e inserimento nella nota corrente.

L'utente riferisce arrivo manuale entro circa 20 secondi e autorizza esportazioni
automatiche su Foto iCloud. In Focus, dopo 300 tick effettivi sulla lezione e
10 sul blocco corrente (D-0506), vengono esportati gli schemi dopo il blocco successivo.
Registro locale senza duplicati per lezione/lingua/sorgente, PNG chiaro e
interruttore nelle impostazioni. Nessuna attestazione di consegna sull'iPad.
Uso, prove e limiti nel [piano aggiornato](condivisione-mermaid-ipad-2026-11-12.md).

Partire dalle capacità di esportazione/copia effettivamente disponibili e dagli
strumenti già presenti sui dispositivi. Valutare qualità e formato dell'immagine,
sfondo, leggibilità, connessione necessaria, costi e passaggi manuali; verificare
le capacità reali di Notability senza promettere accesso automatico alla nota
aperta. Confrontare prima alternative locali e rendere espliciti eventuali
servizi cloud e materiali trasferiti. La ricerca non autorizza automaticamente
installazioni, account, abbonamenti o sincronizzazione dei dati di studio.

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

### 90. RAG: valutare le risposte complete sulle fonti reali

Parzialmente implementata; validazione qualitativa residua aperta in D-0400–D-0403. [Report del 23 ottobre](rag-completamento-2026-10-23.md).

Ripresa D-0406 con gli otto esempi dell'utente: otto casi sintetici e 32
varianti di recupero sui quattro corsi. Queste prove non sono nuove valutazioni
delle risposte generate: lo stato resta parziale.
[Domande, risultati e limiti](rag-domande-studio-2026-10-23.md).

- [x] Estendere il benchmark 89 dalla ricerca alla risposta finale: domande,
  fonti, passaggi effettivamente consegnati e risposta attesa con criteri di giudizio.
- [ ] Valutare separatamente correttezza, completezza, pertinenza, supporto delle
  affermazioni, gestione delle contraddizioni e dichiarazione delle lacune.
- [x] Eseguire prove Gemini esplicite e tracciate con budget di invii/costo/tempo,
  profili isolati e più esecuzioni; non confondere timeout o quota con qualità.
- [ ] Conservare regressioni dei fallimenti reali; eventuali giudici AI devono
  essere confrontati con valutazioni umane e dichiarati fallibili.

**Completamento:** confronto documentato e lettura delle citazioni su un insieme
annotato; prove simulate, singola risposta RL e sola copertura non bastano.
Riusare la voce 9 per la valutazione generale dei modelli Q&A: qui si verifica
specificamente l'intera catena della chat di corso con recupero delle fonti.

### 91. RAG: verificare il supporto delle singole affermazioni

Parzialmente implementata; validazione qualitativa residua aperta in D-0400–D-0403. [Report del 23 ottobre](rag-completamento-2026-10-23.md).

D-0406 aggiunge regole per obblighi d'esame, esercizi generati, cambiamenti di
ipotesi e un avviso locale sulle assenze globali attribuite al docente.
L'efficacia del giudizio semantico su risposte reali resta da validare.

- [x] Collegare le principali affermazioni della risposta ai passaggi pertinenti,
  distinguendo fonti del corso, deduzioni e integrazioni generali.
- [x] Gestire citazione esistente ma irrilevante, attribuzione alla lezione
  sbagliata, ipotesi omesse, conclusioni assolute e conflitti tra fonti.
- [x] Trattare trascrizione e relativa dispensa come stessa provenienza;
  verificare le attribuzioni al docente sulle fonti originali disponibili.
- [ ] Valutare un controllo semantico delle affermazioni sul benchmark 90,
  misurandone falsi rifiuti, errori non rilevati, latenza e costo. Rendere visibili
  risultati parziali e incertezza senza etichettare la risposta come verità certificata.

**Completamento:** regressioni per affermazioni non supportate e confronto con
giudizi annotati; l'appartenenza di un ID al prompt non equivale al supporto.

### 92. RAG: calibrare ranking, deduplicazione e astensione

Parzialmente implementata; validazione qualitativa residua aperta in D-0400–D-0403. [Report del 23 ottobre](rag-completamento-2026-10-23.md).

D-0406 corregge vincoli ereditati nelle richieste trasversali, occupazione dei
risultati da più dispense della stessa lezione e perdita di comunicazioni
d'esame in inglese. Nuovi otto casi e precedenti 22 con recall@8 1,000;
questi campioni sintetici non chiudono la calibrazione su casi indipendenti.

- [x] Confrontare lessicale, semantico e fusione attuali sul benchmark 89,
  calibrando soglie, numero di candidati e diversificazione per lezione/provenienza.
- [ ] Misurare ed eliminare ridondanze da sovrapposizioni e derivazioni senza
  cancellare differenze sostanziali o evidenze contraddittorie.
- [ ] Valutare un reranker locale e l'espansione gerarchica del contesto;
  adottarli solo se migliorano i casi di verifica con costo accettabile.
- [ ] Verificare domande senza risposta e passaggi solo genericamente affini,
  affinché il recupero semantico non forzi risposte su evidenza insufficiente.

**Completamento:** miglioramento dei primi risultati e dell'astensione sul
campione indipendente, con confronto di latenza/memoria e assenza di regressioni
su formule e vincoli. Nessun nuovo modello o dipendenza è già approvato dalla voce.

### 122. Indagare e collaudare le difficoltà della traduzione ITA→ENG

**11 novembre:** riprodotti 10 rifiuti su 13 tentativi conservati e individuato
anche disallineamento semantico non rilevabile dal solo conteggio. Il percorso
ora traduce sezioni intere con segnaposto verificati, gruppi limitati e una
passata correttiva. Prova reale positiva sulla sezione critica confrontata con
la versione corretta; 855 unit e build passati, ricostruzione locale su 53
dispense. **Resta aperta:** collaudo completo del percorso finale su documenti
reali ostacolato da 503/timeout. Nessun nuovo tasso di successo dichiarato.
[Diagnosi, prove e limiti](../quality/pipeline-eng-2026-11-11.md).

- [ ] Capire con evidenze perché la traduzione delle dispense italiane in inglese fallisce o risulta difficile, distinguendo le cause effettive senza attribuirle anticipatamente a un solo componente.
- [ ] Riprodurre e verificare sistematicamente le categorie di errore individuate, correggere i difetti confermati e aggiungere collaudi di regressione pertinenti; documentare i limiti ancora aperti.

Riutilizzare la voce 20, la diagnosi storica della voce 43, `traduzione-dispense.md`, le prove e i tentativi locali disponibili. Esaminare preparazione e dimensione della richiesta, modello e provider, quote e timeout, risposte troncate o malformate, ricostruzione, integrità strutturale, fedeltà e completezza della prosa, salvataggio e prosecuzione della coda. Distinguere errori reali da falsi rifiuti, senza indebolire i controlli o presentare tentativi parziali come traduzioni valide. D-0455 e D-0458 conservano rispettivamente le risposte disponibili e la prosecuzione della coda ENG; nessuno dei due dimostra che la causa originaria sia risolta.

Usare casi sintetici riproducibili e, se disponibili e autorizzati, evidenze personali senza pubblicare contenuti o dati sensibili. Eventuali invii AI devono essere espliciti e tracciabili. Riportare copertura, esiti, costi o quote delle prove e limiti: non promettere di escludere ogni bug possibile. Questa voce approfondisce l'affidabilità generale; la voce 20 conserva la verifica personale residua delle versioni mancanti.

### 124. Migliorare la stima del tempo con grassetto, posizione e note

- [ ] Valutare se la quantità o la proporzione di parole in grassetto nel paragrafo aiuta a stimare il tempo di studio: l'utente ipotizza che un paragrafo con molto grassetto possa richiedere anche il doppio del tempo.
- [ ] Valutare la posizione percentuale nella pagina: l'utente ipotizza una maggiore attenzione all'inizio e minore verso la fine, eventualmente approssimabile con una retta decrescente.
- [ ] Considerare la lettura più rapida dei blocchi etichettati «ℹ️ Nota» e «Note» in inglese.

Collegarsi alla stima esistente della voce 113. Trattare pesi, raddoppio e
andamento lineare come ipotesi da verificare sui dati personali disponibili,
non come coefficienti già accertati. Definire la posizione rispetto alla
pagina o al documento dopo aver esaminato l'interfaccia e i dati; confrontare
la stima attuale e le alternative su campioni separati, gestendo dati scarsi,
formattazione e note in entrambe le lingue. Non dedurre l'attenzione come un
fatto certo dalla sola posizione.

### 128. Verificare e ottimizzare l'interfaccia nel suo insieme

- [ ] Rivedere i flussi e le schermate principali: gerarchia, distrazioni,
  densità, leggibilità, coerenza dei controlli, tastiera, zoom e finestre piccole.
- Partire dal report UX/UI del 21 ottobre e dalle correzioni già concluse;
  verificare lo stato attuale con evidenze visive e dare priorità ai problemi
  concreti prima delle modifiche. La nuova richiesta è più ampia dei rilievi storici.

### 129. Controllare gli aggiornamenti GitHub e aggiornare con un pulsante

- [ ] All'apertura di Lezionify controllare se esiste una nuova versione
  distribuita su GitHub, comunicarlo e offrire il pulsante per aggiornare.
- Separare versione installata, release e semplici commit dei sorgenti;
  definire versionamento, artefatti, integrità, chiusura/riavvio e recupero
  dopo errori. Conservare archivio locale e impostazioni; rete assente e
  mancato aggiornamento non devono impedire l'uso dell'app.
- Non scegliere ora librerie, servizi o modalità di installazione.

### 131. Quantificare statisticamente l'incertezza del tempo restante

- [ ] Affiancare alla stima un intervallo in minuti, per esempio
  «195 ± 20 min» o «3 ± 2 min», con livello percentuale dichiarato e
  verificato sullo storico; non ricavare l'affidabilità dalla sola distanza
  dalla fine della dispensa.
- Registrare localmente previsioni intermedie ed esiti effettivi comparabili,
  escludendo le attività della voce 127. Confrontare gli errori a inizio,
  metà e fine lezione e verificare se cambiano davvero con la posizione.
- Definire fine effettiva, riletture e sessioni interrotte, separazione dei
  dati di calibrazione/verifica, quantità minima e copertura degli intervalli.
  Con dati insufficienti dichiararlo, senza inventare percentuali.
- Il modello attuale mostra un errore medio per blocco o «incertezza alta»:
  non è ancora un intervallo calibrato sul tempo residuo della lezione.
  Coordinare con la voce 124, che riguarda i fattori della previsione puntuale.
- **Stato D-0482:** implementati raccolta prospettica locale, completamento
  confermato, ripresa e invalidazione; quantile nominale 90%, almeno 20 lezioni
  distinte per fase/lingua/metodo e copertura successiva mostrata con numerosità.
  Test matematici e percorsi Electron passati. Il vecchio storico non permette
  di ricostruire le previsioni originarie: **restano da raccogliere gli esiti
  personali e verificarne la copertura**. Nessuna percentuale inventata.

### 134. Sezione Altre cose

- [ ] Valutare una sezione accanto agli esami attuali e archiviati per
  materiali che non appartengono a quegli esami: audio da trascrivere,
  lezioni di corsi seguiti per curiosità e lavori fatti per altre persone.
- Consentire i flussi utili per ottenere trascrizioni e dispense da audio,
  video o trascrizioni esistenti; definire organizzazione e dettaglio del
  flusso rispettando la conservazione delle fonti e il modello local-first.

### 137. Notifica Bluetooth animata per le cuffiette in Focus

- [ ] Quando le cuffiette si connettono effettivamente al PC durante la
  modalità Focus, mostrare un simbolo Bluetooth per confermare la connessione
  senza obbligare l'utente a uscire dalla lettura.
- Il simbolo parte dal basso dello schermo, sale come un palloncino, rallenta,
  si ferma e scompare gradualmente. L'intera sequenza dura **5 secondi**,
  senza rubare il focus o richiedere interazione.
- Verificare come rilevare la connessione reale delle cuffiette su Windows,
  distinguendola da semplice associazione o Bluetooth attivo. Definire posizione,
  gestione delle riconnessioni e movimento ridotto per accessibilità.
- Coordinare con la voce 106 sui comandi EarFun, che resta archiviata:
  la notifica è una richiesta distinta e non ne riattiva l'integrazione.

## Nuove richieste del 13 novembre 2026

### 145. Valutare il supporto di chiavi API e modelli di altri provider

- [ ] Valutare la possibilità di configurare, oltre alle chiavi già supportate,
  chiavi API di altri provider, per esempio OpenAI e relativi modelli, o altre
  alternative da individuare.
- Chiarire per quali operazioni usarli: domande contestuali, chat di corso,
  generazione delle dispense, traduzione o trascrizione. Valutare compatibilità,
  qualità, limiti e costi prima di scegliere provider e modelli.
- Distinguere l’uso di un servizio tramite API dall’accesso alla sua applicazione
  di chat o a un eventuale abbonamento: verificare requisiti e condizioni.
- Prevedere configurazione e selezione comprensibili, credenziali protette,
  errori leggibili e chiamate esplicite e tracciabili. Conservare fonti locali;
  qualsiasi invio o passaggio a un altro provider deve essere riconoscibile.
- La richiesta apre una valutazione: provider, modelli e ambito definitivo
  restano da concordare prima dell’integrazione.

### 146. Riepilogo settimanale in un box separato sotto Tempo per Materia

- [x] Spostare «Questa settimana · finora» e «Media · 3 settimane precedenti»
  dal contenitore attuale a un box dedicato, collocato subito sotto il box
  **Tempo per Materia**.
- Mantenere insieme i due valori, con etichette, unità e periodo chiari;
  «8 h 15 min» e «8 h 57 min» sono esempi dell’interfaccia osservata,
  non valori da fissare.
- Coordinare i confini settimanali con la voce 148 e distinguere la settimana
  corrente incompleta dalla media delle settimane precedenti. Gestire storico
  insufficiente e assenza di studio senza inventare dati.
- Verificare gerarchia visiva, temi, finestre strette e zoom. Questa richiesta
  modifica la collocazione della funzione già conclusa nella voce 140.

### 147. Media per giorno della settimana con grafico e box dedicati

- [x] Riorganizzare **Media per giorno della settimana** in un box autonomo,
  con un grafico che renda immediato il confronto da lunedì a domenica.
- Valutare quale rappresentazione spieghi meglio i dati, per esempio barre
  giornaliere; scegliere il tipo di grafico dopo aver confrontato leggibilità,
  spazio e comprensione. Il tipo non è ancora deciso.
- Esplicitare periodo di riferimento, unità, numero di giornate considerate
  e denominatore della media; distinguere zero, dato mancante e giorno corrente
  incompleto. Rendere i valori consultabili anche senza dipendere dal colore
  o dal solo passaggio del mouse.
- Coordinare filtri e fonte dei crediti con gli altri riepiloghi. È una nuova
  revisione della presentazione introdotta con la voce 143.

### 148. Grafico delle settimane da lunedì a domenica

- [x] Modificare il grafico oggi chiamato **Ultimi 7 giorni** affinché ciascun
  intervallo rappresenti una settimana di calendario da **lunedì a domenica**,
  invece di una finestra mobile che può andare da sabato a venerdì.
- La vista iniziale deve mostrare la settimana corrente; avanti e indietro
  devono spostarsi di una settimana di calendario, con date sempre visibili
  e possibilità di tornare a quella corrente.
- Adeguare titolo ed etichette alla nuova semantica. Trattare i giorni futuri
  della settimana corrente come non ancora trascorsi, distinguendoli dai giorni
  conclusi senza studio; usare il calendario locale e gestire cambio d’anno
  e ora legale.
- Allineare riepilogo settimanale e confronto della voce 146 agli stessi
  confini temporali. La richiesta sostituisce per questa vista la scelta
  delle finestre mobili adottata nelle voci 140 e 142.

### 149. Pagina Memo completa nel menu in alto a sinistra

- [x] Rimuovere il box **📝 Memo** dalla sua collocazione attuale e creare
  una pagina dedicata, completa e organizzata, con tutti i tag e i contenuti.
- Aggiungere l’accesso nel menu in alto a sinistra, nella zona del comando
  Log, con icona riconoscibile e scritta **Memo**. Definire la disposizione
  dei due accessi senza rendere irraggiungibili i log.
- Organizzare tag, gruppi e attività per consultazione e modifica, conservando
  dati esistenti e funzioni di creazione, modifica, copia e gestione dei tag.
- Mostrare le scorciatoie corrette accanto all’accesso o nel punto opportuno:
  nel codice attuale sono **Ctrl+M** e **Ctrl+P** (`useQuickCapture.ts`).
  Il testo originale «CTRL+ O +P+» va ricondotto a una dicitura chiara;
  un’eventuale richiesta di Ctrl+O deve essere chiarita prima di cambiare i tasti.
- Coordinare la pagina completa con il Memo rapido durante lo studio e in
  RIPETERE, mantenendo accessibilità da tastiera, gestione del focus e corretto
  conteggio del tempo. La richiesta estende le precedenti revisioni Memo.

### 150. Tempo di studio del mattino e del pomeriggio in La mia giornata

- [x] Aggiungere a **La mia giornata** un riepilogo del tempo studiato al
  mattino e al pomeriggio, scegliendo una collocazione leggibile nella vista.
- Usare **13:00** come orario iniziale di separazione, inteso come pausa pranzo,
  e permettere di modificarlo nelle Impostazioni.
- Esplicitare i due intervalli: da inizio giornata alla soglia per il mattino,
  dalla soglia a fine giornata per il pomeriggio, evitando sovrapposizioni.
- Calcolare i totali dai crediti effettivi, ripartendo le sessioni che attraversano
  la soglia; gestire pause, rettifiche, crediti manuali senza orario e dati
  mancanti senza attribuire arbitrariamente una fascia.
- Definire se una modifica della soglia ricalcola anche le giornate precedenti
  e mostrarne l’effetto. Il riepilogo deve restare coerente con il totale
  giornaliero e non modificare le fonti dello storico.

### 151. Evidenziatore immediato al rilascio della selezione

- [x] Verificare e correggere l’evidenziatore affinché, con la modalità attiva,
  il testo selezionato trascinando il mouse venga evidenziato immediatamente
  al rilascio, senza richiedere un clic o una conferma aggiuntivi.
- Collaudare selezione di una parola, una frase, più righe e più paragrafi,
  in entrambe le direzioni di trascinamento e con scorrimento durante la selezione.
- Controllare in particolare i confini tra paragrafi e le selezioni vicine
  a formule, link, riquadri o altri elementi del lettore; definire chiaramente
  eventuali limiti senza perdere porzioni di testo selezionate.
- Verificare persistenza dopo riapertura e riavvio, isolamento tra lezioni
  e lingue, sovrapposizione con evidenziazioni esistenti e sottolineature,
  e assenza di evidenziazioni quando la modalità è disattivata.
- Riprodurre il comportamento attuale prima di attribuire una causa e
  verificare i percorsi di lettura e Focus pertinenti. È un nuovo controllo
  della funzione già trattata nella voce 111.

## Descrizioni delle attività sospese

### 33. Ctrl+L seleziona la schermata ma non cambia lingua

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

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

Integrazione del 21 ottobre: l'utente segnala che premendo «Ctrl», che si
aspettava cambiasse lingua, compare un cerchio bianco intorno al mouse.
Distinguere Ctrl da solo dalla scorciatoia prevista **Ctrl+L**, verificando
quali tasti vengono effettivamente premuti. Controllare eventuali funzioni di
localizzazione del puntatore o scorciatoie di Windows e utilità installate,
senza attribuire loro la causa prima di riprodurre il caso. Riutilizzare la
diagnostica già predisposta e conservare la casella aperta; nessuna impostazione
di sistema viene modificata dalla sola registrazione della richiesta.

Diagnosi del 21 ottobre (D-0383): nel profilo reale FindMyMouse di PowerToys è
abilitato con `activation_method = 0`, cioè doppio Ctrl sinistro secondo il
sorgente Microsoft. Spiega il cerchio; nessuna impostazione esterna modificata.
Ctrl+L nativo in Electron passa di nuovo. L'episodio storico di vero Ctrl+L
senza cambio lingua non è acquisito: casella ancora aperta, senza scambiare
la spiegazione del cerchio per una correzione di quel diverso sintomo.
[Esiti, fonti e ripresa](interventi-2026-10-21.md#ctrl-cerchio-bianco-e-limite-residuo).

### 75. YouTube: valutare un limite di 30 minuti al giorno negli orari di studio

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

- [ ] Valutare uno strumento esterno che limiti l'uso di YouTube a **30 minuti al giorno**, anche sul computer, nelle fasce di studio specificate.

È una proposta di valutazione, senza integrazione o installazione già scelta.
Definire con l'utente orari, piattaforme/browser da coprire, conteggio condiviso
o per dispositivo, comportamento fuori fascia e distinzione fra video distraenti,
lezioni e sottofondo YouTube usato da Lezionify. Riusare i requisiti della musica
senza interrompere implicitamente uno strumento di studio autorizzato.

La valutazione deve confrontare copertura reale su PC, costi, privacy, permessi
e resistenza alle semplici riaperture del browser; una raccomandazione documentata
non equivale a un blocco installato e collaudato. Criteri: budget giornaliero,
reset del giorno, fasce oltre mezzanotte, avvisi e recupero/configurazione
consapevole. Non modificare automaticamente sistema operativo o account.

### 32. Timer della pausa sul telefono in tasca

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

- [ ] Valutare di trasferire dal Balance al telefono l'idea «mi distacco e vado in pausa», con un avviso sonoro alla scadenza mentre il telefono è in tasca.

Alternativa da valutare alla voce 17, senza cancellare la richiesta per il watch.
Riutilizzare ricerca e protocollo del prototipo in `prototypes/balance-pause/`.
Verificare sistema operativo del telefono, trasporto PC ↔ telefono, funzionamento
a schermo bloccato/in background, permessi e affidabilità del suono. Distinguere
avvio automatico del countdown dal rilevamento automatico dell'allontanamento,
che non è ancora un requisito definito. Conservare pausa 5/15/30 minuti e ripresa
esplicita dello studio; la scadenza non deve conteggiare automaticamente studio.

### 31. Domande audio nel Q&A e registrazione dal telefono

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

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

### 17. Timer pausa offline su Amazfit Balance originale

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

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

### 106. Comandi delle cuffiette EarFun

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

- [ ] Gestire pausa/ripresa con un tocco e prossimo suono/brano con due tocchi, nei limiti dei comandi effettivamente configurati nelle cuffie.

L'utente riferisce che i gesti funzionano già su PC e telefono: non assumere
che serva riattivarli. Verificare instradamento al player attivo, suoni offline,
Spotify e YouTube, disponibilità del comando successivo e prova con il modello
EarFun personale. Non inviare comandi contemporanei a più player.

### 110. Ordine dei modelli per gli schemi e disponibilità del 3.8

**Stato attuale: archiviata per ora dal 29 ottobre 2026, su richiesta utente. Esclusa da LISTA_ORDINE fino a riattivazione esplicita.**

- [ ] Documentare e testare l'ordine reale dei modelli usati per generare dispense/schemi, il momento in cui si raggiunge il 3.8 e il confronto con Gemini 4.

L'uscita di un modello nuovo non dimostra minore saturazione dei precedenti.
Distinguere fallback dell'archivio da Q&A e trascrizione; confrontare qualità,
latenza, errori, quote e costo con budget esplicito. Riutilizzare i benchmark
esistenti; non cambiare automaticamente modelli o preferenze durante l'indagine.

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
