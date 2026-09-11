import { readFile } from 'node:fs/promises'

const MPEG1_LAYER3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320
]
const MPEG2_LAYER3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160
]
const SAMPLE_RATES = [44100, 48000, 32000]

function id3Size(buffer: Buffer): number {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return 0
  return (
    10 +
    ((buffer[6] & 0x7f) << 21) +
    ((buffer[7] & 0x7f) << 14) +
    ((buffer[8] & 0x7f) << 7) +
    (buffer[9] & 0x7f)
  )
}

export function parseMp3Duration(buffer: Buffer): number | null {
  let offset = id3Size(buffer)
  let duration = 0
  let frames = 0

  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32BE(offset)
    if (((header & 0xffe00000) >>> 0) !== 0xffe00000) {
      offset += 1
      continue
    }
    const versionBits = (header >>> 19) & 0x3
    const layerBits = (header >>> 17) & 0x3
    const bitrateIndex = (header >>> 12) & 0xf
    const sampleRateIndex = (header >>> 10) & 0x3
    if (
      versionBits === 1 ||
      layerBits !== 1 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      sampleRateIndex === 3
    ) {
      offset += 1
      continue
    }

    const isMpeg1 = versionBits === 3
    const bitrate = (isMpeg1
      ? MPEG1_LAYER3_BITRATES
      : MPEG2_LAYER3_BITRATES)[bitrateIndex]
    const divisor = versionBits === 2 ? 2 : versionBits === 0 ? 4 : 1
    const sampleRate = SAMPLE_RATES[sampleRateIndex] / divisor
    const padding = (header >>> 9) & 1
    const samplesPerFrame = isMpeg1 ? 1152 : 576
    const frameLength =
      Math.floor(((isMpeg1 ? 144 : 72) * bitrate * 1000) / sampleRate) +
      padding
    if (frameLength <= 4 || offset + frameLength > buffer.length) break

    duration += samplesPerFrame / sampleRate
    frames += 1
    offset += frameLength
  }

  return frames > 0 ? duration : null
}

export async function readMp3Duration(filePath: string): Promise<number | null> {
  return parseMp3Duration(await readFile(filePath))
}
