import type { PublishResult } from '../../../shared/archive'

const CHECK_INTERVAL = 5 * 60_000
const FIRST_RETRY = 30_000

/** Coalesces local changes, defers during AI work and retries without blocking the UI. */
export class AutomaticPublisher {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private requested = false
  private stopped = false
  private retryDelay = FIRST_RETRY

  constructor(private readonly operations: {
    enabled: () => Promise<boolean>
    busy: () => boolean
    publish: () => Promise<PublishResult>
  }) {}

  schedule(delay = 1_000): void {
    if (this.stopped) return
    if (this.running) { this.requested = true; return }
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.timer = null; void this.run() }, delay)
    this.timer.unref?.()
  }

  stop(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async run(): Promise<void> {
    this.running = true
    let nextDelay: number | null = null
    try {
      if (!await this.operations.enabled() || this.stopped) return
      if (this.operations.busy()) { nextDelay = 5_000; return }
      const result = await this.operations.publish()
      if (result.errors.length) {
        nextDelay = this.retryDelay
        this.retryDelay = Math.min(CHECK_INTERVAL, this.retryDelay * 2)
      } else {
        this.retryDelay = FIRST_RETRY
        nextDelay = CHECK_INTERVAL
      }
    } catch {
      nextDelay = this.retryDelay
      this.retryDelay = Math.min(CHECK_INTERVAL, this.retryDelay * 2)
    } finally {
      this.running = false
      if (this.requested) { this.requested = false; this.schedule() }
      else if (nextDelay !== null) this.schedule(nextDelay)
    }
  }
}
