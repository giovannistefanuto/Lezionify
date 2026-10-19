import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FocusPdfService } from '../../electron/main/focusPdf'
import { discussionWidth, focusLayout } from '../../src/utils/focusLayout'

let root: string
let source: string
let profile: string
const content = '%PDF-1.7\nSynthetic source stays untouched.\n%%EOF'
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lezionify-focus-pdf-'))
  profile = join(root, 'focus-pdfs.json')
  source = join(root, 'slide annotate.pdf')
  await writeFile(source, content)
})
afterEach(async () => { await rm(root, { recursive: true, force: true }) })

describe('Read-only PDF access', () => {
  it('allarga e riduce la discussione conservando i minimi di lettura e restituendo lo spazio alle slide', () => {
    const narrow = focusLayout(1440, 0.5, true, true, 0.25)
    const wide = focusLayout(1440, 0.5, true, true, 0.7)
    expect(narrow.showPdf).toBe(true)
    expect(wide.showPdf).toBe(false)
    expect(wide.qnaWidth).toBeGreaterThan(narrow.qnaWidth)
    expect(1440 - wide.qnaWidth - 10).toBeGreaterThanOrEqual(360)
    expect(discussionWidth(800, 0.85)).toBe(430)
    expect(discussionWidth(600, 0.15)).toBe(300)
  })
  it('grants opaque URLs, remembers per lecture and revokes access without touching the PDF', async () => {
    const service = new FocusPdfService(profile, root, async () => source)
    const document = (await service.select('lecture-A'))!
    expect(document.url).not.toContain(root)
    expect(document.name).toBe('slide annotate.pdf')
    expect(await (await service.response(new Request(document.url))).text()).toBe(content)
    expect(await service.get('lecture-B')).toBeNull()
    service.release(document.id)
    expect((await service.response(new Request(document.url))).status).toBe(404)
    const fresh = new FocusPdfService(profile, root, async () => null)
    const restored = (await fresh.get('lecture-A'))!
    expect(restored.id).not.toBe(document.id)
    expect(await (await fresh.response(new Request(restored.url))).text()).toBe(content)
    expect(await readFile(source, 'utf8')).toBe(content)
  })

  it('serves bounded byte ranges and HEAD, rejects malformed ranges and writes', async () => {
    const service = new FocusPdfService(profile, root, async () => source)
    const document = (await service.select('A'))!
    const part = await service.response(new Request(document.url, { headers: { Range: 'bytes=0-7' } }))
    expect(part.status).toBe(206)
    expect(part.headers.get('content-range')).toBe(`bytes 0-7/${content.length}`)
    expect(await part.text()).toBe(content.slice(0, 8))
    const head = await service.response(new Request(document.url, { method: 'HEAD' }))
    expect(head.headers.get('content-length')).toBe(String(content.length))
    expect(await head.text()).toBe('')
    expect((await service.response(new Request(document.url, { headers: { Range: 'bytes=9999-' } }))).status).toBe(416)
    expect((await service.response(new Request(document.url, { method: 'POST' }))).status).toBe(405)
    expect(await readFile(source, 'utf8')).toBe(content)
  })

  it('never accepts renderer-supplied paths or arbitrary URL paths', async () => {
    const service = new FocusPdfService(profile, root, async () => source)
    await expect(service.get('../lecture')).rejects.toThrow('Lezione non valida')
    await expect(service.select(source)).rejects.toThrow('Lezione non valida')
    const document = (await service.select('A'))!
    for (const url of [`slides://pdf/${encodeURIComponent(source)}`, document.url + '?path=' + encodeURIComponent(source), document.url + '/extra']) {
      expect((await service.response(new Request(url))).status).toBe(404)
    }
  })

  it('cancel keeps the association and file untouched', async () => {
    const pick = vi.fn().mockResolvedValueOnce(source).mockResolvedValueOnce(null)
    const service = new FocusPdfService(profile, root, pick)
    await service.select('A')
    const before = await readFile(profile, 'utf8')
    expect(await service.select('A')).toBeNull()
    expect(await readFile(profile, 'utf8')).toBe(before)
    expect(await readFile(source, 'utf8')).toBe(content)
    expect(pick.mock.calls[1][0]).toBe(root)
  })

  it('discovery opens the Notability folder using metadata without opening its PDFs', async () => {
    const folder = join(root, 'OneDrive - Synthetic University', 'Notability Backup')
    await mkdir(folder, { recursive: true })
    const pick = vi.fn().mockResolvedValue(null)
    await new FocusPdfService(profile, root, pick).select('A')
    expect(pick).toHaveBeenCalledWith(folder)
    expect(await readdir(folder)).toEqual([])
  })

  it('invalid PDFs and missing OneDrive files return sanitized retry errors', async () => {
    const service = new FocusPdfService(profile, root, async () => source)
    const document = (await service.select('A'))!
    await writeFile(source, 'not a PDF')
    const response = await service.response(new Request(document.url))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(root)
    await rm(source)
    await expect(service.get('A')).rejects.toThrow('PDF non disponibile')
    expect((await service.response(new Request(document.url))).status).toBe(503)
  })

  it('serializes concurrent associations and refuses to overwrite corrupt preferences', async () => {
    const service = new FocusPdfService(profile, root, async () => source)
    await Promise.all([service.select('A'), service.select('B')])
    expect(Object.keys(JSON.parse(await readFile(profile, 'utf8')).lectures)).toEqual(['A', 'B'])
    const corrupt = join(root, 'broken.json')
    await writeFile(corrupt, 'bad json')
    await expect(new FocusPdfService(corrupt, root, async () => source).select('A')).rejects.toThrow('associazioni PDF')
    expect(await readFile(corrupt, 'utf8')).toBe('bad json')
  })
})

describe('Focus panel sizing', () => {
  it('keeps a minimum readable text/PDF width and temporarily hides slides for questions', () => {
    const wide = focusLayout(1440, 0.5, true, true)
    expect(wide.showPdf).toBe(true)
    expect(wide.pdfWidth).toBeGreaterThanOrEqual(300)
    expect(1440 - wide.qnaWidth - wide.pdfWidth - 10).toBeGreaterThanOrEqual(360)
    expect(focusLayout(900, 0.5, true, true).showPdf).toBe(false)
    expect(focusLayout(900, 0.5, true, false).showPdf).toBe(true)
    expect(focusLayout(900, 0.85, true, false).pdfWidth).toBe(530)
  })
})
