# Q&A gratuito senza Gemini — valutazione e prossime verifiche

Data: **13 ottobre 2026**, Europe/Rome. Stato: approfondimento documentale;
nessuna integrazione o scelta definitiva del modello.

## Materiale conservato

- [Ricerca completa](qna-alternative-gratuite-non-gemini-2026-10-13.md), fornita
  dall'utente come `deep-research-report (10).md`, spostata e rinominata senza
  modificarne il contenuto; integrità verificata tramite SHA-256.
  Hash del report: `2265d70e430e4734ad02d048fb0bc0d38a6cfc2790e3e5d10fbe89113c040b90`.
- Questo documento conserva vincoli, osservazioni sul codice, verifiche delle
  fonti e valutazione emersa nella conversazione. Le citazioni `turn...` del
  report originale appartengono alla ricerca esterna e non sono collegamenti
  riutilizzabili: i link ufficiali consultati sono riportati qui sotto.

## Richiesta e perimetro

L'utente ha chiarito che vuole **modelli diversi da Gemini**, utilizzabili
gratuitamente, e capire se rispondono velocemente alle domande contestuali.

- API integrabile nell'app desktop, non soltanto una chat web gratuita.
- Gratuità rinnovabile senza pagamento obbligatorio; distinguere quote gratuite,
  prove con scadenza e crediti iniziali. Non presumere gratuità illimitata futura.
- Risposte su dispense magistrali di Ingegneria Informatica: definizioni,
  formule LaTeX, codice, esempi e domande successive, in italiano e inglese.
- Oggetto della ricerca: solo Q&A; modelli della pipeline delle dispense separati.
- Eventuali slide sono un'estensione futura. I modelli locali restano opzionali,
  senza presumere una GPU dedicata o prestazioni adeguate del computer.
- Invio del contesto esplicito e tracciabile; fonti conservate localmente e
  credenziali protette. Non salvare chiavi o dispense personali nei benchmark.

## Situazione del codice osservata

Al momento dell'analisi:

- `electron/main/archive.ts`, metodo `generateQnaResponse`, usa `settings.model`:
  il modello Q&A è condiviso con le altre generazioni.
- `electron/main/gemini.ts` invia citazione, titolo del paragrafo e storico;
  aggiunge la dispensa italiana letta da `readMarkdown` se richiesto. Lo storico
  viene ricostruito nel prompt a ogni domanda, senza un budget esplicito.
- `src/components/QnaSidebar.tsx` offre la casella «Includi intera lezione come
  contesto», disattivata inizialmente. Manca una modalità intermedia che includa
  automaticamente la sezione pertinente.
- `electron/main/ai/geminiPolicy.ts` imposta una sola lavorazione attiva e un
  limite locale di 5 RPM. Questi sono limiti dell'app, non quote ufficiali di
  ogni futuro provider. Q&A: primo chunk 60 s, inattività 45 s, tentativo 180 s;
  scadenza logica predefinita 600 s e fino a 6 tentativi totali.
- `geminiRequestManager.ts` dà priorità alle domande in coda ma non interrompe
  un lavoro già avviato. La concorrenza copre l'intera richiesta logica, comprese
  attese e retry: cambiare modello da solo non elimina questo ritardo.
- Streaming e fallback esistono già. Dopo l'inizio di una risposta parziale,
  un errore termina il tentativo per evitare di mescolare risposte; questa
  proprietà va mantenuta in un'eventuale integrazione di altri provider.
- Il precedente collaudo reale Q&A verifica due turni e recupero dello storico;
  non è un benchmark comparativo di latenza o qualità.

## Candidati e dati consultati

Le informazioni seguenti descrivono le pagine ufficiali consultate il
13 ottobre 2026. I limiti effettivi dell'account vanno ricontrollati prima delle
prove. Non sono stati eseguiti benchmark API reali con questi servizi.

| Servizio e ID | Gratuità e limiti pubblicati | Prestazioni e stato | Valutazione provvisoria |
| --- | --- | --- | --- |
| Groq `openai/gpt-oss-120b` | 30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD | Production; circa 500 token/s dichiarati; contesto 131.072 | Prima prova per chiarimenti con poco contesto, formule e codice |
| Groq `openai/gpt-oss-20b` | Stesse quote del 120B | Production; circa 1.000 token/s dichiarati; contesto 131.072 | Aggiunto alla valutazione della conversazione: verificare se basta per le domande semplici |
| Cloudflare `@cf/qwen/qwen3-30b-a3b-fp8` | Budget condiviso di 10.000 Neurons/giorno sul piano Free; 4.625 N/M token input e 30.475 N/M output | Contesto 32.768; streaming; reasoning; nessuna latenza misurata disponibile nella ricerca | Prova per contesti più lunghi e sostenibilità gratuita |
| Groq `qwen/qwen3.8-27b` | Stesse quote Groq sopra | Preview; circa 450 token/s dichiarati | Candidato aggiuntivo del report; qualità ITA/ENG da verificare |
| Cloudflare `@cf/qwen/qwen3.8-27b` | Stesso budget giornaliero; 40.909 N/M input e 290.909 N/M output | Contesto 262.144, Vision; reasoning low/medium/xhigh, default xhigh | Possibile estensione per slide; consumo molto maggiore, reattività da misurare |

