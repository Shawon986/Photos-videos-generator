import type { ImageGenerationOptions, ImageGenerationProvider, MediaResult } from "../types";
import { ProviderError, mapProviderFailure } from "../errors";
import { fetchJson, fetchBuffer } from "../http";

/**
 * Local image generation provider.
 *
 * Talks to a self-hosted inference server at AI_IMAGE_URL
 * (e.g. the reference server in scripts/local-image-server.py, ComfyUI
 * wrappers, or any server speaking the protocol below).
 *
 * Request:
 *   POST {AI_IMAGE_URL}/generate
 *   { prompt, negative_prompt, width, height, num_images, steps,
 *     guidance_scale, seed, model }
 *
 * Response (one of):
 *   { "images": [{ "data": "<base64>", "format": "png" }, ...] }
 *   { "images": [{ "url": "http://.../x.png", "format": "png" }, ...] }
 *   — or raw binary image bytes for a single image.
 */
export class LocalImageProvider implements ImageGenerationProvider {
  readonly kind = "local";
  readonly label = "Local inference server";

  constructor(private readonly baseUrl: string) {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ProviderError(
        "AI_IMAGE_URL must be an http(s) URL",
        "provider_not_configured",
        500,
      );
    }
  }

  async generateImage(options: ImageGenerationOptions): Promise<MediaResult[]> {
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/generate`;

    try {
      const body = JSON.stringify({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? "",
        width: options.width,
        height: options.height,
        num_images: options.numImages,
        steps: options.steps,
        guidance_scale: options.guidanceScale,
        seed: options.seed,
        model: options.model === "auto" ? undefined : options.model,
      });

      const response = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: options.signal,
      });

      // Raw binary fallback: some servers return the image itself.
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const data = await fetchBuffer(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: options.signal,
        });
        const format = contentType.includes("jpeg") ? "jpeg" : "png";
        return [
          {
            data,
            mimeType: `image/${format}`,
            extension: `.${format === "jpeg" ? "jpg" : "png"}`,
            width: options.width,
            height: options.height,
            isDemo: false,
          },
        ];
      }

      const payload = (await response.json()) as {
        images?: Array<{ data?: string; url?: string; format?: string }>;
      };

      if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
        throw new ProviderError(
          "Local image server returned no images",
          "provider_failed",
        );
      }

      const results: MediaResult[] = [];
      for (const image of payload.images) {
        const format = image.format === "jpeg" || image.format === "jpg" ? "jpeg" : "png";
        const data = image.data
          ? Buffer.from(image.data, "base64")
          : image.url
            ? await fetchBuffer(image.url, { signal: options.signal })
            : null;
        if (!data) {
          throw new ProviderError("Local image server returned an empty image", "provider_failed");
        }
        results.push({
          data,
          mimeType: `image/${format}`,
          extension: `.${format === "jpeg" ? "jpg" : "png"}`,
          width: options.width,
          height: options.height,
          isDemo: false,
        });
      }
      return results;
    } catch (err) {
      throw mapProviderFailure(err, this.label);
    }
  }
}
