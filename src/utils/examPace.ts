/** Keep small, nonzero workloads legible instead of rounding them down to zero. */
export function formatExamPace(lecturesLeft: number, daysLeft: number): string {
  const remaining = Math.max(0, lecturesLeft)
  if (!remaining) return 'Lezioni completate'
  const days = Math.max(1, daysLeft)
  if (remaining / days < 1) return `${remaining} ${remaining === 1 ? 'lezione' : 'lezioni'} in ${days} ${days === 1 ? 'giorno' : 'giorni'}`
  return `${(remaining / days).toLocaleString('it-IT', { maximumFractionDigits: 1 })} lez/giorno`
}
