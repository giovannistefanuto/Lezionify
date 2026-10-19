import * as path from 'node:path'
import { readdir, lstat, mkdir, readFile, unlink, rmdir } from 'node:fs/promises'
import { atomicWrite } from '../atomicFile'
import { parseLocalCalendarDate } from '../../../shared/calendarDate'

export function sanitizeDirName(name: string): string {
  const sanitized = Array.from(name.normalize('NFC')).filter(char => char.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '').slice(0, 70).replace(/[. ]+$/g, '')
  return !sanitized || /^\.+$/.test(sanitized) ? 'Corso' :
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(sanitized) ? `_${sanitized}` :
      sanitized.startsWith('.') ? `_${sanitized}` : sanitized
}

/** Refuse symlinks/junctions for every generated directory and file. */
export async function safeOutputPath(root: string, relative: string, createParents = true): Promise<string> {
  const parts = relative.split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\\'))) {
    throw new Error('Percorso di pubblicazione non valido.')
  }
  let current = root
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index])
    try {
      const info = await lstat(current)
      if (info.isSymbolicLink() || (index < parts.length - 1 && !info.isDirectory())) {
        throw new Error('Percorso di pubblicazione non sicuro.')
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      if (!createParents) return path.join(root, ...parts)
      if (index < parts.length - 1) await mkdir(current)
    }
  }
  return current
}

export async function writePublishedFile(root: string, relative: string, content: string): Promise<void> {
  await atomicWrite(await safeOutputPath(root, relative), content)
}

