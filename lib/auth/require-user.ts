import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

export type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

/**
 * Server-side guard for protected pages. Redirects to /login when there is
 * no session, preserving the intended destination.
 */
export async function requireUser(): Promise<AuthenticatedSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session as AuthenticatedSession;
}

/** Nullable variant for pages that render differently for guests. */
export async function getCurrentUser(): Promise<AuthenticatedSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AuthenticatedSession;
}
