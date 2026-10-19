# Traduzione offline

Runtime: @browsermt/bergamot-translator 0.4.9, MPL-2.0.
Sorgente: https://github.com/browsermt/bergamot-translator/tree/main/wasm/module
Modifiche al worker: scope CommonJS, lettura file URL con fs e pathToFileURL
per Windows. Patch riproducibile in electron.vite.config.ts; adattatore runner.cjs
di Lezionify distribuito insieme al runtime. La copia originale è nel pacchetto
npm esatto: https://registry.npmjs.org/@browsermt/bergamot-translator/-/bergamot-translator-0.4.9.tgz

Modelli EN/IT: Mozilla Firefox Translations, MPL-2.0, registry 2026-10-13.
https://github.com/mozilla/translations (README: licenza esplicita dei modelli).
Manifest con URL, dimensioni e SHA-256: models.json. Download opzionale dal bucket
pubblico Mozilla, nessun testo dell'utente incluso nelle richieste.

La licenza completa è LICENSE-MPL-2.0.txt. Le traduzioni possono contenere errori.
