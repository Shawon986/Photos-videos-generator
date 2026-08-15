import { z } from "zod";

/**
 * Server-side environment configuration, validated once at import time.
 * Fails fast with a readable message instead of misbehaving later.
 *
 * This module must never be imported from client components.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  IMAGE_PROVIDER: z
    .enum(["local", "huggingface", "openai-compatible", "pollinations"])
    .optional()
    .default("local"),
  VIDEO_PROVIDER: z.enum(["local", "huggingface"]).optional().default("local"),
  AI_IMAGE_URL: z.string().optional().default(""),
  AI_VIDEO_URL: z.string().optional().default(""),
  HUGGINGFACE_API_KEY: z.string().optional().default(""),
  // Base URL of the Hugging Face Inference API — override when the default
  // endpoint is unreachable (mirrors, regional gateways, proxies).
  HF_INFERENCE_URL: z
    .string()
    .optional()
    .default("https://api-inference.huggingface.co"),
  // OpenAI-compatible image API (SiliconFlow, Together, Novita, ...).
  OPENAI_COMPAT_IMAGE_URL: z.string().optional().default(""),
  OPENAI_COMPAT_API_KEY: z.string().optional().default(""),
  // Pollinations — free, no-key image API (https://pollinations.ai).
  POLLINATIONS_IMAGE_URL: z.string().optional().default("https://image.pollinations.ai"),
  // Optional app identifier sent as ?referrer= (helps the community service
  // attribute traffic; not required).
  POLLINATIONS_REFERRER: z.string().optional().default(""),
  // HTTP(S) proxy for AI provider requests, e.g. "http://127.0.0.1:7890"
  // (Clash/v2ray local proxies). Leave empty for direct connections or
  // TUN-mode VPNs.
  AI_PROXY_URL: z.string().optional().default(""),
  DEMO_MODE: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true"),
  STORAGE_PROVIDER: z.string().optional().default("local"),
  UPLOAD_DIR: z.string().optional().default("./uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().optional().default(20 * 1024 * 1024),
  IMAGE_GENERATIONS_PER_HOUR: z.coerce.number().int().min(0).optional().default(10),
  VIDEO_GENERATIONS_PER_HOUR: z.coerce.number().int().min(0).optional().default(3),
  WORKER_AUTO_START: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true"),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).optional().default(2000),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).optional().default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`[VisionForge] Invalid environment configuration:\n${details}`);
  throw new Error("Invalid environment configuration. Check .env against .env.example.");
}

export const env = parsed.data;

/** True when the configured endpoint is an http(s) URL. */
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasImageEndpoint(): boolean {
  return isValidHttpUrl(env.AI_IMAGE_URL);
}

export function hasVideoEndpoint(): boolean {
  return isValidHttpUrl(env.AI_VIDEO_URL);
}
