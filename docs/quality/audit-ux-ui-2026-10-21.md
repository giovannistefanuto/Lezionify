# Lezionify — report UX/UI del 21 ottobre 2026

Analisi richiesta dall’utente con consegna entro le 17:50, Europe/Rome. Metodo: `product-design-audit`, con i criteri di leggibilità, ergonomia e coerenza di `frontend-design`. Nessun redesign implementato. `product-design-qa` non è pertinente: manca un nuovo prototipo da confrontare con un riferimento approvato.

## Pianificazione ed esito del 22 ottobre 2026

Su richiesta dell'utente, tutti i rilievi U01–U13 sono ora rappresentati nelle
voci 76–88 di [Idee future e Coda LISTA_ORDINE](../product/idee-future-2026-10-13.md#coda-lista_ordine),
insieme alle nuove richieste e alle attività precedenti ancora aperte (D-0390).
Tutti i tredici interventi sono stati **implementati e collaudati in D-0392**,
dopo l'intesa D-0391. [Uso, nuove verifiche e limiti](../product/interventi-2026-10-22.md).
**NVDA non verificato**: i collaudi semantici e da tastiera non costituiscono una
certificazione di accessibilità. Il report conserva le evidenze dell'audit
originario, distinte dai risultati del 22 ottobre documentati nel nuovo report.

| Rilievo | Voce futura | Posizione nella coda del 22 ottobre |
| --- | --- | --- |
| U01 — Elenco Q&A da tastiera | 76 | 4 |
| U02 — Focus Lock: nome e focus | 77 | 8 |
| U03 — Focus Lock: zoom 200% | 78 | 9 |
| U04 — Contrasto | 79 | 5 |
| U05 — Composizione chat di corso | 80 | 10 |
| U06 — Ambito Elabora tutto | 81 | 7 |
| U07 — Nomi e comandi | 82 | 12 |
| U08 — Barre Focus/Q&A | 83 | 13 |
| U09 — Corso, copertura e certezza | 84 | 16 |
| U10 — Player e gerarchia Musica | 85 | 14 |
| U11 — Testi lunghi Memo | 86 | 15 |
| U12 — Attesa del clic lezione | 87 | 6 |
| U13 — Etichette/errori Q&A | 88 | 3 |

La coda ordina per facilità stimata, mentre P1/P2 esprimono l'impatto originario
dei rilievi. L'utente ha scelto di conservare Focus Lock, chiarire l'ambito con
Elabora archivio e usare clic immediato con rinomina da menu/F2; le alternative
più ampie non sono state adottate. In Focus resta la sola icona Musica esistente.
Le indicazioni successive
sulla mancata modifica del backlog descrivono la consegna originaria D-0389;
la pianificazione corrente è quella del 22 ottobre nel documento collegato.

## Valutazione complessiva

**Lezionify ha un’identità visiva riconoscibile e una buona base per lo studio tecnico. La priorità è rendere più prevedibili e accessibili le interazioni frequenti.** Il verde scuro, i fondi chiari e il colore dei corsi funzionano; fonti affiancate, formule, domande ancorate e ripresa della lettura rispondono al lavoro reale dello studente.

La crescita delle funzioni ha prodotto tre costi: comandi che richiedono di ricordare icone e convenzioni, controlli secondari che competono con il testo, e comportamenti diversi fra finestre simili. Correggere questi punti darà più beneficio di un cambio generale di palette, font o stile.

Non assegno un voto numerico: mancano prove con utenti e misure dei tempi di completamento. Le priorità sotto indicano impatto stimato, non frequenza misurata. Nessun P0 emerso nel perimetro verificato; non è una garanzia sull’intera applicazione.

## Metodo e confini delle prove

- Cinque screenshot forniti dall’utente, salvati e ispezionati in questa sessione.
- Nuove catture di componenti reali in Electron, con dati sintetici e profilo separato: archivio, import video, Focus/PDF/Q&A, musica, Memo, esportazione, impostazioni e statistiche.
- Prove mirate su Focus Lock, accesso alle discussioni Q&A e chat di corso con risposta lunga; misure del DOM e input da tastiera nativo Electron.
- Finestre di prova a 1240×820 e 900×640; zoom generale 100% e 200%. La suite include inoltre componenti a larghezze inferiori alla finestra minima dell’app. Le dimensioni riportate sono CSS pixel; i PNG possono essere più grandi per la scala Windows.
- Codice corrente e decisioni D-0383, D-0385, D-0387 e D-0388 consultati. Il checkout contiene modifiche precedenti: le nuove catture descrivono il sorgente corrente, gli allegati l’app mostrata dall’utente. Non affermo che ogni file del checkout coincida con l’installer.

**Legenda delle evidenze:** “confermato” = comportamento riprodotto o proprietà verificata nel codice/DOM; “osservato” = visibile nella schermata; “ipotesi” = conseguenza plausibile ancora da validare con utenti. Le proposte non sono decisioni di prodotto già approvate.

Audio, trascrizioni, credenziali e archivio personale non sono stati aperti per le prove. Nessuna richiesta Gemini reale o collegamento reale a Spotify/YouTube. Le risposte dimostrative sono testi locali. Le catture personali rimangono in `local-artifacts/ux-audit-2026-10-21/`, esclusa da Git; questo report testuale resta comprensibile anche senza le immagini locali.

## Percorso esaminato

È una mappa dei compiti osservati, non la registrazione di un’unica sessione continua.

| Passo | Compito | Stato nel perimetro verificato | Evidenza principale |
|---|---|---|---|
| 1 | Trovare una lezione nell’archivio | Buona scansione; contrasto e scoperta dei comandi da migliorare | E01 |
| 2 | Importare e preparare il materiale | Form leggibile; ambito dell’elaborazione poco esplicito | E02 + codice |
| 3 | Leggere in Focus con slide | Buona struttura; troppe azioni concorrenti nelle barre | E03 |
| 4 | Aprire e continuare un Q&A | Campo domanda disponibile; elenco discussioni bloccante da tastiera | E04–E05 |
| 5 | Fare domande sull’intero corso | Criticità: campo domanda fuori vista nelle risposte lunghe | E06–E07 |
| 6 | Uscire, continuare o fare pausa | Criticità di focus e ingrandimento; scelta di blocco da riesaminare | E08–E09 |
| 7 | Scegliere un sottofondo | Accesso migliorato; pausa e volume troppo lontani dal punto d’ingresso | E10 |
| 8 | Catturare un’attività in Memo | Gerarchia migliorata; testo troppo compresso nelle finestre strette | E11–E12 |
| 9 | Esportare il materiale | Buona selezione esplicita e recupero dall’annullamento | E13 |
| 10 | Configurare strumenti e consultare statistiche | Organizzazione utile; copertura visuale parziale | E14–E15 |

## Cosa conservare

1. **La lettura come area centrale del prodotto.** Affiancare il PDF e ancorare una domanda a un passaggio evita di ricostruire il contesto altrove. Divisori da tastiera, zoom separati e ripresa della posizione sono capacità già presenti, da rendere più riconoscibili.
2. **L’identità verde e la codifica dei corsi.** Danno continuità e riconoscibilità. Le sigle accompagnano i colori: il corso non dipende soltanto dal colore.
3. **Le distinzioni fra fonti, deduzioni e integrazione generale.** Sono una buona base di fiducia, anche se l’ambito del corso e la copertura devono risultare più evidenti.
4. **Le modifiche recenti a Musica e Memo.** Musica resta raggiungibile con liste lunghe; Memo distingue gruppi, azioni e inserimento. Non sono problemi ancora da implementare: D-0387 e le nuove catture ne confermano la presenza.
5. **I messaggi che spiegano il recupero.** L’esportazione conserva la selezione dopo un salvataggio annullato; il Q&A ripristina la bozza dopo un invio fallito; il pannello pipeline distingue fasi e problemi. Va mantenuta questa precisione.

## Rilievi prioritari

P1 = accesso o attività principale compromessi, oppure ambito di un’azione AI ambiguo. P2 = attrito ripetuto o chiarezza insufficiente. Sforzo relativo: S piccolo, M medio; non sono preventivi e non includono tutti i collaudi.

| ID | Priorità | Rilievo | Evidenza | Sforzo |
|---|---|---|---|---|
| U01 | P1 | Le discussioni Q&A non sono raggiungibili da tastiera nell’elenco | DOM + codice, E04 | S |
| U02 | P1 | Focus Lock lascia uscire il focus dietro la finestra e manca di nome accessibile esplicito | Input nativo + DOM, E08 | M |
| U03 | P1 | Focus Lock perde contenuti con zoom generale al 200% | Misure + E09 | M |
| U04 | P1 | Contrasto insufficiente nei metadati e nel pulsante principale di Focus Lock | Colori CSS + E01/E08 | S |
| U05 | P1 | La chat di corso nasconde il campo domanda durante la lettura di risposte lunghe | Misure + E06/E07 | M |
| U06 | P1 | “Elabora tutto” non esplicita che l’ambito resta l’archivio anche sotto un filtro corso | Catena UI→backend | S/M |
| U07 | P2 | Navigazione a icone e parole incoerenti richiedono memoria | E01/E11 + codice | M |
| U08 | P2 | Le barre di Focus e Q&A competono con il contenuto e ripetono la chiusura | E03/E05 | M |
| U09 | P2 | Ambito del corso e significato di “non trovato” poco evidenti | Allegato chat + E06 | M |
| U10 | P2 | In Musica, gerarchia di Casuale e posizione del player ostacolano il controllo rapido | E10 + CSS | M |
| U11 | P2 | Memo comprime troppo il testo delle attività nelle finestre strette | E11/E12 + codice | M |
| U12 | P2 | Il clic su una lezione può aspettare 500 ms per distinguersi dal doppio clic | Codice, E01 | S/M |
| U13 | P2 | Nel Q&A etichette e annuncio degli errori richiedono completamento | DOM + codice, E05 | S |

### U01 — Rendere operabile l’elenco Q&A

**Confermato:** `.qna-thread-summary` è un `div` con `onClick`, senza ruolo, `tabIndex` o gestione dei tasti. Nel probe ha `tabIndex=-1` e non riceve nemmeno il focus programmatico. Il problema riguarda la scelta di una discussione dall’elenco; non tutte le funzioni Q&A.

**Proposta:** usare un pulsante reale per ogni discussione, con un nome derivato dal passaggio e un’indicazione dello stato selezionato. Conservare layout e dati.

**Accettazione:** con il solo Tab si raggiunge ogni discussione; Invio e Spazio la aprono; tornando all’elenco il focus resta sul punto di provenienza. Riferimento: [W3C, accesso da tastiera](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

### U02–U03 — Rendere affidabile Focus Lock prima di rifinirlo

**Confermato in isolamento:** il focus iniziale va correttamente su Continua, ma Maiusc+Tab raggiunge un pulsante sintetico sottostante; `aria-modal` da solo non impedisce questo comportamento. Il contenitore ha `role="dialog"` senza `aria-label` o `aria-labelledby`. Non ho collaudato NVDA o l’intero albero delle tecnologie assistive nell’app installata.

A 900×640 il riquadro misura circa 480×650 CSS pixel: supera già leggermente l’altezza. Con zoom 200%, viewport effettiva 450×320, il riquadro è alto circa 668 pixel e comincia a y≈−174. Titolo e uscita restano fuori vista; il contenitore non offre uno scorrimento dedicato adeguato. E09 mostra il ritaglio reale: è l’evidenza del difetto, non un’immagine tagliata dal report.

**Proposta tecnica:** nome associato al titolo, ciclo Tab/Maiusc+Tab interno, contenuto sottostante inerte, ripristino del focus e finestra con altezza massima e scorrimento accessibile. Riutilizzare il modello già presente in Musica/chat di corso, verificandolo per questo caso. [W3C, dialogo modale](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

**Scelta di prodotto separata:** Esc riporta allo studio anche dopo il countdown; non significa “chiudi”. I 15 secondi obbligatori e la forte enfasi su Continua possono aiutare chi desidera un impegno preventivo, ma ostacolano un’uscita intenzionale. Valutare un blocco esplicitamente configurabile e spiegare “Esc: torna allo studio”. Non rimuovere automaticamente la funzione richiesta in precedenza.

**Accettazione:** tutti i comandi raggiungibili a 900×640 e zoom 100/200%; nessun focus dietro la finestra; timer fermo come oggi; pausa e uscita mantengono tempi e posizione. Le prove al 200% individuano un problema concreto, ma non equivalgono al collaudo completo del [reflow WCAG](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### U04 — Aumentare il contrasto dove serve

Rapporti calcolati dai colori del sorgente, non stimati a occhio dai PNG:

| Elemento | Colori | Rapporto | Valutazione |
|---|---|---|---|
| Metadati elenco sul fondo normale | `#8fa099` / `#f9fbf9` | 2,64:1 | Insufficiente per testo piccolo |
| Metadati elenco sul fondo hover | `#8fa099` / `#f4faf6` | 2,59:1 | Insufficiente |
| Continua in Focus Lock, estremi del gradiente | bianco / `#10b981` e `#059669` | 2,54:1–3,77:1 | Insufficiente per il testo CSS da 15 px |
| Testo secondario standard su bianco | `#697a73` / bianco | 4,53:1 | Supera appena la soglia; non va schiarito |
| Testo principale sul contenuto | `#18211f` / `#f9fbf9` | 15,83:1 | Buon margine |

**Proposta:** token per testo secondario informativo più scuro nel tema chiaro e fondo del pulsante Continua più scuro. Evitare un cambiamento indiscriminato dell’intera palette. Per testo normale il riferimento è 4,5:1; per testo grande 3:1, con le eccezioni previste. [W3C, contrasto minimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Accettazione:** verificare colori computati in entrambi i temi, hover, focus e stato attivo. Le misure sui token non certificano ogni combinazione dell’interfaccia.

### U05 — Tenere la domanda disponibile nella chat di corso

**Confermato:** messaggi, conteggio e modulo domanda condividono `.course-chat-messages`, che scorre interamente. Nella prova con risposta lunga, il campo inizia a y=1751 in una viewport alta 820; lo scroller visibile è alto circa 644 pixel e il contenuto 1814. Per rispondere bisogna lasciare il passaggio che si sta leggendo e andare in fondo.

**Proposta:** storico con scorrimento proprio e area di composizione separata, come nel Q&A laterale. Spostare “Conteggio completo nelle trascrizioni” in uno strumento espandibile della chat; mantenere la sua utilità senza interporlo sempre fra risposta e nuova domanda. Contenere anche la larghezza della prosa su monitor grandi.

**Accettazione:** con almeno 20 messaggi e una risposta lunga, domanda e Invio sono disponibili senza scorrere lo storico fino in fondo; citazioni, bozze, fonti e PDF conservano il comportamento attuale. A finestra bassa la composizione non deve sottrarre tutto lo spazio alla lettura.

### U06 — Esplicitare l’ambito prima dell’avvio AI

**Confermato nel codice:** il pulsante è nell’intestazione della lista filtrata, ma `App` chiama `startPipeline()` senza corso o ID; `ArchiveService.startArchivePipeline()` avvia il piano manuale senza `lectureIds`. Il pianificatore considera l’archivio. Un filtro di lettura non diventa un filtro di elaborazione.

**Proposta minima:** “Elabora archivio” e indicazione chiara delle fasi mancanti e dell’invio a Gemini. Soluzione più ampia da concordare: selezione esplicita “corso attuale / archivio” con riepilogo dei lavori. Non serve una conferma ripetitiva per ogni azione: il punto è rendere l’ambito leggibile prima del clic. Mantenere avvio esplicito, tracciabilità e ripresa.

**Accettazione:** una lista limitata al corso A non induce a credere che la pipeline escluda B; il riepilogo e l’esecuzione indicano lo stesso insieme. Non è stata avviata una pipeline reale durante l’audit.

### U07–U08 — Ridurre memoria e rumore nei comandi

**Osservato:** l’archivio ha una barra con registratore, chat, puntina, log e impostazioni; i tooltip e vari `aria-label` esistono, quindi non sono icone completamente prive di nome. Tuttavia il nome non è visibile prima di esplorarle. “Memo”, “Note rapide”, “Brain Dump” e “Catture rapide” denominano superfici strettamente collegate. “Sync” non chiarisce immediatamente che si sincronizzano cartelle.

**Proposta:** adottare nomi coerenti, per esempio Memo ovunque; etichette visibili per gli accessi frequenti, diagnostica in una posizione secondaria e “Aggiorna cartelle” se descrive esattamente l’azione. Conservare le scorciatoie.

In Focus convivono più zoom, azioni di lettura, ricalcolo della stima, timer, lingua e tre colonne con scorrimento. Nel Q&A compaiono sia “Chiudi domanda” sia una X interna; altre X riguardano PDF o Focus. Il ricalcolo appare con stile da pulsante nativo, diverso dai controlli vicini.

**Proposta:** assegnare a ciascun pannello un’intestazione compatta e una sola chiusura primaria; nominare il destinatario dello zoom e raggruppare opzioni meno frequenti. Mantenere subito disponibili ritorno al testo, lingua e domanda. Non eliminare i divisori: hanno già supporto da tastiera.

**Accettazione:** a 900/1280 pixel e con titoli lunghi nessuna azione essenziale scompare; chiudi Q&A non viene confuso con esci da Focus; le icone non sono l’unico modo per riconoscere i compiti principali. L’effetto sui nuovi utenti rimane da misurare.

### U09 — Mostrare meglio corso, copertura e grado di certezza

**Osservato negli allegati:** il corso è identificato soprattutto dalla sigla nel selettore; il conteggio delle fonti è separato; risposta, deduzione e integrazione generale hanno titoli ma un trattamento visivo molto simile. Il mancato ritrovamento di un concetto può essere letto come assenza dall’intero corso.

**Proposta:** intestazione con nome completo del corso, sintesi delle fonti disponibili e collegamento alle lacune; citazioni vicine alle affermazioni supportate; “Non trovato nelle fonti consultate” come formulazione prudente quando appropriato. Distinguere l’integrazione generale con etichetta e raggruppamento sobri, senza affidarsi solo al colore. Rendere più riconoscibile il conteggio esatto locale come verifica diversa dalla risposta AI.

**Limite:** non ho verificato la correttezza della risposta personale, la completezza del corpus o la qualità del recupero. Il rilievo riguarda la presentazione dell’ambito e della certezza, non dimostra un errore del modello.

### U10 — Dare priorità al controllo della musica in corso

**Osservato:** Casuale è la barra più vistosa, verde acceso e larga quanto il contenuto; dissolvenza e avviso occupano la parte alta. Licenza e formato sono ripetuti su tutte le carte. Il brano attivo ha un buon contorno e un’etichetta esplicita.

**Confermato nel layout:** `.ambient-player-bar` segue le due griglie nel normale scorrimento; non è fissata al bordo della finestra. Con 16 suoni, pausa generale e volume possono richiedere di scendere sotto il catalogo. Il limite dei passaggi tra servizi è spiegato, ma rimane un compito a carico dell’utente.

**Proposta:** player sempre raggiungibile, riepilogo del suono attivo anche dal pulsante Musica, Casuale come comando compatto “Riproduci un suono casuale”, dissolvenza nelle preferenze o in un gruppo secondario. Conservare crediti e licenze, riducendo la ripetizione nel percorso di scelta. Non promettere uno stop automatico dei servizi esterni senza verificarne le API.

**Accettazione:** pausa e volume accessibili dall’inizio e dalla fine della lista, con tastiera e finestra bassa; stato distinto fra in riproduzione, in pausa e interruzione dovuta all’audio della lezione.

### U11 — In Memo proteggere il contenuto prima dei controlli per riga

**Osservato:** a finestra ampia gruppi, Copia gruppo e inserimento sono chiari. A circa 390 CSS pixel, titolo dell’attività, menu gruppo e cancellazione condividono una riga troppo stretta: il testo si riduce a poche parole. È una prova di robustezza del componente, non una dichiarazione di supporto mobile dell’app desktop.

L’anteprima estesa esiste e il testo è disponibile nel campo; non si tratta di perdita dei dati. L’anteprima si attiva però dopo sosta del puntatore, mentre lettura e modifica usano altre convenzioni (doppio clic, F2/Invio).

**Proposta:** due righe leggibili per l’attività quando manca spazio, azioni e gruppo su una seconda riga o in un menu; comando esplicito per espandere e modificare accessibile anche da tastiera. Conservare copia per gruppo e raccolta “Tutti”.

**Accettazione:** il significato di un’attività lunga è recuperabile senza hover e senza dover entrare in modifica; Enter, Esc e completamento restano prevedibili; il testo conserva spazio utile anche a 900 pixel con zoom ingrandito.

### U12–U13 — Piccole incoerenze che pesano nell’uso ripetuto

**Confermato nel codice:** con rinomina abilitata, il clic singolo su una lezione aspetta un timeout di 500 ms per distinguere il doppio clic; Invio apre subito. È un ritardo deliberato dell’interazione, non una prestazione del backend misurata.

**Proposta U12:** rendere evidente Rinomina tramite menu/F2 e valutare se il doppio clic debba ancora ritardare l’apertura principale. Conservare la possibilità di rinomina e verificare che non si apra una lezione durante la modifica.

**Confermato nel Q&A:** la textarea ha placeholder ma nessuna label esplicita associata; la freccia indietro ha soltanto il simbolo e l’errore usa un `div` senza `role="alert"` o regione live. Non significa che ogni lettore di schermo li ignori: manca un contratto semantico stabile e collaudato.

**Proposta U13:** nome stabile per la domanda, “Torna alle discussioni” per la freccia, annuncio degli errori senza spostare il focus; rendere chiaro come riprovare usando la bozza ripristinata. La generazione ha già un’area di stato: estendere quel modello al fallimento.

**Accettazione:** provare con tastiera e NVDA nomi, ordine, generazione, fallimento e nuovo invio. Non far annunciare l’intero streaming a ogni frammento.

## Direzione visiva proposta

Conservare l’aspetto di un quaderno tecnico: testo centrale, verde per orientare e confermare, superfici calme. Le dimensioni dei titoli devono aiutare a distinguere contenuto e struttura; riquadri, emoji e bordi non devono assumere tutti lo stesso peso.

- Un vocabolario unico per Memo, domanda sulla lezione e chat del corso.
- Tre livelli coerenti di azione: principale, secondaria, opzioni. Usare i componenti esistenti prima di introdurre nuove librerie.
- Contrasto dei metadati adeguato e un’unica scala per testo di interfaccia e aiuti. Non cambiare font soltanto per rendere l’app “nuova”.
- Stati con testo e forma oltre al colore. I simboli di studio già distinguono vuoto, metà e spunta: il problema è la comprensione immediata, non una dipendenza esclusiva dal colore.
- Specificare il significato dei valori percentuali: zoom del pannello, tempo stimato e avanzamento non devono richiedere interpretazione.

## Ordine consigliato degli interventi

Questa era la proposta per la revisione UX alla consegna del 21 ottobre:
non modificava la coda né autorizzava implementazioni. Dal 22 ottobre i rilievi
sono inclusi nella Coda LISTA_ORDINE con l'ordine per facilità indicato sopra;
la seguente sequenza conserva la raccomandazione originale per impatto UX.

1. **Accesso e leggibilità:** U01–U04 e U13. Correggere i difetti dimostrati, poi verificare tastiera, NVDA, entrambi i temi e zoom.
2. **Continuità e ambito:** U05–U06. Campo domanda sempre raggiungibile e ambito AI esplicito prima dell’avvio.
3. **Uso quotidiano:** U07–U12. Un prototipo contenuto della barra Focus, della chat e del player; confronto a identiche dimensioni e stati prima di integrare.

Per la prima verifica con utenti proporrei cinque compiti: trovare una lezione e aprirla, sapere cosa invierà Elabora, continuare una chat lunga, mettere in pausa il sottofondo e uscire da Focus. Osservare successo, esitazioni e azioni correttive; definire una misura iniziale prima di promettere una percentuale di miglioramento.

## Controlli eseguiti e limiti residui

- Suite Electron `tools/run_hook_regressions.cjs --interface-polish-only`: **PASS**.
- Suite Electron completa `tools/run_hook_regressions.cjs`: **PASS**, inclusa ripresa della lettura dopo riavvio del processo.
- Probe locale `local-artifacts/ux-audit-2026-10-21/run-probe.cjs`: **PASS dell’esecuzione**; gli esiti diagnostici registrano i difetti descritti. “PASS” non significa che l’accessibilità sia conforme.
- Rapporti di contrasto calcolati con luminanza relativa sRGB e colori del sorgente.
- Report HTML renderizzato e ispezionato in Electron a larghezza ampia e 640 CSS pixel: 10 collegamenti dell’indice validi, 15 immagini locali presenti e nessun allargamento orizzontale della pagina. Il tentativo di anteprima via server locale non era raggiungibile dal browser integrato; la versione HTML viene consegnata come file locale, senza dipendere da quel server.
- Ispezione visuale delle immagini selezionate sotto. Le prime catture del probe con animazione incompleta e zoom ereditato sono state rifiutate e sostituite; il probe finale azzera lo zoom prima delle misure.

Il primo avvio Electron nel sandbox terminava senza schermate; le acquisizioni riuscite usano l’esecuzione locale autorizzata, sempre con profili sintetici. Non sono stati modificati sorgenti dell’app, configurazioni o installer. Non è stata eseguita nuovamente l’intera catena `npm run check`: il lavoro è un audit documentale e i controlli funzionali citati sono quelli sopra.

Non verificati: NVDA e albero accessibile completo, navigazione solo tastiera di ogni finestra, sistemi ad alto contrasto, movimento ridotto globale, tutte le combinazioni di zoom, primo avvio completo dell’app installata, recupero da ogni errore, prestazioni con archivi reali molto grandi, hardware e servizi esterni. I target piccoli e i divisori richiedono misure di area e spaziatura prima di dichiarare una violazione: il riferimento W3C prevede [24×24 CSS pixel ed eccezioni](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Non è una certificazione WCAG né un giudizio legale.

## Atlante delle evidenze

Le immagini sono locali e cliccabili nel report HTML. Gli allegati personali non sono copiati in cartelle versionate. Le immagini di componenti isolati non vanno confuse con schermate complete dell’app.

### E01 — Archivio, allegato utente — passo 1

![E01 Archivio: buona gerarchia dei titoli, metadati tenui e barra di icone](../../local-artifacts/ux-audit-2026-10-21/01-archivio-utente.png)

### E02 — Import video, dati sintetici — passo 2

![E02 Import video: destinazione, data e azione finale esplicite](../../local-artifacts/ux-audit-2026-10-21/captures/destination-light.png)

### E03 — Focus, allegato utente — passo 3

![E03 Focus con slide, testo e domanda: più barre e zoom concorrenti](../../local-artifacts/ux-audit-2026-10-21/05-focus-qna-utente.png)

### E04 — Elenco Q&A, componente reale con dati sintetici — passo 4

![E04 La carta della discussione è cliccabile ma non raggiungibile da tastiera](../../local-artifacts/ux-audit-2026-10-21/captures/07-qna-elenco-tastiera.png)

### E05 — Discussione Q&A, componente reale nel contenitore Focus — passo 4

![E05 Il campo domanda resta disponibile sotto lo storico](../../local-artifacts/ux-audit-2026-10-21/captures/08-qna-discussione.png)

### E06 — Chat del corso con risposta lunga sintetica — passo 5

![E06 La risposta riempie la chat e il campo domanda non è visibile](../../local-artifacts/ux-audit-2026-10-21/captures/09-chat-corso-risposta-lunga.png)

### E07 — Stessa chat, dopo scorrimento in fondo — passo 5

![E07 Il campo domanda si trova dopo risposta e modulo di conteggio](../../local-artifacts/ux-audit-2026-10-21/captures/10-chat-corso-composizione.png)

### E08 — Focus Lock a 900×640, componente reale — passo 6

![E08 Il riquadro eccede leggermente l’altezza disponibile; il probe verifica anche la fuga del focus](../../local-artifacts/ux-audit-2026-10-21/captures/06-focus-lock-900x640.png)

### E09 — Focus Lock, stessa finestra con zoom generale 200% — passo 6

![E09 A zoom 200% parti del dialogo restano fuori dalla viewport](../../local-artifacts/ux-audit-2026-10-21/captures/06b-focus-lock-zoom200.png)

### E10 — Musica e suoni, dialogo completo con stato sintetico — passo 7

![E10 Catalogo suoni: Casuale dominante e player sotto le griglie](../../local-artifacts/ux-audit-2026-10-21/captures/sounds-light.png)

### E11 — Memo, dati sintetici — passo 8

![E11 Memo con gruppi, copia, attività e note separati](../../local-artifacts/ux-audit-2026-10-21/captures/polish-memo-light.png)

### E12 — Memo, componente in finestra stretta — passo 8

![E12 I controlli per riga comprimono molto il testo dell’attività](../../local-artifacts/ux-audit-2026-10-21/captures/polish-memo-narrow.png)

### E13 — Esportazione, stato dopo annullamento del salvataggio — passo 9

![E13 L’esportazione conserva la selezione e spiega l’annullamento](../../local-artifacts/ux-audit-2026-10-21/captures/export-light.png)

### E14 — Impostazioni Musica, stato sintetico — passo 10

![E14 Sezioni Impostazioni e distinzione delle configurazioni musicali](../../local-artifacts/ux-audit-2026-10-21/captures/tools-settings-music.png)

### E15 — Statistiche, vista scorsa ai corsi e dati sintetici — passo 10

![E15 Distinzione fra avanzamento di studio e stato dei materiali](../../local-artifacts/ux-audit-2026-10-21/captures/dashboard-light.png)

## Riferimenti per intervenire

- Archivio, clic e comandi: `src/components/LectureList.tsx`, `src/components/Sidebar.tsx`.
- Avvio AI: `src/App.tsx`, `src/hooks/useArchivePipeline.ts`, `electron/main/archive.ts`, `electron/main/ai/archivePipeline.ts`.
- Focus e Q&A: `src/components/FocusLockModal.tsx`, `FocusWorkspace.tsx`, `QnaSidebar.tsx`, `PaneDivider.tsx`, `src/qna.css` e `src/styles.css`.
- Chat di corso: `src/components/CourseChat.tsx` e blocco `.course-chat` in `src/styles.css`.
- Musica: `src/components/MusicButton.tsx`, `AmbientSoundPanel.tsx`, `music.css`.
- Memo: `src/components/QuickCaptureOverlay.tsx`, `MemoTodoText.tsx`, `MemoActivityPreview.tsx`, `memo.css`.
- Decisioni e stato precedenti: D-0383, D-0385, D-0387, D-0388; `docs/product/orari-musica-memo-2026-10-21.md` e `docs/product/interventi-2026-10-21.md`.

Decisione di consegna dell’audit: D-0389, senza modifiche al backlog in quella
sessione. Successiva inclusione di tutti i rilievi nella pianificazione:
D-0390, 22 ottobre. Implementazione successiva dei tredici interventi:
D-0391/D-0392; dettagli e limiti nel report del 22 ottobre collegato sopra.
