import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session-helper";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordChangeSchema } from "@/lib/validation/generation";
import { badRequest, handleApiError, readJsonBody } from "@/lib/api-helpers";

/** POST /api/user/password — change password (requires current password). */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await readJsonBody(request);
    const parsed = passwordChangeSchema.parse(body);

    const record = await db.user.findUnique({ where: { id: user.id } });
    if (!record) throw badRequest("Account not found.");

    const valid = await verifyPassword(parsed.currentPassword, record.passwordHash);
    if (!valid) throw badRequest("Your current password is incorrect.", "bad_credentials");

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.newPassword) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
