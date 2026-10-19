import { describe, expect, it } from 'vitest'
import { mermaidPrintAlternative, mermaidPrintScale, needsMermaidPrintAlternative } from '../../src/utils/mermaidPrint'

describe('Mermaid PDF layout selection', () => {
  it('keeps natural size for ordinary diagrams and detects unreadable width or height', () => {
    expect(mermaidPrintScale(400, 450)).toBe(1)
    expect(needsMermaidPrintAlternative(400, 450)).toBe(false)
    expect(needsMermaidPrintAlternative(1400, 120)).toBe(true)
    expect(needsMermaidPrintAlternative(200, 1500)).toBe(true)
    expect(mermaidPrintScale(1320, 200)).toBe(0.5)
    expect(mermaidPrintScale(0, 200)).toBe(0)
    expect(mermaidPrintScale(Number.NaN, 200)).toBe(0)
  })
  it('changes only the first flowchart direction, preserving labels, styling and edges', () => {
    const source = '%% Printed copy only\r\nflowchart LR\r\nA["graph LR stays in the label"] -->|"data"| B["Output"]\r\nstyle A fill:#fff\r\n'
    expect(mermaidPrintAlternative(source)).toBe(source.replace('flowchart LR', 'flowchart TD'))
    expect(mermaidPrintAlternative('graph RL\nB --> A')).toBe('graph BT\nB --> A')
    expect(mermaidPrintAlternative('flowchart TD\nA --> B')).toBe('flowchart LR\nA --> B')
    expect(mermaidPrintAlternative('graph BT\nB --> A')).toBe('graph RL\nB --> A')
  })
  it('never rewrites sequence diagrams or a flowchart-like line inside another diagram', () => {
    expect(mermaidPrintAlternative('sequenceDiagram\nA->>B: Message')).toBeNull()
    expect(mermaidPrintAlternative('mindmap\n  root\n    graph LR')).toBeNull()
  })
})
