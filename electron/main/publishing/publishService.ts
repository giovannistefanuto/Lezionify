import * as path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { CourseDefinition, Lecture, PublishingSettings, PublishResult, PublishingStatus } from '../../../shared/archive'
import { parseLocalCalendarDate } from '../../../shared/calendarDate'
import { PublishState, type PublishedLectureEntry } from './publishState'
import { PublishGitClient, PublishingError, normalizeRepoUrl, validateBranch, type PublishingGit, type GitClientOptions } from './publishGitClient'
import { generateCourseReadme, generateRootReadme, hasPublishedLessons, removePublishedFile, sanitizeDirName, writePublishedFile } from './readmeGenerator'
import { publicationPaths } from './publicationLayout'

export interface PublishServiceDeps {
  listLectures: () => Promise<Lecture[]>
  getCourses: () => Promise<Record<string, CourseDefinition>>
  getLegacyCourseCodes?: () => Promise<string[] | undefined>
  getSettings: () => Promise<PublishingSettings | undefined>
  storage: {
    readTranscript: (fileName: string) => Promise<string | null>
    readMarkdown: (fileName: string) => Promise<string | null>
    readMarkdownEn: (italianFileName: string) => Promise<string | null>
  }
  createGitClient?: (options: GitClientOptions) => PublishingGit
  state?: PublishState
}

export const isCoursePublicationEnabled = (code: string | null, courses: Record<string, CourseDefinition>, legacy?: string[]) => Boolean(code && (courses[code]?.publishToGithub ?? (legacy ? legacy.includes(code) : true)))

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const canonicalText = (value: string) => value.replace(/\r\n?/g, '\n')
export const gitBlobHash = (value: string) => createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex')
const destination = (settings: PublishingSettings) => digest(`${normalizeRepoUrl(settings.repoUrl)}#${settings.branch}`)
const sourceFile = (value: string | null) => Boolean(value && value !== '.' && value !== '..' &&
  !/[\\/]/.test(value) && !Array.from(value).some(char => char.charCodeAt(0) < 32))
const publishable = (lecture: Lecture) => Boolean(sourceFile(lecture.transcriptFileName) && sourceFile(lecture.markdownFileName) &&
  lecture.courseCode?.trim() && lecture.id && lecture.recordedAt &&
  /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.test(lecture.recordedAt) && parseLocalCalendarDate(lecture.recordedAt.slice(0, 10)))

interface PreparedLecture {
  lecture: Lecture
  relative: string
  transcript: string
  markdown: string
  english: string | null
  contentHash: string
}

export class PublishService {
  private readonly state: PublishState
  private publishing = false
  private phase: NonNullable<PublishingStatus['phase']> = 'idle'
  private connection: NonNullable<PublishingStatus['connection']> = 'unknown'
  private remotePending = new Set<string>()

  constructor(private readonly libraryDir: string, private readonly deps: PublishServiceDeps) {
    this.state = deps.state ?? new PublishState(libraryDir)
  }

  initialize(): Promise<void> { return this.state.load() }

  async getStatus(): Promise<PublishingStatus> {
    try { return await this.readStatus() } catch {
      throw new PublishingError('Impossibile leggere lo stato di pubblicazione. Controlla i dati locali e riprova.')
    }
  }

  private async readStatus(): Promise<PublishingStatus> {
    await this.initialize()
    const settings = await this.deps.getSettings()
    let target: string | null = null
    try {
      if (settings?.repoUrl) { validateBranch(settings.branch); target = destination(settings) }
    } catch { /* Invalid legacy configuration remains unconfigured. */ }
    const snapshot = target ? this.state.snapshot(target) : null
    const courses = await this.deps.getCourses()
    let pending = 0
    const legacy = await this.deps.getLegacyCourseCodes?.()
    const lectures = (await this.deps.listLectures()).filter(lecture => publishable(lecture) && isCoursePublicationEnabled(lecture.courseCode, courses, legacy))
    const paths = publicationPaths(lectures, courses)
    for (const lecture of lectures) {
      try {
        const prepared = await this.prepare(lecture, paths.get(lecture.id)!)
        if (!prepared || this.remotePending.has(lecture.id) || snapshot?.publishedLectures[lecture.id]?.contentHash !== prepared.contentHash) pending++
      } catch { pending++ }
    }
    return {
      configured: Boolean(target && settings?.githubToken), enabled: settings?.enabled === true,
      unpublishedCount: pending,
      lastPublishAt: snapshot?.lastPublishAt ?? null, lastError: snapshot?.lastError ?? null,
      lastCheckedAt: snapshot?.lastCheckedAt ?? null,
      phase: settings?.enabled ? this.phase : 'idle',
      connection: settings?.enabled ? this.connection : 'unknown'
    }
  }

