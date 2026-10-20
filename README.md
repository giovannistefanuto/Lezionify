<div align="center">
  <img src="docs/assets/brand/lezionify-logo.png" alt="Lezionify logo" width="96" />
  <h1>Lezionify</h1>
  <p><strong>Turn lecture recordings into an organised study workspace.</strong></p>
  <p>A local-first Windows desktop app built with Electron, React and TypeScript.</p>
  <p>
    <a href="https://github.com/giovannistefanuto/Lezionify/actions/workflows/ci.yml"><img alt="Windows quality checks" src="https://github.com/giovannistefanuto/Lezionify/actions/workflows/ci.yml/badge.svg" /></a>
    <img alt="Status: alpha" src="https://img.shields.io/badge/status-alpha-F59E0B" />
    <img alt="Platform: Windows" src="https://img.shields.io/badge/platform-Windows-0078D4" />
  </p>
  <p><strong>English</strong> · <a href="README.it.md" lang="it">Italiano</a></p>
  <p>
    <a href="https://github.com/giovannistefanuto/lezionify-appunti"><strong>Read the lecture notes</strong></a> ·
    <a href="#run-locally"><strong>Run the app</strong></a> ·
    <a href="#engineering-decisions"><strong>Explore the engineering</strong></a>
  </p>
</div>

I built Lezionify to replace my own fragmented workflow: organise university recordings, transcribe them elsewhere, copy text into AI tools and piece the material back together. It brings recordings, notes, slides and questions into one workspace, keeping **the original audio and raw transcript separate from every AI-generated result**.

