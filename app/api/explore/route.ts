import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { serializeGeneration } from "@/lib/generations/serialize";
import { handleApiError } from "@/lib/api-helpers";

/**
 * GET /api/explore — publicly shared creations.
 * Query: type, orientation (portrait|landscape|square), style, sort
 *        (recent|popular|trending), cursor, limit
 */

const STYLE_KEYWORDS: Record<string, string[]> = {
  anime: ["anime", "manga", "ghibli", "studio ghibli"],
  cinematic: ["cinematic", "film", "movie still", "dramatic lighting", "imax"],
  "3d": ["3d render", "blender", "octane", "unreal engine", "cgi", "3d"],
  fantasy: ["fantasy", "magical", "dragon", "elf", "wizard", "mythical", "fairytale"],
  photography: ["photograph", "photo", "35mm", "portrait photo", "dof", "camera"],
};

export async function GET(request: Request) {
  try {
    const session = await auth();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const orientation = url.searchParams.get("orientation");
    const style = url.searchParams.get("style");
    const sort = url.searchParams.get("sort") ?? "recent";
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));

    const where = {
      share: { isNot: null },
      status: "COMPLETED",
      resultUrl: { not: null },
      ...(type === "IMAGE" ? { type: "IMAGE" as const } : {}),
      ...(type === "VIDEO" ? { type: { in: ["VIDEO", "IMAGE_TO_VIDEO"] } } : {}),
    };

    const orderBy =
      sort === "popular" || sort === "trending"
        ? [{ share: { viewCount: "desc" as const } }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    const items = await db.generation.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true },
    });

    const nextCursor = items.length > limit ? items[limit].id : null;
    const pageIds = items.slice(0, limit).map((i) => i.id);

    const serialized = [];
    for (const id of pageIds) {
      const s = await serializeGeneration(id, session?.user?.id);
      if (s) serialized.push(s);
    }

    // Orientation + style filters applied post-query (dimension/keyword based).
    const filtered = serialized.filter((item) => {
      if (orientation === "portrait" && item.height <= item.width) return false;
      if (orientation === "landscape" && item.width <= item.height) return false;
      if (
        orientation === "square" &&
        Math.abs(item.width - item.height) > item.width * 0.02
      ) {
        return false;
      }
      if (style && STYLE_KEYWORDS[style]) {
        const text = `${item.prompt} ${item.model}`.toLowerCase();
        if (!STYLE_KEYWORDS[style].some((kw) => text.includes(kw))) return false;
      }
      return true;
    });

    return NextResponse.json({ items: filtered, nextCursor });
  } catch (err) {
    return handleApiError(err);
  }
}
