export const getEnvironment = (): {
  isLocalhost: boolean;
  isHeadlessBrowser: boolean;
} => ({
  isLocalhost:
    (/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) &&
      (location.protocol === "http:" || location.protocol === "https:")) ||
    location.protocol === "file:",
  isHeadlessBrowser: Boolean(
    window.navigator.webdriver ||
    ("_phantom" in window && window._phantom) ||
    ("__nightmare" in window && window.__nightmare) ||
    ("Cypress" in window && window.Cypress)
  )
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