/** Remove only explicitly owned files; never recursively remove a directory. */
export async function removePublishedFile(root: string, relative: string): Promise<void> {
  const target = await safeOutputPath(root, relative, false)
  try {
    if (!(await lstat(target)).isFile()) throw new Error('File di pubblicazione non valido.')
    await unlink(target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  let parent = path.dirname(target)
  while (parent !== root) {
    try { await rmdir(parent) } catch { break }
    parent = path.dirname(parent)
  }
}

export interface PublicLesson {
  relative: string
  title?: string | null
  english: boolean
}

const link = (relative: string) => './' + relative.split('/').map(encodeURIComponent).join('/')
const escapeLabel = (name: string) => name.replace(/[\\|[\]<>*_`]/g, char => `\\${char}`).replace(/[\r\n]/g, ' ')

async function completeLesson(directory: string): Promise<boolean> {
  try {
    for (const file of ['schema.md', 'trascrizione.txt']) {
      const target = path.join(directory, file)
      const info = await lstat(target)
      if (!info.isFile() || info.isSymbolicLink() || !(await readFile(target, 'utf8')).trim()) return false
    }
    return true
  } catch { return false }
}

async function scanLessons(coursePath: string): Promise<string[]> {
  const lessons: string[] = []
  for (const date of await readdir(coursePath, { withFileTypes: true })) {
    if (!date.isDirectory() || !parseLocalCalendarDate(date.name)) continue
    const directory = path.join(coursePath, date.name)
    if (await completeLesson(directory)) lessons.push(date.name)
    for (const lesson of await readdir(directory, { withFileTypes: true })) {
      if (!lesson.isDirectory() || lesson.name.startsWith('.')) continue
      if (await completeLesson(path.join(directory, lesson.name))) lessons.push(`${date.name}/${lesson.name}`)
    }
  }
  return lessons.sort()
}

export async function hasPublishedLessons(coursePath: string): Promise<boolean> {
  try { return (await scanLessons(coursePath)).length > 0 } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

export async function generateRootReadme(repoPath: string): Promise<string> {
  const rows: string[] = []
  const courses = await readdir(repoPath, { withFileTypes: true })
  for (const course of courses.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!course.isDirectory() || course.name.startsWith('.')) continue
    const lessons = await scanLessons(path.join(repoPath, course.name))
    if (lessons.length) rows.push(`| [${escapeLabel(course.name)}](${link(course.name)}/) | ${lessons.length} |`)
  }
  return '# 📚 Lezionify · Lezioni universitarie\n\n' +
    'Un archivio di lezioni organizzato per corso e **data della lezione**, con dispense in italiano, traduzioni in inglese e trascrizioni grezze.\n\n' +
    '## Come consultare le lezioni\n\n' +
    '1. Scegli un corso nella tabella qui sotto.\n' +
    '2. Cerca la data: le lezioni sono ordinate dalla più vecchia alla più recente.\n' +
    '3. Apri **Italiano** per la dispensa, **English** per la traduzione o **Trascrizione** per il testo grezzo.\n\n' +
    'Puoi leggere i file Markdown direttamente su GitHub, senza installare nulla e senza chiavi API. ' +
    'Per consultarli offline, usa **Code → Download ZIP** oppure clona il repository. ' +
    'Le cartelle usano il formato `AAAA-MM-GG`; se una giornata contiene più lezioni, il titolo distingue i materiali. ' +
    'Una traduzione non ancora disponibile è indicata nella tabella e verrà aggiunta quando sarà generata nell’app.\n\n' +
    '## Corsi\n\n| Corso | Lezioni |\n|---|---|\n' + rows.join('\n') + '\n\n' +
    '## Che cos’è Lezionify\n\n' +
    '[Lezionify](https://github.com/giovannistefanuto/Lezionify) è un progetto personale nato per semplificare lo studio universitario: ' +
    'un’app desktop Electron, React e TypeScript che organizza registrazioni, trascrizioni e dispense in un archivio locale ricercabile. ' +
    'L’autore definisce le idee e le scelte del prodotto e usa strumenti AI come supporto allo sviluppo e alla rielaborazione dei materiali.\n\n' +
    '### Dall’audio alla lettura\n\n' +
    'Registrazione → importazione locale → trascrizione grezza → dispensa italiana → traduzione inglese → sincronizzazione GitHub abilitata dall’autore.\n\n' +
    'Gli audio originali restano nell’archivio locale. Questo repository contiene i testi selezionati dalla sincronizzazione; ' +
    'le chiavi API e le credenziali non vengono pubblicate. ' +
    'La sincronizzazione aggiorna anche le lezioni corrette e le traduzioni aggiunte successivamente.\n\n' +
    '## Usare i materiali per studiare\n\n' +
    'Le dispense e le traduzioni sono elaborate con AI e possono contenere errori: confrontale con la trascrizione, ' +
    'le slide e le fonti del corso, soprattutto per formule e termini tecnici. ' +
    'La trascrizione è il testo grezzo prodotto dal flusso di trascrizione e può a sua volta richiedere correzioni. ' +
    'Questi appunti personali non sostituiscono il materiale ufficiale del docente.\n\n' +
    '## For English readers\n\n' +
    'Choose a course above, then a lesson date. Lessons are listed from oldest to newest. ' +
    'Use **English** to read the translated notes; **Italiano** contains the Italian notes and **Trascrizione** the raw transcript. ' +
    'Translations appear as soon as they are generated in the desktop app. AI-assisted notes should be checked against course sources.\n'
}

export async function generateCourseReadme(repoPath: string, courseName: string, metadata: PublicLesson[] = []): Promise<string> {
  const lessons = await scanLessons(path.join(repoPath, courseName))
  const details = new Map(metadata.map(lesson => [lesson.relative, lesson]))
  const rows: string[] = []
  for (const relative of lessons) {
    const lesson = details.get(relative)
    const english = lesson?.english ?? await nonemptyFile(path.join(repoPath, courseName, relative, 'schema.en.md'))
    const date = relative.slice(0, 10).split('-').reverse().join('/')
    const title = lesson?.title?.trim() || (relative.includes('/') && !/^[a-f0-9]{16}$/.test(relative.split('/')[1]) ? relative.split('/')[1] : 'Lezione')
    rows.push(`| [${date}](${link(relative)}/) | ${escapeLabel(title)} | [Italiano](${link(relative)}/schema.md) | ${english ? `[English](${link(relative)}/schema.en.md)` : 'Non ancora disponibile / Pending'} | [Trascrizione](${link(relative)}/trascrizione.txt) |`)
  }
  return `# ${escapeLabel(courseName)}\n\n[← Tutti i corsi](../README.md)\n\n` +
    '**Lezioni ordinate per data, dalla più vecchia alla più recente.**\n\n' +
    'Scegli la dispensa italiana, la versione inglese o la trascrizione grezza. Più lezioni nella stessa data sono distinte dal titolo.\n\n' +
    '*Lessons are ordered by date, oldest first. Choose Italiano, English or the raw transcript.*\n\n' +
    '| Data | Lezione | Italiano | English | Fonte |\n|---|---|---|---|---|\n' + rows.join('\n') + '\n'
}

async function nonemptyFile(target: string): Promise<boolean> {
  try { const info = await lstat(target); return info.isFile() && !info.isSymbolicLink() && Boolean((await readFile(target, 'utf8')).trim()) } catch { return false }
}
