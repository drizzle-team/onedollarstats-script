"use strict";

// src/utils/parse-utm-params.ts
function parseUtmParams(urlSearchParams) {
  const utm = {};
  [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content"
  ].forEach((key) => {
    const value = urlSearchParams.get(key);
    if (value) {
      utm[key] = value;
    }
  });
  return utm;
}

// src/utils/props-parser.ts
function parseProps(propsString) {
  if (!propsString) return void 0;
  const splittedProps = propsString.split(";");
  const propsObj = {};
  for (const keyValueString of splittedProps) {
    const keyValuePair = keyValueString.split("=").map((el) => el.trim());
    if (keyValuePair.length !== 2 || keyValuePair[0] === "" || keyValuePair[1] === "")
      continue;
    propsObj[keyValuePair[0]] = keyValuePair[1];
  }
  return Object.keys(propsObj).length === 0 ? void 0 : propsObj;
}

// src/index.ts
(function() {
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
  const environment = {
    isLocalhost: /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(
      location.hostname
    ) || location.protocol === "file:",
    isHeadlessBrowser: !!(window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress)
  };
  async function send(data) {
    const analyticsUrl = stonksScript?.getAttribute("data-url") || "https://collector.onedollarstats.com/events";
    let urlToSend = new URL(location.href);
    const debugAttribute = stonksScript.getAttribute("data-debug");
    let isDebug = false;
    if (debugAttribute) {
      try {
        const debugUrl = new URL(
          `https://${debugAttribute}${urlToSend.pathname}`
        );
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
          // ToDo: why we send hash routing
          r: referrer,
          p: data.props
        }
      ]
    };
    if (isDebug) {
      body.debug = isDebug;
    }
    if (data.utm && Object.keys(data.utm).length > 0) {
      body.qs = data.utm;
    }
    if (navigator.sendBeacon !== void 0) {
      if (navigator.sendBeacon(analyticsUrl, JSON.stringify(body))) {
        return;
      }
    }
    fetch(analyticsUrl, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true,
      method: "POST"
    }).catch(
      (reason) => console.error(`fetch() failed: ${reason.message}`)
    );
  }
  async function event(name, arg2, props) {
    if (shouldBlockEvent()) return;
    let options = {};
    if (typeof arg2 === "string") {
      options.path = arg2;
      if (props) options.props = props;
    } else if (typeof arg2 === "object") {
      options.props = arg2;
    }
    let path = options?.path || void 0;
    if (!path) {
      const newPath = document.body?.getAttribute("data-s:path") || document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");
      if (newPath) {
        path = newPath;
      }
    }
    send({
      type: name,
      props: options?.props,
      path
    });
  }
  function handleTaggedElementClickEvent(clickEvent) {
    if (clickEvent.type === "auxclick" && clickEvent.button !== 1) return;
    const target = clickEvent.target;
    const eventName = target.getAttribute("data-s:event");
    if (!eventName) return;
    let propsAttr = target.getAttribute("data-s:event-props");
    let props = propsAttr ? parseProps(propsAttr) : void 0;
    let path = target.getAttribute("data-s:event-path") || void 0;
    event(eventName, path, props);
  }
  async function view(arg1, arg2) {
    let options = {};
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
    console.log("trackPageView");
    if (checkBlock && shouldBlockEvent()) return;
    const urlParams = new URLSearchParams(location.search);
    const utm = parseUtmParams(urlParams);
    let path = data?.path || void 0;
    if (!path) {
      const newPath = document.body?.getAttribute("data-s:path") || document.querySelector('meta[name="stonks-path"]')?.getAttribute("content");
      if (newPath) {
        path = newPath;
      }
    }
    let props = data.props || void 0;
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
      props: Object.keys(props).length > 0 ? props : void 0,
      path,
      utm
    });
  }
  async function triggerPageView() {
    const shouldCollectPage1 = document.querySelector('meta[name="stonks-collect"]')?.getAttribute("content");
    const shouldCollectPage2 = document.body?.getAttribute("data-s:collect");
    if (shouldCollectPage1 === "false" || shouldCollectPage2 === "false") {
      lastPage = null;
      return;
    }
    const isAutocollect = stonksScript?.getAttribute("data-autocollect") === "false" ? false : true;
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
    const elements = document.querySelectorAll("[data-s\\:view-props]");
    for (const el of Array.from(elements)) {
      const propsString = el.getAttribute("data-s:view-props");
      if (!propsString) continue;
      const parsedProps = parseProps(propsString);
      Object.assign(props, parsedProps);
    }
    trackPageView(
      {
        props: Object.keys(props).length > 0 ? props : void 0
      },
      false
    );
  }
  function shouldBlockEvent() {
    if (environment.isLocalhost && !stonksScript?.getAttribute("data-debug")) {
      return true;
    }
    if (environment.isHeadlessBrowser) {
      return true;
    }
    return false;
  }
  if (window.history.pushState) {
    const originalPushState = window.history.pushState;
    window.history.pushState = function(data, unused, url) {
      console.log("pushstate");
      originalPushState.apply(this, [data, unused, url]);
      window.requestAnimationFrame(() => {
        triggerPageView();
      });
    };  
    window.addEventListener("popstate", () => {
      console.log("popstate");
      window.requestAnimationFrame(() => {
        triggerPageView();
      });
    });
  }
  if (document.visibilityState !== "visible") {
    document.addEventListener("visibilitychange", () => {
      if (!lastPage && document.visibilityState === "visible") {
        console.log("visibilitychange");
        triggerPageView();
      }
    });
  } else {
    console.log("visibilitychange");
    triggerPageView();
  }
  document.addEventListener("click", handleTaggedElementClickEvent);
})();
