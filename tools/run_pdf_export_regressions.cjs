// Exercise the actual hidden renderer, preload, printToPDF and local writes with synthetic notes.
const { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } = require('node:fs')
const { join, resolve, basename, dirname } = require('node:path')
const { tmpdir } = require('node:os')
const { spawnSync } = require('node:child_process')
const { buildSync } = require('esbuild')
const temporary = mkdtempSync(join(tmpdir(), 'lezionify-pdf-export-'))
const output = process.env.LEZIONIFY_PDF_EXPORT_TEST_DIR ? resolve(process.env.LEZIONIFY_PDF_EXPORT_TEST_DIR) : join(temporary, 'output')
mkdirSync(output, { recursive: true })
function isPdfFooter(text) { return /^\d+\s*\/\s*\d+$/.test(text.trim()) }
// Run in the production renderer after fonts/SVGs settle. Compare with the
// previous export rules on the same nodes, then restore compact rules to print.
function measureDiagrams() {
  const measure = () => Array.from(document.querySelectorAll('.mermaid-diagram svg')).map(svg => {
    const figure = svg.closest('figure')
    const box = svg.getBoundingClientRect()
    const intrinsic = svg.viewBox.baseVal
    const fontSizes = Array.from(svg.querySelectorAll('text')).map(text => parseFloat(getComputedStyle(text).fontSize) * box.width / intrinsic.width * 0.75)
    return { width: box.width, height: box.height, figureHeight: figure.getBoundingClientRect().height, footprint: figure.getBoundingClientRect().height + parseFloat(getComputedStyle(figure).marginTop) + parseFloat(getComputedStyle(figure).marginBottom), ratio: intrinsic.width / intrinsic.height, minFontPt: Math.min(...fontSizes), containerWidth: figure.getBoundingClientRect().width }
  })
  const compact = measure()
  const legacy = document.createElement('style')
  legacy.textContent = '.pdf-export-document .mermaid-diagram { margin:18px 0; padding:8px; border-radius:12px; } .pdf-export-document .mermaid-diagram-header { padding:9px 12px; font-size:12px; } .pdf-export-document .mermaid-diagram-canvas { min-height:120px; padding:18px; }'
  document.head.append(legacy)
  const previous = measure()
  legacy.remove()
  return { compact, previous }
}
function measureAdaptiveDiagrams() {
  return Array.from(document.querySelectorAll('.mermaid-diagram svg')).map(svg => {
    const box = svg.viewBox.baseVal
    const scale = Math.min(1, 660 / box.width, (230 * 96 / 25.4) / box.height)
    return {
      minFontPt: Math.min(...Array.from(svg.querySelectorAll('text')).map(text => parseFloat(getComputedStyle(text).fontSize) * scale * 0.75)),
      nodes: Array.from(svg.querySelectorAll('.node')).map(node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y } })
    }
  })
}
try {
  buildSync({ entryPoints: ['electron/main/pdfExport.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: join(temporary, 'service.cjs') })
  const mathTail = '\n\n' + String.raw`$$\begin{aligned}
x &= 1 \\
&= 2
\end{aligned}$$` + '\n\n## After multiline math\n\nLecture ending remains visible.'
  const markdown = '# Sintesi della lezione\n\n> [!CONCETTO CHIAVE]\n> Una formula da ricordare: $E=mc^2$.\n\n## Formule e procedimenti\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$\n\n| Fase | Risultato |\n| --- | --- |\n| Analisi | $x^2$ |\n| Verifica | Corretto |\n\n```mermaid\nflowchart LR\nA["Ingresso"] --> B["Calcolo"] --> C["Risultato"]\n```\n\n' + Array.from({ length: 38 }, (_, index) => `## Argomento ${index + 1}\n\n${'Questo testo sintetico verifica impaginazione, paragrafi e continuità della dispensa. '.repeat(5)}\n\n`).join('')
  const english = '# English lecture\n\n> [!KEY CONCEPT]\n> Remember **the source** and $x^2$.\n\n```mermaid\nflowchart TD\nX["Read"] --> Y["Understand"]\n```\n\n## Broken diagram fallback\n\n```mermaid\nflowchart LR\nA[\n```\n\nEnd of the synthetic notes.'
  const adaptive = '# Adaptive print layouts\n\n```mermaid\nflowchart LR\n' + Array.from({ length: 4 }, (_, i) => `N${i}["Stage ${i + 1} with a descriptive label"] -->|"A descriptive connection label"| N${i + 1}["Stage ${i + 2} with a descriptive label"]`).join('\n') + '\n```\n\n```mermaid\nflowchart TD\n' + Array.from({ length: 7 }, (_, i) => `Root["Main comparison"] --> B${i}["Branch ${i + 1} with a detailed description"]`).join('\n') + '\n```\n\n```mermaid\nsequenceDiagram\nautonumber\nactor A as First synthetic participant\nparticipant B as Second synthetic participant\nparticipant C as Third synthetic participant\nparticipant D as Fourth synthetic participant\nA->>D: A long request that should wrap across several lines while remaining complete\nD-->>B: A complete response to the second participant\nB->>C: Final message\n```\n\nAdaptive layout ending.'
  const compact = '# Diagrammi per la stampa\n\n## Piccolo\n\n```mermaid\nflowchart LR\nA["Fonte"]\n```\n\nTesto dopo lo schema piccolo.\n\n## Verticale\n\n```mermaid\nflowchart TD\n' + Array.from({ length: 7 }, (_, i) => `N${i}["Fase ${i + 1}"] --> N${i + 1}["Fase ${i + 2}"]`).join('\n') + '\n```\n\nTesto dopo lo schema verticale.\n\n## Largo\n\n```mermaid\nflowchart LR\n' + Array.from({ length: 5 }, (_, i) => `W${i}["Passo ${i + 1}"] --> W${i + 1}["Passo ${i + 2}"]`).join('\n') + '\n```\n\nTesto dopo lo schema largo.\n\n## Fallback lungo\n\n```mermaid\nflowchart LR\nA[\n' + Array.from({ length: 30 }, (_, i) => `%% Riga sorgente ${i + 1}`).join('\n') + '\n```\n\nFine del confronto.'
  writeFileSync(join(temporary, 'main.cjs'), `
    const { app, BrowserWindow, ipcMain, dialog } = require('electron');
    const fs = require('node:fs');
    const path = require('node:path');
    const assert = require('node:assert/strict');
    const { PdfExportService } = require('./service.cjs');
    app.setPath('userData', ${JSON.stringify(join(temporary, 'profile'))});
    app.on('browser-window-created', (_, window) => { window.hide(); window.webContents.setBackgroundThrottling(false); });
    app.whenReady().then(async () => {
      const parent = new BrowserWindow({ show: false });
      const lessons = [
        { id: 'later', courseCode: 'Corso sintetico', title: 'Seconda lezione', recordedAt: '2026-10-12T09:00:00Z', importedAt: '' },
        { id: 'first', courseCode: 'Corso sintetico', title: 'Prima lezione', recordedAt: '2026-10-01T09:00:00Z', importedAt: '' },
        { id: 'missing', courseCode: 'Corso sintetico', title: 'Terza lezione senza dispensa', recordedAt: '2026-10-13T09:00:00Z', importedAt: '' },
        { id: 'laboratory', isLaboratory: true, courseCode: 'Corso sintetico', title: 'Laboratorio sintetico', recordedAt: '2026-10-05T09:00:00Z', importedAt: '' },
        { id: 'other', courseCode: 'Altro corso', title: 'Non esportare', recordedAt: '2026-10-01T09:00:00Z', importedAt: '' }
      ];
      const source = { listLectures: async () => lessons, readMarkdown: async id => id === 'missing' ? null : ${JSON.stringify(markdown + mathTail)}, readMarkdownEn: async id => id === 'missing' ? null : (id === 'laboratory' ? ${JSON.stringify('# Laboratorio sintetico\n\n')} : '') + ${JSON.stringify(english + mathTail)} };
      const exporter = new PdfExportService(source, ${JSON.stringify(resolve('out/renderer/index.html'))}, ${JSON.stringify(resolve('out/preload/index.mjs'))});
      const isFooter = (${isPdfFooter.toString()});
      let readyChecks = 0;
      let expectedLaboratory = false;
      ipcMain.handle('archive:pdf-export-document', (event, token) => exporter.getDocument(event, token));
      ipcMain.handle('archive:pdf-export-ready', async (event, token, failed) => {
        try {
          assert.equal(failed, false);
          const view = await event.sender.executeJavaScript('({ math: document.querySelectorAll(".katex").length, diagrams: document.querySelectorAll(".mermaid-diagram svg").length, pending: document.querySelectorAll(".mermaid-diagram[data-render-state=loading]").length, text: document.body.textContent, images: Array.from(document.images).every(image => image.complete) })');
          assert(view.diagrams > 0 && view.pending === 0 && view.images);
          assert(!view.text.includes('Non esportare'));
          assert.equal(view.text.includes('Laboratorio sintetico'), expectedLaboratory);
          const document = exporter.getDocument(event, token);
          assert.equal(await event.sender.executeJavaScript('document.querySelectorAll(".pdf-export-notes").length'), document.lectures.length);
          if (view.text.includes('Diagrammi per la stampa')) {
            const layout = await event.sender.executeJavaScript('(' + ${JSON.stringify(measureDiagrams.toString())} + ')()');
            assert.equal(layout.compact.length, 3);
            layout.compact.forEach((diagram, i) => {
              assert(Math.abs(diagram.width / diagram.height - diagram.ratio) < 0.01, 'SVG proportions must survive print sizing');
              assert(diagram.width <= diagram.containerWidth && diagram.height <= 230 * 96 / 25.4 + 1);
              assert(diagram.minFontPt >= 8, 'Synthetic diagram text must remain at least 8pt');
              assert(diagram.footprint < layout.previous[i].footprint, 'Print footprint must shrink');
            });
            assert(layout.compact[0].footprint < layout.previous[0].footprint * 0.65, 'Small diagram must lose unused screen space');
            const fallback = await event.sender.executeJavaScript('({ height: document.querySelector(".mermaid-source-code").clientHeight, scroll: document.querySelector(".mermaid-source-code").scrollHeight, text: document.querySelector(".mermaid-source-code").textContent })');
            assert(fallback.height >= fallback.scroll - 1 && fallback.text.includes('Riga sorgente 30'));
            fs.writeFileSync(path.join(${JSON.stringify(output)}, 'diagram-layout.json'), JSON.stringify(layout, null, 2));
          } else if (view.text.includes('Adaptive print layouts')) {
            const diagrams = await event.sender.executeJavaScript('(' + ${JSON.stringify(measureAdaptiveDiagrams.toString())} + ')()');
            assert.equal(diagrams.length, 3);
            assert(diagrams.every(diagram => diagram.minFontPt >= 8.5), 'Adaptive print text should remain readable on A4');
            const chain = diagrams[0].nodes;
            assert(Math.abs(chain[0].x - chain[4].x) < 20 && chain[4].y > chain[0].y + 100, 'Wide horizontal chain should use a legible vertical layout');
            assert(view.text.includes('Adaptive layout ending.') && view.text.includes('Final message'));
          } else {
            assert(view.math > 0);
            assert(view.text.includes('Lecture ending remains visible.') && !view.text.includes('undefined'));
            assert.equal(await event.sender.executeJavaScript('document.querySelectorAll(".katex-error").length'), 0);
            if (view.text.includes('English lecture')) assert(view.text.includes('Key concept') && view.text.includes('flowchart LR'));
            else assert(view.text.includes('Concetto chiave'));
          }
          readyChecks++;
          exporter.ready(event, token, false);
        } catch (error) { console.error(error.message); exporter.ready(event, token, true); }
      });
      try {
        dialog.showSaveDialog = async () => ({ canceled: true });
        assert.equal((await exporter.export({ kind: 'lecture', lectureId: 'first', language: 'it' }, parent)).canceled, true);
        for (const language of ['it', 'en']) {
          const filePath = path.join(${JSON.stringify(output)}, 'course.' + language + '.pdf');
          dialog.showSaveDialog = async () => ({ canceled: false, filePath });
          expectedLaboratory = language === 'en';
          const result = await exporter.export({ kind: 'course', courseCode: 'Corso sintetico', language, includeLaboratory: expectedLaboratory }, parent);
          assert.deepEqual(result, { canceled: false, missingCount: 1 });
          const bytes = fs.readFileSync(filePath); assert.equal(bytes.subarray(0, 5).toString(), '%PDF-'); assert(bytes.length > 20000);
          assert.equal(exporter.active, null);
        }
        expectedLaboratory = false;
        dialog.showSaveDialog = async (_, options) => {
          assert(options.defaultPath.startsWith('Corso_Corso_sintetico_IT_'));
          return { canceled: false, filePath: path.join(${JSON.stringify(output)}, 'selection.pdf') };
        };
        assert.deepEqual(await exporter.export({ kind: 'course', courseCode: 'Corso sintetico', language: 'it', lectureIds: ['first'] }, parent), { canceled: false, missingCount: 0 });
        expectedLaboratory = false;
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: path.join(${JSON.stringify(output)}, 'lecture.pdf') });
        assert.deepEqual(await exporter.export({ kind: 'lecture', lectureId: 'first', language: 'en' }, parent), { canceled: false, missingCount: 0 });
        source.readMarkdown = async () => ${JSON.stringify(compact)};
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: path.join(${JSON.stringify(output)}, 'compact.pdf') });
        assert.deepEqual(await exporter.export({ kind: 'lecture', lectureId: 'first', language: 'it' }, parent), { canceled: false, missingCount: 0 });
        source.readMarkdown = async () => ${JSON.stringify(adaptive)};
        const adaptivePath = path.join(${JSON.stringify(output)}, 'adaptive.pdf');
        dialog.showSaveDialog = async () => ({ canceled: false, filePath: adaptivePath });
        assert.deepEqual(await exporter.export({ kind: 'lecture', lectureId: 'first', language: 'it' }, parent), { canceled: false, missingCount: 0 });
        const { getDocument } = await import(${JSON.stringify(require('node:url').pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href)});
        const printedTask = getDocument({ data: new Uint8Array(fs.readFileSync(adaptivePath)), useSystemFonts: true });
        const printed = await printedTask.promise;
        const printedItems = [];
        for (let number = 1; number <= printed.numPages; number++) printedItems.push(...(await (await printed.getPage(number)).getTextContent()).items);
        for (const label of ['Stage 1', 'Stage 5', 'Branch 7', 'Final message']) {
          const item = printedItems.find(item => item.str && item.str.includes(label));
          assert(item && item.height >= 8.5, 'Actual PDF label must be present and readable: ' + label);
        }
        await printedTask.destroy();
        for (const [file, expected, heading] of [['course.it.pdf', 3, 'Note'], ['course.en.pdf', 4, 'Notes'], ['lecture.pdf', 1, 'Notes'], ['selection.pdf', 1, 'Note'], ['compact.pdf', 1, 'Note'], ['adaptive.pdf', 1, 'Note']]) {
          const task = getDocument({ data: new Uint8Array(fs.readFileSync(path.join(${JSON.stringify(output)}, file))), useSystemFonts: true });
          const pdf = await task.promise;
          const notePages = [];
          for (let page = 1; page <= pdf.numPages; page++) {
            const items = (await (await pdf.getPage(page)).getTextContent()).items;
            const text = items.map(item => item.str || '').filter(text => text.trim()).join(' ');
            assert(!isFooter(text), 'No unintended blank page: ' + file);
            if (items.some(item => item.str === heading)) {
              notePages.push(page);
              assert(text.trim().startsWith(heading + ' ') && isFooter(text.trim().slice(heading.length)), 'Notes page must contain only its heading and footer');
            }
          }
          assert.equal(notePages.length, expected, 'One notes page per lesson: ' + file);
          assert.equal(notePages.at(-1), pdf.numPages, 'Final notes page must not leave an extra trailing page');
          await task.destroy();
        }
        // Verify an IO failure leaves a previous PDF intact and allows a later retry.
        const filePath = path.join(${JSON.stringify(output)}, 'protected.pdf'); fs.writeFileSync(filePath, 'previous output');
        source.readMarkdown = async () => { throw new Error('Synthetic private path, never propagated'); };
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
        await assert.rejects(exporter.export({ kind: 'lecture', lectureId: 'first', language: 'it' }, parent), error => !error.message.includes('private path'));
        assert.equal(fs.readFileSync(filePath, 'utf8'), 'previous output');
        assert.equal(readyChecks, 6);
        assert(!fs.readdirSync(${JSON.stringify(output)}).some(name => name.endsWith('.tmp')));
        console.log('PASS: actual PDF exports IT/EN and single lesson, one notes page per lesson without extra blank pages, compact Mermaid, adaptive flowcharts, readable fonts, complete fallback, formulas, laboratory selection, cancel and source preservation');
        app.exit(0);
      } catch (error) { console.error(error.stack); app.exit(1); }
    });
    setTimeout(() => { console.error('PDF export tests timed out'); app.exit(1); }, 90000);
  `)
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [join(temporary, 'main.cjs')], { env, encoding: 'utf8', windowsHide: true, timeout: 100000 })
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '')
  process.exitCode = result.status ?? 1
} finally {
  const target = resolve(temporary)
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('lezionify-pdf-export-')) throw new Error('Unexpected PDF test cleanup target')
  rmSync(target, { recursive: true, force: true })
}
