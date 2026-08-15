import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { buildStorageKey } from "@/lib/storage/provider";
import {
  resolveImageProvider,
  resolveVideoProvider,
  assertProviderConfig,
  ProviderError,
} from "@/lib/ai";
import type { MediaResult, ProgressReporter } from "@/lib/ai/types";
import {
  claimNextJob,
  completeJob,
  failJob,
  isJobCancelled,
  requeueJob,
  updateJobProgress,
} from "@/lib/jobs/queue";

/**
 * Background generation worker.
 *
 * Polls the database-backed queue and runs generations through the
 * configured AI providers. Runs:
 *   — inside the Next.js server in development (see instrumentation.ts)
 *   — as a standalone process in production: `npm run worker`
 *
 * The HTTP request that created a generation never blocks on generation.
 */

const STALE_JOB_MS = 30 * 60_000; // recover jobs stuck PROCESSING by a crash

let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;
const activeControllers = new Map<string, AbortController>();

const RETRYABLE_CODES = new Set(["provider_unavailable", "provider_timeout"]);

function log(message: string): void {
  console.log(`[worker] ${message}`);
}

function abortIfCancelled(): void {
  void (async () => {
    try {
      const cancelled = await db.generationJob.findMany({
        where: { status: "CANCELLED", id: { in: [...activeControllers.keys()] } },
        select: { id: true },
      });
      for (const job of cancelled) {
        activeControllers.get(job.id)?.abort();
        activeControllers.delete(job.id);
      }
    } catch {
      // best-effort
    }
  })();
}

async function recoverStaleJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_JOB_MS);
  const stale = await db.generationJob.updateMany({
    where: { status: "PROCESSING", startedAt: { lt: cutoff } },
    data: { status: "QUEUED", stage: null, progress: null, startedAt: null },
  });
  if (stale.count > 0) log(`Recovered ${stale.count} stale job(s) after worker restart.`);
}

function createProgressReporter(jobId: string): ProgressReporter {
  let lastUpdate = 0;
  return (update) => {
    const now = Date.now();
    if (now - lastUpdate < 1000 && update.progress !== 100) return;
    lastUpdate = now;
    void updateJobProgress(jobId, {
      stage: update.stage,
      progress: update.progress,
    }).catch(() => {
      /* best-effort */
    });
  };
}

async function storeResults(generationId: string, results: MediaResult[], type: string) {
  const storage = getStorage();
  const dir = type === "IMAGE" ? "images" : "videos";
  const primary = results[0];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const key = buildStorageKey(dir, generationId, `result_${i}${result.extension}`);
    const stored = await storage.put(key, result.data, result.mimeType);
    await db.generationAsset.create({
      data: {
        generationId,
        kind: "RESULT",
        storageKey: stored.key,
        url: stored.url,
        mimeType: stored.mimeType,
        width: result.width,
        height: result.height,
        sizeBytes: stored.sizeBytes,
      },
    });
  }

  // SVG results (legacy demo fallback) serve as their own thumbnail.
  let thumbnailUrl: string | null = null;
  if (type !== "IMAGE" && primary.extension === ".svg") {
    thumbnailUrl = primary ? `/api/files/${dir}/${generationId}/result_0.svg` : null;
  } else if (type === "IMAGE") {
    thumbnailUrl = `/api/files/${dir}/${generationId}/result_0${primary.extension}`;
  }

  return {
    resultUrl: `/api/files/${dir}/${generationId}/result_0${primary.extension}`,
    thumbnailUrl,
    width: primary.width,
    height: primary.height,
  };
}

