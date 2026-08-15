"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, Heart, Share2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaPreview } from "@/components/media-preview";
import { CopyButton } from "@/components/copy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DemoBadge } from "@/components/demo-badge";
import { downloadUrl, apiRequest } from "@/lib/api-client";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { SerializedGeneration } from "@/lib/generations/serialize";
import { useCreateStudio } from "@/lib/store/create-store";

interface CreationDetailProps {
  generation: SerializedGeneration;
  creatorName: string;
}

export function CreationDetail({ generation, creatorName }: CreationDetailProps) {
  const router = useRouter();
  const setPrefill = useCreateStudio((s) => s.setPrefill);
  const [favorite, setFavorite] = React.useState(generation.favorite);
  const [shared, setShared] = React.useState(generation.shared);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const isImage = generation.type === "IMAGE";
  const mimeType = generation.assets[0]?.mimeType ?? (isImage ? "image/png" : "video/mp4");
  const src = generation.resultUrl ?? "";

  const useThisPrompt = () => {
    const tab = isImage ? "image" : generation.type === "IMAGE_TO_VIDEO" ? "image-to-video" : "text-to-video";
    setPrefill({ prompt: generation.prompt, model: generation.model });
    router.push(`/create?tab=${tab}`);
  };

  const handleDownload = () => {
    if (!src) return;
    const ext = generation.assets[0]?.url.includes(".")
      ? generation.assets[0]?.url.split(".").pop()
      : isImage ? "png" : "mp4";
    downloadUrl(src, `visionforge-${generation.id.slice(0, 8)}.${ext}`);
    toast.success("Download started");
  };

  const toggleFavorite = async () => {
    try {
      const result = await apiRequest<{ favorite: boolean }>(
        `/api/generations/${generation.id}/favorite`,
        { method: "POST" },
      );
      setFavorite(result.favorite);
      toast.success(result.favorite ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update favorite.");
    }
  };

  const toggleShare = async () => {
    try {
      const result = await apiRequest<{ shared: boolean; url: string | null }>(
        `/api/generations/${generation.id}/share`,
        { method: "POST" },
      );
      setShared(result.shared);
      if (result.shared && result.url) {
        const ok = await navigator.clipboard.writeText(result.url).then(() => true).catch(() => false);
        toast.success(ok ? "Shared! Link copied to clipboard." : `Shared! ${result.url}`);
      } else {
        toast.success("Sharing disabled");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update sharing.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/api/generations/${generation.id}`, { method: "DELETE" });
      toast.success("Creation deleted");
      router.push(generation.isOwner ? "/dashboard" : "/explore");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this creation.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label="Media">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <MediaPreview
            src={src}
            mimeType={mimeType}
            alt={generation.prompt}
            className="max-h-[70vh] w-full"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {generation.isDemo ? <DemoBadge /> : null}
          {generation.shared ? <Badge variant="info">Public</Badge> : null}
          {generation.status === "FAILED" ? (
            <Badge variant="destructive">Failed</Badge>
          ) : null}
          <Button variant="gradient" size="sm" onClick={useThisPrompt}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Use this prompt
          </Button>
          {src ? (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          ) : null}
          {generation.isOwner ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void toggleFavorite()}
                aria-pressed={favorite}
              >
                <Heart className={favorite ? "h-4 w-4 fill-red-400 text-red-400" : "h-4 w-4"} aria-hidden="true" />
                {favorite ? "Favorited" : "Favorite"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void toggleShare()}
                aria-pressed={shared}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {shared ? "Public" : "Share"}
              </Button>
            </>
          ) : null}
          {generation.isOwner && generation.status === "FAILED" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/create?tab=${isImage ? "image" : "text-to-video"}&prompt=${encodeURIComponent(generation.prompt)}`}>
                Retry
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="space-y-5" aria-label="Creation details">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h1 className="font-display text-base font-semibold leading-snug">
            “{generation.prompt}”
          </h1>
          {generation.negativePrompt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Avoided: {generation.negativePrompt}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant="outline">{generation.model}</Badge>
            <Badge variant="outline">
              {generation.width}×{generation.height}
            </Badge>
            {generation.seed != null ? (
              <Badge variant="outline">Seed {generation.seed}</Badge>
            ) : null}
            {generation.duration != null ? (
              <Badge variant="outline">{generation.duration}s</Badge>
            ) : null}
            <Badge variant="outline">{isImage ? "Image" : "Video"}</Badge>
          </div>
          <CopyButton
            value={generation.prompt}
            successMessage="Prompt copied"
            variant="outline"
            size="sm"
            className="mt-4"
          >
            Copy prompt
          </CopyButton>
        </div>

        <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm">
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" aria-hidden="true" />
              Creator
            </dt>
            <dd className="ml-auto font-medium">{creatorName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Views
            </dt>
            <dd className="ml-auto font-medium tabular-nums">{generation.viewCount}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="ml-auto font-medium" title={formatDate(generation.createdAt)}>
              {formatRelativeTime(generation.createdAt)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="ml-auto font-medium">
              {generation.type === "IMAGE"
                ? "Text → Image"
                : generation.type === "IMAGE_TO_VIDEO"
                  ? "Image → Video"
                  : "Text → Video"}
            </dd>
          </div>
        </dl>

        {generation.isOwner ? (
          <Button
            variant="outline"
            className="w-full text-red-400 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
            onClick={() => setConfirmDelete(true)}
          >
            Delete creation
          </Button>
        ) : null}
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this creation?"
        description="This permanently removes the generation and its files. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
