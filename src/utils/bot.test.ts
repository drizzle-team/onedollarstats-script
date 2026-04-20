import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

// We need to set up a DOM environment before importing bot.ts
// since it accesses navigator, window, etc. at call time.

describe("Bot Detection Tests", () => {
  let originalWindow: typeof globalThis;
  let dom: JSDOM;

  const setupDOM = (options: {
    userAgent?: string;
    webdriver?: boolean;
    chrome?: unknown;
    automationGlobals?: Record<string, unknown>;
    languages?: string[];
    plugins?: unknown[];
  } = {}) => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "https://example.com",
      pretendToBeVisual: true,
    });

    const win = dom.window as any;

    // Set up navigator
    Object.defineProperty(win.navigator, "userAgent", {
      value: options.userAgent ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });

    Object.defineProperty(win.navigator, "webdriver", {
      value: options.webdriver ?? false,
      configurable: true,
    });

    Object.defineProperty(win.navigator, "languages", {
      value: options.languages ?? ["en-US", "en"],
      configurable: true,
    });

    Object.defineProperty(win.navigator, "plugins", {
      value: options.plugins ?? [1, 2, 3], // Non-empty = not headless
      configurable: true,
    });

    if (options.chrome !== undefined) {
      win.chrome = options.chrome;
    } else {
      win.chrome = { runtime: {} };
    }

    // Set automation globals
    if (options.automationGlobals) {
      for (const [key, val] of Object.entries(options.automationGlobals)) {
        win[key] = val;
      }
    }

    // Patch globals
    vi.stubGlobal("window", win);
    vi.stubGlobal("navigator", win.navigator);
    vi.stubGlobal("document", win.document);
    vi.stubGlobal("Notification", { permission: "default" });
    vi.stubGlobal("Navigator", win.Navigator ?? class {});
    vi.stubGlobal("HTMLCanvasElement", win.HTMLCanvasElement ?? class { prototype: any });
    vi.stubGlobal("CanvasRenderingContext2D", win.CanvasRenderingContext2D ?? class { prototype: any });
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("User Agent detection", () => {
    test("normal browser user agent is not flagged by UA check", async () => {
      setupDOM();
      const { detectBot } = await import("./bot");
      const result = detectBot();
      // In JSDOM, lie detection fires because Navigator.prototype properties
      // are not native, so isBot may be true. We verify the UA-specific signal:
      expect(result.signals.userAgentBot).toBe(false);
      expect(result.signals.webdriver).toBe(false);
      expect(result.signals.automationGlobals).toEqual([]);
    });

    test("Googlebot UA is detected", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("Bingbot UA is detected", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
    });

    test("Facebook crawler UA is detected", async () => {
      setupDOM({ userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("Twitterbot UA is detected", async () => {
      setupDOM({ userAgent: "Twitterbot/1.0" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
    });

    test("curl UA is detected", async () => {
      setupDOM({ userAgent: "curl/7.68.0" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("python-requests UA is detected", async () => {
      setupDOM({ userAgent: "python-requests/2.28.0" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
    });

    test("HeadlessChrome is detected as headless", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("GPTBot UA is detected", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("ClaudeBot UA is detected", async () => {
      setupDOM({ userAgent: "ClaudeBot/1.0" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
    });

    test("generic bot pattern detected", async () => {
      setupDOM({ userAgent: "My Custom Spider/1.0" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("unknown_bot");
    });

    test("empty user agent is detected as bot", async () => {
      setupDOM({ userAgent: "" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.signals.userAgentBot).toBe(true);
    });
  });

  describe("WebDriver detection", () => {
    test("webdriver = true is detected", async () => {
      setupDOM({ webdriver: true });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("automation");
      expect(result.signals.webdriver).toBe(true);
    });

    test("webdriver = false is not detected", async () => {
      setupDOM({ webdriver: false });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.webdriver).toBe(false);
    });
  });

  describe("Automation globals detection", () => {
    test("Selenium globals detected", async () => {
      setupDOM({ automationGlobals: { __selenium_unwrapped: true } });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.botKind).toBe("automation");
      expect(result.signals.automationGlobals).toContain("__selenium_unwrapped");
    });

    test("Puppeteer globals detected", async () => {
      setupDOM({ automationGlobals: { __puppeteer_evaluation_script__: true } });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.signals.automationGlobals).toContain("__puppeteer_evaluation_script__");
    });

    test("Playwright globals detected", async () => {
      setupDOM({ automationGlobals: { __playwright: true } });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.signals.automationGlobals).toContain("__playwright");
    });

    test("multiple automation globals detected", async () => {
      setupDOM({ automationGlobals: { __nightmare: true, __testcafe: true } });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(true);
      expect(result.signals.automationGlobals.length).toBeGreaterThanOrEqual(2);
    });

    test("no automation globals present", async () => {
      setupDOM();
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.automationGlobals).toEqual([]);
    });
  });

  describe("Headless detection", () => {
    test("Chrome without chrome runtime is headless", async () => {
      setupDOM({ chrome: undefined });
      // Need to delete window.chrome since setupDOM sets it
      delete (window as any).chrome;
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.headless).toBe(true);
    });
  });

  describe("Signal aggregation", () => {
    test("signals object contains all expected fields", async () => {
      setupDOM();
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals).toHaveProperty("userAgentBot");
      expect(result.signals).toHaveProperty("webdriver");
      expect(result.signals).toHaveProperty("headless");
      expect(result.signals).toHaveProperty("automationGlobals");
      expect(result.signals).toHaveProperty("liesDetected");
      expect(result.signals).toHaveProperty("hasProxy");
      expect(result.signals).toHaveProperty("missingLanguages");
      expect(result.signals).toHaveProperty("missingPlugins");
    });

    test("missing languages detected", async () => {
      setupDOM({ languages: [] });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.missingLanguages).toBe(true);
    });

    test("present languages not flagged", async () => {
      setupDOM({ languages: ["en-US"] });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.missingLanguages).toBe(false);
    });

    test("missing plugins detected on desktop", async () => {
      setupDOM({ plugins: [] });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.missingPlugins).toBe(true);
    });

    test("missing plugins not flagged on mobile", async () => {
      setupDOM({
        userAgent: "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        plugins: []
      });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.signals.missingPlugins).toBe(false);
    });
  });

  describe("BotKind classification", () => {
    test("human when no bot-specific signals fire", async () => {
      setupDOM();
      const { detectBot } = await import("./bot");
      const result = detectBot();
      // In JSDOM, lie detection triggers because Navigator.prototype getters
      // are not native. We verify no bot-specific signals are present:
      expect(result.signals.userAgentBot).toBe(false);
      expect(result.signals.webdriver).toBe(false);
      expect(result.signals.automationGlobals).toEqual([]);
      expect(result.signals.missingLanguages).toBe(false);
      expect(result.signals.missingPlugins).toBe(false);
    });

    test("unknown_bot for UA-only matches (search bot)", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.botKind).toBe("unknown_bot");
    });

    test("unknown_bot for UA-only matches (social bot)", async () => {
      setupDOM({ userAgent: "LinkedInBot/1.0 (compatible; Mozilla/5.0)" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.botKind).toBe("unknown_bot");
    });

    test("automation for webdriver without UA match", async () => {
      setupDOM({ webdriver: true });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.botKind).toBe("automation");
    });
  });
});
