import { db } from "@/lib/db";

/**
 * Database-backed job queue.
 *
 * Reliable and simple for single-instance deployments (development, small
 * production). For multi-instance/Redis+BullMQ production setups, replace
 * the claim/complete primitives below with queue producers/consumers —
 * the API routes only depend on enqueueJob/updateJobProgress.
 */

export interface JobUpdate {
  status?: string;
  stage?: string | null;
  progress?: number | null;
  error?: string | null;
}

/** Compute the queue position for a newly created job (1-based). */
export async function computeQueuePosition(generationId: string, createdAt: Date): Promise<number> {
  const ahead = await db.generationJob.count({
    where: {
      status: { in: ["QUEUED", "PROCESSING"] },
      createdAt: { lt: createdAt },
    },
  });
  void generationId;
  return ahead + 1;
}

export async function enqueueJob(
  generationId: string,
  maxAttempts: number,
): Promise<{ jobId: string; queuePosition: number }> {
  const job = await db.generationJob.create({
    data: {
      generationId,
      status: "QUEUED",
      maxAttempts,
    },
  });
  const queuePosition = await computeQueuePosition(generationId, job.createdAt);
  await db.generationJob.update({ where: { id: job.id }, data: { queuePosition } });
  return { jobId: job.id, queuePosition };
}

/**
 * Atomically claim the oldest queued job. Returns null when the queue is
 * empty. Works reliably for a single worker process (SQLite/Postgres
 * conditional update).
 */
export async function claimNextJob(): Promise<{
  jobId: string;
  generationId: string;
  attempt: number;
} | null> {
  const oldest = await db.generationJob.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, generationId: true, attempt: true },
  });
  if (!oldest) return null;

  const claimed = await db.generationJob.updateMany({
    where: { id: oldest.id, status: "QUEUED" },
    data: {
      status: "PROCESSING",
      attempt: { increment: 1 },
      stage: "Preparing your generation...",
      progress: null,
      error: null,
      startedAt: new Date(),
    },
  });
  if (claimed.count === 0) return null; // lost the race
  return { jobId: oldest.id, generationId: oldest.generationId, attempt: oldest.attempt + 1 };
}

/** Re-queue a job for retry (transient failures). */
export async function requeueJob(jobId: string, error: string): Promise<void> {
  await db.generationJob.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      stage: null,
      progress: null,
      error,
      startedAt: null,
    },
  });
}

export async function updateJobProgress(jobId: string, update: JobUpdate): Promise<void> {
  await db.generationJob.update({
    where: { id: jobId },
    data: {
      ...(update.status ? { status: update.status } : {}),
      ...(update.stage !== undefined ? { stage: update.stage } : {}),
      ...(update.progress !== undefined ? { progress: update.progress } : {}),
      ...(update.error !== undefined ? { error: update.error } : {}),
    },
  });
}

export async function completeJob(jobId: string): Promise<void> {
  await db.generationJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", stage: "Completed", progress: 100, finishedAt: new Date() },
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await db.generationJob.update({
    where: { id: jobId },
    data: { status: "FAILED", stage: "Failed", progress: null, error, finishedAt: new Date() },
  });
}

/** Has the job been cancelled while it was waiting/running? */
export async function isJobCancelled(jobId: string): Promise<boolean> {
  const job = await db.generationJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  return job?.status === "CANCELLED";
}
