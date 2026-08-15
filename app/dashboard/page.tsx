import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, Heart, Images, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardGallery } from "./dashboard-gallery";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard — VisionForge AI",
  description: "Your generations, favorites and statistics.",
};

async function loadStats(userId: string) {
  const [total, images, videos, favorites] = await Promise.all([
    db.generation.count({ where: { userId } }),
    db.generation.count({ where: { userId, type: "IMAGE" } }),
    db.generation.count({ where: { userId, type: { in: ["VIDEO", "IMAGE_TO_VIDEO"] } } }),
    db.favorite.count({ where: { userId } }),
  ]);
  return { total, images, videos, favorites };
}

export default async function DashboardPage() {
  const session = await requireUser();
  const stats = await loadStats(session.user.id);

  const statCards = [
    { icon: Layers, label: "Total generations", value: stats.total },
    { icon: Images, label: "Images created", value: stats.images },
    { icon: Clapperboard, label: "Videos created", value: stats.videos },
    { icon: Heart, label: "Favorites", value: stats.favorites },
  ];

  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Your <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track your generations, favorites and results.
          </p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/create">
            New creation
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </header>

      <section aria-label="Statistics" className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <stat.icon className="h-4 w-4 text-violet-300" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <DashboardGallery />
    </div>
  );
}
