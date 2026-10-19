# Lara di Translated — valutazione del 16 ottobre 2026

Ricerca della posizione 17 di LISTA_ORDINE, voce prodotto 35. Solo lettura di
fonti ufficiali: nessun account creato, chiave letta, testo inviato a tradurre,
modello scaricato o provider integrato. La voce richiede una valutazione, non
autorizza già una nuova modalità online.

## Esito per Lezionify

Lara è un candidato online per un futuro confronto di qualità, ma **non è
dimostrata una disponibilità gratuita locale/offline né una latenza migliore
di Bergamot sul PC**. Il servizio API ha una quota gratuita mensile piccola;
non va confusa con il plafond web o con un'offerta pilota una tantum. Il dato
promozionale più rapido riguarda una variante diversa, da richiedere alle
vendite. Le incongruenze documentali sotto richiedono una verifica prima di
un eventuale pilota: non serve cambiare ora il motore dell'app.

## Identità e disponibilità

Il nome ufficiale è **Lara 3**, terza generazione del modello di traduzione di
Translated. L'annuncio è datato **30 luglio 2026** e all'epoca indicava accesso
a partner selezionati, con apertura pubblica prevista nelle settimane
successive. Non prova da solo l'attivazione sul piano personale alla data
di questa ricerca. [Annuncio Translated](https://translated.com/introducing-lara-3).

La documentazione API attuale presenta **Base** come default e **Think** come
opzione SDK; **Flash** e **Batch** richiedono contatto commerciale. Il listino
usa invece **Standard**, Think e Prosa. Non è stato trovato un identificativo
versionato selezionabile `lara-3`, né una corrispondenza esplicita tra Lara 3,
Base e Standard. Non chiamare quindi una futura prova Free «benchmark di
Lara 3» senza conferma del modello effettivamente servito.
[Modelli API](https://developers.laratranslate.com/docs/translation-api),
[listino API](https://developers.laratranslate.com/docs/pricing-page).

Controllo aggiuntivo nel sorgente SDK Node, revisione
`e59ecc0938b9828b20513fe67cba77a1fed48bbe`: `TranslateOptions` espone
`reasoning`, senza un selettore di versione `lara-3` individuato nel file.
Questo limita quanto è dichiarabile sul client consultato; non certifica la
versione del servizio remoto.
[translator.ts](https://github.com/translated/lara-node/blob/e59ecc0938b9828b20513fe67cba77a1fed48bbe/src/translator.ts).

| Modalità | Riscontro verificato | Gratuità e limiti | Conseguenza |
| --- | --- | --- | --- |
| Locale/offline sul PC | Nessun pacchetto di pesi, istruzione di inferenza autonoma o licenza dei pesi individuati nelle fonti ufficiali consultate | Non accertata; requisiti RAM/VRAM non pubblicati per uso autonomo | Non può sostituire il requisito offline di Bergamot sulla base di questa ricerca |
| Web/app ospitata | Servizio Lara Translate; piano Free | 60.000 caratteri/mese nel pool applicativo; nessun extra nel Free | Utilizzo manuale separato; non attribuire questo plafond all'API |
| API/SDK | SDK ufficiale Node e altri linguaggi, access key ID e secret; REST a basso livello su richiesta | Free 10.000 caratteri/mese, distinto dal pool web | Candidatura per invio online esplicito; nessun fallback automatico |
| Enterprise/on-premises | Translated menziona opzioni on-premise in una pagina generale sui flussi conformi | Prezzo, condizioni, hardware e disponibilità specifica di Lara 3 non verificati | Non equivale a pesi gratuiti o installazione sul portatile |

Fonti della tabella: [piani web](https://app.laratranslate.com/pricing),
[pool app e API separati](https://support.laratranslate.com/en/character-pool-extra-usage-and-additional-costs),
[SDK Node ufficiale](https://github.com/translated/lara-node),
[integrazione API](https://developers.laratranslate.com/docs/translation-api),
[offerta generale Translated](https://translated.com/resources/compliance-in-translation-meeting-regulatory-requirements).
L'assenza di pesi è un risultato della ricerca, non una prova che nessun
accordo commerciale privato possa esistere.

L'SDK Node è MIT: questa licenza riguarda il client. Il repository ufficiale
`lara-3-wmt25-translations` pubblica **output di traduzione**, con licenza
CC BY 4.0 per tali output e MIT per codice/documentazione; non contiene un
modello locale distribuibile.
[SDK](https://github.com/translated/lara-node),
[dataset ufficiale e licenze](https://github.com/translated/lara-3-wmt25-translations).

## Costi: ricorrente e pilota sono distinti

La quota API Free è **10.000 caratteri sorgente al mese**, condivisa fra
traduzione testuale e identificazione della lingua. Per Standard il listino
indica **€20/milione** con Pro e **€15/milione** con Team; Think non è Free e
costa rispettivamente €2.000/€1.500 per milione. Il costo della sottoscrizione
è distinto dall'uso API. Sono tariffe pubblicate, non un preventivo per
l'account dell'utente.
[Listino sviluppatori](https://developers.laratranslate.com/docs/pricing-page),
[accesso e costo aggiuntivo API](https://support.laratranslate.com/en/accessing-laras-api).

La pagina commerciale offre anche **500.000 caratteri una tantum tramite
Contact Sales**, separati dai 10.000 mensili: non considerarli gratuità
continuativa. La stessa pagina presenta formule commerciali generali che
non chiariscono univocamente ogni costo di piattaforma; verificare il piano
effettivo nel contratto/account prima di qualsiasi spesa.
[Offerta API e Developer Pilot](https://laratranslate.com/adaptive-translation-api).

**Inferenza di capacità:** a 200 caratteri per frase e senza rilevamento lingua
separato, retry o altri usi, 10.000 caratteri coprono circa **50 traduzioni al
mese**. Non è una quota per uso intenso quotidiano. «Mensile ricorrente» non
significa «garantito per sempre»: i termini consentono di modificare o
interrompere il piano Free.
[Termini §2.5](https://laratranslate.com/terms-and-conditions).

## Privacy e condizioni da risolvere prima di una prova

Le FAQ API dichiarano **Learning Mode di default** e contenuti utilizzabili
per migliorare il modello; indicano `noTrace: true` per Incognito.
[FAQ API](https://developers.laratranslate.com/docs/translation-api).
I termini precisano: Learning conserva i contenuti finché necessari, senza
un numero fisso di giorni; Incognito li elabora temporaneamente in memoria e
li scarta dopo la traduzione. La cancellazione dei dati conservati si richiede
al supporto. [Termini §4.2, §4.3, §4.7](https://laratranslate.com/terms-and-conditions).

**Divergenza esplicita:** la pagina commerciale afferma invece che i dati non
addestrano modelli pubblici. Non equiparare questa frase a zero conservazione
o a nessun miglioramento del modello. Per Lezionify l'eventuale pilota dovrà
richiedere Incognito e verificarne il parametro nella versione SDK scelta:
la pagina Translate Text alterna `no_trace` e `noTrace` negli esempi.
[Pagina commerciale](https://laratranslate.com/adaptive-translation-api),
[opzioni ed esempi SDK](https://developers.laratranslate.com/docs/translate-text).
Nel sorgente Node verificato l'opzione è **`noTrace`** e imposta l'header
`X-No-Trace: true`; non copiare l'esempio TypeScript `no_trace` senza verifica.
[Implementazione SDK](https://github.com/translated/lara-node/blob/e59ecc0938b9828b20513fe67cba77a1fed48bbe/src/translator.ts).

I termini §3.2 limitano inoltre automazione dell'interfaccia, querying
sistematico per inferire prestazioni e uso degli output come dati di
valutazione/riferimento per altri prodotti o modelli. Prima di un benchmark
automatizzato comparativo, chiarire con il fornitore se il protocollo è
consentito. Non si tratta di una conclusione legale, ma di una condizione
testuale rilevante al metodo proposto.
[Termini §3.2](https://laratranslate.com/terms-and-conditions).

## Qualità EN ↔ IT: cosa dimostrano le fonti

EN e IT sono supportati nelle due direzioni; la documentazione elenca per
esempio `en-US`, `en-GB` e `it-IT`.
[Lingue SDK](https://developers.laratranslate.com/docs/supported-languages),
[coppie to/from English](https://blog.laratranslate.com/lara-translate-supported-languages/).

Il dataset ufficiale Lara 3 contiene **34.110 coppie** su contenuti selezionati
WMT25, con inglese sorgente e 11 lingue di base, italiano incluso. Descrive
valutazione umana cieca con tre revisori e approvazione a maggioranza.
Il README precisa che è **una valutazione Translated su contenuti WMT25
selezionati, non la classifica ufficiale WMT25**. La licenza degli output non
è una licenza dei pesi. Non dimostra qualità IT→EN, conservazione delle
formule nelle dispense o latenza interattiva di Lezionify.
[Dataset e metodologia](https://github.com/translated/lara-3-wmt25-translations).

L'annuncio rivendica risultati superiori in valutazioni generali e di
localizzazione tecnica/finanziaria. Sono risultati del produttore, non una
misura sui nostri casi di autovalori, dualità, puntatori, negazioni e LaTeX.
[Annuncio](https://translated.com/introducing-lara-3).

## Latenza: nessun vantaggio accertato su Bergamot

| Dato | Provenienza e limiti |
| --- | --- |
| Lara Flash: mediana 50 ms | Claim ufficiale, variante per grandi volumi da richiedere; non specifica qui corpus, direzioni, rete, regione, piano e percentili. Non trasferibile al Free Standard/Base. [API](https://developers.laratranslate.com/docs/translation-api) |
| Lara 3: workflow oltre 23 volte più veloce di Fable 5 | Rapporto dichiarato dal produttore su altro workflow; nessun tempo end-to-end di frase breve EN↔IT ricavabile. [Annuncio](https://translated.com/introducing-lara-3) |
| Think: fino a 10 volte più tempo di elaborazione | Avvertenza della documentazione; non misura sul nostro PC. [Translate Text](https://developers.laratranslate.com/docs/translate-text) |
| Free: 1.000 caratteri/s; paid: 10.000 caratteri/s | Limiti di throughput/consumo, non tempi di risposta: dividere la lunghezza per questo valore non stima la latenza. [Rate limits](https://support.laratranslate.com/en/api-rate-limits) |
| Bergamot WASM beam1 caldo EN→IT: mediana 134 ms, p95 295 ms; IT→EN: 85/189 ms | Misure locali già presenti: 24 richieste per direzione/configurazione nei giri 1 e 2, giro iniziale escluso. Prima richiesta 600/520 ms comprensiva di caricamento; inizializzazione worker 210 ms. [Pilota offline](traduzione-frasi-offline-2026-10-13.md) |

**Non verificato:** mediana/p95 end-to-end del Lara effettivamente accessibile
all'utente, per 50–200 caratteri tecnici, in entrambe le direzioni. Non sono
state fatte chiamate per misurarlo. La UI Bergamot attuale aggiunge un debounce
di 500 ms: distinguere tempo del motore da attesa dell'interfaccia e non
confrontare il secondo con il solo tempo API.

## Piano minimo per una futura prova autorizzata

1. Chiarire i termini del confronto e l'identità/versione del modello servito;
   verificare accesso Free, residuo quota e corretta attivazione Incognito.
2. Riutilizzare `tests/fixtures/offline-translation/cases.json`: 24 casi
   sintetici, 12 per direzione, senza dati personali. Il precedente pilota
   online conta 1.982 caratteri complessivi; ricalcolare dal file al momento
   dell'esecuzione. Riferimento: [ricerca API precedente](traduzione-api-valutazione-2026-10-13.md).
3. Prima passata 24 richieste seriali, senza lingua automatica, memoria,
   glossario o ragionamento. Nessun retry implicito; stop a errore/quota.
   Budget massimo proposto 8.000 caratteri, subordinato al residuo effettivo.
4. Se consentite e utili, altre due passate: circa 5.946 caratteri in totale.
   Registrare separatamente prima richiesta e richieste successive; stessa
   rete, regione, piano, SDK e opzioni annotati. Tre passate non certificano
   una distribuzione stabile o l'assenza di cache lato server.
5. Cronometrare dal dispatch alla risposta completa, includendo rete e SDK;
   separare eventuali tempi server. Riportare mediana, p95 e massimo per
   direzione, errori, timeout e conteggio caratteri; separare qualsiasi attesa
   della UI. Non aggregare un intero array di frasi per simulare 24 risposte
   interattive: gli array SDK sono previsti per segmenti collegati nel contesto.
   [Contratto Translate Text](https://developers.laratranslate.com/docs/translate-text).
6. Revisione manuale indipendente contro i campi `check`: significato, termini,
   negazioni, necessario/sufficiente, numeri, integrità esatta formule/codice.
   Non usare Lara come riferimento per validare o addestrare Bergamot.
   Usare le fixture esistenti per entrambi, non gli output dell'uno come
   ground truth dell'altro; mantenere la verifica contrattuale del punto 1.

Nessuna soglia di accettazione di qualità o velocità è stata approvata in
questa ricerca. Un eventuale risultato migliore giustificherebbe una proposta
di integrazione online esplicita, non un cambio automatico dell'offline.

## Stato finale della ricerca

**Fatti verificati:** identità ufficiale, servizio web/API e SDK, quota mensile
Free distinta dal pilota, lingue, licenza del client e dei dati, modalità dati,
claim prestazionali con limiti dichiarati. **Inferenze:** quota indicativa di
50 frasi/mese e opportunità di un pilota. **Non verificati:** pesi/runtime
locali, offerta Lara 3 on-premise concreta, versione servita al Free,
prestazioni reali sul PC e qualità delle 24 fixture. La ricerca è conclusa;
benchmark e integrazione non sono stati eseguiti.
