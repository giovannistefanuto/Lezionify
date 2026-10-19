# Q&A gratuito senza Gemini — risultati del 13 ottobre 2026

Per continuare in futuro partire dal
[documento completo di ripresa](qna-non-gemini-ripresa-completa-2026-10-13.md).

Groq GPT-OSS 20B è il candidato più rapido sui contesti brevi provati:
primo testo mediano sotto mezzo secondo nel corpus principale e nel pilota
reale. Cloudflare Qwen con lo switch soft `/no_think` è un secondo candidato
utile: nel pilota reale arriva al primo testo in circa un secondo anche con
la dispensa intera. La scelta definitiva resta aperta: sono emersi errori di
contenuto e incompatibilità dei delimitatori matematici, anche nel 120B.

Stato: esecuzione conclusa entro i cap locali invariati. Il run sintetico
registra 381 esiti: **270 risposte complete, 2 prove fallite e 109 saltate per
budget**. I due errori sono di rete/stream; non sono attribuiti con certezza
al servizio. Le prove aggiuntive registrano 21 risposte reali complete su tre
domande riutilizzate in condizioni distinte e una diagnostica sintetica completa.

## Confronto principale

Run valido `benchmark-20261013-v3`, fase `main`: 12 problemi sintetici,
tre ripetizioni, medesimi messaggi per ciascun modello. Temperatura 0,2,
output massimo 2.048 token; GPT-OSS con reasoning low, Qwen con impostazione
del provider. Nessun cambio di modello o provider in caso di errore.

| Modello | Risposte complete | Primo testo mediano | Risposta completa mediana | Screening passato |
| --- | ---: | ---: | ---: | ---: |
| Groq GPT-OSS 20B | 36/36 | 0,496 s | 0,802 s | 31/36 |
| Groq GPT-OSS 120B | 36/36 | 0,642 s | 1,266 s | 31/36 |
| Cloudflare Qwen3 30B A3B FP8 | 36/36 | 2,558 s | 3,758 s | 25/36 |

Lo screening verifica marcatori e valori, **non misura una percentuale di
correttezza**. Alcuni fallimenti sono falsi negativi, ad esempio una quantità
scritta con separatori LaTeX o una parafrasi corretta. Sono presenti anche
risposte con marcatori giusti ma dettagli errati. Le ripetizioni non sono
36 domande indipendenti: la variabilità temporale e la qualità vanno separate.

Controllo aggiuntivo del codice sintetico già letto: nove correzioni C++
compilate con g++ C++17 e provate su tre vettori non vuoti (compresi valori
negativi), tutte riuscite. Per Cloudflare il harness mantiene il corpo della
funzione originale e applica la sola riga `return` richiesta. Nel caso Python,
otto funzioni corrette passano parsing e cinque verifiche su liste indipendenti
e lista esplicita; una funzione Cloudflare ha un errore di sintassi nel testo
ricevuto. I blocchi di esempio REPL non sono trattati come funzioni difettose.
Queste verifiche riguardano solo i due problemi sintetici, con i loro vincoli.

Input effettivo osservato: 2.101–2.262 token Groq e 2.515–2.705 Cloudflare.
Il contenuto è identico, i tokenizer sono diversi. I tempi iniziano dall'invio
HTTP e terminano alla fine dello stream; non includono coda, clic e rendering
nell'app. Non è stato misurato Gemini come baseline contemporanea.
Le finestre temporali dei provider differiscono: il dispatcher invia il modello
disponibile mentre un altro attende quota. Alcuni controlli locali dell'app
si sovrappongono al benchmark. Le configurazioni di reasoning sono diverse;
il risultato vale per queste condizioni e non è una misura universale del modello.

## Domande reali con paragrafo pertinente

Su proposta dell'utente, lettura dell'archivio locale senza modifiche:
26 lezioni, 12 file Q&A, 42 domande non vuote. Selezionate tre domande di
spiegazione matematica e tecnica, con citazione ritrovata verbatim nella
dispensa attuale. Per ogni domanda tutti i candidati ricevono lo stesso
estratto (1.313–1.539 byte), citazione e domanda. Totale nove richieste.

