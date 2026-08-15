import { test, expect } from "@playwright/test";
import { createUser } from "./auth-helper";

/**
 * E2E flows (run against a dev server with DEMO_MODE=true):
 *
 *   1. Login → Create image → View result → Delete
 *   2. Login → Upload image → Create video → View result
 */

test.describe.configure({ mode: "serial" });

test("login → create image → view result → delete", async ({ page, request }) => {
  const user = await createUser(request, "image");

  // Login through the UI.
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Create an image.
  await page.goto("/create?tab=image");
  await page.getByLabel("Prompt", { exact: true }).fill("a serene mountain lake at sunrise, e2e test");
  await page.getByRole("button", { name: /generate image/i }).click();

  // The result panel appears (demo mode completes quickly).
  await expect(page.getByText("Your result", { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  // Demo output must be labelled honestly.
  await expect(page.getByText("Demo Preview", { exact: true })).toBeVisible();

  // Delete it from the result panel (confirm through the Radix dialog).
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Creation deleted")).toBeVisible();
});

test("login → upload image → create video → view result", async ({ page, request }) => {
  const user = await createUser(request, "video");

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  await page.goto("/create?tab=image-to-video");

  // Upload a tiny valid PNG (1×1).
  await page.setInputFiles("#upload-input", {
    name: "tiny.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByText("Remove")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Animation prompt", { exact: true }).fill("gentle camera drift toward the subject");
  await page.getByRole("button", { name: /animate image/i }).click();

  await expect(page.getByText("Your result", { exact: false })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Demo Preview", { exact: true })).toBeVisible();
});

test("protected pages redirect guests to login", async ({ page }) => {
  await page.goto("/create");
  await expect(page).toHaveURL(/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/login/);
});
