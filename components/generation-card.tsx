"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clapperboard,
  Download,
  Heart,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaPreview } from "@/components/media-preview";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { SerializedGeneration } from "@/lib/generations/serialize";

interface GenerationCardProps {
  generation: SerializedGeneration;
  onDelete?: (id: string) => void;
  onRegenerate?: (generation: SerializedGeneration) => void;
  onFavorite?: (generation: SerializedGeneration) => void;
  compact?: boolean;
}

function StatusBadge({ generation }: { generation: SerializedGeneration }) {
  switch (generation.status) {
    case "QUEUED":
      return <Badge variant="secondary">Queued</Badge>;
    case "PROCESSING":
      return <Badge variant="info">Generating…</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return null;
  }
}

export function GenerationCard({
  generation,
  onDelete,
  onRegenerate,
  onFavorite,
  compact = false,
}: GenerationCardProps) {
  const isImage = generation.type === "IMAGE";
  const mimeType = generation.assets[0]?.mimeType ?? (isImage ? "image/png" : "video/mp4");
  const src = generation.resultUrl ?? generation.thumbnailUrl ?? "";
  const canShowMedia = generation.status === "COMPLETED" && src.length > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group relative break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-card shadow-lg shadow-black/20 transition-colors hover:border-white/20"
    >
      <Link
        href={`/creation/${generation.id}`}
        className="focus-ring block rounded-xl"
        aria-label={`Open creation: ${generation.prompt.slice(0, 80)}`}
      >
        {canShowMedia ? (
          <MediaPreview
            src={src}
            mimeType={mimeType}
            alt={generation.prompt}
            autoPlay={!isImage}
            isDemo={generation.isDemo}
            showDemoBadge
            className={cn(
              "w-full bg-black/40",
              generation.height > generation.width ? "aspect-[3/4]" : "aspect-video",
              isImage && "transition-transform duration-300 group-hover:scale-[1.03]",
            )}
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-white/[0.03]">
            <StatusBadge generation={generation} />
            <span className="px-4 text-center text-xs text-muted-foreground line-clamp-2">
              {generation.errorMessage ?? "Waiting for generation…"}
            </span>
          </div>
        )}
      </Link>

      {!compact ? (
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground line-clamp-2" title={generation.prompt}>
              {generation.prompt}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label="Creation actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/creation/${generation.id}`}>
                    <ExternalLink />
                    Open
                  </Link>
                </DropdownMenuItem>
                {canShowMedia ? (
                  <DropdownMenuItem asChild>
                    <a href={src} download={`visionforge-${generation.id.slice(0, 8)}.${generation.assets[0]?.url.split(".").pop() ?? "png"}`}>
                      <Download />
                      Download
                    </a>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => onRegenerate?.(generation)}>
                  <RefreshCw />
                  Regenerate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onFavorite?.(generation)}>
                  <Heart className={generation.favorite ? "fill-red-400 text-red-400" : ""} />
                  {generation.favorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                {generation.isOwner ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-400 focus:bg-red-400/10 focus:text-red-300"
                      onSelect={() => onDelete?.(generation.id)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {isImage ? (
                <span className="text-violet-300">Image</span>
              ) : (
                <span className="flex items-center gap-1 text-cyan-300">
                  <Clapperboard className="h-3 w-3" aria-hidden="true" />
                  Video
                </span>
              )}
              {generation.isDemo ? <span className="text-amber-300/80">· Demo</span> : null}
            </span>
            <time dateTime={String(generation.createdAt)}>{formatRelativeTime(generation.createdAt)}</time>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}
