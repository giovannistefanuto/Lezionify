import { existsSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import ffmpegStatic from 'ffmpeg-static'

/** Use only the executable shipped with Lezionify, never a PATH lookup. */
export function getFfmpegPath(): string {
  const executable = ffmpegStatic?.replace(
    /app\.asar([\\/])/,
    'app.asar.unpacked$1'
  )
  if (!executable || !isAbsolute(executable) || !existsSync(executable)) {
    throw new Error(
      'FFmpeg incluso in Lezionify non disponibile. Ripristina l’installazione dell’app.'
    )
  }
  return executable
}
