import { describe, expect, it, vi } from 'vitest'
vi.mock('electron', () => ({ BrowserWindow: vi.fn(), dialog: {} }))
import {
  preparePdfExport,
  PdfExportService
} from '../../electron/main/pdfExport'
import {
  pdfExportFileName,
  validatePdfExportRequest
} from '../../shared/pdfExport'
import type { Lecture } from '../../shared/archive'

const lecture = (
  id: string,
  courseCode: string | null,
  recordedAt: string | null
): Lecture =>
  ({
    id,
    courseCode,
    recordedAt,
    importedAt: '2026-10-13T09:00:00Z',
    title: `Titolo ${id}`,
    sourceAudioFileName: `${id}.mp3`
  }) as Lecture
const source = () => ({
  listLectures: vi.fn(async () => [
    lecture('b', 'A', '2026-10-12T09:00:00Z'),
    lecture('other', 'B', null),
    lecture('a', 'A', '2026-10-01T09:00:00Z'),
    lecture('c', 'A', null)
  ]),
  readMarkdown: vi.fn(async (id: string) =>
    id === 'c' ? null : `# Italiano ${id}`
  ),
  readMarkdownEn: vi.fn(async (id: string) =>
    id === 'b' ? null : `# English ${id}`
  )
})

describe('PDF export from local derivations', () => {
  it('exports only selected IDs in chronological order, including selected labs, and rejects foreign IDs', async () => {
    const archive = source()
    archive.listLectures.mockResolvedValue([
      { ...lecture('b', 'A', '2026-10-12'), isLaboratory: true },
      lecture('a', 'A', '2026-10-01'),
      lecture('c', 'A', null),
      lecture('foreign', 'B', null)
    ])
    const result = await preparePdfExport(archive, {
      kind: 'course',
      courseCode: 'A',
      language: 'it',
      lectureIds: ['b', 'a']
    })
    expect(result.lectures.map((item) => item.id)).toEqual(['a', 'b'])
    expect(archive.readMarkdown.mock.calls.flat()).not.toContain('c')
    for (const ids of [
      [],
      ['a', 'a'],
      ['../private'],
      ['foreign'],
      ['deleted']
    ])
      await expect(
        preparePdfExport(archive, {
          kind: 'course',
          courseCode: 'A',
          language: 'it',
          lectureIds: ids
        })
      ).rejects.toThrow()
    expect(
      pdfExportFileName(
        { kind: 'lecture', lectureId: 'a', language: 'it' },
        {
          ...result,
          lectures: [
            {
              ...result.lectures[0],
              title: 'Formule: esempio / prova',
              date: '2026-10-01T12:00:00'
            }
          ]
        }
      )
    ).toBe('Lezione_Formule__esempio___prova_IT_2026-10-01.pdf')
    expect(
      pdfExportFileName(
        { kind: 'course', courseCode: 'A', language: 'en' },
        result,
        new Date(2026, 9, 19)
      )
    ).toBe('Corso_A_EN_2026-10-19.pdf')
  })
  it('excludes laboratory lessons by default and includes them only on explicit course selection', async () => {
    const archive = source()
    const lab = {
      ...lecture('lab', 'A', '2026-10-05T09:00:00Z'),
      isLaboratory: true
    }
    archive.listLectures.mockResolvedValue([
      lecture('a', 'A', '2026-10-01T09:00:00Z'),
      lab,
      lecture('other', 'B', null)
    ])
    for (const language of ['it', 'en']) {
      for (const includeLaboratory of [undefined, false, true]) {
        const result = await preparePdfExport(archive, {
          kind: 'course',
          courseCode: 'A',
          language,
          includeLaboratory
        })
        expect(result.lectures.map((item) => item.id)).toEqual(
          includeLaboratory ? ['a', 'lab'] : ['a']
        )
      }
    }
    expect(
      (
        await preparePdfExport(archive, {
          kind: 'lecture',
          lectureId: 'lab',
          language: 'it'
        })
      ).lectures[0].id
    ).toBe('lab')
    archive.listLectures.mockResolvedValue([lab])
    await expect(
      preparePdfExport(archive, {
        kind: 'course',
        courseCode: 'A',
        language: 'it'
      })
    ).rejects.toThrow('Nessuna lezione')
    expect(
      (
        await preparePdfExport(archive, {
          kind: 'course',
          courseCode: 'A',
          language: 'it',
          includeLaboratory: true
        })
      ).lectures
    ).toHaveLength(1)
  })
  it('rejects non-boolean laboratory options over IPC', () => {
    for (const includeLaboratory of ['true', 'false', 1, null, {}, []]) {
      expect(() =>
        validatePdfExportRequest({
          kind: 'course',
          courseCode: 'A',
          language: 'it',
          includeLaboratory
        })
      ).toThrow('laboratorio')
    }
  })
  it('includes the whole course chronologically with explicit missing notes and no language fallback', async () => {
    const archive = source()
    const result = await preparePdfExport(archive, {
      kind: 'course',
      courseCode: 'A',
      language: 'en'
    })
    expect(result.lectures.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(result.lectures[1].markdown).toBeNull()
    expect(result.lectures[0].markdown).toBe('# English a')
    expect(archive.readMarkdown).not.toHaveBeenCalled()
    expect(archive.readMarkdownEn.mock.calls.flat()).not.toContain('other')
  })
  it('exports one lecture, permits unassigned lessons, and rejects empty or unavailable selections', async () => {
    const archive = source()
    expect(
      (
        await preparePdfExport(archive, {
          kind: 'lecture',
          lectureId: 'b',
          language: 'it'
        })
      ).lectures
    ).toHaveLength(1)
    await expect(
      preparePdfExport(archive, {
        kind: 'lecture',
        lectureId: 'b',
        language: 'en'
      })
    ).rejects.toThrow('Nessuna dispensa')
    await expect(
      preparePdfExport(archive, {
        kind: 'course',
        courseCode: 'empty',
        language: 'it'
      })
    ).rejects.toThrow('Nessuna lezione')
    archive.listLectures.mockResolvedValue([lecture('unassigned', null, null)])
    expect(
      (
        await preparePdfExport(archive, {
          kind: 'course',
          courseCode: 'Senza corso',
          language: 'it'
        })
      ).lectures[0].id
    ).toBe('unassigned')
  })
  it('does not turn a read failure into a silent missing entry', async () => {
    const archive = source()
    archive.readMarkdown.mockRejectedValue(new Error('Synthetic IO failure'))
    await expect(
      preparePdfExport(archive, {
        kind: 'course',
        courseCode: 'A',
        language: 'it'
      })
    ).rejects.toThrow('Synthetic IO failure')
  })
  it('rejects malformed IPC, path-like IDs and unauthorized renderer reads', () => {
    for (const value of [
      null,
      {},
      { kind: 'lecture', lectureId: '../secrets', language: 'it' },
      { kind: 'course', courseCode: '', language: 'en' },
      { kind: 'lecture', lectureId: 'a', language: 'fr' }
    ])
      expect(() => validatePdfExportRequest(value)).toThrow()
    const service = new PdfExportService(source(), 'renderer', 'preload')
    expect(() =>
      service.getDocument({} as Electron.IpcMainInvokeEvent, 'token')
    ).toThrow('non autorizzata')
    expect(() =>
      service.ready({} as Electron.IpcMainInvokeEvent, 'token', false)
    ).toThrow('non autorizzata')
  })
})
