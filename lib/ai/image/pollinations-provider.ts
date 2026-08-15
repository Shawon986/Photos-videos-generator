import type { ImageGenerationOptions, ImageGenerationProvider, MediaResult } from "../types";
import { mapProviderFailure } from "../errors";
import { fetchBuffer } from "../http";

/**
 * Pollinations image provider — free, no API key, no account.
 * https://pollinations.ai — community-funded open-model API.
 *
 * Endpoint: GET {baseUrl}/prompt/{prompt}?width=&height=&seed=&model=&private=
 * Returns the image bytes directly (image/jpeg).
 *
 * Notes:
 * — Anonymous tier allows one request every ~15s and images may carry a
 *   Pollinations watermark (removal requires a free account token, which
 *   this provider deliberately does not require).
 * — `private=true` keeps prompts out of the public community feed.
 * — The server picks its own default model ("sana" at the time of writing)
 *   when the model param is omitted; /models lists what's currently live.
 */
const MODEL_MAP: Record<string, string | undefined> = {
  auto: undefined, // omit — let the server use its current default
  "flux-schnell": "flux",
  sdxl: "turbo",
  // SD 1.5/2.1 are not offered — the server's default basic model is used.
  "sd-1.5": "sana",
  "sd-2.1": "sana",
};

export class PollinationsImageProvider implements ImageGenerationProvider {
  readonly kind = "pollinations";
  readonly label = "Pollinations (free open-model API)";

  constructor(
    private readonly baseUrl = "https://image.pollinations.ai",
    private readonly referrer?: string,
  ) {}

  async generateImage(options: ImageGenerationOptions): Promise<MediaResult[]> {
    const results: MediaResult[] = [];

    for (let i = 0; i < options.numImages; i++) {
      try {
        options.onProgress?.({
          stage:
            options.numImages > 1
              ? `Generating image ${i + 1} of ${options.numImages} with Pollinations...`
              : "Generating your image with Pollinations...",
          progress: null, // the API reports no progress — indeterminate
        });

        const params = new URLSearchParams({
          width: String(options.width),
          height: String(options.height),
          // Keep prompts out of the public community feed.
          private: "true",
        });
        const model = MODEL_MAP[options.model ?? "auto"];
        if (model) params.set("model", model);
        if (options.seed !== undefined) params.set("seed", String(options.seed + i));
        if (this.referrer) params.set("referrer", this.referrer);

        const url = `${this.baseUrl.replace(/\/$/, "")}/prompt/${encodeURIComponent(options.prompt)}?${params.toString()}`;

        const data = await fetchBuffer(url, { signal: options.signal });

        results.push({
          data,
          mimeType: "image/jpeg",
          extension: ".jpg",
          width: options.width,
          height: options.height,
          isDemo: false,
        });
      } catch (err) {
        throw mapProviderFailure(err, this.label);
      }
    }

    return results;
  }
}
