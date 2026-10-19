# Offline dictionary data — CC BY-SA 3.0

English-italiano and italiano-English FreeDict+WikDict dictionaries,
edition 2025.11.23, maintained/published by Karl Bartel.

Attribution: FreeDict / WikDict, Karl Bartel; Wiktionary contributors via DBnary.

Sources:
- https://download.freedict.org/generated/eng-ita/eng-ita.tei
- https://download.freedict.org/generated/ita-eng/ita-eng.tei
- https://freedict.org/
- https://www.wikdict.com/
- https://www.wiktionary.org/
- https://kaiko.getalp.org/about-dbnary/

These two JSON datasets are adaptations under Creative Commons
Attribution-ShareAlike 3.0 Unported, independent from application code.
License: https://creativecommons.org/licenses/by-sa/3.0/legalcode
The license URI is also included in LICENSE-CC-BY-SA-3.0.txt.
Provided without warranties, as specified by the license.

Modifications: TEI converted to JSON by tools/build_dictionary.py; retained
headwords with translations, grammatical category, first pronunciation,
translations and definitions. Entries without translations are omitted.
The metadata in each JSON includes the title, edition, attribution,
original source URL and SHA-256 of the TEI source used.

On 2026-10-15 the Italian dataset received one reviewed reverse verb entry:
trascrivere → transcribe, derived from the existing English transcribe →
trascrivere entry under the same license. Its provenance is recorded in
reviewedReverseVerbs in ita-eng.json. No other entries are inferred by reversal;
the generator reproduces this addition and preserves the source TEI hashes.

To reproduce: download both TEI files into a local source directory, then run
`python tools/build_dictionary.py <source-directory>` from the repository.
Application lookup makes no network requests, sends no queries to external
services and does not record search text in logs or the user profile.
