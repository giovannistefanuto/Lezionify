# Pipeline ENG — diagnosi e correzione dell'11 novembre 2026

## Esito e stato

Il percorso applicativo ora traduce sezioni intere con segnaposto verificati,
in gruppi con obiettivo 6.000 caratteri e massimo 16 sezioni. Una singola
sezione più lunga resta intera. Il documento completo mascherato accompagna
ogni richiesta come contesto. Una sola passata correttiva può richiedere di
nuovo le sezioni strutturalmente non valide; poi la dispensa intera deve
superare i controlli prima del salvataggio. Il gestore condiviso conserva
retry del provider, rotazione, fallback completi, quote e annullamento.

La voce 122 resta aperta: verificata una sezione reale particolarmente critica,
non dimostrato un nuovo tasso di successo dell'intero archivio. Le prove su
documenti interi sono state ostacolate da HTTP 503 e timeout del provider.
Nessuna nuova traduzione diagnostica ha sostituito le dispense personali.
La successiva distribuzione D-0502 include questo percorso nel setup generale; il limite del collaudo online completo resta aperto.

## Riproduzione locale

`node tools/diagnose_eng_replay.cjs` rilegge sorgenti e tentativi senza rete,
mostrando solo numeri e messaggi fissi del validatore. Su 13 tentativi
conservati: 3 accettati, 10 rifiutati. Non è un campione casuale dell'archivio
e non dimostra una percentuale globale di fallimento.

- Sei tentativi hanno campi extra e indici spostati.
- Tre hanno frammenti mancanti o vuoti, talvolta insieme a campi extra.
- Uno manca di un titolo Markdown pur conservando il resto della struttura.

Caso minimo osservato: cinque frammenti previsti diventano sei perché il
modello restituisce come prosa anche una parentesi/punteggiatura protetta.
I frammenti successivi slittano. In un'altra sezione mancano 21 frammenti.
Con piani sopra 128 campi il percorso precedente ometteva lo schema del
provider per evitare un precedente rifiuto di complessità: rimaneva solo
il controllo locale a posteriori. Il vecchio system prompt chiedeva anche
di copiare formule che il prompt del piano vietava di restituire.

## Esperimento scartato dopo confronto con la versione corretta

Un primo formato con liste di traduzioni a cardinalità vincolata ha eliminato
gli errori di forma nel caso provato. La risposta ometteva un titolo; una
richiesta mirata di circa 14 secondi ha riparato la sezione e il validatore
strutturale ha accettato l'intera dispensa.

La lettura affiancata alla versione inglese corretta ha però rilevato prosa
disallineata dalle formule in un'altra sezione: il conteggio esatto degli
elementi e la conservazione dei letterali **non bastano**. Quel formato e
quella traduzione sono stati scartati. Non sono la soluzione consegnata e
non costituiscono un collaudo linguistico positivo.

## Soluzione adottata

`translationDocument.ts` sostituisce formule e codice con identificatori
casuali distinti per sezione, traducendo il testo continuo. La risposta usa
un campo stringa per sezione, senza indici di frammenti da rigenerare.
Prima della ricostruzione sono obbligatorie presenza, unicità e sequenza dei
segnaposto. Il testo deve poi conservare titoli/numerazione, formule, codice
e riquadri; resta il recupero Mermaid già esistente. Nessun segnaposto resta
nella dispensa valida.

I gruppi sono seriali e passano dal gestore condiviso. L'avanzamento mostra
quanti gruppi sono completati. La riparazione è una sola passata, eventualmente
divisa in gruppi: non ricomincia la traduzione completa e non accetta un secondo
esito invalido. Ciascuna richiesta logica conserva i retry finiti del provider;
non significa una sola chiamata fisica complessiva.

Il contesto ripetuto aumenta gli invii e i token di input rispetto al tentativo
unico: nessun risparmio di costo o tempo è dichiarato. Non è stato introdotto
un ripristino automatico dei gruppi dopo riavvio: un nuovo job li ritraduce.

## Prove online autorizzate

Chiavi decifrate solo in memoria; profilo diagnostico preparato sincronicamente
prima dell'inizializzazione di Electron. I primi avvii isolati non potevano
decifrarle e hanno effettuato zero invii. Nessuna credenziale stampata o
salvata in chiaro. L'utente ha confermato espressamente l'invio dei testi a
Google Gemini, `generativelanguage.googleapis.com`.

