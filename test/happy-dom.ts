import { Browser, BrowserPage, type ISyncResponse } from "happy-dom";
import { afterEach, beforeEach, expect, test } from "vitest";

beforeEach((ctx) => {
  const reqs: any[] = [];

  const browser = new Browser({
    console: global.console,
    settings: {
      fetch: {
        interceptor: {
          beforeAsyncRequest: async ({ request, window }) => {
            if (
              request.url !== "https://api.onedollarstats.com/events" &&
              request.method !== "POST"
            )
              return;

            const response = new Response(request.body);
            const res = await response.json();
            reqs.push(res);

            return new window.Response("");
          },
          beforeSyncRequest: ({ request, window }) => {
            if (request.url !== "https://api.onedollarstats.com/events") {
              return;
            }

            return <ISyncResponse>{
              status: 200,
              statusText: "OK",
              ok: true,
              url: "https://example.com",
              redirected: false,
              headers: new window.Headers(),
              body: Buffer.from("Hello World"),
            };
          },
        },
      },
    },
  });
  const page: BrowserPage = browser.newPage();
  ctx.page = page;
  ctx.browser = browser;
  ctx.reqs = reqs;
});

afterEach(async (ctx) => {
  await ctx.browser.close();
});

test("View: default page view", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/",
      e: [{ t: "PageView", h: false }],
    },
  ]);
});

test("View: path via meta tag", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/view-with-path-via-meta");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false }],
    },
  ]);
});

test("View: path via body tag", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/view-with-path-via-body");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false }],
    },
  ]);
});
test("View: props via script 'data-props' attribute", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/view-with-props-via-script");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/view-with-props-via-script",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});
test("View: manually", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/manually-view");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/manually-view",
      e: [{ t: "PageView", h: false }],
    },
  ]);
});

test("View: manually with path", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/manually-view");
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false }],
    },
  ]);
});

test("View: manually with props", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/manually-view-with-props");
  await page.waitUntilComplete();
  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/manually-view-with-props",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});

test("View: manually with path and props", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto("http://localhost:4321/manually-view-with-path-and-props");
  await page.waitUntilComplete();
  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});

test("View: manually with path via meta and props", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto(
    "http://localhost:4321/manually-view-with-path-via-meta-and-props"
  );
  await page.waitUntilComplete();

  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});

test("View: manually with path via body attribute and props", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto(
    "http://localhost:4321/manually-view-with-path-via-body-and-props"
  );
  await page.waitUntilComplete();
  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});

test("View: manually with path and props via script attribute", async ({
  page,
  reqs,
}: {
  page: BrowserPage;
  reqs: any[];
}) => {
  await page.goto(
    "http://localhost:4321/manually-view-with-path-and-props-via-script"
  );
  await page.waitUntilComplete();
  expect(reqs).toStrictEqual([
    {
      u: "http://localhost:4321/new-path",
      e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
    },
  ]);
});

// test("View: props via 'data-s:view-props' attributes", () => {
//   expect(resArr[11]).toStrictEqual({
//     u: "http://localhost:4321/view-with-props-via-dom-attributes",
//     e: [{ t: "PageView", h: false, p: { key1: "value1", key2: "value2" } }],
//   });
// });
