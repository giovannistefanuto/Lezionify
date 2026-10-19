# Approfondimenti recuperati e piano di ripresa — 15 ottobre 2026

Analisi documentale e del repository; nessuna nuova inferenza, account collegato,
dipendenza o scelta di provider. Il [resoconto](../product/resoconto-interventi-2026-10-15.md)
è l'indice della sessione. I numeri sotto sono misure storiche del 13 ottobre,
non esperimenti ripetuti oggi. Le voci di implementazione restano aperte.

## 9 — Modelli Q&A diversi da Gemini

Punto di ingresso già completo:
[ripresa Q&A](qna-non-gemini-ripresa-completa-2026-10-13.md).
La formulazione del backlog «prove API da eseguire» è superata: esistono
benchmark, ledger e revisione qualitativa. Restano da completare validazione
qualitativa e integrazione, non da ricominciare la ricerca generale.

- Groq 20B: mediana primo testo 0,496 s sul sintetico e 0,382 s su tre domande
  reali con estratto. Candidato per contesto breve, con problemi di delimitatori
  matematici nel viewer. Non misurato con le dispense complete del replay.
- Cloudflare Qwen con `/no_think` soft: 0,942 s sugli stessi tre estratti e
  1,118 s su tre documenti completi; 8,184 s mediana della risposta completa
  in quest'ultimo caso. Non è un parametro API garantito né una modalità vision.
- Non esiste baseline Gemini contemporanea. Errori matematici osservati in tutti
  i candidati, campione reale piccolo e revisione non cieca. Nessun vincitore
  certificato. Non usare i controlli automatici come punteggio di accuratezza.

