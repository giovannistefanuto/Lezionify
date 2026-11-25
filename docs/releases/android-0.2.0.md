# Lezionify Android 0.2.0

## Novità

- Nuovo widget **Lezionify Memo**, separato dal widget delle statistiche.
- Consultazione per gruppo delle cose da fare, comprese quelle completate, e del testo del campo **Note** scritto sul PC.
- Cambio gruppo, scorrimento, pagine per elenchi lunghi, lettura completa nell’app e ultima copia disponibile offline.
- Widget compatibile con i temi chiaro e scuro. Il widget delle statistiche conserva layout e conteggi.

## Dati e riavvio

Aggiornamento sul posto del pacchetto `it.lezionify.mobile`, versione interna 4.
Firma identica al companion 0.1.2: installare con `adb install -r`, senza
disinstallare, per conservare dati e abbinamento. Nessuna credenziale inclusa nell’APK.

Memo richiede anche la versione desktop 0.8.0 che integra il nuovo invio e
l’attivazione esplicita di **Sincronizza anche Memo** nelle impostazioni Android
del PC. Il collegamento esistente rimane valido. Su desktop 0.7.0 le statistiche
continuano a funzionare, ma Memo non viene ancora inviato.

## Limiti noti

Memo è di sola lettura. Il PC deve essere in uso per inviare modifiche;
Android può ritardare gli aggiornamenti periodici. Il riepilogo completo ha
limite di 240.000 byte UTF-8: un superamento viene segnalato senza tagliare note.
APK firmato con la stessa chiave debug locale delle precedenti installazioni;
non è una distribuzione Play Store. Test del widget su emulatore API 36.1;
collaudo prolungato Doze e installazione sul telefono personale ancora da eseguire.

Distribuzione GitHub separata dall'aggiornamento Windows. Nessuna installazione
automatica sul telefono personale.
