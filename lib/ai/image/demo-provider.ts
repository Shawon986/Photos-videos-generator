import type { ImageGenerationOptions, ImageGenerationProvider, MediaResult } from "../types";
import { generateArtSvg } from "../demo/art";
import { pickDemoImage, readDemoAsset } from "../demo/media-library";

/**
 * Demo image provider.
 *
 * Serves real bundled sample photographs (public/demo/images/) picked
 * deterministically from the prompt, so demo mode looks like the real app.
 * Used when DEMO_MODE=true and no real provider is configured. Every result
 * is flagged isDemo so the UI labels it "Demo Preview" — bundled samples are
 * never presented as model output.
 *
 * Falls back to procedural SVG art if a bundled asset is missing.
 */
export class DemoImageProvider implements ImageGenerationProvider {
  readonly kind = "demo";
  readonly label = "Demo (sample media preview)";

  async generateImage(options: ImageGenerationOptions): Promise<MediaResult[]> {
    options.onProgress?.({ stage: "Selecting sample media...", progress: null });

    const results: MediaResult[] = [];
    for (let i = 0; i < options.numImages; i++) {
      const asset = pickDemoImage(options.prompt, i, options.width, options.height);
      const data = await readDemoAsset(asset);
      if (data) {
        results.push({
          data,
          mimeType: asset.mimeType,
          extension: asset.extension,
          width: asset.width,
          height: asset.height,
          isDemo: true,
        });
      } else {
        // Procedural fallback keeps demo mode working without the bundle.
        const seed = (options.seed ?? 0) + i * 7919;
        const svg = generateArtSvg({
          prompt: options.prompt,
          seed,
          width: options.width,
          height: options.height,
        });
        results.push({
          data: Buffer.from(svg, "utf-8"),
          mimeType: "image/svg+xml",
          extension: ".svg",
          width: options.width,
          height: options.height,
          isDemo: true,
        });
      }
    }

    options.onProgress?.({ stage: "Demo preview ready", progress: null });
    return results;
  }
}
