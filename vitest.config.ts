import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "Unit Tests",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "Script E2E Tests",
          environment: "node",
          globalSetup: "./test/setup.ts",
          include: ["test/script.test.ts"],
        },
      },
      {
        test: {
          name: "Package E2E Tests",
          environment: "node",
          globalSetup: "./test/setup.ts",
          include: ["test/package.test.ts"],
        },
      },
      {
        test: {
          name: "Expo E2E Tests",
          environment: "node",
          globalSetup: "./test/setup.ts",
          include: ["test/expo.test.ts"],
        },
      },
      {
        test: {
          name: "Expo Unit Tests",
          environment: "jsdom",
          include: ["src/expo.test.tsx"],
        },
      },
    ],
  },
});
