/**
 * Vercel build preflight — fails the build with a readable message when
 * required environment variables are missing or invalid.
 * Runs as the first step of `vercel-build` (production builds only).
 */
const fail = (lines) => {
  console.error("=".repeat(72));
  console.error("VisionForge deploy failed: missing or invalid environment variables");
  console.error(lines.map((l) => "  - " + l).join("\n"));
  console.error("");
  console.error("Fix: Vercel → Project → Settings → Environment Variables");
  console.error("Make sure each value is set for the PRODUCTION scope, then redeploy.");
  console.error("Full list: see .env.production.example in the repo.");
  console.error("=".repeat(72));
  process.exit(1);
};

const problems = [];

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgresql")) {
  problems.push('DATABASE_URL must be a Postgres connection string (e.g. "postgresql://…" from neon.tech) — SQLite does not work on Vercel');
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  problems.push("AUTH_SECRET must be set and at least 16 characters (generate: openssl rand -base64 32)");
}
if (process.env.STORAGE_PROVIDER !== "vercel-blob") {
  problems.push('STORAGE_PROVIDER must be "vercel-blob" on Vercel (the filesystem is read-only)');
} else if (!process.env.BLOB_READ_WRITE_TOKEN) {
  problems.push("BLOB_READ_WRITE_TOKEN is required with STORAGE_PROVIDER=vercel-blob");
}
if (!process.env.CRON_SECRET) {
  console.warn("[warn] CRON_SECRET is not set — /api/cron/process will reject every request. (Set it to any long random string.)");
}

if (problems.length > 0) fail(problems);
console.log("env check passed");
