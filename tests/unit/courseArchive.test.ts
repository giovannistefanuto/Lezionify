import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { SettingsService } from '../../electron/main/settings'
import type { CourseDefinition } from '../../shared/archive'

const course = (code: string): CourseDefinition => ({
  code, name: `Corso ${code}`, cfu: 6, lectureHours: 42,
  individualStudyHours: 108, totalHours: 150,
  startDate: '2026-10-01', endDate: '2027-01-31', schedule: []
})

describe('Archiviazione reversibile dei corsi', () => {
  let directory: string
  let service: ArchiveService

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-course-archive-'))
    await new LibraryRepository(directory).initialize()
    service = new ArchiveService(directory, undefined, false)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(directory, { recursive: true, force: true })
  })

  it('considera attive le librerie precedenti e preserva archivio su salvataggi di altre impostazioni', async () => {
    expect(await service.getArchivedCourseCodes()).toEqual([])
    await service.saveCourse(course('A'))
    await service.setCourseArchived('A', true)
    const settings = new SettingsService(directory)
    await settings.saveSettings({ autoProcessOnImport: false })
    expect((await settings.getSettings()).archivedCourseCodes).toEqual(['A'])
  })

  it('persiste archiviazione e ripristino dopo riapertura senza alterare la scheda corso', async () => {
    await service.saveCourse(course('A'))
    const before = await service.getCourses()
    await service.setCourseArchived(' A ', true)
    await service.setCourseArchived('A', true)
    service = new ArchiveService(directory, undefined, false)
    expect(await service.getArchivedCourseCodes()).toEqual(['A'])
    expect(await service.getCourses()).toEqual(before)
    expect(await service.setCourseArchived('A', false)).toEqual([])
    expect(await new ArchiveService(directory).getArchivedCourseCodes()).toEqual([])
  })

  it('supporta corsi senza scheda conservando lezioni e fonti byte per byte', async () => {
    const audio = join(directory, 'RAW 2026-1001-10-00-00.mp3')
    await writeFile(audio, Buffer.alloc(4096, 1))
    await writeFile(audio.replace('.mp3', '.txt'), 'Trascrizione grezza sintetica')
    const imported = await service.importFiles([audio])
    const id = imported.imported[0].id
    await service.updateLecture(id, { studyStatus: 'completata' })
    await service.saveMarkdown(id, '# Dispensa sintetica\n\nContenuto')
    await service.writeCourseInfo('RAW', 'Info sintetiche')
    const before = await service.listLectures()
    const audioPath = (await service.getAudioFilePath(id))!
    const beforeAudio = await readFile(audioPath)
    const beforeMarkdown = await service.readMarkdown(id)
    const beforeTranscript = await service.readTranscript(id)
    expect(beforeTranscript).toBe('Trascrizione grezza sintetica')
    const beforeLibrary = await readFile(join(directory, 'library.json'))
    await service.setCourseArchived('RAW', true)
    expect(await service.listLectures()).toEqual(before)
    expect(await readFile(audioPath)).toEqual(beforeAudio)
    expect(await service.readMarkdown(id)).toEqual(beforeMarkdown)
    expect(await service.readTranscript(id)).toBe(beforeTranscript)
    expect(await readFile(join(directory, 'library.json'))).toEqual(beforeLibrary)
    expect(await service.readCourseInfo('RAW')).toBe('Info sintetiche')
    expect(await service.getCourses()).toEqual([])
  })

  it('rifiuta argomenti IPC non validi e corsi inesistenti', async () => {
    for (const [code, archived] of [[null, true], ['', true], [' ', true], ['A'.repeat(121), true], ['A', 'true']]) {
      await expect(service.setCourseArchived(code, archived)).rejects.toThrow('non valido')
    }
    await expect(service.setCourseArchived('INESISTENTE', true)).rejects.toThrow('Corso non trovato')
    expect(await service.getArchivedCourseCodes()).toEqual([])
  })

  it('valida anche scritture tramite impostazioni generali', async () => {
    const settings = new SettingsService(directory)
    for (const codes of [[''], [2], 'A', ['A'.repeat(121)], Array(501).fill('A')]) {
      await expect(settings.saveSettings({ archivedCourseCodes: codes })).rejects.toThrow('non valido')
    }
    await settings.saveSettings({ archivedCourseCodes: [' A ', 'A', 'B'] })
    expect(await service.getArchivedCourseCodes()).toEqual(['A', 'B'])
  })

  it('non perde archiviazioni concorrenti di corsi diversi', async () => {
    await service.saveCourse(course('A'))
    await service.saveCourse(course('B'))
    await Promise.all([service.setCourseArchived('A', true), service.setCourseArchived('B', true)])
    expect(await service.getArchivedCourseCodes()).toEqual(['A', 'B'])
  })

  it('mantiene archiviazione modificando o rinominando un corso', async () => {
    await service.saveCourse(course('A'))
    await service.setCourseArchived('A', true)
    await service.saveCourse({ ...course('A'), name: 'Nome aggiornato' })
    expect(await service.getArchivedCourseCodes()).toEqual(['A'])
    await service.saveCourse(course('B'), 'A')
    expect(await service.getArchivedCourseCodes()).toEqual(['B'])
    expect((await service.getCourses())[0].code).toBe('B')
  })

  it('ripristina il marcatore originale se la rinomina fallisce', async () => {
    await service.saveCourse(course('A'))
    await service.setCourseArchived('A', true)
    vi.spyOn((service as any).storage, 'writeStudySessions').mockRejectedValueOnce(new Error('synthetic failure'))
    await expect(service.renameCourse('A', 'B')).rejects.toThrow('synthetic failure')
    expect(await service.getArchivedCourseCodes()).toEqual(['A'])
    expect((await service.getCourses())[0].code).toBe('A')
  })

  it('conserva il marcatore eliminando solo la scheda, lo rimuove disassociando le lezioni', async () => {
    const audio = join(directory, 'A 2026-1001-10-00-00.mp3')
    await writeFile(audio, Buffer.alloc(4096, 1))
    await service.importFiles([audio])
    await service.saveCourse(course('A'))
    await service.setCourseArchived('A', true)
    await service.deleteCourse('A', { keepLectures: true })
    expect(await service.getArchivedCourseCodes()).toEqual(['A'])
    expect((await service.listLectures())[0].courseCode).toBe('A')
    await service.deleteCourse('A')
    expect(await service.getArchivedCourseCodes()).toEqual([])
    expect((await service.listLectures())[0].courseCode).toBeNull()
  })
})
