import { describe, expect, it, beforeEach } from "vitest";
import {
  RateLimitError,
  clearIpRateLimits,
  enforceIpBurstLimit,
  hourlyLimitFor,
  isWithinWindow,
  retryAfterSecondsForOldest,
} from "@/lib/rate-limit";

describe("hourly window math", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("accepts timestamps inside the window", () => {
    expect(isWithinWindow(new Date("2026-08-15T11:30:00Z"), now, 3_600_000)).toBe(true);
    expect(isWithinWindow(new Date("2026-08-15T11:00:01Z"), now, 3_600_000)).toBe(true);
  });

  it("rejects timestamps outside the window", () => {
    expect(isWithinWindow(new Date("2026-08-15T10:59:59Z"), now, 3_600_000)).toBe(false);
    expect(isWithinWindow(new Date("2026-08-15T12:01:00Z"), now, 3_600_000)).toBe(false);
  });
});

describe("hourly quota config", () => {
  it("image and video limits come from the environment", () => {
    expect(hourlyLimitFor("IMAGE")).toBe(10);
    expect(hourlyLimitFor("VIDEO")).toBe(3);
    expect(hourlyLimitFor("IMAGE_TO_VIDEO")).toBe(3);
  });
});

describe("retryAfterSecondsForOldest", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("returns the remaining window time for the oldest generation", () => {
    expect(retryAfterSecondsForOldest(new Date("2026-08-15T11:10:00Z"), now)).toBe(600);
    expect(retryAfterSecondsForOldest(new Date("2026-08-15T11:59:30Z"), now)).toBe(3570);
  });

  it("never returns below 1 second", () => {
    expect(retryAfterSecondsForOldest(new Date("2026-08-15T11:00:00.001Z"), now)).toBe(1);
  });
});

describe("IP burst limiter", () => {
  beforeEach(() => clearIpRateLimits());

  it("allows a burst of requests then rejects", () => {
    for (let i = 0; i < 60; i++) {
      enforceIpBurstLimit("203.0.113.7");
    }
    expect(() => enforceIpBurstLimit("203.0.113.7")).toThrow(RateLimitError);
    expect(() => enforceIpBurstLimit("203.0.113.7")).toThrow(/Too many requests/);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 60; i++) enforceIpBurstLimit("203.0.113.8");
    enforceIpBurstLimit("203.0.113.9"); // different IP is unaffected
  });

  it("exposes retry-after seconds in the error", () => {
    clearIpRateLimits();
    for (let i = 0; i < 60; i++) enforceIpBurstLimit("203.0.113.10");
    try {
      enforceIpBurstLimit("203.0.113.10");
      expect.unreachable();
    } catch (err) {
      const e = err as RateLimitError;
      expect(e.retryAfterSeconds).toBeGreaterThan(0);
      expect(e.code).toBe("ip_burst");
    }
  });
});
