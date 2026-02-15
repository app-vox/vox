import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["tests/renderer/**", "jsdom"],
    ],
    setupFiles: ["tests/renderer/helpers/env-setup.ts"],
  },
});
