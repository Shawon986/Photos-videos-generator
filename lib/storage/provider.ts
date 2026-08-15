import path from "node:path";

/**
 * Storage abstraction.
 *
 * The API layer only talks to StorageProvider — never to the filesystem
 * directly. `local` writes under UPLOAD_DIR. To add S3 / Cloudflare R2 /
 * Supabase Storage, implement StorageProvider in a new module and register
 * it in getStorage().
 */

export interface StoredFile {
  /** Provider-internal key, e.g. "images/gen_abc123/result_0.png". */
  key: string;
  mimeType: string;
  sizeBytes: number;
  /** Public, provider-agnostic URL to serve the file (route: /api/files). */
  url: string;
}

export interface StorageProvider {
  readonly kind: string;
  /**
   * Persist a buffer. `key` is a RELATIVE, pre-sanitized path; providers
   * must reject any key that escapes their root directory.
   */
  put(key: string, data: Buffer, mimeType: string): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /** Full key → public URL mapping. */
  urlFor(key: string): string;
}

/** Path-traversal-safe key builder. Callers compose keys from parts only. */
export function buildStorageKey(...parts: string[]): string {
  const joined = parts
    .map((p) => p.replace(/\\/g, "/").replace(/\.{2,}/g, "_"))
    .join("/");
  const normalized = path.posix.normalize(joined);
  if (normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Invalid storage key: ${joined}`);
  }
  return normalized;
}

/** Safely join a key under the upload root and verify it stays inside. */
export function resolveUnderRoot(root: string, key: string): string {
  const full = path.resolve(root, key);
  const rootResolved = path.resolve(root);
  if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) {
    throw new Error(`Storage key escapes root directory: ${key}`);
  }
  return full;
}
