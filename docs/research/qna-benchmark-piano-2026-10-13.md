# Piano di indagine — Q&A gratuito senza Gemini

Data: **13 ottobre 2026**, Europe/Rome.
Stato: runner e corpus preparati, regressioni offline passate, prove API in
esecuzione; integrazione nell'app non eseguita. Dettagli e correzioni nel
[registro di esecuzione](qna-benchmark-esecuzione-2026-10-13.md).

Riferimenti: [ricerca completa](qna-alternative-gratuite-non-gemini-2026-10-13.md)
e [valutazione](qna-alternative-gratuite-valutazione-2026-10-13.md).

## Domande a cui rispondere

1. Quale modello gratuito fa comparire prima una spiegazione corretta e leggibile?
2. Il modello più piccolo basta per le domande ordinarie su formule e codice?
3. Quanto cambiano risultati e consumo passando dalla citazione alla sezione o
   all'intera dispensa, e aumentando lo storico?
4. Le quote consentono una sessione di studio con domande ripetute?
5. Quali ritardi dipendono dal provider e quali dalla coda o dal renderer dell'app?

Il risultato atteso è un confronto riproducibile con raccomandazione motivata,
non la selezione immediata di un provider. Gemini è escluso dai candidati;
la pipeline delle dispense mantiene la propria configurazione.

## Candidati iniziali

| Candidato | Ipotesi da verificare |
| --- | --- |
| Groq `openai/gpt-oss-20b` | Può bastare per chiarimenti ordinari con risposta rapida |
| Groq `openai/gpt-oss-120b` | Offre un vantaggio di correttezza sufficiente a giustificare l'eventuale attesa maggiore |
| Cloudflare `@cf/qwen/qwen3-30b-a3b-fp8` | Offre una buona esperienza con contesti lunghi entro il budget gratuito |

I numeri dichiarati e le quote sono nella valutazione collegata: non costituiscono
già risultati sperimentali. Qwen3.8 per slide, Mistral e OpenRouter entrano solo
se emerge un bisogno non coperto dai primi tre. Il locale richiede prima dati
sull'hardware; Cerebras non soddisfa il vincolo di quota gratuita rinnovabile.

## Fase 1 — Accesso e condizioni reali

- Verificare account gratuiti Groq e Cloudflare, ID disponibili, endpoint e
  parametri di streaming/reasoning effettivamente supportati.
- Leggere le quote dell'account e il consumo già presente: non assumere che
  tutti gli account abbiano i massimi pubblicati o l'intero budget disponibile.
- Per le prove serviranno una chiave Groq e, per Cloudflare, identificativo
  account e token con il solo accesso necessario. Usare un meccanismo locale
  non versionato; niente credenziali in prompt, report, argomenti della CLI o log.
  Su richiesta dell'utente, predisposto il `.env` locale nella radice del
  repository con `GROQ_API_KEY`, `CLOUDFLARE_ACCOUNT_ID` e
  `CLOUDFLARE_API_TOKEN`, tutti inizialmente vuoti. `.gitignore` esclude già il
  file; l'utente inserisce i valori nell'editor. Il configuratore PowerShell
  tentato nella sessione è stato rimosso: il salvataggio cifrato non è avvenuto.
  Il runner dovrà leggere il `.env` localmente senza stampare o salvare i valori.
- Mantenere il piano gratuito e fermare le prove al raggiungimento del budget;
  nessun upgrade, ricarica o passaggio automatico a servizi a pagamento.
- Consultare condizioni sui dati prima di inviare materiale privato. Le prime
  prove usano esclusivamente dispense e domande sintetiche.

**Uscita:** tabella datata di accesso, quote, parametri e budget disponibile.
Se un candidato non è accessibile gratuitamente, registrare il motivo e
continuare il confronto con quelli disponibili.

## Fase 2 — Runner e prova pilota

Preparare un runner separato dall'app, usando Node già presente e `fetch`/stream
nativi se sufficienti. Nomi previsti: `tools/qna_benchmark.mjs` e fixture
sintetiche in `tests/fixtures/qna-benchmark/`; sono percorsi proposti, non file
già creati. Nessuna nuova dipendenza finché non emerge un bisogno concreto.

Il runner deve:

- usare endpoint ufficiali fissati, stesso corpus e istruzioni, ordine dei
  candidati alternato e nessun fallback silenzioso;
- leggere SSE, distinguere ragionamento da risposta, raccogliere usage quando
  disponibile, annullare davvero le richieste e riconoscere output vuoti/troncati;
- usare il reasoning più basso supportato per la modalità rapida; registrare
  configurazione e differenze tra provider. Nasconderlo non equivale a disattivarlo;
- impostare un limite di generazione appropriato alla risposta e al reasoning,
  controllando in una prova preliminare che non tronchi sistematicamente il testo;
