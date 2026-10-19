# Timer pausa su Amazfit Balance — requisiti, ricerca e ripresa

Registrazione del 14 ottobre 2026, richiesta dall'utente dopo il confronto sulla
funzione, la lettura della Deep Research e la valutazione di REA.
Decisione di registrazione: [D-0292](../../DECISIONI.md).

**Stato:** proposta da approfondire, non implementata. Nessun prototipo hardware
eseguito, nessuna installazione di REA o app companion e nessuna nuova dipendenza.
Ricontrollo del 15 ottobre su richiesta dell'utente: recuperati report integrale
e D-0292; individuata la pista Gadgetbridge/sveglie native, descritta nella
sezione finale. È una verifica nuova dei sorgenti, non un risultato del report
originale né una dimostrazione sul dispositivo dell'utente.
La richiesta attuale autorizza la conservazione delle informazioni. L'utente
accetta l'eventuale installazione di software per la funzione; non è stata ancora
scelta un'architettura definitiva. Questa voce non cambia la coda LISTA_ORDINE.

## Materiale conservato

- [Deep Research integrale fornita dall'utente](timer-pausa-amazfit-balance-deep-research-2026-10-14.md).
- Copia integrale pubblicata: [report Deep Research](timer-pausa-amazfit-balance-deep-research-2026-10-14.md). Il duplicato nella radice resta locale.
- Copia identica di 51.449 byte; SHA-256:
  `c50f5f05ad023ae1760a3282148611ff681a83ef5b8f8b4780eaa9a7a14487df`.
- Il report originale mantiene anche i marcatori di citazione della ricerca,
  che non sono URL autonomamente risolvibili. I collegamenti ufficiali utili alla
  ripresa sono riportati sotto; non è stata ricostruita la mappa completa dei
  marcatori e non tutte le conclusioni del report sono state verificate di nuovo.
- Questo documento conserva requisiti chiariti, valutazione della ricerca,
  piste REA, protocollo proposto, prove residue e mandato della Deep Research.

## Funzione richiesta e comportamento

Durante lo studio in Lezionify, premere Esc e scegliere una pausa di durata X,
con preset iniziali 5, 15 e 30 minuti. Istantaneamente o quasi sul Balance deve
apparire un timer di X minuti, che vibra alla scadenza. Il flusso pausa e i preset
sono già presenti in Lezionify: l'integrazione con il watch è una nuova funzione.

Requisiti chiariti direttamente dall'utente:

1. Installare una nostra mini app sul watch ed eventualmente un'app di supporto
   sul telefono è accettabile.
2. Durante l'avvio della pausa non vuole toccare il watch; al massimo è accettabile
   un semplice OK. L'apertura manuale dell'app a inizio sessione è un compromesso
   proposto dall'assistente, **non ancora accettato come soluzione finale**.
3. Deve funzionare senza Internet e senza presumere una Wi-Fi condivisa. Spesso
   solo il PC è collegato alla Wi-Fi; il telefono è collegato al watch via
   Bluetooth, mentre telefono e watch non hanno Internet.
4. Preferenza massima: il telefono serve soltanto per installazione/configurazione,
   poi PC e watch comunicano direttamente e funzionano senza il telefono.
5. Se l'utente riprende a studiare prima della scadenza, il timer sul watch deve
   continuare e vibrare comunque alla fine; non inviare un annullamento automatico.
6. Alla scadenza desidera circa 10 secondi di vibrazione con arresto automatico.
   Non è stata richiesta una conferma per fermarla o lo spegnimento dell'orologio.

Proposta tecnica dell'assistente da mantenere distinta dai requisiti espliciti:
una volta ricevuta e confermata la pausa, il watch deve completarla autonomamente
anche se il PC va in sospensione, il telefono si spegne o il Bluetooth si perde.
L'avviso non riprende automaticamente lo studio: D-0287 conserva la pausa fino
a ripresa esplicita tramite pulsante o Esc. La Deep Research ha adottato questa
autonomia dopo la ricezione come criterio del prototipo.

## Configurazione riferita dall'utente

Sono specifiche tecniche del modello e delle versioni, non identificativi unici
del dispositivo. Non conservare seriali, indirizzi Bluetooth, account o chiavi.

| Componente | Specifiche riferite il 14 ottobre 2026 |
| --- | --- |
| Telefono | Redmi Note 13 5G |
| Modello telefono | `2312DRAABG` |
| Versione sistema telefono | `3.0.6.0.VNQEUXM` |
| Android | 15, build `AP3A.240905.015.A2` |
| Watch | Amazfit Balance originale, non Balance 2 |
| Software watch | `3.28.50.1` |
| Algoritmo watch | `18.10.91.06` |
| Sistema watch | Zepp OS 4 |
| App Zepp sul telefono | Versione non ancora fornita |
| PC | Lezionify Windows, Electron/React/TypeScript; build Windows e adattatore Bluetooth da accertare |

La tabella developer Zepp consultata nella ricerca indica per il Balance
originale API_LEVEL 3.7 e Zepp OS 4.0. **Zepp OS 4 non significa API_LEVEL 4**.
La disponibilità sul firmware specifico deve essere letta con
`getSystemInfo()` (`osVersion`, `firmwareVersion`, `minAPI`), non dedotta dal nome
del sistema o dalla versione algoritmo.

## Conclusioni della Deep Research e valutazione

La ricerca documentale è riferita al 14 ottobre 2026. Non contiene misure eseguite
sul PC o sul Balance dell'utente e non equivale a una funzione pronta.

| Percorso o requisito | Conclusione attuale | Verifica residua |
| --- | --- | --- |
| PC come BLE Peripheral/GATT Server, Balance come BLE Central | API pubbliche sui due lati; architettura candidata offline diretta | Adattatore PC, API effettive watch e prova end-to-end |
| Ricezione con Device App aperta | Primitive BLE `mst*` documentate da API_LEVEL 3.0 | Connessione, sottoscrizione e conferma reali |
| Ricezione dal quadrante con mini app chiusa | Non supportata tramite App Service `mst*`: Zepp esclude queste API dal servizio | Nessuna soluzione pubblica completa dimostrata; eventuale altro canale da cercare |
| App aperta una volta, poi solo schermo spento | Possibile compromesso sperimentale | Verificare sopravvivenza della Device App e connessione; non equivale a ritorno al quadrante |
| PC Central e watch con server GATT personalizzato | La ricerca non ha trovato API pubbliche Zepp per esporlo da una mini app | Non dichiararlo possibile dal solo fatto che il watch usa BLE con Zepp |
| Timer autonomo dopo ricezione | `@zos/alarm.set`, da API_LEVEL 3.0, può richiamare un App Service; `store:true` documenta persistenza anche dopo riavvio | Scadenza reale con app chiusa e collegamenti persi |
| Countdown di sistema Amazfit controllato da Lezionify | Nessun comando pubblico documentato trovato per impostarlo e avviarlo | Considerare un timer della nostra mini app |
| Vibrazione di circa 10 secondi | Sequenze `Vibrator.start(Action[])` da API_LEVEL 3.6; comportamento completo non accertato | Durata, arresto automatico e sopravvivenza alla fine del servizio |
| Telefono Android come ponte offline | Tratto PC ↔ Android plausibile con API Bluetooth Android | Ingresso dalla nostra app Android al Side Service Zepp non documentato |
| Notifiche del telefono inoltrate al watch | Possono dare un avviso | Non creano automaticamente un timer autonomo nella mini app |

### Limite di background e distinzione fra canali

`mstStartScan`, `mstConnect` e le altre API `mst*` danno accesso BLE Central/GATT
generico al watch. L'App Service sopravvive all'uscita dalla Device App ma esclude
le API `mst*`, la UI e i timer globali come `setTimeout`. Un servizio persistente
non elimina questa restrizione; inoltre richiede permesso e può confliggere con
altri servizi continuamente attivi. Non assumere consumi accettabili senza prova.

`createConnect`/`send` appartengono invece al trasporto Device App ↔ Side Service
di Zepp sul telefono. Non sono già una connessione generica al PC. La ricezione
del messaggio, la programmazione dell'alarm e l'apertura automatica del countdown
sono tre capacità da verificare separatamente.

La coesistenza della normale connessione Zepp al telefono con il collegamento
watch → PC è plausibile ma non dimostrata su questo firmware. Non è stata scelta
una procedura di disassociazione o reset.

### Timer e vibrazione

Usare una scadenza locale e un alarm persistente evita di mantenere un contatore
aggiornato ogni secondo in background. Quando visibile, la UI può ricavare il
tempo restante dalla scadenza. Il permesso alarm è `device:os.alarm`.

La ricerca segnala che un App Service a esecuzione singola dura al massimo
600 ms. Non usare `setTimeout` per fermare la vibrazione dopo 10 secondi nel
servizio. `createSysTimer` richiede API_LEVEL 4.0: non va presunto disponibile sul
Balance originale indicato come API_LEVEL 3.7.

Prima provare una sequenza haptica finita. Se non funziona, una scena breve
autolimitante è un possibile compromesso da discutere, non un requisito già
approvato. La ricerca propone come ulteriore esperimento due alarm distinti
(avvio alla scadenza e stop dopo 10 secondi), ma senza garanzia che una nuova
istanza del vibratore possa fermare la prima: non è una soluzione pronta.
Verificare separatamente Non disturbare, modalità sonno, schermo spento e
risparmio energetico; l'esecuzione del callback non dimostra una vibrazione
percepibile.

### Ponte Android

Un'app Android può gestire BLE e un servizio per dispositivi collegati, con
permessi e configurazione background appropriati. Sul Redmi verificare anche
gestione batteria e avvio automatico, senza presumere i nomi dei menu.

Il tratto incerto è nostra app Android → Side Service dentro Zepp. Un endpoint
HTTP su localhost interrogato dal Side Service oppure una rete Bluetooth PAN
sono soltanto esperimenti suggeriti dal report; supporto loopback, lifecycle e
polling a telefono bloccato non sono garantiti. Rendere Android un semplice
server GATT per le API `mst*` del watch ripropone il limite di background.

## Architettura e protocollo candidati

Primo prototipo proposto, separato dall'app di produzione:

```text
Lezionify / comando di prova su Windows
    → IPC locale
    → helper Windows C#/.NET o C++/WinRT
    → GATT Server con characteristic comando e ACK
    → BLE offline
    → Device App sul Balance con mst*
    → alarm locale persistente
    → App Service alla scadenza
    → vibrazione finita
```

Windows deve supportare `IsLowEnergySupported` e `IsPeripheralRoleSupported`;
verificare anche creazione reale del servizio e advertising, non solo i flag.
`GattServiceProvider` e `GattLocalCharacteristic` sono i componenti Windows
proposti. Web Bluetooth di Electron non fornisce il server GATT locale: helper,
distribuzione, permessi e packaging richiedono una prova propria.

Sul watch il report propone scan per UUID, connessione, preparazione del profilo,
sottoscrizione alle notifiche, ricezione con `mstOnCharaNotification` e scrittura
dell'ACK. Il successo non è ancora stato osservato sui dispositivi dell'utente.

Regole proposte per l'eventuale protocollo:

- Comando con versione, `commandId`, istante di emissione, durata e scadenza.
- Il watch valida il comando e crea l'alarm prima di inviare `SCHEDULED`.
- `alarmId == 0` è un fallimento; il PC mostra «Timer avviato sul watch» solo
  dopo la conferma di programmazione riuscita.
- Retry con lo stesso `commandId`; conservare pochi ID recenti e non creare
  nuovi alarm per duplicati. Risposte candidate: `SCHEDULED`, `DUPLICATE`,
  `EXPIRED`, `INVALID`, `ALARM_ERROR`.
- Consegne tardive non devono riavviare tutta la durata; comandi già scaduti non
  devono causare una vibrazione immediata. Definire finestra di accettazione.
- La scadenza assoluta proposta richiede anche una verifica dello scarto tra
  orologi PC e watch; non è ancora stata scelta una politica di compensazione.
- Alla ripresa anticipata dello studio non inviare cancel.
- Trasferire soltanto dati necessari al timer, senza dispense, audio,
  trascrizioni o dati personali. Eventuali chiavi di associazione restano locali
  e protette, escluse da repository, log e messaggi di errore.

## REA: proposta dell'utente e utilità possibile

L'utente ha proposto [morluto/rea](https://github.com/morluto/rea).
REA è uno strumento di reverse engineering con CLI/MCP che può aiutare l'agente
a esaminare software e seguire evidenze. La guida Android documenta analisi APK
con JADX e un JDK completo, incluso un percorso Windows x64. La documentazione
generale comprende anche analisi nativa e firmware, con provider aggiuntivi e
vincoli di piattaforma. Queste capacità non sono un supporto specifico Balance.

Due indagini suggerite dall'assistente, ancora da eseguire:

1. Ricostruire il percorso Zepp → Balance usato mentre il watch mostra il
   quadrante, cercando se il trasporto possa essere riprodotto da Windows.
2. Cercare un ingresso locale dalla nostra app Android al servizio Zepp per un
   ponte offline, se il collegamento diretto non risulta praticabile.

Domanda guida:

> Come consegna Zepp un comando al Balance originale mentre l'orologio mostra
> il quadrante? Quel percorso può essere riprodotto da Windows oppure raggiunto
> da un'app Android locale, senza Internet?

Prima riusare protocolli e implementazioni pertinenti già disponibili in altri
progetti, poi analizzare l'APK della versione Zepp effettivamente utilizzata.
Non è stato ancora selezionato o verificato un progetto compatibile da riusare.
REA può aiutare a individuare un altro canale; non rende disponibili le API
`mst*` nei contesti in cui il sistema le esclude. Un risultato statico non
dimostra funzionamento, autenticazione, coesistenza con Zepp o ricezione reale.

Non è stata trovata, nella documentazione REA consultata, una soluzione pronta
specifica per Balance. Non sono stati scaricati APK/firmware o avviate analisi.
Prima di installare REA verificare versione pubblicata, strumenti effettivamente
esposti e prerequisiti della singola analisi: la documentazione del ramo main
non garantisce le stesse capacità del pacchetto installato.

## Prove da eseguire alla ripresa

- [ ] Accertare build Windows, adattatore, BLE Peripheral e advertising reale.
- [ ] Installare una mini app diagnostica e leggere `getSystemInfo().minAPI`.
- [ ] Provare invio e ACK con mini app aperta, dapprima mantenendo Zepp collegato.
- [ ] Ripetere con telefono spento e nessun collegamento Internet.
- [ ] Provare con mini app corrente e schermo spento; misurare tenuta nel tempo.
- [ ] Tornare al quadrante e verificare ricezione/ACK, distinguendo il risultato
      atteso negativo dal solo caso schermo spento.
- [ ] Programmare una pausa breve (esempio: 60 secondi), ricevere ACK, chiudere
      l'app watch, spegnere il telefono, sospendere il PC e verificare la scadenza.
- [ ] Misurare circa 10 secondi di vibrazione e stop autonomo in tutte le modalità
      pertinenti, senza usare timer globali vietati nel servizio.
- [ ] Verificare duplicati, ACK perso, retry, comandi scaduti e scarto orologi.
- [ ] Se necessario, cercare un canale diverso con REA e dimostrare prima
      PC → watch sul quadrante → ACK, oppure il ponte Android offline completo.

Il collaudo dell'esperienza ideale deve partire con telefono spento, nessuna
Internet e watch sul quadrante: comando dal PC, programmazione confermata,
successiva sospensione PC, vibrazione finale e stop automatico. Questo caso
non è dimostrato dalle API pubbliche esaminate. Non dichiarare la funzione
completata da una ricerca documentale o dal solo successo con app watch aperta.

Se serve aprire l'app sul watch per ogni pausa, oppure una volta per sessione,
spiegare esattamente il compromesso e ottenere la preferenza dell'utente prima
di adottarlo come esperienza definitiva. Non è stato promesso che basti un OK.

## Fonti e punti di ingresso

Fonti consultate nella conversazione e riferimenti per riprendere. I dettagli
non verificati sul dispositivo rimangono tali anche se una primitiva è documentata.

- [Zepp — BLE Central](https://docs.zepp.com/docs/guides/framework/device/ble-central/).
- [Zepp — App Service e limitazioni](https://docs.zepp.com/docs/guides/framework/device/app-service/).
- [Zepp — timer persistente alarm.set](https://docs.zepp.com/docs/reference/device-app-api/newAPI/alarm/set/).
- [Zepp — Vibrator](https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Vibrator/).
- [Zepp — Side Service](https://docs.zepp.com/docs/guides/framework/side-service/intro/).
- [Zepp — informazioni dei dispositivi](https://docs.zepp.com/docs/reference/related-resources/device-list/).
- [Microsoft — Bluetooth GATT Server](https://learn.microsoft.com/en-us/windows/apps/develop/devices-sensors/gatt-server).
- [REA — repository e README](https://github.com/morluto/rea).
- [REA — analisi Android](https://github.com/morluto/rea/blob/main/docs/android-analysis.md).
- [REA — analisi firmware](https://github.com/morluto/rea/blob/main/docs/firmware-analysis.md).
- [REA — installazione e distinzione main/pacchetto](https://github.com/morluto/rea/blob/main/docs/installation.md).

## Mandato della Deep Research conservato per ripresa

Il prompt fornito prima del report chiedeva una ricerca riferita al Balance
originale e al firmware indicato, separando sempre API documentate, risultati
dimostrati da progetti pertinenti, ipotesi da collaudare e capacità non accertate.
I dispositivi, le versioni e tutti i vincoli del prompt sono riportati sopra.

Le domande richieste erano:

1. **Collegamento diretto:** Balance Central verso GATT Windows e direzione
   opposta; API_LEVEL, permessi, capacità hardware, helper Electron e coesistenza
   con Zepp. Non confondere il canale Side Service con GATT generico.
2. **Ricezione:** mini app chiusa, quadrante, schermo spento, limiti `mst*`,
   servizi/widget/eventi, apertura automatica della UI, energia e riconnessione.
3. **Timer:** persistenza dopo chiusura e disconnessione, vibrazione di circa
   10 secondi e stop autonomo, Non disturbare/sonno e controllo del timer nativo.
4. **Ponte Android:** PC ↔ Android offline, ingresso effettivo al Side Service,
   telefono bloccato e batteria Redmi; distinguere Bluetooth, rete locale e cloud.

Il risultato richiesto comprendeva verdetti separati per diretto e ponte,
tabella comparativa, architettura con API/hardware, ostacoli, prototipo minimo,
collaudo ideale con telefono spento e quadrante, protocollo con ACK/duplicati/
ritardi e compromesso minimo se l'obiettivo completo non fosse fattibile.
Il mandato chiedeva fonti primarie Zepp/Microsoft/Android, codice verificabile
per i progetti esterni e nessuna implementazione completa nella ricerca.

## Esito della registrazione

Solo documentazione: report integrale conservato senza alterarlo, requisiti e
limiti registrati, fonti collegate, proposta aggiunta tra gli approfondimenti e
decisione appesa con `tools/append_decision.py`. La funzione resta aperta e
separata dalla coda LISTA_ORDINE. Nessuna prova hardware o suite applicativa
viene dichiarata eseguita per questa registrazione.

## Ricontrollo del 15 ottobre — riuso del protocollo nativo

### Cosa rispondeva già il materiale precedente

Riletti D-0292, D-0298 e D-0302, il documento di ripresa e tutte le sezioni del
report integrale. La copia nella radice e quella in docs/research hanno ancora
lo stesso SHA-256 riportato sopra. La ricerca locale nei documenti e nel codice
non ha individuato altri prototipi Balance o implementazioni da riprendere.

Le risposte già presenti sono: helper Windows separato da Electron, watch Central
e PC Peripheral per il percorso mst*, alarm persistente dopo ricezione/ACK,
limite API_LEVEL e sequenza di prove per vibrazione/schermo/quadrante. L'ingresso
Android → Side Service era esplicitamente ancora un'ipotesi. D-0292 chiedeva di
riusare protocolli esistenti prima di REA, senza averne selezionato uno.

Il limite documentato delle mst* riguarda quella specifica architettura di mini
app: non dimostra l'impossibilità di ogni comando remoto sul protocollo nativo
con cui un companion gestisce il watch.

### Nuova pista concreta: Gadgetbridge e sveglie native

La pagina ufficiale [Amazfit, sezione Balance](https://gadgetbridge.org/gadgets/wearables/amazfit/#balance)
elenca il modello originale come ampiamente supportato, con chiave Huami per
l'associazione. La [pagina Zepp OS](https://gadgetbridge.org/basics/topics/zeppos/)
documenta gestione sveglie e pattern di vibrazione, avvertendo che le capacità
effettive dipendono dal dispositivo; cita anche BT Classic per firmware recenti
del Balance. Non è una verifica del firmware 3.28.50.1 o della coesistenza Zepp.

Esaminati due sorgenti del repository ufficiale Codeberg, congelati al commit
`7f978c7f7bab10e4e0b1ca6d7c46b86ba2ca798d`:

- [ZeppOsAlarmsService.java](https://codeberg.org/Freeyourgadget/Gadgetbridge/src/commit/7f978c7f7bab10e4e0b1ca6d7c46b86ba2ca798d/app/src/main/java/nodomain/freeyourgadget/gadgetbridge/service/devices/huami/zeppos/services/ZeppOsAlarmsService.java):
  endpoint 0x000f; comandi di creazione, cancellazione, richiesta e relativi ACK.
  Il payload contiene slot, abilitazione, ora, minuto e ripetizione. Non mostra
  un campo secondi/durata countdown. La lettura restituisce le sveglie del watch.
  Il messaggio UI di invio di onSetAlarms viene emesso dopo l'accodamento: non
  prenderlo come conferma del watch. Gli ACK ricevuti sono gestiti separatamente.
- [ZeppOsAuthenticationService.java](https://codeberg.org/Freeyourgadget/Gadgetbridge/src/commit/7f978c7f7bab10e4e0b1ca6d7c46b86ba2ca798d/app/src/main/java/nodomain/freeyourgadget/gadgetbridge/service/devices/huami/zeppos/services/ZeppOsAuthenticationService.java):
  mostra negoziazione della sessione e uso della chiave del dispositivo. Non
  basta trasmettere un payload GATT non autenticato a una characteristic.

Nella directory services esaminata non emerge un servizio dedicato al countdown;
questo non prova l'assenza di un comando nel firmware o in altre parti del codice.
Il mirror GitHub è archiviato: per nuove verifiche usare Codeberg e fissare commit.
Nessun codice di Gadgetbridge è stato integrato nel prodotto.

La [Alarms Intent API](https://gadgetbridge.org/internals/automations/intents/alarms/)
offre già ingresso da app terze Android per impostare sveglie, previa abilitazione.
Accetta ora/minuto e ripetizione; non restituisce una risposta strutturata e può
ignorare richieste senza slot disponibile. È una pista distinta dal tentativo di
chiamare il Side Service interno a Zepp. Non è una API countdown con ACK.

### Implicazioni, da trattare come ipotesi

| Percorso candidato | Cosa cambia | Cosa manca |
| --- | --- | --- |
| PC → bridge Android → Gadgetbridge → sveglia nativa | Ingresso Android pubblico già documentato, senza dipendere da mst* della nostra mini app | Telefono durante invio, trasporto PC/Android, associazione, slot, riscontro sul watch, precisione e aptica |
| PC → protocollo Zepp nativo → sveglia o mini app | Il codice esistente può orientare un helper Windows con PC Central, separato dal vecchio percorso PC Peripheral | Autenticazione e trasporto completi, connessione dal quadrante, compatibilità firmware e coesistenza con Zepp |
| Mini app aperta → mst* → alarm | Resta il percorso con più API ufficiali già descritto | Compromesso di apertura e prove hardware già elencate |

Una sveglia all'ora corrente più X minuti potrebbe fornire un avviso autonomo,
ma è un'inferenza da collaudare e un compromesso rispetto al countdown richiesto:
se la pausa parte alle 10:00:45, la granularità minuto non rappresenta esattamente
10:05:45. Occorre definire l'eventuale arrotondamento, passaggio a mezzanotte,
riuso di uno slot dedicato e scadenze ravvicinate. Non sovrascrivere le sveglie
personali o usare cancellazione globale per liberare slot. Countdown visibile,
vibrazione di 10 secondi e stop automatico rimangono non dimostrati.

Prima di scegliere questo percorso verificare anche mantenimento di Zepp,
effetti delle impostazioni aptiche sulle altre sveglie e riscontro effettivo della
programmazione. Non installare/disassociare/reset del dispositivo per deduzione
dalla sola pagina di supporto.

### Integrazione pronta per la Deep Research già avviata

> Considera anche Gadgetbridge, repository attuale su Codeberg. Il Balance
> originale è elencato come supportato. Al commit
> 7f978c7f7bab10e4e0b1ca6d7c46b86ba2ca798d, ZeppOsAlarmsService.java implementa
> programmazione e lettura di sveglie native (endpoint 0x000f, ora/minuto/slot),
> e ZeppOsAuthenticationService.java documenta nel codice la sessione autenticata.
> Esiste inoltre l'Alarms Intent API per app Android terze. Verifica prima se
> questi percorsi permettono un comando dal quadrante senza mini app aperta:
> con Android/Gadgetbridge come ponte oppure portando il solo protocollo su
> Windows. Cerca un comando countdown distinto dalla sveglia. Non confondere
> l'invio dell'intent o il messaggio UI del companion con ACK del watch. Distingui
> precisione al minuto, countdown visibile e durata/stop della vibrazione; verifica
> coesistenza con Zepp e firmware 3.28.50.1. Queste sono piste documentali, non
> prove hardware. Non proporre reset o sovrascrittura delle sveglie personali.

### Artefatti e limiti della verifica

Snapshot pubblici e manifest in
`local-artifacts/balance-protocol-review-2026-10-15/`, ignorato da Git.

| File | SHA-256 |
| --- | --- |
| ZeppOsAlarmsService.java | afd8b1d549b44c88321c65f940b3705c20556704c7bb7821dc19c6c1a106be03 |
| ZeppOsAuthenticationService.java | c716cf580251fde0a8a8d977368e31e55c8cb106bec3daa3b882e4aa8f326cc3 |

Le pagine Codeberg non erano accessibili tramite il lettore web; directory,
commit e sorgenti sono stati recuperati con richieste HTTPS PowerShell verificate.
Un primo tentativo Python è fallito per verifica del certificato; nessun bypass
TLS utilizzato. Nessun APK/firmware, installazione, chiave personale, connessione
al watch o chiamata AI. Solo analisi statica/documentale, funzione ancora aperta.
