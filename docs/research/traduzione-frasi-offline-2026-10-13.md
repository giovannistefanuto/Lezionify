# Traduzione offline di frasi EN ↔ IT — ricerca e piloti del 13 ottobre 2026

Aggiornamento 15 ottobre: su delega dell’utente è stato scelto e integrato Bergamot 0.4.9, con modelli opzionali Mozilla e prove WASM reali Node/Electron (D-0307/D-0308). [Uso e limiti](../product/funzioni-approvate-2026-10-15.md).

## Esito e perimetro

La funzione è tecnicamente fattibile sul computer dell'utente senza GPU e senza
inviare le frasi online. Sono stati eseguiti tre piloti locali, con **24 casi
sintetici diversi e 240 traduzioni complessive**, incluse ripetizioni e una
variante di decodifica Argos. La qualità tecnica rimane il problema principale.
Non c'è ancora un traduttore di frasi integrato o un motore scelto definitivamente.

L'utente ha confermato **solo traduzione**, senza spiegazione del significato.
Il perimetro proposto è una modalità Frasi nella casella Ctrl+T, EN ↔ IT.
La traduzione delle dispense complete con Gemini è un altro flusso.

Approfondimento successivo richiesto dall'utente:
[API di traduzione online, quote verificate e pilota MyMemory](traduzione-api-valutazione-2026-10-13.md).
Azure F0 è candidato per un confronto di qualità; non sostituisce il requisito
offline e non è stato ancora provato con un account configurato.

**Candidato da approfondire per l'integrazione:** Mozilla/Bergamot, perché il
pilota funziona in JavaScript/WASM, ha asset più piccoli e conserva meglio
formule/codice in questo campione. **Alternativa misurata:** modelli Argos con
CTranslate2, molto rapidi ma con il costo di distribuzione del runtime Python
se si segue la strada sperimentata. Nessuno dei due è certificato per testi tecnici.

Decisioni: D-0276, D-0277, D-0279 e consuntivo finale nel registro.

## Lavoro precedente recuperato

- [Vocabolario offline](../product/vocabolario-offline.md), D-0250 e D-0251:
  53.255 voci EN→IT e 29.660 IT→EN FreeDict/WikDict, lookup locale e flessioni
  inglesi conservative. Ctrl+T, Focus, fullscreen, lingue e retry già collaudati.
- `shared/dictionary.ts`: ricerca di voci e locuzioni; non è un traduttore.
- `electron/main/localDictionary.ts`: lettura dei JSON e cache degli indici;
  query limitata a 120 caratteri e alle due direzioni. Nessun modello neurale.
- `src/components/DictionaryOverlay.tsx`: ricerca dopo 120 ms di inattività,
  con gestione delle risposte obsolete, chiusura e ripristino del focus.
- [Idee future, voce 7](../product/idee-future-2026-10-13.md): frasi libere ancora
  da valutare, nessun passaggio automatico a Gemini.

La ricerca salvata sul tema delle frasi consisteva nel riferimento ad Argos
Translate in fondo al documento del vocabolario. Non sono stati trovati nel
repository report comparativi o benchmark precedenti per le frasi. Il precedente
quality gate del vocabolario non misura la qualità della traduzione di frasi.

## Candidati e fonti ufficiali

| Soluzione | Cosa è stato verificato | Stato in questa indagine |
| --- | --- | --- |
| Argos Translate / CTranslate2 | Motore offline Python, pacchetti diretti EN→IT e IT→EN 1.0 nel registro; CTranslate2 supporta Windows | Provati i modelli direttamente con SentencePiece e CTranslate2, senza libreria Argos completa |
| OPUS-MT / Transformers.js / ONNX | Conversioni Xenova disponibili in entrambe le direzioni; modelli e runtime caricabili da filesystem con download remoti disabilitati | Pilota reale della configurazione q8/greedy, con errori seri |
| Mozilla / Bergamot / WASM | Registro del 13 ottobre con modelli EN↔IT `base-memory`, stato Release; API JavaScript con worker e backing personalizzabile | Pilota reale con asset locali e adattamento del worker per Node/Windows |
| OPUS-MT `tc-big-en-it` | Modello EN→IT distinto e più recente, con propria licenza; non è il modello del pilota | Possibile approfondimento, non scaricato o misurato |
| NLLB-200 distilled 600M | Licenza CC-BY-NC e model card orientata alla ricerca, con limiti per produzione/documenti/testi specialistici | Non scelto per il primo percorso di integrazione; non misurato |
| MADLAD400 3B | Traduttore multilingue molto più grande dei modelli bilingui provati | Non misurato; manca una ragione sperimentale per partire da questo peso |

