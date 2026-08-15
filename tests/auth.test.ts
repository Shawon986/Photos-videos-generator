import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { ensureOwnership } from "@/lib/auth/ownership";

describe("password hashing", () => {
  it("hashes with bcrypt (never stores plaintext)", async () => {
    const hash = await hashPassword("s3cure-Password42");
    expect(hash).not.toBe("s3cure-Password42");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("s3cure-Password42");
    expect(await verifyPassword("s3cure-Password42", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces distinct salts for identical passwords", async () => {
    const a = await hashPassword("same-password-1");
    const b = await hashPassword("same-password-1");
    expect(a).not.toBe(b);
  });
});

describe("generation ownership", () => {
  it("allows the owner to act on their generation", () => {
    expect(() => ensureOwnership("user_1", "user_1")).not.toThrow();
  });

  it("blocks other users from mutating a generation", () => {
    expect(() => ensureOwnership("user_2", "user_1")).toThrow(/permission/);
  });

  it("blocks unauthenticated mutation attempts", () => {
    expect(() => ensureOwnership("", "user_1")).toThrow(/permission/);
  });
});
