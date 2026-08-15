"use client";

import { GenerationCard } from "@/components/generation-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Images } from "lucide-react";
import type { SerializedGeneration } from "@/lib/generations/serialize";
import { cn } from "@/lib/utils";

interface GenerationGalleryProps {
  items: SerializedGeneration[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  onRegenerate?: (generation: SerializedGeneration) => void;
  onFavorite?: (generation: SerializedGeneration) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/** Masonry-style gallery via CSS columns. */
export function GenerationGallery({
  items,
  loading = false,
  onDelete,
  onRegenerate,
  onFavorite,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Create your first image or video and it will appear here.",
  className,
}: GenerationGalleryProps) {
  if (loading && items.length === 0) {
    return (
      <div className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <Skeleton className={cn("w-full rounded-xl", i % 3 === 1 ? "aspect-square" : "aspect-video")} />
            <div className="mt-3 space-y-2 px-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return <EmptyState icon={Images} title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <div className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3 [&>article]:mb-4", className)}>
      {items.map((item) => (
        <GenerationCard
          key={item.id}
          generation={item}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}
