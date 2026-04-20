/**
 * Bot & crawler detection module.
 *
 * Detects:
 * - Known search engine crawlers (Googlebot, Bingbot, Yandex, Baidu, etc.)
 * - Social media crawlers (Facebook, Twitter, LinkedIn, etc.)
 * - Headless browsers (Puppeteer, Playwright, Selenium, PhantomJS)
 * - General automation tools via navigator.webdriver and injected globals
 * - API tampering / lie detection (prototype spoofing, proxy wrapping)
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type BotKind =
  | 'search_engine'    // Googlebot, Bingbot, Yandex, Baidu, DuckDuckBot, etc.
  | 'social_crawler'   // Facebook, Twitter/X, LinkedIn, Slack, Discord, etc.
  | 'headless'         // Headless Chrome/Firefox, PhantomJS
  | 'automation'       // Selenium, Puppeteer, Playwright (non-headless)
  | 'library'          // curl, wget, python-requests, node-fetch, etc.
  | 'unknown_bot'      // Signals say bot, but can't classify further
  | 'human'            // No bot signals detected

export interface BotSignals {
  /** navigator.userAgent matched a known bot pattern. */
  userAgentBot: boolean
  /** navigator.webdriver is true. */
  webdriver: boolean
  /** Headless browser indicators detected. */
  headless: boolean
  /** Automation globals found on window. */
  automationGlobals: string[]
  /** Number of API lies (toString/proxy tampering) detected. */
  liesDetected: number
  /** Proxy wrapping detected on native functions. */
  hasProxy: boolean
  /** navigator.languages is empty or missing. */
  missingLanguages: boolean
  /** navigator.plugins is empty (non-mobile). */
  missingPlugins: boolean
}

export interface BotDetectionResult {
  /** True when any bot signal fires. */
  isBot: boolean
  /** Classified category of the detected bot. */
  botKind: BotKind
  /** Individual signal results for debugging / logging. */
  signals: BotSignals
}

// ---------------------------------------------------------------------------
// Known bot UA patterns
// ---------------------------------------------------------------------------

// Single alternation. The generic tokens (bot, crawl, spider, slurp, fetch,
// archiver) subsume most named crawlers; only names that don't contain one of
// those tokens are listed explicitly.
const BOT_UA_PATTERN =
  /Google-InspectionTool|Mediapartners-Google|Sogou|ChatGPT-User|anthropic-ai|facebookexternalhit|WhatsApp|Snapchat|HeadlessChrome|PhantomJS|Selenium|Puppeteer|curl\/|Wget\/|python-requests|python-urllib|axios\/|Go-http-client|Java\/|libwww-perl|Apache-HttpClient|okhttp|Scrapy|bot|crawl|spider|slurp|fetch|archiver/i

// ---------------------------------------------------------------------------
// Automation globals injected by common frameworks
// ---------------------------------------------------------------------------

const AUTOMATION_GLOBALS = [
  // Selenium
  '__selenium_unwrapped',
  '__selenium_evaluate',
  '__webdriver_evaluate',
  '__webdriver_script_fn',
  '__webdriver_script_func',
  '__webdriver_script_function',
  '__fxdriver_evaluate',
  '__fxdriver_unwrapped',
  '_Selenium_IDE_Recorder',
  // Puppeteer / CDP
  '__puppeteer_evaluation_script__',
  // PhantomJS
  'callPhantom',
  '_phantom',
  'phantom',
  // Nightmare.js
  '__nightmare',
  // Playwright (injects page.exposeFunction bindings)
  '__playwright',
  '__pw_manual',
  // CasperJS
  '__casper',
  // TestCafe
  '__testcafe',
  // WebDriver (generic)
  'webdriver',
  'domAutomation',
  'domAutomationController',
] as const

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the current browser context is a bot or crawler.
 * Synchronous and lightweight — no async APIs needed.
 */
export function detectBot(): BotDetectionResult {
  const signals = collectBotSignals()

  const isBot =
    signals.userAgentBot ||
    signals.webdriver ||
    signals.headless ||
    signals.automationGlobals.length > 0 ||
    signals.liesDetected > 2 ||
    (signals.liesDetected > 0 && signals.hasProxy)

  let botKind: BotKind = 'human'
  if (isBot) {
    if (signals.headless) {
      botKind = 'headless'
    } else if (signals.webdriver || signals.automationGlobals.length > 0) {
      botKind = 'automation'
    } else {
      botKind = 'unknown_bot'
    }
  }

  return { isBot, botKind, signals }
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
    ...detectLies(),
    missingLanguages: detectMissingLanguages(),
    missingPlugins: detectMissingPlugins(),
  }
}

