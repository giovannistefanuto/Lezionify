import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rename, rm, lstat } from 'node:fs/promises'
import * as path from 'node:path'

const execute = promisify(execFile)
export type GitRunner = (args: string[], options: {
  cwd: string; timeout: number; env: NodeJS.ProcessEnv
}) => Promise<{ stdout: string; stderr: string }>

export interface GitClientOptions {
  repoUrl: string
  githubToken: string
  branch: string
  localPath: string
}

export interface PublishingGit {
  checkGitAvailable(): Promise<boolean>
  ensureRepo(): Promise<void>
  getLocalPath(): string
  addFiles(files: string[], removedFiles?: string[]): Promise<void>
  commit(message: string): Promise<string | null>
  push(): Promise<string>
  getRemoteFileHashes(): Promise<Record<string, string>>
  assertPendingFilesAllowed?(files: string[], removedFiles?: string[]): Promise<void>
}

export class PublishingError extends Error {
  constructor(message: string, readonly kind: 'local' | 'network' | 'authentication' | 'conflict' = 'local') {
    super(message)
  }
}

export function normalizeRepoUrl(value: string): string {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/.exec(value.trim())
  if (!match || match[2] === '.' || match[2] === '..') {
    throw new PublishingError('URL non valido: usa https://github.com/proprietario/repository.')
  }
  return `https://github.com/${match[1].toLowerCase()}/${match[2].toLowerCase()}.git`
}

export function validateBranch(value: string): void {
  if (!value || value.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(value) ||
    value.includes('..') || value.includes('//') || value.endsWith('.') || value.endsWith('/') ||
    value.split('/').some(part => part.startsWith('.') || part.endsWith('.lock'))) {
    throw new PublishingError('Branch Git non valido.')
  }
}

export class PublishGitClient implements PublishingGit {
  private readonly options: GitClientOptions
  private readonly runner: GitRunner
  private remoteBranchExists = false

  constructor(options: GitClientOptions, runner?: GitRunner) {
    this.options = { ...options, repoUrl: normalizeRepoUrl(options.repoUrl) }
    validateBranch(options.branch)
    this.runner = runner ?? (async (args, opts) => execute('git', args, {
      ...opts, windowsHide: true, maxBuffer: 10 * 1024 * 1024
    }))
  }

  getLocalPath(): string { return this.options.localPath }

  async checkGitAvailable(): Promise<boolean> {
    // The clone does not exist at first startup; probing from it also produces ENOENT.
    try { await this.run(['--version'], process.cwd()); return true } catch { return false }
  }

