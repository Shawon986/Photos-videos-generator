import { describe, expect, it, afterEach, vi } from "vitest";

/**
 * Provider resolution tests. env.ts is evaluated at import time, so each
 * case reloads the module tree with a fresh process.env.
 */
const BASE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "file:./dev.db",
  AUTH_SECRET: "test-secret-test-secret-test-secret-123",
  UPLOAD_DIR: "./uploads",
};

async function loadProviders(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...BASE_ENV, ...env };
  return import("@/lib/ai");
}

afterEach(() => {
  vi.resetModules();
  process.env = { ...BASE_ENV };
});

describe("provider resolution", () => {
  it("uses the local provider when AI_IMAGE_URL is set", async () => {
    const ai = await loadProviders({
      AI_IMAGE_URL: "http://localhost:8000",
      IMAGE_PROVIDER: "local",
      DEMO_MODE: "true",
    });
    const { provider, isDemo } = ai.resolveImageProvider();
    expect(provider.kind).toBe("local");
    expect(isDemo).toBe(false);
  });

  it("uses Hugging Face when configured", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "huggingface",
      HUGGINGFACE_API_KEY: "hf_test",
      DEMO_MODE: "false",
    });
    const { provider } = ai.resolveImageProvider();
    expect(provider.kind).toBe("huggingface");
  });

  it("uses the OpenAI-compatible provider when configured", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "openai-compatible",
      OPENAI_COMPAT_IMAGE_URL: "https://api.siliconflow.cn/v1",
      OPENAI_COMPAT_API_KEY: "sk_test",
      DEMO_MODE: "false",
    });
    const { provider, isDemo } = ai.resolveImageProvider();
    expect(provider.kind).toBe("openai-compatible");
    expect(isDemo).toBe(false);
  });

  it("uses the Pollinations provider without any API key", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "pollinations",
      DEMO_MODE: "false",
    });
    const { provider, isDemo } = ai.resolveImageProvider();
    expect(provider.kind).toBe("pollinations");
    expect(isDemo).toBe(false);
    expect(ai.getAiCapabilities().image).toMatchObject({ realProvider: true, demoFallback: false });
  });

  it("falls back to demo when the OpenAI-compatible key is missing", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "openai-compatible",
      OPENAI_COMPAT_IMAGE_URL: "https://api.siliconflow.cn/v1",
      OPENAI_COMPAT_API_KEY: "",
      DEMO_MODE: "true",
    });
    const { provider, isDemo } = ai.resolveImageProvider();
    expect(provider.kind).toBe("demo");
    expect(isDemo).toBe(true);
  });

  it("falls back to demo mode when nothing is configured", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "local",
      AI_IMAGE_URL: "",
      HUGGINGFACE_API_KEY: "",
      DEMO_MODE: "true",
    });
    const { provider, isDemo } = ai.resolveImageProvider();
    expect(provider.kind).toBe("demo");
    expect(isDemo).toBe(true);
  });

  it("throws provider_not_configured when demo mode is off and nothing is configured", async () => {
    const ai = await loadProviders({
      IMAGE_PROVIDER: "local",
      AI_IMAGE_URL: "",
      HUGGINGFACE_API_KEY: "",
      DEMO_MODE: "false",
    });
    expect(() => ai.resolveImageProvider()).toThrow(/no AI image provider is configured/i);
    try {
      ai.resolveVideoProvider();
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain("AI video provider is configured");
    }
  });

  it("never reports a real provider when demo assets are in use", async () => {
    const ai = await loadProviders({
      VIDEO_PROVIDER: "local",
      AI_VIDEO_URL: "",
      DEMO_MODE: "true",
    });
    const capabilities = ai.getAiCapabilities();
    expect(capabilities.video.realProvider).toBe(false);
    expect(capabilities.video.demoFallback).toBe(true);
  });
});