/** Check UA string against known bot patterns. */
function detectUserAgentBot(): boolean {
  const ua = navigator.userAgent || ''
  if (!ua) return true
  return BOT_UA_PATTERN.test(ua)
}

/** navigator.webdriver is set by WebDriver-based automation. */
function detectWebdriver(): boolean {
  return !!(navigator as any).webdriver
}

/** Headless browser indicators. */
function detectHeadless(): boolean {
  const w = window as any
  const n = navigator as any

  // Chrome-specific: headless mode omits the chrome runtime object
  if (/Chrome/.test(n.userAgent) && !w.chrome) return true

  // HeadlessChrome in UA
  if (/HeadlessChrome/.test(n.userAgent)) return true

  // Notification permission is always "denied" in headless Chrome
  // (in headed mode it defaults to "default")
  try {
    if (Notification.permission === 'denied' && n.permissions) {
      // Double-check: headless also lacks plugins
      if ((!n.plugins || n.plugins.length === 0) && !/Mobile|Android/i.test(n.userAgent)) {
        return true
      }
    }
  } catch { /* permissions API unavailable */ }

  return false
}

/** Detect automation framework globals on window. */
function detectAutomationGlobals(): string[] {
  const w = window as any
  return AUTOMATION_GLOBALS.filter(key => {
    try { return key in w && w[key] !== undefined }
    catch { return false }
  }) as string[]
}

/**
 * Lie detection — detect API tampering (proxies, toString spoofing).
 * Extracted from the fingerprint lies module; self-contained here.
 */
function detectLies(): { liesDetected: number; hasProxy: boolean } {
  let liesDetected = 0
  let hasProxy = false

  const apisToTest: Array<[object, string]> = [
    [Navigator.prototype, 'userAgent'],
    [Navigator.prototype, 'languages'],
    [Navigator.prototype, 'platform'],
    [Navigator.prototype, 'hardwareConcurrency'],
    [Navigator.prototype, 'webdriver'],
    [HTMLCanvasElement.prototype, 'toDataURL'],
    [CanvasRenderingContext2D.prototype, 'fillText'],
    [Date.prototype, 'getTimezoneOffset'],
  ]

  for (const [proto, prop] of apisToTest) {
    try {
      const d = Object.getOwnPropertyDescriptor(proto, prop)
      if (!d) continue
      const fn = d.value ?? d.get
      if (typeof fn !== 'function') continue

      // toString integrity for methods and accessor getters
      const str = Function.prototype.toString.call(fn)
      if (!isNativeToString(str)) liesDetected++

      // Proxy detection — only for value-bound methods (not getters)
      if (d.value && fn.toString !== Function.prototype.toString) {
        try {
          const native = Function.prototype.toString.call(fn)
          const custom = fn.toString()
          if (native !== custom) { liesDetected++; hasProxy = true }
        } catch { liesDetected++; hasProxy = true }
      }
    } catch { /* skip inaccessible */ }
  }

  // Meta-test: toString integrity
  try {
    const s = Function.prototype.toString.call(Function.prototype.toString)
    if (!isNativeToString(s)) liesDetected++
  } catch { /* skip */ }

  return { liesDetected, hasProxy }
}

/** Missing navigator.languages is a strong headless indicator. */
function detectMissingLanguages(): boolean {
  const langs = navigator.languages
  return !langs || langs.length === 0
}

/** Missing plugins on desktop is a headless indicator. */
function detectMissingPlugins(): boolean {
  if (/Mobile|Android/i.test(navigator.userAgent)) return false
  return !navigator.plugins || navigator.plugins.length === 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNativeToString(str: string): boolean {
  return /^function\s[^{]*\{\s*\[native code\]\s*\}$/.test(str) ||
    str === 'function () { [native code] }' ||
    /^\(\)\s*=>\s*\{\s*\[native code\]\s*\}$/.test(str)
}
