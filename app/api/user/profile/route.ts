import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validation/generation";
import { handleApiError, readJsonBody } from "@/lib/api-helpers";

/** PATCH /api/user/profile — update display name. */
export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await readJsonBody(request);
    const parsed = profileUpdateSchema.parse(body);

    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.name ?? user.name },
    });

    return NextResponse.json({ ok: true, name: parsed.name ?? user.name });
  } catch (err) {
    return handleApiError(err);
  }
}
