# Gatto trasparente durante la pausa: fattibilita e asset

Ricerca del 21 ottobre 2026, senza implementazione, acquisti, download di asset o decisione di adozione. Le caratteristiche dei progetti e degli asset sono dichiarazioni dei rispettivi autori: non sono state collaudate localmente.

## Valutazione per Lezionify

Stima tecnica provvisoria su scala 1-10:

| Variante | Difficolta | Principale lavoro |
| --- | --- | --- |
| Gatto animato 2D dentro la finestra di Lezionify | 3/10 | Collegare ingresso, riposo e uscita al timer esistente |
| Gatto sopra il desktop Windows, anche cambiando applicazione | 5/10 | Finestra trasparente separata, sempre visibile, passaggio dei clic, monitor e DPI |
| Gatto realistico con camminata, seduta e uscita naturali | 7/10 | Trovare o produrre un insieme coerente di clip e transizioni, poi verificarne trasparenza e prestazioni |

La durata di cinque minuti non richiede un video di cinque minuti: proposta tecnica da valutare, ingresso breve, animazione seduta in ciclo e uscita alla scadenza. Il timer deve controllare la sequenza, anziche dipendere dalla durata di una clip.

Contesto locale verificato nella ricerca: `src/components/PauseTimerOverlay.tsx` calcola il tempo residuo da `endTime` e `Date.now()`; alla scadenza mostra Pausa terminata e lo studio rimane fermo fino alla ripresa esplicita. `src/hooks/useStudyTracker.ts` espone `startPauseTimer`. Un eventuale gatto dovrebbe rispettare questo comportamento e sparire anche in caso di ripresa anticipata o chiusura.

Electron documenta le opzioni delle finestre trasparenti e sempre in primo piano e il metodo `setIgnoreMouseEvents` per il passaggio dei clic. Queste API rendono plausibile l'overlay desktop; serve comunque un collaudo reale Windows per resa, input, ridimensionamento e schermi multipli. [Documentazione BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window).

## Progetti analoghi

- **DeskCat**, Electron per Windows e macOS: l'autore descrive un gatto che cammina, si siede e dorme sopra il desktop con overlay trasparente e passaggio dei clic. Il README include ora archivi in `bundled-assets/`; prima di estrarli viene mostrato un segnaposto. La licenza MIT riguarda il codice; grafica e suoni hanno attribuzioni e licenze separate. E' un riferimento di architettura, non un'autorizzazione a copiare indistintamente gli asset. [Repository](https://github.com/coglabss/deskcat), [crediti](https://github.com/coglabss/deskcat/blob/main/bundled-assets/CREDITS.txt).
- **Desktop Cat di Andy Yang**, macOS: trasforma video personali di un gatto in fotogrammi RGBA mediante rimozione locale dello sfondo e li riproduce in un overlay. Dimostra una strada per un gatto realistico personalizzato; richiede preparazione delle clip e il runtime e' specifico macOS, quindi non e' un componente pronto per Lezionify Windows. Codice MIT. [Repository e pipeline](https://github.com/andyy-yang/desktop-cat), [licenza](https://github.com/andyy-yang/desktop-cat/blob/main/LICENSE).

## Asset individuati

| Fonte primaria | Cosa offre | Costo/condizioni dichiarate | Limiti per questa idea |
| --- | --- | --- | --- |
| [Bow.Pixel: Cat 85+ Animations 2025](https://bowpixel.itch.io/meow-cat-85-animation) | Oltre 85 animazioni, 3 gatti, fotogrammi 32x32, vista laterale per platform | Prezzo libero, anche gratuito; consente uso e modifica in progetti commerciali e non; vieta redistribuire l'asset anche modificato | Ottimo candidato grafico 2D; la pagina non enumera tutti gli stati. Prima del bundle pubblico chiarire il confine tra integrazione nel prodotto e distribuzione dei file sorgente |
| [Elthen: 2D Pixel Art Cat Sprites](https://elthen.itch.io/2d-pixel-art-cat-sprites) | PNG 32x32; due idle, due movimenti, pulizia, sonno e altre azioni | Prezzo libero, anche gratuito; uso commerciale e non dichiarato ammesso, dettagli licenza collegati dalla pagina | La seduta non e' nominata espressamente; aspetto pixel art, non video realistico |
| [kalheesi: Cute Cartoon Cat Pack V1](https://videohive.net/item/cute-cartoon-cat-pack-v1/24907945) | 21 clip cartoon Full HD, cicliche, trasparenza alpha esplicita, Photo PNG + Alpha | Scheda a 26 USD, imposte e commissioni escluse; licenza commerciale da verificare per il prodotto distribuito | Nessun elenco testuale completo delle pose; visionare anteprima prima di considerarlo un set ingresso/seduta/uscita |
| [Rawpixel: Tabby cat sitting animation](https://www.rawpixel.com/video/17216760/video-background-cat-animal) | Gatto seduto, video trasparente con alpha e ProRes 4444 dichiarati; formati MOV/GIF e altri | Scheda Free for Personal and Business use; contenuto generato con AI | Conferma che esistono clip sedute isolate; non conferma la camminata dello stesso gatto. La [licenza business](https://www.rawpixel.com/services/licenses/business) vieta la redistribuzione del contenuto: verificare l'integrazione nel pacchetto, non trattarlo come CC0 |

Altri riscontri realistici: Pond5 indicizza [Cat Persian Sitting With Alpha Channel](https://www.pond5.com/stock-footage/item/40217790-cat-persian-sitting-alpha-channel), di LOLstudio, a 39 USD con MOV ProRes 4444. La versione inglese non e' stata accessibile allo strumento; prezzo e caratteristiche risultano dalla scheda primaria indicizzata e vanno riconfermati prima di un acquisto.

Envato descrive [Animated Grey Cat Walking Towards Camera with Alpha](https://elements.envato.com/cat-running-to-camera-8D5ZAFX), 4 secondi, ProRes 4444, non ciclico, e [3D Animated Cat Stretching and Sitting](https://elements.envato.com/cat-1-realistic-8J52DTK), 16 secondi, ciclico con alpha. Tuttavia entrambe le pagine consultate mostrano video attualmente non disponibile: sono riscontri dell'esistenza della tipologia, non asset pronti garantiti. Il primo cammina verso la camera, non lateralmente.

## Trasparenza e prossima verifica

Un filmato su green screen non e' gia trasparente: richiede scontorno/chroma key e controllo del pelo sui bordi. Per esempio [questo clip Shutterstock](https://www.shutterstock.com/video/clip-3487574977-cat-walking-on-green-screen-background-motion) dichiara esplicitamente chroma key. Non basta trovare un generico MP4 di un gatto. Per un file stock MOV con alpha occorre inoltre verificare il formato effettivamente riproducibile dal renderer Electron e, se necessario, preparare una derivazione locale adatta.

Non e' stato verificato un unico pacchetto realistico che contenga esattamente lo stesso gatto in camminata laterale, transizione alla seduta, riposo ciclico e rialzata. Prima di adottare o acquistare asset, visionare la sequenza completa e verificare i diritti di distribuzione. Lo stesso ciclo di camminata puo servire per ingresso e uscita, con posizione e direzione gestite dall'app: questa e' una proposta tecnica, non una caratteristica gia implementata.
