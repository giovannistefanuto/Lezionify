# Alternative API gratuite e veloci a Gemini per il Q&A contestuale di Lezionify

**Ricerca verificata al 13 ottobre 2026, fuso Europe/Rome.** Gemini è escluso dall’analisi. L’obiettivo è esclusivamente il modello/API per il Q&A contestuale; estrazione, indicizzazione e preparazione delle dispense restano fuori perimetro.

## Risultato in sintesi

Per i vincoli di Lezionify, la conclusione principale è che **non esiste oggi un unico servizio gratuito che sia contemporaneamente il migliore per velocità, contesto lungo, qualità, prevedibilità e privacy**. I free tier più interessanti hanno compromessi molto diversi.

La scelta più solida per un uso **realmente continuativo e senza pagamento obbligatorio** è **Cloudflare Workers AI con `@cf/qwen/qwen3-30b-a3b-fp8`**. Workers AI assegna **10.000 Neurons ogni giorno anche sul piano Free**, con reset giornaliero; per questo specifico modello il consumo pubblicato è molto basso, 4.625 Neurons per milione di token in input e 30.475 per milione in output. Il contesto è 32.768 token, sufficiente per richieste da circa 20k token purché storico, istruzioni e risposta restino entro quella finestra. La piattaforma Workers AI è GA, il modello non è marcato Beta, supporta reasoning, streaming SSE e un endpoint OpenAI-compatible. citeturn18view0turn19view2turn24view0

Per la modalità **“spiegami rapidamente questa selezione” con contesto corto**, Groq rimane invece nettamente più attraente: `openai/gpt-oss-120b` è Production e viene dichiarato a circa **500 token/s**, mentre `qwen/qwen3.8-27b` è Preview e viene dichiarato a circa **450 token/s**. Il problema decisivo è il free tier: entrambi hanno **8.000 TPM**, quindi una richiesta con circa 8.000 token di solo input non lascia praticamente alcun budget per system prompt, storico e risposta; 20.000 token uncached non possono entrare in una singola richiesta gratuita. citeturn3view0turn3view1

**Cloudflare `@cf/qwen/qwen3.8-27b`** è il candidato più interessante quando servono contemporaneamente contesto lungo, qualità più recente e futuro supporto alle immagini: la pagina ufficiale dichiara **262.144 token di contesto, Vision, reasoning e streaming**. Consuma però circa nove volte più Neurons in input e quasi dieci volte più in output rispetto al più economico Qwen3-30B-A3B, quindi il numero di interrogazioni giornaliere gratuite cala sensibilmente. citeturn20view1turn18view0

OpenRouter è utile soprattutto come **fallback/esplorazione**. Esistono oggi endpoint realmente a prezzo zero, fra cui `nvidia/nemotron-3-ultra-550b-a55b:free`, ma i modelli gratuiti hanno capacità variabile e possono essere limitati anche dal provider a monte; OpenRouter documenta esplicitamente il fallback fra provider e i 429 dovuti alla capacità upstream. Inoltre la pagina ufficiale dei limiti espone il tetto gratuito giornaliero anche attraverso `GET /api/v1/key`, ma nell'attuale versione della documentazione i valori numerici della tabella RPM/RPD non erano estraibili in modo affidabile dal documento consultato: **non li riporto per non inventarli**. citeturn9view0turn21view0turn6search7

Cerebras, nonostante velocità dichiarate eccezionali, **non soddisfa il requisito di gratuità continuativa**: la documentazione corrente specifica che non esiste un permanent free tier. I nuovi account ricevono $5 di crediti solamente dopo avere aggiunto un metodo di pagamento verificato; i crediti scadono dopo 30 giorni e, una volta terminati, per proseguire occorre acquistare crediti. Va quindi considerato un ottimo banco di prova temporaneo, non il backend gratuito definitivo di Lezionify. citeturn5view2turn5view1

### I due test da fare per primi

**Prima scelta — Cloudflare Workers AI + `@cf/qwen/qwen3-30b-a3b-fp8`.** È la combinazione che meglio rispetta *tutti* i vincoli economici del progetto: free allowance rinnovabile ogni giorno, contesto sufficiente per 20k token, RPM molto elevati rispetto a un uso individuale, multilingual, reasoning, TypeScript, SSE e nessun obbligo di passare a Workers Paid finché si resta entro i 10.000 Neurons giornalieri. citeturn18view0turn19view2turn24view0

**Seconda scelta — Groq + `openai/gpt-oss-120b`**, ma come *fast path* per prompt piccoli. È Production, ha 128/131k circa di finestra modello a seconda della rappresentazione del provider, forte orientamento STEM/coding/reasoning e Groq pubblicizza circa 500 token/s. Non è però un sostituto per il “manda tutta la dispensa”: gli 8k TPM del free tier lo rendono strutturalmente inadatto ai prompt lunghi. citeturn3view0turn3view1turn24view1

Una configurazione Lezionify sensata sarebbe quindi **Cloudflare Qwen3-30B come default**, **Groq GPT-OSS-120B per richieste corte e interattive**, con Cloudflare Qwen3.8 come opzione futura per slide/immagini.

## Confronto dei candidati verificati

La tabella contiene al massimo cinque coppie modello/servizio. “ND” significa **non pubblicato o non verificabile in modo sufficientemente affidabile nelle fonti ufficiali consultate**, non zero.

