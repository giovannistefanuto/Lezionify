# Bozza per il post LinkedIn

Ho reso pubblico **Lezionify**, un progetto nato da un problema molto concreto: trasformare ore di registrazioni universitarie in materiale di studio ordinato senza perdere il legame con le fonti originali.

È un'app desktop local-first sviluppata con Electron, React e TypeScript. Importa e organizza le registrazioni, conserva separatamente audio e trascrizione grezza, permette la ricerca full-text e può generare dispense Markdown, formule, diagrammi, quiz, flashcard e Q&A tramite Gemini.

La parte più interessante, per me, non è stata soltanto integrare l'AI. Ho lavorato soprattutto su affidabilità e controllo dei dati:

- scritture atomiche e recovery;
- validazione runtime dei messaggi IPC;
- credenziali cifrate con le primitive del sistema operativo;
- operazioni AI esplicite e tracciabili;
- 120 test Vitest e 24 scenari React eseguiti nel runtime Electron;
- CI automatizzata su Windows.

Il progetto è ancora in alpha e lo pubblico intenzionalmente come **work in progress**: la roadmap e i limiti noti sono visibili nel repository.

Repository: **https://github.com/giovannistefanuto/Lezionify**

Feedback tecnico e suggerimenti sono benvenuti, soprattutto su local-first software, UX per lo studio e pipeline di trascrizione.

`#Electron` `#React` `#TypeScript` `#LocalFirst` `#AI` `#OpenToWork`

## Allegati consigliati

1. Dashboard completa con dati fittizi.
2. Vista lezione con formula e diagramma.
3. Quiz o flashcard.
4. Breve GIF del flusso importazione → dispensa.

Evita screenshot di codice come prima immagine: il prodotto comunica meglio partendo dal problema risolto e dall'interfaccia.
