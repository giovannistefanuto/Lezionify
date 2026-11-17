# Lezionify Android — anteprima

App e widget di prova: non e' ancora presente l'integrazione desktop o GitHub.
L'APK di debug si puo' compilare con Gradle e l'Android SDK 35. In alternativa,
su Windows `build-local.ps1` usa build-tools 35 e il JDK di Android Studio senza
scaricare componenti. Produce un APK firmato con una chiave debug locale in
`app/build/local-debug/`; la chiave non e' adatta alla distribuzione.

La schermata accetta provvisoriamente un JSON di abbinamento con `url` (HTTPS
su raw.githubusercontent.com), `streamId` (32 caratteri esadecimali minuscoli)
e `key` (32 byte in base64). E' un segreto: non salvare esempi reali, loggarlo,
condividerlo o caricarlo nel repository. Il generatore desktop e QR non esistono
ancora. La chiave e' protetta dal Keystore del dispositivo. Il widget mostra
l'ultima copia valida e la data di generazione; Android puo' ritardare gli
aggiornamenti periodici. La verifica di rete end-to-end resta da completare.
