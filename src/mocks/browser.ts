import {
  recoverMockConnection,
  registerMockRecovery,
} from "../lib/mock-connection";
import { setupWorker } from "msw/browser";
import { initializeDatabase } from "./database";
import { restHandler } from "./handlers";
import { socketHandler } from "./realtime";
export async function startMocks() {
  await initializeDatabase();
  const worker = setupWorker(restHandler, socketHandler);
  const registration = await worker.start({
    quiet: true,
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
  registerMockRecovery(() => {
    if (!("serviceWorker" in navigator)) return Promise.resolve(false);
    const target = navigator.serviceWorker.controller || registration?.active;
    if (!target) return Promise.resolve(false);
    // MSW 2.15's worker can restart with an empty activeClientIds set.
    // Repeating only its activation handshake keeps the WebSocket interceptor intact.
    return new Promise<boolean>((resolve) => {
      const finish = (ready: boolean) => {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve(ready);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source === target && event.data?.type === "MOCKING_ENABLED")
          finish(true);
      };
      const timeout = window.setTimeout(() => finish(false), 2000);
      navigator.serviceWorker.addEventListener("message", onMessage);
      try {
        target.postMessage("MOCK_ACTIVATE");
      } catch {
        finish(false);
      }
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void recoverMockConnection();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void recoverMockConnection();
  });
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    void recoverMockConnection();
  });
}