async function processOneJob(): Promise<boolean> {
  const claimed = await claimNextJob();
  if (!claimed) return false;

  const { jobId, generationId, attempt } = claimed;
  const controller = new AbortController();
  activeControllers.set(jobId, controller);
  const onProgress = createProgressReporter(jobId);

  try {
    const generation = await db.generation.findUnique({ where: { id: generationId } });
    if (!generation) {
      await failJob(jobId, "Generation record was deleted.");
      return true;
    }

    if (await isJobCancelled(jobId)) {
      await db.generation.update({ where: { id: generationId }, data: { status: "CANCELLED" } });
      return true;
    }

    const isImage = generation.type === "IMAGE";

    // Load the source image for image-to-video from storage.
    let sourceImage: { data: Buffer; mimeType: string } | undefined;
    if (generation.type === "IMAGE_TO_VIDEO" && generation.sourceImageUrl) {
      const key = generation.sourceImageUrl.replace(/^\/api\/files\//, "");
      const buffer = await getStorage().get(key);
      if (!buffer) {
        throw new ProviderError(
          "Uploaded source image is missing from storage",
          "provider_failed",
          502,
          "Generation failed. The uploaded source image is no longer available. Please upload it again.",
        );
      }
      const mimeType = key.endsWith(".png")
        ? "image/png"
        : key.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
      sourceImage = { data: buffer, mimeType };
    }

    log(
      `Processing job ${jobId} (${generation.type}, model ${generation.model}, attempt ${attempt})`,
    );

    await updateJobProgress(jobId, { stage: "Preparing your generation...", progress: null });

    let results: MediaResult[];
    let usedDemo = false;

    if (isImage) {
      const { provider, isDemo } = resolveImageProvider();
      usedDemo = isDemo;
      await db.generation.update({
        where: { id: generationId },
        data: { provider: provider.kind },
      });
      results = await provider.generateImage({
        prompt: generation.prompt,
        negativePrompt: generation.negativePrompt ?? undefined,
        width: generation.width,
        height: generation.height,
        numImages: generation.numImages,
        steps: generation.steps ?? undefined,
        guidanceScale: generation.guidanceScale ?? undefined,
        seed: generation.seed ?? undefined,
        model: generation.model,
        signal: controller.signal,
        onProgress,
      });
    } else {
      const { provider, isDemo } = resolveVideoProvider();
      usedDemo = isDemo;
      await db.generation.update({
        where: { id: generationId },
        data: { provider: provider.kind },
      });
      results = await provider.generateVideo({
        prompt: generation.prompt,
        negativePrompt: generation.negativePrompt ?? undefined,
        duration: generation.duration ?? 5,
        width: generation.width,
        height: generation.height,
        sourceImage,
        motionStrength: generation.motionStrength ?? undefined,
        seed: generation.seed ?? undefined,
        model: generation.model,
        signal: controller.signal,
        onProgress,
      });
    }

    if (await isJobCancelled(jobId)) {
      await db.generation.update({ where: { id: generationId }, data: { status: "CANCELLED" } });
      return true;
    }

    const stored = await storeResults(generationId, results, generation.type);
    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "COMPLETED",
        resultUrl: stored.resultUrl,
        thumbnailUrl: stored.thumbnailUrl,
        isDemo: usedDemo,
        width: stored.width,
        height: stored.height,
        errorMessage: null,
      },
    });
    await completeJob(jobId);
    log(`Completed job ${jobId}.`);
    return true;
  } catch (err) {
    const isCancelled = await isJobCancelled(jobId);
    if (isCancelled || (err instanceof ProviderError && err.code === "provider_cancelled")) {
      await db.generation.update({ where: { id: generationId }, data: { status: "CANCELLED" } });
      await db.generationJob.update({
        where: { id: jobId },
        data: { status: "CANCELLED", stage: "Cancelled", finishedAt: new Date() },
      });
      log(`Job ${jobId} cancelled.`);
      return true;
    }

    const providerError = err instanceof ProviderError ? err : null;
    const safeMessage =
      providerError?.userMessage ??
      "Generation failed. The AI model is currently unavailable. Please try again.";

    console.error(`[worker] Job ${jobId} failed:`, err);

    if (providerError && RETRYABLE_CODES.has(providerError.code) && attempt < env.JOB_MAX_ATTEMPTS) {
      log(`Job ${jobId} failed transiently — requeueing (attempt ${attempt}).`);
      await requeueJob(jobId, providerError.message);
      await db.generation.update({ where: { id: generationId }, data: { status: "QUEUED" } });
      return true;
    }

    await failJob(jobId, providerError?.message ?? safeMessage);
    await db.generation.update({
      where: { id: generationId },
      data: { status: "FAILED", errorMessage: safeMessage },
    });
    return true;
  } finally {
    activeControllers.delete(jobId);
  }
}

async function poll(): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    abortIfCancelled();
    await recoverStaleJobs();
    let processed = 0;
    while (await processOneJob()) {
      processed += 1;
      if (processed >= 5) break; // fair share per tick
    }
  } catch (err) {
    console.error("[worker] poll error:", err);
  } finally {
    polling = false;
  }
}

let started = false;

export function startWorker(): void {
  if (started) return;
  started = true;

  // Fail fast on obviously broken provider configuration.
  try {
    assertProviderConfig();
  } catch (err) {
    console.error("[worker] provider config error:", err);
  }

  log(`Worker started (poll every ${env.WORKER_POLL_INTERVAL_MS} ms).`);
  void poll();
  timer = setInterval(() => void poll(), env.WORKER_POLL_INTERVAL_MS);
  // Don't keep the process alive just for the worker.
  timer.unref?.();
}

export function stopWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
  log("Worker stopped.");
}