Il contesto massimo del modello non coincide con la quantità inviabile nel
piano gratuito. Gli 8.000 TPM Groq vincolano il consumo nel tempo: una richiesta
uncached molto lunga è problematica anche se rientra nella finestra del modello.
I token cached non contano nei rate limit Groq secondo la documentazione;
non presumere cache hit o compatibilità del caching con ogni richiesta.

Le quote sono condivise a livello di organizzazione Groq; non aumentano
semplicemente creando altre chiavi della stessa organizzazione. Cloudflare
resetta il budget alle 00:00 UTC (02:00 a Roma il 13 ottobre 2026); sul piano
Free, oltre il budget le operazioni falliscono invece di continuare a pagamento.

### Altri servizi nel report

- **Cerebras:** escluso dal vincolo di gratuità continuativa. La pagina corrente
  conferma $5 di prova dopo l'aggiunta di un metodo di pagamento verificato,
  scadenza a 30 giorni e assenza di un piano gratuito rinnovabile. Corregge la
  precedente indicazione della conversazione basata su una pagina meno aggiornata.
- **Mistral Small 4 / `mistral-small-2603`:** il report segnala Free mode senza
  carta e quote leggibili nell'account. Non escluso per principio: resta da
  verificare la capacità gratuita concreta. Dati non ricontrollati in questa
  conversazione oltre alla lettura del report.
- **OpenRouter / `nvidia/nemotron-3-ultra-550b-a55b:free`:** il report lo propone
  per esplorazione o fallback; disponibilità e limiti effettivi da verificare.
  Preferire un ID fissato rispetto al router casuale `openrouter/free` per un
  confronto riproducibile. Routing, retention e training dipendono anche dal
  provider sottostante. Quote dettagliate non confermate in questa valutazione.
- La ricerca riporta policy sui dati e possibili opzioni ZDR. Prima di inviare
  materiale privato occorre verificare le condizioni del provider e dell'account
  selezionati; questa documentazione non certifica configurazioni personali.

## Capacità gratuita teorica Cloudflare

Calcolo sulla tariffazione pubblicata, senza cache, altri consumi o retry e con
**500 token complessivi fatturati in output**. Non è una misura di velocità né
una garanzia di numero di risposte; includere l'eventuale reasoning nel consumo
effettivo anziché contare soltanto il testo mostrato all'utente.

| Input per richiesta | Qwen3-30B-A3B: Neurons / richieste al giorno | Qwen3.8-27B: Neurons / richieste al giorno |
| --- | --- | --- |
| 2.000 token | 24,49 / circa 408 | 227,27 / circa 44 |
| 8.000 token | 52,24 / circa 191 | 472,73 / circa 21 |
| 20.000 token | 107,74 / circa 92 | 963,63 / circa 10 |

Formula: `(token input * costo input + token output * costo output) / 1.000.000`.
Il contesto comprende anche istruzioni, storico e spazio per la risposta:
20k token di documento non equivalgono a 20k token di richiesta totale.

## Lettura critica e proposta preliminare

La raccomandazione del report è Cloudflare Qwen3-30B come principale e Groq
GPT-OSS-120B per domande corte. Per la priorità espressa dall'utente, **velocità**,
la proposta della conversazione è provare prima Groq 120B e 20B, confrontandoli
con Cloudflare Qwen3-30B. Nessuno è stato selezionato come default dell'app.

Punti da non trasformare in conclusioni definitive:

1. Token/s misura la generazione; non comprende necessariamente attesa, prefill
   e ragionamento prima del testo. Non esistono tempi misurati in Lezionify.
2. Cloudflare è interessante per quota e contesto; la reattività e qualità in
   italiano restano da dimostrare. Una piattaforma GA non garantisce la qualità
   didattica del modello o uno SLA per il piano gratuito.
3. Il routing suggerito dal report sotto circa 6k token è solo un'ipotesi:
   occorre considerare quota residua, consumo recente, storico e output.
4. Ridurre il contesto o lo storico può aiutare, ma bisogna preservare le
   informazioni necessarie e mostrare il perimetro condiviso allo studente.
5. Il passaggio a un modello più capace non va deciso soltanto dalla sicurezza
   dichiarata dal modello. Valutare un comando esplicito di approfondimento.
6. Conteggiare 20 caratteri ricevuti è un indicatore riproducibile di testo
   disponibile, non una misura automatica di utilità semantica.