| Modello | Risposte complete | Primo testo mediano | Risposta completa mediana | Token input osservati |
| --- | ---: | ---: | ---: | ---: |
| Groq GPT-OSS 20B | 3/3 | 0,382 s | 1,183 s | 701–835 |
| Groq GPT-OSS 120B | 3/3 | 0,499 s | 3,389 s | 701–835 |
| Cloudflare Qwen3 30B A3B FP8 | 3/3 | 4,107 s | 6,922 s | 695–824 |

Run locale `real-20261013`. Nessun errore, retry o troncamento. Tre esempi
sono un pilota esplorativo, insufficiente per classifiche generali. Il flag
storico “contesto completo”, il modello originale e le sue latenze non sono
persistiti per domanda; il replay ricostruisce il contesto e non replica
esattamente la richiesta originaria. Le vecchie risposte non sono il gold.

La revisione delle nove risposte non è cieca ed è successiva all'esecuzione.
Ha trovato difetti utili per orientare i test successivi:

- Il 120B aggiunge un esempio numerico che non soddisfa il sistema lineare
  da lui stesso scritto. Il controllo Python ricalcola la soluzione e il
  residuo: non è un semplice arrotondamento. Confonde inoltre il valore per
  una politica fissata con un valore ottimale.
- Il 20B afferma che l'invertibilità garantisce buon condizionamento: la
  conclusione non segue dall'ipotesi. La risposta principale resta pertinente,
  ma questo dettaglio impedisce di considerarla pienamente corretta.
- Nella spiegazione DLT il 120B propone un determinante per una matrice
  rettangolare definita nella sua risposta. Il 20B descrive in modo impreciso
  la minimizzazione omogenea senza esplicitare il vincolo che esclude lo zero.
  Il 120B aggiunge anche dettagli non stabiliti dall'estratto fornito.
- Tutti spiegano il significato centrale dello spazio nullo. Le affermazioni
  generiche su rango, singolarità e invertibilità richiedono dimensioni e
  ipotesi; anche la dispensa di partenza contiene una formulazione da verificare.

