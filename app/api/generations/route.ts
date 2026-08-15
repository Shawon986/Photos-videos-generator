import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { serializeGeneration } from "@/lib/generations/serialize";
import { handleApiError } from "@/lib/api-helpers";

/**
 * GET /api/generations — the signed-in user's creations.
 * Query: type (IMAGE|VIDEO|IMAGE_TO_VIDEO), status, favorite, cursor, limit
 */
export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const favoriteOnly = url.searchParams.get("favorite") === "true";
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));

    const where = {
      userId: user.id,
      ...(type && ["IMAGE", "VIDEO", "IMAGE_TO_VIDEO"].includes(type) ? { type } : {}),
      ...(status && ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].includes(status)
        ? { status }
        : {}),
      ...(favoriteOnly ? { favorites: { some: { userId: user.id } } } : {}),
    };

    const items = await db.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true },
    });

    const nextCursor = items.length > limit ? items[limit].id : null;
    const pageIds = items.slice(0, limit).map((i) => i.id);

    const serialized = [];
    for (const id of pageIds) {
      const s = await serializeGeneration(id, user.id);
      if (s) serialized.push(s);
    }

    return NextResponse.json({ items: serialized, nextCursor });
  } catch (err) {
    return handleApiError(err);
  }
}
