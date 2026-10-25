# Interventi del 22 ottobre 2026 — prime 17 attività e RAG

Richiesta diretta: implementare le prime 17 posizioni della coda D-0390 e la
diagnosi RAG della posizione 21 (voce 69), collaudare e aggiornare il setup
entro le 14:00 Europe/Rome. L'intesa dopo grilling è registrata in D-0391.
Il perimetro comprende 18 attività; le altre restano aperte.

Stato: **18 attività implementate e collaudate**. Dopo il primo setup D-0393,
la regressione aggiuntiva sull’indice GitHub è stata corretta e il gate finale
è superato. Il setup definitivo D-0394 è generato e verificato, conclusione
alle 12:55 Europe/Rome, prima della scadenza richiesta.

Successivo intervento dopo nuove segnalazioni: [recupero RAG da timeout e 503](../quality/rag-recupero-2026-10-22.md), con budget condiviso, attese e installer aggiornato.

## Comportamento adottato

| Posizione | Voce | Risultato |
| --- | --- | --- |
| 1 | 72 | Q&A Breve / Media / Lunga, preferenza persistente e validata nel main; Breve iniziale. |
| 2 | 74 | Suggerimenti locali nella pausa già avviata: caffè senza telefono, libro, passeggiata/gatti per 5/15/30 minuti. |
| 3 | 88 / U13 | Nome della domanda e del ritorno alle discussioni, errore annunciato e bozza recuperabile. |
| 4 | 76 / U01 | Discussioni come pulsanti nativi, Invio/Spazio, ultima discussione riconoscibile e ritorno del focus. |
| 5 | 79 / U04 | Metadati più scuri e Continua con fondo verde scuro; contrasto minimo 4,5:1 verificato sui colori interessati nei due temi. |
| 6 | 87 / U12 | Apertura immediata della lezione; rinomina da menu oppure F2, senza attesa per il doppio clic. |
| 7 | 81 / U06 | Elabora archivio con ambito visibile, audio/testi inviati a Gemini e fasi ITA/ENG mancanti. |
| 8 | 77 / U02 | Focus Lock nominato, sfondo inerte, focus confinato e ripristinato; Ctrl+T resta utilizzabile. |
| 9 | 78 / U03 | Focus Lock con altezza limitata alla viewport e scroll proprio, collaudato a 900×640 e zoom 100/200%. |
| 10 | 80 / U05 | Chat con storico scorrevole separato dalla composizione; conteggio locale in sezione espandibile. |
| 11 | 67 | Copia tutto/gruppo protetta tutti i giorni 08:00–17:30; fuori fascia copia immediata. |
| 12 | 82 / U07 | Memo come nome delle superfici collegate, Aggiorna cartelle, etichette nella sidebar espansa e log fra gli strumenti secondari. |
| 13 | 83 / U08 | Barre più compatte, zoom nominati e una chiusura primaria Q&A, conservando divisori e comandi di lettura. |
| 14 | 85 / U10 | Player dei suoni sempre raggiungibile nel pannello, Casuale compatto e opzioni secondarie espandibili. |
| 15 | 86 / U11 | Anteprima attività su due righe e Leggi tutto/Modifica accessibili senza hover. |
| 16 | 84 / U09 | Nome completo del corso, copertura e lacune, sezioni esplicite di fonti/deduzione/integrazione generale. |
| 17 | 68 | Pubblicazione GitHub per corso, corsi esistenti abilitati e scelta esplicita sui nuovi. |
| 21 | 69 | Contratto strutturato RAG, recupero degli output invalidi, citazioni verificate, bozza e retry senza duplicare la domanda. |

### Q&A e pause

Breve istruisce il modello a restare sotto 200 parole, Media fra 200 e 400,
Lunga oltre 400. Sono istruzioni, non un taglio del testo o una garanzia sul
conteggio. Scelta globale conservata alla riapertura e inviata anche nei
follow-up/fallback. I valori IPC non ammessi sono rifiutati.

Focus Lock conserva 15 secondi prima della sola uscita, pause immediate ed
Esc per tornare allo studio. La pausa non introduce un altro timer né una
conferma. La regressione completa ha rilevato il caso del dizionario nel
portale fullscreen: il contenitore che lo ospita deve rimanere disponibile
anche se il dizionario viene aperto dopo Focus Lock.

### Copia consapevole

