/** Smooth, bounded local leveling of decoded variants. Downloaded originals stay intact. */
export function levelAmbientBuffer(buffer: AudioBuffer): void {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  if (!channels.length || !buffer.length) return
  const window = Math.max(1, Math.round(buffer.sampleRate * 2))
  const gains: number[] = []
  for (let start = 0; start < buffer.length; start += window) {
    const end = Math.min(buffer.length, start + window)
    let power = 0
    for (const channel of channels) for (let i = start; i < end; i++) power += channel[i] * channel[i]
    const rms = Math.sqrt(power / ((end - start) * channels.length))
    gains.push(rms > 0.00001 ? Math.min(4, 0.12 / rms) : 1)
  }
  for (let i = 0; i < buffer.length; i++) {
    const index = Math.floor(i / window), start = index * window
    const length = Math.min(window, buffer.length - start)
    const mix = (1 - Math.cos(Math.PI * (i - start) / length)) / 2
    const gain = gains[index] + (gains[(index + 1) % gains.length] - gains[index]) * mix
    for (const channel of channels) channel[i] = 0.85 * Math.tanh(channel[i] * gain / 0.85)
  }
}
