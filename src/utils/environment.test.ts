import { describe, expect, test, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

describe("Environment Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setupLocation = (hostname: string, protocol: string = "http:") => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: `${protocol}//${hostname || "localhost"}`,
    });
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("location", dom.window.location);
  };

  describe("getEnvironment", () => {
    describe("isLocalhost", () => {
      test("localhost is detected", async () => {
        setupLocation("localhost", "http:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(true);
      });

      test("127.0.0.1 is detected", async () => {
        setupLocation("127.0.0.1", "http:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(true);
      });

      test("127.0.0.2 is detected", async () => {
        setupLocation("127.0.0.2", "http:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(true);
      });

      test("[::1] is detected as localhost", async () => {
        // JSDOM doesn't handle IPv6 URLs well, so we mock location directly
        vi.stubGlobal("location", { hostname: "[::1]", protocol: "http:" });
        vi.stubGlobal("window", { navigator: { webdriver: false } });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(true);
      });

      test("example.com is not localhost", async () => {
        setupLocation("example.com", "https:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(false);
      });

      test("www.google.com is not localhost", async () => {
        setupLocation("www.google.com", "https:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(false);
      });

      test("file: protocol is localhost", async () => {
        vi.stubGlobal("location", { hostname: "", protocol: "file:" });
        vi.stubGlobal("window", { navigator: { webdriver: false } });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(true);
      });

      test("tauri: protocol with localhost hostname is not localhost", async () => {
        vi.stubGlobal("location", { hostname: "localhost", protocol: "tauri:" });
        vi.stubGlobal("window", { navigator: { webdriver: false } });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isLocalhost).toBe(false);
      });
    });

    describe("isHeadlessBrowser", () => {
      test("normal browser is not headless", async () => {
        setupLocation("example.com", "https:");
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isHeadlessBrowser).toBe(false);
      });

      test("webdriver = true is headless", async () => {
        vi.stubGlobal("location", { hostname: "example.com", protocol: "https:" });
        vi.stubGlobal("window", {
          navigator: { webdriver: true },
          _phantom: undefined,
          __nightmare: undefined,
          Cypress: undefined,
        });
        vi.stubGlobal("navigator", { webdriver: true });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isHeadlessBrowser).toBe(true);
      });

      test("Cypress detected", async () => {
        vi.stubGlobal("location", { hostname: "example.com", protocol: "https:" });
        vi.stubGlobal("window", {
          navigator: { webdriver: false },
          Cypress: { version: "12.0" },
        });
        vi.stubGlobal("navigator", { webdriver: false });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isHeadlessBrowser).toBe(true);
      });
    });
  });

  describe("isClient", () => {
    test("returns true in browser-like environment", async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "https://example.com",
      });
      vi.stubGlobal("window", dom.window);
      vi.stubGlobal("document", dom.window.document);
      // Override navigator UA to not be jsdom
      const navMock = { ...dom.window.navigator, userAgent: "Mozilla/5.0 Chrome/120" };
      vi.stubGlobal("navigator", navMock);
      const { isClient } = await import("./environment");
      expect(isClient()).toBe(true);
    });

    test("returns false when window is undefined", async () => {
      vi.stubGlobal("window", undefined);
      const { isClient } = await import("./environment");
      expect(isClient()).toBe(false);
    });

    test("returns false for jsdom user agent", async () => {
      const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "https://example.com",
      });
      vi.stubGlobal("window", dom.window);
      vi.stubGlobal("document", dom.window.document);
      vi.stubGlobal("navigator", dom.window.navigator);
      const { isClient } = await import("./environment");
      // jsdom UA contains "jsdom" so it should return false
      expect(isClient()).toBe(false);
    });

    test("returns false for node user agent", async () => {
      vi.stubGlobal("window", {});
      vi.stubGlobal("document", {});
      vi.stubGlobal("navigator", { userAgent: "node.js/18.0.0" });
      const { isClient } = await import("./environment");
      expect(isClient()).toBe(false);
    });
  });
});
