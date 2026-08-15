import { NextResponse } from "next/server";
import { requireApiUser, ensureOwnership } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs/queue";
import { env } from "@/lib/env";
import { enforceUserGenerationQuota } from "@/lib/rate-limit";
import { handleApiError, notFound } from "@/lib/api-helpers";
import { randomSeed } from "@/lib/utils";
import { moderatePrompt } from "@/lib/safety/prompt-moderation";
import { ApiError } from "@/lib/api-helpers";

/**
 * POST /api/generations/:id/regenerate
 *   body { variation?: boolean }
 *
 * Repeats a previous creation with the same settings. `variation: true`
 * randomizes the seed; a plain regenerate keeps the original seed.
 * Failed/cancelled generations are retried in place.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const source = await db.generation.findUnique({ where: { id } });
    if (!source) throw notFound("Generation not found.");
    ensureOwnership(user.id, source.userId);

    const variation = (await request.json().catch(() => ({})) as { variation?: boolean })
      .variation ?? false;

    const moderation = moderatePrompt(source.prompt, source.negativePrompt ?? undefined);
    if (moderation.flagged) {
      throw new ApiError(400, moderation.reason ?? "This request was blocked.", "content_policy");
    }

    await enforceUserGenerationQuota(user.id, source.type as "IMAGE" | "VIDEO" | "IMAGE_TO_VIDEO");

    // Retry failed/cancelled generations in place (new job, same record).
    if (source.status === "FAILED" || source.status === "CANCELLED") {
      await db.generation.update({
        where: { id: source.id },
        data: { status: "QUEUED", errorMessage: null, seed: variation ? randomSeed() : source.seed },
      });
      const { queuePosition } = await enqueueJob(source.id, env.JOB_MAX_ATTEMPTS);
      return NextResponse.json(
        { generationId: source.id, status: "QUEUED", queuePosition },
        { status: 202 },
      );
    }

    // Otherwise create a fresh generation with the same settings.
    const newGeneration = await db.generation.create({
      data: {
        userId: source.userId,
        type: source.type,
        prompt: source.prompt,
        negativePrompt: source.negativePrompt,
        model: source.model,
        provider: source.provider,
        status: "QUEUED",
        width: source.width,
        height: source.height,
        numImages: source.numImages,
        duration: source.duration,
        steps: source.steps,
        guidanceScale: source.guidanceScale,
        seed: variation ? randomSeed() : source.seed,
        motionStrength: source.motionStrength,
        quality: source.quality,
        sourceImageUrl: source.sourceImageUrl,
      },
    });
    const { queuePosition } = await enqueueJob(newGeneration.id, env.JOB_MAX_ATTEMPTS);

    return NextResponse.json(
      { generationId: newGeneration.id, status: "QUEUED", queuePosition },
      { status: 202 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
