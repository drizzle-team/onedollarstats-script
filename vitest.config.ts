import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "Web Unit Tests",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "Web E2E Tests",
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
      // TODO: add "Desktop E2E Tests" for test/desktop
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
