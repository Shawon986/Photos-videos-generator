import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateStudio } from "./create-studio";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  title: "Create — VisionForge AI",
  description:
    "Generate AI images, text-to-video and image-to-video with open-source models.",
};

export default async function CreatePage() {
  await requireUser();
  return (
    <Suspense fallback={null}>
      <CreateStudio />
    </Suspense>
  );
}
