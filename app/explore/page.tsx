import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreGallery } from "./explore-gallery";

export const metadata: Metadata = {
  title: "Explore — VisionForge AI",
  description:
    "Browse publicly shared AI images and videos created by the VisionForge community.",
};

export default function ExplorePage() {
  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Explore <span className="text-gradient">Creations</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Publicly shared generations from the community.
        </p>
      </header>
      <Suspense fallback={null}>
        <ExploreGallery />
      </Suspense>
    </div>
  );
}
