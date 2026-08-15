import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";
import type { Session } from "next-auth";

export { ensureOwnership } from "@/lib/auth/ownership";

/**
 * API-route session guard. Returns the authenticated user (with role from
 * the database) or throws a 401.
 */
export async function requireApiUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: string;
}> {
  const session: Session | null = await auth();
  if (!session?.user?.id) {
    throw unauthorized();
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    throw unauthorized();
  }
  return user;
}
