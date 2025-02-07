import puppeteer, { Page } from "puppeteer";
import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  test,
  type TestContext,
} from "vitest";

interface Context extends TestContext {
  page: Page;
  reqs: any[];
  goto: (path: string) => Promise<void>;
}
const MPA_URL = "http://localhost:4321";

const browser = await puppeteer.launch();

beforeEach(async (ctx: Context) => {
  const reqs: any[] = [];

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (interceptedRequest) => {
    if (interceptedRequest.url() === "https://api.onedollarstats.com/events") {
      const body = interceptedRequest.postData();
      if (body) {
        reqs.push(JSON.parse(body));
      }
    }
    if (interceptedRequest.isInterceptResolutionHandled()) return;

    if (
      interceptedRequest.url().endsWith(".png") ||
      interceptedRequest.url().endsWith(".jpg")
    )
      interceptedRequest.abort();
    else interceptedRequest.continue();
  });
  await page.setViewport({ width: 1080, height: 1024 });

  ctx.page = page;
  ctx.goto = async (path: string) => {
    await page.goto(path);

    await page.waitForNetworkIdle({
      idleTime: 50,
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

test("View: in headless", async ({ reqs, goto }: Context) => {
  await goto(MPA_URL);

  expect(reqs).toStrictEqual([]);
});
