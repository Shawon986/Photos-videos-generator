import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { videoGenerationSchema } from "@/lib/validation/generation";
import { createGeneration } from "@/lib/generations/create-generation";
import { resolveVideoDimensions } from "@/lib/api/generation-params";
import { handleApiError, readJsonBody, getClientIp } from "@/lib/api-helpers";
import { enforceIpBurstLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    enforceIpBurstLimit(getClientIp(request));

    const body = await readJsonBody(request);
    const parsed = videoGenerationSchema.parse(body);

    const { width, height } = resolveVideoDimensions(parsed);

    const result = await createGeneration({
      userId: user.id,
      type: "VIDEO",
      prompt: parsed.prompt,
      negativePrompt: parsed.negativePrompt,
      model: parsed.model ?? "auto",
      width,
      height,
      duration: parsed.duration ?? 5,
      seed: parsed.seed,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
