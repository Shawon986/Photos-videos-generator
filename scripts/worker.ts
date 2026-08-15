/**
 * Standalone generation worker process (production).
 *
 *   npm run worker
 *
 * Runs alongside the Next.js server (`npm start` with WORKER_AUTO_START=false).
 * Loads the same queue logic as the in-process development worker.
 *
 * Run through tsx (TypeScript executor): `tsx scripts/worker.ts`.
 */
import { config } from "dotenv";

// Next.js loads .env itself; tsx does not — load it explicitly here.
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { startWorker } = await import("../lib/workers/generation-worker");
  startWorker();

  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log("[worker] Shutting down...");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
