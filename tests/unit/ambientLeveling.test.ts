import { expect, it } from 'vitest'
import { levelAmbientBuffer } from '../../src/utils/ambientLeveling'

it('rende più pieno un sottofondo debole, limita i picchi e conserva il rapporto stereo', () => {
  const left = Float32Array.from({ length: 8000 }, (_, i) => 0.025 * Math.sin(i * .2))
  const right = Float32Array.from(left, value => value / 2)
  const before = Math.sqrt(left.reduce((sum, v) => sum + v * v, 0) / left.length)
  levelAmbientBuffer({ length: left.length, sampleRate: 1000, numberOfChannels: 2, getChannelData: i => i ? right : left } as AudioBuffer)
  const after = Math.sqrt(left.reduce((sum, v) => sum + v * v, 0) / left.length)
  expect(after).toBeGreaterThan(before * 3)
  expect(Math.max(...left.map(Math.abs))).toBeLessThanOrEqual(.85)
  expect(right[100] / left[100]).toBeCloseTo(.5, 2)
})
it('gestisce silenzio e picchi senza NaN o clipping', () => {
  const data = new Float32Array(6000); data[3000] = 1
  levelAmbientBuffer({ length: data.length, sampleRate: 1000, numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer)
  expect([...data].every(Number.isFinite)).toBe(true)
  expect(Math.max(...data.map(Math.abs))).toBeLessThan(.85)
  expect(data[0]).toBe(0)
})
