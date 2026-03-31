/**
 * Bot & crawler detection — standalone module.
 *
 * Usage:
 *   import { detectBot } from '@aspect/fingerprint/bot'
 *   const result = detectBot()
 *   if (result.isBot) console.log(result.botKind, result.signals)
 *
 * Detects:
 * - Known search engine crawlers (Googlebot, Bingbot, Yandex, Baidu, etc.)
 * - Social media crawlers (Facebook, Twitter, LinkedIn, etc.)
 * - Headless browsers (Puppeteer, Playwright, Selenium, PhantomJS)
 * - General automation tools via navigator.webdriver and injected globals
 * - API tampering / lie detection (prototype spoofing, proxy wrapping)
 *
 * Zero dependencies — can be imported and used independently of the
 * fingerprinting library.
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
  userAgentBot: string | null
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

interface BotPattern {
  pattern: RegExp
  kind: BotKind
  name: string
}

const BOT_PATTERNS: BotPattern[] = [
  // Search engines
  { pattern: /Googlebot/i,             kind: 'search_engine',  name: 'Googlebot' },
  { pattern: /Google-InspectionTool/i,  kind: 'search_engine',  name: 'Googlebot' },
  { pattern: /Storebot-Google/i,        kind: 'search_engine',  name: 'Googlebot' },
  { pattern: /AdsBot-Google/i,          kind: 'search_engine',  name: 'Google Ads' },
  { pattern: /Mediapartners-Google/i,   kind: 'search_engine',  name: 'Google Adsense' },
  { pattern: /bingbot/i,               kind: 'search_engine',  name: 'Bingbot' },
  { pattern: /msnbot/i,                kind: 'search_engine',  name: 'MSNBot' },
  { pattern: /YandexBot/i,             kind: 'search_engine',  name: 'YandexBot' },
  { pattern: /YandexAccessibilityBot/i, kind: 'search_engine', name: 'YandexBot' },
  { pattern: /Baiduspider/i,           kind: 'search_engine',  name: 'Baidu' },
  { pattern: /DuckDuckBot/i,           kind: 'search_engine',  name: 'DuckDuckBot' },
  { pattern: /Sogou/i,                 kind: 'search_engine',  name: 'Sogou' },
  { pattern: /Exabot/i,                kind: 'search_engine',  name: 'Exabot' },
  { pattern: /ia_archiver/i,           kind: 'search_engine',  name: 'Alexa' },
  { pattern: /SemrushBot/i,            kind: 'search_engine',  name: 'SemrushBot' },
  { pattern: /AhrefsBot/i,             kind: 'search_engine',  name: 'AhrefsBot' },
  { pattern: /MJ12bot/i,               kind: 'search_engine',  name: 'MJ12bot' },
  { pattern: /DotBot/i,                kind: 'search_engine',  name: 'DotBot' },
  { pattern: /PetalBot/i,              kind: 'search_engine',  name: 'PetalBot' },
  { pattern: /Applebot/i,              kind: 'search_engine',  name: 'Applebot' },
  { pattern: /GPTBot/i,                kind: 'search_engine',  name: 'GPTBot' },
  { pattern: /ChatGPT-User/i,          kind: 'search_engine',  name: 'ChatGPT' },
  { pattern: /ClaudeBot/i,             kind: 'search_engine',  name: 'ClaudeBot' },
  { pattern: /CCBot/i,                 kind: 'search_engine',  name: 'Common Crawl' },
  { pattern: /anthropic-ai/i,          kind: 'search_engine',  name: 'Anthropic' },
  { pattern: /PerplexityBot/i,         kind: 'search_engine',  name: 'PerplexityBot' },

  // Social crawlers
  { pattern: /facebookexternalhit/i,   kind: 'social_crawler', name: 'Facebook' },
  { pattern: /Facebot/i,              kind: 'social_crawler', name: 'Facebook' },
  { pattern: /Twitterbot/i,           kind: 'social_crawler', name: 'Twitter' },
  { pattern: /LinkedInBot/i,          kind: 'social_crawler', name: 'LinkedIn' },
  { pattern: /Slackbot/i,             kind: 'social_crawler', name: 'Slack' },
  { pattern: /Discordbot/i,           kind: 'social_crawler', name: 'Discord' },
  { pattern: /TelegramBot/i,          kind: 'social_crawler', name: 'Telegram' },
  { pattern: /WhatsApp/i,             kind: 'social_crawler', name: 'WhatsApp' },
  { pattern: /Pinterestbot/i,         kind: 'social_crawler', name: 'Pinterest' },
  { pattern: /Snapchat/i,             kind: 'social_crawler', name: 'Snapchat' },

  // Headless / automation
  { pattern: /HeadlessChrome/i,        kind: 'headless',       name: 'Headless Chrome' },
  { pattern: /PhantomJS/i,            kind: 'headless',       name: 'PhantomJS' },
  { pattern: /Selenium/i,             kind: 'automation',     name: 'Selenium' },
  { pattern: /Puppeteer/i,            kind: 'automation',     name: 'Puppeteer' },

  // HTTP libraries
  { pattern: /curl\//i,               kind: 'library',        name: 'curl' },
  { pattern: /Wget\//i,               kind: 'library',        name: 'Wget' },
  { pattern: /python-requests/i,      kind: 'library',        name: 'Python Requests' },
  { pattern: /python-urllib/i,        kind: 'library',        name: 'Python urllib' },
  { pattern: /node-fetch/i,           kind: 'library',        name: 'node-fetch' },
  { pattern: /axios\//i,              kind: 'library',        name: 'Axios' },
  { pattern: /Go-http-client/i,       kind: 'library',        name: 'Go HTTP' },
  { pattern: /Java\//i,               kind: 'library',        name: 'Java HTTP' },
  { pattern: /libwww-perl/i,          kind: 'library',        name: 'Perl LWP' },
  { pattern: /Apache-HttpClient/i,    kind: 'library',        name: 'Apache HttpClient' },
  { pattern: /okhttp/i,               kind: 'library',        name: 'OkHttp' },
  { pattern: /Scrapy/i,               kind: 'library',        name: 'Scrapy' },

  // Generic catch-all (must be last)
  { pattern: /bot|crawl|spider|slurp|fetch|archiver/i, kind: 'unknown_bot', name: 'generic' },
]

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
    signals.userAgentBot !== null ||
    signals.webdriver ||
    signals.headless ||
    signals.automationGlobals.length > 0 ||
    signals.liesDetected > 2 ||
    (signals.liesDetected > 0 && signals.hasProxy)

  let botKind: BotKind = 'human'
  if (isBot) {
    if (signals.userAgentBot !== null) {
      // Find the matching pattern to determine kind
      const ua = navigator.userAgent || ''
      const match = BOT_PATTERNS.find(p => p.pattern.test(ua))
      botKind = match?.kind ?? 'unknown_bot'
    } else if (signals.headless) {
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
function detectUserAgentBot(): string | null {
  const ua = navigator.userAgent || ''
  if (!ua) return 'empty-ua'
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(ua)) return name
  }
  return null
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

  const apisToTest: Array<[string, () => unknown]> = [
    ['Navigator.prototype.userAgent', () => desc(Navigator.prototype, 'userAgent')],
    ['Navigator.prototype.languages', () => desc(Navigator.prototype, 'languages')],
    ['Navigator.prototype.platform', () => desc(Navigator.prototype, 'platform')],
    ['Navigator.prototype.hardwareConcurrency', () => desc(Navigator.prototype, 'hardwareConcurrency')],
    ['Navigator.prototype.webdriver', () => desc(Navigator.prototype, 'webdriver')],
    ['HTMLCanvasElement.prototype.toDataURL', () => HTMLCanvasElement.prototype.toDataURL],
    ['CanvasRenderingContext2D.prototype.fillText', () => CanvasRenderingContext2D.prototype.fillText],
    ['Date.prototype.getTimezoneOffset', () => Date.prototype.getTimezoneOffset],
  ]

  for (const [name, accessor] of apisToTest) {
    try {
      const val = accessor()
      if (val === undefined || val === null) continue

      // toString format check
      if (typeof val === 'function') {
        const str = Function.prototype.toString.call(val)
        if (!isNativeToString(str)) liesDetected++
      }

      // Getter integrity check
      if (name.includes('.prototype.') && typeof val !== 'function') {
        const parts = name.split('.')
        const proto = safeProto(parts[0])
        const prop = parts[parts.length - 1]
        if (proto) {
          const d = Object.getOwnPropertyDescriptor(proto, prop)
          if (d?.get) {
            const gs = Function.prototype.toString.call(d.get)
            if (!isNativeToString(gs)) liesDetected++
          }
        }
      }

      // Proxy detection
      if (typeof val === 'function') {
        if (val.toString !== Function.prototype.toString) {
          try {
            const native = Function.prototype.toString.call(val)
            const custom = val.toString()
            if (native !== custom) { liesDetected++; hasProxy = true }
          } catch { liesDetected++; hasProxy = true }
        }
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

function desc(proto: object, prop: string) {
  return Object.getOwnPropertyDescriptor(proto, prop)
}

function safeProto(name: string): object | null {
  try { return (window as any)[name]?.prototype ?? null }
  catch { return null }
}
