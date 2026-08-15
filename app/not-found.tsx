import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center py-24 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <SearchX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        404 — <span className="text-gradient">Not found</span>
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Button variant="gradient" className="mt-8" asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
