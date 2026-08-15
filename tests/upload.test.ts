import { describe, expect, it } from "vitest";
import {
  ALLOWED_UPLOAD_TYPES,
  detectImageType,
  readImageDimensions,
  sanitizeFilename,
  validateUpload,
} from "@/lib/validation/upload";
import { buildStorageKey, resolveUnderRoot } from "@/lib/storage/provider";
import path from "node:path";

/** Minimal 2×2 red PNG. */
function makePng(): ArrayBuffer {
  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x02, // width 2
    0x00, 0x00, 0x00, 0x02, // height 2
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x00, 0x00, 0x00, 0x00, // CRC (ignored by parser)
  ];
  return new Uint8Array(bytes).buffer;
}

function makeJpeg(): ArrayBuffer {
  const bytes = [
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // length 17
    0x08, // precision
    0x00, 0x08, // height 8
    0x00, 0x0c, // width 12
    0x03, // components
    0x01, 0x22, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9, // EOI
  ];
  return new Uint8Array(bytes).buffer;
}

describe("validateUpload", () => {
  const opts = { maxBytes: 1024 };

  it("accepts a valid PNG whose claimed type matches the bytes", () => {
    const result = validateUpload(makePng(), "image/png", "photo.png", opts);
    expect(result.mimeType).toBe("image/png");
    expect(result.extension).toBe(".png");
  });

  it("rejects a file whose claimed type does not match the bytes", () => {
    expect(() => validateUpload(makePng(), "image/jpeg", "photo.jpg", opts)).toThrow(
      /does not match/,
    );
  });

  it("rejects oversized files with the spec'd friendly message", () => {
    const big = new Uint8Array(2 * 1024 * 1024 + 1).fill(0x89);
    big.set([0x89, 0x50, 0x4e, 0x47], 0);
    expect(() =>
      validateUpload(big.buffer, "image/png", "big.png", { maxBytes: 2 * 1024 * 1024 }),
    ).toThrow(/too large/);
  });

  it("rejects non-image content", () => {
    const text = new TextEncoder().encode("hello world").buffer;
    expect(() => validateUpload(text, "image/png", "fake.png", opts)).toThrow(
      /Unsupported file type/,
    );
  });

  it("rejects empty files", () => {
    expect(() => validateUpload(new ArrayBuffer(0), null, "x.png", opts)).toThrow(/empty/);
  });

  it("only allows png/jpeg/webp", () => {
    expect([...ALLOWED_UPLOAD_TYPES.keys()].sort()).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});

describe("sanitizeFilename", () => {
  it("strips path separators and traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("..\\..\\secret.png")).not.toContain("\\");
    expect(sanitizeFilename("a b+c#d.png")).toBe("a_b_c_d.png");
  });

  it("caps length", () => {
    expect(sanitizeFilename("x".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe("detectImageType + readImageDimensions", () => {
  it("detects png and jpeg signatures", () => {
    expect(detectImageType(makePng())).toBe("image/png");
    expect(detectImageType(makeJpeg())).toBe("image/jpeg");
  });

  it("reads PNG dimensions from IHDR", () => {
    expect(readImageDimensions(makePng())).toEqual({ width: 2, height: 2 });
  });

  it("reads JPEG dimensions from SOF0", () => {
    expect(readImageDimensions(makeJpeg())).toEqual({ width: 12, height: 8 });
  });
});

describe("storage keys", () => {
  it("builds clean keys from parts", () => {
    expect(buildStorageKey("images", "gen_1", "result_0.png")).toBe(
      "images/gen_1/result_0.png",
    );
  });

  it("normalizes backslashes and dot segments", () => {
    // ".." is defanged per-segment so a key can never traverse upwards.
    expect(buildStorageKey("uploads", "user_1", "..", "file.png")).toBe(
      "uploads/user_1/_/file.png",
    );
  });

  it("rejects keys that escape the storage root", () => {
    const root = path.resolve("uploads-test");
    expect(() => resolveUnderRoot(root, "../evil.png")).toThrow(/escapes/);
    expect(resolveUnderRoot(root, "images/x.png")).toBe(path.join(root, "images", "x.png"));
  });
});
