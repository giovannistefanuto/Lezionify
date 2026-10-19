import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Lecture } from '../../shared/archive'
import { extractLectureTitle, lectureTitle, replaceLectureTitle, validateLectureTitles } from '../../shared/lectureTitles'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { FileStorageService } from '../../electron/main/fileStorage'
import { GeminiService } from '../../electron/main/gemini'
import { preparePdfExport } from '../../electron/main/pdfExport'

describe('Independent persistent lecture titles', () => {
  let directory: string
  let service: ArchiveService
  let storage: FileStorageService
  let gemini: GeminiService
  const lecture: Lecture = { id: 'lesson', courseCode: 'IR', title: 'Titolo originale', recordedAt: null,
    sourceAudioFileName: 'original.mp3', sourceTranscriptFileName: 'original.txt', audioFileName: 'lesson.mp3',
    transcriptFileName: 'lesson.txt', markdownFileName: 'lesson.md', markdownEnFileName: 'lesson_en.md',
    byteSize: 16, checksum: 'synthetic', importedAt: '2026-10-01T08:00:00Z', status: 'transcript-available', studyStatus: 'in-corso' }
  const italian = '```md\r\n# Esempio di codice\r\n```\r\n# Titolo originale\r\n\r\nTesto $x^2$.\r\n\r\n## Capitolo\r\n\r\n```mermaid\r\nflowchart LR\r\nA --> B\r\n```\r\n'
  const english = '# Original English title\n\nEnglish content.\n'
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-titles-'))
    storage = new FileStorageService(directory); await storage.initialize()
    const repository = new LibraryRepository(directory); await repository.initialize()
    await repository.writeLibrary({ version: 1, lectures: [lecture] })
    await storage.writeMarkdown('lesson.md', italian)
    await storage.writeMarkdownEn('lesson.md', english)
    await writeFile(join(directory, 'audio', 'lesson.mp3'), 'original audio')
    await writeFile(join(directory, 'transcripts', 'lesson.txt'), 'Original raw transcript')
    gemini = new GeminiService()
    vi.spyOn(gemini, 'translateToEnglish').mockResolvedValue('# Generated English\n\nEnglish content.')
    service = new ArchiveService(directory, gemini, false)
  })
  afterEach(async () => { service.destroy(); vi.restoreAllMocks(); await rm(directory, { recursive: true, force: true }) })

  it('renames only IT, preserves EN and source bytes, and survives restart and synchronization', async () => {
    const updated = await service.renameLectureTitles('lesson', { it: 'Robot e controllo' })
    expect(updated.title).toBe('Robot e controllo')
    expect(updated.titleOverrides).toEqual({ it: 'Robot e controllo' })
    expect(await service.readMarkdown('lesson')).toBe(italian.replace('# Titolo originale', '# Robot e controllo'))
    expect(await service.readMarkdownEn('lesson')).toBe(english)
    expect(await readFile(join(directory, 'audio', 'lesson.mp3'), 'utf8')).toBe('original audio')
    expect(await service.readTranscript('lesson')).toBe('Original raw transcript')
    service.destroy(); service = new ArchiveService(directory, gemini, false)
    expect((await service.listLectures())[0].title).toBe('Robot e controllo')
    const returned = (await service.listLectures())[0]
    returned.titleOverrides!.it = 'External mutation'
    expect((await service.listLectures())[0].titleOverrides?.it).toBe('Robot e controllo')
    await service.scanAndSyncLibrary()
    expect((await service.listLectures())[0].titleOverrides?.it).toBe('Robot e controllo')
    expect(gemini.translateToEnglish).not.toHaveBeenCalled()
  })
  it('persists EN independently and exports the title for the requested language', async () => {
    await service.renameLectureTitles('lesson', { en: 'My English title' })
    expect(await service.readMarkdown('lesson')).toBe(italian)
    expect(await service.readMarkdownEn('lesson')).toBe('# My English title\n\nEnglish content.\n')
    const source = { listLectures: () => service.listLectures(), readMarkdown: (id: string) => service.readMarkdown(id), readMarkdownEn: (id: string) => service.readMarkdownEn(id) }
    expect((await preparePdfExport(source, { kind: 'course', courseCode: 'IR', language: 'en' })).lectures[0].title).toBe('My English title')
    expect((await preparePdfExport(source, { kind: 'lecture', lectureId: 'lesson', language: 'it' })).title).toBe('Titolo originale')
  })
  it('keeps both manual titles when notes are replaced and English is explicitly regenerated', async () => {
    await service.renameLectureTitles('lesson', { it: 'Italiano permanente', en: 'Permanent English' })
    await service.saveMarkdown('lesson', '# Titolo AI\n\nNuovo contenuto.')
    expect(await service.readMarkdown('lesson')).toBe('# Italiano permanente\n\nNuovo contenuto.')
    await service.saveSettings({ apiKeys: ['synthetic-key'], autoProcessOnImport: false })
    expect((await service.translateLectureNotes('lesson')).success).toBe(true)
    expect(await service.readMarkdownEn('lesson')).toBe('# Permanent English\n\nEnglish content.')
    expect((await service.listLectures())[0].titleOverrides).toEqual({ it: 'Italiano permanente', en: 'Permanent English' })
  })
  it('rolls back both files and metadata when the second write fails', async () => {
    const original = FileStorageService.prototype.writeMarkdownEn
    vi.spyOn(FileStorageService.prototype, 'writeMarkdownEn').mockRejectedValueOnce(new Error('Synthetic write failure')).mockImplementation(original)
    await expect(service.renameLectureTitles('lesson', { it: 'Nuovo IT', en: 'New EN' })).rejects.toThrow('non sono state applicate')
    expect(await service.readMarkdown('lesson')).toBe(italian)
    expect(await service.readMarkdownEn('lesson')).toBe(english)
    expect((await new LibraryRepository(directory).readLibrary()).lectures[0]).toEqual(lecture)
  })
  it('can prepare an EN title without creating notes or calling AI', async () => {
    await service.saveMarkdown('lesson', '# Italian only')
    await service.renameLectureTitles('lesson', { en: 'Future English' })
    expect(await service.readMarkdownEn('lesson')).toBeNull()
    expect(gemini.translateToEnglish).not.toHaveBeenCalled()
    expect((await service.listLectures())[0].titleOverrides?.en).toBe('Future English')
  })
  it('restores Markdown when metadata cannot be committed', async () => {
    vi.spyOn(LibraryRepository.prototype, 'writeLibrary').mockRejectedValueOnce(new Error('Synthetic metadata failure'))
    await expect(service.renameLectureTitles('lesson', { it: 'Nuovo IT', en: 'New EN' })).rejects.toThrow('non sono state applicate')
    expect(await service.readMarkdown('lesson')).toBe(italian)
    expect(await service.readMarkdownEn('lesson')).toBe(english)
    expect((await service.listLectures())[0].titleOverrides).toBeUndefined()
  })
  it('rejects malformed updates and persisted overrides', async () => {
    for (const value of [null, {}, [], { it: '' }, { en: ' ' }, { it: 'a\nb' }, { it: 5 }, { fr: 'Bonjour' }, { en: 'x'.repeat(501) }]) {
      await expect(service.renameLectureTitles('lesson', value)).rejects.toThrow('non validi')
    }
    await writeFile(join(directory, 'library.json'), JSON.stringify({ version: 1, lectures: [{ ...lecture, titleOverrides: { it: 3 } }] }))
    await expect(new LibraryRepository(directory).readLibrary()).rejects.toThrow('non valido')
  })
})

describe('Markdown title editing', () => {
  it('ignores fenced examples and preserves the rest, including CRLF', () => {
    const original = '~~~md\r\n# Code title\r\n~~~\r\n\r\n# Actual title ###\r\n\r\n## Body\r\n'
    expect(extractLectureTitle(original)).toBe('Actual title')
    expect(replaceLectureTitle(original, 'New title')).toBe(original.replace('# Actual title ###', '# New title'))
  })
  it('escapes literal title syntax and inserts an H1 only when absent', () => {
    const title = 'A * B _ C <D> [E]'
    expect(extractLectureTitle(replaceLectureTitle('Body\n', title))).toBe(title)
    expect(replaceLectureTitle('Body\r\n', 'Title')).toBe('# Title\r\n\r\nBody\r\n')
    expect(() => validateLectureTitles({ it: title })).not.toThrow()
    expect(lectureTitle({ title: 'Italian' } as Lecture, 'en', '# English\n')).toBe('English')
  })
})