**Availability:** a personal alpha, used by its author. Running the app currently requires a development environment; there is no public signed Windows release. The interface is in Italian. You can read the [published notes in Italian and English](https://github.com/giovannistefanuto/lezionify-appunti) without installing anything or providing an API key.

## See the workspace

![Focus workspace with PDF slides, lecture notes and contextual discussion side by side](docs/assets/screenshots/focus-workspace.png)

**Focus keeps the material and the question together:** PDF slides on the left, lecture notes in the centre and a discussion anchored to a passage on the right. Panels have independent scrolling and resizing; reading positions survive a restart.

<details>
<summary><strong>Watch the 48-second visual tour</strong> — archive → Focus → questions → PDF export</summary>

![Guided tour of the archive, Focus workspace, contextual discussion and PDF export selection](docs/assets/demo/lezionify-tour.gif)

This captioned tour uses real Electron component screenshots with synthetic data and synthetic answers. It shows the workflow's screens, rather than a continuous recording or a live AI request. [Static screenshots and accessible text description](docs/assets/demo/README.md).

</details>

## What you can do

| Step | In Lezionify |
| --- | --- |
| **Collect and organise** | Import audio, transcripts or video; avoid duplicate imports; assign courses and dates; search your local archive. |
| **Prepare study material** | Explicitly request Gemini transcription, structured Markdown notes and English translations. Keep the source files and resume interrupted processing. |
| **Study in context** | Read notes alongside PDF slides, ask questions about a passage, or query the course's local documents with source citations. |
| **Take the results with you** | Export a lecture or selected course lectures to PDF, including formulas, diagrams and grid pages for handwritten notes. Optionally publish texts to a dedicated GitHub repository. |

Study tools also include grouped Memo notes, timers, progress tracking, an offline EN ↔ IT dictionary, optional local phrase translation and downloadable background sounds. [Feature guides and limitations](docs/README.md#prodotto).

## Run locally

**Requirements:** Windows 10 or 11, Node.js 22.13.0 or later, npm and Git to clone the repository. Python 3.10 or later is also needed for the complete quality checks.

```powershell
git clone https://github.com/giovannistefanuto/Lezionify.git
cd Lezionify
npm ci
npm run dev
```

Use the Electron window opened by the command. Start by importing audio or a transcript and assigning a course and date. You can organise, search and read local material without an AI key. To generate notes, configure your Gemini API key in **Impostazioni** (Settings), then explicitly start processing. Never put keys in source files or `.env`.

Phrase-translation models and background sounds are optional downloads. GitHub text synchronisation requires its own repository and credentials; Spotify requires separate account setup. [Usage guides](docs/README.md#prodotto).

## Engineering decisions

Three problems shaped the implementation. These are useful starting points for a code review:

| Problem | Design choice | Implementation and evidence |
| --- | --- | --- |
| Long AI jobs can stop because of quotas, network errors or an app restart. | Persist job state and checkpoints, with explicit pause and resume and shared request scheduling. | [Pipeline](electron/main/ai/archivePipeline.ts) · [Recovery and concurrency tests](tests/unit/archivePipeline.test.ts) |
| Translating technical notes can alter formulas, code and diagrams. | Request prose fragments and reconstruct protected content locally. Validate structure and recover original Mermaid diagrams when a translation changes their structure. | [Translation plan](electron/main/ai/translationPlan.ts) · [Integrity checks](electron/main/ai/translationIntegrity.ts) · [Regression tests](tests/unit/translationPlan.test.ts) |
| Local study material must remain readable after failed or concurrent writes. | Serialise atomic file replacement, keep recoverable backups and validate data at runtime boundaries. | [Atomic storage](electron/main/atomicFile.ts) · [Input validation](electron/main/archiveValidation.ts) · [Recovery tests](tests/unit/quality.test.ts) |

### Architecture at a glance

```text
React renderer (src/)
        ↕ typed IPC through the preload bridge (electron/preload/)
Electron main process (electron/main/)
        ├── local files, search index and recoverable job state
        └── optional Gemini requests / GitHub text publication

shared/ → contracts and validation helpers shared across processes
```

The renderer uses React 19 and TypeScript. Content rendering combines Markdown, KaTeX, Mermaid and PDF.js; local search uses MiniSearch. Persistence uses local JSON and files. Electron handles desktop integration and PDF printing, and bundled FFmpeg handles video-to-audio conversion.

Further reading: [repository map](STRUTTURA_PROGETTO.md), [course retrieval and citations](docs/product/rag-corso-2026-10-17.md), [ASR research and benchmarks](docs/research/README.md). Most detailed project documents are currently in Italian.

## Verification and current limits

Last documented full run, **19 October 2026**: **625 Vitest tests, 24 Python tests and 41 Node tests**, plus React scenarios running in Electron and checks of real exported PDFs. [Verification report](docs/quality/pubblicazione-github-2026-10-19.md).

The checks exercise recovery after failed writes, job resumption, reading-position restoration across two Electron processes, and PDF output with formulas and diagrams. [Test guide](tests/README.md) · [Windows CI](.github/workflows/ci.yml).

```powershell
npm run check        # Typecheck, lint, offline tests, Electron scenarios, build and PDF checks
npm run build        # Production build
npm run package:win  # Build a local unsigned Windows installer
```

The automated quality gate uses synthetic data and does not call AI providers. Live AI benchmarks are separate, opt-in checks requiring credentials and quota.

Known limits: AI answers and translations need human verification; citations and structural checks do not guarantee factual or linguistic accuracy. Scanned PDFs need external OCR. Spotify/device testing remains incomplete, and crossfades apply to local background sounds. The documented dependency audit has unresolved findings; Electron hardening and accessibility checks remain release work. [Detailed status](docs/quality/pubblicazione-github-2026-10-19.md#limiti-e-seguito).

## Privacy and data

Audio, transcripts and notes live in the app's local data directory. AI requests send the selected material to Gemini when explicitly requested or when an enabled processing pipeline runs. Local-first does not make those remote requests private or offline: provider terms apply.

Credentials use Electron `safeStorage` when available. Personal archives, credentials and logs are excluded from Git. Optional GitHub synchronisation publishes texts after configuration and activation; it does not publish personal audio, PDFs or conversations. [Security policy](SECURITY.md).

## Next milestones

- Resolve dependency audit findings and complete Electron security hardening.
- Complete manual accessibility, suspend/resume and malformed-audio checks.
- Prepare a signed Windows release with installation documentation.

The [product backlog](docs/product/idee-future-2026-10-13.md) keeps the full feature queue, experiments and deferred work.

## Author and development approach

**Giovanni Stefanuto** — personal project built around my university study workflow. I define the problem and product decisions, integrate the implementation and verify its behaviour. AI coding assistants support development; design decisions, regressions and the limits of verification are documented in the [decision log](DECISIONI.md) and [quality reports](docs/README.md#qualità).

## Documentation and contributions

[Documentation index](docs/README.md) · [Original product vision](IDEA_INIZIALE.md) · [Decision log](DECISIONI.md) · [Contributing](CONTRIBUTING.md).

Issues and focused pull requests are welcome as technical feedback. The source is publicly visible for portfolio review, with **all rights reserved**; an open-source licence has not been adopted. See [LICENSE](LICENSE). The external dictionary data has its own [CC BY-SA 3.0 licence and attributions](public/dictionaries/NOTICE.md).
