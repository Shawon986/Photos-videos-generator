import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";

/**
 * Storage provider tests. env.ts is evaluated at import time, so each case
 * reloads the module tree with a fresh process.env.
 */
const BASE_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "file:./dev.db",
  AUTH_SECRET: "test-secret-test-secret-test-secret-123",
  UPLOAD_DIR: "./uploads",
};

const blobMocks = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: blobMocks.put,
  get: blobMocks.get,
  del: blobMocks.del,
}));

async function loadStorage(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...BASE_ENV, ...env };
  return import("@/lib/storage");
}

beforeEach(() => {
  blobMocks.put.mockReset();
  blobMocks.get.mockReset();
  blobMocks.del.mockReset();
});

afterEach(() => {
  vi.resetModules();
  process.env = { ...BASE_ENV };
});

describe("storage provider selection", () => {
  it("uses local storage by default", async () => {
    const { getStorage } = await loadStorage({});
    expect(getStorage().kind).toBe("local");
  });

  it("uses vercel-blob when configured", async () => {
    const { getStorage } = await loadStorage({
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });
    expect(getStorage().kind).toBe("vercel-blob");
  });
});

describe("env validation", () => {
  it("rejects vercel-blob without a token", async () => {
    vi.resetModules();
    process.env = { ...BASE_ENV, STORAGE_PROVIDER: "vercel-blob", BLOB_READ_WRITE_TOKEN: "" };
    await expect(import("@/lib/env")).rejects.toThrow(/Invalid environment configuration/);
  });

  it("treats empty endpoint URLs as unset (falls back to defaults)", async () => {
    vi.resetModules();
    process.env = {
      ...BASE_ENV,
      POLLINATIONS_IMAGE_URL: "",
      HF_INFERENCE_URL: "",
    };
    const { env } = await import("@/lib/env");
    expect(env.POLLINATIONS_IMAGE_URL).toBe("https://image.pollinations.ai");
    expect(env.HF_INFERENCE_URL).toBe("https://api-inference.huggingface.co");
  });
});

describe("vercel blob adapter", () => {
  it("stores private blobs under the exact key (no random suffix) and returns app-relative URLs", async () => {
    blobMocks.put.mockResolvedValue({ url: "https://store.private.blob.vercel-storage.com/images/g1/result_0.jpg" });
    const { getStorage } = await loadStorage({
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });
    const storage = getStorage();
    const stored = await storage.put("images/g1/result_0.jpg", Buffer.from("x"), "image/jpeg");

    expect(blobMocks.put).toHaveBeenCalledWith(
      "images/g1/result_0.jpg",
      expect.any(Buffer),
      expect.objectContaining({
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/jpeg",
      }),
    );
    // URLs stay provider-agnostic so DB rows survive a storage switch.
    expect(stored.url).toBe("/api/files/images/g1/result_0.jpg");
  });

  it("reads blob contents with cache bypass for read-after-write consistency", async () => {
    blobMocks.get.mockResolvedValue({
      blob: { contentType: "image/jpeg" },
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
    });
    const { getStorage } = await loadStorage({
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });

    const data = await getStorage().get("images/g1/result_0.jpg");
    expect(data).toEqual(Buffer.from([1, 2, 3]));
    expect(blobMocks.get).toHaveBeenCalledWith(
      "images/g1/result_0.jpg",
      expect.objectContaining({ access: "private", useCache: false }),
    );
  });

  it("returns null when the blob is missing", async () => {
    blobMocks.get.mockResolvedValue(null);
    const { getStorage } = await loadStorage({
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });
    await expect(getStorage().get("images/g1/missing.jpg")).resolves.toBeNull();
  });

  it("returns null when blob reads fail", async () => {
    blobMocks.get.mockRejectedValue(new Error("network down"));
    const { getStorage } = await loadStorage({
      STORAGE_PROVIDER: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });
    await expect(getStorage().get("images/g1/error.jpg")).resolves.toBeNull();
  });
});

describe("cron endpoint", () => {
  it("rejects requests without the cron secret", async () => {
    const route = await import("@/app/api/cron/process/route");
    const res = await route.GET(new Request("http://localhost/api/cron/process"));
    expect(res.status).toBe(401);
  });

  it("accepts requests with the cron secret and runs a worker tick", async () => {
    vi.resetModules();
    const tick = vi.fn(async () => {});
    vi.doMock("@/lib/workers/generation-worker", () => ({ workerTick: tick }));
    process.env = { ...BASE_ENV, CRON_SECRET: "cron-secret-test-123" };
    const route = await import("@/app/api/cron/process/route");
    const res = await route.GET(
      new Request("http://localhost/api/cron/process", {
        headers: { authorization: "Bearer cron-secret-test-123" },
      }),
    );
    expect(res.status).toBe(200);
    expect(tick).toHaveBeenCalledOnce();
  });
});
