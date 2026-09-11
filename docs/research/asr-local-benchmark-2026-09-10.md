# Log completo dei test ASR locale e Colab

**Data di consolidamento:** 2026-09-10  
**Stato:** valutazione in corso; nessun nuovo motore ASR scelto definitivamente  
**Ambito:** trascrizione di lezioni universitarie tecniche in inglese, con professore italiano e audio registrato in aula

## 1. Scopo del documento

Questo documento conserva i test, i risultati, gli errori di configurazione e le conclusioni provvisorie emerse durante la valutazione di una futura trascrizione locale per Lezionify.

Serve a evitare di:

- ripetere benchmark già eseguiti;
- confrontare motori con parametri non equivalenti;
- reintrodurre configurazioni che hanno prodotto loop e allucinazioni;
- confondere il runtime `faster-whisper` con il modello effettivamente eseguito;
- perdere i dati empirici ottenuti sul campione reale dell'utente.

Le trascrizioni integrali della lezione non sono incluse perché il repository non deve contenere lezioni reali o dati personali. Sono riportati soltanto estratti diagnostici. Audio originale e output grezzi devono essere conservati nell'archivio locale dell'utente, fuori da Git.

## 2. Contesto di prodotto e decisioni precedenti

L'idea iniziale di Lezionify prevede un'app desktop local-first che conserva audio originale, trascrizione grezza e materiale didattico derivato. La trascrizione può essere prodotta automaticamente oppure importata da un file già generato.

La decisione D-0017 del 2026-08-28 ha mantenuto come flusso principale l'ingestione di TXT prodotti a monte, per esempio con Whisper Large-v3 su Google Colab. Le ragioni erano:

- Whisper Large-v3 locale era stato stimato o osservato come troppo lento e rumoroso sul portatile;
- Gemini applicato direttamente all'audio non risultava sufficientemente verbatim;
- Colab permetteva di usare una GPU remota gratuitamente e senza carico termico sul computer personale;
- l'obiettivo principale dell'app restava organizzare, conservare ed elaborare le fonti.

Il report [Alternative ASR locali](./asr-alternatives-2026.md) ha poi approfondito le alternative locali. La sua conclusione era di provare prima un runtime più efficiente e un modello più leggero, mantenendo Colab come fallback e considerando Parakeet come possibile seconda opinione.

I test documentati qui non annullano D-0017. Servono a stabilire se oggi esiste un percorso locale abbastanza rapido e accurato da diventare un'opzione aggiuntiva.

## 3. Hardware target

Macchina personale rilevata:

| Componente | Dato |
|---|---|
| Sistema operativo | Windows 11 |
| CPU | Intel Core i7-9850H |
| RAM | 32 GB |
| GPU | NVIDIA Quadro T2000 mobile |
| VRAM | 4.096 MiB |
| Compute capability | 7.5, Turing |
| Driver rilevato | 595.95 |

Stato software locale al momento dell'ispezione:

- Python 3.10 disponibile;
- PyTorch non installato;
- `openai-whisper` non installato;
- `faster-whisper` non installato.

Il confronto cronometrato descritto più avanti è stato eseguito su Google Colab, non sulla Quadro T2000. I tempi Colab non possono essere trasferiti direttamente al portatile.

## 4. Dato storico precedente ai test controllati

L'utente aveva riferito che una lezione completa trascritta con Whisper Large-v2 su Colab richiedeva circa **15 minuti**. La durata esatta dell'audio, la GPU Colab assegnata e i parametri non sono stati registrati; questo numero va quindi trattato come osservazione storica, non come benchmark controllato.

## 5. Script originali forniti dall'utente

### 5.1 OpenAI Whisper

Configurazione sostanziale:

```python
model = whisper.load_model("large-v3", download_root=MODEL_FOLDER)

result = model.transcribe(
    converted_audio_path,
    language="en",
    temperature=0.6,
    initial_prompt=INITIAL_PROMPT,
)
```

Il prompt utilizzato era:

```text
This is a formal university lecture delivered in English. The professor may have an Italian accent. Please transcribe the speech into clear, academic English. Ensure technical terms, mathematical formulas, and professional vocabulary are spelled correctly. Use proper punctuation and capitalization.
```

Caratteristiche effettive:

