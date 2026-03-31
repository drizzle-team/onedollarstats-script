import puppeteer, { type Page } from "puppeteer";
import { afterAll, afterEach, beforeEach, expect, test, type TestContext } from "vitest";

interface Context extends TestContext {
  page: Page;
  reqs: any[];
  goto: (path: string) => Promise<void>;
}
const MPA_URL = "http://localhost:4321";
const SPA_URL = "http://localhost:5173";
const DEBUG_DOMAIN = "https://example.com";

const browser = await puppeteer.launch({
  // headless: false,
  args: [
    "--disable-blink-features=AutomationControlled", // show for the tracker that browser is not headless
    ...(process.env.CI ? ["--no-sandbox"] : []),
  ],
});

beforeEach(async (ctx: Context) => {
  const reqs: any[] = [];

  const page = await browser.newPage();
  // Make Puppeteer look like a normal browser so the tracker's detectBot()
  // doesn't block events during tests. Suppresses bot signals:
  // 1. "HeadlessChrome" in UA  — detectHeadless() checks /HeadlessChrome/.test(ua)
  // 2. window.chrome missing   — detectHeadless() checks /Chrome/.test(ua) && !window.chrome
  // 3. navigator.webdriver     — detectWebdriver() checks navigator.webdriver
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

    await page.waitForNetworkIdle({
      idleTime: 100
    });
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

/** Click and wait for the tracker beacon to fire. Use when the click WILL produce a request. */
async function clickAndWaitForPageView(page: Page, reqs: any[], selector: string): Promise<void> {
  const promise = waitForRequest(reqs);
  await page.click(selector);
  await promise;
}

/** Click and settle. Use when the click will NOT produce a tracker request. */
async function clickAndSettle(page: Page, selector: string): Promise<void> {
  await page.click(selector);
  await page.waitForNetworkIdle({ idleTime: 300 });
}

test("View: default page view", async ({ reqs, goto }: Context) => {
  await goto(MPA_URL);

  expect(reqs).toStrictEqual([
    {
      u: DEBUG_DOMAIN,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: no local host allowed", async ({ reqs, goto }: Context) => {
  await goto(MPA_URL + "/no-localhost-allowed");

  expect(reqs).toStrictEqual([]);
});

test("View: autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-autocollect-disabled`);

  expect(reqs).toStrictEqual([]);
});

test("View: ignored by meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-ignore-collection-via-meta`);

  expect(reqs).toStrictEqual([]);
});

test("View: ignored by body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-ignore-collection-via-body`);

  expect(reqs).toStrictEqual([]);
});

test("View: collect page via meta even if autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-collect-via-meta-if-autocollect-disabled`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-collect-via-meta-if-autocollect-disabled`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: collect page via body tag even if autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-collect-via-body-if-autocollect-disabled`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-collect-via-body-if-autocollect-disabled`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: path via body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});
test("View: props via script 'data-props' attribute", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-props-via-script`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-with-props-via-script`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: props via 'data-s:view-props' attributes", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-with-props-via-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: props via meta tag 'stonks-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-props-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-with-props-via-meta`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: props via meta tag merged with script 'data-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-props-via-meta-and-script`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-with-props-via-meta-and-script`,
      e: [{ t: "PageView", h: false, p: { key1: "script1", key2: "meta2", key3: "meta3" } }],
      debug: true
    }
  ]);
});

test("View: props via meta tag merged with dom attributes", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/view-with-props-via-meta-and-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/view-with-props-via-meta-and-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "dom1", key2: "meta2", key3: "meta3" } }],
      debug: true
    }
  ]);
});

