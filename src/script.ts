import type { BodyToSend, Event, ViewArguments } from "./types";
import { detectBot } from "./utils/bot";
import { createDebugModal } from "./utils/create-modal";
import { getEnvironment } from "./utils/environment";
import { extractHostName } from "./utils/extract-hostname";
import { defaultConfig } from "./utils/merge-config";
import { parseUtmParams } from "./utils/parse-utm-params";
import { parseProps } from "./utils/props-parser";
import { resolvePath } from "./utils/resolve-path";

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
    view: view,
  };

  const stonksScript = document.currentScript as HTMLScriptElement;
  const useHashRouting = stonksScript?.getAttribute("data-hash-routing") !== null;
  const { isLocalhost: isLocalEnvironment } = getEnvironment();

  if (isLocalEnvironment) {
    const { hostname, devmode } = extractHostName(stonksScript, isLocalEnvironment);

    console.log(`[onedollarstats]\nScript successfully connected! ${hostname ? `Tracking your localhost as ${hostname}` : "Debug domain not set"}`);

    if (devmode && hostname) {
      const analyticsUrl = stonksScript?.getAttribute("data-url") || defaultConfig.collectorUrl;
      const modalLog = createDebugModal(hostname, analyticsUrl);
      window.__stonksModalLog = modalLog;
    }
  }

  async function sendWithBeaconOrFetch(
    analyticsUrl: string,
    stringifiedBody: string,
    callback: (success: boolean) => void,
  ): Promise<void> {
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
      keepalive: true,
    })
      .then(() => callback(true))
      .catch((err: Error) => {
        console.error("[onedollarstats] fetch() failed:", err.message);
        callback(false);
      });
  }

  async function send(data: Event): Promise<void> {
    const analyticsUrl =
      stonksScript?.getAttribute("data-url") || defaultConfig.collectorUrl;

    const { hostname, devmode } = extractHostName(stonksScript, isLocalEnvironment);

    const urlToSend: URL = new URL(hostname ? `https://${hostname}${location.pathname}` : location.href);

    urlToSend.search = "";
    if (data.path) {
      urlToSend.pathname = data.path;
    }
    // remove trailing slash
    const cleanUrl = urlToSend.href.replace(/\/$/, "");

    let referrer: string | undefined = data.referrer ?? undefined;

    if (!referrer) {
      const docReferrer =
        document.referrer && document.referrer !== "null"
          ? document.referrer
          : undefined;

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
      let logMessage = `[onedollarstats]\nEvent name: ${data.type}\nEvent collected from: ${cleanUrl}`;
      if (data.props && Object.keys(data.props).length > 0)
        logMessage += `\nProps: ${JSON.stringify(data.props, null, 2)}`;
      if (referrer) logMessage += `\nReferrer: ${referrer}`;
      if (useHashRouting) logMessage += `\nHashRouting: ${useHashRouting}`;
      if (data.utm && Object.keys(data.utm).length > 0)
        logMessage += `\nUTM: ${data.utm}`;

      console.log(logMessage);
    }

    const onComplete = (success: boolean) =>
      window.__stonksModalLog?.(
        `${data.type} ${success ? "sent" : "failed to send"}`,
        success,
      );
    // Prepare the event payload
    const stringifiedBody = JSON.stringify(body);

    // Encode for safe inclusion in a query string (UTF-8 -> Base64)
    const bytes = new TextEncoder().encode(stringifiedBody); // UTF-8 -> bytes
    const bin = String.fromCharCode(...bytes); // bytes -> binary string
    const payloadBase64 = btoa(bin); // binary -> Base64

    const safeGetThreshold = 1500; // limit for query-string-containing URLs
    const tryImageBeacon = payloadBase64.length <= safeGetThreshold;

    if (tryImageBeacon) {
      // Send via image beacon
      const img = new Image(1, 1);

      img.onload = () => onComplete(true);
      // If loading image fails (server unavailable, blocked, etc.)
      img.onerror = () =>
        sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);

      // Primary attempt: send data via image beacon (GET request with query string)
      img.src = `${analyticsUrl}?data=${payloadBase64}`;
    } else
      await sendWithBeaconOrFetch(analyticsUrl, stringifiedBody, onComplete);
  }

  async function event(
    name: string,
    arg2?: string | Record<string, string>,
    props?: Record<string, string>,
  ) {
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

    const path = resolvePath(options?.path || undefined);

    send({ type: name, props: options?.props, path: path !== location.pathname ? path : undefined });
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
      const eventName =
        el.getAttribute("data-s-event") || el.getAttribute("data-s:event");
      if (eventName) {
        const propsAttr =
          el.getAttribute("data-s-event-props") ||
          el.getAttribute("data-s:event-props");
        const props = propsAttr ? parseProps(propsAttr) : undefined;
        const path =
          el.getAttribute("data-s-event-path") ||
          el.getAttribute("data-s:event-path") ||
          undefined;

        event(eventName, path ?? props, props);

        return;
      }

      el = el.parentElement;
      depth++;

      // If not in <a>/<button>, stop after 3 levels
      if (!insideInteractive && depth >= 3) break;
    }
  }

  async function view(
    arg1?: string | Record<string, string>,
    arg2?: Record<string, string>,
  ) {
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
        props: options?.props,
      },
      false,
    );
  }

  async function trackPageView(
    data: ViewArguments,
    checkBlock: boolean = true,
  ) {
    if (checkBlock && shouldBlockEvent()) return;

    const urlParams = new URLSearchParams(location.search);
    const utm = parseUtmParams(urlParams);

    const path = resolvePath(data?.path || undefined);
    // Only pass path if it differs from the current pathname
    const customPath = path !== location.pathname ? path : undefined;

    const pageViewProps = stonksScript?.getAttribute("data-props");
    const collectedProps: Record<string, string> = pageViewProps
      ? parseProps(pageViewProps) || {}
      : {};
    const elements = document.querySelectorAll(
      "[data-s\\:view-props], [data-s-view-props]",
    );
    for (const el of Array.from(elements)) {
      const propsString =
        el.getAttribute("data-s-view-props") ||
        el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(collectedProps, parsedProps);
    }
    const metaViewProps = document
      .querySelector('meta[name="stonks-props"]')
      ?.getAttribute("content");
    if (metaViewProps) {
      Object.assign(collectedProps, parseProps(metaViewProps));
    }
    if (data.props) {
      Object.assign(collectedProps, data.props);
    }
    const props =
      Object.keys(collectedProps).length > 0 ? collectedProps : undefined;
    send({
      type: "PageView",
      props,
      path: customPath,
      utm,
    });
  }

  async function triggerPageView(): Promise<void> {
    const shouldCollectPage1 = document
      .querySelector('meta[name="stonks-collect"]')
      ?.getAttribute("content");

    const shouldCollectPage2 =
      document.body?.getAttribute("data-s-collect") ||
      document.body?.getAttribute("data-s:collect");

    if (shouldCollectPage1 === "false" || shouldCollectPage2 === "false") {
      lastPage = null;
      return;
    }
    const isAutocollect =
      stonksScript?.getAttribute("data-autocollect") !== "false";

    if (
      !isAutocollect &&
      shouldCollectPage1 !== "true" &&
      shouldCollectPage2 !== "true"
    ) {
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
      "[data-s\\:view-props], [data-s-view-props]",
    );
    for (const el of Array.from(elements)) {
      const propsString =
        el.getAttribute("data-s-view-props") ||
        el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(props, parsedProps);
    }
    const metaViewProps = document
      .querySelector('meta[name="stonks-props"]')
      ?.getAttribute("content");
    if (metaViewProps) {
      Object.assign(props, parseProps(metaViewProps));
    }

    trackPageView(
      {
        props: Object.keys(props).length > 0 ? props : undefined,
      },
      false,
    );
  }

  function shouldBlockEvent(): boolean {
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
    window.history.pushState = function (
      data: unknown,
      unused: string,
      url?: string | URL | null | undefined,
    ) {
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
