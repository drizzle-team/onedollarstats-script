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
