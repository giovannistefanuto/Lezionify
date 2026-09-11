# Security policy

## Versioni supportate

Lezionify è attualmente in fase alpha. Solo il branch `main` riceve correzioni di sicurezza; non esistono ancora release pubbliche supportate.

## Segnalare una vulnerabilità

Non pubblicare vulnerabilità, chiavi API, percorsi locali o dati personali in una issue pubblica. Usa una GitHub Private Vulnerability Report quando disponibile nel repository.

Includi nella segnalazione:

- versione o commit interessato;
- impatto e condizioni necessarie;
- passaggi minimi per riprodurre usando dati sintetici;
- eventuale proposta di mitigazione.

## Modello di sicurezza

- I dati principali restano sul dispositivo dell'utente.
- Le funzioni Gemini sono opzionali e devono essere avviate esplicitamente.
- Le credenziali vengono cifrate con Electron `safeStorage` quando il sistema operativo lo consente.
- Audio e trascrizione grezza restano separati dagli output generati.

Il progetto non è ancora sottoposto a un audit di sicurezza indipendente e non deve essere considerato idoneo alla gestione di dati altamente sensibili.