  private async prepare(lecture: Lecture, relative: string): Promise<PreparedLecture | null> {
    const transcript = await this.deps.storage.readTranscript(lecture.transcriptFileName!)
    const markdown = await this.deps.storage.readMarkdown(lecture.markdownFileName!)
    if (!transcript?.trim() || !markdown?.trim()) return null
    let english: string | null = null
    if (lecture.markdownEnFileName) {
      if (!sourceFile(lecture.markdownEnFileName)) throw new PublishingError('Nome del file inglese non valido.')
      const translation = await this.deps.storage.readMarkdownEn(lecture.markdownFileName!)
      if (!translation?.trim()) throw new PublishingError('Una traduzione inglese risulta presente ma non è leggibile. Ripristina il file locale e riprova.')
      english = canonicalText(translation)
    }
    const raw = canonicalText(transcript)
    const notes = canonicalText(markdown)
    return { lecture, relative, transcript: raw, markdown: notes, english,
      contentHash: digest(JSON.stringify([relative, lecture.title ?? null, raw, notes, english])) }
  }

  private async assertConsent(lectures: Lecture[], target: string): Promise<void> {
    const settings = await this.deps.getSettings()
    const courses = await this.deps.getCourses()
    const legacy = await this.deps.getLegacyCourseCodes?.()
    if (!settings?.enabled || !settings.repoUrl || destination(settings) !== target || lectures.some(lecture => !isCoursePublicationEnabled(lecture.courseCode, courses, legacy))) {
      throw new PublishingError('Pubblicazione interrotta: configurazione o consenso del corso modificati. Le fonti locali sono conservate.')
    }
  }