| Modello / servizio | API, stato, integrazione | Free tier e contesto | Qualità attesa per Lezionify | Latenza verificabile | Immagini, affidabilità e dati |
|---|---|---|---|---|---|
| **Cloudflare Workers AI — `@cf/qwen/qwen3-30b-a3b-fp8`** | ID esatto `@cf/qwen/qwen3-30b-a3b-fp8`; Workers AI **GA**, modello non marcato Beta; streaming SSE; REST, binding TypeScript e endpoint OpenAI-compatible. citeturn19view2turn24view0 | **10.000 Neurons/giorno**, rinnovati ogni giorno; text-generation **300 RPM**; nessun TPM/TPD separato pubblicato perché il budget gratuito è compute-based. Contesto **32.768**. Consumo: 4.625 N/M input + 30.475 N/M output. citeturn18view0turn19view2turn24view0 | Molto promettente per ITA/ENG: Cloudflare descrive Qwen3 come multilingual, reasoning e instruction-following. Adeguato a definizioni, formule e codice; per il Q&A universitario italiano serve comunque il benchmark applicativo sotto. citeturn24view0 | **Nessun TTFT/tok/s ufficiale trovato** per questa route. Non attribuire numeri di Qwen eseguito altrove a Cloudflare. | **Text-only** nella pagina specifica. Quota giornaliera molto prevedibile; piattaforma GA. Cloudflare dedica una policy specifica all'uso dei dati di Workers AI; per materiale riservato va verificata insieme alle opzioni di logging effettivamente abilitate nell'account. citeturn20view2turn24view0 |
| **Groq — `openai/gpt-oss-120b`** | ID `openai/gpt-oss-120b`; **Production**; SDK/API TypeScript e streaming. citeturn3view0turn4view3 | **30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD** sul Free Plan; contesto Groq **131.072**, max completion 65.536. citeturn3view1turn3view0 | Molto forte su STEM, matematica, reasoning e codice: OpenAI riporta valutazioni su MMLU/HLE, AIME, Codeforces e TauBench; `gpt-oss-120b` raggiunge circa la fascia o4-mini in vari benchmark dichiarati. Attenzione all'italiano: il pretraining ufficialmente è **prevalentemente inglese**, anche se STEM/code sono un focus esplicito. citeturn24view1 | Groq pubblicizza **~500 token/s**. È throughput di generazione, **non TTFT né tempo end-to-end**. TTFT utile per 2k input non è pubblicato nella scheda consultata. citeturn3view0 | Modello testuale; reasoning `low/medium/high`. Groq dichiara input/output non conservati di default, salvo feature persistenti e logging temporaneo per affidabilità/abusi; tali log possono durare fino a 30 giorni e tutti i clienti possono abilitare ZDR. citeturn4view4turn5view0 |
| **Groq — `qwen/qwen3.8-27b`** | ID `qwen/qwen3.8-27b`; **Preview**, quindi può cambiare/essere ritirato con meno preavviso; streaming e API compatibile con integrazione TS. citeturn3view0turn4view3 | **30 RPM, 1.000 RPD, 8.000 TPM, 200.000 TPD**; contesto **131.072**, max completion 16.384. citeturn3view1turn3view0 | Candidato particolarmente interessante per multilingual e coding. Il model card Qwen pubblica benchmark di coding con metodologia/harness dichiarati; ciò non equivale però a una misura specifica di spiegazioni universitarie in italiano. citeturn23search13 | Groq pubblicizza **~450 token/s**; ancora una volta è decode throughput, non TTFT. citeturn3view0 | Sul backend Groq il supporto immagini **non è sufficientemente documentato nelle fonti qui verificate per poterlo presumere dalla famiglia del modello**. Può invece disattivare il reasoning con `reasoning_effort: none`; questo è utile per ridurre la latenza delle domande semplici. citeturn4view4 |
| **Cloudflare Workers AI — `@cf/qwen/qwen3.8-27b`** | ID esatto; Cloudflare-hosted, reasoning, function calling, batch, streaming SSE, OpenAI-compatible. Il modello non è marcato Beta nella pagina corrente. citeturn20view1 | Stessi **10.000 Neurons/giorno** e **300 RPM** del free plan; contesto **262.144**. Costo computazionale: 40.909 N/M input, 290.909 N/M output, 4.545 circa N/M cached input secondo la tariffazione pubblicata. citeturn18view0turn19view2turn20view1 | Più moderno e, sulla carta, più interessante del vecchio Qwen3-30B per ragionamento complesso, codice e conversazioni contestuali; il model card dichiara modalità di valutazione per benchmark software. Nessun benchmark consultato misura direttamente “spiega una dispensa magistrale in italiano”, quindi la differenza va misurata. citeturn23search13turn20view1 | Cloudflare **non pubblica nella scheda un TTFT o un throughput** confrontabile con i numeri Groq. Qualunque tok/s visto per Qwen su altri provider sarebbe una misura di hardware/serving diverso. | **Vision: sì**, esplicitamente dichiarata. È quindi il candidato gratuito più naturale fra quelli esaminati per una futura lettura diretta di immagini di slide. Reasoning disponibile in `low`, `medium`, `xhigh`; `xhigh` è il default dichiarato, quindi per Q&A semplici conviene benchmarkare `low` per la latenza. citeturn20view1 |
| **OpenRouter — `nvidia/nemotron-3-ultra-550b-a55b:free`** | Endpoint specifico `:free`, attualmente a costo token zero; contesto **1.000.000** e max completion 65.536 nell'API modelli corrente. OpenRouter dispone di SDK/integrazioni TS e streaming. citeturn9view0turn6search7 | **RPD/RPM del free tier sono account/tier dependent**; l'API `GET /api/v1/key` restituisce `free_model_daily_requests.used/limit/remaining`. La tabella numerica della documentazione corrente non era estratta integralmente dal documento consultato, perciò non attribuisco numeri non verificati. Non è pubblicato un TPM/TPD generale equivalente a Groq. citeturn21view0 | Interessante come modello gratuito grande, ma non ho trovato un benchmark sufficientemente specifico e metodologicamente comparabile per assegnargli con sicurezza un vantaggio su ITA/formule/codice rispetto ai Qwen/GPT-OSS sopra. Da trattare come candidato sperimentale, non come prima scelta. | **Non esiste una velocità unica**: OpenRouter può instradare su provider diversi. La capacità gratuita può variare e in picco la latenza può aumentare; un 429 del provider può innescare fallback su un altro endpoint per lo stesso modello. citeturn6search7turn21view0 | Text-only nella metadata corrente. Le policy di retention/training dipendono anche dal provider effettivamente scelto; OpenRouter permette di escludere provider che addestrano sui prompt, con impostazioni separate anche per i modelli gratuiti. citeturn9view0turn21view1 |

