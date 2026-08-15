"use client";

import * as React from "react";
import { useGenerationStatus } from "@/lib/hooks/use-generation-status";
import { apiRequest, ClientApiError, type GenerateAccepted } from "@/lib/api-client";
import { toast } from "sonner";
import type { SerializedGeneration } from "@/lib/generations/serialize";

/**
 * Shared runner for the three studio tabs:
 *   submit → get generationId → poll status → progress/result/failure.
 */

/** Human-friendly error message, with remaining time for quota errors. */
function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  if (err instanceof ClientApiError && err.code === "user_quota") {
    const seconds = Number(err.extra?.retryAfterSeconds);
    if (Number.isFinite(seconds) && seconds > 0) {
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      const when = minutes >= 60 ? "about an hour" : `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
      return `${err.message} Please try again in ${when}.`;
    }
  }
  return err.message;
}
export function useGenerationRunner() {
  const [generationId, setGenerationId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const { generation, loading, refresh } = useGenerationStatus(generationId);

  const submit = React.useCallback(
    async (endpoint: string, body: unknown) => {
      setSubmitting(true);
      try {
        const accepted = await apiRequest<GenerateAccepted>(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
        });
        setGenerationId(accepted.generationId);
        if (accepted.isDemo) {
          toast.info("Demo mode — showing a preview, not real model output.");
        } else {
          toast.success(
            accepted.queuePosition > 1
              ? `Queued (position ${accepted.queuePosition}).`
              : "Generation started!",
          );
        }
        return true;
      } catch (err) {
        toast.error(errorMessage(err, "Generation failed to start."));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const cancel = React.useCallback(async () => {
    if (!generationId) return;
    setCancelling(true);
    try {
      await apiRequest(`/api/generations/${generationId}/cancel`, { method: "POST" });
      toast.success("Generation cancelled.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel generation.");
    } finally {
      setCancelling(false);
    }
  }, [generationId, refresh]);

  const regenerate = React.useCallback(
    async (generation: SerializedGeneration | null, variation: boolean) => {
      if (!generation) return;
      setRegenerating(true);
      try {
        const accepted = await apiRequest<GenerateAccepted>(
          `/api/generations/${generation.id}/regenerate`,
          { method: "POST", body: JSON.stringify({ variation }) },
        );
        setGenerationId(accepted.generationId);
        toast.success("Regenerating with the same settings.");
      } catch (err) {
        toast.error(errorMessage(err, "Could not regenerate."));
      } finally {
        setRegenerating(false);
      }
    },
    [],
  );

  const reset = React.useCallback(() => {
    setGenerationId(null);
  }, []);

  return {
    generation,
    loading,
    submitting,
    cancelling,
    regenerating,
    submit,
    cancel,
    regenerate,
    reset,
  };
}
