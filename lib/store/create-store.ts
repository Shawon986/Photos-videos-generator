"use client";

import { create } from "zustand";

export type StudioTab = "image" | "text-to-video" | "image-to-video";

interface CreateStudioState {
  tab: StudioTab;
  /** One-shot prompt prefill (from "Use this prompt" / "Edit"). */
  prefill: {
    prompt?: string;
    negativePrompt?: string;
    model?: string;
    aspectRatio?: string;
    applied?: boolean;
  } | null;
  setTab: (tab: StudioTab) => void;
  setPrefill: (prefill: NonNullable<CreateStudioState["prefill"]>) => void;
  clearPrefill: () => void;
}

export const useCreateStudio = create<CreateStudioState>((set) => ({
  tab: "image",
  prefill: null,
  setTab: (tab) => set({ tab }),
  setPrefill: (prefill) => set({ prefill: { ...prefill, applied: false } }),
  clearPrefill: () => set({ prefill: null }),
}));
