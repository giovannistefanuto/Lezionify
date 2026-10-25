import { expect, it } from 'vitest'
import { nextShuffledSound } from '../../src/utils/soundShuffle'

it('esaurisce i suoni senza ripetizioni e non ripete l attivo al cambio giro', () => {
  let played: string[] = [],
    active: string | null = null
  const sequence: string[] = []
  for (let index = 0; index < 6; index++) {
    const next = nextShuffledSound(
      ['rain', 'wind', 'waves'],
      played,
      active,
      () => 0
    )
    expect(next.id).not.toBe(active)
    played = next.played
    active = next.id
    sequence.push(next.id!)
  }
  expect(new Set(sequence.slice(0, 3)).size).toBe(3)
  expect(new Set(sequence.slice(3)).size).toBe(3)
})

it('gestisce zero, uno e cambiamenti ai suoni installati senza download', () => {
  expect(nextShuffledSound([], [], null).id).toBeNull()
  expect(nextShuffledSound(['rain'], ['rain'], 'rain').id).toBe('rain')
  expect(nextShuffledSound(['rain', 'wind'], [], 'rain', () => 0).id).toBe(
    'wind'
  )
  expect(nextShuffledSound(['wind'], ['removed'], 'removed').id).toBe('wind')
})
