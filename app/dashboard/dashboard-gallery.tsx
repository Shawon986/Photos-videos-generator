"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Heart, ListFilter } from "lucide-react";
import { GenerationGallery } from "@/components/generation-gallery";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { fetchGenerationPage } from "@/lib/fetch-generations";
import { toast } from "sonner";
import type { SerializedGeneration } from "@/lib/generations/serialize";

type Filter = "all" | "images" | "videos" | "favorites";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "favorites", label: "Favorites" },
];

function listUrl(filter: Filter, cursor?: string): string {
  const params = new URLSearchParams({ limit: "24" });
  if (filter === "images") params.set("type", "IMAGE");
  if (filter === "videos") params.set("type", "VIDEO");
  if (filter === "favorites") params.set("favorite", "true");
  if (cursor) params.set("cursor", cursor);
  return `/api/generations?${params.toString()}`;
}

export function DashboardGallery() {
  const { status } = useSession();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [items, setItems] = React.useState<SerializedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Initial load + reload on filter change. State is only set after the
  // fetch resolves (async boundary) — never synchronously in the effect.
  React.useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const run = async () => {
      try {
        const page = await fetchGenerationPage(listUrl(filter));
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load your generations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [status, filter]);

  const applyFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setItems([]);
    setLoading(true);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchGenerationPage(listUrl(filter, nextCursor));
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiRequest(`/api/generations/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Creation deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this creation.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleRegenerate = async (generation: SerializedGeneration) => {
    try {
      await apiRequest(`/api/generations/${generation.id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ variation: false }),
      });
      toast.success("Regeneration queued.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate.");
    }
  };

  const handleFavorite = async (generation: SerializedGeneration) => {
    try {
      const result = await apiRequest<{ favorite: boolean }>(
        `/api/generations/${generation.id}/favorite`,
        { method: "POST" },
      );
      setItems((prev) =>
        prev.map((item) =>
          item.id === generation.id ? { ...item, favorite: result.favorite } : item,
        ),
      );
      if (filter === "favorites" && !result.favorite) {
        setItems((prev) => prev.filter((item) => item.id !== generation.id));
      }
      toast.success(result.favorite ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update favorite.");
    }
  };

  const emptyCopy: Record<Filter, { title: string; description: string }> = {
    all: {
      title: "No creations yet",
      description: "Head to the studio and generate your first image or video.",
    },
    images: { title: "No images yet", description: "Generate your first AI image." },
    videos: { title: "No videos yet", description: "Generate your first AI video." },
    favorites: {
      title: "No favorites yet",
      description: "Favorite creations you love to see them here.",
    },
  };

  return (
    <section aria-label="Your generations">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "gradient" : "outline"}
            size="sm"
            onClick={() => applyFilter(f.id)}
            aria-pressed={filter === f.id}
          >
            {f.id === "favorites" ? (
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            ) : null}
            {f.label}
          </Button>
        ))}
      </div>

      <GenerationGallery
        items={items}
        loading={loading}
        onDelete={(id) => setPendingDelete(id)}
        onRegenerate={(g) => void handleRegenerate(g)}
        onFavorite={(g) => void handleFavorite(g)}
        emptyTitle={emptyCopy[filter].title}
        emptyDescription={emptyCopy[filter].description}
      />

      {nextCursor ? (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this creation?"
        description="This permanently removes the generation and its files. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
      />
    </section>
  );
}
