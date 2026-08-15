"use client";

import { AlertCircle } from "lucide-react";
import { GenerationProgress } from "@/components/generation-progress";
import { GenerationResultPanel } from "@/components/generation-result-panel";
import { Button } from "@/components/ui/button";
import type { SerializedGeneration } from "@/lib/generations/serialize";

interface GenerationStageProps {
  generation: SerializedGeneration | null;
  loading: boolean;
  cancelling: boolean;
  regenerating: boolean;
  onCancel: () => void;
  onRegenerate: (variation: boolean) => void;
  onRetry: () => void;
  onDeleted: () => void;
}

/**
 * Renders whichever stage the generation is in: active progress, failed
 * state (with retry), or the completed result panel.
 */
export function GenerationStage({
  generation,
  loading,
  cancelling,
  regenerating,
  onCancel,
  onRegenerate,
  onRetry,
  onDeleted,
}: GenerationStageProps) {
  if (!generation) return null;

  if (loading && !generation.resultUrl) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4" role="status">
        <div className="progress-indeterminate" aria-label="Loading generation status" />
        <p className="text-center text-sm text-muted-foreground">Loading generation…</p>
      </div>
    );
  }

  if (generation.status === "QUEUED" || generation.status === "PROCESSING") {
    return (
      <GenerationProgress
        generation={generation}
        onCancel={() => void onCancel()}
        cancelling={cancelling}
      />
    );
  }

  if (generation.status === "FAILED") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-6 py-10 text-center"
        role="alert"
      >
        <span className="flex size-12 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10">
          <AlertCircle className="h-6 w-6 text-red-400" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold">Generation failed</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {generation.errorMessage ?? "The AI model is currently unavailable. Please try again."}
          </p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (generation.status === "CANCELLED") {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center"
        role="status"
      >
        <h3 className="font-display text-lg font-semibold">Generation cancelled</h3>
        <p className="text-sm text-muted-foreground">No result was produced for this request.</p>
        <Button variant="outline" onClick={onRetry}>
          Start again
        </Button>
      </div>
    );
  }

  return (
    <GenerationResultPanel
      generation={generation}
      onRegenerate={(variation) => void onRegenerate(variation)}
      onDeleted={onDeleted}
      regenerating={regenerating}
    />
  );
}
