/** Collections are deliberately outside Library.lectures and course settings. */
export const COLLECTION_MODES = {
  lecture: 'Lezione',
  conference: 'Conferenza',
  podcast: 'Podcast e testimonianze',
  meeting: 'Riunione di lavoro',
  personal: 'Pensieri personali'
} as const
export type CollectionMode = keyof typeof COLLECTION_MODES
export interface CollectionDefinition {
  id: string
  name: string
  mode: CollectionMode
  instructions: string
  archived: boolean
  createdAt: string
}
export interface CollectionSource {
  id: string
  name: string
  extension: string
  checksum: string
  byteSize: number
  kind: 'media' | 'text'
}
export interface CollectionItem {
  id: string
  collectionId: string
  title: string
  importedAt: string
  recordedAt: string | null
  sourceUrl: string
  mode: CollectionMode | null
  /** null means inherit; empty string explicitly replaces collection instructions. */
  instructions: string | null
  sources: CollectionSource[]
  transcriptHash: string | null
  currentGeneration: string | null
}
export interface CollectionConfiguration {
  mode: CollectionMode
  instructions: string
}
export interface CollectionJob {
  itemId: string
  state: 'running' | 'completed' | 'failed' | 'interrupted' | 'cancelled'
  stage: string
  percent: number
  error?: string
  includeNotes: boolean
  configuration: CollectionConfiguration
  model: string
  startedAt: string
  baseGeneration?: string | null
  baseDocumentHash?: string | null
}
export interface CollectionGeneration {
  id: string
  createdAt: string
  configuration: CollectionConfiguration
  sourceHash: string
  promptVersion: number
  models: string[]
  usage?: Array<{ model: string; inputTokens: number; outputTokens: number; totalTokens: number }>
}
export interface CollectionState {
  collections: CollectionDefinition[]
  items: CollectionItem[]
  jobs: CollectionJob[]
  busy: boolean
  error?: string
}
export interface CollectionRead {
  item: CollectionItem
  transcript: string
  markdown: string
  generations: CollectionGeneration[]
}
export interface CollectionFileSelection {
  token: string
  files: Array<{ id: string; name: string; byteSize: number; kind: 'media' | 'text' }>
}
export interface CollectionImportRequest {
  token: string
  fileIds: string[]
  collectionId: string
  grouped: boolean
  title: string
  recordedAt: string | null
  sourceUrl: string
  mode: CollectionMode | null
  instructions: string | null
}
export type CollectionItemUpdates = Pick<CollectionItem, 'title' | 'recordedAt' | 'sourceUrl' | 'mode' | 'instructions'>
export interface CollectionsApi {
  state(): Promise<CollectionState>
  saveCollection(value: Pick<CollectionDefinition, 'name' | 'mode' | 'instructions' | 'archived'> & { id?: string }): Promise<CollectionDefinition>
  selectFiles(): Promise<CollectionFileSelection | null>
  releaseSelection(token: string): Promise<void>
  importFiles(request: CollectionImportRequest): Promise<{ items: CollectionItem[]; duplicates: string[] }>
  updateItem(id: string, updates: CollectionItemUpdates): Promise<CollectionItem>
  read(id: string, generation?: string): Promise<CollectionRead>
  process(ids: string[], includeNotes: boolean, resume?: boolean): Promise<void>
  stop(): Promise<void>
  activateGeneration(id: string, generation: string): Promise<void>
  openSource(id: string, sourceId: string): Promise<void>
  search(query: string, collectionId?: string, archived?: boolean): Promise<CollectionItem[]>
}
export function resolveCollectionConfiguration(collection: CollectionDefinition, item: Pick<CollectionItem, 'mode' | 'instructions'>): CollectionConfiguration {
  return { mode: item.mode ?? collection.mode, instructions: item.instructions ?? collection.instructions }
}
export function sortCollectionItems(items: CollectionItem[]): CollectionItem[] {
  return [...items].sort((a, b) => (b.recordedAt ?? b.importedAt).localeCompare(a.recordedAt ?? a.importedAt) || b.importedAt.localeCompare(a.importedAt) || a.id.localeCompare(b.id))
}
