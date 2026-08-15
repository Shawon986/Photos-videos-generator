import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { imageGenerationSchema } from "@/lib/validation/generation";
import { createGeneration } from "@/lib/generations/create-generation";
import { resolveImageDimensions } from "@/lib/api/generation-params";
import { handleApiError, readJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/api-helpers";
import { enforceIpBurstLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceIpBurstLimit(getClientIp(request));

    const body = await readJsonBody(request);
    const parsed = imageGenerationSchema.parse(body);

    const { width, height } = resolveImageDimensions(parsed);

    const result = await createGeneration({
      userId: user.id,
      type: "IMAGE",
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt,
      model: parsed.model ?? "auto",
      width,
      height,
      numImages: parsed.numImages,
      steps: parsed.steps,
      guidanceScale: parsed.guidanceScale,
      seed: parsed.seed,
      quality: parsed.quality,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
