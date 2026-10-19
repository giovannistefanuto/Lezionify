# Traduzione EN ↔ IT via API — valutazione del 13 ottobre 2026

## Conclusione

**Vale la pena provare Azure Translator F0 come opzione online esplicita**,
affiancata alla ricerca offline. Il motivo principale è verificare una migliore
qualità tecnica e ridurre il peso di modelli/runtime da distribuire; non è
dimostrato un vantaggio di velocità rispetto ai piloti locali da circa 0,1 s.
Google Cloud Translation NMT è la seconda alternativa. MyMemory è semplice
da provare, ma non risolve tutti gli errori tecnici e ha condizioni sui dati
meno adatte a farne il servizio principale per materiale di studio.

Questa è una candidatura per un confronto, **non una scelta definitiva del
provider né un cambio del requisito offline**. L'utente ha proposto di valutare
le API; non ha chiesto di eliminare la funzione offline. Restano escluse le
spiegazioni: l'obiettivo è solo traduzione EN ↔ IT.

Riferimento: [tre piloti offline e piano della funzione](traduzione-frasi-offline-2026-10-13.md).
Decisione di avvio: D-0281; consuntivo nel registro append-only.

## Proposta ricevuta e verifica ufficiale

Il testo fornito dall'utente propone Azure come prima scelta, Google come
alternativa e MyMemory come prototipo semplice. Include Cloudflare e DeepL,
quote ricorrenti distinte dai crediti temporanei, accesso studente Azure senza
carta e latenza Azure indicativa di 150–300 ms. Le etichette di qualità
«alta/molto alta» erano valutazioni indicative, non risultati di benchmark.

| API | Quota verificata | Precisazioni e giudizio per Lezionify |
| --- | --- | --- |
| Azure Translator F0 | 2 milioni di caratteri per mese di sottoscrizione | Quota ricorrente. Il piano gratuito interrompe il servizio quando esaurita; riprende al nuovo periodo o passando a un piano a pagamento. Primo candidato online da misurare. |
| Google Cloud Translation NMT | Primi 500.000 caratteri/mese, tramite credito mensile di $10 | Serve billing abilitato. Oltre la fascia gratuita la tariffa standard pubblicata è $20/milione; non estendere il beneficio NMT a traduzione documentale, custom o LLM. Secondo candidato. |
| MyMemory get | 5.000 caratteri/giorno anonimi; 50.000 con email valida nel parametro `de` | Massimo 500 byte UTF-8 per richiesta. La quota maggiore richiede comunicare l'email; non è la quota anonima. Pilota reale eseguito, ma non candidato principale. |
| Cloudflare Workers AI | 10.000 Neurons/giorno nel piano Free | Non è una quota in caratteri; dipende da modello e token. Sul Free le operazioni falliscono oltre i limiti. Consumi condivisi con le altre prove Workers AI dello stesso account. Alternativa, non priorità. |
| DeepL API Developer | 1 milione di caratteri totali, senza rinnovo | La documentazione conferma che il precedente API Free da 500.000/mese non è più sottoscrivibile. Non presumere la migrazione o cessazione di un eventuale vecchio account. Interessante per prove, non base gratuita ricorrente per un nuovo account. |

Fonti ufficiali, verificate il 13 ottobre:

