# Costi API per dispense inglesi: Gemini e OpenAI

Data della ricerca e consultazione dei listini: **14 novembre 2026**.

Ricerca richiesta per stimare il costo del flusso reale di Lezionify. Questa
fotografia conserva i risultati della conversazione; non costituisce un listino
aggiornato automaticamente né un benchmark di qualità dei modelli.
Nessuna chiamata AI a pagamento è stata effettuata per questa valutazione.

## Campione e flusso attuale

Misure aggregate su 56 lezioni disponibili nell'archivio locale, lette senza
inviare i contenuti ai provider. Non sono inclusi testi, nomi dei file, titoli,
identificativi delle lezioni, percorsi personali o credenziali.

| Grandezza | Media | Mediana | 25°–75° percentile |
| --- | ---: | ---: | ---: |
| Durata audio, minuti | 91 | 91 | 84–98 |
| Parole trascrizione | 9.739 | 9.750 | 8.388–11.619 |
| Caratteri trascrizione | 51.675 | 51.615 | 44.810–60.085 |
| Caratteri dispensa italiana | 30.962 | 30.939 | 27.520–34.806 |
| Caratteri dispensa inglese | 28.503 | 28.395 | 25.472–32.139 |
| Gruppi di traduzione ricostruiti con il codice attuale | 6 | 6 | 5–7 |
| Caratteri input traduzione stimati, contesto ripetuto incluso | 244.755 | 232.626 | 168.070–300.302 |

Conteggi dei caratteri secondo le stringhe JavaScript, non token fatturati.
Le misure inglesi riguardano il sottoinsieme di lezioni leggibili con i file
richiesti; il campione non rappresenta necessariamente tutto l'archivio.
La stima dell'input traduzione somma FULL_CONTEXT_JSON e SOURCE_DOCUMENT_JSON
per ogni gruppo e aggiunge 1.200 caratteri convenzionali di istruzioni per
gruppo: non è una ricostruzione esatta di schema, tokenizzazione e metadati.

Il codice in `electron/main/gemini.ts` produce, per le trascrizioni lunghe:

1. Segmentazione della trascrizione completa.
2. Titolo e overview dai primi 8.000 caratteri.
3. Estrazione note d'esame dalla trascrizione completa.
4. Generazione di ogni macrosezione dal relativo tratto della trascrizione.
5. Assemblaggio locale, senza una chiamata AI finale.

`electron/main/archive.ts` aggiunge l'estrazione delle informazioni del corso
e, se necessaria, la loro fusione con quelle esistenti. Nei backup locali dei
checkpoint esaminati: 43 checkpoint note, 3–7 macrosezioni, mediana 4;
41 checkpoint audio, 4–8 parti, mediana 6. Sono evidenze storiche parziali,
non conteggi completi di tutte le richieste eseguite.

`electron/main/ai/translationDocument.ts` raggruppa sezioni intere con obiettivo
6.000 caratteri mascherati e massimo 16 sezioni per gruppo. Ogni richiesta
contiene di nuovo **l'intero documento mascherato**, più le sezioni richieste.
Formule e codice protetti sono reinseriti localmente. È prevista una singola
passata correttiva, eventualmente articolata in più gruppi; retry del provider
e fallback possono aggiungere tentativi fisici.

Ordine di grandezza per una lezione tipica: circa 6 chiamate audio, 7–9 per
italiano/logistica e 6 per inglese, ossia circa 20–21 richieste riuscite prima
di correzioni e retry. Il numero dipende dalle sezioni e dalle informazioni
effettivamente estratte. Le riprese da checkpoint possono ridurlo.

## Metodo del preventivo

Tutti gli importi sono in **USD, prima di imposte**, con prezzi API standard,
senza sconti cache, Batch, quote gratuite o elaborazione regionale.
Non si tratta del prezzo di un abbonamento ChatGPT o Google.

| Lavorazione | Input complessivo ipotizzato | Output fatturabile ipotizzato |
| --- | ---: | ---: |
| Solo inglese, da dispensa italiana pronta | 75.000–100.000 token | 12.000–30.000 token |
| Italiano + inglese, da trascrizione pronta | 140.000–200.000 token | 30.000–80.000 token |

Formula: `costo USD = token input / 1.000.000 × tariffa input + token output / 1.000.000 × tariffa output`.

Queste sono **ipotesi di budget**, informate dalle dimensioni dei documenti:
non token misurati dai provider, né intervalli statistici o tetti garantiti.
Il margine superiore rappresenta correzioni e ragionamento aggiuntivo; non è
un sovrapprezzo fisso per ogni errore. Una richiesta rifiutata per quota non
va automaticamente conteggiata come una generazione completa fatturata.

