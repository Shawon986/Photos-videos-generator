import { startWorker } from "./generation-worker";

/**
 * Lazy in-process worker bootstrap for the web server.
 *
 * In development (and small single-process deployments) the generation
 * worker starts on the first API call that needs it — no instrumentation
 * hook, no extra process. For production scale, run the worker as a
 * separate process instead: `npm run worker` (and skip this entirely —
 * startWorker is idempotent across processes, each claims its own jobs).
 */
let started = false;

export function ensureWorkerStarted(): void {
  if (started) return;
  started = true;
  startWorker();
}
