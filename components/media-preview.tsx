"use client";

import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/demo-badge";

interface MediaPreviewProps {
  src: string;
  mimeType?: string | null;
  alt?: string;
  className?: string;
  /** Auto-play video when shown (muted, for galleries). */
  autoPlay?: boolean;
  isDemo?: boolean;
  showDemoBadge?: boolean;
}

/**
 * Renders images, videos and (demo) animated SVGs. Demo SVGs are rendered
 * inline so SMIL animation plays — a <video> tag cannot display them.
 */
export function MediaPreview({
  src,
  mimeType,
  alt = "",
  className,
  autoPlay = false,
  isDemo = false,
  showDemoBadge = false,
}: MediaPreviewProps) {
  const isVideo = mimeType?.startsWith("video/") ?? /\.(mp4|webm)(\?|$)/.test(src);
  const isSvg = mimeType === "image/svg+xml" || /\.svg(\?|$)/.test(src);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isVideo ? (
        <video
          src={src}
          className="h-full w-full object-cover"
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          playsInline
          controls={!autoPlay}
          preload={autoPlay ? "metadata" : "none"}
        >
          Your browser does not support video playback.
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic stored media
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn("h-full w-full object-cover", isSvg && "pointer-events-none select-none")}
        />
      )}
      {showDemoBadge && isDemo ? (
        <div className="absolute left-2 top-2">
          <DemoBadge />
        </div>
      ) : null}
    </div>
  );
}
