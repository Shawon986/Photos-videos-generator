import { describe, expect, it } from "vitest";
import {
  imageGenerationSchema,
  videoGenerationSchema,
  imageToVideoSchema,
  registerSchema,
  loginSchema,
} from "@/lib/validation/generation";

describe("image generation validation", () => {
  const valid = { prompt: "a glowing forest at dusk" };

  it("accepts a minimal valid request", () => {
    const result = imageGenerationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.numImages).toBe(1);
  });

  it("rejects an empty prompt", () => {
    expect(imageGenerationSchema.safeParse({ ...valid, prompt: "   " }).success).toBe(false);
  });

  it("rejects over-long prompts", () => {
    expect(
      imageGenerationSchema.safeParse({ ...valid, prompt: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("rejects unknown aspect ratios", () => {
    expect(
      imageGenerationSchema.safeParse({ ...valid, aspectRatio: "21:9" }).success,
    ).toBe(false);
  });

  it("rejects out-of-range dimensions", () => {
    expect(
      imageGenerationSchema.safeParse({ ...valid, width: 100, height: 100 }).success,
    ).toBe(false);
    expect(
      imageGenerationSchema.safeParse({ ...valid, width: 4096, height: 1024 }).success,
    ).toBe(false);
  });

  it("rejects more than 4 images", () => {
    expect(imageGenerationSchema.safeParse({ ...valid, numImages: 5 }).success).toBe(false);
  });

  it("rejects unknown models", () => {
    expect(
      imageGenerationSchema.safeParse({ ...valid, model: "midjourney-v7" }).success,
    ).toBe(false);
  });

  it("accepts numeric strings for coercion-friendly fields", () => {
    const result = imageGenerationSchema.safeParse({
      ...valid,
      width: "1024",
      steps: "30",
      seed: "42",
    });
    expect(result.success).toBe(true);
    expect(result.data?.seed).toBe(42);
  });
});

describe("video generation validation", () => {
  const valid = { prompt: "waves crashing on a shore at sunset" };

  it("accepts valid durations", () => {
    for (const duration of [3, 5, 10, "3"]) {
      expect(videoGenerationSchema.safeParse({ ...valid, duration }).success).toBe(true);
    }
  });

  it("rejects invalid durations", () => {
    expect(videoGenerationSchema.safeParse({ ...valid, duration: 7 }).success).toBe(false);
    expect(videoGenerationSchema.safeParse({ ...valid, duration: -1 }).success).toBe(false);
  });

  it("rejects unknown resolutions", () => {
    expect(
      videoGenerationSchema.safeParse({ ...valid, resolution: "8k" }).success,
    ).toBe(false);
  });
});

describe("image-to-video validation", () => {
  it("requires an imageFileId", () => {
    expect(imageToVideoSchema.safeParse({ prompt: "animate this" }).success).toBe(false);
    expect(
      imageToVideoSchema.safeParse({ prompt: "animate this", imageFileId: "abc123" }).success,
    ).toBe(true);
  });

  it("defaults motion strength to 5 and clamps the range", () => {
    const result = imageToVideoSchema.safeParse({
      prompt: "animate this",
      imageFileId: "abc",
    });
    expect(result.data?.motionStrength).toBe(5);
    expect(
      imageToVideoSchema.safeParse({ prompt: "x", imageFileId: "a", motionStrength: 99 })
        .success,
    ).toBe(false);
  });
});

describe("register validation", () => {
  it("rejects weak passwords", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.co", password: "short" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ email: "a@b.co", password: "onlyletters" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ email: "a@b.co", password: "12345678" }).success,
    ).toBe(false);
  });

  it("accepts a strong password and normalizes email", () => {
    const result = registerSchema.safeParse({
      email: "  User@Example.COM ",
      password: "correct-horse-42",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("user@example.com");
  });

  it("rejects invalid emails", () => {
    expect(registerSchema.safeParse({ email: "nope", password: "abc12345" }).success).toBe(false);
  });
});

describe("login validation", () => {
  it("requires both fields", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});