describe("provider failure mapping", () => {
  it("maps connection refused to a safe user message", async () => {
    const { mapProviderFailure, ProviderError } = await import("@/lib/ai/errors");
    const mapped = mapProviderFailure(
      Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" }),
      "Local inference server",
    );
    expect(mapped).toBeInstanceOf(ProviderError);
    expect(mapped.code).toBe("provider_unavailable");
    expect(mapped.userMessage).toContain("unreachable");
    // Internal details are on the message, not the userMessage.
    expect(mapped.message).toContain("ECONNREFUSED");
  });

  it("maps abort to a cancelled state", async () => {
    const { mapProviderFailure } = await import("@/lib/ai/errors");
    const mapped = mapProviderFailure(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
      "demo",
    );
    expect(mapped.code).toBe("provider_cancelled");
    expect(mapped.userMessage).toBe("Generation was cancelled.");
  });

  it("uses a generic safe message for unknown failures", async () => {
    const { mapProviderFailure } = await import("@/lib/ai/errors");
    const mapped = mapProviderFailure(new Error("some internal stack"), "demo");
    expect(mapped.userMessage).toContain("currently unavailable");
  });
});

describe("demo provider honesty", () => {
  it("serves real bundled photos and flags every result as isDemo", async () => {
    const { DemoImageProvider } = await import("@/lib/ai/image/demo-provider");
    const provider = new DemoImageProvider();
    const results = await provider.generateImage({
      prompt: "test",
      width: 512,
      height: 512,
      numImages: 2,
    });
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.isDemo).toBe(true);
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.extension).toBe(".jpg");
      expect(result.data.length).toBeGreaterThan(1000); // a real photo, not an SVG
      expect(result.width).toBeGreaterThan(0);
    }
  });

  it("serves real bundled clips for demo videos", async () => {
    const { DemoVideoProvider } = await import("@/lib/ai/video/demo-provider");
    const provider = new DemoVideoProvider();
    const results = await provider.generateVideo({
      prompt: "test",
      width: 1280,
      height: 720,
      duration: 5,
    });
    expect(results).toHaveLength(1);
    expect(results[0].isDemo).toBe(true);
    expect(results[0].mimeType).toBe("video/mp4");
    expect(results[0].extension).toBe(".mp4");
    expect(results[0].data.length).toBeGreaterThan(100_000); // a real clip
  });

  it("produces valid deterministic SVG art", async () => {
    const { generateArtSvg } = await import("@/lib/ai/demo/art");
    const a = generateArtSvg({ prompt: "x", width: 512, height: 512 });
    const b = generateArtSvg({ prompt: "x", width: 512, height: 512 });
    expect(a).toBe(b); // deterministic
    expect(a).toContain("<svg");
    expect(a).toContain('viewBox="0 0 512 512"');
  });
});

describe("pollinations provider", () => {
  const BASE_URL = "https://test.pollinations.example";

  function stubFetch() {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => {
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    process.env = { ...BASE_ENV };
  });

  it("requests the prompt endpoint with encoded prompt, size, and privacy", async () => {
    const fetchMock = stubFetch();
    const { PollinationsImageProvider } = await import("@/lib/ai/image/pollinations-provider");
    const provider = new PollinationsImageProvider(BASE_URL);

    const results = await provider.generateImage({
      prompt: "a fox & a meadow",
      width: 512,
      height: 512,
      numImages: 1,
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${BASE_URL}/prompt/a%20fox%20%26%20a%20meadow`);
    expect(url.searchParams.get("width")).toBe("512");
    expect(url.searchParams.get("height")).toBe("512");
    expect(url.searchParams.get("private")).toBe("true");
    expect(url.searchParams.has("model")).toBe(false); // auto → server default
    expect(url.searchParams.has("seed")).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ mimeType: "image/jpeg", extension: ".jpg", isDemo: false });
  });

  it("maps app model ids to Pollinations model names", async () => {
    const fetchMock = stubFetch();
    const { PollinationsImageProvider } = await import("@/lib/ai/image/pollinations-provider");
    const provider = new PollinationsImageProvider(BASE_URL);

    await provider.generateImage({
      prompt: "test",
      width: 512,
      height: 512,
      numImages: 1,
      model: "flux-schnell",
      seed: 42,
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("model")).toBe("flux");
    expect(url.searchParams.get("seed")).toBe("42");
  });

  it("generates multiple images with distinct seeds", async () => {
    const fetchMock = stubFetch();
    const { PollinationsImageProvider } = await import("@/lib/ai/image/pollinations-provider");
    const provider = new PollinationsImageProvider(BASE_URL);

    const results = await provider.generateImage({
      prompt: "test",
      width: 512,
      height: 512,
      numImages: 3,
      seed: 10,
    });

    expect(results).toHaveLength(3);
    const seeds = fetchMock.mock.calls.map(([url]) => new URL(url as string).searchParams.get("seed"));
    expect(seeds).toEqual(["10", "11", "12"]);
  });
});
