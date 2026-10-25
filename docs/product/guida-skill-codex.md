# Guida alle skill Codex per Lezionify

Guida pratica in italiano, aggiornata il 21 ottobre 2026.

Questa guida spiega quando usare le otto skill installate dalla raccolta di
Matt Pocock, come richiamarle e quali risultati aspettarsi. Gli esempi sono
richieste da copiare in chat: leggerli non avvia le attività descritte.

Successivamente è stata aggiunta **`grilling`** (D-0322), dalla stessa revisione,
per l'intervista sulle priorità 1–5. Le otto schede sotto descrivono la selezione
iniziale; per la nona skill vedi [Intervista con grilling](#intervista-con-grilling).

## Indice

- [Scelta rapida](#scelta-rapida)
- [Come richiamarle](#come-richiamarle)
- [Regole per Lezionify](#regole-per-lezionify)
- [Diagnosi dei bug](#1-diagnosing-bugs--capire-e-correggere-un-problema)
- [Sviluppo guidato dai test](#2-tdd--implementare-un-comportamento-a-piccoli-passi)
- [Progettazione del codice](#3-codebase-design--progettare-interfacce-semplici)
- [Revisione delle modifiche](#4-code-review--controllare-regole-e-requisiti)
- [Prototipi](#5-prototype--provare-unidea-prima-di-implementarla)
- [Ricerca tecnica](#6-research--verificare-una-questione-tecnica)
- [Passaggio di consegne](#7-handoff--riprendere-in-unaltra-sessione)
- [Documentazione per agenti](#8-writing-for-agents--scrivere-istruzioni-utili)
- [Come combinarle](#come-combinarle)
- [Intervista con grilling](#intervista-con-grilling)
- [Design frontend e audit UX](#design-frontend-e-audit-ux)
- [Domande frequenti e manutenzione](#domande-frequenti-e-manutenzione)
- [Fonti e versione](#fonti-e-versione)

## Scelta rapida

| Situazione | Skill | Risultato principale |
| --- | --- | --- |
| Qualcosa non funziona, si blocca o è diventato lento | `diagnosing-bugs` | Riproduzione, causa verificata e correzione dimostrabile |
| Il comportamento desiderato è chiaro e vuoi implementarlo partendo dai test | `tdd` | Piccoli incrementi, ciascuno con una prova significativa |
| Una modifica coinvolge troppi punti o il codice è difficile da testare | `codebase-design` | Un'interfaccia più semplice e responsabilità meglio raccolte |
| Vuoi controllare le modifiche rispetto alle regole e alla richiesta originale | `code-review` | Due valutazioni separate: qualità del codice e rispetto dei requisiti |
| Vuoi vedere alternative di interfaccia o provare una logica incerta | `prototype` | Una dimostrazione esplorabile prima del lavoro definitivo |
| Non è ancora chiaro se una tecnologia o un'API permetta una funzione | `research` | Un documento con fonti primarie, conclusioni e limiti |
| Vuoi continuare in una nuova chat senza perdere il punto | `handoff` | Un documento di consegna con stato, riferimenti e prossimo passo |
| Vuoi migliorare `AGENTS.md`, una skill o istruzioni per altri agenti | `writing-for-agents` | Indicazioni con condizioni di uso e criteri di completamento chiari |
| Vuoi realizzare o rifinire una schermata mantenendo le convenzioni dell'app | `frontend-design` | UI funzionante e controllo visuale degli stati interessati |
| Vuoi valutare l'esperienza di un flusso prima di modificarlo | `product-design-audit` | Problemi UX e rischi di accessibilità collegati a schermate osservate |

Per Lezionify, le skill da usare più spesso sono `diagnosing-bugs`, `tdd` e
`code-review`. Le altre servono quando emerge il problema specifico indicato.
Una correzione di testo o un piccolo spostamento grafico può essere svolto
direttamente, con una verifica proporzionata.

## Come richiamarle

### Scrivere il nome nella richiesta

Puoi chiedere in italiano:

> Usa la skill diagnosing-bugs per indagare questo problema: quando cambio
> lingua nella dispensa, il punto di lettura salta all'inizio. Prima riproduci
> il caso, poi correggilo e verifica entrambe le direzioni.

Oppure puoi menzionare esplicitamente la skill con il prefisso `$`:

```text
$diagnosing-bugs
Indaga il salto del punto di lettura quando cambio lingua nella dispensa.
```

La forma «Usa la skill nome» rende la richiesta chiara anche quando il selettore
dell'interfaccia non mostra la skill. La documentazione ufficiale descrive
l'attivazione esplicita e la scelta automatica in base alla descrizione;
CLI ed estensione IDE supportano `/skills` e le menzioni con `$`.
L'interfaccia concreta del selettore dipende dal prodotto.
[Riferimento ufficiale](https://learn.chatgpt.com/docs/build-skills#how-chatgpt-and-codex-use-skills).

I comandi `/tdd` o `/research` che potresti incontrare nei materiali dell'autore
non sono comandi universali da eseguire in PowerShell. Qui usa i prompt in chat.

### Scelta automatica ed esplicita

Le sette skill diverse da `handoff` hanno descrizioni che permettono all'agente
di valutarne l'uso quando il compito corrisponde. Nominare una skill rende la
scelta esplicita; non è necessario nominare tutte le skill per ogni attività.

`handoff` è configurata per l'invocazione esplicita: richiedila quando vuoi
preparare il passaggio di consegne. La sua configurazione locale contiene
`allow_implicit_invocation: false`.
Per `LISTA_ORDINE`, la richiesta permanente dell'utente è registrata in
[AGENTS.md](../../AGENTS.md#comando-lista_ordine): il passaggio finale è già
autorizzato e non richiede una nuova conferma.

### Cosa fornire nel prompt

Una richiesta efficace contiene obiettivo, caso concreto, limiti e risultato
atteso. Per esempio:

```text
Usa tdd per il vocabolario unico, voce 22 del backlog.
Copri il comportamento pubblico del vocabolario e del traduttore offline:
parola singola, frase, inversione manuale e risposta arrivata dopo un cambio
del testo. Questi sono i confini di test che approvo.
Mantieni il download dei modelli esplicito e il funzionamento offline.
Completa implementazione e verifiche pertinenti e registra la decisione.
```

Se chiedi solo un'analisi, specificalo. Se vuoi anche l'implementazione, scrivilo:
una ricerca, una revisione o un prototipo hanno risultati diversi da una
funzione pronta nell'applicazione.

## Regole per Lezionify

Le skill forniscono un metodo di lavoro. Si applicano insieme alle istruzioni
dell'utente e alle regole del progetto, che continuano a definire il perimetro.
I riferimenti da leggere restano, nell'ordine, [AGENTS.md](../../AGENTS.md),
[IDEA_INIZIALE.md](../../IDEA_INIZIALE.md),
[STRUTTURA_PROGETTO.md](../../STRUTTURA_PROGETTO.md) e le decisioni recenti in
[DECISIONI.md](../../DECISIONI.md).

In particolare:

- **Fonti locali:** audio originali e trascrizioni grezze vanno conservati;
  dati personali e credenziali restano fuori dai file versionati e dai log.
- **Servizi AI:** ricerca documentale, test sintetici e chiamate ai provider
  dell'app sono attività distinte. Le chiamate AI dell'app restano esplicite
  e tracciabili; una skill non autorizza invii personali o benchmark remoti.
- **Decisioni:** le modifiche non banali si registrano con
  `tools/append_decision.py`. Se una skill parla di ADR, cioè documenti sulle
  decisioni architetturali, per Lezionify il registro esistente è il riferimento.
  Non si crea un registro parallelo per duplicare la stessa scelta.
- **Attività locali:** quando servono requisiti o ticket, indica la voce del
  [backlog](idee-future-2026-10-13.md) o il documento di piano pertinente.
  L'installazione non ha configurato un tracker esterno.
- **Perimetro:** `LISTA_ORDINE` mantiene il proprio significato: una sola voce
  per invocazione, secondo le regole di `AGENTS.md`. Le skill aiutano a svolgerla.
- **Stato verificato:** test simulati, prove API reali, pacchetto Windows e
  prove con hardware devono essere descritti separatamente. Un prototipo del
  Balance non certifica un collegamento al dispositivo.

I prompt di questa guida sono proposte di uso. Non cambiano l'ordine del
backlog, non installano altre skill e non autorizzano commit, push,
pubblicazioni o azioni sugli account dell'utente.

## 1. diagnosing-bugs — Capire e correggere un problema

### Quando serve

Quando hai un errore osservabile: una dispensa sembra troncata, la selezione
delle slide scompare, il player non aggiorna lo stato o una fase della pipeline
non parte. È particolarmente utile per problemi intermittenti e regressioni
di prestazioni.

### Come lavora

1. Costruisce un controllo ripetibile che riconosca il sintomo preciso.
2. Riproduce il caso e lo riduce agli elementi necessari.
3. Formula più ipotesi verificabili, ordinate per plausibilità.
4. Aggiunge misure o diagnostica mirata per distinguerle.
5. Applica la correzione e, quando esiste un punto di verifica adatto, conserva
   un test di regressione.
6. Ripete lo scenario originale e rimuove la diagnostica temporanea.

La prima prova può essere un test, una sequenza UI, un piccolo programma o una
misura di tempo. Per un problema intermittente si cerca una frequenza di
riproduzione utile, dichiarando l'incertezza residua.

### Esempio pronto

```text
Usa diagnosing-bugs per la voce 20: a volte manca la versione ENG.
Recupera prima diagnosi e decisioni già disponibili, poi cerca un caso
riproducibile. Distingui fase esclusa, in attesa, fallita e riuscita.
Lavora con fixture sintetiche; non avviare traduzioni personali o chiamate
AI reali. Correggi le cause dimostrate e documenta gli eventuali blocchi.
```

### Cosa aspettarti e quando evitarla

Il risultato deve collegare sintomo, prova, causa e verifica successiva. Se il
problema non è riproducibile, la skill richiede di dichiararlo e identificare
l'evidenza mancante: non basta una spiegazione plausibile per dire «risolto».

Per una modifica grafica già definita e priva di malfunzionamenti, basta
l'implementazione diretta con controllo visivo.

## 2. tdd — Implementare un comportamento a piccoli passi

### Quando serve

Quando il risultato atteso è chiaro e un errore sarebbe facile da reintrodurre:
risposte obsolete del traduttore, retry della pipeline, conservazione di stato,
gestione delle quote o annullamento delle richieste.

### Come lavora

Si concordano prima le interfacce pubbliche da verificare. Poi si esegue un
ciclo alla volta: test che fallisce sul comportamento richiesto, modifica
minima che lo fa passare, prossimo comportamento. Nella versione installata
il riordino del codice viene demandato alla fase di revisione.

Una buona prova osserva un risultato utile: «dopo una modifica del testo resta
visibile solo la traduzione dell'ultimo input». Una prova fragile controlla
il numero esatto di chiamate a una funzione interna senza verificare cosa vede
l'utente. Gli esiti attesi devono provenire dai requisiti o da esempi calcolati
indipendentemente dal codice sotto test.

### Il punto da concordare

La skill richiede esplicitamente: **“Test only at pre-agreed seams.”** Qui
*seam* significa il punto pubblico attraverso il quale esercitare il
comportamento: per esempio l'interazione nel vocabolario o il servizio di
traduzione, anziché una funzione privata.

Se quel perimetro non è stato concordato, può chiederti di confermarlo prima
di scrivere i test. Puoi definirlo direttamente nel prompt, come nell'esempio
del vocabolario nella sezione iniziale. Il requisito è nel
[file della skill installata](C:/Users/Utente/.codex/skills/tdd/SKILL.md).

### Esempio pronto

```text
Usa tdd per impedire che una traduzione vecchia sostituisca quella nuova.
Approvo test sul comportamento pubblico del pannello: digito una frase,
la cambio mentre il motore lavora, ricevo le risposte in ordine inverso.
Deve restare soltanto il risultato della frase corrente.
Usa un motore simulato controllabile, senza rete o dati personali.
```

### Cosa aspettarti e quando evitarla

Test comprensibili che intercettino il difetto, incrementi verificati e un
riepilogo di ciò che è stato coperto. Il test simulato non dimostra la qualità
linguistica del modello reale: quella richiede una prova distinta.

Per refusi, formattazione o spostamenti reversibili di basso impatto, non
occorre introdurre test che ripetano semplicemente l'implementazione.

## 3. codebase-design — Progettare interfacce semplici

### Quando serve

Quando una stessa regola è sparsa tra più file, una modifica richiede molti
interventi coordinati oppure i test devono conoscere troppi dettagli interni.
Per Lezionify può aiutare nella condivisione dello stato musicale o nella
separazione tra dizionario, traduzione delle frasi e interfaccia del vocabolario.

### Come lavora

È una guida di progettazione, non una scansione automatica dell'intero repository.
Invita a concentrare il comportamento dietro una superficie semplice per chi
la usa. Nel suo vocabolario:

| Termine | Significato pratico |
| --- | --- |
| Modulo | Una parte di codice con un'interfaccia e un'implementazione |
| Interfaccia | Metodi, dati, vincoli, errori e conoscenze necessarie per usarla |
| Profondità | Quanta capacità offre rispetto a quanto occorre sapere per usarla |
| Seam | Il punto nel quale è possibile sostituire il comportamento |
| Adapter | Un'implementazione che occupa quel punto, per esempio reale o simulata |
| Località | Quanto una regola o una correzione resta concentrata in un posto |

La domanda utile è: se elimino questo modulo, la complessità torna distribuita
tra i chiamanti oppure sparisce perché era solo un passaggio superfluo?

### Esempio pronto

```text
Usa codebase-design per valutare come condividere lo stato della musica
tra la vista ordinaria e Focus. Leggi prima implementazione e decisioni.
Proponi l'interfaccia minima e indica dove concentrare polling, selezione
del dispositivo e cleanup. Per ora produci una proposta con pro e contro;
non eseguire un refactoring generale.
```

### Cosa aspettarti e quando evitarla

Una proposta concreta con responsabilità, interfaccia, punti di verifica e
costi della modifica. Le risorse della skill includono anche un metodo per
confrontare progetti alternativi con subagenti, da usare quando pertinente.

Non conviene creare nuove astrazioni per esigenze ipotetiche: il miglioramento
deve rendere più semplice un cambiamento reale del progetto.

## 4. code-review — Controllare regole e requisiti

### Quando serve

Dopo un insieme significativo di modifiche o prima di consegnarlo. La skill
esamina due aspetti separati:

- **Standards:** rispetto delle regole del repository e possibili problemi di
  leggibilità, duplicazione o organizzazione.
- **Spec:** corrispondenza con la richiesta originale, inclusi comportamenti
  mancanti, parziali, errati o aggiunti senza necessità.

Le due analisi vengono affidate a subagenti distinti, quando gli strumenti lo
consentono. Una valutazione positiva su un asse non annulla i problemi sull'altro.

### Cosa fornire

Servono un riferimento Git valido e la fonte dei requisiti: commit, branch o
tag da un lato; voce del backlog, piano o issue dall'altro. Se manca la specifica,
va indicato e la valutazione di conformità non può essere completa.

La skill originale può richiedere la configurazione del tracker tramite
`setup-matt-pocock-skills`, che **non è stata installata**. Per una revisione
locale fornisci esplicitamente il documento dei requisiti e chiarisci che le
attività sono tracciate nei documenti del repository. Un'integrazione con un
tracker remoto resta una scelta separata.

### Attenzione alle modifiche non committate

Il confronto standard della skill è `git diff <base>...HEAD`, cioè dai punti
comuni della storia Git fino ai commit correnti. **Non include automaticamente
file modificati senza commit, modifiche staged o file nuovi non tracciati.**
In Lezionify questo dettaglio è importante: una revisione del solo `HEAD`
potrebbe ignorare il lavoro presente nella cartella. Se vuoi rivedere quel
lavoro, chiedi esplicitamente di adattare il perimetro includendo queste
modifiche e di riepilogare cosa è stato effettivamente letto.

### Esempio pronto

```text
Usa code-review sulle modifiche al vocabolario unico, rispetto alla voce 22
di docs/product/idee-future-2026-10-13.md.
Adatta il confronto per includere le modifiche correnti staged, non staged
e i file nuovi pertinenti, non soltanto i commit di HEAD.
Le attività sono tracciate localmente; non serve un tracker esterno.
Riporta separatamente Standards e Spec e indica i limiti della revisione.
Non applicare correzioni in questa fase.
```

### Cosa aspettarti e quando evitarla

Osservazioni motivate con riferimenti al codice o ai requisiti. Le preferenze
di stile vanno distinte dai difetti concreti; i controlli già coperti dagli
strumenti non devono diventare rumore nel rapporto.

La revisione non sostituisce l'esecuzione dei test e non garantisce che hardware,
account personali o servizi remoti funzionino. Non serve avviare due analisi
complete per una correzione puramente tipografica.

## 5. prototype — Provare un'idea prima di implementarla

### Quando serve

Quando non sai ancora quale interfaccia scegliere o vuoi capire se una sequenza
di stati è sensata. La skill ha due percorsi:

| Dubbio | Prototipo previsto |
| --- | --- |
| «Come dovrebbe essere questa schermata?» | Più varianti strutturalmente diverse, normalmente tre, confrontabili nello stesso contesto |
| «Questa logica gestisce davvero i casi difficili?» | Un HTML autonomo con pulsanti, stato visibile e scenari guidati |

### Esempio pronto per l'interfaccia

```text
Usa prototype per confrontare tre disposizioni della configurazione
di traduttore e musica nelle Impostazioni di Lezionify.
Voglio differenze di struttura e gerarchia, con dati sintetici e senza
collegamenti reali agli account. Riusa il contesto visivo dell'app e adatta
il selettore delle varianti all'architettura Electron/React esistente.
Fermati alla dimostrazione: l'implementazione definitiva verrà dopo.
```

### Esempio pronto per la logica

```text
Usa prototype per un HTML autonomo che simuli una pausa di studio:
avvio, scadenza, ripresa anticipata e sospensione del PC.
Mostra il tempo di pausa e di studio dopo ogni azione.
Usa soltanto stato simulato; nessun collegamento al Balance.
```

### Cosa aspettarti e quando evitarla

Una dimostrazione semplice da aprire, con la domanda esplorata ben visibile.
Le varianti UI devono cambiare disposizione e priorità delle informazioni,
non soltanto colori. Il modello a route e parametri URL descritto dall'autore
va adattato al progetto: non giustifica l'aggiunta di un router senza bisogno.

Il codice esplorativo usa controlli minimi e non rappresenta una funzione pronta.
Dopo la scelta occorrono integrazione, gestione degli errori e verifiche reali.
La skill propone di conservare i prototipi su un branch dedicato; eventuali
operazioni Git si coordinano con il perimetro autorizzato, senza includere
modifiche preesistenti estranee.

Se sai già esattamente cosa modificare, passa all'implementazione.

## 6. research — Verificare una questione tecnica

### Quando serve

Prima di scegliere un'API, un motore o un collegamento hardware di cui non sono
ancora chiare le capacità. Per esempio: ricezione di un comando sul Balance,
limiti dei dispositivi Spotify o supporto di un runtime offline nel packaging.

### Come lavora

La skill prevede un agente di ricerca in background che consulta fonti primarie:
documentazione ufficiale, sorgenti, specifiche e API del produttore. Raccoglie
il risultato in un file Markdown nella posizione già usata dal progetto,
qui normalmente `docs/research/`.

### Esempio pronto

```text
Usa research per chiarire quali canali permettono al Balance originale
di ricevere una pausa dal PC nelle condizioni già approvate.
Parti dalle ricerche e dalle decisioni esistenti, verifica solo i punti
ancora aperti su fonti ufficiali e sorgenti pertinenti.
Salva conclusioni, fonti, data e prove hardware ancora necessarie
in docs/research/. Non installare software sul watch o sul telefono.
```

### Cosa aspettarti e quando evitarla

Una risposta alla domanda iniziale con collegamenti a sostegno delle affermazioni,
distinzione tra fatti e deduzioni, limiti e prossimo esperimento utile.
Una ricerca riuscita può concludere che manca una prova fisica o che i vincoli
non sono ancora soddisfatti.

Il background vale durante il lavoro della sessione: la skill non crea un
monitor programmato né promette di continuare dopo la chiusura della chat.
Una ricerca non implementa la funzione e non autorizza chiamate a pagamento.

Per un comportamento già verificabile nel codice locale, usa prima il codice.
Recupera le ricerche esistenti per evitare indagini duplicate.

## 7. handoff — Riprendere in un'altra sessione

### Quando serve

Quando stai per cambiare chat, vuoi passare il lavoro a un altro agente o
desideri un punto di ripresa sintetico per un'attività lunga.

### Come lavora

Prepara un documento che indica obiettivo, stato raggiunto, decisioni rilevanti,
file, verifiche eseguite, blocchi, prossimo passo e skill suggerite. Rimanda
ai documenti esistenti anziché duplicarli e rimuove informazioni sensibili.

### Esempio pronto

```text
$handoff
La prossima sessione completerà il vocabolario unico.
Riporta cosa è implementato, cosa manca, verifiche passate e non eseguite,
file rilevanti, decisioni da leggere e primo passo concreto.
Rimanda ai documenti del repository e restituisci il percorso completo.
```

### Dove finisce il file e come riprendere

La versione installata salva il documento nella cartella temporanea del sistema
operativo, su Windows `%TEMP%`, non nel repository. Chiedi sempre il percorso
del file prodotto. La cartella temporanea può essere ripulita: per una consegna
duratura chiedi esplicitamente anche un riepilogo persistente nella
documentazione del progetto.

Nella nuova chat puoi scrivere:

```text
Leggi il documento di handoff al percorso completo che ti indico e i file
iniziali richiesti da AGENTS.md. Verifica lo stato reale prima di riprendere
il prossimo passo: non considerare il documento una prova che il codice
sia rimasto invariato.
```

Il documento non apre né invia messaggi a un'altra chat automaticamente.
Non svuota automaticamente il contesto della chat corrente: consente di
riprendere in una nuova sessione leggendo un riepilogo essenziale.
Nel flusso `LISTA_ORDINE` si usa sempre alla conclusione del lavoro, anche
in presenza di un blocco concreto, secondo la richiesta permanente in
`AGENTS.md`. Negli altri interventi resta su richiesta esplicita.

## 8. writing-for-agents — Scrivere istruzioni utili

### Quando serve

Per creare o migliorare istruzioni destinate agli agenti: `AGENTS.md`, skill,
guide operative o documenti di ripresa. È utile se le stesse regole vengono
ignorate, interpretate diversamente oppure ripetute in molti file.

### Come lavora

Separa ciò che serve sempre dai dettagli necessari solo in alcuni casi.
Ogni rimando deve spiegare quando aprire la risorsa; ogni passaggio deve avere
una condizione riconoscibile di completamento. Le regole hanno una fonte
autorevole unica, a cui gli altri documenti rimandano.

Per esempio, «verifica la pipeline» è poco preciso. «Verifica che una fase
fallita possa ripartire senza sovrascrivere le fonti e indica il test eseguito»
fornisce un esito controllabile.

### Esempio pronto

```text
Usa writing-for-agents per migliorare le istruzioni sulla manutenzione
del backlog. Rendi chiaro quando leggere ciascun documento e quando
una casella può essere completata. Conserva il significato di LISTA_ORDINE
e il registro append-only delle decisioni. Elimina duplicazioni rimandando
alle fonti esistenti, senza introdurre nuove regole di prodotto.
```

### Cosa aspettarti e quando evitarla

Istruzioni più facili da seguire, con condizioni di uso, sequenza e criteri
di completamento. La skill non impone un formato a tutta la documentazione
e non riscrive automaticamente `AGENTS.md` quando la richiami per un altro file.

Per una nuova skill usa anche la skill di sistema `skill-creator`, che gestisce
struttura e validazioni specifiche. `writing-for-agents` aiuta a scrivere bene
il contenuto; non sostituisce quel processo.

## Come combinarle

### Percorsi consigliati

| Lavoro | Sequenza utile |
| --- | --- |
| Bug riproducibile | `diagnosing-bugs`, eventuale `tdd` per bloccare la regressione, `code-review` |
| Funzione già definita | Eventuale `codebase-design`, `tdd`, `code-review` |
| Interfaccia ancora incerta | `prototype`, scelta dell'utente, implementazione con verifiche, `code-review` |
| Tecnologia o hardware incerti | `research`, eventuale prototipo, prova reale distinta, implementazione |
| Istruzioni difficili da seguire | `writing-for-agents`, verifica di coerenza con le regole esistenti |
| Interruzione di un lavoro lungo | `handoff` su richiesta esplicita |

Queste sono combinazioni consigliate, non una pipeline obbligatoria e non
un automatismo installato. Si usano soltanto i passaggi che risolvono un dubbio
o verificano un rischio concreto.

Per ogni `LISTA_ORDINE` segui la sequenza autorevole in
[AGENTS.md](../../AGENTS.md#comando-lista_ordine): consulta questa guida,
usa `grilling` ("grill me") se restano scelte da concordare, applica le skill
utili al compito e termina con `handoff`, già richiesto dall'utente per questo
comando. La scelta considera anche le altre skill disponibili nella sessione;
una modifica semplice può seguire il percorso diretto. Restano il perimetro
di una sola voce, le verifiche e gli aggiornamenti documentali prima della
consegna finale. Il riepilogo permette la ripresa anche quando la voce è
bloccata e resta aperta. La regola iniziale D-0328 è aggiornata in D-0329.

### Applicazione alle prossime richieste di Lezionify

| Attività | Metodo più utile | Punto da verificare |
| --- | --- | --- |
| Vocabolario unico, voce 22 | `tdd`, con `codebase-design` se serve | Passaggio parola/frase, direzione manuale e risultati obsoleti |
| Configurazione nelle Impostazioni, voce 23 | Implementazione diretta; `prototype` se il layout è incerto | Prima configurazione e preferenze già salvate |
| Seleziona slide solo durante la domanda, voce 25 | Test mirati e `code-review`; `tdd` se richiesto | Il selettore resta utilizzabile passando al PDF |
| Continuità della musica, voce 24 | `diagnosing-bugs` per problemi reali, eventuale `codebase-design` | Stato condiviso, cleanup e assenza di polling duplicato |
| ENG mancanti, voce 20 | `diagnosing-bugs` | Un episodio riproducibile dopo le correzioni già registrate |
| Timer Balance, voce 17 | `research`, prototipo e collaudo fisico distinti | Trasporto reale, ricezione e comportamento sul dispositivo |

La tabella suggerisce il metodo e non certifica lo stato futuro del backlog.
Prima di intervenire vanno letti codice e decisioni aggiornati.

## Intervista con grilling

Usala quando vuoi chiarire le scelte prima dell'implementazione. L'agente
recupera prima i fatti dal codice e dai documenti, poi raggruppa le domande
che possono essere decise subito. Ogni domanda presenta una proposta;
le risposte determinano gli eventuali round successivi. Le questioni che
dipendono da risposte ancora mancanti vengono rinviate al round appropriato.

```text
Usa grilling per definire il comportamento della nuova funzione.
Recupera i requisiti e le decisioni esistenti; chiedimi solo le scelte ancora
aperte, con una proposta per ciascuna. Dopo aver raggiunto un'intesa,
procedi con implementazione e verifiche nel perimetro concordato.
```

La skill prevede esplorazioni con subagenti quando servono fatti dall'ambiente.
Richiede di attendere le risposte fra i round e di raggiungere una comprensione
condivisa prima di attuare il progetto. Non equivale a chiedere nuovamente
permesso per ogni scelta già autorizzata. Una modifica semplice e già precisa
può essere eseguita direttamente.

Fonte: [grilling installata](C:/Users/Utente/.codex/skills/grilling/SKILL.md).
L'intervista applicata a Lezionify è registrata nel
[documento delle priorità 1–5](priorita-1-5-2026-10-15.md).

## Domande frequenti e manutenzione

### Devo ricordare tutti i nomi?

No. Descrivi bene il problema e l'agente può scegliere una skill pertinente.
Nominala quando vuoi un metodo specifico; richiedi `handoff` esplicitamente
fuori da `LISTA_ORDINE`, che ne include già la richiesta finale.

### Le skill modificano Lezionify appena vengono installate?

L'installazione aggiunge istruzioni e risorse al profilo Codex. Le attività
vengono svolte quando una richiesta porta a usare la skill. Non aggiungono
funzioni nell'app, dipendenze runtime o servizi AI alla pipeline.

### Sono disponibili solo in questo progetto?

Questa installazione è personale, in `C:/Users/Utente/.codex/skills`, ed è
utilizzabile anche negli altri progetti di questo profilo. Non è inclusa nel
repository né nel setup Windows di Lezionify. L'elenco delle skill disponibile
nella sessione conferma i percorsi locali effettivi.

### Cosa faccio se una skill non compare?

Chiedi di controllare la sua cartella e `SKILL.md` e prova a richiamarla per nome.
Se un aggiornamento non viene rilevato, la documentazione ufficiale suggerisce
il riavvio di Codex. Per `handoff`, ricorda l'invocazione esplicita fuori
da `LISTA_ORDINE`; se manca durante il comando, segnala il limite e usa il
riepilogo equivalente previsto da `AGENTS.md`.
[Riferimento](https://learn.chatgpt.com/docs/build-skills#install-curated-skills-for-local-use).

### Servono credenziali aggiuntive?

Le istruzioni installate non hanno credenziali proprie. Un'attività può però
richiedere un ambiente o un servizio esterno: la skill non crea accesso a
Spotify, al watch o a un provider AI. I test sintetici e i collaudi reali vanno
scelti e rendicontati separatamente.

### La revisione può lavorare senza commit?

Sì, se chiedi di adattarla alle modifiche locali e viene verificato il perimetro.
Il flusso originale tra riferimento Git e `HEAD` copre invece i commit. Non
serve creare un commit solo per nascondere questa differenza.

### Possono chiedermi chiarimenti?

Sì, se mancano un requisito, il confronto Git, la prova del bug o un'informazione
necessaria. `tdd` contiene anche il requisito esplicito di concordare i punti
da testare. Indicare questi dati nel prompt riduce le domande ripetute.
Una skill non deve trasformare una scelta già autorizzata in una nuova richiesta
generica di conferma.

### Come si aggiornano?

Le otto skill sono copie fissate a una revisione, con aggiornamento manuale.
Per aggiornarle chiedi di confrontare la versione installata con quella nuova,
valutare le differenze e preservare eventuali adattamenti locali. L'installer
standard rifiuta destinazioni già esistenti: un aggiornamento va gestito come
tale, senza sovrascritture implicite. Non occorre installare anche l'intero
plugin per usare queste copie.

## Design frontend e audit UX

Il 21 ottobre 2026 sono state selezionate tre skill personali, esterne al
pacchetto Electron e alle dipendenze dell'app:

- `frontend-design`: implementazione e rifinitura di componenti e schermate.
  Per Lezionify privilegiare leggibilità, ergonomia durante lo studio,
  componenti esistenti e prestazioni. Verificare il risultato in Electron,
  comprese finestre strette, zoom e stati vuoti, caricamento ed errore pertinenti.
- `product-design-audit`: revisione di un flusso con schermate attuali e rilievi
  legati a passaggi osservati. Adatta a Focus, Q&A, Memo e impostazioni.
  Le immagini da sole non dimostrano la piena accessibilità.
- `product-design-qa`: supporto per confrontare un prototipo implementato con
  un riferimento visuale selezionato, alla stessa dimensione e nello stesso
  stato. Usarla solo quando entrambi esistono; per una critica generale usare
  `product-design-audit`.

Esempi:

> Usa frontend-design per rifinire il pannello Q&A mantenendo i componenti
> esistenti. Verifica testo ingrandito, finestra stretta e stati di errore.

> Usa product-design-audit per valutare il passaggio dalla lettura Focus al
> Q&A e ritorno. Presenta prima i problemi osservati e le schermate pertinenti.

Le copie sono in `C:/Users/Utente/.codex/skills/`. I supporti condivisi originali
di Product Design sono conservati in
`C:/Users/Utente/.codex/skill-support/product-design/`, fuori dal catalogo delle
skill attive. I nomi delle due skill Product Design e i collegamenti ai supporti
sono adattati per l'installazione autonoma: non è l'installazione dell'intero
plugin e non abilita connessioni Figma, hosting o altri servizi.

Ogni skill conserva `.installation-source.json` con revisione Git, hash dei
file originali e adattamenti. Gli aggiornamenti sono manuali e devono preservare
questi collegamenti. Provenienza: [frontend-design](https://github.com/dobromirdikov/codex-frontend-design-skill)
(Apache-2.0) e [Product Design](https://github.com/openai/plugins/tree/main/plugins/product-design)
(il manifest dichiara licenza Proprietary; disponibilità pubblica e licenza
open source non sono equivalenti). Le copie restano personali.

I flussi di ideazione, ricerca e pubblicazione del plugin sono conservati come
supporti richiamabili, senza aggiungerli come ulteriori skill attive. Per
Lezionify rimangono vincolanti local-first, uso di dati sintetici nei prototipi
e invii AI espliciti. Le skill di design affiancano i collaudi funzionali e
la revisione del codice. Disponibili dal turno successivo all'installazione.

## Fonti e versione

Le descrizioni operative derivano dai file installati, incluse le risorse
di supporto. I prompt e gli adattamenti a Lezionify sono esempi di questa guida,
non funzioni aggiunte alle skill originali.

| Voce | Riferimento |
| --- | --- |
| Autore e raccolta | [mattpocock/skills](https://github.com/mattpocock/skills) |
| Revisione installata | [49dd158d1076134a641b33efb035946536778336](https://github.com/mattpocock/skills/tree/49dd158d1076134a641b33efb035946536778336) |
| Installazione nel progetto | D-0320 in [DECISIONI.md](../../DECISIONI.md) |
| Licenza | MIT; una copia è conservata in ogni cartella installata |
| Provenienza locale | `.installation-source.json` in ogni cartella, con revisione e hash dei file originali |
| Meccanismi Codex | [Build skills, documentazione ufficiale OpenAI](https://learn.chatgpt.com/docs/build-skills) |

Fonti locali per ciascuna skill:

- [diagnosing-bugs](C:/Users/Utente/.codex/skills/diagnosing-bugs/SKILL.md).
- [tdd](C:/Users/Utente/.codex/skills/tdd/SKILL.md), con `tests.md` e `mocking.md`.
- [codebase-design](C:/Users/Utente/.codex/skills/codebase-design/SKILL.md),
  con `DEEPENING.md` e `DESIGN-IT-TWICE.md`.
- [code-review](C:/Users/Utente/.codex/skills/code-review/SKILL.md).
- [prototype](C:/Users/Utente/.codex/skills/prototype/SKILL.md), con `UI.md` e `LOGIC.md`.
- [research](C:/Users/Utente/.codex/skills/research/SKILL.md).
- [handoff](C:/Users/Utente/.codex/skills/handoff/SKILL.md),
  con la policy in `agents/openai.yaml`.
- [writing-for-agents](C:/Users/Utente/.codex/skills/writing-for-agents/SKILL.md),
  con `SKILL-MECHANICS.md`.

I collegamenti locali alle skill valgono per questo computer. Il repository
dell'autore resta il riferimento consultabile da un'altra macchina; per leggere
la stessa versione usa la revisione fissata sopra.
