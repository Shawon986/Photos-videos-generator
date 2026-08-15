import { hashString, seededRandom, clamp } from "@/lib/utils";

/**
 * Procedural generative SVG artwork.
 *
 * Fallback for demo mode: demo providers serve bundled real sample media
 * (see media-library.ts); when an asset file is missing they fall back to
 * this deterministic abstract art instead of failing. Results are clearly
 * labelled "Demo Preview".
 *
 * No external assets, no copyright concerns — everything is drawn from
 * math seeded by the prompt.
 */

interface Palette {
  name: string;
  colors: [string, string, string, string];
  background: [string, string];
}

const PALETTES: Palette[] = [
  { name: "aurora", colors: ["#7c3aed", "#db2777", "#0ea5e9", "#22d3ee"], background: ["#0b1020", "#1e1b4b"] },
  { name: "ember", colors: ["#f97316", "#ef4444", "#fbbf24", "#7c2d12"], background: ["#1c0a0a", "#3b1414"] },
  { name: "reef", colors: ["#06b6d4", "#34d399", "#3b82f6", "#0f766e"], background: ["#04121a", "#062a33"] },
  { name: "orchid", colors: ["#d946ef", "#8b5cf6", "#f472b6", "#4c1d95"], background: ["#140a1e", "#2e1065"] },
  { name: "citrus", colors: ["#84cc16", "#facc15", "#fb923c", "#166534"], background: ["#0d1408", "#1a2e05"] },
  { name: "glacier", colors: ["#38bdf8", "#a5f3fc", "#818cf8", "#1e3a8a"], background: ["#050a14", "#0f2142"] },
];

interface ArtOptions {
  prompt: string;
  seed?: number;
  width: number;
  height: number;
  /** Animated SMIL version (for demo videos rendered by the browser). */
  animated?: boolean;
  durationSeconds?: number;
}

function hashColorIndex(rng: () => number, len: number): number {
  return Math.floor(rng() * len);
}

export function generateArtSvg(options: ArtOptions): string {
  const { width, height } = options;
  const seed = options.seed ?? hashString(options.prompt);
  const rng = seededRandom(seed);
  const palette = PALETTES[hashColorIndex(rng, PALETTES.length)];
  const [bgA, bgB] = palette.background;

  const blobCount = 5 + Math.floor(rng() * 3);
  const blobs: string[] = [];
  for (let i = 0; i < blobCount; i++) {
    const cx = Math.round(rng() * width);
    const cy = Math.round(rng() * height);
    const rx = Math.round((0.12 + rng() * 0.3) * width);
    const ry = Math.round((0.1 + rng() * 0.28) * height);
    const color = palette.colors[hashColorIndex(rng, palette.colors.length)];
    const opacity = 0.35 + rng() * 0.45;
    const dur = 6 + rng() * 10;

    const animate = options.animated
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;${Math.round((rng() - 0.5) * width * 0.12)} ${Math.round((rng() - 0.5) * height * 0.12)};0 0" dur="${dur}s" repeatCount="indefinite"/>`
      : "";
    blobs.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" filter="url(#blur)">${animate}</ellipse>`,
    );
  }

  // A few crisp rings for contrast.
  const ringCount = 2 + Math.floor(rng() * 3);
  const rings: string[] = [];
  for (let i = 0; i < ringCount; i++) {
    const cx = Math.round(rng() * width);
    const cy = Math.round(rng() * height);
    const r = Math.round((0.06 + rng() * 0.22) * Math.min(width, height));
    const color = palette.colors[hashColorIndex(rng, palette.colors.length)];
    const opacity = 0.5 + rng() * 0.4;
    const dur = 4 + rng() * 8;
    const animate = options.animated
      ? `<animate attributeName="r" values="${r};${Math.round(r * (1.1 + rng() * 0.25))};${r}" dur="${dur}s" repeatCount="indefinite"/>`
      : "";
    rings.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${Math.max(1, Math.round(Math.min(width, height) * 0.003))}" opacity="${opacity}">${animate}</circle>`,
    );
  }

  // Subtle grid for structure.
  const gridStep = Math.round(clamp(Math.min(width, height) / 9, 48, 160));
  const gridLines: string[] = [];
  for (let x = gridStep; x < width; x += gridStep) {
    gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ffffff" stroke-opacity="0.045"/>`);
  }
  for (let y = gridStep; y < height; y += gridStep) {
    gridLines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ffffff" stroke-opacity="0.045"/>`);
  }

  const hueShift = options.animated
    ? `<animateTransform attributeName="transform" type="rotate" from="0 ${width / 2} ${height / 2}" to="360 ${width / 2} ${height / 2}" dur="${(options.durationSeconds ?? 5) * 2}s" repeatCount="indefinite"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Procedurally generated demo artwork">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgA}"/>
      <stop offset="100%" stop-color="${bgB}"/>
    </linearGradient>
    <filter id="blur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g>${hueShift}${blobs.join("")}</g>
  <g>${rings.join("")}</g>
  <g>${gridLines.join("")}</g>
  <rect x="${width * 0.04}" y="${height * 0.04}" width="${width * 0.92}" height="${height * 0.92}" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1" rx="${Math.round(width * 0.02)}"/>
</svg>`;
}
