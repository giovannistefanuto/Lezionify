import { describe, it, expect } from 'vitest'
import { formatCourseDisplayName } from '../../src/utils/courseFormat'
import type { CourseDefinition } from '../../shared/archive'

const sampleCourses: CourseDefinition[] = [
  {
    code: 'RL',
    name: 'Reinforcement Learning',
    cfu: 6,
    lectureHours: 42,
    individualStudyHours: 108,
    totalHours: 150,
    startDate: '2026-09-28',
    endDate: '2027-01-14',
    schedule: []
  },
  {
    code: 'GT',
    name: 'Game Theory',
    cfu: 6,
    lectureHours: 42,
    individualStudyHours: 108,
    totalHours: 150,
    startDate: '2026-09-28',
    endDate: '2027-01-14',
    schedule: []
  },
  {
    code: 'IR',
    name: 'Intelligent Robotics',
    cfu: 9,
    lectureHours: 63,
    individualStudyHours: 162,
    totalHours: 225,
    startDate: '2026-09-28',
    endDate: '2027-01-14',
    schedule: []
  },
  {
    code: 'BIO',
    name: 'BIO', // Same as code
    cfu: 3,
    lectureHours: 21,
    individualStudyHours: 54,
    totalHours: 75,
    startDate: '2026-09-28',
    endDate: '2027-01-14',
    schedule: []
  },
  {
    code: 'GEO',
    cfu: 3,
    lectureHours: 21,
    individualStudyHours: 54,
    totalHours: 75,
    startDate: '2026-09-28',
    endDate: '2027-01-14',
    schedule: []
  }
]

describe('formatCourseDisplayName', () => {
  it('formats known course codes into "(SIGLA) - Nome Del Corso"', () => {
    expect(formatCourseDisplayName('RL', sampleCourses)).toBe(
      '(RL) - Reinforcement Learning'
    )
    expect(formatCourseDisplayName('GT', sampleCourses)).toBe(
      '(GT) - Game Theory'
    )
    expect(formatCourseDisplayName('IR', sampleCourses)).toBe(
      '(IR) - Intelligent Robotics'
    )
  })

  it('performs case-insensitive lookup with trimming', () => {
    expect(formatCourseDisplayName('rl', sampleCourses)).toBe(
      '(RL) - Reinforcement Learning'
    )
    expect(formatCourseDisplayName('  gt  ', sampleCourses)).toBe(
      '(GT) - Game Theory'
    )
  })

  it('wraps code in parentheses when name equals code or is undefined', () => {
    expect(formatCourseDisplayName('BIO', sampleCourses)).toBe('(BIO)')
    expect(formatCourseDisplayName('GEO', sampleCourses)).toBe('(GEO)')
  })

  it('formats unconfigured short codes/acronyms as "(SIGLA)"', () => {
    expect(formatCourseDisplayName('RC', sampleCourses)).toBe('(RC)')
    expect(formatCourseDisplayName('CS101', sampleCourses)).toBe('(CS101)')
  })

  it('preserves and normalizes already formatted "(SIGLA) - Nome"', () => {
    expect(
      formatCourseDisplayName('(RL) - Reinforcement Learning', sampleCourses)
    ).toBe('(RL) - Reinforcement Learning')
  })

  it('converts "SIGLA - Nome" into "(SIGLA) - Nome"', () => {
    expect(
      formatCourseDisplayName('RL - Reinforcement Learning', sampleCourses)
    ).toBe('(RL) - Reinforcement Learning')
  })

  it('handles special values like "tutti" and "Senza corso"', () => {
    expect(formatCourseDisplayName('tutti', sampleCourses)).toBe(
      'Tutte le lezioni'
    )
    expect(formatCourseDisplayName('Senza corso', sampleCourses)).toBe(
      'Senza corso'
    )
    expect(formatCourseDisplayName('', sampleCourses)).toBe('Senza corso')
    expect(formatCourseDisplayName('   ', sampleCourses)).toBe('Senza corso')
  })

  it('works with dictionary map (Record<string, CourseDefinition>)', () => {
    const map: Record<string, CourseDefinition> = {
      RL: sampleCourses[0]
    }
    expect(formatCourseDisplayName('RL', map)).toBe(
      '(RL) - Reinforcement Learning'
    )
  })
})
