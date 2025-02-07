"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/deprecated/index.ts
var deprecated_exports = {};
module.exports = __toCommonJS(deprecated_exports);
var PROD_URL = "https://api.onedollarstats.com/events";
var scriptElement = document.currentScript;
var useHashRouting = getUseHashRouting(scriptElement);
async function sendEvent(data, queryParams) {
  const newData = {
    ...await getBaseEvent(),
    e: [
      {
        h: useHashRouting,
        ...data
      }
    ]
  };
  if (queryParams && Object.keys(queryParams).length > 0) {
    newData.qs = queryParams;
  }
  if (navigator.sendBeacon !== void 0) {
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
      "Content-Type": "application/json"
    },
    keepalive: true,
    method: "POST"
  }).catch(
    (reason) => console.error(`fetch() failed: ${reason.message}`)
  );
}
async function getBaseEvent() {
  const currentPage = new URL(location.href);
  currentPage.search = "";
  return {
    u: currentPage.href
  };
}
function getUTMParams() {
  const urlParams = new URLSearchParams(location.search);
  const utmParams = {};
  [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_term",
    "utm_content"
  ].forEach((key) => {
    const value = urlParams.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });
  return utmParams;
}
async function triggerPageView() {
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
  const referrer = document.referrer ? new URL(document.referrer) : void 0;
  if (referrer) {
    referrer.search = "";
  }
  const utmParams = getUTMParams();
  sendEvent(
    {
      t: "PageView",
      r: referrer && referrer.hostname !== currentPage.hostname ? referrer.href : void 0
    },
    utmParams
  );
}
((triggerPageView2) => {
  triggerPageView2.lastPage = null;
})(triggerPageView || (triggerPageView = {}));
if (window.history.pushState) {
  const originalPushState = window.history.pushState;
  window.history.pushState = function(data, unused, url) {
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
async function trackCustomEvent(name, data) {
  sendEvent({
    t: name,
    p: data || void 0
  });
}
function getAnalyticsUrl() {
  const scriptEl = document.querySelector("#stonks") || document.currentScript;
  const url = scriptEl?.getAttribute("data-url");
  return url || PROD_URL;
}
window.trackCustomEvent = trackCustomEvent;
function getUseHashRouting(scriptElement2) {
  return scriptElement2.getAttribute("data-hash-routing") !== null;
}
function isLocalhostAllowed() {
  const scriptEl = document.querySelector("#stonks") || document.currentScript;
  const value = scriptEl?.getAttribute("data-allow-localhost");
  if (value === null) {
    return false;
  }
  return value === "false" ? false : true;
}
function isOnLocalhost() {
  return /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(
    location.hostname
  ) || location.protocol === "file:";
}
function isHeadlessBrowser() {
  return !!(window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress);
}
function isIgnoreFlagSet() {
  return window.localStorage.getItem("unexpected_ignore") === "true";
}
function ignoreEvent(type, reason) {
  console.warn(`Ignoring event "${type}": ${reason}`);
}
