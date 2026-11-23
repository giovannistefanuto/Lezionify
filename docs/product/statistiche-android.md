# Statistiche Lezionify su Android

Il widget mostra i tempi accreditati nei corsi attivi, il tempo odierno,
la settimana lunedi'-domenica, il mese di calendario e il numero di lezioni
importate non completate per corso. Le lezioni in corso sono comprese nel
numero residuo. Quando non puo' collegarsi resta visibile l'ultima copia,
con la data di generazione: Android puo' ritardare gli aggiornamenti periodici.

Il widget Marea segue il tema chiaro o scuro di Android. Il formato compatto
mostra lo studio di oggi, settimana e mese, più il totale delle lezioni
rimanenti. Allungando la scheda sulla Home compaiono i conteggi dei primi tre
corsi e il numero dei corsi aggiuntivi. Tocca la scheda per vedere tutti i corsi
nell'app oppure usa il pulsante in alto a destra per aggiornare dalla Home.

L'APK Android 0.1.1 è stato installato sul telefono il 18 novembre con un
aggiornamento sul posto. La Home mostra il totale e l'app conferma la
sincronizzazione riuscita con l'abbinamento esistente. I due temi e il
dettaglio esteso sono stati verificati anche con dati sintetici in emulatore.

## Periodi correnti offline — Android 0.1.2

Oggi, settimana da lunedì e mese sono ricalcolati dai giorni dello snapshot
rispetto alla data corrente nel fuso del riepilogo PC. Se non ci sono dati
per il periodo corrente viene mostrato zero; i giorni ancora appartenenti
alla settimana o al mese correnti continuano a contribuire. Le lezioni
rimanenti restano quelle dell'ultima sincronizzazione, la cui data rimane visibile.
La cache originale non viene riscritta o cancellata al cambio di data.

Il widget aggiorna localmente la vista su cambio data/orario/fuso e tramite
un allarme non esatto al successivo giorno, senza download per questi eventi.
Restano gli aggiornamenti periodici ogni 30 minuti e quelli manuali.
Android può differire allarmi e aggiornamenti quando il dispositivo è sospeso;
si ricalcola alla successiva esecuzione consentita dal sistema.
[Indicazioni Android ufficiali](https://developer.android.com/develop/ui/views/appwidgets/advanced).

[APK 0.1.2 pubblicato e verificato](https://github.com/giovannistefanuto/Lezionify/releases/tag/android-v0.1.2), separato dall'installer Windows: aggiornare il companion mantenendo
l'abbinamento. Prove e limiti nel [rapporto del 23 novembre](../quality/coda-qna-widget-2026-11-23.md).

## Preparazione GitHub

1. Usa un repository GitHub pubblico dedicato alle statistiche. Per il primo
   uso personale e' stato creato `giovannistefanuto/lezionify-statistiche`.
2. Apri [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new).
   Assegna un nome al token e scegli una scadenza appropriata.
3. In **Repository access** seleziona **Only select repositories** e indica
   solo il repository dati. In **Repository permissions**, imposta **Contents**
   su **Read and write**. Gli altri permessi rimangono ai valori predefiniti.
4. Genera e copia il token. Non incollarlo in chat, nel repository o nei log.
   La generazione puo' richiedere autenticazione GitHub.
5. Nella versione desktop aggiornata apri Impostazioni → Statistiche sul
   telefono Android e inserisci proprietario, repository, ramo `main` e token.
   **Attiva e invia** abilita esplicitamente l'upload. Il token e la chiave
   sono protetti dal sistema operativo; senza protezione non vengono salvati.
6. Mostra il codice di abbinamento, trasferiscilo in modo riservato e incollalo
   nell'app Android. Il codice contiene la chiave: chi lo possiede puo' leggere
   i riepiloghi. Non condividerlo in chat o in luoghi pubblici.

Il file inviato contiene solo aggregati e nomi dei corsi cifrati con AES-GCM,
non audio, dispense o trascrizioni. Il repository pubblico mostra comunque
dimensione, frequenza e cronologia dei file cifrati. Non esiste sincronizzazione
quando il PC e' spento; alla riapertura l'invio riprende. L'aggiornamento
manuale e' disponibile nell'app e nel widget.

Il collaudo su Android 15 del 17 novembre ha usato un corso sintetico. Dopo
upload cifrato, il telefono ha mostrato «Corso di prova · 3 da completare»
sia nell'app sia nel widget sulla Home. Successivamente l'utente ha installato
la versione desktop 0.2.5, configurato il token e confermato la visualizzazione
delle statistiche reali; Android riporta aggiornamento riuscito. I valori e i
codici personali non sono riportati qui. Non e' stato eseguito un confronto
automatico valore per valore con il desktop ne' un collaudo prolungato di Doze.

Il 23 novembre il telefono personale è stato aggiornato su richiesta da 0.1.1
(codice 2) a 0.1.2 (codice 3) tramite `adb install -r`. Installazione e apertura
verificate; nessuna disinstallazione, cancellazione dati o nuovo abbinamento.
