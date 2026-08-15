import { env } from "@/lib/env";
import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";

let provider: StorageProvider | null = null;

/**
 * Resolve the configured storage provider (env: STORAGE_PROVIDER).
 * `local` is the only built-in; S3/R2 adapters can be registered here.
 */
export function getStorage(): StorageProvider {
  if (provider) return provider;

  switch (env.STORAGE_PROVIDER) {
    case "local":
    default:
      provider = new LocalStorageProvider(env.UPLOAD_DIR);
      break;
  }
  return provider;
}
