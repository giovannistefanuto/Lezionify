import MiniSearch from 'minisearch'

export interface SearchableLectureDoc {
  id: string
  courseCode: string
  recordedAt: string
  sourceAudioFileName: string
  sourceTranscriptFileName: string
  transcriptText: string
  markdownText: string
  markdownEnText?: string
}

export class SearchIndexService {
  private miniSearch: MiniSearch<SearchableLectureDoc>

  constructor() {
    this.miniSearch = new MiniSearch<SearchableLectureDoc>({
      fields: [
        'courseCode',
        'sourceAudioFileName',
        'sourceTranscriptFileName',
        'transcriptText',
        'markdownText',
        'markdownEnText',
        'recordedAt'
      ],
      storeFields: ['id'],
      searchOptions: {
        prefix: true,
        fuzzy: 0.1
      }
    })
  }

  indexDocument(doc: SearchableLectureDoc): void {
    if (this.miniSearch.has(doc.id)) {
      this.miniSearch.replace(doc)
    } else {
      this.miniSearch.add(doc)
    }
  }

  removeDocument(id: string): void {
    if (this.miniSearch.has(id)) {
      this.miniSearch.discard(id)
    }
  }

  search(query: string): string[] {
    const trimmed = query.trim()
    if (!trimmed) return []

    try {
      const results = this.miniSearch.search(trimmed)
      return results.map((r) => r.id as string)
    } catch {
      return []
    }
  }

  clear(): void {
    this.miniSearch.removeAll()
  }
}
