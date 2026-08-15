"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SerializedGeneration } from "@/lib/generations/serialize";

interface GenerationProgressProps {
  generation: SerializedGeneration;
  onCancel: () => void;
  cancelling?: boolean;
  className?: string;
}

const STAGES = [
  "Preparing your generation...",
  "Loading AI model...",
  "Generating...",
  "Almost finished...",
];

/**
 * Honest progress display: uses the stage string and percentage reported by
 * the backend. When progress is unknown (null), renders an indeterminate
 * loader — never a fabricated percentage.
 */
export function GenerationProgress({
  generation,
  onCancel,
  cancelling,
  className,
}: GenerationProgressProps) {
  const status = generation.status;
  const job = generation.job;
  const stage = job?.stage ?? "Preparing your generation...";

  const stageIndex = React.useMemo(() => {
    const found = STAGES.findIndex((s) => stage.startsWith(s.split("...")[0]));
    return found >= 0 ? found : 1;
  }, [stage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center gap-5 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex size-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 blur-xl" />
        <Loader2 className="relative h-8 w-8 animate-spin text-violet-400" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <p className="font-display text-lg font-semibold">
          {status === "QUEUED" ? "Waiting in queue" : "Creating your masterpiece"}
        </p>
        <p className="text-sm text-muted-foreground">{stage}</p>
      </div>

      {status === "QUEUED" && (job?.queuePosition ?? 0) > 0 ? (
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Queue position: {job?.queuePosition}
        </div>
      ) : null}

      <div className="w-full max-w-xs">
        {typeof job?.progress === "number" ? (
          <Progress value={job.progress} aria-label={`Generation progress ${job.progress}%`} />
        ) : (
          <div
            className="progress-indeterminate"
            aria-label="Generation in progress — exact progress unavailable"
          />
        )}
      </div>

      <ol className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded-full border border-white/10 px-2.5 py-1 transition-colors",
              i <= stageIndex && "border-violet-400/40 text-violet-200",
            )}
          >
            {s}
          </li>
        ))}
      </ol>

      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        disabled={cancelling}
        aria-label="Cancel generation"
      >
        <XCircle className="h-4 w-4" />
        {cancelling ? "Cancelling…" : "Cancel generation"}
      </Button>
    </motion.div>
  );
}
