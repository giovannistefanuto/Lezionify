# Rubrica per leggere i risultati Q&A senza Gemini

Data: 13 ottobre 2026. Applicare al run valido `benchmark-20261013-v3`.
La revisione dell'assistente conosce gli identificativi dei modelli: non è una
valutazione umana cieca né un benchmark universale.

## Valutazioni separate

1. **Esito tecnico:** successo completo, errore, output parziale/troncato o
   prova saltata per budget. Una risposta incompleta non è un successo.
2. **Correttezza rispetto al contesto:** corretta, parzialmente corretta,
   errata o non valutabile. Controllare calcoli, unità, codice e riferimenti.
3. **Informazione assente:** astensione semantica, invenzione di un fatto,
   oppure risposta non valutabile. È distinta dalla conformità del prefisso.
4. **Istruzioni e chiarezza:** risultato richiesto, lingua quando specificata,
   proporzione, formule leggibili, digressioni e passaggi spiegati.
5. **Screening automatico:** conferma o smentita dei marcatori attesi, da non
   trasformare direttamente in una percentuale di risposte corrette.

## Risposte attese dei dodici casi base

| Caso | Criterio sostanziale |
| --- | --- |
| definition-it | Stato e posizione del log entrambi persistenti prima dell'ACK |
| definition-en | Lease di 17 tick, rinnovo confermato sia da K sia da M |
| formula-it | 3L/R = 6 ms, 2D = 1,4 ms, totale 7,4 ms |
| formula-en | 3 ms = 0,003 s, T = 2400/(2*0,003) = 400.000 byte/s |
| code-cpp | Divisione intera; cast a double prima della divisione, mantenendo sum int |
| code-python | Seconda chiamata restituisce [1,2]; lista di default condivisa; correzione con None e nuova lista per ogni chiamata |
| example-it | Esempio audio + dispensa/note, fonte originale conservata, derivazioni eliminabili/rigenerabili |
| example-cross | Dopo aggiornamento confermato, letture dello stesso cliente mostrano il valore nuovo; altro cliente può vedere il precedente |
| followup-amdahl | p=0,8 dallo storico, S(4)=2,5, S(8)=10/3 circa 3,33; non raddoppia |
| followup-log | Riprodurre 43,44,45 in ordine, escludere offset fino a 42 |
| missing-it | Timeout Zaffiro assente: non proporre un valore numerico |
| missing-en | Capacità SilverQueue assente: non proporre un valore numerico |

## Falsi negativi e rilievi già osservati

- `formula-en`: la scrittura LaTeX `400{,}000` rappresenta il risultato corretto,
  ma può non superare la regex della fixture. Confermare la matematica leggendo
  il testo. Lo screening originale resta preservato, senza correggere i prompt
  durante il run per favorire un modello.
- `example-cross`: un esempio con nomi prima/dopo può spiegare correttamente
  la proprietà anche senza usare uno dei sinonimi previsti dalla regex.
- `example-it`: `note di studio` o `summary.pdf` possono esprimere la dispensa
  pur non contenendo letteralmente quella parola. Distinguere questo caso da
  una risposta che parla soltanto di trascrizioni e non fornisce l'esempio chiesto.
- `missing-en`: una risposta può dichiarare correttamente l'assenza del dato ma
  anteporre un titolo al prefisso o scrivere in italiano. La violazione del
  prefisso è un errore di istruzioni, non un'invenzione del valore del buffer.
  In questo caso la domanda è in inglese ma non contiene l'ordine esplicito
  di rispondere in inglese: non usarla come prova definitiva di qualità EN.
- Citare le sezioni distrattrici R2/V102 o aggiungere dettagli non richiesti
  può rendere la spiegazione meno focalizzata. Nel caso degli esempi, distinguere
  dettagli illustrativi inventati legittimamente da fatti attribuiti alla dispensa.
- La frase «read-your-writes rende la modifica immediata» va controllata: la
  garanzia del contesto riguarda letture dopo aggiornamento confermato, non
  una promessa di latenza nulla per una scrittura ancora in corso.

## Limiti di una revisione e dei campioni

Tre ripetizioni del medesimo caso non sono tre problemi indipendenti.
Le trenta varianti del runner introducono nuovi parametri o vincoli ma alcune
conservano struttura e domanda del caso base: riportarle separatamente.
Il contesto dichiara esplicitamente l'assenza di alcuni dati; un buon esito in
questi casi non dimostra la stessa astensione su dispense reali più ambigue.

Per il report finale riportare esempi concreti dei problemi, il numero di casi
distinti esaminati e le violazioni di istruzioni separatamente. Non derivare una
percentuale universale di correttezza dai soli marcatori o dalle latenze.
