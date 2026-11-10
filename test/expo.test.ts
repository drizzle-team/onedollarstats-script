import puppeteer, { type Page } from "puppeteer";
import { afterAll, afterEach, beforeEach, expect, test, type TestContext } from "vitest";

interface Context extends TestContext {
  page: Page;
  reqs: any[];
  goto: (path: string) => Promise<void>;
}

const EXPO_URL = "http://localhost:8081";
const DEBUG_DOMAIN = "https://example.com";
// Second build: no devmode, includePages ['/page-1'] (see test/expo/app/_layout.tsx)
const EXPO_PROD_BUILD_URL = "http://localhost:8082";
// prod.test resolves to 127.0.0.1, so the tracker sees a real domain instead of localhost
const PROD_HOST = "prod.test";

const browser = await puppeteer.launch({
  args: [
    "--disable-blink-features=AutomationControlled",
    `--host-resolver-rules=MAP ${PROD_HOST} 127.0.0.1`,
    ...(process.env.CI ? ["--no-sandbox"] : []),
  ],
});

beforeEach(async (ctx: Context) => {
  const reqs: any[] = [];

  const page = await browser.newPage();
  const defaultUA = await browser.userAgent();
  await page.setUserAgent(defaultUA.replace("HeadlessChrome", "Chrome"));
  await page.evaluateOnNewDocument(() => {
    (window as any).chrome = { runtime: {} };
    Object.defineProperty(Navigator.prototype, "webdriver", {
      get: () => false,
      configurable: true,
    });
  });
  await page.setRequestInterception(true);
  page.on("request", (interceptedRequest) => {
    const url = interceptedRequest.url();
    if (url.includes("https://collector.onedollarstats.com/events")) {
      try {
        const body = interceptedRequest.postData();
        if (body) {
          reqs.push(JSON.parse(body));
        } else {
          const dataParam = new URL(url).searchParams.get("data");
          if (dataParam) {
            const json = Buffer.from(dataParam, "base64").toString("utf-8");
            reqs.push(JSON.parse(json));
          }
        }
      } catch (e) {
        console.error(`[test] Failed to parse tracker request: ${e}`);
      }
    }
    if (interceptedRequest.isInterceptResolutionHandled()) return;

    if (interceptedRequest.url().endsWith(".png") || interceptedRequest.url().endsWith(".jpg")) interceptedRequest.abort();
    else interceptedRequest.continue();
  });
  await page.setViewport({ width: 1080, height: 1024 });

  ctx.page = page;
  ctx.goto = async (path: string) => {
    await page.goto(path);
    await page.waitForNetworkIdle({ idleTime: 100 });
  };
  ctx.reqs = reqs;
});

afterEach(async (ctx: Context) => {
  await ctx.page.close();
});

afterAll(async () => {
  await browser.close();
});

/** Wait for reqs array to grow by at least 1. Polls every 50ms, times out at 5s. */
function waitForRequest(reqs: any[], timeout = 5000): Promise<void> {
  const initialLength = reqs.length;
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (reqs.length > initialLength) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve();
      }
    }, 50);
    const timer = setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Timed out waiting for tracker request (had ${initialLength}, still ${reqs.length})`));
    }, timeout);
  });
}

/** For "nothing was sent" checks: give the tracker time to fire anyway. */
const settle = () => new Promise((r) => setTimeout(r, 500));

/** Same page on prod.test instead of localhost. */
const onProdHost = (url: string) => url.replace("localhost", PROD_HOST);

/** Click and wait for the tracker beacon to fire. */
async function clickAndWaitForRequest(page: Page, reqs: any[], selector: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true });
  const promise = waitForRequest(reqs);
  await page.click(selector);
  await promise;
}

// ─── Expo Web: PageView Tests ───────────────────────────────────────────────

test("Expo View: initial page view", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}`,
      e: [{ t: "PageView" }],
      debug: true
    }
  ]);
});

test("Expo View: nested path is tracked", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/nested/deep`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/nested/deep`,
      e: [{ t: "PageView" }],
      debug: true
    }
  ]);
});

// ─── Expo Web: Dynamic routes (collapseDynamicRoutes, on by default) ─────────

test("Expo Dynamic Route: /profile/abc123 is reported as /profile/[id]", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/profile/abc123`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/profile/[id]`,
      e: [{ t: "PageView" }],
      debug: true
    }
  ]);
});

test("Expo Dynamic Route: navigating from / to /profile/abc123 reports /profile/[id]", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-profile");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/profile/[id]`, e: [{ t: "PageView" }], debug: true }
  ]);
});

// ─── Expo Web: Navigation Tests ─────────────────────────────────────────────