La fascia iniziale è **08:00 inclusa–17:30 esclusa**, ogni giorno, modificabile
nelle Impostazioni generali e salvata subito sul computer. È supportata anche
una fascia oltre mezzanotte; orari uguali indicano l'intera giornata.

Ogni tentativo protetto richiede una frase locale variabile di 15–25 parole.
Maiuscole e spazi superflui non contano; parole, accenti e punteggiatura restano
significativi. Copia/incolla, taglio, menu contestuale e trascinamento sono
intercettati nel box. La copia degli appunti avviene soltanto dopo la frase
corretta, una volta; Esc/Annulla torna a Memo senza perdere dati. Un errore di
clipboard permette di riprovare senza riscrivere la frase. Fuori fascia non
si apre alcuna conferma. Il testo da copiare è conservato come snapshot locale
del tentativo e non viene inviato all'AI.

### Musica in Focus

L'icona Musica presente in Focus è conservata: **nessun nuovo titolo, indicatore
o player visibile durante lo studio**. Le modifiche sono nel pannello aperto
dal clic. Il player dei suoni è all'inizio e resta raggiungibile scorrendo il
catalogo; distingue riproduzione, pausa e auto-pausa durante l'audio lezione.
Crediti e licenze restano consultabili. I player esterni e le transizioni
residue della voce 38 conservano i limiti precedenti.

### GitHub per corso

Nel form del corso la scelta Sì/No è obbligatoria per i nuovi corsi. La
migrazione registra una sola volta i corsi già configurati e quelli presenti
nelle lezioni; questi conservano l'abilitazione precedente. I nuovi codici
non configurati restano esclusi finché non viene espressa una scelta.

La migrazione aggiunge solo il metadato necessario al JSON locale: non decifra
o ricifra le credenziali. La preferenza è validata nel main, conservata alla
rinomina e applicata ai conteggi, alle letture delle fonti, ai file generati e
ai tentativi successivi di pubblicazione. L’indice principale include solo
lezioni del lotto autorizzato o coppie schema/trascrizione già presenti sul
remoto: cartelle e lezioni esclusi rimasti soltanto nel clone dopo un errore
non vengono elencati né conteggiati nell’indice. I checkpoint restano per destinazione.
Si ricontrollano i consensi prima della preparazione finale e del push.

Disattivare un corso ferma gli invii futuri senza cancellare i file remoti.
Anche un vecchio commit locale non pubblicato potrebbe contenere un corso
ora escluso: il client verifica l'allowlist prima del nuovo invio e sospende
la pubblicazione se trova contenuti non autorizzati. In quel caso occorre
controllare il clone e i consensi prima di riprovare; non viene forzato un push
né cancellato il lavoro locale.

## Diagnosi RAG e verifica reale

Il messaggio pubblico generico non identificava la causa. Nei log locali del
22 ottobre i tentativi falliti erano classificati `unknown`, senza payload
conservato utilizzabile per un replay della domanda personale.

La regressione `courseRagCompletion.test.ts` ha riprodotto un output JSON
incompleto che interrompeva il gestore come `unknown` non ritentabile. La
correzione usa schema JSON esplicito, validazione prima di accettare il
tentativo e categoria `invalid_output`, così il gestore può usare i fallback
entro i budget esistenti. Anche citazioni non presenti nei passaggi inviati
provocano un output invalido, mai un'attribuzione inventata accettata.

Una seconda regressione ha riprodotto bozza vuota dopo fallimento e domanda
duplicata al retry. Ora la bozza resta fino al successo; un retry dello stesso
testo con identica provenienza visiva riusa la domanda pendente. Errori
normalizzati mostrano il messaggio sanitizzato; gli altri restano generici.
I log aggiunti contengono soltanto categorie tecniche.

**Quattro invii Gemini reali complessivi**, con chiavi lette in memoria e fonti
sintetiche: una prova del completamento strutturato riuscita; una prima prova
end-to-end non riuscita; due prove end-to-end
successive riuscite con risposta e una citazione verificata, inclusa la
versione finale del validatore. Il contatore locale impedisce ulteriori invii
oltre quattro. Nessuna conversazione o fonte personale usata nei payload o modificata dai collaudi.

Questo conferma il funzionamento sui casi sintetici e il recupero dei guasti
riprodotti. Non prova retroattivamente il contenuto preciso della risposta
personale fallita, non conservata, né garantisce ogni futura risposta Gemini.

## Verifiche e limiti

