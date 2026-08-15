import { z } from "zod";
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  IMAGE_TO_VIDEO_MODELS,
  MAX_IMAGES_PER_GENERATION,
  MAX_NEGATIVE_PROMPT_LENGTH,
  MAX_PROMPT_LENGTH,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
} from "@/lib/constants";

const prompt = z
  .string()
  .trim()
  .min(1, "Please describe what you want to create.")
  .max(MAX_PROMPT_LENGTH, `Prompt must be at most ${MAX_PROMPT_LENGTH} characters.`);

const negativePrompt = z
  .string()
  .trim()
  .max(MAX_NEGATIVE_PROMPT_LENGTH, `Negative prompt must be at most ${MAX_NEGATIVE_PROMPT_LENGTH} characters.`)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const seed = z
  .union([z.number().int().min(0).max(2_147_483_647), z.string().regex(/^\d{1,10}$/)])
  .optional()
  .transform((v) => (typeof v === "string" ? Number.parseInt(v, 10) : v));

const imageAspectRatio = z
  .string()
  .optional()
  .refine((v) => !v || IMAGE_ASPECT_RATIOS.some((r) => r.id === v), "Unsupported aspect ratio.");

const videoAspectRatio = z
  .string()
  .optional()
  .refine((v) => !v || VIDEO_ASPECT_RATIOS.some((r) => r.id === v), "Unsupported aspect ratio.");

const modelId = (allowed: readonly { id: string }[], label: string) =>
  z
    .string()
    .optional()
    .refine((v) => !v || allowed.some((m) => m.id === v), `Unsupported ${label}.`);

const videoDuration = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => (typeof v === "string" ? Number.parseInt(v, 10) : v))
  .refine((v) => v === undefined || VIDEO_DURATIONS.includes(v as 3 | 5 | 10), {
    message: "Duration must be 3, 5 or 10 seconds.",
  });

const resolution = z
  .string()
  .optional()
  .refine((v) => !v || VIDEO_RESOLUTIONS.some((r) => r.id === v), "Unsupported resolution.");

export const imageGenerationSchema = z
  .object({
    prompt,
    negativePrompt,
    aspectRatio: imageAspectRatio,
    width: z.coerce.number().int().min(256).max(2048).optional(),
    height: z.coerce.number().int().min(256).max(2048).optional(),
    numImages: z.coerce.number().int().min(1).max(MAX_IMAGES_PER_GENERATION).default(1),
    steps: z.coerce.number().int().min(1).max(100).optional(),
    guidanceScale: z.coerce.number().min(1).max(20).optional(),
    seed,
    model: modelId(IMAGE_MODELS, "model"),
    quality: z
      .string()
      .optional()
      .refine((v) => !v || IMAGE_QUALITIES.some((q) => q.id === v), "Unsupported quality."),
  })
  .superRefine((data, ctx) => {
    if (data.width && data.height) return;
    const ratio =
      IMAGE_ASPECT_RATIOS.find((r) => r.id === (data.aspectRatio ?? "1:1")) ?? IMAGE_ASPECT_RATIOS[0];
    // Defaults are applied by the caller; nothing to reject here.
    void ratio;
    void ctx;
  });

export const videoGenerationSchema = z.object({
  prompt,
  negativePrompt,
  duration: videoDuration,
  aspectRatio: videoAspectRatio,
  resolution,
  model: modelId(VIDEO_MODELS, "model"),
  seed,
});

export const imageToVideoSchema = z.object({
  prompt,
  negativePrompt,
  imageFileId: z.string().min(1, "An uploaded image is required.").max(100),
  duration: videoDuration,
  motionStrength: z.coerce.number().min(1).max(10).default(5),
  aspectRatio: videoAspectRatio,
  resolution,
  model: modelId(IMAGE_TO_VIDEO_MODELS, "model"),
  seed,
});

export const registerSchema = z.object({
  name: z.string().trim().max(80).optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters.")
    .regex(/[a-zA-Z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.").max(128),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty.").max(80).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(128)
    .regex(/[a-zA-Z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>;
export type ImageToVideoInput = z.infer<typeof imageToVideoSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