test("Expo Nav: page to page via Link", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo Nav: home → page-1 → home (back via link)", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  await page.waitForNetworkIdle({ idleTime: 200 });
  await clickAndWaitForRequest(page, reqs, ".link-back");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo Nav: navigation to nested page", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-deep");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/nested/deep`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo Nav: browser back triggers PageView", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  const promise = waitForRequest(reqs);
  await page.goBack();
  await promise;

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true }
  ]);
});

// ─── Expo Web: Manual view() Tests ──────────────────────────────────────────

test("Expo Manual View: custom path", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  // first req is the auto pageview
  await clickAndWaitForRequest(page, reqs, "text/Send Custom Path");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/manual-view`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/custom-path`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo Manual View: with props only", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  await clickAndWaitForRequest(page, reqs, "text/Send View With Props");

  expect(reqs[1]).toStrictEqual({
    u: `${DEBUG_DOMAIN}/manual-view`,
    e: [{ t: "PageView", p: { campaign: "spring" } }],
    debug: true
  });
});

test("Expo Manual View: path + props", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  await clickAndWaitForRequest(page, reqs, "text/Send Path And Props");

  expect(reqs[1]).toStrictEqual({
    u: `${DEBUG_DOMAIN}/landing`,
    e: [{ t: "PageView", p: { campaign: "summer" } }],
    debug: true
  });
});

// ─── Expo Web: Manual event() Tests ─────────────────────────────────────────

test("Expo Event: page_load fired on mount", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);

  // auto pageview + page_load event
  expect(reqs).toContainEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "page_load" }],
    debug: true
  });
});

test("Expo Event: plain event on button click", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);
  await clickAndWaitForRequest(page, reqs, "text/Fire Plain Event");

  const lastReq = reqs[reqs.length - 1];
  expect(lastReq).toStrictEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "button_click" }],
    debug: true
  });
});

test("Expo Event: event with props", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);
  await clickAndWaitForRequest(page, reqs, "text/Fire Event With Props");

  const lastReq = reqs[reqs.length - 1];
  expect(lastReq).toStrictEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "signup", p: { plan: "pro" } }],
    debug: true
  });
});

test("Expo Event: uses current pathname after navigation", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-with-event");
  // we are on /with-event, page_load already fired
  const eventReq = reqs.find(r => r.e?.[0]?.t === "page_load");
  expect(eventReq).toEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "page_load" }],
    debug: true
  });
});

// ─── Expo Web: Deduplication Tests ──────────────────────────────────────────

test("Expo Dedup: same path re-navigation fires new PageView (no dedup across navigation)", async ({ reqs, page, goto }: Context) => {
  // Going / → /page-1 → / should produce 3 PageViews (not deduped because each Link click is a fresh nav)
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  await clickAndWaitForRequest(page, reqs, ".link-back");

  expect(reqs.length).toBe(3);
  expect(reqs[0].u).toBe(`${DEBUG_DOMAIN}`);
  expect(reqs[1].u).toBe(`${DEBUG_DOMAIN}/page-1`);
  expect(reqs[2].u).toBe(`${DEBUG_DOMAIN}`);
});

test("Expo Dedup: initial mount fires only once", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  // Wait for additional possible duplicate requests
  await new Promise(r => setTimeout(r, 500));

  expect(reqs.length).toBe(1);
});

// ─── Expo Web: AppState foreground (via visibilitychange) ───────────────────

test("Expo Foreground: visibility=visible refires PageView", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  expect(reqs.length).toBe(1);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await new Promise(r => setTimeout(r, 100));

  const promise = waitForRequest(reqs);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await promise;

  expect(reqs.length).toBe(2);
  expect(reqs[1]).toStrictEqual({ u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true });
});

// ─── Expo Web: Page filters (excludePages: ['/excluded']) ───────────────────

test("Expo Filters: excluded page sends nothing", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/excluded`);
  await settle();

  expect(reqs).toStrictEqual([]);
});

test("Expo Filters: home → excluded → home counts home twice", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await page.click(".link-excluded");
  await page.waitForFunction(() => location.pathname === "/excluded");
  await clickAndWaitForRequest(page, reqs, ".link-back");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true }
  ]);
});

// ─── Expo Web: Modal, tabs and 404 ──────────────────────────────────────────

test("Expo Modal: opening tracks /modal, closing tracks home again", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-modal");
  await clickAndWaitForRequest(page, reqs, "text/Close Modal");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/modal`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo Tabs: (tabs) group is left out of the path, each tab is tracked", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-feed");
  await clickAndWaitForRequest(page, reqs, "text/Inbox Tab");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/feed`, e: [{ t: "PageView" }], debug: true },
    { u: `${DEBUG_DOMAIN}/inbox`, e: [{ t: "PageView" }], debug: true }
  ]);
});

test("Expo 404: unknown routes are all reported as /+not-found", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/does-not-exist`);

  expect(reqs).toStrictEqual([{ u: `${DEBUG_DOMAIN}/+not-found`, e: [{ t: "PageView" }], debug: true }]);
});

// ─── Expo Web: Production vs development ────────────────────────────────────

test("Expo Production: devmode is ignored on a real domain (debug: false)", async ({ reqs, goto }: Context) => {
  await goto(onProdHost(`${EXPO_URL}`));

  expect(reqs).toStrictEqual([{ u: `${DEBUG_DOMAIN}`, e: [{ t: "PageView" }], debug: false }]);
});

test("Expo Production: custom events on a real domain have debug: false", async ({ reqs, goto }: Context) => {
  await goto(onProdHost(`${EXPO_URL}/with-event`));

  expect(reqs).toContainEqual({ u: `${DEBUG_DOMAIN}/with-event`, e: [{ t: "page_load" }], debug: false });
});

test("Expo Dev Gating: localhost without devmode sends nothing, not even manual events", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_PROD_BUILD_URL}`);
  await goto(`${EXPO_PROD_BUILD_URL}/with-event`);
  await settle();

  expect(reqs).toStrictEqual([]);
});

test("Expo Production: build without devmode sends on a real domain", async ({ reqs, goto }: Context) => {
  await goto(onProdHost(`${EXPO_PROD_BUILD_URL}/page-1`));

  expect(reqs).toStrictEqual([{ u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }], debug: false }]);
});

test("Expo Production: page outside includePages sends no PageView", async ({ reqs, goto }: Context) => {
  await goto(onProdHost(`${EXPO_PROD_BUILD_URL}/page-2`));
  await settle();

  expect(reqs).toStrictEqual([]);
});

test("Expo Production: manual events ignore includePages", async ({ reqs, goto }: Context) => {
  await goto(onProdHost(`${EXPO_PROD_BUILD_URL}/with-event`));
  await settle();

  expect(reqs).toStrictEqual([{ u: `${DEBUG_DOMAIN}/with-event`, e: [{ t: "page_load" }], debug: false }]);
});