- modello: OpenAI Whisper `large-v3`;
- runtime: pacchetto originale `openai-whisper`;
- lingua forzata: inglese;
- temperatura singola: `0.6`;
- `condition_on_previous_text`: valore predefinito del runtime, quindi attivo;
- precisione su GPU: FP16 predefinita, salvo condizioni diverse del runtime.

### 5.2 Faster-Whisper

Configurazione sostanziale:

```python
model = WhisperModel(
    "large-v3-turbo",
    device="cuda",
    compute_type="int8",
    download_root=MODEL_FOLDER,
)

segments, info = model.transcribe(
    converted_audio_path,
    language="en",
    temperature=0.6,
    initial_prompt=INITIAL_PROMPT,
    condition_on_previous_text=False,
)
```

Caratteristiche effettive:

- modello: Whisper `large-v3-turbo`, non Large-v3 completo;
- runtime: `faster-whisper`/CTranslate2;
- precisione: INT8;
- lingua forzata: inglese;
- temperatura singola: `0.6`;
- contesto tra finestre disattivato esplicitamente.

### 5.3 Problemi individuati negli script originali

Il primo confronto non isolava una sola variabile. Cambiavano contemporaneamente:

1. modello: `large-v3` contro `large-v3-turbo`;
2. runtime: OpenAI Whisper contro Faster-Whisper;
3. precisione: FP16 contro INT8;
4. gestione del contesto precedente;
5. comportamento interno del decoding.

Altri problemi di manutenzione rilevati:

- nel ramo eseguito quando manca l'audio, lo script OpenAI scaricava `large-v2`, mentre durante la trascrizione caricava `large-v3`;
- il codice di conversione calcolava `duration_samples = duration_ms * 16` ma passava il risultato a uno slicing di Pydub espresso in millisecondi; nella pratica il taglio superava la durata e non correggeva alcun frame;
- la gestione del download finale nello script originale poteva fare riferimento a `output_path` anche senza un output valido;
- i nomi dei file audio mostrati nei due script erano diversi, ma l'utente aveva chiarito che provenivano da copie di esempio e non rappresentavano il confronto effettivo.

## 6. Primo confronto qualitativo: Large-v3 contro Turbo INT8

Il primo campione riguardava una lezione di robotica su vincoli naturali e artificiali, controllo di interazione e rotazione di una manovella.

Non sono stati registrati durata e tempi. Il confronto era utile solo qualitativamente perché usava le configurazioni non equivalenti descritte sopra.

### 6.1 Risultato generale

Entrambe le trascrizioni seguivano la struttura della spiegazione, ma Turbo introduceva più sostituzioni semanticamente distruttive.

Esempi osservati:

| Concetto plausibile | Large-v3 | Turbo INT8 |
|---|---|---|
| interazione con l'ambiente | `interacting with the environment` | `interacting with the power management` |
| moto permesso lungo una direzione | formulazione vicina al concetto | `motion ... is pretty different` |
| end effector | `end effect` | `magnetic vector` |
| contact forces or torques | parzialmente riconoscibile | `contact force is all towards` |
| crank | talvolta `car`/`cracker` | `crack`/`triangle` |
| rotazione di angolo alpha | formulazione imperfetta ma riconoscibile | `by a level of light` |

Conclusione provvisoria: Turbo era molto più promettente per la velocità, ma sembrava meno affidabile proprio sui termini tecnici e sui passaggi matematici. Tuttavia non era ancora possibile attribuire la differenza al solo modello Turbo, perché il test cambiava troppe condizioni.

## 7. Tentativo di rendere il confronto controllato

Sono stati preparati due nuovi script Colab con:

- stesso file audio;
- stessa conversione WAV mono a 16 kHz;
- stesso prompt;
- lingua inglese;
- precisione FP16 per entrambi;
- `beam_size=5`;
- temperatura inizialmente fissata a `0.0`;
- contesto precedente inizialmente attivato;
- VAD disattivato;
- misurazione separata di caricamento modello e trascrizione.

L'intento era corretto, ma la configurazione introdusse una regressione grave.

## 8. Test fallito: loop di punti e di “Minus 1”

Campione: estratto di una lezione di robotica/visual servoing. Nella successiva ripetizione corretta è stata misurata una durata di 1.023 secondi, pari a **17 minuti e 3 secondi**. L'utente ha specificato che si trattava dello stesso file.