Ricontrollate oggi le pagine ufficiali di [Groq, modelli](https://console.groq.com/docs/models),
[limiti](https://console.groq.com/docs/rate-limits) e
[Cloudflare Qwen](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/).
Non verificati i limiti effettivi degli account; i cap prudenti salvati non
vengono alzati né sostituiti con quelli pubblicizzati per piani differenti.

Scelta da discutere: privilegiare Groq su estratti o Cloudflare sul documento
intero, oppure continuare il confronto prima di integrare. Non basta scegliere
il tempo minore se cambia il contesto ricevuto. Nessuna modifica alla pipeline.

Piano di implementazione dopo la scelta:

1. Provider Q&A separato da trascrizione/dispense, credenziali nel main protette
   con safeStorage, modello e provider espliciti nell'interfaccia.
2. Adattatore streaming con timeout/abort, risultato completo distinto dal
   parziale, nessun retry dopo testo visibile; test di trasporto sintetico.
3. Normalizzazione dei soli delimitatori matematici del Q&A Groq, con protezione
   di codice/escape e collaudo KaTeX reale prima di adottarla.
4. Conservare conversazioni storiche, registrare provider/modello e consumo senza
   testo privato; quote per account e nessun fallback esterno silenzioso.
5. Valutazione cieca su un nuovo corpus sintetico più ampio e verificabile,
   includendo negazioni, Bellman, DLT, codice e follow-up. Confronto a parità di
   contesto; successiva prova UI esplicita. Le slide richiedono capacità vision
   separata, non soddisfatta dai risultati testuali salvati.

Deep Research generale non necessaria; il collo di bottiglia è la valutazione
delle risposte e l'esperimento a parità di contesto.

## 7 — Traduzione offline di frasi

Recuperati [tre piloti](traduzione-frasi-offline-2026-10-13.md) e
[confronto API](traduzione-api-valutazione-2026-10-13.md).
24 casi sintetici, 240 traduzioni complessive. Mozilla/WASM conserva nel campione
meglio formule e codice ma commette errori tecnici; Argos diretto è rapido,
richiede il runtime Python nel percorso sperimentato. Nessuno è una garanzia
per materiale tecnico. Le parole restano nel dizionario attuale.

Scelta da discutere: candidato Mozilla/Bergamot o ulteriore confronto Argos;
asset inclusi nel setup oppure pacchetto facoltativo con download esplicito.
Azure F0 richiede un account/pilota e resta un'opzione online distinta dal
requisito offline, non un ripiego automatico.

La [documentazione Bergamot](https://github.com/browsermt/bergamot-translator/blob/main/wasm/module/README.md)
ricontrollata oggi distingue traduttore per latenza e batch, worker e registry
configurabili. Il registry remoto di default va sostituito con asset locali;
la compatibilità Electron delle modifiche del pilota resta da dimostrare.

Piano: corpus tecnico 50–100 casi con negazioni/quantificatori e revisione per
direzione; protezione formule/codice/URL verificata byte per byte; worker locale
isolato, comando Traduci esplicito e annullamento; zero testo nei log/cache
persistenti; errore per input troppo lungo senza troncare. Dopo la scelta,
modalità Frasi separata in Ctrl+T e collaudo Focus/fullscreen, rete assente,
modello mancante, riavvio e setup. Nessuna dipendenza del prodotto aggiunta oggi.

Deep Research non necessaria: esperimenti mirati già pianificati nel documento
originale, da estendere senza alterare le baseline.

## 5 — Musica e appendice dei sei video

Recuperati [confronto delle modalità](musica-integrazione-valutazione-2026-10-13.md)
e [studi sulla concentrazione](musica-concentrazione-evidenze-2026-10-13.md).
La scelta ancora da confermare è telecomando Spotify personale, file locali,
oppure semplici collegamenti esterni. Non costruire contemporaneamente tre
integrazioni. I timestamp e i titoli originali restano nel backlog.

Ricontrollato il [changelog Spotify del 23 luglio](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates):
25 Client ID per sviluppatore, quota condivisa per account e motivo strutturato
QUOTA_EXCEEDED nei 429. Il documento storico includeva già la modifica di luglio;
non applicare il vecchio limite di un solo Client ID della guida di febbraio.
Il [modo sviluppo](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
richiede Premium al proprietario; accesso effettivo e comandi vanno provati sul
suo account. Nessun login o nuovo account eseguito oggi.

Piano del telecomando, se scelto: app personale nel dashboard, PKCE in browser
di sistema e callback loopback; token protetti nel main; elenco dispositivi e
scelta esplicita del PC; play/pausa e stato prima delle playlist; test uscita
Windows/cuffie, client chiuso, offline, scadenza token, revoca e 429. L'offline
resta nel client Spotify: un telecomando via Web API richiede rete.

Per file locali: import nativo, ID opachi, player locale e metadati/tracce senza
upload. Per compilation: separare identità video, playlist e intervalli; fine
dell'ultima traccia dalla durata reale, confini modificabili e originali
conservati. Il download dai sei link non è implementato e non va dedotto dal
supporto dei timestamp. Restano da chiarire fonte consentita, acquisizione e
manutenzione prima di scegliere un estrattore. Titoli italiani eventuali accanto
agli originali, con traduzione online solo esplicita. Non scaricato audio oggi.

Deep Research non necessaria ora: prima una scelta di modalità e un pilota
dell'account/dispositivi; ripetere ricerche generali non verifica questi requisiti.

## 17 — Pausa sul Balance originale

Recuperati [requisiti e piano completo](timer-pausa-amazfit-balance-valutazione-2026-10-14.md)
e Deep Research integrale già salvata. Firmware/API reali e BLE Peripheral del
PC non sono stati misurati. Nessuna mini app installata o prototipo hardware.

Ricontrollata oggi la [tabella App Service Zepp](https://docs.zepp.com/docs/guides/framework/device/app-service/):
esclude le API mst*, vieta i timer globali e limita una singola esecuzione a
600 ms. Un servizio persistente non rende disponibili le mst*. Da verificare
anche se la vibrazione iniziata sopravvive all'uscita del servizio: non dedurre
10 secondi di vibrazione dal solo poter invocare Vibrator.

La decisione necessaria resta accettare o meno l'apertura della mini app una
volta per sessione. Schermo spento e ritorno al quadrante sono prove diverse.
Senza tale compromesso serve prima dimostrare un altro ingresso dal quadrante;
la documentazione attuale non dimostra il requisito completo senza telefono.

Prossima prova concreta, quando l'utente può operare sul watch: verificare
advertising Windows, leggere minAPI sulla mini app, invio di 60 s e ACK, poi
telefono spento/PC sospeso, schermo spento/quadrante, allarme e arresto aptico.
Ripetere duplicati e perdita ACK. Il protocollo nel documento precedente resta
riusabile. Nessun annullamento della pausa watch alla ripresa anticipata dello
studio; nessuna ripresa automatica dello studio alla scadenza.

### Prompt facoltativo per Deep Research mirata

> Studia solo il punto irrisolto del timer offline Lezionify → Amazfit Balance
> originale, firmware 3.28.50.1, Zepp OS 4 con API_LEVEL da leggere sul dispositivo.
> PC Windows/Electron, Redmi Note 13 5G Android 15 disponibile per installazione,
> ma preferenza senza telefono e Internet durante l'uso. Non ripetere la proposta
> BLE Central mst* in App Service: la documentazione la esclude. Cerca un canale
> dimostrabile che riceva dal quadrante senza aprire manualmente la mini app:
> protocollo Zepp già esistente, evento/servizio pubblico, oppure ponte Android
> locale con ingresso realmente documentato. Valuta REA solo per il tratto
> mancante e specifica quali artefatti e accessi servirebbero. Per ogni strada
> indica API esatte, fonte primaria e data, requisiti di installazione,
> dipendenze dal telefono, comportamento dal quadrante, prova minima falsificabile
> e limiti. Distingui prova reale, inferenza e ipotesi. La ricezione deve creare
> un timer autonomo sul watch e vibrare circa 10 s con stop automatico anche con
> PC sospeso. Non presentare una notifica o il solo schermo spento come soluzione
> del requisito. Se non emerge una strada verificabile, dichiaralo e confronta
> esplicitamente i compromessi residui. Non servono reset o disassociazioni.

È un prompt pronto, non una ricerca avviata né una richiesta indispensabile per
concludere le correzioni dell'app in questa sessione.

Aggiornamento successivo su richiesta dell'utente: riletti D-0292 e il report
integrale. Seguendo la pista del riuso dei protocolli, esaminati i sorgenti
Gadgetbridge per sveglie native e autenticazione e la sua API Android per app
terze. Risultati, limiti e integrazione pronta per la ricerca avviata sono nella
sezione finale della [valutazione Balance](timer-pausa-amazfit-balance-valutazione-2026-10-14.md).
Non chiude il requisito: sveglia con ora/minuto non equivale a countdown preciso
con vibrazione di 10 secondi, e ricezione/coabitazione con Zepp sono da provare.
