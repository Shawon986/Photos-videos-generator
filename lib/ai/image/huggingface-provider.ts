import type { ImageGenerationOptions, ImageGenerationProvider, MediaResult } from "../types";
import { ProviderError, mapProviderFailure } from "../errors";
import { fetchBuffer } from "../http";

/**
 * Hugging Face Inference API image provider (free tier available).
 *
 * Ported and hardened from the original VisionForge prototype:
 * — model per prompt selection via a model map
 * — wait_for_model so cold models load instead of 503-ing
 * — width/height clamped to what the model actually supports
 */
const MODEL_MAP: Record<string, { hfModel: string; maxSize: number }> = {
  auto: { hfModel: "stabilityai/stable-diffusion-2-1", maxSize: 768 },
  "sd-1.5": { hfModel: "runwayml/stable-diffusion-v1-5", maxSize: 768 },
  "sd-2.1": { hfModel: "stabilityai/stable-diffusion-2-1", maxSize: 768 },
  sdxl: { hfModel: "stabilityai/stable-diffusion-xl-base-1.0", maxSize: 1024 },
  "flux-schnell": { hfModel: "black-forest-labs/FLUX.1-schnell", maxSize: 1024 },
};

export class HuggingFaceImageProvider implements ImageGenerationProvider {
  readonly kind = "huggingface";
  readonly label = "Hugging Face Inference";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api-inference.huggingface.co",
  ) {}

  async generateImage(options: ImageGenerationOptions): Promise<MediaResult[]> {
    const model = MODEL_MAP[options.model ?? "auto"] ?? MODEL_MAP.auto;
    const maxSize = model.maxSize;
    // Clamp to the model's supported size, keeping the aspect ratio.
    const scale = Math.min(1, maxSize / Math.max(options.width, options.height));
    const width = Math.max(256, Math.round((options.width * scale) / 8) * 8);
    const height = Math.max(256, Math.round((options.height * scale) / 8) * 8);

    const url = `${this.baseUrl.replace(/\/$/, "")}/models/${model.hfModel}`;

    const results: MediaResult[] = [];
    for (let i = 0; i < options.numImages; i++) {
      try {
        const body = JSON.stringify({
          inputs: options.prompt,
          parameters: {
            negative_prompt: options.negativePrompt,
            guidance_scale: options.guidanceScale,
            num_inference_steps: options.steps,
            width,
            height,
            seed: options.seed,
          },
          options: { wait_for_model: true },
        });

        const response = await fetchBuffer(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: options.signal,
        });

        results.push({
          data: response,
          mimeType: "image/png",
          extension: ".png",
          width,
          height,
          isDemo: false,
        });
      } catch (err) {
        throw mapProviderFailure(err, this.label);
      }
    }
    return results;
  }
}

export function huggingFaceImageModelId(model?: string): string {
  return (MODEL_MAP[model ?? "auto"] ?? MODEL_MAP.auto).hfModel;
}

export function huggingFaceNotConfigured(): ProviderError {
  return new ProviderError(
    "No AI image provider is configured.",
    "provider_not_configured",
    503,
    "Image generation failed — no AI image provider is configured. Set AI_IMAGE_URL or HUGGINGFACE_API_KEY.",
  );
}
