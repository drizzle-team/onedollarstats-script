// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// jsdom serves http://localhost:3000, so devmode + hostname are needed for events to go out
const sent: string[] = [];
const originalPushState = history.pushState;

beforeEach(() => {
  vi.resetModules(); // fresh tracker singleton per test
  sent.length = 0;
  history.replaceState(null, "", "/home");
  // isClient() treats the jsdom UA as a server
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Macintosh) Chrome/120.0 Safari/537.36", configurable: true });
  vi.stubGlobal("DEBUG_SCRIPT_URL", "about:blank"); // esbuild --define in real builds
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (cb(0), 0));
  vi.stubGlobal(
    "Image",
    class {
      set src(value: string) {
        sent.push(JSON.parse(atob(value.split("?data=")[1]!)).u);
      }
    }
  );
});

afterEach(() => {
  // Each test's tracker wraps pushState; unwrap so they don't stack
  history.pushState = originalPushState;
  vi.unstubAllGlobals();
});

const start = async (rules: { excludePages?: string[]; includePages?: string[] }) => {
  const { configure } = await import("./index");
  configure({ devmode: true, hostname: "example.com", ...rules });
};
const go = (...paths: string[]) => paths.forEach((p) => history.pushState(null, "", p));

test("A → excluded B → A counts A twice", async () => {
  await start({ excludePages: ["/settings"] });
  go("/settings", "/home");
  expect(sent).toEqual(["https://example.com/home", "https://example.com/home"]);
});

test("A → B outside includePages → A counts A twice", async () => {
  await start({ includePages: ["/home"] });
  go("/about", "/home");
  expect(sent).toEqual(["https://example.com/home", "https://example.com/home"]);
});

test("pushState to the same tracked page is still deduped", async () => {
  await start({ excludePages: ["/settings"] });
  go("/home", "/home");
  expect(sent).toEqual(["https://example.com/home"]);
});

test("excluded pages send nothing", async () => {
  await start({ excludePages: ["/settings/*"] });
  go("/settings/profile", "/settings/billing");
  expect(sent).toEqual(["https://example.com/home"]);
});

test("pixel fallback keeps the original ts, not the retry time", async () => {
  const images: Array<{ src: string; onerror?: () => void }> = [];
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      onerror?: () => void;
      constructor() {
        images.push(this);
      }
    }
  );
  const sendBeacon = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

  try {
    await start({});
    const pixelBody = JSON.parse(atob(images[0]!.src.split("?data=")[1]!));
    expect(pixelBody.e[0].ts).toBe(1_700_000_000_000);

    // The pixel fails later, e.g. after a slow network timeout
    nowSpy.mockReturnValue(1_700_000_005_000);
    images[0]!.onerror?.();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendBeacon.mock.calls[0]![1]).e[0].ts).toBe(1_700_000_000_000);
  } finally {
    nowSpy.mockRestore();
    delete (navigator as { sendBeacon?: unknown }).sendBeacon;
  }
});
