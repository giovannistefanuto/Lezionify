import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import { formatLocalCalendarDate } from '../../shared/calendarDate'

describe('Statistiche dei corsi attivi e media per lezione', () => {
  let directory: string
  let service: ArchiveService
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'lezionify-study-stats-'))
    await new LibraryRepository(directory).initialize()
    service = new ArchiveService(directory, undefined, false)
  })
  afterEach(async () => {
    service.destroy()
    await rm(directory, { recursive: true, force: true })
  })
  async function lecture(
    code: string,
    day: string,
    status: 'completata' | 'in-corso' = 'completata'
  ) {
    const file = join(directory, `${code} 2026-10${day}-10-00-00.mp3`)
    await writeFile(file, `audio sintetico ${code} ${day}`)
    const item = (await service.importFiles([file])).imported[0]
    return service.updateLecture(item.id, { studyStatus: status })
  }
  async function session(
    id: string,
    lectureId: string | null,
    courseCode: string,
    seconds: number,
    date = formatLocalCalendarDate()
  ) {
    await service.saveStudySession({
      id,
      lectureId,
      courseCode,
      durationSeconds: seconds,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      mode: 'focus',
      date
    })
  }

  it('totale della singola lezione su tutti i giorni senza duplicare la sessione corrente', async () => {
    const first = await lecture('A', '01', 'in-corso')
    const other = await lecture('A', '02')
    await session('old', first.id, 'A', 3600, '2025-10-01')
    await session('recent', first.id, 'OLD-CODE', 600)
    await session('current', first.id, 'A', 30)
    await session('other', other.id, 'A', 900)
    await service.addManualStudyTime('A', 60)
    expect(await service.getLectureStudySeconds(first.id, 'current')).toBe(4200)
    await session('current', first.id, 'A', 60)
    expect(await service.getLectureStudySeconds(first.id, 'current')).toBe(4200)
    expect(await service.getLectureStudySeconds(first.id, 'new-session')).toBe(4260)
    expect(await service.getLectureStudySeconds('no-study', 'new-session')).toBe(0)
    await expect(service.getLectureStudySeconds(null, 'current')).rejects.toThrow('Identificativo')
    await expect(service.getLectureStudySeconds(first.id, '')).rejects.toThrow('Identificativo')
  })

  it('somma piu sessioni per lezione completata, senza includere lezioni parziali, tempi generici o valori mancanti', async () => {
    const first = await lecture('A', '01')
    const second = await lecture('A', '02')
    await lecture('A', '03')
    const ongoing = await lecture('A', '04', 'in-corso')
    await session('a', first.id, 'A', 2400)
    await session('b', first.id, 'A', 1200)
    await session('c', second.id, 'A', 1800)
    await session('d', ongoing.id, 'A', 7200)
    await service.addManualStudyTime('A', 120)
    expect((await service.getStudyAnalytics()).courseLectureAverages).toEqual([
      { courseCode: 'A', timedCompletedLectures: 2, averageStudySeconds: 2700 }
    ])
    await service.updateLecture(second.id, { studyStatus: 'in-corso' })
    expect(
      (await service.getStudyAnalytics()).courseLectureAverages[0]
    ).toMatchObject({ timedCompletedLectures: 1, averageStudySeconds: 3600 })
    await service.updateLecture(first.id, { studyStatus: 'in-corso' })
    expect(
      (await service.getStudyAnalytics()).courseLectureAverages[0]
    ).toMatchObject({ timedCompletedLectures: 0, averageStudySeconds: null })
  })

  it('esclude i corsi archiviati da conteggi, totali, grafici, percentuali, medie e streak senza cancellare le sessioni', async () => {
    const a = await lecture('A', '01')
    const b = await lecture('B', '02')
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await session('a', a.id, 'A', 3600)
    await session('b', b.id, 'B', 10800, formatLocalCalendarDate(yesterday))
    await service.addManualStudyTime('B', 60)
    const source = await readFile(join(directory, 'study_sessions.json'))
    await service.setCourseArchived('B', true)
    expect(
      (await service.getCourseStats()).map((item) => item.courseCode)
    ).toEqual(['A'])
    const analytics = await service.getStudyAnalytics()
    expect(analytics.totalSemesterSeconds).toBe(3600)
    expect(analytics.todaySeconds).toBe(3600)
    expect(analytics.todayByCourse).toEqual({ A: 3600 })
    expect(
      analytics.weekDays.reduce((sum, day) => sum + day.totalSeconds, 0)
    ).toBe(3600)
    expect(analytics.weekDays.every((day) => !('B' in day.byCourse))).toBe(true)
    expect(analytics.weekAvgDailySeconds).toBe(Math.round(3600 / 7))
    expect(analytics.monthAvgDailySeconds).toBe(120)
    expect(analytics.currentStreakDays).toBe(1)
    expect(analytics.courseBreakdown).toEqual([
      { courseCode: 'A', totalSeconds: 3600, percentage: 100 }
    ])
    expect(analytics.courseLectureAverages).toEqual([
      { courseCode: 'A', timedCompletedLectures: 1, averageStudySeconds: 3600 }
    ])
    expect(await readFile(join(directory, 'study_sessions.json'))).toEqual(
      source
    )
    await service.setCourseArchived('B', false)
    expect(
      (await service.getCourseStats()).map((item) => item.courseCode)
    ).toEqual(['A', 'B'])
    expect((await service.getStudyAnalytics()).totalSemesterSeconds).toBe(18000)
  })

  it('usa il corso attuale della lezione per tempi collegati e lascia i tempi senza lezione fuori dalla media', async () => {
    const a = await lecture('A', '01')
    const b = await lecture('B', '02')
    await session('stale-a', a.id, 'B', 1800)
    await session('stale-b', b.id, 'A', 7200)
    await session('orphan-b', 'missing', 'B', 600)
    await session('generic', null, 'A', 600)
    await service.setCourseArchived('B', true)
    const analytics = await service.getStudyAnalytics()
    expect(analytics.todayByCourse).toEqual({ A: 2400 })
    expect(analytics.courseLectureAverages).toEqual([
      { courseCode: 'A', timedCompletedLectures: 1, averageStudySeconds: 1800 }
    ])
    await service.updateLecture(a.id, { courseCode: null })
    expect((await service.getStudyAnalytics()).courseLectureAverages).toEqual([
      {
        courseCode: 'NON ASSEGNATO',
        timedCompletedLectures: 1,
        averageStudySeconds: 1800
      }
    ])
  })
})