Una distinzione importante è quindi **modello ≠ servizio di inferenza**. Lo stesso Qwen3.8 può avere 131k su Groq, 262k su Cloudflare, quote completamente diverse e latenze completamente diverse. Analogamente non è corretto dedurre che un modello sia gratuito su Groq solo perché un altro modello della stessa famiglia lo è: la tabella Free Plan corrente elenca esplicitamente gli ID ammessi. citeturn3view0turn3view1turn20view1

## Free tier, prove temporanee e servizi da non confondere

### Cerebras: velocissimo, ma non gratuito in modo permanente

Cerebras merita di essere provato solo per avere un riferimento prestazionale. Sul **Free Trial** corrente, sia `gpt-oss-120b` sia `qwen-3.8-27b` hanno **5 RPM, 30.000 uncached TPM, 90.000 total TPM, 1 milione TPH e 1 milione TPD**. Per Qwen3.8 la tabella prevede inoltre fino a due immagini per richiesta e 10 MiB di payload nel trial. citeturn5view2

Dal punto di vista del contesto, Cerebras dichiara circa **65k token gratuiti per GPT-OSS-120B** e **64k per Qwen3.8-27B**, quindi una richiesta da 20k token è tecnicamente molto più realistica che sul free tier Groq. La velocità pubblicizzata è straordinaria: circa **3.000 token/s per GPT-OSS-120B** e **1.850 token/s per Qwen3.8-27B**. Sono però numeri **pubblicizzati dal provider**, non TTFT o tempi end-to-end misurati nel flusso Lezionify. citeturn5view1

Il vincolo economico lo elimina: Cerebras specifica che il Free Trial concede **$5 di crediti solo dopo l'aggiunta di un metodo di pagamento verificato**, che tali crediti **scadono dopo 30 giorni**, e che non esiste un permanently free tier. Esauriti crediti o periodo di prova, l'API non continua gratuitamente. citeturn5view2

**Verdetto: eccellente per un benchmark temporaneo di latenza, non accettabile come backend “gratis per sempre” di Lezionify.**

### Mistral: vero Free mode, ma quote non pubblicamente auditabili

Mistral ha invece un **Free mode autentico**, con accesso API abilitato senza carta di credito; la documentazione lo presenta esplicitamente come modalità gratuita soggetta a limiti di utilizzo. citeturn13view0

Il candidato attuale interessante sarebbe **Mistral Small 4**, ID versionato `mistral-small-2603`: è **GA**, Apache 2.0, 119B parametri/6,5B attivi, modello ibrido instruct/reasoning/coding e finestra **256k**. La Chat Completion API supporta multi-turn, streaming e documenta esempi TypeScript. citeturn16view0turn15view1

Il problema per una ricerca come questa è la trasparenza delle quote: l'articolo Mistral aggiornato nell'agosto 2026 specifica che i limiti sono espressi in richieste, token/minuto e token/mese, ma invita a leggere i **valori correnti nel pannello Admin → Limits dell'account** invece di pubblicare una tabella numerica stabile. Il free tier è descritto come il livello più basso, destinato principalmente a evaluation e prototyping. citeturn13view1

Pertanto Mistral è **tecnicamente idoneo al requisito “nessun pagamento obbligatorio”**, ma non lo metterei fra le prime due scelte finché Lezionify richiede una capacità gratuita quantitativamente pianificabile: senza poter citare RPM/TPM mensili pubblici, non è possibile garantire oggi quanto siano praticabili 8k o 20k token per richiesta. citeturn13view0turn13view1

### OpenRouter: distinguere `:free` stabile oggi da promozione temporanea

OpenRouter è il caso in cui è particolarmente importante verificare **l'ID esatto**, non il nome della famiglia. Il catalogo del 13 ottobre 2026 espone effettivamente varianti specifiche a prezzo zero. Per esempio `nvidia/nemotron-3-ultra-550b-a55b:free` risulta a $0 e con 1M token di contesto. citeturn9view0

