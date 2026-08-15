import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/lib/rate-limit";
import { UploadValidationError } from "@/lib/validation/upload";
import { ProviderError } from "@/lib/ai/errors";
import { OwnershipError } from "@/lib/auth/ownership";

/**
 * Unified API error handling. User-safe messages only — internal details
 * (stack traces, keys, provider payloads) go to the server log, never out.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, code = "bad_request") =>
  new ApiError(400, message, code);
export const unauthorized = (message = "You must be signed in to do that.") =>
  new ApiError(401, message, "unauthorized");
export const forbidden = (message = "You don't have permission to access this.") =>
  new ApiError(403, message, "forbidden");
export const notFound = (message = "Not found.") => new ApiError(404, message, "not_found");
export const conflict = (message: string) => new ApiError(409, message, "conflict");

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

/**
 * Convert any thrown value into a safe NextResponse. Logs the real error
 * server-side and returns a curated message to the client.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.code, err.message, err.extra);
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path?.join(".") ?? "request";
    return jsonError(400, "validation_error", `${path}: ${first?.message ?? "Invalid input."}`);
  }

  if (err instanceof RateLimitError) {
    return jsonError(429, err.code, err.message, { retryAfterSeconds: err.retryAfterSeconds });
  }

  if (err instanceof UploadValidationError) {
    return jsonError(400, err.code, err.message);
  }

  if (err instanceof ProviderError) {
    return jsonError(err.httpStatus, err.code, err.userMessage);
  }

  if (err instanceof OwnershipError) {
    return jsonError(err.status, err.code, err.message);
  }

  // Unknown error: log fully, return a generic message.
  console.error("[api] Unhandled error:", err);
  return jsonError(500, "internal_error", "Something went wrong on our side. Please try again.");
}

/** Extract a client IP from standard headers (best effort). */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** Read a JSON body, throwing a 400 ApiError when it is malformed. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Invalid JSON body.");
  }
}