7. Dieci ripetizioni per caso danno una prima indicazione; p95 e una soglia del
   5% di risposte inventate richiedono un campione adeguato. Con pochi casi di
   informazioni mancanti riportare gli errori assoluti, senza falsa precisione.
8. Limiti di output troppo stretti possono troncare la risposta dopo il
   reasoning; testare separatamente consumo, ragionamento e testo finale.

Un'eventuale integrazione dovrà separare configurazione Q&A e pipeline,
esporre provider/modello usato e preservare retry, annullamento, storico e
protezione delle credenziali. Il cambio di servizio per fallback deve rispettare
le destinazioni esplicitamente configurate per l'invio del contesto. La coda
interattiva e i limiti di ogni provider sono un problema distinto dal modello.

## Benchmark proposto, ancora da eseguire

Il [piano operativo a fasi](qna-benchmark-piano-2026-10-13.md) dettaglia accesso,
pilota, shortlist, contesti lunghi, budget e criteri iniziali di scelta.

Prima fase: **12 domande sintetiche, tre ripetizioni per candidato** su Groq
120B, Groq 20B e Cloudflare Qwen3-30B. Sono 36 prove per candidato, 108 totali,
oltre alle chiamate necessarie ai follow-up. Pianificare le prove entro le quote
effettive e distanziarle quando necessario, evitando burst artificiali.

- Contesti iniziali brevi, circa 2k token; stesso testo e istruzioni tra modelli,
  registrando i conteggi reali dei diversi tokenizer.
- Casi ITA, ENG e misti: definizioni dal documento, formule con unità, correzione
  di codice, chiarimenti, domande successive e informazioni deliberatamente assenti.
- Risposte attese deterministiche dove possibile; chiarezza valutata manualmente
  senza conoscere il candidato. Nessun modello promosso solo per la velocità.
- Modalità di reasoning documentata per ogni candidato; distinguere nascondere
  il ragionamento da disattivarlo. Non presumere parametri comuni a tutti.
- Misure: attesa nella coda dell'app, primo evento di stream, primo testo finale,
  tempo per 20 caratteri visibili, durata totale, token input/output/reasoning,
  correttezza, informazioni inventate, 429/5xx, timeout, interruzioni e retry.
- Registrare sia il singolo tentativo sia il tempo totale percepito della domanda;
  identificare provider/modello e condizioni del run, senza chiavi o dati personali.
- Riportare mediana e distribuzione delle misure; approfondire le code lente con
  più campioni anziché trarre conclusioni robuste sul p95 da pochi dati.

Seconda fase: contesti da circa 8k e 20k su Cloudflare; verifiche dei limiti Groq
compatibili con il piano gratuito. Seguire il protocollo completo del report
ruotando l'informazione bersaglio fra inizio, centro e fine e usando distrattori
realistici, senza ripetizioni artificiali che favoriscano la cache.

- [x] Ricerca ricevuta, letta, archiviata e rinominata.
- [x] Vincolo non-Gemini e gratuità salvato.
- [x] Verificate quote Groq, prezzi/contesto Cloudflare e prova temporanea Cerebras.
- [x] Verificare accesso API e header Groq; piano amministrativo di billing non interrogato.
- [x] Preparare corpus e runner con output sintetici locali.
- [x] Eseguire confronto breve, pilota reale e prove Cloudflare distanziate/documenti completi; residui Groq esclusi dal budget registrati.
- [ ] Scegliere modello, politica di contesto e fallback sulla base delle prove.
- [ ] Implementare Q&A separato dalla pipeline, se successivamente richiesto.

Il [report dei risultati](qna-benchmark-risultati-2026-10-13.md) descrive misure,
errori osservati, formule non renderizzate e copertura ridotta per quote.
20B è candidato per il contesto breve; nessuna scelta definitiva del modello.

## Fonti consultate e collegamenti

Verifica documentale del 13 ottobre 2026:

- [Groq — Rate Limits](https://console.groq.com/docs/rate-limits): piano Free,
  quote per modello, organizzazione e token cached.
- [Groq — Supported Models](https://console.groq.com/docs/models): ID, stato,
  contesto e throughput dichiarato, distinto dalle quote del piano gratuito.
- [Cloudflare — Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/):
  10.000 Neurons/giorno, reset, piano Free e tariffe per modello.
- [Cloudflare — Qwen3-30B-A3B](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/):
  contesto, reasoning, streaming e API.
- [Cloudflare — Qwen3.8-27B](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/):
  Vision, contesto e livelli di reasoning.
- [Cerebras — Rate Limits e FAQ](https://inference-docs.cerebras.ai/support/rate-limits):
  condizioni e scadenza del trial, assenza di quota gratuita rinnovabile.

Riferimenti di progetto:
[idee future, voce 9](../product/idee-future-2026-10-13.md),
[collaudo Q&A esistente](../quality/qna-live-check-2026-09-11.md),
[registro delle decisioni](../../DECISIONI.md).
