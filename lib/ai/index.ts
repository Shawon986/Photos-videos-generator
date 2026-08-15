import { env, hasImageEndpoint, hasVideoEndpoint } from "@/lib/env";
import type { ImageGenerationProvider, VideoGenerationProvider } from "./types";
import { LocalImageProvider } from "./image/local-provider";
import { HuggingFaceImageProvider, huggingFaceNotConfigured } from "./image/huggingface-provider";
import { OpenAICompatibleImageProvider } from "./image/openai-compatible-provider";
import { PollinationsImageProvider } from "./image/pollinations-provider";
import { DemoImageProvider } from "./image/demo-provider";
import { LocalVideoProvider } from "./video/local-provider";
import { HuggingFaceVideoProvider, huggingFaceVideoNotConfigured } from "./video/huggingface-provider";
import { DemoVideoProvider } from "./video/demo-provider";
import { ProviderError } from "./errors";

export type { ImageGenerationProvider, VideoGenerationProvider, MediaResult, GenerationProgress } from "./types";
export { ProviderError } from "./errors";
export { generateArtSvg } from "./demo/art";

export interface ResolvedProvider<T> {
  provider: T;
  /** true when the provider produces labelled demo previews. */
  isDemo: boolean;
}

/**
 * Resolve the active image provider.
 *
 * Resolution order:
 *   1. IMAGE_PROVIDER=local      + AI_IMAGE_URL set → LocalImageProvider
 *   2. IMAGE_PROVIDER=huggingface+ HUGGINGFACE_API_KEY set → HF provider
 *   3. IMAGE_PROVIDER=openai-compatible + URL/key set → OpenAI-compatible provider
 *   4. IMAGE_PROVIDER=pollinations (no key needed) → PollinationsImageProvider
 *   5. DEMO_MODE=true → DemoImageProvider (clearly labelled demo output)
 *   6. Otherwise → ProviderError (the app never pretends a model ran)
 */
export function resolveImageProvider(): ResolvedProvider<ImageGenerationProvider> {
  if (env.IMAGE_PROVIDER === "local" && hasImageEndpoint()) {
    return { provider: new LocalImageProvider(env.AI_IMAGE_URL), isDemo: false };
  }
  if (env.IMAGE_PROVIDER === "huggingface" && env.HUGGINGFACE_API_KEY) {
    return {
      provider: new HuggingFaceImageProvider(env.HUGGINGFACE_API_KEY, env.HF_INFERENCE_URL),
      isDemo: false,
    };
  }
  if (
    env.IMAGE_PROVIDER === "openai-compatible" &&
    env.OPENAI_COMPAT_IMAGE_URL &&
    env.OPENAI_COMPAT_API_KEY
  ) {
    return {
      provider: new OpenAICompatibleImageProvider(
        env.OPENAI_COMPAT_IMAGE_URL,
        env.OPENAI_COMPAT_API_KEY,
      ),
      isDemo: false,
    };
  }
  if (env.IMAGE_PROVIDER === "pollinations") {
    return {
      provider: new PollinationsImageProvider(
        env.POLLINATIONS_IMAGE_URL,
        env.POLLINATIONS_REFERRER || undefined,
      ),
      isDemo: false,
    };
  }
  if (env.DEMO_MODE) {
    return { provider: new DemoImageProvider(), isDemo: true };
  }
  throw huggingFaceNotConfigured();
}

export function resolveVideoProvider(): ResolvedProvider<VideoGenerationProvider> {
  if (env.VIDEO_PROVIDER === "local" && hasVideoEndpoint()) {
    return { provider: new LocalVideoProvider(env.AI_VIDEO_URL), isDemo: false };
  }
  if (env.VIDEO_PROVIDER === "huggingface" && env.HUGGINGFACE_API_KEY) {
    return {
      provider: new HuggingFaceVideoProvider(env.HUGGINGFACE_API_KEY, env.HF_INFERENCE_URL),
      isDemo: false,
    };
  }
  if (env.DEMO_MODE) {
    return { provider: new DemoVideoProvider(), isDemo: true };
  }
  throw huggingFaceVideoNotConfigured();
}

/**
 * Report availability to the client (never secrets — booleans only).
 * Used by /api/config and the settings page.
 */
export function getAiCapabilities(): {
  demoMode: boolean;
  image: { realProvider: boolean; demoFallback: boolean; mode: string };
  video: { realProvider: boolean; demoFallback: boolean; mode: string };
} {
  const imageReal =
    hasImageEndpoint() ||
    (env.IMAGE_PROVIDER === "huggingface" && Boolean(env.HUGGINGFACE_API_KEY)) ||
    (env.IMAGE_PROVIDER === "openai-compatible" &&
      Boolean(env.OPENAI_COMPAT_IMAGE_URL && env.OPENAI_COMPAT_API_KEY)) ||
    env.IMAGE_PROVIDER === "pollinations"; // no key needed — always available
  const videoReal = hasVideoEndpoint() || (env.VIDEO_PROVIDER === "huggingface" && Boolean(env.HUGGINGFACE_API_KEY));
  return {
    demoMode: env.DEMO_MODE,
    image: {
      realProvider: imageReal,
      demoFallback: !imageReal && env.DEMO_MODE,
      mode: imageReal ? env.IMAGE_PROVIDER : env.DEMO_MODE ? "demo" : "unavailable",
    },
    video: {
      realProvider: videoReal,
      demoFallback: !videoReal && env.DEMO_MODE,
      mode: videoReal ? env.VIDEO_PROVIDER : env.DEMO_MODE ? "demo" : "unavailable",
    },
  };
}

/** Validate that provider env URLs parse — called at worker startup. */
export function assertProviderConfig(): void {
  if (env.IMAGE_PROVIDER === "local" && env.AI_IMAGE_URL) {
    try {
      new URL(env.AI_IMAGE_URL);
    } catch {
      throw new ProviderError(
        "AI_IMAGE_URL is not a valid URL",
        "provider_not_configured",
        500,
        "Image generation is misconfigured (AI_IMAGE_URL is not a valid URL).",
      );
    }
  }
  if (env.IMAGE_PROVIDER === "pollinations" && env.POLLINATIONS_IMAGE_URL) {
    try {
      new URL(env.POLLINATIONS_IMAGE_URL);
    } catch {
      throw new ProviderError(
        "POLLINATIONS_IMAGE_URL is not a valid URL",
        "provider_not_configured",
        500,
        "Image generation is misconfigured (POLLINATIONS_IMAGE_URL is not a valid URL).",
      );
    }
  }
  if (env.VIDEO_PROVIDER === "local" && env.AI_VIDEO_URL) {
    try {
      new URL(env.AI_VIDEO_URL);
    } catch {
      throw new ProviderError(
        "AI_VIDEO_URL is not a valid URL",
        "provider_not_configured",
        500,
        "Video generation is misconfigured (AI_VIDEO_URL is not a valid URL).",
      );
    }
  }
}
