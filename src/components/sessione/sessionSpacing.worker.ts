import { spaceSessionExams, type SpacingRequest } from '../../../shared/sessionSpacing'

const worker = globalThis as unknown as {
  addEventListener(name: 'message', handler: (message: MessageEvent<SpacingRequest>) => void): void
  postMessage(result: ReturnType<typeof spaceSessionExams>): void
}
worker.addEventListener('message', ({ data }) => worker.postMessage(spaceSessionExams(data)))