Condizione acustica riportata dall'utente:

- circa **20% più difficile** rispetto alle lezioni abituali;
- voce del professore più lontana del solito;
- non incomprensibile, ma meno pulita.

### 8.1 Fallimento di OpenAI Whisper Large-v3

L'output iniziava in modo plausibile:

```text
Do you try to verify this? No. Please try to do that a bit more. ... So we did all these calculations. And by the end what we get was these other relations.
```

Subito dopo degenerava in migliaia di punti:

```text
. . . . . . . . . . . . . . . . . . . .
```

La maggior parte della lezione veniva quindi persa.

### 8.2 Fallimento di Faster-Whisper Large-v3-Turbo

L'output produceva inizialmente contenuto coerente sull'interaction matrix, poi entrava in un loop estremamente lungo:

```text
Minus 1. Minus 1. Minus 1. Minus 1. Minus 1. ...
```

### 8.3 Causa individuata

Il problema principale non era il file e non dimostrava che i modelli fossero inutilizzabili. Era una regressione introdotta nei nuovi parametri:

- nello script Faster originale `condition_on_previous_text=False` impediva a un segmento corrotto di contaminare tutti i segmenti successivi;
- era stato cambiato a `True` nel tentativo di uniformare i due test;
- la temperatura era stata bloccata a `0.0`, eliminando il fallback progressivo a temperature più alte;
- con audio lontano, silenzi o un segmento ambiguo, il decoder poteva agganciarsi a una sequenza ripetitiva e propagarla;
- VAD disattivato lasciava al modello anche le zone non vocali, ma non è stato dimostrato che fosse la causa primaria.

Nota importante: abilitare indiscriminatamente il VAD non è automaticamente corretto. Su una voce lontana può eliminare anche parlato reale a volume basso. Deve essere confrontato separatamente.

## 9. Configurazione corretta anti-loop

### 9.1 OpenAI Whisper Large-v3

```python
result = model.transcribe(
    wav_path,
    task="transcribe",
    language="en",
    temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
    beam_size=5,
    best_of=5,
    initial_prompt=INITIAL_PROMPT,
    condition_on_previous_text=False,
    carry_initial_prompt=False,
    compression_ratio_threshold=2.4,
    logprob_threshold=-1.0,
    no_speech_threshold=0.6,
    fp16=True,
    verbose=False,
)
```

### 9.2 Faster-Whisper Large-v3-Turbo

```python
segments_generator, info = model.transcribe(
    wav_path,
    task="transcribe",
    language="en",
    temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
    beam_size=5,
    best_of=5,
    initial_prompt=INITIAL_PROMPT,
    condition_on_previous_text=False,
    compression_ratio_threshold=2.4,
    log_prob_threshold=-1.0,
    no_speech_threshold=0.6,
    vad_filter=False,
    word_timestamps=False,
)
```

Motivazione dei parametri principali:

- `condition_on_previous_text=False`: limita la propagazione degli errori tra finestre;
- temperature multiple: permettono fallback quando il decoding a temperatura zero è degenerato;
- `compression_ratio_threshold`: intercetta output anormalmente ripetitivi;
- `logprob_threshold` e `no_speech_threshold`: aiutano a trattare segmenti incerti e non vocali;
- `vad_filter=False`: mantenuto per questo test perché la voce era lontana; il VAD resta una variabile da provare separatamente.

## 10. Test controllato riuscito sullo stesso file

### 10.1 Condizioni

| Proprietà | Valore |
|---|---|
| Audio | stesso file per entrambi i modelli |
| Durata | 1.023,00 s = 17:03 |
| Contenuto | visual servoing, interaction matrix, image Jacobian, frame camera/oggetto, trasformazione prospettica, derivate parziali |
| Difficoltà acustica | stimata dall'utente circa 20% peggiore del solito |
| Lingua | inglese con accento italiano |
| Ambiente di esecuzione | Google Colab |
| Precisione | FP16 per entrambi |
| VAD | disattivato |
| Contesto precedente | disattivato |

### 10.2 Risultati numerici