test("View: referrer", async ({ reqs, page }: Context) => {
  // await page.goto("http://google.com");
  await page.goto(MPA_URL, { referer: "http://google.com/" });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: DEBUG_DOMAIN,
      e: [{ t: "PageView", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("View: manually with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/manually-view`, {
    referer: "http://google.com/"
  });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view`,
      e: [{ t: "PageView", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("View: manually", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with id='stonks'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/with-id`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/with-id`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with path", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with path via body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with props via script", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-props-via-script`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props-via-script`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with props via dom attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props-via-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with props via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-props-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props-via-meta`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with explicit props merged with meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-explicit-and-meta-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-explicit-and-meta-props`,
      e: [{ t: "PageView", h: false, p: { key1: "meta1", key2: "explicit2", key3: "explicit3" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path via meta and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-via-meta-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path via body attribute and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-via-body-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props via script attribute", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-and-props-via-script`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props via DOM attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/manually-view-with-path-and-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: via dom with path", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: via dom with path via meta tag", async ({
  reqs,

  page
}: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-via-meta`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: via dom with path via body tag", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-via-body`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props through dash and colon", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props-dash-and-colon`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props through dash not colon", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props-dash`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props on 2 parent", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props-on-2-parent`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props on 4 parent, but a tag", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props-on-4-parent-but-a`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom with path and props on 4 parent", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-with-path-and-props-on-4-parent`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([]);
});

test("Event: manually", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event-manually`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually-with-path`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path via body", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event-manually`, {
    referer: "http://google.com/"
  });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event-manually`,
      e: [{ t: "Event", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Event: dom event with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/event`, {
    referer: "http://google.com/"
  });
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event`,
      e: [{ t: "Event", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Event: manually with props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually-with-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event-manually-with-props`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/event-manually-with-path-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

//SPA
test("SPA: page to page navigation", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");

  expect(reqs).toStrictEqual([
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/layout`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/layout/page-1`,
      debug: true
    }
  ]);
});

test("SPA: page to page navigation inside of layout, with autocollect disabled", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout-autocollect-disabled`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndSettle(page, ".link");
  await clickAndSettle(page, ".link-2");

  expect(reqs).toStrictEqual([]);
});

test("SPA: collect even if autocollect is disabled", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout-autocollect-disabled/collect-via-meta`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndSettle(page, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/layout-autocollect-disabled/collect-via-meta/page-1`,
      debug: true
    }
  ]);
});

test("SPA: ignore collect", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout/ignore-collect`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndSettle(page, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/layout/ignore-collect`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/layout/ignore-collect`,
      debug: true
    }
  ]);
});

test("SPA: navigate with props", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/navigation-with-props`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-props`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView",
          p: {
            prop1: "value1"
          }
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-props/page-1`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-props`,
      debug: true
    }
  ]);
});

test("SPA: navigate with meta tag props", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/navigation-with-meta-props`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-meta-props`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView",
          p: {
            prop1: "value1"
          }
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-meta-props/page-1`,
      debug: true
    },
    {
      e: [
        {
          h: false,
          t: "PageView"
        }
      ],
      u: `${DEBUG_DOMAIN}/navigation-with-meta-props`,
      debug: true
    }
  ]);
});

test("SPA: popstate event inside of layout", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout/popstate`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");

  const popstatePromise = waitForRequest(reqs);
  await page.evaluate(() => {
    window.history.back();
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  });
  await popstatePromise;
  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/layout/popstate`,
      e: [{ t: "PageView", h: false }],
      debug: true
    },
    {
      u: `${DEBUG_DOMAIN}/layout/popstate/page-1`,
      e: [{ t: "PageView", h: false }],
      debug: true
    },
    {
      u: `${DEBUG_DOMAIN}/layout/popstate`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

// other tests for utm params are in parse-utm-params.test.ts
test("View: UTM params", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_term=term&utm_content=content`);

  expect(reqs).toStrictEqual([
    {
      u: DEBUG_DOMAIN,
      e: [
        {
          t: "PageView",
          h: false
        }
      ],
      qs: {
        utm_source: "source",
        utm_medium: "medium",
        utm_campaign: "campaign",
        utm_term: "term",
        utm_content: "content"
      },
      debug: true
    }
  ]);
});
test("No single-letter global variables in window", async ({ page, goto }: Context) => {
  await goto(MPA_URL); // замени на свой путь при необходимости

  const singleLetterGlobals = await page.evaluate(() => {
    return Object.getOwnPropertyNames(window).filter((k) => /^[a-zA-Z]$/.test(k));
  });

  expect(singleLetterGlobals).toStrictEqual([]);
});

