import { expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { validateMermaidSource } from '../../src/components/MermaidDiagram'
import { normalizeDisplayMath } from '../../src/utils/markdownMath'

const diagram = `stateDiagram-v2
    accTitle: Grafo delle transizioni dell'esempio AB
    accDescr: Rappresentazione visiva delle transizioni di stato e ricompense osservate nei dataset.
    [*] --> A: Inizio episodio (1/8)
    [*] --> B: Inizio episodio (7/8)
    A --> B: R = 0 (100%)
    B --> [*]: R = 1 (6/8 = 75%)
    B --> [*]: R = 0 (2/8 = 25%)
    style A fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px`

// Original diagnostic fixtures are now positive regressions.
it('accetta gli stili statici del diagramma AB', () => {
  expect(() => validateMermaidSource(diagram)).not.toThrow()
})

it('mantiene la prosa normale tra prezzi con dollari sbilanciati', () => {
  const source = String.raw`Il costo è (c = 0.50\$$ nell'esempio). Al di sotto di c, l'impresa opererebbe in perdita (\Pi < 0$).`
  const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex]
  }, normalizeDisplayMath(source)))
  expect(html).not.toContain('class="katex"')
})

it('isola il rifiuto negli stili dei diagrammi di stato, non nei metadati', () => {
  expect(validateMermaidSource(diagram.replace(/^ {4}style .*$/gm, ''))).toContain('accTitle:')
  expect(validateMermaidSource('stateDiagram-v2\nA --> B\nstyle A fill:#fff')).toContain('style A')
  expect(validateMermaidSource('stateDiagram-v2\nA --> B')).toContain('A --> B')
  expect(validateMermaidSource('flowchart TD\nA --> B\nstyle A fill:#fff')).toContain('style A')
})

it('con dollaro monetario escaped e formula delimitata la prosa resta testo', () => {
  const source = String.raw`Il costo è (c = 0.50\$ nell'esempio). Al di sotto di c, l'impresa opererebbe in perdita ($\Pi < 0$).`
  const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex]
  }, normalizeDisplayMath(source)))
  expect(html).toContain('Al di sotto di c, l&#x27;impresa')
  expect(html).toContain('class="katex"')
  expect(html).not.toContain('katex-error')
  expect(html).not.toContain('<mi>i</mi><mi>m</mi><mi>p</mi>')
})
