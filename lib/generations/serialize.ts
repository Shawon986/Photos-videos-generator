import { db } from "@/lib/db";

/**
 * Shared serialization for Generation API responses. Returns a clean,
 * client-safe shape with favorite/shared flags resolved for the viewer.
 */
export async function serializeGeneration(generationId: string, viewerId?: string) {
  const generation = await db.generation.findUnique({
    where: { id: generationId },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
      share: true,
    },
  });

  if (!generation) return null;

  const job = generation.jobs[0] ?? null;
  const favorite = viewerId
    ? await db.favorite.findUnique({
        where: { userId_generationId: { userId: viewerId, generationId } },
      })
    : null;

  return {
    id: generation.id,
    type: generation.type,
    prompt: generation.prompt,
    negativePrompt: generation.negativePrompt,
    model: generation.model,
    provider: generation.provider,
    status: generation.status,
    width: generation.width,
    height: generation.height,
    numImages: generation.numImages,
    duration: generation.duration,
    seed: generation.seed,
    steps: generation.steps,
    guidanceScale: generation.guidanceScale,
    motionStrength: generation.motionStrength,
    quality: generation.quality,
    isDemo: generation.isDemo,
    resultUrl: generation.resultUrl,
    thumbnailUrl: generation.thumbnailUrl,
    sourceImageUrl: generation.sourceImageUrl,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
    isOwner: viewerId ? generation.userId === viewerId : false,
    favorite: Boolean(favorite),
    shared: Boolean(generation.share),
    viewCount: generation.share?.viewCount ?? 0,
    assets: generation.assets
      .filter((a) => a.kind === "RESULT")
      .map((a) => ({
        id: a.id,
        url: a.url,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        sizeBytes: a.sizeBytes,
      })),
    job: job
      ? {
          status: job.status,
          stage: job.stage,
          progress: job.progress,
          queuePosition: job.queuePosition,
          startedAt: job.startedAt,
        }
      : null,
  };
}

export type SerializedGeneration = NonNullable<
  Awaited<ReturnType<typeof serializeGeneration>>
>;
