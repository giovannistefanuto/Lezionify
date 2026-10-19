import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { VideoImporter } from '../../electron/main/videoImporter'
import { getFfmpegPath } from '../../electron/main/ffmpegPath'
import { ArchiveService } from '../../electron/main/archive'
import { SettingsService } from '../../electron/main/settings'
import { fileChecksum } from '../../electron/main/fileNameParser'
import type { CourseDefinition } from '../../shared/archive'
import {
  gameTheoryCourse,
  nearestMonday,
  reorderVideoFiles
} from '../../src/utils/videoImport'

const execute = promisify(execFile)
const course: CourseDefinition = {
  code: 'GT',
  name: 'Game Theory',
  cfu: 6,
  lectureHours: 42,
  individualStudyHours: 108,
  totalHours: 150,
  startDate: '2026-09-01',
  endDate: '2027-01-31',
  schedule: []
}
let sourcesRoot: string
let videos: string[]
let silentVideo: string
let root: string
let importer: VideoImporter
const destination = {
  courseCode: 'GT',
  date: '2026-09-28',
  startTime: '16:30',
  endTime: '18:00',
  title: 'Lezione sintetica'
}

beforeAll(async () => {
  sourcesRoot = await mkdtemp(join(tmpdir(), 'lezionify-video-fixtures-'))
  videos = [
    join(sourcesRoot, "lezione à '1'.mp4"),
    join(sourcesRoot, 'parte 2.mkv'),
    join(sourcesRoot, 'parte 3.webm')
  ]
  const parameters = [
    ['96x64', '24', '440', '44100', '0.7', 'mpeg4', 'aac', '1'],
    ['128x96', '30', '880', '22050', '1.1', 'ffv1', 'pcm_s16le', '2'],
    ['64x48', '15', '1320', '48000', '0.5', 'libvpx-vp9', 'libopus', '2']
  ]
  for (let index = 0; index < videos.length; index++) {
    const [
      size,
      rate,
      frequency,
      sampleRate,
      duration,
      videoCodec,
      audioCodec,
      channels
    ] = parameters[index]
    await execute(
      getFfmpegPath(),
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        `color=c=blue:s=${size}:r=${rate}`,
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${frequency}:sample_rate=${sampleRate}`,
        '-t',
        duration,
        '-c:v',
        videoCodec,
        '-c:a',
        audioCodec,
        '-ac',
        channels,
        videos[index]
      ],
      { cwd: sourcesRoot, windowsHide: true }
    )
  }
  silentVideo = join(sourcesRoot, 'senza-audio.mp4')
  await execute(
    getFfmpegPath(),
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=s=64x48:r=10',
      '-t',
      '0.2',
      '-c:v',
      'mpeg4',
      silentVideo
    ],
    { cwd: sourcesRoot, windowsHide: true }
  )
}, 20000)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lezionify-video-test-'))
  importer = new VideoImporter(root)
  await importer.initialize()
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})
afterAll(async () => {
  await rm(sourcesRoot, { recursive: true, force: true })
})

describe('importazione video locale con FFmpeg reale', () => {
  it('usa un eseguibile assoluto esistente, senza dipendere dal PATH', async () => {
    expect(isAbsolute(getFfmpegPath())).toBe(true)
    expect(getFfmpegPath()).toContain('ffmpeg-static')
    const result = await execute(getFfmpegPath(), ['-version'], {
      cwd: root,
      env: { ...process.env, PATH: '' },
      windowsHide: true
    })
    expect(result.stdout).toContain('ffmpeg version')
  })

  it('unisce codec, durate, FPS, risoluzioni, frequenze e canali diversi rispettando l’ordine', async () => {
    const originalHashes = await Promise.all(
      videos.map((file) => fileChecksum(file))
    )
    const selection = await importer.select(videos)
    const order = [...selection.files].reverse()
    const ready = await importer.convert(
      selection.sessionId,
      order.map((file) => file.id)
    )
    expect(ready.durationSeconds).toBeGreaterThan(2.2)
    expect(ready.durationSeconds).toBeLessThan(2.6)
    const output = importer.takeReady(selection.sessionId)
    expect(output.sources.map((source) => source.name)).toEqual(
      order.map((file) => file.name)
    )
    expect(output.sources.map((source) => source.checksum)).toEqual(
      [...originalHashes].reverse()
    )
    const pcm = await execute(
      getFfmpegPath(),
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        output.outputPath,
        '-ac',
        '1',
        '-ar',
        '48000',
        '-f',
        's16le',
        'pipe:1'
      ],
      { encoding: 'buffer', windowsHide: true, maxBuffer: 2 * 1024 * 1024 }
    )
    // Check actual tone order in the resulting audio, not just its metadata.
    function frequencyAt(seconds: number): number {
      const start = Math.round(seconds * 48000)
      let crossings = 0
      for (let i = start; i < start + 4800; i++)
        if (
          pcm.stdout.readInt16LE(i * 2) <= 0 &&
          pcm.stdout.readInt16LE((i + 1) * 2) > 0
        )
          crossings++
      return crossings * 10
    }
    expect(frequencyAt(0.15)).toBeCloseTo(1320, -1)
    expect(frequencyAt(0.8)).toBeCloseTo(880, -1)
    expect(frequencyAt(1.9)).toBeCloseTo(440, -1)
    expect(await Promise.all(videos.map((file) => fileChecksum(file)))).toEqual(
      originalHashes
    )
    await importer.finish(selection.sessionId)
    expect(await readdir(join(root, 'video-import-temp'))).toEqual([])
  }, 20000)

  it('rifiuta ordini duplicati, ID estranei e doppie conversioni', async () => {
    const selection = await importer.select(videos.slice(0, 2))
    await expect(
      importer.convert(selection.sessionId, [
        selection.files[0].id,
        selection.files[0].id
      ])
    ).rejects.toThrow('ordine')
    await expect(
      importer.convert(selection.sessionId, [
        '../../file.mp4',
        selection.files[1].id
      ])
    ).rejects.toThrow('ordine')
    const converting = importer.convert(
      selection.sessionId,
      selection.files.map((file) => file.id)
    )
    await expect(
      importer.convert(
        selection.sessionId,
        selection.files.map((file) => file.id)
      )
    ).rejects.toThrow('già avviata')
    await converting
    await importer.cancel(selection.sessionId)
  })

  it('fallisce su audio assente o file corrotto e pulisce tutti i temporanei', async () => {
    const corrupt = join(root, 'corrotto.mp4')
    await writeFile(corrupt, 'video non valido')
    for (const file of [silentVideo, corrupt]) {
      const selection = await importer.select([videos[0], file])
      await expect(
        importer.convert(
          selection.sessionId,
          selection.files.map((item) => item.id)
        )
      ).rejects.toThrow('audio assente')
      expect(await readdir(join(root, 'video-import-temp'))).toEqual([])
      await importer.cancel(selection.sessionId)
    }
  })

  it('annulla una conversione in corso senza lasciare output o sessioni riutilizzabili', async () => {
    const selection = await importer.select(videos)
    let canceled: Promise<void> | undefined
    importer.setProgressCallback((progress) => {
      if (progress.message.includes('in corso'))
        canceled ??= importer.cancel(selection.sessionId)
    })
    await expect(
      importer.convert(
        selection.sessionId,
        selection.files.map((file) => file.id)
      )
    ).rejects.toThrow('annullata')
    await canceled
    expect(await readdir(join(root, 'video-import-temp'))).toEqual([])
    await expect(
      importer.convert(
        selection.sessionId,
        selection.files.map((file) => file.id)
      )
    ).rejects.toThrow('scaduta')
  })

  it('recupera solo temporanei propri all’avvio, preservando altre cartelle', async () => {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(root, 'video-import-temp', 'session-abcd'))
    await writeFile(
      join(root, 'video-import-temp', 'session-abcd', 'lecture.mp3'),
      'partial'
    )
    await mkdir(join(root, 'video-import-temp', 'altri-file'))
    await importer.initialize()
    expect(await readdir(join(root, 'video-import-temp'))).toEqual([
      'altri-file'
    ])
  })
})

describe('salvataggio nella pipeline esistente', () => {
  async function prepared() {
    const archive = new ArchiveService(root, undefined, true)
    const settings = new SettingsService(root)
    await settings.saveSettings({
      courses: { GT: course },
      autoProcessOnImport: true
    })
    await archive.initialize()
    const manager = (archive as unknown as { videoImporter: VideoImporter })
      .videoImporter
    const selection = await manager.select([videos[0]])
    await archive.convertVideos(
      selection.sessionId,
      selection.files.map((file) => file.id)
    )
    return { archive, settings, selection }
  }

  it('eredita la classificazione Laboratorio anche per gli audio convertiti da video', async () => {
    const { archive, settings, selection } = await prepared()
    await settings.saveSettings({ courses: { GT: { ...course, laboratorySchedule: { daysOfWeek: [1] } } } })
    const lecture = await archive.saveVideoImport(selection.sessionId, destination)
    expect(lecture.isLaboratory).toBe(true)
    expect((await archive.listLectures())[0].isLaboratory).toBe(true)
    archive.destroy()
  })

  it('salva MP3, corso, data e durata effettiva senza avviare richieste AI', async () => {
    const { archive, selection } = await prepared()
    const autoProcess = vi.spyOn(archive, 'processAutoQueue')
    const transcribe = vi.spyOn(archive, 'transcribeAudio')
    const startPipeline = vi.spyOn(archive, 'startArchivePipeline')
    const lecture = await archive.saveVideoImport(
      selection.sessionId,
      destination
    )
    expect(lecture.courseCode).toBe('GT')
    expect(lecture.recordedAt).toBe('2026-09-28T16:30:00')
    expect(lecture.durationSeconds).toBeLessThan(1)
    expect(lecture.videoImport?.scheduledEndTime).toBe('18:00')
    expect(lecture.status).toBe('audio-only')
    expect(await archive.getAudioFilePath(lecture.id)).toBe(
      join(root, 'audio', lecture.audioFileName)
    )
    expect(
      await fileChecksum((await archive.getAudioFilePath(lecture.id))!)
    ).toBe(lecture.checksum)
    await archive.scanAndSyncLibrary()
    expect(await archive.listLectures()).toEqual([
      { ...lecture, missingAudio: false }
    ])
    expect(autoProcess).not.toHaveBeenCalled()
    expect(transcribe).not.toHaveBeenCalled()
    expect(startPipeline).not.toHaveBeenCalled()
    const returned = (await archive.listLectures())[0]
    returned.videoImport!.sources[0].name = 'caller mutation'
    expect((await archive.listLectures())[0].videoImport!.sources[0].name).toBe(
      lecture.videoImport!.sources[0].name
    )
    expect((await archive.getArchivePipelineStatus()).status).toBe('idle')
  })

  it('rifiuta date impossibili, orari invalidi, corsi assenti o archiviati senza perdere l’audio pronto', async () => {
    const { archive, settings, selection } = await prepared()
    for (const value of [
      { ...destination, date: '2026-02-30' },
      { ...destination, startTime: '25:00' },
      { ...destination, endTime: '15:00' },
      { ...destination, courseCode: 'missing' }
    ])
      await expect(
        archive.saveVideoImport(selection.sessionId, value)
      ).rejects.toThrow()
    await settings.saveSettings({ archivedCourseCodes: ['GT'] })
    await expect(
      archive.saveVideoImport(selection.sessionId, destination)
    ).rejects.toThrow('corso attivo')
    await settings.saveSettings({ archivedCourseCodes: [] })
    expect(
      (await archive.saveVideoImport(selection.sessionId, destination))
        .courseCode
    ).toBe('GT')
  })

  it('ripristina l’importazione pronta dopo errore di persistenza e impedisce i duplicati', async () => {
    const { archive, selection } = await prepared()
    const repository = (
      archive as unknown as {
        repository: { writeLibrary: () => Promise<void> }
      }
    ).repository
    vi.spyOn(repository, 'writeLibrary').mockRejectedValueOnce(
      new Error('commit failure')
    )
    await expect(
      archive.saveVideoImport(selection.sessionId, destination)
    ).rejects.toThrow('commit failure')
    expect(await archive.listLectures()).toEqual([])
    expect(await readdir(join(root, 'audio'))).toEqual([])
    const lecture = await archive.saveVideoImport(
      selection.sessionId,
      destination
    )
    const second = await prepared()
    await expect(
      second.archive.saveVideoImport(second.selection.sessionId, destination)
    ).rejects.toThrow('già presente')
    await second.archive.cancelVideoImport(second.selection.sessionId)
    expect(
      JSON.parse(await readFile(join(root, 'library.json'), 'utf8')).lectures
    ).toHaveLength(1)
    expect((await archive.listLectures())[0].id).toBe(lecture.id)
  })
})

it('riordino e scorciatoia riconoscono Game Theory e conservano la lista originale', () => {
  expect(gameTheoryCourse([course])?.code).toBe('GT')
  expect(
    gameTheoryCourse([{ ...course, code: 'ALT', name: 'game_theory' }])?.code
  ).toBe('ALT')
  expect(
    gameTheoryCourse([{ ...course, code: 'ALT', name: 'Altro' }])
  ).toBeUndefined()
  const files = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  expect(reorderVideoFiles(files, 'c', 'a').map((file) => file.id)).toEqual([
    'c',
    'a',
    'b'
  ])
  expect(reorderVideoFiles(files, 'a', 'c').map((file) => file.id)).toEqual([
    'b',
    'c',
    'a'
  ])
  expect(files.map((file) => file.id)).toEqual(['a', 'b', 'c'])
})

it.each([
  ['2026-09-28', '2026-09-28'], // Monday: same day
  ['2026-09-29', '2026-09-28'],
  ['2026-09-30', '2026-09-28'],
  ['2026-10-01', '2026-09-28'], // Thursday: previous Monday is 3 days away
  ['2026-10-02', '2026-10-05'], // Friday: next Monday is 3 days away
  ['2026-10-03', '2026-10-05'],
  ['2026-10-04', '2026-10-05'],
  ['2026-12-31', '2026-12-28'],
  ['2027-01-01', '2027-01-04'],
  ['2026-02-28', '2026-03-02'],
  ['2026-10-25', '2026-10-26'] // Europe/Rome DST change
])('sceglie il lunedì più vicino a %s: %s', (date, expected) => {
  expect(nearestMonday(date)).toBe(expected)
})
