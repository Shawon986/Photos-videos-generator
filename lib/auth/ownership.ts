/**
 * Resource ownership enforcement — dependency-free so it is unit-testable
 * without pulling in Next.js internals.
 */
export class OwnershipError extends Error {
  readonly status = 403;
  readonly code = "forbidden";

  constructor(message: string) {
    super(message);
    this.name = "OwnershipError";
  }
}

/**
 * Throws when `userId` is not the owner of a resource. Sharing a creation
 * never grants write access.
 */
export function ensureOwnership(userId: string, ownerId: string): void {
  if (userId !== ownerId) {
    throw new OwnershipError("You don't have permission to modify this creation.");
  }
}
