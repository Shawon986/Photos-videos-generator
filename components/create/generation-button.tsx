"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GenerationButtonProps {
  loading: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel?: string;
  onClick?: () => void;
  className?: string;
}

export function GenerationButton({
  loading,
  disabled,
  label,
  loadingLabel = "Generating…",
  onClick,
  className,
}: GenerationButtonProps) {
  return (
    <Button
      type="submit"
      variant="gradient"
      size="lg"
      className={cn("w-full", className)}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}
