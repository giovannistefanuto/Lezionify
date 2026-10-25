// Compose a guided tour from the already-reviewed synthetic Electron screenshots.
// No app profile, network requests, AI calls or new dependencies are involved.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'docs/assets/demo/lezionify-tour.gif')
const temporary = mkdtempSync(join(tmpdir(), 'lezionify-readme-tour-'))
const chapters = [
  ['lecture-archive.png', '01 / Organise your lectures',
    'Keep courses, dates, languages and study progress together.',
    'Import audio or transcripts; the original material stays separate.'],
  ['focus-workspace.png', '02 / Study alongside your slides',
    'Read the PDF and the lecture notes in one Focus workspace.',
    'Resize the panels and pick up where you left off.'],
  ['focus-workspace.png', '03 / Keep questions in context',
    'A discussion stays anchored to the passage you are studying.',
    'The answers shown here are synthetic; no live AI request is made.'],
  ['pdf-export.png', '04 / Choose what to export',
    'Select course lectures and a language before saving a PDF.',
    'Exports include formulas, diagrams and grid pages for notes.']
]

function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: temporary, encoding: 'utf8', windowsHide: true, timeout: 60000
  })
  if (result.error || result.status !== 0)
    throw new Error(result.error?.message || result.stderr || 'FFmpeg failed')
}

// Captions are fixed, not interpolated from user content or shell commands.
function textFilter(text, x, y, size, color = 'white') {
  return `drawtext=fontfile=font.ttf:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`
}

try {
  mkdirSync(dirname(output), { recursive: true })
  const font = process.env.LEZIONIFY_DEMO_FONT || join(process.env.WINDIR || 'C:/Windows', 'Fonts/arial.ttf')
  copyFileSync(font, join(temporary, 'font.ttf'))
  chapters.forEach(([file, title, first, second], index) => {
    const filters = [
      'scale=1184:640:force_original_aspect_ratio=decrease',
      'pad=1280:900:(ow-iw)/2:152:color=0x10231d',
      textFilter('LEZIONIFY', 48, 30, 22, '0xa7d8c3'),
      textFilter('48-SECOND VISUAL TOUR / SYNTHETIC DATA', 720, 35, 16, '0xa7d8c3'),
      textFilter(title, 48, 76, 36),
      textFilter(first, 48, 815, 23),
      textFilter(second, 48, 851, 20, '0xa7d8c3'),
      `drawbox=x=48:y=130:w=${296 * (index + 1)}:h=4:color=0xa7d8c3:t=fill`
    ]
    if (index === 2) filters.splice(2, 0, 'drawbox=x=864:y=196:w=290:h=580:color=0x21694c:t=4')
    run(['-i', join(root, 'docs/assets/screenshots', file), '-vf', filters.join(','), '-frames:v', '1', `frame-${index}.png`])
  })
  // Four chapter cards, twelve seconds each. GIF works inline on GitHub.
  const generated = join(temporary, 'tour.gif')
  run(['-framerate', '1/12', '-i', 'frame-%d.png', '-filter_complex',
    '[0:v]split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a',
    '-loop', '0', '-final_delay', '1200', generated])
  run(['-i', generated, '-frames:v', '1', '-f', 'null', '-'])
  if (statSync(generated).size > 5 * 1024 * 1024) throw new Error('Tour exceeds the 5 MB budget')
  // Preserve any previous output until generation and decoding have succeeded.
  copyFileSync(generated, output)
  const signature = readFileSync(output).subarray(0, 6).toString()
  if (signature !== 'GIF89a') throw new Error('Unexpected GIF format')
  console.log(JSON.stringify({ output, bytes: statSync(output).size, chapters: 4, seconds: 48 }))
} finally {
  // Only remove the exact directory returned by mkdtempSync above.
  rmSync(temporary, { recursive: true, force: true })
}
