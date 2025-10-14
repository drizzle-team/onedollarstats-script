import type { BodyToSend, Event, ViewArguments } from "./types";
import { createDebugModal } from "./utils/create-modal";
import { parseUtmParams } from "./utils/parse-utm-params";
import { parseProps } from "./utils/props-parser";

// Wrapping the entire script in an IIFE (Immediately Invoked Function Expression)
// to avoid polluting the global namespace. This isolates all variables and functions,
// preventing potential conflicts with other scripts on the page.
(() => {
  // Don't execute the script on the server side. Check for document instead of window, because Deno has the window object even on the server.
  if (!document) {
    return;
  }

  let lastPage: string | null = null;

  window.stonks = {
    event: event,
    view: view
  };

  const stonksScript = <HTMLScriptElement>document.currentScript; // ToDo
  const useHashRouting = stonksScript?.getAttribute("data-hash-routing") !== null; // ToDo
  const environment = {
    isLocalhost: /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) || location.protocol === "file:",
    isHeadlessBrowser: !!(window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress)
  };

  if (environment.isLocalhost) {
    const debugUrl = stonksScript?.getAttribute("data-debug");

    console.log(`[onedollarstats]\nScript successfully connected! ${debugUrl ? `Tracking your localhost as ${debugUrl}` : "Debug domain not set"}`);

    createDebugModal(debugUrl);

    const img = new Image(1, 1);

    const body: BodyToSend = {
      u: "https://test-check.com",
      e: [
        {
          t: "Health check"
        }
      ]
    };
    // Prepare the event payload
    const stringifiedBody = JSON.stringify(body);
    // Encode for safe inclusion in query string using Base64
    const payloadBase64 = btoa(stringifiedBody);
    img.onload = () => window.__stonksModalLog?.("Health check passed", true);

    // If loading image fails (server unavailable, blocked, etc.)
    img.onerror = () => window.__stonksModalLog?.("Health check failed - ad blocker may be active", false);

    // Primary attempt: send data via image beacon (GET request with query string)
    img.src = `https://collector.onedollarstats.com/events?data=${payloadBase64}`;
  }

  async function sendWithBeaconOrFetch(analyticsUrl: string, stringifiedBody: string, callback: (success: boolean) => void): Promise<void> {
    // First fallback: try sendBeacon
    if (navigator.sendBeacon?.(analyticsUrl, stringifiedBody)) {
      callback(true);
      return;
    }

    // Second fallback: use fetch() with keepalive
    fetch(analyticsUrl, {
      method: "POST",
      body: stringifiedBody,
      headers: { "Content-Type": "application/json" },
      keepalive: true
    })
      .then(() => callback(true))
      .catch((err: Error) => {
        console.error("[onedollarstats] fetch() failed:", err.message);
        callback(false);
      });
  }

  async function send(data: Event): Promise<void> {
    const analyticsUrl = stonksScript?.getAttribute("data-url") || "https://collector.onedollarstats.com/events";

    let urlToSend: URL = new URL(location.href);
    const debugAttribute = stonksScript.getAttribute("data-debug");

    let isDebug: boolean = false;
    if (debugAttribute) {
      try {
        const debugUrl = new URL(`https://${debugAttribute}${urlToSend.pathname}`);
        if (urlToSend.hostname !== debugUrl.hostname) {
          isDebug = true;
          urlToSend = debugUrl;
        }
      } catch {
        return;
      }
    }

    urlToSend.search = "";
    if ("path" in data && data.path) {
      urlToSend.pathname = data.path; // ToDo: check sho menyaet teyvo
    }
    // remove slash
    const cleanUrl = urlToSend.href.replace(/\/$/, "");

    let referrer: string | undefined = data.referrer ?? undefined; // ToDo: collect referrer when user sends event

    if (!referrer) {
      const docReferrer = document.referrer && document.referrer !== "null" ? document.referrer : undefined;

      if (docReferrer) {
        const referrerURL = new URL(docReferrer);

        if (referrerURL.hostname !== urlToSend.hostname) {
          referrer = referrerURL.href;
        }
      }
    }

    const body: BodyToSend = {
      u: cleanUrl,
      e: [
        {
          t: data.type,
          h: useHashRouting, // ToDo: why we send hash routing
          r: referrer,
          p: data.props
        }
      ]
    };

    if (data.utm && Object.keys(data.utm).length > 0) {
      body.qs = data.utm; // ToDo
    }

    if (isDebug) {
      body.debug = isDebug;
      let logMessage = `[onedollarstats]\nEvent name: ${data.type}\nEvent collected from: ${cleanUrl}`;
      if (data.props && Object.keys(data.props).length > 0) logMessage += `\nProps: ${JSON.stringify(data.props, null, 2)}`;
      if (referrer) logMessage += `\nReferrer: ${referrer}`;
      if (useHashRouting) logMessage += `\nHashRouting: ${useHashRouting}`;
      if (data.utm && Object.keys(data.utm).length > 0) logMessage += `\nUTM: ${data.utm}`;

      console.log(logMessage);
    }

    const onComplete = (success: boolean) => window.__stonksModalLog?.(`${data.type} ${success ? "sent" : "failed to send"}`, success);
    // Prepare the event payload
    const stringifiedBody = JSON.stringify(body);
    // Encode for safe inclusion in query string using Base64
    const payloadBase64 = btoa(stringifiedBody);

    const safeGetThreshold = 1500; // limit for query-string-containing URLs
    const tryImageBeacon = payloadBase64.length <= safeGetThreshold;

    if (tryImageBeacon) {
      // Send via image beacon
      const img = new Image(1, 1);

      img.onload = () => onComplete(true);
      // If loading image fails (server unavailable, blocked, etc.)
      img.onerror = () => sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);

      // Primary attempt: send data via image beacon (GET request with query string)
      img.src = `${analyticsUrl}?data=${payloadBase64}`;
    } else await sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);
  }

  async function event(name: string, arg2?: string | Record<string, string>, props?: Record<string, string>) {
    if (shouldBlockEvent()) return;

    const options: {
      path?: string;
      props?: Record<string, string>;
    } = {};

    if (typeof arg2 === "string") {
      options.path = arg2;
      if (props) options.props = props;
    } else if (typeof arg2 === "object") {
      options.props = arg2;
    }

    let path: string | undefined = options?.path || undefined;
    if (!path) {
      const newPath =
        document.body?.getAttribute("data-s-path") ||
        document.body?.getAttribute("data-s:path") ||
        document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");

      if (newPath) {
        path = newPath;
      }
    }

    send({ type: name, props: options?.props, path });
  }

  function handleTaggedElementClickEvent(clickEvent: MouseEvent) {
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

        event(eventName, path ?? props, props);

        return;
      }

      el = el.parentElement;
      depth++;

      // If not in <a>/<button>, stop after 3 levels
      if (!insideInteractive && depth >= 3) break;
    }
  }

  async function view(arg1?: string | Record<string, string>, arg2?: Record<string, string>) {
    const options: {
      path?: string;
      props?: Record<string, string>;
    } = {};

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

  async function trackPageView(data: ViewArguments, checkBlock: boolean = true) {
    if (checkBlock && shouldBlockEvent()) return;

    const urlParams = new URLSearchParams(location.search);
    const utm = parseUtmParams(urlParams);

    let path: string | undefined = data?.path || undefined;

    if (!path) {
      const newPath =
        document.body?.getAttribute("data-s-path") ||
        document.body?.getAttribute("data-s:path") ||
        document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");

      if (newPath) {
        path = newPath;
      }
    }

    let props = data.props || undefined;
    if (!props) {
      const pageViewProps = stonksScript?.getAttribute("data-props");
      const newProps = pageViewProps ? parseProps(pageViewProps) || {} : {};
      const elements = document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");
      for (const el of Array.from(elements)) {
        const propsString = el.getAttribute("data-s-view-props") || el.getAttribute("data-s:view-props");
        if (!propsString) continue;
        const parsedProps = parseProps(propsString);
        Object.assign(newProps, parsedProps);
      }
      props = newProps;
    }
    send({
      type: "PageView",
      props: Object.keys(props).length > 0 ? props : undefined,
      path: path,
      utm
    });
  }

  async function triggerPageView(): Promise<void> {
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
    const elements = document.querySelectorAll("[data-s\\:view-props], [data-s-view-props]");
    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s-view-props") || el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(props, parsedProps);
    }

    trackPageView(
      {
        props: Object.keys(props).length > 0 ? props : undefined
      },
      false
    );
  }

  function shouldBlockEvent(): boolean {
    if (environment.isLocalhost && !stonksScript?.getAttribute("data-debug")) {
      return true;
    }

    if (environment.isHeadlessBrowser) {
      return true;
    } // ToDo: create env var to allow headless browsers, need it for tests, so put to env var.

    return false;
  }

  if (window.history.pushState) {
    const originalPushState = window.history.pushState;
    window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null | undefined) {
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
