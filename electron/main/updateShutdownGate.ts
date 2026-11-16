/** Prevent new IPC work once the updater commits to closing the application. */
export class UpdateShutdownGate {
  private active = 0
  closing = false

  async run<T>(work: () => T | Promise<T>): Promise<T> {
    if (this.closing) throw new Error('Riavvio per aggiornamento in corso.')
    this.active++
    try { return await work() } finally { this.active-- }
  }

  lock(busy: boolean) {
    if (this.closing || this.active || busy) {
      throw new Error('Attendi la conclusione delle elaborazioni e dei salvataggi, poi riprova.')
    }
    this.closing = true
  }

  unlock() { this.closing = false }
}
