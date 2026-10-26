# Pool Gemini e revisione delle dispense — 26 ottobre 2026

La generazione dell'archivio può ora raggiungere tutte le chiavi configurate
senza interrompersi per il precedente limite complessivo di dieci minuti o sei
invii. La revisione locale richiesta dall'utente ha inoltre corretto due
dispense personali, confrontando trascrizione, italiano e inglese.

## Diagnosi e comportamento

Il test riproducibile in `geminiPhaseB.test.ts` simulava timeout sulle prime
dodici chiavi e successo sulla tredicesima: prima della modifica terminava
dopo quattro invii per la deadline complessiva. Copre ora sezioni, traduzione
e ASR, anche oltre 36/60 minuti virtuali, senza invii reali.

Per overview, sezioni, traduzione, study set, ASR e logistica del corso,
`GeminiRequestManager` usa un pool finito: chiavi distinte × modelli distinti ×
tentativi per coppia, con minimo pari al budget configurato. Ogni coppia ha
ancora al massimo tre tentativi; gli errori di autenticazione e quota
giornaliera escludono prima le alternative non utilizzabili. Restano
concorrenza uno, RPM, cooldown, fallback precoce dopo due 503 e stop esplicito.
Le chiavi dello stesso progetto non forniscono quote indipendenti.

Non c'è una deadline complessiva implicita per queste richieste. Restano i
timeout dei tentativi: 180 secondi per testo, 300 per audio. Un tentativo
bloccato viene interrotto e il gestore può continuare con le altre chiavi.
Una `timeoutMs` esplicita viene rispettata. Q&A, verifiche chiavi, operazioni
file e recupero interattivo conservano i budget precedenti. I vecchi runner
privati di recupero contenevano limiti propri e non vengono usati come runtime
del prodotto.

## Revisione privata

Le dispense e la trascrizione restano fuori da Git, in archivio e nella copia
ignorata `local-artifacts/rl-audit-20261026/`. Il confronto rileva principalmente
errori della derivazione italiana, ripresi dalla traduzione, con una precedente
correzione terminologica già presente nell'inglese. Non attribuiamo la causa
al solo canale ChatGPT/API: il canale non garantisce fedeltà né correttezza.

Interventi applicati a entrambe le lingue:

- ordine del rapporto d'importanza per la predizione del valore di stato e
  controllo del peso zero prima della divisione; distinzione da action values;
- precisazioni su exploring starts, esplorazione persistente, ordinary/weighted
  importance sampling, terminali, bootstrap e condizioni di convergenza;
- notazione TD(lambda), GPI, distinzione fra efficienza campionaria e regret;
- correzione delle affermazioni eccessive su superiorità universale di TD,
  origine di TD e TD-Gammon, e del significato del modello dopaminergico;
- reinserimento dell'esempio con ricompensa negativa, letture consigliate,
  peso iniziale e politiche ottimali non uniche nel random walk;
- separazione dei due esempi del tragitto, mantenendo i numeri recuperabili;
- titoli Markdown al posto di HTML e testo non riconosciuto come titolo;
- precisazioni sulla probabilità di traiettorie con ricompense e sulle
  indicazioni d'esame, senza trasformarle in domande certe.

Le integrazioni tecniche sono editoriali, dichiarate come tali. Il riferimento
tecnico è [Sutton e Barto, capitoli 5–7, bozza della seconda edizione](https://web.stanford.edu/class/psych209/Readings/SuttonBartoIPRLBook2ndEd.pdf)
e la [trattazione Stanford di TD(lambda)](https://web.stanford.edu/group/pdplab/pdphandbook/handbookch10.html).
Le slide non sono disponibili: lo pseudocodice ricostruito non viene certificato
come copia della variante richiesta dal docente. Nessun riascolto integrale
dell'audio e nessuna certificazione della trascrizione Whisper.

## Verifiche

Le versioni precedenti sono conservate; il trasferimento con app chiusa
verifica assenza di modifiche concorrenti e hash delle due copie salvate.
Audio originale, trascrizione e `library.json` restano identici.

Nel renderer reale di produzione, profilo isolato e rete esterna bloccata:
39 titoli per lingua, 222 elementi KaTeX senza errori e cinque diagrammi per
lingua senza errori. Ispezionate le catture di pseudocodice e formule TD.
Le schermate precedenti confermano i titoli HTML visibili letteralmente in IT.
È una verifica del contenuto nel renderer, non un nuovo collaudo di tutte le
impaginazioni PDF o del lettore Focus.

Le 116 regressioni pertinenti sono passate con un worker. Un primo avvio
sandbox era bloccato da EPERM sulla cache Vitest; una ripetizione parallela ha
superato il limite temporale di un test sotto carico. Nessuna chiamata AI reale,
nuova dipendenza o modifica dei prompt.

Suite unitaria completa: **743 test in 56 file superati**, inclusi i quattro
nuovi casi di regressione. Superati typecheck main/renderer e lint dei file
modificati. La scansione Vitest senza directory esplicita è stata interrotta
perché bloccata sugli artefatti locali; la suite effettiva è stata eseguita con
`node node_modules/vitest/vitest.mjs run tests/unit --maxWorkers=1`.

## Installer e pubblicazione

Setup Windows rigenerato da questa build con pubblicazione binaria disabilitata:

- `dist/Lezionify-Setup-0.1.0.exe`: 294.217.156 byte;
- SHA256: `a4bc35e7a2122e6ffa375bfa216adff281e6e748e2ee8d0ac89a6e7123fd689e`;
- ASAR: `3f9cd8c4f4cbda800e68cb1dc208bd2c31f339af752d01217e13899a0d6705ad`.

Verificati 372 file build nel pacchetto, manifesto SHA512, blockmap e i tre
backup precedenti. Il payload NSIS contiene gli otto componenti critici
identici al runtime controllato; nessun dato privato incluso. Il nuovo
eseguibile supera il controllo RAG isolato con modello pubblico già locale,
inferenza senza rete, cache fredda/calda, recupero vettori, ripristino,
migrazione e worker PDF. Non viene dichiarata una nuova valutazione della
qualità delle risposte AI.

Installer precedente in
`local-artifacts/installer-backups/20261026-rl-pool-audit/`.
La versione installata richiede l'esecuzione del nuovo setup con Lezionify
chiuso; nessuna installazione o release binaria effettuata dall'agente.
La regola AGENTS autorizza commit e push di tutte le modifiche pubblicabili,
comprese le decisioni locali precedenti D-0415–D-0422. Dispense, transcript,
audio, screenshot e installer rimangono esclusi da Git.
