import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateMermaidSource } from '../../src/components/MermaidDiagram'

it('normalizza solo dichiarazioni complete di nodi flowchart senza alterare etichette o direttive', () => {
  const source = 'flowchart TD\n  P ["Prediction (Policy Evaluation)"]\n  C ["Control [step]"]\n  P --> C'
  expect(validateMermaidSource(source)).toBe('flowchart TD\n  P["Prediction (Policy Evaluation)"]\n  C["Control [step]"]\n  P --> C')
  expect(source).toContain('P [')
  expect(validateMermaidSource('sequenceDiagram\nA->>B: P ["label"]')).toContain('P ["label"]')
  expect(() => validateMermaidSource(source + '\nclick P "https://example.org"')).toThrow()
})
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

it('ripara identificatori di sottografi con spazi mantenendo titolo e stile', () => {
  const input = 'flowchart TD\nsubgraph Punto di Sella ["Punto di Sella (Equilibrio di Nash)"]\ndirection TB\nP1["MASSIMIZZARE U_1"]\nend\nstyle Punto di Sella fill:#f9f9f9,stroke:#333,stroke-width:2px'
  const result = validateMermaidSource(input)
  expect(result).toContain('subgraph lezionify_subgraph_0["Punto di Sella (Equilibrio di Nash)"]')
  expect(result).toContain('style lezionify_subgraph_0 fill:#f9f9f9,stroke:#333,stroke-width:2px')
  expect(() => validateMermaidSource(input.replace('fill:#f9f9f9', 'fill:url(javascript:alert(1))'))).toThrow()
})

it('conserva il titolo implicito del sottografo Maximin Misto', () => {
  const source = 'flowchart LR\nsubgraph Costruzione Grafica del Maximin Misto\ndirection LR\nA["Rette Payoff"] --> B["Inviluppo Inferiore"]\nB --> C["Massimo"]\nend\nstyle Costruzione Grafica del Maximin Misto fill:#eef7ff,stroke:#0066cc,stroke-width:1px'
  const output = validateMermaidSource(source)
  expect(output).toContain('subgraph lezionify_subgraph_0["Costruzione Grafica del Maximin Misto"]')
  expect(output).toContain('style lezionify_subgraph_0 fill:#eef7ff,stroke:#0066cc,stroke-width:1px')
})
