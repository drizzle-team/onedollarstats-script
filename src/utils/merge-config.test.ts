import { describe, expect, test, vi, beforeEach } from "vitest";
import { mergeConfig } from "./merge-config";
import * as environment from "./environment";

describe("Merge config Tests", () => {
  const debug = "olddomain.com";
  const hostname = "newdomain.com";

  beforeEach(() => vi.restoreAllMocks());

  describe("on localhost", () => {
    beforeEach(() => {
      vi.spyOn(environment, "getEnvironment").mockReturnValue({
        isLocalhost: true,
        isHeadlessBrowser: false
      });
    });

    test("no config", () => {
      const result = mergeConfig();
      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("passed trackLocalhostAs", () => {
      const result = mergeConfig({ trackLocalhostAs: debug });

      expect(result).toEqual(expect.objectContaining({ hostname: debug, devmode: true }));
    });

    test("hostname", () => {
      const result = mergeConfig({ hostname });
      expect(result).toEqual(expect.objectContaining({ hostname, devmode: false }));
    });

    test("hostname with devmode=true", () => {
      const result = mergeConfig({ hostname, devmode: true });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: true }));
    });

    test("hostname with devmode=false", () => {
      const result = mergeConfig({ hostname, devmode: false });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: false }));
    });

    test("devmode=true with hostname", () => {
      const result = mergeConfig({ devmode: true, hostname });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: true }));
    });

    test("both trackLocalhostAs and hostname", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, hostname });

      expect(result.hostname).toBe(hostname);
    });

    test("all three attributes set with devmode=true", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, hostname, devmode: true });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: true }));
    });

    test("all three attributes set with devmode=false", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, hostname, devmode: false });

      expect(result).toEqual(expect.objectContaining({ hostname: hostname, devmode: false }));
    });

    test("trackLocalhostAs and devmode=false - trackLocalhostAs ignored", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, devmode: false });

      // When devmode is explicitly false, trackLocalhostAs is completely ignored
      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("empty string hostname", () => {
      const result = mergeConfig({ hostname: "" });

      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("whitespace hostname - should return null after trim", () => {
      const result = mergeConfig({ hostname: "  " });

      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("migration scenario: old code uses trackLocalhostAs, new code adds hostname and devmode=false", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, hostname, devmode: false });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: false }));
    });

    test("gradual migration: trackLocalhostAs exists, hostname added but no devmode", () => {
      const result = mergeConfig({ trackLocalhostAs: debug, hostname });

      // Uses new hostname but since trackLocalhostAs exists (backward compatibility), devmode = true
      expect(result).toEqual(expect.objectContaining({ hostname, devmode: true }));
    });
  });

  describe("on production", () => {
    beforeEach(() => {
      vi.spyOn(environment, "getEnvironment").mockReturnValue({
        isLocalhost: false,
        isHeadlessBrowser: false
      });
    });

    test("no config on production", () => {
      const result = mergeConfig();

      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("hostname with devmode=true on production", () => {
      const result = mergeConfig({ hostname, devmode: true });

      // On production devmode is always false
      expect(result).toEqual(expect.objectContaining({ hostname, devmode: false }));
    });

    test("trackLocalhostAs on production - trackLocalhostAs ignored when devmode is false", () => {
      const result = mergeConfig({ trackLocalhostAs: debug });

      // On production devmode is always false, so trackLocalhostAs is ignored
      expect(result).toEqual(expect.objectContaining({ hostname: null, devmode: false }));
    });

    test("explicit devmode=true is ignored on production", () => {
      const result = mergeConfig({ devmode: true, hostname, trackLocalhostAs: debug });

      expect(result).toEqual(expect.objectContaining({ hostname, devmode: false }));
    });
  });
});
