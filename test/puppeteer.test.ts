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
  args: ["--disable-blink-features=AutomationControlled"] // show for the tracker that browser is not headless
});

beforeEach(async (ctx: Context) => {
  const reqs: any[] = [];

  const page = await browser.newPage();
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
  await goto("http://localhost:4321/view-with-path-via-meta");

  expect(reqs).toStrictEqual([
    {
      u: "https://example.com/new-path",
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
  await goto("http://localhost:4321/manually-view-with-path-via-body");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false }],
      debug: true
    }
  ]);
});

test("View: manually with props", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-props");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with props via script", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-props-via-script");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props-via-script`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with props via dom attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-props-via-dom-attributes");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/manually-view-with-props-via-dom-attributes`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-path-and-props");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path via meta and props", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-path-via-meta-and-props");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path via body attribute and props", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-path-via-body-and-props");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props via script attribute", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-path-and-props-via-script");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("View: manually with path and props via DOM attributes - 'data-s:view-props'", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/manually-view-with-path-and-props-via-dom-attributes");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: via dom", async ({ reqs, page }: Context) => {
  await page.goto("http://localhost:4321/event");
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
  await page.goto("http://localhost:4321/event-with-path");
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
  await page.goto("http://localhost:4321/event-with-path-via-meta");
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
  await page.goto("http://localhost:4321/event-with-path-via-body");
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
  await page.goto("http://localhost:4321/event-with-path-and-props");
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
  await page.goto("http://localhost:4321/event-with-path-and-props-dash-and-colon");
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
  await page.goto("http://localhost:4321/event-with-path-and-props-dash");
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
  await page.goto("http://localhost:4321/event-with-path-and-props-on-2-parent");
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
  await page.goto("http://localhost:4321/event-with-path-and-props-on-2-parent");
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
  await page.goto("http://localhost:4321/event-with-path-and-props-on-4-parent-but-a");
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

test("Event: manually", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/event-manually");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event-manually`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/event-manually-with-path");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path via meta tag", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/event-manually-with-path-via-meta");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/new-path`,
      e: [{ t: "Event", h: false }],
      debug: true
    }
  ]);
});

test("Event: manually with path via body", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/event-manually-with-path-via-body");

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
  await goto("http://localhost:4321/event-manually-with-props");

  expect(reqs).toStrictEqual([
    {
      u: `${DEBUG_DOMAIN}/event-manually-with-props`,
      e: [{ t: "Event", h: false, p: { key1: "value1", key2: "value2" } }],
      debug: true
    }
  ]);
});

test("Event: manually with path and props", async ({ reqs, goto }: Context) => {
  await goto("http://localhost:4321/event-manually-with-path-and-props");

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
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

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
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link");
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link-2");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  expect(reqs).toStrictEqual([]);
});

test("SPA: collect even if autocollect is disabled", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout-autocollect-disabled/collect-via-meta`);
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  await page.click(".link-2");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

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
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  await page.click(".link-2");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

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
  await page.waitForNetworkIdle({
    idleTime: 100
  });
  await page.click(".link");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

  await page.click(".link-2");
  await page.waitForNetworkIdle({
    idleTime: 100
  });

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

test("SPA: popstate event inside of layout", async ({ reqs, page }: Context) => {
  await page.goto(`${SPA_URL}/layout/popstate`);
  await page.waitForNetworkIdle({ idleTime: 100 });

  await page.click(".link");
  await page.waitForNetworkIdle({ idleTime: 100 });
  await page.evaluate(() => {
    window.history.back();
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  });
  await page.waitForNetworkIdle({ idleTime: 100 });
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
// ToDo:
// shouldBlockEvent(headless browser)
// --- Release
// ToDo:
// - Hash Routing
// - navigator.sendBeacon works
// - https://tigerabrodi.blog/patterns-for-improving-inp#heading-introduction-to-inp
