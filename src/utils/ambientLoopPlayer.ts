type Voice = {
  source: AudioBufferSourceNode
  gain: GainNode
  from: number
  target: number
  start: number
  end: number
}

/** Complementary linear envelopes keep the total gain at or below one, even on rapid changes. */
export class AmbientLoopPlayer {
  private voices = new Set<Voice>()
  private master: GainNode
  constructor(
    private context: AudioContext,
    volume: number
  ) {
    this.master = context.createGain()
    this.master.gain.value = volume
    this.master.connect(context.destination)
  }
  private level(voice: Voice, now: number) {
    const fraction =
      voice.end <= voice.start
        ? 1
        : Math.min(
            1,
            Math.max(0, (now - voice.start) / (voice.end - voice.start))
          )
    return voice.from + (voice.target - voice.from) * fraction
  }
  private ramp(voice: Voice, target: number, duration: number) {
    const now = this.context.currentTime
    const from = this.level(voice, now)
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(from, now)
    voice.gain.gain.linearRampToValueAtTime(target, now + duration)
    Object.assign(voice, { from, target, start: now, end: now + duration })
  }
  replace(buffer: AudioBuffer, seconds: number) {
    const duration = [1, 2, 4].includes(seconds) ? seconds : 1
    const now = this.context.currentTime
    for (const voice of this.voices) {
      this.ramp(voice, 0, duration)
      voice.source.stop(now + duration)
    }
    const source = this.context.createBufferSource(),
      gain = this.context.createGain()
    const voice: Voice = {
      source,
      gain,
      from: 0,
      target: 0,
      start: now,
      end: now
    }
    source.buffer = buffer
    source.loop = true
    gain.gain.value = 0
    source.connect(gain)
    gain.connect(this.master)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      this.voices.delete(voice)
    }
    this.voices.add(voice)
    this.ramp(voice, 1, duration)
    source.start()
  }
  setVolume(volume: number) {
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      now,
      0.025
    )
  }
  stop() {
    for (const voice of this.voices) {
      voice.source.onended = null
      try {
        voice.source.stop()
      } catch {
        /* A scheduled source may already have ended. */
      }
      voice.source.disconnect()
      voice.gain.disconnect()
    }
    this.voices.clear()
  }
  dispose() {
    this.stop()
    this.master.disconnect()
  }
}
