import { mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { atomicWrite } from './atomicFile'
import { AsyncMutex } from './asyncMutex'
import { collectPlanExams, emptySessionArchive, planProblems, type SessionArchive, type SessionResult } from '../../shared/sessione'
import { validSessionArchive, validSessionCommand } from './sessioneValidation'

export class SessionStore {
  private readonly mutex = new AsyncMutex()

  constructor(
    private readonly file: string,
    private readonly write = (path: string, content: string) => atomicWrite(path, content, undefined, validSessionArchive)
  ) {}

  private async read(file: string): Promise<SessionArchive> {
    const raw = await readFile(file, 'utf8')
    const data: unknown = JSON.parse(raw)
    if (!validSessionArchive(data)) throw new SyntaxError('Archivio Sessione non valido.')
    return data
  }

  private async load(): Promise<SessionArchive> {
    try {
      return await this.read(this.file)
    } catch (primary) {
      const missing = (primary as NodeJS.ErrnoException).code === 'ENOENT'
      if (!missing && !(primary instanceof SyntaxError)) throw primary
      try {
        return await this.read(`${this.file}.bak`)
      } catch (backup) {
        if (missing && (backup as NodeJS.ErrnoException).code === 'ENOENT') return emptySessionArchive()
        throw new Error('Archivio Sessione illeggibile. Ripristina una copia valida.')
      }
    }
  }

  state(): Promise<SessionArchive> {
    return this.mutex.runExclusive(() => this.load())
  }

  async apply(input: unknown): Promise<SessionResult> {
    if (!validSessionCommand(input)) throw new Error('Dati Sessione non validi.')
    return this.mutex.runExclusive(async () => {
      const archive = await this.load()
      if (archive.commands.includes(input.commandId)) return { status: 'saved', archive }
      if (input.baseRevision !== archive.revision) return { status: 'conflict', archive }
      const revision = archive.revision + 1

      if (input.type === 'save') {
        const existing = archive.sessions.find(item => item.draft.id === input.draft.id)
        if (existing) {
          if (existing.confirmed && !input.draft.plans.some(plan => plan.id === existing.confirmed!.planId))
            throw new Error('Il piano confermato deve essere conservato.')
          existing.draft = input.draft
        } else {
          archive.sessions.push({ draft: input.draft })
        }
      } else {
        const session = archive.sessions.find(item => item.draft.id === input.sessionId)
        const plan = session?.draft.plans.find(item => item.id === input.planId)
        if (!session || !plan) throw new Error('Piano Sessione non trovato.')
        const errors = planProblems(session.draft, plan)
        if (errors.length) throw new Error(errors[0])
        session.confirmed = {
          planId: plan.id, name: plan.name, revision,
          courses: session.draft.courses.map(course => course.code),
          exams: collectPlanExams(session.draft, plan)
        }
        archive.activeSessionId = session.draft.id
      }

      archive.revision = revision
      archive.commands = [...archive.commands.slice(-124), input.commandId]
      if (!validSessionArchive(archive)) throw new Error('Limite dell’archivio Sessione superato.')
      await mkdir(dirname(this.file), { recursive: true })
      await this.write(this.file, JSON.stringify(archive))
      return { status: 'saved', archive }
    })
  }
}
