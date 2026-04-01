"use strict";

// src/utils/bot.ts
var BOT_PATTERNS = [
  // Search engines
  { pattern: /Googlebot/i, kind: "search_engine", name: "Googlebot" },
  { pattern: /Google-InspectionTool/i, kind: "search_engine", name: "Googlebot" },
  { pattern: /Storebot-Google/i, kind: "search_engine", name: "Googlebot" },
  { pattern: /AdsBot-Google/i, kind: "search_engine", name: "Google Ads" },
  { pattern: /Mediapartners-Google/i, kind: "search_engine", name: "Google Adsense" },
  { pattern: /bingbot/i, kind: "search_engine", name: "Bingbot" },
  { pattern: /msnbot/i, kind: "search_engine", name: "MSNBot" },
  { pattern: /YandexBot/i, kind: "search_engine", name: "YandexBot" },
  { pattern: /YandexAccessibilityBot/i, kind: "search_engine", name: "YandexBot" },
  { pattern: /Baiduspider/i, kind: "search_engine", name: "Baidu" },
  { pattern: /DuckDuckBot/i, kind: "search_engine", name: "DuckDuckBot" },
  { pattern: /Sogou/i, kind: "search_engine", name: "Sogou" },
  { pattern: /Exabot/i, kind: "search_engine", name: "Exabot" },
  { pattern: /ia_archiver/i, kind: "search_engine", name: "Alexa" },
  { pattern: /SemrushBot/i, kind: "search_engine", name: "SemrushBot" },
  { pattern: /AhrefsBot/i, kind: "search_engine", name: "AhrefsBot" },
  { pattern: /MJ12bot/i, kind: "search_engine", name: "MJ12bot" },
  { pattern: /DotBot/i, kind: "search_engine", name: "DotBot" },
  { pattern: /PetalBot/i, kind: "search_engine", name: "PetalBot" },
  { pattern: /Applebot/i, kind: "search_engine", name: "Applebot" },
  { pattern: /GPTBot/i, kind: "search_engine", name: "GPTBot" },
  { pattern: /ChatGPT-User/i, kind: "search_engine", name: "ChatGPT" },
  { pattern: /ClaudeBot/i, kind: "search_engine", name: "ClaudeBot" },
  { pattern: /CCBot/i, kind: "search_engine", name: "Common Crawl" },
  { pattern: /anthropic-ai/i, kind: "search_engine", name: "Anthropic" },
  { pattern: /PerplexityBot/i, kind: "search_engine", name: "PerplexityBot" },
  // Social crawlers
  { pattern: /facebookexternalhit/i, kind: "social_crawler", name: "Facebook" },
  { pattern: /Facebot/i, kind: "social_crawler", name: "Facebook" },
  { pattern: /Twitterbot/i, kind: "social_crawler", name: "Twitter" },
  { pattern: /LinkedInBot/i, kind: "social_crawler", name: "LinkedIn" },
  { pattern: /Slackbot/i, kind: "social_crawler", name: "Slack" },
  { pattern: /Discordbot/i, kind: "social_crawler", name: "Discord" },
  { pattern: /TelegramBot/i, kind: "social_crawler", name: "Telegram" },
  { pattern: /WhatsApp/i, kind: "social_crawler", name: "WhatsApp" },
  { pattern: /Pinterestbot/i, kind: "social_crawler", name: "Pinterest" },
  { pattern: /Snapchat/i, kind: "social_crawler", name: "Snapchat" },
  // Headless / automation
  { pattern: /HeadlessChrome/i, kind: "headless", name: "Headless Chrome" },
  { pattern: /PhantomJS/i, kind: "headless", name: "PhantomJS" },
  { pattern: /Selenium/i, kind: "automation", name: "Selenium" },
  { pattern: /Puppeteer/i, kind: "automation", name: "Puppeteer" },
  // HTTP libraries
  { pattern: /curl\//i, kind: "library", name: "curl" },
  { pattern: /Wget\//i, kind: "library", name: "Wget" },
  { pattern: /python-requests/i, kind: "library", name: "Python Requests" },
  { pattern: /python-urllib/i, kind: "library", name: "Python urllib" },
  { pattern: /node-fetch/i, kind: "library", name: "node-fetch" },
  { pattern: /axios\//i, kind: "library", name: "Axios" },
  { pattern: /Go-http-client/i, kind: "library", name: "Go HTTP" },
  { pattern: /Java\//i, kind: "library", name: "Java HTTP" },
  { pattern: /libwww-perl/i, kind: "library", name: "Perl LWP" },
  { pattern: /Apache-HttpClient/i, kind: "library", name: "Apache HttpClient" },
  { pattern: /okhttp/i, kind: "library", name: "OkHttp" },
  { pattern: /Scrapy/i, kind: "library", name: "Scrapy" },
  // Generic catch-all (must be last)
  { pattern: /bot|crawl|spider|slurp|fetch|archiver/i, kind: "unknown_bot", name: "generic" }
];
var AUTOMATION_GLOBALS = [
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
  "phantom",
  // Nightmare.js
  "__nightmare",
  // Playwright (injects page.exposeFunction bindings)
  "__playwright",
  "__pw_manual",
  // CasperJS
  "__casper",
  // TestCafe
  "__testcafe",
  // WebDriver (generic)
  "webdriver",
  "domAutomation",
  "domAutomationController"
];
function detectBot() {
  const signals = collectBotSignals();
  const isBot = signals.userAgentBot !== null || signals.webdriver || signals.headless || signals.automationGlobals.length > 0 || signals.liesDetected > 2 || signals.liesDetected > 0 && signals.hasProxy;
  let botKind = "human";
  if (isBot) {
    if (signals.userAgentBot !== null) {
      const ua = navigator.userAgent || "";
      const match = BOT_PATTERNS.find((p) => p.pattern.test(ua));
      botKind = match?.kind ?? "unknown_bot";
    } else if (signals.headless) {
      botKind = "headless";
    } else if (signals.webdriver || signals.automationGlobals.length > 0) {
      botKind = "automation";
    } else {
      botKind = "unknown_bot";
    }
  }
  return { isBot, botKind, signals };
}
function collectBotSignals() {
  return {
    userAgentBot: detectUserAgentBot(),
    webdriver: detectWebdriver(),
    headless: detectHeadless(),
    automationGlobals: detectAutomationGlobals(),
    ...detectLies(),
    missingLanguages: detectMissingLanguages(),
    missingPlugins: detectMissingPlugins()
  };
}
function detectUserAgentBot() {
  const ua = navigator.userAgent || "";
  if (!ua) return "empty-ua";
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(ua)) return name;
  }
  return null;
}
function detectWebdriver() {
  return !!navigator.webdriver;
}
function detectHeadless() {
  const w = window;
  const n = navigator;
  if (/Chrome/.test(n.userAgent) && !w.chrome) return true;
  if (/HeadlessChrome/.test(n.userAgent)) return true;
  try {
    if (Notification.permission === "denied" && n.permissions) {
      if ((!n.plugins || n.plugins.length === 0) && !/Mobile|Android/i.test(n.userAgent)) {
        return true;
      }
    }
  } catch {
  }
  return false;
}
function detectAutomationGlobals() {
  const w = window;
  return AUTOMATION_GLOBALS.filter((key) => {
    try {
      return key in w && w[key] !== void 0;
    } catch {
      return false;
    }
  });
}
function detectLies() {
  let liesDetected = 0;
  let hasProxy = false;
  const apisToTest = [
    ["Navigator.prototype.userAgent", () => desc(Navigator.prototype, "userAgent")],
    ["Navigator.prototype.languages", () => desc(Navigator.prototype, "languages")],
    ["Navigator.prototype.platform", () => desc(Navigator.prototype, "platform")],
    ["Navigator.prototype.hardwareConcurrency", () => desc(Navigator.prototype, "hardwareConcurrency")],
    ["Navigator.prototype.webdriver", () => desc(Navigator.prototype, "webdriver")],
    ["HTMLCanvasElement.prototype.toDataURL", () => HTMLCanvasElement.prototype.toDataURL],
    ["CanvasRenderingContext2D.prototype.fillText", () => CanvasRenderingContext2D.prototype.fillText],
    ["Date.prototype.getTimezoneOffset", () => Date.prototype.getTimezoneOffset]
  ];
  for (const [name, accessor] of apisToTest) {
    try {
      const val = accessor();
      if (val === void 0 || val === null) continue;
      if (typeof val === "function") {
        const str = Function.prototype.toString.call(val);
        if (!isNativeToString(str)) liesDetected++;
      }
      if (name.includes(".prototype.") && typeof val !== "function") {
        const parts = name.split(".");
        const protoName = parts[0];
        const prop = parts[parts.length - 1];
        if (protoName && prop) {
          const proto = safeProto(protoName);
          if (!proto) continue;
          const d = Object.getOwnPropertyDescriptor(proto, prop);
          if (d?.get) {
            const gs = Function.prototype.toString.call(d.get);
            if (!isNativeToString(gs)) liesDetected++;
          }
        }
      }
      if (typeof val === "function") {
        if (val.toString !== Function.prototype.toString) {
          try {
            const native = Function.prototype.toString.call(val);
            const custom = val.toString();
            if (native !== custom) {
              liesDetected++;
              hasProxy = true;
            }
          } catch {
            liesDetected++;
            hasProxy = true;
          }
        }
      }
    } catch {
    }
  }
  try {
    const s = Function.prototype.toString.call(Function.prototype.toString);
    if (!isNativeToString(s)) liesDetected++;
  } catch {
  }
  return { liesDetected, hasProxy };
}
function detectMissingLanguages() {
  const langs = navigator.languages;
  return !langs || langs.length === 0;
}
function detectMissingPlugins() {
  if (/Mobile|Android/i.test(navigator.userAgent)) return false;
  return !navigator.plugins || navigator.plugins.length === 0;
}
function isNativeToString(str) {
  return /^function\s[^{]*\{\s*\[native code\]\s*\}$/.test(str) || str === "function () { [native code] }" || /^\(\)\s*=>\s*\{\s*\[native code\]\s*\}$/.test(str);
}
function desc(proto, prop) {
  return Object.getOwnPropertyDescriptor(proto, prop);
}
function safeProto(name) {
  try {
    return window[name]?.prototype ?? null;
  } catch {
    return null;
  }
}

// src/utils/environment.ts
var getEnvironment = () => ({
  isLocalhost: /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) && (location.protocol === "http:" || location.protocol === "https:") || location.protocol === "file:",
  isHeadlessBrowser: Boolean(
    window.navigator.webdriver || "_phantom" in window && window._phantom || "__nightmare" in window && window.__nightmare || "Cypress" in window && window.Cypress
  )
});

// src/utils/extract-hostname.ts
var extractHostName = (script, isLocalhost) => {
  const debugAttr = script.getAttribute("data-debug");
  const hostnameAttr = script.getAttribute("data-hostname");
  const devmodeAttr = script.getAttribute("data-devmode");
  let devmode;
  if (!isLocalhost) {
    devmode = false;
  } else if (devmodeAttr !== null) {
    const normalized = devmodeAttr.toLowerCase().trim();
    devmode = normalized === "" || normalized === "true" || normalized === "1";
  } else if (debugAttr !== null) {
    devmode = true;
  } else {
    devmode = false;
  }
  let hostname;
  if (hostnameAttr !== null) {
    const trimmed = hostnameAttr.trim();
    hostname = trimmed || null;
  } else if (devmode && debugAttr !== null) {
    hostname = debugAttr;
  } else {
    hostname = null;
  }
  return { hostname, devmode };
};

// src/utils/merge-config.ts
var defaultConfig = {
  hostname: null,
  devmode: false,
  collectorUrl: "https://collector.onedollarstats.com/events",
  hashRouting: false,
  autocollect: true,
  excludePages: [],
  includePages: []
};

// src/utils/parse-utm-params.ts
function parseUtmParams(urlSearchParams) {
  const utm = {};
  const keys = ["utm_campaign", "utm_source", "utm_medium", "utm_term", "utm_content"];
  for (const key of keys) {
    const raw = urlSearchParams.get(key);
    if (!raw) continue;
    const decoded = decodeAndTrim(raw);
    if (decoded) {
      utm[key] = decoded;
    }
  }
  return utm;
}
function decodeAndTrim(value) {
  let decoded = value;
  let previous = "";
  while (decoded !== previous) {
    previous = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return decoded.trim();
    }
  }
  return decoded.trim();
}

// src/utils/props-parser.ts
var parseProps = (propsString) => {
  if (!propsString) return void 0;
  const splittedProps = propsString.split(";");
  const propsObj = {};
  for (const keyValueString of splittedProps) {
    const keyValuePair = keyValueString.split("=").map((el) => el.trim());
    if (keyValuePair.length !== 2 || keyValuePair[0] === "" || keyValuePair[1] === "") continue;
    propsObj[keyValuePair[0]] = keyValuePair[1];
  }
  return Object.keys(propsObj).length === 0 ? void 0 : propsObj;
};

// src/utils/resolve-path.ts
var resolvePath = (pathOrProps) => {
  if (pathOrProps) return pathOrProps;
  const sources = [
    { value: document.body?.getAttribute("data-s-path"), name: "data-s-path" },
    { value: document.body?.getAttribute("data-s:path"), name: "data-s:path" },
    { value: document.querySelector('meta[name="stonks-path"]')?.getAttribute("content"), name: "meta[stonks-path]" }
  ];
  const existing = sources.filter(({ value }) => value);
  if (existing.length > 1) {
    console.warn("[onedollarstats] Multiple path sources found. Using priority order:", existing.map(({ name }) => name).join(" > "));
  }
  return existing[0]?.value ?? location.pathname;
};

// src/script.ts
(() => {
  if (!document) {
    return;
  }
  let lastPage = null;
  window.stonks = {
    event,
    view
  };
  const stonksScript = document.currentScript;
  const useHashRouting = stonksScript?.getAttribute("data-hash-routing") !== null;
  const { isLocalhost: isLocalEnvironment } = getEnvironment();
  if (isLocalEnvironment) {
    const { hostname, devmode } = extractHostName(stonksScript, isLocalEnvironment);
    console.log(`[onedollarstats]
Script successfully connected! ${hostname ? `Tracking your localhost as ${hostname}` : "Debug domain not set"}`);
    if (devmode && hostname) {
      const analyticsUrl = stonksScript?.getAttribute("data-url") || defaultConfig.collectorUrl;
      window.__stonksDebugConfig = { hostname, collectorUrl: analyticsUrl };
      window.__stonksModalQueue = [];
      window.__stonksModalReady = false;
      const debugScript = document.createElement("script");
      debugScript.src = "https://assets.onedollarstats.com/stonks-debug.js";
      debugScript.onerror = () => {
        window.__stonksModalReady = true;
      };
      document.head.appendChild(debugScript);
    }
  }
  async function sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, callback) {
    if (navigator.sendBeacon?.(analyticsUrl, stringifiedBody)) {
      callback(true);
      return;
    }
    fetch(analyticsUrl, {
      method: "POST",
      body: stringifiedBody,
      headers: { "Content-Type": "application/json" },
      keepalive: true
    }).then(() => callback(true)).catch((err) => {
      console.error("[onedollarstats] fetch() failed:", err.message);
      callback(false);
    });
  }
  async function send(data) {
    const analyticsUrl = stonksScript?.getAttribute("data-url") || defaultConfig.collectorUrl;
    const { hostname, devmode } = extractHostName(stonksScript, isLocalEnvironment);
    const urlToSend = new URL(hostname ? `https://${hostname}${location.pathname}` : location.href);
    urlToSend.search = "";
    if (data.path) {
      urlToSend.pathname = data.path;
    }
    const cleanUrl = urlToSend.href.replace(/\/$/, "");
    let referrer = data.referrer ?? void 0;
    if (!referrer) {
      const docReferrer = document.referrer && document.referrer !== "null" ? document.referrer : void 0;
      if (docReferrer) {
        const referrerURL = new URL(docReferrer);
        if (referrerURL.hostname !== urlToSend.hostname) {
          referrer = referrerURL.href;
        }
      }
    }
    const body = {
      u: cleanUrl,
      e: [
        {
          t: data.type,
          h: useHashRouting,
          r: referrer,
          p: data.props
        }
      ],
      debug: devmode
    };
    if (data.utm && Object.keys(data.utm).length > 0) {
      body.qs = data.utm;
    }
    if (body.debug) {
      let logMessage = `[onedollarstats]
Event name: ${data.type}
Event collected from: ${cleanUrl}`;
      if (data.props && Object.keys(data.props).length > 0)
        logMessage += `
Props: ${JSON.stringify(data.props, null, 2)}`;
      if (referrer) logMessage += `
Referrer: ${referrer}`;
      if (useHashRouting) logMessage += `
HashRouting: ${useHashRouting}`;
      if (data.utm && Object.keys(data.utm).length > 0)
        logMessage += `
UTM: ${data.utm}`;
      console.log(logMessage);
    }
    const onComplete = (success) => {
      const message = `${data.type} ${success ? "sent" : "failed to send"}`;
      if (window.__stonksModalReady) {
        window.__stonksModalLog?.(message, success);
      } else {
        window.__stonksModalQueue?.push([message, success]);
      }
    };
    const stringifiedBody = JSON.stringify(body);
    const bytes = new TextEncoder().encode(stringifiedBody);
    const bin = String.fromCharCode(...bytes);
    const payloadBase64 = btoa(bin);
    const safeGetThreshold = 1500;
    const tryImageBeacon = payloadBase64.length <= safeGetThreshold;
    if (tryImageBeacon) {
      const img = new Image(1, 1);
      img.onload = () => onComplete(true);
      img.onerror = () => sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);
      img.src = `${analyticsUrl}?data=${payloadBase64}`;
    } else
      await sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);
  }
  async function event(name, arg2, props) {
    if (shouldBlockEvent()) return;
    const options = {};
    if (typeof arg2 === "string") {
      options.path = arg2;
      if (props) options.props = props;
    } else if (typeof arg2 === "object") {
      options.props = arg2;
    }
    const path = resolvePath(options?.path || void 0);
    send({ type: name, props: options?.props, path: path !== location.pathname ? path : void 0 });
  }
  function handleTaggedElementClickEvent(clickEvent) {
    if (clickEvent.type === "auxclick" && clickEvent.button !== 1) return;
    const target = clickEvent.target;
    if (!target) return;
    const insideInteractive = !!target.closest("a, button");
    let el = target;
    let depth = 0;
    while (el) {
      const eventName = el.getAttribute("data-s-event") || el.getAttribute("data-s:event");
      if (eventName) {
        const propsAttr = el.getAttribute("data-s-event-props") || el.getAttribute("data-s:event-props");
        const props = propsAttr ? parseProps(propsAttr) : void 0;
        const path = el.getAttribute("data-s-event-path") || el.getAttribute("data-s:event-path") || void 0;
        event(eventName, path ?? props, props);
        return;
      }
      el = el.parentElement;
      depth++;
      if (!insideInteractive && depth >= 3) break;
    }
  }
  async function view(arg1, arg2) {
    const options = {};
    if (typeof arg1 === "string") {
      options.path = arg1;
      if (arg2) options.props = arg2;
    } else if (typeof arg1 === "object") {
      options.props = arg1;
    }
    trackPageView(
      {
        path: options?.path,
        props: options?.props
      },
      false
    );
  }
  async function trackPageView(data, checkBlock = true) {
    if (checkBlock && shouldBlockEvent()) return;
    const urlParams = new URLSearchParams(location.search);
    const utm = parseUtmParams(urlParams);
    const path = resolvePath(data?.path || void 0);
    const customPath = path !== location.pathname ? path : void 0;
    const pageViewProps = stonksScript?.getAttribute("data-props");
    const collectedProps = pageViewProps ? parseProps(pageViewProps) || {} : {};
    const elements = document.querySelectorAll(
      "[data-s\\:view-props], [data-s-view-props]"
    );
    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s-view-props") || el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(collectedProps, parsedProps);
    }
    const metaViewProps = document.querySelector('meta[name="stonks-props"]')?.getAttribute("content");
    if (metaViewProps) {
      Object.assign(collectedProps, parseProps(metaViewProps));
    }
    if (data.props) {
      Object.assign(collectedProps, data.props);
    }
    const props = Object.keys(collectedProps).length > 0 ? collectedProps : void 0;
    send({
      type: "PageView",
      props,
      path: customPath,
      utm
    });
  }
  async function triggerPageView() {
    const shouldCollectPage1 = document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content");
    const shouldCollectPage2 = document.body?.getAttribute("data-s-collect") || document.body?.getAttribute("data-s:collect");
    if (shouldCollectPage1 === "false" || shouldCollectPage2 === "false") {
      lastPage = null;
      return;
    }
    const isAutocollect = stonksScript?.getAttribute("data-autocollect") !== "false";
    if (!isAutocollect && shouldCollectPage1 !== "true" && shouldCollectPage2 !== "true") {
      lastPage = null;
      return;
    }
    if (!useHashRouting && lastPage === location.pathname) {
      console.warn(`Ignoring event PageView - pathname has not changed`);
      return;
    }
    if (shouldBlockEvent()) return;
    lastPage = location.pathname;
    const pageViewProps = stonksScript?.getAttribute("data-props");
    const props = pageViewProps ? parseProps(pageViewProps) || {} : {};
    const elements = document.querySelectorAll(
      "[data-s\\:view-props], [data-s-view-props]"
    );
    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s-view-props") || el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(props, parsedProps);
    }
    const metaViewProps = document.querySelector('meta[name="stonks-props"]')?.getAttribute("content");
    if (metaViewProps) {
      Object.assign(props, parseProps(metaViewProps));
    }
    trackPageView(
      {
        props: Object.keys(props).length > 0 ? props : void 0
      },
      false
    );
  }
  function shouldBlockEvent() {
    const { hostname, devmode } = extractHostName(stonksScript, isLocalEnvironment);
    if (isLocalEnvironment && (!devmode || !hostname)) {
      return true;
    }
    const { isBot, botKind } = detectBot();
    if (isBot && botKind !== "human") {
      return true;
    }
    return false;
  }
  if (window.history.pushState) {
    const originalPushState = window.history.pushState;
    window.history.pushState = function(data, unused, url) {
      originalPushState.apply(this, [data, unused, url]);
      window.requestAnimationFrame(() => {
        triggerPageView();
      });
    };
    window.addEventListener("popstate", () => {
      window.requestAnimationFrame(() => {
        triggerPageView();
      });
    });
  }
  if (document.visibilityState !== "visible") {
    document.addEventListener("visibilitychange", () => {
      if (!lastPage && document.visibilityState === "visible") {
        triggerPageView();
      }
    });
  } else {
    triggerPageView();
  }
  document.addEventListener("click", handleTaggedElementClickEvent);
})();
