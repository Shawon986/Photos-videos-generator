import { NextResponse } from "next/server";
import { requireApiUser, ensureOwnership } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { handleApiError, notFound } from "@/lib/api-helpers";

/** POST /api/generations/:id/favorite — toggle favorite on own creations. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const generation = await db.generation.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!generation) throw notFound("Generation not found.");
    ensureOwnership(user.id, generation.userId);

    const existing = await db.favorite.findUnique({
      where: { userId_generationId: { userId: user.id, generationId: id } },
    });

    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorite: false });
    }
    await db.favorite.create({ data: { userId: user.id, generationId: id } });
    return NextResponse.json({ favorite: true });
  } catch (err) {
    return handleApiError(err);
  }
}
