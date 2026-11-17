# Lezionify Android — anteprima

App e widget: integrazione desktop disponibile dalla versione Windows 0.2.5.
La [guida](../docs/product/statistiche-android.md)
documenta configurazione GitHub, limiti e collaudo sintetico.
L'APK di debug si puo' compilare con Gradle e l'Android SDK 35. In alternativa,
su Windows `build-local.ps1` usa build-tools 35 e il JDK di Android Studio senza
scaricare componenti. Produce un APK firmato con una chiave debug locale in
`app/build/local-debug/`; la chiave non e' adatta alla distribuzione.

La schermata accetta un codice base64url contenente un JSON di abbinamento con `url` (HTTPS
su raw.githubusercontent.com), `streamId` (32 caratteri esadecimali minuscoli)
e `key` (32 byte in base64). E' un segreto: non salvare esempi reali, loggarlo,
condividerlo o caricarlo nel repository. Il codice viene mostrato dal desktop
come testo; la scansione QR non e' ancora disponibile. La chiave e' protetta
dal Keystore del dispositivo. Il widget mostra
l'ultima copia valida e la data di generazione; Android puo' ritardare gli
aggiornamenti periodici. La verifica end-to-end con dati sintetici e' riuscita;
l'utente ha confermato la visualizzazione di statistiche personali.
