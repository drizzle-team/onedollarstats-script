import puppeteer, { type Page } from "puppeteer";
import { afterAll, afterEach, beforeEach, expect, test, type TestContext } from "vitest";

interface Context extends TestContext {
  page: Page;
  reqs: any[];
  goto: (path: string) => Promise<void>;
}

const EXPO_URL = "http://localhost:8081";
const DEBUG_DOMAIN = "https://example.com";

const browser = await puppeteer.launch({
  args: [
    "--disable-blink-features=AutomationControlled",
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
      u: `${DEBUG_DOMAIN}/`,
      e: [{ t: "PageView" }]
    }
  ]);
});

test("Expo View: nested path is tracked", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/nested/deep`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/nested/deep`,
      e: [{ t: "PageView" }]
    }
  ]);
});

// ─── Expo Web: Navigation Tests ─────────────────────────────────────────────

test("Expo Nav: page to page via Link", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }] }
  ]);
});

test("Expo Nav: home → page-1 → home (back via link)", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  await page.waitForNetworkIdle({ idleTime: 200 });
  await clickAndWaitForRequest(page, reqs, ".link-back");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] }
  ]);
});

test("Expo Nav: navigation to nested page", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-deep");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/nested/deep`, e: [{ t: "PageView" }] }
  ]);
});

test("Expo Nav: browser back triggers PageView", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  const promise = waitForRequest(reqs);
  await page.goBack();
  await promise;

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/page-1`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] }
  ]);
});

// ─── Expo Web: Manual view() Tests ──────────────────────────────────────────

test("Expo Manual View: custom path", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  // first req is the auto pageview
  await clickAndWaitForRequest(page, reqs, "text/Send Custom Path");

  expect(reqs).toStrictEqual([
    { u: `${DEBUG_DOMAIN}/manual-view`, e: [{ t: "PageView" }] },
    { u: `${DEBUG_DOMAIN}/custom-path`, e: [{ t: "PageView" }] }
  ]);
});

test("Expo Manual View: with props only", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  await clickAndWaitForRequest(page, reqs, "text/Send View With Props");

  expect(reqs[1]).toStrictEqual({
    u: `${DEBUG_DOMAIN}/manual-view`,
    e: [{ t: "PageView", p: { campaign: "spring" } }]
  });
});

test("Expo Manual View: path + props", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/manual-view`);
  await clickAndWaitForRequest(page, reqs, "text/Send Path And Props");

  expect(reqs[1]).toStrictEqual({
    u: `${DEBUG_DOMAIN}/landing`,
    e: [{ t: "PageView", p: { campaign: "summer" } }]
  });
});

// ─── Expo Web: Manual event() Tests ─────────────────────────────────────────

test("Expo Event: page_load fired on mount", async ({ reqs, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);

  // auto pageview + page_load event
  expect(reqs).toContainEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "page_load" }]
  });
});

test("Expo Event: plain event on button click", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);
  await clickAndWaitForRequest(page, reqs, "text/Fire Plain Event");

  const lastReq = reqs[reqs.length - 1];
  expect(lastReq).toStrictEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "button_click" }]
  });
});

test("Expo Event: event with props", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}/with-event`);
  await clickAndWaitForRequest(page, reqs, "text/Fire Event With Props");

  const lastReq = reqs[reqs.length - 1];
  expect(lastReq).toStrictEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "signup", p: { plan: "pro" } }]
  });
});

test("Expo Event: uses current pathname after navigation", async ({ reqs, page, goto }: Context) => {
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link-with-event");
  // we are on /with-event, page_load already fired
  const eventReq = reqs.find(r => r.e?.[0]?.t === "page_load");
  expect(eventReq).toEqual({
    u: `${DEBUG_DOMAIN}/with-event`,
    e: [{ t: "page_load" }]
  });
});

// ─── Expo Web: Deduplication Tests ──────────────────────────────────────────

test("Expo Dedup: same path re-navigation fires new PageView (no dedup across navigation)", async ({ reqs, page, goto }: Context) => {
  // Going / → /page-1 → / should produce 3 PageViews (not deduped because each Link click is a fresh nav)
  await goto(`${EXPO_URL}`);
  await clickAndWaitForRequest(page, reqs, ".link");
  await clickAndWaitForRequest(page, reqs, ".link-back");

  expect(reqs.length).toBe(3);
  expect(reqs[0].u).toBe(`${DEBUG_DOMAIN}/`);
  expect(reqs[1].u).toBe(`${DEBUG_DOMAIN}/page-1`);
  expect(reqs[2].u).toBe(`${DEBUG_DOMAIN}/`);
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
  expect(reqs[1]).toStrictEqual({ u: `${DEBUG_DOMAIN}/`, e: [{ t: "PageView" }] });
});
