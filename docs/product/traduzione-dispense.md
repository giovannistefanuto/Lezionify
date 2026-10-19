# Traduzione delle dispense IT → EN

Valutazione del 14 ottobre 2026, voce 7 di LISTA_ORDINE; pipeline aggiornata
il 19 ottobre dopo la diagnosi reale della voce 43.

## Comportamento verificato nel codice

`ArchiveService.translateLectureNotes` legge tutta la dispensa italiana e passa
il testo a `GeminiService.translateToEnglish`. Quest'ultimo esegue una sola
richiesta logica `translation`, non traduce separatamente le parti usate per
generare la dispensa italiana. Traduzione singola, batch e pipeline archivio
usano lo stesso percorso. Le lezioni del batch sono tradotte separatamente.

Il gestore condiviso conserva rotazione delle chiavi, modelli di fallback,
massimo sei tentativi fisici per richiesta logica, limite di cinque richieste
al minuto per gruppo/modello, timeout di 180 secondi per tentativo e deadline
logica di dieci minuti. Sono limiti locali della configurazione attuale,
non le quote o i limiti di output garantiti dal provider.

L'inglese è scritto solo dopo la verifica della risposta e un secondo controllo
della sorgente italiana nell'archivio serializzato. Una dispensa cambiata durante
l'attesa non riceve una traduzione obsoleta. Audio e trascrizione non sono usati
come input della traduzione e restano conservati.

## Confronto e scelta

| Aspetto | Dispensa intera (adottata) | Parti separate (alternativa valutata) |
| --- | --- | --- |
| Contesto | Tutta la dispensa nella stessa richiesta | Servirebbero contesto comune e glossario per evitare scelte terminologiche divergenti |
| Output lungo | Può raggiungere il limite del modello; una risposta interrotta viene ora rifiutata | Riduce l'output per richiesta, ma una singola sezione molto lunga richiederebbe ulteriori confini sicuri |
| Completezza strutturale | Confini identificati e verificati prima del salvataggio | Richiederebbe gli stessi controlli per parte e un assemblaggio senza omissioni o doppioni |
| Consumo | Un invio del documento e delle istruzioni per tentativo | Più invii delle istruzioni, del glossario e del contesto; nessun risparmio di costo garantito |
| Quote e latenza | Una richiesta fisica quando riesce al primo tentativo | Per 12 parti: almeno 12 richieste, con attese dello scheduler; non è automaticamente più veloce |
| Errore e ripresa | Si ritenta tutta la traduzione; nessun checkpoint di parti EN | Con checkpoint atomici si potrebbero riusare parti valide; occorre invalidarle quando cambiano sorgente, strategia o contesto |
| Coerenza IT/EN | Mantiene ordine, livelli e numerazione dei titoli ATX | Necessari confini che non spezzino formule, tabelle o fence e verifica globale finale |

Si conserva la traduzione intera, aggiungendo controlli di integrità. Non è
emerso dal codice un bisogno verificato di moltiplicare le richieste. D-0186
conserva un precedente esito reale di 14.046 caratteri IT e 13.080 EN con 23
titoli in entrambe le lingue: è un caso storico riuscito, non un benchmark di
qualità o una garanzia sui documenti lunghi. La nuova fixture di 12 sezioni
lunghe verifica assemblaggio e controlli con risposte sintetiche; non misura
capacità, velocità o costo di Gemini. Nessuna nuova chiamata API è stata fatta
per questa valutazione, né sono stati letti materiali personali.

Le parti restano un'alternativa da rivalutare se si osservano ripetuti limiti
di output su dispense reali. Sarebbe un cambiamento di strategia e consumo,
da accompagnare con checkpoint EN, glossario e confronto linguistico su uno
stesso corpus. Non esiste un fallback automatico a parti in questa versione.

## Controlli implementati

La fonte viene divisa localmente al preambolo e ai titoli ATX (`#` … `######`)
fuori da codice e formule. Dal 19 ottobre `translationPlan.ts` distingue, in
ogni sezione, frammenti di prosa da tradurre e contenuti da conservare: formule
con ogni loro ripetizione, codice inline, blocchi di codice non Mermaid,
spazi ai bordi dei frammenti e separatori senza parole. Il documento completo,
compresi i contenuti protetti, è inviato come contesto in **una sola richiesta**.
La risposta JSON contiene soltanto i frammenti di prosa, con chiavi obbligatorie
definite dallo schema; l'app ricostruisce nell'ordine originale i frammenti e
gli span protetti della fonte. Non ci sono richieste separate per frammento.

