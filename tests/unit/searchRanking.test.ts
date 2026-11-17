import { expect, it } from 'vitest'
import { SearchIndexService, type SearchableLectureDoc } from '../../electron/main/searchIndex'
const doc = (id: string, transcriptText: string): SearchableLectureDoc => ({ id, transcriptText, courseCode: 'TEST', recordedAt: '', sourceAudioFileName: '', sourceTranscriptFileName: '', markdownText: '' })
it('ranks coverage of both query terms above more repetitions of only one term', () => {
  const index = new SearchIndexService()
  index.indexDocument(doc('long', 'Stackelberg '.repeat(15) + 'Altro argomento non pertinente. '.repeat(1000)))
  index.indexDocument(doc('focused', 'Equilibrio di Stackelberg e scelta del leader.'))
  expect(index.search('Stackelberg leader')).toEqual(['focused', 'long'])
})
it('supports prefix and small typos locally and updates replaced documents', () => {
  const index = new SearchIndexService()
  index.indexDocument(doc('focus', 'Stackelberg leader'))
  expect(index.search('Stackel')).toEqual(['focus'])
  expect(index.search('Stackelberh')).toEqual(['focus'])
  index.indexDocument(doc('focus', 'Cournot'))
  expect(index.search('Stackelberg')).toEqual([])
  index.removeDocument('focus')
  expect(index.search('Cournot')).toEqual([])
  expect(index.search('   ')).toEqual([])
})
