import type { AnalyticsConfig, BaseProps, BodyToSend, Event, InternalAnalyticsConfig, ViewArguments } from "./types";
import { detectBot } from "./utils/bot";
import { getEnvironment, isClient } from "./utils/environment";
import { mergeConfig } from "./utils/merge-config";
import { parseUtmParams } from "./utils/parse-utm-params";
import { parseProps } from "./utils/props-parser";
import { resolvePath } from "./utils/resolve-path";
import { shouldTrackPath } from "./utils/should-track";

declare const DEBUG_SCRIPT_URL: string;

class AnalyticsTracker {
  private static instance: AnalyticsTracker | null = null;

  private autocollectSetupDone = false;
  private config: InternalAnalyticsConfig;
  private lastPage: string | null = null;

  public static getInstance(userConfig: AnalyticsConfig = {}): AnalyticsTracker {
    // Fresh no-op instance for SSR
    if (!isClient()) return new AnalyticsTracker(userConfig);

    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker(userConfig);
    }
    return AnalyticsTracker.instance;
  }

  private constructor(userConfig: AnalyticsConfig = {}) {
    this.config = mergeConfig(userConfig);

    // Skip setup in non-client environments
    if (!isClient()) return;

    const { isLocalhost } = getEnvironment();

    // Debug log on localhost
    if (isLocalhost && this.config.devmode && this.config.hostname) {
      console.log(`[onedollarstats]\nOneDollarStats connected! Tracking localhost as ${this.config.hostname}`);

      // Set up debug modal loading: store config + queue, then dynamically load the debug script
      window.__stonksDebugConfig = { hostname: this.config.hostname, collectorUrl: this.config.collectorUrl };
      window.__stonksModalQueue = [];
      window.__stonksModalReady = false;

      const debugScript = document.createElement("script");
      debugScript.src = DEBUG_SCRIPT_URL;
      debugScript.onerror = () => {
        // If the debug script fails to load, mark as ready so queued events are not stuck
        window.__stonksModalReady = true;
      };
      document.head.appendChild(debugScript);
    }

    // Auto-start autocollect (always set up listeners; handlePageView checks config)
    this.setupAutocollect();
  }

  private async sendWithBeaconOrFetch(stringifiedBody: string, callback: (success: boolean) => void): Promise<void> {
    // First fallback: try sendBeacon
    if (navigator.sendBeacon?.(this.config.collectorUrl, stringifiedBody)) {
      callback(true);
      return;
    }

    // Second fallback: use fetch() with keepalive
    fetch(this.config.collectorUrl, {
      method: "POST",
      body: stringifiedBody,
      headers: { "Content-Type": "application/json" },
      keepalive: true
    })
      .then(({ ok }) => callback(ok))
      .catch((err: Error) => {
        console.error("[onedollarstats] fetch() failed:", err.message);
        callback(false);
      });
  }

  // Handles localhost replacement, referrer, UTM parameters, and debug mode.
  // Uses img beacon then `navigator.sendBeacon` if available, otherwise falls back to `fetch`.
  private async send(data: Event): Promise<void> {
    const { isLocalhost, isHeadlessBrowser } = getEnvironment();
    if ((isLocalhost && !this.config.devmode) || isHeadlessBrowser) return;

    const { isBot, botKind } = detectBot();

    if (isBot && botKind !== "human") return;

    const urlToSend = new URL(this.config.hostname ? `https://${this.config.hostname}${location.pathname}` : location.href);

    // Clean query string unless UTM is explicitly provided
    urlToSend.search = "";
    if (data.path) urlToSend.pathname = data.path;

    const cleanUrl = urlToSend.href.replace(/\/$/, "");

    // Determine referrer
    let referrer: string | undefined = data.referrer;
    try {
      if (!referrer && document.referrer && document.referrer !== "null") {
        const referrerURL = new URL(document.referrer);
        if (referrerURL.hostname !== urlToSend.hostname) referrer = referrerURL.href;
      }
    } catch {} // ignore malformed referrer

    // Build request body
    const body: BodyToSend = {
      u: cleanUrl,
      e: [
        {
          t: data.type,
          h: this.config.hashRouting,
          r: referrer,
          p: data.props
        }
      ],
      debug: this.config.devmode
    };

    if (data.utm && Object.keys(data.utm).length > 0) body.qs = data.utm;

    if (body.debug) {
      let logMessage = `[onedollarstats]\nEvent name: ${data.type}\nEvent collected from: ${cleanUrl}`;
      if (data.props && Object.keys(data.props).length > 0) logMessage += `\nProps: ${JSON.stringify(data.props, null, 2)}`;
      if (referrer) logMessage += `\nReferrer: ${referrer}`;
      if (this.config.hashRouting) logMessage += `\nHashRouting: ${this.config.hashRouting}`;
      if (data.utm && Object.keys(data.utm).length > 0) logMessage += `\nUTM: ${data.utm}`;

      console.log(logMessage);
    }

    // Prepare the event payload
    const stringifiedBody = JSON.stringify(body);

    // Encode for safe inclusion in a query string (UTF-8 → Base64)
    const bytes = new TextEncoder().encode(stringifiedBody); // UTF-8 → bytes
    const bin = String.fromCharCode(...bytes); // bytes → binary string
    const payloadBase64 = btoa(bin); // binary → Base64

    const safeGetThreshold = 1500; // limit for query-string-containing URLs
    const tryImageBeacon = payloadBase64.length <= safeGetThreshold;

    const onComplete = (success: boolean) => {
      const message = `${data.type} ${success ? "sent" : "failed to send"}`;
      if (window.__stonksModalReady) {
        window.__stonksModalLog?.(message, success);
      } else {
        window.__stonksModalQueue?.push([message, success]);
      }
    };

    if (tryImageBeacon) {
      // Send via image beacon
      const img = new Image(1, 1);

      img.onload = () => onComplete(true);
      // If loading image fails (server unavailable, blocked, etc.)
      img.onerror = () => this.sendWithBeaconOrFetch(stringifiedBody, onComplete);

      // Primary attempt: send data via image beacon (GET request with query string)
      img.src = `${this.config.collectorUrl}?data=${payloadBase64}`;
    } else await this.sendWithBeaconOrFetch(stringifiedBody, onComplete);
  }

  // Prevents duplicate pageviews and respects include/exclude page rules. Automatically parses UTM parameters from URL.
  private trackPageView({ path, props }: ViewArguments, checkBlock: boolean = false) {
    if (!isClient()) return;

    const viewPath = resolvePath(path);

    // Collect props from DOM attributes
    const collectedProps: Record<string, string> = {};
    const elements = document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");

    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s-view-props") || el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(collectedProps, parsedProps);
    }

    // Collect props from meta tag (overrides DOM attributes)
    const metaViewProps = document
      .querySelector('meta[name="stonks-props"]')
      ?.getAttribute("content");
    if (metaViewProps) {
      Object.assign(collectedProps, parseProps(metaViewProps));
    }

    // Explicit props override everything
    if (props) {
      Object.assign(collectedProps, props);
    }

    const viewProps = Object.keys(collectedProps).length > 0 ? collectedProps : undefined;

    // Skip duplicate pageviews or excluded pages
    if (!this.config.hashRouting && this.lastPage === viewPath) return;

    // Skip page if checkBlock is true and the path should be excluded
    if (checkBlock && !shouldTrackPath(viewPath, this.config)) return;

    this.lastPage = viewPath;

    const utm = parseUtmParams(new URLSearchParams(location.search));
    this.send({ type: "PageView", path: viewPath, props: viewProps, utm });
  }

  /**
   * Tracks a custom event.
   * Can accept path string or a props object.
   *
   * @param eventName Name of the event to track.
   * @param pathOrProps Optional path string or props object.
   * @param props Optional props object if path string is provided.
   */
  public async event(eventName: string, pathOrProps?: string | BaseProps, rawProps?: BaseProps) {
    if (!isClient()) return;

    const { isLocalhost, isHeadlessBrowser } = getEnvironment();
    if ((isLocalhost && !this.config.devmode) || isHeadlessBrowser) return;

    const path = resolvePath(typeof pathOrProps === "string" ? pathOrProps : undefined);
    const props = typeof pathOrProps === "object" ? pathOrProps : rawProps;

    this.send({ type: eventName, path, props });
  }

  /**
   * Records a page view.
   * Can accept path string or a props object.
   *
   * @param pathOrProps Optional path string or props object.
   * @param props Optional props when first arg is a path string.
   */
  public async view(pathOrProps?: string | BaseProps, props?: BaseProps) {
    if (!isClient()) return;

    const args: ViewArguments = {};

    if (typeof pathOrProps === "string") {
      args.path = pathOrProps;
      args.props = props;
    } else if (typeof pathOrProps === "object") {
      args.props = pathOrProps;
    }

    this.trackPageView(args);
  }

  /**
   * Installs global DOM/window listeners exactly once for:
   *  - visibilitychange
   *  - history.pushState
   *  - popstate
   *  - hashchange
   *  - click autocapture for elements annotated with `data-s:event` & `data-s-event`
   *
   */
  private setupAutocollect() {
    if (!isClient() || this.autocollectSetupDone) return;
    this.autocollectSetupDone = true;

    const handlePageView = () => {
      // Check meta tag and body attribute for collection control
      const metaCollect = document
        .querySelector('meta[name="stonks-collect"]')
        ?.getAttribute("content");
      const bodyCollect =
        document.body?.getAttribute("data-s-collect") ||
        document.body?.getAttribute("data-s:collect");

      // Explicitly disabled
      if (metaCollect === "false" || bodyCollect === "false") {
        this.lastPage = null;
        return;
      }

      // If autocollect is off, only collect if explicitly enabled via meta/body
      if (!this.config.autocollect && metaCollect !== "true" && bodyCollect !== "true") {
        this.lastPage = null;
        return;
      }

      this.trackPageView({}, true);
    };

    // visibilitychange
    const onVisibility = () => {
      if (document.visibilityState === "visible") handlePageView();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // pushState
    const origPush = history.pushState.bind(history);
    history.pushState = (...args) => {
      origPush(...args);
      requestAnimationFrame(() => {
        handlePageView();
      });
    };

    // popstate
    window.addEventListener("popstate", handlePageView);

    // hashchange
    window.addEventListener("hashchange", handlePageView);

    // click autocapture
    const onClick: EventListener = (ev: Event) => {
      const clickEvent = ev as MouseEvent;
      if (clickEvent.type === "auxclick" && clickEvent.button !== 1) return;

      const target = clickEvent.target as Element | null;
      if (!target) return;

      // Check if inside <a> or <button>
      const insideInteractive = !!target.closest("a, button");

      let el: Element | null = target;
      let depth = 0;

      while (el) {
        const eventName = el.getAttribute("data-s-event") || el.getAttribute("data-s:event");
        if (eventName) {
          const propsAttr = el.getAttribute("data-s-event-props") || el.getAttribute("data-s:event-props");
          const props = propsAttr ? parseProps(propsAttr) : undefined;
          const path = el.getAttribute("data-s-event-path") || el.getAttribute("data-s:event-path") || undefined;

          if ((path && !shouldTrackPath(path, this.config)) || !shouldTrackPath(location.pathname, this.config)) {
            return;
          }

          this.event(eventName, path ?? props, props);
          return;
        }

        el = el.parentElement;
        depth++;

        // If not in <a>/<button>, stop after 3 levels
        if (!insideInteractive && depth >= 3) break;
      }
    };

    document.addEventListener("click", onClick);

    // Fire initial pageview if already visible
    if (document.visibilityState === "visible") handlePageView();
  }
}

export const configure = (userConfig: AnalyticsConfig = {}) => {
  AnalyticsTracker.getInstance(userConfig);
};

export const event = async (eventName: string, pathOrProps?: string | BaseProps, props?: BaseProps) => {
  const instance = AnalyticsTracker.getInstance();
  await instance.event(eventName, pathOrProps, props);
};

export const view = async (pathOrProps?: string | BaseProps, props?: BaseProps) => {
  const instance = AnalyticsTracker.getInstance();
  await instance.view(pathOrProps, props);
};
