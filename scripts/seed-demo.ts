/**
 * Seed (or refresh) the demo account with real sample media.
 *
 *   ./node_modules/.bin/tsx scripts/seed-demo.ts
 *
 * Replaces every demo (isDemo=true) generation of the demo account with a
 * curated set of bundled real photographs and video clips, including one
 * shared generation so Explore has content. Files are copied into the local
 * storage under the new generation ids; old demo files are removed.
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db as appDb } from "@/lib/db";
import { PrismaClient as PgPrismaClient } from "../node_modules/.prisma-pg/client";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { buildStorageKey, resolveUnderRoot } from "@/lib/storage/provider";
import {
  DEMO_IMAGES,
  DEMO_VIDEOS,
  readDemoAsset,
  type DemoMediaAsset,
} from "@/lib/ai/demo/media-library";

const DEMO_EMAIL = "test@visionforge.local";
const DEMO_PASSWORD = "Test-pass-123";
const DEMO_NAME = "VisionForge Demo";

interface SeedEntry {
  type: "IMAGE" | "VIDEO" | "IMAGE_TO_VIDEO";
  prompt: string;
  model: string;
  quality?: string;
  duration?: number;
  /** RESULT media, in order (1-2 entries). */
  assets: DemoMediaAsset[];
  /** Source photo for image-to-video. */
  source?: DemoMediaAsset;
  /** Create a public Share row (visible on Explore). */
  share?: boolean;
}

const SEED: SeedEntry[] = [
  {
    type: "IMAGE",
    prompt: "a serene mountain lake at sunrise, cinematic",
    model: "auto",
    quality: "standard",
    assets: [DEMO_IMAGES[0], DEMO_IMAGES[1]], // two 16:9 landscapes
    share: true,
  },
  {
    type: "IMAGE",
    prompt: "a golden retriever basking in warm afternoon light",
    model: "auto",
    quality: "standard",
    assets: [DEMO_IMAGES[5]], // 1:1
  },
  {
    type: "IMAGE",
    prompt: "misty mountain peaks at golden hour",
    model: "flux-schnell",
    quality: "high",
    assets: [DEMO_IMAGES[12]], // 9:16
  },
  {
    type: "VIDEO",
    prompt: "aerial drone footage sweeping over a tropical coastline",
    model: "auto",
    duration: 5,
    assets: [DEMO_VIDEOS[0]], // 1280x720
  },
  {
    type: "VIDEO",
    prompt: "waves rolling onto a sandy shore at sunset",
    model: "auto",
    duration: 5,
    assets: [DEMO_VIDEOS[1]], // 1280x720
  },
  {
    type: "IMAGE_TO_VIDEO",
    prompt: "gentle camera drift toward the subject",
    model: "auto",
    duration: 5,
    assets: [DEMO_VIDEOS[2]], // 640x360
    source: DEMO_IMAGES[6], // parrot photo as the input image
  },
];

// The local @prisma/client is generated for SQLite and rejects Postgres
// URLs. To seed the production (Neon) database, generate an isolated
// Postgres client first (prisma generate --schema prisma/schema.pg-seed.prisma)
// and run with SEED_PG_CLIENT=1.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dev script; the two client types don't union cleanly
const db: any = process.env.SEED_PG_CLIENT === "1" ? new PgPrismaClient() : appDb;

async function main() {
  // 1. Demo user.
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    user = await db.user.create({
      data: { email: DEMO_EMAIL, name: DEMO_NAME, passwordHash },
    });
    console.log(`Created demo account ${DEMO_EMAIL}.`);
  }

  // 2. Remove existing demo generations and their files.
  const storage = getStorage();
  const existing = await db.generation.findMany({
    where: { userId: user.id, isDemo: true },
    select: { id: true },
  });
  if (existing.length > 0) {
    await db.generation.deleteMany({ where: { id: { in: existing.map((g: { id: string }) => g.id) } } });
    const root = path.resolve(env.UPLOAD_DIR);
    for (const g of existing) {
      for (const dir of ["images", "videos"]) {
        const p = resolveUnderRoot(root, buildStorageKey(dir, g.id));
        await fs.rm(p, { recursive: true, force: true });
      }
    }
    // Demo-user uploads (image-to-video source images).
    const uploads = resolveUnderRoot(root, buildStorageKey("uploads", user.id));
    await fs.rm(uploads, { recursive: true, force: true });
    console.log(`Removed ${existing.length} old demo generation(s).`);
  }

  // 3. Recreate with real bundled media.
  for (const entry of SEED) {
    const primary = entry.assets[0];
    const isImage = entry.type === "IMAGE";
    const dir = isImage ? "images" : "videos";

    const generation = await db.generation.create({
      data: {
        userId: user.id,
        type: entry.type,
        prompt: entry.prompt,
        model: entry.model,
        provider: "demo",
        status: "COMPLETED",
        width: primary.width,
        height: primary.height,
        numImages: entry.assets.length,
        duration: entry.duration ?? null,
        quality: entry.quality ?? null,
        isDemo: true,
      },
    });

    const storedUrls: string[] = [];
    for (let i = 0; i < entry.assets.length; i++) {
      const asset = entry.assets[i];
      const data = await readDemoAsset(asset);
      if (!data) {
        throw new Error(`Bundled demo asset missing: public/demo/${asset.file}`);
      }
      const key = buildStorageKey(dir, generation.id, `result_${i}${asset.extension}`);
      const stored = await storage.put(key, data, asset.mimeType);
      storedUrls.push(stored.url);
      await db.generationAsset.create({
        data: {
          generationId: generation.id,
          kind: "RESULT",
          storageKey: stored.key,
          url: stored.url,
          mimeType: stored.mimeType,
          width: asset.width,
          height: asset.height,
          sizeBytes: stored.sizeBytes,
        },
      });
    }

    // Optional source image for image-to-video.
    let sourceImageUrl: string | null = null;
    if (entry.source) {
      const source = entry.source;
      const data = await readDemoAsset(source);
      if (!data) {
        throw new Error(`Bundled demo asset missing: public/demo/${source.file}`);
      }
      const key = buildStorageKey("uploads", user.id, `${randomUUID()}${source.extension}`);
      const stored = await storage.put(key, data, source.mimeType);
      sourceImageUrl = stored.url;
      await db.generationAsset.create({
        data: {
          userId: user.id,
          kind: "UPLOAD",
          storageKey: stored.key,
          url: stored.url,
          mimeType: stored.mimeType,
          width: source.width,
          height: source.height,
          sizeBytes: stored.sizeBytes,
        },
      });
    }

    await db.generation.update({
      where: { id: generation.id },
      data: {
        resultUrl: storedUrls[0],
        // Images use their own first result as thumbnail (same as the worker).
        thumbnailUrl: isImage ? storedUrls[0] : null,
        sourceImageUrl,
      },
    });

    if (entry.share) {
      await db.share.create({ data: { generationId: generation.id, userId: user.id } });
    }

    console.log(
      `Seeded ${entry.type} "${entry.prompt}" -> ${storedUrls.length} result(s)${
        entry.share ? " (shared to Explore)" : ""
      }${sourceImageUrl ? " (with source image)" : ""}`,
    );
  }

  console.log("Demo account refreshed.");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