test("shouldBlockEvent: blocks events in headless browser", async () => {
  const headlessBrowser = await puppeteer.launch({
    headless: true,
    args: [...(process.env.CI ? ["--no-sandbox"] : [])],
  });
  const headlessPage = await headlessBrowser.newPage();

  const headlessReqs: unknown[] = [];
  await headlessPage.setRequestInterception(true);
  headlessPage.on("request", (interceptedRequest) => {
    if (interceptedRequest.url() === "https://collector.onedollarstats.com/events") {
      const body = interceptedRequest.postData();
      if (body) {
        headlessReqs.push(JSON.parse(body));
      }
    }
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    if (interceptedRequest.url().endsWith(".png") || interceptedRequest.url().endsWith(".jpg")) interceptedRequest.abort();
    else interceptedRequest.continue();
  });

  await headlessPage.goto(MPA_URL);
  await headlessPage.waitForNetworkIdle({ idleTime: 100 });

  expect(headlessReqs).toStrictEqual([]);

  await headlessBrowser.close();
});

async function createBotPage(userAgent?: string, extraCdpCommands?: (page: any) => Promise<void>) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [...(process.env.CI ? ["--no-sandbox"] : [])],
  });
  const page = await browser.newPage();

  if (userAgent) {
    await page.setUserAgent(userAgent);
  }

  if (extraCdpCommands) {
    await extraCdpCommands(page);
  }

  const reqs: unknown[] = [];
  await page.setRequestInterception(true);
  page.on("request", (interceptedRequest) => {
    if (interceptedRequest.url() === "https://collector.onedollarstats.com/events") {
      const body = interceptedRequest.postData();
      if (body) {
        reqs.push(JSON.parse(body));
      }
    }
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    if (interceptedRequest.url().endsWith(".png") || interceptedRequest.url().endsWith(".jpg")) interceptedRequest.abort();
    else interceptedRequest.continue();
  });

  await page.goto(MPA_URL);
  await page.waitForNetworkIdle({ idleTime: 100 });

  return { browser, page, reqs };
}

test("shouldBlockEvent: blocks events with webdriver flag", async () => {
  const { browser, page, reqs } = await createBotPage(undefined, async (p) => {
    await p.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => true });
    });
  });

  expect(reqs).toStrictEqual([]);
  await browser.close();
});

test(
  "shouldBlockEvent: blocks events with bot UA string",
  { timeout: 15000 },
  async () => {
    const { browser, reqs } = await createBotPage(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    );

    expect(reqs).toStrictEqual([]);
    await browser.close();
  },
);

test("shouldBlockEvent: blocks events with automation globals", async () => {
  const { browser, page, reqs } = await createBotPage(undefined, async (p) => {
    await p.evaluateOnNewDocument(() => {
      (window as any).__webdriver_evaluate = true;
      (window as any).__selenium_evaluate = true;
    });
  });

  expect(reqs).toStrictEqual([]);
  await browser.close();
});

test("shouldBlockEvent: blocks events with Chrome runtime missing", async () => {
  const { browser, page, reqs } = await createBotPage(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    async (p) => {
      await p.evaluateOnNewDocument(() => {
        delete (window as any).chrome;
      });
    }
  );

  expect(reqs).toStrictEqual([]);
  await browser.close();
});
// --- Release
// --- Release
// ToDo:
// - Hash Routing
// - navigator.sendBeacon works
// - https://tigerabrodi.blog/patterns-for-improving-inp#heading-introduction-to-inp
