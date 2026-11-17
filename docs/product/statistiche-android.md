# Statistiche Lezionify su Android

Il widget mostra i tempi accreditati nei corsi attivi, il tempo odierno,
la settimana lunedi'-domenica, il mese di calendario e il numero di lezioni
importate non completate per corso. Le lezioni in corso sono comprese nel
numero residuo. Quando non puo' collegarsi resta visibile l'ultima copia,
con la data di generazione: Android puo' ritardare gli aggiornamenti periodici.

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
sia nell'app sia nel widget sulla Home. Non sono ancora stati pubblicati o
verificati dati personali: occorrono il token limitato e la versione desktop
aggiornata installata. Il widget contiene fino all'abbinamento personale il
riepilogo sintetico di prova.