| Metrica | OpenAI Whisper Large-v3 | Faster-Whisper Large-v3-Turbo FP16 |
|---|---:|---:|
| Durata audio | 1.023,00 s | 1.023,00 s |
| Caricamento modello | 34,85 s | 7,07 s |
| Trascrizione | 158,45 s | 23,33 s |
| RTF | 0,155 | 0,023 |
| Velocità rispetto all'audio | 6,46x | 43,85x |
| Caratteri trascritti | 9.543 | 9.561 |
| Segmenti prodotti | non registrato | 118 |
| Nome output | `test_whisper_lezioni (3)_OPENAI_LARGE_V3.txt` | `test_whisper_lezioni (4)_FASTER_LARGE_V3_TURBO_FP16.txt` |

Rapporti calcolati:

- Turbo ha trascritto **6,79 volte più velocemente** di Large-v3;
- Turbo ha caricato il modello **4,93 volte più velocemente**;
- caricamento + trascrizione: 193,30 s contro 30,40 s, quindi Turbo è stato **6,36 volte più rapido**;
- la lunghezza testuale differiva di soli 18 caratteri, circa **0,19%** rispetto all'output Large.

La quasi identica lunghezza non misura la correttezza, ma esclude una grande omissione strutturale nel test riuscito.

### 10.3 Proiezione teorica su lezioni più lunghe

Proiezione basata esclusivamente sugli RTF misurati, senza includere download, installazione, conversione, caricamento o variazioni della GPU Colab:

| Durata lezione | Large-v3 | Turbo FP16 |
|---|---:|---:|
| 60 min | circa 9,30 min | circa 1,38 min |
| 90 min | circa 13,95 min | circa 2,07 min |
| 120 min | circa 18,60 min | circa 2,76 min |

Queste non sono previsioni valide per la Quadro T2000 locale.

## 11. Confronto qualitativo del test riuscito

### 11.1 Cosa ha preservato Turbo

Turbo ha conservato quasi tutta la struttura concettuale della spiegazione:

- relazione tra feature vector e velocità di camera/oggetto;
- interaction matrix e matrice Gamma;
- origine del camera frame e dell'object frame;
- caso di oggetto fermo;
- feature vector di un punto con dimensione 2;
- interaction matrix di dimensione 2x6;
- trasformazione prospettica e coordinate normalizzate;
- derivazione tramite chain rule;
- Jacobiano 2x3 intermedio;
- derivate rispetto a `Xc`, `Yc`, `Zc`.

Non sono emerse grandi sezioni mancanti rispetto a Large-v3.

### 11.2 Errori rilevanti di Turbo

| Large-v3 o concetto plausibile | Turbo | Gravità |
|---|---|---|
| `relation between s dot...` | `variation between s dot...` | moderata |
| riferimento all'image Jacobian | termine omesso o ridotto a `the image` | alta |
| `camera frame` | `canon` | alta nel contesto tecnico |
| `six eigenvalues equal to minus one` | `six again values...` | alta |
| spiegazione dell'invertibilità | frase quasi incomprensibile con `practical`, `equal to three now` | molto alta |
| `rotation matrix` | `visualization matrix` | alta |
| `chain rule` | `channel` | alta |
| `Jacobian` | `jacobium` | moderata/alta |
| `capital Y` | `capital one` | alta nelle formule |
| invito a verificare un esercizio | inserimento di `It's an insect` | allucinazione evidente |

### 11.3 Errori presenti anche in Large-v3

Large-v3 era chiaramente migliore, ma non costituiva una trascrizione perfetta:

- `image zircobian` al posto di `image Jacobian`;
- `endless matrix`, probabilmente al posto di `L_s matrix`;
- frase logicamente invertita sull'invertibilità: `if a matrix is invertible, there exists at least one eigenvalue equal to zero`, probabilmente priva del `not`;
- `laser` in un passaggio in cui il contesto indicava il base frame;
- confusione tra simboli e lettere come `P`, `B`, `Rc`, `Oc`;
- `elevation` usato al posto di `relation` o `equation`;
- indici, apici e formule orali non sempre ricostruiti correttamente.

### 11.4 Conclusione qualitativa

- Large-v3 è risultato più accurato nei termini tecnici e nei passaggi logici.
- Turbo ha mantenuto quasi tutta la copertura della lezione ed è risultato enormemente più rapido.
- Il vantaggio di Large-v3 non è tanto nella quantità di testo, quanto nella minore frequenza di sostituzioni semanticamente distruttive.
- Nessuno dei due può ricostruire con affidabilità assoluta formule o simboli visibili soltanto nelle slide. L'ASR riceve l'audio, non la lavagna o le slide.