Altri zero-price endpoint sono invece chiaramente temporanei. `poolside/laguna-s-2.1:free`, per esempio, presenta nella metadata corrente una **expiration date del 31 ottobre 2026**. È quindi un esempio concreto del motivo per cui “oggi costa zero” non deve essere tradotto automaticamente in “free tier rinnovabile”. citeturn9view4

Il router generico `openrouter/free` è ancora meno adatto come modello principale di Lezionify: OpenRouter spiega che sceglie fra il pool gratuito disponibile e che disponibilità, limiti e latenza possono variare, soprattutto ai picchi. È utile per demo e fallback, ma un'app didattica beneficia molto di più di un ID modello fissato, perché altrimenti comportamento, stile, capacità matematica e gestione del contesto possono cambiare fra una richiesta e la successiva. citeturn6search7

Sul fronte privacy, OpenRouter è più complesso di un provider diretto: ogni endpoint sottostante può avere regole proprie di logging e retention. È possibile configurare l'account o la singola richiesta affinché non venga usato un provider che consente training sui prompt; OpenRouter sottolinea che esistono impostazioni separate per provider gratuiti e a pagamento. citeturn21view1

## Cosa succede con input da 2k, 8k e 20k token

La dimensione di contesto teorica del modello è solo metà del problema. Per Lezionify contano soprattutto **il rate limit gratuito sul prompt** e **il costo giornaliero effettivo**.

Per rendere confrontabile Cloudflare, i calcoli seguenti assumono **500 token di output** per domanda, nessun'altra chiamata Workers AI nello stesso account e i prezzi in Neurons pubblicati il 9 ottobre 2026. Sono quindi calcoli deterministici dalle quote ufficiali, non throughput misurati. citeturn18view0

| Pair | ~2.000 input + 500 output | ~8.000 input + 500 output | ~20.000 input + 500 output | Implicazione |
|---|---:|---:|---:|---|
| **Cloudflare Qwen3-30B-A3B** | ~24,5 N → **~408 req/giorno** | ~52,2 N → **~191 req/giorno** | ~107,7 N → **~92 req/giorno** | Eccellente sostenibilità gratuita; 20k entra nel contesto 32.768. citeturn18view0turn24view0 |
| **Cloudflare Qwen3.8-27B** | ~227 N → **~44 req/giorno** | ~473 N → **~21 req/giorno** | ~964 N → **~10 req/giorno** | Molto più costoso in Neurons, ma 262k context + Vision. citeturn18view0turn20view1 |
| **Groq GPT-OSS-120B** | **OK** rispetto agli 8k TPM | **No, in pratica:** 8k input + output/system/history supera 8k TPM | **No**: una sola richiesta uncached supera il TPM | Perfetto per Q&A corto, inadatto a “allega tutta la dispensa”. citeturn3view1 |
| **Groq Qwen3.8-27B** | **OK** | **No, in pratica** per lo stesso 8k TPM | **No** | Stesso collo di bottiglia, nonostante il contesto modello da 131k. citeturn3view0turn3view1 |
| **OpenRouter Nemotron Ultra free** | Finestra modello sufficiente | Finestra modello sufficiente | Finestra modello ampiamente sufficiente | La capacità free effettiva è meno prevedibile perché dipende dai limiti OpenRouter e dal provider upstream. citeturn9view0turn21view0 |

Il risultato Cloudflare Qwen3-30B-A3B merita attenzione. Con una richiesta tipica da **20.000 token di input e 500 di output**, il consumo teorico è:

\[
20\,000 \times \frac{4625}{10^6}
+
500 \times \frac{30\,475}{10^6}
\approx 107.7 \text{ Neurons}
\]

Su 10.000 Neurons quotidiani sono circa **92 richieste di quel tipo al giorno**. Per un singolo studente è un margine molto più ampio di quanto facciano pensare le normali quote token-based. È tuttavia necessario lasciare margine nella finestra da 32.768 per system prompt, titolo, citazione, history e output. citeturn18view0turn24view0

Con Qwen3.8 su Cloudflare la stessa richiesta consuma circa:

\[
20\,000 \times \frac{40\,909}{10^6}
+
500 \times \frac{290\,909}{10^6}
\approx 963.6 \text{ Neurons},
\]

ossia circa **10 richieste/giorno**. Il modello più recente/vision diventa dunque un “quality path” sostenibile occasionalmente, ma non sarebbe la mia scelta per spedire l'intera dispensa ad ogni click. citeturn18view0turn20view1

Questo porta a una conseguenza architetturale importante per Lezionify: **anche quando il provider consente 20k o 200k token, inviare l'intera dispensa ad ogni domanda è raramente la strategia migliore**. Per il Q&A ordinario conviene inviare citazione + sezione + un intorno testuale ragionevole + history compatta, riservando il full-document context ai casi in cui la risposta richiede effettivamente collegamenti lontani. Questa conclusione deriva direttamente dai budget gratuiti sopra: ridurre 20k a 2k input moltiplica di circa nove volte il numero di richieste gratuite giornaliere nel caso Cloudflare Qwen3.8. citeturn18view0turn20view1

### TTFT, primo testo utile e durata totale

