declare global {
  interface Window {
    Cypress?: unknown;
    __nightmare?: unknown;
    _phantom?: unknown;
    unexpected?: {
      q?: Event[];
    };
    trackCustomEvent: (
      name: string,
      data: { [key: string]: string | number | boolean }
    ) => Promise<void>;
  }
}

export type EventType = "PageView" | string;

export interface EventBase {
  t: EventType;
  u: string;
  v?: string;
}

export interface EventPageView extends EventBase {
  t: "PageView";
  h?: boolean;
  r?: string;
}

export interface EventCustom extends EventBase {
  t: string;
  h?: boolean;
  p?: {
    [key: string]: boolean | string | number;
  };
}

export type Event = EventPageView;

type EventStripMetadata<T extends EventBase> = Omit<T, "s" | "u">;

export type EventPageViewReduced = EventStripMetadata<EventPageView>;
export type EventCustomEventReduced = EventStripMetadata<EventCustom>;

export interface CombinedEvents {
  u: string;
  e: [EventPageViewReduced | EventCustomEventReduced];
  qs?: Record<string, string>;
}

const PROD_URL = "https://api.onedollarstats.com/events";
// const API_URL = "https://test-api.onedollarstats.com/events";
const scriptElement = <HTMLScriptElement>document.currentScript!;
const useHashRouting = getUseHashRouting(scriptElement);

async function sendEvent(
  data: EventPageViewReduced | EventCustomEventReduced,
  queryParams?: Record<string, string>
): Promise<void> {
  const newData: CombinedEvents = {
    ...(await getBaseEvent()),
    e: [
      {
        h: useHashRouting,
        ...data,
      },
    ],
  };

  if (queryParams && Object.keys(queryParams).length > 0) {
    newData.qs = queryParams;
  }
  if (navigator.sendBeacon !== undefined) {
    if (navigator.sendBeacon(getAnalyticsUrl(), JSON.stringify(newData))) {
      return;
    }
    console.warn(
      "sendBeacon() didn't queue the request, falling back to fetch()"
    );
  }

  fetch(getAnalyticsUrl(), {
    body: JSON.stringify(newData),
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    method: "POST",
  }).catch((reason: Error) =>
    console.error(`fetch() failed: ${reason.message}`)
  );
}

async function getBaseEvent() {
  const currentPage = new URL(location.href);
  currentPage.search = "";

  return {
    u: currentPage.href,
  };
}

function getUTMParams(): Record<string, string> {
  const urlParams = new URLSearchParams(location.search);
  const utmParams: Record<string, string> = {};

  [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content",
  ].forEach((key) => {
    const value = urlParams.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });

  return utmParams;
}

async function triggerPageView(): Promise<void> {
  if (isOnLocalhost() && !isLocalhostAllowed()) {
    return ignoreEvent("PageView", "Running on localhost");
  }
  if (isHeadlessBrowser()) {
    return ignoreEvent("PageView", "Running in a headless browser");
  }
  if (isIgnoreFlagSet()) {
    return ignoreEvent("PageView", "Ignore flag is set");
  }

  if (!useHashRouting && triggerPageView.lastPage === location.pathname) {
    return ignoreEvent("PageView", "Pathname has not changed");
  }
  triggerPageView.lastPage = location.pathname;

  const currentPage = new URL(location.href);
  const referrer = document.referrer ? new URL(document.referrer) : undefined;
  if (referrer) {
    referrer.search = "";
  }

  const utmParams = getUTMParams();

  sendEvent(
    {
      t: "PageView",
      r:
        referrer && referrer.hostname !== currentPage.hostname
          ? referrer.href
          : undefined,
    },
    utmParams
  );
}
namespace triggerPageView {
  // biome-ignore lint/style/useConst: <explanation>
  export let lastPage: string | null = null;
}

if (window.history.pushState) {
  const originalPushState = window.history.pushState;
  window.history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null | undefined
  ) {
    originalPushState.apply(this, [data, unused, url]);
    triggerPageView();
  };
  window.addEventListener("popstate", triggerPageView);
}

if (document.visibilityState !== "visible") {
  document.addEventListener("visibilitychange", () => {
    if (!triggerPageView.lastPage && document.visibilityState === "visible") {
      triggerPageView();
    }
  });
} else {
  triggerPageView();
}

// custom events
async function trackCustomEvent(
  name: string,
  data?: { [key: string]: string | number | boolean }
) {
  sendEvent({
    t: name,
    p: data || undefined,
  });
}
function getAnalyticsUrl(): string {
  const scriptEl = document.querySelector("#stonks") || document.currentScript;
  const url = scriptEl?.getAttribute("data-url");

  return url || PROD_URL;
}

window.trackCustomEvent = trackCustomEvent;

function getUseHashRouting(scriptElement: HTMLScriptElement): boolean {
  return scriptElement.getAttribute("data-hash-routing") !== null;
}

function isLocalhostAllowed(): boolean {
  const scriptEl = document.querySelector("#stonks") || document.currentScript;
  const value = scriptEl?.getAttribute("data-allow-localhost");

  if (value === null) {
    return false;
  }

  return value === "false" ? false : true;
}

function isOnLocalhost(): boolean {
  return (
    /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(
      location.hostname
    ) || location.protocol === "file:"
  );
}

function isHeadlessBrowser(): boolean {
  return !!(
    window._phantom ||
    window.__nightmare ||
    window.navigator.webdriver ||
    window.Cypress
  );
}

function isIgnoreFlagSet(): boolean {
  return window.localStorage.getItem("unexpected_ignore") === "true";
}

function ignoreEvent(type: EventType, reason: string): void {
  console.warn(`Ignoring event "${type}": ${reason}`);
}
