"use client";

import type { SerializedGeneration } from "@/lib/generations/serialize";

export interface GenerationPage {
  items: SerializedGeneration[];
  nextCursor: string | null;
}

/**
 * Fetch one page of generations from the list APIs.
 * Pure data fetch — no component state. Callers decide how to store the
 * result and manage loading flags.
 */
export async function fetchGenerationPage(url: string): Promise<GenerationPage> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load creations. Please try again.");
  }
  return (await response.json()) as GenerationPage;
}