Fonti consultate il 13 ottobre 2026:

- [Argos, codice e documentazione](https://github.com/argosopentech/argos-translate),
  [indice dei pacchetti](https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json),
  [implementazione della traduzione](https://raw.githubusercontent.com/argosopentech/argos-translate/master/argostranslate/translate.py),
  [dipendenze attuali](https://raw.githubusercontent.com/argosopentech/argos-translate/master/requirements.txt).
- [CTranslate2: installazione e piattaforme](https://opennmt.net/CTranslate2/installation.html).
- [Transformers.js: esecuzione in Node e caricamento locale](https://huggingface.co/docs/transformers.js/v3.0.0/en/tutorials/node),
  [configurazione degli asset locali](https://huggingface.co/docs/transformers.js/custom_usage).
- [Xenova EN→IT](https://huggingface.co/Xenova/opus-mt-en-it),
  [Xenova IT→EN](https://huggingface.co/Xenova/opus-mt-it-en),
  [modello originale EN→IT](https://huggingface.co/Helsinki-NLP/opus-mt-en-it),
  [modello originale IT→EN](https://huggingface.co/Helsinki-NLP/opus-mt-it-en).
- [Mozilla: motore e modelli](https://github.com/mozilla/translations),
  [registro ufficiale dei modelli](https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/db/models.json),
  [Bergamot: API JavaScript, worker e backing](https://github.com/browsermt/bergamot-translator/blob/main/wasm/module/README.md).
- [OPUS-MT tc-big EN→IT](https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-en-it),
  [NLLB 600M](https://huggingface.co/facebook/nllb-200-distilled-600M),
  [MADLAD400 3B](https://huggingface.co/google/madlad400-3b-mt).

### Licenze e distribuzione

Non confondere licenza del codice con quella dei pesi. Argos dichiara MIT/CC0
per la libreria; i pacchetti EN/IT 1.0 esaminati hanno README con fonti OPUS e
riferimento a Stanza, ma non un file LICENSE separato. Prima di redistribuirli
va completata la verifica specifica dei pesi e dei componenti effettivamente inclusi.
Nel pilota non è stato caricato il modello Stanza incluso negli archivi.

Le due model card Helsinki-NLP del pilota indicano Apache-2.0; le conversioni
Xenova rimandano agli originali ma non includono un file LICENSE separato.
L'attribuzione della conversione e la documentazione dei pesi vanno conservate.
Il modello `tc-big` ha invece CC-BY-4.0: non estendere la licenza di un modello
a tutta la famiglia OPUS. Mozilla dichiara MPL-2.0 anche per i modelli; il
pacchetto Bergamot dichiara MPL-2.0. Eventuali modifiche distribuite al motore
devono essere accompagnate dalle fonti e dagli avvisi appropriati.

## Protocollo riproducibile

Hardware letto in sola lettura: Windows x64, Intel i7-9850H (6 core/12 thread),
circa 31,8 GiB RAM, Quadro T2000 con 4.096 MiB VRAM. Tutte le prove usano CPU.
Non è stata misurata la GPU e non è necessaria per i risultati osservati.

Fixture: `tests/fixtures/offline-translation/cases.json`, 12 casi per direzione,
testo generico, negazioni, condizione necessaria/sufficiente, controlli automatici,
ricerca operativa, reinforcement learning, C++, locuzioni, numeri/unità,
LaTeX, codice inline e un paragrafo di tre frasi. Lunghezza massima 183 caratteri.
Non sono state lette o inviate dispense reali. La rubrica è concettuale, non una
traduzione di riferimento con cui inventare un punteggio BLEU o di accuratezza.

| Pilota | Configurazione | Generazioni |
| --- | --- | ---: |
| OPUS ONNX | Node 24.11.1, Transformers.js 3.8.1, q8, CPU 4 thread, greedy, massimo 192 nuovi token | 72: tre ripetizioni dei 24 casi |
| Argos diretto | Python 3.10.0, CTranslate2 4.8.0, SentencePiece 0.2.1, int8, CPU 4 thread, `replace_unknowns`, length penalty 0,2 | 96: una ripetizione beam1 e tre beam4 |
| Mozilla WASM | Node 24.11.1, Bergamot npm 0.4.9, un worker, beam1 del motore, cache traduzioni disattivata, niente pivot | 72: tre ripetizioni dei 24 casi |

Argos qui significa **modelli Argos con il motore chiamato direttamente**,
non il collaudo della libreria completa e del suo segmentatore. Solo i due
paragrafi sintetici sono divisi sui punti conosciuti del corpus. Questo non
costituisce un segmentatore per abbreviazioni, formule o testi arbitrari.

Mozilla usa un backing locale. Il worker del pacchetto è copiato negli artefatti
con tre adattamenti: scope CommonJS, `readFile` con URL file e `pathToFileURL`
per Windows. Le copie originali restano intatte e gli hash originali/modificati
sono nel report. Il pacchetto non è stato validato invariato. Un primo avvio del
runner è fallito prima dell'inferenza perché un callback non era clonabile:
corretto il runner, poi eseguito un report distinto e completo. La distribuzione
Electron del motore adattato rimane da collaudare.

I download avvengono in una fase separata e riguardano solo asset pubblici.
Nell'inferenza ONNX `allowRemoteModels=false` e `local_files_only=true`;
sono bloccate le API di rete JavaScript. Nel pilota Argos sono bloccate le
connessioni socket Python; nel worker Mozilla fetch/http/https/net/tls.
Non sono state rilevate chiamate nelle API sorvegliate. **È una verifica a livello
applicativo, non un audit della rete nativa o un blocco firewall del sistema.**

Revisioni OPUS pinning:

- EN→IT: `075406e3c8c2c30634d4a1bd8f00c21d9e162011`.
- IT→EN: `fd0b89b9c052adc1f2f64152f555aa17353728be`.

Gli hash SHA-256 dei modelli ONNX sono verificati anche contro i metadati LFS.
Gli archivi Argos sono conservati con hash nel runner; Mozilla verifica l'hash
pubblicato dei pesi e registra hash locali di vocabolari e shortlist. Questi
controlli di identità non equivalgono a firme digitali dei produttori.

## Tempi, spazio e memoria osservati

Mediane delle ripetizioni 1 e 2: **24 richieste per direzione/configurazione**.
La prima passata non entra nei tempi a caldo. Ripetizioni deterministiche:
le tre traduzioni di ogni caso sono identiche in ciascuna configurazione.

| Pilota | EN→IT mediana / p95 | IT→EN mediana / p95 | Asset dei due modelli su disco | Picco RSS del processo |
| --- | --- | --- | ---: | ---: |
| OPUS ONNX q8 greedy | 906 / 2.171 ms | 881 / 2.045 ms | 273,34 MB | circa 1.076 MiB |
| Argos int8 beam4 | 112 / 180 ms | 98 / 181 ms | 191,00 MB estratti per inferenza | circa 280 MiB |
| Mozilla WASM beam1 | 134 / 295 ms | 85 / 189 ms | 73,60 MB decompressi | circa 672 MiB |

I MB su disco sono decimali e comprendono i file effettivamente usati, non solo
i pesi; i MiB di memoria sono binari. La memoria riguarda l'intero processo,
con due direzioni caricate in sequenza. ONNX e Mozilla sono campionati ogni
25 ms; Argos usa il picco working set di Windows: i metodi non sono identici.
I due modelli Mozilla restano caricati nel worker del pilota; i motori ONNX e
Argos rilasciano il precedente modello. Non confrontare questi numeri come
se fossero memoria minima o incrementalmente aggiunta a Lezionify.

ONNX: caricamento del modello 1,44 / 1,52 s, oltre alla traduzione.
Argos: caricamento 0,32 / 0,22 s; prima richiesta beam4 eseguita dopo la passata
beam1, quindi già calda. Mozilla: inizializzazione worker 0,21 s; prima richiesta
per direzione 0,60 / 0,52 s, inclusi caricamento e traduzione del modello.

Il `node_modules` ONNX sperimentale occupa circa 391,55 MB, separati dai modelli;
include artefatti di più piattaforme. Questo non è il peso finale di un installer
Windows. I download Argos completi sono 87,66 e 87,19 MB, con Stanza incluso;
quelli Mozilla circa 26,51 e 26,24 MB compressi. Nessun installer creato.

Sono confronti di **configurazioni complete differenti**: modelli, tokenizer,
decodifica e thread non sono uguali. Non dimostrano la superiorità universale
di un runtime. Non sono stati controllati tutti i carichi esterni sul PC e le
variazioni tra ripetizioni sono visibili nei report. Nessuna misura di latenza UI.

## Revisione qualitativa

Le frasi generiche e la condizione necessaria/non sufficiente sono leggibili
con tutti i candidati. Nei casi tecnici emergono differenze concrete:

| Caso | OPUS ONNX | Argos beam4 | Mozilla |
| --- | --- | --- | --- |
| EN `eigenvalues` | «eigenevalli» | «autovalori» | «autovalori» |
| EN problema duale | «desertificazione primaria», perde limite inferiore | «doppio problema», relazione principale conservata | «doppio problema», «primordiale» al posto di primale |
| EN `dangling pointer` | «puntatore che si muove» | «puntatore abbagliante» | «puntatore penzolante», comprensibile ma da uniformare al termine tecnico |
| IT `autovalori` | `autovalues` | `autovalues` | `earnotays`, parola non valida |
| IT problema duale | perde duale e limite inferiore preciso | `excellent value`, `primary` | relazione espressa ambiguamente con `lower limit than` |
| IT `politica` nel RL | `Policy` | `Politics` | `policy`, appropriato nel contesto |
| IT `passo` dell'algoritmo | `pitch`, perde anche converge | `step`, convergenza preservata | `pace`, termine non corretto per lo step dell'algoritmo |
| IT frase con formula | elimina gran parte delle formule e altera il testo | conserva formule, omette «solution» | conserva formule e significato nel caso provato |

Nei due casi numerici tutti conservano i numeri 12, 35 e 8; questo controllo
non certifica da solo la traduzione di throughput o l'associazione alle unità.
Il passaggio da beam1 a beam4 non migliora tutto: in Argos EN→IT «duale» diventa
«doppio», mentre una concordanza della negazione e il caso RL migliorano.
Non basta aumentare beam size per correggere la terminologia.

Integrità **testuale esatta** dei blocchi LaTeX/codice nei quattro casi:

- OPUS ONNX: 0/4; una formula EN→IT cambia solo gli spazi, ma l'altra direzione
  perde contenuto e il codice EN→IT cambia `vector` in `vetor`.
- Argos beam4: 3/4; EN→IT aggiunge uno spazio in `std::vector<int>`.
- Mozilla: 4/4 nel piccolo campione. Non è garanzia su formule arbitrarie.

Transformers.js emette l'avviso che `MarianTokenizer` non è pienamente supportato
dalla libreria fast. I difetti osservati possono dipendere dalla combinazione
di tokenizer, conversione, pesi e greedy: **non sono attribuiti con certezza ai
soli modelli OPUS**. Prima di scartare la famiglia si può verificare lo stesso
modello con tokenizer SentencePiece nativo e decodifica comparabile.

## Proposta concreta per la futura funzione

1. Conservare la modalità **Parole** e aggiungere **Frasi** nello stesso overlay.
   Gli spazi non identificano automaticamente una frase: «look up» è una locuzione
   già supportata e deve continuare a consultare il dizionario.
2. In Frasi usare area multilinea EN↔IT, azione esplicita Traduci e copia del
   risultato. Non generare una nuova inferenza ogni 120 ms mentre si scrive.
3. Caricare il motore in un worker separato dal renderer e dai servizi principali.
   Accodare una richiesta, ignorare risposte obsolete e liberare risorse dopo
   inattività. Nessuna cache persistente delle frasi, nessun testo nei log.
4. Mostrare il testo originale insieme alla traduzione. Le fonti e le dispense
   non vengono sovrascritte e non si passa automaticamente a Gemini.
5. Proporre inizialmente frasi brevi e piccoli paragrafi. Un limite di 1.200
   caratteri e 256 token per frase è **una proposta da collaudare**, non un limite
   verificato da questi 24 casi. Evitare troncamento silenzioso e gestire input
   vuoto, troppo lungo, solo formule, direzione errata e modello mancante.
6. Proteggere in modo deterministico formule, codice e URL prima dell'inferenza;
   verificarli identici dopo il ripristino. I placeholder possono essere alterati
   o riordinati: non assumere che un semplice replace sia sufficiente. In caso
   di verifica fallita dare errore leggibile, senza mostrare codice corrotto.
7. Valutare un glossario tecnico EN↔IT esplicito, con corrispondenze e contesto
   del corso. Non correggere globalmente `politics` in `policy` o parole simili:
   in altri contesti potrebbero essere traduzioni corrette. Il vocabolario
   FreeDict può aiutare la consultazione, non garantisce disambiguazione neurale.
8. Asset locali versionati e verificati. Scegliere fra inclusione nell'installer
   e pacchetto opzionale installabile con download esplicito. Dopo l'installazione
   la traduzione deve funzionare con rete assente, senza account o chiavi.

## Prossime prove, in ordine

- Confrontare Mozilla e Argos su un corpus sintetico ampliato di 50–100 frasi
  tecniche, incluse negazioni annidate, quantificatori, falsi amici e acronimi;
  revisione manuale distinta per direzione. Un eventuale campione personale va
  conservato solo negli artefatti locali, senza chiamate esterne.
- Provare protezione dei blocchi e glossario come configurazioni distinte,
  senza alterare le baseline salvate. Richiedere conservazione esatta dei blocchi
  e nessuna inversione di negazioni, disuguaglianze o condizioni matematiche
  nel corpus accettato; non dedurre affidabilità universale dal campione.
- Fare un prototipo della modalità Frasi con il candidato risultante; misurare
  avvio e risposta nell'Electron reale, in Focus e fullscreen, e con PDF/Q&A attivi.
- Verificare installer Windows, WASM/worker locali, licenze, blocco delle richieste
  remote, retry dopo modello mancante, annullamento e riavvio. Solo dopo chiamare
  completata la funzione. Non serve avviare una nuova ricerca generale sui LLM.

## Strumenti e artefatti per riprendere il lavoro

Le dipendenze del prodotto non sono state modificate. L'installazione sperimentale
è esclusivamente sotto `local-artifacts/offline-translation/`, ignorata da Git.

```powershell
# Esperimento ONNX: installazione isolata e preparazione online di asset pubblici.
npm install --prefix local-artifacts/offline-translation --save-exact @huggingface/transformers@3.8.1 --no-audit --no-fund
node tools/offline_translation_pilot.mjs --prepare
# Nuovo processo, inferenza con API di rete sorvegliate bloccate.
node tools/offline_translation_pilot.mjs --offline

# Argos diretto: ambiente isolato; i due archivi ufficiali devono essere presenti.
python -m venv local-artifacts/offline-translation/python-env
& local-artifacts/offline-translation/python-env/Scripts/python.exe -m pip install ctranslate2==4.8.0 sentencepiece==0.2.1
$env:PYTHONIOENCODING='utf-8'
& local-artifacts/offline-translation/python-env/Scripts/python.exe tools/offline_translation_argos_pilot.py

# Mozilla: registro ufficiale congelato localmente e modello pubblico.
npm install --prefix local-artifacts/offline-translation/bergamot --save-exact @browsermt/bergamot-translator@0.4.9 --no-audit --no-fund
node tools/offline_translation_bergamot_pilot.mjs --prepare
node tools/offline_translation_bergamot_pilot.mjs --offline

# Analisi senza inferenza o rete.
node tools/offline_translation_analyze.mjs
```

Argos scaricato dalle due URL HTTPS dell'indice ufficiale indicato sopra:
`translate-en_it-1_0.argosmodel` e `translate-it_en-1_0.argosmodel` su `argos-net.com/v1/`.
Il runner verifica gli hash conservati prima di estrarre solo i file necessari.
Per Mozilla il registro congelato è `mozilla-models.json`, generato alle
00:44:54 UTC del 13 ottobre; non sostituirlo con un registro nuovo mescolando i run.
In un clone Git nuovo questi artefatti vanno ripreparati; i comandi presuppongono
che il registro e gli archivi siano già scaricati, non sono un installer dell'app.

Report originali, privati e non versionati:

- `pilot-1791903520661.json`: 72 risultati ONNX.
- `argos-pilot-1791903737262262700.json`: 96 risultati Argos diretto.
- `mozilla-pilot-1791904038702.json`: 72 risultati Mozilla.
- `summary.json`: analisi di conteggi, tempi, ripetibilità, numeri e blocchi.
- `model-manifest.json`, `mozilla-manifest.json`, metadati Hugging Face, indice
  Argos e registro Mozilla: versioni, provenienza, dimensioni e hash.
- `models/`, `argos-models/`, `mozilla-assets/`, `bergamot-runtime/`, ambienti npm
  e Python: modelli e dipendenze locali, esclusi dal prodotto e da Git.

Verifiche concluse: tre run completi, conteggi coerenti, ripetibilità per
configurazione, hash, controlli strutturali e sintassi dei runner. Non è stato
rieseguito il quality gate dell'app perché questa indagine non ne modifica il
runtime; nessun test UI o packaging nuovo è dichiarato passato.
