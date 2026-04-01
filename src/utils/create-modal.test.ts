import { describe, expect, test, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";

describe("createDebugModal Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setupDOM = () => {
    const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
      url: "https://localhost",
    });
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("Image", dom.window.Image);
    return dom;
  };

  test("creates modal DOM element", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    createDebugModal("example.com", "https://custom-collector.com/events");

    const modal = document.querySelector(".dev-modal");
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain("onedollarstats debug window");
    expect(modal?.textContent).toContain("example.com");
  });

  test("returns a log function", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    const log = createDebugModal("example.com", "https://custom-collector.com/events");
    expect(typeof log).toBe("function");
  });

  test("log function adds entries to event log", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    const log = createDebugModal("example.com", "https://custom-collector.com/events");

    log("PageView sent", true);
    const logContainer = document.querySelector("#event-log");
    expect(logContainer?.children.length).toBe(1);
    expect(logContainer?.textContent).toContain("PageView sent");
  });

  test("log function handles failure messages", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    const log = createDebugModal("example.com", "https://custom-collector.com/events");

    log("Event failed to send", false);
    const logContainer = document.querySelector("#event-log");
    expect(logContainer?.children.length).toBe(1);
    expect(logContainer?.textContent).toContain("Event failed to send");
  });

  test("prevents duplicate style injection", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    createDebugModal("example.com", "https://custom-collector.com/events");
    createDebugModal("example2.com", "https://custom-collector.com/events");

    const styles = document.querySelectorAll("#onedollatstats-modal-styles");
    expect(styles.length).toBe(1);
  });

  test("close button removes modal", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    createDebugModal("example.com", "https://custom-collector.com/events");

    const closeBtn = document.querySelector(".close-btn");
    expect(closeBtn).not.toBeNull();

    // Simulate click
    const clickEvent = new (window as any).MouseEvent("click", { bubbles: true });
    closeBtn?.dispatchEvent(clickEvent);

    const modal = document.querySelector(".dev-modal");
    expect(modal).toBeNull();
  });

  test("modal contains hostname information", async () => {
    setupDOM();
    const { createDebugModal } = await import("./create-modal");
    createDebugModal("my-site.com", "https://custom-collector.com/events");

    const modal = document.querySelector(".dev-modal");
    expect(modal?.innerHTML).toContain("my-site.com");
  });
});
