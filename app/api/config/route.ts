import { NextResponse } from "next/server";
import { getAiCapabilities } from "@/lib/ai";
import { env } from "@/lib/env";
import { ensureWorkerStarted } from "@/lib/workers/ensure-worker";
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  IMAGE_TO_VIDEO_MODELS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  IMAGE_ASPECT_RATIOS,
  VIDEO_ASPECT_RATIOS,
} from "@/lib/constants";

/**
 * GET /api/config — client-safe runtime configuration.
 * Booleans and lists only — never secrets, keys or internal URLs.
 */
export async function GET() {
  if (env.WORKER_AUTO_START) ensureWorkerStarted();
  const capabilities = getAiCapabilities();

  return NextResponse.json({
    app: { name: "VisionForge AI", demoMode: capabilities.demoMode },
    ai: capabilities,
    limits: {
      imagesPerHour: env.IMAGE_GENERATIONS_PER_HOUR,
      videosPerHour: env.VIDEO_GENERATIONS_PER_HOUR,
      maxUploadBytes: env.MAX_UPLOAD_BYTES,
    },
    options: {
      imageModels: IMAGE_MODELS,
      videoModels: VIDEO_MODELS,
      imageToVideoModels: IMAGE_TO_VIDEO_MODELS,
      videoDurations: VIDEO_DURATIONS,
      videoResolutions: VIDEO_RESOLUTIONS,
      imageAspectRatios: IMAGE_ASPECT_RATIOS,
      videoAspectRatios: VIDEO_ASPECT_RATIOS,
    },
  });
}
