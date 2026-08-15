import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreationDetail } from "./creation-detail";
import { db } from "@/lib/db";
import { serializeGeneration } from "@/lib/generations/serialize";
import { auth } from "@/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const generation = await db.generation.findUnique({
    where: { id },
    select: { prompt: true, share: { select: { id: true } } },
  });
  if (!generation?.share) return { title: "Creation — VisionForge AI" };
  return {
    title: `${generation.prompt.slice(0, 60)} — VisionForge AI`,
    description: `AI-generated creation: ${generation.prompt.slice(0, 160)}`,
    openGraph: {
      title: "Shared creation — VisionForge AI",
      description: generation.prompt.slice(0, 160),
    },
  };
}

export default async function CreationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  // Ownership/sharing check happens before anything else.
  const access = await db.generation.findUnique({
    where: { id },
    select: { userId: true, share: { select: { id: true } } },
  });
  if (!access) notFound();
  if (access.userId !== viewerId && !access.share) notFound();

  const generation = await serializeGeneration(id, viewerId);
  if (!generation) notFound();

  // Count a public view (owner views don't count).
  if (access.share && access.userId !== viewerId) {
    await db.share
      .update({ where: { id: access.share.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
  }

  const owner = await db.user.findUnique({
    where: { id: access.userId },
    select: { name: true },
  });

  return (
    <div className="container max-w-5xl py-8 lg:py-12">
      <Link
        href="/explore"
        className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to explore
      </Link>
      <CreationDetail
        generation={generation}
        creatorName={owner?.name ?? "Anonymous"}
      />
    </div>
  );
}