## 12. Decisione operativa provvisoria dopo i test

Per il flusso Colab già funzionante:

- mantenere **Whisper Large-v3** come scelta di qualità, perché circa 14–19 minuti stimati per lezioni da 90–120 minuti sono già compatibili con un'elaborazione non presidiata;
- usare Turbo quando il tempo è prioritario o come bozza, sapendo che richiede più controllo dei termini tecnici.

Per una futura trascrizione locale in Lezionify:

- `large-v3-turbo` ha superato il test minimo di copertura e velocità;
- non è ancora dimostrato che sulla Quadro T2000 sia abbastanza rapido e accurato da diventare il motore definitivo;
- una pipeline ibrida resta promettente: trascrizione completa rapida, rilevamento segmenti sospetti e seconda passata più accurata soltanto dove necessario;
- audio originale e trascrizione grezza devono sempre essere preservati.

Non è stata ancora presa la decisione di sostituire il flusso TXT/Colab definito da D-0017.

## 13. Alternative individuate dopo il confronto

### 13.1 Parakeet TDT 0.6B v2 INT8

È il prossimo candidato principale perché:

- è specializzato in inglese;
- ha 600 milioni di parametri;
- la conversione sherpa-onnx INT8 occupa circa 630 MB;
- esiste un eseguibile Windows;
- include punteggiatura, maiuscole e timestamp;
- sullo stesso Open ASR Leaderboard pubblicato nelle model card riportava WER medio 6,05 e AMI 11,16, contro 7,83 e 16,13 di Whisper Turbo.

Il vantaggio riportato equivale a circa il 23% di WER relativo in meno sul complesso e circa il 31% in meno su AMI. Non è una garanzia sul campione reale, soprattutto con accento italiano e terminologia matematica.

Fonti:

- <https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2>
- <https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-transducer/nemo-transducer-models.html>
- <https://huggingface.co/openai/whisper-large-v3-turbo>

### 13.2 Qwen3-ASR 0.6B

Secondo candidato perché:

- supporta prompt contestuale/hotword esplicite;
- supporta inglese, italiano e altre lingue;
- gestisce audio long-form;
- la model card riporta WER medio 6,31 e AMI 10,57;
- il prompt terminologico potrebbe aiutare su `image Jacobian`, `eigenvalues`, `interaction matrix`, nomi dei frame e simboli pronunciati.

Limiti per il portatile:

- checkpoint ufficiale di circa 1,88 GB di soli pesi;
- memoria operativa superiore alla dimensione del file;
- runtime Transformers meno leggero di sherpa-onnx;
- 4 GB di VRAM sono al limite e la Quadro T2000 non è ideale per il formato BF16 del checkpoint;
- versioni quantizzate/native Windows sono più recenti e meno collaudate.

Fonte: <https://huggingface.co/Qwen/Qwen3-ASR-0.6B-hf>

### 13.3 Whisper Large-v3 INT8 con Faster-Whisper

Opzione conservativa:

- stesso modello qualitativamente migliore nel test Colab;
- quantizzazione INT8 per provare a farlo entrare nei 4 GB;
- prevedibilmente molto più lento di Turbo sul portatile;
- utile come motore di seconda passata o modalità “massima qualità”.

La compatibilità e il tempo reale sulla T2000 non sono ancora stati misurati.

### 13.4 Distil-Whisper Large-v3.5

La model card lo indica circa 1,5 volte più rapido di Turbo, ma nel proprio benchmark long-form riporta WER 11,39 contro 10,25 di Turbo. Non è quindi il candidato principale quando l'obiettivo è migliorare la qualità di lezioni lunghe.

Fonte: <https://huggingface.co/distil-whisper/distil-large-v3.5>

### 13.5 Modelli attualmente esclusi

