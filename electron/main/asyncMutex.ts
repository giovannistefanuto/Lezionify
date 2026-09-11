/**
 * Async mutex for serializing concurrent write operations.
 * Used to prevent race conditions on library.json writes.
 */
export class AsyncMutex {
  private queue: Promise<void> = Promise.resolve()

  /**
   * Executes the given function exclusively — only one function
   * runs at a time. Subsequent calls queue behind the current one.
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const previousTask = this.queue
    this.queue = gate

    await previousTask

    try {
      return await fn()
    } finally {
      release()
    }
  }
}