- limitare consumo e tentativi, leggere Retry-After/header delle quote quando
  disponibili, fermarsi se il budget residuo è ignoto e il tetto prudenziale è raggiunto;
- salvare risultati in `local-artifacts/qna-benchmark/<run-id>/`, ignorata da Git,
  con configurazione priva di segreti, JSONL, CSV e risposte sintetiche;
- registrare prima il singolo tentativo senza retry: i retry verranno misurati
  separatamente per non nascondere l'inaffidabilità dietro risposte riuscite.

Verificare parsing e timeout con stream sintetici offline, incluse usage finale,
risposta vuota, fine incompleta e errore prima/dopo il testo. Poi eseguire una
prova pilota di **tre richieste per candidato**, una definizione, una formula e
un breve frammento di codice, con contesto breve.

**Uscita:** nove richieste pilota, parametri validati e primi tempi/consumi.
Un candidato costantemente vuoto, inutilizzabile o incompatibile non passa al
confronto esteso finché la causa non è risolta.

## Fase 3 — Confronto su domande brevi

Corpus iniziale: **12 casi, tre ripetizioni per candidato**, cioè 108 richieste
oltre al pilota. I follow-up vengono forniti con storico sintetico fissato, così
il numero resta definito e un errore nel turno precedente non altera il confronto.

| Casi | Contenuto |
| --- | --- |
| 2 | Definizioni e termini tecnici dipendenti dalla dispensa |
| 2 | Formule, passaggi e conversioni di unità |
| 2 | Lettura e correzione di codice |
| 2 | Esempi e spiegazioni didattiche |
| 2 | Domande successive che richiedono lo storico |
| 2 | Informazioni assenti: distinguere fatti della dispensa e conoscenza generale |

Includere ITA, ENG e combinazioni di materiali inglesi/domande italiane.
Contesto totale iniziale vicino a 2k token; conservare lo stesso testo tra
candidati e riportare i conteggi effettivi anziché cambiarlo per adattarsi al
tokenizer. Risposte proporzionate, con obiettivo 150–300 parole dove sensato;
le risposte semplici possono essere più brevi. Valutare formule e codice con
risultati attesi, chiarezza a lettura cieca senza nome del modello.

Alternare candidati e distribuirne le ripetizioni su due o tre fasce orarie;
registrare sequenza e condizioni di rete. Cache hit/cold e uso recente del
provider sono condizioni da riportare, non vantaggi da attribuire al modello.

Metriche:

- **Reattività:** tempo dal reale invio al primo testo finale, a 20 caratteri
  visibili e alla risposta completa; evento SSE e reasoning separati.
- **Qualità:** valore/concetti corretti, unità, codice valido, contraddizioni,
  informazioni inventate e chiarezza in italiano.
- **Affidabilità:** vuoti, troncamenti, 429, 5xx, timeout e stream interrotti.
- **Consumo:** input, output e reasoning quando esposti; Neurons/quote residue
  quando disponibili. Campi mancanti restano null, non diventano zero.

Conservare mediana, intervallo e singoli risultati. La proxy dei 20 caratteri
non dimostra utilità semantica. Gli stessi 12 casi ripetuti non sono 36 problemi
indipendenti: riportare qualità per caso e variabilità fra ripetizioni.

**Uscita:** shortlist di due candidati. Se un terzo resta necessario per il
contesto lungo, conservarlo come candidato per quel ruolo specifico.

## Fase 4 — Contesto, qualità difficile e uso continuativo

Solo sui finalisti:

1. **Contesto:** confrontare citazione, sezione pertinente e dispensa intera sullo
   stesso problema. Su Cloudflare aggiungere circa 8k e 20k token totali, con
   informazione bersaglio all'inizio, al centro e alla fine. Su Groq restare nel
   budget reale; un contesto non supportato dal Free è un limite documentato,
   non una richiesta da ripetere inutilmente.
2. **Storico:** confrontare primo turno e conversazione sintetica crescente;
   verificare recupero dei riferimenti, consumo e peggioramento della reattività.
3. **Casi nuovi:** 30 casi aggiuntivi con due ripetizioni per finalista, inclusi
   almeno 10 casi di informazione mancante. Sono 120 richieste per due finalisti;
   un'ulteriore modalità di reasoning è una prova separata con budget proprio.
4. **Sessione:** simulare 20 domande distanziate nell'arco di un'ora con payload
   realistici. Controllare disponibilità e quota residua, non soltanto velocità
   di una chiamata isolata. Fare la prova in un giorno con budget sufficiente.
5. **Errori:** dopo il confronto senza retry, misurare pochi retry controllati.
   Non concatenare fallback di provider finché non sono configurate le
   destinazioni autorizzate; evitare di mescolare risposte parziali.