I commenti con identificatore casuale restano uno strumento interno del
validatore e non sono più copiati dal modello. Nessun identificatore di
trasporto viene salvato nella dispensa. Il controllo locale rifiuta chiavi
ignote, duplicate, mancanti, valori non testuali, frammenti vuoti e risposte
incomplete; riconosce anche chiavi duplicate che `JSON.parse` sovrascriverebbe.
Lo schema non sostituisce i controlli del contenuto. Uso dello schema verificato
nella [documentazione ufficiale Gemini](https://ai.google.dev/gemini-api/docs/structured-output)
e con il client installato, senza nuove dipendenze.

La risposta deve avere `finishReason=STOP`; limiti di token, blocchi di sicurezza
e metadati assenti non sono interpretati come successo. Ogni parte deve avere
testo e conservare livelli/numeri dei titoli ATX, formule con delimitatori
`$`, `$$`, `\(`, `\[`, codice inline, blocchi di codice e tipi dei riquadri.
Per Mermaid possono cambiare le etichette tra virgolette, quelle sulle frecce
con pipe o trattini e `accTitle`/`accDescr` su una riga; il resto del blocco deve
restare identico. CRLF/LF sono equivalenti.
Il confronto resta esatto: non normalizza formule o codice. Questi contenuti
sono ora reinseriti dalla fonte locale, senza chiedere al modello di copiarli.
Mermaid resta traducibile nelle etichette ammesse; se il modello modifica
la struttura, D-0366 recupera il diagramma italiano senza bloccare la dispensa.

Aggiornamento D-0357: il modello può comunque copiare un blocco display
immutabile dentro la prosa. Prima della ricomposizione si eliminano soltanto
copie aggiuntive `$$...$$` o `\[...\]` su righe autonome, byte per byte
identiche a un blocco protetto della stessa sezione. Gli originali non sono
toccati, ogni frammento deve mantenere testo non vuoto e il controllo finale
deve ancora passare. Non si eliminano formule nuove, alterate, di altre
sezioni, nel codice o incorporate nella prosa. Una normalizzazione riuscita
registra solo conteggi e indici di sezione nel log `translation-integrity`.
Il replay reale del nuovo rifiuto passa; il successivo invio è stato bloccato
dalla quota. Il ricollaudo online resta aperto nel backlog.

Un errore di integrità ferma il job senza retry o fallback automatici che
consumino altre quote. L'avviso esistente permette di riprovare esplicitamente.
L'eventuale versione inglese precedente resta disponibile. La cancellazione
viene trasmessa anche al client SDK. Errori e log non includono testo, formule,
commenti temporanei o chiavi.

Dal 19 ottobre l'errore strutturale aggiunge indice della sezione e categorie
distinte: formule, codice inline, ordine tra i due, titoli, riquadri, blocchi
di codice, diagrammi Mermaid o sezione vuota. I dettagli sono etichette fisse,
senza estratti o valori della fonte o della risposta. Il confronto resta
identico: non viene introdotta una normalizzazione delle formule.

Un tentativo diagnostico reale autorizzato ha isolato parole tradotte dentro
quattro formule LaTeX e un riferimento matematico ripetuto omesso. Il prompt
ora precisa la priorità della conservazione letterale anche per parole
italiane in `\text{...}`, `\mathrm{...}` e altri comandi, e richiede ogni
occorrenza di matematica/codice inline senza accorpare ripetizioni. I tentativi
successivi hanno mostrato che il solo prompt non basta: il modello ha duplicato
un confine e poi omesso ancora una ripetizione matematica. La ricostruzione
locale elimina la dipendenza dalla copia di questi elementi, senza accettare
risposte alterate già rifiutate. Prove reali, consumi e limiti nel
[report di indagine](../quality/integrita-eng-indagine-2026-10-19.md).

Questi controlli **non certificano la fedeltà linguistica**: il modello può
omettere una frase, riassumere o duplicare prosa mantenendo confini e struttura.
Titoli Setext, tabelle, liste e markup HTML non hanno una verifica strutturale
dedicata. Non si usano rapporti di lunghezza come prova di completezza, perché
italiano e inglese possono avere lunghezze diverse. Il salto al capitoletto
mantiene il comportamento locale di D-0290, senza titoli o identificatori AI
salvati aggiuntivi.

## Collaudi

`tests/unit/translationIntegrity.test.ts` verifica confini, preambolo, documento
senza titoli, wrapper Markdown, CRLF, codice, formule, riquadri e Mermaid;
rifiuta sezioni mancanti/duplicate/riordinate, risposta interrotta, parte vuota,
alterazioni protette e testo estraneo fuori dai confini. Include 12 sezioni con
6.000 paragrafi sintetici e un caso che dimostra esplicitamente il limite
del controllo sulle omissioni di prosa.

`translationPlan.test.ts` verifica conservazione locale delle ripetizioni,
parole dentro LaTeX, delimitatori, codice, spazi, etichette Mermaid, rifiuto di
frammenti mancanti/duplicati/vuoti/alterati e assenza di chiamate AI quando
la fonte contiene soltanto contenuti da conservare. I relativi client sono
sintetici e i test impediscono richieste di rete.

I client Gemini sintetici verificano una sola richiesta logica, il fallback
esistente, la propagazione dell'AbortSignal e nessun retry di output invalido.
`archive.test.ts` verifica file inglese precedente, italiano, audio e
trascrizione invariati dopo errore, con successivo tentativo riuscito.

La diagnosi della dispensa italiana troncata con `undefined` resta nella
successiva voce 8 della coda e non è risolta da questo intervento.

La diagnostica dei frammenti distingue JSON non valido, sezioni o campi
mancanti/inattesi, oggetti o tipi errati, testo vuoto, testo svuotato dalla
rimozione di copie e chiavi duplicate. Riporta soltanto indici locali di
sezione e frammento, senza chiavi inattese o contenuti del modello.

## Ripresa delle traduzioni e quote — D-0364

Le alternative automatiche per ENG usano i modelli completi già configurati
nel codice: 3.7 Flash, 3.5 Flash e 3.8 Flash, dando priorità al modello scelto.
Un Lite selezionato esplicitamente resta utilizzabile; l'app non vi passa
automaticamente dopo errori dei modelli completi. I log reali mostravano
frammenti vuoti o contenenti soltanto copie di formule dopo quel passaggio.
Queste risposte restano rifiutate, senza sostituire la prosa con l'italiano.

`default-project` è un gruppo legacy prudente, non la prova che tutte le
chiavi appartengano davvero allo stesso progetto. Per queste chiavi RPM e
cooldown restano condivisi. Una quota giornaliera sospende soltanto la chiave
provata sul modello, lasciando verificare le altre entro il tetto globale di
sei tentativi. Chiavi duplicate restano sospese anche se riordinate. I gruppi
personalizzati espliciti mantengono la sospensione condivisa per progetto.
Nessuna impostazione personale viene riscritta o migrata automaticamente.

Google applica i limiti per progetto, non per chiave: identificare i gruppi
reali nelle Impostazioni evita tentativi inutili. Non si assume che le chiavi
legacy abbiano quote indipendenti; si conserva il limite comune al minuto.
Riferimento: [limiti ufficiali Gemini](https://ai.google.dev/gemini-api/docs/rate-limits).
## Recupero dei diagrammi Mermaid durante ENG (D-0366)

Su richiesta dell'utente, un diagramma Mermaid alterato nella risposta AI non
blocca più la traduzione della dispensa: si conserva il diagramma italiano
originale e si mantiene la prosa tradotta. Se le etichette tradotte rispettano
la struttura, si mantiene il diagramma inglese. Diagrammi aggiunti vengono
rimossi; quelli omessi vengono reinseriti prima del successivo blocco di codice
originale, oppure in fondo alla sezione quando manca un riferimento affidabile.
Il controllo finale di titoli, formule, codice e riquadri resta attivo.
Il log riporta soltanto indici delle sezioni e conteggi dei diagrammi recuperati.