- Canary-Qwen 2.5B e Qwen3-ASR 1.7B: potenzialmente più accurati, ma poco realistici su 4 GB di VRAM;
- Canary 1B tramite stack NeMo/Riva: memoria e complessità superiori al vantaggio atteso;
- modelli piccoli generalisti come Whisper Medium/Small, Moonshine o SenseVoice: non esiste al momento evidenza sufficiente che migliorino Turbo sul caso specifico;
- Nemotron streaming: interessante per dettatura in tempo reale, non prioritario per trascrizione batch di lezioni registrate;
- servizi cloud più accurati, come GPT-4o Transcribe: non sono trascrizione locale, introducono invio dell'audio e costo, quindi appartengono a un confronto separato.

## 14. Protocollo obbligatorio per i prossimi test

### 14.1 Campione

Riutilizzare il medesimo file da 1.023 secondi. È un buon campione perché:

- contiene inglese tecnico reale;
- ha un accento italiano;
- è leggermente più difficile delle registrazioni abituali;
- contiene termini, formule orali e simboli che discriminano bene la qualità.

Non cambiare file durante il confronto. Conservare hash SHA-256, durata e formato del campione quando sarà disponibile localmente.

### 14.2 Preprocessing comune

- WAV PCM mono;
- 16 kHz;
- stesso volume, senza normalizzazione diversa tra modelli;
- stessi confini dei chunk quando tecnicamente possibile;
- nessuna rimozione manuale di parti difficili;
- eventuale VAD confrontato in una prova A/B dedicata.

### 14.3 Informazioni da registrare per ogni esecuzione

- nome esatto e revisione del modello;
- runtime e versione;
- precisione (`fp16`, `int8`, `int8_float16`, ecc.);
- sistema operativo, CPU, GPU, VRAM e driver;
- parametri completi di decoding;
- durata audio;
- tempo installazione/download, se rilevante;
- tempo caricamento modello;
- tempo preprocessing;
- tempo trascrizione;
- RTF e velocità rispetto al tempo reale;
- picco RAM e VRAM;
- numero di segmenti;
- caratteri e parole prodotte;
- errori, warning, loop o fallback;
- output grezzo non corretto.

### 14.4 Valutazione della qualità

Non usare la concordanza tra due modelli come verità. Due modelli possono concordare sullo stesso errore.

Preparare una ground truth manuale di almeno 3–5 minuti, scelta nelle parti più difficili, e calcolare:

1. WER generale;
2. accuratezza separata dei termini tecnici;
3. omissioni complete di frasi;
4. parole o frasi inventate;
5. errori su negazioni e passaggi logici;
6. errori su lettere, indici, numeri e formule;
7. ripetizioni anomale;
8. qualità della dispensa Gemini generata a valle da ciascun transcript.

Per la terminologia tecnica predisporre un glossario del campione, per esempio:

```text
visual servoing
interaction matrix
image Jacobian
Gamma matrix
eigenvalue
invertible matrix
camera frame
object frame
base frame
perspective transformation
normalized coordinates
chain rule
partial derivative
R_C, O_C, X_C, Y_C, Z_C
```

Le varianti ortografiche accettabili devono essere stabilite prima di guardare l'output, per non favorire un modello a posteriori.

## 15. Ordine dei prossimi benchmark

1. **Parakeet TDT 0.6B v2 INT8**, preferibilmente con sherpa-onnx su Windows.
2. **Qwen3-ASR 0.6B senza prompt**, per confronto di base.
3. **Qwen3-ASR 0.6B con glossario tecnico**, per misurare il valore del contextual biasing.
4. **Whisper Large-v3 INT8 con Faster-Whisper sul portatile**, per misurare qualità e tempo del fallback locale.
5. **Turbo locale INT8**, con la configurazione anti-loop validata, per stabilire il vero tempo sulla T2000.
6. Prova A/B del VAD solo dopo aver conservato una baseline senza VAD.

## 16. Regole da non dimenticare

1. `faster-whisper` è un runtime; `large-v3-turbo` è il modello.
2. Non attribuire alla quantizzazione una differenza ottenuta cambiando anche modello e runtime.
3. Per audio lunghi, mantenere `condition_on_previous_text=False` finché non esiste una prova controllata che dimostri il contrario.
4. Non bloccare il decoding a temperatura zero senza fallback e protezioni anti-ripetizione.
5. Il VAD non è sempre vantaggioso con voci lontane; provarlo, non presumerlo.
6. Confrontare sempre lo stesso file e lo stesso preprocessing.
7. La lunghezza simile delle trascrizioni misura la copertura approssimativa, non la correttezza.
8. Gli errori sui termini tecnici, sulle negazioni e sui simboli hanno un peso maggiore del WER generico per Lezionify.
9. Conservare audio originale e output ASR grezzo; ogni correzione successiva deve essere una derivazione separata.
10. Non permettere a un LLM di “correggere” liberamente la trascrizione: deve proporre correzioni puntuali, vincolate dall'audio e dal glossario, senza aggiungere spiegazioni non pronunciate.

