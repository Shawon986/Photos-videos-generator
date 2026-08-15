/**
 * Provider errors. `userMessage` is safe to show in the UI; `cause`
 * contains internal details and is logged server-side only.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "provider_not_configured"
      | "provider_unavailable"
      | "provider_failed"
      | "provider_timeout"
      | "provider_cancelled",
    public readonly httpStatus = 502,
    public readonly userMessage = "Generation failed. The AI model is currently unavailable. Please try again.",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function mapProviderFailure(err: unknown, providerLabel: string): ProviderError {
  if (err instanceof ProviderError) return err;

  const e = err as { name?: string; message?: string; code?: string };
  if (e?.name === "AbortError") {
    return new ProviderError(
      `Generation cancelled: ${providerLabel}`,
      "provider_cancelled",
      499,
      "Generation was cancelled.",
      err,
    );
  }
  if (e?.code === "ECONNREFUSED" || e?.code === "ENOTFOUND" || e?.code === "UND_ERR_CONNECT_TIMEOUT") {
    return new ProviderError(
      `AI server unreachable (${providerLabel}): ${e?.message ?? "connection refused"}`,
      "provider_unavailable",
      502,
      "The AI server is currently unreachable. Please try again shortly.",
      err,
    );
  }
  if (e?.code === "RATE_LIMITED" || e?.code === "ETIMEDOUT" || e?.code === "UND_ERR_HEADERS_TIMEOUT") {
    return new ProviderError(
      `AI provider busy or rate-limited (${providerLabel}): ${e?.message ?? "rate limited"}`,
      "provider_unavailable",
      502,
      "The AI model is busy right now. Please try again in a few minutes.",
      err,
    );
  }
  return new ProviderError(
    `AI provider failed (${providerLabel}): ${e?.message ?? "unknown error"}`,
    "provider_failed",
    502,
    "Generation failed. The AI model is currently unavailable. Please try again.",
    err,
  );
}