I token di ragionamento fatturabili rientrano nell'output. Impostazioni di
ragionamento elevate, molti tentativi o dispense più lunghe possono superare
queste fasce. Il cambio di modello può cambiare lunghezza, qualità e numero
di riparazioni. L'app non conserva una contabilità completa dei token
fatturati per ciascuna dispensa: servono i dati usage del provider per un
consuntivo. Le soglie di contesto lungo si applicano alla singola richiesta,
non alla somma dei token di tutte le chiamate della pipeline.

## Gemini

Modelli testuali pertinenti del listino consultato; esclusi modelli dedicati
a immagini, video, voce, embedding e robotica. Le righe raggruppano soltanto
modelli con identiche tariffe al momento della ricerca.

| Modello | Input / output USD per 1M token | Solo inglese, USD | Italiano + inglese, USD |
| --- | ---: | ---: | ---: |
| Gemini 2.5 Flash-Lite | 0,10 / 0,40 | 0,012–0,022 | 0,026–0,052 |
| Gemini 3.1 Flash-Lite | 0,25 / 1,50 | 0,037–0,070 | 0,08–0,17 |
| Gemini 3.5 Flash-Lite | 0,30 / 2,50 | 0,052–0,105 | 0,12–0,26 |
| Gemini 2.5 Flash | 0,30 / 2,50 | 0,052–0,105 | 0,12–0,26 |
| Gemini 3 Flash Preview | 0,50 / 3,00 | 0,074–0,140 | 0,16–0,34 |
| Gemini 3.6 / 3.8 Flash | 0,75 / 3,75 | 0,10–0,19 | 0,22–0,45 |
| Gemini 2.5 Pro | 1,25 / 10,00 | 0,21–0,43 | 0,48–1,05 |
| Gemini 4 Hydrogen | 1,50 / 7,50 | 0,20–0,38 | 0,44–0,90 |
| Gemini 3.1 Pro Preview | 2,00 / 12,00 | 0,29–0,56 | 0,64–1,36 |
| Gemini 4 Argon / Carbon | 2,00 / 10,00 | 0,27–0,50 | 0,58–1,20 |

