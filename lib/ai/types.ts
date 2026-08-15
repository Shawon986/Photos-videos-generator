/**
 * Shared types for the AI provider abstraction.
 */

export interface GenerationProgress {
  /** Human-readable stage, e.g. "Loading AI model...". */
  stage?: string;
  /**
   * 0-100 when the provider genuinely reports progress.
   * null = progress unknown (UI shows an indeterminate loader — never a
   * fabricated percentage).
   */
  progress: number | null;
}

export type ProgressReporter = (update: GenerationProgress) => void;

export interface MediaResult {
  /** Raw media bytes. */
  data: Buffer;
  mimeType: string;
  /** Suggested file extension (with dot), e.g. ".png", ".mp4". */
  extension: string;
  width: number;
  height: number;
  /** true when the result was produced by the demo provider. */
  isDemo: boolean;
}

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numImages: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  model?: string;
  signal?: AbortSignal;
  onProgress?: ProgressReporter;
}

export interface VideoGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  /** Seconds. */
  duration: number;
  width: number;
  height: number;
  /** Optional input image for image-to-video (raw bytes). */
  sourceImage?: { data: Buffer; mimeType: string };
  motionStrength?: number;
  seed?: number;
  model?: string;
  signal?: AbortSignal;
  onProgress?: ProgressReporter;
}

export interface ImageGenerationProvider {
  readonly kind: string;
  readonly label: string;
  generateImage(options: ImageGenerationOptions): Promise<MediaResult[]>;
}

export interface VideoGenerationProvider {
  readonly kind: string;
  readonly label: string;
  generateVideo(options: VideoGenerationOptions): Promise<MediaResult[]>;
}
