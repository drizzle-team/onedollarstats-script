import { describe, expect, test } from "vitest";
import { extractHostName } from "./extract-hostname";
import { JSDOM } from "jsdom";

const createScriptElement = (attributes: Record<string, string>): HTMLScriptElement => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const script = dom.window.document.createElement("script");

  for (const [key, value] of Object.entries(attributes)) {
    script.setAttribute(key, value);
  }

  return script as unknown as HTMLScriptElement;
};

describe("Extract hostname Tests", () => {
  const debug = "olddomain.com";
  const hostname = "newdomain.com";

  test("no attributes", () => {
    const script = createScriptElement({});
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    const expected = { hostname: null, devmode: false };

    expect(resultDev).toEqual(expected);
    expect(resultProd).toEqual(expected);
  });

  test("passed data-debug", () => {
    const script = createScriptElement({ "data-debug": debug });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({
      hostname: debug,
      devmode: true
    });
    expect(resultProd).toEqual({
      hostname: null,
      devmode: false
    });
  });

  test("data-hostname", () => {
    const script = createScriptElement({ "data-hostname": hostname });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    const expected = { hostname: hostname, devmode: false };

    expect(resultDev).toEqual(expected);
    expect(resultProd).toEqual(expected);
  });

  test("data-hostname with data-devmode=''", () => {
    const script = createScriptElement({ "data-hostname": hostname, "data-devmode": "" });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname, devmode: true });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });

  test("data-hostname with data-devmode='true'", () => {
    const script = createScriptElement({ "data-hostname": hostname, "data-devmode": "true" });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname, devmode: true });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });

  test("data-hostname with data-devmode='false'", () => {
    const script = createScriptElement({ "data-hostname": hostname, "data-devmode": "false" });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname, devmode: false });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });

  test("data-hostname with data-devmode='fdsfsd'", () => {
    const script = createScriptElement({ "data-hostname": hostname, "data-devmode": "fdsfsd" });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname, devmode: false });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });

  test("data-devmode=''", () => {
    const script = createScriptElement({ "data-devmode": "" });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({
      hostname: null,
      devmode: true
    });
    expect(resultProd).toEqual({
      hostname: null,
      devmode: false
    });
  });

  test("both data-debug and data-hostname", () => {
    const script = createScriptElement({ "data-debug": debug, "data-hostname": hostname });
    const result = extractHostName(script, true);

    expect(result.hostname).toBe(hostname);
  });

  test("all three attributes set with data-devmode='true'", () => {
    const script = createScriptElement({
      "data-debug": debug,
      "data-hostname": hostname,
      "data-devmode": "true"
    });

    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname, devmode: true });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });

  test("all three attributes set with data-devmode='false'", () => {
    const script = createScriptElement({
      "data-debug": debug,
      "data-hostname": hostname,
      "data-devmode": "false"
    });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname: hostname, devmode: false });
    expect(resultProd).toEqual({ hostname: hostname, devmode: false });
  });

  test("data-debug and data-devmode='false' - data-debug ignored", () => {
    const script = createScriptElement({
      "data-debug": debug,
      "data-devmode": "false"
    });
    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    // When devmode is explicitly false, data-debug is completely ignored
    expect(resultDev).toEqual({ hostname: null, devmode: false });
    expect(resultProd).toEqual({ hostname: null, devmode: false });
  });

  test("data-devmode='' on production", () => {
    const script = createScriptElement({ "data-hostname": hostname, "data-devmode": "" });
    const result = extractHostName(script, false);

    expect(result).toEqual({ hostname, devmode: false });
  });

  test("data-debug on production - data-debug ignored when devmode is false", () => {
    const script = createScriptElement({ "data-debug": debug });
    const result = extractHostName(script, false);

    // On production devmode is always false, so data-debug is ignored
    expect(result).toEqual({ hostname: null, devmode: false });
  });

  test("empty string hostname", () => {
    const script = createScriptElement({ "data-hostname": "" });
    const result = extractHostName(script, true);

    expect(result).toEqual({ hostname: null, devmode: false });
  });

  test("whitespace hostname - should return whitespace as-is", () => {
    const script = createScriptElement({ "data-hostname": "  " });
    const result = extractHostName(script, true);

    expect(result).toEqual({ hostname: null, devmode: false });
  });

  test("data-devmode='TRUE' (uppercase)", () => {
    const script = createScriptElement({
      "data-hostname": debug,
      "data-devmode": "TRUE"
    });

    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname: debug, devmode: true });
    expect(resultProd).toEqual({ hostname: debug, devmode: false });
  });

  test("data-devmode='0'", () => {
    const script = createScriptElement({
      "data-hostname": debug,
      "data-devmode": "0"
    });

    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    expect(resultDev).toEqual({ hostname: debug, devmode: false });
    expect(resultProd).toEqual({ hostname: debug, devmode: false });
  });

  test("migration scenario: old code uses data-debug, new code adds data-hostname and data-devmode=false", () => {
    const script = createScriptElement({
      "data-debug": debug,
      "data-hostname": hostname,
      "data-devmode": "false"
    });
    const result = extractHostName(script, true);

    expect(result).toEqual({ hostname, devmode: false });
  });

  test("gradual migration: data-debug exists, data-hostname added but no data-devmode", () => {
    const script = createScriptElement({ "data-debug": debug, "data-hostname": hostname });

    const resultDev = extractHostName(script, true);
    const resultProd = extractHostName(script, false);

    // Uses new hostname but since data-debug exists (backward compatibility), devmode = true for dev
    expect(resultDev).toEqual({ hostname, devmode: true });
    expect(resultProd).toEqual({ hostname, devmode: false });
  });
});
