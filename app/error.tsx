"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log to the console only — never show internals to users.
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-400" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Something went <span className="text-gradient">wrong</span>
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        An unexpected error occurred. Please try again — your work is safe.
      </p>
      <Button variant="gradient" className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