I numeri Groq e Cerebras pubblicizzati non vanno interpretati come “la risposta compare dopo 1/500 di secondo”. **Token/s misura principalmente la fase di decoding dopo che il modello ha elaborato il prompt.** TTFT comprende anche rete, coda e prefill; con 20k token di input il prefill può dominare l'esperienza percepita. Per questo un modello a 1.000 token/s può avere un TTFT peggiore di uno a 300 token/s sotto carico o con un prompt enorme.

Nelle fonti ufficiali consultate:

- Groq pubblica ~500 t/s per GPT-OSS-120B, ~1.000 t/s per GPT-OSS-20B e ~450 t/s per Qwen3.8-27B, ma **non fornisce nella scheda verificata un TTFT per 2k/8k/20k**. citeturn3view0
- Cerebras pubblicizza ~3.000 t/s per GPT-OSS-120B e ~1.850 t/s per Qwen3.8-27B, ma anche questi valori **non sono tempi end-to-end di Lezionify**. citeturn5view1
- Cloudflare non pubblica nelle schede esaminate un tok/s o TTFT comparabile per le due route Qwen. citeturn20view1turn24view0
- OpenRouter non può avere un'unica velocità rappresentativa di un `:free`, perché la route può dipendere dal provider sottostante; l'upstream può anche essere a capacità piena e innescare fallback. citeturn21view0

Non ho quindi trasformato velocità pubblicitarie in falsi “tempi della risposta”. L'unico confronto serio per Lezionify è misurare le tre metriche separatamente sul client reale.

### Effetto del reasoning

Il reasoning è particolarmente importante perché può peggiorare **il tempo al primo testo utile** anche quando il server ha già iniziato a lavorare.

GPT-OSS supporta `low`, `medium`, `high`: OpenAI descrive esplicitamente il controllo come un trade-off fra qualità e latenza; Groq implementa gli stessi livelli. Abbassare l'effort è quindi sensato per richieste tipo “che cosa significa questa definizione?”, mentre `medium` o `high` può essere riservato a dimostrazioni, formule difficili o debugging. citeturn24view1turn4view4

Su Groq, Qwen3.8 ha anche `reasoning_effort: none`, che disabilita il reasoning. È una proprietà molto utile per Lezionify: un possibile routing è **none per definizioni/riscritture**, low/medium per formule e codice. citeturn4view4

È inoltre importante distinguere **nascondere il reasoning** da **non eseguirlo**. Groq supporta formati come `hidden`, ma nascondere i reasoning token dall'output non significa evitare il lavoro computazionale che li produce; per ridurre davvero il ritardo bisogna diminuire l'effort o, dove supportato, disattivarlo. citeturn4view4

## Benchmark riproducibile per Lezionify

Non riporto una falsa tabella di TTFT “misurati” perché in questa ricerca non dispongo delle API key personali necessarie a eseguire le route gratuite nelle stesse condizioni di account, regione e quota. Il benchmark seguente è progettato appositamente per produrre numeri confrontabili sul PC/app reale e, a differenza dei tok/s promozionali, misura ciò che vede effettivamente lo studente.

### Corpus e domande

Preparerei **15 casi base**, ciascuno eseguito con contesti da circa 2k, 8k e 20k token, in italiano, inglese e almeno alcuni casi cross-language. Ogni contesto contiene informazione bersaglio e distrattori realistici da dispense di Ingegneria Informatica; per raggiungere 8k/20k non userei la semplice ripetizione di una stringa, perché ciò favorirebbe caching e compressibilità artificiali.

Cinque classi coprono il comportamento rilevante.

**Formula.** Il contesto definisce, per esempio, una metrica inventata così da impedire al modello di rispondere solo dalla propria conoscenza:

> Nel modello della dispensa, \(C = 3L/R + 2D\), con \(L=12000\) bit, \(R=6\cdot10^6\) bit/s e \(D=0.7\) ms.

Domanda ITA: *«Calcola C e spiegami in una frase cosa rappresentano i due termini. Usa esclusivamente la formula della dispensa.»*

Gold: \(3L/R=6\) ms; \(2D=1.4\) ms; \(C=7.4\) ms.

**Codice.** Nel contesto si mette un frammento C/C++ o Java con un errore identificabile localmente:

```cpp
double average(const vector<int>& a) {
    int sum = 0;
    for (int x : a) sum += x;
    return sum / a.size();
}
```

Domanda: *«Perché `average({1,2})` non restituisce 1.5? Proponi la modifica minima e spiegane il tipo.»*

Gold: divisione intera prima della conversione; cast di uno degli operandi a `double`.

**Definizione contestuale.** Si introduce una definizione con terminologia leggermente diversa da quella standard, per verificare che il modello legga davvero la dispensa:

> In queste note chiameremo *checkpoint forte* un checkpoint che rende persistenti sia lo stato applicativo sia la posizione del log prima di restituire successo.

Domanda: *«Che cosa significa “checkpoint forte” secondo queste note e che cosa deve accadere prima dell'ACK?»*

**Follow-up conversazionale.** Primo turno con una legge di Amdahl o una complessità; secondo turno:

> *«Nel calcolo precedente, lascia invariato \(p\) ma raddoppia il numero di core: il vantaggio raddoppia? Mostra il confronto.»*

Il secondo prompt deve poter essere risolto solo usando correttamente lo storico.

**Informazione mancante.** Il contesto tratta un protocollo ma omette deliberatamente il valore chiesto:

> *«Qual è il timeout iniziale del protocollo descritto nella dispensa?»*

