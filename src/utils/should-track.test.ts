import { describe, expect, test } from "vitest";
import { shouldTrackPath } from "./should-track";
import type { InternalAnalyticsConfig } from "../types";

const makeConfig = (overrides: Partial<InternalAnalyticsConfig> = {}): InternalAnalyticsConfig => ({
  hostname: null,
  devmode: false,
  collectorUrl: "https://collector.onedollarstats.com/events",
  hashRouting: false,
  autocollect: true,
  excludePages: [],
  includePages: [],
  ...overrides,
});

describe("shouldTrackPath Tests", () => {
  describe("with no rules", () => {
    test("allows any path when no rules defined", () => {
      const config = makeConfig();
      expect(shouldTrackPath("/", config)).toBe(true);
      expect(shouldTrackPath("/about", config)).toBe(true);
      expect(shouldTrackPath("/blog/post-1", config)).toBe(true);
    });
  });

  describe("excludePages", () => {
    test("exact match excludes page", () => {
      const config = makeConfig({ excludePages: ["/admin"] });
      expect(shouldTrackPath("/admin", config)).toBe(false);
      expect(shouldTrackPath("/about", config)).toBe(true);
    });

    test("wildcard pattern excludes matching pages", () => {
      const config = makeConfig({ excludePages: ["/admin/*"] });
      expect(shouldTrackPath("/admin/dashboard", config)).toBe(false);
      expect(shouldTrackPath("/admin/users", config)).toBe(false);
      expect(shouldTrackPath("/admin", config)).toBe(true); // exact /admin doesn't match /admin/*
      expect(shouldTrackPath("/about", config)).toBe(true);
    });

    test("wildcard at start matches any prefix", () => {
      const config = makeConfig({ excludePages: ["*/settings"] });
      expect(shouldTrackPath("/user/settings", config)).toBe(false);
      expect(shouldTrackPath("/admin/settings", config)).toBe(false);
      expect(shouldTrackPath("/settings", config)).toBe(false); // * matches empty string too
    });

    test("multiple exclude patterns", () => {
      const config = makeConfig({ excludePages: ["/admin/*", "/private/*"] });
      expect(shouldTrackPath("/admin/users", config)).toBe(false);
      expect(shouldTrackPath("/private/data", config)).toBe(false);
      expect(shouldTrackPath("/public", config)).toBe(true);
    });

    test("double wildcard matches any depth", () => {
      const config = makeConfig({ excludePages: ["/api/**"] });
      expect(shouldTrackPath("/api/v1/users", config)).toBe(false);
      expect(shouldTrackPath("/api/", config)).toBe(false);
    });
  });

  describe("includePages", () => {
    test("only allows matching pages when includePages defined", () => {
      const config = makeConfig({ includePages: ["/blog/*"] });
      expect(shouldTrackPath("/blog/post-1", config)).toBe(true);
      expect(shouldTrackPath("/blog/post-2", config)).toBe(true);
      expect(shouldTrackPath("/about", config)).toBe(false);
    });

    test("exact match in includePages", () => {
      const config = makeConfig({ includePages: ["/"] });
      expect(shouldTrackPath("/", config)).toBe(true);
      expect(shouldTrackPath("/about", config)).toBe(false);
    });

    test("multiple include patterns", () => {
      const config = makeConfig({ includePages: ["/blog/*", "/docs/*"] });
      expect(shouldTrackPath("/blog/post", config)).toBe(true);
      expect(shouldTrackPath("/docs/guide", config)).toBe(true);
      expect(shouldTrackPath("/about", config)).toBe(false);
    });

    test("empty includePages allows all", () => {
      const config = makeConfig({ includePages: [] });
      expect(shouldTrackPath("/anything", config)).toBe(true);
    });
  });

  describe("excludePages and includePages combined", () => {
    test("excludePages takes priority over includePages", () => {
      const config = makeConfig({
        includePages: ["/blog/*"],
        excludePages: ["/blog/draft-*"],
      });
      expect(shouldTrackPath("/blog/post-1", config)).toBe(true);
      expect(shouldTrackPath("/blog/draft-1", config)).toBe(false);
    });

    test("page must match include AND not match exclude", () => {
      const config = makeConfig({
        includePages: ["/app/*"],
        excludePages: ["/app/admin"],
      });
      expect(shouldTrackPath("/app/dashboard", config)).toBe(true);
      expect(shouldTrackPath("/app/admin", config)).toBe(false);
      expect(shouldTrackPath("/about", config)).toBe(false);
    });
  });

  describe("special characters in patterns", () => {
    test("dots in path are escaped (not regex wildcard)", () => {
      const config = makeConfig({ includePages: ["/file.html"] });
      expect(shouldTrackPath("/file.html", config)).toBe(true);
      expect(shouldTrackPath("/fileXhtml", config)).toBe(false);
    });

    test("paths with query-like characters", () => {
      const config = makeConfig({ excludePages: ["/search"] });
      expect(shouldTrackPath("/search", config)).toBe(false);
    });
  });
});
