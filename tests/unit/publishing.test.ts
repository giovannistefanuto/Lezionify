import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile, symlink, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { createHash } from 'node:crypto'
import { PublishState } from '../../electron/main/publishing/publishState'
import { PublishService, gitBlobHash } from '../../electron/main/publishing/publishService'
import { AutomaticPublisher } from '../../electron/main/publishing/automaticPublisher'
import { PublishGitClient, PublishingError, normalizeRepoUrl, validateBranch, type GitRunner } from '../../electron/main/publishing/publishGitClient'
import { generateRootReadme, generateCourseReadme, sanitizeDirName, writePublishedFile } from '../../electron/main/publishing/readmeGenerator'
import { SettingsService } from '../../electron/main/settings'
import { ArchiveService } from '../../electron/main/archive'
import { LibraryRepository } from '../../electron/main/libraryRepository'
import type { CourseDefinition, Lecture, PublishingSettings } from '../../shared/archive'

const cryptoMock = vi.hoisted(() => ({ available: true, corrupt: false }))
vi.mock('electron', () => ({
  app: undefined, dialog: {}, shell: {},
  safeStorage: {
    isEncryptionAvailable: () => cryptoMock.available,
    encryptString: (text: string) => Buffer.from(`encrypted:${text}`),
    decryptString: (data: Buffer) => {
      if (cryptoMock.corrupt) throw new Error('sensitive-provider-error')
      return data.toString().replace(/^encrypted:/, '')
    }
  }
}))
vi.mock('../../electron/main/logger', () => ({
  logger: { init: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

const HASH = 'abcdef0123456789abcdef0123456789abcdef0123'
const publishing = (): PublishingSettings => ({
  enabled: true, repoUrl: 'https://github.com/student/notes.git', githubToken: 'synthetic-test-token',
  branch: 'main', autoPublishOnStartup: true
})
const lecture = (id = 'lecture-1'): Lecture => ({
  id, courseCode: 'RL', recordedAt: '2026-10-01T10:00:00', title: `Synthetic ${id}`,
  sourceAudioFileName: 'source.mp3', audioFileName: `${id}.mp3`, sourceTranscriptFileName: null,
  transcriptFileName: `${id}.txt`, markdownFileName: `${id}.md`, markdownEnFileName: `${id}_en.md`,
  byteSize: 1, checksum: 'synthetic', importedAt: '2026-10-01T12:00:00Z',
  status: 'transcript-available', studyStatus: 'da-studiare'
})

let directory: string
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'lezionify-publishing-'))
  cryptoMock.available = true
  cryptoMock.corrupt = false
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network forbidden in publishing tests') }))
})
afterEach(async () => {
  expect(fetch).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await rm(directory, { recursive: true, force: true })
})

describe('PublishState', () => {
  it('missing, malformed and semantically invalid files are recoverable without published flags', async () => {
    for (const content of [null, '{', '{"version":1,"destinations":{"bad":{}}}']) {
      if (content) await writeFile(path.join(directory, 'publish-state.json'), content)
      const state = new PublishState(directory)
      await state.load()
      expect(state.snapshot('target').publishedLectures).toEqual({})
    }
  })

  it('round-trips destination-specific entries and safe errors', async () => {
    const state = new PublishState(directory)
    await state.load()
    await state.recordSuccess('target', { lesson: { publishedAt: '2026-10-01', commitHash: HASH, coursePath: 'Course/date/id' } })
    await state.recordError('other', 'Errore controllato')
    const restored = new PublishState(directory)
    await restored.load()
    expect(restored.snapshot('target').publishedLectures.lesson.commitHash).toBe(HASH)
    expect(restored.snapshot('other').publishedLectures).toEqual({})
    expect(restored.snapshot('other').lastError).toBe('Errore controllato')
    const snapshot = restored.snapshot('target')
    delete snapshot.publishedLectures.lesson
    expect(restored.snapshot('target').publishedLectures.lesson).toBeDefined()
  })

  it('recovers the JSON backup after corruption', async () => {
    const state = new PublishState(directory)
    await state.load()
    await state.recordSuccess('target', { lesson: { publishedAt: '2026-10-01', commitHash: HASH, coursePath: 'Course/date/id' } })
    await state.recordError('target', 'Errore')
    await writeFile(path.join(directory, 'publish-state.json'), '{')
    const restored = new PublishState(directory)
    await restored.load()
    expect(restored.snapshot('target').publishedLectures.lesson).toBeDefined()
  })

  it('does not change memory if state persistence fails', async () => {
    const state = new PublishState(path.join(directory, 'missing-parent'))
    await state.load()
    await expect(state.recordSuccess('target', { lesson: { publishedAt: 'date', commitHash: HASH, coursePath: 'path' } })).rejects.toThrow()
    expect(state.snapshot('target').publishedLectures).toEqual({})
  })
})

function fixture() {
  let settings: PublishingSettings | undefined = publishing()
  let lectures: Lecture[] = [{ ...lecture(), markdownEnFileName: null }]
  let courses: Record<string, CourseDefinition> = {}
  const root = path.join(directory, 'mock-clone')
  const remoteFiles: Record<string, string> = {}
  const captureRemoteFiles = async () => {
    for (const file of git.addFiles.mock.calls.at(-1)?.[0] ?? []) {
      remoteFiles[file] = gitBlobHash(await readFile(path.join(root, file), 'utf8'))
    }
    for (const file of git.addFiles.mock.calls.at(-1)?.[1] ?? []) delete remoteFiles[file]
  }
  const git = {
    checkGitAvailable: vi.fn(async () => true),
    ensureRepo: vi.fn(async () => { await mkdir(root, { recursive: true }) }),
    getLocalPath: () => root,
    getRemoteFileHashes: vi.fn(async () => ({ ...remoteFiles })),
    addFiles: vi.fn(async (_files: string[], _removedFiles?: string[]) => {}),
    commit: vi.fn(async () => HASH as string | null),
    push: vi.fn(async () => { await captureRemoteFiles(); return HASH })
  }
  const storage = {
    readTranscript: vi.fn(async (_name: string) => 'Raw synthetic transcript' as string | null),
    readMarkdown: vi.fn(async (_name: string) => '# Synthetic notes' as string | null),
    readMarkdownEn: vi.fn(async (_name: string) => '# English notes' as string | null)
  }
  const state = new PublishState(directory)
  const createGitClient = vi.fn(() => git)
  const service = new PublishService(directory, {
    listLectures: async () => lectures,
    getCourses: async () => courses,
    getSettings: async () => settings,
    storage, state, createGitClient
  })
  return { service, state, root, git, storage, createGitClient, remoteFiles, captureRemoteFiles,
    setSettings: (value: PublishingSettings | undefined) => { settings = value },
    setCourses: (value: Record<string, CourseDefinition>) => { courses = value },
    setLectures: (value: Lecture[]) => { lectures = value } }
}