- Gate finale: tutti i passaggi di `npm run check` eseguiti in sequenza, con
  Vitest limitato a due worker (`npx --no-install vitest run --maxWorkers=2`):
  tipi, lint, **681 test Vitest in 53 file**, **24 Python**, **41 Node**,
  intera suite Electron con riavvio, build e PDF reali superati. Il precedente
  `npm run check` completo era già passato con 680 test; la regressione
  aggiuntiva verifica che l’indice GitHub ignori i residui locali esclusi.
  Log conclusivo: `local-artifacts/interventi-2026-10-22/check-final.log`.
- `--october22-only`: tastiera nativa, discussioni, Media e bozza, contrasto
  nei due temi, Focus Lock 100/200%, copia protetta e immediata fuori fascia,
  copia gruppo, chat lunga e consenso sui nuovi corsi superati.
- `--memo-logs-export-only`: player raggiungibile dopo scroll completo del
  catalogo, transizioni e percorsi preesistenti superati.
- Schermate sintetiche locali in `local-artifacts/interventi-2026-10-22/captures/`:
  Q&A, copia, Memo, chat, Focus Lock, consenso e pannello Musica. Ispezionate
  visivamente; nessuna schermata personale aggiunta al repository.
- Le prove iniziali nel sandbox hanno incontrato vincoli su Electron e rename
  dei temporanei: i controlli conclusivi usano il runtime locale autorizzato.
  Un'esecuzione con acquisizioni di tutta la suite ha esaurito il timeout del
  runner; acquisizioni e suite completa sono quindi state eseguite separatamente,
  mantenendo le asserzioni e senza aumentare il timeout.
- Nell’ultima ripetizione, la concorrenza predefinita di Vitest ha prodotto
  timeout e un conflitto di pulizia dei temporanei su Windows; due worker
  hanno completato tutti i test senza cambiare timeout o asserzioni. La prova
  del comando Q&A mobile ora invia esplicitamente l’evento di scroll e attende
  un frame prima dell’asserzione, sincronizzandosi con il relativo osservatore.
- **NVDA non collaudato**: nomi, semantica e tastiera verificati non equivalgono
  a una certificazione di accessibilità. Il blocco copia è applicativo.

Nessuna nuova dipendenza, installazione automatica, pubblicazione reale GitHub,
commit o push. Fonti originali conservate. Le modifiche preesistenti sono state
mantenute; snapshot dei sorgenti iniziali in un archivio ZIP locale ignorato.

## Installer e ripresa

Il setup D-0394 descritto sotto è storico: il nuovo setup **D-0396** include
il recupero RAG e il confronto reale RL verificato; [dettagli e hash aggiornati](../quality/rag-recupero-2026-10-22.md#distribuzione).

Backup del setup precedente, blockmap e manifesto, con hash verificati:
`local-artifacts/installer-backups/20261022-diciassette-rag/backup.json`.
Setup NSIS x64 0.1.0 generato con `npx --no-install electron-builder --win --publish never`
(esito 0), senza installazione o pubblicazione automatica:

- File: `dist/Lezionify-Setup-0.1.0.exe`.
- Dimensione: **190.823.200 byte**.
- SHA256: `b41b969c05b93dffa0ea1eefae9438e85a9c5a67efed9a909aac1a70fb29129b`.
- Tutti i **372 file della build** identici al pacchetto ASAR; marcatori delle
  nuove funzioni, FFmpeg e runtime offline presenti.
- SHA512/dimensione nel manifesto, blockmap e tre backup verificati.
- Nessun archivio personale o artefatto locale nel pacchetto.

Verifica riproducibile: `node tools/verify_installer.cjs`; risultato in
`local-artifacts/installer-backups/20261022-diciassette-rag/verification.json`.
Il verificatore usa i separatori nativi Windows per estrarre i file ASAR.
Anche il primo setup intermedio D-0393 è conservato con tre hash verificati
in `local-artifacts/installer-backups/20261022-diciassette-rag/intermedio-D0393/`.
La consegna definitiva è registrata in D-0394 e sostituisce il setup D-0393.
Per aggiornare l'app, chiudere Lezionify e avviare il setup.

La prima attività ancora aperta della coda è la voce 33,
diagnosi Ctrl+L personale. Stima del tempo e formule Q&A restano rispettivamente
nelle voci 70 e 73; non rientrano in queste 18 attività. Nessuna altra voce avviata.
