import { describe, expect, it, vi } from 'vitest'
import { AmbientLoopPlayer } from '../../src/utils/ambientLoopPlayer'

function audio() {
  const sources: any[] = [],
    gains: any[] = []
  const context = {
    currentTime: 0,
    destination: {},
    createGain: () => {
      const node = {
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          setTargetAtTime: vi.fn()
        },
        connect: vi.fn(),
        disconnect: vi.fn()
      }
      gains.push(node)
      return node
    },
    createBufferSource: () => {
      const node = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as null | (() => void)
      }
      sources.push(node)
      return node
    }
  }
  return {
    context,
    sources,
    gains,
    player: new AmbientLoopPlayer(context as unknown as AudioContext, 0.5)
  }
}
describe('transizioni locali Web Audio', () => {
  it('mantiene inviluppi complementari nei cambi rapidi e scollega le sorgenti terminate', () => {
    const { context, player, gains, sources } = audio()
    const buffer = {} as AudioBuffer
    player.replace(buffer, 1)
    context.currentTime = 1
    player.replace(buffer, 1)
    expect(gains[1].gain.setValueAtTime).toHaveBeenLastCalledWith(1, 1)
    expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 2)
    context.currentTime = 1.25
    player.replace(buffer, 1)
    expect(gains[1].gain.setValueAtTime).toHaveBeenLastCalledWith(0.75, 1.25)
    expect(gains[2].gain.setValueAtTime).toHaveBeenLastCalledWith(0.25, 1.25)
    expect(gains[3].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      1,
      2.25
    )
    sources[0].onended()
    expect(sources[0].disconnect).toHaveBeenCalled()
    player.stop()
    expect(sources[1].stop).toHaveBeenLastCalledWith()
    expect(sources[2].stop).toHaveBeenLastCalledWith()
    expect(gains[2].disconnect).toHaveBeenCalled()
  })
  it('limita volume e durata, conserva un solo master e libera tutto alla chiusura', () => {
    const { player, gains, sources } = audio()
    player.replace({} as AudioBuffer, 999)
    expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, 1)
    player.setVolume(2)
    expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.025)
    player.dispose()
    expect(gains[0].disconnect).toHaveBeenCalled()
    expect(sources[0].onended).toBeNull()
  })
})
