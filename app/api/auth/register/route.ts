import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation/generation";
import { conflict, handleApiError, readJsonBody, getClientIp } from "@/lib/api-helpers";
import { enforceIpBurstLimit, RateLimitError } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    try {
      enforceIpBurstLimit(getClientIp(request));
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
    }

    const body = await readJsonBody(request);
    const parsed = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw conflict("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(parsed.password);
    await db.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