Le equazioni lineari di valutazione di una politica vanno distinte dalle
equazioni di ottimalità: riferimento primario nelle
[slide RL di Carnegie Mellon](https://www.cs.cmu.edu/~hanxiaol/slides/rl.pdf),
pagine 11–13. La forma rettangolare della matrice di proiezione è documentata
nelle [note CS231A di Stanford](https://web.stanford.edu/class/cs231a/course_notes/01-camera-models.pdf).
Queste fonti sostengono i criteri di controllo, non certificano l'intero output
dei modelli o le dispense dell'utente.

In particolare, nella domanda DLT l'estratto tratta il recupero della rotazione;
le parti precedenti della dispensa chiariscono l'omografia planare. Perdere
quel collegamento può produrre una spiegazione generica di calibrazione 3D:
la politica del contesto richiede verifica insieme alla scelta del provider.

## Formule e formato dell'app

Il prompt reale chiede `$...$` e `$$...$$`. Le risposte Groq usano spesso
`\(...\)` e `\[...\]`. Un render statico con gli stessi plugin
ReactMarkdown, remark-math/GFM e rehype-katex del viewer produce:

| Modello | Formule KaTeX nei tre output | Esito |
| --- | --- | --- |
| Groq 20B | 0, 0, 0 | Le formule con delimitatori backslash restano testo |
| Groq 120B | 0, 0, 9 | L'ultimo output mescola delimitatori riconosciuti e non riconosciuti |
| Cloudflare | 18, 12, 7 | Formule riconosciute; nessun errore KaTeX rilevato |

Non è un collaudo della UI completa. Prima dell'integrazione serve una prova
del prompt più esplicito o una normalizzazione sicura che rispetti codice e
Markdown. Nessuna correzione dei testi storici o del viewer è stata applicata.
È stata eseguita una prova separata su una delle domande già osservate con vincolo
più esplicito sui dollari e tre frasi, output massimo 1.024 token. Il diverso
prompt/output e il campione singolo impediscono di mescolare questa prova con
la tabella precedente o di dichiarare risolto in generale il formato.
Il 20B continua a usare delimitatori backslash (zero formule renderizzate),
il 120B produce sette formule riconosciute ma chiama erroneamente “insieme
vuoto” il singleton del vettore zero. Cloudflare produce sette formule
riconosciute. Il prompt esplicito non risolve in generale il problema di
formato e non garantisce correttezza matematica.

## Cloudflare: stesso corpus reale, contesto e reasoning diversi

Il comando soft `/no_think` è [documentato da Qwen](https://qwenlm.github.io/blog/qwen3/).
È stato provato sul servizio Cloudflare senza aggiungere parametri API non
documentati. Ogni riga comprende le stesse tre domande; per ciascun ambito il
testo base e il contesto sono identici, cambia soltanto il comando nel prompt.
Modello, temperatura 0,2 e output massimo 2.048 restano uguali.

| Contesto | Modalità | Primo testo mediano | Risposta completa mediana | Risposte complete |
| --- | --- | ---: | ---: | ---: |
| Paragrafo pertinente | Default | 4,107 s | 6,922 s | 3/3 |
| Paragrafo pertinente | Soft `/no_think` | 0,942 s | 2,651 s | 3/3 |
| Dispensa intera | Default | 5,371 s | 13,628 s | 3/3 |
| Dispensa intera | Soft `/no_think` | 1,118 s | 8,184 s | 3/3 |

Le dispense complete misurano 29.879–37.835 byte e 9.915–11.608 token input
osservati. Il reasoning emesso passa da testi estesi al default a 2–9 caratteri
negli estratti soft e due caratteri nei documenti soft. Non è una misura del
ragionamento interno; i token di reasoning separati non sono esposti nelle usage.
Il renderer statico riconosce le formule di tutti questi output Cloudflare,
senza errori KaTeX rilevati. Nessuna nuova modalità è stata applicata nell'app.

La revisione del contenuto resta necessaria. Nel documento completo al default
Cloudflare aggiunge un esempio Bellman con un calcolo finale errato; Python
conferma che il valore deve essere circa 1,818, non 2. Le spiegazioni DLT con
documento recuperano il caso planare, ma hanno imprecisioni sui passaggi e sul
numero di righe del sistema. Con il solo estratto in modalità soft compare
una descrizione generica delle corrispondenze tra immagini poco aderente al
problema della lezione. La maggiore velocità non certifica migliore qualità.

Campione di tre domande, una sola generazione per condizione, tempi diversi e
possibile variabilità del servizio. È un risultato promettente da ampliare,
non una classifica definitiva o una certificazione della modalità soft.

## Contesto lungo e copertura

Cloudflare ha completato sei prove sintetiche con informazione utile
all'inizio, al centro e alla fine del documento: input effettivo 9.734 e
24.040 token, tre posizioni per ciascuna lunghezza. Mediana primo testo
4,643 s, risposta completa 7,212 s; tutti i sei screening passati. È una sola
formula ripetuta, non una certificazione di comprensione di dispense lunghe.

Il confronto sezione/documento sintetico comprende sei prove per candidato,
tutte complete. Le varianti aggiuntive hanno copertura incompleta Groq:
27/60 richieste eseguite per 20B, 24/60 per 120B, 60/60 per Cloudflare.
Non confrontare le mediane di questi campioni come se i corpus fossero uguali.

Il tetto giornaliero prudenziale ha escluso 33 varianti e 20 domande distanziate
per il 20B, 36 varianti e 20 domande distanziate per il 120B. La sessione Groq
di 20 domande/ora resta da provare in un giorno con budget disponibile.
Cloudflare ha concluso 20 richieste distanziate di tre minuti: 19 complete e
una fallita prima del testo, con due tentativi di collegamento falliti e HTTP
status non ricevuto. Mediane sui 19 successi: primo testo 2,858 s, completa
3,825 s. Massimi 11,658 s e 15,243 s: la mediana non descrive tutti i ritardi.
La sessione dura circa 57 minuti tra primo e ultimo invio. Non inferire una
percentuale generale di affidabilità da venti richieste della stessa sessione.

Le prove su dispense reali intere sono distinte dal confronto a tre sugli
estratti. Non dimostrano prestazioni Groq sui documenti interi.

## Affidabilità, consumi e riproducibilità

Il pilota v3 comprende un'interruzione di rete/stream su Groq 20B dopo testo
parziale: errore conservato, nessun retry che mescoli risposte. I due run
preliminari sono invalidati perché i parser perdevano/rifiutavano delta
numerici e letterali JSON semplici. Restano conservati, consumi inclusi.

Il flusso Cloudflare ricevuto contiene anche numeri e letterali JSON come
delta di contenuto. Il runner li normalizza e registra i tipi. In un output
Python salvato alcune istruzioni sono sulla stessa riga: senza confronto del
trasporto non si può attribuire con certezza il difetto solo al modello.
Non si deve trasformare una compatibilità del parser in una misura di qualità.
La diagnostica `stream: false` sullo stesso problema e con gli stessi messaggi
restituisce un contenuto JSON stringa e una funzione Python sintatticamente
valida. È una nuova generazione: dato utile, insufficiente per provare una
causa di trasporto o per dichiarare difettosi tutti gli stream Cloudflare.

I cap locali restano 6.400 TPM/160.000 token giornalieri per modello Groq,
8.000 Neurons stimati e 200 richieste al giorno condivisi Cloudflare. Le
riserve includono output massimo e consumi dei tentativi precedenti; usage
mancante conserva la riserva. Il ledger non copre attività esterne dell'account
e l'accesso API non verifica il piano amministrativo di billing.

Ledger finale del giorno, comprendendo preliminari, diagnostiche e riserve:

| Candidato | Consumo/riserva conteggiato | Cap locale |
| --- | ---: | ---: |
| Groq 20B | 158.369 token | 160.000 token |
| Groq 120B | 157.359 token | 160.000 token |
| Cloudflare | circa 5.099 Neurons stimati; 185 prenotazioni/tentativi | 8.000 Neurons; 200 richieste |

Due prenotazioni Cloudflare preliminari senza settlement restano conteggiate
al valore prudenziale; non sono azzerate. Non sono misure amministrative di
fatturazione. Nessun cap è stato aumentato per terminare il confronto.

Il runner è stato ulteriormente affinato **dopo** le misure: fingerprint anche
del codice di orchestrazione, recupero di tentativi salvati prima del file
risultato, conteggio delle riserve senza checkpoint e intervallo minimo delle
domande dopo una pausa. Un tentativo ambiguo non viene reinviato automaticamente.
Queste modifiche sono verificate offline; gli snapshot conservano il codice
del run v3 e dei replay recenti. I futuri live run devono usare nuovi nomi:
gli hash impediscono di mescolare il codice aggiornato con il benchmark storico.
41 regressioni Node e 24 Python passate. Il quality gate globale dell'app
resta fermato al test della posizione delle slide nascoste; il test isolato di
ripresa, build ed export PDF sono passati separatamente.

I risultati sono checkpoint locali ignorati da Git. Corpus e risposte reali
restano privati. Il giornale Python salva conteggi, latenze, errori e verifica
dei messaggi identici, senza citazioni, domande, risposte o credenziali:

```powershell
python tools/qna_research_snapshot.py --run benchmark-20261013-v3 --run real-20261013
node tools/qna_analyze.mjs benchmark-20261013-v3
node tools/qna_analyze.mjs real-20261013
```

Il risultato più utile è la candidatura del 20B per Q&A con estratto pertinente,
insieme a due requisiti ancora da verificare: qualità su più domande reali e
formule renderizzate correttamente. Il 120B non mostra in questo pilota un
vantaggio qualitativo che giustifichi sceglierlo automaticamente. Cloudflare
con soft `/no_think` resta candidato anche per contesto lungo, con primo testo
vicino a un secondo nel piccolo pilota reale. Il confronto lungo usa solo
Cloudflare: non equivale a un confronto diretto con Groq su quel payload.
Il criterio di correttezza del 90% del piano non è stato certificato.

Riferimenti locali: [registro di esecuzione](qna-benchmark-esecuzione-2026-10-13.md),
[rubrica](qna-benchmark-review-rubrica-2026-10-13.md),
[piano](qna-benchmark-piano-2026-10-13.md).
