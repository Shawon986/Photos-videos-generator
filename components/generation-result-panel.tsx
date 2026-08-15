"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  Heart,
  Pencil,
  RefreshCw,
  Share2,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaPreview } from "@/components/media-preview";
import { CopyButton } from "@/components/copy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DemoBadge } from "@/components/demo-badge";
import { downloadUrl, apiRequest } from "@/lib/api-client";
import { toast } from "sonner";
import type { SerializedGeneration } from "@/lib/generations/serialize";
import { cn } from "@/lib/utils";

interface GenerationResultPanelProps {
  generation: SerializedGeneration;
  onRegenerate: (variation: boolean) => void;
  onDeleted: () => void;
  regenerating?: boolean;
  className?: string;
}

export function GenerationResultPanel({
  generation,
  onRegenerate,
  onDeleted,
  regenerating,
  className,
}: GenerationResultPanelProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [favorite, setFavorite] = React.useState(generation.favorite);
  const [shared, setShared] = React.useState(generation.shared);
  const [busy, setBusy] = React.useState(false);

  const isImage = generation.type === "IMAGE";
  const mediaMime = generation.assets[0]?.mimeType ?? (isImage ? "image/png" : "video/mp4");
  const mediaSrc = generation.resultUrl ?? "";

  const handleDownload = () => {
    if (!mediaSrc) return;
    const ext = generation.assets[0]?.url.includes(".") ? generation.assets[0]?.url.split(".").pop() : "png";
    downloadUrl(mediaSrc, `visionforge-${generation.id.slice(0, 8)}.${ext}`);
    toast.success("Download started");
  };

  const toggleFavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ favorite: boolean }>(
        `/api/generations/${generation.id}/favorite`,
        { method: "POST" },
      );
      setFavorite(result.favorite);
      toast.success(result.favorite ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update favorite.");
    } finally {
      setBusy(false);
    }
  };

  const toggleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ shared: boolean; url: string | null }>(
        `/api/generations/${generation.id}/share`,
        { method: "POST" },
      );
      setShared(result.shared);
      if (result.shared && result.url) {
        const ok = await navigator.clipboard.writeText(result.url).then(() => true).catch(() => false);
        toast.success(ok ? "Shared! Link copied to clipboard." : "Shared! Link: " + result.url);
      } else {
        toast.success("Sharing disabled");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update sharing.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/api/generations/${generation.id}`, { method: "DELETE" });
      toast.success("Creation deleted");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this creation.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const editHref = isImage
    ? `/create?tab=image&prompt=${encodeURIComponent(generation.prompt)}&model=${encodeURIComponent(generation.model)}`
    : `/create?tab=${generation.type === "IMAGE_TO_VIDEO" ? "image-to-video" : "text-to-video"}&prompt=${encodeURIComponent(generation.prompt)}&model=${encodeURIComponent(generation.model)}`;

  const aspectClass = cn(
    "w-full rounded-xl border border-white/10 bg-black/40",
    generation.height > generation.width ? "mx-auto max-w-[420px]" : "max-w-2xl mx-auto",
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("space-y-4", className)}
      aria-label="Generation result"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Your result</h2>
        <div className="flex items-center gap-2">
          {generation.isDemo ? <DemoBadge /> : null}
          {generation.shared ? <Badge variant="info">Public</Badge> : null}
        </div>
      </div>

      <div className={aspectClass}>
        <MediaPreview
          src={mediaSrc}
          mimeType={mediaMime}
          alt={generation.prompt}
          className={cn(
            "max-h-[60vh]",
            generation.height > generation.width ? "aspect-[3/4]" : "aspect-video",
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="gradient" size="sm" onClick={() => onRegenerate(false)} disabled={regenerating || busy}>
          <RefreshCw className={cn("h-4 w-4", regenerating && "animate-spin")} />
          Regenerate
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRegenerate(true)} disabled={regenerating || busy}>
          <Shuffle className="h-4 w-4" />
          Create variation
        </Button>
        {isImage && generation.isOwner ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={editHref}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!mediaSrc}>
          <Download className="h-4 w-4" />
          Download
        </Button>
        <CopyButton value={generation.prompt} successMessage="Prompt copied" variant="outline" size="sm">
          Copy prompt
        </CopyButton>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void toggleFavorite()}
          disabled={busy}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("h-4 w-4", favorite && "fill-red-400 text-red-400")} />
          {favorite ? "Favorited" : "Favorite"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void toggleShare()}
          disabled={busy}
          aria-pressed={shared}
        >
          <Share2 className="h-4 w-4" />
          {shared ? "Public" : "Share"}
        </Button>
        {generation.isOwner ? (
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
        <p className="line-clamp-3 text-muted-foreground" title={generation.prompt}>
          “{generation.prompt}”
        </p>
        {generation.negativePrompt ? (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Avoided: {generation.negativePrompt}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <Badge variant="outline">{generation.model}</Badge>
          <Badge variant="outline">
            {generation.width}×{generation.height}
          </Badge>
          {generation.seed != null ? <Badge variant="outline">Seed {generation.seed}</Badge> : null}
          {generation.duration != null ? <Badge variant="outline">{generation.duration}s</Badge> : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this creation?"
        description="This permanently removes the generation and its files. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </motion.section>
  );
}
