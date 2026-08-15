import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { GenerationType } from "@/lib/constants";

/**
 * Rate limiting.
 *
 * Two layers:
 *  1. Per-user, per-hour generation quotas — persisted in the database
 *     (accurate across restarts; single-instance by design).
 *  2. Per-IP request burst limit on generation endpoints — in-memory
 *     sliding window, defense-in-depth against hammering.
 *
 * For multi-instance production, replace the IP limiter with a shared
 * store (Redis) — the interface is intentionally small.
 */

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    public readonly code: "user_quota" | "ip_burst",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

// ---------------------------------------------------------------------------
// Per-user hourly quota
// ---------------------------------------------------------------------------

export function hourlyLimitFor(type: GenerationType): number {
  return type === "IMAGE"
    ? env.IMAGE_GENERATIONS_PER_HOUR
    : env.VIDEO_GENERATIONS_PER_HOUR;
}

/** Is `date` within the last `windowMs` before `now`? Pure helper for tests. */
export function isWithinWindow(date: Date, now: Date, windowMs: number): boolean {
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff < windowMs;
}

export async function getHourlyGenerationCount(userId: string, type: GenerationType): Promise<number> {
  const since = new Date(Date.now() - 3_600_000);
  return db.generation.count({
    where: {
      userId,
      type: type === "IMAGE" ? "IMAGE" : { in: ["VIDEO", "IMAGE_TO_VIDEO"] },
      createdAt: { gte: since },
      // Cancelled jobs never ran — don't count them against the user.
      status: { not: "CANCELLED" },
    },
  });
}

const QUOTA_WINDOW_MS = 3_600_000;

/** Seconds until the oldest in-window generation leaves the sliding window. */
export function retryAfterSecondsForOldest(oldest: Date, now: Date): number {
  return Math.max(1, Math.ceil((oldest.getTime() + QUOTA_WINDOW_MS - now.getTime()) / 1000));
}

export async function enforceUserGenerationQuota(
  userId: string,
  type: GenerationType,
): Promise<void> {
  const limit = hourlyLimitFor(type);
  if (limit === 0) {
    throw new RateLimitError(
      "Generation is currently disabled by the administrator.",
      3_600,
      "user_quota",
    );
  }
  const used = await getHourlyGenerationCount(userId, type);
  if (used >= limit) {
    // Compute when the quota actually resets: the oldest generation inside
    // the window falls out of it, freeing a slot.
    const oldest = await db.generation.findFirst({
      where: {
        userId,
        type: type === "IMAGE" ? "IMAGE" : { in: ["VIDEO", "IMAGE_TO_VIDEO"] },
        createdAt: { gte: new Date(Date.now() - QUOTA_WINDOW_MS) },
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSeconds = oldest
      ? retryAfterSecondsForOldest(oldest.createdAt, new Date())
      : 3_600;
    throw new RateLimitError(
      "You've reached your hourly generation limit.",
      retryAfterSeconds,
      "user_quota",
    );
  }
}

// ---------------------------------------------------------------------------
// Per-IP burst limit (in-memory)
// ---------------------------------------------------------------------------

const IP_WINDOW_MS = 60_000;
const IP_MAX_REQUESTS_PER_WINDOW = 60;

interface IpWindow {
  count: number;
  resetAt: number;
}

const ipWindows = new Map<string, IpWindow>();

// Periodic cleanup so the map does not grow unbounded.
if (typeof setInterval !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, window] of ipWindows) {
      if (window.resetAt < now) ipWindows.delete(ip);
    }
  }, 300_000);
  // Do not keep the process alive just for cleanup.
  cleanup.unref?.();
}

export function enforceIpBurstLimit(ip: string): void {
  const now = Date.now();
  const current = ipWindows.get(ip);

  if (!current || current.resetAt < now) {
    ipWindows.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > IP_MAX_REQUESTS_PER_WINDOW) {
    throw new RateLimitError(
      "Too many requests. Please slow down and try again shortly.",
      Math.ceil((current.resetAt - now) / 1000),
      "ip_burst",
    );
  }
}

export function clearIpRateLimits(): void {
  ipWindows.clear();
}

/** Test hook: inspect the in-memory window for an IP. */
export function getIpWindowForTest(ip: string): IpWindow | undefined {
  return ipWindows.get(ip);
}
