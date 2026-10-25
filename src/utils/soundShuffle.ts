export function nextShuffledSound(
  installed: string[],
  played: string[],
  active: string | null,
  random = Math.random
) {
  let retained = played.filter((id) => installed.includes(id))
  let remaining = installed.filter((id) => !retained.includes(id))
  if (!remaining.length) {
    retained = []
    remaining = installed
  }
  if (!remaining.length) return { id: null, played: [] as string[] }
  const alternatives = remaining.filter((id) => id !== active)
  const pool = alternatives.length ? alternatives : remaining
  const id = pool[Math.floor(random() * pool.length)]
  return { id, played: [...retained, id] }
}
