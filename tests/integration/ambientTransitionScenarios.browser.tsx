import React, { act } from 'react'
import { MusicDialog } from '../../src/components/MusicButton'
import { AMBIENT_SOUNDS } from '../../shared/ambientSounds'
declare const require: any
import type { Root } from 'react-dom/client'
import {
  AmbientSoundProvider,
  useAmbientSound
} from '../../src/components/AmbientSoundContext'

export async function runAmbientTransitionScenarios(root: Root, api: any) {
  const originalSource = localStorage.getItem('lezionify:music-source:v1')
  localStorage.setItem('lezionify:music-source:v1', 'ambient')
  const originalContext = window.AudioContext
  const originalRead = api.readAmbientSound,
    originalStatus = api.ambientSoundStatus
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(message)
  }
  const sources: any[] = []
  let resolveOld!: (bytes: Uint8Array) => void
  let current: ReturnType<typeof useAmbientSound>
  class Audio {
    currentTime = 0
    state = 'running'
    destination = {}
    resume = async () => {}
    close = async () => {}
    decodeAudioData = async () => ({ duration: 2 })
    createGain() {
      return {
        gain: {
          value: 1,
          cancelScheduledValues() {},
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          setTargetAtTime() {}
        },
        connect() {},
        disconnect() {}
      }
    }
    createBufferSource() {
      const source = {
        buffer: null,
        loop: false,
        stopped: false,
        onended: null,
        connect() {},
        disconnect() {},
        start() {},
        stop(time?: number) {
          if (time === undefined) this.stopped = true
        }
      }
      sources.push(source)
      return source
    }
  }
  function Capture() {
    current = useAmbientSound()
    return <MusicDialog onClose={() => {}} />
  }
  window.AudioContext = Audio as any
  api.ambientSoundStatus = async () => ({ installed: true, sounds: AMBIENT_SOUNDS.map(sound => ({ ...sound, installed: true })) })
  api.readAmbientSound = async (id: string) =>
    ['rain', 'stream'].includes(id)
      ? new Promise<Uint8Array>((resolve) => {
          resolveOld = resolve
        })
      : new Uint8Array([1])
  try {
    await act(async () =>
      root.render(
        <AmbientSoundProvider>
          <Capture />
        </AmbientSoundProvider>
      )
    )
    let first!: Promise<void>
    await act(async () => {
      first = current.play('rain')
    })
    await act(async () => current.play('waves'))
    await act(async () => {
      resolveOld(new Uint8Array([1]))
      await first
    })
    check(
      current!.activeSoundId === 'waves' && sources.length === 1,
      'Late buffer replaced the most recent selection'
    )
    const content = document.querySelector<HTMLElement>('.music-content')!
    content.scrollTop = content.scrollHeight
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
    const playerBounds = document.querySelector('.ambient-player-bar')!.getBoundingClientRect()
    const contentBounds = content.getBoundingClientRect()
    check(playerBounds.top >= contentBounds.top - 1 && playerBounds.bottom <= contentBounds.bottom + 1, 'Player pause/volume hidden after catalog scrolling')
    check(document.querySelector('.ambient-options summary') && document.querySelector('.ambient-random-button'), 'Secondary music options or compact random missing')
    await require('electron').ipcRenderer.invoke('capture-video-import', 'oct22-player-scrolled')
    content.scrollTop = 0
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme)
      await require('electron').ipcRenderer.invoke('capture-video-import', `sounds-${theme}`)
    }
    await act(async () => current.pause())
    check(
      !current!.isPlaying && sources.every((source) => source.stopped),
      'Pause did not stop all transition voices'
    )
    await act(async () => current.play('waves'))
    await act(async () =>
      window.dispatchEvent(
        new CustomEvent('lezionify:lecture-playback', {
          detail: { playing: true }
        })
      )
    )
    check(
      !current!.isPlaying && current!.pausedByLectureAudio,
      'Lecture did not pause the ambient transition'
    )
    await act(async () =>
      window.dispatchEvent(
        new CustomEvent('lezionify:lecture-playback', {
          detail: { playing: false }
        })
      )
    )
    check(
      current!.isPlaying && current!.activeSoundId === 'waves',
      'Lecture pause did not restore the selected sound'
    )
    // A pause while reading another sound invalidates the entire pending start.
    await act(async () => {
      first = current.play('stream')
      current.pause()
    })
    await act(async () => {
      resolveOld(new Uint8Array([1]))
      await first
    })
    check(
      !current!.isPlaying,
      'A pending buffer restarted playback after pause'
    )
    await act(async () => root.render(null))
    check(
      sources.every((source) => source.stopped),
      'Unmount left an ambient voice running'
    )
  } finally {
    await act(async () => root.render(null))
    if (originalSource === null) localStorage.removeItem('lezionify:music-source:v1'); else localStorage.setItem('lezionify:music-source:v1', originalSource)
    window.AudioContext = originalContext
    api.readAmbientSound = originalRead
    api.ambientSoundStatus = originalStatus
  }
}
