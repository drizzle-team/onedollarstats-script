import { afterEach, expect, test, vi } from "vitest";
import { getDeviceInfo } from "./device-info";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("collects screen size and network info", () => {
  vi.stubGlobal("screen", { width: 1920, height: 1080 });
  vi.stubGlobal("navigator", {
    connection: { effectiveType: "4g", type: "wifi", downlink: 10, rtt: 50, saveData: false }
  });

  expect(getDeviceInfo()).toEqual({
    sw: 1920,
    sh: 1080,
    n: { et: "4g", t: "wifi", dl: 10, rtt: 50, sd: false }
  });
});

test("omits network info when Network Information API is unavailable", () => {
  vi.stubGlobal("screen", { width: 390, height: 844 });
  vi.stubGlobal("navigator", {});

  expect(getDeviceInfo()).toEqual({ sw: 390, sh: 844 });
});

test("drops connection fields the browser does not expose", () => {
  vi.stubGlobal("screen", { width: 1440, height: 900 });
  vi.stubGlobal("navigator", { connection: { effectiveType: "3g", downlink: 1.5, rtt: 300, saveData: true } });

  const body = JSON.parse(JSON.stringify(getDeviceInfo()));

  expect(body).toEqual({ sw: 1440, sh: 900, n: { et: "3g", dl: 1.5, rtt: 300, sd: true } });
});

test("omits screen size when screen is unavailable", () => {
  vi.stubGlobal("screen", undefined);
  vi.stubGlobal("navigator", {});

  expect(getDeviceInfo()).toEqual({});
});
