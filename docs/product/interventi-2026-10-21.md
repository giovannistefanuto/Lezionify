# Interventi del 21 ottobre 2026 — prime dieci attività

Perimetro: posizioni 1–10 della coda, voci 54, 53, 57, 52, 61, 62, 58,
33, 55 e 60. Intervista `grilling`: otto risposte approvate e conferma finale
(D-0382). Nessuna voce successiva avviata.

## Comportamenti concordati e implementazione

| Posizione | Comportamento |
| --- | --- |
| 1 | Q&A subito al punto, senza aperture, chiusure rituali o domande finali non richieste; istruzioni sulle fonti conservate. |
| 2 | Breve/Lunga per prossimo invio, iniziale o follow-up. Breve predefinito, preferenza globale locale ricordata dopo il riavvio. Prompt meno/più di 200 parole, senza taglio locale. |
| 3 | Memo sospende cronometro e stima residua. La sessione non viene azzerata; chiudere Memo conserva un'eventuale pausa esplicita. |
| 4 | Tutti con lista unica e gruppo modificabile per riga, scelta gruppo per nuove attività e appunti richiudibili con editor per gruppo. Filtri, copia e gestione gruppi conservati. |
| 5 | Q&A riempie il pannello anche quando il suo CSS arriva dopo gli stili generali. Larghezze ordinarie/Focus e zoom restano indipendenti. |
| 6 | Casuale avvia un suono installato; esaurisce il giro prima di ripetere, evita il corrente quando esiste un'alternativa nel giro. Volume, dissolvenze e pausa con audio lezione riusati; nessun download implicito. |
| 7 | Traduttore offline con textarea originale e risultato a caratteri leggibili uguali, inversione centrale e copia. Riquadri verticali su finestre strette, testi lunghi scorrevoli. Dizionario e riconoscimento IT/EN conservati. |
| 8 | Ctrl+L conservato. Collaudo nativo positivo; diagnosi esterna del cerchio e limite sul caso storico descritti sotto. |
| 9 | Togli tempo nella Dashboard: oggi per corso, compreso tempo manuale, oppure ultima lezione su tutte le sue sessioni. Data, disponibile e riepilogo prima della conferma; sottrazione dalle sessioni più recenti, limite anche nel main. |
| 10 | Controllo locale prima dei tentativi Gemini e dell'accesso al client SDK, compresi Files audio, polling e streaming. Offline mostra «Non c’è connessione Internet. Riconnettiti e riprova.» e ferma retry/fallback. |

## Persistenza del tempo

Ogni sessione mantiene `durationSeconds` originale e un elenco opzionale locale
`corrections` con secondi sottratti e data della rettifica. Statistiche e totali
lezione usano la durata effettiva. Il salvataggio del timer conserva le
rettifiche già presenti e ignora quelle eventualmente fornite dal renderer.
Le operazioni sono serializzate: due sottrazioni concorrenti non possono
superare il disponibile. Le sessioni storiche funzionano senza migrazione.
La Dashboard mostra il tempo già salvato; secondi ancora non persistiti dal
timer periodico non sono rettificabili.

## Spazio vuoto Q&A

La prova con stili generali inseriti per ultimi passava. Riprodotto invece
il caricamento differito reale di `qna.css`: `.expanded` e `.collapsed`
sovrascrivevano la larghezza del figlio con valori fissi. La regressione
Electron falliva con «Q&A leaves empty space inside its resized pane».
Le regole dei contenitori hanno ora specificità sufficiente in entrambe le
viste; la stessa prova passa, anche dopo ridimensionamento.
Con il nuovo toggle, la citazione espansa è limitata a 150px (o 30vh su
finestre più basse) per conservare lo spazio dei messaggi, restando scorrevole.

## Ctrl, cerchio bianco e limite residuo

Controlli puntuali in sola lettura nel profilo reale: PowerToys in esecuzione,
`FindMyMouse` abilitato e `activation_method.value = 0`. Nel sorgente Microsoft
0 corrisponde a `DoubleLeftControlKey`. Questo spiega il riflettore dopo due
pressioni del Ctrl sinistro, distinto dal cambio lingua di Lezionify. La
proprietà Windows `MouseSonar` non risulta presente. Nessuna impostazione di
Windows o PowerToys modificata.

