import { describe, expect, it } from "vitest";
import { parseByteRange } from "@/lib/utils";

describe("parseByteRange", () => {
  const total = 1000;

  it("parses a simple range", () => {
    expect(parseByteRange("bytes=0-499", total)).toEqual({ start: 0, end: 499 });
  });

  it("parses an open-ended range", () => {
    expect(parseByteRange("bytes=500-", total)).toEqual({ start: 500, end: 999 });
  });

  it("parses a suffix range (last N bytes)", () => {
    expect(parseByteRange("bytes=-100", total)).toEqual({ start: 900, end: 999 });
  });

  it("clamps end to total - 1", () => {
    expect(parseByteRange("bytes=900-2000", total)).toEqual({ start: 900, end: 999 });
  });

  it("returns null for an unsatisfiable start", () => {
    expect(parseByteRange("bytes=1000-", total)).toBeNull();
    expect(parseByteRange("bytes=1500-1600", total)).toBeNull();
  });

  it("returns null for malformed or missing headers", () => {
    expect(parseByteRange(null, total)).toBeNull();
    expect(parseByteRange("", total)).toBeNull();
    expect(parseByteRange("bytes=abc-def", total)).toBeNull();
    expect(parseByteRange("bytes=0-", 0)).toBeNull();
  });

  it("handles a 0-byte probe (iOS first request)", () => {
    expect(parseByteRange("bytes=0-0", total)).toEqual({ start: 0, end: 0 });
  });
});