## 17. Stato finale al 2026-09-10

Evidenze stabilite:

- il primo confronto mostrava una perdita qualitativa di Turbo, ma non era metodologicamente pulito;
- la configurazione errata con contesto attivo e temperatura zero può distruggere entrambi gli output;
- la configurazione anti-loop ha eliminato il problema sul medesimo campione;
- su Colab, Turbo FP16 è stato circa 6,8 volte più rapido in trascrizione;
- Large-v3 ha prodotto la trascrizione tecnicamente migliore;
- Turbo ha mantenuto quasi tutta la copertura, ma con più sostituzioni semanticamente pericolose;
- Parakeet v2 INT8 e Qwen3-ASR 0.6B sono candidati reali, non ancora testati sul campione;
- nessun risultato locale cronometrato è ancora disponibile sulla Quadro T2000;
- D-0017 e il flusso Colab/TXT restano validi fino a un benchmark locale conclusivo.

La domanda ancora aperta non è soltanto “quale modello ha il WER minore?”, ma:

> Quale combinazione di modello, runtime, precisione, segmentazione e glossario produce sul portatile una trascrizione abbastanza fedele dei termini tecnici, in un tempo e con rumore/temperatura accettabili, senza perdere la possibilità di usare Colab come fallback di qualità?

## 18. Notebook comparativo predisposto, non ancora eseguito

È stato aggiunto `tools/colab_benchmark_parakeet_qwen.py` per eseguire sullo stesso audio tre prove sequenziali:

1. NVIDIA Parakeet TDT 0.6B v2, conversione sherpa-onnx INT8 su CPU;
2. Qwen3-ASR 0.6B FP16 su GPU;
3. Qwen3-ASR 1.7B FP16 su GPU.

Il protocollo incorporato nello script usa un unico WAV PCM mono 16 kHz e un unico insieme di segmenti contigui da circa 60 secondi, con confine cercato entro 5 secondi nel punto di energia minima. Non usa VAD, non crea sovrapposizioni o buchi e scarica ogni modello Qwen prima di caricare il successivo. Il batch Qwen è limitato a uno per ridurre il rischio di OOM e di interferenze tra audio di lunghezza diversa.

Per la prima esecuzione `QWEN_CONTEXT` resta vuoto: è quindi un confronto delle capacità base. L'eventuale prova con glossario deve essere un'esecuzione separata e chiaramente marcata come assistita.

Lo ZIP finale contiene le tre trascrizioni grezze, i metadati per modello, gli hash dell'audio originale e del WAV comune, il manifest dei segmenti e un CSV con download, caricamento, trascrizione, RTF, velocità, caratteri e parole. La presenza dello script non costituisce ancora un risultato sperimentale: tempi e qualità andranno aggiunti a questo registro solo dopo l'esecuzione sul file da 1.023 secondi.

## 19. Risultati Parakeet e Qwen3-ASR sul campione comune

Il benchmark è stato eseguito il 10 settembre 2026 sullo stesso file da 1.022,9955 secondi già usato per Large-v3 e Turbo. Hash SHA-256 originale: `4281b5cc9426405babeb62fedd2af8ad391027a11f10a9c3c146c32b8c98edfc`. Ambiente: Colab Linux, Tesla T4 da 15.637.086.208 byte, PyTorch 2.11.0+cu128. Il WAV comune è mono PCM 16 kHz; 18 segmenti contigui, nessun VAD e nessuna sovrapposizione. `QWEN_CONTEXT` era vuoto e la lingua era forzata a English.

