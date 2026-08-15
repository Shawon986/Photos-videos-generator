"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

/**
 * Hero collage of real sample photographs from the bundled demo media
 * (public/demo/images, Pexels free license). Mirrors the demo library so
 * the landing page and demo generations share the same look.
 */
const HERO_TILES: Array<{ src: string; alt: string; className: string; w: number; h: number }> = [
  { src: "/demo/images/pexels-572897-1024x1024.jpg", alt: "Aurora borealis over a snowy landscape", className: "aspect-square", w: 1024, h: 1024 },
  { src: "/demo/images/pexels-417074-1344x768.jpg", alt: "Mountain landscape at dusk", className: "aspect-video", w: 1344, h: 768 },
  { src: "/demo/images/pexels-2246476-768x1344.jpg", alt: "Portrait-format landscape photograph", className: "aspect-[3/4]", w: 768, h: 1344 },
  { src: "/demo/images/pexels-1366919-1344x768.jpg", alt: "Road winding through a forest", className: "aspect-video", w: 1344, h: 768 },
];

function ArtTile({ tile, index }: { tile: (typeof HERO_TILES)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.15, duration: 0.6, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-black/40"
    >
      <Image
        src={tile.src}
        alt={tile.alt}
        width={tile.w}
        height={tile.h}
        className="h-full w-full object-cover"
        priority={index < 2}
      />
    </motion.div>
  );
}

export function HeroArt() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative" aria-hidden="true">
      {/* Glow behind the composition */}
      <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-cyan-500/20 blur-3xl" />

      <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <ArtTile tile={HERO_TILES[0]} index={0} />
          <ArtTile tile={HERO_TILES[2]} index={2} />
        </div>
        <div className="flex flex-col gap-3 pt-6 sm:gap-4 sm:pt-10">
          <ArtTile tile={HERO_TILES[1]} index={1} />
          <ArtTile tile={HERO_TILES[3]} index={3} />
        </div>
      </div>

      {!reduceMotion ? (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-white/10 glass-strong px-4 py-2.5 text-xs font-medium text-zinc-200 shadow-2xl"
        >
          <span className="text-gradient font-semibold">Generating…</span> open-source models,
          zero subscription
        </motion.div>
      ) : null}
    </div>
  );
}
