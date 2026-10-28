import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateMermaidSource } from '../../src/components/MermaidDiagram'
const source = readFileSync('tests/fixtures/fictitious-play.mmd', 'utf8').trim()
it('accetta il diagramma Fictitious Play con metadati e stili terminati da punto e virgola', () => {
  expect(validateMermaidSource(source)).toBe(source)
})
it('rifiuta direttive concatenate dopo lo stile', () => {
  expect(() =>
    validateMermaidSource(
      'flowchart TD\nA-->B\nstyle A fill:#fff;click A "https://example.com"'
    )
  ).toThrow()
})

it.each(['fill:url(javascript:alert(1))', 'stroke-width:100px', 'fill:#fff;click A "https://example.com"', 'font-size:20px'])('rifiuta stile non consentito anche negli stati: %s', style => {
  expect(() => validateMermaidSource(`stateDiagram-v2\nA --> B\nstyle A ${style}`)).toThrow('direttiva non consentita')
})

it('accetta il terminatore standard anche nel caso minimo e conserva etichette e metadati', () => {
  const minimal = 'flowchart TD\nA-->B\nstyle A stroke-width:2px;'
  expect(validateMermaidSource(minimal)).toBe(minimal)
  expect(
    validateMermaidSource(source.replace(/^\s*acc(?:Title|Descr):.*$/gm, ''))
  ).toContain('<br/>')
})