Fonte delle tariffe e degli annunci: [listino ufficiale Gemini Developer API](https://aistudio.google.com/docs/pricing).

Avvertenze conservate dalla consultazione:

- Argon e Carbon: tariffe indicate valide fino al 30 novembre 2026; dal
  1° dicembre input 4 USD e output 20 USD per milione.
- 3.6/3.8 Flash: tariffe indicate fino al 31 dicembre 2026; dal 1° gennaio
  2027 input 1,50 USD e output 7,50 USD per milione.
- Dal 1° dicembre 2026 gli identificativi 2.5 Pro e 2.5 Flash sono annunciati
  in instradamento rispettivamente verso 3.8 Flash e 3.5 Flash-Lite, alle
  tariffe dei modelli di destinazione.
- Per 2.5 Pro e 3.1 Pro Preview sono usate le tariffe delle richieste entro
  200.000 token input; il documento tipico non richiede il contesto lungo.
- `gemini-3.7-flash` e `gemini-3.5-flash` compaiono nel codice ma non è stata
  individuata una tariffa ufficiale distinta: nessun prezzo viene inferito.
- Il percorso inglese attuale filtra i fallback Lite e il gestore seleziona
  modelli secondo le proprie regole. Le righe Lite sono confronti economici
  ipotetici, non prova che l'app li usi oggi per questa lavorazione.

## OpenAI

Modelli generalisti del listino consultato, comprese generazioni precedenti;
nessuna garanzia di disponibilità per il singolo account. Non è un inventario
di ogni snapshot, modello ritirato o modello specializzato. Lezionify non
dispone oggi di un provider OpenAI per questa pipeline: occorre implementarlo
e adattare configurazioni e contratti prima di poter usare queste alternative.

| Modello | Input / output USD per 1M token | Solo inglese, USD | Italiano + inglese, USD |
| --- | ---: | ---: | ---: |
| GPT-6 Luna | 0,10 / 0,50 | 0,013–0,025 | 0,029–0,060 |
| GPT-6.1 Terra | 1,00 / 5,00 | 0,14–0,25 | 0,29–0,60 |
| GPT-6.1 Sol / GPT-6 Sol | 2,00 / 10,00 | 0,27–0,50 | 0,58–1,20 |
| GPT-6 Astra | 10,00 / 50,00 | 1,35–2,50 | 2,90–6,00 |
| GPT-5.6 Luna | 0,20 / 1,20 | 0,029–0,056 | 0,064–0,136 |
| GPT-5.6 Terra | 2,00 / 12,00 | 0,29–0,56 | 0,64–1,36 |
| GPT-5.6 Sol | 4,00 / 20,00 | 0,54–1,00 | 1,16–2,40 |
| GPT-5.5 | 5,00 / 30,00 | 0,74–1,40 | 1,60–3,40 |
| GPT-5.5 Pro / GPT-5.4 Pro | 30,00 / 180,00 | 4,41–8,40 | 9,60–20,40 |
| GPT-5.4 | 2,50 / 15,00 | 0,37–0,70 | 0,80–1,70 |
| GPT-5.4 mini | 0,75 / 4,50 | 0,11–0,21 | 0,24–0,51 |
| GPT-5.4 nano | 0,20 / 1,25 | 0,030–0,058 | 0,066–0,140 |
| GPT-5.2 | 1,75 / 14,00 | 0,30–0,60 | 0,67–1,47 |
| GPT-5.2 Pro | 21,00 / 168,00 | 3,59–7,14 | 7,98–17,64 |
| GPT-5 / GPT-5.1 | 1,25 / 10,00 | 0,21–0,43 | 0,48–1,05 |
| GPT-5 mini | 0,25 / 2,00 | 0,043–0,085 | 0,095–0,210 |
| GPT-5 nano | 0,05 / 0,40 | 0,009–0,017 | 0,019–0,042 |
| GPT-5 Pro | 15,00 / 120,00 | 2,57–5,10 | 5,70–12,60 |
| GPT-4.1 / o3 | 2,00 / 8,00 | 0,25–0,44 | 0,52–1,04 |
| GPT-4.1 mini | 0,40 / 1,60 | 0,049–0,088 | 0,10–0,21 |
| GPT-4o | 2,50 / 10,00 | 0,31–0,55 | 0,65–1,30 |
| GPT-4o mini | 0,15 / 0,60 | 0,018–0,033 | 0,039–0,078 |
| o3 Pro | 20,00 / 80,00 | 2,46–4,40 | 5,20–10,40 |
| ChatGPT `chat-latest` | 5,00 / 30,00 | 0,74–1,40 | 1,60–3,40 |

Fonti: [listino ufficiale OpenAI, versione Markdown con tutte le righe](https://developers.openai.com/api/docs/pricing.md),
[pagina prezzi](https://developers.openai.com/api/docs/pricing),
[GPT-5.6 Sol e durata della promozione](https://developers.openai.com/api/docs/models/gpt-5.6-sol).
La tariffa Sol 5.6 è promozionale fino al 30 novembre 2026.
La [scheda GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano.md)
lo indica come deprecato: il prezzo conservato non equivale a una raccomandazione.

## Trascrizione audio, da aggiungere ai costi testuali

| Modello | Prezzo stimato USD/minuto | Circa 91 minuti, USD |
| --- | ---: | ---: |
| Gemini 3.5 Transcribe | 0,005 | 0,45 |
| OpenAI GPT-4o mini Transcribe | 0,003 | 0,27 |
| OpenAI GPT Transcribe | 0,0045 | 0,41 |
| OpenAI GPT-4o Transcribe / Whisper | 0,006 | 0,55 |

Fonti: [Gemini Transcribe](https://aistudio.google.com/docs/pricing#gemini-3.5-transcribe),
[trascrizione OpenAI](https://developers.openai.com/api/docs/pricing.md).
Costi per minuto indicativi; durata effettivamente inviata, sovrapposizioni tra
parti, output, fallback e ritrascrizioni possono modificarli. Il flusso attuale
usa Gemini 3.5 Transcribe con recupero multimodale se necessario.

## Esempi di budget e prossima valutazione

- Gemini 3.8 Flash, audio → italiano → inglese: circa 0,70–0,90 USD per
  lezione, 21–27 USD per 30 lezioni, ai prezzi della fotografia.
- GPT-6.1 Sol con trascrizione Gemini: circa 1,00–1,65 USD per lezione,
  30–50 USD per 30 lezioni. È un'ipotesi di integrazione futura.
- Sola traduzione con Gemini Flash: circa 3–6 USD per 30 dispense.

La ripetizione del contesto nella traduzione è il principale costo input
evitabile individuato: circa 245.000 caratteri inviati per 31.000 caratteri
di dispensa. Valutare cache o un contesto ridotto richiede una prova di fedeltà;
non è stata modificata la pipeline né misurata una percentuale di risparmio.

Prima di una scelta o di un preventivo aggiornato:

1. Ricontrollare tariffe, disponibilità, promozioni e instradamento degli alias.
2. Misurare usage input, output, ragionamento, cache e tentativi per ogni fase,
   senza salvare testi o segreti nei log; confrontare con il consuntivo provider.
3. Confrontare su un campione controllato completezza, inglese tecnico,
   formule/codice, tempi e riparazioni, con chiamate AI autorizzate e tracciate.
4. Aggiornare il preventivo anche per imposte ed eventuale conversione EUR.

Riferimenti di progetto: [traduzione dispense](../product/traduzione-dispense.md),
[backlog attivo, inclusa la valutazione altri provider](../product/idee-future-2026-10-13.md),
[registro decisioni](../../DECISIONI.md).
