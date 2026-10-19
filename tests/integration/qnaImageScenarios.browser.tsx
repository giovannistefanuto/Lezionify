import React, { act } from 'react'
import type { Root } from 'react-dom/client'
import { useQna } from '../../src/hooks/useQna'
import { QnaSidebar } from '../../src/components/QnaSidebar'
import { QnaImageLibrary } from '../../src/components/QnaImageLibrary'

export async function runQnaImageScenarios(root: Root, api: any) {
  const check = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const previous = { ...api }
  let state!: ReturnType<typeof useQna>
  let persisted: any[] = []
  const images = new Map<string, any>()
  const requests: any[] = []
  const deletions: any[] = []
  let failSave = false
  let failDelete = false
  const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 3
  const png = canvas.toDataURL('image/png').split(',')[1]
  api.loadQnaThreads = async () => persisted
  api.saveQnaThreads = async (_id: string, threads: any[]) => { if (failSave) throw new Error('synthetic storage failure'); persisted = structuredClone(threads) }
  api.onQnaChunk = () => () => {}
  api.onQnaStatus = () => () => {}
  api.saveQnaImage = async (lectureId: string, threadId: string, input: any) => {
    const image = { id: crypto.randomUUID(), lectureId, threadId, page: input.page, createdAt: '2026-10-15T10:00:00Z', day: input.page === 9 ? '2026-10-14' : '2026-10-15', width: 4, height: 3, byteSize: png.length, sha256: 'a'.repeat(64) }
    images.set(image.id, { image, data: input.data }); return image
  }
  api.readQnaImage = async (id: string) => { if (!images.has(id)) throw new Error('removed'); return images.get(id) }
  api.listQnaImages = async () => [...images.values()].map(value => value.image)
  api.deleteQnaImages = async (selection: any) => {
    if (failDelete) throw new Error('Cancellazione non riuscita.')
    deletions.push(selection)
    let count = 0
    for (const [id, value] of images) if (selection.all || selection.id === id || selection.day === value.image.day) { images.delete(id); count++ }
    return count
  }
  api.generateQnaResponse = async (_owner: string, thread: any, full: boolean) => { requests.push({ thread: structuredClone(thread), full }); return { success: true, text: 'Synthetic answer' } }
  function Harness() {
    state = useQna('image-test-lecture')
    return <div><div style={{ height: 500 }}><QnaSidebar threads={state.threads} activeThreadId={state.activeThreadId} setActiveThreadId={state.setActiveThreadId} isGenerating={state.isGeneratingQna || state.isAttachingImages} error={state.qnaError} onSendMessage={state.sendMessage} onDeleteThread={state.deleteThread} onRemoveImage={state.removeImage} onClose={() => {}} /></div><QnaImageLibrary /></div>
  }
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)) })
  const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === label)!
  try {
    await act(async () => root.render(<Harness />)); await settle()
    let id = ''
    await act(async () => { id = await state.createThread('Synthetic quote', '', null) })
    await act(async () => state.attachImages(id, [{ page: 1, data: png }, { page: 2, data: png }]))
    await settle()
    check(persisted[0].attachmentIds.length === 2 && requests.length === 0, 'Preparing images must persist them without an AI call')
    check(document.querySelectorAll('.qna-image-preview img').length === 2, 'Active images need previews before sending')
    await act(async () => state.sendMessage(id, 'First question', true))
    await act(async () => state.sendMessage(id, 'Follow-up', false))
    check(requests.length === 2 && requests.every(request => request.thread.attachmentIds.length === 2) && requests[0].full && !requests[1].full, 'Follow-ups must keep selected images and preserve the full-context choice')
    check(persisted[0].messages[0].attachmentIds.length === 2, 'Each question must retain the identities of its original attachments')
    const removed = persisted[0].attachmentIds[0]
    await act(async () => state.removeImage(id, removed))
    await act(async () => state.sendMessage(id, 'After removing one image', false))
    check(requests[2].thread.attachmentIds.length === 1 && images.has(removed), 'Removing from future sends must keep the historical snapshot')
    await act(async () => root.render(null))
    await act(async () => root.render(<Harness />)); await settle()
    await act(async () => state.setActiveThreadId(id)); await settle()
    check(document.querySelectorAll('.qna-image-preview img').length === 1, 'Image references must survive a hook remount')
    const countBeforeFailure = images.size
    failSave = true
    await act(async () => {
      try { await state.attachImages(id, [{ page: 8, data: png }]) } catch { /* Expected persistence error. */ }
    })
    failSave = false
    check(images.size === countBeforeFailure && persisted[0].attachmentIds.length === 1, 'A failed thread save must roll back new image snapshots')
    await act(async () => button('Immagini delle conversazioni').click()); await settle()
    const cancelButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.qna-image-library button')).filter(button => button.textContent === 'Cancella immagine')
    await act(async () => cancelButtons()[0].click())
    check(images.size === countBeforeFailure, 'Image deletion needs an explicit in-app confirmation')
    await act(async () => button('Conferma cancellazione immagini').click()); await settle()
    check(images.size === countBeforeFailure - 1 && 'id' in deletions.at(-1), 'Single deletion must select only its image')
    await act(async () => state.attachImages(id, [{ page: 9, data: png }]))
    // Refresh by closing and reopening in separate commits.
    await act(async () => button('Immagini delle conversazioni').click())
    await act(async () => button('Immagini delle conversazioni').click()); await settle()
    const select = document.querySelector<HTMLSelectElement>('[aria-label="Giorno delle immagini da cancellare"]')!
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, '2026-10-14'); select.dispatchEvent(new Event('change', { bubbles: true })) })
    await act(async () => button('Cancella per giorno').click())
    await act(async () => button('Conferma cancellazione immagini').click()); await settle()
    check(deletions.at(-1).day === '2026-10-14' && [...images.values()].every(value => value.image.day !== '2026-10-14'), 'Day deletion must use the displayed local day')
    await act(async () => button('Cancella tutte').click())
    failDelete = true
    await act(async () => button('Conferma cancellazione immagini').click()); await settle()
    check(images.size > 0 && document.querySelector('.qna-image-library [role="alert"]')?.textContent?.includes('Cancellazione non riuscita'), 'Failed deletion must remain visible and retryable')
    failDelete = false
    await act(async () => button('Conferma cancellazione immagini').click()); await settle()
    check(images.size === 0 && deletions.at(-1).all && document.querySelector('.qna-active-images')?.textContent?.includes('cancellata'), 'Delete all must update previews to an explicit missing state')
  } finally { await act(async () => root.render(null)); Object.assign(api, previous) }
}
