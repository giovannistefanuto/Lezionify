import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { SettingsService } from '../../electron/main/settings'
import { GeminiService } from '../../electron/main/gemini'
import { scanAudioFiles } from '../../electron/main/usbDetector'
import type { CourseDefinition } from '../../shared/archive'
import {
  formatLocalCalendarDate,
  toLocalDateTimeInput
} from '../../shared/calendarDate'

const course: CourseDefinition = {
  code: 'LAB',
  name: 'Corso sintetico',
  cfu: 6,
  lectureHours: 42,
  individualStudyHours: 108,
  totalHours: 150,
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  schedule: [
    { id: 'ordinary', dayOfWeek: 4, startTime: '10:00', endTime: '12:00' }
  ],
  laboratorySchedule: {
    dates: [
      {
        date: '2026-10-15',
        startTime: '16:30',
        endTime: '18:00',
        title: 'Laboratorio sintetico'
      }
    ]
  }
}

describe('Metadato Laboratorio', () => {
  let directory: string
  let service: ArchiveService
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-laboratory-'))
    await new LibraryRepository(directory).initialize()
    service = new ArchiveService(directory, undefined, false)
  })
  afterEach(async () => {
    service.destroy()
    await rm(directory, { recursive: true, force: true })
  })

  it('persiste e rimuove la scelta senza cambiare le fonti e gli altri metadati', async () => {
    const source = join(directory, 'IR 2026-1005-08-30-00.mp3')
    await writeFile(source, Buffer.alloc(4096, 1))
    await writeFile(source.replace('.mp3', '.txt'), 'Trascrizione sintetica')
    const before = (await service.importFiles([source])).imported[0]
    expect(before.isLaboratory).toBeUndefined()
    const audioPath = (await service.getAudioFilePath(before.id))!
    const audio = await readFile(audioPath)
    const transcript = await service.readTranscript(before.id)
    expect(
      await service.updateLecture(before.id, { isLaboratory: true })
    ).toEqual({ ...before, isLaboratory: true })
    const reopened = new LibraryRepository(directory)
    expect((await reopened.readLibrary()).lectures[0].isLaboratory).toBe(true)
    await service.updateLecture(before.id, { title: 'Titolo aggiornato' })
    expect((await service.listLectures())[0].isLaboratory).toBe(true)
    await service.updateLecture(before.id, { isLaboratory: false })
    expect(
      (await new LibraryRepository(directory).readLibrary()).lectures[0]
    ).toEqual({ ...before, title: 'Titolo aggiornato', isLaboratory: false })
    expect(await readFile(audioPath)).toEqual(audio)
    expect(await service.readTranscript(before.id)).toBe(transcript)
  })

  it('rifiuta valori non booleani da IPC e da archivio', async () => {
    for (const isLaboratory of ['true', 1, null, {}, []]) {
      await expect(
        service.updateLecture('missing', { isLaboratory })
      ).rejects.toThrow('non valido')
    }
    const source = join(directory, 'IR 2026-1005-08-30-00.mp3')
    await writeFile(source, Buffer.alloc(4096, 1))
    const lecture = (await service.importFiles([source])).imported[0]
    await writeFile(
      join(directory, 'library.json'),
      JSON.stringify({
        version: 1,
        lectures: [{ ...lecture, isLaboratory: 'true' }]
      })
    )
    await expect(
      new LibraryRepository(directory).readLibrary()
    ).rejects.toThrow('non valido')
  })

  it('assegna un laboratorio datato anche senza uno slot settimanale, con precedenza sul corso ricorrente', async () => {
    await service.saveCourse({
      ...course,
      code: 'OTHER',
      laboratorySchedule: undefined,
      schedule: [
        { id: 'collision', dayOfWeek: 4, startTime: '16:30', endTime: '18:00' }
      ]
    })
    await service.saveCourse(course)
    const source = join(directory, '2026-1015-16-25-00.mp3')
    await writeFile(source, 'audio sintetico')
    const info = await service.detectUsbRecorder(directory)
    expect(info.files[0].suggestedCourseCode).toBe('LAB')
    const normal = (await service.importFiles([source])).imported[0]
    expect(normal.courseCode).toBe('LAB')
    expect(normal.isLaboratory).toBe(true)
    const usbSource = join(directory, '2026-1015-16-40-00.mp3')
    await writeFile(usbSource, 'secondo audio sintetico')
    const usb = (
      await service.importUsbRecorderFiles([
        { fullPath: usbSource, action: 'import', courseCode: 'LAB' }
      ])
    ).importedLectures[0]
    expect(usb.isLaboratory).toBe(true)
  })

  it('limita il laboratorio datato alla data e alla fascia indicata, senza trasformarlo in ricorrenza', async () => {
    await service.saveCourse(course)
    for (const name of [
      'LAB 2026-1015-10-00-00.mp3',
      'LAB 2026-1022-16-30-00.mp3',
      'LAB 2026-1015-18-00-00.mp3'
    ]) {
      const source = join(directory, name)
      await writeFile(source, name)
      expect(
        (await service.importFiles([source])).imported[0].isLaboratory
      ).toBeUndefined()
    }
    expect(
      await service.matchLectureToCourse('2026-10-22T16:30:00', 5400)
    ).toBeNull()
  })

  it('classifica i giovedi, conserva gli altri giorni e rispetta il periodo del corso', async () => {
    await service.saveCourse({
      ...course,
      laboratorySchedule: { daysOfWeek: [4] }
    })
    for (const [name, expected] of [
      ['LAB 2026-1008-10-00-00.mp3', true],
      ['LAB 2026-1009-10-00-00.mp3', undefined],
      ['LAB 2027-0107-10-00-00.mp3', undefined]
    ] as const) {
      const source = join(directory, name)
      await writeFile(source, name)
      expect(
        (await service.importFiles([source])).imported[0].isLaboratory
      ).toBe(expected)
    }
  })

  it('aggiorna le lezioni gia presenti una sola volta e conserva la rimozione manuale', async () => {
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio preesistente')
    const lecture = (await service.importFiles([source])).imported[0]
    await new SettingsService(directory).saveSettings({
      courses: { LAB: course }
    })
    expect(await service.applyScheduledLaboratories()).toBe(1)
    expect(await service.applyScheduledLaboratories()).toBe(0)
    await service.updateLecture(lecture.id, { isLaboratory: false })
    expect(await service.applyScheduledLaboratories()).toBe(0)
    expect((await service.scanAndSyncLibrary())[0].isLaboratory).toBe(false)
  })

  it('classifica gli audio scoperti dalla scansione e le assegnazioni successive', async () => {
    const unassigned = join(directory, '2026-1015-16-30-00.mp3')
    await writeFile(unassigned, 'audio inizialmente senza corso')
    const lecture = (await service.importFiles([unassigned])).imported[0]
    await service.saveCourse(course)
    await service.autoAssignCoursesBySchedule([lecture.id])
    expect((await service.listLectures())[0].isLaboratory).toBe(true)
    const discovered = join(directory, 'audio', 'LAB 2026-1015-16-45-00.mp3')
    await writeFile(discovered, 'audio scoperto in archivio')
    expect(
      (await service.scanAndSyncLibrary()).every((item) => item.isLaboratory)
    ).toBe(true)
  })

  it('ricalcola la scelta automatica quando cambiano data o corso, preservando le scelte manuali', async () => {
    await service.saveCourse(course)
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio sintetico da riclassificare')
    const lecture = (await service.importFiles([source])).imported[0]
    expect(lecture.isLaboratory).toBe(true)
    expect(
      (
        await service.updateLecture(lecture.id, {
          recordedAt: '2026-10-16T16:30:00'
        })
      ).isLaboratory
    ).toBeUndefined()
    expect(
      (
        await service.updateLecture(lecture.id, {
          recordedAt: '2026-10-15T16:30:00'
        })
      ).isLaboratory
    ).toBe(true)
    expect(
      (await service.updateLecture(lecture.id, { courseCode: null }))
        .isLaboratory
    ).toBeUndefined()
    await service.updateLecture(lecture.id, {
      courseCode: 'LAB',
      isLaboratory: true
    })
    expect(
      (
        await service.updateLecture(lecture.id, {
          recordedAt: '2026-10-16T16:30:00'
        })
      ).isLaboratory
    ).toBe(true)
    await service.updateLecture(lecture.id, {
      isLaboratory: false,
      recordedAt: '2026-10-15T16:30:00'
    })
    expect((await service.scanAndSyncLibrary())[0].isLaboratory).toBe(false)
  })

  it('ricalcola la scelta automatica dopo modifica del calendario e rimozione del corso', async () => {
    await service.saveCourse(course)
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio sintetico con calendario variabile')
    const lecture = (await service.importFiles([source])).imported[0]
    await service.saveCourse({ ...course, laboratorySchedule: { dates: [] } })
    expect((await service.listLectures())[0].isLaboratory).toBeUndefined()
    await service.saveCourse(course)
    expect((await service.listLectures())[0].isLaboratory).toBe(true)
    await service.deleteCourse('LAB')
    expect((await service.listLectures())[0]).toMatchObject({
      id: lecture.id,
      courseCode: null
    })
    expect((await service.listLectures())[0].isLaboratory).toBeUndefined()
  })

  it('mantiene il flag dalla sorgente alla trascrizione, dispensa ITA e inglese senza rete', async () => {
    const gemini = new GeminiService()
    const translate = vi
      .spyOn(gemini, 'translateToEnglish')
      .mockResolvedValue('# Synthetic lab')
    service.destroy()
    service = new ArchiveService(directory, gemini, false)
    await service.saveSettings({
      apiKeys: ['synthetic-key'],
      activeKeyIndex: 0
    })
    await service.saveCourse(course)
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio laboratorio')
    const lecture = (await service.importFiles([source])).imported[0]
    const txt = join(directory, 'synthetic.txt')
    await writeFile(txt, 'Trascrizione sintetica')
    expect(
      (await service.attachTranscriptFromFile(lecture.id, txt)).isLaboratory
    ).toBe(true)
    await service.saveMarkdown(lecture.id, '# Laboratorio sintetico')
    expect((await service.translateLectureNotes(lecture.id)).success).toBe(true)
    expect(translate).toHaveBeenCalledOnce()
    const stored = (await new LibraryRepository(directory).readLibrary())
      .lectures[0]
    expect(stored.isLaboratory).toBe(true)
    expect(stored.laboratorySource).toBe('schedule')
    expect(stored.transcriptFileName).toBeTruthy()
    expect(stored.markdownFileName).toBeTruthy()
    expect(stored.markdownEnFileName).toBeTruthy()
    expect(
      await readFile((await service.getAudioFilePath(lecture.id))!, 'utf8')
    ).toBe('audio laboratorio')
  })

  it('valida le regole sia nella gestione corsi sia nelle impostazioni', async () => {
    for (const invalid of [
      { daysOfWeek: [7] },
      { daysOfWeek: ['4'] },
      { dates: [{ date: '2026-02-30', startTime: '10:00', endTime: '12:00' }] },
      { dates: [{ date: '2026-10-15', startTime: '18:00', endTime: '16:30' }] }
    ]) {
      await expect(
        service.saveCourse({ ...course, laboratorySchedule: invalid })
      ).rejects.toThrow('laboratori non valido')
      await expect(
        service.saveSettings({
          courses: { LAB: { ...course, laboratorySchedule: invalid } }
        })
      ).rejects.toThrow('laboratori non valido')
    }
  })

  it('conserva regole e classificazione alla rinomina e ricalcola il salvataggio dalle impostazioni', async () => {
    await service.saveCourse(course)
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio sintetico rinominato')
    const lecture = (await service.importFiles([source])).imported[0]
    const renamed = { ...course, code: 'RENAMED' }
    await service.saveCourse(renamed, 'LAB')
    expect((await service.getCourses())[0].laboratorySchedule).toEqual(
      course.laboratorySchedule
    )
    expect((await service.listLectures())[0]).toMatchObject({
      id: lecture.id,
      courseCode: 'RENAMED',
      isLaboratory: true
    })
    await service.saveSettings({
      courses: { RENAMED: { ...renamed, laboratorySchedule: { dates: [] } } }
    })
    expect((await service.listLectures())[0].isLaboratory).toBeUndefined()
  })

  it('rifiuta provenienze automatiche incoerenti e modifiche della provenienza tramite IPC', async () => {
    await service.saveCourse(course)
    const source = join(directory, 'LAB 2026-1015-16-30-00.mp3')
    await writeFile(source, 'audio sintetico per validazione')
    const lecture = (await service.importFiles([source])).imported[0]
    await expect(
      service.updateLecture(lecture.id, { laboratorySource: 'schedule' })
    ).rejects.toThrow('non valido')
    for (const invalid of [
      { laboratorySource: 'manual' },
      { laboratorySource: 'schedule', isLaboratory: false }
    ]) {
      await writeFile(
        join(directory, 'library.json'),
        JSON.stringify({ version: 1, lectures: [{ ...lecture, ...invalid }] })
      )
      await expect(
        new LibraryRepository(directory).readLibrary()
      ).rejects.toThrow('non valido')
    }
  })

  it('usa ora e giorno locali del file anche nei campi datetime-local, senza spostamenti UTC', async () => {
    const file = join(directory, 'synthetic.wav')
    await writeFile(file, 'wav sintetico')
    const timestamp = new Date('2026-10-15T00:30:00')
    await utimes(file, timestamp, timestamp)
    const scanned = await scanAudioFiles(directory)
    expect(scanned[0].parsedRecordedAt).toBe(
      `${formatLocalCalendarDate(timestamp)}T00:30:00`
    )
    expect(scanned[0].parsedRecordedAt!.slice(0, 16)).toBe('2026-10-15T00:30')
    expect(toLocalDateTimeInput(timestamp.toISOString())).toBe(
      '2026-10-15T00:30'
    )
    expect(new Date(scanned[0].parsedRecordedAt!).getTime()).toBe(
      timestamp.getTime()
    )
  })
})
