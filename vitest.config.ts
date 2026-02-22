import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/pipeline/**"],
    environmentMatchGlobs: [
      ["tests/renderer/**", "jsdom"],
    ],
    setupFiles: [
      "tests/helpers/mock-native-addons.ts",
      "tests/renderer/helpers/env-setup.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/types/**", "**/*.d.ts"],
      thresholds: {
        lines: 10,
        branches: 9,
      },
    },
  },
});
