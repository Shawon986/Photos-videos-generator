import { NextResponse } from "next/server";
import { requireApiUser, ensureOwnership } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { handleApiError, notFound } from "@/lib/api-helpers";
import { APP_URL } from "@/lib/constants";

/** POST /api/generations/:id/share — toggle public sharing. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const generation = await db.generation.findUnique({
      where: { id },
      select: { userId: true, share: { select: { id: true } } },
    });
    if (!generation) throw notFound("Generation not found.");
    ensureOwnership(user.id, generation.userId);

    if (generation.share) {
      await db.share.delete({ where: { id: generation.share.id } });
      return NextResponse.json({ shared: false, url: null });
    }

    await db.share.create({ data: { generationId: id, userId: user.id } });
    return NextResponse.json({ shared: true, url: `${APP_URL}/creation/${id}` });
  } catch (err) {
    return handleApiError(err);
  }
}
