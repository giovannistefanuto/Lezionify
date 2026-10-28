import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { normalizeDisplayMath } from '../../src/utils/markdownMath'

const formula = String.raw`$$\begin{aligned}
x &= 1 \\
&= 2
\end{aligned}$$`
const source = `# Lezione sintetica\n\nSostituendo iterativamente:\n\n${formula}\n\nIl testo continua.\n\n## Ultimo capitolo\n\nFine della lezione.`

describe('display math compatibility', () => {
  it('rende epsilon e cases con delimitatori Gemini senza inglobare il seguito', () => {
    const source = String.raw`Politica \(\epsilon\)-greedy e \(\epsilon\)-soft.

\[\pi(a\mid s)=\begin{cases}
1-\epsilon+\frac{\epsilon}{|A(s)|} & \text{greedy} \\
\frac{\epsilon}{|A(s)|} & \text{altrimenti}
\end{cases}\]

Il testo continua.`
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }, normalizeDisplayMath(source)))
    expect(html).toContain('katex-display')
    expect(html).not.toContain('katex-error')
    expect(html).toContain('<p>Il testo continua.</p>')
    expect(normalizeDisplayMath('`\\(x\\)`')).toBe('`\\(x\\)`')
  })
  it('repairs the flow fence that swallowed the rest of the lecture', () => {
    const fixed = normalizeDisplayMath(source)
    expect(fixed).toContain('$$\n\\begin{aligned}')
    expect(fixed).toContain('\\end{aligned}\n$$')
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
      remarkPlugins: [remarkMath, remarkGfm], rehypePlugins: [rehypeKatex]
    }, fixed))
    expect(html).toContain('class="katex-display"')
    expect(html).not.toContain('katex-error')
    expect(html).not.toContain('undefined')
    expect(html).toContain('<p>Il testo continua.</p>')
    expect(html).toContain('<h2>Ultimo capitolo</h2>')
    expect(html).toContain('<p>Fine della lezione.</p>')
    expect(normalizeDisplayMath(fixed)).toBe(fixed)
  })

  it.each(['\n', '\r\n'])('preserves existing delimiters and line endings %j', newline => {
    const canonical = '$$\n\\begin{aligned}\nx &= 1\n\\end{aligned}\n$$'.replaceAll('\n', newline)
    expect(normalizeDisplayMath(canonical)).toBe(canonical)
    expect(normalizeDisplayMath(formula.replaceAll('\n', newline))).toBe(formula.replace('$$\\begin', () => '$$\n\\begin').replace('}$$', () => '}\n$$').replaceAll('\n', newline))
  })

  it('preserves code fences, inline code, escaped dollars and single-line formulas', () => {
    for (const literal of [
      `\`\`\`latex\n${formula}\n\`\`\``, `~~~~\n${formula}\n~~~~`,
      `\`${formula}\``, `\`\`backtick \` ${formula}\`\``,
      formula.split('\n').map(line => `    ${line}`).join('\n'),
      String.raw`\$$x
y\$$`, '$x$ and $$x = 1$$', 'Prosa $$x\ny$$ prosa',
      '$0.98$ e $12.34$ sono scalari validi.',
      '$x = 0.99$ e $c = 1.00$ restano formule valide.',
      String.raw`$c = 0.50\$$ e $$c = 0.50\$$$ restano formule con valuta.`,
      '`codice\n\\[x\\] e 0.99,$\nfine`',
      '``codice ` interno\n\\(x\\)\nfine``',
      '$$\n\\begin{aligned}\nx &= 1\n\\end{aligned}\n$$'
    ]) expect(normalizeDisplayMath(literal)).toBe(literal)
  })

  it('handles multiple blocks, partial fence styles and unmatched ordinary backticks', () => {
    const fixed = normalizeDisplayMath(`Un backtick \` letterale.\n\n${formula}\n\n$$x\n+y\n$$\n\n$$\nx\n+y$$\n\nFine.`)
    expect(fixed).toContain('$$\n\\begin{aligned}')
    expect(fixed).toContain('$$\nx\n+y\n$$')
    expect(fixed.endsWith('Fine.')).toBe(true)
    expect(normalizeDisplayMath('$$\\begin{aligned}\nx &= 1')).toBe('$$\\begin{aligned}\nx &= 1')
  })
})
