import bcrypt from "bcryptjs";

/**
 * Password hashing — bcrypt with a per-hash salt.
 * Passwords are never stored in plaintext (schema keeps only passwordHash).
 */
const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
