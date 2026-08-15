import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { workerTick } from "@/lib/workers/generation-worker";

/**
 * GET /api/cron/process — Vercel cron endpoint (see vercel.json).
 *
 * Processes queued generation jobs and recovers stale ones. Protected by
 * CRON_SECRET (Authorization: Bearer). On Vercel's Hobby plan cron runs at
 * most daily with a short timeout, so this is a catch-up sweep — the
 * primary path is the inline worker tick in the create-generation pipeline.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await workerTick();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron] worker tick failed:", err);
    return NextResponse.json({ error: "worker tick failed" }, { status: 500 });
  }
}