System instruction:

```text
Rispondi usando soltanto il CONTESTO e la conversazione forniti.
Se l'informazione necessaria non è presente o non è deducibile,
rispondi iniziando esattamente con:
NON_PRESENTE_NEL_CONTESTO
Non integrare la risposta con conoscenze esterne.
```

Questa categoria è essenziale. Non esiste nelle fonti consultate un benchmark provider-specifico che dimostri in modo affidabile quanto ciascuno di questi endpoint sappia dire “non è nel contesto”. Attribuire a priori questa capacità a un modello sarebbe quindi speculativo. Va misurata direttamente, e la metrica più importante è **false-answer rate sui casi mancanti**, non soltanto una generica accuracy.

### Tre lunghezze senza cambiare il problema

Per ogni caso si costruiscono tre versioni:

- **S2:** circa 2.000 prompt token;
- **S8:** circa 8.000;
- **S20:** circa 20.000.

L'informazione bersaglio va ruotata fra **inizio, centro e fine** del documento. In questo modo si evita di confondere la capacità di long-context retrieval con un semplice effetto di posizione.

Il conteggio finale deve essere quello **restituito dal provider in `usage.prompt_tokens`**, perché tokenizer differenti possono trasformare lo stesso testo in un numero diverso di token. Il generatore del corpus può aggiungere o rimuovere paragrafi fino a raggiungere, per esempio, ±5% del target.

Per Groq, S8 e S20 hanno anche funzione di test della quota: S8 dovrebbe mostrare immediatamente il problema del tetto 8k TPM, mentre S20 è incompatibile con una singola richiesta uncached sul Free Plan. Questo non è un errore del benchmark, ma un risultato operativo rilevante. citeturn3view1

### Metriche di latenza

Per ogni richiesta registrerei quattro timestamp:

\[
T_0 = \text{request start}
\]

\[
TTFB = T_{\text{primo evento SSE}} - T_0
\]

\[
TTFT = T_{\text{primo carattere visibile della risposta}} - T_0
\]

\[
TTFU = T_{\text{primo frammento semanticamente utile}} - T_0
\]

e infine:

\[
T_{\text{full}} = T_{\text{DONE}} - T_0
\]

Per automatizzare TTFU senza giudizio umano, si può definirlo come il momento in cui sono arrivati **almeno 20 caratteri non-whitespace di `content`**, escludendo campi di reasoning e metadata. Non è perfetto semanticamente, ma è riproducibile e molto più vicino alla UX reale di Lezionify del semplice primo pacchetto SSE.

Il throughput va poi calcolato separatamente:

\[
\text{decode tok/s} =
\frac{\text{completion tokens}}
     {T_{\text{full}}-T_{\text{primo token testuale}}}
\]

In questo modo un endpoint con 800 tok/s ma 4 secondi di prefill non viene erroneamente classificato come “più reattivo” di uno con 250 tok/s e 300 ms di TTFT.

### Protocollo sperimentale

Per ciascuna combinazione **modello × lunghezza × domanda × reasoning mode** userei almeno **10 ripetizioni**, distribuite in tre fasce orarie italiane invece di tutte consecutive. Riporterei mediana e p95, non solo la media. Per l'affidabilità registrerei separatamente HTTP 429, 5xx, timeout, stream interrotti e retry riusciti.

Un run completo deve salvare almeno:

```ts
type BenchResult = {
  provider: string;
  model: string;
  caseId: string;
  targetInputTokens: 2000 | 8000 | 20000;

  promptTokens?: number;
  completionTokens?: number;

  reasoningMode: string;

  ttfbMs: number | null;
  ttftMs: number | null;
  ttfuMs: number | null;
  totalMs: number | null;
  decodeTokensPerSecond: number | null;

  httpStatus: number;
  retries: number;

  answer: string;
  correct: boolean;
  abstainedWhenRequired: boolean | null;
};
```

Per qualità userei uno score deterministico dove possibile: valore numerico corretto per le formule, test case per il codice, presenza dei concetti obbligatori per le definizioni, risultato numerico del follow-up e token `NON_PRESENTE_NEL_CONTESTO` per l'abstention. Solo la chiarezza pedagogica richiede un giudizio umano, idealmente cieco rispetto al modello.

Una ponderazione ragionevole per Lezionify sarebbe:

\[
S =
0.30Q_{\text{correct}}
+0.20Q_{\text{abstain}}
+0.15Q_{\text{pedagogy}}
+0.15L_{\text{TTFU}}
+0.10L_{\text{full}}
+0.10R_{\text{reliability}}
\]

dove le componenti di latenza sono normalizzate fra i candidati. Questo evita che un modello rapidissimo ma incline a inventare informazioni mancanti vinca per il solo tok/s.

### Configurazione da testare

Per rendere il confronto equo, fisserei `temperature` bassa, output massimo 512–768 token e stesso system prompt. Per i reasoning model farei almeno due run: **modalità rapida** e **modalità ragionata**. GPT-OSS consente low/medium/high; Groq Qwen3.8 permette anche `none`; Cloudflare Qwen3.8 espone low/medium/xhigh. citeturn4view4turn20view1turn24view1

In particolare non confronterei Groq Qwen con reasoning `none` contro Cloudflare Qwen con `xhigh` default e poi attribuirei tutta la differenza all'infrastruttura: sarebbe un benchmark non controllato.

