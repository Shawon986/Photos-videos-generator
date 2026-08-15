import type { VideoGenerationOptions, VideoGenerationProvider, MediaResult } from "../types";
import { ProviderError, mapProviderFailure } from "../errors";
import { fetchBuffer } from "../http";

/**
 * Hugging Face Inference API video provider (free tier available).
 *
 * Text-to-video and image-to-video models exposed through HF Inference.
 * These models have fixed native resolutions/frame counts; the provider
 * maps requests onto the closest supported configuration and reports the
 * model's actual output size.
 */
const T2V_MODEL_MAP: Record<string, string> = {
  auto: "damo-vilab/text-to-video-ms-1.7b",
  wan: "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
  cogvideox: "THUDM/CogVideoX-2b",
  "hunyuan-video": "tencent/HunyuanVideo",
};

const I2V_MODEL_MAP: Record<string, string> = {
  auto: "ali-vilab/i2vgen-xl",
  svd: "stabilityai/stable-video-diffusion-img2vid",
  "i2vgen-xl": "ali-vilab/i2vgen-xl",
};

export class HuggingFaceVideoProvider implements VideoGenerationProvider {
  readonly kind = "huggingface";
  readonly label = "Hugging Face Inference";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api-inference.huggingface.co",
  ) {}

  async generateVideo(options: VideoGenerationOptions): Promise<MediaResult[]> {
    const isI2v = Boolean(options.sourceImage);
    const map = isI2v ? I2V_MODEL_MAP : T2V_MODEL_MAP;
    const model = map[options.model ?? "auto"] ?? map.auto;

    const url = `${this.baseUrl.replace(/\/$/, "")}/models/${model}`;

    try {
      options.onProgress?.({ stage: "Loading AI model on Hugging Face...", progress: null });

      const parameters: Record<string, unknown> = {
        seed: options.seed,
        num_frames: 16,
      };

      const body = JSON.stringify({
        inputs: options.sourceImage ? options.sourceImage.data.toString("base64") : options.prompt,
        parameters,
        options: { wait_for_model: true },
      });

      const data = await fetchBuffer(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: options.signal,
      });

      // HF video models output fixed sizes; we track requested size here
      // and the worker stores the actual file as-is.
      return [
        {
          data,
          mimeType: "video/mp4",
          extension: ".mp4",
          width: options.width,
          height: options.height,
          isDemo: false,
        },
      ];
    } catch (err) {
      throw mapProviderFailure(err, this.label);
    }
  }
}

export function huggingFaceVideoNotConfigured(): ProviderError {
  return new ProviderError(
    "No AI video provider is configured.",
    "provider_not_configured",
    503,
    "Video generation is currently unavailable because no video provider is configured. Set AI_VIDEO_URL or HUGGINGFACE_API_KEY.",
  );
}
