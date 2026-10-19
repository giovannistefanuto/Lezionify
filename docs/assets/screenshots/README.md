# Screenshot per README e portfolio

Le immagini PNG sono catture reali dei componenti React nel runtime Electron,
create il 19 ottobre 2026 dal runner di regressione con profilo temporaneo e
fixture sintetiche. Non sono mockup né schermate della libreria personale.

- `focus-workspace.png`: PDF sintetico, dispensa e discussione affiancati.
- `lecture-archive.png`: archivio sintetico con lingue e stati di studio.
- `pdf-export.png`: selezione delle lezioni del corso per l’esportazione.

Per riprodurle da PowerShell dopo `npm ci`:

```powershell
$env:LEZIONIFY_VIDEO_SCREENSHOT_DIR = Join-Path (Get-Location) 'local-artifacts/screenshots'
npm run test:hooks
Remove-Item Env:LEZIONIFY_VIDEO_SCREENSHOT_DIR
```

I file sorgente del runner sono rispettivamente `focus-pdf-qna.png`,
`home-light.png` ed `export-light.png`. La cartella di cattura resta locale;
solo i tre PNG scelti e ispezionati vengono copiati qui. I vecchi SVG
`*-placeholder.svg` restano disponibili come segnaposto, ma il README usa i PNG.

Prima di aggiornare le immagini, controllare assenza di credenziali, nomi
personali, percorsi locali e materiale universitario autentico. Usare dati
sintetici, mantenere immagini leggibili e dimensioni inferiori a 1 MB.
