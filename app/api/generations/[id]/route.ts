import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureOwnership } from "@/lib/auth/session-helper";
import { serializeGeneration } from "@/lib/generations/serialize";
import { handleApiError, notFound, unauthorized } from "@/lib/api-helpers";
import { getStorage } from "@/lib/storage";

/**
 * GET /api/generations/:id — poll endpoint for generation status/results.
 * Owners always; others only when the generation is shared.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();

    const generation = await db.generation.findUnique({
      where: { id },
      select: { userId: true, share: { select: { id: true } } },
    });
    if (!generation) throw notFound("Generation not found.");

    const isOwner = session?.user?.id === generation.userId;
    if (!isOwner && !generation.share) throw unauthorized();

    const serialized = await serializeGeneration(id, session?.user?.id);
    if (!serialized) throw notFound("Generation not found.");

    return NextResponse.json(serialized);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/generations/:id — owner only. Removes files + records. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();

    const generation = await db.generation.findUnique({
      where: { id },
      include: { assets: true },
    });
    if (!generation) throw notFound("Generation not found.");
    ensureOwnership(session.user.id, generation.userId);

    // Best-effort storage cleanup, then DB cascade.
    const storage = getStorage();
    for (const asset of generation.assets) {
      await storage.delete(asset.storageKey).catch(() => undefined);
    }
    await db.generation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
