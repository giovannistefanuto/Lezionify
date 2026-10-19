import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArchiveService } from '../../electron/main/archive'
import { SettingsService } from '../../electron/main/settings'
import { findUsbRecorderDrive, scanAudioFiles } from '../../electron/main/usbDetector'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

describe('USB Recorder Detection and Import', () => {
  let testRoot: string
  let usbMockDir: string
  let service: ArchiveService
  let settingsService: SettingsService

  beforeEach(async () => {
    testRoot = join(tmpdir(), `lezionify-usb-test-${randomUUID()}`)
    usbMockDir = join(tmpdir(), `lezionify-usb-drive-${randomUUID()}`, 'RECORD')
    await mkdir(testRoot, { recursive: true })
    await mkdir(usbMockDir, { recursive: true })

    service = new ArchiveService(testRoot)
    settingsService = new SettingsService(testRoot)
  })

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true })
    await rm(join(usbMockDir, '..'), { recursive: true, force: true })
  })

  it('scansiona file audio supportati ed esclude file non audio', async () => {
    await writeFile(join(usbMockDir, '2026-0920-10-30-00.mp3'), 'fake-mp3-content-1')
    await writeFile(join(usbMockDir, '2026-0921-14-00-00.wav'), 'fake-wav-content-2')
    await writeFile(join(usbMockDir, 'appunti.txt'), 'testo non audio')
    await writeFile(join(usbMockDir, 'foto.jpg'), 'immagine')

    const files = await scanAudioFiles(usbMockDir)
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.name)).toContain('2026-0920-10-30-00.mp3')
    expect(files.map((f) => f.name)).toContain('2026-0921-14-00-00.wav')
  })

  it('rileva il registratore specificando il percorso personalizzato', async () => {
    await writeFile(join(usbMockDir, '2026-0920-10-30-00.mp3'), 'fake-mp3-content')
    const drive = await findUsbRecorderDrive(usbMockDir)

    expect(drive).not.toBeNull()
    expect(drive?.detected).toBe(true)
    expect(drive?.recordPath).toBe(usbMockDir)
    expect(drive?.files).toHaveLength(1)
    expect(drive?.files[0].name).toBe('2026-0920-10-30-00.mp3')
  })

  it('analizza criteri di durata, orario accademico e duplicati in detectUsbRecorder', async () => {
    // 1. Configura un corso con orario: Lunedì (day 1) 10:30-12:30
    await settingsService.saveSettings({
      courses: {
        'SISTEMI': {
          code: 'SISTEMI',
          name: 'Sistemi Distribuiti',
          cfu: 6,
          lectureHours: 42,
          individualStudyHours: 108,
          totalHours: 150,
          startDate: '2026-09-01',
          endDate: '2026-12-31',
          schedule: [
            {
              id: 'slot-1',
              dayOfWeek: 1, // Lunedì
              startTime: '10:30',
              endTime: '12:30',
              room: 'Aula Magna'
            }
          ]
        }
      }
    })

    // 2026-09-21 è un Lunedì (DayOfWeek = 1)
    const audioContent = 'fake-mp3-audio-lecture-content-long'
    const audioPath = join(usbMockDir, '2026-0921-10-35-00.mp3')
    await writeFile(audioPath, audioContent)

    // Esegui detect
    const info = await service.detectUsbRecorder(usbMockDir)
    expect(info.detected).toBe(true)
    expect(info.files).toHaveLength(1)

    const file = info.files[0]
    expect(file.name).toBe('2026-0921-10-35-00.mp3')
    expect(file.alreadyImported).toBe(false)
    expect(file.criteria.isDuplicate).toBe(false)
    // Match con il corso SISTEMI
    expect(file.suggestedCourseCode).toBe('SISTEMI')
    expect(file.matchConfidence).toBeGreaterThanOrEqual(60)

    // 2. Importa il file
    const importResult = await service.importUsbRecorderFiles([
      {
        fullPath: audioPath,
        action: 'import',
        courseCode: file.suggestedCourseCode,
        title: 'Lezione 1'
      }
    ])

    expect(importResult.importedCount).toBe(1)
    expect(importResult.importedLectures[0].courseCode).toBe('SISTEMI')
    expect(importResult.importedLectures[0].title).toBe('Lezione 1')

    // 3. Esegui nuovamente detect: ora il file deve essere marcato come duplicato / già presente
    const infoAfter = await service.detectUsbRecorder(usbMockDir)
    expect(infoAfter.files[0].alreadyImported).toBe(true)
    expect(infoAfter.files[0].criteria.isDuplicate).toBe(true)
    expect(infoAfter.files[0].defaultAction).toBe('discard')
  })

  it('gestisce lo scarto esplicito e l’aggancio automatico della trascrizione TXT', async () => {
    const audioPath = join(usbMockDir, '2026-0922-14-30-00.mp3')
    const txtPath = join(usbMockDir, '2026-0922-14-30-00.txt')
    await writeFile(audioPath, 'fake-mp3-stream-data')
    await writeFile(txtPath, 'Trascrizione grezza della lezione universitaria...')

    const importResult = await service.importUsbRecorderFiles([
      {
        fullPath: audioPath,
        action: 'import',
        courseCode: 'ROBOTICA',
        title: 'Cinematica Diretta'
      }
    ])

    expect(importResult.importedCount).toBe(1)
    const importedLecture = importResult.importedLectures[0]
    expect(importedLecture.status).toBe('transcript-available')
    expect(importedLecture.sourceTranscriptFileName).toBe('2026-0922-14-30-00.txt')

    const transcriptContent = await service.readTranscript(importedLecture.id)
    expect(transcriptContent).toBe('Trascrizione grezza della lezione universitaria...')
  })

  it('salta correttamente elementi marcati come discard', async () => {
    const audioPath1 = join(usbMockDir, 'prova-breve.mp3')
    const audioPath2 = join(usbMockDir, 'lezione-valida.mp3')
    await writeFile(audioPath1, 'audio-1')
    await writeFile(audioPath2, 'audio-2')

    const importResult = await service.importUsbRecorderFiles([
      {
        fullPath: audioPath1,
        action: 'discard',
        courseCode: null
      },
      {
        fullPath: audioPath2,
        action: 'import',
        courseCode: 'ALGORITMI'
      }
    ])

    expect(importResult.importedCount).toBe(1)
    expect(importResult.skippedCount).toBe(1)
    expect(importResult.importedLectures[0].sourceAudioFileName).toBe('lezione-valida.mp3')
  })
})
