/** Shared domain constants. Keep in sync with prisma/schema.prisma comments. */

export const GENERATION_TYPES = ["IMAGE", "VIDEO", "IMAGE_TO_VIDEO"] as const;
export type GenerationType = (typeof GENERATION_TYPES)[number];

export const GENERATION_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const TERMINAL_STATUSES: GenerationStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export interface AspectRatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const IMAGE_ASPECT_RATIOS: AspectRatioPreset[] = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 1344, height: 768 },
  { id: "9:16", label: "9:16", width: 768, height: 1344 },
  { id: "4:3", label: "4:3", width: 1216, height: 912 },
  { id: "3:4", label: "3:4", width: 912, height: 1216 },
];

export const VIDEO_ASPECT_RATIOS: AspectRatioPreset[] = [
  { id: "16:9", label: "16:9", width: 1280, height: 720 },
  { id: "9:16", label: "9:16", width: 720, height: 1280 },
  { id: "1:1", label: "1:1", width: 768, height: 768 },
];

export interface ResolutionPreset {
  id: string;
  label: string;
  minDimension: number; // long-edge resolution this preset maps to
}

export const VIDEO_RESOLUTIONS: ResolutionPreset[] = [
  { id: "512p", label: "512p", minDimension: 512 },
  { id: "720p", label: "720p", minDimension: 720 },
  { id: "1080p", label: "1080p", minDimension: 1080 },
];

export const VIDEO_DURATIONS = [3, 5, 10] as const;

export const IMAGE_MODELS = [
  { id: "auto", label: "Auto (provider default)" },
  { id: "sd-1.5", label: "Stable Diffusion 1.5" },
  { id: "sd-2.1", label: "Stable Diffusion 2.1" },
  { id: "sdxl", label: "SDXL" },
  { id: "flux-schnell", label: "FLUX.1 Schnell" },
] as const;

export const VIDEO_MODELS = [
  { id: "auto", label: "Auto (provider default)" },
  { id: "svd", label: "Stable Video Diffusion" },
  { id: "wan-2.1", label: "Wan 2.1" },
  { id: "cogvideox", label: "CogVideoX" },
  { id: "hunyuan-video", label: "HunyuanVideo" },
  { id: "ltx-video", label: "LTX-Video" },
] as const;

export const IMAGE_TO_VIDEO_MODELS = [
  { id: "auto", label: "Auto (provider default)" },
  { id: "svd", label: "Stable Video Diffusion" },
  { id: "i2vgen-xl", label: "I2VGen-XL" },
  { id: "wan-2.1-i2v", label: "Wan 2.1 I2V" },
  { id: "cogvideox-i2v", label: "CogVideoX I2V" },
] as const;

export const IMAGE_QUALITIES = [
  { id: "draft", label: "Draft", steps: 15 },
  { id: "standard", label: "Standard", steps: 28 },
  { id: "high", label: "High", steps: 40 },
] as const;

export const MAX_PROMPT_LENGTH = 2000;
export const MAX_NEGATIVE_PROMPT_LENGTH = 1000;
export const MAX_IMAGES_PER_GENERATION = 4;

export const STORAGE_DIRS = {
  images: "images",
  videos: "videos",
  thumbnails: "thumbnails",
  uploads: "uploads",
} as const;

export const APP_NAME = "VisionForge AI";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
