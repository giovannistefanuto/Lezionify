# Collaudo Q&A reale — 11 settembre 2026

Il comando `npm run test:qna-real` ha eseguito due richieste consecutive al modello Gemini configurato nell'app, usando soltanto testo sintetico.

- Modello: `gemini-3.6-flash`.
- Primo turno: risposta ricevuta, 1.119 caratteri.
- Secondo turno: risposta ricevuta, 14 caratteri.
- Verifica: il secondo turno ha recuperato correttamente il codice `FOCUS-2718`, presente nella domanda e nello storico del primo turno.
- Esito: **PASS**.

La chiave API viene letta tramite `SettingsService` e `safeStorage`; il runner non la stampa, non la salva in file di test e non registra contenuti dell'utente.
