import { put as blobPut, get as blobGet, del as blobDel } from "@vercel/blob";
import type { StorageProvider, StoredFile } from "./provider";

/**
 * Vercel Blob storage (production).
 *
 * Vercel's filesystem is read-only and ephemeral, so deployments use this
 * provider (STORAGE_PROVIDER=vercel-blob + BLOB_READ_WRITE_TOKEN). The app
 * still serves media through /api/files/{key} (which proxies get()), so
 * database rows stay provider-agnostic — switching between local and blob
 * does not break stored URLs.
 *
 * Private-store specifics:
 * — blobs are written with access "private" (private stores reject public)
 * — allowOverwrite mirrors the local provider's idempotent write behavior
 * — reads use the SDK's get() with useCache: false so a fresh write is
 *   immediately visible (private reads are CDN-cached for up to 60s
 *   otherwise)
 * — keys are stored as pathnames without a random suffix so get/delete
 *   round-trip by key
 */
export class VercelBlobStorageProvider implements StorageProvider {
  readonly kind = "vercel-blob";

  constructor(private readonly token: string) {}

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredFile> {
    await blobPut(key, data, {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: false, // keep the pathname stable for get/delete
      allowOverwrite: true, // idempotent, like the local provider
      token: this.token,
    });
    return { key, mimeType, sizeBytes: data.byteLength, url: this.urlFor(key) };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const result = await blobGet(key, {
        access: "private",
        useCache: false, // read-after-write consistency
        token: this.token,
      });
      if (!result?.stream) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null; // missing blobs and network failures both read as "not found"
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await blobDel(key, { token: this.token });
    } catch {
      // Already gone — deletion is best-effort.
    }
  }

  urlFor(key: string): string {
    return `/api/files/${key}`;
  }
}