## Raccomandazione finale per Lezionify

### Uso completamente gratuito

La mia configurazione raccomandata al **13 ottobre 2026** è:

**Backend Q&A principale: Cloudflare Workers AI — `@cf/qwen/qwen3-30b-a3b-fp8`.**

È il candidato che ha il miglior equilibrio verificabile fra gratuità continuativa e capacità reale. Il piano Free assegna **10.000 Neurons al giorno senza dover passare al Workers Paid plan**, la quota si rinnova quotidianamente, text generation arriva a **300 RPM**, il modello ha **32.768 token di contesto**, supporta reasoning e streaming e costa solo 4.625 N/M input + 30.475 N/M output. citeturn18view0turn19view2turn24view0

Per l'uso individuale previsto da Lezionify, significa grossolanamente:

| Pattern | Capacità teorica gratuita/giorno* |
|---|---:|
| 2k input + 500 output | ~408 richieste |
| 8k input + 500 output | ~191 richieste |
| 20k input + 500 output | ~92 richieste |

\*Calcolo sulla tariffazione in Neurons corrente; il numero reale scende se le risposte sono più lunghe o l'account usa Workers AI per altro. citeturn18view0turn24view0

Il limite concreto più importante è **32.768 token complessivi di contesto**. Una dispensa da 20k è fattibile; una dispensa da 30k più conversation history e risposta non lo è. Per documenti ancora più grandi occorre passare a selezione di sezioni/RAG oppure a un modello con contesto maggiore. citeturn24view0

**Fast path opzionale: Groq — `openai/gpt-oss-120b`.** Quando il payload totale è circa 2–5k token, Groq è molto attraente per la UX: modello Production, forte su STEM/code/reasoning e ~500 token/s dichiarati. Per richieste di chiarimento locali è probabilmente la coppia che vale di più la pena confrontare contro Cloudflare in termini di TTFU. citeturn3view0turn24view1

Il routing può essere molto semplice:

```text
prompt stimato <= ~6k token
    -> Groq / openai/gpt-oss-120b
       reasoning=low per spiegazioni normali

prompt > ~6k
    -> Cloudflare / @cf/qwen/qwen3-30b-a3b-fp8

richiesta con immagine o slide
    -> Cloudflare / @cf/qwen/qwen3.8-27b

429 / capacity error
    -> fallback all'altro provider
```

Il valore di ~6k è deliberatamente conservativo, non una quota ufficiale: lascia margine sotto gli **8k TPM Groq** per system prompt, storico e completion. Il limite ufficiale resta 8.000 TPM. citeturn3view1

Per il futuro multimodale sceglierei **Cloudflare Qwen3.8-27B solo quando serve davvero una slide**. La pagina ufficiale conferma Vision e 262k di context, ma l'output costa 290.909 Neurons/M: usarlo indiscriminatamente per tutto il Q&A ridurrebbe fortemente il numero di richieste quotidiane gratuite. citeturn20view1turn18view0

### Rischio allucinazioni e risposta assente dal contesto

Non sceglierei il modello finale sulla base di MMLU/AIME da soli. Per Lezionify una risposta fluida ma inventata quando l'informazione non è nella dispensa è probabilmente peggiore di una risposta meno elegante che dichiara correttamente l'assenza.

Nessuna delle fonti analizzate fornisce una misura direttamente trasferibile del tipo **“percentuale di domande su dispense in cui il modello si astiene correttamente se l'informazione manca”** per queste specifiche coppie provider/modello. Il benchmark `NON_PRESENTE_NEL_CONTESTO` sopra deve quindi essere un criterio di accettazione reale. La raccomandazione sarebbe di non promuovere un candidato se il false-answer rate sui casi mancanti supera, per esempio, il 5%; quella soglia è una scelta progettuale di Lezionify, non un dato del provider.

Anche il prompt dovrebbe separare chiaramente conoscenza documentale e conoscenza generale:

```text
Prima determina se la domanda richiede un fatto contenuto nella dispensa.

Se il fatto è presente:
- rispondi dal contesto;
- non contraddire la dispensa con conoscenze esterne.

Se il fatto non è presente:
- dichiaralo esplicitamente;
- solo se l'utente lo chiede, aggiungi separatamente
  un'eventuale spiegazione di conoscenza generale.
```

Questo è particolarmente utile perché Lezionify conosce la provenienza del testo e può mostrare all'utente la differenza fra **“secondo la dispensa”** e **“spiegazione generale del modello”**.

### Privacy e prevedibilità

Fra le fonti verificate, Groq offre la documentazione più esplicita sul trattamento del contenuto: input/output non vengono conservati di default, salvo feature che richiedono persistenza o log temporanei per errori/abusi; tali log possono avere retention fino a 30 giorni e l'opzione Zero Data Retention è resa disponibile a tutti i clienti. È un vantaggio se in futuro Lezionify tratta dispense non pubbliche. citeturn5view0

OpenRouter richiede più attenzione perché la policy del provider effettivo è parte del modello di privacy. L'opzione che impedisce routing verso provider che addestrano sui prompt andrebbe attivata prima di inviare dispense private. citeturn21view1

Cloudflare ha una documentazione dedicata a “Your Data and Workers AI”; prima di distribuire l'app con materiale universitario riservato verificherei nelle condizioni dell'account esattamente quali funzionalità di logging siano abilitate e terrei disattivata qualunque telemetria del prompt non necessaria. citeturn20view2