- Azure: [prezzi F0](https://azure.microsoft.com/en-us/pricing/details/translator/),
  [FAQ: esaurimento della quota e cambio piano](https://www.microsoft.com/en-us/translator/business/faq/).
- Google: [prezzi](https://cloud.google.com/products/translate/pricing),
  [setup, billing e quote](https://docs.cloud.google.com/translate/docs/setup).
- MyMemory: [limiti](https://mymemory.translated.net/doc/usagelimits.php),
  [specifiche get e set](https://mymemory.translated.net/doc/spec.php).
  Le due pagine sono state recuperate direttamente via HTTPS con HTTP 200;
  il lettore web non riusciva ad aprirle. Copie negli artefatti locali.
- Cloudflare: [prezzi e stop sul Free](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- DeepL: [piani attuali e precedenti](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans).

### Account, carta e addebiti

[Azure for Students](https://azure.microsoft.com/en-us/free/students/) dichiara
accesso senza carta, per studenti universitari idonei, e $100 di credito per
12 mesi, rinnovabile finché studenti. È distinto dalla quota Translator F0:
non serve spendere quel credito per la traduzione standard entro F0.
Idoneità personale, disponibilità del servizio e risorsa F0 nel portale vanno
verificate nell'account; non sono state controllate o create risorse Azure.

È importante selezionare **F0**, non S1: la FAQ Microsoft dice che passando
a un piano a pagamento si paga dal primo carattere dopo il cambio, senza
trasferire i due milioni gratuiti. La raccomandazione di F0 riguarda Translator,
non garantisce gratuità di altre risorse Azure eventualmente create.

Google richiede billing. Quota gratuita e limiti di consumo sono cose diverse:
il setup indica che il volume giornaliero di caratteri è illimitato per default.
Per un'eventuale integrazione occorrono un tetto locale conservativo e quote
del progetto configurate; un semplice avviso di spesa non è il nostro blocco
delle chiamate. Le modalità di registrazione e pagamento non sono state provate.
Per DeepL la richiesta della carta nel nuovo piano va verificata nel flusso reale:
non è stata confermata dalla sola pagina dei piani.

### Latenza: conferma del dato, senza promessa

La [documentazione Microsoft sui limiti](https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits)
riporta risposte tipiche di 150–300 ms per testi entro 100 caratteri. Non è
una misura dal PC dell'utente né una garanzia per ogni frase tecnica. Le nostre
prove locali hanno mediane 85–134 ms per Mozilla e 98–112 ms per Argos beam4.
Il confronto online deve includere rete, autenticazione, servizio e lettura della
risposta, distinguendo primo avvio da chiamate successive. Non serve streaming
per mostrare una traduzione breve ricevuta completa.

## Pilota MyMemory eseguito

Strumento: `tools/translation_api_mymemory_pilot.mjs`. Stessa fixture sintetica
dei piloti offline, 24 casi (12 per direzione), **una sola passata**, 1.982
caratteri di input riservati. Endpoint HTTPS `get`, senza chiave, senza email,
senza `set` o importazione nella memoria. Nessun testo personale o dispensa reale.

Vincoli del runner: massimo 3.000 caratteri complessivi, 500 byte per richiesta,
timeout 15 s, redirect vietati, nessun retry, stop a errore/quota, checkpoint
giornaliero esclusivo che impedisce un reinvio silenzioso. I contatori sono del
pilota, non una lettura del residuo MyMemory dell'IP, che può essere condiviso.

| Direzione | Successi | Mediana end-to-end | Minimo / massimo |
| --- | ---: | ---: | ---: |
| EN→IT | 12/12 | 448 ms | 357 / 924 ms |
| IT→EN | 12/12 | 515 ms | 442 / 804 ms |

Tutti gli esiti sono completi senza retry o quota esaurita. Sono mediane della
singola passata su 12 frasi differenti, **non statistiche a caldo comparabili
direttamente alle ripetizioni offline**, né SLA del servizio.

Revisione concreta:

- `autovalori`→`eigenvalues` è corretto, mentre tutti e tre i candidati locali
  avevano sbagliato quella frase IT→EN.
- `dangling pointer`→«puntatore pendente» migliora il caso EN→IT rispetto ad
  Argos; nella direzione IT→EN resta `pendant pointer`, non `dangling pointer`.
- Il problema duale EN→IT contiene ancora «doppio» e «primordiale»; IT→EN
  mantiene `primary` e una relazione inferiore formulata ambiguamente.
- Il passo dell'algoritmo IT→EN diventa `pitch`: errore tecnico ancora presente.
- La formula IT→EN sposta il dollaro di chiusura da `$\lambda < 0$` a
  `$\lambda < $0`: alterazione della struttura LaTeX.
- Blocchi formula/codice esattamente conservati in 3/4 casi; Mozilla aveva
  conservato 4/4. Non trarre un punteggio generale da quattro esempi.

Il valore `match` della risposta è un dato del servizio, non un punteggio di
correttezza tecnica. Il modello e l'eventuale provenienza umana/automatica delle
singole risposte non sono stati certificati: non attribuire il risultato a
Google, Azure o un altro motore sottostante soltanto per somiglianza del testo.

## Dati e coerenza local-first

Le API richiedono l'invio del testo a un servizio esterno: possono essere
compatibili con Lezionify se l'utente sceglie **Traduci online**, vede il provider
e invia solo il testo selezionato. Il requisito offline originario rimane distinto.

- [Microsoft No Trace](https://www.microsoft.com/en-us/translator/business/notrace/)
  dichiara che i dati inviati per traduzione non vengono scritti in storage
  persistente. Non equivale a esecuzione locale o assenza di transito esterno.
- [Google: uso dei dati](https://docs.cloud.google.com/translate/data-usage)
  dichiara elaborazione temporanea in memoria, nessun uso del contenuto per
  addestrare o migliorare la traduzione e nessuna pubblicazione/condivisione
  con terzi. Gli endpoint globali non assicurano permanenza in una regione.
- [MyMemory: termini](https://mymemory.translated.net/terms-and-conditions)
  descrive conservazione a lungo termine dei segmenti inviati, uso delle
  contribuzioni per migliorare servizi e condivisione con partner di traduzione
  automatica. Non è stata trovata una garanzia distinta No Trace per `get`:
  non presumere che ogni ricerca sia pubblicata, né che non sia conservata.
  I termini sono stati letti direttamente dalla pagina HTTPS; il vecchio link
  `/doc/en/tos.php` restituisce 404. Queste condizioni pesano contro l'uso
  principale per dispense personali. Nel pilota il materiale era sintetico.
- [Cloudflare: dati Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
  dichiara nessun uso per addestramento/miglioramento senza consenso; storage
  aggiuntivo può conservare contenuti se usato insieme al servizio.

Un servizio Cloudflare specifico per traduzione è
[`@cf/meta/m2m100-1.2b`](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/).
Non è il Qwen già provato per Q&A e non è stato misurato in questa indagine.
La disponibilità di credenziali per Q&A non autorizza a ignorare budget condivisi
o a trasferire quei risultati alla traduzione.

## Quota rispetto a un uso plausibile

Esempi **ipotetici**, con 200 caratteri di input per traduzione, una destinazione
e 30 giorni, senza retry o altri usi dell'account:

| Uso | Caratteri/giorno | Caratteri/mese | Azure F0 | Google NMT | MyMemory anonimo |
| --- | ---: | ---: | --- | --- | --- |
| 20 frasi/giorno | 4.000 | 120.000 | Entro quota | Entro fascia gratuita | Entro quota giornaliera |
| 100 frasi/giorno | 20.000 | 600.000 | Entro quota | 100.000 oltre fascia, circa $2 alla tariffa standard | Oltre quota; entro 50.000 solo con email valida |

Per la consultazione di frasi, i due milioni Azure hanno ampio margine in questi
scenari. Il credito studente temporaneo non serve a rendere ricorrente questa
quota. Tradurre anche il risultato al contrario, aggiungere destinazioni o
ritentare aumenta il consumo. Le dispense complete sono fuori da questa stima.

## Prossimo passo concreto

Fare un **pilota Azure F0**, prima sugli stessi 24 casi e poi su 50–100 frasi
tecniche riviste, con modello standard e direzioni esplicite. Account e risorsa
devono essere configurati realmente: nessuna prova Azure è stata eseguita qui.
Confrontare semantica, terminologia, negazioni, numeri e blocchi, insieme a
latenza dal PC e consumo effettivo. Se disponibile, Google NMT può essere il
secondo confronto; DeepL Developer può servire come campione di qualità con
credito limitato, senza chiamarlo servizio gratuito ricorrente.

Solo se il miglioramento giustifica l'invio esterno, proporre nell'overlay una
modalità online esplicita: credenziale personale protetta nel backend,
provider visibile, contatore conservativo, tetto, annullamento e log senza testo
o URL contenenti query. Niente chiave comune distribuita con l'installer,
fallback automatico dall'offline o inferenza a ogni carattere digitato.
Non occorre integrare cinque servizi prima di aver misurato il primo candidato.

## Ripresa e verifiche

Report originale: `local-artifacts/translation-api-research/mymemory-2026-10-13.json`.
Copie ufficiali MyMemory: `spec.php.html`, `usagelimits.php.html`,
`terms-and-conditions.html`. File grezzi esclusi da Git; nessun segreto salvato.

```powershell
node --check tools/translation_api_mymemory_pilot.mjs
# Invio online dei soli 24 casi sintetici: il checkpoint dello stesso giorno
# impedisce la ripetizione. Non cancellarlo per forzare un nuovo run.
node tools/translation_api_mymemory_pilot.mjs
```

Conclusi controllo delle fonti, pilota MyMemory, revisione delle risposte,
conteggi/limiti e sintassi del runner. Nessuna creazione account, modifica delle
dipendenze/runtime dell'app o rigenerazione installer. Nessuna nuova prova
Azure, Google, DeepL o Cloudflare dichiarata eseguita.
