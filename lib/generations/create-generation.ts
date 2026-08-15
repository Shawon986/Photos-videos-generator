import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureWorkerStarted } from "@/lib/workers/ensure-worker";
import { moderatePrompt, sanitizePromptText } from "@/lib/safety/prompt-moderation";
import { enforceUserGenerationQuota, enforceIpBurstLimit } from "@/lib/rate-limit";
import { enqueueJob } from "@/lib/jobs/queue";
import { resolveImageProvider, resolveVideoProvider, ProviderError } from "@/lib/ai";
import { ApiError, badRequest } from "@/lib/api-helpers";
import type { GenerationType } from "@/lib/constants";
import { randomSeed } from "@/lib/utils";

export interface CreateGenerationInput {
  userId: string;
  type: GenerationType;
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width: number;
  height: number;
  numImages?: number;
  duration?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  motionStrength?: number;
  quality?: string;
  sourceImageUrl?: string;
}

/**
 * Shared pipeline for POST /api/generate/* :
 *   safety → rate limits → provider availability → DB records → job enqueue.
 * The actual generation runs in the background worker.
 */
export async function createGeneration(input: CreateGenerationInput): Promise<{
  generationId: string;
  status: string;
  queuePosition: number;
  isDemo: boolean;
}> {
  // Boot the in-process worker (dev / single-process deployments).
  if (env.WORKER_AUTO_START) ensureWorkerStarted();

  const prompt = sanitizePromptText(input.prompt);
  if (!prompt) {
    throw badRequest("Please describe what you want to create.");
  }

  // 1. Content safety (basic, provider-independent layer).
  const moderation = moderatePrompt(prompt, input.negativePrompt);
  if (moderation.flagged) {
    throw new ApiError(400, moderation.reason ?? "This request was blocked.", "content_policy", {
      category: moderation.category,
    });
  }

  // 2. Rate limits.
  await enforceUserGenerationQuota(input.userId, input.type);

  // 3. Fail fast when no provider is configured and demo mode is off.
  let isDemo = false;
  try {
    if (input.type === "IMAGE") {
      isDemo = resolveImageProvider().isDemo;
    } else {
      isDemo = resolveVideoProvider().isDemo;
    }
  } catch (err) {
    if (err instanceof ProviderError && err.code === "provider_not_configured") {
      throw err;
    }
    throw err;
  }

  // 4. Persist the generation + queue the job.
  const generation = await db.generation.create({
    data: {
      userId: input.userId,
      type: input.type,
      prompt,
      negativePrompt: input.negativePrompt,
      model: input.model ?? "auto",
      provider: isDemo ? "demo" : input.type === "IMAGE" ? env.IMAGE_PROVIDER : env.VIDEO_PROVIDER,
      status: "QUEUED",
      width: input.width,
      height: input.height,
      numImages: input.type === "IMAGE" ? (input.numImages ?? 1) : 1,
      duration: input.type === "IMAGE" ? null : (input.duration ?? 5),
      steps: input.steps,
      guidanceScale: input.guidanceScale,
      seed: input.seed ?? randomSeed(),
      motionStrength: input.motionStrength,
      quality: input.quality,
      sourceImageUrl: input.sourceImageUrl,
    },
  });

  const { queuePosition } = await enqueueJob(generation.id, env.JOB_MAX_ATTEMPTS);

  return {
    generationId: generation.id,
    status: "QUEUED",
    queuePosition,
    isDemo,
  };
}

/** IP burst check wrapper for generate routes. */
export function applyIpBurstLimit(ip: string): void {
  enforceIpBurstLimit(ip);
}
