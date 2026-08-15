import { NextResponse } from "next/server";
import { requireApiUser, ensureOwnership } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { handleApiError, notFound } from "@/lib/api-helpers";

/** POST /api/generations/:id/cancel — cancel a queued/processing job. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const generation = await db.generation.findUnique({
      where: { id },
      include: { jobs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!generation) throw notFound("Generation not found.");
    ensureOwnership(user.id, generation.userId);

    const job = generation.jobs[0];
    if (!job || !["QUEUED", "PROCESSING"].includes(job.status)) {
      return NextResponse.json({ ok: false, reason: "not_running" });
    }

    await db.generationJob.update({
      where: { id: job.id },
      data: { status: "CANCELLED", stage: "Cancelled", finishedAt: new Date() },
    });
    await db.generation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ ok: true, status: "CANCELLED" });
  } catch (err) {
    return handleApiError(err);
  }
}
