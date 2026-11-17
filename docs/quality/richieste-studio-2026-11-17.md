# Ricerca, ragionamento Q&A e tempo di studio — 17 novembre 2026

Richiesta autonoma su cinque voci, con implementazione e release autorizzate.
La coda LISTA_ORDINE preesistente non viene eseguita né riordinata.

## Confronto con ciò che esisteva

| Richiesta | Stato trovato | Intervento |
| --- | --- | --- |
| Ricerca lezioni migliore del conteggio parole | Barra già presente con MiniSearch/BM25+, ma ranking perso nell'ordinamento per data; RAG di corso già distinto | Conservare ranking e aggiungere selettore Pertinenza/Data. Nessun servizio esterno o nuovo indice duplicato. |
| Q&A Pensa di più | Lunghezza, web e scelta modelli esistenti, nessun interruttore del ragionamento | Spunta esplicita, HIGH sui modelli verificati, separata da contesto, web e lunghezza. |
| Traduttore conta, Memo no | Memo già sospendeva; anche il traduttore veniva escluso | Accreditare traduzione, classificandola separatamente senza simulare lettura dei paragrafi. |
| Configurare timer/sveglie e scegliere musica non conta | Musica già esclusa; il popover timer non rilevato | Marcare il pannello aperto. La sola esecuzione del timer o riproduzione musicale non sospende lo studio. |
| Promemoria periodico esami | Date e countdown esistenti; nessuna cadenza periodica | Preferenza per corso, giorni/settimane, ricevute persistenti e notifiche silenziose. |

Le voci 152–156 estendono funzioni esistenti senza duplicarle. La ricerca con
fonti primarie e i riferimenti alle voci storiche sono nel
[documento dedicato](../research/ricerca-lezioni-e-qna-thinking-2026-11-17.md).

## Contratti e casi limite

- Ricerca: pertinenza durante una query, data decrescente senza query o con scelta
  esplicita; filtri corso/stato e corsi archiviati conservati. Risposte obsolete
  della ricerca restano scartate dal hook esistente. Prefisso, piccoli refusi,
  sostituzione/rimozione dall'indice e copertura di più termini verificati.
- Q&A: default normale; spunta inoltrata da UI/hook/preload/IPC al servizio.
  HIGH richiesto al modello effettivo, con riserve compatibili. Deep parte da
  3.5 Flash-Lite; con web rimangono solo le riserve compatibili anche con web.
  Nessun campo HIGH inviato a modelli non verificati. Prima attesa fino a 90 s,
  inattività e budget del tentativo invariati. Nessuna esposizione dei pensieri
  interni, verifica AI aggiuntiva o cambiamento implicito della lunghezza.
- Tempo: timer, stima e storico condividono la stessa esclusione. Traduzione
  accreditata senza avanzamento di lettura inventato; Memo, menu timer e scelta
  musica sospendono anche se il traduttore è aperto. Blocco schermo e altra
  finestra continuano a sospendere. Lo storico passato non viene riscritto.
- Esami: disattivati nei corsi precedenti, attivazione esplicita e cadenza intera
  1–365 giorni o 1–52 settimane. Date locali valide e calcolo per giorni di
  calendario, anche al cambio d'ora. Nessun avviso per corso archiviato,
  disattivato, eliminato o esame passato. Cambio data/cadenza rinnova il piano;
  ricevute impediscono duplicati dopo riavvio, polling concorrente e orologio
  arretrato. Dopo un'assenza un solo avviso per corso, senza arretrati multipli.
- Notifiche: ricevuta salvata prima della consegna; se il sistema operativo
  rifiuta la notifica, il messaggio resta nell'app. Una conferma di lettura
  fallita conserva il messaggio. Countdown dei messaggi in-app aggiornato al
  giorno corrente anche prima della cadenza successiva. Nessuna AI o rete per
  i promemoria; registro in `library/exam-reminders.json` separato dalle fonti.

## Evidenze e limiti

Test mirati in `examReminders.test.ts`, `searchRanking.test.ts`,
`qnaRequest.test.ts` e `courseArchive.test.ts`; scenari Electron in
`batchRequests.browser.tsx`, `lectureOrdering.browser.tsx`,
`studyTimingScenarios.browser.tsx` e `studyHistoryScenarios.browser.tsx`.
Schermate sintetiche locali per impostazioni esami, Q&A e storico.
Gate completo passato prima del confezionamento: **930 unit in 76 file,
40 Python e 41 Node**, inventario test, RAG offline, updater, Electron con
riavvio, contratto release, build, raccolte nell'app compilata e PDF reali.
Controlli mirati finali di tipo/lint e dei moduli studio/esami passati.
Nessun test saltato, rimosso o indebolito. Due aspettative storiche sono state
allineate ai requisiti: il traduttore ora accredita i cinque secondi osservati
anche nel test pausa, e il consenso web viene individuato per etichetta anziché
per posizione numerica dopo l'aggiunta della nuova spunta. Tutte le verifiche
su pausa, sospensione, ripresa, salvataggio e consenso web restano attive.

Il contratto SDK viene provato con risposte sintetiche, senza nuove chiamate
Gemini reali: disponibilità dei modelli, qualità e costo effettivo dipendono dal
progetto Google e non sono attestati da queste prove. La notifica nativa viene
emessa tramite Electron, ma la presentazione Windows dipende da permessi e
modalità Non disturbare; il messaggio in-app resta disponibile. App chiusa:
nessun servizio in background installato, recupero alla riapertura.

Nessun nuovo pacchetto. L'attività `translation` è aggiunta allo storico;
le vecchie esclusioni `translator` restano leggibili come dato storico.
Non si attribuisce retroattivamente tempo di studio non osservato.
