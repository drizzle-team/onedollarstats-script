import { describe, expect, test, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

describe("resolvePath Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setupDOM = (bodyAttrs: Record<string, string> = {}, metaPath?: string) => {
    let html = "<!DOCTYPE html><html><head>";
    if (metaPath !== undefined) {
      html += `<meta name="stonks-path" content="${metaPath}" />`;
    }
    html += "</head><body";
    for (const [key, val] of Object.entries(bodyAttrs)) {
      html += ` ${key}="${val}"`;
    }
    html += "></body></html>";

    const dom = new JSDOM(html, { url: "https://example.com/original-path" });
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("location", dom.window.location);
  };

  test("explicit path takes priority", async () => {
    setupDOM();
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath("/explicit-path")).toBe("/explicit-path");
  });

  test("data-s-path body attribute is used when no explicit path", async () => {
    setupDOM({ "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/body-path");
  });

  test("data-s:path body attribute is used when no explicit path", async () => {
    setupDOM({ "data-s:path": "/body-colon-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/body-colon-path");
  });

  test("meta[name=stonks-path] is used when no explicit path or body attr", async () => {
    setupDOM({}, "/meta-path");
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/meta-path");
  });

  test("falls back to location.pathname", async () => {
    setupDOM();
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/original-path");
  });

  test("explicit path overrides body attribute", async () => {
    setupDOM({ "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath("/explicit-path")).toBe("/explicit-path");
  });

  test("explicit path overrides meta tag", async () => {
    setupDOM({}, "/meta-path");
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath("/explicit-path")).toBe("/explicit-path");
  });

  test("data-s-path takes priority over data-s:path", async () => {
    setupDOM({ "data-s-path": "/dash-path", "data-s:path": "/colon-path" });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/dash-path");
    expect(warnSpy).toHaveBeenCalled();
  });

  test("data-s-path takes priority over meta tag", async () => {
    setupDOM({ "data-s-path": "/body-path" }, "/meta-path");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/body-path");
    expect(warnSpy).toHaveBeenCalled();
  });

  test("warns when multiple path sources found", async () => {
    setupDOM({ "data-s-path": "/body-path" }, "/meta-path");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolvePath } = await import("./resolve-path");
    resolvePath();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Multiple path sources found"),
      expect.any(String)
    );
  });

  test("undefined path argument treated as no explicit path", async () => {
    setupDOM({ "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath(undefined)).toBe("/body-path");
  });

  test("empty string path argument treated as no explicit path", async () => {
    setupDOM({ "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    // Empty string is falsy, so it should fall through
    expect(resolvePath("")).toBe("/body-path");
  });
});

describe("hash routing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setupDOM = (url: string, bodyAttrs: Record<string, string> = {}) => {
    const attrs = Object.entries(bodyAttrs).map(([key, val]) => ` ${key}="${val}"`).join("");
    const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body${attrs}></body></html>`, { url });
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("location", dom.window.location);
  };

  test.each([
    ["#/users", "/users"],
    ["#/users/42?tab=billing", "/users/42"],
    ["#!/users", "/users"],
    ["#users", "/users"],
    ["#/", "/"]
  ])("normalizes hash route %s to %s", async (hash, expected) => {
    setupDOM(`https://example.com/app${hash}`);
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath(undefined, true)).toBe(expected);
  });

  test("uses the hash route when hashRouting is enabled", async () => {
    setupDOM("https://example.com/#/settings/profile");
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath(undefined, true)).toBe("/settings/profile");
  });

  test("ignores the hash when hashRouting is disabled", async () => {
    setupDOM("https://example.com/app#/settings");
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath()).toBe("/app");
  });

  test("falls back to location.pathname when the hash is empty", async () => {
    setupDOM("https://example.com/app");
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath(undefined, true)).toBe("/app");
  });

  test("explicit path and data-s-path still win over the hash route", async () => {
    setupDOM("https://example.com/#/settings", { "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath("/explicit", true)).toBe("/explicit");
    expect(resolvePath(undefined, true)).toBe("/body-path");
  });

  test("never returns the file system path for file:// pages", async () => {
    setupDOM("file:///Users/john/MyApp.app/Contents/Resources/app.asar/dist/index.html#/settings", { "data-s-path": "/body-path" });
    const { resolvePath } = await import("./resolve-path");
    expect(resolvePath(undefined, true)).toBe("/body-path");
    document.body.removeAttribute("data-s-path");
    expect(resolvePath(undefined, true)).toBe("/settings");
    expect(resolvePath()).toBe("/");
  });
});
