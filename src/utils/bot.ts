/**
 * Bot & crawler detection module.
 *
 * Detects:
 * - Crawlers and services that run JS: search, social, AI, page speed, prerender
 * - Headless browsers (Puppeteer, Playwright, Selenium, PhantomJS)
 * - General automation tools via navigator.webdriver and injected globals
 *
 * A wrong match silently drops a real visitor, so only signals humans can't trip
 * belong here. Patched browser APIs are not one: privacy extensions do that.
 */

import { getEnvironment } from "./environment";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BotKind =
  | "headless" // Headless Chrome/Firefox, PhantomJS
  | "automation" // Selenium, Puppeteer, Playwright (non-headless)
  | "unknown_bot" // Signals say bot, but can't classify further
  | "human"; // No bot signals detected

export interface BotSignals {
  /** navigator.userAgent matched a known bot pattern. */
  userAgentBot: boolean;
  /** navigator.webdriver is true. */
  webdriver: boolean;
  /** Headless browser indicators detected. */
  headless: boolean;
  /** Automation globals found on window. */
  automationGlobals: string[];
}

export interface BotDetectionResult {
  /** True when any bot signal fires. */
  isBot: boolean;
  /** Classified category of the detected bot. */
  botKind: BotKind;
  /** Individual signal results for debugging / logging. */
  signals: BotSignals;
}

// ---------------------------------------------------------------------------
// Known bot UA patterns
// ---------------------------------------------------------------------------

// Single alternation. The generic tokens (bot, crawl, spider, slurp, fetch,
// archiver) subsume most named crawlers; only names that don't contain one of
// those tokens are listed explicitly. Clients that can't run JS (curl, Scrapy,
// python-requests, ...) never load this script, so they aren't listed.
//
// "bot" must end a word and not follow "u": the CUBOT phone brand and app names
// like "botanica/1.0.0" are real visitors. Don't use a lookbehind here: Safari
// before 16.4 can't parse it, which would break the whole script.
const BOT_UA_PATTERN =
  /Google-InspectionTool|Google-Read-Aloud|Google-PageRenderer|GoogleOther|Mediapartners-Google|BingPreview|Yeti\/|ChatGPT-User|Claude-User|Perplexity-User|MistralAI-User|anthropic-ai|cohere-ai|facebookexternalhit|vkShare|Embedly|^WhatsApp\/|Chrome-Lighthouse|GTmetrix|PTST\/|StatusCake|Site24x7|DatadogSynthetics|Checkly|Siteimprove|Prerender|Rendertron|HeadlessChrome|PhantomJS|Selenium|Puppeteer|Cypress\/|jsdom\/|(?:^|[^u])bot(?![a-z])|crawl|spider|slurp|fetch|archiver/i;

// ---------------------------------------------------------------------------
// Automation globals injected by common frameworks
// ---------------------------------------------------------------------------

// Don't add plain "phantom": the Phantom crypto wallet extension injects window.phantom
const AUTOMATION_GLOBALS = [
  // Selenium
  "__selenium_unwrapped",
  "__selenium_evaluate",
  "__webdriver_evaluate",
  "__webdriver_script_fn",
  "__webdriver_script_func",
  "__webdriver_script_function",
  "__fxdriver_evaluate",
  "__fxdriver_unwrapped",
  "_Selenium_IDE_Recorder",
  // Puppeteer / CDP
  "__puppeteer_evaluation_script__",
  // PhantomJS
  "callPhantom",
  "_phantom",
  // Nightmare.js
  "__nightmare",
  // Playwright (injects page.exposeFunction bindings)
  "__playwright",
  "__pw_manual",
  // CasperJS
  "__casper",
  // TestCafe
  "__testcafe",
  // Cypress
  "Cypress",
  // Chrome automation
  "domAutomation",
  "domAutomationController",
] as const;

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the current browser context is a bot or crawler.
 * Synchronous and lightweight — no async APIs needed.
 */
export function detectBot(): BotDetectionResult {
  const signals = collectBotSignals();
  const { isDesktop } = getEnvironment();

  // Desktop webviews: the app name is in the UA (e.g. "mybot/1.0.0") and headless heuristics don't apply
  if (isDesktop) signals.userAgentBot = signals.headless = false;

  const isBot = signals.userAgentBot || signals.webdriver || signals.headless || signals.automationGlobals.length > 0;

  let botKind: BotKind = "human";
  if (isBot) {
    if (signals.headless) {
      botKind = "headless";
    } else if (signals.webdriver || signals.automationGlobals.length > 0) {
      botKind = "automation";
    } else {
      botKind = "unknown_bot";
    }
  }

  return { isBot, botKind, signals };
}

export function shouldBlock(devmode: boolean): boolean {
  if (getEnvironment().isLocalhost && !devmode) return true;

  const { isBot, botKind, signals } = detectBot();
  if (isBot && devmode) console.log(`[onedollarstats]\nEvent blocked as bot (${botKind}): ${JSON.stringify(signals)}`);
  return isBot;
}

// ---------------------------------------------------------------------------
// Signal collectors
// ---------------------------------------------------------------------------

function collectBotSignals(): BotSignals {
  return {
    userAgentBot: detectUserAgentBot(),
    webdriver: detectWebdriver(),
    headless: detectHeadless(),
    automationGlobals: detectAutomationGlobals(),
  };
}

/** Check UA string against known bot patterns. */
function detectUserAgentBot(): boolean {
  const ua = navigator.userAgent || "";
  if (!ua) return true;
  return BOT_UA_PATTERN.test(ua);
}

/** navigator.webdriver is set by WebDriver-based automation. */
function detectWebdriver(): boolean {
  return !!(navigator as any).webdriver;
}

/**
 * Headless browser indicators. Browser feature heuristics don't work here, real users trip them:
 * - no window.chrome: Android WebViews, which is what in-app browsers run on
 * - denied notifications with no plugins: Chrome set to download PDFs, on any http site
 */
function detectHeadless(): boolean {
  return /HeadlessChrome/.test(navigator.userAgent);
}

/** Detect automation framework globals on window. */
function detectAutomationGlobals(): string[] {
  const w = window as any;
  return AUTOMATION_GLOBALS.filter((key) => {
    try {
      // Own properties only: elements with a matching id are exposed through window's prototype chain
      return Object.prototype.hasOwnProperty.call(w, key) && w[key] !== undefined;
    } catch {
      return false;
    }
  }) as string[];
}