  async publishNew(): Promise<PublishResult> {
    if (this.publishing) return { published: 0, skipped: 0, errors: ['Pubblicazione già in corso.'] }
    this.publishing = true
    let target: string | undefined
    const result: PublishResult = { published: 0, skipped: 0, errors: [] }
    try {
      await this.initialize()
      const settings = await this.deps.getSettings()
      if (!settings?.enabled) { this.phase = 'idle'; return result }
      if (!settings.githubToken || !settings.repoUrl) throw new PublishingError('Pubblicazione non configurata.')
      validateBranch(settings.branch)
      target = destination(settings)
      this.phase = 'checking'
      const snapshot = this.state.snapshot(target)
      const courses = await this.deps.getCourses()
      const legacy = await this.deps.getLegacyCourseCodes?.()
      const lectures = (await this.deps.listLectures()).filter(lecture => publishable(lecture) && isCoursePublicationEnabled(lecture.courseCode, courses, legacy))
      const client = (this.deps.createGitClient ?? (options => new PublishGitClient(options)))({
        repoUrl: settings.repoUrl, githubToken: settings.githubToken, branch: settings.branch,
        localPath: path.join(this.libraryDir, 'publish-repo', target)
      })
      if (!await client.checkGitAvailable()) throw new PublishingError('Git non trovato nel PATH. Installa Git per pubblicare le lezioni.')
      await client.ensureRepo()
      this.connection = 'online'
      const remoteFiles = await client.getRemoteFileHashes()
      const root = client.getLocalPath()
      const paths = publicationPaths(lectures, courses)
      const files: string[] = []
      const prepared: PreparedLecture[] = []
      const changed: PreparedLecture[] = []
      for (const lecture of lectures) {
        let source: PreparedLecture | null
        try {
          source = await this.prepare(lecture, paths.get(lecture.id)!)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOSPC') throw error
          result.skipped++
          result.errors.push(error instanceof PublishingError ? error.message : 'Una lezione è stata saltata: impossibile leggere le fonti locali.')
          continue
        }
        if (!source) {
          result.skipped++
          result.errors.push('Una lezione è stata saltata: trascrizione o dispensa vuota o mancante.')
          continue
        }
        prepared.push(source)
        if (snapshot.publishedLectures[lecture.id]?.contentHash !== source.contentHash ||
          remoteFiles[`${source.relative}/trascrizione.txt`] !== gitBlobHash(source.transcript) ||
          remoteFiles[`${source.relative}/schema.md`] !== gitBlobHash(source.markdown) ||
          (source.english !== null && remoteFiles[`${source.relative}/schema.en.md`] !== gitBlobHash(source.english)) ||
          (source.english === null && Boolean(remoteFiles[`${source.relative}/schema.en.md`]))) changed.push(source)
      }
      this.remotePending = new Set(changed.map(source => source.lecture.id))
      if (!prepared.length) {
        if (result.errors.length) await this.state.recordError(target, result.errors[0])
        else await this.state.recordCheck(target)
        this.phase = result.errors.length ? 'error' : 'synced'
        return result
      }
      this.phase = 'publishing'
      await this.assertConsent(prepared.map(source => source.lecture), target)
      const removed = new Set<string>()
      const previousCourses = new Set<string>()
      const currentPaths = new Set(prepared.map(source => source.relative.toLocaleLowerCase('en-US')))
      // Retire only exact paths owned by a checkpoint or by the previous deterministic layout.
      for (const source of prepared) {
        const code = source.lecture.courseCode!
        const legacy = `${sanitizeDirName(courses[code]?.name || code)}--${digest(code).slice(0, 12)}/${source.lecture.recordedAt!.slice(0, 10)}/${digest(source.lecture.id).slice(0, 16)}`
        const previous = snapshot.publishedLectures[source.lecture.id]?.coursePath
        for (const old of new Set([legacy, ...(previous ? [previous] : [])])) {
          if (currentPaths.has(old.toLocaleLowerCase('en-US'))) continue
          const parts = old.split('/')
          if ((parts.length !== 2 && parts.length !== 3) || !parseLocalCalendarDate(parts[1]) ||
            parts.some(part => sanitizeDirName(part) !== part || part.startsWith('.'))) {
            throw new PublishingError('Percorso del checkpoint non valido. Controlla lo stato di pubblicazione locale.')
          }
          for (const name of ['schema.md', 'trascrizione.txt', 'schema.en.md']) removed.add(`${old}/${name}`)
          previousCourses.add(parts[0])
        }
        if (source.english === null && snapshot.publishedLectures[source.lecture.id]) removed.add(`${source.relative}/schema.en.md`)
      }
      // Stage the complete allowlist to recover safely from an interrupted earlier stage.
      for (const source of prepared) {
        await writePublishedFile(root, `${source.relative}/trascrizione.txt`, source.transcript)
        await writePublishedFile(root, `${source.relative}/schema.md`, source.markdown)
        files.push(`${source.relative}/trascrizione.txt`, `${source.relative}/schema.md`)
        if (source.english !== null) {
          await writePublishedFile(root, `${source.relative}/schema.en.md`, source.english)
          files.push(`${source.relative}/schema.en.md`)
        }
      }
      for (const file of removed) await removePublishedFile(root, file)
      const currentCourses = new Set(prepared.map(source => source.relative.split('/')[0]))
      for (const course of previousCourses) {
        if (!currentCourses.has(course) && !await hasPublishedLessons(path.join(root, course))) {
          const file = `${course}/README.md`
          await removePublishedFile(root, file)
          removed.add(file)
        }
      }
      for (const course of currentCourses) {
        const metadata = prepared.filter(source => source.relative.split('/')[0] === course).map(source => ({
          relative: source.relative.slice(course.length + 1), title: source.lecture.title, english: source.english !== null
        }))
        await writePublishedFile(root, `${course}/README.md`, await generateCourseReadme(root, course, metadata))
        files.push(`${course}/README.md`)
      }
      const indexedLessons = new Set(prepared.map(source => source.relative))
      for (const file of Object.keys(remoteFiles)) {
        if (file.endsWith('/schema.md')) {
          const relative = file.slice(0, -'/schema.md'.length)
          if (remoteFiles[`${relative}/trascrizione.txt`]) indexedLessons.add(relative)
        }
      }
      await writePublishedFile(root, 'README.md', await generateRootReadme(root, indexedLessons))
      await writePublishedFile(root, '.gitignore', '*.tmp\n*.bak\nThumbs.db\n.DS_Store\n')
      files.push('README.md', '.gitignore')
      const docsChanged = (await Promise.all(files.filter(file => file.endsWith('README.md') || file === '.gitignore')
        .map(async file => remoteFiles[file] !== gitBlobHash(await readFile(path.join(root, file), 'utf8'))))).some(Boolean)
      if (!changed.length && !docsChanged && ![...removed].some(file => Boolean(remoteFiles[file]))) {
        await this.state.recordCheck(target)
        if (result.errors.length) await this.state.recordError(target, result.errors[0])
        this.phase = result.errors.length ? 'error' : 'synced'
        return result
      }
      await this.assertConsent(prepared.map(source => source.lecture), target)
      await client.assertPendingFilesAllowed?.(files, [...removed])
      await client.addFiles(files, [...removed])
      await client.commit(`Sincronizzate ${changed.length} lezioni con Lezionify`)
      // Always push, including unchanged files after a failed push/crash.
      await this.assertConsent(prepared.map(source => source.lecture), target)
      const hash = await client.push()
      if (!/^[a-f0-9]{7,64}$/i.test(hash)) throw new PublishingError('Impossibile verificare il commit pubblicato.')
      const entries: Record<string, PublishedLectureEntry> = {}
      for (const source of prepared) {
        entries[source.lecture.id] = { publishedAt: snapshot.publishedLectures[source.lecture.id]?.contentHash === source.contentHash
          ? snapshot.publishedLectures[source.lecture.id].publishedAt : new Date().toISOString(),
          commitHash: hash, coursePath: source.relative, contentHash: source.contentHash }
      }
      await this.state.recordSuccess(target, entries)
      this.remotePending.clear()
      if (result.errors.length) await this.state.recordError(target, result.errors[0])
      this.phase = result.errors.length ? 'error' : 'synced'
      result.published = changed.length
      result.commitHash = hash
      return result
    } catch (error) {
      this.phase = 'error'
      if (error instanceof PublishingError && error.kind === 'network') this.connection = 'offline'
      const message = error instanceof PublishingError ? error.message :
        'Pubblicazione non completata. Controlla il disco e riprova; le lezioni restano da pubblicare.'
      result.errors.push(message)
      if (target) await this.state.recordError(target, message).catch(() => {})
      return result
    } finally { this.publishing = false }
  }
}
