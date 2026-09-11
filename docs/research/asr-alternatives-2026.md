# Alternative locali a Whisper Large per trascrivere lezioni universitarie tecniche (2026)

**Deep research comparativa** — PC target: Windows 11, i7-9850H, 32 GB RAM, NVIDIA Quadro T2000 4 GB VRAM (Turing, sm_75)
**Aggiornato al:** settembre 2026 · **Lingua del contenuto:** inglese tecnico con accento italiano · **Durata lezioni:** 60–120 min

---

## 1. Executive summary

**Risposta diretta alla domanda di fondo:** no, non conviene sostituire Whisper Large con un unico modello "migliore". Conviene cambiare **runtime** (non modello) come primo intervento, e valutare un secondo motore ASR + hotword boosting come intervento opzionale successivo. Nessuna fonte indipendente raccolta in questa ricerca giustifica un cambio radicale "un modello per sostituirli tutti".

Tre conclusioni portanti, ciascuna motivata nelle sezioni successive:

1. **Il tuo collo di bottiglia principale non è (solo) Whisper: è la combinazione VRAM+runtime.** Whisper large-v3 in FP16 occupa ~4,5–4,7 GB — cioè più della tua VRAM disponibile — e la tua GPU (chip TU117, la stessa silicio della GTX 1650) **non ha Tensor Core**, a differenza della T4 di Colab. Questo spiega gran parte del divario 4 ore locali vs 10–15 minuti su Colab, indipendentemente dal modello scelto (dettagli §11).
2. **Il singolo intervento a più alto rapporto beneficio/sforzo è passare a Whisper large-v3-turbo (o distil-large-v3) su faster-whisper in INT8.** Stessa famiglia, stesso meccanismo di prompt che già usi con successo, nessun bisogno di WSL, e secondo i benchmark raccolti un fattore di velocità 4–8× a fronte di ~1–2 punti WER in inglese (§5.2, §12).
3. **Se vuoi spingere oltre, NVIDIA Parakeet-TDT (0.6B) è il candidato più solido per velocità estrema e per il vero "word boosting"** (non il prompt informale di Whisper, ma un vero albero di boosting delle frasi, via NeMo CTC-WS/TurboBias) — ma richiede più lavoro di setup, ha meno letteratura di validazione su lezioni tecniche fortemente accentate, e su leaderboard pubblici è testa a testa con Whisper, non nettamente superiore (§5.3, §6, §8).

Non esiste un solo modello che "vince" su tutti gli assi che ti interessano (qualità semantica, velocità, gestione terminologia, maturità dello stack Windows). La tabella completa (§14) e la shortlist (§15) riflettono questo: la raccomandazione finale (§18) è una **combinazione** — motore primario più leggero + glossario/hotword riutilizzato ad ogni chunk + eventuale passata di normalizzazione LLM vincolata — non un singolo modello "migliore di Whisper".

Un'avvertenza che vale per tutto il documento: i numeri di WER pubblicati su modelli diversi **cambiano da fonte a fonte e da mese a mese** nel 2026, in parte perché l'Open ASR Leaderboard di Hugging Face ha cambiato metodologia in corso d'anno (aggiunta di split privati per limitare l'"benchmaxxing", nuove lingue, nuovo leaderboard "far-field"). Dove i numeri sono citati, indico sempre fonte e data; dove le fonti si contraddicono lo segnalo esplicitamente, come richiesto.

---

## 2. Stato dell'arte ASR locale nel 2026

Il panorama è cambiato sostanzialmente rispetto a "Whisper vs poche alternative". A settembre 2026 convivono almeno cinque famiglie di modelli locali seriamente competitive, oltre a un ecosistema di runtime che si è moltiplicato:

