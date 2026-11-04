export const getEnvironment = (): {
  isLocalhost: boolean;
  isHeadlessBrowser: boolean;
  isDesktop: boolean;
} => ({
  isLocalhost:
    (/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) &&
      //TODO revisit
      (location.protocol === "http:" || location.protocol === "https:")) ||
    (location.protocol === "file:" && !navigator.userAgent.toLowerCase().includes("electron")),
  isHeadlessBrowser: Boolean(
    window.navigator.webdriver ||
    ("_phantom" in window && window._phantom) ||
    ("__nightmare" in window && window.__nightmare) ||
    ("Cypress" in window && window.Cypress)
  ),
  // Electron, Tauri, Wails, Neutralino, NW.js
  // typeof checks instead of `in`: elements with a matching id are exposed on window too
  isDesktop:
    /Electron\//.test(navigator.userAgent) ||
    typeof (window as any).__TAURI_INTERNALS__?.invoke === "function" ||
    typeof (window as any).__TAURI_IPC__ === "function" ||
    /^(tauri|wails):$/.test(location.protocol) ||
    /^(tauri|wails)\.localhost$/.test(location.hostname) ||
    typeof (window as any).NL_VERSION === "string" ||
    typeof (window as any).nw?.App === "object"
});
export const isClient = (): boolean => {
  try {
    // Basic checks for window and document
    if (typeof window === "undefined" || typeof document === "undefined") return false;

    // Check for navigator safely
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/node|jsdom/i.test(ua)) return false;
    return true;
  } catch {
    return false;
  }
};
