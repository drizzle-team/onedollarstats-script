import { describe, expect, test, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

// We need to set up a DOM environment before importing bot.ts
// since it accesses navigator, window, etc. at call time.

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ANDROID_WEBVIEW_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";

const HUMAN_USER_AGENTS: Array<[string, string]> = [
  ["Chrome desktop", CHROME_UA],
  ["Chrome Android", "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"],
  ["Safari iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"],
  ["Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"],
  ["Edge", `${CHROME_UA} Edg/120.0.0.0`],
  ["Samsung Internet", "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36"],
  ["Android WebView", ANDROID_WEBVIEW_UA],
  ["Instagram in-app", `${ANDROID_WEBVIEW_UA} Instagram 300.0.0.0 Android`],
  ["Facebook in-app", `${ANDROID_WEBVIEW_UA} [FB_IAB/FB4A;FBAV/440.0.0.0;]`],
  ["WhatsApp in-app", `${ANDROID_WEBVIEW_UA} WhatsApp/2.23.20.0`],
  ["Snapchat in-app iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.50.0.33 (like Safari/604.1)"],
  ["Snapchat in-app Android", `${ANDROID_WEBVIEW_UA} Snapchat/12.50.0.33 (SM-S911B; Android 14)`],
  ["Sogou browser", "Mozilla/5.0 (Linux; Android 10; V1962A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 Mobile Safari/537.36 SogouMSE,SogouMobileBrowser/5.32.1"],
  ["Cubot phone, underscore", "Mozilla/5.0 (Linux; Android 11; CUBOT_X50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"],
  ["Cubot phone, space", "Mozilla/5.0 (Linux; Android 11; CUBOT X50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"],
  ["app name starting with bot", "Mozilla/5.0 Chrome/120.0.0.0 botanica/1.0.0 Safari/537.36"],
];

const BOT_USER_AGENTS: Array<[string, string]> = [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["Googlebot smartphone", "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["AdsBot-Google", "AdsBot-Google (+http://www.google.com/adsbot.html)"],
  ["GoogleOther", "Mozilla/5.0 (compatible; GoogleOther)"],
  ["Google-InspectionTool", "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)"],
  ["Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
  ["YandexBot", "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)"],
  ["Baiduspider", "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"],
  ["Sogou spider", "Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)"],
  ["Naver Yeti", "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)"],
  ["Facebook crawler", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
  ["Twitterbot", "Twitterbot/1.0"],
  ["LinkedInBot", "LinkedInBot/1.0 (compatible; Mozilla/5.0)"],
  ["Slackbot", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"],
  ["Discordbot", "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"],
  ["WhatsApp crawler", "WhatsApp/2.23.20.0 A"],
  ["Snapchat crawler", "Mozilla/5.0 (Macintosh) Snap URL Preview Service; bot; snapchat; https://developers.snap.com/robots"],
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot"],
  ["ClaudeBot", "ClaudeBot/1.0"],
  ["MJ12bot", "Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)"],
  ["UptimeRobot", "Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)"],
  ["Pingdom", "Mozilla/5.0 (compatible; Pingdom.com_bot_version_1.4_(http://www.pingdom.com/))"],
  ["Lighthouse", `${CHROME_UA} Chrome-Lighthouse`],
  ["GTmetrix", `${CHROME_UA} GTmetrix`],
  ["Prerender", `${CHROME_UA} Prerender (+https://github.com/prerender/prerender)`],
  ["Rendertron", `${CHROME_UA} Rendertron`],
  ["Google-Read-Aloud", `${ANDROID_WEBVIEW_UA} (compatible; Google-Read-Aloud)`],
  ["Google-PageRenderer", `${CHROME_UA} (compatible; Google-PageRenderer)`],
  ["BingPreview", `${CHROME_UA} BingPreview/1.0b`],
  ["Claude-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0)"],
  ["Perplexity-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0)"],
  ["MistralAI-User", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; MistralAI-User/1.0"],
  ["cohere-ai", "cohere-ai"],
  ["vkShare", "Mozilla/5.0 (compatible; vkShare; +http://vk.com/dev/Share)"],
  ["Embedly", "Mozilla/5.0 (compatible; Embedly/0.2; +http://support.embed.ly/)"],
  ["WebPageTest", `${CHROME_UA} PTST/250101.000000`],
  ["StatusCake", `${CHROME_UA} StatusCake`],
  ["Site24x7", `${CHROME_UA} Site24x7`],
  ["DatadogSynthetics", `${CHROME_UA} DatadogSynthetics`],
  ["Checkly", `${CHROME_UA} Checkly/1.0 (https://www.checklyhq.com)`],
  ["Siteimprove", `${CHROME_UA} Siteimprove.com`],
  ["Cypress", `${CHROME_UA} Cypress/13.0.0`],
  ["jsdom", "Mozilla/5.0 (darwin) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0"],
  ["generic spider", "My Custom Spider/1.0"],
];

describe("Bot Detection Tests", () => {
  const setupDOM = (options: {
    userAgent?: string;
    webdriver?: boolean;
    chrome?: unknown;
    automationGlobals?: Record<string, unknown>;
    plugins?: unknown[];
    notification?: NotificationPermission;
    url?: string;
  } = {}) => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: options.url ?? "https://example.com",
      pretendToBeVisual: true,
    });

    const win = dom.window as any;

    // Set up navigator
    Object.defineProperty(win.navigator, "userAgent", { value: options.userAgent ?? CHROME_UA, configurable: true });
    Object.defineProperty(win.navigator, "webdriver", { value: options.webdriver ?? false, configurable: true });
    Object.defineProperty(win.navigator, "plugins", { value: options.plugins ?? [1, 2, 3], configurable: true });

    win.chrome = "chrome" in options ? options.chrome : { runtime: {} };

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
    vi.stubGlobal("location", win.location);
    vi.stubGlobal("Notification", { permission: options.notification ?? "default" });
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("User Agent detection", () => {
    test.each(HUMAN_USER_AGENTS)("%s is human", async (_name, userAgent) => {
      setupDOM({ userAgent });
      const { detectBot } = await import("./bot");
      expect(detectBot()).toMatchObject({ isBot: false, botKind: "human" });
    });

    test.each(BOT_USER_AGENTS)("%s is a bot", async (_name, userAgent) => {
      setupDOM({ userAgent });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result).toMatchObject({ isBot: true, botKind: "unknown_bot" });
      expect(result.signals.userAgentBot).toBe(true);
    });

    test("HeadlessChrome is detected as headless", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36" });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result).toMatchObject({ isBot: true, botKind: "headless" });
      expect(result.signals.userAgentBot).toBe(true);
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
      expect(result).toMatchObject({ isBot: true, botKind: "automation" });
      expect(result.signals.webdriver).toBe(true);
    });

    test("webdriver = false is not detected", async () => {
      setupDOM({ webdriver: false });
      const { detectBot } = await import("./bot");
      const result = detectBot();
      expect(result.isBot).toBe(false);
      expect(result.signals.webdriver).toBe(false);
    });
  });

  describe("Automation globals detection", () => {
    test.each(["__selenium_unwrapped", "__puppeteer_evaluation_script__", "__playwright", "_phantom", "callPhantom", "__nightmare", "Cypress"])(
      "%s is detected",
      async (name) => {
        setupDOM({ automationGlobals: { [name]: {} } });
        const { detectBot } = await import("./bot");
        const result = detectBot();
        expect(result).toMatchObject({ isBot: true, botKind: "automation" });
        expect(result.signals.automationGlobals).toEqual([name]);
      }
    );

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
      expect(detectBot().signals.automationGlobals).toEqual([]);
    });

    test("Phantom wallet extension is not automation", async () => {
      setupDOM({ automationGlobals: { phantom: { solana: { isPhantom: true }, ethereum: { isPhantom: true } } } });
      const { detectBot } = await import("./bot");
      expect(detectBot().isBot).toBe(false);
    });

    // Elements with a matching id are covered by the real-browser test in test/script.test.ts:
    // jsdom exposes them as own properties of window, browsers through its prototype chain
  });

  describe("Headless detection", () => {
    test.each([[undefined], [null]])("window.chrome = %s is not a headless signal", async (chrome) => {
      setupDOM({ userAgent: ANDROID_WEBVIEW_UA, chrome });
      const { detectBot } = await import("./bot");
      expect(detectBot()).toMatchObject({ isBot: false, botKind: "human" });
    });

    // Real Chrome set to download PDFs: on http sites notifications are denied without the user blocking them
    test("denied notifications without plugins is not a headless signal", async () => {
      setupDOM({ notification: "denied", plugins: [] });
      const { detectBot } = await import("./bot");
      expect(detectBot()).toMatchObject({ isBot: false, botKind: "human" });
    });
  });

  describe("Patched browser APIs", () => {
    // Same wrapper as DuckDuckGo Privacy Essentials uses for canvas fingerprinting protection
    const wrapLikeDuckDuckGo = (target: any, property: string) => {
      target[property] = new Proxy(target[property], {
        get(fn, prop, receiver) {
          if (prop !== "toString") return Reflect.get(fn, prop, receiver);
          const method = Reflect.get(fn, prop, receiver).bind(fn);
          Object.defineProperty(method, "toString", { value: String.toString.bind(String.toString) });
          return method;
        },
      });
    };

    test("privacy extension wrappers are not a bot signal", async () => {
      setupDOM();
      wrapLikeDuckDuckGo((window as any).HTMLCanvasElement.prototype, "toDataURL");
      wrapLikeDuckDuckGo((window as any).Date.prototype, "getTimezoneOffset");
      const { detectBot } = await import("./bot");
      expect(detectBot()).toMatchObject({ isBot: false, botKind: "human" });
    });
  });

  describe("shouldBlock", () => {
    test("a human on a website is not blocked", async () => {
      setupDOM();
      const { shouldBlock } = await import("./bot");
      expect(shouldBlock(false)).toBe(false);
    });

    test("a bot on a website is blocked", async () => {
      setupDOM({ webdriver: true });
      const { shouldBlock } = await import("./bot");
      expect(shouldBlock(false)).toBe(true);
    });

    test("Cypress is blocked", async () => {
      setupDOM({ automationGlobals: { Cypress: { version: "13.0.0" } } });
      const { shouldBlock } = await import("./bot");
      expect(shouldBlock(false)).toBe(true);
    });

    test("localhost is blocked unless devmode is on", async () => {
      setupDOM({ url: "http://localhost:3000" });
      const { shouldBlock } = await import("./bot");
      expect(shouldBlock(false)).toBe(true);
      expect(shouldBlock(true)).toBe(false);
    });

    test("devmode doesn't let bots through", async () => {
      setupDOM({ url: "http://localhost:3000", webdriver: true });
      const { shouldBlock } = await import("./bot");
      expect(shouldBlock(true)).toBe(true);
    });

    test("logs why a bot was blocked in devmode", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      setupDOM({ url: "http://localhost:3000", webdriver: true });
      const { shouldBlock } = await import("./bot");
      shouldBlock(true);
      expect(log).toHaveBeenCalledOnce();
      expect(log.mock.calls[0][0]).toContain("Event blocked as bot (automation)");
      expect(log.mock.calls[0][0]).toContain('"webdriver":true');
    });

    test("stays quiet outside devmode", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      setupDOM({ webdriver: true });
      const { shouldBlock } = await import("./bot");
      shouldBlock(false);
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe("Desktop apps", () => {
    // Real Electron 45 UA; the app name ("mybot") would match the bot pattern on a website
    const ELECTRON_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) mybot/1.0.0 Chrome/156.0.8078.80 Electron/45.2.2 Safari/537.36";

    test("app name in the UA is not a bot signal", async () => {
      setupDOM({ userAgent: ELECTRON_UA });
      const { detectBot } = await import("./bot");
      expect(detectBot().signals.userAgentBot).toBe(false);
    });

    test("headless heuristics are skipped", async () => {
      setupDOM({ userAgent: ELECTRON_UA.replace("Chrome/", "HeadlessChrome/") });
      const { detectBot } = await import("./bot");
      expect(detectBot().signals.headless).toBe(false);
    });

    test("automation is still detected", async () => {
      setupDOM({ userAgent: ELECTRON_UA, webdriver: true });
      const { detectBot } = await import("./bot");
      expect(detectBot()).toMatchObject({ isBot: true, botKind: "automation" });
    });

    test("same UA token on a website is still a bot signal", async () => {
      setupDOM({ userAgent: "Mozilla/5.0 Chrome/120.0.0.0 mybot/1.0.0 Safari/537.36" });
      const { detectBot } = await import("./bot");
      expect(detectBot().signals.userAgentBot).toBe(true);
    });
  });
});
