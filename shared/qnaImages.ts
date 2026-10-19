export const QNA_IMAGE_LIMIT = 4
export const QNA_IMAGE_MAX_BYTES = 2_000_000
export interface QnaImage {
  id: string
  lectureId: string
  threadId: string
  page: number
  createdAt: string
  day: string
  width: number
  height: number
  byteSize: number
  sha256: string
}
export interface QnaImageInput { page: number; data: string }
export type QnaImageDeletion = { id: string } | { day: string } | { all: true }
export const isQnaImageId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
export function validateQnaImageIds(value: unknown): asserts value is string[] | undefined {
  if (value === undefined) return
  if (!Array.isArray(value) || value.length > QNA_IMAGE_LIMIT || value.some(id => !isQnaImageId(id)) || new Set(value).size !== value.length) throw new Error('Allegati delle slide non validi.')
}