Le sessioni hanno invocato `generateContent` 31 volte, con autoritentativi SDK
disabilitati: 20 HTTP 503, 3 timeout a 180 secondi, 4 richieste interrotte durante
la diagnosi e 4 risposte STOP. Le chiamate bloccate dal limite del harness e
il replay locale non sono invii e sono esclusi. Modelli provati: 3.6, 3.7,
3.5, 3.8 e 2.5 Flash, senza modificare le preferenze personali. Un esperimento
3.6 con thinking minimo ha ricevuto 503 e non è stato adottato.

Le quattro risposte con usage disponibile riportano complessivamente 72.257
token, inclusi 32.692 di thinking. Non è un totale di fatturazione: per errori,
timeout e interruzioni non è disponibile un usage completo.

Una sezione ROS di 546 byte è riuscita in circa 7 secondi nel percorso a
frammenti rivisto. Il successivo esperimento su una dispensa di 31.727 byte
ha restituito la risposta in circa 130 secondi, ma è stato scartato per i
difetti descritti sopra. Il tentativo con il codice precedente sullo stesso
documento/modello ha ricevuto solo 503: non è possibile ricavarne un confronto
statistico prima/dopo.

Nel percorso finale, la sezione reale di 2.136 byte che prima disallineava
il ritorno lambda è riuscita in circa 16 secondi dopo un primo 503. Letta
contro sorgente italiana e versione inglese corretta: titolo, definizione,
formula, pesi geometrici e casi limite sono coerenti e nello stesso contesto.
Questa prova riguarda la sezione, non una traduzione nuova dell'intero archivio.
Le prove del percorso finale su documenti interi e gruppi iniziali sono state
interrotte dopo persistenti indisponibilità; non sono dichiarate passate.

## Verifiche e conservazione

- `node tools/diagnose_eng_replay.cjs --roundtrip`: 53 dispense, 331 gruppi,
  8.043 occorrenze protette, ricostruzione identica alla forma canonica
  precedente, zero richieste di rete. È una prova di trasporto e ricostruzione,
  non di traduzione linguistica.
- 855 test unit in 67 file passati fuori sandbox Windows, typecheck, lint e
  build. In sandbox nove test nativi estranei alla traduzione fallivano per
  loopback, junction e FFmpeg; la suite completa fuori sandbox è passata.
- Regressioni su cardinalità/tipi delle sezioni, duplicati JSON anche escaped,
  segnaposto mancanti/duplicati/alterati/fuori ordine/di altra sezione,
  codice/formule, gruppi seriali, risposte aggregate, riparazione fallita,
  risposta interrotta, annullamento e conservazione delle fonti.

`_en_tentativo.txt` contiene il record `lezionify-eng-sections-v1`: mappa dei
prefissi, impronta della fonte e lista delle risposte del provider **verbatim**
come stringhe JSON. Il replay diagnostico controlla anche la revisione della fonte.
L'anteprima `.md` resta non validata e segnala le sezioni non ricostruibili.
Le risposte della passata correttiva restano separatamente in
`_en_riparazione_tentativo.txt/.md`; una nuova risposta primaria elimina
il vecchio tentativo correttivo per non associarlo a un job diverso.
La cancellazione della lezione comprende tutti questi file. Non sono dispense
valide, non vengono indicizzati o pubblicati.

Prove private, sorgenti, riferimenti e harness restano in
`local-artifacts/eng-pipeline-2026-11-11/`, ignorato da Git. Il risultato
intermedio accettato solo strutturalmente è marcato REJECTED per impedirne
l'uso come versione verificata.

## Limiti e prossimo controllo

Una traduzione può ancora omettere prosa mantenendo segnaposto e struttura:
il controllo locale non certifica il significato. Non applicare soglie di
lunghezza come prova di completezza. Le versioni corrette esistenti restano
i riferimenti per il successivo confronto umano.

Alla ripresa, eseguire il percorso finale su almeno le tre dispense reali
selezionate, con provider disponibile, controllare le risposte complete contro
i riferimenti e misurare invii/token/latenza distintamente da 503 e timeout.
Non chiudere la voce 122 né dichiarare un nuovo tasso di successo finché
questo collaudo non è completato. Il recupero di checkpoint fra job resta
un miglioramento separato da valutare sul costo effettivo dei gruppi.

Riferimenti tecnici: [output strutturati Gemini](https://ai.google.dev/gemini-api/docs/structured-output)
e [thinking Gemini](https://ai.google.dev/gemini-api/docs/thinking). La documentazione
conferma i limiti degli schemi complessi; non dimostra la causa dei 503 osservati.
