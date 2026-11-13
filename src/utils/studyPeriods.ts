import type { StudyDay } from '../../shared/studyHistory'

export function calculateStudyPeriods(day: StudyDay | null, date: string, boundary: string) {
    if (!day || !/^\d{2}:\d{2}$/.test(boundary) || day.credits.some(credit => credit.correctionSeconds > 0)) return null
    const [year, month, dayNumber] = date.split('-').map(Number), [hour, minute] = boundary.split(':').map(Number)
    const target = Date.UTC(year, month - 1, dayNumber, hour, minute)
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: day.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    let cutoff = target
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(formatter.formatToParts(cutoff).map(part => [part.type, Number(part.value)]))
      cutoff += target - Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    }
    let morning = 0, afternoon = 0
    const add = (start: string, end: string, seconds: number) => {
      const a = Date.parse(start), b = Date.parse(end)
      if (!(b > a) || seconds <= 0) return
      const before = seconds * Math.max(0, Math.min(1, (cutoff - a) / (b - a)))
      morning += before; afternoon += seconds - before
    }
    for (const segment of day.segments) add(segment.start, segment.end, segment.creditedSeconds)
    for (const credit of day.credits) if (credit.provenance !== 'focus-observed' && credit.start && credit.end) add(credit.start, credit.end, Math.max(0, credit.seconds - credit.unlocatedSeconds))
    return { morning, afternoon }
}
