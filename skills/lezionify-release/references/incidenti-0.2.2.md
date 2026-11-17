# Diagnosi release 0.2.2, 17 novembre 2026

Ricostruzione da prove già eseguite, non una nuova riproduzione. Log integrali
locali sotto `local-artifacts/`, ignorato da Git; esiti in D-0539–D-0543.

| Sintomo | Evidenza e conclusione | Correzione del flusso |
| --- | --- | --- |
| Primo gate: 10/914 fallimenti | `release-0.2.2-check.log`: EPERM junction, sei errori FFmpeg, due Spotify e timeout calibrazione. Ripetendo fuori dal sandbox resta solo 1/914. Il contesto ristretto spiega nove fallimenti, non quello residuo. | Riconoscere subito i requisiti di processi nativi, junction e loopback e usare i permessi previsti, senza saltare test. |
| Calibrazione oltre 20 s | `release-0.2.2-check-elevated.log`: 913 passati. File isolato: 12/12 in 7,61 s. Con due worker suite: 914/914 in 65,34 s. Compatibile con contesa I/O/CPU; manca un profilo che attribuisca il ritardo al solo disco. | Preservare il limite a due worker adottato in D-0540; misurare prima di modificare timeout o implementazione. |
| Due download pubblici interrotti | Log di download e `runtime.log`: trasferimento parziale, ultimo avanzamento 36% nel primo tentativo, poi errore generico. `courseRagSemantic.ts` limita prepare a 180 s; runner esterno a 300 s. Timeout interno compatibile con l'esito; tracce insufficienti per distinguere rete, server o worker. | Un secondo tentativo a confezionamento terminato non risolve: fermare i retry e dichiarare il limite. Runtime con fixture e rifiuto del modello corrotto sono passati; download non dichiarato riuscito. |
| Secondo packaging | Le note definitive sul download arrivano dopo il primo installer; `validate_release.cjs` richiede uguaglianza fra note e manifesto. Rigenerato NSIS con `--prepackaged`, mantenendo ASAR, poi verificati nuovamente asset e payload. | Pianificare collaudi aggiuntivi e completare note prima della build finale. |
| `gh` mancante | PowerShell: comando non riconosciuto. Connettore disponibile senza upload release. Pubblicazione riuscita via API con credenziali Git in memoria. | Scegliere il metodo all'inizio e usare l'helper parametrico della skill; evitare script privati con versione fissata. |
| Upload lungo | Progressi fino a 275 MiB e tre asset uploaded con digest coincidenti. Nessun fallimento upload osservato nella 0.2.2. | Attendere e seguire il progresso; riprendere solo asset mancanti della stessa bozza, senza ricostruire o sovrapporre upload. |
| Builder scrive «signing» | Authenticode: NotSigned. | Controllare la firma effettiva; hash updater e firma del produttore sono verifiche diverse. |

## Responsabilità del flusso

Il primo gate è stato avviato nel sandbox pur essendo già noto in chat che
servivano capacità aggiuntive. Quella ripetizione era evitabile. La scelta del
metodo GitHub è arrivata tardi; le note aggiornate dopo la build hanno richiesto
un secondo packaging. Questi sono errori operativi, non regressioni dell'app.

ASAR finale: `498d6eaf4b64b5deef54964e3843b9673d0e454219f5e5e168643629002f467f`.
SHA256 setup pubblico:
`a62984bafdb045e62aa19736899260da2d9e14cd201dacba855226785e44c3e9`.
Release sul commit `9de8675`, riepilogo successivo su `12b8b53`, entrambi sul
remoto. Sono dati storici: ricalcolare gli hash per la release successiva.

## Limite della diagnosi

La rete lenta non è una causa dimostrata del download fallito; neppure il timeout
del test prova un bug dello storage. La skill conserva questa distinzione,
non modifica timeout del prodotto e non avvia un'altra release per validarsi.
