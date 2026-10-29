let reactivate: (() => Promise<boolean>) | undefined;
let pending: Promise<boolean> | undefined;
export function registerMockRecovery(handler: () => Promise<boolean>) {
  reactivate = handler;
}
/** One handshake shared by concurrent requests; never replays a mutation. */
export function recoverMockConnection(): Promise<boolean> {
  if (!reactivate) return Promise.resolve(false);
  if (!pending)
    pending = reactivate()
      .catch(() => false)
      .finally(() => {
        pending = undefined;
      });
  return pending;
}
export async function waitForMockRecovery() {
  if (pending) await pending;
}
