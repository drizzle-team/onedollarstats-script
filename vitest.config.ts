import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          name: "Unit Tests",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "Integration Tests",
          globalSetup: "./test/setup.ts",
          include: ["test/**/*.test.ts"],
        },
      },
    ],
  },
});
