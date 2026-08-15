import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireApiUser } from "@/lib/auth/session-helper";
import { env } from "@/lib/env";
import {
  sanitizeFilename,
  validateUpload,
} from "@/lib/validation/upload";
import { getStorage } from "@/lib/storage";
import { buildStorageKey } from "@/lib/storage/provider";
import { db } from "@/lib/db";
import { handleApiError, getClientIp } from "@/lib/api-helpers";
import { enforceIpBurstLimit } from "@/lib/rate-limit";

/**
 * POST /api/upload — multipart image upload (image-to-video input).
 * Validates type/size/magic bytes, stores under uploads/user/{userId}/,
 * and returns an opaque fileId for subsequent generation requests.
 */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceIpBurstLimit(getClientIp(request));

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data upload.", code: "bad_request" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided in the 'file' field.", code: "bad_request" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const validated = validateUpload(
      arrayBuffer,
      file.type || null,
      sanitizeFilename(file.name),
      { maxBytes: env.MAX_UPLOAD_BYTES },
    );

    const { readImageDimensions } = await import("@/lib/validation/upload");
    const dims = readImageDimensions(validated.buffer) ?? { width: 0, height: 0 };

    const key = buildStorageKey(
      "uploads",
      user.id,
      `${randomUUID()}${validated.extension}`,
    );
    const stored = await getStorage().put(key, Buffer.from(validated.buffer), validated.mimeType);

    const asset = await db.generationAsset.create({
      data: {
        userId: user.id,
        kind: "UPLOAD",
        storageKey: stored.key,
        url: stored.url,
        mimeType: stored.mimeType,
        width: dims.width,
        height: dims.height,
        sizeBytes: stored.sizeBytes,
      },
    });

    return NextResponse.json({
      fileId: asset.id,
      url: asset.url,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
