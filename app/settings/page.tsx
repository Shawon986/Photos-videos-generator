import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";
import { SettingsPanel } from "./settings-panel";
import { getAiCapabilities } from "@/lib/ai";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Settings — VisionForge AI",
  description: "Manage your profile, password and AI provider status.",
};

export default async function SettingsPage() {
  const session = await requireUser();
  const capabilities = getAiCapabilities();

  return (
    <SettingsPanel
      userName={session.user.name ?? ""}
      userEmail={session.user.email ?? ""}
      aiStatus={{
        demoMode: capabilities.demoMode,
        image: capabilities.image,
        video: capabilities.video,
      }}
      limits={{
        imagesPerHour: env.IMAGE_GENERATIONS_PER_HOUR,
        videosPerHour: env.VIDEO_GENERATIONS_PER_HOUR,
      }}
    />
  );
}
