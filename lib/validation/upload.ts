/**
 * Upload validation: file type, size and filename sanitization.
 * Used by POST /api/upload and image-to-video.
 */

export const ALLOWED_UPLOAD_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

export interface ValidatedUpload {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

export class UploadValidationError extends Error {
  constructor(
    message: string,
    public readonly code: "too_large" | "unsupported_type" | "corrupt_file",
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Strip everything that could be used in a filesystem path. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").slice(0, 120);
  return base || "file";
}

/**
 * Verify the buffer's magic bytes match the claimed MIME type.
 * Cheap signature check — not a full decoder pass.
 */
export function detectImageType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export interface UploadValidationOptions {
  maxBytes: number;
  allowedTypes?: Map<string, string>;
}

/**
 * Validate a raw upload (ArrayBuffer + claimed MIME + original filename).
 * Throws UploadValidationError with a user-safe message.
 */
export function validateUpload(
  buffer: ArrayBuffer,
  claimedMimeType: string | null,
  originalName: string,
  options: UploadValidationOptions,
): ValidatedUpload {
  const allowed = options.allowedTypes ?? ALLOWED_UPLOAD_TYPES;

  if (buffer.byteLength === 0) {
    throw new UploadValidationError("The uploaded file is empty.", "corrupt_file");
  }

  if (buffer.byteLength > options.maxBytes) {
    const mb = Math.round(options.maxBytes / (1024 * 1024));
    throw new UploadValidationError(
      `The uploaded image is too large. Maximum file size is ${mb} MB.`,
      "too_large",
    );
  }

  // Trust the magic bytes over the client-provided MIME type.
  const detected = detectImageType(buffer);
  if (!detected || !allowed.has(detected)) {
    const formats = [...allowed.values()].map((ext) => ext.slice(1).toUpperCase()).join(", ");
    throw new UploadValidationError(
      `Unsupported file type. Please upload ${formats}.`,
      "unsupported_type",
    );
  }
  // If the client sent a MIME type, it must agree with the bytes.
  if (claimedMimeType && claimedMimeType !== detected) {
    throw new UploadValidationError(
      "The uploaded file does not match its declared type.",
      "corrupt_file",
    );
  }

  return {
    buffer,
    mimeType: detected,
    extension: allowed.get(detected) ?? ".bin",
    sizeBytes: buffer.byteLength,
  };
}

/**
 * Read image dimensions from file headers (PNG / JPEG / WebP).
 * Returns null when the header is not parseable — callers should not
 * hard-fail on this.
 */
export function readImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  try {
    if (detectImageType(buffer) === "image/png" && bytes.length >= 24) {
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (detectImageType(buffer) === "image/jpeg") {
      // Walk JPEG segments to find SOF0/SOF2 marker.
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) return null;
        const marker = bytes[offset + 1];
        if (marker === 0xd8) {
          offset += 2;
          continue;
        }
        const length = view.getUint16(offset + 2);
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
        }
        offset += 2 + length;
      }
      return null;
    }
    if (detectImageType(buffer) === "image/webp" && bytes.length >= 30) {
      // VP8X: 4 bytes reserved + 3 bytes W/H
      if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
        const w = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
        const h = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
        return { width: w, height: h };
      }
      // VP8 (lossy): frame tag at 23..25
      if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
        const w = view.getUint16(26) & 0x3fff;
        const h = view.getUint16(28) & 0x3fff;
        return { width: w, height: h };
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}