- **NVIDIA / "Nemotron Speech"** — il brand ombrello con cui NVIDIA nel 2026 presenta la propria linea ASR (Parakeet, Canary, i modelli Nemotron-Speech-Streaming), costruita su NeMo/FastConformer. È la famiglia con più varianti e con il miglior supporto per il *contextual biasing* reale (§8). ([NVIDIA Nemotron Speech FAQ](https://perspectives.nvidia.com/nemotron-speech/task/faq/what-is-the-single-most-accurate-open-source-speech-recognition-model-available/))
- **Alibaba Qwen3-ASR** (0.6B/1.7B), rilasciato il 29–30 gennaio 2026, licenza Apache 2.0, 52 lingue/dialetti, con supporto nativo Transformers aggiunto a giugno 2026. È il nuovo arrivato più interessante per multilinguismo permissivo. ([GitHub QwenLM/Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR); [arXiv 2601.21337](https://arxiv.org/abs/2601.21337))
- **Alibaba DAMO / FunASR** (SenseVoice, Paraformer) — fortissimi su cinese/cantonese, **non** ottimizzati per l'uso che ti interessa (dettagli §5).
- **Mistral Voxtral** (Mini 3–4B / Small 24B, più una variante Realtime), Apache 2.0, modelli "speech-understanding" con LLM integrato, finestra di contesto che copre 30–40 minuti per singolo passaggio. ([Mistral AI](https://mistral.ai/news/voxtral/))
- **IBM Granite Speech**, Apache 2.0, orientato a contesti enterprise/compliance.
- **OpenAI Whisper**, ancora fermo (nei pesi ufficiali) a large-v3 / large-v3-turbo, ma con un ecosistema di runtime (faster-whisper, whisper.cpp, distil-whisper, WhisperX) che continua a evolvere attorno ad esso.

Un fatto metodologico rilevante per interpretare qualunque numero in questo report: **l'Open ASR Leaderboard di Hugging Face — il riferimento più citato — ha cambiato la propria metodologia nel corso del 2026.** A maggio 2026 Hugging Face e Appen/DataoceanAI hanno introdotto split di valutazione **privati** (dati non pubblici) proprio per contrastare l'overfitting ai set pubblici ("Goodhart's Law": quando una misura diventa un obiettivo, smette di essere una buona misura). A giugno 2026 è nato un leaderboard "Far-Field ASR" (FFASR) dedicato a condizioni acustiche realistiche (riverbero, microfono distante) — molto più vicino al tuo scenario reale d'aula che ai dataset "puliti" tradizionali. Ad agosto 2026 sono state aggiunte tracce per l'inglese indiano/hindi. ([Hugging Face blog — dati privati](https://huggingface.co/blog/open-asr-leaderboard-private-data); [Hugging Face blog — FFASR](https://huggingface.co/blog/ffasr-leaderboard); [Hugging Face blog — Global South](https://huggingface.co/blog/open-asr-leaderboard-global-south))

**Conseguenza pratica:** i numeri di WER medio che troverai citati per lo stesso modello in articoli di aprile, giugno e agosto 2026 non sono sempre direttamente confrontabili tra loro. In questo report tratto la **posizione relativa** dei modelli come segnale più stabile del **valore assoluto** di WER, e do sempre data/fonte ai numeri assoluti.

---

## 3. Whisper è ancora forte?

Sì, ma non è più il modello con il WER più basso sulla classifica pubblica — è ancora il più "generalista collaudato". Ecco il bilancio, con fonti:

**Punti di forza che restano reali nel 2026:**

- **Meccanismo di prompt reale, anche se informale.** Il parametro `initial_prompt` di Whisper inserisce testo nella sequenza del decoder; solo gli ultimi ≤224 token del prompt influenzano davvero la trascrizione (i token più vicini alla fine pesano di più). Il prompt che già usi sfrutta esattamente questo meccanismo. ([arXiv 2602.18966](https://arxiv.org/pdf/2602.18966); [arXiv 2410.18363](https://arxiv.org/pdf/2410.18363))
- **Licenza MIT** — la meno vincolante fra tutte le alternative rilevanti (Parakeet/Canary sono CC-BY-4.0, che richiede attribuzione).
- **Ecosistema di gran lunga più maturo**: faster-whisper, whisper.cpp, WhisperX, distil-whisper, decine di GUI. Nessun'altra famiglia ASR ha strumenti così testati per audio lunghi, sottotitoli, timestamp parola-per-parola (via allineamento forzato esterno).
- **Robustezza empirica documentata su parlato non nativo**, incluso un sottoinsieme di 32 parlanti italiani L1 (dettagli §7).

**Dove Whisper ha perso il primato:**

Sui leaderboard pubblici del 2026, diversi modelli riportano WER medio inferiore a Whisper large-v3:

- Canary-Qwen-2.5B (NVIDIA): ~5,63% WER medio, riportato come #1 su più fonti indipendenti datate metà 2026. ([Northflank](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks); [Gladia](https://www.gladia.io/blog/best-open-source-speech-to-text-models); [SpeechData.ai](https://www.speechdata.ai/blog/best-asr-models-2026))
- Parakeet-TDT-0.6B-v2/v3: ~6,05–6,34% WER medio a seconda della fonte/mese. ([VexaScribe, ago 2026](https://vexascribe.com/whisper-large-v3-vs-turbo); [Together AI](https://www.together.ai/models/parakeet-tdt-0-6b-v3))
- Whisper large-v3 stesso viene citato, a seconda della fonte e dello snapshot, tra ~4,9% e ~7,4% di WER medio — la variazione riflette proprio i cambi di metodologia del leaderboard descritti in §2, non un cambiamento del modello (che non ha ricevuto nuovi pesi ufficiali nel periodo).

**Conclusione della sezione:** su carta, Whisper large-v3 non è più il modello inglese più accurato in assoluto, ma resta entro 1–2 punti percentuali di WER dai modelli che lo superano — un margine piccolo rispetto al margine di errore introdotto da accento, rumore e gergo tecnico reale. Il suo vero vantaggio residuo per il tuo caso d'uso è la combinazione di prompt-steering + maturità dello stack, non il numero di WER.

## 4. Tecnologie alternative — mappa del campo

Prima dell'analisi approfondita (§5), ecco una mappa di tutto ciò che ho cercato sistematicamente, con un primo giudizio di pertinenza per il tuo caso d'uso specifico.

### 4.1 Famiglia NVIDIA / "Nemotron Speech" (NeMo · FastConformer)

| Modello | Parametri | Lingue | Note di pertinenza |
|---|---|---|---|
| Parakeet-TDT-0.6B-v2 | 600M | Solo EN | **Candidato primario** — piccolo, velocissimo, CC-BY-4.0 |
| Parakeet-TDT-0.6B-v3 | 600M | 25 lingue UE (incl. IT) | Utile se in futuro ti serve anche l'italiano |
| Parakeet-CTC / Parakeet-RNNT | 0,6–1,1B | EN | Varianti architetturali dello stesso encoder |
| Parakeet-Unified-EN-0.6B | 600M | EN | Ibrido offline+streaming (apr 2026); per il tuo uso batch, TDT resta preferibile |
| Canary-1B-v2 | 1B | Multilingue + traduzione | Interessante se un giorno ti serve anche traduzione |
| Canary-Qwen-2.5B | 2,5B | Solo EN | **Miglior WER assoluto pubblicato**, ma più pesante |
| FastConformer / Citrinet | — | — | Architetture encoder sottostanti; Citrinet è superato da FastConformer |

Fonti: [Together AI](https://www.together.ai/models/parakeet-tdt-0-6b-v3), [Hugging Face nvidia/parakeet-tdt-0.6b-v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), [Hugging Face nvidia/parakeet-tdt-0.6b-v2](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2), [Hugging Face nvidia/canary-qwen-2.5b](https://huggingface.co/nvidia/canary-qwen-2.5b), [Hugging Face nvidia/parakeet-unified-en-0.6b](https://huggingface.co/nvidia/parakeet-unified-en-0.6b).

### 4.2 Qwen3-ASR (Alibaba, gennaio 2026)

Due modelli (0,6B e 1,7B), architettura AuT encoder (attention-encoder-decoder, finestra di attenzione dinamica 1–8s) + decoder Qwen3, licenza **Apache 2.0** (la più permissiva fra tutte le alternative), 52 lingue/dialetti, valutazione esplicita su "Dialog-Accented English" (16 accenti, non confermato se include l'italiano). Supporto Transformers nativo da giugno 2026. **Candidato promettente ma giovane**: pubblicato da meno di 8 mesi, meno testato "sul campo" rispetto a Whisper o Parakeet. ([arXiv 2601.21337](https://arxiv.org/abs/2601.21337); [GitHub](https://github.com/QwenLM/Qwen3-ASR))

### 4.3 Ecosistema FunASR / DAMO Academy (SenseVoice, Paraformer, Fun-ASR-Nano, WeNet)

SenseVoice e Paraformer sono ottimizzati principalmente per **cinese mandarino e cantonese**; il loro stesso paper originale mostra che superano Whisper "in most test sets **except** Librispeech" (cioè proprio sull'inglese) ([arXiv 2407.04051](https://arxiv.org/pdf/2407.04051)). Il paper tecnico di Qwen3-ASR conferma il quadro: su MLS e CommonVoice (che includono l'italiano) il modello "Fun-ASR-MLT-Nano" ottiene un WER nettamente peggiore di Whisper-large-v3 e di Qwen3-ASR (28,7% vs 8,6% vs 8,55% su MLS). **Non consigliato** come motore principale per lezioni in inglese; lo cito per completezza perché espressamente richiesto. WeNet è un toolkit di produzione più che un modello finito, nello stesso ecosistema cinese; non emergono evidenze di vantaggio per il tuo caso.

### 4.4 Moonshine (Useful Sensors / Moonshine AI)

Famiglia di modelli molto piccoli (Tiny ≈27M, Base, e ora Moonshine v2 streaming), licenza MIT, **solo inglese**, pensati per comandi vocali e trascrizione live su hardware embedded a bassissima potenza (il loro stesso confronto Pareto li colloca "all'estremità inferiore" della curva parametri/accuratezza, sotto 1 GB di memoria). Non c'è evidenza di prestazioni forti su vocabolario tecnico o audio lunghi e densi come una lezione universitaria. **Non adatto** al tuo caso d'uso; lo includo solo per completezza. ([Hugging Face UsefulSensors/moonshine](https://huggingface.co/UsefulSensors/moonshine); [arXiv 2602.12241](https://arxiv.org/pdf/2602.12241))

### 4.5 Vosk (Kaldi)

Toolkit offline leggero (modelli anche da 50 MB), pensato per CPU, dispositivi embedded, riconoscimento in tempo reale con vocabolario riconfigurabile. Architettura di generazione precedente rispetto ai moderni Transformer/Conformer end-to-end. **Non adatto** a trascrizione tecnica ad alta fedeltà; bene per comandi vocali o dettatura semplice. ([alphacephei.com/vosk](https://alphacephei.com/vosk/models))

### 4.6 sherpa-onnx / k2-fsa (runtime, non un modello)

Runtime C++/ONNX multipiattaforma (Windows nativo incluso, niente WSL) che **ospita** molti modelli diversi: le famiglie Zipformer-transducer proprie del progetto, ma anche conversioni ONNX di Moonshine, Whisper, Paraformer e — a partire da aprile 2026 — persino Cohere Transcribe (14 lingue, incluso l'italiano). Utile soprattutto come "runtime universale" se vuoi evitare completamente lo stack Python/PyTorch/NeMo. ([GitHub k2-fsa/sherpa-onnx releases](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models))

### 4.7 Mistral Voxtral

Mini (3–4B) e Small (24B), più una variante "Realtime" per streaming, licenza Apache 2.0. Sono modelli "speech-understanding" costruiti su un LLM: oltre a trascrivere, rispondono a domande e riassumono l'audio nativamente. Limite architetturale rilevante per te: **contesto di ~30–40 minuti per singolo passaggio** (32k token), quindi comunque richiede segmentazione per una lezione di 90–120 minuti. Mistral dichiara di superare Whisper large-v3 (dato auto-riportato dal produttore, da verificare con benchmark indipendenti). Il modello Mini (3–4B) è al limite superiore di ciò che è realistico su 4 GB VRAM quantizzato in modo aggressivo. ([Mistral AI](https://mistral.ai/news/voxtral/); [MarkTechPost](https://www.marktechpost.com/2026/07/23/best-open-speech-recognition-asr-models-in-2026-wer-languages-latency-and-license-compared/))

### 4.8 IBM Granite Speech

Apache 2.0, orientato a contesti enterprise/compliance (tracciabilità, documentazione), con una variante "Granite 4.1 2B-NAR" non autoregressiva molto veloce (RTFx ~1820 su H100). Compare spesso nelle classifiche 2026 accanto a Canary. Nessuna evidenza specifica trovata di vantaggio su lezioni tecniche accentate; lo tratto come alternativa di seconda fascia per il tuo scenario, più rilevante se la conformità enterprise fosse un requisito (non lo è nel tuo caso). ([Seven Labs](https://www.sevenlabs.site/blogs/best-open-source-speech-to-text-models-2026))

### 4.9 wav2vec 2.0 / XLS-R / SeamlessM4T (Meta)

Tecnologie fondative (2020–2022) di pre-training self-supervised. Restano importanti come **base per il fine-tuning** su domini specifici, ma nessuna fonte raccolta nel 2026 le indica come motore *out-of-the-box* competitivo con Whisper/Parakeet/Canary per trascrizione tecnica generalista. SeamlessM4T è pensato principalmente per la traduzione multimodale; l'ASR è una capacità secondaria. **Non prioritari** per il tuo caso, salvo che tu voglia in futuro fare fine-tuning dedicato.

### 4.10 Il "GGUF per l'ASR": NeMo-Speech.cpp, transcribe.cpp, parakeet.cpp, parakeet-rs

Nel 2025–2026 è nata una famiglia di runtime C++/Rust nativi (senza Python/PyTorch) specificamente per far girare Parakeet e simili con la stessa filosofia di whisper.cpp: pesi quantizzati GGUF, footprint minimo, build native Windows. Esempi trovati: `nemo-speech` CLI (citato direttamente nella model card di Parakeet-TDT-v3 per l'uso di file `.gguf` in Q8_0), `transcribe.cpp` (16+ famiglie di modelli, incluse varianti Parakeet e Cohere Transcribe), `parakeet-rs` (Rust, CUDA/CoreML). Questo è probabilmente il percorso più leggero per usare Parakeet **senza** installare l'intero toolkit NeMo su Windows. ([Hugging Face nvidia/parakeet-tdt-0.6b-v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3); [GitHub handy-computer/transcribe.cpp](https://github.com/handy-computer/transcribe.cpp/blob/main/docs/models/parakeet.md); [GitHub altunenes/parakeet-rs](https://github.com/altunenes/parakeet-rs))

### 4.11 Ollama

Come tu stesso sospettavi, **non ho trovato evidenza che Ollama offra un percorso di prima classe per modelli ASR/audio** (il suo runtime è pensato per servire LLM testuali basati su llama.cpp). Per l'ASR, i runtime nativi elencati sopra (faster-whisper, whisper.cpp, sherpa-onnx, transcribe.cpp/parakeet-rs) sono le scelte pertinenti. La tua cautela iniziale era corretta.

## 5. Analisi dettagliata dei modelli finalisti

Per ogni finalista: architettura, parametri, precisione, memoria/VRAM, supporto CUDA/Turing, opzione solo-CPU, supporto Windows nativo, necessità di WSL, difficoltà di installazione, e perché è (o non è) più veloce di Whisper a parità di qualità.

### 5.1 Whisper large-v2 / large-v3 (baseline)

- **Architettura:** encoder-decoder Transformer "vanilla", input spettrogramma log-mel a 128 canali (large-v3) o 80 (large-v2), finestra fissa a 30 secondi con padding per audio più corti.
- **Parametri:** ~1,55 miliardi.
- **Precisione disponibile:** FP32/FP16 (PyTorch/Transformers), FP16/INT8 (CTranslate2 via faster-whisper), Q4_0/Q4_1/Q5_0/Q5_1/Q8_0 (GGML/whisper.cpp).
- **Memoria:** in GGML/whisper.cpp, "large" (v3) richiede **~4,7 GB di RAM/VRAM in FP16** — cioè più della tua VRAM disponibile, senza contare l'overhead di runtime. Con CTranslate2/faster-whisper in FP16 si osservano ~4,5 GB; in INT8 si scende a ~3 GB. ([Hugging Face ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/blob/98aa99a0a9db05ae2342309f5096248665f7cba3/README.md); [GitHub SYSTRAN/faster-whisper #1030](https://github.com/SYSTRAN/faster-whisper/issues/1030))
- **CUDA/Turing:** pieno supporto, gira su qualsiasi GPU CUDA incluso sm_75.
- **Solo CPU:** possibile, ma su i7-9850H è estremamente lento — coerente con la tua esperienza (ore per un'ora di lezione).
- **Windows nativo:** sì, nessun WSL richiesto (pip install openai-whisper / faster-whisper / build whisper.cpp per Windows).
- **Difficoltà installazione:** bassa (`pip install faster-whisper` è sufficiente).
- **Perché è "lento" sul tuo hardware in modo specifico:** vedi §11 — il chip TU117 della tua Quadro T2000 **non ha Tensor Core**, quindi FP16 non ottiene l'accelerazione a cui saresti abituato su Colab (T4, che ha Tensor Core reali).

### 5.2 Whisper large-v3-turbo — probabilmente il tuo prossimo passo più semplice

- **Architettura:** stesso encoder di large-v3, **decoder ridotto da 32 a 4 layer**, poi ri-affinato per 2 epoche aggiuntive sugli stessi dati multilingue (diverso da distil-whisper, che è una distillazione indipendente).
- **Parametri:** 809M (contro 1,54B di large-v3).
- **Prestazioni:** un solo benchmark comunitario su 13 minuti di audio (LibriSpeech clean) misura: large-v3 FP16 → 2m23s; large-v3-turbo FP16 → 39s; faster-whisper-turbo FP16 → 19,2s con WER 1,919%, contro faster-whisper large-v3 FP16 → 52s con WER 2,883%. Cioè, su questo specifico test, turbo è risultato **più veloce e persino con WER più basso** di large-v3 pieno (probabile perché il decoder più corto "inventa" meno). Su benchmark più ampi (Open ASR Leaderboard, YouTube-commons long-form) turbo perde mediamente 0,2–2 punti WER rispetto a large-v3, con degrado maggiore sulle lingue a basse risorse. ([GitHub SYSTRAN/faster-whisper #1030](https://github.com/SYSTRAN/faster-whisper/issues/1030); [Hugging Face openai/whisper-large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo); [Whisper Notes](https://whispernotes.app/blog/introducing-whisper-large-v3-turbo))
- **Limite importante:** il task di **traduzione è stato escluso** dal training di turbo (non ti riguarda, dato che vuoi solo trascrizione, non traduzione).
- **Memoria:** ~2,5 GB FP16, ~1,5 GB INT8 (CTranslate2) — **entra comodamente nei tuoi 4 GB con margine reale** per beam search.
- **CUDA/Turing/Windows/WSL:** identico a large-v3 (stesso runtime, faster-whisper o whisper.cpp), nessun WSL.
- **Perché è più veloce mantenendo quasi la stessa semantica:** l'encoder (dove risiede gran parte della "comprensione" acustica e del vocabolario) è invariato; è il decoder autoregressivo — il collo di bottiglia sequenziale — a essere stato tagliato. Il meccanismo di prompt funziona allo stesso modo di large-v3.
- **Alternativa quasi equivalente:** **distil-large-v3** (community/Hugging Face), stessa classe dimensionale, distillazione indipendente, compatibile sia con faster-whisper sia con whisper.cpp; nei benchmark raccolti il suo WER è vicino a quello di turbo.

### 5.3 NVIDIA Parakeet-TDT-0.6B (v2 inglese / v3 multilingue) — il candidato "4 GB facili"

- **Architettura:** encoder **FastConformer** (Conformer con sotto-campionamento 8×, quindi meno frame da processare) + decoder **TDT (Token-and-Duration Transducer)**. Il TDT, a differenza di un RNNT classico, predice non solo il prossimo token ma anche *quanti frame saltare*, quindi può letteralmente saltare i silenzi — è qui che nasce gran parte del vantaggio di velocità rispetto a Whisper, non solo dalla dimensione ridotta.
- **Parametri:** ~600M (627M la cifra esatta più citata per v3).
- **Licenza:** CC-BY-4.0 (richiede attribuzione, a differenza del MIT di Whisper).
- **Memoria:** stime da calcolatori VRAM comunitari: **~1,4 GB in FP16, ~0,3 GB in INT4**; gira comodamente anche su una GTX 1060 6 GB in Q4_K_M secondo le stesse fonti. Per i tuoi 4 GB è la scelta con **più margine in assoluto** fra tutti i finalisti. ([Spheron VRAM calculator](https://www.spheron.network/tools/gpu-recommender/mlx-community/parakeet-tdt-0.6b-v3/); [madebyagents.com](https://www.madebyagents.com/models/nvidia-parakeet-tdt-0-6b-v3))
- **CUDA/Turing:** sì; l'architettura CTC/transducer è anche relativamente più CPU-friendly di un decoder autoregressivo pesante come quello di Whisper, quindi un eventuale fallback CPU degrada meno.
- **Windows nativo:** **sì, senza WSL**, tramite Hugging Face Transformers (supporto aggiunto direttamente nella model card ufficiale) o tramite ONNX/sherpa-onnx/transcribe.cpp. Il toolkit NeMo **completo** (necessario per le tecniche di contextual biasing avanzate, §8) è invece **raccomandato ufficialmente su Linux/WSL2**; su Windows nativo l'installazione di NeMo pieno è possibile ma non ufficialmente supportata e più soggetta a conflitti di dipendenze.
- **Gestione audio lungo:** attenzione piena fino a 24 minuti (misurato su A100 80 GB), attenzione locale/limitata dichiarata fino a 3 ore — cifre che **non sono direttamente trasferibili alla tua GPU da 4 GB**: nella pratica dovrai comunque segmentare (§9), come faresti con Whisper.
- **Perché è così veloce:** dimensione ridotta (600M vs 1,55B) + skip dei frame silenziosi via TDT + non è autoregressivo su un vocabolario enorme come il decoder testuale di Whisper.

### 5.4 NVIDIA Canary-Qwen-2.5B — miglior WER pubblicato, ma più pesante

- **Architettura:** encoder FastConformer + decoder **Qwen3-1.7B** (un vero LLM), collegati da una proiezione lineare + adattatori LoRA — un design "SALM" (Speech-Augmented Language Model). Due modalità: modalità ASR (solo trascrizione) e modalità LLM (il transcript può essere riassunto/interrogato dallo stesso modello già caricato).
- **Parametri:** 2,5 miliardi. **Solo inglese.** CC-BY-4.0.
- **Memoria:** a piena precisione (2,5B × 2 byte ≈ 5 GB) **non entra nei tuoi 4 GB**; serve INT8 (~2,5 GB, entra con margine) o INT4 (~1,3 GB, entra comodamente).
- **Velocità dichiarata:** RTFx ~418 — molto più lento di Parakeet (RTFx nell'ordine delle migliaia) ma tipicamente ancora più veloce di Whisper large-v3 in assoluto.
- **Perché considerarlo:** è il modello con il WER medio più basso fra quelli comparsi ripetutamente in cima all'Open ASR Leaderboard a metà 2026 (~5,63%). La "modalità LLM" integrata è una curiosità interessante ma non ti serve, dato che il riassunto lo farai comunque con Gemini a valle.
- **Windows/WSL:** dipende da NeMo per l'uso completo → stesse considerazioni di Parakeet; l'inferenza via Transformers dovrebbe essere possibile ma è un modello più recente e meno documentato in tal senso rispetto a Parakeet. ([Hugging Face nvidia/canary-qwen-2.5b](https://huggingface.co/nvidia/canary-qwen-2.5b); [Evermx](https://evermx.com/open-source/nvidia-canary-qwen-2-5b-salm-speech-recognition))

### 5.5 Qwen3-ASR-0.6B / 1,7B — il più permissivo, il più nuovo

- **Architettura:** encoder **AuT** (attention-encoder-decoder, sotto-campionamento 8×, finestra di attenzione dinamica 1–8 secondi che permette sia streaming sia audio lunghi) + decoder Qwen3 (0,6B o 1,7B) + proiettore.
- **Licenza: Apache 2.0** — la più permissiva fra tutte le alternative valutate (nessun obbligo di attribuzione).
- **Copertura linguistica:** 52 lingue/dialetti; il paper tecnico riporta una valutazione esplicita su "Dialog-Accented English" (16 accenti — non confermato se include specificamente l'italiano, dato non reperito nelle fonti consultate).
- **Dato multilingue rilevante per te:** nella tabella comparativa del paper tecnico (che include l'italiano nei set MLS e CommonVoice), Qwen3-ASR-1,7B ottiene WER più basso di Whisper-large-v3 su quasi tutte le metriche riportate (es. MLS: 8,55% vs 8,62%; CommonVoice: 9,18% vs 10,77%) — dato **auto-riportato da Alibaba**, quindi da trattare con la cautela che l'utente stesso richiede per i benchmark dichiarati dai produttori, ma è comunque uno dei pochi confronti diretti trovati che include esplicitamente l'italiano nel set di lingue. ([arXiv 2601.21337](https://arxiv.org/pdf/2601.21337))
- **Memoria:** classe dimensionale simile a Parakeet/piccoli LLM — 0,6–1,7B di parametri stanno comodamente in 4 GB in FP16/INT8.
- **Windows/maturità:** supporto Transformers nativo aggiunto solo a giugno 2026; ecosistema di quantizzazioni GGUF/community ancora meno sviluppato di quello di Whisper o Parakeet al momento di questa ricerca. **Promettente ma meno battle-tested** per un uso quotidiano immediato.

### 5.6 Parakeet-Unified-EN-0.6B

FastConformer a 24 layer + decoder RNNT, addestrato congiuntamente per funzionare sia offline sia in streaming (da cui "unified"), pubblicato ad aprile 2026 sotto **NVIDIA Open Model License** (nota bene: licenza diversa da CC-BY-4.0, da verificare separatamente se rilevante per te). Stessa classe di VRAM di Parakeet-TDT. È pensato soprattutto per casi con vincoli di latenza da 160ms a 2,08s configurabili — per una trascrizione **batch** di lezioni registrate (il tuo caso), Parakeet-TDT, ottimizzato per il throughput offline, resta la scelta più diretta. ([Hugging Face nvidia/parakeet-unified-en-0.6b](https://huggingface.co/nvidia/parakeet-unified-en-0.6b); [GitHub handy-computer/transcribe.cpp](https://github.com/handy-computer/transcribe.cpp/blob/main/docs/models/parakeet.md))

### 5.7 Moonshine — incluso per completezza, sconsigliato per questo caso

27–61M parametri, MIT, solo inglese, encoder-decoder con RoPE. Progettato esplicitamente per comandi vocali e didascalie live su hardware embedded a bassissima potenza; nessuna evidenza di prestazioni forti su audio lungo, denso e ricco di terminologia tecnica come una lezione universitaria. **Sconsigliato** per il tuo caso specifico.

### 5.8 Vosk — incluso per completezza, sconsigliato per questo caso

Basato su Kaldi, pensato per CPU e dispositivi embedded, vocabolario riconfigurabile ma architettura di generazione precedente rispetto ai moderni encoder Transformer/Conformer end-to-end. Va bene per comandi vocali o dettatura semplice in tempo reale; **sconsigliato** per trascrizione tecnica ad alta fedeltà.

### 5.9 sherpa-onnx — non un modello ma il "runtime universale"

C++ / ONNX Runtime, build Windows native, nessun WSL, execution provider CUDA disponibile per l'inferenza GPU. Ospita famiglie proprie (Zipformer-transducer) più conversioni di Moonshine, Whisper, Paraformer e (da aprile 2026) Cohere Transcribe. Se il tuo obiettivo è **evitare completamente** lo stack Python/PyTorch/NeMo e avere un unico eseguibile che parla con più modelli, è l'opzione più pulita — ma per i modelli Parakeet specifici, i runtime dedicati elencati in §4.10 (transcribe.cpp, parakeet-rs) sono più aggiornati.

## 6. Benchmark pubblicati — cosa dicono, e perché vanno letti con cautela

**Il problema metodologico principale (già anticipato in §2):** l'Open ASR Leaderboard di Hugging Face — la fonte più citata da tutte le terze parti consultate — ha aggiunto split di valutazione privati a maggio 2026 e nuove lingue/tracce nei mesi successivi, proprio per contrastare l'overfitting ("benchmaxxing") ai set pubblici storici. Questo significa che un WER "medio" pubblicato in un articolo di marzo 2026 e uno pubblicato in un articolo di agosto 2026 **possono non essere calcolati sugli stessi dati**, anche se si riferiscono allo stesso modello. Non sono riuscito a recuperare la tabella live del leaderboard (l'interfaccia è un'app JavaScript dinamica non accessibile via fetch statico); i numeri sotto sono quindi tutti di **seconda mano**, con fonte e data esplicite.

**Snapshot raccolti, con fonte e data — nota le divergenze:**

| Fonte | Data | Whisper large-v3 | Parakeet-TDT-0.6B | Canary-Qwen-2.5B |
|---|---|---|---|---|
| [VexaScribe](https://vexascribe.com/whisper-large-v3-vs-turbo) | ago 2026 | ~7,4% (medio storico citato) | ~6,05% (v2) | — |
| [Northflank](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks) / [Gladia](https://www.gladia.io/blog/best-open-source-speech-to-text-models) | metà 2026 | non tra i primi 3 | — | **~5,63% (#1)** |
| Commento community su Hacker News (leaderboard letto direttamente) | 2026, data imprecisa | **4,91%** | 5,05% (v3), ma **17× più veloce** (RTFx 2154 vs 126) | — |
| [LoroNote](https://loronote.com/en/blog/parakeet-v3-vs-whisper-large-v3) | ago 2026 | ~7,4% | ~6,3% (v3) | — |

La lettura più onesta di questi dati contrastanti: **su inglese pulito, Whisper large-v3, Parakeet-TDT e Canary-Qwen-2.5B sono entro 1–2 punti percentuali l'uno dall'altro**, un margine piccolo rispetto a quanto accento, rumore e gergo tecnico reale possono spostare il WER (spesso 5–15 punti secondo la letteratura su accenti, §7). La differenza pratica che conta di più per te è la **velocità**, dove Parakeet vince nettamente e in modo consistente su tutte le fonti (10–20× più veloce di Whisper large-v3, quando il confronto è a parità di GPU).

**Confronto multilingue diretto che include l'italiano** (dal technical report di Qwen3-ASR, unica fonte trovata che mette a confronto diretto Whisper-large-v3 con altri modelli su MLS/CommonVoice/Fleurs, dataset che includono l'italiano):

| Dataset | Whisper-large-v3 | Qwen3-ASR-0.6B | Qwen3-ASR-1.7B | Fun-ASR-MLT-Nano |
|---|---|---|---|---|
| MLS (8 lingue incl. IT) | 8,62% | 13,19% | **8,55%** | 28,70% |
| CommonVoice (13 lingue incl. IT) | 10,77% | 12,75% | **9,18%** | 17,25% |
| Fleurs | 5,27% | 7,57% | **4,90%** | 10,03% |

Fonte: [arXiv 2601.21337](https://arxiv.org/pdf/2601.21337) (auto-riportato da Alibaba, che però include anche i propri concorrenti — quindi parzialmente indipendente). Da notare: questi WER sono su **lingua italiana parlata da italiani**, non su **inglese parlato con accento italiano** — un proxy indiretto, non una risposta diretta alla tua domanda (approfondito in §7).

**Un benchmark che meriterebbe attenzione ma di cui non ho trovato numeri specifici per modello:** il nuovo **Far-Field ASR (FFASR) Leaderboard**, lanciato a giugno 2026 da Hugging Face e Treble Technologies, valuta esplicitamente le condizioni acustiche di una stanza reale (riverbero, microfono distante) — molto più vicino a una vera aula universitaria di quanto lo siano LibriSpeech o Common Voice. Supporta la sottomissione diretta di modelli Whisper, Parakeet e altri. **Non sono riuscito a recuperare classifiche specifiche per modello da questa fonte in questa sessione di ricerca**; se la stabilità in condizioni di riverbero/microfono lontano è una tua priorità, ti consiglio di consultarlo direttamente. ([Hugging Face blog FFASR](https://huggingface.co/blog/ffasr-leaderboard))

---

## 7. Inglese con accento italiano

Questa è la sezione dove la letteratura è più scarsa in assoluto — come previsto nella tua richiesta, qui dichiaro esplicitamente dove i dati mancano.

**L'unico studio trovato con un sottogruppo esplicitamente italiano su Whisper e accento inglese:**

Graham & Roll (2024), *JASA Express Letters*, hanno testato **Whisper (v3, su GPU A100)** sulla Speech Accent Archive (SAA), che include **32 parlanti L1 italiani** che leggono lo stesso paragrafo in inglese, misurando il Match Error Rate (MER, una metrica affine al WER). Risultati chiave, testuali e verificabili:

- Le lingue vengono raggruppate per tipologia prosodica: *stress-accent* (es. italiano, tedesco, arabo, olandese), *pitch-accent* (es. giapponese, svedese), *tone* (es. mandarino, vietnamita, thai).
- Il gruppo **stress-accent — la categoria a cui appartiene l'italiano — ha ottenuto il MER medio più basso fra le tre categorie tipologiche testate** (stress-accent MER=0,120 vs pitch-accent MER=0,180 vs tone MER=0,161). In altre parole, dal punto di vista tipologico l'italiano rientra nella categoria di accenti **più favorevole**, non fra le più penalizzate, per Whisper.
- Un fattore che tira nella direzione opposta: la dimensione dell'inventario vocalico dell'L1 correla negativamente con il MER (vocali più numerose → MER più basso); l'italiano ha un sistema di 7 vocali contro le circa 20 dell'inglese (contando i dittonghi), quindi su questo asse specifico non è il caso più favorevole.
- **Non sono riuscito a recuperare il valore numerico esatto del MER mediano per il solo gruppo italiano** (è mostrato in una figura del paper che non ho potuto leggere direttamente, solo descritta testualmente) — su questo punto specifico dichiaro esplicitamente: *non esistono dati sufficienti, in questa ricerca, per riportare la cifra puntuale.* La conclusione tipologica (stress-accent = categoria più favorevole) è invece testuale e verificabile.

Fonte completa: [JASA Express Letters, Graham & Roll 2024](https://pubs.aip.org/asa/jel/article/4/2/025206/3267247/Evaluating-OpenAI-s-Whisper-ASR-Performance)

**Proxy indiretti raccolti (nessuno è italiano-specifico, tutti dichiarati come tali):**

- Ballier et al. (2024) hanno misurato Whisper-large-v2 su **apprendenti francesi** di inglese (stessa famiglia linguistica romanza dell'italiano): WER medio 13,2%. Proxy ragionevole ma non equivalente.
- Uno studio 2025 su L2-ARCTIC (Whisper, AssemblyAI, RevAI, ecc.) copre arabo, cinese, hindi, coreano, spagnolo, vietnamita — **non l'italiano**. Risultato generale: Whisper e AssemblyAI i migliori su parlato letto (MER ≈0,054–0,056, vicino al livello umano), RevAI migliore su parlato spontaneo. Lo cito solo come contesto generale sulla competitività di Whisper su accenti non nativi, non come dato italiano. ([arXiv 2503.06924](https://arxiv.org/pdf/2503.06924))
- Uno studio del 2024 sul riconoscimento dello **svedese** da parte di parlanti L1 diversi (obiettivo: sistemi ASR per lo svedese, non per l'inglese) nota, con un campione esplicitamente definito "troppo piccolo per essere significativo" dagli stessi autori, che i parlanti italiani ottenevano risultati comparabili o migliori dei parlanti nativi svedesi. **Segnale debolissimo e nella lingua sbagliata** (sveedese, non inglese) — lo riporto solo perché è l'unico altro punto dati che nomina esplicitamente parlanti italiani in un contesto ASR, non perché sia direttamente applicabile. ([arXiv 2405.13379](https://arxiv.org/pdf/2405.13379))
- Il paper tecnico di Qwen3-ASR include una valutazione su "Dialog-Accented English" (16 accenti) — **non sono riuscito a confermare se l'italiano sia fra i 16** dai materiali consultati; se questo dato ti interessa, ti conviene controllare direttamente l'appendice del paper.

**Conclusione della sezione, dichiarata esplicitamente come richiesto:** *non esiste, fra le fonti raccolte, un benchmark che isoli "inglese accademico parlato da professori italiani" come categoria a sé stante e lo confronti fra i modelli finalisti.* L'evidenza migliore disponibile (la classificazione tipologica di Graham & Roll + il proxy francese + il design esplicitamente multi-accento di Qwen3-ASR) converge verso una conclusione plausibile ma non dimostrata: l'accento italiano in inglese dovrebbe collocarsi nella fascia **più trattabile** dello spettro di accenti non nativi per i moderni modelli Whisper-class, non nella fascia più problematica. Non è però un dato misurato sul tuo caso specifico, e ti consiglio di trattarlo come ipotesi di lavoro, non come certezza — è esattamente per questo che nel benchmark pratico (§17) ti propongo di misurarlo tu stesso sui tuoi audio reali.

## 8. Terminologia tecnica, formule e contextual biasing — il criterio più importante

Qui la differenza fra le famiglie di modelli è più netta e meglio documentata di quanto ci si aspetterebbe.

### 8.1 Cosa fa davvero il prompt di Whisper (quello che già usi)

Il parametro `initial_prompt` inserisce del testo nella sequenza di input del decoder. Due limiti tecnici documentati che vale la pena conoscere, perché spiegano perché a volte il tuo prompt "funziona meno" del previsto:

- **Solo gli ultimi ≤224 token del prompt vengono effettivamente usati**; i token più vicini alla fine del prompt pesano di più nella decodifica. Un prompt lungo con i termini più importanti all'inizio è meno efficace di uno che li mette verso la fine. ([arXiv 2602.18966](https://arxiv.org/pdf/2602.18966))
- **Non è un vero meccanismo di "hotword biasing"**: architetturalmente il prompt di Whisper è pensato per la continuità fra un segmento e il successivo (il testo del segmento precedente), non per una lista di parole pesate. Uno studio del 2025 mostra che aggiungere un prompt può addirittura **peggiorare** il WER sulle parole *non* incluse nel prompt in 6 dataset su 11 testati, anche mentre migliora le parole target — un compromesso reale, non un puro guadagno. ([arXiv 2502.11572](https://arxiv.org/pdf/2502.11572))

Questo non significa che il tuo approccio attuale sia sbagliato — il tuo prompt, costruito su misura per il dominio (lezione universitaria formale, accento italiano, terminologia tecnica), è esattamente il tipo di prompt che la letteratura giudica utile; significa solo che è un meccanismo "morbido" e informale, non un vero sistema di boosting pesato.

### 8.2 Il vero "word boosting": esiste, ma vive nell'ecosistema NeMo, non in Whisper

NVIDIA ha investito concretamente in un meccanismo di contextual biasing **reale** per i modelli della famiglia Parakeet/Canary, disponibile nel toolkit NeMo open source (non solo nel prodotto enterprise Riva):

- **CTC-WS context-biasing**: costruisci un file di testo con le frasi/termini da rinforzare, con la possibilità di specificare **più pronunce/ortografie alternative per lo stesso termine** — esattamente il caso "Denavit-Hartenberg" → `denavit hartenberg`, o "GPU" → `g p u`, o un acronimo con errore comune noto. Questo è disponibile direttamente negli script NeMo (`asr_context_biasing/eval_greedy_decoding_with_context_biasing.py`), non solo nel prodotto a pagamento. ([NVIDIA NeMo docs](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/asr_customization/word_boosting.html))
- **TurboBias** (paper NVIDIA 2025): un "albero di boosting" accelerato su GPU, compatibile con decoder CTC, Transducer (RNNT/TDT — cioè Parakeet) e Attention-Encoder-Decoder (cioè Canary), fino a **20.000 frasi** con degrado di velocità trascurabile, integrato in shallow fusion durante la decodifica greedy o beam. Open-source nel toolkit NeMo. ([arXiv 2508.07014](https://arxiv.org/pdf/2508.07014))
- **Riva/NIM word boosting** (la versione enterprise "produttizzata" della stessa idea): punteggio di boost configurabile per parola (range 20–100 per modelli CTC, 0,5–2,0 per RNNT/TDT), fino a 500 parole per richiesta o 5.000+ in modalità "globale" precompilata nel modello. Questa parte è più orientata a un deployment aziendale via Riva-build/NIM che a un uso hobbistico locale — per te, gli script NeMo diretti (CTC-WS/TurboBias) sono la via più pertinente. ([NVIDIA Riva docs](https://docs.nvidia.com/deeplearning/riva/user-guide/docs/asr/asr-customizing.html); [NVIDIA Speech NIM docs](https://docs.nvidia.com/nim/speech/26.05.0/asr/customization/customization.html))

### 8.3 Tecniche di ricerca per aggiungere biasing a Whisper (non pronte all'uso)

Esistono metodi accademici (es. **TCPGen**, un "tree-constrained pointer generator" che integra un albero delle frasi target nella distribuzione di output di Whisper senza modificarne i pesi) che ottengono riduzioni relative di WER sostanziali sulle parole target (28% su SLURP, 42% su DSTC2) senza danneggiare — anzi aiutando leggermente — le parole non incluse nella lista. **Non è però una funzionalità standard pronta all'uso in faster-whisper o whisper.cpp**: richiederebbe implementazione custom. ([arXiv 2306.01942](https://arxiv.org/pdf/2306.01942))

### 8.4 Cosa funziona davvero vs cosa è solo teoricamente disponibile — sintesi

| Tecnica | Whisper (faster-whisper/whisper.cpp) | Parakeet/Canary (NeMo) |
|---|---|---|
| Prompt/prefix informale | ✅ Reale, già in uso da te | N/D (architettura diversa) |
| Hotword/word boosting pesato | ❌ Non nativo; solo via TCPGen custom (ricerca, non pacchettizzato) | ✅ Reale (CTC-WS, TurboBias), script pronti nel toolkit open |
| Vocabolario custom / pronunce alternative | ❌ | ✅ (file di context-biasing con ortografie multiple) |
| Language-model fusion / shallow fusion | Parzialmente (KenLM esterno, non standard in faster-whisper) | ✅ (n-gram KenLM via Riva, o TurboBias) |
| Fine-tuning / LoRA / adapter | ✅ (community, molte guide) | ✅ (nativo in NeMo) |
| Correzione post-ASR con LLM | ✅ (indipendente dal motore, vedi §9 pipeline) | ✅ (idem) |

**Conclusione pratica di questa sezione:** se il controllo puntuale sui termini tecnici ("q_0" invece di "cue zero", "Chvátal" scritto correttamente, "Denavit-Hartenberg" con il trattino) è davvero il criterio numero uno — come dichiari tu stesso — **Parakeet/Canary via NeMo con CTC-WS o TurboBias è, architetturalmente, l'opzione più forte disponibile localmente**, perché è un meccanismo di boosting vero, non un prompt informale. Il costo è la complessità di setup (NeMo pieno, §11). L'alternativa pragmatica — che già stai usando con buoni risultati — resta un prompt Whisper ben costruito, riutilizzato identico su ogni chunk, eventualmente rinforzato da una passata di normalizzazione LLM vincolata a un glossario esplicito (§9 e §16).

## 9. Gestione dell'audio lungo (60–120 minuti)

**Il punto di partenza più importante:** nessun modello finalista ingerisce realisticamente una lezione da 90–120 minuti in un solo passaggio **sulla tua GPU da 4 GB**, indipendentemente dalle cifre "3 ore di attenzione locale" che leggerai nelle model card — quelle cifre sono dimostrate su A100 80 GB, non su una Quadro T2000. Nella pratica, **la segmentazione è obbligatoria a prescindere dal modello scelto**.

### 9.1 Durata massima per singolo passaggio (dichiarata dai produttori)

| Modello | Finestra nativa | Con attenzione estesa/locale |
|---|---|---|
| Whisper (large-v2/v3/turbo) | 30 secondi per chunk (fisso) | Nessuna — il runtime deve segmentare esternamente |
| Parakeet-TDT-0.6B-v2 | 24 minuti con attenzione piena (misurato su A100 80 GB) | Fino a 3 ore dichiarate con attenzione locale |
| Canary-Qwen-2.5B | Non specificato esplicitamente nelle fonti consultate | — |
| Voxtral (Mistral) | 32k token ≈ 30 min per trascrizione, 40 min per comprensione | — |

### 9.2 Pipeline di segmentazione consigliata per una lezione universitaria

La combinazione più solida emersa dalla letteratura e dalla pratica open-source (Silero VAD + chunking con overlap) è, in ordine:

1. **VAD (Voice Activity Detection) su tutto il file** prima di qualunque trascrizione. **Silero VAD** è lo standard de facto: modello ONNX di ~2,3 MB, gira comodamente su CPU, usa un doppio soglia con isteresi (0,5 per iniziare un segmento, 0,35 per considerarlo concluso) per evitare che piccole oscillazioni nella probabilità aprano/chiudano segmenti a raffica. ([DEV Community, Silero VAD](https://dev.to/kiarina/extracting-speech-segments-with-silero-vad-and-onnx-runtime-3h8a))
2. **Unione dei segmenti VAD in chunk di 20–30 secondi**, con **overlap di circa 1 secondo** fra chunk consecutivi, e **padding di ~300 ms** ai bordi di ogni segmento per non tagliare i fonemi iniziali/finali. Questi valori sono quelli usati in pratica in pipeline recenti pubblicate (es. un paper 2026 su trascrizione lunga in bengalese con Whisper+Pyannote usa esattamente 30s/1s di overlap). ([NVIDIA NeMo Curator VAD docs](https://docs.nvidia.com/nemo/curator/curate-audio/process-data/quality-filtering/vad); [arXiv 2603.04809](https://arxiv.org/html/2603.04809v1))
3. **Disattiva il "condizionamento sul testo precedente"** (in Whisper: `condition_on_previous_text=False`). Questo è specificamente per evitare la modalità di guasto nota di Whisper in cui un'allucinazione o un loop di ripetizione in un chunk iniziale si propaga a tutti i chunk successivi tramite il meccanismo di conditioning del modello — un problema reale e documentato, non teorico.
4. **Filtri post-hoc**: un rilevatore di ripetizioni n-gram (per il "loop" tipico di Whisper) e una blacklist di frasi boilerplate note (es. testo residuo dal pre-training su YouTube) — entrambi concretamente usati e utili secondo la pipeline citata sopra.
5. **Riusa lo stesso prompt/hotword-list identico su ogni chunk** — è economico e mantiene la coerenza terminologica fra segmenti (approfondito in §16).

### 9.3 Come gestiscono nativamente l'audio lungo i modelli CTC/RNNT/TDT (Parakeet, Canary)

A differenza di Whisper (finestra fissa a 30s "ingenua"), i modelli transducer/CTC di NeMo possono usare **inferenza a chunk sovrapposti con un algoritmo di fusione/allineamento integrato nel framework** — è essenzialmente ciò che "attenzione locale" opera sotto il cofano. In pratica, gli script di trascrizione di NeMo possono gestire l'intero flusso di chunking+merge internamente, ma un pre-passaggio VAD esterno resta comunque consigliato per saltare in modo efficiente i lunghi silenzi o le pause per domande degli studenti, risparmiando calcolo. ([arXiv 2309.09950](https://arxiv.org/pdf/2309.09950))

### 9.4 Timestamp: segment-level vs word-level

- **Whisper**: timestamp nativo a livello di segmento; il timestamp a livello di parola esiste ma è ottenuto tramite un metodo di cross-attention/DTW interno noto per essere impreciso, oppure tramite l'allineamento forzato esterno di **WhisperX** (basato su wav2vec2), più affidabile ma è uno strumento aggiuntivo.
- **Parakeet (TDT/RNNT)**: espone timestamp a livello di token **come output nativo di prima classe**, un vantaggio architetturale intrinseco dei decoder transducer rispetto al decoder puramente testuale di Whisper.
- **Qwen3-ForcedAligner-0.6B**: un modello dedicato e separato per l'allineamento forzato non autoregressivo (11 lingue), utilizzabile per aggiungere timestamp precisi a *qualsiasi* trascrizione già prodotta — utile se un giorno i timestamp ti servissero davvero (per ora, come dichiari, non sono una priorità).

### 9.5 Diarizzazione e robustezza a rumore/domande studenti

Nessuno dei modelli ASR finalisti fa diarizzazione nativa — serve un modello separato (pyannote.audio, oppure i modelli **Sortformer** di NVIDIA, comparsi nell'ecosistema Parakeet come componente dedicato). Non è nel tuo caso d'uso primario (lezione con un solo professore che parla), quindi lo tratto come opzionale. Sulla robustezza a rumore/riverbero/microfoni lontani, il nuovo leaderboard **FFASR** (§6) è la fonte più pertinente disponibile, ma non ho trovato classifiche specifiche per modello da riportare in questa ricerca — è un'area dove ti consiglio una verifica diretta con il tuo audio reale (§17).

## 10. Runtime e quantizzazione

### 10.1 Panoramica dei runtime

| Runtime | Modelli supportati | Windows nativo | CUDA | 4 GB VRAM | Quantizzazione | Maturità |
|---|---|---|---|---|---|---|
| PyTorch/Transformers | Whisper, Parakeet, Qwen3-ASR, Canary-Qwen | Sì | Sì | Solo con quant. esterna (bitsandbytes) | Tramite librerie esterne | Alta, riferimento ma pesante |
| **faster-whisper (CTranslate2)** | Solo famiglia Whisper | **Sì, nessun WSL** | Sì | Sì (INT8/FP16) | INT8 nativo, ottimo supporto | **Molto alta — la scelta più collaudata per Whisper su Windows** |
| whisper.cpp (GGML) | Solo famiglia Whisper | Sì, nessun WSL | Sì (backend CUDA) | Sì con Q5/Q8 | Q4_0/Q4_1/Q5_0/Q5_1/Q8_0 | Alta, dipendenza minima (puro C++) |
| **NeMo (toolkit completo)** | Parakeet, Canary, FastConformer | Non ufficiale, possibile con attrito | Sì | Sì | Supportata | Alta su Linux/WSL2, **raccomandato ufficialmente via WSL2 su Windows** |
| sherpa-onnx / ONNX Runtime | Zipformer, Whisper, Moonshine, Paraformer, Cohere Transcribe (conversioni) | **Sì, nessun WSL** | Sì (execution provider CUDA) | Sì | Quantizzazione ONNX Runtime nativa | Alta, cross-platform, C++ |
| transcribe.cpp / parakeet-rs / NeMo-Speech.cpp | Famiglia Parakeet (+altre, a seconda del progetto) | **Sì, nessun WSL** | Sì / Metal (a seconda del progetto) | Sì (footprint minimo) | GGUF Q8_0 e altre | Emergente (2025–2026), in rapida evoluzione |
| TensorRT | Qualunque modello esportato | Sì (con setup non banale) | Sì | Dipende | Sì (ottimizzazione a grafo) | Alta ma complessa da configurare per un uso hobbistico |
| Ollama | **Nessun supporto ASR di prima classe riscontrato** | — | — | — | — | Non pertinente per questo caso |

### 10.2 Perché la quantizzazione aggressiva (Q4) peggiora il WER — con numeri reali

Un confronto sistematico pubblicato a maggio 2026 (quattro librerie di quantizzazione — PyTorch, Optimum-Quanto, HQQ, bitsandbytes — testate su Whisper-base e Whisper-tiny, LibriSpeech test-clean/test-other) fornisce dati concreti che confermano esattamente il pattern che ti aspettavi di trovare nella community:

| Configurazione | WER clean | WER "other" (più difficile) | Riduzione dimensione |
|---|---|---|---|
| Whisper-base FP32 (baseline) | 5,08% | 12,87% | — |
| Whisper-base INT8 dinamico (Quanto) | 5,10% (≈invariato) | 14,72% (**+1,85 punti**) | −36% |
| Whisper-base NF4 (BitsAndBytes, ~Q4) | 6,05% (**+0,97**) | 18,09% (**+5,22 punti**) | −52% |
| Whisper-tiny FP32 (baseline) | 7,60% | 23,69% | — |
| Whisper-tiny INT8 dinamico | 7,64% | 24,64% | −19% |
| Whisper-tiny NF4 (~Q4) | 11,16% (**+3,56**) | 32,19% (**+8,50 punti**) | −37,5% |

Fonte: [arXiv 2511.08093](https://arxiv.org/pdf/2511.08093). Conclusione degli autori, testuale: *"precision below 8-bit remains less reliable in real-world ASR applications"* — cioè **INT8 è quasi gratis, Q4/NF4 ha un costo di qualità misurabile e più marcato su audio difficile** (esattamente il tipo di audio — accento, rumore d'aula, microfono distante — che ti riguarda). Nota tecnica aggiuntiva dallo stesso studio: la quantizzazione **dinamica** batte sistematicamente quella **statica** per Whisper — un dettaglio implementativo da tenere a mente se scegli una libreria di quantizzazione.

**Per i modelli NeMo (Parakeet/Canary), non ho trovato uno studio di quantizzazione altrettanto rigoroso e indipendente.** Le fonti comunitarie (calcolatori VRAM, non paper controllati) suggeriscono che Q8_0 sia quasi indistinguibile da FP16 e che persino Q4_K_M perda meno di 0,5 punti WER su audio pulito — ma è un'affermazione di livello "guida pratica", non di livello "studio controllato" come quello di Whisper sopra. **Su questo punto ti consiglio di verificare tu stesso nel benchmark pratico (§17)**, dato che l'assenza di uno studio rigoroso equivalente per Parakeet è un vero buco nella letteratura disponibile.

### 10.3 whisper.cpp: la quantizzazione è nota da anni ma mai quantificata ufficialmente

Le note di rilascio ufficiali di whisper.cpp per la quantizzazione a interi (v1.4.0) dichiarano testualmente: *"The transcription quality is degraded to some extent - not quantified at the moment"* — un'ammissione diretta degli sviluppatori che la perdita di qualità con Q4/Q5/Q8 esiste ma non è mai stata misurata sistematicamente dal progetto stesso. Combinato con lo studio indipendente del punto 10.2, la scelta più prudente per la tua lezione tecnica è **INT8/Q8_0 come limite inferiore di quantizzazione**, evitando Q4/Q5 salvo che il tuo benchmark pratico dimostri il contrario per il tuo audio specifico.

## 11. Compatibilità con Quadro T2000 4 GB — il vincolo hardware spiegato a fondo

### 11.1 La scoperta più importante di questa ricerca: la tua GPU non ha Tensor Core

La tua Quadro T2000 (variante mobile) monta il chip **TU117**, la stessa silicio della GeForce GTX 1650 desktop/mobile: architettura Turing, 1024 CUDA core, bus a 128 bit, ~2,3 TFLOPS FP32, compute capability **7.5 (sm_75)** — confermando esattamente ciò che avevi indicato. Multiple fonti hardware indipendenti confermano però un dettaglio che cambia significativamente le aspettative di prestazione: **il TU117 è la variante "GTX" di Turing, che NVIDIA ha deliberatamente privato dei Tensor Core e degli RT Core** per contenere costi e consumi. Al loro posto, il TU117 ha 128 unità FP16 dedicate per SM che offrono FP16 a **doppio rate rispetto a FP32** — un guadagno reale ma molto inferiore a quello che un vero Tensor Core (presente su T4, RTX 2060 e superiori, A100) offre per operazioni di matrice come quelle che dominano un Transformer. ([Tom's Hardware, GTX 1650 review](https://www.tomshardware.com/reviews/geforce-gtx-1650-turing-gpu,6096.html); [TechPowerUp](https://www.techpowerup.com/254827/nvidia-geforce-gtx-1650-released-tu117-896-cores-4-gb-gddr5-usd-150?cp=2); [WCCFTech](https://wccftech.com/review/nvidia-geforce-gtx-1650-graphics-card-review-msi-gaming-x-and-gigabyte-gaming-oc/2/))

**Questo spiega concretamente gran parte del divario che hai osservato tu stesso** (4 ore in locale contro 10–15 minuti su Colab T4): la T4 di Colab monta il chip TU104, che **ha** Tensor Core reali, oltre a più core CUDA totali e 16 GB di VRAM che permettono batch/beam più ampi. Il divario non è quindi spiegabile solo con "GPU più piccola" — una parte strutturale deriva dall'assenza specifica dei Tensor Core sul tuo silicio, che nessun cambio di modello può colmare da solo (ma un runtime più efficiente e un modello più piccolo possono comunque ridurre drasticamente il tempo assoluto, come vedremo in §12).

### 11.2 Quadro T2000 vs GPU comparabili — cosa possiamo dedurre

Non esiste, nelle fonti raccolte, un benchmark ASR dedicato specificamente alla Quadro T2000 — **lo dichiaro esplicitamente: non esistono dati sufficienti per una misura diretta.** Quello che esiste sono confronti hardware generici (gaming-oriented, quindi non ML-specifici in modo puro, ma indicativi della potenza di calcolo relativa):

- Quadro T2000 mobile vs GTX 1650 mobile: T2000 **più veloce del ~12%** in un confronto aggregato.
- Quadro T2000 mobile vs GTX 1650 desktop: sostanzialmente **alla pari** (~1–4% di differenza).
- Quadro T2000 mobile vs Tesla T4: la T4 **più veloce del ~33%** in benchmark aggregati generici — cifra che **probabilmente sottostima** il divario reale su carichi Transformer/FP16, proprio perché questi benchmark aggregati non isolano l'effetto Tensor Core.

Fonti: [technical.city comparativi T2000/GTX1650/T4](https://technical.city/en/video/GeForce-GTX-1650-vs-Quadro-T2000-mobile) (e pagine correlate). **Conclusione pratica:** i benchmark comunitari su GTX 1650 (molto più numerosi online, vedi §12) sono il proxy più ragionevole disponibile per la tua T2000, con l'avvertenza che sono comunque benchmark generici, non specifici per ASR.

### 11.3 Budget VRAM reale — quanto entra davvero nei tuoi 4 GB

| Modello / configurazione | VRAM stimata | Entra in 4 GB con margine? |
|---|---|---|
| Whisper large-v3 FP16 (whisper.cpp/CTranslate2) | ~4,5–4,7 GB | **No — è il tuo problema attuale** |
| Whisper large-v3 INT8 (faster-whisper) | ~3,0 GB | Sì, margine modesto |
| Whisper large-v3-turbo FP16 | ~2,5 GB | Sì, buon margine |
| Whisper large-v3-turbo INT8 | ~1,5 GB | Sì, ampio margine |
| distil-large-v3 FP16/INT8 | ~2,4 GB / ~1,5 GB | Sì |
| Parakeet-TDT-0.6B FP16 | ~1,1–1,4 GB | **Sì, il margine più ampio fra tutti** |
| Parakeet-TDT-0.6B INT4 | ~0,3 GB | Sì, ampiamente |
| Canary-Qwen-2.5B FP16 | ~5 GB | **No** |
| Canary-Qwen-2.5B INT8 | ~2,5 GB | Sì, margine modesto |
| Canary-Qwen-2.5B INT4 | ~1,3 GB | Sì |
| Qwen3-ASR-1.7B FP16 | ~3,5 GB (stima da conteggio parametri) | Marginale |
| Qwen3-ASR-1.7B INT8 | ~1,8 GB (stima) | Sì |

Fonti principali per le cifre Whisper/Parakeet: [GitHub SYSTRAN/faster-whisper #1030](https://github.com/SYSTRAN/faster-whisper/issues/1030), [Hugging Face ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/blob/98aa99a0a9db05ae2342309f5096248665f7cba3/README.md), [Spheron VRAM calculator](https://www.spheron.network/tools/gpu-recommender/mlx-community/parakeet-tdt-0.6b-v3/). Le cifre per Qwen3-ASR-1.7B e Canary-Qwen INT4 sono **stime per conteggio di parametri** (parametri × byte per parametro + margine ~10%), non misure dirette — le segnalo esplicitamente come tali.

**Conferma indipendente del tuo problema attuale dalla community:** una discussione ufficiale su GitHub degli sviluppatori di Whisper conferma che con 4 GB di VRAM il consiglio standard della community è *"you should be able to use the small model"* — cioè persino "medium" è già al limite, figuriamoci "large". Un altro utente riporta esplicitamente un errore CUDA out-of-memory tentando "large" su una scheda da 4 GB. Questo corrobora, con fonti dirette, la difficoltà che hai riscontrato tu stesso. ([GitHub openai/whisper Discussion #60](https://github.com/openai/whisper/discussions/60))

### 11.4 Windows nativo vs WSL — sintesi per la tua situazione

- **Whisper (qualunque runtime: faster-whisper, whisper.cpp)**: **nessun WSL necessario**, installazione nativa Windows semplice.
- **Parakeet/Canary via Hugging Face Transformers**: **nessun WSL necessario** (supporto Transformers ufficiale confermato nelle model card).
- **Parakeet/Canary via toolkit NeMo completo** (necessario solo se vuoi usare CTC-WS/TurboBias per il contextual biasing avanzato, §8): NVIDIA raccomanda ufficialmente **WSL2 su Windows**; l'installazione nativa Windows non è documentata come percorso supportato e più utenti riportano attrito con le dipendenze. ([NVIDIA NeMo Agent Toolkit install docs](https://github.com/NVIDIA/NeMo-Agent-Toolkit/blob/develop/docs/source/get-started/installation.md))
- **Parakeet via runtime GGUF-style (transcribe.cpp, parakeet-rs, sherpa-onnx)**: **nessun WSL necessario** — è probabilmente il percorso più semplice se vuoi Parakeet senza toccare NeMo pieno, ma **rinunci al vero contextual biasing** (che vive dentro NeMo), mantenendo solo l'inferenza pura.

## 12. Stime prestazionali sul tuo PC

**Premessa obbligatoria:** nessuna fonte raccolta ha misurato direttamente questi modelli su una Quadro T2000. Tutto ciò che segue è **estrapolazione dichiarata**, costruita a partire da benchmark misurati su GPU comparabili (GTX 1650/1650 Ti, RTX 3050/3060/3070Ti, Tesla T4, A100), corretta per: (a) il rapporto di TFLOPS/CUDA core generico fra quelle GPU e la tua, e (b) la penalità aggiuntiva per l'assenza di Tensor Core discussa in §11.1, che nessuno dei benchmark di origine condivide con la tua scheda (tranne, in parte, la stessa GTX 1650, che è quasi identica alla tua T2000). Uso la definizione che hai richiesto: **RTF = tempo di elaborazione / durata audio** (RTF basso = più veloce), e **×tempo-reale = durata audio / tempo di elaborazione**.

| Configurazione | Tipo di dato | RTF stimato | ×tempo-reale | Tempo stimato per lezione da 90 min |
|---|---|---|---|---|
| Whisper large-v3 FP16, locale (situazione attuale) | **Misurato da te** | ~2,7 | ~0,37× | **~4 ore** (tuo dato reale) |
| Whisper large-v3, Colab T4 | **Misurato da te** | ~0,11–0,17 | ~6–9× | **~10–15 min** (tuo dato reale) |
| Whisper large-v3 INT8 (faster-whisper), locale T2000 | Estrapolazione da benchmark GTX1650/RTX3050 con INT8, corretta per assenza Tensor Core | ~1,3–1,8 | ~0,55–0,77× | **~120–160 min** (miglioramento modesto: il modello resta pesante, VRAM ancora tirata) |
| Whisper large-v3-turbo FP16, locale T2000 | Estrapolazione da rapporto di velocità turbo/large-v3 (4–8×, misurato su altre GPU) applicato al tuo RTF attuale | ~0,4–0,7 | ~1,4–2,5× | **~35–65 min** |
| Whisper large-v3-turbo INT8, locale T2000 | Estrapolazione combinata (turbo + INT8) | ~0,3–0,5 | ~2–3,3× | **~27–45 min** |
| distil-large-v3 INT8, locale T2000 | Estrapolazione, classe simile a turbo | ~0,3–0,5 | ~2–3,3× | **~27–45 min** |
| Parakeet-TDT-0.6B FP16, locale T2000 | Estrapolazione a **bassa confidenza** — nessun benchmark Turing-specifico trovato; dedotta da RTFx su datacenter GPU scalato per compute-ratio T2000, con margine di incertezza ampio | ~0,1–0,25 | ~4–10× | **~9–22 min** (fascia ampia, verifica raccomandata) |
| Canary-Qwen-2.5B INT8, locale T2000 | Estrapolazione a **bassa confidenza**, decoder LLM più pesante di Parakeet | ~0,3–0,6 | ~1,7–3,3× | **~27–54 min** |

**Come leggere questa tabella:** le prime due righe sono i tuoi dati reali, riportati come ancoraggio. Tutte le righe successive sono stime esplicitamente etichettate come tali — non promesse. Il grado di incertezza cresce dall'alto verso il basso: le righe Whisper (turbo, distil) sono estrapolazioni relativamente solide perché si basa su rapporti di velocità misurati fra varianti dello stesso modello su più GPU diverse (quindi il rapporto tende a essere più stabile del valore assoluto). Le righe Parakeet/Canary sono meno solide perché **non ho trovato alcun benchmark RTFx su un chip Turing senza Tensor Core** — tutti i numeri di RTFx pubblicati (migliaia di ×) sono misurati su GPU datacenter con Tensor Core (A100, H100, L40S), e scalarli correttamente per la tua T2000 richiede assunzioni che non posso verificare con i dati raccolti. **Per questo l'esperimento pratico in §17 è particolarmente importante proprio per Parakeet**, più che per le varianti Whisper.

**Nota su Apple Silicon:** come richiesto, la tratto con estrema cautela e la escludo dalla tabella — l'architettura (memoria unificata, Neural Engine, CoreML) è troppo diversa da un PC Windows con GPU CUDA discreta per essere un proxy utile alla tua situazione.

## 13. Esperienze reali degli utenti

Come richiesto, distinguo i pattern ricorrenti (più affidabili) dalle singole opinioni isolate (meno affidabili), e dichiaro esplicitamente dove non ho trovato riscontro diretto.

**Pattern confermato: il confronto Parakeet vs Whisper genera pareri onestamente divisi, non un consenso.**

- Una discussione Hacker News del gennaio 2026 porta direttamente il titolo *"Parakeet is not really more accurate than Whisper, but it's much faster"* — non sono riuscito a recuperare il testo dei commenti (il link restituisce contenuto non disponibile), ma il titolo stesso è un dato di contesto rilevante e coerente con quanto osservato sui leaderboard (§6): differenze di accuratezza minime, differenza di velocità grande. ([Hacker News, gen 2026](https://news.ycombinator.com/item?id=46641361))
- Una discussione HN del giugno 2025, titolo *"I've been using Nvidia's parakeet model, it's been better than Whisper v3 large"*, riceve almeno una risposta esplicitamente dissenziente: *"I'm sticking with Whisper as it is fast enough for my use case."* Nessun consenso unanime, dipendenza dal caso d'uso specifico. ([Hacker News, giu 2025](https://news.ycombinator.com/item?id=44380330))
- Un confronto informale ma indipendente (9to5Mac, un utente non madrelingua inglese che ha condotto il proprio test su 15 clip) ha giudicato **Whisper large-v3-turbo "chiaramente il più accurato"** rispetto a Parakeet v2 e al motore nativo di Apple — campione piccolo e non controllato, ma è un segnale reale, indipendente dai leaderboard, che va nella direzione opposta rispetto alla narrativa "Parakeet è sempre meglio". Lo riporto proprio perché il tuo caso (non madrelingua) è simile al contesto di quel test. ([9to5Mac](https://9to5mac.com/2025/07/03/how-accurate-is-apples-new-transcription-ai-we-tested-it-against-whisper-and-parakeet/))
- Un commento diretto su Hacker News, che cita numeri dell'Open ASR Leaderboard letti personalmente dall'utente: *"Whisper-large-v3 4.91 vs Parakeet V3 5.05"* di WER medio, ma *"~17x faster"* per Parakeet — coerente con il quadro "quasi pari in accuratezza, nettamente diverso in velocità" che emerge ovunque in questa ricerca.

**Pattern confermato con dati concreti (non solo opinioni): la quantizzazione Q4 peggiora sensibilmente il WER.**

Questo non è solo un'opinione ricorrente in community — lo studio quantitativo citato in §10.2 lo conferma con numeri: +3,5–8,5 punti percentuali di WER su audio "difficile" passando da FP32 a NF4/Q4 su Whisper. Il pattern che probabilmente hai già letto in forum e thread è quindi **fondato**, non solo aneddotico.

**Pattern confermato: 4 GB di VRAM è realisticamente al limite per Whisper "large".**

Discussioni dirette sul repository ufficiale di Whisper mostrano utenti con 4 GB che ricevono errori CUDA out-of-memory tentando "medium" o "large", con il consiglio ricorrente della community di scendere a "small" su questa classe di VRAM. Corrobora direttamente la tua esperienza. ([GitHub openai/whisper Discussion #60](https://github.com/openai/whisper/discussions/60))

**Cosa non ho trovato, e lo dichiaro esplicitamente:**

- Nessun commento diretto e verificabile del tipo "Parakeet va in OOM su 4 GB" — plausibilmente perché l'ingombro di Parakeet (sotto i 2 GB anche in FP16) rende questo scenario raro, non perché il problema non sia mai stato discusso da nessuna parte.
- Nessuna citazione diretta e verificabile del tipo "il word boosting è fondamentale" attribuibile a un utente specifico. Il concetto è però **fortemente corroborato indirettamente**: NVIDIA ha pubblicato un intero paper di ricerca (TurboBias, 2025, §8.2) specificamente per rendere il contextual biasing praticabile su larga scala, e la letteratura accademica sul biasing individua ripetutamente "nomi propri, terminologia tecnica, nomi di prodotto" come il punto debole persistente di modelli ASR altrimenti molto forti — un investimento ingegneristico e accademico che riflette esattamente il problema che descrivi tu.
- Nessun dato specifico sul degrado "dopo 30 minuti" per un modello specifico — non ho trovato un riferimento diretto a questo pattern per nessuno dei finalisti; se lo hai letto altrove, ti consiglio di verificarlo comunque nel tuo benchmark pratico, perché coerente con la modalità di guasto nota di Whisper legata al conditioning fra chunk (§9.2), ma non ho una fonte diretta da citare per la soglia specifica dei 30 minuti.

## 14. Confronto completo in tabella

Come richiesto, evito di comprimere tutto in un punteggio unico artificiale: la tabella resta multi-dimensionale, divisa in quattro blocchi tematici per restare leggibile. Legenda: ✅ presente/forte · ⚠️ parziale/con limiti · ❌ assente/sconsigliato · n/d = dato non reperito in questa ricerca.

### 14.A — Identità, licenza, copertura linguistica

| Modello | Famiglia/architettura | Parametri | Licenza | Copertura lingue | Ottimizzato solo-EN |
|---|---|---|---|---|---|
| Whisper large-v2/v3 | Encoder-decoder Transformer | 1,55B | **MIT** | 99+ lingue | ❌ (multilingue) |
| Whisper large-v3-turbo | Come sopra, decoder ridotto | 809M | MIT | 99+ (degrado su lingue a basse risorse) | ❌ |
| distil-large-v3 | Distillazione indipendente | ~756M–800M | MIT | Multilingue (copertura ridotta rispetto a large) | ⚠️ |
| Parakeet-TDT-0.6B-v2 | FastConformer + TDT | 600M | CC-BY-4.0 | Solo EN | ✅ |
| Parakeet-TDT-0.6B-v3 | FastConformer + TDT | 627M | CC-BY-4.0 | 25 lingue UE (incl. IT) | ❌ |
| Parakeet-Unified-EN-0.6B | FastConformer + RNNT | 600M | NVIDIA Open Model License | Solo EN | ✅ |
| Canary-Qwen-2.5B | FastConformer + Qwen3 LLM (SALM) | 2,5B | CC-BY-4.0 | Solo EN | ✅ |
| Qwen3-ASR-0.6B/1.7B | AuT encoder + Qwen3 decoder | 0,6B/1,7B | **Apache 2.0** | 52 lingue/dialetti | ❌ |
| Voxtral Mini/Small | LLM audio-nativo | 3–4B/24B | Apache 2.0 | Multilingue (incl. IT) | ❌ |
| SenseVoice/Paraformer | Non-autoregressivo | 0,2–0,3B | Apache 2.0 | Focus ZH/Cantonese, EN secondario | ❌ |
| Moonshine Tiny/Base | Encoder-decoder + RoPE | 27–61M | MIT | Solo EN | ✅ |
| Vosk | Kaldi | Variabile (piccoli) | Apache 2.0 | ~20 lingue | ❌ |

### 14.B — Accuratezza e robustezza (con avvertenza sulla comparabilità, §6)

| Modello | WER medio pubblicato (fonte/data) | Accented English | Robustezza long-form | Terminologia tecnica |
|---|---|---|---|---|
| Whisper large-v3 | 4,9–7,4% (varia per fonte/snapshot, §6) | ✅ Documentata su 32 IT L1 (categoria "stress-accent", la più favorevole delle 3 testate) | ⚠️ Rischio noto di loop/allucinazione su chunk lunghi senza gestione conditioning | ⚠️ Solo via prompt informale |
| Whisper large-v3-turbo | +0,2–2 punti vs large-v3 (maggiore su lingue a bassa risorsa) | Eredita il comportamento dell'encoder (invariato) | Come large-v3 | ⚠️ Come large-v3 |
| Parakeet-TDT-0.6B | 6,05–6,34% (varia per fonte/versione) | n/d specifico per italiano | ⚠️ Richiede chunking esterno sotto i 4 GB | ✅ Con CTC-WS/TurboBias (vero boosting) |
| Canary-Qwen-2.5B | ~5,63% (fonti multiple, metà 2026, #1 leaderboard) | n/d specifico per italiano | n/d | ✅ Con TurboBias (AED supportato) |
| Qwen3-ASR-1.7B | Competitivo/migliore di Whisper su MLS/CommonVoice/Fleurs incl. IT (auto-riportato) | Valutazione esplicita 16 accenti EN (IT non confermato) | n/d | ⚠️ Nessun meccanismo di boosting pesato confermato nelle fonti consultate |
| SenseVoice/Paraformer | Peggiore di Whisper su lingue europee (dato dal paper Qwen3-ASR) | n/d | n/d | ❌ Non ottimizzato per EN/IT |
| Moonshine/Vosk | Non competitivo su dominio tecnico (per design) | n/d | ❌ Non pensati per audio lungo/denso | ❌ |

### 14.C — Funzionalità

| Modello | Punteggiatura/maiuscole | Timestamp | Contextual biasing reale | Word boosting | Vocabolario custom | Streaming | Offline/batch |
|---|---|---|---|---|---|---|---|
| Whisper (tutte le varianti) | ✅ Native | ⚠️ Segment-level nativo; word-level solo via WhisperX/DTW (impreciso) | ❌ | ❌ (solo prompt informale) | ❌ nativo | ❌ (richiede adattamento esterno) | ✅ |
| Parakeet-TDT | ✅ Native | ✅ Token-level nativo (vantaggio architetturale) | ✅ (CTC-WS, TurboBias) | ✅ | ✅ (via file di context-biasing) | ⚠️ (Parakeet-Unified per streaming dedicato) | ✅ |
| Canary-Qwen-2.5B | ✅ | n/d dettagliato | ✅ (TurboBias) | ✅ | ✅ | ❌ | ✅ |
| Qwen3-ASR | ✅ (dichiarato) | ✅ (con Qwen3-ForcedAligner separato) | n/d confermato | n/d confermato | n/d confermato | ✅ (finestra dinamica 1–8s) | ✅ |
| Voxtral | ✅ + QA/riassunto nativi | n/d | n/d | n/d | n/d | ✅ (variante Realtime) | ✅ |

### 14.D — Hardware e deployment sul tuo PC

| Modello/runtime | Windows nativo | CUDA/sm_75 | Solo CPU | Entra in 4 GB con margine | Classe di velocità (qualitativa) |
|---|---|---|---|---|---|
| Whisper large-v3 (faster-whisper) | ✅ | ✅ | ⚠️ Molto lento (tua esperienza: ore) | ❌ (FP16) / ⚠️ (INT8, margine ridotto) | Bassa |
| Whisper large-v3-turbo (faster-whisper) | ✅ | ✅ | ⚠️ Lento ma meglio di large | ✅ | Medio-alta |
| Parakeet-TDT (Transformers/ONNX) | ✅ | ✅ | ⚠️ Meglio di Whisper su CPU (architettura più leggera) | ✅ Ampio margine | Molto alta |
| Parakeet-TDT (NeMo pieno, per biasing avanzato) | ⚠️ Non ufficiale, consigliato WSL2 | ✅ | ⚠️ | ✅ | Molto alta |
| Canary-Qwen-2.5B | ⚠️ Dipende da NeMo/quantizzazione | ✅ | ❌ Probabilmente troppo lento | ⚠️ Solo con INT8/INT4 | Media |
| Qwen3-ASR | ✅ (Transformers da giu 2026) | ✅ | n/d | ✅ | n/d (troppo recente per dati di velocità solidi) |
| sherpa-onnx (qualunque modello ospitato) | ✅ | ✅ | ✅ Efficiente (ONNX Runtime ottimizzato) | ✅ | Alta |

## 15. Shortlist finale

### 🏆 Migliore qualità assoluta
**Canary-Qwen-2.5B** (o, a pochissima distanza, **Whisper large-v3**). Sui leaderboard di metà 2026 Canary-Qwen è il modello con il WER medio pubblicato più basso (~5,63%) fra i finalisti; ma il margine su Whisper large-v3 è di 1–2 punti percentuali — piccolo rispetto alla variabilità introdotta da accento e rumore reali. Se preferisci l'opzione più "collaudata e generalista" in assoluto, resta Whisper large-v3; se vuoi il numero di WER pubblicato più basso ed è accettabile restare solo-inglese e quantizzare, è Canary-Qwen.

### ⚡ Migliore per 4 GB VRAM
**Parakeet-TDT-0.6B** (v2 se ti serve solo inglese, v3 se un giorno ti servirà anche l'italiano). Con ~1,1–1,4 GB in FP16 è, con largo margine, il modello che lascia più spazio libero sulla tua scheda — spazio che puoi usare per batch/beam più ampi o per tenere altri processi aperti.

### 🚀 Migliore velocità
**Parakeet-TDT-0.6B.** Su ogni fonte consultata (leaderboard, benchmark comunitari, thread di discussione) il vantaggio di velocità di Parakeet su Whisper è consistente e ampio (10–20× a parità di GPU), grazie al decoder TDT che salta i frame silenziosi oltre alla dimensione ridotta. È l'unico asse dove il vantaggio non è ambiguo o contestato in nessuna fonte.

### 🎯 Migliore per terminologia tecnica
**Parakeet/Canary via NeMo con CTC-WS o TurboBias**, se sei disposto a investire nel setup (idealmente via WSL2). È l'unico meccanismo, fra quelli trovati, che fa vero *word boosting* pesato con pronunce alternative multiple — esattamente ciò che serve per "Denavit-Hartenberg", "Chvátal cuts", variabili come q_0/θ_i. Se preferisci restare nel mondo Whisper per semplicità, il tuo prompt attuale — riutilizzato identico su ogni chunk, eventualmente affiancato da una passata di normalizzazione LLM vincolata a un glossario (§16) — resta la seconda scelta più pratica, pur essendo un meccanismo più "morbido" e meno affidabile secondo la letteratura (§8.1).

### ⚖️ Migliore compromesso generale — quello che installerei io su questa macchina
**Whisper large-v3-turbo (o distil-large-v3) via faster-whisper in INT8, come motore primario**, perché: mantiene lo stack che già conosci e il prompt che hai già validato empiricamente, non richiede WSL, entra comodamente nei 4 GB, e — secondo le stime dichiarate in §12 — dovrebbe portare una lezione da 90 minuti da ~4 ore a **~30–45 minuti**, un guadagno enorme per un cambio di configurazione relativamente piccolo. **Parakeet-TDT-0.6B come "seconda opinione" veloce**, da affiancare per le lezioni più dense di gergo tecnico o quando vuoi un riscontro incrociato in pochi minuti — opzionale, da valutare dopo aver misurato tu stesso con il benchmark di §17.

## 16. Pipeline consigliata (incluso il ruolo di un LLM di correzione)

### 16.1 Vale la pena usare un piccolo LLM locale dopo l'ASR per correggere errori come "Q zero" → "q_0"?

La letteratura accademica 2025–2026 dà una risposta sfumata, non un sì o no netto — ed è importante che tu la conosca prima di costruire questo passaggio:

- **Sì, un correttore LLM può ridurre gli errori in modo misurabile.** Un framework a tre stadi con verifica esplicita (2025) riporta riduzioni relative di WER/CER del 9–21% su più benchmark, usando GPT-4o come correttore. ([arXiv 2505.24347](https://arxiv.org/abs/2505.24347))
- **Ma la correzione diretta e "ingenua" (un singolo prompt semplice tipo "correggi questo testo") può introdurre allucinazioni reali** — cioè il correttore può inventare contenuto assente dall'audio originale. Questo è stato confermato empiricamente da uno studio citato nello stesso paper (Min & Wang), ed è esattamente il rischio che tu stesso avevi anticipato nella tua richiesta. ([arXiv 2505.24347, sezione "Hallucination Risks"](https://arxiv.org/pdf/2505.24347))
- **La differenza fra un correttore sicuro e uno rischioso sta nel design del prompt/pipeline, non nella scelta del modello LLM.** I metodi che funzionano meglio in letteratura (framework "verifica multi-stadio", *"Listen Again and Choose the Right Answer"*, ACL 2024) impongono vincoli espliciti: il correttore deve scegliere fra alternative plausibili o verificare esplicitamente ogni modifica, non riscrivere liberamente.

**Traduzione pratica per la tua pipeline:** un LLM di correzione va bene, ma **solo se vincolato rigidamente**: fornito di un glossario esplicito dei termini del corso, istruito a modificare *esclusivamente* la grafia di termini tecnici/simboli riconosciuti nel glossario (o palesemente storpiati foneticamente, es. "chatel cut" → "Chvátal cut", "Jacobian metrics" → "Jacobian matrix", "Denavit Hardenberg" → "Denavit-Hartenberg"), e con l'istruzione esplicita di **non parafrasare, non riassumere, non aggiungere contenuto, non correggere la grammatica del professore**. Un correttore "libero" senza questi vincoli è precisamente lo scenario in cui la letteratura documenta il rischio di allucinazione.

### 16.2 Pipeline concreta raccomandata

```
1. Preprocessing
   ffmpeg → WAV mono, 16 kHz (formato atteso da quasi tutti i modelli)

2. VAD (Silero VAD, CPU, ~2,3 MB)
   → individua le regioni di parlato, scarta i silenzi lunghi

3. Chunking
   → unisci le regioni VAD in segmenti di 20–30s
   → overlap di ~1s fra segmenti consecutivi
   → padding di ~300ms ai bordi

4. ASR primario — Whisper large-v3-turbo (faster-whisper, INT8)
   → stesso initial_prompt riutilizzato IDENTICO su ogni chunk
   → condition_on_previous_text = False (evita propagazione di allucinazioni)

5. [Opzionale, per i passaggi più densi di gergo]
   ASR secondario — Parakeet-TDT-0.6B + lista hotword
   (glossario dei ~50–150 termini/simboli del corso, via CTC-WS/TurboBias)
   → usato come riscontro incrociato sui segmenti dove il testo
     sembra corrotto o poco plausibile semanticamente

6. Fusione dei chunk
   → deduplica il testo sovrapposto ai bordi (overlap 1s del punto 3)
   → filtro ripetizioni n-gram + blacklist frasi boilerplate note

7. Normalizzazione LLM vincolata (locale o via API)
   → prompt con glossario esplicito del corso
   → istruzione: correggi SOLO ortografia di termini tecnici/simboli
     riconosciuti o palesemente storpiati; non riformulare, non
     riassumere, non aggiungere/rimuovere contenuto
   → idealmente passata "diff-based": il modello propone solo le
     correzioni puntuali, non riscrive l'intero testo

8. Output finale
   → transcript pulito (.txt/.srt) → passato a Gemini per
     riassunto/appunti, come da tuo flusso già esistente
```

Questa pipeline è deliberatamente costruita per **non richiedere una scelta univoca fra Whisper e Parakeet** — usa il primo come motore principale (meno attrito, stack già noto) e il secondo come rinforzo mirato solo dove serve, riflettendo la conclusione di questo report: la sostituzione di Whisper con "un modello migliore" non è, secondo l'evidenza raccolta, la risposta più solida quanto una combinazione di runtime più efficiente + biasing terminologico + correzione vincolata.

## 17. Benchmark pratico da eseguire sul tuo PC

Dato che, come dichiarato ripetutamente in questo report, **mancano dati misurati specifici per la tua GPU e per il tuo accento specifico**, questo esperimento è il modo più affidabile per sostituire le stime di §12 con numeri reali. Usa 10–20 minuti di una tua registrazione reale (non audio "pulito" da dataset pubblici — vuoi misurare esattamente le condizioni che ti interessano: il tuo microfono, l'aula, l'accento del professore).

### 17.1 Modelli da includere (3–5 finalisti)

1. **Whisper large-v3 FP16** (situazione attuale — riferimento/baseline, anche solo su un estratto più corto se 90 min è troppo lento)
2. **Whisper large-v3-turbo INT8** (faster-whisper) — il mio candidato principale
3. **Whisper large-v3 INT8** (faster-whisper) — per isolare l'effetto della sola quantizzazione, separato dall'effetto turbo
4. **Parakeet-TDT-0.6B-v2** (via Transformers o NeMo) — per misurare davvero il divario di velocità/qualità sulla tua GPU specifica, dato che qui mancano dati Turing-specifici
5. *(opzionale)* **Canary-Qwen-2.5B INT8** o **Qwen3-ASR-1.7B** — se hai tempo per un quinto candidato

### 17.2 Condizioni da mantenere identiche fra tutti i test

- Stesso file audio, stesso preprocessing (ffmpeg → WAV mono 16kHz)
- Stessa segmentazione (VAD Silero + chunk 20–30s, overlap 1s — vedi §9.2)
- Stessa lista di termini tecnici attesi (il tuo glossario del corso)
- Stesso prompt/hotword-list riutilizzato identico su ogni chunk, dove applicabile

### 17.3 Metriche da registrare

| Metrica | Come misurarla |
|---|---|
| Runtime totale | Wall-clock time dall'avvio alla fine della trascrizione |
| RTF | runtime totale / durata audio |
| Picco VRAM | `nvidia-smi --query-gpu=memory.used --format=csv -l 1` in background durante il test, prendi il massimo |
| Picco RAM | Task Manager (Windows) o `psutil` se scripted |
| WER | Solo se prepari una trascrizione di riferimento (anche parziale, 5 minuti bastano per un confronto indicativo) |
| **Technical Term Accuracy** (metrica che hai proposto tu) | termini tecnici riconosciuti correttamente / termini tecnici pronunciati — vedi ricetta sotto |
| Punteggiatura | Valutazione qualitativa: leggibilità delle frasi, segmentazione sensata |
| Omissioni/allucinazioni | Conta manuale di frasi/parole mancanti o inventate rispetto all'audio |
| Qualità del riassunto a valle | Genera il riassunto con Gemini da ciascun transcript e confronta soggettivamente la fedeltà tecnica |

**Ricetta pratica per la Technical Term Accuracy:** prepara una lista CSV dei termini tecnici effettivamente pronunciati nel segmento scelto (es. "Jacobian", "Denavit-Hartenberg", "q_0", "eigenvalue", "convolution", "PAC learning"...). Per ciascun output, conta quante volte il termine (o una variante ortografica accettabile che tu stesso definisci come "corretta") compare correttamente rispetto al totale delle volte in cui è stato pronunciato. Segnala separatamente i casi di confusione omofonica (es. "q_0" trascritto come "cue zero" o "queue oh") perché sono l'errore più rilevante per il tuo caso d'uso, più del WER generico.

### 17.4 Comandi di riferimento (punto di partenza, da adattare)

```bash
# Whisper large-v3-turbo via faster-whisper, INT8
pip install faster-whisper
python -c "
from faster_whisper import WhisperModel
import time
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='int8')
t0 = time.time()
segments, info = model.transcribe(
    'lezione_estratto.wav',
    initial_prompt='<il tuo prompt attuale>',
    condition_on_previous_text=False,
)
text = ' '.join(s.text for s in segments)
print(f'Tempo: {time.time()-t0:.1f}s')
"

# Parakeet-TDT-0.6B-v2 via Transformers
pip install transformers torch
python -c "
from transformers import pipeline
import time
asr = pipeline('automatic-speech-recognition', model='nvidia/parakeet-tdt-0.6b-v2', device='cuda')
t0 = time.time()
result = asr('lezione_estratto.wav')
print(f'Tempo: {time.time()-t0:.1f}s')
"

# Monitoraggio VRAM in parallelo (altra finestra PowerShell)
nvidia-smi --query-gpu=memory.used --format=csv -l 1
```

Questi comandi sono un punto di partenza minimale, non uno script di benchmarking completo — se vuoi, posso costruirti uno script Python più strutturato (con logging automatico di RTF/VRAM/output per ciascun modello in un unico CSV) come passo successivo.

## 18. Conclusione e raccomandazione finale

Torniamo alla domanda originale: *qual è la migliore alternativa locale a Whisper Large per lezioni universitarie di ingegneria, in inglese con accento italiano, dense di terminologia tecnica, su una Quadro T2000 4 GB, mantenendo una qualità sufficiente da poter alimentare un LLM per appunti?*

**Risposta diretta: non conviene sostituire Whisper con un altro modello singolo. Conviene cambiare runtime/quantizzazione mantenendo la famiglia Whisper come motore primario, e valutare Parakeet-TDT come acceleratore/riscontro incrociato opzionale.** Le ragioni, in sintesi:

1. **Il tuo problema attuale è, per una parte sostanziale, un problema di runtime e hardware, non (solo) di modello.** Whisper large-v3 in FP16 occupa quasi tutta la tua VRAM (~4,5–4,7 GB su 4 GB disponibili) e la tua GPU non ha Tensor Core — due fatti tecnici concreti, non opinioni, che spiegano gran parte del divario che hai osservato tu stesso fra locale e Colab (§11).

2. **L'intervento a più alto rapporto beneficio/sforzo è: Whisper large-v3-turbo (o distil-large-v3) su faster-whisper in INT8.** Stima dichiarata: da ~4 ore a **~30–45 minuti** per una lezione da 90 minuti, mantenendo lo stesso meccanismo di prompt che hai già validato su misura per il tuo dominio, nessun WSL, nessun cambio di stack radicale (§5.2, §12, §15).

3. **Sui leaderboard pubblici, i modelli che battono Whisper (Canary-Qwen-2.5B, Parakeet-TDT, Qwen3-ASR) lo fanno per un margine di 1–2 punti percentuali** — piccolo rispetto a quanto accento e rumore reali possono spostare il WER, e nessuno di questi modelli ha una letteratura di validazione su "lezioni tecniche in inglese con accento italiano" comparabile a quella di Whisper (§6, §7, §13). Non è un motivo per ignorarli, ma è un motivo per non aspettarsi un salto di qualità netto passando da Whisper a uno di questi.

4. **Se la priorità numero uno resta la terminologia tecnica esatta** (simboli, formule, nomi propri con trattini/accenti), l'unico meccanismo trovato che fa vero *word boosting* pesato — non un prompt informale — vive nell'ecosistema NeMo di Parakeet/Canary (CTC-WS, TurboBias, §8). Vale la pena investire il tempo di setup **solo se**, dopo aver testato il tuo prompt Whisper attuale sul benchmark pratico (§17), scopri che continua a sbagliare sistematicamente sugli stessi termini nonostante il prompt — a quel punto Parakeet + hotword mirate è la mossa tecnicamente più giustificata.

5. **La correzione post-ASR con un LLM è utile ma va vincolata rigidamente** (glossario esplicito, divieto di riformulare/riassumere/aggiungere contenuto) — la letteratura 2025 mostra sia guadagni reali sia un rischio concreto di allucinazione con prompt "liberi" (§16.1).

**In una frase:** il modo più affidabile di ottenere "la qualità di Whisper Large ma molto più veloce sul tuo hardware" non è cercare "il modello che batte Whisper", ma **restare nella famiglia Whisper cambiando runtime e dimensione del modello**, riservando Parakeet-TDT (via NeMo con hotword boosting) come strumento mirato per i punti più critici — esattamente la conclusione "combinazione, non sostituzione" verso cui puntava la tua domanda finale.

---

## Appendice — classificazione delle fonti principali per tipo

Come richiesto, distinguo esplicitamente le categorie di fonte usate in questo report:

- **Paper peer-reviewed:** Graham & Roll (2024), *JASA Express Letters* — accenti non nativi su Whisper (§7).
- **Preprint arXiv (non necessariamente peer-reviewed al momento della consultazione):** Qwen3-ASR Technical Report (2601.21337); studio di quantizzazione Whisper (2511.08093); TurboBias (2508.07014); studio L2-ARCTIC su accenti (2503.06924); framework di correzione ASR a tre stadi (2505.24347); studio su Whisper e svedese/italiano proxy (2405.13379); paper su architetture ASR long-form (2309.09950); paper contextual biasing TCPGen (2306.01942).
- **Technical report aziendale / blog ufficiale:** blog Hugging Face sull'Open ASR Leaderboard e le sue modifiche metodologiche 2026; blog NVIDIA/Nemotron Speech; annunci Mistral (Voxtral) e Alibaba (Qwen3-ASR).
- **Model card / documentazione ufficiale:** pagine Hugging Face di Whisper (tutte le varianti), Parakeet (tutte le varianti), Canary-Qwen-2.5B; documentazione NVIDIA NeMo/Riva su word boosting; documentazione k2-fsa/sherpa-onnx.
- **Benchmark indipendente (terze parti, non il produttore del modello):** benchmark comunitario GitHub SYSTRAN/faster-whisper #1030; confronti hardware GTX1650/Quadro T2000 (technical.city, TechPowerUp, Tom's Hardware, WCCFTech); articoli comparativi 2026 (VexaScribe, LoroNote, Northflank, Gladia, SpeechData.ai) — questi ultimi vanno trattati con cautela intermedia: non sono il produttore del modello, ma spesso aggregano numeri di terzi senza rieseguire i test in proprio.
- **Opinione/esperienza di community:** thread Hacker News, GitHub Discussions di openai/whisper, test informale 9to5Mac — sempre segnalati come tali nel testo, mai presentati come dati statisticamente solidi.

Dove non è stato possibile reperire un dato (valore MER italiano puntuale in Graham & Roll, benchmark diretto su Quadro T2000, classifica per-modello sul leaderboard FFASR, quantizzazione controllata di Parakeet), l'ho dichiarato esplicitamente nel testo invece di stimarlo silenziosamente.

