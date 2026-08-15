import fs from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, StoredFile } from "./provider";
import { resolveUnderRoot } from "./provider";

/**
 * Local filesystem storage. Files live under UPLOAD_DIR (default ./uploads):
 *
 *   uploads/
 *     images/       — generated images
 *     videos/       — generated videos
 *     thumbnails/   — video thumbnails
 *     uploads/      — user-uploaded inputs (image-to-video)
 */
export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local";

  constructor(private readonly rootDir: string) {}

  private absolutePath(key: string): string {
    return resolveUnderRoot(this.rootDir, key);
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<StoredFile> {
    const abs = this.absolutePath(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data, { flag: "w" });
    return { key, mimeType, sizeBytes: data.byteLength, url: this.urlFor(key) };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.absolutePath(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(key));
    } catch {
      // Already gone — deletion is best-effort.
    }
  }

  urlFor(key: string): string {
    return `/api/files/${key}`;
  }
}
