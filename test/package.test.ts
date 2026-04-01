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

/** Click and wait for the tracker beacon to fire. */
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

// ─── MPA: Package View Tests ─────────────────────────────────────────────────

test("Pkg View: default page view", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: no local host allowed", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/no-localhost-allowed`);

  expect(reqs).toStrictEqual([]);
});

test("Pkg View: autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-autocollect-disabled`);

  expect(reqs).toStrictEqual([]);
});

test("Pkg View: ignored by meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-ignore-via-meta`);

  expect(reqs).toStrictEqual([]);
});

test("Pkg View: ignored by body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-ignore-via-body`);

  expect(reqs).toStrictEqual([]);
});

test("Pkg View: collect page via meta even if autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-collect-via-meta-if-autocollect-disabled`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/view-collect-via-meta-if-autocollect-disabled`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: collect page via body tag even if autocollect disabled", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-collect-via-body-if-autocollect-disabled`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/view-collect-via-body-if-autocollect-disabled`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: path via body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: props via 'data-s:view-props' attributes", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-with-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/view-with-props-via-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: props via meta tag 'stonks-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-with-props-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/view-with-props-via-meta`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: props via meta tag merged with dom attributes", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/view-with-props-via-meta-and-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/view-with-props-via-meta-and-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "dom1", key2: "meta2", key3: "meta3" } }],
      debug: true
    }
  ]);
});

test("Pkg View: referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg`, { referer: "http://google.com/" });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg`,
      e: [{ t: "PageView", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/manually-view`, {
    referer: "http://google.com/"
  });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view`,
      e: [{ t: "PageView", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Pkg View: manually", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path via body tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view-with-props`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with props via dom attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view-with-props-via-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with props via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-props-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view-with-props-via-meta`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with explicit props merged with meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-explicit-and-meta-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/manually-view-with-explicit-and-meta-props`,
      e: [{ t: "PageView", h: false, p: { key1: "meta1", key2: "explicit2", key3: "explicit3" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path via meta and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-via-meta-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path via body attribute and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-via-body-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg View: manually with path and props via DOM attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/manually-view-with-path-and-props-via-dom-attributes`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

// ─── MPA: Package Event Tests ────────────────────────────────────────────────

test("Pkg Event: via dom", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/event`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Pkg Event: via dom with path", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path`);
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

test("Pkg Event: via dom with path via meta tag", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-via-meta`);
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

test("Pkg Event: via dom with path via body tag", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-via-body`);
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

test("Pkg Event: via dom with path and props", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props`);
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

test("Pkg Event: via dom with path and props through dash and colon", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props-dash-and-colon`);
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

test("Pkg Event: via dom with path and props through dash not colon", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props-dash`);
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

test("Pkg Event: via dom with path and props on 2 parent", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props-on-2-parent`);
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

test("Pkg Event: via dom with path and props on 4 parent, but a tag", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props-on-4-parent-but-a`);
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

test("Pkg Event: via dom with path and props on 4 parent", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-with-path-and-props-on-4-parent`);
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([]);
});

test("Pkg Event: manually", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/event-manually`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with path", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually-with-path`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with path via meta tag", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually-with-path-via-meta`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with path via body", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually-with-path-via-body`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event-manually`, {
    referer: "http://google.com/"
  });
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/event-manually`,
      e: [{ t: "Event", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Pkg Event: dom event with referrer", async ({ reqs, page }: Context) => {
  await page.goto(`${MPA_URL}/pkg/event`, {
    referer: "http://google.com/"
  });
  await page.click(".event-button");
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/event`,
      e: [{ t: "Event", h: false, r: "http://google.com/" }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually-with-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg/event-manually-with-props`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Pkg Event: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg/event-manually-with-path-and-props`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

// ─── SPA: Package Tests ──────────────────────────────────────────────────────

test("Pkg SPA: page to page navigation", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/layout`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");

  expect(reqs).toStrictEqual([
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/layout`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/layout/page-1`,
      debug: true
    }
  ]);
});

test("Pkg SPA: page to page navigation inside of layout, with autocollect disabled", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/layout-autocollect-disabled`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndSettle(page, ".link");
  await clickAndSettle(page, ".link-2");

  expect(reqs).toStrictEqual([]);
});

test("Pkg SPA: collect even if autocollect is disabled", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/layout-autocollect-disabled/collect-via-meta`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndSettle(page, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/layout-autocollect-disabled/collect-via-meta/page-1`,
      debug: true
    }
  ]);
});

test("Pkg SPA: ignore collect", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/layout/ignore-collect`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndSettle(page, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/layout/ignore-collect`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/layout/ignore-collect`,
      debug: true
    }
  ]);
});

test("Pkg SPA: navigate with props", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/navigation-with-props`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-props`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView", p: { prop1: "value1" } }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-props/page-1`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-props`,
      debug: true
    }
  ]);
});

test("Pkg SPA: navigate with meta tag props", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/navigation-with-meta-props`);
  await page.waitForNetworkIdle({ idleTime: 100 });
  await clickAndWaitForPageView(page, reqs, ".link");
  await clickAndWaitForPageView(page, reqs, ".link-2");

  expect(reqs).toStrictEqual([
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-meta-props`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView", p: { prop1: "value1" } }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-meta-props/page-1`,
      debug: true
    },
    {
      e: [{ h: false, t: "PageView" }],
      u: `${DEBUG_DOMAIN}/pkg/navigation-with-meta-props`,
      debug: true
    }
  ]);
});

test("Pkg SPA: popstate event inside of layout", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/pkg/layout/popstate`);
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
      u: `${DEBUG_DOMAIN}/pkg/layout/popstate`,
      e: [{ t: "PageView", h: false }],
      debug: true
    },
    {
      u: `${DEBUG_DOMAIN}/pkg/layout/popstate/page-1`,
      e: [{ t: "PageView", h: false }],
      debug: true
    },
    {
      u: `${DEBUG_DOMAIN}/pkg/layout/popstate`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

// ─── UTM params test ─────────────────────────────────────────────────────────

test("Pkg View: UTM params", async ({ reqs, goto }: Context) => {
  await goto(`${MPA_URL}/pkg?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_term=term&utm_content=content`);

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/pkg`,
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
