# Vocabolario offline

Aggiornato il 15 ottobre 2026: campo unico per parole e frasi.
[Scelte, implementazione e verifiche](priorita-1-5-2026-10-15.md).

## Uso quotidiano

Ctrl+T (Cmd+T su macOS) apre il vocabolario, anche in Focus. Ogni apertura
parte **IT → EN**; la direzione non viene ricordata dopo la chiusura.

- Una parola singola viene cercata nei dizionari locali dopo una breve pausa.
  Il riconoscimento automatico sceglie la lingua quando trova una voce in uno
  solo dei dizionari. Ambiguità e parole assenti mantengono la direzione corrente.
- Un testo con spazi interni viene tradotto con Mozilla/Bergamot dopo 500 ms
  senza digitare. Gli spazi iniziali/finali non fanno scattare la modalità frasi.
  Si possono inserire fino a 2000 caratteri, continuando a scrivere durante
  l'elaborazione. Viene mostrata soltanto la risposta del testo corrente.
- Il pulsante inverte la direzione e rispetta la scelta manuale per il resto
  dell'apertura. Per le parole, **Riconosci automaticamente** riattiva il lookup
  nei due dizionari. Le frasi conservano la propria direzione manuale.
- Le traduzioni sono serializzate perché il motore locale accetta un lavoro
  alla volta. Durante una traduzione lunga, la nuova bozza attende; quelle
  intermedie superate vengono scartate. Il limite del worker è di 45 secondi.

Esc, Ctrl+T, la croce o un clic esterno chiudono il vocabolario. Esc non
chiude la lezione né avvia l'uscita dal Focus. Le ricerche non vengono salvate
in una cronologia. Nessun fallback online o chiamata Gemini.

## Modelli e Impostazioni

Apri **Impostazioni → Traduttore offline** per scaricare esplicitamente i due
modelli (circa 53 MB, 74 MB su disco) o verificarli/ripararli. Il download
contiene solo i modelli. Se mancano, il vocabolario offre un collegamento alla
sezione corretta, senza avviare download da solo. La bozza resta disponibile
quando torni dalle Impostazioni e lo stato dei modelli viene ricontrollato.

Formule delimitate in LaTeX, codice tra backtick e URL restano invariati;
il testo attorno viene tradotto sul PC. La qualità dei termini tecnici non è
sempre affidabile: è una traduzione, non una revisione o una spiegazione.

## Dizionari, dati e licenze

La voce mostra traduzioni, categoria grammaticale, pronuncia scritta e definizioni
quando presenti nella fonte. Le definizioni restano nella lingua originale:
quelle del dizionario inglese sono generalmente in inglese.
Le forme inglesi comuni sono ricondotte a un lemma verificato nel dizionario:
per esempio Searching → search → cercare. Una voce esatta ha sempre precedenza;
il riconoscimento delle flessioni non è universale.

Dal 15 ottobre anche forme italiane comuni di presente/imperativo possono
rimandare al lemma, per esempio «trascrivi → trascrivere → transcribe».
Si accetta un solo lemma verbale presente: più candidati restano senza
riconoscimento, le voci esatte prevalgono e il dizionario non interpreta frasi libere: queste passano al motore locale.
Il supporto non è un coniugatore universale e non risolve ogni forma irregolare.
La modalità automatica IT/EN beneficia dello stesso lookup di quella manuale.

Il caso segnalato aveva anche una lacuna nei dati: «trascrivere» era assente,
mentre EN→IT conteneva «transcribe → trascrivere». Il dataset IT→EN ora include
quella sola voce inversa revisionata (29.661 voci), con provenienza nel JSON e
nel NOTICE. Il generatore la riproduce senza invertire indiscriminatamente i
dizionari. Tutte le 29.660 voci precedenti sono conservate; licenza invariata.

Le locuzioni rimangono disponibili nei dati del dizionario. Nel campo unico,
ogni testo con spazi interni segue invece la traduzione delle frasi con Bergamot.

I dati sono inclusi nell’installer: 53.255 voci EN → IT e 29.661 IT → EN,
edizione FreeDict/WikDict 2025.11.23. La conversione omette tre voci inglesi
senza traduzioni. Ogni dizionario viene indicizzato in memoria al primo utilizzo;
la prima ricerca può richiedere un breve caricamento. Non servono internet,
chiavi API o Gemini. Le ricerche non vengono salvate nei log o nel profilo.

Dati di Karl Bartel e dei contributori Wiktionary tramite DBnary,
adattati sotto CC BY-SA 3.0. Fonti, attribuzione, licenza e hash dei sorgenti
sono in `public/dictionaries/`; il generatore è `tools/build_dictionary.py`.


## Regressioni

`tests/unit/dictionary.test.ts` consulta anche i dizionari reali senza rete.
`tests/integration/dictionaryScenarios.browser.tsx` verifica campo unico,
parole/frasi, inversione, reset IT → EN, risposte obsolete, serializzazione,
errori e retry, tastiera e Focus. `toolSettingsScenarios.browser.tsx` verifica
modelli assenti, download esplicito e ritorno alla bozza dopo configurazione.
I precedenti conteggi e collaudi sono conservati nelle decisioni storiche.
