import type { APIRequestContext } from "@playwright/test";

/**
 * Create a fresh user via the register API and sign in through the UI.
 * Returns the email/password for reuse.
 */
export async function createUser(
  request: APIRequestContext,
  tag: string,
): Promise<{ email: string; password: string }> {
  const email = `e2e-${tag}-${Date.now()}@visionforge.test`;
  const password = "e2e-Password-42";
  const response = await request.post("/api/auth/register", {
    data: { email, password, name: "E2E Tester" },
  });
  if (!response.ok()) {
    throw new Error(`register failed: ${response.status()} ${await response.text()}`);
  }
  return { email, password };
}
