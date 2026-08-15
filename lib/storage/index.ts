import { env } from "@/lib/env";
import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";
import { VercelBlobStorageProvider } from "./vercel-blob";

let provider: StorageProvider | null = null;

/**
 * Resolve the configured storage provider (env: STORAGE_PROVIDER).
 * `local` writes under UPLOAD_DIR (development); `vercel-blob` is required
 * on Vercel, whose filesystem is read-only. Additional adapters (S3/R2/…)
 * can be registered here.
 */
export function getStorage(): StorageProvider {
  if (provider) return provider;

  switch (env.STORAGE_PROVIDER) {
    case "vercel-blob":
      // env.ts already rejects vercel-blob without a token at startup.
      provider = new VercelBlobStorageProvider(env.BLOB_READ_WRITE_TOKEN);
      break;
    case "local":
    default:
      provider = new LocalStorageProvider(env.UPLOAD_DIR);
      break;
  }
  return provider;
}