Tetto prudenziale proposto per le prove: usare al massimo l'80% del budget
gratuito disponibile, conteggiando pilota, reasoning, retry e chiamate precedenti.
Per gli 8k TPM Groq serve anche distanziamento al minuto; una risposta di
ragionamento lunga può saturare il limite. Suddividere le prove su più giorni
se necessario. Nessuna promessa che l'intero piano entri nelle quote di un giorno.

**Uscita:** capacità documentata per contesti e sessioni, qualità su casi nuovi
e cause dei ritardi. Una mediana buona con attese frequenti lunghe non basta.

## Fase 5 — Criteri per decidere

Obiettivi iniziali di progetto, da concordare prima delle prove e non da
presentare come prestazioni già ottenute:

- domanda ordinaria con contesto breve: mediana del primo testo entro **2 s**
  e risposta completa entro **15 s**;
- correttezza almeno **90% dei casi distinti**; nessun errore sistematico su
  formule o codice e nessun fatto inventato nei casi mancanti della suite;
- sessione di 20 domande/ora sostenibile gratuitamente con il payload provato;
- nessun costo obbligatorio e nessun output troncato accettato come risposta valida.

Queste soglie servono a scegliere, non certificano una percentuale universale
di affidabilità. Un errore nei casi mancanti avvia analisi e nuovi casi; non
basta aggiungere ripetizioni del medesimo problema per dichiararlo risolto.

Decisione per ruoli: modello unico se copre tutto; modello rapido più uno per
contesto lungo solo se il vantaggio è misurato. Se nessuno soddisfa i criteri,
aprire una seconda shortlist (Mistral/OpenRouter) verificandone prima la gratuità;
slide e locale restano approfondimenti separati.

**Uscita:** report con risultati, configurazione riproducibile, limiti e scelta
motivata, da registrare in DECISIONI.md. Se la qualità del 20B basta e la latenza
è migliore, preferirlo; se il 120B corregge errori rilevanti, valutare il costo
in attesa. Non scegliere Cloudflare soltanto dal numero teorico di richieste.

## Fase 6 — Verifica in Lezionify, dopo la selezione

Un'eventuale integrazione successiva deve verificare:

- configurazione e credenziali Q&A separate dalla pipeline Gemini;
- provider/modello e contesto condiviso visibili all'utente;
- uso dei messaggi strutturati con ruoli, risposta in Markdown/LaTeX e storico;
- coda del Q&A e limiti dei provider, evitando che il lavoro della pipeline
  falsi il confronto di reattività;
- tempi dal clic al renderer, separando coda, rete, primo testo e rendering;
- nessuna perdita della conversazione su timeout, annullamento o stream parziale;
- retry e fallback entro budget e soltanto verso destinazioni configurate;
- prova con pipeline in pausa e attiva, più le regressioni appropriate.

Questa fase richiede un lavoro di implementazione successivo: il piano attuale
non cambia impostazioni, dipendenze, modelli o dati dell'app.

## Ordine operativo e stato

- [x] Ricerca e valutazione archiviate.
- [x] Piano a fasi salvato.
- [x] Accesso API verificato per entrambi; quote Groq osservate negli header.
- [x] Runner e fixture preparati, collaudo offline completato.
- [x] Pilota di nove richieste completato, con un errore di stream registrato.
- [x] Confronto breve completato; 20B candidato per contesto breve, scelta definitiva aperta.
- [x] Contesto lungo Cloudflare e confronto su tre domande reali, anche con switch soft, completati.
- [x] Sessione Cloudflare conclusa (19/20 complete); varianti eseguite entro budget.
- [ ] Varianti residue e sessioni Groq: rinviate al budget di un altro giorno.
- [x] Report e candidati motivati registrati; selezione definitiva e soglia di qualità aperte.
- [ ] Integrazione e prova nella UX reale, se richieste successivamente.

Prova aggiuntiva richiesta dall'utente: tre domande reali con estratto pertinente,
nove richieste complete. Completate anche le prove Cloudflare con dispensa
intera e switch soft `/no_think`, in condizioni distinte. 20B è candidato per
estratti brevi; Cloudflare soft è candidato per documento completo. Le varianti
sono state confrontate su tutti e tre i candidati invece di scegliere finalisti
automaticamente dallo screening; la copertura Groq è ridotta dal budget.
La revisione ha trovato errori matematici e incompatibilità dei delimitatori:
nessun candidato ha ancora una correttezza certificata del 90 percento.
Risultati, copertura e prove differite per budget nel
[consuntivo](qna-benchmark-risultati-2026-10-13.md).

Non serve un'altra Deep Research generale prima del pilota. La documentazione
aggiuntiva va cercata per domande emerse dalle prove, ad esempio quota reale,
reasoning, caching o provider alternativo; gli account e le misure sono ora
l'informazione mancante decisiva.
