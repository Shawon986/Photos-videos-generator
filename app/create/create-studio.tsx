"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Clapperboard, ImageIcon, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGenerator } from "@/components/create/image-generator";
import { VideoGenerator } from "@/components/create/video-generator";
import { ImageToVideoGenerator } from "@/components/create/image-to-video";
import { useCreateStudio, type StudioTab } from "@/lib/store/create-store";

const TAB_TO_ID: Record<StudioTab, string> = {
  image: "image",
  "text-to-video": "text-to-video",
  "image-to-video": "image-to-video",
};

export function CreateStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tab, setTab, setPrefill } = useCreateStudio();

  // Sync tab from URL (?tab=image) and prefill from search params
  // (used by "Use this prompt" and "Edit" deep links).
  React.useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "image" || urlTab === "text-to-video" || urlTab === "image-to-video") {
      setTab(urlTab);
    }
    const prompt = searchParams.get("prompt");
    const model = searchParams.get("model");
    const aspectRatio = searchParams.get("aspectRatio");
    if (prompt || model || aspectRatio) {
      setPrefill({
        prompt: prompt ?? undefined,
        model: model ?? undefined,
        aspectRatio: aspectRatio ?? undefined,
      });
    }
  }, [searchParams, setTab, setPrefill]);

  const onTabChange = (value: string) => {
    const next = value as StudioTab;
    setTab(next);
    router.replace(`/create?tab=${TAB_TO_ID[next]}`, { scroll: false });
  };

  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Creation <span className="text-gradient">Studio</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Generate images, videos and animations from your ideas.
        </p>
      </header>

      <Tabs value={TAB_TO_ID[tab]} onValueChange={onTabChange}>
        <TabsList className="mx-auto flex w-full max-w-xl" aria-label="Creation type">
          <TabsTrigger value="image" className="flex-1">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Image
          </TabsTrigger>
          <TabsTrigger value="text-to-video" className="flex-1">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
            Text → Video
          </TabsTrigger>
          <TabsTrigger value="image-to-video" className="flex-1">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Image → Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-8">
          <ImageGenerator />
        </TabsContent>
        <TabsContent value="text-to-video" className="mt-8">
          <VideoGenerator />
        </TabsContent>
        <TabsContent value="image-to-video" className="mt-8">
          <ImageToVideoGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
