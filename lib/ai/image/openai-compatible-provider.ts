import type { ImageGenerationOptions, ImageGenerationProvider, MediaResult } from "../types";
import { ProviderError, mapProviderFailure } from "../errors";
import { fetchJson, fetchBuffer } from "../http";

/**
 * OpenAI-compatible image generation provider.
 *
 * Works with any server exposing the `/v1/images/generations` shape —
 * SiliconFlow (https://siliconflow.cn, free tier with FLUX.1-schnell and
 * SDXL), Together, Novita, or self-hosted OpenAI-compatible gateways.
 * This is also the recommended path when huggingface.co is unreachable
 * from the deployment network.
 *
 * Request:
 *   POST {baseUrl}/images/generations
 *   { model, prompt, negative_prompt, image_size: "WxH", batch_size,
 *     num_inference_steps, guidance_scale, seed }
 *
 * Response:
 *   { images: [{ url | b64_json }], seed? }
 */
const MODEL_MAP: Record<string, string> = {
  // SiliconFlow model ids (change for other OpenAI-compatible providers).
  auto: "black-forest-labs/FLUX.1-schnell",
  "flux-schnell": "black-forest-labs/FLUX.1-schnell",
  sdxl: "stabilityai/stable-diffusion-xl-base-1.0",
  // SD 1.5/2.1 are not offered — map to the closest available model.
  "sd-1.5": "stabilityai/stable-diffusion-xl-base-1.0",
  "sd-2.1": "stabilityai/stable-diffusion-xl-base-1.0",
};

/** Sizes commonly supported by SDXL/FLUX-compatible endpoints. */
const SUPPORTED_SIZES = [
  [1024, 1024],
  [960, 1280],
  [1280, 960],
  [768, 1024],
  [1024, 768],
  [512, 512],
] as const;

function closestSize(width: number, height: number): { width: number; height: number } {
  const targetRatio = width / height;
  let best: { width: number; height: number } = {
    width: SUPPORTED_SIZES[0][0],
    height: SUPPORTED_SIZES[0][1],
  };
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [w, h] of SUPPORTED_SIZES) {
    const ratioDiff = Math.abs(Math.log(w / h) - Math.log(targetRatio));
    const areaDiff = Math.abs(Math.min(width, height) - Math.min(w, h)) / Math.min(w, h);
    const score = ratioDiff * 2 + areaDiff;
    if (score < bestScore) {
      bestScore = score;
      best = { width: w, height: h };
    }
  }
  return best;
}

export class OpenAICompatibleImageProvider implements ImageGenerationProvider {
  readonly kind = "openai-compatible";
  readonly label = "OpenAI-compatible image API";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async generateImage(options: ImageGenerationOptions): Promise<MediaResult[]> {
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/images/generations`;
    const size = closestSize(options.width, options.height);

    try {
      const body = JSON.stringify({
        model: MODEL_MAP[options.model ?? "auto"] ?? MODEL_MAP.auto,
        prompt: options.prompt,
        negative_prompt: options.negativePrompt,
        image_size: `${size.width}x${size.height}`,
        batch_size: options.numImages,
        num_inference_steps: options.steps,
        guidance_scale: options.guidanceScale,
        seed: options.seed,
      });

      const response = await fetchJson(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: options.signal,
      });

      const payload = (await response.json()) as {
        images?: Array<{ url?: string; b64_json?: string }>;
        error?: { message?: string };
        code?: number;
        message?: string;
      };

      // OpenAI-compatible APIs may return errors with HTTP 200 in the body.
      const apiError = payload.error?.message ?? (payload.code ? payload.message : undefined);
      if (apiError) {
        if (/balance|insufficient|credit/i.test(apiError)) {
          throw new ProviderError(
            `Image API reported insufficient balance: ${apiError}`,
            "provider_failed",
            402,
            "Your AI provider account has run out of credit. Please top up your account and try again.",
          );
        }
        throw new Error(`Image API returned an error: ${apiError}`);
      }
      if (!payload.images || payload.images.length === 0) {
        throw new ProviderError("Image API returned no images", "provider_failed");
      }

      const results: MediaResult[] = [];
      for (const image of payload.images) {
        const data = image.b64_json
          ? Buffer.from(image.b64_json, "base64")
          : image.url
            ? await fetchBuffer(image.url, {
                headers: { Authorization: `Bearer ${this.apiKey}` },
                signal: options.signal,
              })
            : null;
        if (!data) {
          throw new ProviderError("Image API returned an empty image", "provider_failed");
        }
        results.push({
          data,
          mimeType: "image/png",
          extension: ".png",
          width: size.width,
          height: size.height,
          isDemo: false,
        });
      }
      return results;
    } catch (err) {
      // Errors that arrive as HTTP 4xx with a JSON body (SiliconFlow style).
      const body = (err as { body?: { message?: string } }).body;
      if (body?.message && /balance|insufficient|credit/i.test(body.message)) {
        throw new ProviderError(
          `Image API reported insufficient balance: ${body.message}`,
          "provider_failed",
          402,
          "Your AI provider account has run out of credit. Please top up your account and try again.",
        );
      }
      throw mapProviderFailure(err, this.label);
    }
  }
}
