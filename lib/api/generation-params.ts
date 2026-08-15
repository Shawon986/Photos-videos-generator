import { IMAGE_ASPECT_RATIOS, VIDEO_ASPECT_RATIOS, VIDEO_RESOLUTIONS } from "@/lib/constants";
import { badRequest } from "@/lib/api-helpers";

/** Resolve explicit or preset image dimensions (256-2048, multiples of 8). */
export function resolveImageDimensions(input: {
  width?: number;
  height?: number;
  aspectRatio?: string;
}): { width: number; height: number } {
  if (input.width && input.height) {
    const width = Math.round(input.width / 8) * 8;
    const height = Math.round(input.height / 8) * 8;
    if (width < 256 || width > 2048 || height < 256 || height > 2048) {
      throw badRequest("Image dimensions must be between 256 and 2048 pixels.");
    }
    return { width, height };
  }
  const preset =
    IMAGE_ASPECT_RATIOS.find((r) => r.id === (input.aspectRatio ?? "1:1")) ??
    IMAGE_ASPECT_RATIOS[0];
  return { width: preset.width, height: preset.height };
}

/** Resolve video dimensions from aspect ratio + resolution preset. */
export function resolveVideoDimensions(input: {
  aspectRatio?: string;
  resolution?: string;
}): { width: number; height: number } {
  const ratio =
    VIDEO_ASPECT_RATIOS.find((r) => r.id === (input.aspectRatio ?? "16:9")) ??
    VIDEO_ASPECT_RATIOS[0];
  const resolution =
    VIDEO_RESOLUTIONS.find((r) => r.id === (input.resolution ?? "512p")) ?? VIDEO_RESOLUTIONS[0];

  const scale = resolution.minDimension / Math.max(ratio.width, ratio.height);
  const width = Math.max(256, Math.round((ratio.width * scale) / 16) * 16);
  const height = Math.max(256, Math.round((ratio.height * scale) / 16) * 16);
  return { width, height };
}