| Modello | Runtime/precisione | Trascrizione | RTF | Velocità | Caratteri | Parole | Memoria rilevata |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Whisper Large-v3 | OpenAI Whisper, FP16 GPU | 158,45 s | 0,155 | 6,46x | 9.543 | n.d. | n.d. |
| Whisper Large-v3-Turbo | faster-whisper, FP16 GPU | 23,33 s | 0,023 | 43,85x | 9.561 | n.d. | n.d. |
| Parakeet TDT 0.6B v2 | sherpa-onnx, INT8 CPU, 2 thread | 256,80 s | 0,251 | 3,98x | 9.793 | 1.874 | RSS finale processo 2,45 GB |
| Qwen3-ASR 0.6B | Transformers, FP16 GPU, batch 1 | 125,32 s | 0,123 | 8,16x | 9.770 | 1.876 | picco GPU 2,09 GB |
| Qwen3-ASR 1.7B | Transformers, FP16 GPU, batch 1 | 121,43 s | 0,119 | 8,42x | 9.801 | 1.853 | picco GPU 4,61 GB |

Rispetto ai 158,45 secondi di Large-v3, Parakeet è stato il 62,1% più lento; Qwen 0.6B il 20,9% più rapido e Qwen 1.7B il 23,4% più rapido. In termini assoluti Qwen ha risparmiato soltanto 33–37 secondi. Turbo resta circa 5,2–5,4 volte più rapido dei due Qwen e 11 volte più rapido di Parakeet.

Il confronto di qualità è qualitativo, non un WER: non è ancora disponibile una ground truth manuale. Large-v3 resta chiaramente il testo più coerente sui passaggi tecnici. Esempi rilevanti:

- Large-v3 conserva `relation between s dot and the absolute velocity`; Parakeet sostituisce con `rotation between x dotted`, Qwen 0.6B perde la variabile e Qwen 1.7B usa `x dot`;
- Large-v3 riconosce almeno approssimativamente `image Jacobian`; Parakeet produce `image of Kobia/Kobiel`, Qwen 0.6B `image of the object` e Qwen 1.7B `initial copy`;
- Large-v3 e Parakeet conservano `six eigenvalues equal to minus one`; entrambi i Qwen distruggono questo passaggio con frasi su `radius`, `value`, `resistance` e numeri non pronunciati;
- Parakeet e Qwen 1.7B riconoscono correttamente `skew-symmetric matrix`, dove Large-v3 aveva scritto `two symmetric matrix`: i candidati alternativi possono quindi vincere su singole parole;
- Qwen 1.7B conserva meglio di Qwen 0.6B diverse parti della derivazione: dimensioni 2x3, coordinate `x_C, y_C, z_C`, focal length e rapporto `x_C/z_C`; Qwen 0.6B arriva invece a `Jacobian is equal to three times`;
- Parakeet conserva molti simboli e termini, ma introduce sostituzioni pericolose come `not counting exactly` al posto di `accounting exactly`, oltre a numerose parole senza senso nell'apertura;
- nessuno dei tre nuovi output presenta i loop catastrofici di punti o `Minus 1` osservati con la vecchia configurazione;
- le tre nuove trascrizioni hanno tutte 18 paragrafi, uno per segmento. L'ultimo segmento dura solo 1,6955 secondi: le brevi code finali non devono essere considerate evidenza autonoma di allucinazione senza riascolto.

Giudizio provvisorio per questo campione:

1. Whisper Large-v3: migliore qualità complessiva e migliore conservazione della logica tecnica;
2. Qwen3-ASR 1.7B e Parakeet v2: seconda fascia, con Qwen più leggibile e Parakeet talvolta più fedele ai termini tecnici; nessuno dimostra un vantaggio netto senza ground truth;
3. Qwen3-ASR 0.6B: veloce e compatto, ma troppo distruttivo in diversi passaggi matematici;
4. Turbo: resta il riferimento di velocità, ma non di qualità tecnica.

La Quadro T2000 da 4 GB non può ospitare direttamente il picco FP16 misurato di Qwen 1.7B (4,61 GB); Qwen 0.6B (2,09 GB) è invece compatibile in linea di principio. Parakeet INT8 è tecnicamente eseguibile su CPU e RAM locali, ma in questa configurazione non offre né il miglior tempo né un vantaggio qualitativo dimostrato. Per Colab, il risparmio di meno di 40 secondi dei Qwen non giustifica la perdita rispetto a Large-v3. Prima di una decisione definitiva resta necessario trascrivere manualmente 3–5 minuti difficili e calcolare WER ed errori sui termini tecnici.