describe('PublishService', () => {
  it('does no work when disabled, unconfigured or there are no eligible lessons', async () => {
    const f = fixture()
    f.setSettings(undefined)
    expect(await f.service.publishNew()).toEqual({ published: 0, skipped: 0, errors: [] })
    f.setSettings({ ...publishing(), enabled: false })
    await f.service.publishNew()
    f.setSettings({ ...publishing(), githubToken: '' })
    expect((await f.service.publishNew()).errors).toEqual(['Pubblicazione non configurata.'])
    f.setSettings(publishing())
    f.setLectures([])
    await f.service.publishNew()
    expect(f.git.ensureRepo).toHaveBeenCalledTimes(1)
    expect(f.git.addFiles).not.toHaveBeenCalled()
  })

  it.each(['transcriptFileName', 'markdownFileName', 'courseCode', 'recordedAt'] as const)('skips missing %s', async field => {
    const f = fixture()
    f.setLectures([{ ...lecture(), [field]: null }])
    expect((await f.service.getStatus()).unpublishedCount).toBe(0)
    expect((await f.service.publishNew()).published).toBe(0)
    expect(f.git.addFiles).not.toHaveBeenCalled()
  })

  it.each(['2026-02-30', '../../audio', '2026-10-01/../../x'])('rejects invalid or traversing date %s', async recordedAt => {
    const f = fixture()
    f.setLectures([{ ...lecture(), recordedAt }])
    expect((await f.service.publishNew()).published).toBe(0)
    expect(f.git.addFiles).not.toHaveBeenCalled()
  })

  it('rejects source traversal and skips missing/blank files before writing any text', async () => {
    const f = fixture()
    f.setLectures([{ ...lecture(), transcriptFileName: '../settings.json' }])
    await f.service.publishNew()
    expect(f.storage.readTranscript).not.toHaveBeenCalled()
    f.setLectures([lecture()])
    f.storage.readMarkdown.mockResolvedValue(' ')
    expect((await f.service.publishNew()).skipped).toBe(1)
    expect(f.git.addFiles).not.toHaveBeenCalled()
    expect(await generateRootReadme(f.root)).not.toContain('| [RL')
  })

  it('publishes only the two text sources and README files, checkpoints after push, and skips previously published IDs', async () => {
    const f = fixture()
    f.git.push.mockImplementation(async () => {
      expect((await f.service.getStatus()).unpublishedCount).toBe(1)
      await expect(readFile(path.join(directory, 'publish-state.json'))).rejects.toMatchObject({ code: 'ENOENT' })
      await f.captureRemoteFiles()
      return HASH
    })
    const result = await f.service.publishNew()
    expect(result).toEqual({ published: 1, skipped: 0, errors: [], commitHash: HASH })
    const files = f.git.addFiles.mock.calls[0][0]
    expect(files).toHaveLength(5)
    expect(files.some(file => /\.mp3|_en\.md|settings|qna|quiz/.test(file))).toBe(false)
    expect(await readFile(path.join(f.root, files[0]), 'utf8')).toBe('Raw synthetic transcript')
    expect(await readFile(path.join(f.root, files[1]), 'utf8')).toBe('# Synthetic notes')
    expect((await f.service.getStatus()).unpublishedCount).toBe(0)
    expect(await f.service.publishNew()).toEqual({ published: 0, skipped: 0, errors: [] })
    expect(f.git.push).toHaveBeenCalledTimes(1)
  })

  it('retains unpublished flags on failed push and retries even when the next commit is empty', async () => {
    const f = fixture()
    f.git.push.mockRejectedValueOnce(new Error('synthetic-test-token C:\\Users\\Private\\notes'))
    const failed = await f.service.publishNew()
    expect(failed.published).toBe(0)
    expect(JSON.stringify(failed)).not.toMatch(/synthetic-test-token|Private/)
    expect((await f.service.getStatus()).unpublishedCount).toBe(1)
    f.git.commit.mockResolvedValue(null)
    expect((await f.service.publishNew()).published).toBe(1)
    expect(f.git.push).toHaveBeenCalledTimes(2)
  })

  it('also leaves an unchanged batch unpublished if its push fails', async () => {
    const f = fixture()
    f.git.commit.mockResolvedValue(null)
    f.git.push.mockRejectedValue(new Error('network failure'))
    expect((await f.service.publishNew()).published).toBe(0)
    expect((await f.service.getStatus()).unpublishedCount).toBe(1)
  })

  it('retries after restart without invoking Git for unavailable tools or failed preparation', async () => {
    const f = fixture()
    f.git.checkGitAvailable.mockResolvedValueOnce(false)
    expect((await f.service.publishNew()).errors[0]).toContain('Git non trovato')
    expect(f.git.ensureRepo).not.toHaveBeenCalled()
    f.git.ensureRepo.mockRejectedValueOnce(new Error('secret remote message'))
    await f.service.publishNew()
    expect(f.git.addFiles).not.toHaveBeenCalled()
    expect((await f.service.publishNew()).published).toBe(1)
  })

  it('has synchronous admission before the first await', async () => {
    const f = fixture()
    let release!: () => void
    f.git.ensureRepo.mockImplementationOnce(async () => {
      await new Promise<void>(resolve => { release = resolve })
      await mkdir(f.root, { recursive: true })
    })
    const first = f.service.publishNew()
    await vi.waitFor(() => expect(release).toBeDefined())
    expect((await f.service.publishNew()).errors).toEqual(['Pubblicazione già in corso.'])
    release()
    expect((await first).published).toBe(1)
    expect(f.git.push).toHaveBeenCalledTimes(1)
  })

  it('isolates same-day lessons, colliding course names and target changes', async () => {
    const f = fixture()
    f.setLectures([lecture('first'), lecture('second'), { ...lecture('third'), courseCode: 'Robotics' }])
    expect((await f.service.publishNew()).published).toBe(3)
    const files = f.git.addFiles.mock.calls[0][0].filter(file => file.endsWith('schema.md'))
    expect(new Set(files).size).toBe(3)
    expect(new Set(files.map(file => file.split('/')[0])).size).toBe(2)
    f.setSettings({ ...publishing(), branch: 'other' })
    expect((await f.service.getStatus()).unpublishedCount).toBe(3)
    expect((await f.service.publishNew()).published).toBe(3)
    f.setSettings(publishing())
    expect((await f.service.getStatus()).unpublishedCount).toBe(0)
    expect(f.createGitClient.mock.calls).toHaveLength(2)
  })

  it('continues after one source-read failure but aborts the batch on disk-full', async () => {
    const f = fixture()
    f.setLectures([lecture('bad'), lecture('good')])
    f.storage.readTranscript.mockRejectedValueOnce(new Error('sensitive'))
    expect(await f.service.publishNew()).toMatchObject({ published: 1, skipped: 1 })
    f.setLectures([lecture('new')])
    f.storage.readMarkdown.mockRejectedValueOnce(Object.assign(new Error('full'), { code: 'ENOSPC' }))
    expect((await f.service.publishNew()).published).toBe(0)
    expect(f.git.push).toHaveBeenCalledTimes(1)
  })

  it('does not acknowledge a successful push if state saving fails', async () => {
    const f = fixture()
    vi.spyOn(f.state, 'recordSuccess').mockRejectedValueOnce(new Error('disk'))
    expect((await f.service.publishNew()).published).toBe(0)
    expect((await f.service.getStatus()).unpublishedCount).toBe(1)
    f.git.commit.mockResolvedValue(null)
    expect((await f.service.publishNew()).published).toBe(1)
  })

  it('does not expose raw storage errors through the status IPC contract', async () => {
    const f = fixture()
    vi.spyOn(f.state, 'load').mockRejectedValue(new Error('synthetic-test-token C:\\Users\\Private'))
    await expect(f.service.getStatus()).rejects.toThrow('Impossibile leggere lo stato')
    try { await f.service.getStatus() } catch (error) { expect(String(error)).not.toMatch(/synthetic-test-token|Private/) }
  })

  it('rechecks GitHub even when all IDs are already published and uploads changed local sources', async () => {
    const f = fixture()
    await f.service.publishNew()
    expect((await f.service.publishNew()).published).toBe(0)
    expect(f.git.ensureRepo).toHaveBeenCalledTimes(2)
    expect(f.git.push).toHaveBeenCalledTimes(1)
    f.storage.readTranscript.mockResolvedValue('Corrected synthetic transcript')
    expect((await f.service.getStatus()).unpublishedCount).toBe(1)
    expect((await f.service.publishNew()).published).toBe(1)
    expect(f.git.push).toHaveBeenCalledTimes(2)
    expect((await f.service.getStatus()).unpublishedCount).toBe(0)
  })

  it.each(['deleted', 'modified'])('repairs a %s remote source despite an unchanged local checkpoint', async change => {
    const f = fixture()
    await f.service.publishNew()
    const schema = f.git.addFiles.mock.calls[0][0].find(file => file.endsWith('schema.md'))!
    if (change === 'deleted') delete f.remoteFiles[schema]
    else f.remoteFiles[schema] = gitBlobHash('# Modified remotely')
    f.git.push.mockRejectedValueOnce(new PublishingError('Offline', 'network'))
    expect((await f.service.publishNew()).published).toBe(0)
    expect(await f.service.getStatus()).toMatchObject({ unpublishedCount: 1, connection: 'offline', phase: 'error' })
    expect((await f.service.publishNew()).published).toBe(1)
    expect(f.remoteFiles[schema]).toBe(gitBlobHash('# Synthetic notes'))
    expect(await f.service.getStatus()).toMatchObject({ unpublishedCount: 0, connection: 'online', phase: 'synced' })
  })

  it('verifies connectivity on an empty library and reports offline without staging', async () => {
    const f = fixture()
    f.setLectures([])
    f.git.ensureRepo.mockRejectedValueOnce(new PublishingError('GitHub non raggiungibile', 'network'))
    expect((await f.service.publishNew()).errors[0]).toContain('non raggiungibile')
    expect((await f.service.getStatus()).connection).toBe('offline')
    expect(f.git.addFiles).not.toHaveBeenCalled()
    await f.service.publishNew()
    expect(await f.service.getStatus()).toMatchObject({ connection: 'online', phase: 'synced', lastError: null })
  })

  it('recovers unchanged content after restarting without a redundant push', async () => {
    const first = fixture()
    await first.service.publishNew()
    const restarted = fixture()
    Object.assign(restarted.remoteFiles, first.remoteFiles)
    expect((await restarted.service.publishNew()).published).toBe(0)
    expect(restarted.git.ensureRepo).toHaveBeenCalledTimes(1)
    expect(restarted.git.push).not.toHaveBeenCalled()
  })

  it('uses plain course/date paths and publishes existing English without exposing IDs', async () => {
    const f = fixture()
    f.setLectures([lecture()])
    expect((await f.service.publishNew()).published).toBe(1)
    const files = f.git.addFiles.mock.calls[0][0]
    expect(files).toContain('RL/2026-10-01/schema.en.md')
    expect(files.every(file => !/--[a-f0-9]|\/[a-f0-9]{16}\//.test(file))).toBe(true)
    expect(f.storage.readMarkdownEn).toHaveBeenCalledWith('lecture-1.md')
    const index = await readFile(path.join(f.root, 'RL/README.md'), 'utf8')
    expect(index).toContain('[01/10/2026](./2026-10-01/)')
    expect(index).toContain('[English](./2026-10-01/schema.en.md)')
    expect(index).toContain('dalla più vecchia alla più recente')
  })

  it('syncs a late translation, an edited English file and a removed remote English file', async () => {
    const f = fixture()
    await f.service.publishNew()
    expect(await readFile(path.join(f.root, 'RL/README.md'), 'utf8')).toContain('Pending')
    f.setLectures([lecture()])
    expect((await f.service.getStatus()).unpublishedCount).toBe(1)
    expect((await f.service.publishNew()).published).toBe(1)
    f.storage.readMarkdownEn.mockResolvedValue('# Revised English')
    expect((await f.service.publishNew()).published).toBe(1)
    delete f.remoteFiles['RL/2026-10-01/schema.en.md']
    expect((await f.service.publishNew()).published).toBe(1)
    expect(f.remoteFiles['RL/2026-10-01/schema.en.md']).toBe(gitBlobHash('# Revised English'))
  })

  it('removes an invalidated English derivative rather than leaving a stale translation', async () => {
    const f = fixture()
    f.setLectures([lecture()])
    await f.service.publishNew()
    f.setLectures([{ ...lecture(), markdownEnFileName: null }])
    expect((await f.service.publishNew()).published).toBe(1)
    await expect(readFile(path.join(f.root, 'RL/2026-10-01/schema.en.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(f.remoteFiles['RL/2026-10-01/schema.en.md']).toBeUndefined()
    expect(await readFile(path.join(f.root, 'RL/README.md'), 'utf8')).toContain('Pending')
  })

  it('skips a broken declared translation and never reads a traversing English filename', async () => {
    const f = fixture()
    f.setLectures([lecture()])
    f.storage.readMarkdownEn.mockResolvedValue(null)
    expect(await f.service.publishNew()).toMatchObject({ published: 0, skipped: 1 })
    expect(f.git.addFiles).not.toHaveBeenCalled()
    f.storage.readMarkdownEn.mockClear()
    f.setLectures([{ ...lecture(), markdownEnFileName: '../settings.json' }])
    expect((await f.service.publishNew()).skipped).toBe(1)
    expect(f.storage.readMarkdownEn).not.toHaveBeenCalled()
  })

  it('migrates legacy hash folders with or without a checkpoint and preserves unrelated files', async () => {
    const f = fixture()
    await mkdir(f.root)
    const hash = (value: string, length: number) => createHash('sha256').update(value).digest('hex').slice(0, length)
    const course = `RL--${hash('RL', 12)}`
    const old = `${course}/2026-10-01/${hash('lecture-1', 16)}`
    for (const [file, content] of Object.entries({ [`${old}/schema.md`]: '# Old', [`${old}/trascrizione.txt`]: 'Old raw', [`${course}/README.md`]: '# Old index', [`${old}/manual.md`]: 'Keep me' })) {
      await writePublishedFile(f.root, file, content)
      f.remoteFiles[file] = gitBlobHash(content)
    }
    f.git.push.mockRejectedValueOnce(new PublishingError('Offline', 'network'))
    expect((await f.service.publishNew()).published).toBe(0)
    expect((await f.service.publishNew()).published).toBe(1)
    expect(f.remoteFiles[`${old}/schema.md`]).toBeUndefined()
    expect(f.remoteFiles[`${course}/README.md`]).toBeUndefined()
    expect(await readFile(path.join(f.root, `${old}/manual.md`), 'utf8')).toBe('Keep me')
    expect(f.remoteFiles['RL/2026-10-01/schema.md']).toBe(gitBlobHash('# Synthetic notes'))
    expect(await generateRootReadme(f.root)).not.toContain(course)
  })

  it('moves checkpoint-owned paths when a second same-day lesson is added or a course is renamed', async () => {
    const f = fixture()
    await f.service.publishNew()
    f.setLectures([lecture(), lecture('second')])
    expect((await f.service.publishNew()).published).toBe(2)
    expect(f.remoteFiles['RL/2026-10-01/schema.md']).toBeUndefined()
    expect(f.remoteFiles['RL/2026-10-01/Synthetic lecture-1/schema.md']).toBeDefined()
    f.setCourses({ RL: { name: 'Reinforcement Learning' } as CourseDefinition })
    expect((await f.service.publishNew()).published).toBe(2)
    expect(f.remoteFiles['RL/README.md']).toBeUndefined()
    expect(f.remoteFiles['Reinforcement Learning/2026-10-01/Synthetic lecture-1/schema.md']).toBeDefined()
  })

  it('fails before writing when course names or same-day titles collide on Windows', async () => {
    const f = fixture()
    f.setLectures([lecture(), { ...lecture('other'), courseCode: 'rl' }])
    expect((await f.service.publishNew()).errors[0]).toContain('nomi distinti')
    expect(f.git.addFiles).not.toHaveBeenCalled()
    f.setLectures([lecture(), { ...lecture('other'), title: lecture().title }])
    expect((await f.service.publishNew()).errors[0]).toContain('titoli distinti')
    expect(f.git.addFiles).not.toHaveBeenCalled()
  })

  it('repairs README drift even when lesson content is unchanged', async () => {
    const f = fixture()
    await f.service.publishNew()
    f.remoteFiles['README.md'] = gitBlobHash('# Old index')
    expect((await f.service.publishNew()).published).toBe(0)
    expect(f.git.push).toHaveBeenCalledTimes(2)
    expect(f.remoteFiles['README.md']).toBe(gitBlobHash(await readFile(path.join(f.root, 'README.md'), 'utf8')))
  })
})

describe('README and output paths', () => {
  it('orders dates chronologically, uses readable titles and escapes Markdown links', async () => {
    for (const date of ['2026-10-02', '2026-09-28']) {
      await writePublishedFile(directory, `Corso/${date}/schema.md`, '# Notes')
      await writePublishedFile(directory, `Corso/${date}/trascrizione.txt`, 'Raw')
    }
    const index = await generateCourseReadme(directory, 'Corso', [{ relative: '2026-09-28', title: 'A | [B]', english: false }])
    expect(index.indexOf('28/09/2026')).toBeLessThan(index.indexOf('02/10/2026'))
    expect(index).toContain('A \\| \\[B\\]')
    expect(index).not.toContain('[English]')
  })
  it('supports empty repos, encoded links, date/id lessons and ignores incomplete or hidden directories', async () => {
    expect(await generateRootReadme(directory)).toContain('| Corso | Lezioni |')
    const course = 'Course [A] & B'
    await writePublishedFile(directory, `${course}/2026-10-01/abc/schema.md`, '# Notes')
    await writePublishedFile(directory, `${course}/2026-10-01/abc/trascrizione.txt`, 'Transcript')
    await writePublishedFile(directory, `${course}/2026-10-02/schema.md`, '# Incomplete')
    await writePublishedFile(directory, '.hidden/2026-10-01/schema.md', '# Hidden')
    const root = await generateRootReadme(directory)
    expect(root).toContain('Course%20%5BA%5D%20%26%20B')
    expect(root).toContain('| 1 |')
    expect(root).not.toMatch(/Incomplete|hidden/)
    const index = await generateCourseReadme(directory, course)
    expect(index).toContain('./2026-10-01/abc/schema.md')
    expect(index).not.toContain('2026-10-02')
  })

  it.each(['../', 'CON', 'NUL.txt', 'Name.', '.git', 'A<>:"/\\|?*', 'A'.repeat(150)])('sanitizes Windows course names: %s', name => {
    const output = sanitizeDirName(name)
    expect(output).not.toMatch(/[<>:"/\\|?*]|[. ]$|^\./)
    expect(output.length).toBeLessThanOrEqual(71)
    expect(output).not.toBe('..')
  })

  it('refuses traversal and junctions before writing outside the clone', async () => {
    await expect(writePublishedFile(directory, '../escaped/schema.md', 'secret')).rejects.toThrow('Percorso')
    const outside = path.join(directory, 'outside')
    await mkdir(outside)
    await symlink(outside, path.join(directory, 'linked'), 'junction')
    await expect(writePublishedFile(directory, 'linked/schema.md', 'secret')).rejects.toThrow('sicuro')
    await expect(readFile(path.join(outside, 'schema.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

describe('Publishing settings and IPC boundary', () => {
  it('requires a token when automatic synchronization is first enabled', async () => {
    const value = { ...publishing() }
    delete value.githubToken
    await expect(new SettingsService(directory).saveSettings({ publishing: value })).rejects.toThrow('Inserisci un token')
  })
  it('encrypts PAT, preserves it on token-omitting writes and unrelated saves, never returns it through ArchiveService', async () => {
    const settings = new SettingsService(directory)
    await settings.saveSettings({ publishing: publishing() })
    const disk = await readFile(path.join(directory, 'settings.json'), 'utf8')
    expect(disk).not.toContain('synthetic-test-token')
    expect((await settings.getSettings()).publishing?.githubToken).toBe('synthetic-test-token')
    const archive = new ArchiveService(directory, undefined, false)
    expect((await archive.getSettings()).publishing).not.toHaveProperty('githubToken')
    const update = { ...publishing() }
    delete update.githubToken
    expect((await archive.saveSettings({ publishing: update })).publishing).not.toHaveProperty('githubToken')
    await settings.saveSettings({ model: 'gemini-3.7-flash' })
    expect((await settings.getSettings()).publishing?.githubToken).toBe('synthetic-test-token')
    await settings.saveSettings({ publishing: { ...publishing(), githubToken: '' } })
    expect((await settings.getSettings()).publishing?.githubToken).toBe('')
  })

  it('refuses plaintext fallback when safeStorage is unavailable and fails closed on unreadable tokens', async () => {
    const settings = new SettingsService(directory)
    cryptoMock.available = false
    await expect(settings.saveSettings({ publishing: publishing() })).rejects.toThrow('Crittografia')
    await expect(readFile(path.join(directory, 'settings.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    cryptoMock.available = true
    await settings.saveSettings({ publishing: publishing() })
    const token = JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8')).publishing.githubToken
    cryptoMock.corrupt = true
    expect((await settings.getSettings()).publishing?.enabled).toBe(false)
    expect((await settings.getSettings()).publishing?.githubToken).toBe('')
    await settings.saveSettings({ autoProcessOnImport: false })
    expect(JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8')).publishing.githubToken).toBe(token)
  })

  it.each([
    'invalid', [], null,
    { ...publishing(), enabled: 'yes' }, { ...publishing(), autoPublishOnStartup: 1 },
    { ...publishing(), repoUrl: 'x'.repeat(501) }, { ...publishing(), repoUrl: 'https://token@github.com/u/r.git' },
    { ...publishing(), repoUrl: 'https://evil.example/u/r.git' },
    { ...publishing(), branch: '--upload-pack=evil' }, { ...publishing(), branch: 'main/../other' },
    { ...publishing(), githubToken: 'unsafe\nheader' }
  ])('rejects malformed settings without leaking input: %j', async value => {
    await expect(new SettingsService(directory).saveSettings({ publishing: value })).rejects.toThrow()
  })

  it('uses disabled defaults for old settings and never adopts a plaintext token from disk', async () => {
    const settings = new SettingsService(directory)
    expect((await settings.getSettings()).publishing?.enabled).toBe(false)
    await writeFile(path.join(directory, 'settings.json'), JSON.stringify({ publishing: publishing() }))
    expect((await settings.getSettings()).publishing?.enabled).toBe(false)
    expect((await settings.getSettings()).publishing?.githubToken).toBe('')
  })
})

describe('Automatic publishing lifecycle', () => {
  async function archiveWithPublishing(onStartup = true) {
    await new SettingsService(directory).saveSettings({ publishing: { ...publishing(), autoPublishOnStartup: onStartup } })
    const repository = new LibraryRepository(directory)
    await repository.initialize()
    await repository.writeLibrary({ version: 1, lectures: [lecture()] })
    const archive = new ArchiveService(directory, undefined, false)
    const publisher = (archive as unknown as { publishService: PublishService }).publishService
    const publish = vi.spyOn(publisher, 'publishNew').mockResolvedValue({ published: 1, skipped: 0, errors: [] })
    return { archive, publish }
  }

  it('respects the startup toggle while allowing post-pipeline publication and manual publication', async () => {
    const { archive, publish } = await archiveWithPublishing(false)
    await archive.initialize()
    await archive.autoPublishLectures(true)
    expect(publish).not.toHaveBeenCalled()
    await archive.publishLectures()
    expect(publish).toHaveBeenCalledTimes(1)
    // A real no-op pipeline completes without making any Gemini calls.
    const progress = vi.fn()
    archive.setArchivePipelineStatusCallback(progress)
    await archive.startArchivePipeline()
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(progress).toHaveBeenCalled()
    expect(archive.getArchivePipelineStatus().status).toBe('completed')
  })

  it('does not mistake a restored completed pipeline for a new completion', async () => {
    const { archive } = await archiveWithPublishing(false)
    await archive.initialize()
    await archive.startArchivePipeline()
    await archive.waitForAutoProcessing()
    const restored = new ArchiveService(directory, undefined, false)
    const automatic = vi.spyOn(restored, 'autoPublishLectures')
    await restored.initialize()
    expect(restored.getArchivePipelineStatus().status).toBe('completed')
    expect(automatic).not.toHaveBeenCalled()
  })

  it('keeps manual publication out of an active pipeline and starts automatically when enabled', async () => {
    const { archive, publish } = await archiveWithPublishing()
    await archive.initialize()
    await archive.autoPublishLectures(true)
    expect(publish).toHaveBeenCalledTimes(1)
    const pipeline = (archive as unknown as { archivePipeline: { isProcessing(): boolean } }).archivePipeline
    vi.spyOn(pipeline, 'isProcessing').mockReturnValue(true)
    expect((await archive.publishLectures()).errors[0]).toContain('pipeline')
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it('requests a background startup check and reschedules after settings or notes are saved', async () => {
    const { archive } = await archiveWithPublishing()
    await archive.initialize()
    const scheduler = (archive as unknown as { automaticPublisher: AutomaticPublisher }).automaticPublisher
    const schedule = vi.spyOn(scheduler, 'schedule').mockImplementation(() => {})
    await archive.startAutomaticPublishing()
    expect(schedule).toHaveBeenLastCalledWith(0)
    const configuration = { ...publishing() }
    delete configuration.githubToken
    await archive.saveSettings({ publishing: configuration })
    expect(schedule).toHaveBeenCalledTimes(2)
    await archive.saveMarkdown('lecture-1', '# Updated notes')
    expect(schedule).toHaveBeenCalledTimes(3)
    await archive.updateLecture('lecture-1', { recordedAt: '2026-10-02' })
    expect(schedule).toHaveBeenCalledTimes(4)
    archive.destroy()
  })

  it.each(['success', 'input', 'network'] as const)('publishes after worker finalization for %s, but leaves provider pauses unpublished', async outcome => {
    await new SettingsService(directory).saveSettings({ apiKeys: ['synthetic-gemini-key'], publishing: publishing() })
    const repository = new LibraryRepository(directory)
    await repository.initialize()
    await repository.writeLibrary({ version: 1, lectures: [{ ...lecture(), markdownFileName: null }] })
    const archive = new ArchiveService(directory, undefined, false)
    await archive.initialize()
    const publisher = (archive as unknown as { publishService: PublishService }).publishService
    const publish = vi.spyOn(publisher, 'publishNew').mockImplementation(async () => {
      expect(archive.getAutoProcessingStatus().isProcessing).toBe(false)
      return { published: 0, skipped: 0, errors: [] }
    })
    vi.spyOn(archive, 'generateLectureNotes').mockImplementation(async id => {
      if (outcome !== 'success') return { success: false, failureKind: outcome, error: 'Errore sintetico controllato' }
      await archive.saveMarkdown(id, '# Synthetic notes')
      return { success: true }
    })
    vi.spyOn(archive, 'translateLectureNotes').mockResolvedValue({ success: true })
    expect((await archive.startArchivePipeline()).started).toBe(true)
    await archive.waitForAutoProcessing()
    if (outcome === 'network') {
      expect(archive.getArchivePipelineStatus().status).toBe('paused')
      expect(publish).not.toHaveBeenCalled()
    } else {
      await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(1))
      expect(archive.getArchivePipelineStatus().status).toBe(outcome === 'success' ? 'completed' : 'completed_with_errors')
    }
  })
})

describe('PublishGitClient with a synthetic runner (no git processes or network)', () => {
  function client(runner: GitRunner) {
    return new PublishGitClient({ ...publishing(), githubToken: 'synthetic-test-token', localPath: path.join(directory, 'clone') }, runner)
  }

  it('probes Git from an existing directory before the first clone exists', async () => {
    const runner = vi.fn<GitRunner>(async (_args, options) => {
      // Match child_process: a missing cwd fails even when the executable exists.
      await stat(options.cwd)
      return { stdout: 'git version synthetic', stderr: '' }
    })
    const git = client(runner)
    await expect(stat(git.getLocalPath())).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await git.checkGitAvailable()).toBe(true)
    const [args, options] = runner.mock.calls[0]
    expect(args).toEqual(['--version'])
    expect(options.cwd).toBe(process.cwd())
    expect(options.timeout).toBe(30_000)
    expect(Object.values(options.env).some(value => value?.startsWith('Authorization: Basic '))).toBe(false)
    await expect(stat(git.getLocalPath())).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('reports a genuinely unavailable Git executable without exposing the raw error', async () => {
    const git = client(async () => { throw Object.assign(new Error('private-path'), { code: 'ENOENT' }) })
    expect(await git.checkGitAvailable()).toBe(false)
  })

  it('keeps PAT out of argv and remote configuration, removes trace variables and uses bounded noninteractive commands', async () => {
    const runner = vi.fn<GitRunner>(async args => ({ stdout: args[0] === 'rev-parse' ? HASH : '', stderr: '' }))
    vi.stubEnv('GIT_TRACE_CURL', '1')
    try {
      await client(runner).push()
      const [args, options] = runner.mock.calls[0]
      expect(JSON.stringify(args)).not.toContain('synthetic-test-token')
      expect(options.timeout).toBe(120_000)
      expect(options.env.GIT_TERMINAL_PROMPT).toBe('0')
      expect(options.env.GIT_TRACE_CURL).toBeUndefined()
      const header = Object.values(options.env).find(value => value?.startsWith('Authorization: Basic '))!
      expect(Buffer.from(header.split(' ').at(-1)!, 'base64').toString()).toBe('x-access-token:synthetic-test-token')
      expect(runner.mock.calls.at(-1)![1].timeout).toBe(30_000)
    } finally { vi.unstubAllEnvs() }
  })

  it('supports first commit in an empty repository with a configured orphan branch', async () => {
    const runner = vi.fn<GitRunner>(async () => ({ stdout: '', stderr: '' }))
    await client(runner).ensureRepo()
    expect(runner.mock.calls.some(([args]) => args.join(' ') === 'checkout --orphan main')).toBe(true)
    const clone = runner.mock.calls.find(([args]) => args[0] === 'clone')![0]
    expect(clone).toContain('https://github.com/student/notes.git')
    expect(JSON.stringify(clone)).not.toContain('synthetic-test-token')
  })

  it('checks out an existing branch and refuses nonexistent branches on populated repositories', async () => {
    const runner = vi.fn<GitRunner>(async args => ({ stdout: args[0] === 'for-each-ref' ? 'refs/remotes/origin/main\n' : '', stderr: '' }))
    await client(runner).ensureRepo()
    expect(runner.mock.calls.some(([args]) => args.join(' ') === 'checkout -B main refs/remotes/origin/main')).toBe(true)
    const other = new PublishGitClient({ ...publishing(), githubToken: 'test', branch: 'absent', localPath: path.join(directory, 'other') }, runner)
    await expect(other.ensureRepo()).rejects.toThrow('non esiste')
  })

  it('sanitizes every raw command error and retries non-fast-forward exactly once, returning the rebased hash', async () => {
    let pushes = 0
    const runner = vi.fn<GitRunner>(async args => {
      if (args[0] === 'push' && ++pushes === 1) throw { stderr: '[rejected] non-fast-forward synthetic-test-token' }
      return { stdout: args[0] === 'for-each-ref' ? 'refs/remotes/origin/main\n' : args[0] === 'rev-parse' ? HASH : '', stderr: '' }
    })
    expect(await client(runner).push()).toBe(HASH)
    expect(pushes).toBe(2)
    const broken = client(async () => { throw new Error('synthetic-test-token C:\\Users\\Private') })
    await expect(broken.push()).rejects.toThrow('Operazione Git fallita')
    try { await broken.push() } catch (error) { expect(String(error)).not.toMatch(/synthetic-test-token|Private/) }
  })

  it('never swallows a failed fetch or true rebase conflict and aborts rebase on conflict', async () => {
    const runner = vi.fn<GitRunner>(async args => {
      if (args[0] === 'rebase' && args[1] !== '--abort') throw new Error('conflict')
      return { stdout: args[0] === 'for-each-ref' ? 'refs/remotes/origin/main\n' : '', stderr: '' }
    })
    await expect(client(runner).ensureRepo()).rejects.toThrow('Conflitto')
    expect(runner.mock.calls.some(([args]) => args.join(' ') === 'rebase --abort')).toBe(true)
    expect(runner.mock.calls.some(([args]) => args[0] === 'push')).toBe(false)
  })

  it('rejects already staged unrelated files and tolerates a genuinely empty commit', async () => {
    const runner = vi.fn<GitRunner>(async args => ({ stdout: args[0] === 'diff' ? 'audio.mp3\0' : '', stderr: '' }))
    await expect(client(runner).addFiles(['schema.md'])).rejects.toThrow('non appartenenti')
    expect(runner.mock.calls.some(([args]) => args[0] === 'add')).toBe(false)
    const empty = client(async () => ({ stdout: '', stderr: '' }))
    expect(await empty.commit('message')).toBeNull()
  })

  it('stages large batches in bounded argv and preserves Unicode paths in an existing index', async () => {
    const files = Array.from({ length: 121 }, (_, index) => `Corso à/lezione ${index}/schema.md`)
    const runner = vi.fn<GitRunner>(async args => ({ stdout: args[0] === 'diff' ? files[0] + '\0' : '', stderr: '' }))
    await client(runner).addFiles(files)
    const added = runner.mock.calls.filter(([args]) => args[0] === 'add').map(([args]) => args.slice(2))
    expect(added.map(batch => batch.length)).toEqual([50, 50, 21])
    expect(added.flat()).toEqual(files)
  })

  it('allows only specified migration deletions and retries already committed removals', async () => {
    const removed = ['Old [course]/2026-10-01/schema.md']
    const runner = vi.fn<GitRunner>(async args => ({ stdout: args[0] === 'diff' ? removed[0] + '\0' : '', stderr: '' }))
    await client(runner).addFiles(['Course/2026-10-01/schema.md'], removed)
    expect(runner.mock.calls.some(([args]) => args.join(' ') === `rm --ignore-unmatch -- ${removed[0]}`)).toBe(true)
    expect(runner.mock.calls.every(([, options]) => options.env.GIT_LITERAL_PATHSPECS === '1')).toBe(true)
    await expect(client(runner).addFiles(['schema.md'])).rejects.toThrow('non appartenenti')
  })

  it('restricts URL and branch inputs before any external command', () => {
    expect(normalizeRepoUrl('https://github.com/Student/Notes/')).toBe('https://github.com/student/notes.git')
    for (const url of ['file:///secret', 'https://token@github.com/u/r', 'https://github.com/u/r?secret=x']) {
      expect(() => normalizeRepoUrl(url)).toThrow(PublishingError)
    }
    for (const branch of ['--evil', 'main..x', 'x.lock', 'main//x', 'main/']) expect(() => validateBranch(branch)).toThrow()
  })

  it('reads the fetched remote tree and never treats symlinks as published text', async () => {
    const runner = vi.fn<GitRunner>(async args => ({ stdout:
      args[0] === 'for-each-ref' ? 'refs/remotes/origin/main\n' :
      args[0] === 'ls-tree' ? `100644 blob ${HASH}\tCorso à/date/schema.md\0` +
        `120000 blob ${HASH}\tlinked/trascrizione.txt\0` : '', stderr: '' }))
    const git = client(runner)
    await git.ensureRepo()
    expect(await git.getRemoteFileHashes()).toEqual({ 'Corso à/date/schema.md': HASH })
    expect(runner.mock.calls.some(([args]) => args.join(' ') === 'fetch --prune origin')).toBe(true)
  })

  it.each([
    ['fatal: unable to access https://secret@github.com/u/r: Could not resolve host', 'network'],
    ['remote: Invalid username or token; Authentication failed synthetic-test-token', 'authentication']
  ])('classifies provider errors without leaking raw stderr: %s', async (stderr, kind) => {
    const git = client(async () => { throw { stderr } })
    try { await git.push(); throw new Error('expected error') } catch (error) {
      expect(error).toBeInstanceOf(PublishingError)
      expect((error as PublishingError).kind).toBe(kind)
      expect(String(error)).not.toMatch(/secret@|synthetic-test-token/)
    }
  })
})

describe('AutomaticPublisher', () => {
  let schedulers: AutomaticPublisher[]
  beforeEach(() => { vi.useFakeTimers(); schedulers = [] })
  afterEach(() => { schedulers.forEach(scheduler => scheduler.stop()); vi.useRealTimers() })

  function schedulerFixture() {
    const operations = {
      enabled: vi.fn(async () => true), busy: vi.fn(() => false),
      publish: vi.fn(async () => ({ published: 0, skipped: 0, errors: [] as string[] }))
    }
    const scheduler = new AutomaticPublisher(operations)
    schedulers.push(scheduler)
    return { operations, scheduler }
  }

  it('debounces changes and verifies again every five minutes without a publish button', async () => {
    const { scheduler, operations } = schedulerFixture()
    scheduler.schedule(); scheduler.schedule(); scheduler.schedule()
    await vi.advanceTimersByTimeAsync(999)
    expect(operations.publish).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(operations.publish).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(300_000)
    expect(operations.publish).toHaveBeenCalledTimes(2)
  })

  it('retries an offline check with bounded backoff and resumes when GitHub returns', async () => {
    const { scheduler, operations } = schedulerFixture()
    operations.publish.mockResolvedValueOnce({ published: 0, skipped: 0, errors: ['offline'] })
      .mockResolvedValueOnce({ published: 0, skipped: 0, errors: ['offline'] })
    scheduler.schedule(0)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(operations.publish).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(operations.publish).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(operations.publish).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(300_000)
    expect(operations.publish).toHaveBeenCalledTimes(4)
  })

  it('does not run while disabled or while the AI pipeline owns the archive', async () => {
    const { scheduler, operations } = schedulerFixture()
    operations.enabled.mockResolvedValueOnce(false)
    scheduler.schedule(0)
    await vi.advanceTimersByTimeAsync(0)
    expect(operations.publish).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    operations.busy.mockReturnValue(true)
    scheduler.schedule(0)
    await vi.advanceTimersByTimeAsync(0)
    expect(operations.publish).not.toHaveBeenCalled()
    operations.busy.mockReturnValue(false)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(operations.publish).toHaveBeenCalledTimes(1)
  })

  it('queues one additional check for changes during a running push and stops all future retries on close', async () => {
    const { scheduler, operations } = schedulerFixture()
    let release!: () => void
    operations.publish.mockImplementationOnce(async () => {
      await new Promise<void>(resolve => { release = resolve })
      return { published: 0, skipped: 0, errors: [] }
    })
    scheduler.schedule(0)
    await vi.advanceTimersByTimeAsync(0)
    scheduler.schedule(); scheduler.schedule()
    expect(operations.publish).toHaveBeenCalledTimes(1)
    release()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(operations.publish).toHaveBeenCalledTimes(2)
    scheduler.stop()
    await vi.advanceTimersByTimeAsync(600_000)
    expect(operations.publish).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
