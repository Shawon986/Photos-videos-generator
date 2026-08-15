"use client";

import * as React from "react";
import type { SerializedGeneration } from "@/lib/generations/serialize";

export type GenerationWithStatus = SerializedGeneration;

const POLL_MS = 2500;
const ACTIVE_STATUSES = new Set(["QUEUED", "PROCESSING"]);

interface HookState {
  /** Id the data belongs to — guards against stale responses. */
  id: string | null;
  data: GenerationWithStatus | null;
}

/**
 * Poll a generation by id until it reaches a terminal state.
 * Only polls while QUEUED/PROCESSING — never fabricates progress.
 */
export function useGenerationStatus(generationId: string | null) {
  const [state, setState] = React.useState<HookState>({ id: null, data: null });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(Boolean(generationId));

  React.useEffect(() => {
    if (!generationId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}`, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            setError("Please sign in to view this generation.");
          } else {
            setError("Could not load this generation.");
          }
          setLoading(false);
          return;
        }
        const data = (await response.json()) as GenerationWithStatus;
        if (cancelled) return;
        setState({ id: generationId, data });
        setError(null);
        setLoading(false);
        if (ACTIVE_STATUSES.has(data.status)) {
          timer = setTimeout(() => void tick(), POLL_MS);
        }
      } catch {
        if (!cancelled) {
          setError("Network error while checking generation status.");
          setLoading(false);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [generationId]);

  const generation = state.id === generationId ? state.data : null;

  /** Refresh on demand (e.g. after an action). */
  const refresh = React.useCallback(() => {
    setLoading(true);
    void (async () => {
      if (!generationId) return;
      try {
        const response = await fetch(`/api/generations/${generationId}`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as GenerationWithStatus;
          setState({ id: generationId, data });
        }
      } catch {
        /* keep last state */
      }
      setLoading(false);
    })();
  }, [generationId]);

  return { generation, error, loading, refresh };
}
