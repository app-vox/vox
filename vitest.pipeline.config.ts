import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/pipeline/**/*.test.ts"],
    testTimeout: 60_000,
    maxConcurrency: 2,
    fileParallelism: false,
    setupFiles: [
      "tests/helpers/mock-native-addons.ts",
      "tests/pipeline/helpers/mock-electron.ts",
    ],
  },
});