  async ensureRepo(): Promise<void> {
    const { localPath, repoUrl, branch } = this.options
    await mkdir(path.dirname(localPath), { recursive: true })
    let exists = false
    try {
      const info = await lstat(localPath)
      if (!info.isDirectory() || info.isSymbolicLink()) throw new PublishingError('Clone locale non valido.')
      exists = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (!exists) {
      const temporary = await mkdtemp(path.join(path.dirname(localPath), '.clone-'))
      try {
        await this.run(['clone', '--no-checkout', '--', repoUrl, temporary], path.dirname(localPath), true)
        const refs = (await this.run(['for-each-ref', '--format=%(refname)', 'refs/remotes/origin'], temporary)).stdout
        if (refs.split(/\r?\n/).includes(`refs/remotes/origin/${branch}`)) {
          await this.run(['checkout', '-B', branch, `refs/remotes/origin/${branch}`], temporary)
        } else if (!refs.trim()) {
          await this.run(['checkout', '--orphan', branch], temporary)
        } else {
          throw new PublishingError('Il branch configurato non esiste nel repository GitHub.')
        }
        await rename(temporary, localPath)
      } finally {
        await rm(temporary, { recursive: true, force: true })
      }
    } else {
      const remote = (await this.run(['remote', 'get-url', 'origin'])).stdout.trim()
      if (remote !== repoUrl) throw new PublishingError('Il clone locale appartiene a un altro repository.')
      const currentBranch = (await this.run(['symbolic-ref', '--short', 'HEAD'])).stdout.trim()
      if (currentBranch !== branch) throw new PublishingError('Il clone locale usa un altro branch.')
    }
    // Fail closed on a failed fetch/rebase; never stage against stale remote data.
    await this.synchronize()
  }

  private async synchronize(): Promise<void> {
    await this.run(['fetch', '--prune', 'origin'], undefined, true)
    const refs = (await this.run(['for-each-ref', '--format=%(refname)', 'refs/remotes/origin'])).stdout
    const remoteBranch = `refs/remotes/origin/${this.options.branch}`
    this.remoteBranchExists = refs.split(/\r?\n/).includes(remoteBranch)
    if (refs.split(/\r?\n/).includes(remoteBranch)) {
      try { await this.run(['rebase', '--autostash', remoteBranch]) } catch {
        await this.run(['rebase', '--abort']).catch(() => {})
        throw new PublishingError('Conflitto Git: controlla il clone locale prima di riprovare.')
      }
      if ((await this.run(['diff', '--name-only', '--diff-filter=U'])).stdout.trim()) {
        throw new PublishingError('Conflitto Git: controlla il clone locale prima di riprovare.')
      }
    } else if (refs.trim()) {
      throw new PublishingError('Il branch configurato non esiste nel repository GitHub.')
    }
  }

  async getRemoteFileHashes(): Promise<Record<string, string>> {
    if (!this.remoteBranchExists) return {}
    const tree = (await this.run(['ls-tree', '-r', '-z', `refs/remotes/origin/${this.options.branch}`])).stdout
    const files: Record<string, string> = {}
    for (const entry of tree.split('\0').filter(Boolean)) {
      const match = /^(100644|100755) blob ([a-f0-9]{40,64})\t(.+)$/.exec(entry)
      if (match) files[match[3]] = match[2]
    }
    return files
  }

  async addFiles(files: string[], removedFiles: string[] = []): Promise<void> {
    // Explicit allowlist: never add unrelated files or audio in the clone.
    const staged = (await this.run(['diff', '--cached', '--name-only', '-z'])).stdout.split('\0').filter(Boolean)
    if (staged.some(file => !files.includes(file) && !removedFiles.includes(file))) {
      throw new PublishingError('Il clone contiene file già in stage non appartenenti alla pubblicazione.')
    }
    // ignore-unmatch makes migration retryable after a local commit whose push failed.
    for (let offset = 0; offset < removedFiles.length; offset += 50) {
      await this.run(['rm', '--ignore-unmatch', '--', ...removedFiles.slice(offset, offset + 50)])
    }
    // Keep Windows argv comfortably below its length limit for large libraries.
    for (let offset = 0; offset < files.length; offset += 50) {
      await this.run(['add', '--', ...files.slice(offset, offset + 50)])
    }
  }

  /** A failed earlier push may contain a now-disabled course in local commits. */
  async assertPendingFilesAllowed(files: string[], removedFiles: string[] = []): Promise<void> {
    let pending: string[]
    if (this.remoteBranchExists) {
      pending = (await this.run(['diff', '--name-only', '-z', `refs/remotes/origin/${this.options.branch}...HEAD`])).stdout.split('\0').filter(Boolean)
    } else {
      const heads = (await this.run(['for-each-ref', '--format=%(refname)', `refs/heads/${this.options.branch}`])).stdout.trim()
      pending = heads ? (await this.run(['ls-tree', '-r', '--name-only', '-z', 'HEAD'])).stdout.split('\0').filter(Boolean) : []
    }
    const allowed = new Set([...files, ...removedFiles])
    if (pending.some(file => !allowed.has(file))) throw new PublishingError('Pubblicazione sospesa: il clone contiene modifiche non autorizzate dalla selezione attuale dei corsi. Controlla i consensi dei corsi prima di riprovare.')
  }

  async commit(message: string): Promise<string | null> {
    const changed = (await this.run(['diff', '--cached', '--name-only'])).stdout.trim()
    if (!changed) return null
    await this.run(['commit', '-m', message])
    return (await this.run(['rev-parse', 'HEAD'])).stdout.trim()
  }

  async push(): Promise<string> {
    try {
      await this.run(['push', this.options.repoUrl, `HEAD:refs/heads/${this.options.branch}`], undefined, true)
    } catch (error) {
      if (!(error instanceof PublishingError) || error.message !== 'Push Git rifiutato: il repository remoto è cambiato.') throw error
      await this.synchronize()
      await this.run(['push', this.options.repoUrl, `HEAD:refs/heads/${this.options.branch}`], undefined, true)
    }
    // Rebase may change the hash; return the commit actually pushed.
    return (await this.run(['rev-parse', 'HEAD'])).stdout.trim()
  }

  private async run(args: string[], cwd = this.options.localPath, network = false): Promise<{ stdout: string; stderr: string }> {
    // Runtime configuration only. No PAT in URLs, argv, .git/config or credential helpers.
    const env = { ...process.env }
    for (const key of Object.keys(env)) {
      if (key.startsWith('GIT_') || key.startsWith('GCM_')) delete env[key]
    }
    const configuration = [
      ['credential.helper', ''], ['core.hooksPath', path.join(path.dirname(this.options.localPath), '.disabled-hooks')],
      ['commit.gpgSign', 'false'], ['user.name', 'Lezionify'], ['user.email', 'lezionify@local'],
      ['core.longpaths', 'true'],
      ['core.autocrlf', 'false'],
      ['http.followRedirects', 'false'], ['http.sslVerify', 'true'],
      ['http.extraHeader', '']
    ]
    if (network) configuration.push([
      `http.${this.options.repoUrl}.extraHeader`,
      `Authorization: Basic ${Buffer.from(`x-access-token:${this.options.githubToken}`).toString('base64')}`
    ])
    configuration.forEach(([key, value], index) => {
      env[`GIT_CONFIG_KEY_${index}`] = key
      env[`GIT_CONFIG_VALUE_${index}`] = value
    })
    Object.assign(env, { GIT_CONFIG_COUNT: String(configuration.length), GIT_TERMINAL_PROMPT: '0',
      GCM_INTERACTIVE: 'Never', GIT_PAGER: '', GIT_EDITOR: 'true', GIT_LITERAL_PATHSPECS: '1' })
    try {
      return await this.runner(args, { cwd, timeout: network ? 120_000 : 30_000, env })
    } catch (error) {
      // Provider output can contain credentials and local paths. Never expose it.
      const stderr = typeof (error as { stderr?: unknown }).stderr === 'string'
        ? (error as { stderr: string }).stderr : ''
      if (args[0] === 'push' && /non-fast-forward|fetch first|\[rejected\]/i.test(stderr)) {
        throw new PublishingError('Push Git rifiutato: il repository remoto è cambiato.')
      }
      if (/authentication failed|invalid username|password authentication|permission.*denied|403|401|could not read Username/i.test(stderr)) {
        throw new PublishingError('GitHub ha rifiutato l’accesso. Verifica il token e il permesso Contents in lettura e scrittura.', 'authentication')
      }
      if (/could not resolve|failed to connect|timed? out|network.*unreachable|recv failure|unable to access|connection.*(reset|refused)|SSL|TLS/i.test(stderr) ||
        (error as { killed?: boolean }).killed) {
        throw new PublishingError('GitHub non è raggiungibile. La sincronizzazione riprenderà automaticamente quando la connessione sarà disponibile.', 'network')
      }
      throw new PublishingError('Operazione Git fallita. Controlla rete, repository e permessi del token.')
    }
  }
}
