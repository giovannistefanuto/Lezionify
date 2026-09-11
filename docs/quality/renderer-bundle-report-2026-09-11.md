# Misura del renderer — 11 settembre 2026

Misure non compresse prodotte da `electron-vite build`.

| Risorsa | Prima | Dopo | Variazione |
| --- | ---: | ---: | ---: |
| JavaScript iniziale | 1.837,38 kB | 653,92 kB | -64,4% |
| CSS iniziale | 168,78 kB | 163,96 kB | -2,9% |

L'HTML iniziale carica soltanto `index-*.js` e `index-*.css`. Il resto viene richiesto quando si apre la funzione relativa:

- dipendenze Markdown/KaTeX condivise: 905,83 kB;
- drawer della lezione: 119,79 kB;
- Dashboard: 46,03 kB;
- studio attivo: 6,03 kB, più 6,39 kB per il quiz o 7,46 kB per le flashcard;
- Q&A: 7,77 kB JavaScript e 5,67 kB CSS;
- modali e Quick Capture: chunk separati da 1,62 kB a 42,22 kB.

L'audit `npm run audit:styles` ha inventariato 1.246 selettori. Il duplicato globale effettivo di `.search-input` è stato consolidato; i 13 selettori ancora ripetuti rappresentano livelli intenzionali base/specializzazione o base/tema, mentre media query e keyframe sono escluse dal conteggio.

## Aggiornamento Mermaid

Dopo D-0119 il JavaScript iniziale resta sostanzialmente invariato a 653,62 kB. Mermaid viene importato soltanto quando compare un blocco `mermaid`: il core da 1.230,31 kB e i renderer dei singoli tipi risultano chunk differiti. Il CSS iniziale passa a 166,22 kB per gli stili della card, del fallback e dei due temi.
