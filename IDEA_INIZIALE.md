# Idea iniziale — Lezionify

## Problema

Lo studente registra le lezioni universitarie con un registratore USB, rinomina e sposta manualmente gli audio, li trascrive in lotti tramite Google Colab e Whisper, poi incolla le trascrizioni in Gemini per dividerle e rielaborarle. Il flusso e' fragile, dispersivo e rende difficile ritrovare una lezione o il contesto corretto per studiare.

## Visione

Lezionify e' un'app desktop local-first per trasformare registrazioni di lezioni in materiale di studio ordinato, ricercabile e leggibile. Riduce i passaggi manuali senza nascondere le fonti: l'audio originale e la trascrizione grezza restano sempre disponibili.

## Utente iniziale

Uno studente di Ingegneria Informatica magistrale che gestisce piu' corsi, lezioni lunghe e contenuti tecnici con formule, termini specialistici e codice.

## Flusso desiderato

1. Collegare il registratore o scegliere una cartella di importazione.
2. Importare gli audio, evitare duplicati e associare ogni file a un corso e a una data.
3. Trascrivere gli audio automaticamente oppure importare una trascrizione gia' prodotta.
4. Dividere semanticamente la trascrizione in parti.
5. Generare una lezione Markdown unica, ben strutturata e con formule LaTeX renderizzate.
6. Consultare, cercare, copiare il contesto per Gemini e segnare lo stato di studio.

## Principi di prodotto

- **Local-first:** i dati restano nel computer; l'invio a servizi AI e' una scelta esplicita e configurabile.
- **Fonte prima dell'AI:** audio e trascrizione grezza non vengono sovrascritti dal testo elaborato.
- **Riprendibilita':** importazioni e lavori AI devono poter fallire, ripartire e mostrare chiaramente il proprio stato.
- **Basso carico cognitivo:** ogni lezione deve essere semplice da trovare, controllare e riprendere.
- **Costo sotto controllo:** preferire strumenti gratuiti o con costo occasionale molto basso; non dipendere da abbonamenti mensili.

## Ambito della prima versione

- Gestione di corsi e lezioni.
- Importazione locale e rinomina assistita.
- Archiviazione di audio, trascrizioni e Markdown generato.
- Pipeline AI configurabile per trascrizione, segmentazione e generazione.
- Lettura Markdown con supporto LaTeX, ricerca testuale e stati di avanzamento.
- Copia del contesto di una lezione per continuare una conversazione in Gemini esterno.

## Fuori dall'ambito iniziale

- Un clone completo di Notability.
- Collaborazione multiutente o sincronizzazione cloud.
- Una chat AI interna completa: verra' valutata dopo che archivio, ricerca e pipeline sono affidabili.
- Rilevamento perfetto e universale del registratore USB: deve esistere anche un import esplicito da cartella.

## Questioni ancora aperte

- Stack desktop e strategia di distribuzione Windows.
- Provider e modelli AI definitivi, quote e costo reale.
- Metodo affidabile per identificare corso e numero della lezione.
- Formato del registratore, percorso dei file e strategia di backup.
- Interfaccia esatta per validazione, ricerca e futuro assistente conversazionale.
