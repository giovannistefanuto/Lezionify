# Q&A gratuito senza Gemini — documento completo per riprendere il lavoro

Aggiornato: 13 ottobre 2026. Questo è il punto di ingresso della ricerca.
Descrive lo stato alla chiusura delle prove, non lo stato futuro del repository
o delle offerte dei provider. Prima di riprendere leggere `AGENTS.md`,
`IDEA_INIZIALE.md`, `STRUTTURA_PROGETTO.md` e le decisioni più recenti.

## Obiettivo e stato

L'utente vuole modelli **diversi da Gemini**, utilizzabili gratuitamente,
per domande sulle dispense con contesto allegato. Occorre capire se siano
rapidi, corretti e adatti al viewer di Lezionify. Il confronto riguarda il Q&A,
non la trascrizione audio o la generazione della dispensa.

L'utente ha fornito una ricerca, configurato gli account Groq e Cloudflare e
autorizzato benchmark live, replay delle proprie domande e registrazione con
Python. Le prove sono concluse. Nessuna integrazione di questi provider
nell'app, scelta definitiva, release o migrazione delle risposte è stata fatta.
Questa documentazione non avvia nuove chiamate API.

Conclusione provvisoria: **Groq GPT-OSS 20B è candidato per estratti pertinenti;
Cloudflare Qwen con `/no_think` è candidato anche per dispense complete**.
Il 120B non ha mostrato un vantaggio qualitativo sufficiente in questo pilota.
La qualità non è certificata: ampliare il campione e verificare matematica e
formato prima di scegliere o integrare.

## Documenti da consultare

