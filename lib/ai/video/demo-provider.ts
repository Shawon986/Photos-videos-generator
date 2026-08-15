import type { VideoGenerationOptions, VideoGenerationProvider, MediaResult } from "../types";
import { generateArtSvg } from "../demo/art";
import { pickDemoVideo, readDemoAsset } from "../demo/media-library";

/**
 * Demo video provider.
 *
 * Serves real bundled video clips (public/demo/videos/) picked
 * deterministically from the prompt, so demo mode looks like the real app.
 * Always flagged isDemo and labelled "Demo Preview" — bundled samples are
 * never presented as model output.
 *
 * Falls back to an animated SVG (SMIL) if a bundled asset is missing.
 */
export class DemoVideoProvider implements VideoGenerationProvider {
  readonly kind = "demo";
  readonly label = "Demo (sample media preview)";

  async generateVideo(options: VideoGenerationOptions): Promise<MediaResult[]> {
    options.onProgress?.({ stage: "Selecting sample media...", progress: null });

    const asset = pickDemoVideo(options.prompt);
    const data = await readDemoAsset(asset);
    if (data) {
      options.onProgress?.({ stage: "Demo preview ready", progress: null });
      return [
        {
          data,
          mimeType: asset.mimeType,
          extension: asset.extension,
          width: asset.width,
          height: asset.height,
          isDemo: true,
        },
      ];
    }

    // Procedural fallback keeps demo mode working without the bundle.
    const svg = generateArtSvg({
      prompt: options.prompt,
      seed: options.seed,
      width: options.width,
      height: options.height,
      animated: true,
      durationSeconds: options.duration,
    });

    options.onProgress?.({ stage: "Demo animation ready", progress: null });

    return [
      {
        data: Buffer.from(svg, "utf-8"),
        mimeType: "image/svg+xml",
        extension: ".svg",
        width: options.width,
        height: options.height,
        isDemo: true,
      },
    ];
  }
}
