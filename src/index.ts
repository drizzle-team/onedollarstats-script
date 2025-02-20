import type { BodyToSend, Event, ViewArguments } from "./types";
import { parseUtmParams } from "./utils/parse-utm-params";

import { parseProps } from "./utils/props-parser";

window.stonks = {
  event: event,
  view: view,
};

const stonksScript = <HTMLScriptElement>document.currentScript; // ToDo
const useHashRouting = stonksScript?.getAttribute("data-hash-routing") !== null; // ToDo
const environment = {
  isLocalhost:
    /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(
      location.hostname
    ) || location.protocol === "file:",
  isHeadlessBrowser: !!(
    window._phantom ||
    window.__nightmare ||
    window.navigator.webdriver ||
    window.Cypress
  ),
};

async function send(data: Event): Promise<void> {
  const analyticsUrl =
    stonksScript?.getAttribute("data-url") ||
    "https://collector.onedollarstats.com/events";

  const currentPage = new URL(location.href);
  currentPage.search = "";
  if ("path" in data && data.path) {
    currentPage.pathname = data.path; // ToDo: check sho menyaet teyvo
  }
  // remove slash
  const cleanUrl = currentPage.href.replace(/\/$/, "");

  let referrer: string | undefined = data.referrer ?? undefined; // ToDo: collect referrer when user sends event

  if (!referrer) {
    const currentPage = new URL(location.href);
    const docReferrer =
      document.referrer && document.referrer !== "null"
        ? document.referrer
        : undefined;

    if (docReferrer) {
      const referrerURL = new URL(docReferrer);

      if (referrerURL.hostname !== currentPage.hostname) {
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
        p: data.props,
      },
    ],
  };
  if (data.utm && Object.keys(data.utm).length > 0) {
    body.qs = data.utm; // ToDo
  }

  if (navigator.sendBeacon !== undefined) {
    if (navigator.sendBeacon(analyticsUrl, JSON.stringify(body))) {
      return;
    }
  }

  fetch(analyticsUrl, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    method: "POST",
  }).catch((reason: Error) =>
    console.error(`fetch() failed: ${reason.message}`)
  );
}

async function event(
  name: string,
  arg2?: string | Record<string, string>,
  props?: Record<string, string>
) {
  if (shouldBlockEvent()) return;
  let options: {
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
      document.body?.getAttribute("data-s:path") ||
      document
        .querySelector('meta[name="stonks-path"]')
        ?.getAttribute("content");

    if (newPath) {
      path = newPath;
    }
  }

  send({
    type: name,
    props: options?.props,
    path: path,
  });
}

function handleTaggedElementClickEvent(clickEvent: MouseEvent) {
  if (clickEvent.type === "auxclick" && clickEvent.button !== 1) return;

  const target = clickEvent.target as Element;
  const eventName = target.getAttribute("data-s:event");
  if (!eventName) return;
  let propsAttr = target.getAttribute("data-s:event-props");
  let props = propsAttr ? parseProps(propsAttr) : undefined;
  let path = target.getAttribute("data-s:event-path") || undefined;

  event(eventName, path, props);
}

async function view(
  arg1?: string | Record<string, string>,
  arg2?: Record<string, string>
) {
  let options: {
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
      document.body?.getAttribute("data-s:path") ||
      document
        .querySelector('meta[name="stonks-path"]')
        ?.getAttribute("content");

    if (newPath) {
      path = newPath;
    }
  }

  let props = data.props || undefined;
  if (!props) {
    const pageViewProps = stonksScript?.getAttribute("data-props");
    const newProps = pageViewProps ? parseProps(pageViewProps) || {} : {};
    const elements = document.querySelectorAll("[data-s\\:view-props]");
    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s:view-props");
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
    utm,
  });
}

async function triggerPageView(): Promise<void> {
  const shouldCollectPage1 = document
    .querySelector('meta[name="stonks-collect"]')
    ?.getAttribute("content");

  const shouldCollectPage2 = document.body?.getAttribute("data-s:collect");

  if (shouldCollectPage1 === "false" || shouldCollectPage2 === "false") {
    triggerPageView.lastPage = null;
    return;
  }
  const isAutocollect =
    stonksScript?.getAttribute("data-autocollect") === "false" ? false : true;

  if (
    !isAutocollect &&
    shouldCollectPage1 !== "true" &&
    shouldCollectPage2 !== "true"
  ) {
    triggerPageView.lastPage = null;
    return;
  }

  if (!useHashRouting && triggerPageView.lastPage === location.pathname) {
    console.warn(`Ignoring event PageView - pathname has not changed`);
    return;
  }

  if (shouldBlockEvent()) return;

  triggerPageView.lastPage = location.pathname;

  const pageViewProps = stonksScript?.getAttribute("data-props");
  const props = pageViewProps ? parseProps(pageViewProps) || {} : {};
  const elements = document.querySelectorAll("[data-s\\:view-props]");
  for (const el of Array.from(elements)) {
    const propsString = el.getAttribute("data-s:view-props");
    if (!propsString) continue;
    const parsedProps = parseProps(propsString);
    Object.assign(props, parsedProps);
  }

  trackPageView(
    {
      props: Object.keys(props).length > 0 ? props : undefined,
    },
    false
  );
}

namespace triggerPageView {
  export let lastPage: string | null = null;
}

function shouldBlockEvent(): boolean {
  if (
    environment.isLocalhost &&
    !(stonksScript?.getAttribute("data-allow-localhost") === "true"
      ? true
      : false)
  ) {
    return true;
  }

  if (environment.isHeadlessBrowser) {
    return true;
  } // ToDo: create env var to allow headless browsers, need it for tests, so put to env var.

  return false;
}

if (window.history.pushState) {
  const originalPushState = window.history.pushState;
  window.history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null | undefined
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
    if (!triggerPageView.lastPage && document.visibilityState === "visible") {
      triggerPageView();
    }
  });
} else {
  triggerPageView();
}
document.addEventListener("click", handleTaggedElementClickEvent);