Sul piano operativo, nessuno di questi free tier dovrebbe essere trattato come un servizio con SLA commerciale. Groq stesso distingue Production da Preview; OpenRouter dichiara capacità gratuita variabile e fallback; Cloudflare dà invece il vantaggio di una **quota giornaliera quantitativamente definita** e di una piattaforma Workers AI GA, che lo rende oggi il free tier più facile da modellare in Lezionify. citeturn3view0turn21view0turn19view2

## Modelli locali e fonti

### Locale, in breve

Il locale è interessante come fallback privacy/offline, ma **non presumerei la presenza di una GPU dedicata**.

Senza GPU, un modello da circa 7–8B quantizzato può funzionare su una CPU moderna con 16–32 GB di RAM, ma il tempo al primo testo e soprattutto il throughput sono normalmente molto meno adatti a una UX “seleziona frase → spiegazione immediata” rispetto a Groq/Cloudflare. Modelli 20–30B quantizzati sono possibili con abbastanza RAM di sistema, ma diventano ancora meno interattivi su sola CPU; questa è una valutazione architetturale da verificare sull'hardware target, non una promessa di tok/s universale.

Per classi più grandi, i requisiti crescono rapidamente. OpenAI dichiara per esempio che **gpt-oss-20b può essere eseguito con circa 16 GB di memoria**, mentre gpt-oss-120b è progettato per stare su una singola GPU da circa **80 GB**; non considererei quindi il 120B un target locale realistico per un normale notebook studentesco. citeturn24view1

Qwen3.8-27B è anch'esso troppo grande per essere assunto come modello locale “universale” senza sapere quanta RAM/VRAM abbia il computer. Una distribuzione di Lezionify destinata a macchine generiche dovrebbe quindi considerare il locale come **feature opzionale**, rilevare memoria e acceleratore disponibili a runtime, e proporre modelli piccoli/quantizzati solo quando l'hardware lo consente.

### Fonti primarie verificate

Le quote che incidono maggiormente sulla decisione provengono da documentazione ufficiale aggiornata: **Groq Rate Limits e Supported Models**, consultati il 13 ottobre 2026, definiscono esattamente Free Plan, ID, stato Production/Preview e throughput pubblicizzato. citeturn3view0turn3view1

Per Cloudflare, **Workers AI Pricing**, aggiornata il **9 ottobre 2026**, specifica 10.000 Neurons gratuiti/giorno e il costo computazionale per modello; **Workers AI Limits**, aggiornata il **17 settembre 2026**, indica 300 RPM per text generation gratuita. Le schede Qwen riportano ID, contesto, streaming, reasoning e, per Qwen3.8, Vision. citeturn18view0turn19view2turn20view1turn24view0

Per OpenRouter sono stati controllati il catalogo/API corrente dei modelli, la documentazione sui **rate limits**, il router gratuito e le policy sui provider. La stessa documentazione permette di interrogare `GET /api/v1/key` per ottenere il limite quotidiano effettivo del proprio account invece di hardcodare un valore che potrebbe cambiare. citeturn9view0turn21view0turn21view1turn6search7

Per Cerebras sono state usate le pagine ufficiali **Rate Limits** e **Model Catalog** correnti: sono la base sia delle quote del trial sia della conclusione che non esiste più un permanent free tier. citeturn5view2turn5view1

Per Mistral sono stati verificati **Free mode**, la pagina sui rate limit aggiornata nell'agosto 2026 e la scheda **Mistral Small 4**, rilasciato il **16 marzo 2026** come GA con ID `mistral-small-2603` e 256k context. citeturn13view0turn13view1turn16view0

Per la qualità di GPT-OSS è stata usata la documentazione/model release originale OpenAI del **5 agosto 2025**, che dichiara metodologia e benchmark su coding, matematica, general reasoning e tool use e, soprattutto, specifica che il corpus di pretraining è prevalentemente inglese e focalizzato su STEM/coding: dettaglio rilevante per non sovrastimare a priori l'italiano. citeturn24view1 Per Qwen3.8 è stato verificato il model card ufficiale, che descrive anche le configurazioni/harness impiegate nelle valutazioni software; non essendoci però un benchmark direttamente equivalente al task di Lezionify in italiano, la decisione finale fra Qwen3-30B, Qwen3.8 e GPT-OSS dovrebbe essere presa sui risultati del benchmark applicativo definito sopra, non sui soli benchmark generali. citeturn23search13

**Verdetto al 13 ottobre 2026:** per Lezionify partirei da **Cloudflare Workers AI / `@cf/qwen/qwen3-30b-a3b-fp8` come backend gratuito principale**, aggiungerei **Groq / `openai/gpt-oss-120b` come percorso ultra-rapido per contesti brevi**, e terrei **Cloudflare / `@cf/qwen/qwen3.8-27b` come percorso multimodale/quality per casi difficili e slide**. Cerebras è soltanto una prova temporanea; Mistral è tecnicamente gratuito ma troppo opaco nelle quote pubbliche per pianificarne oggi l'uso intensivo; OpenRouter è un ottimo fallback, ma meno prevedibile di un provider diretto per un'app didattica che deve comportarsi allo stesso modo ogni giorno. citeturn18view0turn24view0turn3view0turn3view1turn20view1turn5view2turn13view1turn21view0