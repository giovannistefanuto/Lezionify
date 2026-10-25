import { expect, it } from 'vitest'
import { extractCoursePdf } from '../../electron/main/courseRagIndex'

it('extracts real multicolumn PDF paragraphs, preserves table rows and exposes a graphic-only page', async () => {
  const columns = Array.from({ length: 5 }, (_, row) => [
    `1 0 0 1 30 ${740 - row * 20} Tm (LEFT${row} This paragraph has enough words to identify a text column.) Tj`,
    `1 0 0 1 330 ${740 - row * 20} Tm (RIGHT${row} Another paragraph has enough words to identify a column.) Tj`
  ].join('\n')).join('\n')
  const table = Array.from({ length: 5 }, (_, row) => `1 0 0 1 30 ${740 - row * 20} Tm (cell${row * 2}) Tj\n1 0 0 1 330 ${740 - row * 20} Tm (cell${row * 2 + 1}) Tj`).join('\n')
  const streams = [`BT /F1 7 Tf\n${columns}\nET`, `BT /F1 12 Tf\n${table}\nET`, '0.2 0.4 0.6 rg 30 30 300 200 re f']
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  for (const stream of streams) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length + 2} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }
  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const pages = await extractCoursePdf(new Uint8Array(Buffer.from(pdf)))
  expect(pages).toHaveLength(3)
  expect(pages[0].text.indexOf('LEFT4')).toBeGreaterThan(0)
  expect(pages[0].text.indexOf('LEFT4')).toBeLessThan(pages[0].text.indexOf('RIGHT0'))
  expect(pages[1].text.indexOf('cell1')).toBeLessThan(pages[1].text.indexOf('cell2'))
  expect(pages[2].text).toBe('')
}, 30000)
