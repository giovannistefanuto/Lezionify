import { describe, expect, it } from 'vitest'
import { addCalendarDays } from '../../shared/calendarDate'
import { gapMetrics, spaceSessionExams, SPACING_NODE_LIMIT, type SpacingRequest } from '../../shared/sessionSpacing'

const today = '2027-01-01'
function fixture(offsets: number[][]): SpacingRequest {
  const courses = offsets.map((options, index) => ({
    code: 'C' + index,
    paths: [{ id: 'P' + index, name: 'Totale', kind: 'total' as const, steps: [{
      id: 'S' + index, label: 'Totale', completed: false,
      appointments: options.map((offset, choice) => ({ id: `A${index}-${choice}`, date: addCalendarDays(today, offset) }))
    }] }]
  }))
  const plan = { id: 'plan', name: 'Uno', choices: courses.map(({ code, paths }) => ({
    course: code, pathId: paths[0].id, appointments: [paths[0].steps[0].appointments[0].id], locks: [] as string[]
  })) }
  const draft = { id: 'winter', name: 'Invernale', start: today, end: '2027-05-31', courses, plans: [plan], unavailable: [] }
  return { today, plan, session: { draft } }
}

function exhaustive(options: number[][]) {
  const combinations = options.reduce<number[][]>((prefixes, choices) => prefixes.flatMap(prefix => choices.map((_, index) => [...prefix, index])), [[]])
  return combinations.map(indices => {
    const sorted = indices.map((choice, i) => options[i][choice]).sort((a, b) => a - b)
    const gaps = sorted.map((date, i) => date - (sorted[i - 1] ?? 0))
    const spread = gaps.reduce((sum, gap, i) => sum + gaps.slice(i + 1).reduce((delta, next) => delta + (gap - next) ** 2, 0), 0)
    return { indices, min: Math.min(...gaps), spread, changes: indices.filter(choice => choice !== 0).length, end: sorted.at(-1) ?? 0 }
  }).sort((a, b) => b.min - a.min || a.spread - b.spread || a.changes - b.changes || a.end - b.end ||
    a.indices.join().localeCompare(b.indices.join()))[0]
}

describe('Distanza gli esami', () => {
  it('matches independent exhaustive enumeration for families of small cases', () => {
    for (let seed = 1; seed <= 18; seed++) {
      const options = Array.from({ length: 4 }, (_, j) => Array.from({ length: 3 }, (_, k) => (seed * 11 + j * 5 + k * (j + 7)) % 42))
      const { proposal, complete } = spaceSessionExams(fixture(options))
      const expected = exhaustive(options)
      expect(complete).toBe(true)
      expect(proposal?.minimum).toBe(expected.min)
      expect(proposal?.dispersion).toBe(expected.spread)
      expect(proposal?.changes).toBe(expected.changes)
      expect(proposal?.choices.flatMap(choice => choice.appointments)).toEqual(expected.indices.map((index, i) => `A${i}-${index}`))
    }
  })
  it('prefers the latest appello for one exam, and supports an empty plan', () => {
    const one = spaceSessionExams(fixture([[1, 8, 19]]))
    expect(one.proposal?.minimum).toBe(19)
    expect(one.proposal?.end).toBe('2027-01-20')
    expect(spaceSessionExams(fixture([])).proposal?.exams).toEqual([])
    expect(gapMetrics([8, 8]).minimum).toBe(0)
  })
  it('keeps locks and prerequisites and explains blocked dates', () => {
    const request = fixture([[7, 11], [4, 13]])
    const path = request.session.draft.courses[0].paths[0]
    path.kind = 'total'
    request.plan.choices[0].locks = ['A0-0']
    const alternatives = spaceSessionExams(request)
    expect(alternatives.proposal?.exams.map(exam => exam.id)).toContain('A0-0')
    request.session.draft.unavailable.push({ id: 'block', start: '2027-01-08', end: '2027-01-08', blocking: true })
    expect(spaceSessionExams(request).warnings[0]).toContain('il blocco del 2027-01-08')

    const partials: SpacingRequest = structuredClone(fixture([[8, 9]]))
    const first = partials.session.draft.courses[0].paths[0]
    first.kind = 'partial'
    first.steps.push({ id: 'second', label: 'Secondo', completed: false, appointments: [{ id: 'early', date: '2027-01-05' },
      { id: 'late', date: '2027-01-19' }] })
    expect(spaceSessionExams(partials).proposal?.exams.map(exam => exam.id)).toContain('late')
    partials.plan.choices[0].appointments.push('early')
    partials.plan.choices[0].locks = ['early']
    expect(spaceSessionExams(partials).proposal).toBeUndefined()
  })
  it('enforces the operational bound and exposes a best-so-far result', () => {
    const worst = fixture(Array.from({ length: 11 }, () => [20, 20, 20, 20]))
    const start = performance.now()
    const result = spaceSessionExams(worst)
    console.info(`Sessione synthetic search: ${result.visited} nodes in ${Math.round(performance.now() - start)} ms`)
    expect(result.complete).toBe(false)
    expect(result.visited).toBe(SPACING_NODE_LIMIT)
    expect(result.proposal?.exams).toHaveLength(11)
  })
})
