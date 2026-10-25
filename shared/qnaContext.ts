import type { QnaThread } from './archive'

const words = (text: string) =>
  new Set(
    (text.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter(
      (word) =>
        ![
          'della',
          'delle',
          'questo',
          'questa',
          'come',
          'sono',
          'with',
          'that',
          'dello',
          'degli',
          'dalla',
          'spiega',
          'puoi',
          'perché'
        ].includes(word)
    )
  )
/** Only completed exchanges from the same lesson are supplied by the caller. */
export function relatedQnaContext(
  current: QnaThread,
  others: QnaThread[]
): string {
  const query = words(
    [
      current.quote,
      current.contextHeading,
      current.messages.filter((message) => message.role === 'user').at(-1)?.text
    ].join(' ')
  )
  const candidates = others
    .filter((thread) => thread.id !== current.id)
    .map((thread) => {
      const tokens = words(
        [
          thread.quote,
          thread.contextHeading,
          ...thread.messages
            .filter((message) => message.role === 'user')
            .map((message) => message.text)
        ].join(' ')
      )
      const score =
        [...query].filter((word) => tokens.has(word)).length +
        (current.contextHeading &&
        current.contextHeading === thread.contextHeading
          ? 3
          : 0)
      const exchanges: string[] = []
      for (let index = 0; index < thread.messages.length - 1; index++) {
        const question = thread.messages[index],
          answer = thread.messages[index + 1]
        if (
          question.role === 'user' &&
          answer.role === 'ai' &&
          question.text.trim() &&
          answer.text.trim()
        )
          exchanges.push(
            `DOMANDA: ${question.text.slice(0, 800)}\nRISPOSTA AI: ${answer.text.slice(0, 1600)}`
          )
      }
      return {
        score,
        date: thread.updatedAt,
        text: exchanges.length
          ? `PASSAGGIO: ${thread.quote.slice(0, 400)}\n${exchanges.slice(-2).join('\n')}`
          : ''
      }
    })
    .filter((item) => item.score > 0 && item.text)
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
  let context = ''
  for (const item of candidates.slice(0, 5)) {
    if (context.length + item.text.length + 2 > 12000) continue
    context += item.text + '\n\n'
  }
  return context.trim()
}