| Documento | Uso |
| --- | --- |
| [Risultati misurati](qna-benchmark-risultati-2026-10-13.md) | Tabelle, qualità, consumi, limiti e fonti dei controlli |
| [Registro di esecuzione](qna-benchmark-esecuzione-2026-10-13.md) | Audit e percorso delle prove, correzioni e verifiche |
| [Piano](qna-benchmark-piano-2026-10-13.md) | Protocollo e criteri originari, incluse prove rimaste incomplete |
| [Rubrica](qna-benchmark-review-rubrica-2026-10-13.md) | Correttezza, pertinenza, formato, affidabilità e screening |
| [Valutazione iniziale](qna-alternative-gratuite-valutazione-2026-10-13.md) | Vincoli, candidati e fonti ufficiali verificate allora |
| [Ricerca fornita dall'utente](qna-alternative-gratuite-non-gemini-2026-10-13.md) | Report originale conservato integralmente |

La ricerca originale proviene da `deep-research-report (10).md`, spostato e
rinominato. SHA-256 verificato:
`2265d70e430e4734ad02d048fb0bc0d38a6cfc2790e3e5d10fbe89113c040b90`.
Il link ChatGPT Library iniziale non era stato sufficiente per leggerla;
il file locale è la fonte conservata.

## Candidati e condizioni

| ID del runner | Provider e modello | Configurazione misurata |
| --- | --- | --- |
| `groq-20b` | Groq `openai/gpt-oss-20b` | reasoning low |
| `groq-120b` | Groq `openai/gpt-oss-120b` | reasoning low |
| `cloudflare-qwen` | Cloudflare `@cf/qwen/qwen3-30b-a3b-fp8` | default; variante separata con `/no_think` nel prompt |

Temperatura 0,2; output massimo ordinario 2.048 token. La prova mirata di
formato usa 1.024 token e un prompt diverso. Endpoint compatibili chat
completions dei due provider; nessun fallback o chiamata Gemini nei benchmark.
`/no_think` è un comando soft documentato da Qwen, non un parametro API
Cloudflare aggiunto dal runner. Le configurazioni vanno confrontate separatamente.

## Risultati essenziali

Tempi dall'invio HTTP, esclusi coda locale, clic e rendering dell'app.
Primo testo significa testo della risposta finale, distinto dal primo evento
SSE o dal reasoning. Le mediane complete riguardano le risposte riuscite.

| Prova | Configurazione | Complete | Primo testo mediano | Completa mediana |
| --- | --- | ---: | ---: | ---: |
| Sintetico principale | Groq 20B | 36/36 | 0,496 s | 0,802 s |
| Sintetico principale | Groq 120B | 36/36 | 0,642 s | 1,266 s |
| Sintetico principale | Cloudflare default | 36/36 | 2,558 s | 3,758 s |
| Domande reali, estratto | Groq 20B | 3/3 | 0,382 s | 1,183 s |
| Domande reali, estratto | Groq 120B | 3/3 | 0,499 s | 3,389 s |
| Domande reali, estratto | Cloudflare default | 3/3 | 4,107 s | 6,922 s |
| Domande reali, estratto | Cloudflare soft `/no_think` | 3/3 | 0,942 s | 2,651 s |
| Domande reali, dispensa intera | Cloudflare default | 3/3 | 5,371 s | 13,628 s |
| Domande reali, dispensa intera | Cloudflare soft `/no_think` | 3/3 | 1,118 s | 8,184 s |

Il principale usa 12 problemi sintetici per tre ripetizioni: non sono 36
domande indipendenti. Gli estratti reali misurano 1.313–1.539 byte; le dispense
complete 29.879–37.835 byte, circa 9.915–11.608 token input osservati.
Non è stato misurato Gemini come baseline contemporanea, né Groq con queste
dispense complete. Le offerte gratuite vanno ricontrollate alla ripresa.

Suite sintetica valida: **381 esiti, 270 completi, 2 falliti rete/stream,
109 saltati per budget**. Extra: **21 risposte reali complete** sulle stesse
tre domande in condizioni diverse e una diagnostica sintetica completa.
Totale 403 esiti logici, dei quali 292 completi. Non confondere esiti logici,
tentativi HTTP e prenotazioni del ledger.

Cloudflare completa sei prove sintetiche lunghe fino a 24.040 token input,
con una formula-obiettivo all'inizio, centro o fine: non certificano una
comprensione generale di documenti lunghi. La sessione distanziata completa
19/20 richieste in circa 57 minuti, con un errore prima del testo dopo due
tentativi senza status HTTP; mediana primo testo 2,858 s, massimo 11,658 s.
La causa non è attribuita con certezza al servizio.

Groq ha esaurito il margine del cap giornaliero: sessioni 20 domande/ora
saltate per entrambi, varianti estese solo 27/60 per 20B e 24/60 per 120B.
Cloudflare completa 60/60 varianti. Non confrontare mediane di corpus diversi.

## Qualità: cosa impedisce una scelta definitiva

- Il 120B ha inventato un esempio numerico con soluzione errata, verificata
  con Python; ha anche confuso valore per politica fissata e valore ottimale,
  proposto un determinante per matrice rettangolare e chiamato `{0}` insieme vuoto.
- Il 20B ha collegato impropriamente invertibilità e buon condizionamento e
  omesso il vincolo non nullo nella minimizzazione omogenea DLT.
- Cloudflare ha prodotto un altro esempio Bellman errato con documento
  completo. Il contesto lungo aiuta a riconoscere l'omografia planare, ma
  restano imprecisioni sul sistema DLT; un estratto può perdere quel collegamento.
- Groq usa spesso delimitatori `\(...\)` e `\[...\]` che il viewer attuale
  non interpreta come formule. Nei tre output 20B il render statico conta zero
  formule KaTeX. Anche il prompt più esplicito provato non risolve il problema.
  Cloudflare rende correttamente le formule osservate, senza errori KaTeX.
- Uno stream Cloudflare di codice Python contiene istruzioni fuse sulla stessa
  riga. Una nuova generazione non streaming è valida, ma non dimostra che la
  causa del difetto precedente fosse il trasporto.

I marcatori automatici sono screening, non accuratezza: ci sono falsi negativi
e dettagli sbagliati in risposte che li passano. Le nove correzioni sintetiche
C++ compilate passano; otto funzioni Python corrette passano e una ha syntax
error. Non sono state eseguite risposte private come codice.

Revisione post hoc, non cieca, di sole tre domande: nessuna certificazione
del criterio 90% del piano. Le vecchie risposte AI e le dispense generate
non sono gold standard; anche una formulazione della fonte richiede verifica.
Non è stato provato il flusso UI completo con questi provider.

## Domande personali e riservatezza

Archivio letto in sola lettura: `%APPDATA%\lezionify\library`, 26 lezioni,
12 file Q&A, 42 domande non vuote. Non sono stati letti audio, trascrizioni
grezze o impostazioni per il replay. Nessuna fonte è stata modificata.

Tre selezioni storiche per indice file Q&A ordinato e indice thread:
`1:3`, `9:3`, `11:4`. Sono indici posizionali, da ricontrollare se l'archivio
cambia. I temi sono valutazione Bellman, DLT e spazio nullo. L'estrazione
richiede una citazione ritrovata verbatim nel Markdown attuale; questo
introduce un bias di selezione. Non sono stati provati follow-up reali.

Il formato salvato non conserva flag originale di contesto completo, modello
originale o latenza. Il contesto è ricostruito dalle note attuali, non una
replica esatta della chiamata storica. Il prompt non include la vecchia risposta
come soluzione di riferimento.

Corpus, provenienza e risposte personali sono esclusivamente in
`local-artifacts/qna-benchmark/`, ignorata da Git. La documentazione e il
journal Python contengono solo dati aggregati e rilievi senza testi personali.
Un clone Git da solo **non recupera** corpus, risultati grezzi o credenziali:
per conservarli serve un backup locale privato separato. Nessun backup esterno
è stato effettuato da questa ricerca.

## Dove sono dati e strumenti

Tutti i percorsi della tabella sono relativi alla radice del repository.

| Percorso | Contenuto |
| --- | --- |
| `tools/qna_benchmark.mjs` | Suite sintetiche, preflight, scheduler, checkpoint e report |
| `tools/qna_benchmark_core.mjs` | Credenziali, endpoint, stream, timeout, metriche e budget |
| `tools/qna_benchmark_checkpoint.mjs` | Ripresa conservativa dei tentativi e intervalli sessione |
| `tools/qna_prepare_private.py` | Estrazione esplicita in sola lettura di domande e contesto |
| `tools/qna_replay_private.mjs` | Replay dei corpus privati con stesso ledger e lock |
| `tools/qna_research_snapshot.py` | Snapshot e journal aggregato Python, senza testi privati |
| `tools/qna_analyze.mjs` | Analisi delle fasi e dei replay senza chiavi |
| `tools/qna_nonstream_diagnostic.mjs` | Una diagnostica sintetica Cloudflare non streaming |
| `tests/fixtures/qna-benchmark/` | Casi sintetici e builder del contesto |
| `tests/node/`, `tests/python/` | Regressioni offline |

Dentro `local-artifacts/qna-benchmark/`:

| Run / file | Significato |
| --- | --- |
| `benchmark-20261013-v3/` | Suite sintetica valida conclusa e snapshot dei sorgenti storici |
| `pilot-20261013/`, `benchmark-20261013-v2/` | Invalidati per problemi del parser; conservati, consumi inclusi |
| `real-20261013/` | Tre estratti × tre candidati, corpus privato e revisione |
| `real-document-20261013/` | Cloudflare default con documenti completi |
| `real-format-20261013/` | Prompt delimitatori più esplicito, una domanda × tre candidati |
| `real-no-think-20261013/` | Cloudflare soft, tre estratti |
| `real-document-no-think-20261013/` | Cloudflare soft, tre documenti completi |
| `nonstream-diagnostic-20261013/` | Nuova generazione sintetica JSON, non streaming |
| `budget-ledger.json` | Consumi e prenotazioni condivisi, comprese prove preliminari |
| `research-journal.jsonl`, `research-snapshot.json` | Diario Python e snapshot aggregato |
| `completion-audit.json` | Conteggi finali e controllo dei cap |
| `credential-scan.json` | Ultima verifica: zero corrispondenze delle chiavi correnti in 926 file controllati |

Manifest, tentativi, risultati, summary e completion nei run spiegano ogni
esito. La scansione riguarda artefatti Q&A, ricerca, test Node e tools;
non è una scansione dell'intero computer. `request-timeline.json` è una
fotografia intermedia: usare il ledger e l'audit finale per i totali conclusivi.

## Credenziali, quote e ripresa affidabile

Il `.env` locale, ignorato da Git, usa `GROQ_API_KEY`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. I runner lo leggono senza
scriverlo; non pubblicare valori o log di error body. Le credenziali sono
risultate presenti e valide all'ultimo controllo.
Due volte l'editor ha lasciato il file nuovamente vuoto: causa non determinata,
utente lo ha ricompilato ed è stato suggerito di chiudere la scheda obsoleta.
Controllare presenza e formato alla ripresa senza stamparne i valori.

| Budget locale del 13 ottobre, UTC | Consumo/riserve finali | Cap |
| --- | ---: | ---: |
| Groq 20B | 158.369 token, 84 prenotazioni/tentativi | 160.000 token/giorno |
| Groq 120B | 157.359 token, 81 prenotazioni/tentativi | 160.000 token/giorno |
| Cloudflare | 5.099,1154 Neurons stimati, 185 prenotazioni/tentativi | 8.000 Neurons e 200 richieste/giorno |

Groq usa anche 6.400 TPM e cap locale 800 richieste/giorno. Le quote sono
prudenziali e non sono state alzate. Due riserve preliminari Cloudflare
senza usage restano al valore massimo. Il ledger non copre attività esterne
sullo stesso account e non certifica il piano amministrativo di fatturazione.
Verificare disponibilità, prezzi, limiti e reset ufficiali prima di futuri invii.

Il runner prenota prima dell'invio, usa usage quando disponibile, conserva la
riserva in caso ambiguo e serializza con lock esclusivo. Timeout: totale 90 s,
primo testo 60 s, inattività 30 s. Al massimo due tentativi, solo per errori
transitori prima del testo; niente retry che fonda risposte parziali.
Stream incompleti, output troncati e modelli inattesi non diventano successi.

Alla chiusura non rimangono runner attivi o lock. I sorgenti sono stati
rafforzati dopo le misure: fingerprint di orchestrazione/helper, recupero
risposte già salvate, niente reinvio di prenotazioni prive di checkpoint,
conteggio dei tentativi per run e intervallo minimo dopo pause. Correzioni
verificate offline, senza ulteriori chiamate live. Usare **nomi nuovi** per
future prove; non riprendere i run storici con il codice aggiornato e non
eliminare ledger/manifest per aggirare mismatch o quote.

## Comandi di consultazione e nuova prova

Da PowerShell nella radice del repository, con Node e Python disponibili.
Questi comandi di analisi e test non inviano contenuti ai provider:

```powershell
npm run test:qna-benchmark
npm run test:benchmark
node tools/qna_analyze.mjs benchmark-20261013-v3
node tools/qna_analyze.mjs real-20261013
python tools/qna_research_snapshot.py --run benchmark-20261013-v3 --run real-20261013
```

Lo snapshot appende il journal locale. I comandi seguenti sono esempi per una
**nuova sessione autorizzata**: scegliere nomi nuovi, verificare il `.env`,
il budget e le condizioni correnti. Senza `--live` è solo preparazione del piano
(il runner sintetico richiede comunque il `.env`). Con `--live` contattano le API:

```powershell
$qnaRun = 'qna-pilot-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
node tools/qna_benchmark.mjs --suite pilot --run $qnaRun
node tools/qna_benchmark.mjs --suite preflight --run "$qnaRun-access" --live
node tools/qna_benchmark.mjs --suite pilot --run $qnaRun --live
```

Suite disponibili: `pilot`, `main`, `long`, `context`, `extended`, `session`,
`all`, `report`, `preflight`. Non lanciare `all` prima di pianificare i consumi.
Il preflight separato usa un altro nome perché anche la suite entra nel manifest;
il live ordinario esegue comunque il proprio preflight prima delle generazioni.
Per riprendere un nuovo run interrotto mantenere nome, suite, configurazione e
sorgenti identici; una nuova configurazione richiede un altro run.

Esempio di nuova estrazione/replay delle tre selezioni storiche, da verificare
contro l'archivio attuale. Il comando live invia domanda e contesto personali
ai candidati, come già fatto nel pilota; il corpus resta locale:

```powershell
$qnaReplay = 'qna-real-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
python tools/qna_prepare_private.py --pick 1:3 --pick 9:3 --pick 11:4 --context excerpt --output "local-artifacts/qna-benchmark/$qnaReplay/corpus.private.json"
node tools/qna_replay_private.mjs --run $qnaReplay
node tools/qna_replay_private.mjs --run $qnaReplay --live
python tools/qna_research_snapshot.py --run $qnaReplay
```

Per un documento intero usare `--context document` nell'estrazione e un nuovo
run; per il solo Cloudflare aggiungere `--candidates cloudflare-qwen` al replay
sia dry che live. Output configurabile 512–4.096; massimo 12 casi per corpus.
`--wait-lock-minutes` permette attesa esplicita fino a 90 minuti.
La variante `/no_think` **non ha un flag dedicato nel replay**: nei run storici
è una variazione del prompt in un corpus distinto. Prepararla esplicitamente
in una nuova copia locale, documentando modifica e hash; mantenere invariati
gli altri campi e non sovrascrivere baseline o corpus originali.

## Verifiche effettuate e problema separato dell'app

41 regressioni Node e 24 Python passate; dry run e controlli sintattici passati.
Il quality gate completo passa typecheck, lint e 439 Vitest nel collaudo
registrato, ma si ferma sul test preesistente
`Hidden slides lost reading position on return`. Non dichiararlo verde.
Ripresa PDF/Markdown isolata nei due processi Electron, build ed export PDF
sono passati separatamente. Nessuna correzione del viewer è stata introdotta
da questa ricerca: sono state affinate fixture e possibilità di test isolato.
Nessuna dipendenza aggiunta per questi benchmark.

Il repository contiene molte modifiche preesistenti e ricerche concorrenti:
preservarle, non resettare o attribuire tutto a questo lavoro. Le ricerche
musica e traduzione offline sono separate e non vanno incorporate nei risultati Q&A.

## Piano consigliato alla ripresa

1. Leggere questo documento, i risultati e le decisioni nuove; verificare
   presenza dei dati locali, stato Git, credenziali e quote ufficiali correnti.
2. Preparare un campione reale più ampio e diversificato, con criteri di
   correttezza indipendenti dalle vecchie risposte AI. Includere formule,
   esempi numerici, codice, domande brevi, contesto ambiguo e follow-up.
   L'estrattore attuale seleziona la prima domanda utente: estenderlo se serve
   un replay di follow-up, con decisione e test.
3. Confrontare 20B e Cloudflare soft/default a parità di domanda e contesto,
   ripetendo in finestre distinte. Separare estratto e documento intero,
   misurare code, errori, massimi e qualità, oltre alle mediane.
4. Completare varianti e sessioni Groq in giorni con budget sufficiente,
   senza alterare i cap o mescolare giornate e corpus diversi.
5. Progettare e provare una normalizzazione dei delimitatori Groq che rispetti
   codice e Markdown; il solo prompt provato non basta. Verificare poi il
   viewer reale e il comportamento in caso di stream parziale/abort.
6. Solo dopo discutere selezione e integrazione: credenziali protette,
   invii espliciti, tracciabilità, quote e nessun fallback non dichiarato.
   Conservare le fonti originali e le risposte storiche.

Non serve altra Deep Research generale per ripartire: ora servono esperimenti
mirati e revisione delle risposte. Usare documentazione ufficiale aggiornata
per dubbi specifici su quote, modello, API e reasoning.

## Decisioni e messaggio pronto per una futura chat

Le decisioni Q&A sono D-0262–D-0273 e D-0275; D-0274 riguarda la musica.
La creazione di questo documento è registrata in D-0278.
Il registro resta in `DECISIONI.md`: nuove scelte non banali vanno appese
eseguendo direttamente `tools/append_decision.py`, mai modificando il Registro.

Messaggio da riutilizzare:

> Riprendiamo la ricerca sui modelli Q&A gratuiti diversi da Gemini.
> Leggi AGENTS.md e i documenti iniziali nell'ordine previsto, poi
> docs/research/qna-non-gemini-ripresa-completa-2026-10-13.md e le decisioni
> più recenti. Parti dai risultati conservati: Groq20B candidato sugli
> estratti, Cloudflare Qwen soft /no_think anche su documento completo.
> Prima di nuovi invii verifica dati locali e quote attuali; conserva ledger,
> sorgenti storici e riservatezza. Proponi il prossimo esperimento mirato
> alla qualità e al rendering delle formule, senza integrare automaticamente.
