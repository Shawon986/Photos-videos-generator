import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { handleApiError, notFound, unauthorized } from "@/lib/api-helpers";

/**
 * GET /api/files/[...path] — serves stored media with authorization.
 *
 * Path forms:
 *   /api/files/images/{generationId}/result_0.png   (generation output)
 *   /api/files/videos/{generationId}/result_0.mp4
 *   /api/files/thumbnails/{generationId}/thumb.png
 *   /api/files/uploads/{userId}/{file}              (user uploads, owner only)
 *
 * Access rules:
 *   - generation outputs: owner or publicly shared generations
 *   - uploads: owner only
 */
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;
    const session = await auth();
    const userId = session?.user?.id ?? null;

    // Strict segment shape — reject anything unexpected up front.
    if (
      segments.length !== 3 ||
      !["images", "videos", "thumbnails", "uploads"].includes(segments[0])
    ) {
      throw notFound();
    }
    const [kind, ownerSegment, filename] = segments;

    if (!/^[a-zA-Z0-9_-]+$/.test(ownerSegment) || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw notFound();
    }

    // Authorization.
    if (kind === "uploads") {
      if (ownerSegment !== userId) throw unauthorized();
    } else {
      const generation = await db.generation.findUnique({
        where: { id: ownerSegment },
        select: { userId: true, share: { select: { id: true } } },
      });
      if (!generation) throw notFound();
      const isOwner = generation.userId === userId;
      if (!isOwner && !generation.share) throw unauthorized();
    }

    const key = segments.join("/");
    const data = await getStorage().get(key);
    if (!data) throw notFound();

    const ext = filename.includes(".") ? `.${filename.split(".").pop()?.toLowerCase()}` : "";
    const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
