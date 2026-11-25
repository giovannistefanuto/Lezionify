import { decryptMobileStatistics, encryptMobileStatistics, type MobileEnvelope } from './mobileStatisticsCrypto'
import type { MobileStatistics } from '../../shared/mobileStatistics'

type Transport = typeof fetch
export type MobileGithubDestination = { owner: string; repo: string; branch: string }
type Options = { destination: MobileGithubDestination; token: string; key: Buffer; snapshot: MobileStatistics }
// GitHub Contents wraps the already base64-encrypted envelope in base64 again.
const limit = 500_000
const segment = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/

function checkDestination({ owner, repo, branch }: MobileGithubDestination) {
  if (![owner, repo, branch].every(part => segment.test(part) && !part.endsWith('.lock') && !part.includes('..')) ||
      (owner.toLowerCase() === 'giovannistefanuto' && repo.toLowerCase() === 'lezionify')) throw new Error('Repository o ramo non valido')
}

export function mobileRawUrl(destination: MobileGithubDestination, streamId: string): string {
  checkDestination(destination)
  if (!/^[a-f0-9]{32}$/.test(streamId)) throw new Error('Identita non valida')
  return `https://raw.githubusercontent.com/${destination.owner}/${destination.repo}/${destination.branch}/statistics/${streamId}.json`
}

/** No tokens or server-provided body text in errors. No automatic overwrite on conflict. */
export async function publishMobileStatistics(options: Options, transport: Transport = fetch): Promise<{ url: string; unchanged: boolean }> {
  const { destination, token, key, snapshot } = options
  checkDestination(destination)
  if (!token || /[\r\n]/.test(token) || key.length !== 32 || snapshot.version !== 1 || !/^[a-f0-9]{32}$/.test(snapshot.streamId) || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new Error('Configurazione non valida')
  const { owner, repo, branch } = destination
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const path = `statistics/${snapshot.streamId}.json`
  const url = mobileRawUrl(destination, snapshot.streamId)
  const request = async (urlToFetch: string, init: RequestInit = {}) => {
    try {
      return await transport(urlToFetch, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000), headers: {
        Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'
      } })
    } catch { throw new Error('Connessione GitHub non riuscita') }
  }
  const readJson = async (response: Response): Promise<Record<string, unknown>> => {
    if (Number(response.headers.get('content-length') ?? 0) > limit) throw new Error('Risposta GitHub troppo grande')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Risposta GitHub non valida')
    const chunks: Uint8Array[] = []; let size = 0
    try {
      for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > limit) { await reader.cancel(); throw new Error('Risposta GitHub troppo grande') }; chunks.push(next.value) }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
      return value as Record<string, unknown>
    } catch { throw new Error('Risposta GitHub non valida') }
  }
  const repoResponse = await request(base)
  if (!repoResponse.ok) throw new Error(`Accesso al repository non riuscito (${repoResponse.status})`)
  const repoInfo = await readJson(repoResponse)
  if (repoInfo.private !== false || repoInfo.archived !== false || String(repoInfo.full_name).toLowerCase() !== `${owner}/${repo}`.toLowerCase()) throw new Error('Serve un repository dati pubblico e non archiviato')
  const existingResponse = await request(`${base}/contents/${path}?ref=${encodeURIComponent(branch)}`)
  let sha: string | undefined
  if (existingResponse.status !== 404) {
    if (!existingResponse.ok) throw new Error(`Lettura GitHub non riuscita (${existingResponse.status})`)
    const existing = await readJson(existingResponse)
    if (existing.type !== 'file' || existing.encoding !== 'base64' || typeof existing.sha !== 'string' || !/^[a-f0-9]{40}$/.test(existing.sha) || typeof existing.content !== 'string') throw new Error('File GitHub non valido')
    sha = existing.sha
    try {
      const text = Buffer.from(existing.content.replace(/\s/g, ''), 'base64').toString('utf8')
      if (Buffer.byteLength(text) > 350_000) throw new Error()
      const envelope = JSON.parse(text) as MobileEnvelope
      const oldText = decryptMobileStatistics(envelope, key)
      const old = JSON.parse(oldText) as MobileStatistics
      if (old.version !== 1 || old.streamId !== snapshot.streamId || !Number.isSafeInteger(old.revision)) throw new Error()
      if (old.revision > snapshot.revision || (old.revision === snapshot.revision && oldText !== JSON.stringify(snapshot))) throw new Error()
      if (old.revision === snapshot.revision) return { url, unchanged: true }
    } catch { throw new Error('Dati remoti incompatibili o revisione non valida') }
  }
  const plaintext = JSON.stringify(snapshot)
  if (Buffer.byteLength(plaintext) > 256_000) throw new Error('Statistiche troppo grandi')
  const encrypted = JSON.stringify(encryptMobileStatistics(plaintext, key))
  const body = JSON.stringify({ message: 'Aggiorna statistiche cifrate', branch, content: Buffer.from(encrypted).toString('base64'), ...(sha ? { sha } : {}) })
  const result = await request(`${base}/contents/${path}`, { method: 'PUT', body })
  if (!result.ok) throw new Error(`Pubblicazione GitHub non riuscita (${result.status})`)
  return { url, unchanged: false }
}
