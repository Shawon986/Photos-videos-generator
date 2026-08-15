"use client";

/**
 * Typed fetch helpers for API routes. Errors carry the server's safe
 * `error` message and `code`.
 */

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  // Multipart bodies must NOT get a JSON content type — the browser sets
  // the multipart boundary itself.
  const isFormBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    headers: isFormBody
      ? { ...options.headers }
      : { "Content-Type": "application/json", ...options.headers },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = payload as { error?: string; code?: string; retryAfterSeconds?: number } | null;
    throw new ClientApiError(
      body?.error ?? `Request failed (${response.status}).`,
      body?.code ?? "unknown",
      response.status,
      { retryAfterSeconds: body?.retryAfterSeconds },
    );
  }

  return payload as T;
}

export interface GenerateAccepted {
  generationId: string;
  status: string;
  queuePosition: number;
  isDemo: boolean;
}

export interface UploadAccepted {
  fileId: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/** Download a URL as a file (same-origin; cross-origin falls back to opening). */
export function downloadUrl(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
