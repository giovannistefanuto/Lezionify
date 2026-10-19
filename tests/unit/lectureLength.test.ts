import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { countLectureWords, relativeLectureLength } from '../../shared/lectureLength'
import { notesProgressMessage } from '../../electron/main/ai/progressDiagnostics'
import { ArchiveService } from '../../electron/main/archive'
import { logger } from '../../electron/main/logger'

describe('Lunghezza delle dispense e diagnostica delle fasi', () => {
  let directory: string
  let service: ArchiveService
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-length-'))
    service = new ArchiveService(directory, undefined, false)
    await service.initialize()
  })
  afterEach(async () => {
    service.destroy()
    await logger.flush()
    await rm(directory, { recursive: true, force: true })
    vi.restoreAllMocks()
  })
  async function add(code: string, day: string) {
    const file = join(directory, `${code} 2026-100${day}-10-00-00.mp3`)
    await writeFile(file, `synthetic audio ${day}`)
    await writeFile(file.replace('.mp3', '.txt'), 'Trascrizione sintetica.')
    return (await service.importFiles([file])).imported[0]
  }

  it('conta il testo visibile con accenti e apostrofi escludendo markup, URL, formule, codice e diagrammi', () => {
    const text = '# L’energia è utile\n\n**Due parole** [un link](https://example.test/percorso)\n\n$\\alpha + x^2$\n\n```mermaid\ngraph TD\nA --> B\n```\n\n> [!NOTE]\n> Un’altra nota\n\n`codice invisibile`\n<!-- commento nascosto -->'
    expect(countLectureWords(text)).toBe(9)
    expect(countLectureWords('   \n$$x^2$$')).toBe(0)
    expect(countLectureWords('Una formula \\(\\alpha + x\\) e \\[\\beta\\]')).toBe(3)
    expect(relativeLectureLength(50, { A: 100, B: 50, C: null })).toBe(50)
    expect(relativeLectureLength(null, { A: 100 })).toBeNull()
    expect(relativeLectureLength(0, { A: 0 })).toBe(0)
  })

  it('confronta solo il corso completo e ricalcola dopo modifiche e riassegnazioni', async () => {
    const first = await add('A', '1')
    const second = await add('A', '2')
    const missing = await add('A', '3')
    const otherCourse = await add('B', '4')
    await service.saveMarkdown(first.id, 'uno due')
    await service.saveMarkdown(second.id, 'uno due tre quattro')
    await service.saveMarkdown(otherCourse.id, 'parola '.repeat(40))
    const counts = await service.getLectureWordCounts(first.id)
    expect(counts).toEqual({ [first.id]: 2, [second.id]: 4, [missing.id]: null })
    expect(relativeLectureLength(counts[first.id], counts)).toBe(50)
    expect(await service.getLectureWordCounts(otherCourse.id)).toEqual({ [otherCourse.id]: 40 })
    await service.saveMarkdown(first.id, 'uno due tre quattro cinque sei')
    expect((await service.getLectureWordCounts(first.id))[first.id]).toBe(6)
    await service.updateLecture(second.id, { courseCode: 'B' })
    expect(await service.getLectureWordCounts(first.id)).toEqual({ [first.id]: 6, [missing.id]: null })
    const movedCounts = await service.getLectureWordCounts(second.id)
    expect(movedCounts).toEqual({ [second.id]: 4, [otherCourse.id]: 40 })
    expect(relativeLectureLength(movedCounts[second.id], movedCounts)).toBe(10)
    await rm(join(directory, 'markdown', `${first.id}.md`))
    expect((await service.getLectureWordCounts(first.id))[first.id]).toBeNull()
  })

  it('mantiene il riferimento del corso anche dopo archiviazione e ripristino', async () => {
    const first = await add('A', '1')
    const second = await add('A', '2')
    await service.saveMarkdown(first.id, 'uno due')
    await service.saveMarkdown(second.id, 'uno due tre quattro')
    const expected = { [first.id]: 2, [second.id]: 4 }
    await service.setCourseArchived('A', true)
    expect(await service.getLectureWordCounts(first.id)).toEqual(expected)
    await service.setCourseArchived('A', false)
    expect(await service.getLectureWordCounts(first.id)).toEqual(expected)
  })

  it('non assegna una percentuale arbitraria alle lezioni senza corso o inesistenti', async () => {
    const first = await add('A', '1')
    await service.saveMarkdown(first.id, 'uno due')
    await service.updateLecture(first.id, { courseCode: null })
    expect(await service.getLectureWordCounts(first.id)).toEqual({})
    await expect(service.getLectureWordCounts('inesistente')).rejects.toThrow('Lezione non trovata')
  })

  it('registra sezioni, note esame e logistica senza titoli o testi privati', async () => {
    const first = await add('A', '1')
    await service.saveSettings({ apiKeys: ['synthetic-test-key'] })
    vi.spyOn(service['geminiService'], 'generateLectureNotes').mockImplementation(async params => {
      params.onProgress?.('Fase 1/3: Segmentazione semantica…', 20)
      params.onProgress?.('Fase 2/3: Elaborazione sezione 1 di 2 ("titolo privato")…', 60)
      params.onProgress?.('Estrazione delle note importanti per l’esame…', 48)
      return '# Testo privato della dispensa'
    })
    vi.spyOn(service['geminiService'], 'extractCourseLogistics').mockResolvedValue('Nota privata del corso')
    expect((await service.generateLectureNotes(first.id)).success).toBe(true)
    const entries = logger.getLogs().filter(entry => entry.source === 'ai-notes' || entry.source === 'course-logistics')
    expect(entries.some(entry => entry.message.includes('sezione 1 di 2'))).toBe(true)
    expect(entries.some(entry => entry.message.includes('note importanti'))).toBe(true)
    expect(entries.some(entry => entry.message.includes('corso aggiornate'))).toBe(true)
    const serialized = JSON.stringify(entries)
    for (const privateText of ['titolo privato', 'Testo privato', 'Nota privata', 'synthetic-test-key']) expect(serialized).not.toContain(privateText)
    expect(notesProgressMessage('Fase 2/3: Sezione 2 di 3 ("Privato") ripristinata dal checkpoint…', 70)).toContain('ripristinata')
  })
})
