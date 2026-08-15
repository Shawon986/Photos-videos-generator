"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Compass, Flame, Heart, Sparkles, TrendingUp } from "lucide-react";
import { GenerationGallery } from "@/components/generation-gallery";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { fetchGenerationPage } from "@/lib/fetch-generations";
import { toast } from "sonner";
import type { SerializedGeneration } from "@/lib/generations/serialize";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "IMAGE", label: "Images" },
  { id: "VIDEO", label: "Videos" },
];

const ORIENTATION_FILTERS = [
  { id: "all", label: "Any shape" },
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
  { id: "square", label: "Square" },
];

const STYLE_FILTERS = [
  { id: "all", label: "All styles" },
  { id: "anime", label: "Anime" },
  { id: "cinematic", label: "Cinematic" },
  { id: "3d", label: "3D" },
  { id: "fantasy", label: "Fantasy" },
  { id: "photography", label: "Photography" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recent", icon: Sparkles },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "popular", label: "Popular", icon: Flame },
];

function FilterGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Button
            key={option.id}
            variant={value === option.id ? "gradient" : "outline"}
            size="sm"
            onClick={() => onSelect(option.id)}
            aria-pressed={value === option.id}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ExploreGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "all";
  const orientation = searchParams.get("orientation") ?? "all";
  const style = searchParams.get("style") ?? "all";
  const sort = searchParams.get("sort") ?? "recent";

  const [items, setItems] = React.useState<SerializedGeneration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "recent") params.delete(key);
    else params.set(key, value);
    router.replace(`/explore${params.size > 0 ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
    // Event-handler context — safe to flip loading synchronously.
    setItems([]);
    setLoading(true);
  };

  /** Build the explore URL for the active filters. */
  const listUrl = React.useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams({ limit: "24" });
      if (type !== "all") params.set("type", type);
      if (orientation !== "all") params.set("orientation", orientation);
      if (style !== "all") params.set("style", style);
      if (sort !== "recent") params.set("sort", sort);
      if (cursor) params.set("cursor", cursor);
      return `/api/explore?${params.toString()}`;
    },
    [type, orientation, style, sort],
  );

  // Initial load (and reload when URL filters change) — state is only set
  // after the fetch resolves, never synchronously in the effect body.
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const page = await fetchGenerationPage(listUrl());
        if (cancelled) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load creations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [listUrl]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchGenerationPage(listUrl(nextCursor));
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <div className="mb-8 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <FilterGroup
          label="Type"
          options={TYPE_FILTERS}
          value={type}
          onSelect={(v) => setParam("type", v)}
        />
        <FilterGroup
          label="Shape"
          options={ORIENTATION_FILTERS}
          value={orientation}
          onSelect={(v) => setParam("orientation", v)}
        />
        <FilterGroup
          label="Style"
          options={STYLE_FILTERS}
          value={style}
          onSelect={(v) => setParam("style", v)}
        />
        <div className="flex items-center gap-1.5" role="group" aria-label="Sort">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant={sort === option.id ? "gradient" : "ghost"}
              size="sm"
              onClick={() => setParam("sort", option.id)}
              aria-pressed={sort === option.id}
            >
              <option.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing shared yet"
          description="Be the first to share a creation with the community."
        />
      ) : null}

      <GenerationGallery
        items={items}
        loading={loading}
        emptyTitle="No matches"
        emptyDescription="Try different filters to discover more creations."
      />

      {nextCursor ? (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Heart className="h-3 w-3" aria-hidden="true" />
          Shared by the community
        </p>
      ) : null}
    </div>
  );
}
