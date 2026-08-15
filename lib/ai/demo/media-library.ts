import { promises as fs } from "node:fs";
import path from "node:path";
import { hashString } from "@/lib/utils";

/**
 * Bundled real sample media for demo mode.
 *
 * Demo generations show real photographs and video clips (stored in
 * public/demo/) instead of procedural SVG art, so every screen in the app
 * looks real. Results remain flagged isDemo and labelled "Demo Preview" —
 * they are never presented as model output.
 *
 * Credits:
 * - Photos: Pexels (https://www.pexels.com) — free license, no attribution
 *   required (file names carry the Pexels photo id).
 * - Videos: Pexels clips (same license) plus "Big Buck Bunny" (c Blender
 *   Foundation, CC-BY 3.0) and "Echo" (c Antics, CC-BY) from the MediaElement
 *   sample media collection.
 */

export interface DemoMediaAsset {
  /** Path relative to public/demo/, e.g. "images/pexels-417074-1344x768.jpg". */
  file: string;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
  credit: string;
}

export const DEMO_IMAGES: DemoMediaAsset[] = [
  { file: "images/pexels-417074-1344x768.jpg", width: 1344, height: 768, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-3408744-1344x768.jpg", width: 1344, height: 768, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-346529-1344x768.jpg", width: 1344, height: 768, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-414612-1344x768.jpg", width: 1344, height: 768, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-1366919-1344x768.jpg", width: 1344, height: 768, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-1108099-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-674010-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-572897-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-236047-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-132037-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-462118-1024x1024.jpg", width: 1024, height: 1024, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-132037-768x1344.jpg", width: 768, height: 1344, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
  { file: "images/pexels-2246476-768x1344.jpg", width: 768, height: 1344, mimeType: "image/jpeg", extension: ".jpg", credit: "Pexels" },
];

export const DEMO_VIDEOS: DemoMediaAsset[] = [
  { file: "videos/pexels-3571264-1280x720.mp4", width: 1280, height: 720, mimeType: "video/mp4", extension: ".mp4", credit: "Pexels" },
  { file: "videos/pexels-2022395-1280x720.mp4", width: 1280, height: 720, mimeType: "video/mp4", extension: ".mp4", credit: "Pexels" },
  { file: "videos/pexels-855029-640x360.mp4", width: 640, height: 360, mimeType: "video/mp4", extension: ".mp4", credit: "Pexels" },
  { file: "videos/big-buck-bunny-1280x720.mp4", width: 1280, height: 720, mimeType: "video/mp4", extension: ".mp4", credit: "Blender Foundation (CC-BY)" },
  { file: "videos/echo-hereweare.mp4", width: 480, height: 270, mimeType: "video/mp4", extension: ".mp4", credit: "Antics (CC-BY)" },
];

const ASSET_ROOT = path.join(process.cwd(), "public", "demo");

/** Read a bundled asset. Returns null when the file is missing. */
export async function readDemoAsset(asset: DemoMediaAsset): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(ASSET_ROOT, asset.file));
  } catch {
    return null;
  }
}

function aspectBucket(width: number, height: number): "portrait" | "landscape" | "square" {
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

/**
 * Deterministic pick biased toward the requested aspect ratio. The same
 * prompt + index always yields the same photo.
 */
export function pickDemoImage(prompt: string, index: number, width: number, height: number): DemoMediaAsset {
  const bucket = aspectBucket(width, height);
  const candidates = DEMO_IMAGES.filter((a) => aspectBucket(a.width, a.height) === bucket);
  const pool = candidates.length > 0 ? candidates : DEMO_IMAGES;
  const seed = hashString(`${prompt}:${index}`);
  return pool[seed % pool.length];
}

/** Deterministic pick of a bundled video clip. */
export function pickDemoVideo(prompt: string, index = 0): DemoMediaAsset {
  const seed = hashString(`${prompt}:${index}`);
  return DEMO_VIDEOS[seed % DEMO_VIDEOS.length];
}
