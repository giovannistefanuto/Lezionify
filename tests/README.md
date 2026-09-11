# Test

- `unit/`: suite Vitest deterministica per backend, persistenza, parsing, ricerca, prompt e utility UI.
- `integration/`: scenari React eseguiti in Electron e collaudi remoti opzionali.

Comandi principali:

```powershell
npm test
npm run test:hooks
```

`npm run test:qna-real` utilizza la configurazione cifrata dell'app e contatta Gemini. Non viene eseguito in CI e deve usare soltanto dati sintetici.
