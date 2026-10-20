# Lezionify — visual tour / tour visuale

[English README](../../../README.md) · [README italiano](../../../README.it.md)

## English

The 48-second [animated tour](lezionify-tour.gif) presents four captioned chapters,
each lasting twelve seconds. It uses the [reviewed Electron screenshots](../screenshots/README.md)
captured on 19 October 2026. The captions were added on 20 October 2026.
The app interface is Italian; tour captions are English.

This is a sequence of real component screenshots, not a continuous recording
of an import-to-export session. Lecture data, PDF content and AI answers are
synthetic. No AI request, account access or personal archive is used to build it.
It illustrates the screens and does not measure AI quality or processing time.

### Text alternative

| Time | Screen and action |
| --- | --- |
| 0–12 s | [Archive](../screenshots/lecture-archive.png): three lectures with course codes, dates, available languages and study status. Import and export controls are at the top. |
| 12–24 s | [Focus](../screenshots/focus-workspace.png): a PDF slide, lecture notes and a contextual discussion are displayed side by side. Each panel has its own controls. |
| 24–36 s | [Contextual discussion](../screenshots/focus-workspace.png): the right pane is highlighted. A quoted passage anchors synthetic answers to the material. Sending a real question requires an explicit AI action. |
| 36–48 s | [PDF selection](../screenshots/pdf-export.png): choose lectures and language. This fixture shows a cancelled save with the selection preserved; it does not show a completed export. Actual PDF output is verified separately by the [PDF regressions](../../../tests/README.md). |

Open the static links above to inspect the screens at your own pace without animation.

## Italiano

Il [tour animato](lezionify-tour.gif) dura 48 secondi e comprende quattro capitoli
da dodici secondi: archivio, Focus con slide e dispensa, discussione contestuale,
selezione delle lezioni per il PDF. Le didascalie sono in inglese; l’interfaccia
è in italiano. I collegamenti della tabella permettono di leggere le schermate
statiche senza animazioni.

Le immagini provengono da componenti Electron reali con dati, slide e risposte
sintetici. Il tour è una sequenza di schermate, non la registrazione continua
di un’importazione o di una richiesta AI. La selezione PDF mostra un salvataggio
annullato con scelte conservate; il risultato del PDF è collaudato separatamente.
La creazione del tour non accede all’archivio personale o a servizi esterni.

## Verification / Verifiche — 20 ottobre 2026

- GIF decoded successfully: four chapter frames, 48 seconds, 274,318 bytes.
- All four frames inspected for caption legibility and synthetic-only content.
- 78 local file links and heading anchors checked across the two root READMEs
  and this description; no missing targets.
- English and Italian Markdown rendered in an offline Electron preview at
  1200 px and 390 px widths. Entry links, hero image and engineering section
  inspected; no horizontal overflow of the page. The preview approximates
  GitHub styling and does not certify the live GitHub renderer.
- No application tests rerun for this documentation-only change. The historical
  application quality results retain their original date in the READMEs.
- The publication includes only the two root READMEs, this description and the
  tour GIF. Application changes and local generation tooling are kept separate.
