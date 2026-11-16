import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { useLectures } from '../../src/hooks/useLectures'

export async function runLectureOrderingScenarios(root: Root) {
  const api = window.archive
  const saved = { ...api }
  const statuses = ['da-studiare', 'in-corso', 'completata'] as const
  const fixtures = ['A', 'B', 'ARCH', null].flatMap(courseCode => statuses.flatMap(studyStatus =>
    ['2026-11-01', '2026-11-15', '2026-11-08'].map((recordedAt, index) => ({
      id: `${courseCode}-${studyStatus}-${index}`, courseCode, studyStatus, recordedAt: recordedAt as string | null,
      importedAt: '2026-11-16', sourceAudioFileName: 'synthetic.mp3'
    }))))
  fixtures.push({ ...fixtures[0], id: 'undated', recordedAt: null, importedAt: '2026-11-10' })
  let output: ReturnType<typeof useLectures>
  function Harness() {
    output = useLectures()
    return <>{output.visibleLectures.map(lecture => <span key={lecture.id} data-lecture-id={lecture.id} />)}</>
  }
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  try {
    Object.assign(api, {
      listLectures: async () => fixtures,
      scanAndSyncLibrary: async () => fixtures,
      getArchivedCourseCodes: async () => ['ARCH'],
      getCourseStats: async () => [],
      searchFullText: async () => fixtures.map(lecture => lecture.id).reverse()
    })
    await act(async () => root.render(<Harness />))
    for (const course of ['tutti', 'A', 'B', 'Senza corso', 'ARCH']) {
      for (const status of ['tutti', ...statuses]) {
        await act(async () => {
          output.setSelectedCourse(course)
          output.setSelectedStudyStatus(status)
        })
        const expected = fixtures.filter(lecture =>
          (course === 'tutti' ? lecture.courseCode !== 'ARCH' : (lecture.courseCode ?? 'Senza corso') === course) &&
          (status === 'tutti' || lecture.studyStatus === status) &&
          (course !== 'ARCH' || status === 'tutti'))
          .sort((a, b) => (b.recordedAt ?? b.importedAt).localeCompare(a.recordedAt ?? a.importedAt))
          .map(lecture => lecture.id).join(',')
        check(Array.from(document.querySelectorAll('[data-lecture-id]')).map(row => row.getAttribute('data-lecture-id')).join(',') === expected,
          `Newest first failed for course=${course}, status=${status}`)
      }
    }
    await act(async () => {
      output.setSelectedCourse('A')
      output.setSelectedStudyStatus('tutti')
      output.setSearchQuery('synthetic')
    })
    const before = output!.visibleLectures.map(lecture => lecture.id).join(',')
    await act(async () => new Promise(resolve => setTimeout(resolve, 200)))
    check(output!.visibleLectures.map(lecture => lecture.id).join(',') === before, 'Search relevance changed chronological order')
    await act(async () => output.setLectures(current => current.map(lecture =>
      lecture.id === 'A-da-studiare-0' ? { ...lecture, studyStatus: 'completata' } : lecture)))
    check(output!.visibleLectures.map(lecture => lecture.id).join(',') === before, 'Status change moved a lesson away from its date')
    check(fixtures[0].id === 'A-da-studiare-0', 'Display ordering mutated the archive')
  } finally {
    await act(async () => root.render(null))
    Object.assign(api, saved)
  }
}
