import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArchiveService } from '../../electron/main/archive'
import { logger } from '../../electron/main/logger'
import { SettingsService } from '../../electron/main/settings'
import { scanAudioFiles } from '../../electron/main/usbDetector'

let root = ''
afterEach(async () => { vi.restoreAllMocks(); if (root) await rm(root, { recursive: true, force: true }) })
it('requires confirmation before importing and preserves the chosen course and time', async () => {
  root = await mkdtemp(join(tmpdir(), 'manual-audio-'))
  const audio = join(root, 'recording.mp3')
  await writeFile(audio, 'synthetic audio')
  const archive = new ArchiveService(join(root, 'library'), undefined, true)
  await archive.initialize()
  const queue = vi.spyOn(archive, 'queueAutomaticLectureProcessing').mockImplementation(() => {})
  const settings = new SettingsService(join(root, 'library'))
  await settings.saveSettings({ courses: { TEST: { code: 'TEST', name: 'Corso sintetico', cfu: 6, lectureHours: 40, individualStudyHours: 100, totalHours: 140, schedule: [] } } })
  const selection = await archive.prepareAudioImport([audio])
  expect(await archive.listLectures()).toHaveLength(0)
  expect(queue).not.toHaveBeenCalled()
  const result = await archive.confirmAudioImport(selection.token, [{ id: selection.files[0].id, courseCode: 'TEST', recordedAt: '2026-11-24T10:30' }])
  expect(result.imported[0].recordedAt).toBe('2026-11-24T10:30')
  expect(result.imported[0].courseCode).toBe('TEST')
  expect(queue).toHaveBeenCalledExactlyOnceWith([result.imported[0].id])
  archive.destroy()
  await expect(archive.confirmAudioImport(selection.token, [])).rejects.toThrow()
})
it('does not emit routine scan timing logs repeatedly', async () => {
  root = await mkdtemp(join(tmpdir(), 'scan-log-'))
  const log = vi.spyOn(logger, 'info')
  await scanAudioFiles(root)
  await scanAudioFiles(root)
  expect(log.mock.calls.filter(call => call[1] === 'Tempi scansione locale (ms).')).toHaveLength(0)
})
