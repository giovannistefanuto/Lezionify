import katex from 'katex'

/** Render title formulas only; the surrounding title remains literal text. */
export function InlineMathTitle({ text }: { text: string }) {
  return <>{text.split(/(\$[^$\n]+\$|\\\([\s\S]*?\\\))/g).map((part, index) => {
    const formula = part.startsWith('$') && part.endsWith('$') ? part.slice(1, -1)
      : part.startsWith('\\(') && part.endsWith('\\)') ? part.slice(2, -2) : null
    if (formula === null) return part
    return <span key={index} className="title-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(formula, {
      throwOnError: false, trust: false, displayMode: false, strict: 'ignore', maxExpand: 1000
    }) }} />
  })}</>
}