Fonti ufficiali consultate il 21 ottobre:
[Mouse Utilities](https://learn.microsoft.com/en-us/windows/powertoys/mouse-utilities),
[enum FindMyMouseActivationMethod](https://github.com/microsoft/PowerToys/blob/main/src/modules/MouseUtils/FindMyMouse/FindMyMouse.h).
In PowerToys → Utilità mouse → Trova il mio mouse si può scegliere un altro
metodo di attivazione o disattivare la funzione.

`--language-shortcut-only` passa con input nativo Electron, pulsante, vista
ordinaria e Focus/fullscreen. Non è una cattura dell'episodio storico in cui
il vero Ctrl+L non cambiava lingua: quella segnalazione della voce 33 rimane
aperta. Ripresa nella [diagnosi precedente](../quality/ctrl-l-diagnosi-2026-10-16.md);
usare l'eventuale traccia dell'episodio, senza ripetere le prove manuali già fatte.

## Limiti AI e rete

Nessuna chiamata Gemini reale durante lo sviluppo: i test SDK sono sintetici.
Le istruzioni su lunghezza e tono non garantiscono ogni risposta reale.
La connettività usa `net.isOnline()` di Electron nel main, senza sondaggi AI
o trasferimenti aggiuntivi. Il sistema può considerare online una rete con
portale o collegamento limitato: un errore verso Google resta allora distinto
dall'offline confermato. Il controllo viene ripetuto dopo errori di rete o
timeout. Domande salvate e lavori restano recuperabili; la riconnessione non
genera automaticamente un nuovo invio AI.

## Verifiche e consegna

34 Vitest mirati superati per prompt, connettività, shuffle e rettifiche,
inclusi riavvio, concorrenza e conservazione dopo nuovi snapshot. Electron:
Memo piatto con appunti conservati, preferenza Lunga ricordata, CSS differito,
dialogo rettifica e limite disponibile, frasi lunghe complete e caratteri
uguali, timer Memo e pausa esplicita, Ctrl+L nativo. Immagini sintetiche locali
in `local-artifacts/interventi-2026-10-21/`, ispezionate durante il lavoro.

Il primo controllo completo ha rilevato una regressione introdotta sugli
errori terminali: saltava anche cooldown e sospensione quota. Corretto per
escludere soltanto l'offline terminale; 24 test pertinenti nuovamente verdi.
Il sandbox impediva avvio Electron e rinomine della cache Vitest; esecuzioni
con runtime normale riuscite senza indebolire i controlli.

Controlli superati: typecheck, lint, 646 Vitest in 49 file, 24 Python, 41 Node
Q&A, suite Electron completa e riavvio reale, build di produzione ed export
PDF reali. Gli ultimi passaggi sono registrati separatamente in `hooks-final.log`,
`build.log` e `pdf.log` nella cartella locale delle verifiche. Le prime esecuzioni
complete si erano fermate su un menu laboratorio intermittente (poi positivo
isolato e completo), sull'altezza della citazione Q&A (corretta) e su due
aspettative precedenti dei test (gruppi separati e input monoriga), aggiornate
al comportamento concordato mantenendo i controlli sui dati.

Installer generato e verificato in D-0384: `dist/Lezionify-Setup-0.1.0.exe`,
190.814.571 byte, SHA-256
`a0695817205c5edfb44112219ab97c3518b8a3701c7791ee99dcee208ba2af24`.
Packaging NSIS x64 con pubblicazione disabilitata, codice 0; 370 file `out`
identici nell'ASAR, marcatori delle nuove funzioni presenti, FFmpeg e runtime
offline verificati, manifesto SHA-512/dimensione e blockmap coerenti.
Il verificatore usa separatori nativi Windows per l'estrazione ASAR.

Backup precedente in `local-artifacts/installer-backups/20261021-prime-dieci/`:
setup, blockmap e `latest.yml`, con hash verificati in `backup.json` e report
finale `verification.json`. Nessun artefatto privato nel pacchetto. Chiudere
Lezionify prima di eseguire il setup. Nessuna installazione, pubblicazione,
commit o push automatici.

## Stato per la ripresa

Nove attività concluse (posizioni 1–7, 9 e 10). La posizione 8/voce 33 resta
aperta solo per l'episodio storico di vero Ctrl+L non riprodotto: spiegazione
del cerchio, fonti e prova nativa corrente sono documentate sopra. Per riprenderla
usare `diagnosing-bugs` con l'eventuale traccia dell'episodio, senza duplicare
la diagnosi già fatta. Nessuna delle attività dalla posizione 11 in poi è stata
avviata; l'ordine e le caselle nella raccolta sono allineati a D-0383.
