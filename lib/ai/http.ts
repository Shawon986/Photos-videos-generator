import { ProxyAgent } from "undici";
import { env } from "@/lib/env";

/**
 * Small fetch helpers with sane defaults for talking to AI servers.
 * Timeouts are long by design (diffusion models are slow).
 *
 * Optional proxy support: Node's fetch does NOT honor Windows system proxy
 * settings, so deployments behind a local proxy (Clash/v2ray) must set
 * AI_PROXY_URL, e.g. http://127.0.0.1:7890. TUN-mode VPNs need nothing.
 */

const DEFAULT_TIMEOUT_MS = 10 * 60_000; // 10 minutes
const MAX_BYTES = 512 * 1024 * 1024; // 512 MB hard cap

let proxyAgent: ProxyAgent | null = null;

function getDispatcher(): ProxyAgent | undefined {
  if (!env.AI_PROXY_URL) return undefined;
  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(env.AI_PROXY_URL);
  }
  return proxyAgent;
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  maxBytes?: number;
  signal?: AbortSignal | null;
}

function withTimeout(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  if (signal) {
    return AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  }
  return AbortSignal.timeout(timeoutMs);
}

export async function fetchJson(url: string, options: FetchOptions = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    signal: withTimeout(options.signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    ...(getDispatcher() ? { dispatcher: getDispatcher() } : {}),
  });
  if (!response.ok) {
    // Carry the error body along so providers can map specific failures
    // (e.g. insufficient balance) to friendly user messages.
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const bodyMessage =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : "";
    const err = new Error(
      `Request to ${url} failed with HTTP ${response.status}${bodyMessage ? `: ${bodyMessage}` : ""}`,
    ) as Error & { code?: string; body?: unknown };
    err.body = body;
    if (response.status === 429) err.code = "RATE_LIMITED";
    throw err;
  }
  return response;
}

export async function fetchBuffer(url: string, options: FetchOptions = {}): Promise<Buffer> {
  const response = await fetchJson(url, options);

  const contentType = response.headers.get("content-type") ?? "";

  // Hugging Face (and similar) return JSON error bodies — surface them as
  // provider errors instead of corrupt media. A JSON content-type is never
  // valid media here (JSON-wrapped base64 is handled by the local provider).
  if (contentType.includes("application/json")) {
    const text = await response.text();
    let detail = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      if (parsed.error) detail = typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    } catch {
      // not JSON after all — use raw text
    }
    const err = new Error(`AI server returned an error: ${detail}`) as Error & { code?: string };
    err.code = "PROVIDER_ERROR_BODY";
    throw err;
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > (options.maxBytes ?? MAX_BYTES)) {
    throw new Error(`Response from ${url} exceeds the size limit.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > (options.maxBytes ?? MAX_BYTES)) {
    throw new Error(`Response from ${url} exceeds the size limit.`);
  }
  if (arrayBuffer.byteLength === 0) {
    throw new Error(`AI server returned an empty response from ${url}.`);
  }
  return Buffer.from(arrayBuffer);
}
