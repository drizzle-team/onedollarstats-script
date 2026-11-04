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

    describe("isDesktop", () => {
      const ELECTRON_UA = "Mozilla/5.0 AppleWebKit/537.36 MyApp/1.2.0 Chrome/128 Electron/32.0.0 Safari/537.36";

      test.each([
        { expected: true, url: "file:///app/index.html", ua: ELECTRON_UA },
        { expected: true, url: "tauri://localhost/" },
        { expected: true, url: "http://tauri.localhost/" },
        { expected: true, url: "http://localhost:1420/", globals: { __TAURI_INTERNALS__: { invoke: () => {} } } },
        { expected: true, url: "http://localhost:1420/", globals: { __TAURI_IPC__: () => {} } },
        { expected: true, url: "wails://wails/" },
        { expected: true, url: "http://wails.localhost/" },
        { expected: true, url: "http://localhost:5678/", globals: { NL_VERSION: "6.0.0" } },
        { expected: true, url: "chrome-extension://app/index.html", globals: { nw: { App: {} } } },
        { expected: false, url: "https://example.com/" },
        { expected: false, url: "http://localhost:3000/" }
      ])("$url → $expected", async ({ expected, url, ua = "Mozilla/5.0 Chrome/128 Safari/537.36", globals = {} }) => {
        const { hostname, protocol } = new URL(url);
        vi.stubGlobal("location", { hostname, protocol });
        vi.stubGlobal("window", { navigator: { webdriver: false }, ...globals });
        vi.stubGlobal("navigator", { webdriver: false, userAgent: ua });
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isDesktop).toBe(expected);
      });

      test("elements with runtime-like ids on a website are not detected as desktop", async () => {
        const dom = new JSDOM('<!DOCTYPE html><html><body><div id="nw"></div><div id="NL_VERSION"></div><div id="__TAURI_INTERNALS__"></div><div id="__TAURI_IPC__"></div></body></html>', { url: "https://example.com/" });
        vi.stubGlobal("window", dom.window);
        vi.stubGlobal("navigator", dom.window.navigator);
        vi.stubGlobal("location", dom.window.location);
        expect(typeof (dom.window as any).nw).toBe("object"); // named access really exposes the element
        const { getEnvironment } = await import("./environment");
        expect(getEnvironment().isDesktop).toBe(false);
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
