import type { VideoGenerationOptions, VideoGenerationProvider, MediaResult } from "../types";
import { ProviderError, mapProviderFailure } from "../errors";
import { fetchJson, fetchBuffer } from "../http";

/**
 * Local video generation provider.
 *
 * Talks to a self-hosted video inference server at AI_VIDEO_URL
 * (reference implementation: scripts/local-video-server.py — a thin
 * wrapper around diffusers pipelines such as Stable Video Diffusion,
 * Wan, CogVideoX, HunyuanVideo or LTX-Video).
 *
 * NOTE: video models are heavy. Run the inference server on a machine
 * with a GPU; the web server only orchestrates jobs.
 *
 * Request:
 *   POST {AI_VIDEO_URL}/generate
 *   { prompt, negative_prompt, duration, width, height, seed, model,
 *     image: "<base64>"?, motion_strength? }
 *
 * Response (one of):
 *   { "videos": [{ "data": "<base64>", "format": "mp4" }, ...] }
 *   { "videos": [{ "url": "http://.../x.mp4", "format": "mp4" }, ...] }
 *   — or raw binary video bytes for a single video.
 */
export class LocalVideoProvider implements VideoGenerationProvider {
  readonly kind = "local";
  readonly label = "Local inference server";

  constructor(private readonly baseUrl: string) {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ProviderError("AI_VIDEO_URL must be an http(s) URL", "provider_not_configured", 500);
    }
  }

  async generateVideo(options: VideoGenerationOptions): Promise<MediaResult[]> {
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/generate`;

    try {
      const body = JSON.stringify({
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? "",
        duration: options.duration,
        width: options.width,
        height: options.height,
        seed: options.seed,
        model: options.model === "auto" ? undefined : options.model,
        motion_strength: options.motionStrength,
        image: options.sourceImage ? options.sourceImage.data.toString("base64") : undefined,
        image_mime: options.sourceImage?.mimeType,
      });

      const response = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: options.signal,
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const data = await fetchBuffer(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: options.signal,
        });
        const format = contentType.includes("webm") ? "webm" : "mp4";
        return [
          {
            data,
            mimeType: `video/${format}`,
            extension: `.${format}`,
            width: options.width,
            height: options.height,
            isDemo: false,
          },
        ];
      }

      const payload = (await response.json()) as {
        videos?: Array<{ data?: string; url?: string; format?: string }>;
      };

      if (!payload.videos || !Array.isArray(payload.videos) || payload.videos.length === 0) {
        throw new ProviderError("Local video server returned no videos", "provider_failed");
      }

      const results: MediaResult[] = [];
      for (const video of payload.videos) {
        const format = video.format === "webm" ? "webm" : "mp4";
        const data = video.data
          ? Buffer.from(video.data, "base64")
          : video.url
            ? await fetchBuffer(video.url, { signal: options.signal })
            : null;
        if (!data) {
          throw new ProviderError("Local video server returned an empty video", "provider_failed");
        }
        results.push({
          data,
          mimeType: `video/${format}`,
          extension: `.${format}`,
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
