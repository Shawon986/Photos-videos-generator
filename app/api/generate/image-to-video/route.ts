import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { imageToVideoSchema } from "@/lib/validation/generation";
import { createGeneration } from "@/lib/generations/create-generation";
import { resolveVideoDimensions } from "@/lib/api/generation-params";
import { handleApiError, readJsonBody, getClientIp, badRequest } from "@/lib/api-helpers";
import { enforceIpBurstLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceIpBurstLimit(getClientIp(request));

    const body = await readJsonBody(request);
    const parsed = imageToVideoSchema.parse(body);

    // The upload must exist and belong to this user. imageFileId is a
    // database record id — never a client-supplied filesystem path.
    const upload = await db.generationAsset.findFirst({
      where: { id: parsed.imageFileId, kind: "UPLOAD", userId: user.id },
    });
    if (!upload) {
      throw badRequest("The uploaded image is invalid or has expired. Please upload it again.");
    }

    const { width, height } = resolveVideoDimensions(parsed);

    const result = await createGeneration({
      userId: user.id,
      type: "IMAGE_TO_VIDEO",
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt,
      model: parsed.model ?? "auto",
      width,
      height,
      duration: parsed.duration ?? 5,
      motionStrength: parsed.motionStrength,
      seed: parsed.seed,
      sourceImageUrl: upload.url,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
