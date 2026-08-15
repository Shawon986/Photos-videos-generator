import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname) },
      // next-auth/api-helpers import next/server; unit tests get a stub.
      { find: "next/server", replacement: path.resolve(__dirname, "tests/mocks/next-server.ts") },
      { find: "next/headers", replacement: path.resolve(__dirname, "tests/mocks/next-headers.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: "file:./dev.db",
      AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      DEMO_MODE: "true",
      STORAGE_PROVIDER: "local",
      UPLOAD_DIR: "./uploads",
      IMAGE_GENERATIONS_PER_HOUR: "10",
      VIDEO_GENERATIONS_PER_HOUR: "3",
      JOB_MAX_ATTEMPTS: "2",
    },
  },
});
