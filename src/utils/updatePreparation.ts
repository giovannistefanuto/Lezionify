/** Participants flush durable state before an explicit updater restart. */
const participants = new Set<() => Promise<void>>()
let prepared = false
export function registerUpdatePreparation(prepare: () => Promise<void>) {
  participants.add(prepare)
  // A failed save remains reachable even after its view was closed.
  return () => { void prepare().then(() => participants.delete(prepare), () => {}) }
}
export function updateRestartPrepared() { return prepared }
export async function prepareUpdateRestart() {
  prepared = false
  await Promise.all([...participants].map(prepare => prepare()))
  prepared = true
}
export function resetUpdateRestart() { prepared = false }
